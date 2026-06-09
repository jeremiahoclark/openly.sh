/** Normalize bare domains (company.com) to https URLs. Used server- and client-side. */
export function normalizeDestinationUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export type DestinationUrlValidation =
  | { ok: true; url: string }
  | { ok: false; reason: string };

export function validateDestinationUrl(input: string): DestinationUrlValidation {
  const candidate = normalizeDestinationUrl(input);
  if (!candidate) return { ok: false, reason: 'Enter where this link should go.' };
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: 'Enter a valid website (e.g. company.com).' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Use a web address (http or https).' };
  }
  return { ok: true, url: parsed.toString() };
}

/** Keep http:// in the field when the user chose it (avoid looking like a forced upgrade to https). */
export function destinationUrlForField(validatedUrl: string, rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!/^http:\/\//i.test(trimmed)) return validatedUrl;
  try {
    const parsed = new URL(validatedUrl);
    if (parsed.protocol !== 'http:') return validatedUrl;
    let href = parsed.href;
    if (!trimmed.endsWith('/') && href.endsWith('/') && parsed.pathname === '/') {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return validatedUrl;
  }
}

/** Shared inline helpers for landing/dashboard forms (no imports in the browser). */
export function destinationUrlClientHelpers(): string {
  return `
  function normalizeDestinationUrl(raw) {
    const t = String(raw || '').trim();
    if (!t) return '';
    if (/^https?:\\/\\//i.test(t)) return t;
    return 'https://' + t;
  }
  function validateDestinationUrl(raw) {
    const normalized = normalizeDestinationUrl(raw);
    if (!normalized) return { ok: false, reason: 'Enter where this link should go.' };
    try {
      const u = new URL(normalized);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return { ok: false, reason: 'Use a web address (http or https).' };
      }
      return { ok: true, url: u.toString() };
    } catch {
      return { ok: false, reason: 'Enter a valid website (e.g. company.com).' };
    }
  }
  function displayDestinationUrl(validated, raw) {
    const t = String(raw || '').trim();
    if (!/^http:\\/\\//i.test(t)) return validated;
    try {
      const u = new URL(validated);
      if (u.protocol !== 'http:') return validated;
      let href = u.href;
      if (!t.endsWith('/') && href.endsWith('/') && u.pathname === '/') href = href.slice(0, -1);
      return href;
    } catch {
      return validated;
    }
  }
  function prepareDestinationUrlInput(urlInput) {
    const check = validateDestinationUrl(urlInput.value);
    if (!check.ok) return check;
    urlInput.value = displayDestinationUrl(check.url, urlInput.value);
    return check;
  }
`;
}