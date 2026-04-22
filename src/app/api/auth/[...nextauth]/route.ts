import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordLog } from "@/lib/system/logger";

export const runtime = "nodejs";

/**
 * NextAuth route handler. The `events` block is wired here (rather
 * than in `@/lib/auth`) so the audit logger — which depends on
 * Node-only APIs (`node:crypto` via the event bus) — is never pulled
 * into the client or edge bundle that imports `authOptions` for typing.
 */
const handler = NextAuth({
  ...authOptions,
  events: {
    ...(authOptions.events ?? {}),
    async signIn({ user, account, isNewUser }) {
      if (!user.id) return;
      recordLog({
        ownerId: user.id,
        actorId: user.id,
        level: "info",
        category: "auth",
        type: isNewUser ? "auth.signup" : "auth.login",
        message: isNewUser
          ? `New account created via ${account?.provider ?? "credentials"}`
          : `Signed in via ${account?.provider ?? "credentials"}`,
        metadata: {
          provider: account?.provider ?? null,
          email: user.email ?? null
        }
      });
    },
    async signOut({ token }) {
      const id = typeof token?.id === "string" ? token.id : null;
      if (!id) return;
      recordLog({
        ownerId: id,
        actorId: id,
        level: "info",
        category: "auth",
        type: "auth.logout",
        message: "Signed out"
      });
    }
  }
});

export { handler as GET, handler as POST };
