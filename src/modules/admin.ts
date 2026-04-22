/**
 * `admin` module — surfaces project management actions in Discord.
 *
 * Reference example of a "control plane" module: buttons mutate
 * project state via the shared service layer, which republishes the
 * change to the bus, which propagates through the website's SSE
 * channel — all without touching any REST API.
 */
import type { NexoraModule } from "./types";
import { ProjectModel } from "@/core";
import { publishProjectEvent, recordProjectActivity } from "@/core";
import {
  actionRow,
  button,
  buildEmbed,
  statusColor
} from "@/integration/discord/builders";
import { MessageFlags } from "@/integration/discord/types";

const STATUSES = ["active", "paused", "completed", "archived"] as const;
type ProjectStatus = (typeof STATUSES)[number];

export const adminModule: NexoraModule = {
  id: "admin",
  name: "Admin Controls",
  description:
    "Toggle project status from Discord buttons. Changes flow back through the bus and update the site instantly.",
  category: "admin",
  enabledByDefault: false,
  configFields: [
    {
      key: "guildId",
      label: "Discord Guild ID",
      type: "text",
      required: true,
      placeholder: "1023456789012345678",
      description:
        "The Discord server (guild) that should be linked to this project. Required so /project knows which project to manage."
    }
  ],
  slashCommands: [
    {
      name: "project",
      description: "Show the admin panel for the current Nexora project"
    }
  ],

  async onInteraction(interaction, ctx) {
    if (interaction.data?.name === "project") {
      const project = await ProjectModel.findOne({
        _id: ctx.projectId,
        ownerId: ctx.ownerId
      }).lean();
      if (!project) {
        return {
          kind: "reply",
          ephemeral: true,
          message: {
            content: "Project not found.",
            flags: MessageFlags.EPHEMERAL
          }
        };
      }
      return {
        kind: "reply",
        ephemeral: true,
        message: {
          embeds: [renderProjectEmbed(project)],
          components: renderActionRows(String(project._id), project.status),
          flags: MessageFlags.EPHEMERAL
        }
      };
    }

    const customId = interaction.data?.custom_id ?? "";
    if (!customId.startsWith("admin:")) return { kind: "ignore" };
    const [, action, statusOrId] = customId.split(":");

    if (action === "status") {
      const next = statusOrId as ProjectStatus;
      if (!STATUSES.includes(next)) {
        return {
          kind: "reply",
          ephemeral: true,
          message: {
            content: "Unknown status.",
            flags: MessageFlags.EPHEMERAL
          }
        };
      }
      const project = await ProjectModel.findOne({
        _id: ctx.projectId,
        ownerId: ctx.ownerId
      });
      if (!project) {
        return {
          kind: "reply",
          ephemeral: true,
          message: {
            content: "Project not found.",
            flags: MessageFlags.EPHEMERAL
          }
        };
      }
      const previous = project.status;
      if (previous === next) {
        return {
          kind: "reply",
          ephemeral: true,
          message: {
            content: `Project is already \`${next}\`.`,
            flags: MessageFlags.EPHEMERAL
          }
        };
      }
      project.status = next;
      project.lastActivityAt = new Date();
      await project.save();

      // Mirror the change into the activity log + the bus so the
      // website's SSE-bound UI updates immediately.
      await recordProjectActivity({
        ownerId: ctx.ownerId,
        projectId: String(project._id),
        type: "project.status_changed",
        message: `Status changed from ${previous} to ${next} on "${project.name}" (via Discord)`,
        metadata: { from: previous, to: next, source: "discord" }
      });
      publishProjectEvent({
        type: "project.status_changed",
        ownerId: ctx.ownerId,
        project,
        extra: { from: previous, to: next, source: "discord" }
      });

      return {
        kind: "update",
        message: {
          embeds: [renderProjectEmbed(project)],
          components: renderActionRows(String(project._id), next),
          flags: MessageFlags.EPHEMERAL
        }
      };
    }

    return { kind: "ignore" };
  }
};

type ProjectLike = {
  _id: unknown;
  name: string;
  status: string;
  priority: string;
  progress: number;
  description?: string;
};

function renderProjectEmbed(project: ProjectLike) {
  return buildEmbed({
    title: `🛠️ ${project.name}`,
    description: project.description?.slice(0, 280) || "_No description_",
    color: statusColor(project.status),
    fields: [
      { name: "Status", value: `\`${project.status}\``, inline: true },
      { name: "Priority", value: `\`${project.priority}\``, inline: true },
      { name: "Progress", value: `${project.progress ?? 0}%`, inline: true }
    ],
    footer: "Nexora · Admin controls",
    timestamp: new Date()
  });
}

function renderActionRows(projectId: string, current: string) {
  const styles: Record<ProjectStatus, "primary" | "secondary" | "success" | "danger"> = {
    active: "success",
    paused: "secondary",
    completed: "primary",
    archived: "danger"
  };
  return [
    actionRow(
      ...STATUSES.map((s) =>
        button({
          label: s.charAt(0).toUpperCase() + s.slice(1),
          customId: `admin:status:${s}`,
          style: styles[s],
          disabled: s === current
        })
      )
    ),
    actionRow(
      button({
        label: "Open in Nexora",
        style: "link",
        url: `${(process.env.NEXTAUTH_URL ?? "https://nexora.local").replace(/\/$/, "")}/dashboard/projects/${projectId}`
      })
    )
  ];
}
