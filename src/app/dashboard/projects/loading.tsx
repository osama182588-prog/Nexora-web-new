import { SkeletonCard } from "@/components/ui/Skeleton";

export default function ProjectsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-3">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-9 w-48" />
        <div className="skeleton h-3 w-80" />
      </div>
      <div className="skeleton h-14 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
