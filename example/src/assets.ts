const BRAND = 'openly';

// Open Air mark: espresso tile, cream ring broken open at the north-east,
// Flare arrow escaping through the gap. See design.md "Logo".
export function renderFaviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#201A17"/>
  <path d="M41.8 33.74A13 13 0 1 1 31.26 23.2" fill="none" stroke="#FAF6EF" stroke-width="6.5" stroke-linecap="round"/>
  <path d="M33.5 31.5L45.5 19.5" fill="none" stroke="#FF6A2B" stroke-width="6.5" stroke-linecap="round"/>
  <path d="M39.5 17.5H47.5V25.5" fill="none" stroke="#FF6A2B" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

export function renderOgCardSvg(origin: string): string {
  const host = safeHost(origin);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FAF6EF"/>
  <ellipse cx="600" cy="-80" rx="720" ry="280" fill="#E8500F" opacity="0.08"/>
  <g transform="translate(96,140) scale(2.6)">
    <rect width="64" height="64" rx="16" fill="#201A17"/>
    <path d="M41.8 33.74A13 13 0 1 1 31.26 23.2" fill="none" stroke="#FAF6EF" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M33.5 31.5L45.5 19.5" fill="none" stroke="#FF6A2B" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M39.5 17.5H47.5V25.5" fill="none" stroke="#FF6A2B" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="306" y="252" fill="#201A17" font-size="104" font-weight="700" letter-spacing="-2" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif">${escapeSvg(BRAND)}</text>
  <rect x="310" y="282" width="150" height="10" rx="5" fill="#E8500F"/>
  <text x="306" y="372" fill="#6B6259" font-size="40" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif">Own your links. See every click.</text>
  <text x="306" y="520" fill="#9A8F83" font-size="26" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif">${escapeSvg(host)}</text>
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
