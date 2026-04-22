/**
 * Discord interactions webhook.
 *
 * Discord posts every slash command + component interaction to this
 * URL (configured as the application's "Interactions Endpoint URL"
 * in the developer portal). We:
 *   1. Verify the Ed25519 signature using the raw body.
 *   2. Reply to the PING handshake.
 *   3. Look up which Nexora project owns the originating guild via the
 *      `ProjectModule` collection.
 *   4. Dispatch to the matching module's `onInteraction` based on the
 *      slash command name or `custom_id` prefix.
 *   5. Return Discord's expected response shape.
 *
 * Module side effects (state changes, DB writes) flow through the
 * shared kernel + bus, which lights up the website's SSE channel —
 * the website updates instantly without a single REST call.
 */
import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { bus } from "@/lib/system/bus";
import { ProjectModuleModel } from "@/models/ProjectModule";
import { verifyDiscordSignature } from "@/integration/discord/signature";
import {
  InteractionResponseType,
  InteractionType,
  MessageFlags,
  type DiscordInteraction
} from "@/integration/discord/types";
import {
  ensureExternalIntegration,
  getModule,
  getRegistry
} from "@/modules";
import type { InteractionResult, ModuleContext, NexoraModule } from "@/modules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Read the raw body BEFORE parsing — signature verification needs
  // the exact bytes Discord signed.
  const rawBody = await req.text();
  const valid = verifyDiscordSignature({
    signatureHex: req.headers.get("x-signature-ed25519"),
    timestamp: req.headers.get("x-signature-timestamp"),
    rawBody,
    publicKeyHex: process.env.DISCORD_PUBLIC_KEY
  });
  if (!valid) {
    return new NextResponse("invalid request signature", { status: 401 });
  }

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction;
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  // PING handshake — must be answered with PONG.
  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  // Wire up the bus → modules dispatcher (idempotent) so that bus
  // events triggered by the interaction propagate to enabled modules.
  ensureExternalIntegration();

  // Resolve the module + project for this interaction.
  const resolved = await resolveTarget(interaction);
  if (!resolved) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          "This Discord server isn't linked to a Nexora project yet. " +
          "Open the **Integrations** page in your Nexora dashboard to enable a module here.",
        flags: MessageFlags.EPHEMERAL
      }
    });
  }

  const { module: mod, ctx } = resolved;

  // Surface the interaction on the bus so the website operator log +
  // SSE channel reflect external activity in realtime.
  bus.publish({
    type: "external.discord.interaction",
    actorId: ctx.ownerId,
    resourceId: ctx.projectId,
    payload: {
      moduleId: mod.id,
      interactionType: interaction.type,
      slashCommand: interaction.data?.name ?? null,
      customId: interaction.data?.custom_id ?? null
    }
  });

  if (!mod.onInteraction) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Module \`${mod.id}\` has no interaction handler.`,
        flags: MessageFlags.EPHEMERAL
      }
    });
  }

  // Bookkeeping: remember the last invocation per project/module.
  await ProjectModuleModel.updateOne(
    { projectId: ctx.projectId, moduleId: mod.id },
    { $set: { lastInvokedAt: new Date() }, $inc: { invocationCount: 1 } }
  ).catch(() => {});

  let result: InteractionResult;
  try {
    result = await mod.onInteraction(interaction, ctx);
  } catch (err) {
    console.error(`[discord] ${mod.id} interaction failed`, err);
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Something went wrong handling that interaction.",
        flags: MessageFlags.EPHEMERAL
      }
    });
  }

  return NextResponse.json(toDiscordResponse(result));
}

/**
 * Map a Discord interaction to the matching Nexora project + module.
 *
 * Selection rules:
 *  - Slash command: pick the module whose `slashCommands` includes the
 *    invoked command name.
 *  - Component / modal: pick the module whose id matches the prefix of
 *    `custom_id` (`<id>:...`).
 *
 * In both cases, the project is identified by the guild id stored in
 * any enabled `ProjectModule.config.guildId`.
 */
async function resolveTarget(
  interaction: DiscordInteraction
): Promise<{ module: NexoraModule; ctx: ModuleContext } | null> {
  const guildId = interaction.guild_id;
  if (!guildId) return null;

  // Pick the module first so we know which install we need.
  let mod: NexoraModule | undefined;
  if (
    interaction.type === InteractionType.APPLICATION_COMMAND &&
    interaction.data?.name
  ) {
    mod = findModuleByCommand(interaction.data.name);
  } else if (interaction.data?.custom_id) {
    const prefix = interaction.data.custom_id.split(":")[0];
    mod = getModule(prefix);
  }
  if (!mod) return null;

  await connectToDatabase();
  const install = await ProjectModuleModel.findOne({
    moduleId: mod.id,
    enabled: true,
    "config.guildId": guildId
  }).lean();
  if (!install) return null;

  return {
    module: mod,
    ctx: {
      ownerId: install.ownerId,
      projectId: install.projectId,
      config: (install.config as Record<string, unknown>) ?? {}
    }
  };
}

function findModuleByCommand(name: string): NexoraModule | undefined {
  return registryCommands.get(name);
}

const registryCommands = (() => {
  const map = new Map<string, NexoraModule>();
  for (const mod of getRegistry()) {
    for (const cmd of mod.slashCommands ?? []) {
      map.set(cmd.name, mod);
    }
  }
  return map;
})();

function toDiscordResponse(result: InteractionResult): unknown {
  if (!result || (typeof result === "object" && (result as { kind?: string }).kind === "ignore")) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Nothing to do.",
        flags: MessageFlags.EPHEMERAL
      }
    };
  }
  switch (result.kind) {
    case "reply":
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: result.ephemeral
          ? { ...result.message, flags: MessageFlags.EPHEMERAL }
          : result.message
      };
    case "update":
      return {
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: result.message
      };
    case "defer":
      return {
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        data: result.ephemeral ? { flags: MessageFlags.EPHEMERAL } : {}
      };
    default:
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "OK", flags: MessageFlags.EPHEMERAL }
      };
  }
}
