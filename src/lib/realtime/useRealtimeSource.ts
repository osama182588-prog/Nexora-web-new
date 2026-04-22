"use client";

/**
 * `useRealtimeSource` — opens an SSE connection to `/api/realtime/stream`
 * and surfaces both the connection state and the last N events.
 *
 * This hook is intentionally "raw" — it should be mounted exactly once
 * per React tree by `RealtimeProvider`, and consumers should use the
 * `useRealtime()` context hook instead.
 */
import { useEffect, useRef, useState, useCallback } from "react";

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "working"
  | "error"
  | "offline";

export interface RealtimeEvent {
  id: string;
  type: string;
  actorId: string;
  resourceId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  /** Receive timestamp (ms) — used for the "working" pulse. */
  receivedAt: number;
}

interface UseRealtimeOptions {
  /** Max number of events kept in memory. Defaults to 50. */
  bufferSize?: number;
  /** When false, the hook stays idle. Useful for unauthenticated pages. */
  enabled?: boolean;
}

const WORKING_TTL_MS = 1200;

const TOPICS = [
  "project.created",
  "project.updated",
  "project.deleted",
  "project.status_changed",
  "project.progress_updated",
  "product.created",
  "product.updated",
  "product.deleted",
  "product.published",
  "product.unpublished",
  "operator.heartbeat"
] as const;

export function useRealtimeSource({
  bufferSize = 50,
  enabled = true
}: UseRealtimeOptions = {}) {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const workingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleOnline = () =>
      setStatus((s) => (s === "offline" ? "connecting" : s));
    const handleOffline = () => setStatus("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setStatus(navigator.onLine ? "connecting" : "offline");

    const es = new EventSource("/api/realtime/stream");
    sourceRef.current = es;

    es.addEventListener("open", () => setStatus("connected"));
    es.addEventListener("error", () => {
      // EventSource auto-reconnects per the `retry:` field; surface the
      // transient state so the UI can show a hint.
      setStatus((prev) => (prev === "connected" ? "connecting" : "error"));
    });
    es.addEventListener("ready", () => setStatus("connected"));

    const onAny = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as Omit<RealtimeEvent, "receivedAt">;
        const enriched: RealtimeEvent = { ...data, receivedAt: Date.now() };
        setLastEvent(enriched);
        setEvents((cur) => {
          const next = [enriched, ...cur];
          return next.length > bufferSize ? next.slice(0, bufferSize) : next;
        });
        setStatus("working");
        if (workingTimerRef.current) clearTimeout(workingTimerRef.current);
        workingTimerRef.current = setTimeout(
          () => setStatus("connected"),
          WORKING_TTL_MS
        );
      } catch (err) {
        console.warn("[realtime] could not parse event", err);
      }
    };

    for (const t of TOPICS) es.addEventListener(t, onAny as EventListener);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      for (const t of TOPICS) es.removeEventListener(t, onAny as EventListener);
      es.close();
      sourceRef.current = null;
      if (workingTimerRef.current) {
        clearTimeout(workingTimerRef.current);
        workingTimerRef.current = null;
      }
      setStatus("idle");
    };
  }, [enabled, bufferSize]);

  return { status, events, lastEvent, reset };
}
