/**
 * Internal operator — the stand-in for the future external executor.
 *
 * Subscribes to every event on the in-process bus and persists a unified
 * audit record in the `system_events` collection. This module also
 * exposes simple primitives the future "real" executor will use:
 *
 *  - `operatorState()` — current health snapshot.
 *  - `ensureOperator()` — idempotent start (called from the SSE entry).
 *
 * Because both this operator and the web routes run in the same Node
 * process, communication between them is purely in-process: zero REST
 * hops, zero network serialisation overhead.
 */
import { connectToDatabase } from "@/lib/mongoose";
import { SystemEventModel } from "@/models/SystemEvent";
import { bus, type SystemEvent } from "@/lib/system/bus";

export interface OperatorState {
  started: boolean;
  startedAt: string | null;
  processed: number;
  failed: number;
  lastEventAt: string | null;
  lastEventType: string | null;
}

const GLOBAL_KEY = "__nexora_operator__";

function getState(): OperatorState {
  const g = globalThis as unknown as { [GLOBAL_KEY]?: OperatorState };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      started: false,
      startedAt: null,
      processed: 0,
      failed: 0,
      lastEventAt: null,
      lastEventType: null
    };
  }
  return g[GLOBAL_KEY]!;
}

async function persist(event: SystemEvent): Promise<void> {
  const state = getState();
  try {
    await connectToDatabase();
    await SystemEventModel.create({
      eventId: event.id,
      type: event.type,
      actorId: event.actorId,
      resourceId: event.resourceId,
      payload: event.payload,
      status: "processed"
    });
    state.processed += 1;
    state.lastEventAt = event.createdAt;
    state.lastEventType = event.type;
  } catch (err) {
    state.failed += 1;
    console.error("[nexora.operator] failed to persist event", event.id, err);
  }
}

/**
 * Idempotently start the operator. Safe to call from any module — only
 * the first call wires up subscribers.
 */
export function ensureOperator(): OperatorState {
  const state = getState();
  if (state.started) return state;
  state.started = true;
  state.startedAt = new Date().toISOString();

  bus.subscribe((event) => {
    // Fire-and-forget; persistence errors are surfaced in operator state.
    void persist(event);
  });

  return state;
}

export function operatorState(): OperatorState {
  return { ...getState() };
}
