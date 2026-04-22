import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass flex flex-col items-center justify-center rounded-2xl px-8 py-14 text-center",
        className
      )}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-neon-gradient/10 text-neon-purple shadow-glow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/60 ring-1 ring-white/10">
          {icon}
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-slate-400">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
