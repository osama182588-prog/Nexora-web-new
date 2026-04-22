/**
 * Embed + component builders.
 *
 * Modules call these to compose modern Discord UIs (buttons, select
 * menus, embeds with author + fields + footer) without dealing with
 * raw component shapes.
 */
import {
  ButtonStyle,
  ComponentType,
  EmbedColor,
  type DiscordActionRow,
  type DiscordButton,
  type DiscordEmbed,
  type DiscordSelectOption,
  type DiscordStringSelect
} from "./types";

type AccentName = keyof typeof EmbedColor;

interface BuildEmbedInput {
  title: string;
  description?: string;
  color?: AccentName | number;
  url?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  author?: { name: string; iconUrl?: string; url?: string };
  footer?: string;
  thumbnailUrl?: string;
  timestamp?: string | Date;
}

export function buildEmbed(input: BuildEmbedInput): DiscordEmbed {
  const color =
    typeof input.color === "number"
      ? input.color
      : EmbedColor[input.color ?? "purple"];
  const timestamp =
    input.timestamp instanceof Date
      ? input.timestamp.toISOString()
      : input.timestamp;
  return {
    title: input.title,
    description: input.description,
    url: input.url,
    color,
    fields: input.fields,
    author: input.author
      ? {
          name: input.author.name,
          icon_url: input.author.iconUrl,
          url: input.author.url
        }
      : undefined,
    footer: input.footer ? { text: input.footer } : undefined,
    thumbnail: input.thumbnailUrl ? { url: input.thumbnailUrl } : undefined,
    timestamp: timestamp ?? new Date().toISOString()
  };
}

interface ButtonInput {
  label: string;
  /** Custom id used when matching the button click in `onInteraction`. */
  customId?: string;
  /** Use either `customId` (interactive) OR `url` (link button). */
  url?: string;
  style?: "primary" | "secondary" | "success" | "danger" | "link";
  emoji?: string;
  disabled?: boolean;
}

const BUTTON_STYLE: Record<NonNullable<ButtonInput["style"]>, number> = {
  primary: ButtonStyle.PRIMARY,
  secondary: ButtonStyle.SECONDARY,
  success: ButtonStyle.SUCCESS,
  danger: ButtonStyle.DANGER,
  link: ButtonStyle.LINK
};

export function button(input: ButtonInput): DiscordButton {
  const isLink = Boolean(input.url);
  const style = isLink
    ? ButtonStyle.LINK
    : (BUTTON_STYLE[input.style ?? "secondary"] as DiscordButton["style"]);
  return {
    type: ComponentType.BUTTON,
    style,
    label: input.label,
    custom_id: isLink ? undefined : input.customId,
    url: input.url,
    disabled: input.disabled,
    emoji: input.emoji ? { name: input.emoji } : undefined
  };
}

export function actionRow(
  ...components: (DiscordButton | DiscordStringSelect)[]
): DiscordActionRow {
  return { type: ComponentType.ACTION_ROW, components };
}

export function stringSelect(input: {
  customId: string;
  placeholder?: string;
  options: DiscordSelectOption[];
  minValues?: number;
  maxValues?: number;
}): DiscordStringSelect {
  return {
    type: ComponentType.STRING_SELECT,
    custom_id: input.customId,
    placeholder: input.placeholder,
    min_values: input.minValues,
    max_values: input.maxValues,
    options: input.options
  };
}

/** Map a project status to one of the embed accent colours. */
export function statusColor(
  status: "active" | "paused" | "completed" | "archived" | string
): number {
  switch (status) {
    case "active":
      return EmbedColor.emerald;
    case "paused":
      return EmbedColor.amber;
    case "completed":
      return EmbedColor.cyan;
    case "archived":
      return EmbedColor.slate;
    default:
      return EmbedColor.purple;
  }
}
