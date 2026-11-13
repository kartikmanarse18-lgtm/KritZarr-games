/*
 * KritZaar storage MOCK (Agent 2). Same API as /js/storage.js, but everything
 * lives in memory and is lost on reload. For building UI without IndexedDB.
 * Differences from the real module:
 *  - three demo games are pre-loaded (set globalThis.KZ_MOCK_EMPTY = true before import to skip)
 *  - backups use a simple JSON format and are NOT compatible with the real module
 * Swap to the real module by changing only the import path.
 */

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const games = new Map();   // id -> record
const blobs = new Map();   // id -> Blob
const states = new Map();  // `${id}:${slot}` -> { savedAt, bytes }
const meta = new Map();
const listeners = new Set();

function err(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}
function assertId(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new TypeError('Invalid game id.');
}
function assertSlot(slot) {
  if (![1, 2, 3].includes(slot)) throw new TypeError('Slot must be 1, 2 or 3.');
}
function notify(type, id) {
  const detail = { type, id };
  listeners.forEach((cb) => { try { cb(detail); } catch (_) { /* ignore listener errors */ } });
}
function strip(blob) { return blob.slice(0, blob.size, 'application/octet-stream'); }

export async function hashFile(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function saveGame(id, file, meta_ = {}) {
  assertId(id);
  if (!(file instanceof Blob)) throw err('BAD_ARCHIVE', 'No file was provided.');
  const old = games.get(id);
  const now = Date.now();
  const rec = {
    id,
    title: meta_.title || (old && old.title) || id,
    platform: meta_.platform || (old && old.platform) || 'dos',
    size: file.size,
    sha256: meta_.sha256 || await hashFile(file),
    config: meta_.config || (old && old.config) || {},
    source: meta_.source || (old && old.source) || 'custom',
    addedAt: old ? old.addedAt : now,
    lastPlayedAt: old ? old.lastPlayedAt : null
  };
  games.set(id, rec);
  blobs.set(id, strip(file));
  notify('game-saved', id);
  return { ...rec };
}

export async function getGame(id) {
  if (typeof id !== 'string' || !games.has(id)) return null;
  return { ...games.get(id), blob: blobs.get(id) };
}

export async function listGames() {
  return [...games.values()]
    .map((r) => ({ ...r }))
    .sort((a, b) => (b.lastPlayedAt ?? b.addedAt) - (a.lastPlayedAt ?? a.addedAt));
}

export async function updateGameConfig(id, config) {
  const rec = games.get(id);
  if (!rec) throw err('NOT_FOUND', 'That game is not in your library.');
  rec.config = { ...rec.config, ...config };
  notify('game-updated', id);
  return { ...rec };
}

export async function touchGame(id) {
  const rec = games.get(id);
  if (!rec) throw err('NOT_FOUND', 'That game is not in your library.');
  rec.lastPlayedAt = Date.now();
  notify('game-touched', id);
}

export async function deleteGame(id) {
  games.delete(id);
  blobs.delete(id);
  for (const k of [...states.keys()]) if (k.startsWith(id + ':')) states.delete(k);
  notify('game-deleted', id);
}

export async function saveState(gameId, slot, bytes) {
  assertSlot(slot);
  if (!games.has(gameId)) throw err('NOT_FOUND', 'That game is not in your library.');
  states.set(`${gameId}:${slot}`, { savedAt: Date.now(), bytes: new Uint8Array(bytes) });
  notify('state-saved', gameId);
}
export async function loadState(gameId, slot) {
  assertSlot(slot);
  const s = states.get(`${gameId}:${slot}`);
  return s ? new Uint8Array(s.bytes) : null;
}
export async function listStates(gameId) {
  return [1, 2, 3]
    .filter((slot) => states.has(`${gameId}:${slot}`))
    .map((slot) => {
      const s = states.get(`${gameId}:${slot}`);
      return { slot, savedAt: s.savedAt, size: s.bytes.length };
    });
}
export async function deleteState(gameId, slot) {
  assertSlot(slot);
  states.delete(`${gameId}:${slot}`);
  notify('state-deleted', gameId);
}

export async function getStorageInfo() {
  const gamesBytes = [...games.values()].reduce((n, r) => n + r.size, 0);
  const stateBytes = [...states.values()].reduce((n, s) => n + s.bytes.length, 0);
  return { usedBytes: gamesBytes + stateBytes, quotaBytes: 2 * 1024 ** 3, persisted: false, gamesBytes };
}
export async function requestPersistence() { return false; }

// Small key/value helpers (extra API, see HANDOFF CONTRACT REQUEST)
export async function getMeta(name) { return meta.has(name) ? meta.get(name) : null; }
export async function setMeta(name, value) { meta.set(name, value); }

const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function exportBackup() {
  const out = { v: 1, games: [], states: [] };
  for (const rec of games.values()) {
    out.games.push({ rec, data: b64(new Uint8Array(await blobs.get(rec.id).arrayBuffer())) });
  }
  for (const [k, s] of states) {
    const [gameId, slot] = k.split(':');
    out.states.push({ gameId, slot: Number(slot), savedAt: s.savedAt, data: b64(s.bytes) });
  }
  meta.set('lastBackupAt', Date.now());
  return new Blob([JSON.stringify(out)], { type: 'application/json' });
}
export async function importBackup(blob) {
  let data;
  try { data = JSON.parse(await blob.text()); } catch (_) { throw err('BAD_ARCHIVE', 'This is not a KritZaar backup file.'); }
  if (!data || data.v !== 1) throw err('BAD_ARCHIVE', 'This is not a KritZaar backup file.');
  for (const g of data.games) { games.set(g.rec.id, g.rec); blobs.set(g.rec.id, new Blob([unb64(g.data)])); }
  for (const s of data.states) states.set(`${s.gameId}:${s.slot}`, { savedAt: s.savedAt, bytes: unb64(s.data) });
  notify('backup-imported', null);
  return { games: data.games.length, states: data.states.length };
}

export function onStorageChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Demo data so UI work has something to show.
if (!globalThis.KZ_MOCK_EMPTY) {
  const day = 86400000;
  const demo = [['demo-platformer', 'Demo Platformer', 2.4, 0.5], ['demo-puzzle', 'Demo Puzzle', 0.8, 3], ['demo-shooter', 'Demo Shooter', 14, 9]];
  for (const [id, title, mb, daysAgo] of demo) {
    const t = Date.now() - daysAgo * day;
    games.set(id, { id, title, platform: 'dos', size: Math.round(mb * 1048576), sha256: '', config: {}, source: 'catalog', addedAt: t - day, lastPlayedAt: t });
    blobs.set(id, new Blob(['demo']));
  }
}
