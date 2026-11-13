# HANDOFF_AGENT_2

## Files delivered
```
/js/storage-mock.js
/js/storage.js
/js/dropzone.js
/js/pwa-install.js
/js/storage-test.html      (dev page, do not deploy to the live site)
/sw.js
/manifest.webmanifest
/icons/icon-192.png
/icons/icon-512.png
/icons/icon-maskable-512.png
/icons/apple-touch-icon.png
```
Icons are **placeholders** (white "K" on the accent color). I had no access to the existing logo; the Combiner should replace the four PNGs with versions made from it (same names and sizes: 192, 512, 512 maskable with about 20% safe padding, 180).

## Public exports / how to use
`storage.js` and `storage-mock.js` export the identical API from contract 3.4. Switch between them by changing only the import path.

Conventions
- Timestamps are milliseconds since epoch. `lastPlayedAt` is `null` until first played; `listGames()` sorts by `lastPlayedAt ?? addedAt`, newest first.
- The stored game blob has no file name (privacy). `getGame` returns `{ ...record, blob }`; `null` if the id is unknown.
- `saveGame` hashes the file if `meta.sha256` is not given. Re-saving the same id keeps `addedAt`, `lastPlayedAt`, and config unless new values are passed.
- State bytes go in under `state:<id>:<slot>` in the `blobs` store; `listStates` reads only the small metadata store.
- Invalid arguments (bad id, slot not 1 to 3) throw `TypeError` with no `code`. Storage failures throw `Error` with a contract `code` (`QUOTA_EXCEEDED`, `NOT_FOUND`, `STORAGE_UNAVAILABLE`, `BAD_ARCHIVE`).
- `onStorageChange(cb)` fires for changes in this tab **and** other tabs and returns an unsubscribe function. `cb({ type, id })`, `type` is one of `game-saved`, `game-updated`, `game-touched`, `game-deleted`, `state-saved`, `state-deleted`, `backup-imported`.
- Backups: single binary file (magic `KZBK1`), written and read entry by entry so big libraries are not loaded into memory at once. A partial import (quota hit mid-way) keeps what was already restored and throws `QUOTA_EXCEEDED`.
- `exportBackup()` records the time as `lastBackupAt`.

Additive extras (do not break the contract)
- `hashFile(file, { onProgress(0..1), forceChunked })`: files over 64 MB use an incremental SHA-256 in 4 MB chunks.
- `getStorageInfo()` also returns `gamesBytes` (exact total size of stored games). `usedBytes` is the browser's whole-site estimate, which Safari reports loosely, so use `gamesBytes` for an accurate "games" bar.
- `getMeta(name)` / `setMeta(name, value)`: tiny key/value flags kept in IndexedDB (not localStorage).

`dropzone.js`
```js
import { createDropZone } from '/js/dropzone.js';
const dz = createDropZone(el, { accept: ['.zip', '.jsdos'], maxWarnMB: 500,
  onFile: async (file, { setProgress }) => { /* hash, saveGame, start */ },
  onError: (msg) => {} });
// dz.setProgress(0..1 | null, text), dz.setBusy(bool, text), dz.reset(), dz.destroy()
```
Checks extension, empty file, one file at a time, and shows an inline "large file, continue?" confirm over `maxWarnMB`. If `onFile` throws, its message is shown and passed to `onError`. Styles are built in (`kz-drop-*`, uses `--kz-*` variables with fallbacks), so no CSS file is needed; Agent 4's shared CSS can override.

