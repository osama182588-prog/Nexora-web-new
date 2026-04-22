import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ProjectModel } from "@/models/Project";
import { requireUserId } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  await connectToDatabase();

  const [grouped, total, avgRow] = await Promise.all([
    ProjectModel.aggregate<{ _id: string; count: number }>([
      { $match: { ownerId: auth.userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    ProjectModel.countDocuments({ ownerId: auth.userId }),
    ProjectModel.aggregate<{ _id: null; avg: number }>([
      { $match: { ownerId: auth.userId } },
      { $group: { _id: null, avg: { $avg: "$progress" } } }
    ])
  ]);

  const byStatus: Record<string, number> = {
    active: 0,
    paused: 0,
    completed: 0,
    archived: 0
  };
  for (const row of grouped) byStatus[row._id] = row.count;

  return NextResponse.json({
    total,
    byStatus,
    averageProgress: Math.round(avgRow[0]?.avg ?? 0)
  });
}
