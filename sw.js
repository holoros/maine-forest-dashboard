/* Maine Forest Dashboard service worker.
   Caches the app shell + datasets for offline load. Bump CACHE_VERSION on each build. */
const CACHE_VERSION = 'mfd-v6.11';
const SHELL = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/data-embed.js', 'manifest.json',
  'images/logo_mfd_icon.png', 'images/logo_mfd_mark.png', 'images/logo_crsf.png', 'images/logo_munsungan.png',
  'data/headline_kpis.csv', 'data/carbon_balance.csv', 'data/emissions_offset.csv',
  'data/pest_counties.csv', 'data/disturbance_agents_fia.csv', 'data/forest_structure_fia.csv', 'data/carbon_storage_2003_2023.csv', 'data/health_diversity.csv',
  'data/fire_spei_1903_2024.csv', 'data/contribution_breakdown.csv', 'data/sector_output.csv',
  'data/export_timeseries.csv', 'data/forest_ownership.csv',
  'data/maine_conserved_lands_by_year.csv', 'data/county_indicators.csv', 'data/county_ecosystem_services.csv',
  'data/maine_counties.geojson', 'data/featured.json'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(SHELL).catch(err => console.warn('cache partial', err))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
