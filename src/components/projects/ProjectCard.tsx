"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/icons";
import { projectsApi } from "@/lib/client-api";
import type { ProjectDTO } from "@/lib/projects";
import { cn } from "@/lib/utils";

const colorAccent: Record<ProjectDTO["color"], string> = {
  purple: "from-neon-purple/30 to-neon-purple/0",
  blue: "from-neon-blue/30 to-neon-blue/0",
  cyan: "from-neon-cyan/30 to-neon-cyan/0",
  emerald: "from-emerald-400/30 to-emerald-400/0",
  amber: "from-amber-400/30 to-amber-400/0",
  rose: "from-rose-400/30 to-rose-400/0"
};

const colorIconRing: Record<ProjectDTO["color"], string> = {
  purple: "text-neon-purple ring-neon-purple/30 bg-neon-purple/10",
  blue: "text-neon-blue ring-neon-blue/30 bg-neon-blue/10",
  cyan: "text-neon-cyan ring-neon-cyan/30 bg-neon-cyan/10",
  emerald: "text-emerald-300 ring-emerald-400/30 bg-emerald-400/10",
  amber: "text-amber-300 ring-amber-400/30 bg-amber-400/10",
  rose: "text-rose-300 ring-rose-400/30 bg-rose-400/10"
};

interface ProjectCardProps {
  project: ProjectDTO;
  onChange: (next: ProjectDTO) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onChange, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const setStatus = async (status: ProjectDTO["status"]) => {
    setBusy(true);
    try {
      const { project: updated } = await projectsApi.update(project.id, { status });
      onChange(updated);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await projectsApi.remove(project.id);
      onDelete(project.id);
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card
        variant="glass"
        interactive
        className={cn(
          "group relative overflow-hidden p-5",
          (busy || pending) && "opacity-70"
        )}
      >
        {/* color accent glow */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70",
            colorAccent[project.color]
          )}
        />

        <div className="relative flex items-start justify-between gap-3">
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="flex min-w-0 flex-1 items-start gap-3"
          >
            <span
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1 transition group-hover:shadow-glow-sm",
                colorIconRing[project.color]
              )}
            >
              <Icon.Folder size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-semibold text-white">
                {project.name}
              </h3>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                {project.description || "No description yet."}
              </p>
            </div>
          </Link>

          <ContextMenu
            trigger={({ open, onClick }) => (
              <Tooltip content="More actions">
                <button
                  type="button"
                  aria-label="Open project actions"
                  onClick={onClick}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white",
                    open && "bg-white/5 text-white"
                  )}
                >
                  <Icon.More size={16} />
                </button>
              </Tooltip>
            )}
            items={[
              {
                label: "Open",
                icon: <Icon.Arrow size={14} />,
                onSelect: () =>
                  startTransition(() =>
                    router.push(`/dashboard/projects/${project.id}`)
                  )
              },
              project.status === "active"
                ? {
                    label: "Pause",
                    icon: <Icon.Pause size={14} />,
                    onSelect: () => void setStatus("paused")
                  }
                : {
                    label: "Resume",
                    icon: <Icon.Play size={14} />,
                    onSelect: () => void setStatus("active")
                  },
              {
                label: "Mark complete",
                icon: <Icon.Check2 size={14} />,
                onSelect: () => void setStatus("completed"),
                disabled: project.status === "completed"
              },
              {
                label: "Archive",
                icon: <Icon.Archive size={14} />,
                onSelect: () => void setStatus("archived"),
                disabled: project.status === "archived"
              },
              {
                label: "Delete",
                icon: <Icon.Trash size={14} />,
                destructive: true,
                onSelect: () => setConfirmOpen(true)
              }
            ]}
          />
        </div>

        <div className="relative mt-5 flex items-center gap-2">
          <StatusBadge status={project.status} />
          <Tooltip content={`Priority: ${project.priority}`}>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-xs text-slate-300 ring-1 ring-white/5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  project.priority === "critical"
                    ? "bg-rose-400"
                    : project.priority === "high"
                      ? "bg-amber-400"
                      : project.priority === "medium"
                        ? "bg-neon-blue"
                        : "bg-slate-500"
                )}
              />
              {project.priority}
            </span>
          </Tooltip>
        </div>

        <div className="relative mt-4">
          <ProgressBar value={project.progress} color={project.color} showValue />
        </div>

        {project.tags.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-white/5"
              >
                <Icon.Tag size={10} />
                {tag}
              </span>
            ))}
            {project.tags.length > 4 && (
              <span className="text-[10px] text-slate-500">
                +{project.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${project.name}"?`}
        description="This action cannot be undone. All project data will be permanently removed."
        confirmLabel="Delete project"
        destructive
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
