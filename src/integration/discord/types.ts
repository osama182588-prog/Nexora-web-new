/**
 * Minimal Discord types — just enough for the interactions endpoint
 * and the REST sender. Modelled after the public Discord API docs.
 *
 * Not a substitute for `discord.js` / `discord-api-types`, but those
 * packages are heavy and we explicitly want the integration layer to
 * stay dependency-light and inside the Next.js bundle.
 */

export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5
} as const;

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9
} as const;

export const ComponentType = {
  ACTION_ROW: 1,
  BUTTON: 2,
  STRING_SELECT: 3,
  TEXT_INPUT: 4
} as const;

export const ButtonStyle = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5
} as const;

/** Embed colour palette aligned with the Nexora UI. */
export const EmbedColor = {
  purple: 0x8b5cf6,
  blue: 0x3b82f6,
  cyan: 0x06b6d4,
  emerald: 0x10b981,
  amber: 0xf59e0b,
  rose: 0xf43f5e,
  slate: 0x64748b
} as const;

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  author?: { name: string; icon_url?: string; url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
}

export interface DiscordButton {
  type: typeof ComponentType.BUTTON;
  style:
    | typeof ButtonStyle.PRIMARY
    | typeof ButtonStyle.SECONDARY
    | typeof ButtonStyle.SUCCESS
    | typeof ButtonStyle.DANGER
    | typeof ButtonStyle.LINK;
  label: string;
  custom_id?: string;
  url?: string;
  disabled?: boolean;
  emoji?: { name: string };
}

export interface DiscordSelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: { name: string };
  default?: boolean;
}

export interface DiscordStringSelect {
  type: typeof ComponentType.STRING_SELECT;
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  options: DiscordSelectOption[];
}

export interface DiscordActionRow {
  type: typeof ComponentType.ACTION_ROW;
  components: (DiscordButton | DiscordStringSelect)[];
}

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordActionRow[];
  /** When set, the response is only visible to the invoking user. */
  flags?: number;
}

/** Bit flag — message visible only to the invoker. */
export const MessageFlags = {
  EPHEMERAL: 1 << 6
} as const;

/** A single slash command definition. */
export interface SlashCommandDefinition {
  name: string;
  description: string;
  options?: {
    name: string;
    description: string;
    type: number; // 3 = string, 4 = integer, etc.
    required?: boolean;
    choices?: { name: string; value: string }[];
  }[];
}

/** Shape of an incoming interaction from Discord. */
export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  token: string;
  version: number;
  guild_id?: string;
  channel_id?: string;
  member?: {
    user?: { id: string; username: string; global_name?: string | null };
  };
  user?: { id: string; username: string; global_name?: string | null };
  data?: {
    id?: string;
    name?: string;
    custom_id?: string;
    component_type?: number;
    values?: string[];
    options?: { name: string; type: number; value: string | number | boolean }[];
  };
  message?: { id: string };
}
