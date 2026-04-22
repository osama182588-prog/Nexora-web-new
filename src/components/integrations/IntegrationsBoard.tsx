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
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/ui/Toast";
import { useRealtime } from "@/lib/realtime/RealtimeContext";
import type { ProjectDTO } from "@/lib/projects";
import { cn } from "@/lib/utils";

interface RegistryEntry {
  id: string;
  name: string;
  description: string;
  category: "broadcast" | "support" | "admin" | "analytics" | "automation";
  enabledByDefault: boolean;
  configFields: {
    key: string;
    label: string;
    type: "text" | "password" | "boolean";
    placeholder?: string;
    description?: string;
    required?: boolean;
  }[];
  slashCommands: { name: string; description: string }[];
}

interface InstallEntry {
  moduleId: string;
  enabled: boolean;
  config: Record<string, unknown>;
  lastInvokedAt: string | null;
  invocationCount: number;
  updatedAt: string | null;
}

interface ApiResponse {
  registry: RegistryEntry[];
  installs: InstallEntry[];
  runtime: { discordConfigured: boolean; interactionsUrl: string };
}

const CATEGORY_META: Record<RegistryEntry["category"], { label: string; ring: string; text: string }> = {
  broadcast: { label: "Broadcast", ring: "ring-neon-blue/30", text: "text-neon-blue" },
  support: { label: "Support", ring: "ring-emerald-400/30", text: "text-emerald-300" },
  admin: { label: "Admin", ring: "ring-rose-400/30", text: "text-rose-300" },
  analytics: { label: "Analytics", ring: "ring-neon-cyan/30", text: "text-neon-cyan" },
  automation: { label: "Automation", ring: "ring-neon-purple/30", text: "text-neon-purple" }
};

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

function upsertInstall(list: InstallEntry[], next: InstallEntry): InstallEntry[] {
  const idx = list.findIndex((i) => i.moduleId === next.moduleId);
  if (idx === -1) return [...list, next];
  const copy = list.slice();
  copy[idx] = { ...copy[idx], ...next };
  return copy;
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

interface ModuleCardProps {
  projectId: string;
  module: RegistryEntry;
  install: InstallEntry | null;
  onChange: (next: InstallEntry) => void;
}

function ModuleCard({ projectId, module: mod, install, onChange }: ModuleCardProps) {
  const enabled = install?.enabled ?? false;
  const [config, setConfig] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      mod.configFields.map((f) => [f.key, String(install?.config?.[f.key] ?? "")])
    )
  );
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const meta = CATEGORY_META[mod.category];

  // Re-sync local form when SSE events update the install row.
  useEffect(() => {
    if (!install) return;
    setConfig(
      Object.fromEntries(
        mod.configFields.map((f) => [
          f.key,
          String(install.config?.[f.key] ?? "")
        ])
      )
    );
  }, [install, mod.configFields]);

  async function save(payload: { enabled?: boolean; config?: Record<string, unknown> }) {
    setBusy(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, moduleId: mod.id, ...payload })
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { install: InstallEntry };
      onChange(json.install);
      toast.toast({
        title:
          payload.enabled === true
            ? `${mod.name} enabled`
            : payload.enabled === false
              ? `${mod.name} disabled`
              : `${mod.name} updated`,
        variant: "success"
      });
    } catch (err) {
      toast.toast({
        title: "Could not save",
        description: (err as Error).message,
        variant: "error"
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card variant="glass" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="!text-base">{mod.name}</CardTitle>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wider ring-1",
                meta.ring,
                meta.text
              )}
            >
              {meta.label}
            </span>
            {enabled ? (
              <Badge variant="success">Enabled</Badge>
            ) : (
              <Badge>Disabled</Badge>
            )}
            {install && install.invocationCount > 0 && (
              <Badge variant="purple">{install.invocationCount} runs</Badge>
            )}
          </div>
          <CardDescription className="mt-1">{mod.description}</CardDescription>
          {mod.slashCommands.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-500">
              Commands:{" "}
              {mod.slashCommands.map((c) => (
                <span
                  key={c.name}
                  className="mr-1.5 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-300"
                >
                  /{c.name}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={busy}
          onClick={() => save({ enabled: !enabled })}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition",
            enabled ? "bg-emerald-400/80" : "bg-white/10",
            busy && "opacity-60"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
              enabled ? "left-[22px]" : "left-0.5"
            )}
          />
        </button>
      </div>

      {mod.configFields.length > 0 && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save({ config });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {mod.configFields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                hint={f.description}
                required={f.required}
                htmlFor={`${mod.id}-${f.key}`}
              >
                <Input
                  id={`${mod.id}-${f.key}`}
                  type={f.type === "password" ? "password" : "text"}
                  value={config[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, [f.key]: e.target.value }))
                  }
                />
              </Field>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              {install?.lastInvokedAt
                ? `Last activity ${new Date(install.lastInvokedAt).toLocaleString()}`
                : "Never invoked yet."}
            </p>
            <Button type="submit" size="sm" disabled={busy} variant="secondary">
              {busy ? "Saving…" : "Save configuration"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
