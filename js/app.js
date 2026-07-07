/* ============================================================
   Maine Forest Dashboard V6 — app.js
   Vanilla JS. Chart.js + Leaflet from CDN. CSV/GeoJSON driven.
   ============================================================ */
'use strict';

/* ---------- palette ---------- */
const C = {
  spruceDk: '#163B27', spruce: '#1F4D33', moss: '#3F7D55', sage: '#7FA98A',
  gold: '#C8873F', goldSoft: '#E7C79A', lake: '#3B6E8F', clay: '#B4552F',
  maple: '#A8422A', ink: '#1B2A20', line: '#DED8C8', cream2: '#EFEBE0'
};
const SERIES = [C.spruce, C.gold, C.lake, C.moss, C.clay, C.sage, C.maple, C.goldSoft];

/* ---------- tiny CSV parser (handles quoted fields) ---------- */
function parseCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (q) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') { q = false; }
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map(h => h.trim());
  return rows.filter(r => r.length && r.some(x => x !== '')).map(r => {
    const o = {}; header.forEach((h, i) => o[h] = (r[i] ?? '').trim()); return o;
  });
}
/* Data loading: on a web server, fetch the live files in data/ (keeps the annual
   update workflow file-based). When opened directly from disk (file://), the browser
   blocks fetch(), so fall back to the data embedded in js/data-embed.js. */
const FILE_MODE = location.protocol === 'file:';
const EMB = window.MFD_EMBED || { csv: {}, json: {} };
const getCSV = f => (FILE_MODE && EMB.csv[f] != null)
  ? Promise.resolve(parseCSV(EMB.csv[f]))
  : fetch('data/' + f).then(r => r.text()).then(parseCSV).catch(() =>
      EMB.csv[f] != null ? parseCSV(EMB.csv[f]) : Promise.reject('no data: ' + f));
const getJSON = f => (FILE_MODE && EMB.json[f] != null)
  ? Promise.resolve(EMB.json[f])
  : fetch('data/' + f).then(r => r.json()).catch(() =>
      EMB.json[f] != null ? EMB.json[f] : Promise.reject('no data: ' + f));
const num = v => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; };

/* ---------- Chart.js global defaults ---------- */
if (window.Chart) {
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#46564B';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.padding = 14;
  Chart.defaults.plugins.tooltip.backgroundColor = '#163B27';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
  Chart.defaults.maintainAspectRatio = false;
}
const gridCfg = { color: 'rgba(27,42,32,.07)', drawTicks: false };
const axisX = { grid: { display: false }, border: { color: C.line } };
const axisY = { grid: gridCfg, border: { display: false }, beginAtZero: false };

/* ============================================================
   KPI GRID + count-ups
   ============================================================ */
function fmt(v, unit) {
  if (unit === 'jobs') return Number(v).toLocaleString();
  return v;
}
getCSV('headline_kpis.csv').then(rows => {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = rows.map(k => {
    const src = k.source_url
      ? `<a class="kpi-src kpi-src-link" href="${k.source_url}" target="_blank" rel="noopener" title="Source: ${k.source}">${k.source} · ${k.asof} <span class="kpi-src-arrow">↗</span></a>`
      : `<div class="kpi-src">${k.source} · ${k.asof}</div>`;
    return `<div class="kpi">
      <div class="kpi-val">${k.label}</div>
      <div class="kpi-label">${k.sublabel}</div>
      ${src}
    </div>`;
  }).join('');
});

/* generic count-up for [data-countup] */
function countUp(el) {
  const target = parseFloat(el.dataset.countup);
  const suffix = el.dataset.suffix || '';
  const dur = 1100, t0 = performance.now();
  function step(t) {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { if (!reduceMotion) countUp(e.target); io.unobserve(e.target); } });
}, { threshold: .4 });
document.querySelectorAll('[data-countup]').forEach(el => io.observe(el));

/* offset-bar fill (widths from data-w). Animate when scrolled into view, but always
   fill via a guaranteed fallback so the bars are never left empty. */
