// Catalog API (contract 3.6). Only "approved" entries are ever exposed.
const CATALOG_URL = '/data/games.json';
let games = [];

function fail(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

// Network-first so removals propagate; falls back to the HTTP/SW cache when offline.
export async function loadCatalog() {
  let data;
  try {
    const res = await fetch(CATALOG_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('bad status');
    data = await res.json();
  } catch {
    const cached = 'caches' in self ? await caches.match(CATALOG_URL) : null;
    if (!cached) throw fail('NETWORK', 'The game list could not be loaded. Check your connection and try again.');
    data = await cached.json();
  }
  games = (data.games || []).filter((g) => g.status === 'approved');
  return games;
}

export async function getCatalogGame(id) {
  if (!games.length) await loadCatalog();
  return games.find((g) => g.id === id) || null;
}

const tokens = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// Small custom scorer: title matches count most, then developer/genre, then description.
function score(game, words) {
  const title = game.title.toLowerCase();
  const meta = [game.developer, ...game.genres, String(game.year)].join(' ').toLowerCase();
  const desc = game.description.toLowerCase();
  let total = 0;
  for (const w of words) {
    let s = 0;
    if (title.startsWith(w)) s += 10;
    else if (title.includes(w)) s += 6;
    if (meta.includes(w)) s += 3;
    if (desc.includes(w)) s += 1;
    if (!s) return 0; // every word must match somewhere
    total += s;
  }
  return total;
}

// Call loadCatalog() first. Empty query returns everything (filtered), sorted by title.
export function searchGames(query, { platform, genre, license } = {}) {
  const words = tokens(query || '');
  return games
    .filter((g) => (!platform || g.platform === platform) && (!genre || g.genres.includes(genre)) && (!license || g.license === license))
    .map((g) => ({ g, s: words.length ? score(g, words) : 1 }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.g.title.localeCompare(b.g.title))
    .map((r) => r.g);
}
