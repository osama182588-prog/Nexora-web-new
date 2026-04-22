/**
 * Tiny typed wrappers around `fetch` for the in-app JSON API.
 * Centralized so error handling stays consistent across components.
 */
import type { ProjectDTO } from "@/lib/projects";

export interface ProjectStats {
  total: number;
  byStatus: Record<"active" | "paused" | "completed" | "archived", number>;
  averageProgress: number;
}

export interface ActivityDTO {
  id: string;
  type: string;
  message: string;
  projectId: string | null;
  createdAt: string;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const projectsApi = {
  list(params: Record<string, string | undefined> = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return fetch(`/api/projects${suffix}`, { cache: "no-store" }).then(
      handle<{ projects: ProjectDTO[] }>
    );
  },
  create(body: {
    name: string;
    description?: string;
    priority?: string;
    color?: string;
    tags?: string[];
  }) {
    return fetch(`/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }).then(handle<{ project: ProjectDTO }>);
  },
  update(
    id: string,
    body: Partial<{
      name: string;
      description: string;
      status: string;
      priority: string;
      color: string;
      progress: number;
      tags: string[];
    }>
  ) {
    return fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }).then(handle<{ project: ProjectDTO }>);
  },
  remove(id: string) {
    return fetch(`/api/projects/${id}`, { method: "DELETE" }).then(
      handle<{ ok: true }>
    );
  },
  stats() {
    return fetch(`/api/projects/stats`, { cache: "no-store" }).then(
      handle<ProjectStats>
    );
  },
  activity(limit = 20) {
    return fetch(`/api/projects/activity?limit=${limit}`, { cache: "no-store" }).then(
      handle<{ activities: ActivityDTO[] }>
    );
  }
};