const fillOffsets = el => el.querySelectorAll('.offset-fill[data-w]').forEach(f => { f.style.width = f.dataset.w + '%'; });
document.querySelectorAll('.offset-bar').forEach(el => {
  if (reduceMotion) { fillOffsets(el); return; }
  const o = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => { if (e.isIntersecting) { fillOffsets(el); obs.disconnect(); } });
  }, { threshold: 0.01 });
  o.observe(el);
  setTimeout(() => fillOffsets(el), 1600);  // fallback: never stuck empty
});

/* ============================================================
   CARBON SECTION
   ============================================================ */
getCSV('carbon_storage_2003_2023.csv').then(rows => {
  const yrs = rows.map(r => r.Year);
  const est = rows.map(r => num(r['Estimate (MMTC)']));
  const lo  = rows.map(r => num(r['Lower 95% CI']));
  const hi  = rows.map(r => num(r['Upper 95% CI']));
  new Chart(document.getElementById('chartCarbon'), {
    type: 'line',
    data: { labels: yrs, datasets: [
      { label: 'Lower 95% CI', data: lo, borderColor: 'transparent', pointRadius: 0, fill: false },
      { label: 'Upper 95% CI', data: hi, borderColor: 'transparent', pointRadius: 0, backgroundColor: 'rgba(63,125,85,.14)', fill: '-1' },
      { label: 'Carbon stored (MMT C)', data: est, borderColor: C.spruce, backgroundColor: C.spruce, borderWidth: 2.5, pointRadius: 0, tension: .25 }
    ]},
    options: {
      plugins: { legend: { display: false }, tooltip: { filter: i => i.datasetIndex === 2 } },
      scales: { x: axisX, y: { ...axisY, title: { display: true, text: 'Million metric tons carbon' } } }
    }
  });
});

let healthRows = null;
getCSV('health_diversity.csv').then(rows => {
  healthRows = rows;
  const yrs = rows.map(r => r.year);
  const gh = rows.map(r => num(r.growth_to_harvest));
  new Chart(document.getElementById('chartGH'), {
    type: 'line',
    data: { labels: yrs, datasets: [
      { label: 'Growth : Harvest', data: gh, borderColor: C.gold, backgroundColor: 'rgba(200,135,63,.12)', borderWidth: 2.5, pointRadius: 0, tension: .25, fill: true }
    ]},
    options: {
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => 'G:H ' + c.parsed.y.toFixed(2) + '×' } } },
      scales: { x: axisX, y: { ...axisY, suggestedMin: 0.8,
        title: { display: true, text: 'Growth-to-harvest ratio' },
        ticks: { callback: v => v + '×' } } }
    }
  });

  /* HEALTH chart: mortality + relative density (dual axis) */
  const mort = rows.map(r => num(r.mortality_pct));
  const rd = rows.map(r => num(r.relative_density));
  new Chart(document.getElementById('chartHealth'), {
    type: 'line',
    data: { labels: yrs, datasets: [
      { label: 'Relative density', data: rd, borderColor: C.spruce, backgroundColor: C.spruce, borderWidth: 2.5, pointRadius: 0, tension: .25, yAxisID: 'yRD' },
      { label: 'Tree mortality (%/yr)', data: mort, borderColor: C.clay, backgroundColor: C.clay, borderWidth: 2, borderDash: [5,4], pointRadius: 0, tension: .25, yAxisID: 'yM' }
    ]},
    options: {
      plugins: { legend: { display: true } },
      scales: {
        x: axisX,
        yRD: { position: 'left', grid: gridCfg, border: { display: false }, suggestedMin: .5, suggestedMax: .6, title: { display: true, text: 'Relative density' } },
        yM:  { position: 'right', grid: { display: false }, border: { display: false }, suggestedMin: .7, title: { display: true, text: 'Mortality %/yr' } }
      }
    }
  });
});

