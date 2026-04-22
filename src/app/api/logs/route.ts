/**
 * GET /api/logs — paginated audit log feed for the current workspace.
 *
 * Query parameters (all optional):
 *
 *   - `level`      one of debug|info|warn|error
 *   - `category`   one of auth|project|member|module|marketplace|ticket|external|system
 *   - `type`       exact match on the event type (e.g. "module.enabled")
 *   - `projectId`  scope to a single project
 *   - `actorId`    filter by the user who performed the action
 *   - `q`          free-text match on `type` + `message`
 *   - `since`      ISO date — only logs strictly after
 *   - `until`      ISO date — only logs strictly before
 *   - `limit`      page size (default 50, max 200)
 *   - `cursor`     opaque cursor returned by the previous page
 *
 * The cursor is `<isoDate>_<id>` to keep ordering stable when many
 * documents share the same `createdAt` millisecond.
 */
import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { requireUserId } from "@/lib/api";
import {
  AuditLogModel,
  LOG_CATEGORIES,
  LOG_LEVELS,
  type LogCategory,
  type LogLevel
} from "@/models/AuditLog";
import { ProjectModel } from "@/models/Project";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

function parseCursor(
  raw: string | null
): { createdAt: Date; id: mongoose.Types.ObjectId } | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf("_");
  if (idx <= 0) return null;
  const dateStr = raw.slice(0, idx);
  const idStr = raw.slice(idx + 1);
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  if (!mongoose.Types.ObjectId.isValid(idStr)) return null;
  return { createdAt: date, id: new mongoose.Types.ObjectId(idStr) };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  await connectToDatabase();
  const sp = req.nextUrl.searchParams;

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(sp.get("limit")) || DEFAULT_LIMIT)
  );

  // Permission scoping: a workspace owner sees their own logs PLUS
  // logs of any project where they're a member (recorded under the
  // project owner's `ownerId`).
  const memberProjects = await ProjectModel.find(
    { "members.userId": auth.userId, ownerId: { $ne: auth.userId } },
    { _id: 1, ownerId: 1 }
  ).lean();

  const ownerScope: Record<string, unknown>[] = [{ ownerId: auth.userId }];
  if (memberProjects.length > 0) {
    ownerScope.push({
      projectId: { $in: memberProjects.map((p) => String(p._id)) }
    });
  }

  // Build the query as a list of $and clauses so cursor + filter +
  // text search compose cleanly without overwriting each other.
  const clauses: Record<string, unknown>[] = [{ $or: ownerScope }];

  const level = sp.get("level");
  if (level && (LOG_LEVELS as readonly string[]).includes(level)) {
    clauses.push({ level: level as LogLevel });
  }
  const category = sp.get("category");
  if (category && (LOG_CATEGORIES as readonly string[]).includes(category)) {
    clauses.push({ category: category as LogCategory });
  }
  const type = sp.get("type");
  if (type) clauses.push({ type });

  const projectId = sp.get("projectId");
  if (projectId) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid projectId." },
        { status: 400 }
      );
    }
    const allowed =
      memberProjects.some((p) => String(p._id) === projectId) ||
      Boolean(await ProjectModel.exists({ _id: projectId, ownerId: auth.userId }));
    if (!allowed) {
      return NextResponse.json(
        { error: "not_found", message: "Project not found." },
        { status: 404 }
      );
    }
    clauses.push({ projectId });
  }

  const actorId = sp.get("actorId");
  if (actorId) clauses.push({ actorId });

  const q = sp.get("q");
  if (q && q.trim().length > 0) {
    const re = new RegExp(escapeRegex(q.trim()), "i");
    clauses.push({ $or: [{ message: re }, { type: re }] });
  }

  const createdAt: Record<string, Date> = {};
  const since = sp.get("since");
  const until = sp.get("until");
  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) createdAt.$gt = d;
  }
  if (until) {
    const d = new Date(until);
    if (!Number.isNaN(d.getTime())) createdAt.$lt = d;
  }
  if (Object.keys(createdAt).length > 0) clauses.push({ createdAt });

  const cursor = parseCursor(sp.get("cursor"));
  if (cursor) {
    clauses.push({
      $or: [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor.id } }
      ]
    });
  }

  const query = clauses.length === 1 ? clauses[0] : { $and: clauses };

  // Fetch one extra row so we can tell whether there's a next page.
  const rows = await AuditLogModel.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? `${last.createdAt.toISOString()}_${String(last._id)}`
      : null;

  return NextResponse.json({
    logs: page.map((r) => ({
      id: String(r._id),
      ownerId: r.ownerId,
      actorId: r.actorId,
      projectId: r.projectId,
      resourceId: r.resourceId,
      level: r.level,
      category: r.category,
      type: r.type,
      message: r.message,
      metadata: r.metadata ?? {},
      createdAt: r.createdAt.toISOString()
    })),
    nextCursor,
    hasMore,
    filters: {
      levels: LOG_LEVELS,
      categories: LOG_CATEGORIES
    }
  });
}
