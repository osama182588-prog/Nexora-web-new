import { SkeletonCard } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-3">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-3 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><SkeletonCard /></div>
        <SkeletonCard />
      </div>
    </div>
  );
}