getCSV('carbon_balance.csv').then(rows => {
  const r = {}; rows.forEach(x => r[x.metric] = num(x.value));
  new Chart(document.getElementById('chartBalance'), {
    type: 'bar',
    data: {
      labels: ['Forest\nremovals', 'Gross state\nemissions', 'Net forest\nsink'],
      datasets: [{
        data: [r['Forest removals'], r['Gross state emissions'], r['Net forest sink']],
        backgroundColor: [C.moss, C.clay, C.spruce], borderRadius: 6, maxBarThickness: 74
      }]
    },
    options: {
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => c.parsed.y + ' MMTCO₂e/yr' } } },
      scales: {
        x: { ...axisX, ticks: { callback: function(v){ return this.getLabelForValue(v).split('\n'); } } },
        y: { ...axisY, beginAtZero: true, title: { display: true, text: 'MMTCO₂e per year' } }
      }
    }
  });
});

/* ---------- Climate: drought signal (SPEI 12-month) ---------- */
getCSV('fire_spei_1903_2024.csv').then(rows => {
  const yrs = rows.map(r => r.Year);
  const spei = rows.map(r => num(r.SPEI12));
  new Chart(document.getElementById('chartDrought'), {
    type: 'bar',
    data: { labels: yrs, datasets: [{
      label: 'SPEI (12-month)', data: spei,
      backgroundColor: spei.map(v => v == null ? '#ccc' : (v < 0 ? 'rgba(180,85,47,.75)' : 'rgba(63,125,85,.7)')),
      borderWidth: 0, barPercentage: 1.0, categoryPercentage: 1.0
    }]},
    options: {
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => 'SPEI ' + (c.parsed.y > 0 ? '+' : '') + c.parsed.y.toFixed(2) + (c.parsed.y < 0 ? '  (drier)' : '  (wetter)') } } },
      scales: { x: { ...axisX, ticks: { maxTicksLimit: 10 } },
        y: { grid: gridCfg, border: { display: false }, title: { display: true, text: 'Drier ‹  SPEI  › Wetter' } } }
    }
  });
});

/* ---------- Climate stressor callout (from featured story) ---------- */
getJSON('featured.json').then(f => {
  const s = f.stories[f.active]; if (!s) return;
  document.getElementById('stressorTag').textContent = s.tag || 'Climate stressor';
  document.getElementById('stressorHead').textContent = s.headline || '';
  document.getElementById('stressorBody').textContent = (s.intro_paragraphs && s.intro_paragraphs[0]) || '';
  const link = document.getElementById('stressorLink');
  if (s.link_url) { link.href = s.link_url; link.textContent = s.link_label || 'Learn more'; }
  else link.remove();
}).catch(() => { const c = document.getElementById('stressorCard'); if (c) c.remove(); });

/* ============================================================
   HEALTH: fire + pests
   ============================================================ */
getCSV('fire_spei_1903_2024.csv').then(rows => {
  const yrs = rows.map(r => r.Year);
  const burned = rows.map(r => num(r['Area Burned']));
  new Chart(document.getElementById('chartFire'), {
    type: 'line',
    data: { labels: yrs, datasets: [
      { label: 'Acres burned', data: burned, borderColor: C.maple, backgroundColor: 'rgba(168,66,42,.10)', borderWidth: 1.8, pointRadius: 0, tension: .2, fill: true }
    ]},
    options: {
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => Number(c.parsed.y).toLocaleString() + ' acres' } } },
      scales: { x: { ...axisX, ticks: { maxTicksLimit: 9 } },
        y: { ...axisY, beginAtZero: true, title: { display: true, text: 'Acres burned per year' },
          ticks: { callback: v => v >= 1000 ? (v/1000)+'k' : v } } }
    }
  });
});

getCSV('pest_counties.csv').then(rows => {
  const wrap = document.getElementById('pestGrid');
  const R = 46, CC = 2 * Math.PI * R;
  wrap.innerHTML = rows.map((p, i) => {
    const n = num(p.counties), frac = n / 16;
    const col = [C.maple, C.clay, C.gold][i % 3];
    const off = CC * (1 - frac);
    return `
    <div class="pest-item">
      <div class="pest-ring">
        <svg width="108" height="108" viewBox="0 0 108 108">
          <circle cx="54" cy="54" r="${R}" fill="none" stroke="${C.cream2}" stroke-width="9"/>
          <circle cx="54" cy="54" r="${R}" fill="none" stroke="${col}" stroke-width="9"
            stroke-linecap="round" stroke-dasharray="${CC}" stroke-dashoffset="${CC}"
            style="transition:stroke-dashoffset 1.1s ease" data-off="${off}"/>
        </svg>
        <div class="pest-ring-num">${n}<span style="font-size:.9rem;color:var(--ink-soft)">/16</span></div>
      </div>
      <div class="pest-name">${p.pest}</div>
      <div class="pest-abbr">${p.abbr} · since ${p.first_year}</div>
      <div class="pest-note">${p.note}</div>
    </div>`;
  }).join('');
  // animate rings when visible
  const pio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
      wrap.querySelectorAll('circle[data-off]').forEach(c => c.style.strokeDashoffset = c.dataset.off);
      pio.disconnect();
    }
  }), { threshold: .3 });
  pio.observe(wrap);
});

