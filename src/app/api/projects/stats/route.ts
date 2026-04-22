import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ProjectModel } from "@/models/Project";
import { requireUserId } from "@/lib/api";

export const dynamic = "force-dynamic";

interface FacetResult {
  byStatus: { _id: string; count: number }[];
  totals: { total: number; avg: number }[];
}

/**
 * GET /api/projects/stats
 *
 * Computes the stats card numbers in a SINGLE Mongo round-trip via
 * `$facet`. Previously this endpoint issued three separate queries
 * (group, count, avg) in parallel — they were quick individually but
 * still cost three TCP round-trips on every dashboard load.
 */
export async function GET() {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  await connectToDatabase();

  const [result] = await ProjectModel.aggregate<FacetResult>([
    { $match: { ownerId: auth.userId } },
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
  ]);

  const byStatus: Record<string, number> = {
    active: 0,
    paused: 0,
    completed: 0,
    archived: 0
  };
  for (const row of result?.byStatus ?? []) byStatus[row._id] = row.count;

  const totals = result?.totals?.[0] ?? { total: 0, avg: 0 };

  return NextResponse.json({
    total: totals.total,
    byStatus,
    averageProgress: Math.round(totals.avg ?? 0)
  });
}
