import type { CountryGeo, DashboardStats, StatsBucket } from './router.ts';
import { FREE_LINK_LIMIT, type AuthUser, type MagicLinkRequestResult } from './auth.ts';
import { destinationUrlClientHelpers } from './urlField.ts';

type SlugRow = {
  slug: string;
  url: string;
  created_at: number;
  clicks: number;
};

const BRAND = 'openly';

function brandLogoSvg(size = 28): string {
  return `<svg class="brand-logo" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <rect width="64" height="64" rx="16" fill="var(--logo-bg)"/>
  <path d="M24 34.5h16c4.1 0 7.5-3.4 7.5-7.5S44.1 19.5 40 19.5h-5.5" fill="none" stroke="var(--logo-ink)" stroke-width="4" stroke-linecap="round"/>
  <path d="M40 29.5H24c-4.1 0-7.5 3.4-7.5 7.5s3.4 7.5 7.5 7.5h5.5" fill="none" stroke="var(--logo-accent)" stroke-width="4" stroke-linecap="round"/>
</svg>`;
}

export function renderSignIn(opts: {
  origin: string;
  email?: string;
  message?: string;
  error?: string;
}): string {
  const email = opts.email || '';
  return `<!doctype html>
<html lang="en">
<head>
${headHtml(`${BRAND} - sign in`, opts.origin)}
</head>
<body>
<main class="auth-shell">
  <section class="auth-panel">
    <div class="brand-lockup">${brandLogoSvg(36)}<h1>${escapeHtml(BRAND)}</h1></div>
    <p class="subtitle">Create and track your short links.</p>
    ${opts.message ? `<p class="flash is-ok">${escapeHtml(opts.message)}</p>` : ''}
    ${opts.error ? `<p class="flash is-error">${escapeHtml(opts.error)}</p>` : ''}
    <form class="auth-form" method="post" action="/auth/magic-link">
      <label>Email
        <input type="email" name="email" value="${escapeHtml(email)}" placeholder="you@example.com" required autocomplete="email">
      </label>
      <button type="submit">Send magic link</button>
    </form>
    <p class="note">Free: ${FREE_LINK_LIMIT} active links. Pro is temporarily included.</p>
  </section>
</main>
</body>
</html>`;
}

