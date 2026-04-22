import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
// Pulling the logger here ensures the bus → audit-log subscription is
// active for every API route that authenticates a user (which is most
// of them). Cheap: only the first import does any real work.
import { ensureBusSubscription } from "@/lib/system/logger";

ensureBusSubscription();

/**
 * Resolve the current authenticated user id, or return a 401 response
 * suitable for returning directly from a route handler.
 */
export async function requireUserId(): Promise<
  { userId: string; response?: undefined } | { userId?: undefined; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        { error: "unauthorized", message: "You must be signed in." },
        { status: 401 }
      )
    };
  }
  return { userId: session.user.id };
}

/** JSON-friendly error helper. */
export function apiError(message: string, status = 400, code = "bad_request") {
  return NextResponse.json({ error: code, message }, { status });
}