/* ---------- Health: disturbance agents (FIA observed) ---------- */
getCSV('disturbance_agents_fia.csv').then(rows => {
  new Chart(document.getElementById('chartDisturb'), {
    type: 'bar',
    data: { labels: rows.map(r => r.agent), datasets: [{
      data: rows.map(r => num(r.pct)),
      backgroundColor: [C.maple, C.clay, C.moss, C.lake, C.sage], borderRadius: 5, maxBarThickness: 34
    }]},
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false },
        tooltip: { callbacks: {
          label: c => c.parsed.x + '% of forest conditions',
          afterLabel: c => rows[c.dataIndex].note } } },
      scales: { x: { ...axisY, beginAtZero: true, title: { display: true, text: '% of Maine forest conditions (FIA)' }, ticks: { callback: v => v + '%' } },
        y: { grid: { display: false }, border: { display: false } } }
    }
  });
});

/* ---------- Health: forest maturity & habitat cards (FIA observed) ---------- */
getCSV('forest_structure_fia.csv').then(rows => {
  const grid = document.getElementById('structGrid');
  grid.innerHTML = rows.map(r => `
    <div class="struct-item">
      <div class="struct-val">${r.value}<span class="struct-unit">${r.unit === '%' ? '%' : ' ' + r.unit}</span></div>
      <div class="struct-label">${r.metric}</div>
    </div>`).join('');
});

/* ============================================================
   ECONOMY
   ============================================================ */
getCSV('contribution_breakdown.csv').then(rows => {
  const r = rows.find(x => x.metric === 'Output');
  new Chart(document.getElementById('chartContribution'), {
    type: 'bar',
    data: { labels: ['Economic output'], datasets: [
      { label: 'Direct',   data: [num(r.direct)],   backgroundColor: C.spruce, borderRadius: 4 },
      { label: 'Indirect', data: [num(r.indirect)], backgroundColor: C.moss,   borderRadius: 4 },
      { label: 'Induced',  data: [num(r.induced)],  backgroundColor: C.gold,   borderRadius: 4 }
    ]},
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: true },
        tooltip: { callbacks: { label: c => c.dataset.label + ': $' + Number(c.parsed.x).toLocaleString() + 'M' } } },
      scales: {
        x: { stacked: true, ...axisY, beginAtZero: true, ticks: { callback: v => '$' + (v/1000).toFixed(0) + 'B' } },
        y: { stacked: true, grid: { display: false }, border: { display: false } }
      }
    }
  });
});

getCSV('sector_output.csv').then(rows => {
  new Chart(document.getElementById('chartSector'), {
    type: 'bar',
    data: { labels: rows.map(r => r.sector), datasets: [
      { data: rows.map(r => num(r.direct_output_M)), backgroundColor: SERIES, borderRadius: 5, maxBarThickness: 40 }
    ]},
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => '$' + Number(c.parsed.x).toLocaleString() + 'M direct output' } } },
      scales: { x: { ...axisY, beginAtZero: true, ticks: { callback: v => '$' + v + 'M' } },
        y: { grid: { display: false }, border: { display: false } } }
    }
  });
});

