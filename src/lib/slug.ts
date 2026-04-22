/**
 * Shared slug helpers. Used by both projects and marketplace listings.
 *
 * Centralised so we keep behaviour consistent across the platform and
 * have a single place to harden against problematic input.
 */
export interface SlugifyOptions {
  /** Maximum slug length. Defaults to 80. */
  maxLength?: number;
  /** Value returned when input collapses to an empty string. */
  fallback?: string;
}

/** Convert any string into a lowercase, URL-safe slug. */
export function slugify(input: string, opts: SlugifyOptions = {}): string {
  const { maxLength = 80, fallback = "item" } = opts;
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, maxLength);
  return slug || fallback;
}
