import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { ProductModel } from "@/models/Product";
import { ProjectModel } from "@/models/Project";
import { apiError, requireUserId } from "@/lib/api";
import {
  PRODUCT_CATEGORIES,
  productSlugify,
  sanitizeImageUrl,
  sanitizeImageUrls,
  serializeProduct
} from "@/lib/marketplace";
import { publishProductEvent } from "@/lib/services/marketplace.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = PRODUCT_CATEGORIES.map((c) => c.value) as string[];
const ALLOWED_COLOR = ["purple", "blue", "cyan", "emerald", "amber", "rose"] as const;
const ALLOWED_CURRENCY = ["USD", "EUR", "SAR"] as const;

/**
 * GET /api/marketplace/products
 *
 * Public, paginated list of published products with optional `q`, `category`,
 * `tag`, `featured`, `seller`, and `sort` filters. When `mine=1` and the
 * caller is signed in, returns the caller's own products in any status
 * (used by the seller dashboard).
 */
export async function GET(req: NextRequest) {
  await connectToDatabase();

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const category = url.searchParams.get("category");
  const tag = url.searchParams.get("tag");
  const featured = url.searchParams.get("featured");
  const seller = url.searchParams.get("seller");
  const sort = url.searchParams.get("sort") ?? "recent";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 24, 60);
  const mine = url.searchParams.get("mine") === "1";

  const filter: Record<string, unknown> = {};

  if (mine) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiError("You must be signed in.", 401, "unauthorized");
    }
    filter.ownerId = session.user.id;
  } else {
    filter.status = "published";
  }

  if (category && ALLOWED_CATEGORIES.includes(category)) filter.category = category;
  if (featured === "1") filter.featured = true;
  if (seller) filter.ownerUsername = seller.toLowerCase();
  if (tag) filter.tags = tag;

  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    filter.$or = [{ title: rx }, { tagline: rx }, { description: rx }, { tags: rx }];
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    recent: { publishedAt: -1, createdAt: -1 },
    rating: { "ratings.average": -1, "ratings.count": -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    popular: { views: -1 }
  };
  const sortBy = sortMap[sort] ?? sortMap.recent;

  const docs = await ProductModel.find(filter).sort(sortBy).limit(limit).lean<
    import("@/models/Product").Product[]
  >();

  return NextResponse.json({ products: docs.map(serializeProduct) });
}

/** POST /api/marketplace/products — create. */
export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError("Invalid JSON body.");
  }

  const session = await getServerSession(authOptions);
  const username = (
    session?.user?.username ??
    session?.user?.name ??
    auth.userId
  )
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const ownerName = session?.user?.name ?? session?.user?.username ?? "Seller";
  const ownerAvatar = session?.user?.image ?? "";

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return apiError("`title` is required.");
  if (title.length > 100) return apiError("`title` must be 100 characters or fewer.");

  const tagline =
    typeof body.tagline === "string" ? body.tagline.trim().slice(0, 160) : "";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 5000)
      : "";

  const category = ALLOWED_CATEGORIES.includes(body.category as string)
    ? (body.category as string)
    : "other";
  const accentColor = (ALLOWED_COLOR as readonly string[]).includes(
    body.accentColor as string
  )
    ? (body.accentColor as (typeof ALLOWED_COLOR)[number])
    : "purple";
  const currency = (ALLOWED_CURRENCY as readonly string[]).includes(
    body.currency as string
  )
    ? (body.currency as (typeof ALLOWED_CURRENCY)[number])
    : "USD";

  const price =
    typeof body.price === "number" && Number.isFinite(body.price)
      ? Math.max(0, Math.min(100000, body.price))
      : 0;

  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().slice(0, 24))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const status = ["draft", "published"].includes(body.status as string)
    ? (body.status as "draft" | "published")
    : "draft";

  const coverImage = sanitizeImageUrl(body.coverImage);
  const gallery = sanitizeImageUrls(body.gallery, 6);

  await connectToDatabase();

  // Optional source-project link. Verified to belong to the caller.
  let projectId: string | null = null;
  const rawProjectId = body.projectId;
  if (
    typeof rawProjectId === "string" &&
    mongoose.Types.ObjectId.isValid(rawProjectId)
  ) {
    const owned = await ProjectModel.exists({
      _id: rawProjectId,
      ownerId: auth.userId
    });
    if (owned) projectId = rawProjectId;
  }

  // Generate a globally-unique slug.
  const baseSlug = productSlugify(title);
  let slug = baseSlug;
  let attempt = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await ProductModel.exists({ slug })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
    if (attempt > 50) return apiError("Could not generate a unique slug.", 409, "conflict");
  }

  const product = await ProductModel.create({
    ownerId: auth.userId,
    ownerUsername: username,
    ownerName,
    ownerAvatar,
    title,
    slug,
    tagline,
    description,
    category,
    tags,
    price,
    currency,
    accentColor,
    coverImage,
    gallery,
    status,
    projectId,
    publishedAt: status === "published" ? new Date() : null
  });

  // Mirror state into the source project so dashboards show the link.
  if (projectId) {
    await ProjectModel.updateOne(
      { _id: projectId, ownerId: auth.userId },
      {
        $set: {
          "marketplace.listed": status === "published",
          "marketplace.visibility": status === "published" ? "public" : "unlisted",
          "marketplace.price": price,
          "marketplace.productId": String(product._id),
          lastActivityAt: new Date()
        }
      }
    ).catch((err) =>
      console.warn("[marketplace] failed to sync project state", err)
    );
  }

  publishProductEvent({
    type: status === "published" ? "product.published" : "product.created",
    ownerId: auth.userId,
    product
  });

  return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
}
