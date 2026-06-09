import { validateSlug, validateUrl } from './slug.ts';
import { isPrefetch } from './prefetch.ts';
import { renderDashboard, renderMagicLinkSent, renderSignIn } from './dashboard.ts';
import { renderLanding, renderPendingGate } from './landing.ts';
import {
  createPendingLink,
  ensureGuestId,
  getPendingBySlug,
  isSlugReserved,
  listPendingForGuest,
  readGuestId,
  updatePendingLinkUrl,
} from './pending.ts';
import { parseUA } from './ua.ts';
import { alpha2ToNumeric } from './countryCodes.ts';
import { ensureSchema } from './schema.ts';
import { renderFaviconSvg, renderOgCardSvg } from './assets.ts';
import {
  AuthError,
  FREE_LINK_LIMIT,
  getAuthenticatedUser,
  requestMagicLink,
  signOut,
  verifyMagicLinkToken,
  type AuthUser,
} from './auth.ts';

type D1Result<T = unknown> = { results: T[]; success: boolean };

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

import type { PendingEnv } from './pending.ts';

export interface Env extends PendingEnv {
  OPENLY: D1Database;
  EMAIL?: {
    send(message: unknown): Promise<unknown>;
  };
  EMAIL_FROM?: string;
  APP_ORIGIN?: string;
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

type SlugRow = { slug: string; url: string; created_at: number };
type SlugWithStats = SlugRow & { clicks: number };

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContextLike,
): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/favicon.svg' || url.pathname === '/favicon.ico') {
    return svgResponse(renderFaviconSvg(), 31536000);
  }

  if (url.pathname === '/og-card.svg') {
    return svgResponse(renderOgCardSvg(url.origin), 86400);
  }

  await ensureSchema(env);

  // Canonical short redirect path.
  if (url.pathname.startsWith('/l/')) {
    const slug = url.pathname.slice(3);
    if (!slug || slug.includes('/')) return new Response('Not found', { status: 404 });
    return handleRedirect(slug, request, env, ctx);
  }

  const path = url.pathname;

  if (path === '/signin') {
    const user = await getAuthenticatedUser(request, env);
    if (user) return redirectResponse(new URL('/', request.url).toString());
    const html = renderSignIn({
      origin: url.origin,
      email: url.searchParams.get('email') || '',
      message: url.searchParams.get('message') || '',
      error: url.searchParams.get('error') || '',
    });
    return htmlResponse(html);
  }

  if (path === '/auth/magic-link') {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }
    return authRequestMagicLink(request, env);
  }

  if (path === '/auth/verify') {
    return authVerifyMagicLink(url, request, env);
  }

  if (path === '/auth/logout') {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }
    return authLogout(request, env);
  }

  if (path === '/api/check') {
    const user = await getAuthenticatedUser(request, env);
    return apiCheckSlug(url, env, user);
  }

  if (path === '/api/pending') {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }
    const authed = await getAuthenticatedUser(request, env);
    if (authed) return jsonError('Already signed in. Use the dashboard to create links.', 400);
    return apiCreatePending(request, env);
  }

  const pendingSlugMatch = path.match(/^\/api\/pending\/([^/]+)$/);
  if (pendingSlugMatch) {
    if (request.method !== 'PATCH') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'PATCH' } });
    }
    const authed = await getAuthenticatedUser(request, env);
    if (authed) return jsonError('Already signed in. Use the dashboard to edit links.', 400);
    return apiUpdatePending(pendingSlugMatch[1], request, env);
  }

  const user = await getAuthenticatedUser(request, env);
  if (!user) {
    if (path.startsWith('/api/')) return jsonError('Sign in required.', 401);
    if (path === '/' || path === '') return renderLandingResponse(request, env, url);
  }

  if (path === '/api/slugs') {
    if (request.method === 'POST') return apiCreateSlug(request, env, user!);
    if (request.method === 'GET') return apiListSlugs(env, user!);
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, POST' } });
  }

  const archiveMatch = path.match(/^\/api\/slugs\/([^/]+)\/archive$/);
  if (archiveMatch) {
    if (request.method === 'POST') return apiArchiveSlug(archiveMatch[1], request, env, user!);
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  if (path === '/' || path === '') {
    const slugFilter = url.searchParams.get('slug') || null;
    return renderDashboardResponse(request, env, user!, slugFilter);
  }

  // Root-level alias: /:slug → redirect.
  const slug = path.slice(1);
  if (!slug || slug.includes('/')) {
    return new Response('Not found', { status: 404 });
  }
  return handleRedirect(slug, request, env, ctx);
}

