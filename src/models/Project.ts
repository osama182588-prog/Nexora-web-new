import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Project document.
 *
 * Designed to be extensible: the `marketplace` sub-document is reserved
 * for Phase 3 (marketplace listings), and `metadata` is a free-form
 * object so feature areas can stash data without schema migrations.
 */
const ProjectSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 96 },
    description: { type: String, default: "", trim: true, maxlength: 500 },

    status: {
      type: String,
      enum: ["active", "paused", "completed", "archived"],
      default: "active",
      index: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },

    color: {
      type: String,
      enum: ["purple", "blue", "cyan", "emerald", "amber", "rose"],
      default: "purple"
    },
    tags: { type: [String], default: [] },

    members: {
      type: [
        new Schema(
          {
            userId: { type: String, required: true },
            role: {
              type: String,
              // `editor` is kept as a backward-compatible alias for
              // pre-Phase-7 documents — the permissions layer maps it
              // to `manager` at read time.
              enum: ["owner", "manager", "member", "viewer", "editor"],
              default: "member"
            },
            /**
             * Additive permission grants on top of the role defaults.
             * Free-form so new modules can mint their own permission
             * identifiers without a migration.
             */
            permissions: { type: [String], default: [] },
            /** Audit metadata. */
            addedBy: { type: String, default: null },
            invitedAt: { type: Date, default: () => new Date() }
          },
          { _id: false }
        )
      ],
      default: []
    },

    /**
     * Reserved for Phase 3 (Marketplace). Kept on the model so listings
     * can be enabled per-project without a follow-up migration.
     *
     * Phase 4 wires the seller marketplace product back into the project
     * via `productId` so we can display a "Listed in marketplace" badge
     * and a "View listing" CTA in the project workspace.
     */
    marketplace: {
      visibility: {
        type: String,
        enum: ["private", "unlisted", "public"],
        default: "private"
      },
      listed: { type: Boolean, default: false },
      price: { type: Number, default: 0, min: 0 },
      productId: { type: String, default: null }
    },

    metadata: { type: Schema.Types.Mixed, default: {} },

    lastActivityAt: { type: Date, default: () => new Date() }
  },
  { timestamps: true, collection: "projects" }
);

// One slug per owner. Different owners may reuse the same slug.
ProjectSchema.index({ ownerId: 1, slug: 1 }, { unique: true });
ProjectSchema.index({ ownerId: 1, updatedAt: -1 });
// The default project list sort is `lastActivityAt: -1`. Without this
// compound index the query falls back to an in-memory sort, which gets
// expensive once a workspace has thousands of projects.
ProjectSchema.index({ ownerId: 1, lastActivityAt: -1 });

export type Project = InferSchemaType<typeof ProjectSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ProjectModel: Model<Project> =
  (mongoose.models.Project as Model<Project>) ||
  mongoose.model<Project>("Project", ProjectSchema);
