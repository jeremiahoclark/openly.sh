import type { PendingLink } from './pending.ts';
import { FREE_LINK_LIMIT } from './auth.ts';

const BRAND = '{{PROJECT_NAME}}';
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
              `<li><code>${escapeHtml(l.slug)}</code> → <span class="muted">${escapeHtml(l.url)}</span></li>`,
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
    <h1>Short links<br><span class="hero-accent">made Openly</span></h1>
    <p class="hero-lede">Ship <code>links.you.com/launch</code> with click analytics — without a $30/mo hosted shortener or a weekend wiring Postgres. Self-host in one command, or sign in and run it as a service.</p>

    ${opts.welcome ? `<p class="flash is-ok">Welcome back.${opts.migratedCount ? ` ${opts.migratedCount} link${opts.migratedCount === 1 ? '' : 's'} activated.` : ''}</p>` : ''}
    ${opts.error ? `<p class="flash is-error">${escapeHtml(opts.error)}</p>` : ''}

    ${
      opts.created
        ? `<div class="activate-block">
      <p class="activate-lead">Link reserved. Sign in with a magic link to make it live.</p>
      <div class="link-preview">
        <code class="link-preview-url">${escapeHtml(shortUrl)}</code>
        <span class="link-preview-arrow" aria-hidden="true">→</span>
        <span class="muted">${escapeHtml(opts.created.url)}</span>
      </div>
      <form class="activate-bar" method="post" action="/auth/magic-link">
        <input type="email" name="email" placeholder="you@example.com" required autocomplete="email" aria-label="Email">
        <button type="submit" class="btn-primary">Send magic link</button>
      </form>
      <p class="hint">No password. Your link attaches to this account when you verify email.</p>
      <a class="text-link" href="/">Create another link</a>
    </div>`
        : `<form class="link-bar-form" id="openly-landing-form" method="post" action="/api/pending">
      <div class="link-bar" role="group" aria-label="Create a short link">
        <div class="link-bar-slug">
          <span class="link-bar-prefix" aria-hidden="true">/l/</span>
          <input type="text" id="slug-input" name="slug" placeholder="launch" required autocomplete="off" aria-label="Slug">
          <span id="slug-status" class="slug-status" aria-hidden="true"></span>
        </div>
        <span class="link-bar-divider" aria-hidden="true"></span>
        <input type="url" class="link-bar-url" name="url" placeholder="https://yoursite.com/docs" required autocomplete="off" aria-label="Destination URL">
        <button type="submit" id="openly-submit" class="link-bar-submit" disabled>Create link</button>
      </div>
      <p id="slug-feedback" class="slug-feedback" aria-live="polite"></p>
    </form>
    <p class="hint"><code>data report 1</code> becomes <code>data-report-1</code>. Link goes live after you sign in.</p>`
    }

    <a class="github-cta" href="${GITHUB_REPO}" target="_blank" rel="noopener noreferrer">${githubIcon()} Star us on GitHub</a>
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
      <h3>Deploy in about 60 seconds</h3>
      <p><code>npx create-openly</code> scaffolds a Worker, D1 database, magic-link auth, and dashboard on Cloudflare. You own the code and the bill stays $0 at low traffic.</p>
    </article>
    <article>
      <h3>Analytics developers trust</h3>
      <p>Unique visitors, geo map, device and OS breakdowns. Google and Apple prefetch bots are filtered out so counts reflect real clicks.</p>
    </article>
    <article>
      <h3>Self-host or run as a service</h3>
      <p>Same TypeScript you can read in an hour. Indie devs copy-paste their own tracker; operators run multi-user magic-link sign-in on the same stack.</p>
    </article>
  </section>
</main>

<footer class="site-footer">
  <p>Free: ${FREE_LINK_LIMIT} active links · Pro included for new accounts · <a href="${GITHUB_REPO}">openly.sh on GitHub</a></p>
</footer>

<script type="module">
${opts.created ? '' : landingSlugScript()}
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

