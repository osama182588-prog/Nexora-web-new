import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface Tier {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}

const tiers: Tier[] = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/forever",
    description: "Everything you need to validate your idea.",
    features: ["Discord login", "1 workspace", "Basic dashboard", "Community support"],
    cta: "Start free"
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "/month",
    description: "For growing communities ready to scale.",
    features: [
      "Unlimited members",
      "Advanced analytics",
      "Custom branding",
      "Priority support"
    ],
    highlighted: true,
    cta: "Start 14-day trial"
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Tailored deployments and dedicated success.",
    features: ["SSO & SCIM", "Dedicated infra", "SLA & audit logs", "Solutions engineer"],
    cta: "Talk to sales"
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neon-purple">
            Pricing
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            Simple plans, futuristic results.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              variant={tier.highlighted ? "gradient" : "glass"}
              className={tier.highlighted ? "ring-1 ring-neon-purple/40 shadow-glow" : ""}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-white">
                  {tier.name}
                </h3>
                {tier.highlighted && <Badge variant="purple">Most popular</Badge>}
              </div>
              <p className="mt-2 text-sm text-slate-400">{tier.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold text-white">
                  {tier.price}
                </span>
                {tier.cadence && (
                  <span className="text-sm text-slate-400">{tier.cadence}</span>
                )}
              </div>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-neon-purple/15 text-neon-purple">
                      <Icon.Check size={12} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={cn(
                  "mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition",
                  tier.highlighted
                    ? "bg-neon-gradient text-white shadow-glow-sm hover:brightness-110"
                    : "border border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
                )}
              >
                {tier.cta}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
