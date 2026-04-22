import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * ProjectModule — per-project enable/disable state and configuration
 * for a single module (e.g. the Discord activity broadcaster, the
 * tickets module, the admin controls module).
 *
 * Each module owns its slice of `config` — the schema is intentionally
 * a free-form `Mixed` so adding new modules never needs a migration.
 */
const ProjectModuleSchema = new Schema(
  {
    /** Owning user (mirrors `Project.ownerId` for fast indexing). */
    ownerId: { type: String, required: true, index: true },
    /** Project this module instance belongs to. */
    projectId: { type: String, required: true, index: true },
    /** Module identifier — see `src/modules/registry.ts`. */
    moduleId: { type: String, required: true, index: true },

    enabled: { type: Boolean, default: false },

    /**
     * Free-form, module-specific configuration.
     *
     * For the Discord modules this typically contains:
     *  - `channelId`: Discord channel id to post into
     *  - `guildId`: Discord guild id (optional, for slash command scope)
     *  - any module-specific knobs
     */
    config: { type: Schema.Types.Mixed, default: {} },

    /** Bookkeeping — last time a module action ran for this project. */
    lastInvokedAt: { type: Date, default: null },
    invocationCount: { type: Number, default: 0 }
  },
  { timestamps: true, collection: "project_modules" }
);

// One row per (project, module) pair.
ProjectModuleSchema.index({ projectId: 1, moduleId: 1 }, { unique: true });
ProjectModuleSchema.index({ ownerId: 1, enabled: 1 });

export type ProjectModule = InferSchemaType<typeof ProjectModuleSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ProjectModuleModel: Model<ProjectModule> =
  (mongoose.models.ProjectModule as Model<ProjectModule>) ||
  mongoose.model<ProjectModule>("ProjectModule", ProjectModuleSchema);
