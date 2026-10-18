#!/usr/bin/env python3
"""Build the standalone Prep site: shell.html (the app, artifact-style body) + packs/*.json -> index.html + sw.js.

Usage: python3 tools/assemble.py
Each pack is one JSON file in packs/ (see packs/README). Packs are sorted by date. Groupmates' names are
replaced before anything is published, because the site is public (Arda's call, 19 Oct 2026).
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
packs.sort(key=lambda p: p.get("date", ""))
packs = scrub(packs)
left = re.findall(r"Helya|Helena|Ataberk", json.dumps(packs, ensure_ascii=False))
if left:
    sys.exit(f"names left after scrub: {left}")

shell = (ROOT / "shell.html").read_text(encoding="utf-8")
payload = json.dumps({"packs": packs}, ensure_ascii=False).replace("</", "<\\/")
shell, n = re.subn(r'(<script type="application/json" id="content">)(.*?)(</script>)',
                   lambda m: m.group(1) + payload + m.group(3), shell, count=1, flags=re.S)
if n != 1:
    sys.exit("content block not found in shell.html")
m = re.search(r"<title>(.*?)</title>", shell, re.S)
title = m.group(1).strip() if m else "Prep"
shell = re.sub(r"<title>.*?</title>", "", shell, count=1, flags=re.S)
shell = re.sub(r'<meta name="claude:[^"]*"[^>]*>', "", shell)

head = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Prep">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131F24" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" href="icon-192.png">
<title>{title}</title>
<style>:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;font:14px system-ui,sans-serif}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
</head>
<body>
"""
tail = """
<script>if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {})); }</script>
</body>
</html>
"""
index = head + shell + tail
(ROOT / "index.html").write_text(index, encoding="utf-8")
version = hashlib.sha1(index.encode("utf-8")).hexdigest()[:10]
(ROOT / "sw.js").write_text((ROOT / "tools" / "sw.template.js").read_text(encoding="utf-8").replace("__VERSION__", version), encoding="utf-8")
print(f"index.html {len(index)//1024} KB, {len(packs)} pack(s), cache prep-{version}")
