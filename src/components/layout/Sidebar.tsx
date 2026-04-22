"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

const items: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "Home" },
  { label: "Projects", href: "/dashboard/projects", icon: "Folder" },
  { label: "Members", href: "/dashboard/members", icon: "Users" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "Chart" },
  { label: "Inbox", href: "/dashboard/inbox", icon: "Inbox" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" }
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen flex-shrink-0 transition-[width] duration-300 ease-out md:flex md:flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl glass shadow-card">
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-neon-gradient shadow-glow-sm">
              <Icon.Logo size={18} />
            </span>
            <span
              className={cn(
                "font-display text-lg font-semibold text-white transition-opacity",
                collapsed && "pointer-events-none opacity-0"
              )}
            >
              Nexora
            </span>
          </Link>
        </div>

        <div className="px-3">
          <div className="h-px bg-white/5" />
        </div>

        {/* Nav */}
        <nav className="mt-3 flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => {
            const Ico = Icon[item.icon];
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-neon-purple/10 text-white ring-1 ring-neon-purple/30 shadow-glow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center transition-colors",
                    active ? "text-neon-purple" : "text-slate-400 group-hover:text-white"
                  )}
                >
                  <Ico size={18} />
                </span>
                <span
                  className={cn(
                    "truncate transition-opacity",
                    collapsed && "pointer-events-none w-0 opacity-0"
                  )}
                >
                  {item.label}
                </span>
                {active && !collapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neon-purple shadow-glow" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-400 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon.Chevron
              size={14}
              className={cn("transition-transform", collapsed ? "" : "rotate-180")}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
