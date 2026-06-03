import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FREE_LINK_LIMIT,
  PRO_LINK_LIMIT,
  decorateAccount,
  isProAccount,
  linkLimitForAccount,
  normalizeEmail,
  type Account,
} from '../src/auth.ts';

test('normalizeEmail trims and lowercases valid addresses', () => {
  assert.equal(normalizeEmail('  Jay@Example.COM  '), 'jay@example.com');
});

test('normalizeEmail rejects invalid addresses', () => {
  assert.equal(normalizeEmail('not-an-email'), null);
  assert.equal(normalizeEmail(''), null);
});

test('free accounts get five tracked links', () => {
  assert.equal(isProAccount({ plan: 'free', pro_until: null }, 1000), false);
  assert.equal(linkLimitForAccount({ plan: 'free', pro_until: null }, 1000), FREE_LINK_LIMIT);
});

test('pro accounts and active pro trials get the higher limit', () => {
  assert.equal(isProAccount({ plan: 'pro', pro_until: null }, 1000), true);
  assert.equal(isProAccount({ plan: 'free', pro_until: 2000 }, 1000), true);
  assert.equal(linkLimitForAccount({ plan: 'free', pro_until: 2000 }, 1000), PRO_LINK_LIMIT);
});

test('expired pro trials fall back to free', () => {
  assert.equal(isProAccount({ plan: 'free', pro_until: 999 }, 1000), false);
  assert.equal(linkLimitForAccount({ plan: 'free', pro_until: 999 }, 1000), FREE_LINK_LIMIT);
});

test('decorateAccount exposes plan label and effective link limit', () => {
  const account: Account = {
    id: 'acct_1',
    email: 'jay@example.com',
    plan: 'free',
    pro_until: 2000,
    created_at: 1,
    updated_at: 1,
  };
  const user = decorateAccount(account, 1000);
  assert.equal(user.planLabel, 'Pro');
  assert.equal(user.linkLimit, PRO_LINK_LIMIT);
});
