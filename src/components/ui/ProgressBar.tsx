"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Color = "purple" | "blue" | "cyan" | "emerald" | "amber" | "rose";

const trackColor: Record<Color, string> = {
  purple: "from-neon-purple/40 to-neon-purple",
  blue: "from-neon-blue/40 to-neon-blue",
  cyan: "from-neon-cyan/40 to-neon-cyan",
  emerald: "from-emerald-500/40 to-emerald-400",
  amber: "from-amber-500/40 to-amber-400",
  rose: "from-rose-500/40 to-rose-400"
};

interface ProgressBarProps {
  value: number;
  color?: Color;
  size?: "sm" | "md";
  showValue?: boolean;
  animate?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  color = "purple",
  size = "md",
  showValue = false,
  animate = true,
  className
}: ProgressBarProps) {
  const safe = Math.max(0, Math.min(100, value));
  const [width, setWidth] = useState(animate ? 0 : safe);

  useEffect(() => {
    if (!animate) {
      setWidth(safe);
      return;
    }
    const id = window.setTimeout(() => setWidth(safe), 60);
    return () => window.clearTimeout(id);
  }, [safe, animate]);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/5",
          size === "sm" ? "h-1.5" : "h-2"
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safe}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r shadow-glow-sm transition-[width] duration-700 ease-out",
            trackColor[color]
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      {showValue && (
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
          <span>Progress</span>
          <span className="font-medium text-slate-200">{safe}%</span>
        </div>
      )}
    </div>
  );
}
