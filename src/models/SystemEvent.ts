import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * SystemEvent — the unified audit log of the internal event bus.
 *
 * Every event published through `src/lib/system/bus.ts` is recorded here
 * by the in-process operator. This collection is the durable backbone of
 * the unified system: any subsystem (UI, marketplace, the future external
 * executor) can replay or query events from MongoDB without going through
 * a REST API.
 */
const SystemEventSchema = new Schema(
  {
    /** Globally-unique event id (UUID). */
    eventId: { type: String, required: true, unique: true, index: true },
    /** Topic, e.g. `project.created`, `product.published`. */
    type: { type: String, required: true, index: true },
    /** The user that owns the resource the event is about. */
    actorId: { type: String, required: true, index: true },
    /** Optional resource id this event refers to (project / product / ...). */
    resourceId: { type: String, default: null, index: true },
    /** Free-form payload — already-sanitised, safe to broadcast. */
    payload: { type: Schema.Types.Mixed, default: {} },
    /**
     * Lifecycle of the event as it flows through the internal operator.
     *  - pending: just published
     *  - processed: the operator handled it (and any future subscribers ran)
     *  - failed: a subscriber threw — payload is preserved for replay
     */
    status: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending",
      index: true
    },
    error: { type: String, default: null }
  },
  { timestamps: true, collection: "system_events" }
);

SystemEventSchema.index({ actorId: 1, createdAt: -1 });

export type SystemEvent = InferSchemaType<typeof SystemEventSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SystemEventModel: Model<SystemEvent> =
  (mongoose.models.SystemEvent as Model<SystemEvent>) ||
  mongoose.model<SystemEvent>("SystemEvent", SystemEventSchema);
