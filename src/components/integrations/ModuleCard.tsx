"use client";

/**
 * Shared types & UI atoms for the modules system.
 *
 * The integrations dashboard (cross-project overview) and the per-project
 * settings page both render the same `ModuleCard` — keeping it here
 * means a styling / behaviour change happens in exactly one place.
 */
import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export interface RegistryEntry {
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

export interface InstallEntry {
  moduleId: string;
  enabled: boolean;
  config: Record<string, unknown>;
  lastInvokedAt: string | null;
  invocationCount: number;
  updatedAt: string | null;
}

export const CATEGORY_META: Record<
  RegistryEntry["category"],
  { label: string; ring: string; text: string }
> = {
  broadcast: { label: "Broadcast", ring: "ring-neon-blue/30", text: "text-neon-blue" },
  support: { label: "Support", ring: "ring-emerald-400/30", text: "text-emerald-300" },
  admin: { label: "Admin", ring: "ring-rose-400/30", text: "text-rose-300" },
  analytics: { label: "Analytics", ring: "ring-neon-cyan/30", text: "text-neon-cyan" },
  automation: { label: "Automation", ring: "ring-neon-purple/30", text: "text-neon-purple" }
};

export function upsertInstall(
  list: InstallEntry[],
  next: InstallEntry
): InstallEntry[] {
  const idx = list.findIndex((i) => i.moduleId === next.moduleId);
  if (idx === -1) return [...list, next];
  const copy = list.slice();
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

interface ModuleCardProps {
  projectId: string;
  module: RegistryEntry;
  install: InstallEntry | null;
  /** When false, all controls are read-only. */
  canManage: boolean;
  onChange: (next: InstallEntry) => void;
}

export function ModuleCard({
  projectId,
  module: mod,
  install,
  canManage,
  onChange
}: ModuleCardProps) {
  const enabled = install?.enabled ?? false;
  const [config, setConfig] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      mod.configFields.map((f) => [f.key, String(install?.config?.[f.key] ?? "")])
    )
  );
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const meta = CATEGORY_META[mod.category];

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
    if (!canManage) return;
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
            {!canManage && <Badge>Read-only</Badge>}
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

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={busy || !canManage}
          onClick={() => save({ enabled: !enabled })}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition",
            enabled ? "bg-emerald-400/80" : "bg-white/10",
            (busy || !canManage) && "opacity-60",
            !canManage && "cursor-not-allowed"
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
                  disabled={!canManage}
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
            <Button
              type="submit"
              size="sm"
              disabled={busy || !canManage}
              variant="secondary"
            >
              {busy ? "Saving…" : "Save configuration"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
