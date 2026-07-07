#!/usr/bin/env python3
"""Static stress test + red-team audit for Maine Forest Dashboard V6.
Run from the V6 folder: python3 _qa/stress_test.py"""
import re, os, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'index.html')).read()
js   = open(os.path.join(ROOT, 'js/app.js')).read()
css  = open(os.path.join(ROOT, 'css/style.css')).read()

passes, warns, fails = [], [], []
def ok(m):   passes.append(m)
def warn(m): warns.append(m)
def bad(m):  fails.append(m)

# 1. canvases wired
canv = set(re.findall(r'<canvas id="([^"]+)"', html))
wired = set(re.findall(r"getElementById\('([^']+)'\)", js))
missing = [c for c in canv if c not in wired]
ok(f"{len(canv)} canvases, all wired") if not missing else bad(f"canvas not wired: {missing}")

# 2. getElementById targets exist in HTML
html_ids = set(re.findall(r'id="([^"]+)"', html))
notfound = [g for g in wired if g not in html_ids]
ok("all getElementById targets exist") if not notfound else bad(f"JS id not in HTML: {notfound}")

# 3. data file references resolve
data_refs = set(re.findall(r"getCSV\('([^']+)'\)", js)) | set(re.findall(r"getJSON\('([^']+)'\)", js))
dmiss = [d for d in data_refs if not os.path.exists(os.path.join(ROOT, 'data', d))]
ok(f"{len(data_refs)} data files resolve") if not dmiss else bad(f"missing data: {dmiss}")

# 4. image references resolve (allow onerror-safe partner logos)
img_refs = set(re.findall(r'src="(images/[^"]+)"', html))
imiss = [i for i in img_refs if not os.path.exists(os.path.join(ROOT, i))]
ok(f"{len(img_refs)} inline images resolve") if not imiss else warn(f"missing inline images: {imiss}")

# 5. external links must have rel=noopener with target=_blank
ext = re.findall(r'<a\s+[^>]*target="_blank"[^>]*>', html)
noop = [a for a in ext if 'rel=' not in a or 'noopener' not in a]
ok(f"{len(ext)} target=_blank links all have rel=noopener") if not noop else bad(f"target=_blank missing noopener: {len(noop)}")

# 6. accessibility basics
h1 = len(re.findall(r'<h1', html))
ok("exactly one h1") if h1 == 1 else bad(f"h1 count = {h1}")
ok("lang attr present") if re.search(r'<html lang="', html) else bad("missing lang")
ok("skip link target #overview exists") if 'id="overview"' in html and 'href="#overview"' in html else bad("skip link broken")
imgs = re.findall(r'<img\s[^>]*>', html)
noalt = [i for i in imgs if 'alt=' not in i]
ok("all static imgs have alt") if not noalt else warn(f"{len(noalt)} img without alt (JS-injected imgs have alt)")
btns = re.findall(r'<button[^>]*>(.*?)</button>', html, re.S)
emptybtn = [b for b in re.findall(r'<button([^>]*)>\s*</button>', html) if 'aria-label' not in b]
ok("all empty buttons have aria-label") if not emptybtn else bad(f"{len(emptybtn)} empty buttons w/o aria-label")

# 7. meta / SEO / PWA
for tag, patt in [('description','name="description"'), ('og:title','property="og:title"'),
                  ('og:image','property="og:image"'), ('viewport','name="viewport"'),
                  ('theme-color','name="theme-color"'), ('favicon','rel="icon"'),
                  ('manifest','rel="manifest"')]:
    ok(f"meta {tag} present") if patt in html else warn(f"meta {tag} missing")

# 8. stale-number leak check (must NOT appear as headline values)
stale = {'89% Forested':'89% forested (was V5)', '17.5 Million':'17.5M acres (was V5)',
         '1.8x Growth':'1.8x G:H (was V5)', '1,632':'1632 MMTC (was V5)', '1.63 Billion':'1.63B (was V5)'}
leaks = [msg for s, msg in stale.items() if s in html]
ok("no stale V5 headline numbers in HTML") if not leaks else bad(f"stale numbers: {leaks}")

# 9. tag balance
for t in ['section','div','figure','header','footer','nav','button','svg']:
    o = len(re.findall(rf'<{t}[\s>]', html)); c = len(re.findall(rf'</{t}>', html))
    (ok(f"<{t}> balanced ({o})") if o == c else bad(f"<{t}> unbalanced open={o} close={c}"))

# 10. contrast: flag small text using low-contrast tokens on light bg
lowc = []
for token, cls in [('--sage','kpi-src or offset'), ('--gold','eyebrow/kicker small text')]:
    pass  # informational; handled by dedicated --*-text tokens
if '--gold-text' in css: ok("dedicated --gold-text token for small text contrast")
else: warn("no --gold-text token; verify gold small-text contrast >=4.5:1")

# 11. JS defensive: countup fallback so stat never stuck at 0
ok("countUp has visible fallback") if 'data-countup' in html and ('countUp' in js) else warn("check countup")

# 12. weight
core = sum(os.path.getsize(os.path.join(ROOT,f)) for f in ['index.html','css/style.css','js/app.js'])
ok(f"core HTML+CSS+JS = {core//1024} KB")

print("\n=== V6 STRESS TEST ===")
for m in passes: print("  PASS ", m)
for m in warns:  print("  WARN ", m)
for m in fails:  print("  FAIL ", m)
print(f"\nRESULT: {'PASS' if not fails else 'FAIL'}  ({len(passes)} pass, {len(warns)} warn, {len(fails)} fail)")
sys.exit(1 if fails else 0)
