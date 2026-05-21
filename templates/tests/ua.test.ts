import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUA } from '../src/ua.ts';

test('iPhone → mobile iOS', () => {
  const r = parseUA(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  );
  assert.deepEqual(r, { device: 'mobile', os: 'iOS' });
});

test('iPad → tablet iOS', () => {
  const r = parseUA(
    'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  );
  assert.deepEqual(r, { device: 'tablet', os: 'iOS' });
});

test('Android phone → mobile Android', () => {
  const r = parseUA(
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
  );
  assert.deepEqual(r, { device: 'mobile', os: 'Android' });
});

test('Android tablet (no Mobile token) → tablet Android', () => {
  const r = parseUA(
    'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
  );
  assert.deepEqual(r, { device: 'tablet', os: 'Android' });
});

test('macOS Safari → desktop macOS', () => {
  const r = parseUA(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  );
  assert.deepEqual(r, { device: 'desktop', os: 'macOS' });
});

test('Windows Chrome → desktop Windows', () => {
  const r = parseUA(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  );
  assert.deepEqual(r, { device: 'desktop', os: 'Windows' });
});

test('Linux desktop Firefox → desktop Linux', () => {
  const r = parseUA('Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0');
  assert.deepEqual(r, { device: 'desktop', os: 'Linux' });
});

test('ChromeOS → desktop ChromeOS', () => {
  const r = parseUA(
    'Mozilla/5.0 (X11; CrOS x86_64 15633.69.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );
  assert.deepEqual(r, { device: 'desktop', os: 'ChromeOS' });
});

test('Bot UAs flagged', () => {
  assert.deepEqual(parseUA('Mozilla/5.0 (compatible; Googlebot/2.1; +http://google.com/bot.html)'), {
    device: 'bot',
    os: 'Bot',
  });
  assert.deepEqual(parseUA('curl/8.4.0'), { device: 'bot', os: 'Bot' });
  assert.deepEqual(parseUA('python-requests/2.31.0'), { device: 'bot', os: 'Bot' });
});

test('Empty UA → unknown', () => {
  assert.deepEqual(parseUA(''), { device: 'unknown', os: 'Unknown' });
  assert.deepEqual(parseUA(null), { device: 'unknown', os: 'Unknown' });
  assert.deepEqual(parseUA(undefined), { device: 'unknown', os: 'Unknown' });
});

test('Android prefers Android over Linux (order matters)', () => {
  const r = parseUA('Mozilla/5.0 (Linux; Android 14; Pixel) Mobile Safari');
  assert.equal(r.os, 'Android');
});
