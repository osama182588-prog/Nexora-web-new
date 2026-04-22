import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

const discordClientId = process.env.DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;

if (!discordClientId || !discordClientSecret) {
  // Allow the app to boot in environments where OAuth isn't configured
  // (e.g. CI builds). Sign-in will simply be unavailable.
  // eslint-disable-next-line no-console
  console.warn(
    "[nexora] Discord OAuth credentials are missing. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET to enable sign-in."
  );
}

/**
 * NextAuth configuration.
 *
 * - Discord OAuth provider for sign-in.
 * - MongoDB adapter persists users / accounts.
 * - JWT strategy keeps middleware-based route protection lightweight.
 */
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise, { databaseName: "nexora" }),
  providers: [
    DiscordProvider({
      clientId: discordClientId ?? "",
      clientSecret: discordClientSecret ?? "",
      authorization: { params: { scope: "identify email" } }
    })
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as {
          id: string;
          username?: string;
          global_name?: string;
        };
        token.discordId = discordProfile.id;
        token.username = discordProfile.global_name ?? discordProfile.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.discordId = token.discordId as string | undefined;
        session.user.username = token.username as string | undefined;
      }
      return session;
    }
  }
};