`pwa-install.js`
```js
import { initPwa } from '/js/pwa-install.js';
initPwa();                    // normal pages
initPwa({ banners: false });  // player page: SW + persistence only, nothing over the game
```
Also exports `registerServiceWorker, canInstall, promptInstall, isIosSafari, isStandalone, backupReminderDue(days), downloadBackup()` for Agent 4 to reuse (e.g. the library's backup button and the continue-playing reminder). It fires `window` event `kz-installable` when the browser allows an install prompt.

## Libraries used
None. Everything is hand-written, including the incremental SHA-256. No third-party code, no CDN.

## Decisions & assumptions
- `THEME_NOTES.md` was not provided, so fallbacks use `#7c5cff` accent, `#12101c` background (also the manifest colors). Change `theme_color` / `background_color` to match the site.
- Service worker strategy: HTML, `/data/*`, `.json`, `.xml` are **network-first** (3 s timeout, then cache). A 404 or 410 from the network deletes the cached copy, so a removed catalog game and its deleted page disappear as soon as the person is online. `/emulator/vendor/*` is cache-first (cached on first use). Other same-origin JS/CSS/images are stale-while-revalidate. Game files are never cached: no Range requests, no `.zip/.jsdos/.exe/.iso/...`, nothing over 50 MB, no `/admin/`, no cross-origin, no `/cdn-cgi/`.
- Cache keys ignore the query string, so `?game=a` and `?game=b` share one cached player shell.
- Redirected responses are rebuilt before caching or serving (browsers refuse to serve them to navigations). This matters on Cloudflare Pages, which redirects `/x/index.html` to `/x/`.
- Update flow: new worker waits; `pwa-install.js` shows "A new version is ready" and sends `SKIP_WAITING` on Reload. First install activates immediately.
- iOS banner appears only when the person already has games stored (nothing to protect otherwise), then is hidden for 14 days after "Got it". Install banner: 14 days snooze. Backup reminder: after 7 days, snoozed 3 days. One banner at a time; priority is iOS install, then install, then backup.
- Persistence is requested only when games already exist (`initPwa`), and Agent 1 should also call `requestPersistence()` right after the first `saveGame`.
- Manifest `start_url` is `/library/?source=pwa` and scope `/` (whole site). If KritZaar prefers the PWA to open on the home page, change `start_url`.
- Dropzone and PWA styles are injected via a constructable stylesheet (works under a strict `style-src` CSP), falling back to a `<style>` tag.

## INTEGRATION SNIPPETS

**Add to `<head>` of every page** (home, catalog, game pages, library, legal; the player too):
```html
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="theme-color" content="#7c5cff">
```
**Add before `</body>`** on every page except the player:
```html
<script type="module">import { initPwa } from '/js/pwa-install.js'; initPwa();</script>
```
Player page (`/emulator/index.html`):
```html
<script type="module">import { initPwa } from '/js/pwa-install.js'; initPwa({ banners: false });</script>
```
(If the site uses a strict `script-src` CSP, move these one-liners into a small shared file instead.)

**`_headers`** (Combiner file):
```
/sw.js
  Cache-Control: no-cache
  Service-Worker-Allowed: /
/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: no-cache
```
Do not let a `Cross-Origin-Embedder-Policy` rule for `/emulator/*` apply to `/sw.js` or `/js/*`. Note that if COEP `require-corp` is applied to the player, same-origin files are fine but anything cross-origin will be blocked.

**Service worker file list (Combiner must do):**
1. Open `/sw.js` and add Agent 1's real vendor file names to `OPTIONAL` (js-dos script/CSS/wasm, zip library) so offline play works on the first visit without having to play online first.
2. Add the real catalog page URL to `OPTIONAL` (I guessed `/games/` and `/games/index.html`; a miss is harmless).
3. `CORE` lists every file path from section 2 that must exist. If the Combiner renames or drops any, update it, because **install fails if a CORE file returns an error** (the previous worker stays active). Bump `VERSION` when you rename or remove files.

**`sitemap.xml` / `robots.txt`:** nothing needed from this agent. Keep `/js/storage-test.html` out of the deploy or add `Disallow: /js/storage-test.html`.

## Known issues / not done
- Tested `storage.js` only in Node 22 with `fake-indexeddb` (see self-test). Not yet run in real browsers: use `/js/storage-test.html` on Chrome Android, Safari iOS, Chrome and Firefox desktop. Quota behavior, iOS Safari eviction, and Firefox private mode need real-device checks.
- `dropzone.js`, `pwa-install.js`, and `sw.js` have only been syntax-checked, not run in a browser.
- Backups of very large libraries still end up as one downloaded file; browsers may fail the download on low-memory phones. The format is stream-friendly on import, but export uses `Blob` parts and a normal download.
- No quota-exceeded simulation in the test page. Test manually: DevTools, Application, Storage, "Simulate custom storage quota", then save a game and expect `QUOTA_EXCEEDED`.
- Placeholder icons (see above).
- The extra `gamesBytes` in `getStorageInfo` loads all game metadata (not blobs); fine for hundreds of games.

## CONTRACT REQUEST
Additive only; I built to v1.0 and added these as extras:
1. Add `getMeta(name)` / `setMeta(name, value)` to 3.4 (used for backup time and banner snoozes).
2. Add optional `gamesBytes` to `getStorageInfo()`'s result.
3. Add optional 2nd argument `{ onProgress, forceChunked }` to `hashFile`.
4. Add optional 2nd argument `{ setProgress }` to `onFile` in 3.5.
5. Add an error code for bad arguments (currently a plain `TypeError`), e.g. `BAD_ARGUMENT`.
6. Specify the event names in `onStorageChange` (listed above).

## Self-test results
Node 22 + `fake-indexeddb`, running the real `storage.js`: **31 passed, 0 failed.** Covered:
- SHA-256 of "abc" (native and chunked), and chunked hashing vs Node `crypto` at lengths 0, 55, 56, 63, 64, 65, 1000, and about 9 MB
- saveGame / getGame byte-for-byte, file name stripped, list order after touch, config merge
- states: save, load, list, empty slot, slot 4 rejected, missing game gives `NOT_FOUND`, deleteState
- deleteGame removes states and state blobs
- export, delete, import round trip (game bytes, config, states restored); garbage and truncated backups give `BAD_ARCHIVE`
- `getStorageInfo` shape and `gamesBytes`; change events fire
- Mock: demo data, save, state, backup round trip
- `node --check` passed for `sw.js` and `pwa-install.js`.

## How to test my part
1. Serve the site over `http://localhost` (service workers need localhost or https), open `/js/storage-test.html`, press **Run tests**; all lines should say PASS (the backup test says SKIP if you have real games saved). Add `?mock=1` to test the mock.
2. Drop zone: mount it on any test page and try a `.txt` file (expect an error), an empty `.zip`, two files at once, and a file over `maxWarnMB` (expect the Continue/Cancel prompt). Keyboard: Tab to the zone, press Enter.
3. Offline: load `/library/` and `/emulator/index.html` once online, then DevTools, Application, Service Workers, tick Offline, reload both. Expect the pages to load.
4. Takedown: with a game page cached, delete or `removed` it, redeploy, reload online: the page should 404 and no longer open offline.
5. Update flow: change `VERSION` in `sw.js`, reload, expect "A new version is ready", tap Reload.
6. iOS: open in Safari with a game stored; expect the Add to Home Screen banner. After installing to the home screen, it should not show.
7. Lighthouse: PWA installability needs the manifest, icons, and SW all in place.
