import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icons";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
          Settings
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">
          Account
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage how Nexora identifies and notifies you.
        </p>
      </div>

      <Card variant="glass">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Synced from your Discord account.
            </CardDescription>
          </div>
          <Badge variant="purple">Discord</Badge>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { l: "Name", v: user?.name ?? "—" },
            { l: "Username", v: user?.username ?? "—" },
            { l: "Email", v: user?.email ?? "—" },
            { l: "Discord ID", v: user?.discordId ?? "—" }
          ].map((row) => (
            <div
              key={row.l}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <dt className="text-[11px] uppercase tracking-wider text-slate-500">
                {row.l}
              </dt>
              <dd className="mt-1 break-all text-sm text-white">{row.v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card variant="glass">
        <CardTitle>Coming in phase 2</CardTitle>
        <CardDescription>
          The pieces below are scaffolded and ready to be wired up next.
        </CardDescription>
        <ul className="mt-5 space-y-2 text-sm text-slate-300">
          {[
            "Theme & appearance preferences",
            "Notification channels",
            "Connected Discord servers",
            "Workspace billing & invoices"
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
            >
              <Icon.Sparkles size={14} className="text-neon-purple" />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
