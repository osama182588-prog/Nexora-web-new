import type { Project } from "@/models/Project";
import { slugify as slugifyShared } from "@/lib/slug";

/** Shape returned by the API — `ObjectId` and `Date` serialized to strings. */
export interface ProjectDTO {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "paused" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "critical";
  progress: number;
  color: "purple" | "blue" | "cyan" | "emerald" | "amber" | "rose";
  tags: string[];
  members: { userId: string; role: "owner" | "editor" | "viewer" }[];
  marketplace: {
    visibility: "private" | "unlisted" | "public";
    listed: boolean;
    price: number;
    productId: string | null;
  };
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export function serializeProject(p: Project): ProjectDTO {
  return {
    id: String(p._id),
    ownerId: p.ownerId,
    name: p.name,
    slug: p.slug,
    description: p.description ?? "",
    status: p.status,
    priority: p.priority,
    progress: p.progress ?? 0,
    color: p.color,
    tags: p.tags ?? [],
    members: (p.members ?? []).map((m) => ({
      userId: m.userId,
      role: m.role as "owner" | "editor" | "viewer"
    })),
    marketplace: {
      visibility: p.marketplace?.visibility ?? "private",
      listed: p.marketplace?.listed ?? false,
      price: p.marketplace?.price ?? 0,
      productId:
        (p.marketplace as { productId?: string | null } | undefined)?.productId ??
        null
    },
    metadata: (p.metadata as Record<string, unknown>) ?? {},
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    lastActivityAt: (p.lastActivityAt ?? p.updatedAt).toISOString()
  };
}

/** Generate a URL-safe slug from a project name. */
export function slugify(input: string): string {
  return slugifyShared(input, { maxLength: 60, fallback: "project" });
}
