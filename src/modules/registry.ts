/**
 * Module registry + bus dispatcher.
 *
 * `getRegistry()` exposes the immutable list of installed modules.
 * `ensureExternalIntegration()` (called from `/api/integration/discord`
 * and from the SSE entry) wires a single global subscriber to the bus
 * that fans every event out to the modules enabled for the relevant
 * project. The dispatcher is idempotent + globalThis-cached so it
 * survives Next dev hot reloads exactly like the bus itself.
 */
import { connectToDatabase, bus } from "@/core";
import type { SystemEvent } from "@/lib/system/bus";
import { ProjectModuleModel } from "@/models/ProjectModule";
import type { NexoraModule, ModuleContext } from "./types";

import { activityModule } from "./activity";
import { ticketsModule } from "./tickets";
import { adminModule } from "./admin";

const MODULES: NexoraModule[] = [activityModule, ticketsModule, adminModule];
const MODULE_BY_ID = new Map<string, NexoraModule>(MODULES.map((m) => [m.id, m]));

export function getRegistry(): NexoraModule[] {
  return MODULES.slice();
}

export function getModule(id: string): NexoraModule | undefined {
  return MODULE_BY_ID.get(id);
}

interface DispatcherState {
  started: boolean;
  startedAt: string | null;
  delivered: number;
  failed: number;
}

const GLOBAL_KEY = "__nexora_module_dispatcher__";

function state(): DispatcherState {
  const g = globalThis as unknown as { [GLOBAL_KEY]?: DispatcherState };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      started: false,
      startedAt: null,
      delivered: 0,
      failed: 0
    };
  }
  return g[GLOBAL_KEY]!;
}

export function dispatcherState(): DispatcherState {
  return { ...state() };
}

/**
 * Skip events that are themselves emitted by the integration layer —
 * otherwise an `external.discord.delivered` event would re-trigger
 * every broadcast module and we'd hit an infinite ping-pong loop.
 */
function isInternalEcho(type: string): boolean {
  return (
    type.startsWith("external.discord.") ||
    type.startsWith("module.") ||
    type === "operator.heartbeat"
  );
}

async function dispatch(event: SystemEvent): Promise<void> {
  if (isInternalEcho(event.type)) return;
  if (!event.resourceId) return; // module hooks are always project-scoped

  // Resolve the project id for the event. Project events use the
  // `resourceId`; product events embed the project id under the
  // payload when available. For now we treat `resourceId` as the
  // project id for project.* and ticket.* events; product.* events
  // aren't routed to project-scoped modules unless they include one.
  let projectId: string | null = null;
  if (event.type.startsWith("project.") || event.type.startsWith("ticket.")) {
    projectId = event.resourceId;
  } else if (event.type.startsWith("product.")) {
    const product = (event.payload as { product?: { projectId?: string | null } })
      ?.product;
    projectId = product?.projectId ?? null;
  }
  if (!projectId) return;

  try {
    await connectToDatabase();
    const installs = await ProjectModuleModel.find({
      projectId,
      ownerId: event.actorId,
      enabled: true
    }).lean();

    if (installs.length === 0) return;

    for (const install of installs) {
      const mod = MODULE_BY_ID.get(install.moduleId);
      if (!mod || !mod.onEvent) continue;
      if (mod.events && mod.events.length > 0) {
        if (!mod.events.includes("*") && !mod.events.includes(event.type)) {
          continue;
        }
      }
      const ctx: ModuleContext = {
        ownerId: event.actorId,
        projectId,
        config: (install.config as Record<string, unknown>) ?? {}
      };
      try {
        await mod.onEvent(event, ctx);
        state().delivered += 1;
      } catch (err) {
        state().failed += 1;
        console.error(
          `[nexora.modules] ${mod.id}.onEvent failed for ${event.id}`,
          err
        );
      }
    }
  } catch (err) {
    state().failed += 1;
    console.error("[nexora.modules] dispatcher failure", err);
  }
}

export function ensureExternalIntegration(): DispatcherState {
  const s = state();
  if (s.started) return s;
  s.started = true;
  s.startedAt = new Date().toISOString();
  bus.subscribe((event) => {
    void dispatch(event);
  });
  return s;
}
