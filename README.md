Prep: a personal presentation-prep study app (static site).
Open it on a phone and use Add to Home Screen.

UI: edit src/, then python3 src/build.py (writes shell.html).
Content: one JSON file per presentation in packs/.
Publish: python3 tools/assemble.py (writes index.html and sw.js), commit, push. GitHub Pages redeploys.
Daily page (private): tools/daily.mjs seals day files into daily.json with Arda's passphrase; src/07-daily.js opens it. The pipeline lives in the vault (_Tools/Daily Learning.md).
