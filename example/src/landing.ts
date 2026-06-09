import type { PendingLink } from './pending.ts';
import { FREE_LINK_LIMIT } from './auth.ts';
import { destinationUrlClientHelpers } from './urlField.ts';

const BRAND = 'openly';
const GITHUB_REPO = 'https://github.com/jeremiahoclark/openly.sh';

function brandLogoSvg(size = 28): string {
  return `<svg class="brand-logo" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <rect width="64" height="64" rx="16" fill="var(--logo-bg)"/>
  <path d="M24 34.5h16c4.1 0 7.5-3.4 7.5-7.5S44.1 19.5 40 19.5h-5.5" fill="none" stroke="var(--logo-ink)" stroke-width="4" stroke-linecap="round"/>
  <path d="M40 29.5H24c-4.1 0-7.5 3.4-7.5 7.5s3.4 7.5 7.5 7.5h5.5" fill="none" stroke="var(--logo-accent)" stroke-width="4" stroke-linecap="round"/>
</svg>`;
}

function githubIcon(): string {
  return `<svg class="github-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>`;
}

export type LandingOpts = {
  origin: string;
  error?: string;
  created?: PendingLink | null;
  reserved?: PendingLink[];
  welcome?: boolean;
  migratedCount?: number;
};

export function renderLanding(opts: LandingOpts): string {
  const shortUrl = opts.created ? `${opts.origin}/l/${opts.created.slug}` : '';
  const reservedList =
    opts.reserved && opts.reserved.length > 0
      ? opts.reserved
          .map(
            (l) =>
              `<li><span class="reserved-check" aria-hidden="true">✓</span><code>${escapeHtml(l.slug)}</code><span class="muted">${escapeHtml(l.url)}</span></li>`,
          )
          .join('')
      : '';

  return `<!doctype html>
<html lang="en">
<head>
${headHtml(`${BRAND} — short links for developers`, opts.origin)}
</head>
<body class="landing">
<header class="site-nav">
  <a class="nav-brand" href="/">${brandLogoSvg(48)}<span>${escapeHtml(BRAND)}</span></a>
  <div class="nav-actions">
    <a class="nav-github" href="${GITHUB_REPO}" target="_blank" rel="noopener noreferrer">${githubIcon()} Star on GitHub</a>
    <a class="nav-link" href="/signin">Sign in</a>
  </div>
</header>

<main class="landing-main">
  <section class="hero-center">
    <p class="hero-kicker">Cloudflare link tracker</p>
    <h1>Create a short link<br><span class="hero-accent">you control</span></h1>
    <p class="hero-lede">Reserve a slug, point it at any website, then activate it with email. You keep the domain, code, and click data.</p>

    ${opts.welcome ? `<p class="flash is-ok">Welcome back.${opts.migratedCount ? ` ${opts.migratedCount} link${opts.migratedCount === 1 ? '' : 's'} activated.` : ''}</p>` : ''}
    ${opts.error ? `<p class="flash is-error">${escapeHtml(opts.error)}</p>` : ''}

    ${
      opts.created
        ? `<div class="activate-block">
      <p class="activate-lead">Link reserved. Sign in with a magic link to make it live.</p>
      <div class="link-preview">
        <code class="link-preview-url">${escapeHtml(shortUrl)}</code>
        <span class="link-preview-check" aria-hidden="true">✓</span>
      </div>
      <label class="activate-url-label">Destination
        <input type="text" class="activate-url-input" id="activate-url-input" value="${escapeHtml(opts.created.url)}" inputmode="url" autocomplete="off" aria-label="Destination URL">
      </label>
      <p id="activate-url-feedback" class="slug-feedback" aria-live="polite"></p>
      <form class="activate-bar" method="post" action="/auth/magic-link">
        <input type="email" name="email" placeholder="you@example.com" required autocomplete="email" aria-label="Email">
        <button type="submit" class="btn-primary">Send magic link</button>
      </form>
      <p class="hint">No password. Your link attaches to this account when you verify email.</p>
      <a class="text-link" href="/">Create another link</a>
    </div>`
        : `<form class="link-bar-form" id="openly-landing-form" method="post" action="/api/pending">
      <div class="link-bar" role="group" aria-label="Create a short link">
        <div class="link-bar-slug" id="slug-field">
          <span class="link-bar-prefix" aria-hidden="true">/l/</span>
          <input type="text" id="slug-input" name="slug" placeholder="launch" required autocomplete="off" spellcheck="false" aria-label="Slug" aria-describedby="slug-feedback">
          <span id="slug-status" class="slug-status" role="status" aria-live="polite"></span>
        </div>
        <span class="link-bar-divider" aria-hidden="true"></span>
        <input type="text" class="link-bar-url" id="url-input" name="url" inputmode="url" placeholder="company.com" required autocomplete="off" aria-label="Destination URL">
        <button type="submit" id="openly-submit" class="link-bar-submit">Reserve link</button>
      </div>
      <p id="slug-feedback" class="slug-feedback" aria-live="polite"></p>
    </form>
    <p class="hint"><code>data report 1</code> becomes <code>data-report-1</code>. Bare domains are normalized to HTTPS. Reserved links go live after sign-in.</p>`
    }

    <div class="trust-row" aria-label="Product details">
      <span>No password</span>
      <span>5 free active links</span>
      <span>Prefetch filtering</span>
    </div>
  </section>

  ${
    reservedList
      ? `<section class="reserved-strip">
    <h3>Waiting to activate</h3>
    <ul>${reservedList}</ul>
  </section>`
      : ''
  }

  <section class="feature-grid">
    <article>
      <h3>Cloudflare-native</h3>
      <p><code>npx create-openly</code> scaffolds a Worker, D1 database, KV namespace, magic-link auth, and dashboard in your account.</p>
    </article>
    <article>
      <h3>Cleaner analytics</h3>
      <p>Unique visitors, country, device, and OS breakdowns. Google and Apple prefetch traffic is marked so counts stay useful.</p>
    </article>
    <article>
      <h3>Plain TypeScript</h3>
      <p>No framework lock-in. Read the worker in one sitting, adjust limits or branding, and redeploy from the same project.</p>
    </article>
  </section>
</main>

<footer class="site-footer">
  <p>Free: ${FREE_LINK_LIMIT} active links · Pro included for new accounts · <a href="${GITHUB_REPO}">openly.sh on GitHub</a></p>
</footer>

<script>
${opts.created ? activateUrlScript(opts.created.slug) : landingSlugScript()}
</script>
</body>
</html>`;
}

