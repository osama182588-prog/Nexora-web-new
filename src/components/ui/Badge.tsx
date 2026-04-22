import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "purple" | "blue";

const variants: Record<Variant, string> = {
  default: "bg-white/5 text-slate-300 border-white/10",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  purple: "bg-neon-purple/10 text-neon-purple border-neon-purple/30",
  blue: "bg-neon-blue/10 text-neon-blue border-neon-blue/30"
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...rest}
    />
  );
}
