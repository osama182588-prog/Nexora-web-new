import Link from "next/link";
import { Icon } from "@/components/icons";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-neon-gradient shadow-glow-sm">
            <Icon.Logo size={18} />
          </span>
          <span className="font-display text-lg font-semibold text-white">
            {siteConfig.name}
          </span>
        </Link>
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} {siteConfig.name}. Built for the next era of communities.
        </p>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <Link href="#features" className="hover:text-white">Features</Link>
          <Link href="#pricing" className="hover:text-white">Pricing</Link>
          <Link href="/login" className="hover:text-white">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
