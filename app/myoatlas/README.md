# MyoAtlas — 3D Muscle Anatomy Atlas

An interactive 3D atlas of the human muscular system for medical and physiology students. Spin the body 360°, tap any muscle to see its **origin, insertion, nerve supply and action**, peel away layers to reach deep muscles, and test yourself with three quiz types.

## Run it

1. Unzip the folder and **double-click `index.html`**. No server, build step or internet connection is needed (three.js and all data are included).
2. Optional local server: `python3 -m http.server 8000`, then open <http://localhost:8000>.
3. To host it, upload the whole folder to any static host (Netlify, Vercel, GitHub Pages…). Total size is about 7 MB.

Works in current Chrome, Edge, Firefox and Safari (desktop and phone). It needs WebGL.

## What is in it

- **206 named muscles** (more than 450 individual meshes, left and right) built from real anatomical meshes: head, face, eye, mastication, tongue, larynx, pharynx, neck, back (superficial and deep), thorax, diaphragm, abdomen, pelvic floor, shoulder, arm, forearm, hand, gluteal region, thigh, leg and foot.
- Muscles are organised by **region and compartment** (for example *anterior compartment of arm*, *deep gluteal muscles*, *rotator cuff*).
- Muscles with several heads or parts (biceps brachii, triceps, deltoid, trapezius, quadriceps…) show chips for each head with its own origin and insertion.
- **Peel layers**: hide a muscle (button, `H`, or the eye icon in the list), hide or **solo** a whole region, then press `A` to show everything again.
- **Skeleton** as a ghost or solid layer for context (`S`).
- **Search** by name, nerve, action, origin or insertion.
- **Quiz**: *Locate* (find the named muscle on the body), *Name it* (identify the highlighted muscle) and *Nerve* (recall the nerve supply), filterable by region, with streak and accuracy. Progress (“learned”) is saved in your browser.

Shortcuts: `1`–`4` views · `H` hide selected · `A` show all · `S` skeleton · `R` auto-rotate · `←` `→` previous/next · `Esc` deselect.

## Coverage and honest limitations

The meshes come from the open Z-Anatomy / BodyParts3D atlas, which does not model every muscle. **Not included** because the source has no mesh: intrinsic tongue muscles, tensor and levator veli palatini, musculus uvulae, styloglossus, palatoglossus, salpingopharyngeus, middle-ear muscles (stapedius, tensor tympani), external ear muscles, semispinalis capitis, psoas minor, scalenus minimus, subcostales, cremaster, and the urogenital perineal muscles (bulbospongiosus, ischiocavernosus, perineal transversus, urethral sphincter). Smooth and cardiac muscle are not covered.

The commonly quoted “over 600 muscles” counts every head and both sides; this atlas has 206 distinct named muscles.

Neither the meshes nor my study notes have had independent anatomical review, and textbooks differ in detail. **Use it as a revision aid and verify against your textbook.**

## Licences (please read `LICENSES.md`)

- Application code: **MIT**.
- 3D meshes (`geometry-*.js`), muscle catalogue and study notes (`data.js`, `study-notes/`): **CC BY-SA 4.0**, derived from Z-Anatomy / BodyParts3D. Attribution and a list of changes are in `LICENSES.md` and in the app (ⓘ button). Full licence texts are in `licenses/`.
- three.js: MIT.

## Editing the study notes / rebuilding the data

Study notes are plain text in `study-notes/*.txt` (one muscle per line: `name | origin | insertion | nerve supply | action | clinical pearl`; lines starting `part:` describe individual heads). `tools/build_data.py` merges them with the mesh catalogue to produce `data.js`; `tools/build.mjs` converts the upstream GLB meshes into the compact `geometry-*.js` files. Both need the upstream data package `@authorod/svitylo-3d-anatomy-data@1.2.0` (npm) and, for `build.mjs`, `@gltf-transform/core`, `@gltf-transform/extensions` and `meshoptimizer`. The paths at the top of each script show the expected arguments.

## Files

```
index.html            app page
style.css, app.js     interface and 3D viewer (MIT)
data.js               muscle catalogue and study notes (CC BY-SA 4.0)
geometry-muscles.js   muscle meshes (CC BY-SA 4.0)
geometry-skeleton.js  skeleton meshes (CC BY-SA 4.0)
vendor/               three.js r147 + OrbitControls (MIT)
study-notes/          editable source of the study notes
tools/                data-conversion scripts
licenses/             full licence texts + upstream attribution notices
LICENSE               MIT licence (code)
LICENSES.md           attribution, changes made, ShareAlike, disclaimers
```
