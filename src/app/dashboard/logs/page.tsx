import { LogsExplorer } from "@/components/logs/LogsExplorer";

export const metadata = { title: "Logs · Nexora" };

export default function LogsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
          Audit trail
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
          Logs
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Every meaningful action across your workspace, in chronological
          order. Filter by level, category or project — new events stream in
          live.
        </p>
      </div>
      <LogsExplorer />
    </div>
  );
}