getCSV('export_timeseries.csv').then(rows => {
  const yrs = rows.map(r => r.year);
  const mk = (key, col) => ({ label: key.replace('_M',''), data: rows.map(r => num(r[key])),
    borderColor: col, backgroundColor: col + '33', borderWidth: 2, pointRadius: 0, tension: .25, fill: true });
  new Chart(document.getElementById('chartExports'), {
    type: 'line',
    data: { labels: yrs, datasets: [
      { ...mk('paper_M', C.spruce), label: 'Paper' },
      { ...mk('pulp_M', C.gold),   label: 'Pulp' },
      { ...mk('wood_M', C.lake),   label: 'Wood' }
    ]},
    options: {
      plugins: { legend: { display: true },
        tooltip: { callbacks: { label: c => c.dataset.label + ': $' + c.parsed.y + 'M' } } },
      scales: { x: { ...axisX, ticks: { maxTicksLimit: 10 }, stacked: true },
        y: { ...axisY, beginAtZero: true, stacked: true, title: { display: true, text: 'Export value ($M)' },
          ticks: { callback: v => '$' + v + 'M' } } }
    }
  });
});

/* ============================================================
   LAND
   ============================================================ */
getCSV('forest_ownership.csv').then(rows => {
  new Chart(document.getElementById('chartOwnership'), {
    type: 'doughnut',
    data: { labels: rows.map(r => r.category), datasets: [
      { data: rows.map(r => num(r.pct_of_total)), backgroundColor: SERIES, borderColor: '#fff', borderWidth: 2 }
    ]},
    options: {
      cutout: '58%',
      plugins: { legend: { position: 'right' },
        tooltip: { callbacks: { label: c => c.label + ': ' + c.parsed + '%' } } }
    }
  });
});

getCSV('maine_conserved_lands_by_year.csv').then(rows => {
  rows = rows.filter(r => num(r.ACQ_YEAR) >= 1960);
  new Chart(document.getElementById('chartConserved'), {
    type: 'line',
    data: { labels: rows.map(r => r.ACQ_YEAR), datasets: [
      { label: 'Cumulative conserved acres', data: rows.map(r => num(r.Cumulative_Acres)),
        borderColor: C.moss, backgroundColor: 'rgba(63,125,85,.14)', borderWidth: 2.5, pointRadius: 0, tension: .2, fill: true }
    ]},
    options: {
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => (c.parsed.y/1e6).toFixed(2) + 'M acres' } } },
      scales: { x: { ...axisX, ticks: { maxTicksLimit: 8 } },
        y: { ...axisY, beginAtZero: true, title: { display: true, text: 'Conserved acres' },
          ticks: { callback: v => (v/1e6).toFixed(1) + 'M' } } }
    }
  });
});

/* ============================================================
   COUNTY MAP (Leaflet)
   ============================================================ */
const LAYERS = {
  forest_jobs:        { label: 'Forest sector jobs',   fmt: v => Number(v).toLocaleString() + ' jobs' },
  pct_forested:       { label: 'Percent forested',     fmt: v => v.toFixed(1) + '% forested' },
  harvest_2013_units: { label: '2013 harvest volume',  fmt: v => Number(v).toLocaleString() + ' units' }
};
let map, geoLayer, countyData = {}, activeLayer = 'forest_jobs', geojson;

