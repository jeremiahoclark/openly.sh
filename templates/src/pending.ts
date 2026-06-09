export const GUEST_COOKIE = 'openly_guest';
export const PENDING_TTL_SEC = 7 * 24 * 60 * 60;
export const MAX_PENDING_PER_GUEST = 5;
const MAGIC_GUEST_TTL_SEC = 15 * 60;

export type PendingLink = {
  slug: string;
  url: string;
  guestId: string;
  createdAt: number;
};

export interface PendingKv {
  get(key: string, options?: { type: 'json' }): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface PendingEnv {
  PENDING: PendingKv;
}

type D1SlugLookup = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
};

function slugKey(slug: string): string {
  return `slug:${slug}`;
}

function guestKey(guestId: string): string {
  return `guest:${guestId}`;
}

function magicGuestKey(tokenHash: string): string {
  return `magic:${tokenHash}`;
}

export function readGuestId(request: Request): string | null {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === GUEST_COOKIE) {
      const value = decodeURIComponent(rawValue.join('=')).trim();
      if (/^[0-9a-f-]{36}$/i.test(value)) return value;
    }
  }
  return null;
}

export function guestCookie(guestId: string, requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';
  return `${GUEST_COOKIE}=${encodeURIComponent(guestId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${PENDING_TTL_SEC}${secure}`;
}

export function ensureGuestId(request: Request): { guestId: string; setCookie: string | null } {
  const existing = readGuestId(request);
  const guestId = existing ?? crypto.randomUUID();
  const setCookie = existing ? null : guestCookie(guestId, request.url);
  return { guestId, setCookie };
}

export async function getPendingBySlug(env: PendingEnv, slug: string): Promise<PendingLink | null> {
  const row = (await env.PENDING.get(slugKey(slug), { type: 'json' })) as PendingLink | null;
  return row?.slug === slug ? row : null;
}

export async function isSlugReserved(env: PendingEnv, db: D1SlugLookup, slug: string): Promise<boolean> {
  const inDb = await db
    .prepare('SELECT slug FROM slugs WHERE slug = ?')
    .bind(slug)
    .first<{ slug: string }>();
  if (inDb) return true;
  const pending = await getPendingBySlug(env, slug);
  return pending !== null;
}

