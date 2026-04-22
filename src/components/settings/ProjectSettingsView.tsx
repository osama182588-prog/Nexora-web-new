"use client";

/**
 * Per-project settings — the home for everything that's "this project's
 * configuration": its general info, its modules, its members & roles.
 *
 * The view is permission-aware end-to-end: every control disables (and
 * the API guards a second time) when the caller lacks the matching
 * permission. We surface the user's current role at the top so they
 * always know what they can and can't do.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
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

interface AccessSnapshot {
  role: "owner" | "manager" | "member" | "viewer" | null;
  isOwner: boolean;
  permissions: string[];
}

interface Props {
  project: ProjectDTO;
  access: AccessSnapshot;
  currentUserId: string;
}

type Tab = "general" | "modules" | "roles";

const TABS: { id: Tab; label: string; icon: keyof typeof Icon }[] = [
  { id: "general", label: "General", icon: "Settings" },
  { id: "modules", label: "Modules", icon: "Bolt" },
  { id: "roles", label: "Roles & Members", icon: "Users" }
];

const ROLE_BADGE: Record<NonNullable<AccessSnapshot["role"]>, string> = {
  owner: "bg-amber-400/15 text-amber-200 border-amber-400/30",
  manager: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
  member: "bg-neon-blue/15 text-neon-blue border-neon-blue/30",
  viewer: "bg-white/5 text-slate-300 border-white/10"
};

function hasPerm(access: AccessSnapshot, perm: string): boolean {
  return access.permissions.includes("*") || access.permissions.includes(perm);
}

export function ProjectSettingsView({ project: initial, access, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("general");
  const [project, setProject] = useState<ProjectDTO>(initial);

  // Live-sync project state via SSE — when another tab or Discord
  // mutates this project, the settings page reflects it immediately.
  const { lastEvent } = useRealtime();
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.resourceId !== project.id) return;
    if (!lastEvent.type.startsWith("project.")) return;
    const next = (lastEvent.payload as { project?: ProjectDTO }).project;
    if (next && next.id === project.id) setProject(next);
  }, [lastEvent, project.id]);

  return (
    <div className="space-y-6">
      <RoleBanner access={access} />

      <nav className="flex gap-1 border-b border-white/5">
        {TABS.map((t) => {
          const isActive = t.id === tab;
          const Ico = Icon[t.icon];
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition",
                isActive
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Ico size={14} />
              {t.label}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-neon-gradient" />
              )}
            </button>
          );
        })}
      </nav>

      {tab === "general" && (
        <GeneralPanel
          project={project}
          access={access}
          onChange={setProject}
        />
      )}
      {tab === "modules" && <ModulesPanel project={project} access={access} />}
      {tab === "roles" && (
        <RolesPanel
          project={project}
          access={access}
          currentUserId={currentUserId}
          onChange={setProject}
        />
      )}
    </div>
  );
}

/* --------------------------- Role banner --------------------------- */

function RoleBanner({ access }: { access: AccessSnapshot }) {
  const role = access.role ?? "viewer";
  return (
    <Card variant="glass" className="!p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] uppercase tracking-wider",
              ROLE_BADGE[role]
            )}
          >
            {role}
          </span>
          <p className="text-sm text-slate-300">
            You have <span className="text-white">{access.permissions.length}</span>{" "}
            {access.permissions.length === 1 ? "permission" : "permissions"} on this
            project.
          </p>
        </div>
        <Link
          href="#"
          className="text-xs text-neon-purple hover:text-neon-cyan"
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById("permissions-help");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        >
          What can I do?
        </Link>
      </div>
    </Card>
  );
}

/* --------------------------- General tab --------------------------- */

