#!/usr/bin/env python3
"""Build the app shell (the UI, no content) from the source modules: src/* -> shell.html.

Then run tools/assemble.py, which adds every pack in packs/ and writes index.html and sw.js.
UI changes go here; weekly content goes in packs/ (one JSON file per presentation).
"""
import os, re
D = os.path.dirname(os.path.abspath(__file__))
R = lambda f: open(os.path.join(D, f), encoding='utf-8').read()
icons = ''.join('<symbol id="i-%s" viewBox="0 0 24 24">%s</symbol>' % tuple(l.rstrip('\n').split('|', 1)) for l in R('icons.txt').splitlines() if l.strip())
def badge(n):
    return ('<button class="streak" id="streak-%s" type="button" aria-haspopup="dialog" aria-label="Streak"><svg class="ring-svg" viewBox="0 0 44 44" aria-hidden="true"><circle class="trk" cx="22" cy="22" r="18"/><circle class="arc is-zero" cx="22" cy="22" r="18" stroke-dasharray="113.10" stroke-dashoffset="113.10"/></svg><svg class="ic fill flame" aria-hidden="true"><use href="#i-flame"/></svg></button>') % n
shell = re.sub(r'\{\{badge:(\w+)\}\}', lambda m: badge(m.group(1)), R('shell.html'))
js = '\n'.join(R(f) for f in sorted(x for x in os.listdir(D) if re.match(r'\d\d-.*\.js$', x)))
out = ('<title>Prep</title>\n<style>\n' + R('tokens.css') + R('base.css') + '</style>\n'
       '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,500..700,0..100&family=Nunito:wght@400..900&display=swap">\n'
       '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + icons + '</svg>\n' + shell +
       '<script type="application/json" id="content">{"packs": []}</script>\n<script>\n(function(){\n\'use strict\';\n' + js + '\n})();\n</script>\n')
open(os.path.join(D, '..', 'shell.html'), 'w', encoding='utf-8').write(out)
print('shell.html', len(out) // 1024, 'KB')