function ramp(t) { // cream -> moss -> spruce
  const stops = [[239,235,224],[127,169,138],[31,77,51]];
  const seg = t < .5 ? 0 : 1, lt = t < .5 ? t*2 : (t-.5)*2;
  const a = stops[seg], b = stops[seg+1];
  const c = a.map((v,i) => Math.round(v + (b[i]-v)*lt));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function colorFor(name) {
  const d = countyData[name]; if (!d) return '#e6e2d6';
  const vals = Object.values(countyData).map(x => x[activeLayer]).filter(v => v != null);
  const min = Math.min(...vals), max = Math.max(...vals);
  const v = d[activeLayer]; if (v == null) return '#e6e2d6';
  const t = max === min ? .5 : (v - min) / (max - min);
  return ramp(t);
}
function styleFn(f) {
  return { fillColor: colorFor(f.properties.name), weight: 1, color: '#fff', fillOpacity: .85 };
}
function updateLegend() {
  const vals = Object.values(countyData).map(x => x[activeLayer]).filter(v => v != null);
  const min = Math.min(...vals), max = Math.max(...vals), L = LAYERS[activeLayer];
  const el = document.getElementById('mapLegendNote');
  const swatch = t => `<i style="background:${ramp(t)}"></i>`;
  el.classList.add('map-legend');
  el.innerHTML = `<strong>${L.label}</strong> &nbsp; ${swatch(0)}low ${swatch(.5)} ${swatch(1)}high &nbsp; · &nbsp; range ${L.fmt(min)} – ${L.fmt(max)}`;
}
function fillPanel(name) {
  const d = countyData[name]; if (!d) return;
  document.getElementById('cpName').textContent = name + ' County';
  document.getElementById('cpHint').hidden = true;
  document.getElementById('cpStats').hidden = false;
  document.getElementById('cpJobs').textContent = Number(d.forest_jobs).toLocaleString();
  document.getElementById('cpJobsPct').textContent = d.forest_jobs_pct + '%';
  document.getElementById('cpForested').textContent = d.pct_forested.toFixed(1) + '%';
  document.getElementById('cpHarvest').textContent = Number(d.harvest_2013_units).toLocaleString();
}

Promise.all([getCSV('county_indicators.csv'), getJSON('maine_counties.geojson')]).then(([rows, gj]) => {
  geojson = gj;
  rows.forEach(r => countyData[r.county] = {
    forest_jobs: num(r.forest_jobs), forest_jobs_pct: r.forest_jobs_pct,
    pct_forested: num(r.pct_forested), harvest_2013_units: num(r.harvest_2013_units),
    harvest_intensity: r.harvest_intensity
  });

  map = L.map('countyMap', { scrollWheelZoom: false, zoomControl: true, attributionControl: true })
        .setView([45.4, -69.2], 7);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CARTO', maxZoom: 12, minZoom: 6
  }).addTo(map);

  geoLayer = L.geoJSON(gj, {
    style: styleFn,
    onEachFeature: (f, lyr) => {
      const name = f.properties.name, d = countyData[name] || {};
      lyr.bindPopup(`<b>${name} County</b><br>${LAYERS[activeLayer].label}: ${LAYERS[activeLayer].fmt(d[activeLayer] ?? 0)}`);
      lyr.on({
        mouseover: e => e.target.setStyle({ weight: 2.5, color: C.gold, fillOpacity: .95 }),
        mouseout:  e => geoLayer.resetStyle(e.target),
        click:     () => fillPanel(name)
      });
    }
  }).addTo(map);
  updateLegend();

  document.querySelectorAll('.layer-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeLayer = btn.dataset.layer;
    geoLayer.setStyle(styleFn);
    geoLayer.eachLayer(l => {
      const name = l.feature.properties.name, d = countyData[name] || {};
      l.setPopupContent(`<b>${name} County</b><br>${LAYERS[activeLayer].label}: ${LAYERS[activeLayer].fmt(d[activeLayer] ?? 0)}`);
    });
    updateLegend();
  }));
});

/* Find my area — geolocation + point-in-polygon */
function pointInPoly(pt, vs) {
  const x = pt[0], y = pt[1]; let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1], xj = vs[j][0], yj = vs[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function countyAt(lng, lat) {
  for (const f of geojson.features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys) if (pointInPoly([lng, lat], poly[0])) return f.properties.name;
  }
  return null;
}
document.getElementById('locateBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { alert('Geolocation is not available in this browser.'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    map.flyTo([lat, lng], 9);
    L.marker([lat, lng]).addTo(map).bindPopup('You are here').openPopup();
    const name = countyAt(lng, lat);
    if (name) fillPanel(name);
    else { document.getElementById('cpName').textContent = 'Outside Maine'; document.getElementById('cpHint').textContent = 'Your location is outside Maine, but here it is on the map.'; }
  }, () => alert('Could not get your location. Please allow location access, or click a county directly.'));
});

/* ============================================================
   FOREST-LOSS OVERLAY (Hansen Global Forest Change COG)
   Lazy-loads georaster libs; renders loss-year raster on the map.
   ============================================================ */