async function authRequestMagicLink(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get('content-type') || '';
  let emailInput = '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as { email?: string };
      emailInput = body.email ?? '';
    } catch {
      return jsonError('Invalid JSON body.', 400);
    }
  } else {
    const form = await request.formData();
    emailInput = String(form.get('email') ?? '');
  }

  try {
    const guestId = readGuestId(request);
    const result = await requestMagicLink(emailInput, request, env, guestId);
    if (contentType.includes('application/json')) {
      return Response.json({ ok: true, email: result.email, sent: result.sent, devLink: result.devLink });
    }
    return htmlResponse(renderMagicLinkSent(result));
  } catch (err) {
    if (err instanceof AuthError) {
      if (contentType.includes('application/json')) return jsonError(err.message, err.status);
      return htmlResponse(renderSignIn({ origin: new URL(request.url).origin, error: err.message }), err.status);
    }
    throw err;
  }
}

async function authVerifyMagicLink(url: URL, request: Request, env: Env): Promise<Response> {
  const verified = await verifyMagicLinkToken(url.searchParams.get('token') || '', request, env);
  if (!verified) {
    return htmlResponse(
      renderSignIn({
        origin: url.origin,
        error: 'That sign-in link is invalid or expired. Request a new one.',
      }),
      400,
    );
  }
  const welcomeUrl = new URL('/', request.url);
  welcomeUrl.searchParams.set('welcome', '1');
  if (verified.migratedCount > 0) {
    welcomeUrl.searchParams.set('migrated', String(verified.migratedCount));
  }
  return redirectResponse(welcomeUrl.toString(), 303, { 'Set-Cookie': verified.setCookie });
}

async function authLogout(request: Request, env: Env): Promise<Response> {
  const clearCookie = await signOut(request, env);
  return redirectResponse(new URL('/signin?message=Signed%20out.', request.url).toString(), 303, {
    'Set-Cookie': clearCookie,
  });
}

async function apiCheckSlug(url: URL, env: Env, user: AuthUser | null): Promise<Response> {
  if (user) {
    const activeCount = await countActiveSlugs(env, user.id);
    if (activeCount >= user.linkLimit) {
      return Response.json({
        available: false,
        normalized: null,
        reason: user.isPro
          ? `Your Pro access can track ${user.linkLimit} active links at a time.`
          : `Free accounts can track ${FREE_LINK_LIMIT} links at a time. Pro is included free for a limited time on new accounts.`,
        limit: user.linkLimit,
        activeCount,
      });
    }
  }

  const raw = url.searchParams.get('slug') ?? '';
  const validation = validateSlug(raw);
  if (!validation.ok) {
    return Response.json({ available: false, normalized: null, reason: validation.reason });
  }
  if (await isSlugReserved(env, env.OPENLY, validation.slug)) {
    return Response.json({
      available: false,
      normalized: validation.slug,
      reason: 'Slug is already taken.',
    });
  }
  return Response.json({ available: true, normalized: validation.slug });
}

