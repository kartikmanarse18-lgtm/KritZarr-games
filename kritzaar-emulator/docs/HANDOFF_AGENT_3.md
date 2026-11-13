# HANDOFF_AGENT_3

## Files delivered
- /data/games.json (1 approved entry, see Known issues)
- /data/allowed-sources.json
- /data/sitemap-games.xml (generated)
- /js/catalog.js
- /js/search-ui.js
- /css/catalog.css
- /games/game-template.html
- /games/jill-of-the-jungle.html (generated)
- /games/covers/jill-of-the-jungle.svg (neutral generated placeholder)
- /scripts/validate-catalog.mjs
- /scripts/build-game-pages.mjs

## Public exports / how to use
- `loadCatalog()`, `getCatalogGame(id)`, `searchGames(query, {platform, genre, license})` per contract 3.6. Call `loadCatalog()` before `searchGames`.
- `mountCatalogSearch(containerEl, { suggestUrl })` in search-ui.js renders search box, three filters, results, empty state, "/" shortcut, and the "Suggest a game" link when `suggestUrl` is given.
- Run `node scripts/build-game-pages.mjs` (it validates first). It rewrites pages and the sitemap, and deletes generated pages of removed/draft entries.

## Libraries used
None. Custom scorer, no third-party code.

## Decisions & assumptions
- Canonical URLs and sitemap use `SITE_ORIGIN` (default `https://kritzaar.com`, overridable by env var). **Confirm the real domain.**
- Cover is an SVG placeholder because no official press-kit image was verified.
- `exeHint` omitted for Jill: the executable name was not verified, so the player shows its one-time picker.
- Controls for Jill list only arrow keys plus a pointer to the in-game Controls menu, because the exact key bindings were not verified.
- Game pages link to `/games/` (catalog page) and `/legal/how-it-works.html`; the catalog page itself is not in my file list, so the Combiner must create `/games/index.html` that calls `mountCatalogSearch`.

## INTEGRATION SNIPPETS
Catalog page (`/games/index.html`):
```html
<link rel="stylesheet" href="/css/emulator-shared.css"><link rel="stylesheet" href="/css/catalog.css">
<main id="kz-catalog"></main>
<script type="module">
import { mountCatalogSearch } from '/js/search-ui.js';
mountCatalogSearch(document.getElementById('kz-catalog'), { suggestUrl: 'mailto:OWNER_EMAIL?subject=Game%20suggestion' });
</script>
```
sitemap.xml: add `<sitemap><loc>https://kritzaar.com/data/sitemap-games.xml</loc></sitemap>` to an index, or merge its `<url>` entries.
Service worker: `/data/games.json` must be network-first. Precache `/js/catalog.js`, `/js/search-ui.js`, `/css/catalog.css`.

## Known issues / not done
- **Only 1 game, not the 5 to 10 asked for.** Verified: Jill of the Jungle: The Complete Trilogy (GOG page shows price FREE, developer Epic Games).
- Left out because I could not verify an official source and license:
  - SkyRoads and SkyRoads Xmas Special: many secondary sources say freeware from Bluemoon, but bluemoon.ee could not be fetched here. Needs owner approval to add `bluemoon.ee` to the allowlist, plus a manual check of the page.
  - Commander Keen ep. 1, Wolfenstein 3D, Doom shareware, Cosmo, Duke Nukem 1/3D: the 3D Realms pages I could read give no download link or license wording; Doom's shareware is only on non-allowlisted mirrors. Check 3D Realms/GOG/Steam pages by hand.
- The GOG download is a Windows installer, not a zip. The instructions tell users to install or extract and zip the folder. Agent 1's bundler must handle that zip, and this friction is worth testing.
- No editorial or cover text was copied; all editorial is original. Please skim it for factual accuracy.

## CONTRACT REQUEST
None.

## Self-test results
- Validator passes on the real catalog; fails with 7 readable errors on a deliberately broken copy (bad license, http URL, non-allowlisted host, short editorial, duplicate id).
- `searchGames` tested in Node with a stubbed fetch: title match, no-match, and filter cases correct.
- Generated page has no leftover `{{` placeholders; no `innerHTML` used. Not tested in a real browser.

## How to test my part
1. `node scripts/validate-catalog.mjs`
2. `node scripts/build-game-pages.mjs`
3. Serve the folder, open `/games/jill-of-the-jungle.html`, check at 360px width.
4. Set the entry's status to `removed`, rerun the build: the page and sitemap entry disappear.
