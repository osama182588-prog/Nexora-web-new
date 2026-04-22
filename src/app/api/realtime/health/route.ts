import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { ensureOperator, operatorState } from "@/lib/system/operator";

export const dynamic = "force-dynamic";

/**
 * Lightweight health snapshot for the internal system. Exposed so the
 * UI can render the operator status without keeping an SSE connection
 * open (e.g. on the settings page).
 */
export async function GET() {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  ensureOperator();
  return NextResponse.json({ operator: operatorState() });
}
