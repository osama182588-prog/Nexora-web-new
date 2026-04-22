"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

/**
 * Global error boundary. Rendered when an unhandled error bubbles up
 * from a server or client component. Provides a graceful, branded
 * fallback with a reset action.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for diagnostics while keeping user-facing copy friendly.
    console.error("[nexora] unhandled error", error);
  }, [error]);

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-rose-500/15 blur-[120px]"
      />
      <div className="relative w-full max-w-lg space-y-6 rounded-3xl glass-strong p-8 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30">
          <Icon.Warning size={22} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-rose-300">
            Something went wrong
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white">
            We hit a snag rendering this page.
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            The error has been logged. You can try again, or head back to a
            known destination.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-[10px] text-slate-600">
              ref: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-neon-gradient px-4 text-sm font-medium text-white shadow-glow-sm transition hover:brightness-110"
          >
            <Icon.Bolt size={14} />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            <Icon.Home size={14} />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
