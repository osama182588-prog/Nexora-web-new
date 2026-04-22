import { ProductForm } from "@/components/marketplace/ProductForm";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
          Marketplace
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">
          List a new product
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Fill in the details below. You can always edit, unpublish, or remove
          your listing later.
        </p>
      </div>

      <ProductForm />
    </div>
  );
}
