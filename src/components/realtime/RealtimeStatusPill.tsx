"use client";

/**
 * RealtimeStatusPill — pill that surfaces the in-process bus connection
 * state in the Topbar. Click to open a drawer with the live event feed.
 */
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useRealtime } from "@/lib/realtime/RealtimeContext";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_META = {
  idle: {
    label: "Idle",
    dot: "bg-slate-500",
    ring: "ring-slate-500/30",
    text: "text-slate-300"
  },
  connecting: {
    label: "Connecting",
    dot: "bg-amber-400 animate-pulse",
    ring: "ring-amber-400/30",
    text: "text-amber-300"
  },
  connected: {
    label: "Live",
    dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]",
    ring: "ring-emerald-400/30",
    text: "text-emerald-300"
  },
  working: {
    label: "Syncing",
    dot: "bg-neon-cyan animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.6)]",
    ring: "ring-neon-cyan/30",
    text: "text-neon-cyan"
  },
  error: {
    label: "Reconnecting",
    dot: "bg-rose-400 animate-pulse",
    ring: "ring-rose-400/30",
    text: "text-rose-300"
  },
  offline: {
    label: "Offline",
    dot: "bg-slate-600",
    ring: "ring-slate-600/40",
    text: "text-slate-400"
  }
} as const;

const TYPE_LABEL: Record<string, string> = {
  "project.created": "Project created",
  "project.updated": "Project updated",
  "project.deleted": "Project deleted",
  "project.status_changed": "Project status changed",
  "project.progress_updated": "Project progress updated",
  "product.created": "Product saved",
  "product.updated": "Product updated",
  "product.deleted": "Product deleted",
  "product.published": "Product published",
  "product.unpublished": "Product unpublished",
  "operator.heartbeat": "Operator heartbeat"
};

function describe(event: {
  type: string;
  payload: Record<string, unknown>;
}): string {
  const project = (event.payload?.project as { name?: string } | undefined)
    ?.name;
  const product = (event.payload?.product as { title?: string } | undefined)
    ?.title;
  const subject = project || product;
  const label = TYPE_LABEL[event.type] ?? event.type;
  return subject ? `${label} · ${subject}` : label;
}

export function RealtimeStatusPill() {
  const { status, events, lastEvent } = useRealtime();
  const meta = STATUS_META[status];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Realtime ${meta.label}${
          lastEvent ? ` — last event ${describe(lastEvent)}` : ""
        }`}
        className={cn(
          "group inline-flex h-9 items-center gap-2 rounded-xl bg-white/[0.03] px-2.5 text-xs font-medium ring-1 transition hover:bg-white/[0.06]",
          meta.ring,
          meta.text
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
        <span className="hidden sm:inline">{meta.label}</span>
        {events.length > 0 && (
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white">
            {events.length > 99 ? "99+" : events.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-[22rem] origin-top-right animate-fade-in rounded-2xl glass-strong p-3 shadow-glow">
          <div className="flex items-center justify-between px-1 pb-2">
            <div className="flex items-center gap-2">
              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
              <span className={cn("text-xs font-medium", meta.text)}>
                {meta.label === "Live"
                  ? "Connected to internal bus"
                  : meta.label}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              SSE · live
            </span>
          </div>
          <div className="my-1 h-px bg-white/5" />

          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-400">
                <Icon.Bell size={16} />
              </span>
              <p className="text-sm text-white">Listening for activity…</p>
              <p className="text-xs text-slate-500">
                Events from your projects and marketplace appear here in
                realtime.
              </p>
            </div>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg px-2 py-2 transition hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-white">
                      {describe(e)}
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {formatRelativeTime(new Date(e.createdAt))}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                    {e.type}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
