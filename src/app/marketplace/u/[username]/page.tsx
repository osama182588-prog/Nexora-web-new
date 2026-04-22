import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { connectToDatabase } from "@/lib/mongoose";
import { ProductModel } from "@/models/Product";
import { serializeProduct } from "@/lib/marketplace";
import { Icon } from "@/components/icons";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Rating } from "@/components/ui/Rating";
import { siteConfig } from "@/config/site";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return {
    title: `${username} · Nexora Marketplace`,
    description: `Products by ${username} on Nexora.`
  };
}

export default async function SellerProfilePage({ params }: PageProps) {
  const { username } = await params;
  await connectToDatabase();

  const docs = await ProductModel.find({
    ownerUsername: username.toLowerCase(),
    status: "published"
  })
    .sort({ publishedAt: -1 })
    .lean<import("@/models/Product").Product[]>();

  if (docs.length === 0) notFound();

  const products = docs.map(serializeProduct);
  const profile = {
    username: products[0].ownerUsername,
    name: products[0].ownerName,
    avatar: products[0].ownerAvatar
  };
  const totalViews = products.reduce((acc, p) => acc + p.views, 0);
  const totalRatings = products.reduce((acc, p) => acc + p.ratings.count, 0);
  const sumRatings = products.reduce((acc, p) => acc + p.ratings.sum, 0);
  const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

  return (
    <main className="relative min-h-screen pb-24">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-neon-gradient shadow-glow-sm">
              <Icon.Logo size={18} />
            </span>
            <span className="font-display text-lg font-semibold text-white">
              {siteConfig.name}
            </span>
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <Icon.Chevron size={14} className="rotate-180" />
            Marketplace
          </Link>
        </div>
      </header>

      {/* Profile header */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(165,99,255,0.18),transparent_60%)]" />
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  width={96}
                  height={96}
                  unoptimized
                  className="h-24 w-24 rounded-2xl ring-1 ring-white/10 shadow-glow"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-neon-gradient text-3xl font-semibold text-white shadow-glow">
                  {(profile.name || profile.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
                Seller profile
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold text-white sm:text-4xl">
                {profile.name || profile.username}
              </h1>
              <p className="mt-1 text-sm text-slate-400">@{profile.username}</p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Stat label="Products" value={String(products.length)} icon="Folder" />
                <Stat
                  label="Total views"
                  value={totalViews.toLocaleString()}
                  icon="Eye"
                />
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-1.5 ring-1 ring-white/5">
                  <Icon.Star size={14} className="text-amber-300" />
                  <Rating
                    value={avgRating}
                    count={totalRatings}
                    showCount
                    size={12}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="font-display text-2xl font-semibold text-white">
          Published products
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: keyof typeof Icon;
}) {
  const Ico = Icon[icon];
  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-1.5 ring-1 ring-white/5">
      <Ico size={14} className="text-slate-400" />
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
