#!/usr/bin/env python3
"""Build the standalone Prep site: shell.html (the app, artifact-style body) + packs/*.json -> index.html + sw.js.

Usage: python3 tools/assemble.py
Each pack is one JSON file in packs/ (see packs/README). Packs are sorted by date. Groupmates' names are
replaced before anything is published, because the site is public (Arda's call, 19 Oct 2026).

A pack with "site": "gumruk" goes to a second page, gumruk/index.html (Turkish, its own manifest and service
worker, installable on its own); every other pack goes to the main page, index.html. gumruk/ is only written
when such a pack exists.
"""
import glob, hashlib, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
NAMES = [(r"\bHelya and Ataberk\b", "your groupmates"), (r"\bAtaberk and Helya\b", "your groupmates"),
         (r"\b(Helya|Helena|Ataberk)'s\b", "a groupmate's"), (r"\b(Helya|Helena|Ataberk)\b", "a groupmate")]

def scrub(obj):
    if isinstance(obj, str):
        for pat, rep in NAMES:
            obj = re.sub(pat, rep, obj)
        # A replacement that opens a sentence gets a capital letter.
        return re.sub(r"(^|[.!?]\s+)(a groupmate|your groupmates)",
                      lambda m: m.group(1) + m.group(2)[0].upper() + m.group(2)[1:], obj)
    if isinstance(obj, list):
        return [scrub(x) for x in obj]
    if isinstance(obj, dict):
        return {k: scrub(v) for k, v in obj.items()}
    return obj

packs = [json.load(open(p, encoding="utf-8")) for p in sorted(glob.glob(str(ROOT / "packs" / "*.json")))]
packs.sort(key=lambda p: p.get("date") or "")
packs = scrub(packs)
left = re.findall(r"Helya|Helena|Ataberk", json.dumps(packs, ensure_ascii=False))
if left:
    sys.exit(f"names left after scrub: {left}")

shell_src = (ROOT / "shell.html").read_text(encoding="utf-8")
m = re.search(r"<title>(.*?)</title>", shell_src, re.S)
main_title = m.group(1).strip() if m else "Prep"

# Each site: its pack filter, page head, assets for the offline cache, and the worker's prefix.
SITES = [
    {"id": "", "dir": "", "filter": lambda p: not p.get("site"), "lang": "en", "title": main_title,
     "web_title": "Prep", "up": "", "cache": "prep",
     "assets": ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"],
     "others": ["gumruk/"]},
    {"id": "gumruk", "dir": "gumruk", "filter": lambda p: p.get("site") == "gumruk", "lang": "tr", "title": "Gümrük",
     "web_title": "Gümrük", "up": "../", "cache": "gumruk",
     "assets": ["./", "./index.html", "./manifest.webmanifest", "../icon-192.png", "../icon-512.png", "../apple-touch-icon.png"],
     "others": []},
]

def build(site):
    sp = [p for p in packs if site["filter"](p)]
    if site["id"] and not sp:
        return None
    shell = shell_src
    payload = json.dumps({"packs": sp}, ensure_ascii=False).replace("</", "<\\/")
    shell, n = re.subn(r'(<script type="application/json" id="content">)(.*?)(</script>)',
                       lambda m: m.group(1) + payload + m.group(3), shell, count=1, flags=re.S)
    if n != 1:
        sys.exit("content block not found in shell.html")
    if site["id"]:
        # the page tells the app which site and language it is, before the app scripts run
        boot = '<script>window.PREP_SITE=' + json.dumps({"id": site["id"], "lang": site["lang"]}) + '</script>\n'
        shell = shell.replace('<script type="application/json" id="content">', boot + '<script type="application/json" id="content">', 1)
    shell = re.sub(r"<title>.*?</title>", "", shell, count=1, flags=re.S)
    shell = re.sub(r'<meta name="claude:[^"]*"[^>]*>', "", shell)
    up = site["up"]
    head = f"""<!doctype html>
<html lang="{site["lang"]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="{site["web_title"]}">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131F24" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="{up}apple-touch-icon.png">
<link rel="icon" href="{up}icon-192.png">
<title>{site["title"]}</title>
<style>:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;font:14px system-ui,sans-serif}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
</head>
<body>
"""
    tail = """
<script>if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {})); }</script>
</body>
</html>
"""
    page = head + shell + tail
    out = ROOT / site["dir"] if site["dir"] else ROOT
    out.mkdir(exist_ok=True)
    (out / "index.html").write_text(page, encoding="utf-8")
    version = hashlib.sha1(page.encode("utf-8")).hexdigest()[:10]
    sw = (ROOT / "tools" / "sw.template.js").read_text(encoding="utf-8")
    for k, v in (("__PREFIX__", site["cache"]), ("__VERSION__", version),
                 ("__ASSETS__", json.dumps(site["assets"])), ("__OTHERS__", json.dumps(site["others"]))):
        sw = sw.replace(k, v)
    (out / "sw.js").write_text(sw, encoding="utf-8")
    if site["id"]:
        main = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
        manifest = {
            "name": "Gümrük Müşavir Yardımcılığı",
            "short_name": "Gümrük",
            "description": "Gümrük Müşavir Yardımcılığı sınavına hazırlık: dersler, sayılar, testler ve sorular.",
            "start_url": "./",
            "scope": "./",
            "display": main.get("display", "standalone"),
            "orientation": main.get("orientation", "portrait"),
            "background_color": main.get("background_color", "#FFFFFF"),
            "theme_color": main.get("theme_color", "#58CC02"),
            "icons": [
                {"src": "../icon-192.png", "sizes": "192x192", "type": "image/png"},
                {"src": "../icon-512.png", "sizes": "512x512", "type": "image/png"},
                {"src": "../icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
            ],
        }
        (out / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    label = (site["dir"] + "/" if site["dir"] else "") + "index.html"
    print(f"{label} {len(page)//1024} KB, {len(sp)} pack(s), cache {site['cache']}-{version}")
    return page

for s in SITES:
    build(s)
