import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { connectToDatabase } from "@/lib/mongoose";
import { ProductModel } from "@/models/Product";
import { serializeProduct, formatPrice, type ProductDTO } from "@/lib/marketplace";
import { Icon } from "@/components/icons";
import { Rating } from "@/components/ui/Rating";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { ProductGallery } from "@/components/marketplace/ProductGallery";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const accent: Record<ProductDTO["accentColor"], string> = {
  purple: "from-neon-purple/40 via-neon-purple/10 to-transparent",
  blue: "from-neon-blue/40 via-neon-blue/10 to-transparent",
  cyan: "from-neon-cyan/40 via-neon-cyan/10 to-transparent",
  emerald: "from-emerald-400/40 via-emerald-400/10 to-transparent",
  amber: "from-amber-400/40 via-amber-400/10 to-transparent",
  rose: "from-rose-400/40 via-rose-400/10 to-transparent"
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  await connectToDatabase();
  const doc = await ProductModel.findOne({
    slug: slug.toLowerCase(),
    status: "published"
  }).lean<import("@/models/Product").Product | null>();
  if (!doc) return { title: "Product not found · Nexora" };
  return {
    title: `${doc.title} · Nexora Marketplace`,
    description: doc.tagline || doc.description.slice(0, 160)
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  await connectToDatabase();

  const doc = await ProductModel.findOne({
    slug: slug.toLowerCase(),
    status: "published"
  });
  if (!doc) notFound();

  // Increment view counter (best-effort).
  ProductModel.updateOne({ _id: doc._id }, { $inc: { views: 1 } }).catch(
    () => undefined
  );

  const product = serializeProduct(doc);

  const relatedDocs = await ProductModel.find({
    ownerId: product.ownerId,
    status: "published",
    _id: { $ne: doc._id }
  })
    .sort({ publishedAt: -1 })
    .limit(3)
    .lean<import("@/models/Product").Product[]>();
  const related = relatedDocs.map(serializeProduct);

  return (
    <main className="relative min-h-screen pb-24">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-neon-gradient shadow-glow-sm">
              <Icon.Logo size={18} />
            </span>
            <span className="font-display text-lg font-semibold text-white">
              {siteConfig.name}
            </span>
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <Icon.Chevron size={14} className="rotate-180" />
            Marketplace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/marketplace" className="hover:text-white">
            Marketplace
          </Link>
          <span>/</span>
          <Link
            href={`/marketplace?category=${product.category}`}
            className="hover:text-white"
          >
            {product.category}
          </Link>
          <span>/</span>
          <span className="truncate text-slate-300">{product.title}</span>
        </nav>

        {/* Hero */}
        <section className="mt-6 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div
              className={cn(
                "relative aspect-[16/10] overflow-hidden rounded-3xl border border-white/5"
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  accent[product.accentColor]
                )}
              />
              {product.coverImage ? (
                <Image
                  src={product.coverImage}
                  alt={product.title}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 60vw"
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-slate-700">
                  <Icon.Image size={64} />
                </div>
              )}
              {product.featured && (
                <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30 backdrop-blur">
                  <Icon.Sparkles size={12} />
                  Featured
                </span>
              )}
            </div>

            {product.gallery.length > 0 && (
              <div className="mt-4">
                <ProductGallery images={product.gallery} title={product.title} />
              </div>
            )}
          </div>

          <aside className="lg:col-span-2">
            <div className="sticky top-24 space-y-5 rounded-3xl border border-white/5 bg-card/80 p-6 backdrop-blur">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-neon-purple">
                  {product.category}
                </span>
                <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-white">
                  {product.title}
                </h1>
                {product.tagline && (
                  <p className="mt-2 text-sm text-slate-400">{product.tagline}</p>
                )}
              </div>

              <Rating value={product.ratings.average} count={product.ratings.count} />

              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl font-semibold text-white">
                  {formatPrice(product.price, product.currency)}
                </span>
                {product.price > 0 && (
                  <span className="text-xs text-slate-500">one-time</span>
                )}
              </div>

              <div className="space-y-2">
                <Button className="w-full" size="lg">
                  <Icon.Cart size={16} />
                  {product.price === 0 ? "Get for free" : "Buy now"}
                </Button>
                <p className="text-center text-[10px] text-slate-500">
                  Checkout is coming soon · Phase 4
                </p>
              </div>

              <div className="border-t border-white/5 pt-4">
                <Link
                  href={`/marketplace/u/${product.ownerUsername}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-neon-purple/30 hover:bg-white/[0.04]"
                >
                  {product.ownerAvatar ? (
                    <Image
                      src={product.ownerAvatar}
                      alt={product.ownerName}
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 rounded-full ring-1 ring-white/10"
                    />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-neon-gradient text-sm font-semibold text-white">
                      {(product.ownerName || "S").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-slate-500">Sold by</p>
                    <p className="truncate text-sm font-medium text-white">
                      {product.ownerName || product.ownerUsername}
                    </p>
                  </div>
                  <Icon.Arrow
                    size={14}
                    className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                  />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
                <Stat
                  icon="Eye"
                  label="Views"
                  value={product.views.toLocaleString()}
                />
                <Stat
                  icon="Star"
                  label="Rating"
                  value={
                    product.ratings.count > 0
                      ? product.ratings.average.toFixed(1)
                      : "—"
                  }
                />
                <Stat
                  icon="Tag"
                  label="Tags"
                  value={String(product.tags.length)}
                />
              </div>
            </div>
          </aside>
        </section>

        {/* Description + tags */}
        <section className="mt-12 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h2 className="font-display text-xl font-semibold text-white">
              About this product
            </h2>
            {product.description ? (
              <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {product.description}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                The seller hasn&apos;t added a detailed description yet.
              </p>
            )}

            {product.tags.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Tags
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-xs text-slate-300 ring-1 ring-white/5"
                    >
                      <Icon.Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-semibold text-white">
              More from this seller
            </h2>
            {related.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                This is their only published product so far.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value
}: {
  icon: keyof typeof Icon;
  label: string;
  value: string;
}) {
  const Ico = Icon[icon];
  return (
    <div className="rounded-xl bg-white/[0.02] p-2 ring-1 ring-white/5">
      <Ico size={14} className="mx-auto text-slate-400" />
      <p className="mt-1 font-display text-sm font-semibold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
