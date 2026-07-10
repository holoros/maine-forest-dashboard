# Maine Forest Dashboard V6 — Deployment Handoff

**Build:** V6.10
**Date:** July 3, 2026
**Owner:** Aaron Weiskittel, CRSF Director (aaron.weiskittel@maine.edu)
**Deploy lead:** Leo Edmiston-Cyr (WordPress)
**Live target:** maineforestdashboard.com
**Live preview (staging):** https://holoros.github.io/maine-forest-dashboard/ (GitHub Pages, holoros account — current, verified)
**Repo:** github.com/holoros/maine-forest-dashboard (source of truth; clone or download here)
**Folder:** `outputs/maine-forest-dashboard/V6/`

This is the single document to take V6 live. V5 remains untouched in the sibling `V5/` folder as a rollback.

## Current state (V6.10) — what's in the build

The dashboard is feature-complete and verified live in a real browser. It includes: eight sections
(Overview, Climate & Carbon, Forest Carbon & Productivity, Forest Health & Diversity, Economy &
Products, Land & Conservation, Maine by County, How We Know This) plus Related CRSF Resources; a
cinematic forest hero with the KPI cards overlapping it, and two full-width photo bands; 12
interactive charts; an interactive county choropleth with layer switching, a Hansen forest-loss
satellite overlay, county click-to-inspect, and "Find my area" geolocation; headline KPIs whose
source lines are now clickable gateways to the underlying source (FIA, Maine Climate Council STS,
CRSF, DACF — all URLs verified); a PERSEUS projections handoff; observed-FIA forest-health cards;
featured CRSF / Munsungan / UMaine branding and eight logo-bearing resource cards; works both on a
web server and by double-click (embedded-data fallback); PWA/offline; passes a 29-check static
stress test with zero broken links or images.

## Next steps and owners

1. **Production deploy (Leo).** Take the build to maineforestdashboard.com (static drop-in, below).
   The staging URL and this folder / the repo are the source.
2. **Photo licensing (Aaron / Meg).** The hero and photo-band images come from the V4/V5 library;
   confirm they are CRSF/UMaine-cleared for public web use before the production launch. They are
   already public on the staging URL.
3. **County ecosystem-services layers — DONE (v6.11).** The county map now carries nine measured
   layers (forest jobs, forest area, percent forested, carbon density, forest age, old forest,
   tree species richness, public forest, harvest), and clicking a county shows the full
   ecosystem-services snapshot. Forest structure and carbon are design-based FIA estimates computed
   on OSC Cardinal from the Maine FIADB (`_county_expansion/estimate_county_es.R`), validated against
   the statewide anchor (17.42M forest acres vs 17.4M). Data in `data/county_ecosystem_services.csv`.
   Optional future adds: conserved acres by county (DACF GIS) and an updated harvest year (MFS).
4. **Annual data refresh (Aaron / Claude).** Per the update workflow below.

## What V6 is

A clean, modern, interactive single-page dashboard for the state of Maine's forests, rebuilt from
scratch with a fresh editorial-modern design and a data layer reconciled to the two Maine Climate
Council Scientific and Technical Subcommittee (STS) forest indicator reports (Forest Carbon and
Productivity; Forest Health and Diversity, 2026). Strictly observational: every figure is measured
or officially reported, with no model projections.

No build step and no framework. Plain HTML, one stylesheet, one vanilla JavaScript file, with
Chart.js, Leaflet, and (lazy-loaded) georaster libraries from CDN. All content is driven by CSV and
GeoJSON. Total payload is about 9 MB on disk; roughly 60 KB of core HTML, CSS, and JS on first paint.

New since the first V6 draft: a dedicated **Climate and Carbon** section (carbon balance, the
51 to 91 percent emissions-offset trajectory, a SPEI drought-signal chart, and a rotating climate
stressor callout), the **Hansen forest-loss satellite overlay** as a toggle on the county map, a
full accessibility and contrast pass, and PWA packaging (installable, offline-capable).

## File map

```
V6/
  index.html              Single-page dashboard
  css/style.css           All styling
  js/app.js               All behavior (charts, county map, overlay, interactivity)
  manifest.json           PWA manifest
  sw.js                   Service worker (offline cache, version mfd-v6.0)
  data/                   CSVs + counties GeoJSON + featured.json + maine_forestloss.tif (COG)
  images/                 Logos, partner marks, og social images, photos
  _qa/stress_test.py      Static audit (29 checks)
  _verify/                Headless render proof screenshots
  V6_BUILD_NOTES.md       Design + data-reconciliation record
  DEPLOYMENT_HANDOFF.md   This file
```

## Preview locally

Two ways:

1. Double-click `index.html`. It opens straight from disk and everything works — charts, the county
   map, and the forest-loss overlay — because the data is also embedded in `js/data-embed.js` (and the
   forest-loss GeoTIFF in `js/data-embed-tif.js`) as a `file://` fallback. Geolocation ("Find my area")
   still needs HTTPS or localhost, but that is the only feature that does.
2. Or serve over HTTP for exact production fidelity:
   ```bash
   cd outputs/maine-forest-dashboard/V6
   python3 -m http.server 8000     # then open http://localhost:8000
   ```

