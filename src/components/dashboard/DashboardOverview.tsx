"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { Icon } from "@/components/icons";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import {
  projectsApi,
  type ActivityDTO,
  type ProjectStats
} from "@/lib/client-api";
import type { ProjectDTO } from "@/lib/projects";
import { formatRelativeTime } from "@/lib/format";
import { useRealtime } from "@/lib/realtime/RealtimeContext";
import { cn } from "@/lib/utils";

interface OverviewProps {
  greetingName: string;
  /**
   * Server-rendered first-paint data. When provided, the component
   * skips its initial client fetch — the dashboard appears with real
   * numbers on the first paint instead of a skeleton flash.
   */
  initialData?: {
    stats: ProjectStats;
    activity: ActivityDTO[];
    recent: ProjectDTO[];
  } | null;
}

export function DashboardOverview({ greetingName, initialData }: OverviewProps) {
  const [stats, setStats] = useState<ProjectStats | null>(
    initialData?.stats ?? null
  );
  const [activity, setActivity] = useState<ActivityDTO[] | null>(
    initialData?.activity ?? null
  );
  const [recent, setRecent] = useState<ProjectDTO[] | null>(
    initialData?.recent ?? null
  );

  useEffect(() => {
    // First paint already populated by SSR — no need for a client
    // round-trip on initial mount. Live SSE updates below keep
    // everything fresh.
    if (initialData) return;
    let cancelled = false;
    Promise.all([
      projectsApi.stats(),
      projectsApi.activity(8),
      projectsApi.list({ sort: "recent", limit: "5" })
    ])
      .then(([s, a, r]) => {
        if (cancelled) return;
        setStats(s);
        setActivity(a.activities);
        setRecent(r.projects);
      })
      .catch(() => {
        if (cancelled) return;
        setStats({
          total: 0,
          byStatus: { active: 0, paused: 0, completed: 0, archived: 0 },
          averageProgress: 0
        });
        setActivity([]);
        setRecent([]);
      });
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  // Realtime sync — every project event from the internal bus updates
  // the recent-projects card and prepends a synthesised activity entry
  // so the feed feels alive between server reads.
  const { lastEvent } = useRealtime();
  useEffect(() => {
    if (!lastEvent) return;
    if (!lastEvent.type.startsWith("project.")) return;
    const project = (lastEvent.payload as { project?: ProjectDTO }).project;
    if (!project) return;

    setRecent((cur) => {
      if (!cur) return cur;
      switch (lastEvent.type) {
        case "project.created":
          return cur.some((p) => p.id === project.id)
            ? cur
            : [project, ...cur].slice(0, 5);
        case "project.deleted":
          return cur.filter((p) => p.id !== project.id);
        default:
          // For updates, replace in place and bubble to the top.
          return [
            project,
            ...cur.filter((p) => p.id !== project.id)
          ].slice(0, 5);
      }
    });

    setActivity((cur) => {
      const item: ActivityDTO = {
        id: lastEvent.id,
        type: lastEvent.type,
        message: humanize(lastEvent.type, project.name),
        createdAt: lastEvent.createdAt,
        projectId: project.id
      };
      if (!cur) return [item];
      // De-dupe by id (the bus id matches the SSE event id).
      if (cur.some((a) => a.id === item.id)) return cur;
      return [item, ...cur].slice(0, 8);
    });
  }, [lastEvent]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
            Dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
            Welcome back, {greetingName.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Here&apos;s a snapshot of every project in your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="purple">
            <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-neon-purple" />
            Phase 4 · Integrated
          </Badge>
          <Link href="/dashboard/projects/new">
            <Button size="sm">
              <Icon.Plus size={14} />
              New project
            </Button>
          </Link>
        </div>
      </div>

      <OnboardingChecklist />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="Folder"
          label="Total projects"
          value={stats ? String(stats.total) : null}
          accent="purple"
        />
        <StatCard
          icon="Bolt"
          label="Active"
          value={stats ? String(stats.byStatus.active) : null}
          accent="emerald"
          hint="In progress right now"
        />
        <StatCard
          icon="Check2"
          label="Completed"
          value={stats ? String(stats.byStatus.completed) : null}
          accent="blue"
        />
        <StatCard
          icon="Chart"
          label="Avg. progress"
          value={stats ? `${stats.averageProgress}%` : null}
          accent="cyan"
          progress={stats?.averageProgress ?? 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card variant="glass" className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Recent projects</CardTitle>
              <CardDescription>The five projects with newest activity.</CardDescription>
            </div>
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-white"
            >
              View all <Icon.Arrow size={12} />
            </Link>
          </div>

          {recent === null ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              className="mt-5 border border-white/5 bg-transparent shadow-none"
              icon={<Icon.Folder />}
              title="No projects yet"
              description="Create your first project to start tracking work."
              action={
                <Link href="/dashboard/projects/new">
                  <Button variant="primary" size="sm">
                    <Icon.Plus size={14} />
                    Create project
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="mt-5 space-y-2">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/projects/${p.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-neon-purple/30 hover:bg-white/[0.04] hover:shadow-glow-sm"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition",
                        p.color === "purple" && "bg-neon-purple/10 text-neon-purple ring-neon-purple/30",
                        p.color === "blue" && "bg-neon-blue/10 text-neon-blue ring-neon-blue/30",
                        p.color === "cyan" && "bg-neon-cyan/10 text-neon-cyan ring-neon-cyan/30",
                        p.color === "emerald" && "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
                        p.color === "amber" && "bg-amber-400/10 text-amber-300 ring-amber-400/30",
                        p.color === "rose" && "bg-rose-400/10 text-rose-300 ring-rose-400/30"
                      )}
                    >
                      <Icon.Folder size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Updated {formatRelativeTime(p.lastActivityAt)}
                      </p>
                    </div>
                    <div className="hidden w-32 sm:block">
                      <ProgressBar value={p.progress} color={p.color} />
                    </div>
                    <Tooltip content="Open project">
                      <Icon.Arrow
                        size={14}
                        className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                      />
                    </Tooltip>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card variant="glass">
          <CardTitle>Activity feed</CardTitle>
          <CardDescription>Recent actions in your workspace.</CardDescription>
          {activity === null ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-slate-500">
              No activity yet. Create a project to get started.
            </div>
          ) : (
            <ul className="mt-5 space-y-2">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="group relative flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition hover:border-neon-purple/20 hover:bg-white/[0.04]"
                >
                  <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-neon-purple/10 text-neon-purple ring-1 ring-neon-purple/20">
                    <ActivityGlyph type={a.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-slate-200">{a.message}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatRelativeTime(a.createdAt)}
                    </p>
                  </div>
                  {a.projectId && (
                    <Link
                      href={`/dashboard/projects/${a.projectId}`}
                      aria-label="Open related project"
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Icon.Arrow size={14} className="text-slate-400 hover:text-white" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ActivityGlyph({ type }: { type: string }) {
  if (type === "project.created") return <Icon.Plus size={12} />;
  if (type === "project.deleted") return <Icon.Trash size={12} />;
  if (type === "project.status_changed") return <Icon.Bolt size={12} />;
  if (type === "project.progress_updated") return <Icon.Chart size={12} />;
  return <Icon.Edit size={12} />;
}

/** Build a friendly activity message from a bus event. */
function humanize(type: string, name: string): string {
  switch (type) {
    case "project.created":
      return `Created project "${name}"`;
    case "project.deleted":
      return `Deleted project "${name}"`;
    case "project.status_changed":
      return `Status changed on "${name}"`;
    case "project.progress_updated":
      return `Progress updated on "${name}"`;
    case "project.updated":
    default:
      return `Updated "${name}"`;
  }
}

interface StatCardProps {
  icon: keyof typeof Icon;
  label: string;
  value: string | null;
  accent: "purple" | "blue" | "cyan" | "emerald";
  hint?: string;
  progress?: number;
}

function StatCard({ icon, label, value, accent, hint, progress }: StatCardProps) {
  const Ico = Icon[icon];
  const accentRing: Record<StatCardProps["accent"], string> = {
    purple: "bg-neon-purple/10 text-neon-purple ring-neon-purple/30",
    blue: "bg-neon-blue/10 text-neon-blue ring-neon-blue/30",
    cyan: "bg-neon-cyan/10 text-neon-cyan ring-neon-cyan/30",
    emerald: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30"
  };

  return (
    <Card variant="glass" interactive className="overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
          {value === null ? (
            <Skeleton className="mt-2 h-9 w-20" />
          ) : (
            <p className="mt-2 font-display text-3xl font-semibold text-white">
              {value}
            </p>
          )}
        </div>
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl ring-1",
            accentRing[accent]
          )}
        >
          <Ico size={18} />
        </span>
      </div>
      {typeof progress === "number" ? (
        <div className="mt-4">
          <ProgressBar value={progress} color={accent === "emerald" ? "emerald" : accent} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">{hint ?? "\u00A0"}</p>
      )}
    </Card>
  );
}
