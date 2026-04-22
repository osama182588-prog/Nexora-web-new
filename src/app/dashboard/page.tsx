import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Overview" };

interface Stat {
  label: string;
  value: string;
  change: string;
  icon: keyof typeof Icon;
  positive?: boolean;
}

const stats: Stat[] = [
  { label: "Total members", value: "—", change: "Connect Discord", icon: "Users" },
  { label: "Active today", value: "—", change: "Awaiting data", icon: "Bolt" },
  { label: "Messages", value: "—", change: "Awaiting data", icon: "Inbox" },
  { label: "Health", value: "100%", change: "All systems nominal", icon: "Shield", positive: true }
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? session?.user?.username ?? "there";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
            Dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
            Welcome back, {name.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Here&apos;s a snapshot of your community. Phase one ships the foundation —
            real metrics arrive in phase two.
          </p>
        </div>
        <Badge variant="purple">
          <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-neon-purple" />
          Phase 1 preview
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Ico = Icon[stat.icon];
          return (
            <Card key={stat.label} variant="glass" interactive>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold text-white">
                    {stat.value}
                  </p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-gradient/15 text-neon-purple ring-1 ring-neon-purple/30">
                  <Ico size={18} />
                </span>
              </div>
              <p
                className={`mt-3 text-xs ${
                  stat.positive ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {stat.change}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="glass" className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity</CardTitle>
              <CardDescription>
                Trends across your workspace will appear here.
              </CardDescription>
            </div>
            <Badge>Live in phase 2</Badge>
          </div>
          <div className="mt-6 flex h-56 items-end gap-2 rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/5">
            {[
              30, 45, 38, 60, 55, 72, 58, 80, 65, 90, 72, 95, 80, 100, 85
            ].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="flex-1 rounded-md bg-gradient-to-t from-neon-purple/20 to-neon-purple/80 transition-all hover:from-neon-purple/40 hover:to-neon-purple"
              />
            ))}
          </div>
        </Card>

        <EmptyState
          icon={<Icon.Sparkles />}
          title="No automations yet"
          description="Create your first automation to put repetitive community tasks on autopilot."
          action={
            <Button variant="outline" size="sm">
              <Icon.Bolt size={14} />
              Create automation
            </Button>
          }
        />
      </div>

      {/* Recent + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="glass" className="lg:col-span-2">
          <CardTitle>Recent members</CardTitle>
          <CardDescription>Newest people who joined your workspace.</CardDescription>
          <EmptyState
            className="mt-6 border border-white/5 bg-transparent shadow-none"
            icon={<Icon.Users />}
            title="No members yet"
            description="Once you connect your Discord server, members will start showing up here in real time."
            action={
              <Button variant="primary" size="sm">
                <Icon.Discord size={14} />
                Connect Discord server
              </Button>
            }
          />
        </Card>

        <Card variant="glass">
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>Common tasks to get you moving.</CardDescription>
          <div className="mt-5 space-y-2">
            {[
              { l: "Invite a teammate", i: "Users" as const },
              { l: "Open settings", i: "Settings" as const },
              { l: "Read the docs", i: "Globe" as const }
            ].map((a) => {
              const I = Icon[a.i];
              return (
                <button
                  key={a.l}
                  type="button"
                  className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-left text-sm text-slate-300 transition hover:border-neon-purple/30 hover:bg-white/5 hover:text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <I size={16} className="text-neon-purple" />
                    {a.l}
                  </span>
                  <Icon.Arrow
                    size={14}
                    className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                  />
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