export function renderPendingGate(opts: {
  origin: string;
  slug: string;
  url: string;
}): string {
  const shortUrl = `${opts.origin}/l/${opts.slug}`;
  return `<!doctype html>
<html lang="en">
<head>
${headHtml(`${BRAND} — activate link`, opts.origin)}
</head>
<body class="landing">
<header class="site-nav">
  <a class="nav-brand" href="/">${brandLogoSvg(48)}<span>${escapeHtml(BRAND)}</span></a>
  <div class="nav-actions">
    <a class="nav-github" href="${GITHUB_REPO}" target="_blank" rel="noopener noreferrer">${githubIcon()} Star on GitHub</a>
    <a class="nav-link" href="/signin">Sign in</a>
  </div>
</header>
<main class="landing-main gate-main">
  <section class="hero-center">
    <h1>This link is reserved</h1>
    <p class="hero-lede"><code>${escapeHtml(shortUrl)}</code> redirects to <span class="muted">${escapeHtml(opts.url)}</span> once the owner signs in.</p>
    <form class="activate-bar" method="post" action="/auth/magic-link">
      <input type="email" name="email" placeholder="you@example.com" required autocomplete="email" aria-label="Email">
      <button type="submit" class="btn-primary">Send magic link</button>
    </form>
    <a class="text-link" href="/">Create your own link</a>
  </section>
</main>
</body>
</html>`;
}

