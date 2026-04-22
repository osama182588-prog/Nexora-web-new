"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  const current = images[active];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/5 bg-card/60">
        <Image
          src={current}
          alt={`${title} screenshot ${active + 1}`}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {images.map((img, idx) => (
          <button
            key={img + idx}
            type="button"
            onClick={() => setActive(idx)}
            aria-label={`Show screenshot ${idx + 1}`}
            aria-pressed={active === idx}
            className={cn(
              "relative h-16 w-24 overflow-hidden rounded-lg border transition-all duration-200",
              active === idx
                ? "border-neon-purple/60 shadow-glow-sm"
                : "border-white/5 hover:border-white/20"
            )}
          >
            <Image
              src={img}
              alt={`${title} thumbnail ${idx + 1}`}
              fill
              unoptimized
              sizes="96px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
