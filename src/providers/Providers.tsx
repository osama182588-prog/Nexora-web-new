"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { RouteProgress } from "@/components/layout/RouteProgress";

/**
 * Root client-side providers. Kept tiny on purpose so that
 * server components stay the default rendering path.
 *
 * - `SessionProvider` exposes the next-auth session client-side.
 * - `ToastProvider` powers the global notification stack.
 * - `RouteProgress` shows a slim progress bar on every route change.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <RouteProgress />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
