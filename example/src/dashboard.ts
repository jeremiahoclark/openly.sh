import type { CountryGeo, DashboardStats, StatsBucket } from './router.ts';

type SlugRow = {
  slug: string;
  url: string;
  created_at: number;
  clicks: number;
};

const BRAND = 'dataly';

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function renderDashboard(
  rows: SlugRow[],
  slugFilter: string | null,
  stats: DashboardStats,
  origin: string,
): string {
  const tableRows = rows.length
    ? rows.map(rowHtml).join('\n')
    : `<tr><td colspan="3" class="empty">No slugs yet. Create one above.</td></tr>`;

  const filterOptions = [
    `<option value="" ${slugFilter ? '' : 'selected'}>All slugs</option>`,
    ...rows.map(
      (r) =>
        `<option value="${escapeHtml(r.slug)}" ${slugFilter === r.slug ? 'selected' : ''}>${escapeHtml(r.slug)}</option>`,
    ),
  ].join('\n');

  const scopeLabel = slugFilter ? `<code>${escapeHtml(slugFilter)}</code>` : 'all slugs';

  const dataPayload = JSON.stringify({
    timeSeries: stats.timeSeries,
    countriesGeo: stats.countriesGeo,
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(BRAND)} — link tracker</title>
<style>
:root {
  color-scheme: light;
  --ink: #1a1a1a;
  --ink-soft: #555;
  --ink-faint: #888;
  --paper: #f7f4ef;
  --rule: #d4cfc4;
  --accent: #b8422e;
  --accent-soft: #e9c8c0;
  --bar-bg: #f0ebe2;
  --map-empty: #ece7dd;
  --map-stroke: #fff;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font: 15px/1.5 ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  padding: 48px 24px 96px;
}
main { max-width: 980px; margin: 0 auto; }
h1 {
  font-family: "Times New Roman", Georgia, serif;
  font-weight: 400;
  font-size: 40px;
  letter-spacing: -0.01em;
  margin: 0 0 4px;
}
.subtitle { color: var(--ink-soft); margin: 0 0 32px; }
.card {
  background: #fff;
  border: 1px solid var(--rule);
  padding: 24px;
  margin-bottom: 32px;
}
.card h2 {
  font-family: "Times New Roman", Georgia, serif;
  font-weight: 400;
  font-size: 22px;
  margin: 0 0 16px;
}
form.create { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
form.filter { display: flex; gap: 12px; align-items: end; margin-bottom: 24px; }
form.filter label { flex: 1; max-width: 280px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.08em; }
input[type="text"], input[type="url"], select {
  padding: 10px 12px;
  border: 1px solid var(--rule);
  background: #fff;
  font: inherit;
  color: var(--ink);
}
select { appearance: none; padding-right: 32px; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='%23555' d='M6 8L2 4h8z'/></svg>"); background-repeat: no-repeat; background-position: right 10px center; }
input:focus, select:focus { outline: 2px solid var(--accent); outline-offset: -2px; }
button {
  padding: 10px 16px;
  background: var(--accent);
  color: #fff;
  border: 0;
  font: inherit;
  cursor: pointer;
}
button.secondary { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
button:hover { background: #99371e; }
button.secondary:hover { background: var(--accent); color: #fff; }
form.create button { grid-column: 1 / -1; justify-self: start; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--rule); vertical-align: top; }
th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); border-bottom: 1px solid var(--ink); }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
.slug-cell { display: flex; align-items: center; gap: 8px; }
.slug-name { color: var(--accent); font-weight: 500; }
.copy-btn {
  appearance: none;
  background: transparent;
  border: 0;
  color: var(--ink-faint);
  padding: 2px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  transition: color 120ms ease;
}
.copy-btn:hover { color: var(--accent); }
.copy-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.copy-btn svg { width: 14px; height: 14px; display: block; }
.copy-btn .icon-check { display: none; }
.copy-btn.is-copied { color: var(--accent); }
.copy-btn.is-copied .icon-copy { display: none; }
.copy-btn.is-copied .icon-check { display: block; }
.dest { color: var(--ink-soft); word-break: break-all; }
.empty { text-align: center; color: var(--ink-soft); padding: 24px; }
.note { color: var(--ink-soft); font-size: 12px; margin-top: 16px; }

.viz-scope { font-size: 13px; color: var(--ink-soft); margin: 0 0 24px; }
.viz-scope code { background: var(--bar-bg); padding: 1px 6px; border-radius: 2px; color: var(--ink); }

.viz-row { border: 1px solid var(--rule); padding: 20px; margin-bottom: 20px; }
.viz-row h3 {
  font-family: "Times New Roman", Georgia, serif;
  font-weight: 400;
  font-size: 18px;
  margin: 0 0 4px;
}
.viz-row .viz-sub { font-size: 11px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 16px; }
.viz-empty { color: var(--ink-faint); font-size: 13px; padding: 40px 0; text-align: center; }

#dataly-timeseries { width: 100%; height: 220px; display: block; }
#dataly-map-wrap { position: relative; }
#dataly-map { width: 100%; height: 420px; display: block; }

.ts-bar { fill: var(--accent); transition: fill 120ms ease; }
.ts-bar:hover { fill: #99371e; }
.ts-axis text { font: 10px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; fill: var(--ink-faint); }
.ts-axis line, .ts-axis path { stroke: var(--rule); }
.ts-axis .domain { display: none; }
.ts-grid line { stroke: var(--bar-bg); stroke-dasharray: 2,3; }
.ts-grid path { display: none; }

.map-country { stroke: var(--map-stroke); stroke-width: 0.4; cursor: default; }
.map-country.has-data { cursor: default; }
.map-country.hover-active { stroke: var(--ink); stroke-width: 0.8; }

.viz-tooltip {
  position: absolute;
  pointer-events: none;
  background: var(--ink);
  color: #fff;
  font: 12px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  padding: 6px 10px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 120ms ease;
  transform: translate(-50%, -120%);
  z-index: 10;
}
.viz-tooltip.is-visible { opacity: 1; }

.map-legend { display: flex; gap: 12px; align-items: center; margin-top: 16px; font-size: 11px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.08em; }
.map-legend .swatch-row { display: flex; gap: 0; }
.map-legend .swatch { width: 24px; height: 12px; }

.bars-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
@media (max-width: 720px) { .bars-grid { grid-template-columns: 1fr; } }
.bars-grid .viz-row { margin-bottom: 0; }

.bar-list { list-style: none; padding: 0; margin: 0; }
.bar-list li { margin-bottom: 10px; font-size: 13px; }
.bar-list .bar-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px; }
.bar-list .bar-label { color: var(--ink); }
.bar-list .bar-count { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.bar-list .bar-track { height: 6px; background: var(--bar-bg); position: relative; }
.bar-list .bar-fill { height: 100%; background: var(--accent); }

.slug-field { position: relative; }
.slug-field input { padding-right: 36px; }
.slug-status {
  position: absolute;
  right: 12px;
  top: 50%;
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
.slug-status.is-available { opacity: 1; color: #2f7a3d; }
.slug-status.is-taken { opacity: 1; color: #b8422e; }
.slug-feedback {
  display: block;
  min-height: 16px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--ink-soft);
  grid-column: 1 / -1;
  text-transform: none;
  letter-spacing: 0;
}
.slug-feedback .preview { color: var(--ink); }
.slug-feedback.is-available { color: #2f7a3d; }
.slug-feedback.is-taken { color: #b8422e; }
form.create button[disabled] { background: var(--ink-faint); cursor: not-allowed; }
form.create button[disabled]:hover { background: var(--ink-faint); }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(BRAND)}</h1>
  <p class="subtitle">Self-hosted link tracker. Public endpoint — anyone with this URL can create slugs.</p>

  <section class="card">
    <h2>Create a slug</h2>
    <form class="create" id="dataly-create-form" method="post" action="/api/slugs">
      <label>Slug name
        <div class="slug-field">
          <input type="text" id="slug-input" name="slug" placeholder="data report 1" required autocomplete="off">
          <span id="slug-status" class="slug-status" aria-hidden="true"></span>
        </div>
      </label>
      <label>Destination URL
        <input type="url" name="url" placeholder="https://example.com" required autocomplete="off">
      </label>
      <span id="slug-feedback" class="slug-feedback" aria-live="polite"></span>
      <button type="submit" id="dataly-submit">Create</button>
    </form>
    <p class="note">"Data Report 1" becomes <code>data-report-1</code>. Resulting link: <code>${escapeHtml(origin)}/l/data-report-1</code>.</p>
  </section>

  <section class="card">
    <h2>Slugs</h2>
    <table>
      <thead>
        <tr>
          <th>Slug</th>
          <th>Destination</th>
          <th class="num">Clicks</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    <p class="note">Clicks = distinct IPs all-time, excluding known Google/Apple prefetch ASNs.</p>
  </section>

  <section class="card">
    <h2>Analytics</h2>
    <form class="filter" method="get" action="/">
      <label>Filter by slug
        <select name="slug" onchange="this.form.submit()">
          ${filterOptions}
        </select>
      </label>
      ${slugFilter ? `<a class="secondary" href="/" style="padding: 10px 16px; text-decoration: none; display: inline-block;">Clear</a>` : ''}
    </form>
    <p class="viz-scope">Scope: ${scopeLabel} · ${stats.totalClicks} unique visitor${stats.totalClicks === 1 ? '' : 's'} (prefetches excluded)</p>

    <div class="viz-row">
      <h3>Clicks over time</h3>
      <p class="viz-sub">Last ${stats.timeSeries.length} days · daily distinct IPs</p>
      ${stats.timeSeries.some((d) => d.count > 0)
        ? '<svg id="dataly-timeseries"></svg>'
        : '<div class="viz-empty">No clicks yet.</div>'}
    </div>

    <div class="viz-row">
      <h3>Location</h3>
      <p class="viz-sub">Hover a region to see its count · distinct IPs all-time</p>
      ${stats.countriesGeo.length > 0
        ? '<div id="dataly-map-wrap"><svg id="dataly-map"></svg><div id="dataly-map-tooltip" class="viz-tooltip"></div></div>'
        : '<div class="viz-empty">No location data yet.</div>'}
    </div>

    <div class="bars-grid">
      ${barListPanel('Top countries', stats.topCountries)}
      ${barListPanel('Devices', stats.devices.map((b) => ({ ...b, label: titleCase(b.label) })))}
      ${barListPanel('Operating systems', stats.operatingSystems)}
    </div>
  </section>
</main>

<script id="dataly-data" type="application/json">${jsonForScriptTag(dataPayload)}</script>
<script type="module">
  import * as d3 from 'https://esm.sh/d3@7';
  import { feature } from 'https://esm.sh/topojson-client@3';

  const data = JSON.parse(document.getElementById('dataly-data').textContent);

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
    const submit = document.getElementById('dataly-submit');
    if (!submit) return;
    submit.disabled = !slugState.ready;
  }
  (() => {
    const input = document.getElementById('slug-input');
    const status = document.getElementById('slug-status');
    const feedback = document.getElementById('slug-feedback');
    const submit = document.getElementById('dataly-submit');
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
      feedback.innerHTML = \`Available · resulting link <span class="preview">\${location.origin}/l/\${normalized}</span>\`;
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
  const tsEl = document.getElementById('dataly-timeseries');
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
  const mapEl = document.getElementById('dataly-map');
  const tooltipEl = document.getElementById('dataly-map-tooltip');
  const wrapEl = document.getElementById('dataly-map-wrap');
  if (mapEl && data.countriesGeo.length > 0) {
    renderMap(mapEl, tooltipEl, wrapEl, data.countriesGeo).catch(err => {
      console.error('Map render failed:', err);
      mapEl.outerHTML = '<div class="viz-empty">Map failed to load. Check console.</div>';
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
      .interpolator(d3.interpolateRgb('#f3dad2', '#b8422e'));

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
    <td class="dest">${escapeHtml(row.url)}</td>
    <td class="num">${row.clicks}</td>
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