function activateUrlScript(slug: string): string {
  const slugJson = JSON.stringify(slug);
  return `(function() {
  ${destinationUrlClientHelpers()}
  (function() {
    const input = document.getElementById('activate-url-input');
    const feedback = document.getElementById('activate-url-feedback');
    if (!input || !feedback) return;
    const slug = ${slugJson};
    let lastSaved = input.value;
    let saveTimer = null;

    function showSaved(url) {
      feedback.className = 'slug-feedback is-available';
      feedback.textContent = 'Destination saved';
      lastSaved = url;
    }

    function showError(reason) {
      feedback.className = 'slug-feedback is-taken';
      feedback.textContent = reason;
    }

    async function save() {
      const check = validateDestinationUrl(input.value);
      if (!check.ok) {
        showError(check.reason);
        return;
      }
      const display = displayDestinationUrl(check.url, input.value);
      if (document.activeElement !== input) input.value = display;
      if (display === lastSaved) return;
      try {
        const res = await fetch(\`/api/pending/\${encodeURIComponent(slug)}\`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: check.url }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showError(body.error || 'Could not save destination.');
          return;
        }
        showSaved(body.url || check.url);
      } catch {
        showError('Could not save destination.');
      }
    }

    function queueSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { void save(); }, 400);
    }

    input.addEventListener('blur', () => {
      const check = validateDestinationUrl(input.value);
      if (check.ok) input.value = displayDestinationUrl(check.url, input.value);
      void save();
    });
    input.addEventListener('input', () => {
      const check = validateDestinationUrl(input.value);
      if (!input.value.trim()) {
        feedback.className = 'slug-feedback';
        feedback.textContent = '';
        return;
      }
      if (!check.ok) showError(check.reason);
      else {
        feedback.className = 'slug-feedback';
        feedback.textContent = '';
      }
      queueSave();
    });
  })();
  })();`;
}

