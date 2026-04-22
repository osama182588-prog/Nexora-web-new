/**
 * Client-side typed wrappers around the marketplace REST API.
 */
import type { ProductDTO } from "@/lib/marketplace";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export interface SellerProfile {
  username: string;
  name: string;
  avatar: string;
  stats: {
    totalProducts: number;
    totalViews: number;
    totalRatings: number;
    averageRating: number;
  };
}

export const marketplaceApi = {
  list(params: Record<string, string | undefined> = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return fetch(`/api/marketplace/products${suffix}`, { cache: "no-store" }).then(
      handle<{ products: ProductDTO[] }>
    );
  },
  bySlug(slug: string) {
    return fetch(`/api/marketplace/products/by-slug/${encodeURIComponent(slug)}`, {
      cache: "no-store"
    }).then(handle<{ product: ProductDTO; related: ProductDTO[] }>);
  },
  seller(username: string) {
    return fetch(`/api/marketplace/sellers/${encodeURIComponent(username)}`, {
      cache: "no-store"
    }).then(handle<{ seller: SellerProfile; products: ProductDTO[] }>);
  },
  get(id: string) {
    return fetch(`/api/marketplace/products/${id}`, { cache: "no-store" }).then(
      handle<{ product: ProductDTO }>
    );
  },
  create(body: Partial<ProductDTO>) {
    return fetch(`/api/marketplace/products`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }).then(handle<{ product: ProductDTO }>);
  },
  update(id: string, body: Partial<ProductDTO>) {
    return fetch(`/api/marketplace/products/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }).then(handle<{ product: ProductDTO }>);
  },
  remove(id: string) {
    return fetch(`/api/marketplace/products/${id}`, { method: "DELETE" }).then(
      handle<{ ok: true }>
    );
  }
};
