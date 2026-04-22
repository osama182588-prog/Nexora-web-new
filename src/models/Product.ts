import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Product listing in the Marketplace.
 *
 * Linked to the seller via `ownerId` (mirrors Project ownership). The
 * `ratings` aggregate is denormalised so we don't need a join on every
 * card render; full review documents can be added in a later phase.
 *
 * `metadata` is intentionally free-form so feature areas can stash
 * data (downloads count, license types, demo URLs...) without a
 * schema migration.
 */
const ProductSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    ownerUsername: { type: String, required: true, index: true, lowercase: true, trim: true },
    ownerName: { type: String, default: "" },
    ownerAvatar: { type: String, default: "" },

    title: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    tagline: { type: String, default: "", trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 5000 },

    category: {
      type: String,
      enum: ["templates", "components", "plugins", "icons", "fonts", "3d", "ai", "other"],
      default: "other",
      index: true
    },
    tags: { type: [String], default: [] },

    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ["USD", "EUR", "SAR"], default: "USD" },

    coverImage: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    accentColor: {
      type: String,
      enum: ["purple", "blue", "cyan", "emerald", "amber", "rose"],
      default: "purple"
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true
    },
    featured: { type: Boolean, default: false, index: true },

    /** Denormalised aggregate so cards render without a join. */
    ratings: {
      count: { type: Number, default: 0 },
      sum: { type: Number, default: 0 },
      average: { type: Number, default: 0 }
    },
    views: { type: Number, default: 0 },

    metadata: { type: Schema.Types.Mixed, default: {} },

    publishedAt: { type: Date, default: null }
  },
  { timestamps: true, collection: "products" }
);

ProductSchema.index({ status: 1, featured: -1, publishedAt: -1 });
ProductSchema.index({ ownerId: 1, updatedAt: -1 });
ProductSchema.index({ category: 1, status: 1 });

export type Product = InferSchemaType<typeof ProductSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ProductModel: Model<Product> =
  (mongoose.models.Product as Model<Product>) ||
  mongoose.model<Product>("Product", ProductSchema);