function landingSlugScript(): string {
  return `(function() {
  ${destinationUrlClientHelpers()}

  const slugState = { ready: false, checking: false, normalized: '' };
  const form = document.getElementById('openly-landing-form');
  const input = document.getElementById('slug-input');
  const urlInput = document.getElementById('url-input');
  const slugField = document.getElementById('slug-field');
  const status = document.getElementById('slug-status');
  const feedback = document.getElementById('slug-feedback');
  const submit = document.getElementById('openly-submit');
  if (!form || !input || !urlInput || !status || !feedback || !submit) return;

  const siteOrigin = location.origin;
  const ICON_CHECK = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8"/></svg>';
  const ICON_X = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  const ICON_SPINNER = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="5" stroke-opacity="0.25"/><path d="M8 3a5 5 0 0 1 5 5"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.9s" repeatCount="indefinite"/></path></svg>';

  function slugifyClient(raw) {
    return String(raw || '').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }

  function setSlugFieldValid(on) {
    slugField?.classList.toggle('is-valid', on);
  }

  function refreshSubmit() {
    const urlCheck = validateDestinationUrl(urlInput.value);
    const canSubmit = slugState.ready && !slugState.checking && urlCheck.ok;
    submit.classList.toggle('is-ready', canSubmit);
    submit.setAttribute('aria-disabled', canSubmit ? 'false' : 'true');
  }

  function setIdle() {
    status.className = 'slug-status';
    status.innerHTML = '';
    status.removeAttribute('aria-label');
    setSlugFieldValid(false);
    feedback.className = 'slug-feedback';
    feedback.textContent = '';
    slugState.ready = false;
    slugState.checking = false;
    slugState.normalized = '';
    refreshSubmit();
  }

  function setChecking() {
    status.className = 'slug-status is-checking';
    status.innerHTML = ICON_SPINNER;
    status.setAttribute('aria-label', 'Checking name on this site');
    setSlugFieldValid(false);
    feedback.className = 'slug-feedback';
    feedback.textContent = 'Checking name on this site…';
    slugState.ready = false;
    slugState.checking = true;
    refreshSubmit();
  }

  function setAvailable(normalized) {
    status.className = 'slug-status is-available';
    status.innerHTML = ICON_CHECK;
    status.setAttribute('aria-label', 'Name available on this site');
    setSlugFieldValid(true);
    slugState.normalized = normalized;
    if (input.value.trim() && slugifyClient(input.value) === normalized) {
      input.value = normalized;
    }
    feedback.className = 'slug-feedback is-available';
    feedback.innerHTML = \`Available on this site · <span class="preview">\${siteOrigin}/l/\${normalized}</span>\`;
    slugState.ready = true;
    slugState.checking = false;
    refreshSubmit();
  }

  function setUnavailable(reason) {
    status.className = 'slug-status is-taken';
    status.innerHTML = ICON_X;
    status.setAttribute('aria-label', reason);
    setSlugFieldValid(false);
    feedback.className = 'slug-feedback is-taken';
    feedback.textContent = reason;
    slugState.ready = false;
    slugState.checking = false;
    slugState.normalized = '';
    refreshSubmit();
  }

  function showSlugAvailable() {
    if (!slugState.ready || !slugState.normalized) return;
    feedback.className = 'slug-feedback is-available';
    feedback.innerHTML = \`Available on this site · <span class="preview">\${siteOrigin}/l/\${slugState.normalized}</span>\`;
  }

  function syncUrlField() {
    const check = validateDestinationUrl(urlInput.value);
    if (!urlInput.value.trim()) {
      showSlugAvailable();
      refreshSubmit();
      return;
    }
    if (!check.ok) {
      feedback.className = 'slug-feedback is-taken';
      feedback.textContent = check.reason;
      refreshSubmit();
      return;
    }
    showSlugAvailable();
    refreshSubmit();
  }

  let abortCtrl = null;
  let debounceTimer = null;
  let lastQuery = '';
  let pendingSubmit = false;

  function submitAfterCheckIfReady() {
    if (!pendingSubmit) return;
    const urlCheck = validateDestinationUrl(urlInput.value);
    if (!slugState.ready || slugState.checking || !slugState.normalized || !urlCheck.ok) return;
    pendingSubmit = false;
    input.value = slugState.normalized;
    prepareDestinationUrlInput(urlInput);
    form.submit();
  }

  function runSlugCheck(raw) {
    const trimmed = raw.trim();
    if (!trimmed) { setIdle(); return; }
    const normalized = slugifyClient(trimmed);
    if (!normalized) {
      setUnavailable('Enter a link name (letters and numbers).');
      return;
    }
    if (normalized.length < 2) {
      setUnavailable('Link name must be at least 2 characters.');
      return;
    }
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();
    setChecking();
    fetch(\`\${siteOrigin}/api/check?slug=\${encodeURIComponent(trimmed)}\`, { signal: abortCtrl.signal })
      .then(r => {
        if (!r.ok) throw new Error('check failed');
        return r.json();
      })
      .then(j => {
        if (trimmed !== lastQuery.trim()) return;
        if (j.available) {
          setAvailable(j.normalized || normalized);
          submitAfterCheckIfReady();
        } else {
          pendingSubmit = false;
          setUnavailable(j.reason || 'That name is already taken on this site.');
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        pendingSubmit = false;
        slugState.checking = false;
        setSlugFieldValid(false);
        feedback.className = 'slug-feedback is-taken';
        feedback.textContent = 'Could not verify name. Check your connection and try again.';
        refreshSubmit();
      });
  }

  function queueSlugCheck() {
    const v = input.value;
    lastQuery = v;
    clearTimeout(debounceTimer);
    if (!v.trim()) { setIdle(); return; }
    debounceTimer = setTimeout(() => runSlugCheck(v), 200);
  }

  input.addEventListener('input', queueSlugCheck);
  input.addEventListener('blur', () => runSlugCheck(input.value));

  function onUrlChange() {
    syncUrlField();
  }

  urlInput.addEventListener('input', onUrlChange);
  urlInput.addEventListener('change', onUrlChange);

  form.addEventListener('submit', (e) => {
    const urlCheck = validateDestinationUrl(urlInput.value);
    if (slugState.checking) {
      e.preventDefault();
      pendingSubmit = true;
      feedback.className = 'slug-feedback is-taken';
      feedback.textContent = 'Checking this name on the site…';
      return;
    }
    if (!slugState.ready || !slugState.normalized) {
      e.preventDefault();
      pendingSubmit = true;
      runSlugCheck(input.value);
      feedback.className = 'slug-feedback is-taken';
      feedback.textContent = 'Checking this name on the site…';
      return;
    }
    if (!urlCheck.ok) {
      e.preventDefault();
      pendingSubmit = false;
      feedback.className = 'slug-feedback is-taken';
      feedback.textContent = urlCheck.reason;
      return;
    }
    pendingSubmit = false;
    input.value = slugState.normalized;
    prepareDestinationUrlInput(urlInput);
  });

  if (input.value.trim()) queueSlugCheck();
  refreshSubmit();
  })();`;
}

