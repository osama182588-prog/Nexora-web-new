import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Activity entry. Powers the dashboard activity feed and per-project
 * timelines. Kept generic so any feature area can append to it.
 */
const ActivitySchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    projectId: { type: String, default: null, index: true },
    type: {
      type: String,
      enum: [
        "project.created",
        "project.updated",
        "project.deleted",
        "project.status_changed",
        "project.progress_updated",
        "system"
      ],
      required: true
    },
    message: { type: String, required: true, maxlength: 280 },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "activities" }
);

ActivitySchema.index({ ownerId: 1, createdAt: -1 });

export type Activity = InferSchemaType<typeof ActivitySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const ActivityModel: Model<Activity> =
  (mongoose.models.Activity as Model<Activity>) ||
  mongoose.model<Activity>("Activity", ActivitySchema);