const STATUSES = ["active", "paused", "completed", "archived"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

function GeneralPanel({
  project,
  access,
  onChange
}: {
  project: ProjectDTO;
  access: AccessSnapshot;
  onChange: (next: ProjectDTO) => void;
}) {
  const canEdit = hasPerm(access, "project.update");
  const canDelete = hasPerm(access, "project.delete");
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState(project.status);
  const [priority, setPriority] = useState(project.priority);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
    setStatus(project.status);
    setPriority(project.priority);
  }, [project]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, status, priority })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      const j = (await res.json()) as { project: ProjectDTO };
      onChange(j.project);
      toast.toast({ title: "Project updated", variant: "success" });
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

  async function remove() {
    if (!canDelete) return;
    if (!window.confirm(`Delete "${project.name}" permanently?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      window.location.href = "/dashboard/projects";
    } catch (err) {
      toast.toast({
        title: "Delete failed",
        description: (err as Error).message,
        variant: "error"
      });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card variant="glass" className="space-y-4">
        <div>
          <CardTitle className="!text-base">Project details</CardTitle>
          <CardDescription>
            The name, description, and lifecycle of the project.
          </CardDescription>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" htmlFor="proj-name" required>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              maxLength={80}
            />
          </Field>
          <Field label="Status" htmlFor="proj-status">
            <Select
              id="proj-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              disabled={!canEdit}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority" htmlFor="proj-priority">
            <Select
              id="proj-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              disabled={!canEdit}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Description"
            htmlFor="proj-desc"
            className="md:col-span-2"
            hint="Up to 500 characters. Visible to every project member."
          >
            <textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-neon-purple/30 transition focus:border-neon-purple/40 focus:ring-2 disabled:opacity-60"
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={busy || !canEdit}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Card>

      {canDelete && (
        <Card variant="glass" className="border-rose-500/30 !bg-rose-500/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="!text-base !text-rose-200">
                Danger zone
              </CardTitle>
              <CardDescription>
                Deleting a project removes its modules, tickets and members
                immediately. This action cannot be undone.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={remove}
              disabled={busy}
              className="!border-rose-500/50 !text-rose-200 hover:!bg-rose-500/10"
            >
              Delete project
            </Button>
          </div>
        </Card>
      )}
    </form>
  );
}

/* ---------------------------- Modules tab -------------------------- */

interface ModulesApiResponse {
  registry: RegistryEntry[];
  installs: InstallEntry[];
  access: AccessSnapshot;
  runtime: { discordConfigured: boolean; interactionsUrl: string };
}

function ModulesPanel({
  project,
  access
}: {
  project: ProjectDTO;
  access: AccessSnapshot;
}) {
  const [data, setData] = useState<ModulesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const canManage = hasPerm(access, "modules.manage");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/modules?projectId=${project.id}`)
      .then((r) => r.json())
      .then((d: ModulesApiResponse) => {
        if (!cancelled) setData(d);
      })
      .catch(() =>
        toast.toast({ title: "Could not load modules", variant: "error" })
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [project.id, toast]);

  // Live updates: react to module.* events for this project.
  const { lastEvent } = useRealtime();
  useEffect(() => {
    if (!lastEvent || !lastEvent.type.startsWith("module.")) return;
    if (lastEvent.resourceId !== project.id) return;
    const install = (lastEvent.payload as { install?: InstallEntry }).install;
    if (!install) return;
    setData((cur) =>
      cur ? { ...cur, installs: upsertInstall(cur.installs, install) } : cur
    );
  }, [lastEvent, project.id]);

  const installById = useMemo(() => {
    const m = new Map<string, InstallEntry>();
    for (const i of data?.installs ?? []) m.set(i.moduleId, i);
    return m;
  }, [data]);

  return (
    <div className="space-y-4">
      <RuntimeBanner runtime={data?.runtime} />
      {loading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        data.registry.map((mod) => (
          <ModuleCard
            key={mod.id}
            projectId={project.id}
            module={mod}
            install={installById.get(mod.id) ?? null}
            canManage={canManage}
            onChange={(next) =>
              setData((cur) =>
                cur ? { ...cur, installs: upsertInstall(cur.installs, next) } : cur
              )
            }
          />
        ))
      )}
    </div>
  );
}

