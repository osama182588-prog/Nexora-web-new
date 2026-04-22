/**
 * Thin Discord REST client.
 *
 * We deliberately avoid `discord.js` — the integration layer must stay
 * inside the Next.js bundle, so we use `fetch` against the public
 * Discord HTTP API. The bot token is read from `DISCORD_BOT_TOKEN`.
 *
 * Every send is best-effort: failures are logged and republished to the
 * bus as `external.discord.failed` so the operator + UI stay informed,
 * but they never throw into the caller.
 */
import { bus } from "@/lib/system/bus";
import type { DiscordMessage } from "./types";

const API = "https://discord.com/api/v10";

function token(): string | null {
  return process.env.DISCORD_BOT_TOKEN || null;
}

async function discordFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const t = token();
  if (!t) throw new Error("DISCORD_BOT_TOKEN is not configured");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${t}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  return res;
}

interface SendContext {
  /** Project this message belongs to — surfaces on the bus event. */
  projectId: string;
  /** Owner of the project — required so SSE can route the bus event. */
  ownerId: string;
  /** Module that produced the message. */
  moduleId: string;
}

/**
 * Send a message to a Discord channel. Returns the created message id
 * on success or `null` on failure. Always emits a bus event so the
 * website's realtime channel can render delivery feedback.
 */
export async function sendChannelMessage(
  channelId: string,
  message: DiscordMessage,
  ctx: SendContext
): Promise<string | null> {
  if (!token()) {
    // Bot not configured — surface a single failure event so the UI
    // can hint the user to set the env var, then return.
    bus.publish({
      type: "external.discord.failed",
      actorId: ctx.ownerId,
      resourceId: ctx.projectId,
      payload: {
        moduleId: ctx.moduleId,
        channelId,
        reason: "bot-not-configured"
      }
    });
    return null;
  }
  try {
    const res = await discordFetch(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify(message)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      bus.publish({
        type: "external.discord.failed",
        actorId: ctx.ownerId,
        resourceId: ctx.projectId,
        payload: {
          moduleId: ctx.moduleId,
          channelId,
          status: res.status,
          body: text.slice(0, 500)
        }
      });
      return null;
    }
    const json = (await res.json()) as { id?: string };
    bus.publish({
      type: "external.discord.delivered",
      actorId: ctx.ownerId,
      resourceId: ctx.projectId,
      payload: {
        moduleId: ctx.moduleId,
        channelId,
        messageId: json.id ?? null
      }
    });
    return json.id ?? null;
  } catch (err) {
    bus.publish({
      type: "external.discord.failed",
      actorId: ctx.ownerId,
      resourceId: ctx.projectId,
      payload: {
        moduleId: ctx.moduleId,
        channelId,
        reason: (err as Error).message
      }
    });
    return null;
  }
}

/**
 * Edit an existing message. Used by the admin/tickets modules to
 * reflect state changes back into the original Discord embed.
 */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  message: DiscordMessage
): Promise<boolean> {
  if (!token()) return false;
  try {
    const res = await discordFetch(
      `/channels/${channelId}/messages/${messageId}`,
      {
        method: "PATCH",
        body: JSON.stringify(message)
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Convenience: returns true when the bot is configured. */
export function isDiscordConfigured(): boolean {
  return Boolean(token());
}
