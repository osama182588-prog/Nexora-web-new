import type { Product } from "@/models/Product";

export const PRODUCT_CATEGORIES = [
  { value: "templates", label: "Templates", icon: "Folder" },
  { value: "components", label: "Components", icon: "Bolt" },
  { value: "plugins", label: "Plugins", icon: "Settings" },
  { value: "icons", label: "Icons", icon: "Tag" },
  { value: "fonts", label: "Fonts", icon: "Edit" },
  { value: "3d", label: "3D Assets", icon: "Sparkles" },
  { value: "ai", label: "AI Tools", icon: "Bolt" },
  { value: "other", label: "Other", icon: "More" }
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]["value"];
export type ProductStatus = "draft" | "published" | "archived";
export type AccentColor =
  | "purple"
  | "blue"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose";

export interface ProductDTO {
  id: string;
  ownerId: string;
  ownerUsername: string;
  ownerName: string;
  ownerAvatar: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  tags: string[];
  price: number;
  currency: "USD" | "EUR" | "SAR";
  coverImage: string;
  gallery: string[];
  accentColor: AccentColor;
  status: ProductStatus;
  featured: boolean;
  ratings: { count: number; sum: number; average: number };
  views: number;
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function serializeProduct(p: Product): ProductDTO {
  return {
    id: String(p._id),
    ownerId: p.ownerId,
    ownerUsername: p.ownerUsername,
    ownerName: p.ownerName ?? "",
    ownerAvatar: p.ownerAvatar ?? "",
    title: p.title,
    slug: p.slug,
    tagline: p.tagline ?? "",
    description: p.description ?? "",
    category: p.category as ProductCategory,
    tags: p.tags ?? [],
    price: p.price ?? 0,
    currency: (p.currency ?? "USD") as ProductDTO["currency"],
    coverImage: p.coverImage ?? "",
    gallery: p.gallery ?? [],
    accentColor: (p.accentColor ?? "purple") as AccentColor,
    status: p.status as ProductStatus,
    featured: !!p.featured,
    ratings: {
      count: p.ratings?.count ?? 0,
      sum: p.ratings?.sum ?? 0,
      average: p.ratings?.average ?? 0
    },
    views: p.views ?? 0,
    metadata: (p.metadata as Record<string, unknown>) ?? {},
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString()
  };
}

/** URL-safe slug. Marketplace slugs must be unique across all sellers. */
export function productSlugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "product"
  );
}

export function formatPrice(amount: number, currency: ProductDTO["currency"]): string {
  if (amount === 0) return "Free";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
