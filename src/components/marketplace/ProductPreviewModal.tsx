"use client";

import Image from "next/image";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Rating } from "@/components/ui/Rating";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons";
import {
  ACCENT_GRADIENT_STRONG,
  formatPrice,
  type ProductDTO
} from "@/lib/marketplace";
import { cn } from "@/lib/utils";

interface ProductPreviewModalProps {
  product: ProductDTO | null;
  onClose: () => void;
}

export function ProductPreviewModal({ product, onClose }: ProductPreviewModalProps) {
  return (
    <Modal
      open={!!product}
      onClose={onClose}
      size="xl"
      ariaLabel={product ? `${product.title} preview` : undefined}
    >
      {product && (
        <div className="grid gap-0 sm:grid-cols-5">
          {/* Cover */}
          <div className="relative aspect-[16/10] overflow-hidden sm:col-span-3 sm:aspect-auto">
            <div
              className={cn("absolute inset-0 bg-gradient-to-br", ACCENT_GRADIENT_STRONG[product.accentColor])}
            />
            {product.coverImage ? (
              <Image
                src={product.coverImage}
                alt={product.title}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-slate-700">
                <Icon.Image size={64} />
              </div>
            )}
            {product.featured && (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30 backdrop-blur">
                <Icon.Sparkles size={10} />
                Featured
              </span>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col gap-4 p-6 sm:col-span-2">
            <div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-neon-purple">
                {product.category}
              </span>
              <h2 className="mt-2 font-display text-2xl font-semibold text-white">
                {product.title}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {product.tagline || product.description.slice(0, 200) || "—"}
              </p>
            </div>

            <Rating value={product.ratings.average} count={product.ratings.count} />

            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.tags.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-white/5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto space-y-3 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/marketplace/u/${product.ownerUsername}`}
                  className="flex min-w-0 items-center gap-2 text-sm text-slate-300 hover:text-white"
                >
                  {product.ownerAvatar ? (
                    <Image
                      src={product.ownerAvatar}
                      alt={product.ownerName}
                      width={24}
                      height={24}
                      unoptimized
                      className="h-6 w-6 rounded-full ring-1 ring-white/10"
                    />
                  ) : (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-neon-gradient text-[10px] font-semibold text-white">
                      {(product.ownerName || "S").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate">
                    {product.ownerName || product.ownerUsername}
                  </span>
                </Link>
                <span className="font-display text-lg font-semibold text-white">
                  {formatPrice(product.price, product.currency)}
                </span>
              </div>
              <Link href={`/marketplace/${product.slug}`} className="block">
                <Button className="w-full">
                  View full page
                  <Icon.Arrow size={14} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
