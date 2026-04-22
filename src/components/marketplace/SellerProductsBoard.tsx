"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { Rating } from "@/components/ui/Rating";
import { Button } from "@/components/ui/Button";
import { marketplaceApi } from "@/lib/marketplace-api";
import { formatPrice, type ProductDTO } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

const productStatusStyles = {
  draft: {
    dot: "bg-slate-400",
    text: "text-slate-300",
    ring: "ring-slate-400/30",
    label: "Draft"
  },
  published: {
    dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]",
    text: "text-emerald-300",
    ring: "ring-emerald-400/30",
    label: "Published"
  },
  archived: {
    dot: "bg-slate-500",
    text: "text-slate-400",
    ring: "ring-slate-500/30",
    label: "Archived"
  }
} as const;

function ProductStatusBadge({
  status
}: {
  status: "draft" | "published" | "archived";
}) {
  const s = productStatusStyles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium ring-1",
        s.ring,
        s.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

type StatusFilter = "all" | "draft" | "published" | "archived";

export function SellerProductsBoard() {
  const [items, setItems] = useState<ProductDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ProductDTO | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const load = () => {
    setItems(null);
    setError(null);
    marketplaceApi
      .list({ mine: "1" })
      .then((d) => setItems(d.products))
      .catch((e: Error) => setError(e.message));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, query, status]);

  const togglePublish = async (p: ProductDTO) => {
    setBusy(p.id);
    try {
      const next = p.status === "published" ? "draft" : "published";
      const { product } = await marketplaceApi.update(p.id, { status: next });
      setItems((cur) =>
        cur ? cur.map((it) => (it.id === product.id ? product : it)) : cur
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update product.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!confirm) return;
    setBusy(confirm.id);
    try {
      await marketplaceApi.remove(confirm.id);
      setItems((cur) => (cur ? cur.filter((it) => it.id !== confirm.id) : cur));
      setConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete product.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="glass flex flex-col gap-3 rounded-2xl p-3 shadow-card md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-1.5 ring-1 ring-white/5 transition focus-within:ring-neon-purple/40">
          <Icon.Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your products..."
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
        <div className="flex items-center gap-2">
          {(["all", "published", "draft", "archived"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs capitalize transition",
                status === s
                  ? "bg-neon-purple/20 text-white ring-1 ring-neon-purple/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Body */}
      {!items && !error && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <EmptyState
          icon={<Icon.Cart />}
          title={
            query || status !== "all"
              ? "No products match your filters"
              : "You haven't listed any products yet"
          }
          description={
            query || status !== "all"
              ? "Try clearing search or status filters."
              : "Start selling — create your first listing in seconds."
          }
          action={
            <Link href="/dashboard/marketplace/new">
              <Button>
                <Icon.Plus size={14} />
                Create product
              </Button>
            </Link>
          }
        />
      )}

      {filtered && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <li
              key={p.id}
              className={cn(
                "group flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-card/80 p-3 backdrop-blur transition-all duration-300 hover:border-neon-purple/30 hover:shadow-glow-sm sm:flex-row sm:items-center",
                busy === p.id && "opacity-60"
              )}
            >
              {/* Thumb */}
              <Link
                href={`/dashboard/marketplace/${p.id}/edit`}
                className="relative h-20 w-full overflow-hidden rounded-xl bg-white/[0.04] sm:w-32"
              >
                {p.coverImage ? (
                  <Image
                    src={p.coverImage}
                    alt={p.title}
                    fill
                    unoptimized
                    sizes="128px"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-slate-700">
                    <Icon.Image size={28} />
                  </div>
                )}
              </Link>

              {/* Body */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/marketplace/${p.id}/edit`}
                    className="truncate text-sm font-semibold text-white hover:text-neon-purple"
                  >
                    {p.title}
                  </Link>
                  <ProductStatusBadge status={p.status} />
                  {p.featured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                      <Icon.Sparkles size={9} />
                      Featured
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                  {p.tagline || "No tagline"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Icon.Tag size={11} /> {p.category}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon.Eye size={11} /> {p.views.toLocaleString()}
                  </span>
                  <Rating
                    value={p.ratings.average}
                    count={p.ratings.count}
                    size={11}
                    showCount
                  />
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                <span className="font-display text-sm font-semibold text-white">
                  {formatPrice(p.price, p.currency)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {p.status === "published" && (
                  <Tooltip content="View on marketplace">
                    <Link
                      href={`/marketplace/${p.slug}`}
                      target="_blank"
                      aria-label="View public page"
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
                    >
                      <Icon.Eye size={14} />
                    </Link>
                  </Tooltip>
                )}
                <Tooltip content="Edit product">
                  <Link
                    href={`/dashboard/marketplace/${p.id}/edit`}
                    aria-label="Edit"
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <Icon.Edit size={14} />
                  </Link>
                </Tooltip>
                <ContextMenu
                  trigger={({ open, onClick }) => (
                    <button
                      type="button"
                      aria-label="More actions"
                      onClick={onClick}
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white",
                        open && "bg-white/5 text-white"
                      )}
                    >
                      <Icon.More size={14} />
                    </button>
                  )}
                  items={[
                    {
                      label:
                        p.status === "published" ? "Unpublish" : "Publish",
                      icon:
                        p.status === "published" ? (
                          <Icon.Pause size={14} />
                        ) : (
                          <Icon.Play size={14} />
                        ),
                      onSelect: () => void togglePublish(p)
                    },
                    {
                      label: "Edit",
                      icon: <Icon.Edit size={14} />,
                      onSelect: () => {
                        window.location.href = `/dashboard/marketplace/${p.id}/edit`;
                      }
                    },
                    {
                      label: "Copy public URL",
                      icon: <Icon.Copy size={14} />,
                      disabled: p.status !== "published",
                      onSelect: () =>
                        navigator.clipboard?.writeText(
                          `${window.location.origin}/marketplace/${p.slug}`
                        )
                    },
                    {
                      label: "Delete",
                      icon: <Icon.Trash size={14} />,
                      destructive: true,
                      onSelect: () => setConfirm(p)
                    }
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Delete product?"
        description={
          confirm
            ? `"${confirm.title}" will be permanently removed from the marketplace.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </div>
  );
}
