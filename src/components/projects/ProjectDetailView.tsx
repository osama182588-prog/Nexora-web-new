"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Tooltip } from "@/components/ui/Tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { projectsApi } from "@/lib/client-api";
import { marketplaceApi } from "@/lib/marketplace-api";
import type { ProjectDTO } from "@/lib/projects";
import type { ProductDTO } from "@/lib/marketplace";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProjectDetailViewProps {
  projectId: string;
}

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

const COLORS: ProjectDTO["color"][] = ["purple", "blue", "cyan", "emerald", "amber", "rose"];
const colorChip: Record<ProjectDTO["color"], string> = {
  purple: "bg-neon-purple",
  blue: "bg-neon-blue",
  cyan: "bg-neon-cyan",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400"
};

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [linkedProduct, setLinkedProduct] = useState<ProductDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectDTO["status"]>("active");
  const [priority, setPriority] = useState<ProjectDTO["priority"]>("medium");
  const [color, setColor] = useState<ProjectDTO["color"]>("purple");
  const [progress, setProgress] = useState(0);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`/api/projects/${projectId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(data?.message ?? `${res.status} ${res.statusText}`);
        }
        return res.json() as Promise<{ project: ProjectDTO; activities: ActivityItem[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        const p = data.project;
        setProject(p);
        setActivities(data.activities);
        setName(p.name);
        setDescription(p.description);
        setStatus(p.status);
        setPriority(p.priority);
        setColor(p.color);
        setProgress(p.progress);
        setTagsInput(p.tags.join(", "));
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Load the linked marketplace product (if any) so we can deep-link to it.
  useEffect(() => {
    const linked = project?.marketplace.productId;
    if (!linked) {
      setLinkedProduct(null);
      return;
    }
    let cancelled = false;
    marketplaceApi
      .get(linked)
      .then((data) => !cancelled && setLinkedProduct(data.product))
      .catch(() => !cancelled && setLinkedProduct(null));
    return () => {
      cancelled = true;
    };
  }, [project?.marketplace.productId]);

  const onSave = async () => {
    if (!project) return;
    setSaving(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const { project: updated } = await projectsApi.update(project.id, {
        name: name.trim(),
        description,
        status,
        priority,
        color,
        progress,
        tags
      });
      setProject(updated);
      // Re-fetch activity to reflect server-generated entries
      const res = await fetch(`/api/projects/${project.id}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { activities: ActivityItem[] };
        setActivities(data.activities);
      }
      toast({
        title: "Project saved",
        description: `Updated "${updated.name}".`,
        variant: "success"
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save changes.";
      setError(msg);
      toast({ title: "Save failed", description: msg, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await projectsApi.remove(project.id);
      toast({
        title: "Project deleted",
        description: `"${project.name}" was permanently removed.`,
        variant: "info"
      });
      router.push("/dashboard/projects");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete project.";
      setError(msg);
      toast({ title: "Delete failed", description: msg, variant: "error" });
      setDeleting(false);
    }
  };

  if (error && !project) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
        {error}
        <div className="mt-3">
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1 text-rose-200 underline hover:no-underline"
          >
            <Icon.Chevron size={14} className="rotate-180" />
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1 hover:text-white"
        >
          <Icon.Chevron size={14} className="rotate-180" />
          Projects
        </Link>
        <span className="text-slate-600">/</span>
        <span className="truncate text-slate-200">{project.name}</span>
      </div>

      {/* Header */}
      <Card variant="glass" className="relative overflow-hidden p-6">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br opacity-50 blur-3xl",
            color === "purple" && "from-neon-purple/40 to-neon-purple/0",
            color === "blue" && "from-neon-blue/40 to-neon-blue/0",
            color === "cyan" && "from-neon-cyan/40 to-neon-cyan/0",
            color === "emerald" && "from-emerald-400/40 to-emerald-400/0",
            color === "amber" && "from-amber-400/40 to-amber-400/0",
            color === "rose" && "from-rose-400/40 to-rose-400/0"
          )}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-glow-sm",
                colorChip[color]
              )}
            >
              <Icon.Folder size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-semibold text-white sm:text-3xl">
                {project.name}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Created {formatRelativeTime(project.createdAt)} · Updated{" "}
                {formatRelativeTime(project.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />
            <Tooltip content="Delete project">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                aria-label="Delete project"
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Icon.Trash size={16} />
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="relative mt-6">
          <ProgressBar value={project.progress} color={project.color} showValue />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit panel */}
        <div className="space-y-6 lg:col-span-2">
          <Card variant="glass">
            <CardTitle>Project details</CardTitle>
            <CardDescription>Update the metadata for this project.</CardDescription>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            <div className="mt-5 space-y-5">
              <Field label="Name" htmlFor="p-name" required>
                <Input
                  id="p-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                />
              </Field>
              <Field label="Description" htmlFor="p-desc">
                <Textarea
                  id="p-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Status" htmlFor="p-status">
                  <Select
                    id="p-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectDTO["status"])}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </Select>
                </Field>
                <Field label="Priority" htmlFor="p-priority">
                  <Select
                    id="p-priority"
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as ProjectDTO["priority"])
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </Select>
                </Field>
                <Field label="Progress" htmlFor="p-progress">
                  <div className="flex items-center gap-3">
                    <input
                      id="p-progress"
                      type="range"
                      min={0}
                      max={100}
                      value={progress}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-neon-purple"
                    />
                    <span className="w-10 text-right text-sm font-medium text-white">
                      {progress}%
                    </span>
                  </div>
                </Field>
              </div>
              <Field label="Tags" htmlFor="p-tags" hint="Comma-separated.">
                <Input
                  id="p-tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="design, q3, launch"
                />
              </Field>
              <Field label="Accent color">
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={`Use ${c} accent`}
                      aria-pressed={color === c}
                      className={cn(
                        "h-9 w-9 rounded-xl ring-1 ring-white/10 transition",
                        color === c
                          ? "ring-2 ring-white shadow-glow-sm scale-105"
                          : "hover:scale-105 hover:ring-white/30"
                      )}
                    >
                      <span
                        className={cn("block h-full w-full rounded-xl", colorChip[c])}
                      />
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={onSave} loading={saving}>
                <Icon.Check size={16} />
                Save changes
              </Button>
            </div>
          </Card>
        </div>

        {/* Right column: marketplace integration + activity */}
        <div className="space-y-6 self-start">
          <Card variant="glass" className="relative overflow-hidden">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-neon-purple/15 blur-3xl"
            />
            <div className="flex items-start gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-neon-purple/15 text-neon-purple ring-1 ring-neon-purple/30">
                <Icon.Cart size={16} />
              </span>
              <div className="min-w-0">
                <CardTitle>Marketplace</CardTitle>
                <CardDescription>
                  {linkedProduct
                    ? "This project is linked to a marketplace listing."
                    : "Turn this project into a marketplace listing in one click."}
                </CardDescription>
              </div>
            </div>

            {linkedProduct ? (
              <div className="relative mt-4 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-lg ring-1",
                      linkedProduct.status === "published"
                        ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30"
                        : "bg-amber-400/10 text-amber-300 ring-amber-400/30"
                    )}
                  >
                    <Icon.Tag size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {linkedProduct.title}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">
                      {linkedProduct.status} · {linkedProduct.views} views
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {linkedProduct.status === "published" && (
                    <Link
                      href={`/marketplace/${linkedProduct.slug}`}
                      target="_blank"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                    >
                      <Icon.External size={14} />
                      View listing
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/marketplace/${linkedProduct.id}/edit`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                  >
                    <Icon.Edit size={14} />
                    Edit listing
                  </Link>
                </div>
              </div>
            ) : (
              <div className="relative mt-4">
                <Link
                  href={`/dashboard/marketplace/new?fromProject=${project.id}`}
                  className="group inline-flex h-10 items-center gap-2 rounded-xl bg-neon-gradient px-4 text-sm font-medium text-white shadow-glow-sm transition hover:brightness-110"
                >
                  <Icon.Rocket size={16} />
                  Publish as product
                  <Icon.Arrow
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
                <p className="mt-2 text-xs text-slate-500">
                  We&apos;ll pre-fill the listing with this project&apos;s name,
                  description, tags and accent.
                </p>
              </div>
            )}
          </Card>

          {/* Activity */}
          <Card variant="glass">
            <CardTitle>Activity</CardTitle>
            <CardDescription>The latest events on this project.</CardDescription>
            <ActivityList items={activities} empty="No activity yet." />
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${project.name}"?`}
        description="This action cannot be undone. All project data will be permanently removed."
        confirmLabel="Delete project"
        destructive
        loading={deleting}
        onConfirm={onDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function ActivityList({ items, empty }: { items: ActivityItem[]; empty: string }) {
  if (items.length === 0) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">
        {empty}
      </div>
    );
  }
  return (
    <ul className="mt-5 space-y-3">
      {items.map((a) => (
        <li
          key={a.id}
          className="group relative rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition hover:border-neon-purple/20 hover:bg-white/[0.04]"
        >
          <div className="flex items-start gap-2">
            <span className="mt-1 grid h-6 w-6 flex-shrink-0 place-items-center rounded-lg bg-neon-purple/10 text-neon-purple ring-1 ring-neon-purple/20">
              <ActivityGlyph type={a.type} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-200">{a.message}</p>
              <p className="text-[10px] text-slate-500">
                {formatRelativeTime(a.createdAt)}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ActivityGlyph({ type }: { type: string }) {
  if (type === "project.created") return <Icon.Plus size={12} />;
  if (type === "project.deleted") return <Icon.Trash size={12} />;
  if (type === "project.status_changed") return <Icon.Bolt size={12} />;
  if (type === "project.progress_updated") return <Icon.Chart size={12} />;
  return <Icon.Edit size={12} />;
}
