// Slugs live under /l/* so they don't collide with app routes — this set just
// blocks confusing words inside that namespace.
export const RESERVED_SLUGS = new Set(['api', 'admin', 'auth', 'signin', 'logout', '_health']);

export const SLUG_MAX_LENGTH = 80;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
}

export type SlugValidation =
  | { ok: true; slug: string }
  | { ok: false; reason: string };

export function validateSlug(input: string): SlugValidation {
  const slug = slugify(input);
  if (!slug) return { ok: false, reason: 'Slug is empty after normalization.' };
  if (slug.length < 2) return { ok: false, reason: 'Slug must be at least 2 characters.' };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, reason: `"${slug}" is reserved.` };
  return { ok: true, slug };
}

import { validateDestinationUrl } from './urlField.ts';

export function validateUrl(input: string): { ok: true; url: string } | { ok: false; reason: string } {
  return validateDestinationUrl(input);
}
