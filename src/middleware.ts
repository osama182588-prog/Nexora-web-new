/**
 * Route protection. Any request to /dashboard/* without a valid
 * NextAuth JWT is redirected to /login.
 */
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*"]
};
