// Generates /games/<id>.html for every approved entry and /data/sitemap-games.xml.
// Pages for removed or unapproved entries are deleted (only files carrying the generator marker).
// Usage: node scripts/build-game-pages.mjs
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Public origin of the site, used for canonical URLs and the sitemap. Change if the domain differs.
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://kritzaar.com';
const MARKER = '<!-- Generated pages are made from this file';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync('node', [join(root, 'scripts/validate-catalog.mjs')], { stdio: 'inherit' });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const template = readFileSync(join(root, 'games/game-template.html'), 'utf8');
const catalog = JSON.parse(readFileSync(join(root, 'data/games.json'), 'utf8'));
const approved = catalog.games.filter((g) => g.status === 'approved');

function render(g) {
  const url = `${SITE_ORIGIN}/games/${g.id}.html`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: g.title,
    description: g.description,
    gamePlatform: 'MS-DOS',
    genre: g.genres,
    datePublished: String(g.year),
    author: { '@type': 'Organization', name: g.developer },
    image: SITE_ORIGIN + g.cover,
    url,
  };
  const vars = {
    title: esc(g.title), year: g.year, description: esc(g.description), url, id: g.id,
    coverUrl: SITE_ORIGIN + g.cover, cover: esc(g.cover), coverCredit: esc(g.coverCredit),
    license: esc(g.license), developer: esc(g.developer), officialUrl: esc(g.officialUrl), sourceName: esc(g.sourceName),
    // "<" is escaped so the JSON cannot close the script tag.
    jsonld: JSON.stringify(jsonld).replace(/</g, '\\u003c'),
    editorialHtml: g.editorial.map((p) => `<p>${esc(p)}</p>`).join('\n'),
    instructionsHtml: g.instructions.map((i) => `<li>${esc(i)}</li>`).join('\n'),
    controlsHtml: g.controls.map((c) => `<tr><td>${esc(c.keys)}</td><td>${esc(c.action)}</td></tr>`).join('\n'),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k]));
}

const keep = new Set(approved.map((g) => `${g.id}.html`));
for (const g of approved) writeFileSync(join(root, 'games', `${g.id}.html`), render(g));

// Clean up pages of removed entries.
for (const f of readdirSync(join(root, 'games'))) {
  if (!f.endsWith('.html') || f === 'game-template.html' || keep.has(f)) continue;
  const path = join(root, 'games', f);
  if (readFileSync(path, 'utf8').includes(MARKER)) unlinkSync(path);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  approved.map((g) => `  <url><loc>${SITE_ORIGIN}/games/${g.id}.html</loc><lastmod>${catalog.updatedAt}</lastmod></url>`).join('\n') + '\n</urlset>\n';
writeFileSync(join(root, 'data/sitemap-games.xml'), sitemap);
console.log(`Built ${approved.length} page(s) and sitemap-games.xml.`);
