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

/**
 * In-flight request deduplication.
 *
 * When multiple components mount in the same tick and each asks for
 * `projectsApi.stats()` (or any other GET keyed by URL), we want them
 * to share a single HTTP round-trip rather than triggering N parallel
 * fetches that the browser has to multiplex over the same connection.
 *
 * The map only holds the *promise* — it's cleared the moment the
 * request settles, so this is **not a cache**; subsequent calls always
 * issue a fresh request. That gives us the perf win without any of
 * the staleness footguns a real cache introduces.
 */
const inflight = new Map<string, Promise<unknown>>();
function dedup<T>(key: string, exec: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = exec().finally(() => {
    if (inflight.get(key) === p) inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

export const projectsApi = {
  list(params: Record<string, string | undefined> = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const url = `/api/projects${suffix}`;
    return dedup(`GET ${url}`, () =>
      fetch(url, { cache: "no-store" }).then(handle<{ projects: ProjectDTO[] }>)
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
  get(id: string) {
    const url = `/api/projects/${id}`;
    return dedup(`GET ${url}`, () =>
      fetch(url, { cache: "no-store" }).then(
        handle<{ project: ProjectDTO; activities: ActivityDTO[] }>
      )
    );
  },
  stats() {
    const url = `/api/projects/stats`;
    return dedup(`GET ${url}`, () =>
      fetch(url, { cache: "no-store" }).then(handle<ProjectStats>)
    );
  },
  activity(limit = 20) {
    const url = `/api/projects/activity?limit=${limit}`;
    return dedup(`GET ${url}`, () =>
      fetch(url, { cache: "no-store" }).then(
        handle<{ activities: ActivityDTO[] }>
      )
    );
  }
};
