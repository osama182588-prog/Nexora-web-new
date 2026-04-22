import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function Showcase() {
  return (
    <section id="showcase" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neon-blue">
            Inside the dashboard
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            A command center your team will love.
          </h2>
        </div>

        <Card variant="glass" className="relative mt-14 overflow-hidden p-2 sm:p-3">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(168,85,247,0.18), transparent 50%), radial-gradient(ellipse at bottom right, rgba(34,211,238,0.15), transparent 55%)"
            }}
            aria-hidden
          />
          <div className="relative grid grid-cols-12 gap-3 rounded-xl bg-background/70 p-4 ring-1 ring-white/5">
            {/* Mock sidebar */}
            <aside className="col-span-3 hidden flex-col gap-2 rounded-xl bg-white/[0.02] p-3 sm:flex">
              <div className="mb-2 flex items-center gap-2 px-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-neon-gradient">
                  <Icon.Logo size={14} />
                </span>
                <span className="font-display text-sm text-white">Nexora</span>
              </div>
              {[
                { i: <Icon.Home size={16} />, l: "Overview", active: true },
                { i: <Icon.Users size={16} />, l: "Members" },
                { i: <Icon.Chart size={16} />, l: "Analytics" },
                { i: <Icon.Inbox size={16} />, l: "Inbox" },
                { i: <Icon.Settings size={16} />, l: "Settings" }
              ].map((item) => (
                <div
                  key={item.l}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs",
                    item.active
                      ? "bg-neon-purple/10 text-white ring-1 ring-neon-purple/30"
                      : "text-slate-400"
                  )}
                >
                  {item.i}
                  {item.l}
                </div>
              ))}
            </aside>

            {/* Mock content */}
            <main className="col-span-12 flex flex-col gap-3 sm:col-span-9">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Icon.Search size={14} /> Search
                </div>
                <Badge variant="purple">Pro</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: "Active members", v: "12,480", c: "+8.2%" },
                  { l: "Messages today", v: "48.3k", c: "+14%" },
                  { l: "Retention", v: "92%", c: "+1.4%" }
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/5"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      {s.l}
                    </p>
                    <p className="mt-1 font-display text-lg text-white">{s.v}</p>
                    <p className="text-[10px] text-emerald-400">{s.c}</p>
                  </div>
                ))}
              </div>
              <div className="flex h-40 items-end gap-2 rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/5">
                {[40, 65, 50, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-md bg-gradient-to-t from-neon-purple/20 to-neon-purple/80"
                  />
                ))}
              </div>
            </main>
          </div>
        </Card>
      </div>
    </section>
  );
}
