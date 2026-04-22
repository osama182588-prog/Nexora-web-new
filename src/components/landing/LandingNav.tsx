"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto mt-4 max-w-6xl px-4">
        <nav className="glass flex items-center justify-between rounded-2xl px-4 py-2.5 shadow-card">
          <Link href="/" className="flex items-center gap-2 px-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-neon-gradient shadow-glow-sm">
              <Icon.Logo size={18} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              {siteConfig.name}
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-xl px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="hidden rounded-xl bg-neon-gradient px-4 py-2 text-sm font-medium text-white shadow-glow-sm transition hover:brightness-110 sm:inline-flex"
            >
              Get started
            </Link>
            <button
              type="button"
              aria-label="Toggle navigation"
              className="rounded-lg p-2 text-slate-300 hover:bg-white/5 md:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              <Icon.Menu />
            </button>
          </div>
        </nav>

        <div
          className={cn(
            "glass mt-2 overflow-hidden rounded-2xl transition-all md:hidden",
            open ? "max-h-72 p-3" : "max-h-0 p-0"
          )}
        >
          <div className="flex flex-col">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="mt-2 rounded-xl bg-neon-gradient px-4 py-2 text-center text-sm font-medium text-white"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
