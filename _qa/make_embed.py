#!/usr/bin/env python3
"""Regenerate the embedded-data files so the dashboard also works when opened
directly from disk (file://), where browsers block fetch().

Run from the V6 folder after any data/ change:
    python3 _qa/make_embed.py

Writes:
    js/data-embed.js       (CSV + GeoJSON + featured.json; loaded on every visit)
    js/data-embed-tif.js   (forest-loss GeoTIFF as base64; lazy-loaded by the overlay)

On a web server the dashboard fetches the live files in data/ (so the annual update
is still just a file replacement); the embed is only used as the file:// fallback.
"""
import json, base64, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

CSVS = ['headline_kpis', 'carbon_storage_2003_2023', 'health_diversity', 'carbon_balance',
        'fire_spei_1903_2024', 'pest_counties', 'contribution_breakdown', 'sector_output',
        'export_timeseries', 'forest_ownership', 'maine_conserved_lands_by_year',
        'county_indicators', 'county_ecosystem_services', 'conserved_by_county', 'county_ci', 'disturbance_agents_fia', 'forest_structure_fia']
JSONS = ['featured.json', 'maine_counties.geojson']

emb = {'csv': {}, 'json': {}}
for c in CSVS:
    emb['csv'][c + '.csv'] = open(f'data/{c}.csv', encoding='utf-8').read()
for j in JSONS:
    emb['json'][j] = json.load(open(f'data/{j}', encoding='utf-8'))
open('js/data-embed.js', 'w', encoding='utf-8').write(
    'window.MFD_EMBED = ' + json.dumps(emb, separators=(',', ':')) + ';\n')

tif = base64.b64encode(open('data/maine_forestloss.tif', 'rb').read()).decode('ascii')
open('js/data-embed-tif.js', 'w', encoding='utf-8').write('window.MFD_TIF_B64 = "' + tif + '";\n')

print('Wrote js/data-embed.js (%d KB) and js/data-embed-tif.js (%d KB)'
      % (os.path.getsize('js/data-embed.js') // 1024, os.path.getsize('js/data-embed-tif.js') // 1024))
print('Remember to bump CACHE_VERSION in sw.js after any data change.')
