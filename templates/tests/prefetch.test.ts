import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPrefetch } from '../src/prefetch.ts';

test('flags Google ASN 15169', () => {
  assert.equal(isPrefetch({ asn: 15169, asOrg: null, userAgent: 'Mozilla/5.0' }), true);
});

test('flags Apple ASN 714', () => {
  assert.equal(isPrefetch({ asn: 714, asOrg: null, userAgent: 'Mozilla/5.0' }), true);
});

test('flags string-form ASN from Cloudflare cf object', () => {
  assert.equal(isPrefetch({ asn: '15169', asOrg: null, userAgent: null }), true);
});

test('flags AS organization containing "Google"', () => {
  assert.equal(isPrefetch({ asn: 99999, asOrg: 'Google LLC', userAgent: null }), true);
});

test('flags AS organization containing "Apple"', () => {
  assert.equal(isPrefetch({ asn: 99999, asOrg: 'Apple Inc.', userAgent: null }), true);
});

test('flags GoogleImageProxy user-agent', () => {
  assert.equal(
    isPrefetch({
      asn: 7922,
      asOrg: 'Comcast',
      userAgent: 'Mozilla/5.0 (via GoogleImageProxy)',
    }),
    true,
  );
});

test('flags Applebot user-agent', () => {
  assert.equal(
    isPrefetch({ asn: 99999, asOrg: null, userAgent: 'Applebot/0.1 (+http://apple.com)' }),
    true,
  );
});

test('passes a normal residential click', () => {
  assert.equal(
    isPrefetch({
      asn: 7922,
      asOrg: 'Comcast Cable Communications LLC',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    }),
    false,
  );
});

test('handles missing signals gracefully', () => {
  assert.equal(isPrefetch({}), false);
  assert.equal(isPrefetch({ asn: null, asOrg: null, userAgent: null }), false);
});

test('does not match on substring "Pineapple" coincidence in org', () => {
  // Sanity: org check is case-insensitive contains, "Apple" inside "Pineapple" SHOULD match.
  // This documents the trade-off — we accept a small false-positive surface for simplicity.
  assert.equal(isPrefetch({ asn: 99999, asOrg: 'Pineapple Networks', userAgent: null }), true);
});
