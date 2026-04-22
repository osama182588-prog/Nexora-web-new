"use client";

import { useState, type ReactElement, cloneElement } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement<{
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    className?: string;
  }>;
}

const sideStyles: Record<NonNullable<TooltipProps["side"]>, string> = {
  top: "bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2",
  bottom: "top-[calc(100%+8px)] left-1/2 -translate-x-1/2",
  left: "right-[calc(100%+8px)] top-1/2 -translate-y-1/2",
  right: "left-[calc(100%+8px)] top-1/2 -translate-y-1/2"
};

export function Tooltip({ content, side = "top", children }: TooltipProps) {
  const [open, setOpen] = useState(false);

  const child = cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      setOpen(true);
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      setOpen(false);
      children.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      setOpen(true);
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      setOpen(false);
      children.props.onBlur?.(e);
    },
    className: cn("relative", children.props.className)
  });

  return (
    <span className="relative inline-flex">
      {child}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-white/10 bg-background/95 px-2.5 py-1.5 text-xs text-slate-200 shadow-glow-sm backdrop-blur transition-all duration-150",
          sideStyles[side],
          open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        )}
      >
        {content}
      </span>
    </span>
  );
}
