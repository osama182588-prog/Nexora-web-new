import Link from "next/link";
import { Icon } from "@/components/icons";
import { SellerProductsBoard } from "@/components/marketplace/SellerProductsBoard";

export const metadata = { title: "My products · Marketplace" };

export default function DashboardMarketplacePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
            Marketplace
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">
            My products
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage everything you list on the Nexora marketplace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 text-sm text-slate-200 transition hover:bg-white/[0.05] hover:text-white"
          >
            <Icon.Globe size={14} />
            View public site
          </Link>
          <Link
            href="/dashboard/marketplace/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-neon-gradient px-4 text-sm font-medium text-white shadow-glow-sm transition hover:brightness-110"
          >
            <Icon.Plus size={16} />
            New product
          </Link>
        </div>
      </div>

      <SellerProductsBoard />
    </div>
  );
}
