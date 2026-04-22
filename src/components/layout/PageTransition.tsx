"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Re-keys the subtree on route change so Tailwind's `animate-fade-in`
 * keyframes replay, giving us a soft entrance animation between pages.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [key, setKey] = useState(pathname);

  useEffect(() => {
    setKey(pathname);
  }, [pathname]);

  return (
    <div key={key} className="animate-fade-in">
      {children}
    </div>
  );
}
