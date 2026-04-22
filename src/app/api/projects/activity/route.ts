import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { ActivityModel } from "@/models/Activity";
import { requireUserId } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  await connectToDatabase();

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);

  const items = await ActivityModel.find({ ownerId: auth.userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    activities: items.map((a) => ({
      id: String(a._id),
      type: a.type,
      message: a.message,
      projectId: a.projectId,
      createdAt: a.createdAt.toISOString()
    }))
  });
}
