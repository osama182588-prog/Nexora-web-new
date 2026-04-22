import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * App-specific user profile that augments the canonical `users`
 * collection managed by the NextAuth MongoDB adapter. Phase 2 can
 * extend this with workspace membership, billing, etc.
 */
const UserProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    discordId: { type: String, index: true },
    username: { type: String },
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
    preferences: {
      theme: { type: String, enum: ["dark", "light"], default: "dark" },
      sidebarCollapsed: { type: Boolean, default: false }
    }
  },
  { timestamps: true, collection: "user_profiles" }
);

export type UserProfile = InferSchemaType<typeof UserProfileSchema>;

export const UserProfileModel: Model<UserProfile> =
  (mongoose.models.UserProfile as Model<UserProfile>) ||
  mongoose.model<UserProfile>("UserProfile", UserProfileSchema);
