import { Skeleton } from "@/components/ui/Skeleton";

export default function MarketplaceLoading() {
  return (
    <main className="min-h-screen">
      <div className="h-16 border-b border-white/5" />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-12">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
