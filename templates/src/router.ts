import { validateSlug, validateUrl } from './slug.ts';
import { isPrefetch } from './prefetch.ts';
import { renderDashboard } from './dashboard.ts';
import { parseUA } from './ua.ts';
import { alpha2ToNumeric } from './countryCodes.ts';

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

export interface Env {
  OPENLY: D1Database;
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

  // Canonical short redirect path.
  if (url.pathname.startsWith('/l/')) {
    const slug = url.pathname.slice(3);
    if (!slug || slug.includes('/')) return new Response('Not found', { status: 404 });
    return handleRedirect(slug, request, env, ctx);
  }

  const path = url.pathname;

  if (path === '/api/slugs') {
    if (request.method === 'POST') return apiCreateSlug(request, env);
    if (request.method === 'GET') return apiListSlugs(env);
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, POST' } });
  }

  if (path === '/api/check') {
    return apiCheckSlug(url, env);
  }

  if (path === '/' || path === '') {
    const slugFilter = url.searchParams.get('slug') || null;
    return renderDashboardResponse(request, env, slugFilter);
  }

  // Root-level alias: /:slug → redirect.
  const slug = path.slice(1);
  if (!slug || slug.includes('/')) {
    return new Response('Not found', { status: 404 });
  }
  return handleRedirect(slug, request, env, ctx);
}

async function apiCheckSlug(url: URL, env: Env): Promise<Response> {
  const raw = url.searchParams.get('slug') ?? '';
  const validation = validateSlug(raw);
  if (!validation.ok) {
    return Response.json({ available: false, normalized: null, reason: validation.reason });
  }
  const existing = await env.OPENLY.prepare('SELECT slug FROM slugs WHERE slug = ?')
    .bind(validation.slug)
    .first<{ slug: string }>();
  if (existing) {
    return Response.json({
      available: false,
      normalized: validation.slug,
      reason: 'Slug is already taken.',
    });
  }
  return Response.json({ available: true, normalized: validation.slug });
}

async function apiCreateSlug(request: Request, env: Env): Promise<Response> {
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

  const existing = await env.OPENLY.prepare('SELECT slug FROM slugs WHERE slug = ?')
    .bind(slugCheck.slug)
    .first<{ slug: string }>();
  if (existing) return jsonError(`Slug "${slugCheck.slug}" already exists.`, 409);

  await env.OPENLY.prepare('INSERT INTO slugs (slug, url, created_at) VALUES (?, ?, ?)')
    .bind(slugCheck.slug, urlCheck.url, Date.now())
    .run();

  if (contentType.includes('application/json')) {
    return Response.json(
      { ok: true, slug: slugCheck.slug, url: urlCheck.url },
      { status: 201 },
    );
  }
  return Response.redirect(new URL('/', request.url).toString(), 303);
}

async function apiListSlugs(env: Env): Promise<Response> {
  const rows = await listSlugsWithStats(env);
  return Response.json({ slugs: rows });
}

async function listSlugsWithStats(env: Env): Promise<SlugWithStats[]> {
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
      FROM slugs s
      ORDER BY s.created_at DESC`,
  ).all<SlugWithStats>();
  return results;
}

async function renderDashboardResponse(
  request: Request,
  env: Env,
  slugFilter: string | null,
): Promise<Response> {
  const rows = await listSlugsWithStats(env);
  const validSlugFilter = slugFilter && rows.some((r) => r.slug === slugFilter) ? slugFilter : null;
  const stats = await loadStats(env, validSlugFilter);
  const origin = new URL(request.url).origin;
  const html = renderDashboard(rows, validSlugFilter, stats, origin);
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
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

async function loadStats(env: Env, slugFilter: string | null): Promise<DashboardStats> {
  const now = Date.now();
  const timeSeriesCutoff = now - TIME_SERIES_DAYS * ONE_DAY_MS;

  const slugClause = slugFilter ? 'AND slug = ?' : '';
  const baseParams: unknown[] = slugFilter ? [slugFilter] : [];

  const timeSeriesRows = await env.OPENLY.prepare(
    `SELECT
        date(ts / 1000, 'unixepoch') AS day,
        COUNT(DISTINCT ip) AS count
      FROM clicks
      WHERE is_prefetch = 0 AND ts >= ? ${slugClause}
      GROUP BY day
      ORDER BY day`,
  )
    .bind(timeSeriesCutoff, ...baseParams)
    .all<{ day: string; count: number }>();

  const countryRows = await env.OPENLY.prepare(
    `SELECT
        COALESCE(NULLIF(country, ''), 'Unknown') AS code,
        COUNT(DISTINCT ip) AS count
      FROM clicks
      WHERE is_prefetch = 0 ${slugClause}
      GROUP BY code
      ORDER BY count DESC`,
  )
    .bind(...baseParams)
    .all<{ code: string; count: number }>();

  const uaRows = await env.OPENLY.prepare(
    `SELECT ip, MAX(ua) AS ua
      FROM clicks
      WHERE is_prefetch = 0 ${slugClause}
      GROUP BY ip
      LIMIT ?`,
  )
    .bind(...baseParams, UA_SAMPLE_LIMIT)
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
  const row = await env.OPENLY.prepare('SELECT url FROM slugs WHERE slug = ?')
    .bind(slug)
    .first<{ url: string }>();

  if (!row) return new Response('Slug not found', { status: 404 });

  ctx.waitUntil(logClick(slug, request, env));

  return Response.redirect(row.url, 302);
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
