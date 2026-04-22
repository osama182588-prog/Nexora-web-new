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

/** Escape regex metacharacters so a slug can be safely embedded in a `RegExp`. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Pick the first available `<base>-<n>` slug given a list of slugs
 * already taken in the relevant scope. Pure / synchronous so it can
 * be unit-tested without a database.
 *
 * Replaces the older "loop calling `Model.exists` per attempt" pattern
 * which cost up to N sequential DB round-trips per create. The caller
 * now does one `find({ slug: /^base(-\d+)?$/ })` and hands the result
 * to this helper.
 */
export function pickAvailableSlug(
  base: string,
  taken: Iterable<string>,
  maxAttempts = 1000
): string | null {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  for (let n = 2; n <= maxAttempts; n++) {
    const candidate = `${base}-${n}`;
    if (!set.has(candidate)) return candidate;
  }
  return null;
}

/**
 * Build the regex used to fetch every potential slug conflict for a
 * given base. Matches `base`, `base-2`, `base-3`, … but not unrelated
 * slugs that merely start with `base` (e.g. `base-of-something`).
 */
export function slugConflictRegex(base: string): RegExp {
  return new RegExp(`^${escapeRegex(base)}(-\\d+)?$`);
}
