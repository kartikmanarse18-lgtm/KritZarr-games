# Vendored libraries (self-hosted, pinned)

| Library | Version | License | Source |
|---|---|---|---|
| js-dos (player UI + emulators glue + DOSBox WASM build) | 8.5.4 | GPL-2.0 (per package.json; DOSBox itself is GPL-2.0+) | https://github.com/caiiiycuk/js-dos , npm `js-dos@8.5.4` |
| fflate (zip reading/writing) | 0.8.3 | MIT | https://github.com/101arrowz/fflate , npm `fflate@0.8.3` |

Files: `js-dos.js`, `js-dos.css`, `emulators/{emulators.js,wdosbox.js,wdosbox.wasm,wlibzip.js,wlibzip.wasm}`, `fflate/fflate.js` (ESM browser build).
Not copied: DOSBox-X, JSPI, debug and IPX/WebRTC builds, source maps (not needed for v1).
GPL notice: the Combiner must link to the corresponding source (URLs above) from the site's legal/credits page.
