import Link from "next/link";
import { Icon } from "@/components/icons";

export function CTA() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-5xl px-4">
        <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-14 text-center shadow-glow sm:px-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(168,85,247,0.25), transparent 60%)"
            }}
            aria-hidden
          />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Ready to launch your community?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              Sign in with Discord and your dashboard is provisioned in seconds.
              No credit card. No commitments.
            </p>
            <Link
              href="/login"
              className="group mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-neon-gradient px-6 text-sm font-medium text-white shadow-glow transition hover:brightness-110"
            >
              <Icon.Discord size={18} />
              Continue with Discord
              <Icon.Arrow
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