export async function listPendingForGuest(env: PendingEnv, guestId: string): Promise<PendingLink[]> {
  const slugs = (await env.PENDING.get(guestKey(guestId), { type: 'json' })) as string[] | null;
  if (!slugs?.length) return [];
  const links: PendingLink[] = [];
  for (const slug of slugs) {
    const link = await getPendingBySlug(env, slug);
    if (link?.guestId === guestId) links.push(link);
  }
  return links.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createPendingLink(
  env: PendingEnv,
  db: D1SlugLookup,
  guestId: string,
  slug: string,
  url: string,
): Promise<{ ok: true; link: PendingLink } | { ok: false; reason: string }> {
  if (await isSlugReserved(env, db, slug)) {
    return { ok: false, reason: 'Slug is already taken.' };
  }

  const existing = await listPendingForGuest(env, guestId);
  if (existing.some((l) => l.slug === slug)) {
    return { ok: false, reason: 'You already reserved this slug.' };
  }
  if (existing.length >= MAX_PENDING_PER_GUEST) {
    return {
      ok: false,
      reason: `You can reserve up to ${MAX_PENDING_PER_GUEST} links before signing in.`,
    };
  }

  const now = Date.now();
  const link: PendingLink = { slug, url, guestId, createdAt: now };
  const slugs = [...existing.map((l) => l.slug), slug];
  await env.PENDING.put(guestKey(guestId), JSON.stringify(slugs), { expirationTtl: PENDING_TTL_SEC });
  await env.PENDING.put(slugKey(slug), JSON.stringify(link), { expirationTtl: PENDING_TTL_SEC });
  return { ok: true, link };
}

export async function updatePendingLinkUrl(
  env: PendingEnv,
  guestId: string,
  slug: string,
  url: string,
): Promise<{ ok: true; link: PendingLink } | { ok: false; reason: string }> {
  const link = await getPendingBySlug(env, slug);
  if (!link) return { ok: false, reason: 'Link not found.' };
  if (link.guestId !== guestId) return { ok: false, reason: 'Link not found.' };
  const updated: PendingLink = { ...link, url };
  await env.PENDING.put(slugKey(slug), JSON.stringify(updated), { expirationTtl: PENDING_TTL_SEC });
  return { ok: true, link: updated };
}

export async function associateMagicLinkGuest(
  env: PendingEnv,
  tokenHash: string,
  guestId: string,
): Promise<void> {
  await env.PENDING.put(magicGuestKey(tokenHash), guestId, { expirationTtl: MAGIC_GUEST_TTL_SEC });
}

export async function consumeMagicLinkGuest(env: PendingEnv, tokenHash: string): Promise<string | null> {
  const key = magicGuestKey(tokenHash);
  const guestId = await env.PENDING.get(key);
  if (guestId) await env.PENDING.delete(key);
  return typeof guestId === 'string' && guestId.length > 0 ? guestId : null;
}

export async function migratePendingToAccount(
  env: PendingEnv,
  db: D1SlugLookup,
  guestId: string,
  accountId: string,
  linkLimit: number,
): Promise<{ migrated: string[]; skipped: string[] }> {
  const pending = await listPendingForGuest(env, guestId);
  if (!pending.length) return { migrated: [], skipped: [] };

  const activeRow = await db
    .prepare('SELECT COUNT(*) AS count FROM link_accounts WHERE account_id = ? AND archived_at IS NULL')
    .bind(accountId)
    .first<{ count: number }>();
  let activeCount = activeRow?.count ?? 0;

  const migrated: string[] = [];
  const skipped: string[] = [];

  for (const link of pending) {
    if (activeCount >= linkLimit) {
      skipped.push(link.slug);
      await deletePendingSlugIfOwned(env, link.slug, guestId);
      continue;
    }

    const taken = await isSlugReserved(env, db, link.slug);
    if (taken) {
      const stillPending = await getPendingBySlug(env, link.slug);
      if (!stillPending || stillPending.guestId !== guestId) {
        skipped.push(link.slug);
        if (!stillPending) await env.PENDING.delete(slugKey(link.slug));
        continue;
      }
    }

    const inDb = await db
      .prepare('SELECT slug FROM slugs WHERE slug = ?')
      .bind(link.slug)
      .first<{ slug: string }>();

    if (inDb) {
      skipped.push(link.slug);
      await deletePendingSlugIfOwned(env, link.slug, guestId);
      continue;
    }

    let insertedSlug = false;
    try {
      await db
        .prepare('INSERT INTO slugs (slug, url, created_at) VALUES (?, ?, ?)')
        .bind(link.slug, link.url, link.createdAt)
        .run();
      insertedSlug = true;
    } catch {
      skipped.push(link.slug);
      await deletePendingSlugIfOwned(env, link.slug, guestId);
      continue;
    }

    try {
      await db
        .prepare(
          'INSERT INTO link_accounts (slug, account_id, archived_at, created_at) VALUES (?, ?, NULL, ?)',
        )
        .bind(link.slug, accountId, link.createdAt)
        .run();
      activeCount += 1;
      migrated.push(link.slug);
    } catch {
      if (insertedSlug) await deleteSlugIfUnowned(db, link.slug);
      skipped.push(link.slug);
    }

    await deletePendingSlugIfOwned(env, link.slug, guestId);
  }

  await env.PENDING.delete(guestKey(guestId));
  return { migrated, skipped };
}

async function deletePendingSlugIfOwned(env: PendingEnv, slug: string, guestId: string): Promise<void> {
  const pending = await getPendingBySlug(env, slug);
  if (pending?.guestId === guestId) {
    await env.PENDING.delete(slugKey(slug));
  }
}

async function deleteSlugIfUnowned(db: D1SlugLookup, slug: string): Promise<void> {
  const owner = await db
    .prepare('SELECT slug FROM link_accounts WHERE slug = ?')
    .bind(slug)
    .first<{ slug: string }>();
  if (!owner) {
    await db.prepare('DELETE FROM slugs WHERE slug = ?').bind(slug).run();
  }
}
