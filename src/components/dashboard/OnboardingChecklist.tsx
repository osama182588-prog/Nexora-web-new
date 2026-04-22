"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { projectsApi } from "@/lib/client-api";
import { marketplaceApi } from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

interface ChecklistStep {
  id: string;
  label: string;
  description: string;
  href: string;
  cta: string;
  icon: IconName;
  done: boolean;
}

const DISMISS_KEY = "nexora.onboarding.dismissed.v1";

/**
 * Lightweight onboarding card shown on the dashboard overview until
 * the user dismisses it or completes every step. State is derived
 * from real data (projects + products) so the checklist is accurate
 * even across devices.
 */
export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState<boolean>(true);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      projectsApi.list({ limit: "1" }).catch(() => ({ projects: [] })),
      marketplaceApi.list({ mine: "1", limit: "1" }).catch(() => ({ products: [] }))
    ]).then(([proj, prod]) => {
      if (cancelled) return;
      setProjectCount(proj.projects.length);
      setProductCount(prod.products.length);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps: ChecklistStep[] = useMemo(
    () => [
      {
        id: "create-project",
        label: "Create your first project",
        description: "Spin up a workspace to plan, track and ship work.",
        href: "/dashboard/projects/new",
        cta: "Start project",
        icon: "Folder",
        done: (projectCount ?? 0) > 0
      },
      {
        id: "list-product",
        label: "Publish a marketplace listing",
        description: "Turn a project into a product the community can discover.",
        href: "/dashboard/marketplace/new",
        cta: "List a product",
        icon: "Cart",
        done: (productCount ?? 0) > 0
      },
      {
        id: "explore",
        label: "Explore the marketplace",
        description: "See what other makers are shipping in Nexora.",
        href: "/marketplace",
        cta: "Browse",
        icon: "Globe",
        done: false
      }
    ],
    [projectCount, productCount]
  );

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percent = Math.round((completed / total) * 100);
  const allDone = completed === total;

  if (dismissed) return null;
  // While we don't yet know the user's state, render nothing to avoid flicker.
  if (projectCount === null || productCount === null) return null;

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  };

  return (
    <section
      aria-labelledby="onboarding-title"
      className="relative overflow-hidden rounded-2xl glass-strong p-6 shadow-card animate-fade-in"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-neon-purple/25 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-neon-blue/20 blur-3xl"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-neon-purple">
            <Icon.Rocket size={12} />
            Get started
          </p>
          <h2
            id="onboarding-title"
            className="mt-2 font-display text-xl font-semibold text-white sm:text-2xl"
          >
            {allDone
              ? "You're all set up — nice work."
              : "Welcome to Nexora. Let's get you set up."}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {allDone
              ? "Dismiss this card whenever you're ready to keep your dashboard tidy."
              : "Three small steps to get the most out of your workspace."}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss onboarding"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <Icon.X size={14} />
        </button>
      </div>

      {/* Progress */}
      <div className="relative mt-5 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon-purple via-neon-blue to-neon-cyan transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span>
          {completed} / {total} done
        </span>
      </div>

      {/* Steps */}
      <ul className="relative mt-5 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => {
          const Ico = Icon[step.icon];
          return (
            <li
              key={step.id}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-4 transition",
                step.done
                  ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                  : "border-white/10 bg-white/[0.02] hover:border-neon-purple/30 hover:bg-white/[0.04] hover:-translate-y-0.5"
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ring-1",
                    step.done
                      ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
                      : "bg-neon-purple/10 text-neon-purple ring-neon-purple/30"
                  )}
                >
                  {step.done ? <Icon.Check2 size={16} /> : <Ico size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{step.label}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {step.description}
                  </p>
                </div>
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-neon-purple transition group-hover:translate-x-0.5"
                >
                  {step.cta}
                  <Icon.Arrow size={12} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
