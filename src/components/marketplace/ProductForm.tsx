"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/icons";
import { marketplaceApi } from "@/lib/marketplace-api";
import { PRODUCT_CATEGORIES, type ProductDTO } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

const COLORS = ["purple", "blue", "cyan", "emerald", "amber", "rose"] as const;
const colorChip: Record<(typeof COLORS)[number], string> = {
  purple: "bg-neon-purple",
  blue: "bg-neon-blue",
  cyan: "bg-neon-cyan",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400"
};

interface ProductFormProps {
  /** When provided, the form edits the existing product; otherwise it creates one. */
  product?: ProductDTO;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const editing = !!product;

  const [title, setTitle] = useState(product?.title ?? "");
  const [tagline, setTagline] = useState(product?.tagline ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? "templates");
  const [price, setPrice] = useState(String(product?.price ?? 0));
  const [currency, setCurrency] = useState(product?.currency ?? "USD");
  const [coverImage, setCoverImage] = useState(product?.coverImage ?? "");
  const [galleryInput, setGalleryInput] = useState(
    (product?.gallery ?? []).join("\n")
  );
  const [tagsInput, setTagsInput] = useState((product?.tags ?? []).join(", "));
  const [color, setColor] = useState<(typeof COLORS)[number]>(
    (product?.accentColor as (typeof COLORS)[number]) ?? "purple"
  );
  const [status, setStatus] = useState<"draft" | "published">(
    product?.status === "published" ? "published" : "draft"
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Product title is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const gallery = galleryInput
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => /^https?:\/\//i.test(s));
      const priceNum = Number(price);
      const payload = {
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category,
        price: Number.isFinite(priceNum) ? priceNum : 0,
        currency,
        coverImage: coverImage.trim(),
        gallery,
        tags,
        accentColor: color,
        status
      };

      if (editing && product) {
        await marketplaceApi.update(product.id, payload);
        router.push(`/dashboard/marketplace`);
      } else {
        const { product: created } = await marketplaceApi.create(payload);
        router.push(
          created.status === "published"
            ? `/marketplace/${created.slug}`
            : `/dashboard/marketplace`
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <Card variant="glass" className="space-y-5 p-6">
        <Field label="Title" htmlFor="title" required>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Aurora UI Kit"
            maxLength={100}
            required
            autoFocus
          />
        </Field>

        <Field
          label="Tagline"
          htmlFor="tagline"
          hint="A one-line pitch shown on cards (160 chars max)."
        >
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A futuristic dashboard kit for SaaS apps."
            maxLength={160}
          />
        </Field>

        <Field label="Description" htmlFor="description" hint="Markdown-style plain text. 5000 chars max.">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's included? What problems does it solve?"
            maxLength={5000}
            rows={6}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" htmlFor="category">
            <Select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "published")}
            >
              <option value="draft">Draft (only you can see)</option>
              <option value="published">Published (live on marketplace)</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Price" htmlFor="price" hint="Set 0 for free.">
            <Input
              id="price"
              type="number"
              min={0}
              max={100000}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Currency" htmlFor="currency">
            <Select
              id="currency"
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value as ProductDTO["currency"])
              }
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="SAR">SAR</option>
            </Select>
          </Field>
          <Field label="Tags" htmlFor="tags" hint="Comma-separated, up to 12.">
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ui, dashboard, nextjs"
            />
          </Field>
        </div>

        <Field
          label="Cover image URL"
          htmlFor="cover"
          hint="HTTPS URL to a 16:10 image."
        >
          <Input
            id="cover"
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://..."
          />
        </Field>

        <Field
          label="Gallery URLs"
          htmlFor="gallery"
          hint="One URL per line, up to 6."
        >
          <Textarea
            id="gallery"
            value={galleryInput}
            onChange={(e) => setGalleryInput(e.target.value)}
            placeholder={"https://...\nhttps://..."}
            rows={3}
          />
        </Field>

        <Field label="Accent color">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Use ${c} accent`}
                aria-pressed={color === c}
                className={cn(
                  "group relative h-9 w-9 rounded-xl ring-1 ring-white/10 transition",
                  color === c
                    ? "scale-105 ring-2 ring-white shadow-glow-sm"
                    : "hover:scale-105 hover:ring-white/30"
                )}
              >
                <span className={cn("block h-full w-full rounded-xl", colorChip[c])} />
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <Icon.Chevron size={14} className="rotate-180" />
          Back to my products
        </Link>
        <Button type="submit" loading={submitting}>
          {editing ? <Icon.Check2 size={16} /> : <Icon.Plus size={16} />}
          {editing ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