async function apiCreatePending(request: Request, env: Env): Promise<Response> {
  let slugInput = '';
  let urlInput = '';
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as { slug?: string; url?: string };
      slugInput = body.slug ?? '';
      urlInput = body.url ?? '';
    } catch {
      return jsonError('Invalid JSON body.', 400);
    }
  } else {
    const form = await request.formData();
    slugInput = String(form.get('slug') ?? '');
    urlInput = String(form.get('url') ?? '');
  }

  const slugCheck = validateSlug(slugInput);
  if (!slugCheck.ok) return jsonError(slugCheck.reason, 400);
  const urlCheck = validateUrl(urlInput);
  if (!urlCheck.ok) return jsonError(urlCheck.reason, 400);

  const { guestId, setCookie } = ensureGuestId(request);
  const created = await createPendingLink(env, env.OPENLY, guestId, slugCheck.slug, urlCheck.url);
  if (!created.ok) return jsonError(created.reason, 409);

  const headers: Record<string, string> = {};
  if (setCookie) headers['Set-Cookie'] = setCookie;

  if (contentType.includes('application/json')) {
    return Response.json(
      { ok: true, slug: created.link.slug, url: created.link.url, pending: true },
      { status: 201, headers },
    );
  }

  const location = new URL(`/?created=${encodeURIComponent(created.link.slug)}`, request.url).toString();
  return redirectResponse(location, 303, headers);
}

async function apiUpdatePending(slug: string, request: Request, env: Env): Promise<Response> {
  const guestId = readGuestId(request);
  if (!guestId) return jsonError('Session expired. Create the link again.', 401);

  let urlInput = '';
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as { url?: string };
      urlInput = body.url ?? '';
    } catch {
      return jsonError('Invalid JSON body.', 400);
    }
  } else {
    const form = await request.formData();
    urlInput = String(form.get('url') ?? '');
  }

  const urlCheck = validateUrl(urlInput);
  if (!urlCheck.ok) return jsonError(urlCheck.reason, 400);

  const updated = await updatePendingLinkUrl(env, guestId, slug, urlCheck.url);
  if (!updated.ok) return jsonError(updated.reason, 404);

  return Response.json({ ok: true, slug: updated.link.slug, url: updated.link.url });
}

async function renderLandingResponse(request: Request, env: Env, url: URL): Promise<Response> {
  const origin = url.origin;
  const error = url.searchParams.get('error') || undefined;
  const welcome = url.searchParams.get('welcome') === '1';
  const migratedRaw = url.searchParams.get('migrated');
  const migratedCount = migratedRaw ? parseInt(migratedRaw, 10) : undefined;

  const guestId = readGuestId(request);
  const reserved = guestId ? await listPendingForGuest(env, guestId) : [];

  const createdSlug = url.searchParams.get('created');
  let created = createdSlug ? await getPendingBySlug(env, createdSlug) : null;
  if (created && guestId && created.guestId !== guestId) created = null;

  return htmlResponse(
    renderLanding({
      origin,
      error,
      created,
      reserved: created ? reserved : reserved,
      welcome,
      migratedCount: Number.isFinite(migratedCount) ? migratedCount : undefined,
    }),
  );
}

