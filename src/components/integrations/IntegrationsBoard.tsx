"use client";

/**
 * Integrations dashboard.
 *
 * - Pick a project from the left.
 * - The right panel lists every module in the registry (`/api/modules`).
 * - Toggle, edit config, save → POST to `/api/modules` → bus event →
 *   SSE → live "Configured" / "Enabled" pill update without reload.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/ui/Toast";
import { useRealtime } from "@/lib/realtime/RealtimeContext";
import type { ProjectDTO } from "@/lib/projects";
import { cn } from "@/lib/utils";
import {
  ModuleCard,
  upsertInstall,
  type InstallEntry,
  type RegistryEntry
} from "@/components/integrations/ModuleCard";

interface ApiResponse {
  registry: RegistryEntry[];
  installs: InstallEntry[];
  access?: { permissions: string[] };
  runtime: { discordConfigured: boolean; interactionsUrl: string };
}

interface Props {
  projects: ProjectDTO[];
}

export function IntegrationsBoard({ projects }: Props) {
  const [selected, setSelected] = useState<string | null>(
    projects[0]?.id ?? null
  );
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Reload on project change.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/modules?projectId=${selected}`)
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        if (!cancelled) setData(d);
      })
      .catch(() =>
        toast.toast({ title: "Could not load modules", variant: "error" })
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selected, toast]);

  // Realtime sync — when a module event for the selected project comes
  // in, refresh the relevant install entry. This keeps multiple tabs +
  // the Discord side fully consistent without polling.
  const { lastEvent } = useRealtime();
  useEffect(() => {
    if (!lastEvent || !selected) return;
    if (!lastEvent.type.startsWith("module.")) return;
    if (lastEvent.resourceId !== selected) return;
    const install = (lastEvent.payload as { install?: InstallEntry }).install;
    if (!install) return;
    setData((cur) =>
      cur
        ? {
            ...cur,
            installs: upsertInstall(cur.installs, install)
          }
        : cur
    );
  }, [lastEvent, selected]);

  const installById = useMemo(() => {
    const m = new Map<string, InstallEntry>();
    for (const i of data?.installs ?? []) m.set(i.moduleId, i);
    return m;
  }, [data]);

  if (projects.length === 0) {
    return (
      <Card variant="glass">
        <EmptyState
          icon={<Icon.Folder size={24} />}
          title="No projects yet"
          description="Create a project first — modules attach to a project so they can share its data and bus events."
          action={
            <Link
              href="/dashboard/projects/new"
              className="inline-flex h-9 items-center rounded-xl bg-neon-gradient px-4 text-sm font-medium text-white shadow-glow"
            >
              Create project
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
      {/* Project picker */}
      <aside className="space-y-2">
        <p className="px-2 text-xs uppercase tracking-wider text-slate-500">
          Project
        </p>
        <div className="space-y-1">
          {projects.map((p) => {
            const isActive = p.id === selected;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                  isActive
                    ? "bg-white/[0.06] text-white ring-1 ring-neon-purple/30"
                    : "text-slate-300 hover:bg-white/[0.03]"
                )}
              >
                <span className="truncate">{p.name}</span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    p.status === "active"
                      ? "bg-emerald-400"
                      : p.status === "paused"
                        ? "bg-amber-400"
                        : "bg-slate-500"
                  )}
                />
              </button>
            );
          })}
        </div>
      </aside>

      {/* Modules */}
      <div className="space-y-4">
        <RuntimeBanner runtime={data?.runtime} />

        {loading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : data ? (
          data.registry.map((mod) => (
            <ModuleCard
              key={mod.id}
              projectId={selected!}
              module={mod}
              install={installById.get(mod.id) ?? null}
              canManage={
                data.access?.permissions
                  ? data.access.permissions.includes("*") ||
                    data.access.permissions.includes("modules.manage")
                  : true
              }
              onChange={(next) =>
                setData((cur) =>
                  cur
                    ? { ...cur, installs: upsertInstall(cur.installs, next) }
                    : cur
                )
              }
            />
          ))
        ) : null}
      </div>
    </div>
  );
}


function RuntimeBanner({ runtime }: { runtime?: ApiResponse["runtime"] }) {
  if (!runtime) return null;
  if (runtime.discordConfigured) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-400/20 text-emerald-300">
          <Icon.Bolt size={14} />
        </span>
        <div className="flex-1">
          <p className="text-white">External integration ready</p>
          <p className="text-xs text-slate-400">
            Point Discord&apos;s <span className="font-mono">Interactions Endpoint URL</span> at{" "}
            <span className="font-mono text-emerald-300">
              {runtime.interactionsUrl}
            </span>
            .
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-400/20 text-amber-300">
        <Icon.Bolt size={14} />
      </span>
      <div>
        <p className="text-white">Discord bot token not configured</p>
        <p className="text-xs text-slate-400">
          Set <span className="font-mono">DISCORD_BOT_TOKEN</span> +{" "}
          <span className="font-mono">DISCORD_PUBLIC_KEY</span> in your environment.
          Modules can be enabled and configured now and will start sending the
          moment the env is set — no restart of the website needed.
        </p>
      </div>
    </div>
  );
}
