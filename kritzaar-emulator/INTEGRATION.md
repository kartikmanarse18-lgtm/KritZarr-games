# KritZaar emulator: integration notes

Upload the contents of `site/` to the root of the KritZaar repo (keep paths). Do NOT upload `_not-for-deploy/` or `docs/`.

## 1. Fill placeholders
- `CONTACT_EMAIL_HERE` in `legal/terms.html`, `DMCA_EMAIL_HERE` in `legal/dmca.html` and `legal/privacy.html`.
- Domain `https://kritzaar.com` is assumed in canonical links and the game sitemap. Change if different (rerun `node scripts/build-game-pages.mjs` with `SITE_ORIGIN=https://yourdomain`).
- Replace the 4 placeholder PNGs in `icons/` with your logo (192, 512, 512 maskable, 180 apple-touch).
- Legal pages are drafts. Have them reviewed before launch.

## 2. Home page
Add where you want the strip (e.g. under the search bar):
```html
<div id="kz-continue" hidden></div>
<script type="module">
import { mountContinuePlaying } from '/js/continue-playing.js';
mountContinuePlaying(document.getElementById('kz-continue'));
</script>
<link rel="stylesheet" href="/css/emulator-shared.css">
```
In `<head>` of every existing page you want installable: manifest link, apple-touch-icon, theme-color. Before `</body>`: `<script type="module">import { initPwa } from '/js/pwa-install.js'; initPwa();</script>`.
Add nav links to `/games/` and `/library/`, and footer links to the four `/legal/` pages.

## 3. Shared files (merge by hand into your existing ones)
- `sitemap.xml`: add `/games/`, `/legal/*` (not `/admin/`, `/library/`, `/emulator/`) and `data/sitemap-games.xml`.
- `robots.txt`: add `Disallow: /admin/`
- `_headers`:
```
/sw.js
  Cache-Control: no-cache
  Service-Worker-Allowed: /
/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: no-cache
/admin/*
  X-Robots-Tag: noindex
/emulator/vendor/*
  Cache-Control: public, max-age=31536000, immutable
```
- Protect `/admin/*` (e.g. Cloudflare Access). The admin page has no login.
- No COOP/COEP headers are needed (js-dos here does not use SharedArrayBuffer).

## 4. Ads
No ads on `/emulator/`. Game pages carry original editorial text; keep it at 150+ words.

## 5. Adding games
Follow `docs/CONTENT_CHECKLIST.md`. Edit via `/admin/catalog.html`, export `games.json`, upload to `data/`, run `node scripts/validate-catalog.mjs` and `node scripts/build-game-pages.mjs`, upload the generated pages. Bump `VERSION` in `sw.js` when you rename or remove files.

## 6. Staging first
Upload to a separate branch and test on the Cloudflare Pages preview URL on a real phone (Android Chrome, iPhone Safari) before merging to main.
