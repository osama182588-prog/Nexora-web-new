"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  /** Delay (ms) before the entrance animation starts when the element comes into view. */
  delay?: number;
  /** Direction of the slide-in. */
  from?: "up" | "down" | "left" | "right" | "none";
  /** Trigger threshold for IntersectionObserver. Defaults to 0.15. */
  threshold?: number;
  /** Re-trigger every time the element re-enters the viewport. Defaults to false. */
  repeat?: boolean;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "span";
}

/**
 * Lightweight, dependency-free reveal-on-scroll wrapper.
 *
 * Uses IntersectionObserver to fade + translate the children into view
 * the first time they intersect the viewport. Honors
 * `prefers-reduced-motion` and skips animation entirely when not in a
 * browser (server render outputs the children with the final styles).
 */
export function Reveal({
  children,
  delay = 0,
  from = "up",
  threshold = 0.15,
  repeat = false,
  className,
  as = "div"
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const node = ref.current;
    if (!node) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            if (!repeat) observer.disconnect();
          } else if (repeat) {
            setShown(false);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, repeat]);

  const offset =
    from === "up"
      ? "translate-y-4"
      : from === "down"
        ? "-translate-y-4"
        : from === "left"
          ? "translate-x-4"
          : from === "right"
            ? "-translate-x-4"
            : "";

  const Tag = as;

  return (
    <Tag
      ref={ref as never}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        shown ? "translate-x-0 translate-y-0 opacity-100" : `${offset} opacity-0`,
        className
      )}
    >
      {children}
    </Tag>
  );
}