const LOSS_STOPS = [[2001,'#F6E27A'],[2008,'#E8A23D'],[2015,'#B4552F'],[2023,'#7A1E12']];
function lossColor(year) {
  if (!year || year < 1) return null;
  let lo = LOSS_STOPS[0], hi = LOSS_STOPS[LOSS_STOPS.length - 1];
  for (let i = 0; i < LOSS_STOPS.length - 1; i++) {
    if (year >= LOSS_STOPS[i][0] && year <= LOSS_STOPS[i+1][0]) { lo = LOSS_STOPS[i]; hi = LOSS_STOPS[i+1]; break; }
  }
  const t = (year - lo[0]) / Math.max(1, hi[0] - lo[0]);
  const c1 = lo[1].match(/\w\w/g).map(h => parseInt(h, 16));
  const c2 = hi[1].match(/\w\w/g).map(h => parseInt(h, 16));
  const m = c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
/* Forest-loss GeoTIFF as an ArrayBuffer: fetch on a server, or decode the
   lazily-loaded base64 embed when running from file://. */
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function loadLossBuffer() {
  if (FILE_MODE) {
    if (!window.MFD_TIF_B64) await loadScript('js/data-embed-tif.js');
    const bin = atob(window.MFD_TIF_B64); const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  return fetch('data/maine_forestloss.tif').then(r => r.arrayBuffer());
}
let _grLoading = null;
function loadGeoRaster() {
  if (window.GeoRasterLayer && window.parseGeoraster) return Promise.resolve();
  if (_grLoading) return _grLoading;
  const add = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  _grLoading = add('https://unpkg.com/georaster/dist/georaster.browser.bundle.min.js')
    .then(() => add('https://unpkg.com/georaster-layer-for-leaflet/dist/georaster-layer-for-leaflet.min.js'));
  return _grLoading;
}
(function initLossOverlay() {
  const btn = document.getElementById('lossBtn');
  const legend = document.getElementById('lossLegend');
  if (!btn) return;
  let lossLayer = null;
  btn.addEventListener('click', async () => {
    if (typeof map === 'undefined' || !map) return;
    const turnOn = !btn.classList.contains('on');
    if (turnOn) {
      if (!lossLayer) {
        const prev = btn.textContent; btn.textContent = 'Loading loss layer…'; btn.disabled = true;
        try {
          await loadGeoRaster();
          const buf = await loadLossBuffer();
          const gr = await parseGeoraster(buf);
          lossLayer = new GeoRasterLayer({ georaster: gr, opacity: 0.85, resolution: 256, pixelValuesToColorFn: v => lossColor(v[0]) });
        } catch (e) { console.warn('forest-loss overlay failed', e); btn.textContent = prev; btn.disabled = false; return; }
        btn.textContent = prev; btn.disabled = false;
      }
      lossLayer.addTo(map);
      btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true');
      if (legend) legend.hidden = false;
    } else {
      if (lossLayer) lossLayer.remove();
      btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false');
      if (legend) legend.hidden = true;
    }
  });
})();

/* ============================================================
   FOOTER partners + nav behavior
   ============================================================ */
const PARTNERS = [
  ['logo_mfs.png','Maine Forest Service'], ['partners/cfru.png','Cooperative Forestry Research Unit'],
  ['partners/nefis.png','Northeast Forest Information Source'], ['partners/nsrc.png','Northeastern States Research Cooperative'],
  ['partners/fcci.png','Forest Climate Change Initiative'], ['partners/cafs.png','Center for Advanced Forestry Systems']
];
(function(){
  const el = document.getElementById('footerPartners');
  el.innerHTML = PARTNERS.map(([f,a]) => `<span class="chip chip-sm"><img src="images/${f}" alt="${a}" onerror="this.closest('.chip').remove()"></span>`).join('');
})();

/* nav: mobile toggle + active-section highlight */
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');
navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.addEventListener('click', e => { if (e.target.tagName === 'A') navLinks.classList.remove('open'); });

const sections = [...document.querySelectorAll('section[id]')];
const linkFor = id => document.querySelector(`.nav-links a[href="#${id}"]`);
const navIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
      const l = linkFor(e.target.id); if (l) l.classList.add('active');
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => navIO.observe(s));
