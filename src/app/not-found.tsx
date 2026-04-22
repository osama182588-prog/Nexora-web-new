import Link from "next/link";
import { Icon } from "@/components/icons";

export const metadata = { title: "Page not found" };

/**
 * Global 404 page — used by both the marketing site and the app
 * whenever `notFound()` is invoked or no route matches.
 */
export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-neon-purple/15 blur-[120px]"
      />
      <div className="relative w-full max-w-lg space-y-6 rounded-3xl glass-strong p-8 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-neon-gradient shadow-glow-sm">
          <Icon.Search size={22} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neon-purple">
            404 · Lost in space
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white">
            We couldn&apos;t find that page.
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            The link may be broken, or the page may have been moved. Try
            heading back to a known destination.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-neon-gradient px-4 text-sm font-medium text-white shadow-glow-sm transition hover:brightness-110"
          >
            <Icon.Home size={14} />
            Home
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            <Icon.Cart size={14} />
            Marketplace
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            <Icon.Chart size={14} />
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