How data loading works: on a web server the page `fetch()`es the live files in `data/`, so the annual
update stays a simple file replacement. Only when opened from `file://` (where browsers block
`fetch()`) does it read the embedded snapshot instead. This is why the first draft looked blank when
opened by double-click and now does not.

## Verify before launch

Static audit: from the V6 folder run `python3 _qa/stress_test.py`. It checks 29 things (chart
wiring, data and image references, external-link safety, accessibility basics, meta and PWA tags,
stale-number leaks, tag balance, contrast tokens, weight). A clean build prints `RESULT: PASS`. The
current build passes 29 of 29 with zero warnings.

Browser check: open the live HTTPS site and confirm the county choropleth, the layer switch, the
"Forest loss 2001-2023" satellite overlay toggle (loads a Cloud-Optimized GeoTIFF from
`data/maine_forestloss.tif`), and "Find my area" all work. The forest-loss overlay and geolocation
can only be confirmed in a real browser.

Final red-team audit (V6.3). A comprehensive functional, responsive, accessibility, and data pass
was run headless. All interactive controls exercised clean: county layer switch, county click
(Aroostook returns 2,032 jobs), the forest-loss overlay on and off, geolocation (a Maine coordinate
correctly resolves to Piscataquis County), nav active-state, and the mobile menu. No console errors
and no 4xx/5xx responses at any width. A mobile horizontal-overflow bug was found and fixed (grid and
flex children now shrink correctly; the page fits 320 to 1280 px with no horizontal scroll). Keyboard
focus shows the gold outline. Every headline number was reconciled to the Climate Council report and
the PERSEUS FIA source, with no stale or contradictory figures. Unused legacy assets (extra social
images, old figure PNGs, unused photos) were pruned, cutting the image payload from about 7 MB to
2 MB. Service worker advanced to `mfd-v6.3`.

## Deploy to WordPress

**Option A, static drop-in (recommended).**
1. Upload the entire contents of `V6/` to a subdirectory of the WordPress install, e.g. `/dashboard/`.
2. Point `maineforestdashboard.com` at that subdirectory (site root, redirect, or iframe of `index.html`).
3. Confirm the `data/` and `images/` folders uploaded intact, including `data/maine_forestloss.tif`.
4. Update DNS for `maineforestdashboard.com` (and `.org` if used) to the host.
5. After one week of stable operation, retire the ARCSIM VM that serves the old V1 site (Kevin).

All paths are relative, so Option A needs zero edits. A page-builder Custom-HTML approach also works
but requires rewriting every `data/` and `images/` path to media-library URLs.

## Turn on analytics

A privacy-respecting Plausible tag is staged and commented out in `<head>`. To enable, create a
property for `maineforestdashboard.com` at plausible.io and uncomment the line. Plausible is
cookie-free and needs no consent banner (the cleaner fit for a public university resource); swap for
the GA4 gtag snippet if CRSF prefers.

## Update the data each year

The dashboard is CSV-driven, so the annual refresh is mostly file replacement in `data/`:

- Headline numbers: edit `headline_kpis.csv` (columns `value`, `label`, `sublabel`, `asof`, `source`).
- Carbon and health time series: replace `carbon_storage_2003_2023.csv` and `health_diversity.csv`.
- Climate section: `carbon_balance.csv`, `emissions_offset.csv`, `pest_counties.csv`.
- Featured climate stressor: edit `data/featured.json` (currently spruce budworm).
- Forest-loss overlay: rebuild the COG on OSC Cardinal when the next Hansen release lands (recipe in
  the V5 handoff), then drop in `data/maine_forestloss.tif`.

After any update: run `python3 _qa/make_embed.py` to refresh the `file://` fallback snapshot, bump
the `?v=` query on the `css/style.css` and `js/*.js` links in `index.html` (this cache-busts the
CSS/JS for returning visitors), bump `CACHE_VERSION` in `sw.js`, then re-run `_qa/stress_test.py`.

Note on caching: the CSS and JS links carry a `?v=` version token, so bumping it forces browsers to
fetch the new files immediately. Without that bump, a returning visitor's browser or service worker
can serve the previous CSS/JS for a while. This was verified live on the GitHub Pages staging URL.

## Launch checklist

- Run `_qa/stress_test.py` and confirm PASS (currently 29/29).
- On the live HTTPS site: confirm county map, layer switch, forest-loss overlay, and "Find my area".
- Confirm photo licensing for any images retained (V5 audit is the system of record).
- Decide Plausible vs GA4 and enable the tag.
- Walk Meg through the headline KPI values in `headline_kpis.csv`.
- Test PWA install on iOS and Android; test the print stylesheet in print preview.
- Schedule the DNS cutover with Leo and the ARCSIM retirement with Kevin.

## Contacts

- Aaron Weiskittel, CRSF Director, dashboard owner, aaron.weiskittel@maine.edu
- Leo Edmiston-Cyr, web developer, WordPress deployment
- Meg Fergusson, CRSF communications, content review and rollout
- Kevin Wentworth, ARCSIM VM admin, retire the V1 site after launch
