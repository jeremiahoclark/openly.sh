// Lightweight User-Agent parsing — just enough to bucket clicks by device + OS.
// Not exhaustive; covers ~99% of real traffic.

export type Device = 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
export type OS =
  | 'iOS'
  | 'Android'
  | 'macOS'
  | 'Windows'
  | 'Linux'
  | 'ChromeOS'
  | 'Bot'
  | 'Unknown';

export type ParsedUA = { device: Device; os: OS };

const BOT_FRAGMENTS = ['bot', 'crawler', 'spider', 'curl/', 'wget/', 'python-', 'go-http'];

export function parseUA(input: string | null | undefined): ParsedUA {
  const ua = (input ?? '').trim();
  if (!ua) return { device: 'unknown', os: 'Unknown' };

  const lower = ua.toLowerCase();

  for (const frag of BOT_FRAGMENTS) {
    if (lower.includes(frag)) return { device: 'bot', os: 'Bot' };
  }

  if (/iphone|ipod/i.test(ua)) return { device: 'mobile', os: 'iOS' };
  if (/ipad/i.test(ua)) return { device: 'tablet', os: 'iOS' };

  if (/android/i.test(ua)) {
    const device: Device = /mobile/i.test(ua) ? 'mobile' : 'tablet';
    return { device, os: 'Android' };
  }

  if (/windows nt/i.test(ua)) return { device: 'desktop', os: 'Windows' };
  if (/macintosh|mac os x/i.test(ua)) return { device: 'desktop', os: 'macOS' };
  if (/cros\b/i.test(ua)) return { device: 'desktop', os: 'ChromeOS' };
  if (/linux/i.test(ua)) return { device: 'desktop', os: 'Linux' };

  return { device: 'unknown', os: 'Unknown' };
}
