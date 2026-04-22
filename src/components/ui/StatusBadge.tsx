import { cn } from "@/lib/utils";

export type Status = "active" | "paused" | "completed" | "archived";

const statusStyles: Record<
  Status,
  { dot: string; text: string; ring: string; label: string }
> = {
  active: {
    dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]",
    text: "text-emerald-300",
    ring: "ring-emerald-400/30",
    label: "Active"
  },
  paused: {
    dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)]",
    text: "text-amber-300",
    ring: "ring-amber-400/30",
    label: "Paused"
  },
  completed: {
    dot: "bg-neon-blue shadow-[0_0_10px_rgba(59,130,246,0.55)]",
    text: "text-neon-blue",
    ring: "ring-neon-blue/30",
    label: "Completed"
  },
  archived: {
    dot: "bg-slate-500",
    text: "text-slate-400",
    ring: "ring-slate-500/30",
    label: "Archived"
  }
};

interface StatusBadgeProps {
  status: Status;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, pulse = true, className }: StatusBadgeProps) {
  const s = statusStyles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium ring-1",
        s.ring,
        s.text,
        className
      )}
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        {pulse && status === "active" && (
          <span
            className={cn(
              "absolute inset-0 animate-ping rounded-full opacity-75",
              s.dot
            )}
          />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", s.dot)} />
      </span>
      {s.label}
    </span>
  );
}
