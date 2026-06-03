const BRAND = 'openly';

export function renderFaviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#eef2ff"/>
  <path d="M24 34.5h16c4.1 0 7.5-3.4 7.5-7.5S44.1 19.5 40 19.5h-5.5" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
  <path d="M40 29.5H24c-4.1 0-7.5 3.4-7.5 7.5s3.4 7.5 7.5 7.5h5.5" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
</svg>`;
}

export function renderOgCardSvg(origin: string): string {
  const host = safeHost(origin);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f3f4f8"/>
  <rect x="72" y="72" width="1056" height="486" rx="32" fill="#fff"/>
  <path d="M910 322h72c28.7 0 52-23.3 52-52s-23.3-52-52-52h-30" fill="none" stroke="#111827" stroke-width="18" stroke-linecap="round"/>
  <path d="M982 286h-72c-28.7 0-52 23.3-52 52s23.3 52 52 52h30" fill="none" stroke="#2563eb" stroke-width="18" stroke-linecap="round"/>
  <text x="118" y="230" fill="#111827" font-size="96" font-weight="600" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif">${escapeSvg(BRAND)}</text>
  <text x="124" y="306" fill="#4b5563" font-size="34" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif">Private links. Simple analytics.</text>
  <text x="124" y="466" fill="#9ca3af" font-size="24" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif">${escapeSvg(host)}</text>
</svg>`;
}

function safeHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}

function escapeSvg(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
