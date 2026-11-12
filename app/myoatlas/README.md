# MyoAtlas — 3D Muscle Anatomy Trainer

Rotate a 3D body 360°, tap any muscle to see its name, action, origin/insertion and a memory tip, then test yourself in Quiz mode.

## Run it
1. Keep these files together: `index.html`, `style.css`, `app.js`, `muscles.js`.
2. Double-click `index.html` (needs internet once for the Three.js CDN and the Inter font).
3. Optional local server: `python3 -m http.server 8000` then open http://localhost:8000

## Features
- Smooth orbit / zoom / pan (mouse, touch, pinch) with damping
- Front / Right / Back / Left camera fly-to views (keys 1–4)
- 29 muscles in 9 regions; hover for names, click for the full info card
- Search, region filters, prev/next (← →), auto-rotate (R), labels (L)
- "Learned" tracking with progress ring, saved in your browser
- Quiz mode: find the named muscle, hints, streak and accuracy
- Responsive: sidebar drawer and bottom sheet on phones

## Add or tweak muscles
Edit `muscles.js`. Each muscle has `parts` of ellipsoids (`p` position, `s` radii, `r` rotation in degrees). Parts with x ≠ 0 are mirrored automatically.

## Deploy
Static files only: drop the folder on Netlify, Vercel, GitHub Pages or any web host.

Note: the model is a stylised, procedurally built figure for learning names and locations, not a medical-grade dissection model.
