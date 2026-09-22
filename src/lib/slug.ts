import { randomBytes } from "node:crypto";

/** URL- and DB-friendly slug (accents removed, lowercase, dashed). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Slug with a random suffix so it is practically guaranteed unique. */
export function uniqueSlug(input: string): string {
  const base = slugify(input) || "tenant";
  return `${base}-${randomBytes(3).toString("hex")}`;
}
