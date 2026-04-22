import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Ticket — backing store for the `tickets` module. A ticket can be
 * opened from the website OR from a Discord interaction; either way it
 * lands in this collection and is mirrored back through the bus so the
 * UI updates in realtime.
 */
const TicketSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },

    /** Where the ticket was opened from. */
    source: {
      type: String,
      enum: ["web", "discord"],
      default: "web",
      index: true
    },

    /** Discord identifiers (only set when `source === "discord"`). */
    discordUserId: { type: String, default: null },
    discordChannelId: { type: String, default: null },
    discordMessageId: { type: String, default: null },

    subject: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, default: "", trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: ["bug", "question", "feature", "billing", "other"],
      default: "other"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true
    }
  },
  { timestamps: true, collection: "tickets" }
);

TicketSchema.index({ projectId: 1, status: 1, createdAt: -1 });
TicketSchema.index({ ownerId: 1, createdAt: -1 });

export type Ticket = InferSchemaType<typeof TicketSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const TicketModel: Model<Ticket> =
  (mongoose.models.Ticket as Model<Ticket>) ||
  mongoose.model<Ticket>("Ticket", TicketSchema);
