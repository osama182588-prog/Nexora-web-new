import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LoginCard } from "@/components/landing/LoginCard";
import { SkeletonCard } from "@/components/ui/Skeleton";

export const metadata = {
  title: "Sign in"
};

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-20">
      <div className="absolute inset-0 grid-bg" aria-hidden />
      <div
        className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-purple/15 blur-[140px]"
        aria-hidden
      />
      <Suspense fallback={<SkeletonCard />}>
        <LoginCard />
      </Suspense>
    </main>
  );
}
