import { Suspense } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { siteConfig } from "@/config/site";
import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";

export const metadata = {
  title: "Marketplace · Nexora",
  description: "Discover digital products built by the Nexora community."
};

export default function MarketplacePage() {
  return (
    <main className="relative min-h-screen pb-24">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-neon-gradient shadow-glow-sm">
              <Icon.Logo size={18} />
            </span>
            <span className="font-display text-lg font-semibold text-white">
              {siteConfig.name}
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/marketplace"
              className="rounded-lg px-3 py-1.5 text-white ring-1 ring-white/10 hover:bg-white/5"
            >
              Marketplace
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/marketplace/new"
              className="ml-2 inline-flex h-9 items-center gap-2 rounded-xl bg-neon-gradient px-3 text-sm font-medium text-white shadow-glow-sm transition hover:brightness-110"
            >
              <Icon.Plus size={14} />
              List a product
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(165,99,255,0.18),transparent_55%)]" />
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:pt-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-neon-purple ring-1 ring-white/5">
              <Icon.Sparkles size={12} />
              Nexora Marketplace
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Discover digital products
              <span className="block bg-gradient-to-r from-neon-purple via-neon-blue to-neon-cyan bg-clip-text text-transparent">
                crafted by the community.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-400">
              Templates, components, plugins, icons and more. Polished, vetted, and
              ready to plug into your next launch.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4">
        <Suspense>
          <MarketplaceBrowser />
        </Suspense>
      </div>
    </main>
  );
}