async function apiCreateSlug(request: Request, env: Env, user: AuthUser): Promise<Response> {
  let slugInput = '';
  let urlInput = '';

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as { slug?: string; url?: string };
      slugInput = body.slug ?? '';
      urlInput = body.url ?? '';
    } catch {
      return jsonError('Invalid JSON body.', 400);
    }
  } else {
    const form = await request.formData();
    slugInput = String(form.get('slug') ?? '');
    urlInput = String(form.get('url') ?? '');
  }

  const slugCheck = validateSlug(slugInput);
  if (!slugCheck.ok) return jsonError(slugCheck.reason, 400);

  const urlCheck = validateUrl(urlInput);
  if (!urlCheck.ok) return jsonError(urlCheck.reason, 400);

  const activeCount = await countActiveSlugs(env, user.id);
  if (activeCount >= user.linkLimit) {
    return jsonError(
      `You can track ${user.linkLimit} active links on your current plan. Pro is included free for a limited time; billing will unlock more later.`,
      402,
    );
  }

  const existing = await env.OPENLY.prepare('SELECT slug FROM slugs WHERE slug = ?')
    .bind(slugCheck.slug)
    .first<{ slug: string }>();
  if (existing) return jsonError(`Slug "${slugCheck.slug}" already exists.`, 409);

  const now = Date.now();
  try {
    await env.OPENLY.prepare('INSERT INTO slugs (slug, url, created_at) VALUES (?, ?, ?)')
      .bind(slugCheck.slug, urlCheck.url, now)
      .run();
  } catch {
    return jsonError(`Slug "${slugCheck.slug}" already exists.`, 409);
  }
  try {
    await env.OPENLY.prepare(
      'INSERT INTO link_accounts (slug, account_id, archived_at, created_at) VALUES (?, ?, NULL, ?)',
    )
      .bind(slugCheck.slug, user.id, now)
      .run();
  } catch (err) {
    await deleteSlugIfUnowned(env, slugCheck.slug);
    throw err;
  }

  if (contentType.includes('application/json')) {
    return Response.json(
      { ok: true, slug: slugCheck.slug, url: urlCheck.url },
      { status: 201 },
    );
  }
  return redirectResponse(new URL('/', request.url).toString());
}

async function apiListSlugs(env: Env, user: AuthUser): Promise<Response> {
  const rows = await listSlugsWithStats(env, user.id);
  return Response.json({ slugs: rows });
}

async function apiArchiveSlug(
  slug: string,
  request: Request,
  env: Env,
  user: AuthUser,
): Promise<Response> {
  const contentType = request.headers.get('content-type') || '';
  await env.OPENLY.prepare(
    'UPDATE link_accounts SET archived_at = ? WHERE slug = ? AND account_id = ? AND archived_at IS NULL',
  )
    .bind(Date.now(), slug, user.id)
    .run();

  if (contentType.includes('application/json')) return Response.json({ ok: true, slug });
  return redirectResponse(new URL('/', request.url).toString());
}

