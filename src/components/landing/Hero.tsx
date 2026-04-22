import Link from "next/link";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-24 sm:pt-44">
      <div className="absolute inset-0 grid-bg" aria-hidden />
      <div
        className="absolute left-1/2 top-20 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-neon-purple/20 blur-[140px]"
        aria-hidden
      />
      <div
        className="absolute right-1/4 top-60 h-[260px] w-[420px] rounded-full bg-neon-blue/20 blur-[120px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 text-center">
        <div className="flex justify-center">
          <Badge variant="purple" className="animate-fade-in">
            <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-neon-purple" />
            Phase 1 · Now in private beta
          </Badge>
        </div>

        <h1 className="mt-6 animate-fade-in font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
          The operating system
          <br />
          for <span className="text-gradient">modern communities</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl animate-fade-in text-base text-slate-300 sm:text-lg">
          Nexora unifies your Discord community, automations, and analytics into
          one futuristic command center. Sign in with Discord and ship in minutes.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="group inline-flex h-12 items-center gap-2 rounded-xl bg-neon-gradient px-6 text-sm font-medium text-white shadow-glow transition hover:brightness-110"
          >
            <Icon.Discord size={18} />
            Continue with Discord
            <Icon.Arrow
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="#features"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            Explore features
          </Link>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.2em] text-slate-500">
          <span>Discord OAuth</span>
          <span className="h-1 w-1 rounded-full bg-slate-700" />
          <span>MongoDB powered</span>
          <span className="h-1 w-1 rounded-full bg-slate-700" />
          <span>Edge ready</span>
          <span className="h-1 w-1 rounded-full bg-slate-700" />
          <span>Built with Next.js</span>
        </div>
      </div>
    </section>
  );
}
