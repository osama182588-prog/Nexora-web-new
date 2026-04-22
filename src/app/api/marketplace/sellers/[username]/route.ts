import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ProductModel } from "@/models/Product";
import { apiError } from "@/lib/api";
import { serializeProduct } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ username: string }>;
}

/**
 * GET /api/marketplace/sellers/[username]
 *
 * Public seller profile + their published products + aggregate stats.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { username } = await ctx.params;
  await connectToDatabase();

  const docs = await ProductModel.find({
    ownerUsername: username.toLowerCase(),
    status: "published"
  })
    .sort({ publishedAt: -1 })
    .lean<import("@/models/Product").Product[]>();

  if (docs.length === 0) {
    return apiError("Seller not found.", 404, "not_found");
  }

  const products = docs.map(serializeProduct);
  const totalViews = products.reduce((acc, p) => acc + p.views, 0);
  const totalProducts = products.length;
  const totalRatings = products.reduce((acc, p) => acc + p.ratings.count, 0);
  const sumRatings = products.reduce((acc, p) => acc + p.ratings.sum, 0);
  const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

  const seller = {
    username: products[0].ownerUsername,
    name: products[0].ownerName,
    avatar: products[0].ownerAvatar,
    stats: {
      totalProducts,
      totalViews,
      totalRatings,
      averageRating: Math.round(avgRating * 10) / 10
    }
  };

  return NextResponse.json({ seller, products });
}
