import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  count?: number;
  size?: number;
  showCount?: boolean;
  className?: string;
}

/**
 * Display-only star rating. Always renders 5 stars with a half-star at
 * the boundary. Interactive review submission lives in a later phase.
 */
export function Rating({
  value,
  count,
  size = 14,
  showCount = true,
  className
}: RatingProps) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-flex">
        <span className="inline-flex text-slate-700">
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon.Star key={i} size={size} />
          ))}
        </span>
        <span
          className="pointer-events-none absolute inset-0 inline-flex overflow-hidden text-amber-300"
          style={{ width: `${(v / 5) * 100}%` }}
          aria-hidden
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon.StarFilled key={i} size={size} />
          ))}
        </span>
      </span>
      {showCount && (
        <span className="text-xs text-slate-400">
          {v > 0 ? v.toFixed(1) : "—"}
          {typeof count === "number" && (
            <span className="text-slate-500"> ({count})</span>
          )}
        </span>
      )}
    </span>
  );
}
