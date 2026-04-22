import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/icons";
import { Rating } from "@/components/ui/Rating";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  ACCENT_GRADIENT,
  ACCENT_HOVER_RING,
  formatPrice,
  type ProductDTO
} from "@/lib/marketplace";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: ProductDTO;
  onPreview?: (product: ProductDTO) => void;
  className?: string;
  priority?: boolean;
}

export function ProductCard({
  product,
  onPreview,
  className,
  priority = false
}: ProductCardProps) {
  const hasCover = !!product.coverImage;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1",
        ACCENT_HOVER_RING[product.accentColor],
        className
      )}
    >
      {/* Cover */}
      <Link
        href={`/marketplace/${product.slug}`}
        className="relative block aspect-[16/10] overflow-hidden"
        aria-label={`Open ${product.title}`}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            ACCENT_GRADIENT[product.accentColor]
          )}
        />
        {hasCover ? (
          <Image
            src={product.coverImage}
            alt={product.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-slate-700">
            <Icon.Image size={48} />
          </div>
        )}

        {/* Featured ribbon */}
        {product.featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30 backdrop-blur">
            <Icon.Sparkles size={10} />
            Featured
          </span>
        )}

        {/* Hover overlay revealing extra info */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 text-xs text-slate-200 transition-transform duration-300 group-hover:pointer-events-auto group-hover:translate-y-0">
          <p className="line-clamp-2 leading-relaxed">
            {product.tagline || product.description.slice(0, 120) || "—"}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-slate-300">
              <Icon.Eye size={12} />
              {product.views.toLocaleString()}
            </span>
            {onPreview && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onPreview(product);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white backdrop-blur transition hover:bg-white/20"
              >
                <Icon.Eye size={11} />
                Quick look
              </button>
            )}
          </div>
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/marketplace/${product.slug}`}
            className="min-w-0 flex-1"
          >
            <h3 className="truncate font-display text-base font-semibold text-white transition-colors group-hover:text-neon-purple">
              {product.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">
              {product.tagline || "—"}
            </p>
          </Link>
          <Tooltip content={`Open ${product.title}`}>
            <Link
              href={`/marketplace/${product.slug}`}
              aria-label="Open product"
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <Icon.Arrow size={14} />
            </Link>
          </Tooltip>
        </div>

        <Rating value={product.ratings.average} count={product.ratings.count} />

        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-white/5"
              >
                {tag}
              </span>
            ))}
            {product.tags.length > 3 && (
              <span className="text-[10px] text-slate-500">
                +{product.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3">
          <Link
            href={`/marketplace/u/${product.ownerUsername}`}
            className="flex min-w-0 items-center gap-2 text-xs text-slate-400 transition hover:text-white"
          >
            <SellerAvatar avatar={product.ownerAvatar} name={product.ownerName} />
            <span className="truncate">{product.ownerName || product.ownerUsername}</span>
          </Link>
          <span className="font-display text-sm font-semibold text-white">
            {formatPrice(product.price, product.currency)}
          </span>
        </div>
      </div>
    </article>
  );
}

function SellerAvatar({ avatar, name }: { avatar: string; name: string }) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name}
        width={20}
        height={20}
        unoptimized
        className="h-5 w-5 rounded-full ring-1 ring-white/10"
      />
    );
  }
  const initial = (name || "S").charAt(0).toUpperCase();
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full bg-neon-gradient text-[9px] font-semibold text-white ring-1 ring-white/10">
      {initial}
    </span>
  );
}
