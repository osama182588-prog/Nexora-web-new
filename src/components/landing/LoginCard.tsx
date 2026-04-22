"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const errorMessages: Record<string, string> = {
  OAuthSignin: "Couldn't start the Discord sign-in flow. Please try again.",
  OAuthCallback: "Discord rejected the sign-in. Please try again.",
  OAuthAccountNotLinked:
    "This email is already linked to another sign-in method.",
  AccessDenied: "Access denied.",
  Configuration:
    "Authentication is not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.",
  default: "Something went wrong while signing in. Please try again."
};

export function LoginCard() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const error = params.get("error");
  const [loading, setLoading] = useState(false);

  return (
    <Card variant="glass" className="w-full max-w-md p-8 shadow-glow">
      <div className="flex flex-col items-center text-center">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-neon-gradient shadow-glow-sm">
            <Icon.Logo size={22} />
          </span>
          <span className="font-display text-xl font-semibold text-white">
            {siteConfig.name}
          </span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-white">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in with Discord to access your dashboard.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {errorMessages[error] ?? errorMessages.default}
        </div>
      )}

      <div className="mt-8 space-y-3">
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
          onClick={() => {
            setLoading(true);
            signIn("discord", { callbackUrl });
          }}
        >
          <Icon.Discord size={18} />
          Continue with Discord
        </Button>

        <p className="text-center text-xs text-slate-500">
          By continuing you agree to our Terms and acknowledge our Privacy Policy.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center text-sm text-slate-400">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-white">
          <Icon.Chevron size={14} className="rotate-180" />
          Back to home
        </Link>
      </div>
    </Card>
  );
}
