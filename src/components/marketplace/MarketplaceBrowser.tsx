"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { ProductPreviewModal } from "@/components/marketplace/ProductPreviewModal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/ui/Tooltip";
import { marketplaceApi } from "@/lib/marketplace-api";
import { PRODUCT_CATEGORIES, type ProductDTO } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "recent", label: "Newest" },
  { value: "popular", label: "Most viewed" },
  { value: "rating", label: "Top rated" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" }
];

export function MarketplaceBrowser() {
  const [products, setProducts] = useState<ProductDTO[] | null>(null);
  const [featured, setFeatured] = useState<ProductDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<string>("recent");
  const [preview, setPreview] = useState<ProductDTO | null>(null);

  // Featured load (independent of filters)
  useEffect(() => {
    let cancelled = false;
    marketplaceApi
      .list({ featured: "1", limit: "3" })
      .then((data) => !cancelled && setFeatured(data.products))
      .catch(() => !cancelled && setFeatured([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // Main grid load — re-fetches when category/sort changes for accuracy.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setProducts(null);
    marketplaceApi
      .list({
        sort,
        category: category === "all" ? undefined : category
      })
      .then((data) => !cancelled && setProducts(data.products))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [sort, category]);

  // Client-side text filter for instant feedback.
  const filtered = useMemo(() => {
    if (!products) return null;
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [products, query]);

  return (
    <div className="space-y-10">
      {/* Featured */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Featured"
          title="Hand-picked drops"
          description="A rotating selection of the most loved items in Nexora."
          icon="Sparkles"
        />
        {featured === null ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-sm text-slate-500">
            No featured items right now — check back soon.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                onPreview={setPreview}
                priority={i === 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Filter bar */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Browse"
          title="The marketplace"
          description="Templates, components, plugins, and more — built by the community."
          icon="Cart"
        />

        <div className="glass flex flex-col gap-3 rounded-2xl p-3 shadow-card lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-1.5 ring-1 ring-white/5 transition focus-within:ring-neon-purple/40">
            <Icon.Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search products, tags, descriptions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white"
              >
                <Icon.X size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip content="Sort listings">
              <select
                aria-label="Sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-200 transition focus:border-neon-purple/50 focus:outline-none focus:ring-2 focus:ring-neon-purple/30"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Tooltip>
            <Link
              href="/dashboard/marketplace/new"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-neon-gradient px-4 text-sm font-medium text-white shadow-glow-sm transition hover:brightness-110"
            >
              <Icon.Plus size={16} />
              Sell
            </Link>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <CategoryPill
            label="All"
            active={category === "all"}
            onClick={() => setCategory("all")}
          />
          {PRODUCT_CATEGORIES.map((c) => (
            <CategoryPill
              key={c.value}
              label={c.label}
              active={category === c.value}
              onClick={() => setCategory(c.value)}
            />
          ))}
        </div>
      </section>

      {/* Grid */}
      <section>
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {!products && !error && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        )}

        {filtered && filtered.length === 0 && (
          <EmptyState
            icon={<Icon.Cart />}
            title={
              query
                ? "No matches for your search"
                : "The marketplace is just getting started"
            }
            description={
              query
                ? "Try different keywords or clear your filters."
                : "Be among the first to list a product. Your work could be featured here."
            }
            action={
              <Link href="/dashboard/marketplace/new">
                <Button>
                  <Icon.Plus size={14} />
                  List a product
                </Button>
              </Link>
            }
          />
        )}

        {filtered && filtered.length > 0 && (
          <div
            className={cn(
              "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPreview={setPreview}
              />
            ))}
          </div>
        )}
      </section>

      <ProductPreviewModal product={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function CategoryPill({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "bg-neon-purple/20 text-white ring-1 ring-neon-purple/40 shadow-glow-sm"
          : "bg-white/[0.03] text-slate-400 ring-1 ring-white/5 hover:bg-white/5 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  icon
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: keyof typeof Icon;
}) {
  const Ico = Icon[icon];
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-neon-purple">
          <Ico size={12} />
          {eyebrow}
        </span>
        <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/80">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
