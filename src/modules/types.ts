/**
 * Module contract.
 *
 * Every module is a self-contained unit that:
 *  1. Reacts to internal bus events (`onEvent`)
 *  2. Reacts to Discord interactions whose `custom_id` starts with the
 *     module id (`onInteraction`)
 *  3. Optionally registers slash commands consumed by the same handler
 *  4. Declares a config schema so the dashboard can render a form
 *
 * Modules MUST be free of side effects at import time — they are
 * allowed to reach into the shared kernel (`@/core`) and the Discord
 * adapter (`@/integration/discord`) only inside their handlers.
 */
import type { SystemEvent } from "@/lib/system/bus";
import type {
  DiscordInteraction,
  DiscordMessage,
  SlashCommandDefinition
} from "@/integration/discord/types";

/**
 * The runtime context handed to every module callback. Modules use it
 * to load configuration, talk back to the bus, and address the right
 * project — without knowing where the call came from.
 */
export interface ModuleContext {
  /** Owner of the project this invocation concerns. */
  ownerId: string;
  /** The project the call is scoped to. */
  projectId: string;
  /** Module-specific config from `ProjectModule.config`. */
  config: Record<string, unknown>;
}

/** Optional response a module can return for a Discord interaction. */
export type InteractionResult =
  | { kind: "reply"; message: DiscordMessage; ephemeral?: boolean }
  | { kind: "update"; message: DiscordMessage }
  | { kind: "defer"; ephemeral?: boolean }
  | { kind: "ignore" }
  | null
  | undefined
  | void;

export type ModuleCategory =
  | "broadcast"
  | "support"
  | "admin"
  | "analytics"
  | "automation";

export interface ConfigField {
  key: string;
  label: string;
  /** `text` for free-form, `password` for tokens, `boolean` for toggles. */
  type: "text" | "password" | "boolean";
  placeholder?: string;
  description?: string;
  required?: boolean;
}

export interface NexoraModule {
  /** Stable identifier — also the prefix for `custom_id`s. */
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  /** Default `enabled` state when first installed onto a project. */
  enabledByDefault?: boolean;
  /** Configuration form rendered in `/dashboard/integrations`. */
  configFields?: ConfigField[];
  /** Slash commands the module owns — shared `/api/integration/discord`. */
  slashCommands?: SlashCommandDefinition[];
  /** Bus event types this module is interested in. `*` for all. */
  events?: string[];

  /**
   * Called for every bus event matching `events`. Modules typically
   * use this to broadcast Discord embeds reflecting the change.
   * Errors are caught by the dispatcher and surfaced on the bus.
   */
  onEvent?: (event: SystemEvent, ctx: ModuleContext) => Promise<void> | void;

  /**
   * Called for every Discord interaction whose `custom_id` starts with
   * `<id>:` or whose slash command name matches one of `slashCommands`.
   *
   * Returning a `reply`/`update`/`defer` result tells the interaction
   * route how to respond. Returning `ignore`/`undefined` lets other
   * matchers run (rare).
   */
  onInteraction?: (
    interaction: DiscordInteraction,
    ctx: ModuleContext
  ) => Promise<InteractionResult> | InteractionResult;
}
