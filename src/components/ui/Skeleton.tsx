import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...rest }: SkeletonProps) {
  return <div className={cn("skeleton", className)} {...rest} />;
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-6 shadow-card">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="mt-6 h-24 w-full rounded-xl" />
    </div>
  );
}
