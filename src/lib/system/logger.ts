/**
 * Audit logger.
 *
 * Two ways to log:
 *
 *  1. Direct call: `recordLog({...})` — used by HTTP routes that want
 *     full control over `level`, `category`, `message`.
 *
 *  2. Automatic: this module subscribes to the in-process `bus` once
 *     and persists EVERY published `SystemEvent` as a log entry. Routes
 *     that already publish bus events therefore log "for free".
 *
 * Performance contract:
 *
 *  - `recordLog()` returns synchronously. The actual Mongo write is
 *    queued and flushed on the next microtask via `Promise.resolve()`,
 *    then batched with `insertMany({ ordered: false })`. A request
 *    handler never waits on logging.
 *
 *  - Failures are swallowed (they only emit a console warning). Audit
 *    logs are best-effort: under no circumstance should a Mongo blip
 *    fail a user-facing request.
 *
 *  - The in-memory queue is bounded — when it overflows, oldest entries
 *    are dropped and a single warning is emitted. This stops a slow DB
 *    from accumulating unbounded memory pressure.
 */
import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  type LogCategory,
  type LogLevel
} from "@/models/AuditLog";
import { bus, type SystemEvent, type SystemEventType } from "@/lib/system/bus";

export interface RecordLogInput {
  ownerId: string;
  actorId?: string | null;
  projectId?: string | null;
  resourceId?: string | null;
  level?: LogLevel;
  category?: LogCategory;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface QueuedLog extends Required<Omit<RecordLogInput, "metadata">> {
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const GLOBAL_KEY = "__nexora_audit_logger__";
const MAX_QUEUE = 1000;
const FLUSH_BATCH = 200;

interface LoggerInternals {
  queue: QueuedLog[];
  flushing: boolean;
  busSubscribed: boolean;
  overflowWarned: boolean;
}

function getInternals(): LoggerInternals {
  const g = globalThis as unknown as { [GLOBAL_KEY]?: LoggerInternals };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      queue: [],
      flushing: false,
      busSubscribed: false,
      overflowWarned: false
    };
  }
  return g[GLOBAL_KEY]!;
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Append a log entry. Returns immediately; the write is asynchronous.
 */
export function recordLog(input: RecordLogInput): void {
  if (!input.ownerId || !input.type || !input.message) return;
  const internals = getInternals();
  ensureBusSubscription();

  if (internals.queue.length >= MAX_QUEUE) {
    // Drop the oldest entry to keep the queue bounded. We warn once
    // so the operator knows logs are being lost.
    internals.queue.shift();
    if (!internals.overflowWarned) {
      internals.overflowWarned = true;
      console.warn(
        "[audit-logger] queue overflow — dropping oldest entries. " +
          "Mongo is likely slow or unreachable."
      );
    }
  }

  internals.queue.push({
    ownerId: input.ownerId,
    actorId: input.actorId ?? null,
    projectId: input.projectId ?? null,
    resourceId: input.resourceId ?? null,
    level: input.level ?? "info",
    category: input.category ?? "system",
    type: input.type,
    message: input.message.slice(0, 500),
    metadata: sanitizeMetadata(input.metadata ?? {}),
    createdAt: new Date()
  });

  // Schedule a flush on the next microtask. This batches multiple
  // `recordLog()` calls inside the same handler into a single
  // `insertMany`.
  if (!internals.flushing) {
    internals.flushing = true;
    void Promise.resolve().then(flush);
  }
}

/**
 * Subscribe the logger to the global bus exactly once. Idempotent —
 * calling it from multiple modules is fine.
 */
export function ensureBusSubscription(): void {
  const internals = getInternals();
  if (internals.busSubscribed) return;
  internals.busSubscribed = true;
  bus.subscribe((event) => {
    const log = busEventToLog(event);
    if (log) recordLog(log);
  });
}

/* ------------------------------------------------------------------ */
/* Bus → log mapping                                                  */
/* ------------------------------------------------------------------ */

interface BusPayloadHints {
  ownerId?: string;
  projectId?: string;
  message?: string;
  by?: string;
}

function busEventToLog(event: SystemEvent): RecordLogInput | null {
  // The bus payload usually carries an `ownerId` (workspace owner) so
  // logs are scoped correctly when the actor is a member of the
  // project (not the owner).
  const payload = (event.payload ?? {}) as BusPayloadHints &
    Record<string, unknown>;
  const ownerId =
    typeof payload.ownerId === "string" ? payload.ownerId : event.actorId;
  if (!ownerId) return null;

  const { level, category } = classify(event.type);
  return {
    ownerId,
    actorId:
      typeof payload.by === "string" ? payload.by : event.actorId || null,
    projectId:
      typeof payload.projectId === "string"
        ? payload.projectId
        : event.resourceId,
    resourceId: event.resourceId,
    level,
    category,
    type: event.type,
    message: typeof payload.message === "string"
      ? payload.message
      : describe(event.type, event),
    metadata: {
      eventId: event.id,
      // Strip the heavy `project` payload — it's already snapshotted
      // elsewhere and bloats every log row otherwise.
      ...stripHeavyKeys(payload)
    }
  };
}

const HEAVY_KEYS = new Set(["project", "product", "ticket", "install"]);

function stripHeavyKeys(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (HEAVY_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function classify(type: SystemEventType | string): {
  level: LogLevel;
  category: LogCategory;
} {
  if (type.startsWith("project.")) {
    return {
      level: type === "project.deleted" ? "warn" : "info",
      category: "project"
    };
  }
  if (type.startsWith("module.")) return { level: "info", category: "module" };
  if (type.startsWith("product.")) {
    return { level: "info", category: "marketplace" };
  }
  if (type.startsWith("ticket.")) return { level: "info", category: "ticket" };
  if (type.startsWith("external.discord.failed")) {
    return { level: "error", category: "external" };
  }
  if (type.startsWith("external.")) {
    return { level: "info", category: "external" };
  }
  if (type.startsWith("auth.")) return { level: "info", category: "auth" };
  return { level: "info", category: "system" };
}

function describe(type: string, event: SystemEvent): string {
  const subject = event.resourceId ? ` (${event.resourceId})` : "";
  return `${type}${subject}`;
}

function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  // Drop the literal "project" / "product" subdocument bloat at the
  // top level — keep everything else as-is. We also cap string sizes
  // so a stray giant value doesn't blow up the document size.
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (HEAVY_KEYS.has(k)) continue;
    if (typeof v === "string") {
      out[k] = v.length > 1000 ? v.slice(0, 1000) + "…" : v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Flush loop                                                         */
/* ------------------------------------------------------------------ */

async function flush(): Promise<void> {
  const internals = getInternals();
  try {
    while (internals.queue.length > 0) {
      const batch = internals.queue.splice(0, FLUSH_BATCH);
      try {
        await connectToDatabase();
        await AuditLogModel.insertMany(batch, { ordered: false });
      } catch (err) {
        // Swallow — logging must never crash a request.
        console.warn(
          "[audit-logger] flush failed:",
          (err as Error)?.message ?? err
        );
      }
    }
  } finally {
    internals.flushing = false;
    internals.overflowWarned = false;
  }
}
