# HANDOFF_AGENT_1

## Files delivered
```
/emulator/index.html
/emulator/player.js
/emulator/player.css
/emulator/bundler.js
/emulator/vendor/js-dos.js, js-dos.css
/emulator/vendor/emulators/{emulators.js, wdosbox.js, wdosbox.wasm, wlibzip.js, wlibzip.wasm}
/emulator/vendor/fflate/{fflate.js, LICENSE}
/emulator/vendor/VENDOR_NOTICE.md
/HANDOFF_AGENT_1.md
```
Total vendor size about 2.4 MB, loaded only on the player page, and only after the player has read the game from storage.

## Public exports / how to use
URL: `/emulator/index.html?game=<id>`. Without `?game`, or for an id not in the catalog, the page works as a generic "add a game" screen and stores the file as `custom-<sha12>` (the URL is updated to that id).

`bundler.js` (ES module):
- `inspectArchive(file, { exeHint? })` returns `{ kind: 'jsdos'|'zip', entries, executables, suggestedExe }`. Added an optional `exeHint` argument (backward compatible).
- `buildBundle(file, { exe, config })` returns a `.jsdos` Blob. `config` accepts only `cycles` (`auto`|`max`|number) and `memsize` (16|32|64). Nothing else reaches `dosbox.conf`.
- `applyState(bundleBlob, stateBytes)` is an extra export used to restore a save (not in the contract, no one else needs it).

`window.KZPlayer` per 3.7: `sendKey, pause, resume, saveState, loadState, on`. Notes for Agent 4:
- `sendKey(code, pressed)` takes **js-dos (GLFW) key codes**: Space 32, Enter 257, Esc 256, Tab 258, Right 262, Left 263, Down 264, Up 265, LShift 340, LCtrl 341, LAlt 342, A-Z 65-90, 0-9 48-57, F1-F12 290-301.
- It also accepts DOM `KeyboardEvent.code` strings (`'ArrowLeft'`, `'ControlLeft'`, `'Space'`, `'KeyA'`...). `KZPlayer.keys` exposes the map.
- `on()` returns an unsubscribe function. Events: `started, paused, resumed, state-saved, state-loaded, error, exit`. `exit` carries `{reason:'user'|'program'}`, `error` carries `{code, message}`.

