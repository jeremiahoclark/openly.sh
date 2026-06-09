import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, type Env } from '../src/router.ts';

function mockKv(): import('../src/pending.ts').PendingKv {
  const store = new Map<string, string>();
  return {
    async get(key: string, options?: { type: 'json' }) {
      const raw = store.get(key);
      if (raw == null) return null;
      return options?.type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

function mockD1(): Env['OPENLY'] {
  const slugs = new Map<string, { url: string; archived: boolean }>();

  return {
    prepare(query: string) {
      let bound: unknown[] = [];
      const statement = {
        bind(...values: unknown[]) {
          bound = values;
          return statement;
        },
        async run() {
          if (query.includes('INSERT INTO slugs')) {
            slugs.set(String(bound[0]), { url: String(bound[1]), archived: false });
          }
          if (query.includes('UPDATE link_accounts SET archived_at')) {
            const slug = String(bound[1]);
            const row = slugs.get(slug);
            if (row) row.archived = true;
          }
          return { success: true };
        },
        async first<T>() {
          if (query.includes('SELECT slug FROM slugs')) {
            const slug = String(bound[0]);
            return slugs.has(slug) ? ({ slug } as T) : null;
          }
          if (query.includes('SELECT s.url')) {
            const slug = String(bound[0]);
            const row = slugs.get(slug);
            return row && !row.archived ? ({ url: row.url } as T) : null;
          }
          return null;
        },
        async all<T>() {
          return { results: [] as T[], success: true };
        },
      };
      return statement;
    },
  };
}

function env(): Env {
  return { OPENLY: mockD1(), PENDING: mockKv() };
}

function ctx() {
  return { waitUntil() {} };
}

test('guest can reserve first link from the landing form', async () => {
  const appEnv = env();
  const slug = `first-${Date.now()}`;
  const body = new URLSearchParams({ slug, url: 'company.com' });

  const created = await handleRequest(
    new Request('http://openly.test/api/pending', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    }),
    appEnv,
    ctx(),
  );

  assert.equal(created.status, 303);
  assert.equal(created.headers.get('location'), `http://openly.test/?created=${slug}`);
  const cookie = created.headers.get('set-cookie');
  assert.match(cookie ?? '', /openly_guest=/);

  const landing = await handleRequest(
    new Request(`http://openly.test/?created=${slug}`, { headers: { cookie: cookie ?? '' } }),
    appEnv,
    ctx(),
  );
  const html = await landing.text();

  assert.equal(landing.status, 200);
  assert.match(html, /Link reserved/);
  assert.match(html, new RegExp(`/l/${slug}`));
  assert.match(html, /https:\/\/company\.com\//);
});

test('reserved links show the pending activation gate until sign-in', async () => {
  const appEnv = env();
  const slug = `gate-${Date.now()}`;
  const created = await handleRequest(
    new Request('http://openly.test/api/pending', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, url: 'example.com' }),
    }),
    appEnv,
    ctx(),
  );

  assert.equal(created.status, 201);

  const gate = await handleRequest(new Request(`http://openly.test/l/${slug}`), appEnv, ctx());
  const html = await gate.text();

  assert.equal(gate.status, 200);
  assert.match(html, /This link is reserved/);
  assert.match(html, /https:\/\/example\.com\//);
});