function headHtml(title: string, origin = ''): string {
  const ogImage = origin ? `${origin}/og-card.svg` : '/og-card.svg';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<meta name="description" content="Own your short links. Deploy a link tracker on Cloudflare Workers in one command, or sign in for a hosted dashboard with real click analytics.">
<meta property="og:title" content="${escapeHtml(BRAND)}">
<meta property="og:description" content="Short links and click analytics for developers — self-host on Cloudflare or run as a service.">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
${landingStyles()}
</style>`;
}

function landingStyles(): string {
  return `:root {
  color-scheme: light;
  --ink: #0b0b0c;
  --ink-soft: #5c5c63;
  --ink-faint: #8e8e96;
  --paper: #f4f4f6;
  --surface: #ffffff;
  --rule: #dadce0;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --focus: rgba(37, 99, 235, .25);
  --success: #15803d;
  --danger: #dc2626;
  --logo-bg: #eef2ff;
  --logo-ink: #0b0b0c;
  --logo-accent: #2563eb;
  --hero-display: clamp(2.4rem, 5.6vw, 3.7rem);
  --link-bar-height: 56px;
}
* { box-sizing: border-box; }
body.landing {
  margin: 0;
  background:
    radial-gradient(ellipse 120% 80% at 50% -30%, rgba(37, 99, 235, .08), transparent 55%),
    linear-gradient(180deg, #fafafb 0%, var(--paper) 50%, var(--paper) 100%);
  color: var(--ink);
  font: 16px/1.55 "Segoe UI", -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.site-nav {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px clamp(20px, 4vw, 48px);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--ink);
  font-weight: 650;
  letter-spacing: -0.02em;
}
.nav-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.nav-github {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--ink);
  font-size: 14px;
  font-weight: 500;
  padding: 8px 14px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: var(--surface);
}
.nav-github:hover { border-color: var(--ink-faint); box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.github-icon { display: block; flex-shrink: 0; }
.nav-link {
  color: var(--ink-soft);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 14px;
}
.nav-link:hover { color: var(--ink); }
.landing-main {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px clamp(20px, 4vw, 48px) 72px;
  width: 100%;
}
.hero-center {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.hero-kicker {
  margin: 0 0 12px;
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.hero-center h1 {
  font-size: var(--hero-display);
  line-height: 1.05;
  letter-spacing: -0.02em;
  font-weight: 650;
  margin: 0 0 18px;
}
.hero-accent { color: var(--accent); }
.hero-lede {
  font-size: 1rem;
  color: var(--ink-soft);
  margin: 0 0 30px;
  max-width: 46rem;
  line-height: 1.6;
}
.hero-lede code {
  font-size: 0.92em;
  background: rgba(0,0,0,.05);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--ink);
}
.link-bar-form {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 8px;
}
.link-bar {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: var(--link-bar-height);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(32, 33, 36, .12), 0 12px 28px rgba(32, 33, 36, .08);
  overflow: hidden;
  transition: box-shadow 160ms ease, border-color 160ms ease;
}
.link-bar:focus-within {
  border-color: rgba(37, 99, 235, .45);
  box-shadow: 0 2px 8px rgba(32, 33, 36, .1), 0 12px 28px rgba(32, 33, 36, .08), 0 0 0 3px var(--focus);
}
.link-bar-slug {
  display: flex;
  align-items: center;
  flex: 0 1 38%;
  min-width: 140px;
  position: relative;
  padding-left: 20px;
  padding-right: 4px;
  transition: box-shadow 160ms ease, background 160ms ease;
}
.link-bar-slug.is-valid {
  box-shadow: inset 3px 0 0 var(--success);
  background: linear-gradient(90deg, rgba(21, 128, 61, .04) 0%, transparent 55%);
}
.link-bar-prefix {
  font-size: 17px;
  color: var(--ink-faint);
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 4px;
  font-weight: 500;
}
.link-bar-slug input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 18px;
  color: var(--ink);
  padding: 16px 44px 16px 0;
  outline: none;
}
.link-bar-slug input::placeholder { color: var(--ink-faint); }
.link-bar-divider {
  width: 1px;
  background: var(--rule);
  flex-shrink: 0;
  margin: 12px 0;
}
.link-bar-url {
  flex: 1 1 50%;
  min-width: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 18px;
  color: var(--ink);
  padding: 16px 20px;
  outline: none;
}
.link-bar-url::placeholder { color: var(--ink-faint); }
.link-bar-submit {
  flex-shrink: 0;
  border: 0;
  background: var(--ink);
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  padding: 0 28px;
  cursor: pointer;
  transition: background 140ms ease;
}
.link-bar-submit { background: var(--ink-faint); cursor: pointer; }
.link-bar-submit.is-ready { background: var(--ink); }
.link-bar-submit.is-ready:hover { background: #222; }
.link-bar-submit[aria-disabled="true"] { cursor: default; opacity: .85; }
.slug-status {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  opacity: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slug-status svg { width: 100%; height: 100%; }
.slug-status.is-checking { opacity: .55; color: var(--ink-faint); }
.slug-status.is-available {
  opacity: 1;
  color: var(--success);
  filter: drop-shadow(0 0 6px rgba(21, 128, 61, .35));
}
.slug-status.is-taken { opacity: 1; color: var(--danger); width: 20px; height: 20px; right: 12px; }
.slug-feedback {
  font-size: 13px;
  min-height: 20px;
  margin: 10px 0 0;
  text-align: center;
  color: var(--ink-soft);
}
.slug-feedback.is-available { color: var(--success); }
.slug-feedback.is-taken { color: var(--danger); }
.slug-feedback .preview { font-weight: 500; color: var(--ink); }
.hint {
  font-size: 13px;
  color: var(--ink-faint);
  margin: 0 0 28px;
  max-width: 40rem;
}
.hint code {
  font-size: 12px;
  background: rgba(0,0,0,.05);
  padding: 2px 6px;
  border-radius: 4px;
}
.trust-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
  color: var(--ink-soft);
  font-size: 13px;
}
.trust-row span {
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: rgba(255,255,255,.68);
  padding: 7px 11px;
}
.activate-block {
  width: 100%;
  max-width: 800px;
  margin: 0 auto 24px;
}
.activate-lead {
  color: var(--ink-soft);
  margin: 0 0 16px;
  font-size: 1.05rem;
}
.link-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  font-size: 15px;
}
.link-preview-url { word-break: break-all; }
.link-preview-check {
  color: var(--success);
  font-size: 18px;
  font-weight: 700;
}
.activate-url-label {
  display: block;
  width: 100%;
  max-width: 560px;
  margin: 0 auto 8px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}
.activate-url-input {
  display: block;
  width: 100%;
  margin-top: 6px;
  min-height: var(--link-bar-height);
  border: 1px solid var(--rule);
  border-radius: 16px;
  padding: 16px 20px;
  font: inherit;
  font-size: 17px;
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(32, 33, 36, .1);
  outline: none;
}
.activate-url-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--focus);
}
.activate-bar {
  display: flex;
  width: 100%;
  max-width: 560px;
  margin: 0 auto 12px;
  min-height: var(--link-bar-height);
  border: 1px solid var(--rule);
  border-radius: 16px;
  overflow: hidden;
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(32, 33, 36, .1);
}
.activate-bar input {
  flex: 1;
  border: 0;
  padding: 16px 20px;
  font: inherit;
  font-size: 17px;
  outline: none;
}
.activate-bar .btn-primary {
  flex-shrink: 0;
  border: 0;
  border-radius: 0;
  padding: 0 24px;
  background: var(--ink);
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.activate-bar .btn-primary:hover { background: #222; }
.text-link {
  display: inline-block;
  margin-top: 12px;
  color: var(--accent);
  font-size: 14px;
  text-decoration: none;
}
.text-link:hover { text-decoration: underline; }
.muted { color: var(--ink-soft); }
.flash {
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  margin-bottom: 20px;
  max-width: 480px;
}
.flash.is-ok { background: #f0fdf4; color: var(--success); border: 1px solid rgba(21,128,61,.2); }
.flash.is-error { background: #fef2f2; color: var(--danger); border: 1px solid rgba(220,38,38,.2); }
.feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  margin-top: 64px;
  padding-top: 48px;
  border-top: 1px solid var(--rule);
  text-align: left;
  width: 100%;
}
.feature-grid h3 {
  margin: 0 0 10px;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}
.feature-grid p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 15px;
  line-height: 1.6;
}
.feature-grid code {
  font-size: 13px;
  background: rgba(0,0,0,.05);
  padding: 2px 6px;
  border-radius: 4px;
}
@media (min-width: 720px) {
  .feature-grid { grid-template-columns: repeat(3, 1fr); gap: 32px 40px; }
}
@media (min-width: 1100px) {
  .hero-lede { max-width: 52rem; }
  .link-bar-form { max-width: 1100px; }
}
.reserved-strip {
  width: 100%;
  margin-top: 32px;
  padding: 20px 24px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 16px;
  text-align: left;
}
.reserved-strip h3 { margin: 0 0 12px; font-size: 14px; }
.reserved-strip ul {
  margin: 0;
  padding-left: 0;
  color: var(--ink-soft);
  font-size: 14px;
  list-style: none;
  display: grid;
  gap: 8px;
}
.reserved-strip li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.reserved-strip li code,
.reserved-strip li .muted {
  overflow-wrap: anywhere;
}
.reserved-check {
  color: var(--success);
  font-weight: 700;
  flex: 0 0 auto;
}
.site-footer {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px clamp(20px, 4vw, 48px);
  width: 100%;
  color: var(--ink-faint);
  font-size: 12px;
  text-align: center;
}
.site-footer a { color: var(--accent); }
.gate-main .hero-center h1 { max-width: none; font-size: 2rem; }
@media (max-width: 640px) {
  .link-bar {
    flex-direction: column;
    border-radius: 14px;
    min-height: 0;
  }
  .link-bar-divider { width: auto; height: 1px; margin: 0 16px; }
  .link-bar-slug { padding: 12px 16px 0; flex: none; width: 100%; }
  .link-bar-slug input { padding: 8px 36px 8px 0; font-size: 17px; }
  .link-bar-url { padding: 12px 16px; font-size: 17px; }
  .link-bar-submit {
    width: 100%;
    padding: 14px;
    border-radius: 0 0 13px 13px;
  }
  .activate-bar { flex-direction: column; border-radius: 14px; }
  .activate-bar .btn-primary { padding: 14px; border-radius: 0 0 13px 13px; }
}
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
