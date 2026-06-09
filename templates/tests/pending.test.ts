import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_COOKIE,
  createPendingLink,
  ensureGuestId,
  getPendingBySlug,
  guestCookie,
  isSlugReserved,
  listPendingForGuest,
  migratePendingToAccount,
  readGuestId,
  updatePendingLinkUrl,
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

function mockDb(options: {
  slugs?: Iterable<string>;
  owners?: Iterable<[string, string]>;
  failOwnerInsert?: Iterable<string>;
} = {}) {
  const slugs = new Set(options.slugs ?? []);
  const owners = new Map(options.owners ?? []);
  const failOwnerInsert = new Set(options.failOwnerInsert ?? []);
  const db = {
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
          if (query.includes('SELECT slug FROM link_accounts')) {
            const slug = bound[0] as string;
            return owners.has(slug) ? ({ slug } as T) : null;
          }
          if (query.includes('COUNT(*)')) {
            const accountId = bound[0] as string;
            let count = 0;
            for (const owner of owners.values()) {
              if (owner === accountId) count += 1;
            }
            return { count } as T;
          }
          return null;
        },
        async run() {
          if (query.includes('INSERT INTO slugs')) {
            slugs.add(bound[0] as string);
          }
          if (query.includes('INSERT INTO link_accounts')) {
            const slug = bound[0] as string;
            if (owners.has(slug) || failOwnerInsert.has(slug)) {
              throw new Error('owner insert failed');
            }
            owners.set(slug, bound[1] as string);
          }
          if (query.includes('DELETE FROM slugs')) {
            slugs.delete(bound[0] as string);
          }
        },
      };
      return stmt;
    },
  };
  return { db, slugs, owners };
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
  const { db, slugs, owners } = mockDb();
  const env = { PENDING: kv };
  const guestId = crypto.randomUUID();

  const created = await createPendingLink(env, db, guestId, 'hello-world', 'https://example.com');
  assert.equal(created.ok, true);
  assert.equal(await isSlugReserved(env, db, 'hello-world'), true);

  const migrated = await migratePendingToAccount(env, db as never, guestId, 'acct_1', 5);
  assert.deepEqual(migrated.migrated, ['hello-world']);
  assert.ok(slugs.has('hello-world'));
  assert.equal(owners.get('hello-world'), 'acct_1');
  assert.equal(await getPendingBySlug(env, 'hello-world'), null);
});

test('updatePendingLinkUrl allows http destination', async () => {
  const { kv } = mockKv();
  const { db } = mockDb();
  const env = { PENDING: kv };
  const guestId = crypto.randomUUID();

  await createPendingLink(env, db, guestId, 'http-link', 'https://example.com');
  const updated = await updatePendingLinkUrl(env, guestId, 'http-link', 'http://insecure.example/path');
  assert.equal(updated.ok, true);
  if (updated.ok) assert.equal(updated.link.url, 'http://insecure.example/path');

  const stored = await getPendingBySlug(env, 'http-link');
  assert.equal(stored?.url, 'http://insecure.example/path');
});

test('listPendingForGuest ignores stale slug records owned by another guest', async () => {
  const { store, kv } = mockKv();
  const env = { PENDING: kv };
  const guestA = crypto.randomUUID();
  const guestB = crypto.randomUUID();

  store.set(`guest:${guestA}`, JSON.stringify(['shared']));
  store.set(
    'slug:shared',
    JSON.stringify({
      slug: 'shared',
      url: 'https://example.com',
      guestId: guestB,
      createdAt: Date.now(),
    }),
  );

  assert.deepEqual(await listPendingForGuest(env, guestA), []);
});

test('migratePendingToAccount clears own pending link when account is already at limit', async () => {
  const { kv } = mockKv();
  const { db } = mockDb();
  const env = { PENDING: kv };
  const guestId = crypto.randomUUID();

  await createPendingLink(env, db, guestId, 'limit-hit', 'https://example.com');
  const migrated = await migratePendingToAccount(env, db as never, guestId, 'acct_1', 0);

  assert.deepEqual(migrated, { migrated: [], skipped: ['limit-hit'] });
  assert.equal(await getPendingBySlug(env, 'limit-hit'), null);
});

test('migratePendingToAccount removes inserted slug when owner insert fails', async () => {
  const { kv } = mockKv();
  const { db, slugs, owners } = mockDb({ failOwnerInsert: ['broken-owner'] });
  const env = { PENDING: kv };
  const guestId = crypto.randomUUID();

  await createPendingLink(env, db, guestId, 'broken-owner', 'https://example.com');
  const migrated = await migratePendingToAccount(env, db as never, guestId, 'acct_1', 5);

  assert.deepEqual(migrated, { migrated: [], skipped: ['broken-owner'] });
  assert.equal(slugs.has('broken-owner'), false);
  assert.equal(owners.has('broken-owner'), false);
  assert.equal(await getPendingBySlug(env, 'broken-owner'), null);
});

test('migratePendingToAccount preserves slug already owned by another account', async () => {
  const { store, kv } = mockKv();
  const { db, slugs, owners } = mockDb({
    slugs: ['taken'],
    owners: [['taken', 'acct_other']],
  });
  const env = { PENDING: kv };
  const guestId = crypto.randomUUID();

  store.set(`guest:${guestId}`, JSON.stringify(['taken']));
  store.set(
    'slug:taken',
    JSON.stringify({
      slug: 'taken',
      url: 'https://example.com',
      guestId,
      createdAt: Date.now(),
    }),
  );

  const migrated = await migratePendingToAccount(env, db as never, guestId, 'acct_1', 5);

  assert.deepEqual(migrated, { migrated: [], skipped: ['taken'] });
  assert.equal(slugs.has('taken'), true);
  assert.equal(owners.get('taken'), 'acct_other');
  assert.equal(await getPendingBySlug(env, 'taken'), null);
});

test('migratePendingToAccount does not claim an unowned D1 slug row', async () => {
  const { store, kv } = mockKv();
  const { db, slugs, owners } = mockDb({ slugs: ['orphan'] });
  const env = { PENDING: kv };
  const guestId = crypto.randomUUID();

  store.set(`guest:${guestId}`, JSON.stringify(['orphan']));
  store.set(
    'slug:orphan',
    JSON.stringify({
      slug: 'orphan',
      url: 'https://example.com',
      guestId,
      createdAt: Date.now(),
    }),
  );

  const migrated = await migratePendingToAccount(env, db as never, guestId, 'acct_1', 5);

  assert.deepEqual(migrated, { migrated: [], skipped: ['orphan'] });
  assert.equal(slugs.has('orphan'), true);
  assert.equal(owners.has('orphan'), false);
  assert.equal(await getPendingBySlug(env, 'orphan'), null);
});
