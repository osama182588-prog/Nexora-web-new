/**
 * `activity` module — broadcasts every internal bus event for a
 * project as a styled Discord embed in the configured channel.
 *
 * Reference example of a "broadcast" module: pure side effect, no
 * interactions, no commands. Disable it per-project to silence the
 * channel without uninstalling.
 */
import type { NexoraModule } from "./types";
import { ProjectModel } from "@/core";
import { sendChannelMessage } from "@/integration/discord/client";
import { actionRow, button, buildEmbed, statusColor } from "@/integration/discord/builders";
import { EmbedColor } from "@/integration/discord/types";

const TYPE_TITLE: Record<string, string> = {
  "project.created": "🚀 Project created",
  "project.updated": "✏️ Project updated",
  "project.deleted": "🗑️ Project deleted",
  "project.status_changed": "🔁 Project status changed",
  "project.progress_updated": "📈 Project progress updated",
  "ticket.created": "🎫 Ticket opened",
  "ticket.status_changed": "🎫 Ticket status changed",
  "product.published": "🛒 Product published",
  "product.unpublished": "🚫 Product unpublished"
};

export const activityModule: NexoraModule = {
  id: "activity",
  name: "Activity Broadcaster",
  description:
    "Posts a styled embed to a Discord channel for every project event in realtime.",
  category: "broadcast",
  enabledByDefault: false,
  configFields: [
    {
      key: "channelId",
      label: "Channel ID",
      type: "text",
      required: true,
      placeholder: "1023456789012345678",
      description: "The Discord channel where activity embeds are posted."
    }
  ],
  events: [
    "project.created",
    "project.updated",
    "project.deleted",
    "project.status_changed",
    "project.progress_updated",
    "ticket.created",
    "ticket.status_changed",
    "product.published",
    "product.unpublished"
  ],
  async onEvent(event, ctx) {
    const channelId = String(ctx.config.channelId ?? "").trim();
    if (!channelId) return;

    const project = await ProjectModel.findOne({
      _id: ctx.projectId,
      ownerId: ctx.ownerId
    }).lean();
    const projectName =
      project?.name ??
      (event.payload as { project?: { name?: string } }).project?.name ??
      "Unknown project";

    const embed = buildEmbed({
      title: TYPE_TITLE[event.type] ?? event.type,
      description: humanize(event),
      color: project ? statusColor(project.status) : EmbedColor.purple,
      author: { name: `Nexora · ${projectName}` },
      footer: `event ${event.type}`,
      timestamp: event.createdAt,
      fields: buildFields(event)
    });

    const components = [
      actionRow(
        button({
          label: "Open in Nexora",
          style: "link",
          url: projectUrl(ctx.projectId)
        })
      )
    ];

    await sendChannelMessage(
      channelId,
      { embeds: [embed], components },
      { projectId: ctx.projectId, ownerId: ctx.ownerId, moduleId: "activity" }
    );
  }
};

function humanize(event: { type: string; payload: Record<string, unknown> }): string {
  const project = (event.payload as { project?: { name?: string } }).project;
  const ticket = (event.payload as { ticket?: { subject?: string } }).ticket;
  const product = (event.payload as { product?: { title?: string } }).product;

  switch (event.type) {
    case "project.created":
      return `**${project?.name ?? "A project"}** was created.`;
    case "project.deleted":
      return `**${project?.name ?? "A project"}** was deleted.`;
    case "project.status_changed":
      return `Status changed on **${project?.name ?? "a project"}**.`;
    case "project.progress_updated":
      return `Progress updated on **${project?.name ?? "a project"}**.`;
    case "ticket.created":
      return `New ticket: **${ticket?.subject ?? "(no subject)"}**.`;
    case "ticket.status_changed":
      return `Ticket status changed: **${ticket?.subject ?? "(no subject)"}**.`;
    case "product.published":
      return `**${product?.title ?? "A product"}** was published to the marketplace.`;
    case "product.unpublished":
      return `**${product?.title ?? "A product"}** was removed from the marketplace.`;
    default:
      return "An update happened in your project.";
  }
}

function buildFields(event: {
  type: string;
  payload: Record<string, unknown>;
}): { name: string; value: string; inline?: boolean }[] | undefined {
  const project = (event.payload as { project?: { status?: string; progress?: number } })
    .project;
  const fields: { name: string; value: string; inline?: boolean }[] = [];
  if (project?.status) {
    fields.push({ name: "Status", value: project.status, inline: true });
  }
  if (typeof project?.progress === "number") {
    fields.push({
      name: "Progress",
      value: `${project.progress}%`,
      inline: true
    });
  }
  if (event.type === "project.status_changed") {
    const from = (event.payload as { from?: string }).from;
    const to = (event.payload as { to?: string }).to;
    if (from && to) {
      fields.push({ name: "Change", value: `\`${from}\` → \`${to}\``, inline: false });
    }
  }
  return fields.length > 0 ? fields : undefined;
}

function projectUrl(projectId: string): string {
  const base = process.env.NEXTAUTH_URL || "https://nexora.local";
  return `${base.replace(/\/$/, "")}/dashboard/projects/${projectId}`;
}
