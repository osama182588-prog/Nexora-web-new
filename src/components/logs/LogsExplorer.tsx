"use client";

/**
 * LogsExplorer — chronological audit log feed with infinite scroll,
 * live tail and filter bar.
 *
 * Performance notes:
 *
 *  - We never hold more than ~600 entries in memory (oldest are dropped
 *    when the list grows). A user who genuinely needs older history can
 *    use the date filter to pick a window — that's an O(log n) Mongo
 *    query thanks to the compound indexes on `audit_logs`.
 *
 *  - Pagination uses the cursor returned by the API; the loader is
 *    triggered by an `IntersectionObserver` rather than scroll events,
 *    which avoids re-rendering on every scroll tick.
 *
 *  - Live tail is opt-out: when the user has scrolled away from the
 *    top we stop prepending new events and show a "N new" pill that
 *    lets them flush them in one click. This keeps reading older logs
 *    interruption-free.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons";
import { useRealtime } from "@/lib/realtime/RealtimeContext";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  ownerId: string;
  actorId: string | null;
  projectId: string | null;
  resourceId: string | null;
  level: "debug" | "info" | "warn" | "error";
  category:
    | "auth"
    | "project"
    | "member"
    | "module"
    | "marketplace"
    | "ticket"
    | "external"
    | "system";
  type: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ApiResponse {
  logs: LogEntry[];
  nextCursor: string | null;
  hasMore: boolean;
  filters: { levels: LogEntry["level"][]; categories: LogEntry["category"][] };
}

const MAX_IN_MEMORY = 600;
const PAGE_SIZE = 50;

const LEVEL_META: Record<
  LogEntry["level"],
  { label: string; ring: string; text: string; bg: string; icon: keyof typeof Icon }
> = {
  debug: {
    label: "DEBUG",
    ring: "ring-slate-500/30",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    icon: "Info"
  },
  info: {
    label: "INFO",
    ring: "ring-neon-blue/30",
    text: "text-neon-blue",
    bg: "bg-neon-blue/10",
    icon: "Info"
  },
  warn: {
    label: "WARN",
    ring: "ring-amber-400/30",
    text: "text-amber-300",
    bg: "bg-amber-400/10",
    icon: "Warning"
  },
  error: {
    label: "ERROR",
    ring: "ring-rose-400/30",
    text: "text-rose-300",
    bg: "bg-rose-400/10",
    icon: "Warning"
  }
};

const CATEGORY_META: Record<
  LogEntry["category"],
  { label: string; icon: keyof typeof Icon; tone: string }
> = {
  auth: { label: "Auth", icon: "Shield", tone: "text-emerald-300" },
  project: { label: "Project", icon: "Folder", tone: "text-neon-purple" },
  member: { label: "Member", icon: "Users", tone: "text-neon-cyan" },
  module: { label: "Module", icon: "Bolt", tone: "text-neon-blue" },
  marketplace: { label: "Marketplace", icon: "Cart", tone: "text-amber-300" },
  ticket: { label: "Ticket", icon: "Inbox", tone: "text-rose-300" },
  external: { label: "External", icon: "Globe", tone: "text-emerald-300" },
  system: { label: "System", icon: "Sparkles", tone: "text-slate-300" }
};

const LEVELS: LogEntry["level"][] = ["debug", "info", "warn", "error"];
const CATEGORIES: LogEntry["category"][] = [
  "auth",
  "project",
  "member",
  "module",
  "marketplace",
  "ticket",
  "external",
  "system"
];

interface Filters {
  level: LogEntry["level"] | "";
  category: LogEntry["category"] | "";
  q: string;
}

export function LogsExplorer() {
  const [filters, setFilters] = useState<Filters>({ level: "", category: "", q: "" });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLive, setPendingLive] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const seenIdsRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounced search query to avoid hammering the API on every keystroke.
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQ(filters.q.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [filters.q]);

  const buildUrl = useCallback(
    (nextCursor: string | null) => {
      const sp = new URLSearchParams();
      sp.set("limit", String(PAGE_SIZE));
      if (filters.level) sp.set("level", filters.level);
      if (filters.category) sp.set("category", filters.category);
      if (debouncedQ) sp.set("q", debouncedQ);
      if (nextCursor) sp.set("cursor", nextCursor);
      return `/api/logs?${sp.toString()}`;
    },
    [filters.level, filters.category, debouncedQ]
  );

  // Initial / filter-change load.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPendingLive([]);
    fetch(buildUrl(null))
      .then((r) => r.json() as Promise<ApiResponse>)
      .then((data) => {
        if (cancelled) return;
        seenIdsRef.current = new Set(data.logs.map((l) => l.id));
        setLogs(data.logs);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Failed to load logs.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [buildUrl]);

  // Infinite scroll — load more when the sentinel becomes visible.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (!visible) return;
        if (loading || loadingMore || !hasMore || !cursor) return;
        setLoadingMore(true);
        fetch(buildUrl(cursor))
          .then((r) => r.json() as Promise<ApiResponse>)
          .then((data) => {
            const fresh = data.logs.filter((l) => !seenIdsRef.current.has(l.id));
            for (const l of fresh) seenIdsRef.current.add(l.id);
            setLogs((cur) => {
              const merged = [...cur, ...fresh];
              if (merged.length > MAX_IN_MEMORY) {
                // Keep newest only — the oldest will be re-fetched if
                // the user scrolls back via the date filter.
                merged.length = MAX_IN_MEMORY;
              }
              return merged;
            });
            setCursor(data.nextCursor);
            setHasMore(data.hasMore);
          })
          .catch((err: Error) => setError(err.message || "Failed to load more."))
          .finally(() => setLoadingMore(false));
      },
      { rootMargin: "240px 0px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [buildUrl, cursor, hasMore, loading, loadingMore]);

  // Live tail via SSE: convert incoming bus events into log entries
  // shaped like the API response and either prepend (when at top) or
  // park them in `pendingLive`.
  const { lastEvent } = useRealtime();
  useEffect(() => {
    if (!lastEvent) return;
    if (seenIdsRef.current.has(lastEvent.id)) return;
    const synthesized = liveEventToLog(lastEvent);
    if (!synthesized) return;
    if (filters.level && filters.level !== synthesized.level) return;
    if (filters.category && filters.category !== synthesized.category) return;
    if (
      debouncedQ &&
      !synthesized.type.toLowerCase().includes(debouncedQ.toLowerCase()) &&
      !synthesized.message.toLowerCase().includes(debouncedQ.toLowerCase())
    ) {
      return;
    }
    seenIdsRef.current.add(synthesized.id);

    const atTop = (containerRef.current?.scrollTop ?? 0) < 80;
    if (atTop) {
      setLogs((cur) => {
        const next = [synthesized, ...cur];
        if (next.length > MAX_IN_MEMORY) next.length = MAX_IN_MEMORY;
        return next;
      });
    } else {
      setPendingLive((cur) => [synthesized, ...cur].slice(0, 50));
    }
  }, [lastEvent, filters.level, filters.category, debouncedQ]);

  function flushPending() {
    if (pendingLive.length === 0) return;
    setLogs((cur) => {
      const next = [...pendingLive, ...cur];
      if (next.length > MAX_IN_MEMORY) next.length = MAX_IN_MEMORY;
      return next;
    });
    setPendingLive([]);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  const grouped = useMemo(() => groupByDay(logs), [logs]);
  const totalShown = logs.length;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card variant="glass" className="!p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_10rem_10rem_auto]">
          <div className="relative">
            <Icon.Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <Input
              placeholder="Search by message or event type…"
              value={filters.q}
              onChange={(e) =>
                setFilters((f) => ({ ...f, q: e.target.value }))
              }
              className="!pl-9"
            />
          </div>
          <Select
            value={filters.level}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                level: e.target.value as Filters["level"]
              }))
            }
            aria-label="Filter by level"
          >
            <option value="">All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_META[l].label}
              </option>
            ))}
          </Select>
          <Select
            value={filters.category}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                category: e.target.value as Filters["category"]
              }))
            }
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFilters({ level: "", category: "", q: "" })}
            disabled={!filters.level && !filters.category && !filters.q}
          >
            Reset
          </Button>
        </div>
      </Card>

      {/* Live tail pill */}
      {pendingLive.length > 0 && (
        <button
          type="button"
          onClick={flushPending}
          className="sticky top-2 z-10 mx-auto flex items-center gap-2 rounded-full border border-neon-purple/40 bg-slate-950/90 px-4 py-1.5 text-xs text-white shadow-glow-sm backdrop-blur transition hover:bg-slate-900"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-purple" />
          {pendingLive.length} new {pendingLive.length === 1 ? "event" : "events"}
        </button>
      )}

      {/* Feed */}
      <Card variant="glass" className="!p-0">
        <div
          ref={containerRef}
          className="max-h-[68vh] overflow-y-auto px-4 py-3"
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={<Icon.Warning size={24} />}
              title="Could not load logs"
              description={error}
            />
          ) : totalShown === 0 ? (
            <EmptyState
              icon={<Icon.Info size={24} />}
              title="No logs match these filters"
              description="Try widening your search or clearing the filter bar."
            />
          ) : (
            <ol className="space-y-5">
              {grouped.map(({ day, items }) => (
                <li key={day}>
                  <h3 className="sticky top-0 z-[1] -mx-4 mb-2 bg-gradient-to-b from-slate-950/80 to-slate-950/0 px-4 pt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500 backdrop-blur-sm">
                    {day}
                  </h3>
                  <ul className="space-y-1">
                    {items.map((log) => (
                      <LogRow
                        key={log.id}
                        log={log}
                        expanded={!!expanded[log.id]}
                        onToggle={() =>
                          setExpanded((s) => ({ ...s, [log.id]: !s[log.id] }))
                        }
                      />
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}

          <div ref={sentinelRef} className="h-8" />
          {loadingMore && (
            <div className="py-3 text-center text-xs text-slate-500">
              Loading older entries…
            </div>
          )}
          {!loading && !hasMore && totalShown > 0 && (
            <div className="py-3 text-center text-[11px] text-slate-600">
              You&apos;ve reached the beginning.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ----------------------------- Log row ----------------------------- */

function LogRow({
  log,
  expanded,
  onToggle
}: {
  log: LogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const lvl = LEVEL_META[log.level];
  const cat = CATEGORY_META[log.category];
  const Lvl = Icon[lvl.icon];
  const Cat = Icon[cat.icon];
  const time = new Date(log.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const metadataKeys = Object.keys(log.metadata ?? {});
  const hasMetadata = metadataKeys.length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "group flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition",
          "hover:border-white/10 hover:bg-white/[0.03]"
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1",
            lvl.bg,
            lvl.ring,
            lvl.text
          )}
          title={lvl.label}
        >
          <Lvl size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={cn("font-mono uppercase tracking-wider", lvl.text)}>
              {lvl.label}
            </span>
            <span className="text-slate-600">·</span>
            <span className={cn("inline-flex items-center gap-1", cat.tone)}>
              <Cat size={11} /> {cat.label}
            </span>
            <span className="text-slate-600">·</span>
            <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
              {log.type}
            </code>
            <span className="ml-auto font-mono text-[10px] text-slate-500">
              {time}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-200">{log.message}</p>
          {(log.actorId || log.projectId) && (
            <p className="mt-1 text-[11px] text-slate-500">
              {log.actorId && (
                <>
                  by <span className="text-slate-300">{log.actorId}</span>
                </>
              )}
              {log.actorId && log.projectId && " · "}
              {log.projectId && (
                <>
                  on{" "}
                  <span className="text-slate-300">
                    project {log.projectId}
                  </span>
                </>
              )}
            </p>
          )}
          {expanded && hasMetadata && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/5 bg-black/30 p-2 text-[11px] leading-snug text-slate-300">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          )}
          {hasMetadata && (
            <span className="mt-1 inline-flex items-center text-[10px] text-slate-500 group-hover:text-slate-400">
              {expanded ? "Hide details" : "Show details"}
              <Icon.Chevron
                size={10}
                className={cn("ml-0.5 transition", expanded && "rotate-90")}
              />
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

/* ------------------------------ Helpers ---------------------------- */

function groupByDay(logs: LogEntry[]): { day: string; items: LogEntry[] }[] {
  const out: { day: string; items: LogEntry[] }[] = [];
  let currentDay = "";
  for (const log of logs) {
    const d = new Date(log.createdAt);
    const day = d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    if (day !== currentDay) {
      out.push({ day, items: [] });
      currentDay = day;
    }
    out[out.length - 1].items.push(log);
  }
  return out;
}

interface LiveEvent {
  id: string;
  type: string;
  actorId: string;
  resourceId: string | null;
  payload: Record<string, unknown>;
  receivedAt: number;
  createdAt?: string;
}

function liveEventToLog(event: LiveEvent): LogEntry | null {
  const payload = event.payload ?? {};
  const ownerId =
    typeof payload.ownerId === "string" ? payload.ownerId : event.actorId;
  if (!ownerId) return null;
  const { level, category } = classify(event.type);
  return {
    id: event.id,
    ownerId,
    actorId: typeof payload.by === "string" ? payload.by : event.actorId,
    projectId:
      typeof payload.projectId === "string"
        ? payload.projectId
        : event.resourceId,
    resourceId: event.resourceId,
    level,
    category,
    type: event.type,
    message:
      typeof payload.message === "string"
        ? payload.message
        : `${event.type}${event.resourceId ? ` (${event.resourceId})` : ""}`,
    metadata: stripHeavy(payload),
    createdAt: event.createdAt ?? new Date(event.receivedAt).toISOString()
  };
}

const HEAVY_KEYS = new Set(["project", "product", "ticket", "install"]);
function stripHeavy(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (HEAVY_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function classify(type: string): {
  level: LogEntry["level"];
  category: LogEntry["category"];
} {
  if (type.startsWith("project."))
    return {
      level: type === "project.deleted" ? "warn" : "info",
      category: "project"
    };
  if (type.startsWith("module.")) return { level: "info", category: "module" };
  if (type.startsWith("product."))
    return { level: "info", category: "marketplace" };
  if (type.startsWith("ticket.")) return { level: "info", category: "ticket" };
  if (type === "external.discord.failed")
    return { level: "error", category: "external" };
  if (type.startsWith("external."))
    return { level: "info", category: "external" };
  if (type.startsWith("auth.")) return { level: "info", category: "auth" };
  return { level: "info", category: "system" };
}
