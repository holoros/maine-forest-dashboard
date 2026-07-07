# Maine Forest Dashboard V6 — Build Notes

**Build:** V6.0
**Date:** July 2, 2026
**Folder:** `outputs/maine-forest-dashboard/V6/`
**Direction:** Fresh redesign, data rebuilt from the Maine Climate Council forest indicators
**Predecessor:** V5.4 (preserved untouched in the sibling `V5/` folder as rollback)

## What V6 is

A clean, modern, interactive single-page site for the state of Maine's forests, rebuilt from
scratch with a new design language and a data layer reconciled to the two Maine Climate Council
Scientific and Technical Subcommittee (STS) indicator reports: **Forest Carbon and Productivity**
and **Forest Health and Diversity** (2026). It stays strictly observational: every figure is
measured in the field or officially reported, with no model projections.

No build step and no framework. Plain HTML, one stylesheet, one vanilla JavaScript file, with
Chart.js and Leaflet loaded from CDN and all content driven by CSV and GeoJSON. Total payload is
about 9 MB on disk.

## Design language (new, distinct from V5)

Where V5 used an IBM Plex technical data-tool look, V6 is warm editorial-modern: a **Fraunces**
serif for display headlines, **Inter** for UI and body, and **JetBrains Mono** for labels and
source lines. The palette is a Maine forest set on a birch-cream surface: deep spruce, moss, sage,
autumn gold, lake blue, and maple. Airy card system, a sticky nav with active-section tracking,
scroll-triggered count-ups and animated pest rings, and section-closing "what the data tell us"
takeaway bands.

## Sections

Overview (8 headline KPIs) · **Climate and Carbon** · Forest Carbon and Productivity · Forest Health
and Diversity · Economy and Products · Land and Conservation · Maine by County (interactive Leaflet
choropleth with layer switch, forest-loss satellite overlay, click-to-inspect, and Find my area) ·
How we know this (provenance).

## V6.0 additions (stress test, dedicated climate section, satellite overlay, packaging)

After the first draft, a full stress-test and red-team pass was run and the following were added:

- **Dedicated Climate and Carbon section** (now section 01, leading). Holds the carbon-balance chart
  (forest removals 22.2 vs gross emissions 16.1, net sink 13.5 MMTCO2e/yr), the emissions-offset
  trajectory from 51 percent (2007-2011) to 91 percent (2017-2021) toward the 2045 neutrality target,
  a SPEI 12-month drought-signal chart (the climate stressor), and a rotating stressor callout driven
  by `featured.json` (currently spruce budworm). Forest Carbon and Productivity remains as the forest
  carbon detail (storage with CI, growth-to-harvest).
- **Forest-loss satellite overlay.** The Hansen Global Forest Change loss-year Cloud-Optimized GeoTIFF
  (`data/maine_forestloss.tif`, processed on OSC Cardinal) is now a toggle on the county map, lazy-
  loading the georaster libraries and rendering loss year 2001 to 2023 with its own legend.
- **Red-team fixes.** WCAG AA contrast tokens for small gold and sage text; `prefers-reduced-motion`
  respected on count-ups and bar animations; count-up visible fallback so figures never stick at zero;
  all external links carry `rel="noopener"`.
- **Packaging.** favicon, `og:image`, `theme-color`, PWA `manifest.json` and a versioned service
  worker (`sw.js`, offline shell cache), a staged Plausible analytics tag, a 29-check `stress_test.py`,
  and a full `DEPLOYMENT_HANDOFF.md` for Leo.

The original direction folded the Climate Council numbers quietly into Carbon and Health; this build
keeps those folds and adds the dedicated section on top.

## V6.1 additions (PERSEUS linkage + observed FIA metrics)

Reviewed the PERSEUS Forest Intelligence platform (holoros.github.io/perseus-forest-intelligence)
for Maine-relevant content. Maine is a focal state there (35 engines, 40 metrics, 5,130 rows).
PERSEUS separates FIA-observed anchors from modeled projection engines. Two additions were made,
both preserving the dashboard's observational boundary:

- **PERSEUS handoff.** A "Looking ahead: projections" card closes the Climate and Carbon section
  and deep-links into Maine on PERSEUS (`#state=ME&tab=build`) for multi-model scenario carbon to
  2100; the Sources section link now points to the live PERSEUS app. No modeled numbers are imported
  into the observational body.
