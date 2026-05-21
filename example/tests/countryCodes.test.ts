import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alpha2ToNumeric } from '../src/countryCodes.ts';

test('common alpha-2 codes resolve to ISO numeric', () => {
  assert.equal(alpha2ToNumeric('US'), 840);
  assert.equal(alpha2ToNumeric('CA'), 124);
  assert.equal(alpha2ToNumeric('GB'), 826);
  assert.equal(alpha2ToNumeric('DE'), 276);
  assert.equal(alpha2ToNumeric('JP'), 392);
  assert.equal(alpha2ToNumeric('AU'), 36);
  assert.equal(alpha2ToNumeric('IN'), 356);
  assert.equal(alpha2ToNumeric('BR'), 76);
  assert.equal(alpha2ToNumeric('CN'), 156);
});

test('case-insensitive', () => {
  assert.equal(alpha2ToNumeric('us'), 840);
  assert.equal(alpha2ToNumeric('Gb'), 826);
});

test('returns null for unknown / empty', () => {
  assert.equal(alpha2ToNumeric('ZZ'), null);
  assert.equal(alpha2ToNumeric(''), null);
  // @ts-expect-error testing runtime guard
  assert.equal(alpha2ToNumeric(undefined), null);
});

test('table covers a reasonable set of countries', () => {
  const codes = [
    'US', 'CA', 'MX', 'GB', 'IE', 'FR', 'DE', 'IT', 'ES', 'NL',
    'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'PT', 'GR',
    'TR', 'IL', 'AE', 'SA', 'EG', 'ZA', 'NG', 'KE', 'BR', 'AR',
    'CL', 'CO', 'AU', 'NZ', 'JP', 'KR', 'CN', 'TW', 'HK', 'SG',
    'IN', 'PK', 'BD', 'TH', 'VN', 'PH', 'ID', 'MY',
  ];
  for (const c of codes) {
    assert.ok(alpha2ToNumeric(c) !== null, `expected ${c} to resolve`);
  }
});
