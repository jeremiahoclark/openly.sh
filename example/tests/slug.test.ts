import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, validateSlug, validateUrl } from '../src/slug.ts';

test('slugify: spaces → dashes', () => {
  assert.equal(slugify('Data Report 1'), 'data-report-1');
});

test('slugify: collapses runs of non-alphanumerics', () => {
  assert.equal(slugify('hello  world!!@@##'), 'hello-world');
});

test('slugify: trims leading/trailing dashes', () => {
  assert.equal(slugify('---foo bar---'), 'foo-bar');
});

test('slugify: lowercases', () => {
  assert.equal(slugify('LoudSlug'), 'loudslug');
});

test('slugify: empty input returns empty string', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify('   '), '');
  assert.equal(slugify('!!!'), '');
});

test('slugify: caps at 80 chars', () => {
  const out = slugify('a'.repeat(200));
  assert.equal(out.length, 80);
});

test('validateSlug: accepts normal input', () => {
  assert.deepEqual(validateSlug('Data Report 1'), { ok: true, slug: 'data-report-1' });
});

test('validateSlug: rejects empty', () => {
  const result = validateSlug('!!!');
  assert.equal(result.ok, false);
});

test('validateSlug: rejects single character', () => {
  const result = validateSlug('a');
  assert.equal(result.ok, false);
});

test('validateSlug: rejects reserved words', () => {
  const result = validateSlug('api');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /reserved/);

  const authResult = validateSlug('signin');
  assert.equal(authResult.ok, false);
});

test('validateSlug: accepts normal slug-shaped strings', () => {
  for (const slug of ['data-report-1', 'launch-q3', 'sandbox', 'jeremiah']) {
    const result = validateSlug(slug);
    assert.equal(result.ok, true, `expected "${slug}" to be available`);
  }
});

test('validateUrl: accepts https', () => {
  const result = validateUrl('https://example.com/path?q=1');
  assert.equal(result.ok, true);
});

test('validateUrl: adds https when scheme omitted', () => {
  const result = validateUrl('company.com/docs');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.url, 'https://company.com/docs');
});

test('validateUrl: accepts explicit https', () => {
  const result = validateUrl('https://mysite.com');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.url, 'https://mysite.com/');
});

test('validateUrl: accepts explicit http', () => {
  const result = validateUrl('http://mysite.com');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.url, 'http://mysite.com/');
});

test('validateUrl: accepts http', () => {
  const result = validateUrl('http://example.com');
  assert.equal(result.ok, true);
});

test('validateUrl: rejects non-http schemes', () => {
  const result = validateUrl('javascript:alert(1)');
  assert.equal(result.ok, false);
});

test('validateUrl: rejects garbage', () => {
  const result = validateUrl('not a url');
  assert.equal(result.ok, false);
});