- **New observed FIA cards (Health section).** Two measured additions the dashboard previously
  lacked, drawn from PERSEUS's FIA-observed series (`fia_state_observed`, COND + DWM aggregates,
  2024): a "How forests are being disturbed" chart (share of Maine forest conditions by agent —
  disease 6.0%, insect 5.9%, animal 1.5%, weather 0.4%, human 0.1%; about 20% show some disturbance),
  and a "Forest maturity and habitat" card set (mean stand age 66 yr, mature 80+ yr share 32.4%,
  old 120+ yr share 4.1%, standing snags 22 per acre). New data files: `disturbance_agents_fia.csv`,
  `forest_structure_fia.csv`. Service worker advanced to `mfd-v6.1`.

The western "Grizzly North" LiDAR reviewed the same session (192 GB, high-elevation, raw point
clouds) was assessed and left out of scope for both the Maine dashboard and PERSEUS as-is.

## V6.4 additions (open-from-disk + fixes)

Aaron opened the build by double-clicking `index.html`, and the charts and county map came up blank:
browsers block `fetch()` under the `file://` protocol, so the CSV and GeoJSON never loaded. Fixed by
embedding the data. `js/data-embed.js` (about 50 KB) carries all CSV and GeoJSON and loads on every
visit; `js/data-embed-tif.js` (the forest-loss GeoTIFF as base64, about 800 KB) is lazy-loaded only
when the overlay is toggled. `app.js` uses the live `data/` files via fetch on a web server (so the
annual update stays a file replacement) and the embedded snapshot only under `file://`. A regenerator,
`_qa/make_embed.py`, refreshes the snapshot after any data change. Verified under a real `file://`
URL: 12 of 12 charts draw, 16 county polygons, county click works, the forest-loss overlay decodes
from base64, zero console errors.

Also fixed the footer brand chips, which were clipping the round CRSF and Munsungan badges: chips are
now a uniform size with the logos fully contained. Service worker advanced to `mfd-v6.4`.

## V6.2 additions (branding)

Applied the org-branding standard. The navigation now carries the actual Maine Forest Dashboard mark
(the Maine-shape green-canopy logo) with the wordmark, replacing the generic placeholder icon. The
footer was rebuilt into a proper brand lockup: a "Produced & supported by" row featuring the CRSF,
Munsungan Endowment, and University of Maine logos on white chips (full-color badges never recolored,
per guidelines), and an "In partnership with" row of supporting marks (Maine Forest Service, CFRU,
NEFIS, NSRC, FCCI, CAFS). The Munsungan Endowment is featured prominently, matching the dashboard's
role as the citable data product for the Munsungan Symposium. New web assets: `logo_mfd_mark.png`,
`logo_munsungan.png`. Service worker advanced to `mfd-v6.2`.

## Data reconciliation (V5 headline vs Climate Council report)

The headline numbers were updated to match the STS reports as the authoritative source:

| Indicator            | V5 dashboard | V6 (Climate Council report) |
|----------------------|--------------|-----------------------------|
| Forestland acres     | 17.5M        | **17.4M**                   |
| Percent forested     | 89%          | **87.8%**                   |
| Carbon stored        | 1,632 MMTC   | **1,592 MMTC**              |
| Growth-to-harvest    | 1.8x         | **1.72x** (2024)            |
| Emissions offset KPI | (not shown)  | **91%** (2017-2021)         |

Economy figures ($8.3B, 29,637 jobs, $1 of every $29) are unchanged (FIDACS 2023).

New data files derived from the reports: `carbon_balance.csv` (forest removals 22.2 vs gross
emissions 16.1 MMTCO2e/yr, net sink 13.5), `emissions_offset.csv` (51% a decade earlier rising to
91%), and `pest_counties.csv` (BLD 16 counties, EAB 11, HWA 9). The vetted V5 time series
(carbon storage with CI, health and diversity, exports, stumpage, conserved lands, county
indicators, counties GeoJSON) were carried forward unchanged; their 2024 values already match the
report (G:H 1.72, relative density 0.57, mortality declining).

## Preview

```bash
cd outputs/maine-forest-dashboard/V6
python3 -m http.server 8000    # then open http://localhost:8000
```
Serve over HTTP, not file://, because the CSV and GeoJSON load via fetch(). Geolocation ("Find my
area") needs HTTPS or localhost.

## Verification (this build)

Headless Chromium render confirmed: all 10 charts draw, 8 KPI cards hydrate (first reads
"17.4 Million Acres"), 3 pest rings, the county choropleth renders 16 polygons over CARTO tiles,
and there are zero console errors. Static checks pass: all 10 canvas IDs are wired, every
getElementById target exists in the HTML, and all referenced data and image files resolve. Proof
screenshot at `_verify/full.png`.

## To take live

The V5 deployment path still applies (static drop-in to WordPress, DNS cutover). V6 is a drop-in
replacement for the V5 folder. Reconfirm photo licensing for any images retained, and enable the
analytics tag of choice before launch.
