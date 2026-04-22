import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * AuditLog — the canonical event log for the entire Nexora platform.
 *
 * Every meaningful action (a user mutation, a project change, a Discord
 * interaction, a system heartbeat, …) is appended here exactly once.
 *
 * Design notes:
 *
 * - **No enum lock-in on `type`.** Modules and future subsystems must
 *   be free to mint their own event identifiers without a migration.
 *   We classify with two coarse axes — `level` and `category` — that
 *   the UI can render with consistent colors, and keep the fine-grained
 *   `type` as a free-form string ("project.updated", "module.enabled",
 *   "external.discord.interaction", "auth.login", …).
 *
 * - **Cursor-friendly indexes.** Listing logs is the hot path; we
 *   compound-index every common filter alongside `{ createdAt: -1, _id: -1 }`
 *   so cursor pagination is O(log n) regardless of collection size.
 *
 * - **TTL is opt-in.** A capped collection or TTL index can be enabled
 *   by setting `LOGS_RETENTION_DAYS` — the model creates the index
 *   automatically when the env var is present so old logs don't bloat
 *   the cluster.
 */

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_CATEGORIES = [
  "auth",
  "project",
  "member",
  "module",
  "marketplace",
  "ticket",
  "external",
  "system"
] as const;
export type LogCategory = (typeof LOG_CATEGORIES)[number];

const AuditLogSchema = new Schema(
  {
    /** Workspace owner this log belongs to (used for permission scoping). */
    ownerId: { type: String, required: true, index: true },

    /** Who performed the action (may equal ownerId for self-mutations). */
    actorId: { type: String, default: null, index: true },

    /** The resource the event concerns, when applicable. */
    projectId: { type: String, default: null, index: true },
    resourceId: { type: String, default: null },

    /** Severity. UI uses this for color + icon. */
    level: {
      type: String,
      enum: LOG_LEVELS,
      default: "info",
      index: true
    },
    /** Coarse category used by the filter bar. */
    category: {
      type: String,
      enum: LOG_CATEGORIES,
      default: "system",
      index: true
    },
    /** Fine-grained event identifier, e.g. "project.updated". Free-form. */
    type: { type: String, required: true, index: true },

    /** Human-readable one-liner. Indexed-friendly text for search. */
    message: { type: String, required: true, maxlength: 500 },

    /** Arbitrary structured payload — kept Mixed so anything serialisable fits. */
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_logs"
  }
);

/* Pagination + filter indexes — order matters (most selective first). */
AuditLogSchema.index({ ownerId: 1, createdAt: -1, _id: -1 });
AuditLogSchema.index({ ownerId: 1, projectId: 1, createdAt: -1 });
AuditLogSchema.index({ ownerId: 1, category: 1, createdAt: -1 });
AuditLogSchema.index({ ownerId: 1, level: 1, createdAt: -1 });
AuditLogSchema.index({ ownerId: 1, type: 1, createdAt: -1 });

/* Optional TTL: drop logs older than LOGS_RETENTION_DAYS. */
const retentionDaysRaw = process.env.LOGS_RETENTION_DAYS;
const retentionDays = retentionDaysRaw ? Number(retentionDaysRaw) : NaN;
if (Number.isFinite(retentionDays) && retentionDays > 0) {
  AuditLogSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: Math.floor(retentionDays * 86_400) }
  );
}

export type AuditLog = InferSchemaType<typeof AuditLogSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const AuditLogModel: Model<AuditLog> =
  (mongoose.models.AuditLog as Model<AuditLog>) ||
  mongoose.model<AuditLog>("AuditLog", AuditLogSchema);
