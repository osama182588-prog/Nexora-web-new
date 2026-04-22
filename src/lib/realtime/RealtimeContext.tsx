"use client";

/**
 * RealtimeProvider — wraps a single EventSource per React tree so
 * multiple consumers share one connection to `/api/realtime/stream`.
 */
import { createContext, useContext, type ReactNode } from "react";
import {
  useRealtimeSource,
  type RealtimeEvent,
  type RealtimeStatus
} from "@/lib/realtime/useRealtimeSource";

interface RealtimeContextValue {
  status: RealtimeStatus;
  events: RealtimeEvent[];
  lastEvent: RealtimeEvent | null;
}

const Ctx = createContext<RealtimeContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
  /** Disable the SSE connection (e.g. on the public landing page). */
  enabled?: boolean;
}

export function RealtimeProvider({ children, enabled = true }: ProviderProps) {
  const { status, events, lastEvent } = useRealtimeSource({ enabled });
  return (
    <Ctx.Provider value={{ status, events, lastEvent }}>{children}</Ctx.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe default for trees that don't wrap the provider — keeps the
    // hook callable from anywhere without crashing.
    return { status: "idle", events: [], lastEvent: null };
  }
  return ctx;
}
