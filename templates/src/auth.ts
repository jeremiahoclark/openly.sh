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

type EmailAddress = string | { email: string; name?: string };

interface EmailMessageBuilder {
  to: string | string[];
  from: EmailAddress;
  subject: string;
  html?: string;
  text?: string;
}

interface SendEmailBinding {
  send(message: EmailMessageBuilder): Promise<unknown>;
}

import type { PendingEnv } from './pending.ts';
import { associateMagicLinkGuest, consumeMagicLinkGuest, migratePendingToAccount } from './pending.ts';

export interface AuthEnv extends PendingEnv {
  OPENLY: D1Database;
  EMAIL?: SendEmailBinding;
  EMAIL_FROM?: string;
  APP_ORIGIN?: string;
}

export type AccountPlan = 'free' | 'pro';

export type Account = {
  id: string;
  email: string;
  plan: AccountPlan;
  pro_until: number | null;
  created_at: number;
  updated_at: number;
};

export type AuthUser = Account & {
  isPro: boolean;
  linkLimit: number;
  planLabel: string;
};

export type MagicLinkRequestResult = {
  email: string;
  sent: boolean;
  devLink: string | null;
};

export const SESSION_COOKIE = 'openly_session';
export const FREE_LINK_LIMIT = 5;
export const PRO_LINK_LIMIT = 1000;
export const PRO_TRIAL_DAYS = 60;

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  if (!email) return null;
  if (email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function isProAccount(account: Pick<Account, 'plan' | 'pro_until'>, now = Date.now()): boolean {
  return account.plan === 'pro' || (typeof account.pro_until === 'number' && account.pro_until > now);
}

export function linkLimitForAccount(account: Pick<Account, 'plan' | 'pro_until'>, now = Date.now()): number {
  return isProAccount(account, now) ? PRO_LINK_LIMIT : FREE_LINK_LIMIT;
}

export function decorateAccount(account: Account, now = Date.now()): AuthUser {
  const isPro = isProAccount(account, now);
  return {
    ...account,
    isPro,
    linkLimit: linkLimitForAccount(account, now),
    planLabel: isPro ? 'Pro' : 'Free',
  };
}

export async function getAuthenticatedUser(request: Request, env: AuthEnv): Promise<AuthUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const tokenHash = await hashToken(token);
  const now = Date.now();
  const account = await env.OPENLY.prepare(
    `SELECT a.id, a.email, a.plan, a.pro_until, a.created_at, a.updated_at
      FROM sessions s
      JOIN accounts a ON a.id = s.account_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(tokenHash, now)
    .first<Account>();

  if (!account) return null;

  await env.OPENLY.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?')
    .bind(now, tokenHash)
    .run();

  return decorateAccount(account, now);
}

export async function requestMagicLink(
  emailInput: string,
  request: Request,
  env: AuthEnv,
  guestId?: string | null,
): Promise<MagicLinkRequestResult> {
  const email = normalizeEmail(emailInput);
  if (!email) throw new AuthError('Enter a valid email address.', 400);

  const now = Date.now();
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = now + MAGIC_LINK_TTL_MS;
  const origin = appOrigin(request, env);
  const verifyUrl = `${origin}/auth/verify?token=${encodeURIComponent(token)}`;

  await env.OPENLY.prepare(
    `INSERT INTO magic_links (token_hash, email, created_at, expires_at, request_ip)
      VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(tokenHash, email, now, expiresAt, request.headers.get('cf-connecting-ip') || '')
    .run();

  if (guestId) {
    await associateMagicLinkGuest(env, tokenHash, guestId);
  }

  await purgeOldAuthRows(env, now);

  if (!env.EMAIL || !env.EMAIL_FROM) {
    return { email, sent: false, devLink: verifyUrl };
  }

  await sendMagicLink(email, verifyUrl, env);
  return { email, sent: true, devLink: null };
}

export async function verifyMagicLinkToken(
  token: string,
  request: Request,
  env: AuthEnv,
): Promise<{ user: AuthUser; setCookie: string; migratedCount: number } | null> {
  if (!token) return null;

  const tokenHash = await hashToken(token);
  const now = Date.now();
  const row = await env.OPENLY.prepare(
    `SELECT token_hash, email, expires_at, consumed_at
      FROM magic_links
      WHERE token_hash = ?`,
  )
    .bind(tokenHash)
    .first<{ token_hash: string; email: string; expires_at: number; consumed_at: number | null }>();

  if (!row || row.consumed_at || row.expires_at <= now) return null;

  await env.OPENLY.prepare('UPDATE magic_links SET consumed_at = ? WHERE token_hash = ?')
    .bind(now, tokenHash)
    .run();

  const account = await upsertAccount(row.email, env, now);
  const guestId = await consumeMagicLinkGuest(env, tokenHash);
  let migratedCount = 0;
  if (guestId) {
    const migrated = await migratePendingToAccount(
      env,
      env.OPENLY,
      guestId,
      account.id,
      linkLimitForAccount(account, now),
    );
    migratedCount = migrated.migrated.length;
  }
  const sessionToken = randomToken();
  const sessionHash = await hashToken(sessionToken);
  const sessionId = crypto.randomUUID();
  const expiresAt = now + SESSION_TTL_MS;

  await env.OPENLY.prepare(
    `INSERT INTO sessions (id, account_id, token_hash, created_at, expires_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(sessionId, account.id, sessionHash, now, expiresAt, now)
    .run();

  return {
    user: decorateAccount(account, now),
    setCookie: sessionCookie(sessionToken, expiresAt, request.url),
    migratedCount,
  };
}

export async function signOut(request: Request, env: AuthEnv): Promise<string> {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    const tokenHash = await hashToken(token);
    await env.OPENLY.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  return clearSessionCookie(request.url);
}

async function upsertAccount(email: string, env: AuthEnv, now: number): Promise<Account> {
  const existing = await env.OPENLY.prepare(
    'SELECT id, email, plan, pro_until, created_at, updated_at FROM accounts WHERE email = ?',
  )
    .bind(email)
    .first<Account>();
  if (existing) return existing;

  const account: Account = {
    id: crypto.randomUUID(),
    email,
    plan: 'free',
    pro_until: now + PRO_TRIAL_DAYS * ONE_DAY_MS,
    created_at: now,
    updated_at: now,
  };

  try {
    await env.OPENLY.prepare(
      `INSERT INTO accounts (id, email, plan, pro_until, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(account.id, account.email, account.plan, account.pro_until, account.created_at, account.updated_at)
      .run();
    return account;
  } catch {
    const raced = await env.OPENLY.prepare(
      'SELECT id, email, plan, pro_until, created_at, updated_at FROM accounts WHERE email = ?',
    )
      .bind(email)
      .first<Account>();
    if (raced) return raced;
    throw new AuthError('Could not create account.', 500);
  }
}

async function sendMagicLink(email: string, verifyUrl: string, env: AuthEnv): Promise<void> {
  if (!env.EMAIL || !env.EMAIL_FROM) {
    throw new AuthError('Email sending is not configured.', 500);
  }

  const from = parseEmailAddress(env.EMAIL_FROM);
  const subject = 'Sign in to Openly';
  const text = [
    'Use this link to sign in to Openly:',
    verifyUrl,
    '',
    'This link expires in 15 minutes. If you did not request it, you can ignore this email.',
  ].join('\n');
  const html = [
    '<p>Use this link to sign in to Openly:</p>',
    `<p><a href="${escapeHtmlAttr(verifyUrl)}">Sign in to Openly</a></p>`,
    '<p>This link expires in 15 minutes. If you did not request it, you can ignore this email.</p>',
  ].join('');

  try {
    await env.EMAIL.send({
      from,
      to: email,
      subject,
      html,
      text,
    });
  } catch (err) {
    throw new AuthError(`Could not send magic link email. ${err instanceof Error ? err.message : String(err)}`, 502);
  }
}

async function purgeOldAuthRows(env: AuthEnv, now: number): Promise<void> {
  const staleMagicLinkCutoff = now - ONE_DAY_MS;
  await env.OPENLY.prepare('DELETE FROM magic_links WHERE expires_at < ? OR consumed_at < ?')
    .bind(now, staleMagicLinkCutoff)
    .run();
  await env.OPENLY.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
}

function appOrigin(request: Request, env: AuthEnv): string {
  if (env.APP_ORIGIN) return env.APP_ORIGIN.replace(/\/+$/, '');
  return new URL(request.url).origin;
}

function parseEmailAddress(input: string): EmailAddress {
  const match = input.match(/^\s*(.+?)\s*<([^>]+)>\s*$/);
  if (!match) return input.trim();
  return { name: match[1].replace(/^"|"$/g, '').trim(), email: match[2].trim() };
}

function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
}

function sessionCookie(token: string, expiresAt: number, requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function clearSessionCookie(requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function escapeHtmlAttr(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
