// Validates /data/games.json against contract 3.2 and /data/allowed-sources.json (3.3).
// Usage: node scripts/validate-catalog.mjs   (exit code 1 when errors are found)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LICENSES = ['freeware', 'shareware', 'open-source', 'homebrew', 'commercial-official'];
const STATUSES = ['draft', 'approved', 'removed'];
const LAYOUTS = ['dpad-2btn', 'dpad-4btn', 'mouse-pad'];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const words = (s) => (String(s).trim().match(/\S+/g) || []).length;

function hostAllowed(host, domains) {
  return domains.some((d) => host === d || host.endsWith('.' + d));
}

const sources = read('data/allowed-sources.json');
const catalog = read('data/games.json');
if (!Array.isArray(sources.domains) || !sources.domains.length) err('allowed-sources.json', 'domains must be a non-empty array');
if (!Array.isArray(catalog.games)) err('games.json', 'games must be an array');

const seen = new Set();
for (const [i, g] of (catalog.games || []).entries()) {
  const w = `games[${i}] (${g.id ?? 'no id'})`;
  if (typeof g.id !== 'string' || !ID_RE.test(g.id)) err(w, 'id must be lowercase letters, digits and hyphens');
  else if (seen.has(g.id)) err(w, 'duplicate id');
  else seen.add(g.id);
  if (!g.title) err(w, 'title is required');
  if (g.platform !== 'dos') err(w, 'platform must be "dos" in v1');
  if (!Number.isInteger(g.year) || g.year < 1970 || g.year > 2026) err(w, 'year must be a sensible integer');
  if (!g.developer) err(w, 'developer is required');
  if (!Array.isArray(g.genres) || !g.genres.length) err(w, 'genres must be a non-empty array');
  if (!g.description) err(w, 'description is required');
  if (!LICENSES.includes(g.license)) err(w, `license must be one of ${LICENSES.join(', ')}`);
  if (!STATUSES.includes(g.status)) err(w, `status must be one of ${STATUSES.join(', ')}`);
  if (!LAYOUTS.includes(g.touchLayout)) err(w, `touchLayout must be one of ${LAYOUTS.join(', ')}`);
  if (!DATE_RE.test(g.addedAt || '')) err(w, 'addedAt must be YYYY-MM-DD');
  if (!g.sourceName) err(w, 'sourceName is required');
  if (!g.coverCredit) err(w, 'coverCredit is required');
  if (!g.cover) err(w, 'cover is required');
  else if (g.cover.startsWith('/games/covers/') && !existsSync(join(root, g.cover))) err(w, `cover file missing: ${g.cover}`);

  if (!Array.isArray(g.editorial) || !g.editorial.length) err(w, 'editorial must be a non-empty array');
  else {
    const n = g.editorial.reduce((sum, p) => sum + words(p), 0);
    if (n < 150) err(w, `editorial has ${n} words, minimum is 150`);
  }

  try {
    const u = new URL(g.officialUrl);
    if (u.protocol !== 'https:') err(w, 'officialUrl must use https');
    if (!hostAllowed(u.hostname, sources.domains || [])) err(w, `officialUrl host "${u.hostname}" is not in allowed-sources.json`);
  } catch {
    err(w, 'officialUrl is required and must be a valid URL');
  }

  const f = g.expectedFile;
  if (!f || !Array.isArray(f.extensions) || !f.extensions.length) err(w, 'expectedFile.extensions is required');
  else if (!f.extensions.every((e) => /^\.[a-z0-9]+$/.test(e))) err(w, 'expectedFile.extensions must look like ".zip"');
  if (f && !(f.approxSizeMB > 0)) err(w, 'expectedFile.approxSizeMB must be a positive number');
  if (f && f.sha256 !== undefined && !(Array.isArray(f.sha256) && f.sha256.every((h) => /^[0-9a-f]{64}$/i.test(h)))) err(w, 'expectedFile.sha256 must be an array of 64-char hex strings');

  if (!Array.isArray(g.instructions) || !g.instructions.length) err(w, 'instructions must be a non-empty array');
  if (!Array.isArray(g.controls) || !g.controls.every((c) => c && c.keys && c.action)) err(w, 'controls must be an array of { keys, action }');
  if (!g.emulator || g.emulator.type !== 'jsdos') err(w, 'emulator.type must be "jsdos"');
}

if (errors.length) {
  console.error(`Catalog validation failed with ${errors.length} error(s):\n` + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log(`Catalog OK: ${catalog.games.length} entries, ${catalog.games.filter((g) => g.status === 'approved').length} approved.`);
