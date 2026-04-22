import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Loading shell for the public product detail page. Matches the
 * hero + sidebar layout to avoid layout shift when content arrives.
 */
export default function ProductDetailLoading() {
  return (
    <main className="min-h-screen pb-24">
      <div className="h-16 border-b border-white/5" />
      <div className="mx-auto max-w-7xl px-4 pt-8">
        <Skeleton className="h-3 w-48" />
        <section className="mt-6 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-xl" />
              ))}
            </div>
          </div>
          <aside className="lg:col-span-2 space-y-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </aside>
        </section>
      </div>
    </main>
  );
}