Page dependencies (imports, other agents' files): `/js/storage.js` (static import), `/js/dropzone.js`, `/js/catalog.js`, `/js/touch-controls.js` (dynamic; catalog and touch are optional and fail silently, dropzone shows an error screen if missing). Stylesheet `/css/emulator-shared.css` (Agent 4) is linked and optional.

## Libraries used
| Library | Version | License | Source | Location |
|---|---|---|---|---|
| js-dos | 8.5.4 | **GPL-2.0** (DOSBox inside is GPL-2.0+) | https://github.com/caiiiycuk/js-dos, npm `js-dos@8.5.4` | `/emulator/vendor/js-dos.*`, `/emulator/vendor/emulators/` |
| fflate | 0.8.3 | MIT | https://github.com/101arrowz/fflate | `/emulator/vendor/fflate/` |

GPL: the Combiner must add a credits/legal line linking to the source URLs above (also in `VENDOR_NOTICE.md`). Source maps, DOSBox-X, JSPI, debug and IPX/WebRTC builds were left out.

## Decisions & assumptions
- **No COOP/COEP headers needed.** I checked the vendored js-dos and emulator files: none use `SharedArrayBuffer`. So no `_headers` entry for `/emulator/*`, and no conflict with ads elsewhere.
- **What a "save state" is.** js-dos 8 does not offer memory snapshots. `ci.persist()` returns the files the game changed (its own save files, configs). Slots 1-3 store that, and loading restarts the game on top of it. Games that keep progress only in memory are not captured. The Saves dialog says this in plain words.
- Loading a state works by overlaying the saved files onto the bundle (js-dos `initFs` did not apply them in my tests).
- Auto-save on exit is opt-in (checkbox on the Play screen), uses **slot 3**, and the checkbox preference is the only thing in localStorage (`kz-autosave`, a "0"/"1").
- A tap on **Play** is required before starting, which also unlocks audio.
- Backend is DOSBox (not DOSBox-X), locked, to keep vendor size small. Per-game `emulator.options` from the catalog may set `renderBackend, renderAspect, mouseCapture, volume, mouseSensitivity` only.
- Plain zips: junk (`__MACOSX`, `.DS_Store`) is dropped, a single wrapping folder is stripped, and archives over 1.5 GB unpacked are rejected as `BAD_ARCHIVE`. Installers (setup, install, config...) rank lower in the picker.
- The game blob is held in memory while playing (needed to restart for loads). Very large files on low-memory phones may fail; the user gets the `EMULATOR_CRASH` message.
- Touch controls mount only when `(pointer: coarse)` and the catalog has `touchLayout`.
- Page is `noindex`.

## INTEGRATION SNIPPETS
**Service worker precache (Agent 2 / Combiner)** add:
```
/emulator/index.html
/emulator/player.js
/emulator/player.css
/emulator/bundler.js
/emulator/vendor/js-dos.js
/emulator/vendor/js-dos.css
/emulator/vendor/emulators/emulators.js
/emulator/vendor/emulators/wdosbox.js
/emulator/vendor/emulators/wdosbox.wasm
/emulator/vendor/emulators/wlibzip.js
/emulator/vendor/emulators/wlibzip.wasm
/emulator/vendor/fflate/fflate.js
```
Offline play depends on all of these. Do not cache game files.

**`_headers`:** nothing required. Optional caching for vendor files (they are versioned by folder, rename the folder on upgrade):
```
/emulator/vendor/*
  Cache-Control: public, max-age=31536000, immutable
```
**Credits/legal page line:** "Emulation by js-dos / DOSBox (GPL-2.0), source: https://github.com/caiiiycuk/js-dos. Zip handling by fflate (MIT)."

## Known issues / not done
- **"The game has ended" screen is unverified.** In headless Chrome the program's exit did not raise js-dos' exit event after a key press, so I could not confirm it. The handler exists; please check on a real device.
- Real game rendering was only checked with `renderBackend: 'canvas'` in headless Chrome (the default WebGL canvas stays black there). Test the default on real phones.
- Not tested: Safari iOS, real touch controls (Agent 4's module did not exist), the real `storage.js`/`dropzone.js` (I used throwaway stubs), real catalog games, quota errors, offline mode.
- Browser console shows 404s for `/css/emulator-shared.css` and `/js/touch-controls.js` until Agent 4's files are merged.
- `getRunningProgram()` in js-dos hung in my tests; it is not used.
- No legal sample bundle from a real game was used (see below).

## CONTRACT REQUEST
none (the optional `exeHint` argument and `applyState` export are additions, not changes).

## Self-test results
Throwaway test site (stub storage/catalog/dropzone, not delivered), headless Chrome, 390px touch and 900px desktop:
- Plain zip with two programs (`GAME/HELLO.COM`, `SETUP.EXE`) inspected: picked `GAME/HELLO.COM` via `exeHint`; bundle built; emulator started; program printed its banner on screen. **Pass.**
- Drop flow: missing screen, catalog info, drop, hash, store, start. **Pass.**
- Save to slot 1, then load: the test program's `SAVE.DAT` counter went 0 to 1, proving the saved file was restored. **Pass.**
- Pause overlay and resume via `KZPlayer`. **Pass.** Layout bug found and fixed (canvas collapsed to 0x0).
- `node --check` on all modules. **Pass.**
- **Test sample:** my own 130-byte public-domain DOS `.COM` program (no third-party game used). To reproduce, assemble this with `nasm -f bin hello.asm -o HELLO.COM`, then `zip -r test.zip GAME/HELLO.COM SETUP.EXE` (copy the COM file as both names). It prints "KRITZAAR TEST OK - run #N" and keeps a counter in `SAVE.DAT`:
```
org 100h
mov ah,3Dh
mov al,2
mov dx,fname
int 21h
jnc opened
mov ah,3Ch
xor cx,cx
mov dx,fname
int 21h
mov byte [cnt],0
mov [h],ax
jmp wr
opened:
mov [h],ax
mov bx,ax
mov ah,3Fh
mov cx,1
mov dx,cnt
int 21h
inc byte [cnt]
mov ax,4200h
xor cx,cx
xor dx,dx
int 21h
wr:
mov bx,[h]
mov ah,40h
mov cx,1
mov dx,cnt
int 21h
mov ah,3Eh
mov bx,[h]
int 21h
mov al,[cnt]
add al,'0'
mov [num],al
mov ah,9
mov dx,msg
int 21h
mov ah,0
int 16h
mov ax,4C00h
int 21h
h dw 0
fname db 'SAVE.DAT',0
cnt db 0
msg db 'KRITZAAR TEST OK - run #'
num db '0',13,10,'$'
```

## How to test my part
1. Merge with Agent 2's `storage.js`/`dropzone.js` and Agent 3's catalog (or use `storage-mock.js`).
2. Serve the folder (any static server), open `/emulator/index.html?game=<catalog id>`.
3. Drop a legal zip or `.jsdos` file: it should start after one tap on Play. A zip with several programs shows the picker once.
4. Saves: use Saves to store a slot, reload, load it. Test Pause, Fullscreen, Controls, Exit (with and without auto-save).
5. Reopen with the network off: the game should still start (needs the SW precache list above).
6. Try a corrupt file (rename a `.txt` to `.zip`): expect a plain-language error, nothing stored.