export function renderMagicLinkSent(result: MagicLinkRequestResult): string {
  return `<!doctype html>
<html lang="en">
<head>
${headHtml(`${BRAND} - check your email`)}
</head>
<body>
<main class="auth-shell">
  <section class="auth-panel auth-panel--sent">
    <div class="sent-icon" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none"><rect x="6" y="12" width="36" height="26" rx="4" stroke="currentColor" stroke-width="2"/><path d="M6 16l18 12L42 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <h1>Check your email</h1>
    <p class="subtitle">We sent a sign-in link to <strong>${escapeHtml(result.email)}</strong>.</p>
    ${
      result.devLink
        ? `<p class="flash is-dev">Email is not configured. Dev link: <a href="${escapeHtml(result.devLink)}">${escapeHtml(result.devLink)}</a></p>`
        : ''
    }
    <p class="note">Magic links expire after 15 minutes.</p>
  </section>
</main>
</body>
</html>`;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function renderDashboard(
  rows: SlugRow[],
  slugFilter: string | null,
  stats: DashboardStats,
  origin: string,
  user: AuthUser,
  welcomeMessage?: string,
): string {
  const tableRows = rows.length
    ? rows.map(rowHtml).join('\n')
    : `<tr><td colspan="4" class="empty">No links yet — create your first one above.</td></tr>`;

  const filterOptions = [
    `<option value="" ${slugFilter ? '' : 'selected'}>All links</option>`,
    ...rows.map(
      (r) =>
        `<option value="${escapeHtml(r.slug)}" ${slugFilter === r.slug ? 'selected' : ''}>${escapeHtml(r.slug)}</option>`,
    ),
  ].join('\n');

  const scopeLabel = slugFilter ? `<code>${escapeHtml(slugFilter)}</code>` : 'all links';

  const dataPayload = JSON.stringify({
    timeSeries: stats.timeSeries,
    countriesGeo: stats.countriesGeo,
  });
  const activeCount = rows.length;
  const atLimit = activeCount >= user.linkLimit;
  const limitLabel = user.linkLimit >= 1000 ? 'Pro active' : `${user.linkLimit} links`;
  const proUntil = user.pro_until ? new Date(user.pro_until).toLocaleDateString('en-US') : null;
  const usagePct = user.linkLimit >= 1000 ? 0 : Math.min(100, Math.round((activeCount / user.linkLimit) * 100));
  const slotsLeft = Math.max(0, user.linkLimit - activeCount);

  return `<!doctype html>
<html lang="en">
<head>
${headHtml(`${BRAND} - link tracker`, origin)}
<style>
${dashboardStyles()}
</style>
</head>
<body>
<main>
  ${welcomeMessage ? `<p class="flash is-ok dashboard-welcome">${escapeHtml(welcomeMessage)}</p>` : ''}
  <header class="topbar">
    <div class="topbar-brand">
      <div class="brand-lockup">${brandLogoSvg(32)}<h1>${escapeHtml(BRAND)}</h1></div>
      <p class="subtitle">Short links and click analytics.</p>
    </div>
    <div class="account-panel">
      <p class="account-email">${escapeHtml(user.email)}</p>
      <p class="account-meta">${escapeHtml(limitLabel)} · ${activeCount} active</p>
      ${user.isPro ? `<p class="account-meta">Included${proUntil ? ` until ${escapeHtml(proUntil)}` : ' for now'}.</p>` : `<p class="account-meta">$5/month or $25/year later.</p>`}
      <div class="account-actions">
        <span class="plan-pill">${escapeHtml(user.planLabel)}</span>
        <form method="post" action="/auth/logout">
          <button type="submit" class="ghost-button">Sign out</button>
        </form>
      </div>
    </div>
  </header>

  <div class="stat-grid">
    <article class="stat-card">
      <span class="stat-label">Active links</span>
      <span class="stat-value">${activeCount}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">Unique visitors</span>
      <span class="stat-value">${stats.totalClicks.toLocaleString('en-US')}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">${slugFilter ? 'Filtered slug' : 'Scope'}</span>
      <span class="stat-value stat-value--sm">${slugFilter ? escapeHtml(slugFilter) : 'All links'}</span>
    </article>
  </div>

  <section class="card">
    <div class="card-head">
      <h2>New link</h2>
      ${user.linkLimit < 1000 ? `<span class="card-badge">${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left</span>` : ''}
    </div>
    ${
      user.linkLimit < 1000
        ? `<div class="usage-meter" role="progressbar" aria-valuenow="${activeCount}" aria-valuemin="0" aria-valuemax="${user.linkLimit}" aria-label="Active links used">
      <div class="usage-meter-fill${atLimit ? ' is-full' : ''}" style="width: ${usagePct}%"></div>
    </div>`
        : ''
    }
    <div class="usage-row">
      <span><strong>${activeCount}</strong> of ${user.linkLimit >= 1000 ? 'unlimited' : user.linkLimit} active</span>
      <span>${user.linkLimit >= 1000 ? 'Pro access' : `${slotsLeft} remaining`}</span>
    </div>
    ${atLimit ? `<div class="limit-warning">You have reached the active link limit for this account. Archive a link to free a slot, or upgrade when billing is connected.</div>` : ''}
    <form class="create" id="openly-create-form" method="post" action="/api/slugs">
      <label>Slug
        <div class="slug-field">
          <input type="text" id="slug-input" name="slug" placeholder="data report 1" required autocomplete="off" ${atLimit ? 'disabled' : ''}>
          <span id="slug-status" class="slug-status" aria-hidden="true"></span>
        </div>
      </label>
      <label>Destination
        <input type="text" id="url-input" name="url" inputmode="url" placeholder="company.com" required autocomplete="off" ${atLimit ? 'disabled' : ''}>
      </label>
      <span id="slug-feedback" class="slug-feedback" aria-live="polite"></span>
      <button type="submit" id="openly-submit" ${atLimit ? 'disabled' : ''}>Create link</button>
    </form>
    <p class="note"><code>data report 1</code> becomes <code>data-report-1</code>. Link: <code>${escapeHtml(origin)}/l/data-report-1</code>.</p>
  </section>

  <section class="card">
    <div class="card-head"><h2>Links</h2></div>
    <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Slug</th>
          <th>Destination</th>
          <th class="num">Clicks</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    </div>
    <p class="note">Unique visitors. Prefetches excluded.</p>
  </section>

  <section class="card card--analytics">
    <div class="card-head"><h2>Analytics</h2></div>
    <form class="filter" method="get" action="/">
      <label>Filter
        <select name="slug" onchange="this.form.submit()">
          ${filterOptions}
        </select>
      </label>
      ${slugFilter ? `<a class="secondary-link" href="/">Clear</a>` : ''}
    </form>
    <p class="viz-scope">Showing ${scopeLabel} · <strong>${stats.totalClicks}</strong> unique visitor${stats.totalClicks === 1 ? '' : 's'}</p>

    <div class="viz-row viz-row--chart">
      <h3>Clicks over time</h3>
      <p class="viz-sub">Last ${stats.timeSeries.length} days</p>
      ${stats.timeSeries.some((d) => d.count > 0)
        ? '<svg id="openly-timeseries"></svg>'
        : '<div class="viz-empty">No clicks yet.</div>'}
    </div>

    <div class="viz-row viz-row--map">
      <h3>Location</h3>
      <p class="viz-sub">All-time unique visitors by country</p>
      ${stats.countriesGeo.length > 0
        ? '<div id="openly-map-wrap"><svg id="openly-map"></svg><div id="openly-map-tooltip" class="viz-tooltip"></div></div>'
        : '<div class="viz-empty">No location data yet.</div>'}
    </div>

    <div class="bars-grid">
      ${barListPanel('Top countries', stats.topCountries)}
      ${barListPanel('Devices', stats.devices.map((b) => ({ ...b, label: titleCase(b.label) })))}
      ${barListPanel('Operating systems', stats.operatingSystems)}
    </div>
  </section>
</main>

<script id="openly-data" type="application/json">${jsonForScriptTag(dataPayload)}</script>
<script type="module">
  import * as d3 from 'https://esm.sh/d3@7';
  import { feature } from 'https://esm.sh/topojson-client@3';

  ${destinationUrlClientHelpers()}

  const data = JSON.parse(document.getElementById('openly-data').textContent);

  (() => {
    const createForm = document.getElementById('openly-create-form');
    const urlInput = document.getElementById('url-input');
    if (!createForm || !urlInput) return;
    createForm.addEventListener('submit', (e) => {
      const check = validateDestinationUrl(urlInput.value);
      if (!check.ok) {
        e.preventDefault();
        const feedback = document.getElementById('slug-feedback');
        if (feedback) {
          feedback.className = 'slug-feedback is-taken';
          feedback.textContent = check.reason;
        }
        return;
      }
      prepareDestinationUrlInput(urlInput);
    });
  })();

  // ----- Copy buttons -----
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slug = btn.getAttribute('data-slug');
      if (!slug) return;
      const fullUrl = \`\${location.origin}/l/\${slug}\`;
      try {
        await navigator.clipboard.writeText(fullUrl);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = fullUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
      }
      btn.classList.add('is-copied');
      btn.setAttribute('aria-label', 'Copied');
      setTimeout(() => {
        btn.classList.remove('is-copied');
        btn.setAttribute('aria-label', \`Copy link for \${slug}\`);
      }, 1400);
    });
  });

  // ----- Live slug availability check -----
  const slugState = { ready: false };
  function refreshSubmit() {
    const submit = document.getElementById('openly-submit');
    if (!submit) return;
    submit.disabled = !slugState.ready;
  }
  (() => {
    const input = document.getElementById('slug-input');
    const status = document.getElementById('slug-status');
    const feedback = document.getElementById('slug-feedback');
    const submit = document.getElementById('openly-submit');
    if (!input || !status || !feedback || !submit) return;

    const ICON_CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 5"/></svg>';
    const ICON_X = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
    const ICON_SPINNER = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="5" stroke-opacity="0.25"/><path d="M8 3a5 5 0 0 1 5 5"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.9s" repeatCount="indefinite"/></path></svg>';

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
      feedback.className = 'slug-feedback';
      feedback.textContent = 'Checking…';
      slugState.ready = false;
      refreshSubmit();
    }

    function setAvailable(normalized) {
      status.className = 'slug-status is-available';
      status.innerHTML = ICON_CHECK;
      feedback.className = 'slug-feedback is-available';
      feedback.innerHTML = \`Available · Link: <span class="preview">\${location.origin}/l/\${normalized}</span>\`;
      slugState.ready = true;
      refreshSubmit();
    }

    function setUnavailable(reason, normalized) {
      status.className = 'slug-status is-taken';
      status.innerHTML = ICON_X;
      feedback.className = 'slug-feedback is-taken';
      feedback.textContent = normalized ? \`\${reason} (\${normalized})\` : reason;
      slugState.ready = false;
      refreshSubmit();
    }

    let abortCtrl = null;
    let debounceTimer = null;
    let lastQuery = '';

    function check(raw) {
      if (!raw.trim()) { setIdle(); return; }
      if (abortCtrl) abortCtrl.abort();
      abortCtrl = new AbortController();
      setChecking();
      fetch(\`/api/check?slug=\${encodeURIComponent(raw)}\`, { signal: abortCtrl.signal })
        .then(r => r.json())
        .then(j => {
          if (raw !== lastQuery) return;
          if (j.available) setAvailable(j.normalized);
          else setUnavailable(j.reason || 'Not available.', j.normalized);
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          setIdle();
        });
    }

    input.addEventListener('input', () => {
      const v = input.value;
      lastQuery = v;
      clearTimeout(debounceTimer);
      if (!v.trim()) { setIdle(); return; }
      debounceTimer = setTimeout(() => check(v), 250);
    });
  })();

  refreshSubmit();

  // ----- Time series -----
  const tsEl = document.getElementById('openly-timeseries');
  if (tsEl && data.timeSeries.some(d => d.count > 0)) {
    renderTimeSeries(tsEl, data.timeSeries);
  }

  function renderTimeSeries(svgEl, series) {
    const rect = svgEl.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const margin = { top: 12, right: 16, bottom: 28, left: 32 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl)
      .attr('viewBox', \`0 0 \${width} \${height}\`)
      .attr('preserveAspectRatio', 'none');

    const g = svg.append('g').attr('transform', \`translate(\${margin.left},\${margin.top})\`);

    const x = d3.scaleBand()
      .domain(series.map(d => d.day))
      .range([0, innerW])
      .padding(0.18);

    const maxVal = Math.max(1, d3.max(series, d => d.count));
    const y = d3.scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]);

    g.append('g')
      .attr('class', 'ts-grid')
      .call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(''));

    const tickIdx = new Set([0, Math.floor(series.length / 2), series.length - 1]);
    const xTickValues = series.filter((_, i) => tickIdx.has(i)).map(d => d.day);
    g.append('g')
      .attr('class', 'ts-axis')
      .attr('transform', \`translate(0,\${innerH})\`)
      .call(d3.axisBottom(x).tickValues(xTickValues).tickFormat(d => {
        const [, m, day] = d.split('-');
        return \`\${m}/\${day}\`;
      }));

    g.append('g')
      .attr('class', 'ts-axis')
      .call(d3.axisLeft(y).ticks(4));

    const bars = g.selectAll('rect.ts-bar')
      .data(series)
      .enter().append('rect')
        .attr('class', 'ts-bar')
        .attr('x', d => x(d.day))
        .attr('y', d => y(d.count))
        .attr('width', x.bandwidth())
        .attr('height', d => innerH - y(d.count))
        .style('opacity', d => d.count === 0 ? 0.15 : 1);

    bars.append('title').text(d => \`\${d.day} · \${d.count} click\${d.count === 1 ? '' : 's'}\`);
  }

  // ----- Map -----
  const mapEl = document.getElementById('openly-map');
  const tooltipEl = document.getElementById('openly-map-tooltip');
  const wrapEl = document.getElementById('openly-map-wrap');
  if (mapEl && data.countriesGeo.length > 0) {
    renderMap(mapEl, tooltipEl, wrapEl, data.countriesGeo).catch(err => {
      console.error('Map render failed:', err);
      mapEl.outerHTML = '<div class="viz-empty">Map unavailable.</div>';
    });
  }

  async function renderMap(svgEl, tooltipEl, wrapEl, countriesGeo) {
    const rect = svgEl.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const svg = d3.select(svgEl)
      .attr('viewBox', \`0 0 \${width} \${height}\`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const byNumeric = new Map();
    let maxCount = 0;
    let unknownCount = 0;
    for (const c of countriesGeo) {
      if (c.numeric !== null && c.numeric !== undefined && c.code !== 'Unknown') {
        byNumeric.set(c.numeric, c);
        if (c.count > maxCount) maxCount = c.count;
      } else if (c.code === 'Unknown') {
        unknownCount = c.count;
      }
    }

    const color = d3.scaleSequential()
      .domain([0, Math.max(1, maxCount)])
      .interpolator(d3.interpolateRgb('#dbeafe', '#2563eb'));

    const topo = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r => r.json());
    const countries = feature(topo, topo.objects.countries);

    const projection = d3.geoNaturalEarth1().fitSize([width, height], countries);
    const path = d3.geoPath(projection);

    svg.selectAll('path.map-country')
      .data(countries.features)
      .enter().append('path')
        .attr('class', d => byNumeric.has(+d.id) ? 'map-country has-data' : 'map-country')
        .attr('d', path)
        .attr('fill', d => {
          const entry = byNumeric.get(+d.id);
          return entry ? color(entry.count) : 'var(--map-empty)';
        })
        .on('mouseenter', function(event, d) {
          d3.select(this).classed('hover-active', true);
          const entry = byNumeric.get(+d.id);
          const name = (d.properties && d.properties.name) || 'Unknown';
          const count = entry ? entry.count : 0;
          tooltipEl.textContent = count > 0
            ? \`\${name} · \${count} visitor\${count === 1 ? '' : 's'}\`
            : \`\${name} · no visitors\`;
          tooltipEl.classList.add('is-visible');
        })
        .on('mousemove', function(event) {
          const wrapRect = wrapEl.getBoundingClientRect();
          tooltipEl.style.left = (event.clientX - wrapRect.left) + 'px';
          tooltipEl.style.top = (event.clientY - wrapRect.top) + 'px';
        })
        .on('mouseleave', function() {
          d3.select(this).classed('hover-active', false);
          tooltipEl.classList.remove('is-visible');
        });

    if (maxCount > 0) {
      const legend = d3.select(wrapEl)
        .append('div')
        .attr('class', 'map-legend');
      legend.append('span').text('Low');
      const swatchRow = legend.append('div').attr('class', 'swatch-row');
      for (let i = 0; i <= 6; i++) {
        swatchRow.append('span')
          .attr('class', 'swatch')
          .style('background', color((i / 6) * maxCount));
      }
      legend.append('span').text(\`High (max \${maxCount})\`);
      if (unknownCount > 0) {
        legend.append('span').style('margin-left', '12px').text(\`· Unknown: \${unknownCount}\`);
      }
    }
  }
</script>
</body>
</html>`;
}

function barListPanel(title: string, buckets: StatsBucket[]): string {
  if (buckets.length === 0) {
    return `<div class="viz-row">
      <h3>${title}</h3>
      <p class="viz-sub">distinct IPs</p>
      <div class="viz-empty">No data yet.</div>
    </div>`;
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const items = buckets
    .map((b) => {
      const pct = Math.round((b.count / max) * 100);
      return `<li>
        <div class="bar-row">
          <span class="bar-label">${escapeHtml(b.label)}</span>
          <span class="bar-count">${b.count}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width: ${pct}%"></div></div>
      </li>`;
    })
    .join('');

  return `<div class="viz-row">
    <h3>${title}</h3>
    <p class="viz-sub">distinct IPs</p>
    <ul class="bar-list">${items}</ul>
  </div>`;
}

function cssTokens(): string {
  return `:root {
  color-scheme: light;
  --ink: #111827;
  --ink-soft: #4b5563;
  --ink-faint: #9ca3af;
  --paper: #f3f4f8;
  --surface: #fff;
  --surface-raised: #fafbfc;
  --rule: #e5e7eb;
  --rule-soft: #f0f1f4;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-pressed: #1e40af;
  --accent-soft: #eff6ff;
  --focus: rgba(37, 99, 235, .28);
  --success: #15803d;
  --success-soft: #f0fdf4;
  --danger: #dc2626;
  --danger-soft: #fef2f2;
  --shadow-sm: 0 1px 2px rgba(17, 24, 39, .05);
  --shadow-md: 0 8px 24px rgba(17, 24, 39, .06);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --bar-bg: #e8ecf2;
  --logo-bg: #eef2ff;
  --logo-ink: #111827;
  --logo-accent: #2563eb;
  --map-empty: #f0f2f6;
  --map-stroke: #fff;
}`;
}

function baseStyles(): string {
  return `${cssTokens()}
* { box-sizing: border-box; }
body {
  margin: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37, 99, 235, .08), transparent),
    var(--paper);
  color: var(--ink);
  font: 15px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  padding: 48px 24px 96px;
  -webkit-font-smoothing: antialiased;
}
h1 {
  font-weight: 650;
  font-size: 1.75rem;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 0;
}
.subtitle { color: var(--ink-soft); margin: 0 0 24px; line-height: 1.5; }
.brand-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.brand-lockup h1 { margin: 0; }
.brand-logo { flex-shrink: 0; display: block; }
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-soft);
}
input[type="email"], input[type="text"], input[type="url"], select {
  padding: 11px 13px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font: inherit;
  color: var(--ink);
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
input::placeholder { color: var(--ink-faint); }
input:focus, select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--focus);
}
select {
  appearance: none;
  padding-right: 36px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='%239ca3af' d='M6 8L2 4h8z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 12px center;
}
button, .secondary-link {
  padding: 10px 18px;
  background: var(--accent);
  color: #fff;
  border: 0;
  border-radius: var(--radius-sm);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background 140ms ease, transform 80ms ease;
}
button:hover { background: var(--accent-hover); }
button:active { background: var(--accent-pressed); transform: translateY(1px); }
.note { color: var(--ink-soft); font-size: 12px; margin-top: 16px; line-height: 1.55; }
.note code {
  font-size: 11px;
  background: var(--rule-soft);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--ink);
}
.flash {
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: 13px;
  margin: 0 0 16px;
  word-break: break-word;
  line-height: 1.45;
}
.flash.is-ok { color: var(--success); background: var(--success-soft); border: 1px solid rgba(21, 128, 61, .2); }
.flash.is-error { color: var(--danger); background: var(--danger-soft); border: 1px solid rgba(220, 38, 38, .2); }
.flash.is-dev { color: var(--ink); background: var(--bar-bg); border: 1px solid var(--rule); }
.flash a { color: var(--accent); font-weight: 500; }
.dashboard-welcome { margin-bottom: 20px; }
.auth-shell { min-height: calc(100vh - 144px); display: grid; place-items: center; padding: 16px 0; }
.auth-panel {
  width: min(100%, 420px);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-md);
}
.auth-panel--sent { text-align: center; }
.auth-panel--sent .subtitle { margin-bottom: 0; }
.auth-panel--sent .brand-lockup { justify-content: center; }
.sent-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.sent-icon svg { width: 28px; height: 28px; display: block; }
.auth-form { display: grid; gap: 16px; margin-top: 8px; }
.auth-form button { width: 100%; margin-top: 4px; }
.ghost-button {
  background: transparent;
  color: var(--ink-soft);
  border: 1px solid var(--rule);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 999px;
}
.ghost-button:hover { background: var(--rule-soft); color: var(--ink); border-color: var(--rule); }
.ghost-button:active { transform: none; }
.ghost-button--danger { color: var(--danger); border-color: rgba(220, 38, 38, .25); }
.ghost-button--danger:hover { background: var(--danger-soft); color: var(--danger); border-color: rgba(220, 38, 38, .35); }
.secondary-link {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  background: var(--surface);
  color: var(--accent);
  border: 1px solid var(--rule);
  box-shadow: var(--shadow-sm);
}
.secondary-link:hover { background: var(--accent-soft); color: var(--accent-hover); border-color: rgba(37, 99, 235, .25); }
@media (max-width: 520px) {
  body { padding: 28px 16px 72px; }
  .auth-shell { min-height: calc(100vh - 100px); display: block; }
  .auth-panel { padding: 24px; }
}`;
}

function dashboardStyles(): string {
  return `${baseStyles()}
main { max-width: 1080px; margin: 0 auto; }
.topbar {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 28px;
}
.topbar-brand .subtitle { margin: 4px 0 0; }
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.stat-card {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  box-shadow: var(--shadow-sm);
}
.stat-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-soft);
  margin-bottom: 6px;
}
.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.stat-value--sm { font-size: 1rem; font-weight: 600; word-break: break-all; }
.card {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.card h2 {
  font-weight: 650;
  font-size: 1.05rem;
  line-height: 1.25;
  margin: 0;
  letter-spacing: -0.01em;
}
.card-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 4px 10px;
  border-radius: 999px;
}
.usage-meter {
  height: 6px;
  background: var(--bar-bg);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 12px;
}
.usage-meter-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #60a5fa);
  border-radius: 999px;
  transition: width 300ms ease;
}
.usage-meter-fill.is-full { background: linear-gradient(90deg, var(--danger), #f87171); }
.usage-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
  color: var(--ink-soft);
  font-size: 13px;
  margin-bottom: 18px;
}
.usage-row strong { color: var(--ink); font-weight: 600; }
.limit-warning {
  border: 1px solid rgba(220, 38, 38, .25);
  color: var(--danger);
  background: var(--danger-soft);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: 13px;
  margin-bottom: 18px;
  line-height: 1.45;
}
form.create { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
form.create button { grid-column: 1 / -1; justify-self: start; }
form.create button[disabled] { background: var(--ink-faint); cursor: not-allowed; }
form.create button[disabled]:hover { background: var(--ink-faint); }
form.create button[disabled]:active { transform: none; }
form.filter { display: flex; gap: 12px; align-items: end; margin-bottom: 20px; flex-wrap: wrap; }
form.filter label { flex: 1; min-width: 200px; max-width: 300px; }
.table-wrap {
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--rule-soft); vertical-align: middle; }
tr:last-child td { border-bottom: 0; }
tbody tr { transition: background 120ms ease; }
tbody tr:hover { background: var(--surface-raised); }
th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
  background: var(--surface-raised);
}
td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
.slug-cell { display: flex; align-items: center; gap: 8px; }
.slug-name { color: var(--accent); font-weight: 600; font-size: 14px; }
.copy-btn {
  appearance: none;
  background: var(--rule-soft);
  border: 0;
  color: var(--ink-faint);
  padding: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  transition: background 120ms ease, color 120ms ease;
}
.copy-btn:hover { background: var(--accent-soft); color: var(--accent); }
.copy-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.copy-btn svg { width: 14px; height: 14px; display: block; }
.copy-btn .icon-check { display: none; }
.copy-btn.is-copied { background: var(--accent-soft); color: var(--accent); }
.copy-btn.is-copied .icon-copy { display: none; }
.copy-btn.is-copied .icon-check { display: block; }
.dest { color: var(--ink-soft); word-break: break-all; font-size: 13px; max-width: 360px; }
.dest a { color: inherit; text-decoration: none; }
.dest a:hover { color: var(--accent); text-decoration: underline; }
.empty { text-align: center; color: var(--ink-soft); padding: 32px 16px; }
.archive-form { margin: 0; }
.account-panel {
  min-width: 260px;
  border: 1px solid var(--rule);
  background: var(--surface);
  border-radius: var(--radius-md);
  padding: 18px;
  box-shadow: var(--shadow-sm);
}
.account-panel p { margin: 0; }
.account-email { color: var(--ink); font-weight: 500; word-break: break-all; font-size: 14px; }
.account-meta { color: var(--ink-soft); font-size: 12px; margin-top: 6px !important; line-height: 1.45; }
.account-actions { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-top: 14px; }
.plan-pill {
  display: inline-flex;
  align-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  letter-spacing: 0.02em;
}
.viz-scope { font-size: 13px; color: var(--ink-soft); margin: 0 0 20px; }
.viz-scope code { background: var(--rule-soft); padding: 2px 8px; border-radius: 4px; color: var(--ink); font-size: 12px; }
.viz-scope strong { color: var(--ink); font-weight: 600; }
.viz-row {
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  padding: 20px;
  margin-bottom: 16px;
  background: var(--surface-raised);
}
.viz-row h3 {
  font-weight: 600;
  font-size: 15px;
  line-height: 1.3;
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}
.viz-row .viz-sub { font-size: 12px; color: var(--ink-faint); margin: 0 0 16px; }
.viz-empty {
  color: var(--ink-faint);
  font-size: 13px;
  padding: 48px 16px;
  text-align: center;
  background: var(--surface);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--rule);
}
#openly-timeseries { width: 100%; height: 220px; display: block; }
#openly-map-wrap { position: relative; }
#openly-map { width: 100%; height: 400px; display: block; }
.ts-bar { fill: var(--accent); transition: fill 120ms ease; }
.ts-bar:hover { fill: var(--accent-hover); }
.ts-axis text { font: 10px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif; fill: var(--ink-faint); }
.ts-axis line, .ts-axis path { stroke: var(--rule); }
.ts-axis .domain { display: none; }
.ts-grid line { stroke: var(--bar-bg); stroke-dasharray: 2,3; }
.ts-grid path { display: none; }
.map-country { stroke: var(--map-stroke); stroke-width: 0.4; }
.map-country.hover-active { stroke: var(--ink); stroke-width: 0.8; }
.viz-tooltip {
  position: absolute;
  pointer-events: none;
  background: var(--ink);
  color: #fff;
  font: 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  padding: 8px 12px;
  border-radius: 8px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 120ms ease;
  transform: translate(-50%, -120%);
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}
.viz-tooltip.is-visible { opacity: 1; }
.map-legend { display: flex; gap: 12px; align-items: center; margin-top: 16px; font-size: 11px; color: var(--ink-soft); flex-wrap: wrap; }
.map-legend .swatch-row { display: flex; gap: 0; border-radius: 4px; overflow: hidden; }
.map-legend .swatch { width: 24px; height: 10px; }
.bars-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.bars-grid .viz-row { margin-bottom: 0; height: 100%; }
.bar-list { list-style: none; padding: 0; margin: 0; }
.bar-list li { margin-bottom: 12px; font-size: 13px; }
.bar-list li:last-child { margin-bottom: 0; }
.bar-list .bar-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 5px; }
.bar-list .bar-label { color: var(--ink); font-weight: 500; }
.bar-list .bar-count { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.bar-list .bar-track { height: 6px; background: var(--bar-bg); border-radius: 999px; overflow: hidden; }
.bar-list .bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent), #60a5fa); border-radius: 999px; }
.slug-field { position: relative; }
.slug-field input { padding-right: 40px; }
.slug-status {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: opacity 120ms ease;
  opacity: 0;
}
.slug-status svg { width: 16px; height: 16px; display: block; }
.slug-status.is-checking { opacity: 0.6; }
.slug-status.is-available { opacity: 1; color: var(--success); }
.slug-status.is-taken { opacity: 1; color: var(--danger); }
.slug-feedback {
  display: block;
  min-height: 16px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-soft);
  grid-column: 1 / -1;
}
.slug-feedback .preview { color: var(--ink); font-weight: 500; }
.slug-feedback.is-available { color: var(--success); }
.slug-feedback.is-taken { color: var(--danger); }
@media (max-width: 800px) {
  .stat-grid { grid-template-columns: 1fr; }
  .bars-grid { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  body { padding: 28px 16px 72px; }
  .topbar { flex-direction: column; }
  .account-panel { min-width: 0; width: 100%; }
  form.create { grid-template-columns: 1fr; }
  .table-wrap { overflow-x: auto; }
  .dest { max-width: none; }
}`;
}

function headHtml(title: string, origin = ''): string {
  const ogImage = origin ? `${origin}/og-card.svg` : '/og-card.svg';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<meta name="description" content="Private links. Simple analytics.">
<meta property="og:title" content="${escapeHtml(BRAND)}">
<meta property="og:description" content="Private links. Simple analytics.">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
${baseStyles()}
</style>`;
}

function rowHtml(row: SlugRow): string {
  const slug = escapeHtml(row.slug);
  return `<tr>
    <td>
      <div class="slug-cell">
        <span class="slug-name">${slug}</span>
        <button type="button" class="copy-btn" data-slug="${slug}" aria-label="Copy link for ${slug}" title="Copy link">
          <svg class="icon-copy" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1.2"/><path d="M3 11V3.2A1.2 1.2 0 0 1 4.2 2H11"/></svg>
          <svg class="icon-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 5"/></svg>
        </button>
      </div>
    </td>
    <td class="dest"><a href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.url)}</a></td>
    <td class="num">${row.clicks}</td>
    <td>
      <form class="archive-form" method="post" action="/api/slugs/${encodeURIComponent(row.slug)}/archive" onsubmit="return confirm('Archive ${slug}? Its short link will stop redirecting.')">
        <button type="submit" class="ghost-button ghost-button--danger">Archive</button>
      </form>
    </td>
  </tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// JSON embedded in <script type="application/json"> must escape "</script>".
function jsonForScriptTag(json: string): string {
  return json.replace(/<\/script/gi, '<\\/script');
}
