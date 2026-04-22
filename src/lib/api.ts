import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

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
