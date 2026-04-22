/**
 * Project members & roles management.
 *
 * - GET    → list current members (requires `project.members.read`)
 * - POST   → add a member            (requires `project.members.manage`)
 * - PATCH  → change role / overrides (requires `project.members.manage`)
 * - DELETE → remove a member         (requires `project.members.manage`)
 *
 * The workspace owner cannot be removed or downgraded — those guards
 * are enforced server-side regardless of the role of the caller.
 *
 * Every mutation publishes a `project.updated` bus event so the SSE
 * channel + audit log reflect the change instantly.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ActivityModel } from "@/models/Activity";
import { apiError, requireUserId } from "@/lib/api";
import { serializeProject } from "@/lib/projects";
import { publishProjectEvent } from "@/lib/services/projects.service";
import {
  PERMISSIONS,
  ROLES,
  normalizeRole,
  requireProjectPermission,
  type Role
} from "@/core/permissions";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

const MUTABLE_ROLES = ROLES.filter((r) => r !== "owner") as Exclude<Role, "owner">[];
const ALLOWED_PERMISSIONS = new Set<string>(PERMISSIONS);
// Re-exported via the response so the UI can render assignment dropdowns.
void MUTABLE_ROLES;

function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const p of input) {
    if (typeof p !== "string") continue;
    const trimmed = p.trim();
    if (!trimmed || !ALLOWED_PERMISSIONS.has(trimmed)) continue;
    if (!out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

function sanitizeUserId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 64) return null;
  // Discord-style numeric ids only. Permissive enough to also accept
  // ObjectId hex when invitations come from a future "members" search.
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  const guard = await requireProjectPermission(
    auth.userId,
    id,
    "project.members.read"
  );
  if (guard.response) return guard.response;

  return NextResponse.json({
    project: serializeProject(guard.project),
    roles: ROLES,
    permissions: PERMISSIONS
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  let body: { userId?: unknown; role?: unknown; permissions?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return apiError("Invalid JSON body.");
  }

  const userId = sanitizeUserId(body.userId);
  if (!userId) return apiError("A valid userId is required.");
  const role = normalizeRole(body.role as string | undefined);
  if (role === "owner") {
    return apiError("Use the transfer endpoint to change ownership.");
  }
  const permissions = sanitizePermissions(body.permissions);

  const guard = await requireProjectPermission(
    auth.userId,
    id,
    "project.members.manage"
  );
  if (guard.response) return guard.response;
  const { project } = guard;

  if (project.ownerId === userId) {
    return apiError(
      "That user is already the workspace owner of this project.",
      409,
      "already_owner"
    );
  }

  const members = project.members ?? [];
  if (members.some((m) => m.userId === userId)) {
    return apiError("That user is already a member.", 409, "duplicate_member");
  }

  members.push({
    userId,
    role,
    permissions,
    addedBy: auth.userId,
    invitedAt: new Date()
  });
  project.members = members;
  project.lastActivityAt = new Date();
  await project.save();

  await ActivityModel.create({
    ownerId: project.ownerId,
    projectId: String(project._id),
    type: "project.updated",
    message: `Added member ${userId} as ${role}`,
    metadata: { kind: "member.added", userId, role, by: auth.userId }
  });

  publishProjectEvent({
    type: "project.updated",
    ownerId: project.ownerId,
    project,
    extra: { changes: ["members"], by: auth.userId }
  });

  return NextResponse.json({ project: serializeProject(project) });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  let body: { userId?: unknown; role?: unknown; permissions?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return apiError("Invalid JSON body.");
  }

  const userId = sanitizeUserId(body.userId);
  if (!userId) return apiError("A valid userId is required.");

  const guard = await requireProjectPermission(
    auth.userId,
    id,
    "project.members.manage"
  );
  if (guard.response) return guard.response;
  const { project } = guard;

  const members = project.members ?? [];
  const member = members.find((m) => m.userId === userId);
  if (!member) {
    return apiError("Member not found.", 404, "not_found");
  }
  if (project.ownerId === userId) {
    return apiError("Cannot modify the workspace owner here.", 403, "forbidden");
  }

  const changes: string[] = [];
  if (body.role !== undefined) {
    const role = normalizeRole(body.role as string | undefined);
    if (role === "owner") {
      return apiError("Cannot promote a member to owner here.");
    }
    if (member.role !== role) {
      member.role = role;
      changes.push("role");
    }
  }
  if (body.permissions !== undefined) {
    member.permissions = sanitizePermissions(body.permissions);
    changes.push("permissions");
  }
  if (changes.length === 0) {
    return NextResponse.json({ project: serializeProject(project) });
  }

  project.members = members;
  project.lastActivityAt = new Date();
  await project.save();

  await ActivityModel.create({
    ownerId: project.ownerId,
    projectId: String(project._id),
    type: "project.updated",
    message: `Updated ${changes.join(", ")} for member ${userId}`,
    metadata: {
      kind: "member.updated",
      userId,
      role: member.role,
      permissions: member.permissions,
      by: auth.userId
    }
  });

  publishProjectEvent({
    type: "project.updated",
    ownerId: project.ownerId,
    project,
    extra: { changes: ["members"], by: auth.userId }
  });

  return NextResponse.json({ project: serializeProject(project) });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;
  const userId = sanitizeUserId(req.nextUrl.searchParams.get("userId"));
  if (!userId) return apiError("A valid userId is required.");

  const guard = await requireProjectPermission(
    auth.userId,
    id,
    "project.members.manage"
  );
  if (guard.response) return guard.response;
  const { project } = guard;

  if (project.ownerId === userId) {
    return apiError("The workspace owner cannot be removed.", 403, "forbidden");
  }

  const members = project.members ?? [];
  const before = members.length;
  // Use mongoose subdoc array's pull/splice semantics so the assignment
  // stays compatible with the typed DocumentArray.
  for (let i = members.length - 1; i >= 0; i--) {
    if (members[i].userId === userId) members.splice(i, 1);
  }
  if (members.length === before) {
    return apiError("Member not found.", 404, "not_found");
  }
  project.lastActivityAt = new Date();
  await project.save();

  await ActivityModel.create({
    ownerId: project.ownerId,
    projectId: String(project._id),
    type: "project.updated",
    message: `Removed member ${userId}`,
    metadata: { kind: "member.removed", userId, by: auth.userId }
  });

  publishProjectEvent({
    type: "project.updated",
    ownerId: project.ownerId,
    project,
    extra: { changes: ["members"], by: auth.userId }
  });

  return NextResponse.json({ project: serializeProject(project) });
}

