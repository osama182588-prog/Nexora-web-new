import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ActivityModel } from "@/models/Activity";
import { apiError, requireUserId } from "@/lib/api";
import { serializeProject } from "@/lib/projects";
import { publishProjectEvent } from "@/lib/services/projects.service";
import {
  hasPermission,
  requireProjectPermission,
  serializeAccess
} from "@/core/permissions";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = ["active", "paused", "completed", "archived"] as const;
const ALLOWED_PRIORITY = ["low", "medium", "high", "critical"] as const;
const ALLOWED_COLOR = ["purple", "blue", "cyan", "emerald", "amber", "rose"] as const;

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const guard = await requireProjectPermission(auth.userId, id, "project.read");
  if (guard.response) return guard.response;
  const { project, access } = guard;

  const activities = hasPermission(access, "activity.read")
    ? await ActivityModel.find({
        ownerId: project.ownerId,
        projectId: String(project._id)
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    : [];

  return NextResponse.json({
    project: serializeProject(project),
    access: serializeAccess(access),
    activities: activities.map((a) => ({
      id: String(a._id),
      type: a.type,
      message: a.message,
      createdAt: a.createdAt.toISOString()
    }))
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError("Invalid JSON body.");
  }

  const guard = await requireProjectPermission(
    auth.userId,
    id,
    "project.update"
  );
  if (guard.response) return guard.response;
  const { project } = guard;

  const previousStatus = project.status;
  const previousProgress = project.progress;
  const changes: string[] = [];

  if (typeof body.name === "string") {
    const next = body.name.trim().slice(0, 80);
    if (next && next !== project.name) {
      project.name = next;
      changes.push("name");
    }
  }
  if (typeof body.description === "string") {
    project.description = body.description.trim().slice(0, 500);
    changes.push("description");
  }
  if (
    typeof body.status === "string" &&
    (ALLOWED_STATUS as readonly string[]).includes(body.status)
  ) {
    project.status = body.status as (typeof ALLOWED_STATUS)[number];
  }
  if (
    typeof body.priority === "string" &&
    (ALLOWED_PRIORITY as readonly string[]).includes(body.priority)
  ) {
    project.priority = body.priority as (typeof ALLOWED_PRIORITY)[number];
    changes.push("priority");
  }
  if (
    typeof body.color === "string" &&
    (ALLOWED_COLOR as readonly string[]).includes(body.color)
  ) {
    project.color = body.color as (typeof ALLOWED_COLOR)[number];
  }
  if (typeof body.progress === "number" && Number.isFinite(body.progress)) {
    project.progress = Math.max(0, Math.min(100, Math.round(body.progress)));
  }
  if (Array.isArray(body.tags)) {
    project.tags = (body.tags as unknown[])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim().slice(0, 24))
      .filter(Boolean)
      .slice(0, 12);
  }

  project.lastActivityAt = new Date();
  await project.save();

  // Activity entries for notable changes — recorded against the
  // workspace owner so they appear in the owner's audit feed.
  const ownerId = project.ownerId;
  if (project.status !== previousStatus) {
    await ActivityModel.create({
      ownerId,
      projectId: String(project._id),
      type: "project.status_changed",
      message: `Status changed from ${previousStatus} to ${project.status} on "${project.name}"`,
      metadata: { from: previousStatus, to: project.status, by: auth.userId }
    });
    publishProjectEvent({
      type: "project.status_changed",
      ownerId,
      project,
      extra: { from: previousStatus, to: project.status, by: auth.userId }
    });
  } else if (project.progress !== previousProgress) {
    await ActivityModel.create({
      ownerId,
      projectId: String(project._id),
      type: "project.progress_updated",
      message: `Progress updated to ${project.progress}% on "${project.name}"`,
      metadata: { from: previousProgress, to: project.progress, by: auth.userId }
    });
    publishProjectEvent({
      type: "project.progress_updated",
      ownerId,
      project,
      extra: { from: previousProgress, to: project.progress, by: auth.userId }
    });
  } else if (changes.length > 0) {
    await ActivityModel.create({
      ownerId,
      projectId: String(project._id),
      type: "project.updated",
      message: `Updated ${changes.join(", ")} on "${project.name}"`,
      metadata: { by: auth.userId }
    });
    publishProjectEvent({
      type: "project.updated",
      ownerId,
      project,
      extra: { changes, by: auth.userId }
    });
  }

  return NextResponse.json({ project: serializeProject(project) });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const guard = await requireProjectPermission(
    auth.userId,
    id,
    "project.delete"
  );
  if (guard.response) return guard.response;
  const { project } = guard;

  const name = project.name;
  const projectId = String(project._id);
  const ownerId = project.ownerId;
  await project.deleteOne();

  await ActivityModel.create({
    ownerId,
    projectId: null,
    type: "project.deleted",
    message: `Deleted project "${name}"`,
    metadata: { by: auth.userId }
  });

  publishProjectEvent({
    type: "project.deleted",
    ownerId,
    project: serializeProject(project),
    extra: { id: projectId, name, by: auth.userId }
  });

  return NextResponse.json({ ok: true });
}
