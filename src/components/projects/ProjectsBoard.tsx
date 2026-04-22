"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/ui/Tooltip";
import { projectsApi } from "@/lib/client-api";
import type { ProjectDTO } from "@/lib/projects";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["all", "active", "paused", "completed", "archived"] as const;
const PRIORITY_OPTIONS = ["all", "low", "medium", "high", "critical"] as const;
const SORT_OPTIONS = [
  { value: "recent", label: "Recently active" },
  { value: "created", label: "Newest" },
  { value: "name", label: "Name (A–Z)" },
  { value: "progress", label: "Progress" }
];

export function ProjectsBoard() {
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]>("all");
  const [sort, setSort] = useState<string>("recent");

  // Initial + sort load (server-side filtering for sort)
  useEffect(() => {
    let cancelled = false;
    setError(null);
    projectsApi
      .list({ sort })
      .then((data) => {
        if (!cancelled) setProjects(data.projects);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [sort]);

  // Client-side filters for instant feedback (no extra round trip).
  const filtered = useMemo(() => {
    if (!projects) return null;
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (priority !== "all" && p.priority !== priority) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [projects, query, status, priority]);

  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (priority !== "all" ? 1 : 0) + (query ? 1 : 0);

  const handleChange = (next: ProjectDTO) =>
    setProjects((prev) =>
      prev ? prev.map((p) => (p.id === next.id ? next : p)) : prev
    );
  const handleDelete = (id: string) =>
    setProjects((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="glass flex flex-col gap-3 rounded-2xl p-3 shadow-card md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-1.5 ring-1 ring-white/5 transition focus-within:ring-neon-purple/40">
          <Icon.Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search projects, tags, descriptions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white"
            >
              <Icon.X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tooltip content="Filter by status">
            <Select
              aria-label="Status filter"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])
              }
              className="h-10 py-0 text-xs"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </Select>
          </Tooltip>
          <Tooltip content="Filter by priority">
            <Select
              aria-label="Priority filter"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as (typeof PRIORITY_OPTIONS)[number])
              }
              className="h-10 py-0 text-xs"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  Priority: {p}
                </option>
              ))}
            </Select>
          </Tooltip>
          <Tooltip content="Sort projects">
            <Select
              aria-label="Sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 py-0 text-xs"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  Sort: {s.label}
                </option>
              ))}
            </Select>
          </Tooltip>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setPriority("all");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-300 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
            >
              <Icon.X size={12} />
              Clear ({activeFilterCount})
            </button>
          )}

          <Link
            href="/dashboard/projects/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-neon-gradient px-4 text-sm font-medium text-white shadow-glow-sm transition hover:brightness-110"
          >
            <Icon.Plus size={16} />
            New project
          </Link>
        </div>
      </div>

      {/* Body */}
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {!projects && !error && (
        <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3")}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {projects && filtered && filtered.length === 0 && projects.length === 0 && (
        <EmptyState
          icon={<Icon.Folder />}
          title="No projects yet"
          description="Create your first project to start tracking work, progress, and activity."
          action={
            <Link href="/dashboard/projects/new">
              <Button variant="primary" size="sm">
                <Icon.Plus size={14} />
                Create project
              </Button>
            </Link>
          }
        />
      )}

      {projects && filtered && filtered.length === 0 && projects.length > 0 && (
        <EmptyState
          icon={<Icon.Filter />}
          title="No matches"
          description="Try clearing filters or adjusting your search."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setPriority("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onChange={handleChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