function landingSlugScript(): string {
  return `
  const slugState = { ready: false };
  const input = document.getElementById('slug-input');
  const status = document.getElementById('slug-status');
  const feedback = document.getElementById('slug-feedback');
  const submit = document.getElementById('openly-submit');
  if (!input || !status || !feedback || !submit) return;

  const ICON_CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 5"/></svg>';
  const ICON_X = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  const ICON_SPINNER = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="5" stroke-opacity="0.25"/><path d="M8 3a5 5 0 0 1 5 5"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.9s" repeatCount="indefinite"/></path></svg>';

  function refreshSubmit() { submit.disabled = !slugState.ready; }
  function setIdle() {
    status.className = 'slug-status';
    status.innerHTML = '';
    feedback.className = 'slug-feedback';
    feedback.textContent = '';
    slugState.ready = false;
    refreshSubmit();
  }
  function setChecking() {
    status.className = 'slug-status is-checking';
    status.innerHTML = ICON_SPINNER;
    feedback.textContent = 'Checking availability…';
    slugState.ready = false;
    refreshSubmit();
  }
  function setAvailable(normalized) {
    status.className = 'slug-status is-available';
    status.innerHTML = ICON_CHECK;
    feedback.className = 'slug-feedback is-available';
    feedback.innerHTML = \`Available · <span class="preview">\${location.origin}/l/\${normalized}</span>\`;
    slugState.ready = true;
    refreshSubmit();
  }
  function setUnavailable(reason) {
    status.className = 'slug-status is-taken';
    status.innerHTML = ICON_X;
    feedback.className = 'slug-feedback is-taken';
    feedback.textContent = reason;
    slugState.ready = false;
    refreshSubmit();
  }

  let abortCtrl = null;
  let debounceTimer = null;
  let lastQuery = '';
  input.addEventListener('input', () => {
    const v = input.value;
    lastQuery = v;
    clearTimeout(debounceTimer);
    if (!v.trim()) { setIdle(); return; }
    debounceTimer = setTimeout(() => {
      if (abortCtrl) abortCtrl.abort();
      abortCtrl = new AbortController();
      setChecking();
      fetch(\`/api/check?slug=\${encodeURIComponent(v)}\`, { signal: abortCtrl.signal })
        .then(r => r.json())
        .then(j => {
          if (v !== lastQuery) return;
          if (j.available) setAvailable(j.normalized);
          else setUnavailable(j.reason || 'Not available.');
        })
        .catch(err => { if (err.name !== 'AbortError') setIdle(); });
    }, 250);
  });
  refreshSubmit();
`;
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
  --hero-display: clamp(2.5rem, 7vw, 4.25rem);
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
  padding: 32px clamp(20px, 4vw, 48px) 72px;
  width: 100%;
}
.hero-center {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.hero-center h1 {
  font-size: var(--hero-display);
  line-height: 1.05;
  letter-spacing: -0.04em;
  font-weight: 650;
  margin: 0 0 20px;
}
.hero-accent { color: var(--accent); }
.hero-lede {
  font-size: clamp(1rem, 2vw, 1.125rem);
  color: var(--ink-soft);
  margin: 0 0 36px;
  max-width: 44rem;
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
  padding: 16px 36px 16px 0;
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
.link-bar-submit:hover:not(:disabled) { background: #222; }
.link-bar-submit:disabled {
  background: var(--ink-faint);
  cursor: not-allowed;
}
.slug-status {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slug-status.is-checking { opacity: .6; }
.slug-status.is-available { opacity: 1; color: var(--success); }
.slug-status.is-taken { opacity: 1; color: var(--danger); }
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
.github-cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 12px 20px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.github-cta:hover {
  border-color: var(--ink-faint);
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
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
.link-preview-arrow { color: var(--ink-faint); }
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
.reserved-strip ul { margin: 0; padding-left: 18px; color: var(--ink-soft); font-size: 14px; }
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