function RuntimeBanner({ runtime }: { runtime?: ModulesApiResponse["runtime"] }) {
  if (!runtime) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm",
        runtime.discordConfigured
          ? "border-emerald-400/20 bg-emerald-400/5"
          : "border-amber-400/20 bg-amber-400/5"
      )}
    >
      <span
        className={cn(
          "grid h-7 w-7 place-items-center rounded-lg",
          runtime.discordConfigured
            ? "bg-emerald-400/20 text-emerald-300"
            : "bg-amber-400/20 text-amber-300"
        )}
      >
        <Icon.Bolt size={14} />
      </span>
      <div>
        <p className="text-white">
          {runtime.discordConfigured
            ? "External integration ready"
            : "Discord credentials not configured"}
        </p>
        <p className="text-xs text-slate-400">
          {runtime.discordConfigured ? (
            <>
              Interactions endpoint:{" "}
              <span className="font-mono text-emerald-300">
                {runtime.interactionsUrl}
              </span>
            </>
          ) : (
            <>
              Set <span className="font-mono">DISCORD_BOT_TOKEN</span> +{" "}
              <span className="font-mono">DISCORD_PUBLIC_KEY</span> to start
              broadcasting.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- Roles tab --------------------------- */

const ASSIGNABLE_ROLES = ["manager", "member", "viewer"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const PERMISSION_GROUPS: { label: string; permissions: { id: string; label: string }[] }[] = [
  {
    label: "Project",
    permissions: [
      { id: "project.update", label: "Edit project" },
      { id: "project.delete", label: "Delete project" }
    ]
  },
  {
    label: "Members",
    permissions: [
      { id: "project.members.read", label: "View members" },
      { id: "project.members.manage", label: "Manage members" }
    ]
  },
  {
    label: "Modules & integrations",
    permissions: [
      { id: "modules.read", label: "View modules" },
      { id: "modules.manage", label: "Manage modules" }
    ]
  },
  {
    label: "Tickets & marketplace",
    permissions: [
      { id: "tickets.manage", label: "Triage tickets" },
      { id: "marketplace.manage", label: "Manage listing" }
    ]
  }
];

function RolesPanel({
  project,
  access,
  currentUserId,
  onChange
}: {
  project: ProjectDTO;
  access: AccessSnapshot;
  currentUserId: string;
  onChange: (next: ProjectDTO) => void;
}) {
  const canManage = hasPerm(access, "project.members.manage");
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  // Add-member form state.
  const [newId, setNewId] = useState("");
  const [newRole, setNewRole] = useState<AssignableRole>("member");

  async function call(
    method: "POST" | "PATCH" | "DELETE",
    body?: Record<string, unknown>,
    query = ""
  ) {
    const res = await fetch(
      `/api/projects/${project.id}/members${query}`,
      {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      }
    );
    if (!res.ok) {
      let msg = res.statusText;
      try {
        msg = ((await res.json()) as { message?: string }).message ?? msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return (await res.json()) as { project: ProjectDTO };
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !newId.trim()) return;
    setBusy("add");
    try {
      const j = await call("POST", { userId: newId.trim(), role: newRole });
      onChange(j.project);
      setNewId("");
      toast.toast({ title: "Member added", variant: "success" });
    } catch (err) {
      toast.toast({
        title: "Could not add member",
        description: (err as Error).message,
        variant: "error"
      });
    } finally {
      setBusy(null);
    }
  }

  async function updateMember(
    userId: string,
    patch: { role?: string; permissions?: string[] }
  ) {
    if (!canManage) return;
    setBusy(userId);
    try {
      const j = await call("PATCH", { userId, ...patch });
      onChange(j.project);
    } catch (err) {
      toast.toast({
        title: "Update failed",
        description: (err as Error).message,
        variant: "error"
      });
    } finally {
      setBusy(null);
    }
  }

  async function removeMember(userId: string) {
    if (!canManage) return;
    if (!window.confirm("Remove this member?")) return;
    setBusy(userId);
    try {
      const j = await call(
        "DELETE",
        undefined,
        `?userId=${encodeURIComponent(userId)}`
      );
      onChange(j.project);
      toast.toast({ title: "Member removed", variant: "success" });
    } catch (err) {
      toast.toast({
        title: "Remove failed",
        description: (err as Error).message,
        variant: "error"
      });
    } finally {
      setBusy(null);
    }
  }

  // Always show the workspace owner first, even if absent from members[].
  const owners = project.members.filter((m) => m.userId === project.ownerId);
  const ownerRow = owners[0] ?? {
    userId: project.ownerId,
    role: "owner" as const,
    permissions: [],
    addedBy: null,
    invitedAt: project.createdAt
  };
  const others = project.members.filter((m) => m.userId !== project.ownerId);

  return (
    <div className="space-y-4">
      {canManage && (
        <Card variant="glass" className="space-y-3">
          <div>
            <CardTitle className="!text-base">Add member</CardTitle>
            <CardDescription>
              Add a teammate by their user id. They&apos;ll appear instantly
              for everyone with access.
            </CardDescription>
          </div>
          <form
            onSubmit={addMember}
            className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]"
          >
            <Field label="User id" htmlFor="new-member-id">
              <Input
                id="new-member-id"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="e.g. discord:284…  or  user_abc123"
                required
              />
            </Field>
            <Field label="Role" htmlFor="new-member-role">
              <Select
                id="new-member-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AssignableRole)}
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button
                type="submit"
                size="sm"
                disabled={busy === "add" || !newId.trim()}
              >
                {busy === "add" ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card variant="glass" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="!text-base">Members</CardTitle>
            <CardDescription>
              {project.members.length || 1}{" "}
              {project.members.length === 1 ? "member" : "members"} on this project
            </CardDescription>
          </div>
        </div>

        <ul className="divide-y divide-white/5">
          <MemberRow
            key={ownerRow.userId}
            member={{
              userId: ownerRow.userId,
              role: "owner",
              permissions: [],
              addedBy: null,
              invitedAt: ownerRow.invitedAt
            }}
            isSelf={ownerRow.userId === currentUserId}
            isOwner
            canManage={false}
            busy={false}
            onUpdate={() => undefined}
            onRemove={() => undefined}
          />
          {others.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              isSelf={m.userId === currentUserId}
              isOwner={false}
              canManage={canManage}
              busy={busy === m.userId}
              onUpdate={(patch) => updateMember(m.userId, patch)}
              onRemove={() => removeMember(m.userId)}
            />
          ))}
        </ul>
      </Card>

      <Card variant="glass" id="permissions-help">
        <CardTitle className="!text-base">Roles &amp; permissions</CardTitle>
        <CardDescription className="!mt-1">
          Roles are starting points — you can grant individual permissions on
          top of any role to fine-tune access.
        </CardDescription>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PERMISSION_GROUPS.map((g) => (
            <div
              key={g.label}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {g.label}
              </p>
              <ul className="mt-2 space-y-1">
                {g.permissions.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-300">{p.label}</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {p.id}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MemberRow({
  member,
  isSelf,
  isOwner,
  canManage,
  busy,
  onUpdate,
  onRemove
}: {
  member: ProjectDTO["members"][number];
  isSelf: boolean;
  isOwner: boolean;
  canManage: boolean;
  busy: boolean;
  onUpdate: (patch: { role?: string; permissions?: string[] }) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const role = isOwner ? "owner" : member.role;
  const perms = new Set(member.permissions);

  function togglePerm(p: string) {
    const next = new Set(perms);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    onUpdate({ permissions: Array.from(next) });
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-neon-gradient text-xs font-semibold text-white shadow-glow-sm">
            {member.userId.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm text-white">
              {member.userId}
              {isSelf && (
                <span className="ml-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                  you
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">
              {member.invitedAt
                ? `Joined ${new Date(member.invitedAt).toLocaleDateString()}`
                : "Workspace owner"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <Badge variant="purple">owner</Badge>
          ) : canManage ? (
            <Select
              value={role}
              onChange={(e) => onUpdate({ role: e.target.value })}
              disabled={busy}
              className="!h-9 !min-w-[8rem]"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          ) : (
            <Badge>{role}</Badge>
          )}
          {!isOwner && (
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-white"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "Hide" : "Permissions"}
            </button>
          )}
          {!isOwner && canManage && (
            <button
              type="button"
              className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50"
              onClick={onRemove}
              disabled={busy}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {open && !isOwner && (
        <div className="mt-3 grid gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:grid-cols-2">
          {PERMISSION_GROUPS.flatMap((g) => g.permissions).map((p) => {
            const checked = perms.has(p.id);
            return (
              <label
                key={p.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs",
                  canManage ? "hover:bg-white/[0.04]" : "cursor-not-allowed",
                  checked ? "text-white" : "text-slate-400"
                )}
              >
                <span>{p.label}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!canManage || busy}
                  onChange={() => togglePerm(p.id)}
                  className="h-4 w-4 accent-neon-purple"
                />
              </label>
            );
          })}
        </div>
      )}
    </li>
  );
}
