import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ProductModel } from "@/models/Product";
import { apiError } from "@/lib/api";
import { serializeProduct } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/marketplace/products/by-slug/[slug]
 *
 * Public route — returns a single published product plus a small list
 * of related published products from the same seller.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  await connectToDatabase();

  const product = await ProductModel.findOne({
    slug: slug.toLowerCase(),
    status: "published"
  });
  if (!product) return apiError("Product not found.", 404, "not_found");

  // Fire-and-forget view counter; failures here must not break the read.
  ProductModel.updateOne({ _id: product._id }, { $inc: { views: 1 } }).catch(
    () => undefined
  );

  const related = await ProductModel.find({
    ownerId: product.ownerId,
    status: "published",
    _id: { $ne: product._id }
  })
    .sort({ publishedAt: -1 })
    .limit(3)
    .lean<import("@/models/Product").Product[]>();

  return NextResponse.json({
    product: serializeProduct(product),
    related: related.map(serializeProduct)
  });
}
