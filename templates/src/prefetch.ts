// Detects automated link-scanner / prefetch traffic so we can mark it
// at write-time and exclude it from unique-click reporting.

const GOOGLE_ASNS = new Set([
  15169,  // GOOGLE
  36492,  // GOOGLE-IT
  19527,  // GOOGLE-2
  396982, // GOOGLE-CLOUD-PLATFORM
  36040,  // YouTube (Google)
  43515,  // YouTube (Google)
]);

const APPLE_ASNS = new Set([
  714,    // APPLE-ENGINEERING (primary)
  6185,   // APPLE-AUSTIN / Apple AU
  2709,   // APPLE-AUSTRALIA (legacy)
  17511,  // APPLE-INTERNATIONAL
]);

const PREFETCH_UA_FRAGMENTS = [
  'googleimageproxy',
  'googlebot',
  'googleweblight',
  'mediapartners-google',
  'feedfetcher-google',
  'apple-pubsub',
  'applebot',
  'apple privacy proxy',
];

export type PrefetchSignals = {
  asn?: number | string | null;
  asOrg?: string | null;
  userAgent?: string | null;
};

export function isPrefetch(signals: PrefetchSignals): boolean {
  const asn = typeof signals.asn === 'string' ? parseInt(signals.asn, 10) : signals.asn ?? undefined;
  if (typeof asn === 'number' && Number.isFinite(asn)) {
    if (GOOGLE_ASNS.has(asn)) return true;
    if (APPLE_ASNS.has(asn)) return true;
  }

  const asOrg = (signals.asOrg ?? '').toLowerCase();
  if (asOrg) {
    if (asOrg.includes('google')) return true;
    if (asOrg.includes('apple')) return true;
  }

  const ua = (signals.userAgent ?? '').toLowerCase();
  if (ua) {
    for (const frag of PREFETCH_UA_FRAGMENTS) {
      if (ua.includes(frag)) return true;
    }
  }

  return false;
}
