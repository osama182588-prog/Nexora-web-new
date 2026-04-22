import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { ProjectModel } from "@/models/Project";
import { ActivityModel } from "@/models/Activity";
import { apiError, requireUserId } from "@/lib/api";
import { serializeProject } from "@/lib/projects";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = ["active", "paused", "completed", "archived"] as const;
const ALLOWED_PRIORITY = ["low", "medium", "high", "critical"] as const;
const ALLOWED_COLOR = ["purple", "blue", "cyan", "emerald", "amber", "rose"] as const;

interface Ctx {
  params: Promise<{ id: string }>;
}

async function loadOwnedProject(userId: string, id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const project = await ProjectModel.findOne({ _id: id, ownerId: userId });
  return project;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  await connectToDatabase();
  const project = await loadOwnedProject(auth.userId, id);
  if (!project) return apiError("Project not found.", 404, "not_found");

  const activities = await ActivityModel.find({
    ownerId: auth.userId,
    projectId: String(project._id)
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({
    project: serializeProject(project),
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

  await connectToDatabase();
  const project = await loadOwnedProject(auth.userId, id);
  if (!project) return apiError("Project not found.", 404, "not_found");

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

  // Activity entries for notable changes
  if (project.status !== previousStatus) {
    await ActivityModel.create({
      ownerId: auth.userId,
      projectId: String(project._id),
      type: "project.status_changed",
      message: `Status changed from ${previousStatus} to ${project.status} on "${project.name}"`,
      metadata: { from: previousStatus, to: project.status }
    });
  } else if (project.progress !== previousProgress) {
    await ActivityModel.create({
      ownerId: auth.userId,
      projectId: String(project._id),
      type: "project.progress_updated",
      message: `Progress updated to ${project.progress}% on "${project.name}"`,
      metadata: { from: previousProgress, to: project.progress }
    });
  } else if (changes.length > 0) {
    await ActivityModel.create({
      ownerId: auth.userId,
      projectId: String(project._id),
      type: "project.updated",
      message: `Updated ${changes.join(", ")} on "${project.name}"`
    });
  }

  return NextResponse.json({ project: serializeProject(project) });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  await connectToDatabase();
  const project = await loadOwnedProject(auth.userId, id);
  if (!project) return apiError("Project not found.", 404, "not_found");

  const name = project.name;
  await project.deleteOne();

  await ActivityModel.create({
    ownerId: auth.userId,
    projectId: null,
    type: "project.deleted",
    message: `Deleted project "${name}"`
  });

  return NextResponse.json({ ok: true });
}
