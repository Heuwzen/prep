Prep: a personal presentation-prep study app (static site).
Open it on a phone and use Add to Home Screen.

UI: edit src/, then python3 src/build.py (writes shell.html).
Content: one JSON file per presentation in packs/.
Publish: python3 tools/assemble.py (writes index.html and sw.js), commit, push. GitHub Pages redeploys.
Second page: a pack with "site": "gumruk" goes to /gumruk/ (Turkish, its own app icon, manifest and cache) instead of the main page; assemble.py writes gumruk/ only when such a pack exists. UI strings for it live in the TR block of src/00-lang.js (English text is the key; the English page never reads it).
Daily page (private): tools/daily.mjs seals day files into daily.json with Arda's passphrase; src/07-daily.js opens it. The pipeline lives in the vault (_Tools/Daily Learning.md).
