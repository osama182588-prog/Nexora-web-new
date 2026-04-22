/**
 * Internal event bus — the spine of Nexora's unified system.
 *
 * Every subsystem (UI handlers, marketplace, the future external
 * executor) communicates by publishing and subscribing to events on
 * this in-process emitter. There is intentionally no REST hop between
 * subsystems: a handler runs `bus.publish(...)` and any subscriber in
 * the same Node process — including the SSE stream that pushes to
 * connected browsers — receives it synchronously on the next tick.
 *
 * The bus is mounted on `globalThis` so it survives Next.js dev-mode
 * hot reloads and is shared across route handlers running in the same
 * server process.
 */
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

/** All event types known to the system. Add new types here. */
export type SystemEventType =
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "project.status_changed"
  | "project.progress_updated"
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "product.published"
  | "product.unpublished"
  | "ticket.created"
  | "ticket.updated"
  | "ticket.status_changed"
  | "module.enabled"
  | "module.disabled"
  | "module.configured"
  | "external.discord.interaction"
  | "external.discord.delivered"
  | "external.discord.failed"
  | "operator.heartbeat";

export interface SystemEvent<TPayload = Record<string, unknown>> {
  /** Globally-unique id; safe to use as a React key. */
  id: string;
  /** Topic. */
  type: SystemEventType;
  /** Owner of the resource this event concerns. */
  actorId: string;
  /** Resource the event is about, if applicable. */
  resourceId: string | null;
  /** Payload. Must be JSON-serialisable so the SSE stream can broadcast it. */
  payload: TPayload;
  /** ISO timestamp (set by the bus, not by callers). */
  createdAt: string;
}

export type SystemEventListener = (event: SystemEvent) => void;

interface BusInternals {
  emitter: EventEmitter;
  /** Last N events kept in memory for late-joining SSE clients. */
  recent: SystemEvent[];
}

const GLOBAL_KEY = "__nexora_event_bus__";
const MAX_RECENT = 200;

function getInternals(): BusInternals {
  const g = globalThis as unknown as { [GLOBAL_KEY]?: BusInternals };
  if (!g[GLOBAL_KEY]) {
    const emitter = new EventEmitter();
    // Allow many concurrent subscribers (each SSE client adds two listeners).
    emitter.setMaxListeners(0);
    g[GLOBAL_KEY] = { emitter, recent: [] };
  }
  return g[GLOBAL_KEY]!;
}

export const bus = {
  /**
   * Publish an event to every subscriber in the current process.
   * Returns the fully-formed event so callers can reuse its id.
   */
  publish<TPayload extends Record<string, unknown>>(input: {
    type: SystemEventType;
    actorId: string;
    resourceId?: string | null;
    payload?: TPayload;
  }): SystemEvent<TPayload> {
    const { emitter, recent } = getInternals();
    const event: SystemEvent<TPayload> = {
      id: randomUUID(),
      type: input.type,
      actorId: input.actorId,
      resourceId: input.resourceId ?? null,
      payload: input.payload ?? ({} as TPayload),
      createdAt: new Date().toISOString()
    };
    recent.push(event as SystemEvent);
    if (recent.length > MAX_RECENT) recent.splice(0, recent.length - MAX_RECENT);
    // Always emit on the wildcard channel; specific subscribers can also
    // listen on the type channel for narrow filtering.
    emitter.emit("event", event);
    emitter.emit(event.type, event);
    return event;
  },

  /** Subscribe to every event. Returns an unsubscribe function. */
  subscribe(listener: SystemEventListener): () => void {
    const { emitter } = getInternals();
    emitter.on("event", listener);
    return () => emitter.off("event", listener);
  },

  /** Subscribe to a specific event type. */
  on(type: SystemEventType, listener: SystemEventListener): () => void {
    const { emitter } = getInternals();
    emitter.on(type, listener);
    return () => emitter.off(type, listener);
  },

  /** Snapshot of the most recent events, oldest-first. */
  recent(): SystemEvent[] {
    return getInternals().recent.slice();
  }
};
