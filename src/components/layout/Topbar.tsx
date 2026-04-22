"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { RealtimeStatusPill } from "@/components/realtime/RealtimeStatusPill";
import { cn } from "@/lib/utils";

function Avatar({
  src,
  name,
  size = 36
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initials = (name ?? "U")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src) {
    return (
      <Image
        src={src}
        alt={name ?? "User avatar"}
        width={size}
        height={size}
        className="rounded-full ring-1 ring-white/10"
        unoptimized
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className="grid place-items-center rounded-full bg-neon-gradient text-xs font-semibold text-white shadow-glow-sm"
    >
      {initials}
    </span>
  );
}

export function Topbar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 md:px-0 md:pr-3 md:pt-3">
      <div className="glass flex h-14 items-center justify-between gap-3 rounded-2xl px-3 shadow-card">
        {/* Search */}
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-1.5 ring-1 ring-white/5 transition focus-within:ring-neon-purple/40">
          <Icon.Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">
            ⌘K
          </kbd>
        </div>

        <RealtimeStatusPill />

        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          <Icon.Bell size={18} />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-neon-purple shadow-glow" />
        </button>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-white/5"
          >
            {status === "loading" ? (
              <span className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
            ) : (
              <Avatar src={user?.image} name={user?.name} size={32} />
            )}
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-white">
                {user?.name ?? user?.username ?? "Guest"}
              </p>
              <p className="text-[11px] text-slate-400">
                {user?.email ?? "Discord member"}
              </p>
            </div>
            <Icon.Chevron
              size={14}
              className={cn(
                "ml-1 hidden text-slate-400 transition-transform sm:block",
                open && "rotate-90"
              )}
            />
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-60 origin-top-right animate-fade-in rounded-2xl glass-strong p-2 shadow-glow">
              <div className="flex items-center gap-3 rounded-xl p-3">
                <Avatar src={user?.image} name={user?.name} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {user?.name ?? user?.username ?? "Guest"}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {user?.email ?? "Discord"}
                  </p>
                </div>
              </div>
              <div className="my-1 h-px bg-white/5" />
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <Icon.Settings size={16} />
                Settings
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"
              >
                <Icon.Logout size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
