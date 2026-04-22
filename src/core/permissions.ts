/**
 * Project permissions — the single source of truth for "who can do
 * what" on every project in Nexora.
 *
 * The model is intentionally extensible:
 *
 *  - **Roles** are well-known names (`owner`, `manager`, `member`,
 *    `viewer`) that map to a default permission set. Adding a new role
 *    is a one-line change to `ROLE_DEFAULTS`.
 *
 *  - **Permissions** are free-form string identifiers (`project.read`,
 *    `project.update`, `modules.manage`, …). Modules and future
 *    features can mint their own without touching this file.
 *
 *  - **Per-member overrides** stored on `ProjectMember.permissions[]`
 *    are *additive grants* on top of the role defaults — they let you
 *    promote a single permission for a single member without inventing
 *    a new role. To deny a permission, use a more restrictive role.
 *
 * Every API route that mutates project state goes through
 * `requireProjectPermission()`, which loads the project, evaluates the
 * caller's effective access, and returns either the project + access
 * snapshot or a ready-to-return `NextResponse`.
 */
import mongoose, { type HydratedDocument } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ProjectModel, type Project } from "@/models/Project";

/**
 * Catalog of well-known permission identifiers. The catalog is open —
 * other modules MAY pass arbitrary strings — but listing them here
 * gives type-safety + IDE completion for the common cases.
 */
export const PERMISSIONS = [
  // Project surface
  "project.read",
  "project.update",
  "project.delete",
  "project.transfer",
  // Members & roles
  "project.members.read",
  "project.members.manage",
  // Modules / external integration
  "modules.read",
  "modules.manage",
  // Marketplace
  "marketplace.read",
  "marketplace.manage",
  // Tickets / support
  "tickets.read",
  "tickets.manage",
  // Activity / audit
  "activity.read"
] as const;

export type Permission = (typeof PERMISSIONS)[number] | (string & {});

export const ROLES = ["owner", "manager", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Default permission set per role. `owner` is granted every catalog
 * permission AND any custom permission via the wildcard check in
 * `hasPermission`.
 */
export const ROLE_DEFAULTS: Record<Role, Permission[]> = {
  owner: ["*"], // wildcard — owner can do anything
  manager: [
    "project.read",
    "project.update",
    "project.members.read",
    "project.members.manage",
    "modules.read",
    "modules.manage",
    "marketplace.read",
    "marketplace.manage",
    "tickets.read",
    "tickets.manage",
    "activity.read"
  ],
  member: [
    "project.read",
    "project.members.read",
    "modules.read",
    "marketplace.read",
    "tickets.read",
    "tickets.manage",
    "activity.read"
  ],
  viewer: [
    "project.read",
    "project.members.read",
    "modules.read",
    "marketplace.read",
    "tickets.read",
    "activity.read"
  ]
};

/** Human-readable role descriptions, used by the settings UI. */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full control. Only the workspace owner can transfer or delete the project.",
  manager: "Manage modules, members, marketplace listings & tickets. Cannot delete.",
  member: "Read-only on configuration; can open and triage tickets.",
  viewer: "Read-only access — useful for stakeholders and auditors."
};

/** Human-readable labels for the permission catalog (for the UI). */
export const PERMISSION_LABELS: Record<string, string> = {
  "project.read": "View project",
  "project.update": "Edit project details",
  "project.delete": "Delete project",
  "project.transfer": "Transfer ownership",
  "project.members.read": "View members",
  "project.members.manage": "Manage members & roles",
  "modules.read": "View modules",
  "modules.manage": "Enable / configure modules",
  "marketplace.read": "View marketplace listing",
  "marketplace.manage": "Manage marketplace listing",
  "tickets.read": "View tickets",
  "tickets.manage": "Triage & resolve tickets",
  "activity.read": "View activity feed"
};