async function countActiveSlugs(env: Env, accountId: string): Promise<number> {
  const row = await env.OPENLY.prepare(
    'SELECT COUNT(*) AS count FROM link_accounts WHERE account_id = ? AND archived_at IS NULL',
  )
    .bind(accountId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function deleteSlugIfUnowned(env: Env, slug: string): Promise<void> {
  const owner = await env.OPENLY.prepare('SELECT slug FROM link_accounts WHERE slug = ?')
    .bind(slug)
    .first<{ slug: string }>();
  if (!owner) {
    await env.OPENLY.prepare('DELETE FROM slugs WHERE slug = ?').bind(slug).run();
  }
}

async function listSlugsWithStats(env: Env, accountId: string): Promise<SlugWithStats[]> {
  const { results } = await env.OPENLY.prepare(
    `SELECT
        s.slug,
        s.url,
        s.created_at,
        (
          SELECT COUNT(DISTINCT ip)
          FROM clicks
          WHERE clicks.slug = s.slug
            AND clicks.is_prefetch = 0
        ) AS clicks
      FROM link_accounts la
      JOIN slugs s ON s.slug = la.slug
      WHERE la.account_id = ? AND la.archived_at IS NULL
      ORDER BY la.created_at DESC`,
  )
    .bind(accountId)
    .all<SlugWithStats>();
  return results;
}

async function renderDashboardResponse(
  request: Request,
  env: Env,
  user: AuthUser,
  slugFilter: string | null,
): Promise<Response> {
  const pageUrl = new URL(request.url);
  const rows = await listSlugsWithStats(env, user.id);
  const validSlugFilter = slugFilter && rows.some((r) => r.slug === slugFilter) ? slugFilter : null;
  const stats = await loadStats(env, user.id, validSlugFilter);
  const origin = pageUrl.origin;
  const welcomeMessage =
    pageUrl.searchParams.get('welcome') === '1'
      ? buildWelcomeMessage(pageUrl.searchParams.get('migrated'))
      : undefined;
  const html = renderDashboard(rows, validSlugFilter, stats, origin, user, welcomeMessage);
  return htmlResponse(html);
}

function buildWelcomeMessage(migratedRaw: string | null): string {
  const n = migratedRaw ? parseInt(migratedRaw, 10) : 0;
  if (Number.isFinite(n) && n > 0) {
    return `Welcome. ${n} reserved link${n === 1 ? '' : 's'} ${n === 1 ? 'is' : 'are'} now live.`;
  }
  return 'Welcome. Your account is ready.';
}

export type StatsBucket = { label: string; count: number };
export type DayBucket = { day: string; count: number };
export type CountryGeo = { code: string; name: string; numeric: number | null; count: number };
export type DashboardStats = {
  totalClicks: number;
  timeSeries: DayBucket[];
  topCountries: StatsBucket[];
  countriesGeo: CountryGeo[];
  devices: StatsBucket[];
  operatingSystems: StatsBucket[];
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TIME_SERIES_DAYS = 30;
const UA_SAMPLE_LIMIT = 5000;

async function loadStats(env: Env, accountId: string, slugFilter: string | null): Promise<DashboardStats> {
  const now = Date.now();
  const timeSeriesCutoff = now - TIME_SERIES_DAYS * ONE_DAY_MS;

  const slugClause = slugFilter ? 'AND c.slug = ?' : '';
  const baseParams: unknown[] = slugFilter ? [slugFilter] : [];

  const timeSeriesRows = await env.OPENLY.prepare(
    `SELECT
        date(c.ts / 1000, 'unixepoch') AS day,
        COUNT(DISTINCT c.ip) AS count
      FROM clicks c
      JOIN link_accounts la ON la.slug = c.slug
      WHERE c.is_prefetch = 0
        AND c.ts >= ?
        AND la.account_id = ?
        AND la.archived_at IS NULL
        ${slugClause}
      GROUP BY day
      ORDER BY day`,
  )
    .bind(timeSeriesCutoff, accountId, ...baseParams)
    .all<{ day: string; count: number }>();

  const countryRows = await env.OPENLY.prepare(
    `SELECT
        COALESCE(NULLIF(c.country, ''), 'Unknown') AS code,
        COUNT(DISTINCT c.ip) AS count
      FROM clicks c
      JOIN link_accounts la ON la.slug = c.slug
      WHERE c.is_prefetch = 0
        AND la.account_id = ?
        AND la.archived_at IS NULL
        ${slugClause}
      GROUP BY code
      ORDER BY count DESC`,
  )
    .bind(accountId, ...baseParams)
    .all<{ code: string; count: number }>();

  const uaRows = await env.OPENLY.prepare(
    `SELECT c.ip, MAX(c.ua) AS ua
      FROM clicks c
      JOIN link_accounts la ON la.slug = c.slug
      WHERE c.is_prefetch = 0
        AND la.account_id = ?
        AND la.archived_at IS NULL
        ${slugClause}
      GROUP BY c.ip
      LIMIT ?`,
  )
    .bind(accountId, ...baseParams, UA_SAMPLE_LIMIT)
    .all<{ ip: string; ua: string | null }>();

  const devices = bucketBy(uaRows.results, (r) => parseUA(r.ua).device);
  const operatingSystems = bucketBy(uaRows.results, (r) => parseUA(r.ua).os);

  const countriesGeo: CountryGeo[] = countryRows.results.map((r) => ({
    code: r.code,
    name: friendlyCountryName(r.code),
    numeric: r.code === 'Unknown' ? null : alpha2ToNumeric(r.code),
    count: r.count,
  }));
  const topCountries: StatsBucket[] = countriesGeo
    .slice(0, 10)
    .map((c) => ({ label: c.code === 'Unknown' ? 'Unknown' : `${c.name} (${c.code})`, count: c.count }));

  return {
    totalClicks: uaRows.results.length,
    timeSeries: fillTimeSeries(timeSeriesRows.results, now, TIME_SERIES_DAYS),
    topCountries,
    countriesGeo,
    devices,
    operatingSystems,
  };
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', AU: 'Australia',
  DE: 'Germany', FR: 'France', NL: 'Netherlands', IE: 'Ireland', IN: 'India',
  BR: 'Brazil', MX: 'Mexico', ES: 'Spain', IT: 'Italy', JP: 'Japan',
  CN: 'China', SG: 'Singapore', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
  FI: 'Finland', CH: 'Switzerland', AT: 'Austria', BE: 'Belgium', PL: 'Poland',
  PT: 'Portugal', NZ: 'New Zealand', ZA: 'South Africa', AE: 'UAE',
  IL: 'Israel', TR: 'Turkey', RU: 'Russia', UA: 'Ukraine', AR: 'Argentina',
  CL: 'Chile', CO: 'Colombia', PE: 'Peru', PH: 'Philippines', ID: 'Indonesia',
  TH: 'Thailand', VN: 'Vietnam', MY: 'Malaysia', KR: 'South Korea', TW: 'Taiwan',
  HK: 'Hong Kong',
};

function friendlyCountryName(code: string): string {
  if (code === 'Unknown') return 'Unknown';
  return COUNTRY_NAMES[code] ?? code;
}

function bucketBy<T>(items: T[], key: (item: T) => string): StatsBucket[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function fillTimeSeries(rows: { day: string; count: number }[], now: number, days: number): DayBucket[] {
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  const out: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * ONE_DAY_MS);
    const day = d.toISOString().slice(0, 10);
    out.push({ day, count: byDay.get(day) ?? 0 });
  }
  return out;
}

async function handleRedirect(
  slug: string,
  request: Request,
  env: Env,
  ctx: ExecutionContextLike,
): Promise<Response> {
  const row = await env.OPENLY.prepare(
    `SELECT s.url
      FROM slugs s
      JOIN link_accounts la ON la.slug = s.slug
      WHERE s.slug = ? AND la.archived_at IS NULL`,
  )
    .bind(slug)
    .first<{ url: string }>();

  if (row) {
    ctx.waitUntil(logClick(slug, request, env));
    return Response.redirect(row.url, 302);
  }

  const pending = await getPendingBySlug(env, slug);
  if (pending) {
    const origin = new URL(request.url).origin;
    return htmlResponse(renderPendingGate({ origin, slug: pending.slug, url: pending.url }));
  }

  return new Response('Slug not found', { status: 404 });
}

async function logClick(slug: string, request: Request, env: Env): Promise<void> {
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf ?? {};
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = request.headers.get('user-agent') || '';
  const asn = (cf.asn as number | string | undefined) ?? null;
  const asOrg = (cf.asOrganization as string | undefined) ?? null;
  const country = (cf.country as string | undefined) ?? null;
  const city = (cf.city as string | undefined) ?? null;
  const region = (cf.region as string | undefined) ?? null;
  const timezone = (cf.timezone as string | undefined) ?? null;

  const prefetch = isPrefetch({ asn, asOrg, userAgent: ua }) ? 1 : 0;

  try {
    await env.OPENLY.prepare(
      `INSERT INTO clicks
        (slug, ts, ip, ua, country, city, region, timezone, asn, as_org, is_prefetch)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        slug,
        Date.now(),
        ip,
        ua,
        country,
        city,
        region,
        timezone,
        typeof asn === 'string' ? parseInt(asn, 10) || null : asn,
        asOrg,
        prefetch,
      )
      .run();
  } catch {
    // Never let logging break a redirect.
  }
}

function jsonError(message: string, status: number): Response {
  return Response.json({ ok: false, error: message }, { status });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function redirectResponse(location: string, status = 303, headers: Record<string, string> = {}): Response {
  return new Response(null, {
    status,
    headers: { ...headers, Location: location },
  });
}

function svgResponse(svg: string, maxAge: number): Response {
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}`,
    },
  });
}
