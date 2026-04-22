import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { connectToDatabase } from "@/lib/mongoose";
import { ProjectModel } from "@/models/Project";
import { ActivityModel } from "@/models/Activity";
import { serializeProject } from "@/lib/projects";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

interface FacetResult {
  byStatus: { _id: string; count: number }[];
  totals: { total: number; avg: number }[];
}

/**
 * Server-render the overview's first-paint data so users see real
 * numbers instantly instead of skeleton placeholders that flash for a
 * round-trip after JS hydrates. Three queries fan out in parallel and
 * stay on the same TCP connection — typical local latency is well
 * under 50ms total.
 */
async function loadOverviewData(userId: string) {
  try {
    await connectToDatabase();
    const [statsAgg, recent, activities] = await Promise.all([
      ProjectModel.aggregate<FacetResult>([
        { $match: { ownerId: userId } },
        {
          $facet: {
            byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  avg: { $avg: "$progress" }
                }
              },
              { $project: { _id: 0, total: 1, avg: 1 } }
            ]
          }
        }
      ]),
      ProjectModel.find({ ownerId: userId })
        .sort({ lastActivityAt: -1 })
        .limit(5)
        .lean<import("@/models/Project").Project[]>(),
      ActivityModel.find({ ownerId: userId })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean()
    ]);

    const byStatus: Record<string, number> = {
      active: 0,
      paused: 0,
      completed: 0,
      archived: 0
    };
    const facet = statsAgg[0];
    for (const row of facet?.byStatus ?? []) byStatus[row._id] = row.count;
    const totals = facet?.totals?.[0] ?? { total: 0, avg: 0 };

    return {
      stats: {
        total: totals.total,
        byStatus: byStatus as {
          active: number;
          paused: number;
          completed: number;
          archived: number;
        },
        averageProgress: Math.round(totals.avg ?? 0)
      },
      recent: recent.map(serializeProject),
      activity: activities.map((a) => ({
        id: String(a._id),
        type: a.type,
        message: a.message,
        projectId: a.projectId,
        createdAt: a.createdAt.toISOString()
      }))
    };
  } catch (err) {
    // Stability over speed: if the DB is unreachable we still render
    // the page — the client effect will retry and surface the error.
    console.warn("[dashboard] SSR data load failed:", (err as Error).message);
    return null;
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? session?.user?.username ?? "there";
  const initial = session?.user?.id
    ? await loadOverviewData(session.user.id)
    : null;

  return (
    <div className="mx-auto max-w-7xl">
      <DashboardOverview greetingName={name} initialData={initial} />
    </div>
  );
}
