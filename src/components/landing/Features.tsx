import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Icon } from "@/components/icons";
import type { ReactNode } from "react";

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
}

const features: Feature[] = [
  {
    title: "Lightning-fast onboarding",
    description:
      "Sign in with Discord in one click. We handle the OAuth dance, sessions, and secure storage so you can focus on your product.",
    icon: <Icon.Bolt />
  },
  {
    title: "Built for scale",
    description:
      "MongoDB-backed, App-Router architecture, and clean module boundaries make it effortless to grow from launch day to millions.",
    icon: <Icon.Layers />
  },
  {
    title: "Privacy first",
    description:
      "Encrypted JWT sessions, least-privilege OAuth scopes, and server-side enforcement on every protected route.",
    icon: <Icon.Shield />
  },
  {
    title: "Realtime insights",
    description:
      "A dashboard that surfaces meaningful signals — not vanity metrics — so your team always knows what to do next.",
    icon: <Icon.Chart />
  },
  {
    title: "Global from day one",
    description:
      "Edge-ready rendering, optimized fonts, and a futuristic design system that loads instantly anywhere on the planet.",
    icon: <Icon.Globe />
  },
  {
    title: "Designed to delight",
    description:
      "Glassmorphism, neon accents, soft motion. Every pixel was tuned to feel premium without sacrificing usability.",
    icon: <Icon.Sparkles />
  }
];

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neon-purple">
            Why Nexora
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            A foundation you won&apos;t outgrow.
          </h2>
          <p className="mt-4 text-slate-400">
            Phase one ships the essentials — auth, dashboard, and design system —
            with seams ready for everything coming in phase two.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} variant="glass" interactive>
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-neon-gradient/15 text-neon-purple ring-1 ring-neon-purple/30 shadow-glow-sm">
                {feature.icon}
              </div>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
