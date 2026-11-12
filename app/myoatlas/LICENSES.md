# Licences, attribution and notices — MyoAtlas

MyoAtlas combines several works under different licences. **Please keep this file and the `licenses/` folder with any copy or redistribution.**

## At a glance

| Part of this project | Files | Licence |
| --- | --- | --- |
| Application code | `index.html`, `style.css`, `app.js`, `tools/*` | **MIT** (see `LICENSE`) |
| 3D mesh data (muscles and skeleton) | `geometry-muscles.js`, `geometry-skeleton.js` | **CC BY-SA 4.0** (derived from Z-Anatomy / BodyParts3D) |
| Muscle catalogue: structure names, hierarchy, regions, study notes | `data.js`, `tiers.js`, `reference.js`, `study-notes/*.txt` | **CC BY-SA 4.0** |
| three.js r147 (renderer and OrbitControls) | `vendor/three.min.js`, `vendor/OrbitControls.js` | **MIT**, © three.js authors (see `licenses/three.js-MIT.txt`) |

The MIT licence applies to the code only. It does **not** relax the ShareAlike requirement that applies to the mesh data and catalogue.

## Required attribution (CC BY-SA 4.0)

> “Z-Anatomy — The libre 3D atlas of anatomy”, CC BY-SA 4.0, based on “BodyParts3D, © The Database Center for Life Science”, licensed under CC Attribution 4.0 International (CC BY-SA 2.1 Japan when Z-Anatomy adapted it).
> Z-Anatomy source: <https://github.com/Z-Anatomy/Models-of-human-anatomy> (snapshot commit `e38ea5e6c7e22d229a975f3fde563a5aca52099e`).
> Adapted for the “Svitylo 3D Anatomy Atlas”, data release 1.2.0 (<https://github.com/authorOd/3d-anatomy-atlas>), from which this project obtained the meshes.
> Licence: <https://creativecommons.org/licenses/by-sa/4.0/>

Latin/English structure names come from Z-Anatomy object names and its TA2.csv term list (based on Terminologia Anatomica 2, FIPAT), also CC BY-SA 4.0.

The upstream attribution and licence notices are reproduced unchanged in `licenses/upstream/`.

## Changes made (CC BY-SA 4.0 §3(a)(1)(B))

Starting from the “economy” (reduced-detail) GLB meshes of Svitylo release 1.2.0, this project:

1. kept only the **muscular** and **skeletal** systems;
2. **removed** fasciae, bursae, tendon sheaths, retinacula, septa and similar non-muscle structures from the muscular system, and attached tendons/aponeuroses to their muscles where the name allowed;
3. split the merged region meshes back into one mesh per structure, **welded duplicate vertices**, **quantised** vertex positions to 16 bits within a fixed bounding box, and repacked the result as binary data embedded in JavaScript (normals are recomputed in the browser);
4. regrouped muscles into 19 teaching regions, merged heads/parts (for example the two heads of biceps brachii) under a single muscle, and re-spelled some display names to common textbook forms;
5. generated Latin-style headings (“M. …”) from the English names. These are **not** copied from the upstream dictionary and are unreviewed;
6. wrote text-only reference entries (`reference.js`) for muscles and muscle tissues that have no mesh in the source;
7. added study notes (origin, insertion, nerve supply, action, clinical pearls) written for this project.

The scripts that perform steps 1–5 are in `tools/`. The study notes are plain text in `study-notes/`.

## ShareAlike

If you redistribute or adapt `geometry-*.js`, `data.js` or `study-notes/`, you must license your adaptation under **CC BY-SA 4.0** (or a compatible licence), give the attribution above, link to the licence, and indicate your changes. Full text: `licenses/CC-BY-SA-4.0.txt`.

BodyParts3D (the origin of the meshes) is © The Database Center for Life Science. It is distributed under CC BY 4.0 (`licenses/CC-BY-4.0.txt`); Z-Anatomy adapted it when it was available under CC BY-SA 2.1 Japan (`licenses/CC-BY-SA-2.1-JP.txt`, official Japanese legal code).

## Items deliberately NOT included

The upstream release also contains material that is non-commercial or still under verification (for example the University of Dundee inner-ear model, CC BY-NC-SA, and a kidney model, CC BY-NC). **None of it is used here**: only the muscular and skeletal meshes are included.

## Status of the upstream licence audit

The Svitylo data release is a “preview” channel. Its own licence audit of every included asset is marked **pending**. This project relies on the licences the upstream release declares. If you plan commercial or institutional use, check the current status at the upstream repositories and consider independent legal review.

## Accuracy and intended use

- The upstream meshes “have not had a complete independent anatomical review” (upstream coverage report).
- The study notes in this project were written from standard anatomical teaching and **have not been independently reviewed**. Variations exist between textbooks (for example nerve root values and the exact attachment descriptions).
- MyoAtlas is a **revision aid for students**. It is not a medical device and must not be used for diagnosis, treatment decisions or surgical planning. Always verify against your prescribed textbook or atlas.

## Warranty

All parts are provided “as is”, without warranty of any kind.
