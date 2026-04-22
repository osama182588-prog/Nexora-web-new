/**
 * Modules API.
 *
 * GET    /api/modules?projectId=...
 *        → returns the static registry + the installs for the project.
 *
 * POST   /api/modules
 *        body: { projectId, moduleId, enabled?, config? }
 *        → upserts the install row, publishes a `module.*` bus event so
 *          the SSE channel + operator log update instantly. No REST
 *          calls between subsystems — everything flows through the bus.
 */
import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { apiError, requireUserId } from "@/lib/api";
import { ProjectModuleModel } from "@/models/ProjectModule";
import { bus } from "@/lib/system/bus";
import { getModule, getRegistry } from "@/modules";
import { isDiscordConfigured } from "@/integration/discord/client";
import { requireProjectPermission, serializeAccess } from "@/core/permissions";

export const dynamic = "force-dynamic";

function serializeRegistry() {
  return getRegistry().map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    category: m.category,
    enabledByDefault: Boolean(m.enabledByDefault),
    configFields: m.configFields ?? [],
    slashCommands: (m.slashCommands ?? []).map((c) => ({
      name: c.name,
      description: c.description
    }))
  }));
}

interface InstallDoc {
  moduleId: string;
  enabled: boolean;
  config?: Record<string, unknown>;
  lastInvokedAt?: Date | null;
  invocationCount?: number;
  updatedAt?: Date;
}

function serializeInstall(i: InstallDoc) {
  return {
    moduleId: i.moduleId,
    enabled: Boolean(i.enabled),
    config: (i.config as Record<string, unknown>) ?? {},
    lastInvokedAt: i.lastInvokedAt ? new Date(i.lastInvokedAt).toISOString() : null,
    invocationCount: i.invocationCount ?? 0,
    updatedAt: i.updatedAt ? new Date(i.updatedAt).toISOString() : null
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return apiError("A projectId is required.");

  const guard = await requireProjectPermission(
    auth.userId,
    projectId,
    "modules.read"
  );
  if (guard.response) return guard.response;
  const { project, access } = guard;

  await connectToDatabase();
  const installs = await ProjectModuleModel.find({
    projectId,
    ownerId: project.ownerId
  }).lean();

  return NextResponse.json({
    registry: serializeRegistry(),
    installs: installs.map((i) => serializeInstall(i as unknown as InstallDoc)),
    access: serializeAccess(access),
    runtime: {
      discordConfigured: isDiscordConfigured(),
      interactionsUrl: "/api/integration/discord/interactions"
    }
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  let body: {
    projectId?: string;
    moduleId?: string;
    enabled?: boolean;
    config?: Record<string, unknown>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return apiError("Invalid JSON body.");
  }

  const { projectId, moduleId } = body;
  if (!projectId) return apiError("A projectId is required.");
  if (!moduleId || !getModule(moduleId)) {
    return apiError("Unknown moduleId.");
  }

  const guard = await requireProjectPermission(
    auth.userId,
    projectId,
    "modules.manage"
  );
  if (guard.response) return guard.response;
  const { project } = guard;

  await connectToDatabase();

  const update: Record<string, unknown> = {
    ownerId: project.ownerId,
    projectId,
    moduleId
  };
  if (typeof body.enabled === "boolean") update.enabled = body.enabled;
  if (body.config && typeof body.config === "object") {
    // Sanitize: store only string/boolean/number primitives.
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body.config)) {
      if (
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean"
      ) {
        clean[k] = typeof v === "string" ? v.trim() : v;
      }
    }
    update.config = clean;
  }

  const install = await ProjectModuleModel.findOneAndUpdate(
    { projectId, moduleId, ownerId: project.ownerId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  // Publish so the website (and any other in-process subscriber)
  // reflects the change instantly via SSE.
  const eventType =
    typeof body.enabled === "boolean"
      ? body.enabled
        ? "module.enabled"
        : "module.disabled"
      : "module.configured";
  bus.publish({
    type: eventType,
    actorId: project.ownerId,
    resourceId: projectId,
    payload: {
      moduleId,
      install: serializeInstall(install as unknown as InstallDoc),
      by: auth.userId
    }
  });

  return NextResponse.json({
    install: serializeInstall(install as unknown as InstallDoc)
  });
}
