/**
 * `tickets` module — opens & manages support tickets from Discord.
 *
 * Reference example of an "interactive" module: it owns a slash
 * command, multiple buttons and a select menu, and writes back into
 * MongoDB through the shared kernel so every state change is
 * automatically broadcast over the bus to the website's SSE channel.
 */
import type { NexoraModule } from "./types";
import { TicketModel } from "@/models/Ticket";
import { ProjectModel } from "@/core";
import { bus } from "@/core";
import {
  actionRow,
  button,
  buildEmbed,
  stringSelect
} from "@/integration/discord/builders";
import { editChannelMessage } from "@/integration/discord/client";
import { EmbedColor, MessageFlags } from "@/integration/discord/types";

const PRIORITIES = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" }
];

const STATUSES = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" }
];

const STATUS_COLOR: Record<string, number> = {
  open: EmbedColor.cyan,
  in_progress: EmbedColor.amber,
  resolved: EmbedColor.emerald,
  closed: EmbedColor.slate
};

export const ticketsModule: NexoraModule = {
  id: "tickets",
  name: "Tickets",
  description:
    "Open and triage support tickets directly from Discord using buttons & select menus.",
  category: "support",
  enabledByDefault: false,
  configFields: [
    {
      key: "guildId",
      label: "Discord Guild ID",
      type: "text",
      required: true,
      placeholder: "1023456789012345678",
      description:
        "The Discord server (guild) that should be linked to this project. Required so /ticket knows which project to attach to."
    },
    {
      key: "channelId",
      label: "Channel ID",
      type: "text",
      required: false,
      placeholder: "Optional — restrict the /ticket command to a single channel"
    }
  ],
  slashCommands: [
    {
      name: "ticket",
      description: "Open a support ticket for this Nexora project",
      options: [
        {
          name: "subject",
          description: "Short summary of the issue",
          type: 3,
          required: true
        },
        {
          name: "priority",
          description: "How urgent is this?",
          type: 3,
          required: false,
          choices: PRIORITIES.map((p) => ({ name: p.label, value: p.value }))
        }
      ]
    }
  ],
  events: ["ticket.status_changed"],

  async onEvent(event, _ctx) {
    // When a ticket's status changes from the website, mirror the
    // change back into Discord by editing the original embed (if we
    // know which message it was).
    const ticket = (event.payload as {
      ticket?: {
        id: string;
        subject: string;
        status: string;
        discordChannelId?: string | null;
        discordMessageId?: string | null;
      };
    }).ticket;
    if (!ticket?.discordChannelId || !ticket.discordMessageId) return;
    const embed = buildEmbed({
      title: `🎫 ${ticket.subject}`,
      description: `Status: \`${ticket.status}\``,
      color: STATUS_COLOR[ticket.status] ?? EmbedColor.cyan,
      footer: `ticket ${ticket.id}`
    });
    await editChannelMessage(ticket.discordChannelId, ticket.discordMessageId, {
      embeds: [embed],
      components: ticketComponents(ticket.id, ticket.status)
    });
  },

  async onInteraction(interaction, ctx) {
    // Slash command: /ticket subject:[..] priority:[..]
    if (interaction.data?.name === "ticket") {
      const opts = interaction.data.options ?? [];
      const subject =
        (opts.find((o) => o.name === "subject")?.value as string | undefined)?.trim() ??
        "Untitled";
      const priority =
        (opts.find((o) => o.name === "priority")?.value as string | undefined) ??
        "medium";
      const userId =
        interaction.member?.user?.id ?? interaction.user?.id ?? "unknown";

      const project = await ProjectModel.findOne({
        _id: ctx.projectId,
        ownerId: ctx.ownerId
      }).lean();

      const ticket = await TicketModel.create({
        ownerId: ctx.ownerId,
        projectId: ctx.projectId,
        source: "discord",
        discordUserId: userId,
        discordChannelId: interaction.channel_id ?? null,
        subject,
        priority,
        status: "open"
      });

      const id = String(ticket._id);
      // Publish so the website updates instantly through SSE.
      bus.publish({
        type: "ticket.created",
        actorId: ctx.ownerId,
        resourceId: ctx.projectId,
        payload: {
          ticket: {
            id,
            projectId: ctx.projectId,
            subject,
            priority,
            status: "open",
            source: "discord"
          }
        }
      });

      const embed = buildEmbed({
        title: `🎫 ${subject}`,
        description:
          `Ticket opened by <@${userId}> for **${project?.name ?? "this project"}**.\n` +
          `Priority: \`${priority}\` · Status: \`open\``,
        color: STATUS_COLOR.open,
        footer: `ticket ${id}`
      });

      return {
        kind: "reply",
        message: {
          embeds: [embed],
          components: ticketComponents(id, "open")
        }
      };
    }

    // Component interactions — `tickets:<action>:<ticketId>` etc.
    const customId = interaction.data?.custom_id ?? "";
    if (!customId.startsWith("tickets:")) return { kind: "ignore" };
    const [, action, ticketId] = customId.split(":");
    if (!ticketId) return { kind: "ignore" };

    if (action === "status") {
      const next = interaction.data?.values?.[0] ?? "open";
      return updateTicketStatus({
        ticketId,
        status: next,
        ownerId: ctx.ownerId,
        projectId: ctx.projectId
      });
    }
    if (action === "close") {
      return updateTicketStatus({
        ticketId,
        status: "closed",
        ownerId: ctx.ownerId,
        projectId: ctx.projectId
      });
    }
    if (action === "claim") {
      const userId =
        interaction.member?.user?.id ?? interaction.user?.id ?? "unknown";
      return updateTicketStatus({
        ticketId,
        status: "in_progress",
        ownerId: ctx.ownerId,
        projectId: ctx.projectId,
        note: `Claimed by <@${userId}>`
      });
    }
    return {
      kind: "reply",
      ephemeral: true,
      message: { content: "Unknown ticket action.", flags: MessageFlags.EPHEMERAL }
    };
  }
};

