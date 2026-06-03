import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_COOKIE,
  createPendingLink,
  ensureGuestId,
  getPendingBySlug,
  guestCookie,
  isSlugReserved,
  migratePendingToAccount,
  readGuestId,
} from '../src/pending.ts';

function mockKv(): {
  store: Map<string, string>;
  kv: import('../src/pending.ts').PendingKv;
} {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string, options?: { type: 'json' }) {
      const raw = store.get(key);
      if (raw == null) return null;
      if (options?.type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
  return { store, kv };
}

function mockDb(slugs: Set<string> = new Set()) {
  let linkCount = 0;
  return {
    prepare(query: string) {
      let bound: unknown[] = [];
      const stmt = {
        bind(...values: unknown[]) {
          bound = values;
          return stmt;
        },
        async first<T>(): Promise<T | null> {
          if (query.includes('SELECT slug FROM slugs')) {
            const slug = bound[0] as string;
            return slugs.has(slug) ? ({ slug } as T) : null;
          }
          if (query.includes('COUNT(*)')) {
            return { count: linkCount } as T;
          }
          return null;
        },
        async run() {
          if (query.includes('INSERT INTO slugs')) {
            slugs.add(bound[0] as string);
          }
          if (query.includes('INSERT INTO link_accounts')) {
            linkCount += 1;
          }
        },
      };
      return stmt;
    },
  };
}

test('ensureGuestId issues a cookie when missing', () => {
  const req = new Request('https://openly.test/');
  const { guestId, setCookie } = ensureGuestId(req);
  assert.match(guestId, /^[0-9a-f-]{36}$/i);
  assert.ok(setCookie?.includes(GUEST_COOKIE));
});

test('readGuestId reads cookie set by guestCookie', () => {
  const guestId = '11111111-1111-4111-8111-111111111111';
  const cookie = guestCookie(guestId, 'https://openly.test/');
  const req = new Request('https://openly.test/', { headers: { cookie } });
  assert.equal(readGuestId(req), guestId);
});

test('createPendingLink stores slug until migration', async () => {
  const { kv } = mockKv();
  const slugSet = new Set<string>();
  const db = mockDb(slugSet);
  const env = { PENDING: kv };
  const guestId = crypto.randomUUID();

  const created = await createPendingLink(env, db, guestId, 'hello-world', 'https://example.com');
  assert.equal(created.ok, true);
  assert.equal(await isSlugReserved(env, db, 'hello-world'), true);

  const migrated = await migratePendingToAccount(env, db as never, guestId, 'acct_1', 5);
  assert.deepEqual(migrated.migrated, ['hello-world']);
  assert.ok(slugSet.has('hello-world'));
  assert.equal(await getPendingBySlug(env, 'hello-world'), null);
});