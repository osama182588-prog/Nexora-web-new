import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import { ProductModel } from "@/models/Product";
import { serializeProduct } from "@/lib/marketplace";
import { ProductForm } from "@/components/marketplace/ProductForm";

export const metadata = { title: "Edit product" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectToDatabase();
  const doc = await ProductModel.findOne({ _id: id, ownerId: session.user.id });
  if (!doc) notFound();

  const product = serializeProduct(doc);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
          Edit product
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">
          {product.title}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Update the listing. Changes are saved instantly when you submit.
        </p>
      </div>

      <ProductForm product={product} />
    </div>
  );
}
