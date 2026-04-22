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
              enum: ["owner", "editor", "viewer"],
              default: "editor"
            }
          },
          { _id: false }
        )
      ],
      default: []
    },

    /**
     * Reserved for Phase 3 (Marketplace). Kept on the model so listings
     * can be enabled per-project without a follow-up migration.
     */
    marketplace: {
      visibility: {
        type: String,
        enum: ["private", "unlisted", "public"],
        default: "private"
      },
      listed: { type: Boolean, default: false },
      price: { type: Number, default: 0, min: 0 }
    },

    metadata: { type: Schema.Types.Mixed, default: {} },

    lastActivityAt: { type: Date, default: () => new Date() }
  },
  { timestamps: true, collection: "projects" }
);

// One slug per owner. Different owners may reuse the same slug.
ProjectSchema.index({ ownerId: 1, slug: 1 }, { unique: true });
ProjectSchema.index({ ownerId: 1, updatedAt: -1 });

export type Project = InferSchemaType<typeof ProjectSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ProjectModel: Model<Project> =
  (mongoose.models.Project as Model<Project>) ||
  mongoose.model<Project>("Project", ProjectSchema);
