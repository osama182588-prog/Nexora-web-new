import { Skeleton } from "@/components/ui/Skeleton";

export default function SellerLoading() {
  return (
    <main className="min-h-screen">
      <div className="h-16 border-b border-white/5" />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
