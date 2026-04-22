import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ProjectModel } from "@/models/Project";
import { ActivityModel } from "@/models/Activity";
import { apiError, requireUserId } from "@/lib/api";
import { serializeProject, slugify } from "@/lib/projects";
import { pickAvailableSlug, slugConflictRegex } from "@/lib/slug";
import { publishProjectEvent } from "@/lib/services/projects.service";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = ["active", "paused", "completed", "archived"] as const;
const ALLOWED_PRIORITY = ["low", "medium", "high", "critical"] as const;
const ALLOWED_COLOR = ["purple", "blue", "cyan", "emerald", "amber", "rose"] as const;

type Status = (typeof ALLOWED_STATUS)[number];
type Priority = (typeof ALLOWED_PRIORITY)[number];
type Color = (typeof ALLOWED_COLOR)[number];

/** GET /api/projects — list (with optional `q`, `status`, `priority`, `sort`). */
export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  await connectToDatabase();

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const sort = url.searchParams.get("sort") ?? "recent";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 200);

  const filter: Record<string, unknown> = { ownerId: auth.userId };
  if (status && (ALLOWED_STATUS as readonly string[]).includes(status)) {
    filter.status = status;
  }
  if (priority && (ALLOWED_PRIORITY as readonly string[]).includes(priority)) {
    filter.priority = priority;
  }
  if (q) {
    // Escape regex metacharacters to prevent ReDoS / regex injection.
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    filter.$or = [{ name: rx }, { description: rx }, { tags: rx }];
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    recent: { lastActivityAt: -1 },
    created: { createdAt: -1 },
    name: { name: 1 },
    progress: { progress: -1 }
  };
  const sortBy = sortMap[sort] ?? sortMap.recent;

  const docs = await ProjectModel.find(filter).sort(sortBy).limit(limit).lean<
    import("@/models/Project").Project[]
  >();

  return NextResponse.json({ projects: docs.map(serializeProject) });
}

/** POST /api/projects — create. */
export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError("Invalid JSON body.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return apiError("`name` is required.");
  if (name.length > 80) return apiError("`name` must be 80 characters or fewer.");

  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 500) : "";

  const status: Status = (ALLOWED_STATUS as readonly string[]).includes(
    body.status as string
  )
    ? (body.status as Status)
    : "active";
  const priority: Priority = (ALLOWED_PRIORITY as readonly string[]).includes(
    body.priority as string
  )
    ? (body.priority as Priority)
    : "medium";
  const color: Color = (ALLOWED_COLOR as readonly string[]).includes(
    body.color as string
  )
    ? (body.color as Color)
    : "purple";

  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().slice(0, 24))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  await connectToDatabase();

  // Build a unique slug per owner. We fetch every existing slug that
  // could collide with `<base>(-N)?` in a single query, then pick the
  // first free suffix in memory — turning what used to be up to 50
  // sequential `exists` round-trips into one O(log n) index scan.
  const baseSlug = slugify(name);
  const existing = await ProjectModel.find(
    { ownerId: auth.userId, slug: slugConflictRegex(baseSlug) },
    { slug: 1, _id: 0 }
  ).lean<{ slug: string }[]>();
  const slug = pickAvailableSlug(
    baseSlug,
    existing.map((r) => r.slug)
  );
  if (!slug) return apiError("Could not generate a unique slug.", 409, "conflict");

  const project = await ProjectModel.create({
    ownerId: auth.userId,
    name,
    slug,
    description,
    status,
    priority,
    color,
    tags,
    members: [{ userId: auth.userId, role: "owner" }],
    progress: 0,
    lastActivityAt: new Date()
  });

  await ActivityModel.create({
    ownerId: auth.userId,
    projectId: String(project._id),
    type: "project.created",
    message: `Created project "${project.name}"`
  });

  // Broadcast to the internal bus so any in-process subscriber (the
  // operator audit log + every connected SSE client) sees it instantly.
  publishProjectEvent({
    type: "project.created",
    ownerId: auth.userId,
    project
  });

  return NextResponse.json({ project: serializeProject(project) }, { status: 201 });
}
