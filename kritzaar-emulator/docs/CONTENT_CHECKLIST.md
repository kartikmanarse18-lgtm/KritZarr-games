# Content Checklist: adding a game safely

Do every step. If any answer is "not sure", leave the game out.

1. **Rights holder:** Who owns the game? Find their official page (publisher, developer, GOG, itch.io, Steam free title).
2. **License:** Does that page clearly say freeware, shareware, open-source, homebrew, or official commercial release? Record exactly which one. Screenshot or save the page URL.
3. **Official link:** Is the domain in `/data/allowed-sources.json`? If not, get owner approval before adding it. Never link to abandonware or ROM sites.
4. **Redistribution:** KritZaar never hosts the game file. Players download from the official link themselves.
5. **File details:** Download once to check the file type (`.zip` or `.jsdos`), approximate size, and the main executable name. Add the SHA-256 if you can.
6. **Original editorial:** Write at least 150 words yourself (history, tips, controls quirks). No copied text from wikis, stores, or reviews.
7. **Cover:** Use an official press-kit image the rights holder allows, or a generated placeholder. Fill `coverCredit`. No scraped box art.
8. **Instructions and controls:** Numbered steps that end with "drop the file into KritZaar". Controls table filled in.
9. **Validate:** Add the entry in `/admin/catalog.html`, fix every error, export `games.json`, run `node scripts/validate-catalog.mjs`.
10. **Test:** Play it on staging with the real official file, on phone and desktop.
11. **Publish:** Set `status` to `approved`, regenerate game pages and sitemap, upload.
12. **Takedown:** If a rights holder asks, set `status` to `removed` (never delete the entry), regenerate, upload, reply within 48 hours.
