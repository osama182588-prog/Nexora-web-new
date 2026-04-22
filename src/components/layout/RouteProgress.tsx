"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Slim gradient bar at the top of the viewport that animates on
 * route change. We can't hook directly into Next.js navigation
 * lifecycle from the App Router, so we trigger on path/query change
 * and run a short ease-in animation.
 */
function RouteProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setActive(true);
    setProgress(20);
    const t1 = setTimeout(() => setProgress(60), 80);
    const t2 = setTimeout(() => setProgress(90), 220);
    const t3 = setTimeout(() => setProgress(100), 380);
    const t4 = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[110] h-[2px] transition-opacity duration-200",
        active ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className="h-full bg-gradient-to-r from-neon-purple via-neon-blue to-neon-cyan shadow-[0_0_12px_rgba(168,85,247,0.7)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressInner />
    </Suspense>
  );
}