/** Map a legacy role string (from before Phase 7) to the new vocabulary. */
export function normalizeRole(role: string | undefined | null): Role {
  switch (role) {
    case "owner":
      return "owner";
    case "manager":
      return "manager";
    case "member":
      return "member";
    case "viewer":
      return "viewer";
    case "editor":
      // Legacy alias — treat existing editors as managers so existing
      // workspaces don't lose write access on upgrade.
      return "manager";
    default:
      return "viewer";
  }
}

export interface ProjectAccess {
  /** Caller's effective role on the project. `null` when not a member. */
  role: Role | null;
  /** Effective permissions (role defaults ∪ per-member grants). */
  permissions: Set<Permission>;
  /** True when the caller owns the workspace this project lives in. */
  isOwner: boolean;
  /** True when the caller is a member (any role) of the project. */
  isMember: boolean;
}

interface MemberLike {
  userId: string;
  role?: string;
  permissions?: string[];
}

/**
 * Compute a caller's effective access to a project. Pure, in-memory —
 * safe to call from anywhere.
 */
export function evaluateAccess(
  userId: string,
  project: { ownerId: string; members?: MemberLike[] }
): ProjectAccess {
  const isOwner = project.ownerId === userId;
  const member = (project.members ?? []).find((m) => m.userId === userId);
  // Workspace owners are always treated as project owners — even if
  // the members array is empty (which is the usual case at creation
  // time).
  if (isOwner) {
    return {
      role: "owner",
      permissions: new Set<Permission>(["*"]),
      isOwner: true,
      isMember: true
    };
  }
  if (!member) {
    return {
      role: null,
      permissions: new Set<Permission>(),
      isOwner: false,
      isMember: false
    };
  }
  const role = normalizeRole(member.role);
  const set = new Set<Permission>(ROLE_DEFAULTS[role]);
  for (const p of member.permissions ?? []) {
    if (typeof p === "string" && p.length > 0) set.add(p);
  }
  return { role, permissions: set, isOwner: false, isMember: true };
}

/**
 * True when the caller's effective permissions include `perm`.
 * `*` (granted to owners) implicitly satisfies every check.
 */
export function hasPermission(access: ProjectAccess, perm: Permission): boolean {
  if (access.permissions.has("*")) return true;
  return access.permissions.has(perm);
}

/* ------------------------------------------------------------------ */
/* Route-handler helpers                                              */
/* ------------------------------------------------------------------ */

interface ProjectPermissionSuccess {
  project: HydratedDocument<Project>;
  access: ProjectAccess;
  response?: undefined;
}
interface ProjectPermissionFailure {
  project?: undefined;
  access?: undefined;
  response: NextResponse;
}

/**
 * Resolve the project by id, evaluate the caller's access, and either
 * return both — or a ready-to-return `NextResponse` for the route.
 *
 * Routes look like:
 *
 *     const guard = await requireProjectPermission(userId, id, "project.update");
 *     if (guard.response) return guard.response;
 *     const { project, access } = guard;
 */
export async function requireProjectPermission(
  userId: string,
  projectId: string,
  perm: Permission
): Promise<ProjectPermissionSuccess | ProjectPermissionFailure> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return {
      response: NextResponse.json(
        { error: "bad_request", message: "Invalid project id." },
        { status: 400 }
      )
    };
  }
  await connectToDatabase();
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    return {
      response: NextResponse.json(
        { error: "not_found", message: "Project not found." },
        { status: 404 }
      )
    };
  }
  const access = evaluateAccess(userId, project);
  if (!access.isMember) {
    // Hide the existence of the project from non-members.
    return {
      response: NextResponse.json(
        { error: "not_found", message: "Project not found." },
        { status: 404 }
      )
    };
  }
  if (!hasPermission(access, perm)) {
    return {
      response: NextResponse.json(
        {
          error: "forbidden",
          message: `Missing permission: ${perm}`,
          required: perm,
          role: access.role
        },
        { status: 403 }
      )
    };
  }
  return { project, access };
}

/** Convenience snapshot for serializing access into API responses. */
export function serializeAccess(access: ProjectAccess) {
  return {
    role: access.role,
    isOwner: access.isOwner,
    permissions: Array.from(access.permissions)
  };
}
