"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

interface ContextMenuProps {
  trigger: (props: { open: boolean; onClick: (e: React.MouseEvent) => void }) => ReactNode;
  items: ContextMenuItem[];
  align?: "left" | "right";
}

/** Click-to-open menu (also acts as the row's overflow menu). */
export function ContextMenu({ trigger, items, align = "right" }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({
        open,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }
      })}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-[calc(100%+6px)] z-40 min-w-[200px] origin-top animate-fade-in rounded-xl glass-strong p-1.5 shadow-glow",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
                item.destructive
                  ? "text-rose-300 hover:bg-rose-500/10"
                  : "text-slate-200 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="inline-flex items-center gap-2">
                {item.icon && (
                  <span className="text-slate-400">{item.icon}</span>
                )}
                {item.label}
              </span>
              {item.shortcut && (
                <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