function ticketComponents(ticketId: string, status: string) {
  return [
    actionRow(
      stringSelect({
        customId: `tickets:status:${ticketId}`,
        placeholder: `Status · ${status}`,
        options: STATUSES.map((s) => ({
          ...s,
          default: s.value === status
        }))
      })
    ),
    actionRow(
      button({
        label: "Claim",
        customId: `tickets:claim:${ticketId}`,
        style: "primary",
        emoji: "🙋"
      }),
      button({
        label: "Close",
        customId: `tickets:close:${ticketId}`,
        style: "danger",
        emoji: "✅"
      })
    )
  ];
}

async function updateTicketStatus(input: {
  ticketId: string;
  status: string;
  ownerId: string;
  projectId: string;
  note?: string;
}) {
  const allowed = ["open", "in_progress", "resolved", "closed"];
  if (!allowed.includes(input.status)) {
    return {
      kind: "reply" as const,
      ephemeral: true,
      message: { content: "Invalid status.", flags: MessageFlags.EPHEMERAL }
    };
  }
  const ticket = await TicketModel.findOneAndUpdate(
    { _id: input.ticketId, ownerId: input.ownerId, projectId: input.projectId },
    { status: input.status },
    { new: true }
  ).lean();
  if (!ticket) {
    return {
      kind: "reply" as const,
      ephemeral: true,
      message: { content: "Ticket not found.", flags: MessageFlags.EPHEMERAL }
    };
  }

  bus.publish({
    type: "ticket.status_changed",
    actorId: input.ownerId,
    resourceId: input.projectId,
    payload: {
      ticket: {
        id: String(ticket._id),
        projectId: input.projectId,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        source: ticket.source,
        discordChannelId: ticket.discordChannelId,
        discordMessageId: ticket.discordMessageId
      }
    }
  });

  const embed = buildEmbed({
    title: `🎫 ${ticket.subject}`,
    description:
      (input.note ? `${input.note}\n\n` : "") +
      `Status updated to \`${ticket.status}\`.`,
    color: STATUS_COLOR[ticket.status] ?? EmbedColor.cyan,
    footer: `ticket ${String(ticket._id)}`
  });

  return {
    kind: "update" as const,
    message: {
      embeds: [embed],
      components: ticketComponents(String(ticket._id), ticket.status)
    }
  };
}
