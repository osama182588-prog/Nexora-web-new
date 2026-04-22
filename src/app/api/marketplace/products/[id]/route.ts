import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { ProductModel } from "@/models/Product";
import { ProjectModel } from "@/models/Project";
import { apiError, requireUserId } from "@/lib/api";
import {
  PRODUCT_CATEGORIES,
  sanitizeImageUrl,
  sanitizeImageUrls,
  serializeProduct
} from "@/lib/marketplace";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = PRODUCT_CATEGORIES.map((c) => c.value) as string[];
const ALLOWED_COLOR = ["purple", "blue", "cyan", "emerald", "amber", "rose"] as const;
const ALLOWED_CURRENCY = ["USD", "EUR", "SAR"] as const;
const ALLOWED_STATUS = ["draft", "published", "archived"] as const;

interface Ctx {
  params: Promise<{ id: string }>;
}

async function loadOwned(userId: string, id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return ProductModel.findOne({ _id: id, ownerId: userId });
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  await connectToDatabase();
  const product = await loadOwned(auth.userId, id);
  if (!product) return apiError("Product not found.", 404, "not_found");
  return NextResponse.json({ product: serializeProduct(product) });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError("Invalid JSON body.");
  }

  await connectToDatabase();
  const product = await loadOwned(auth.userId, id);
  if (!product) return apiError("Product not found.", 404, "not_found");

  const previousStatus = product.status;

  if (typeof body.title === "string") {
    const next = body.title.trim().slice(0, 100);
    if (next) product.title = next;
  }
  if (typeof body.tagline === "string") {
    product.tagline = body.tagline.trim().slice(0, 160);
  }
  if (typeof body.description === "string") {
    product.description = body.description.trim().slice(0, 5000);
  }
  if (
    typeof body.category === "string" &&
    ALLOWED_CATEGORIES.includes(body.category)
  ) {
    product.category = body.category as (typeof PRODUCT_CATEGORIES)[number]["value"];
  }
  if (
    typeof body.accentColor === "string" &&
    (ALLOWED_COLOR as readonly string[]).includes(body.accentColor)
  ) {
    product.accentColor = body.accentColor as (typeof ALLOWED_COLOR)[number];
  }
  if (
    typeof body.currency === "string" &&
    (ALLOWED_CURRENCY as readonly string[]).includes(body.currency)
  ) {
    product.currency = body.currency as (typeof ALLOWED_CURRENCY)[number];
  }
  if (typeof body.price === "number" && Number.isFinite(body.price)) {
    product.price = Math.max(0, Math.min(100000, body.price));
  }
  if (typeof body.coverImage === "string") {
    product.coverImage = sanitizeImageUrl(body.coverImage);
  }
  if (Array.isArray(body.gallery)) {
    product.gallery = sanitizeImageUrls(body.gallery, 6);
  }
  if (Array.isArray(body.tags)) {
    product.tags = (body.tags as unknown[])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim().slice(0, 24))
      .filter(Boolean)
      .slice(0, 12);
  }
  if (
    typeof body.status === "string" &&
    (ALLOWED_STATUS as readonly string[]).includes(body.status)
  ) {
    product.status = body.status as (typeof ALLOWED_STATUS)[number];
    if (product.status === "published" && !product.publishedAt) {
      product.publishedAt = new Date();
    }
  }

  await product.save();

  // Keep the source project's marketplace state in sync.
  const productAny = product as unknown as { projectId?: string | null };
  if (productAny.projectId) {
    await ProjectModel.updateOne(
      { _id: productAny.projectId, ownerId: auth.userId },
      {
        $set: {
          "marketplace.listed": product.status === "published",
          "marketplace.visibility":
            product.status === "published" ? "public" : "unlisted",
          "marketplace.price": product.price,
          "marketplace.productId": String(product._id),
          lastActivityAt: new Date()
        }
      }
    ).catch((err) =>
      console.warn("[marketplace] failed to sync project state", err)
    );
  }

  return NextResponse.json({
    product: serializeProduct(product),
    previousStatus
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { id } = await ctx.params;

  await connectToDatabase();
  const product = await loadOwned(auth.userId, id);
  if (!product) return apiError("Product not found.", 404, "not_found");

  const linkedProjectId = (
    product as unknown as { projectId?: string | null }
  ).projectId;

  await product.deleteOne();

  if (linkedProjectId) {
    await ProjectModel.updateOne(
      { _id: linkedProjectId, ownerId: auth.userId },
      {
        $set: {
          "marketplace.listed": false,
          "marketplace.visibility": "private",
          "marketplace.productId": null
        }
      }
    ).catch((err) =>
      console.warn("[marketplace] failed to clear project link", err)
    );
  }

  return NextResponse.json({ ok: true });
}
