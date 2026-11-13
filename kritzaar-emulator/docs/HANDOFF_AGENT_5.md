# HANDOFF_AGENT_5

## Files delivered
- /admin/catalog.html
- /admin/catalog.js
- /legal/terms.html
- /legal/dmca.html
- /legal/how-it-works.html
- /legal/privacy.html
- /CONTENT_CHECKLIST.md
- /HANDOFF_AGENT_5.md

## Public exports / how to use
- Open `/admin/catalog.html`. "Load live catalog" or "Import games.json", edit, "Export games.json", then upload to `/data/games.json`.
- `catalog.js` exports `validateEntry(entry, allGames, domains)`, `hostAllowed(host, domains)`, `wordCount(paragraphs)`.

## Libraries used
None.

## Decisions & assumptions
- Editorial 150-word rule is an error for `approved`, a warning for `draft`. `removed` entries only need `id` and `status`.
- Rules re-implemented from section 3.2/3.3 since `validate-catalog.mjs` was not available. Combiner: compare against Agent 3's script.
- "Mark removed" keeps the tombstone; "Delete entry" warns against deleting once public.
- Admin loads `/css/emulator-shared.css` (Agent 4) and falls back to local colors if missing. Existing admin style not seen; adjust with THEME_NOTES.md.
- Preview is a simplified view, not the exact generated page.
- Placeholders to fill: `CONTACT_EMAIL_HERE`, `DMCA_EMAIL_HERE` in legal pages. Canonical host assumed `https://kritzaar.com`.
- `noindex` set on admin page. No auth is added; protect `/admin/*` (e.g. Cloudflare Access).

## INTEGRATION SNIPPETS
Footer links:
```html
<a href="/legal/how-it-works.html">How it works</a>
<a href="/legal/terms.html">Terms</a>
<a href="/legal/privacy.html">Privacy</a>
<a href="/legal/dmca.html">Copyright / DMCA</a>
```
Sitemap: add the 4 legal URLs; do NOT add `/admin/`.
robots.txt: `Disallow: /admin/`
Optional `_headers` for admin: `/admin/*` → `X-Robots-Tag: noindex`

## Known issues / not done
- Cover upload not supported; only a path and credit are entered.
- Legal text is a draft and needs professional review.
- Privacy page needs consent details confirmed for AdSense regions.

## CONTRACT REQUEST
none

## Self-test results
Not run in a browser here; code written against contracts 3.2/3.3 only.

## How to test my part
1. Open `/admin/catalog.html` on staging, load the live catalog.
2. Add an entry with a non-allowlisted URL: expect an error.
3. Type under 150 words and set approved: expect an error.
4. Export, then run `node scripts/validate-catalog.mjs` on the file.
5. Open each legal page: draft banner shows at the top.
