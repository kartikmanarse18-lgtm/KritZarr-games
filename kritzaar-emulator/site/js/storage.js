/*
 * KritZaar storage layer (Agent 2). Contract v1.0, section 3.4.
 * IndexedDB database `kritzaar-emulator`:
 *   games  : metadata records (keyPath id)            -> listGames() stays fast
 *   blobs  : out-of-line keys, raw values:
 *              <gameId>              game file (Blob, name stripped)
 *              state:<gameId>:<slot> save state (Uint8Array)
 *              meta:<name>           small flags (backup time, prompt dismissals)
 *   states : state metadata (keyPath key = "<gameId>:<slot>", index gameId)
 * Timestamps are milliseconds since epoch. Nothing here touches the network.
 */

const DB_NAME = 'kritzaar-emulator';
const DB_VERSION = 1;
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAGIC = 'KZBK1\n';
const CODES = new Set(['QUOTA_EXCEEDED', 'NOT_FOUND', 'STORAGE_UNAVAILABLE', 'BAD_ARCHIVE', 'NO_EXECUTABLE', 'UNSUPPORTED_BROWSER', 'EMULATOR_CRASH', 'NETWORK']);

/* ---------- errors ---------- */

function err(code, message, cause) {
  const e = new Error(message);
  e.code = code;
  if (cause) e.cause = cause;
  return e;
}

// Turn any thrown value into an Error that carries a contract error code.
function toErr(e) {
  if (e && typeof e.code === 'string' && CODES.has(e.code)) return e;
  if (e && (e.name === 'QuotaExceededError' || (e.inner && e.inner.name === 'QuotaExceededError'))) {
    return err('QUOTA_EXCEEDED', 'Your browser has no space left for this. Delete a game or free up storage and try again.', e);
  }
  if (e instanceof TypeError && !e.code) return e; // programmer error (bad argument)
  return err('STORAGE_UNAVAILABLE', 'Your browser could not read or write saved games. Private browsing mode can cause this.', e);
}

function assertId(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new TypeError('Invalid game id.');
}
function assertSlot(slot) {
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) throw new TypeError('Slot must be 1, 2 or 3.');
}

/* ---------- IndexedDB plumbing ---------- */

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(err('STORAGE_UNAVAILABLE', 'This browser does not support saved games.'));
      return;
    }
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(toErr(e)); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('games')) db.createObjectStore('games', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      if (!db.objectStoreNames.contains('states')) {
        db.createObjectStore('states', { keyPath: 'key' }).createIndex('gameId', 'gameId');
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      db.onclose = () => { dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(toErr(req.error));
    req.onblocked = () => reject(err('STORAGE_UNAVAILABLE', 'Close other KritZaar tabs and try again.'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

// Wrap an IDBRequest in a promise.
const rq = (r) => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

// Run `work(tx)` in one transaction; resolves with its result once the tx commits.
async function run(storeNames, mode, work) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(storeNames, mode); } catch (e) { reject(toErr(e)); return; }
    let done;
    try { done = Promise.resolve(work(tx)); } catch (e) { done = Promise.reject(e); }
    done.catch((e) => { reject(toErr(e)); try { tx.abort(); } catch (_) { /* already finished */ } });
    tx.oncomplete = () => done.then(resolve, () => {});
    tx.onerror = () => reject(toErr(tx.error));
    tx.onabort = () => reject(toErr(tx.error));
  });
}

/* ---------- change notifications ---------- */

const listeners = new Set();
let channel = null;
try {
  channel = new BroadcastChannel('kritzaar-emulator');
  channel.onmessage = (e) => emit(e.data);
} catch (_) { /* BroadcastChannel unavailable: same-tab listeners still work */ }

function emit(detail) {
  listeners.forEach((cb) => { try { cb(detail); } catch (_) { /* ignore listener errors */ } });
}
function notify(type, id) {
  const detail = { type, id };
  emit(detail);
  try { if (channel) channel.postMessage(detail); } catch (_) { /* ignore */ }
}

// Fires for changes made in this tab AND in other tabs. Returns an unsubscribe function.
export function onStorageChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/* ---------- hashing (incremental SHA-256, chunked, no full-file buffer) ---------- */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

class Sha256 {
  constructor() {
    this.h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    this.buf = new Uint8Array(64);
    this.bl = 0;     // bytes waiting in buf
    this.len = 0;    // total bytes hashed
    this.w = new Uint32Array(64);
  }

  update(data) {
    this.len += data.length;
    let i = 0;
    if (this.bl) {
      const n = Math.min(64 - this.bl, data.length);
      this.buf.set(data.subarray(0, n), this.bl);
      this.bl += n;
      i = n;
      if (this.bl === 64) { this.block(this.buf, 0); this.bl = 0; }
    }
    for (; i + 64 <= data.length; i += 64) this.block(data, i);
    if (i < data.length) { this.buf.set(data.subarray(i), 0); this.bl = data.length - i; }
  }

  block(m, o) {
    const w = this.w;
    for (let t = 0; t < 16; t++) {
      w[t] = (m[o + 4 * t] << 24) | (m[o + 4 * t + 1] << 16) | (m[o + 4 * t + 2] << 8) | m[o + 4 * t + 3];
    }
    for (let t = 16; t < 64; t++) {
      const x = w[t - 15], y = w[t - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let a = this.h[0], b = this.h[1], c = this.h[2], d = this.h[3];
    let e = this.h[4], f = this.h[5], g = this.h[6], h = this.h[7];
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    this.h[0] += a; this.h[1] += b; this.h[2] += c; this.h[3] += d;
    this.h[4] += e; this.h[5] += f; this.h[6] += g; this.h[7] += h;
  }

  hex() {
    const hi = Math.floor(this.len / 0x20000000);
    const lo = (this.len << 3) >>> 0;
    const pad = new Uint8Array((this.bl < 56 ? 56 : 120) - this.bl + 8);
    pad[0] = 0x80;
    const dv = new DataView(pad.buffer);
    dv.setUint32(pad.length - 8, hi);
    dv.setUint32(pad.length - 4, lo);
    this.update(pad);
    return [...this.h].map((n) => n.toString(16).padStart(8, '0')).join('');
  }
}

const CHUNK = 4 * 1024 * 1024;           // read 4 MB at a time
const SUBTLE_MAX = 64 * 1024 * 1024;     // below this, native digest is faster

/**
 * SHA-256 hex of a File/Blob. Files over 64 MB are hashed in 4 MB chunks so the
 * whole file is never held in memory twice.
 * Optional 2nd arg (additive): { onProgress(fraction 0..1), forceChunked }.
 */
export async function hashFile(file, opts = {}) {
  const { onProgress, forceChunked } = opts;
  try {
    if (!forceChunked && file.size <= SUBTLE_MAX && globalThis.crypto && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      if (onProgress) onProgress(1);
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    const sha = new Sha256();
    for (let off = 0; off < file.size; off += CHUNK) {
      sha.update(new Uint8Array(await file.slice(off, off + CHUNK).arrayBuffer()));
      if (onProgress) onProgress(Math.min(1, (off + CHUNK) / file.size));
    }
    if (onProgress && file.size === 0) onProgress(1);
    return sha.hex();
  } catch (e) {
    throw err('BAD_ARCHIVE', 'That file could not be read. Pick it again and retry.', e);
  }
}

/* ---------- games ---------- */

// Strip the File name (privacy) without copying data: slice() is a lazy view.
const anon = (blob) => blob.slice(0, blob.size, 'application/octet-stream');

function cleanRecord(r) {
  return {
    id: r.id,
    title: String(r.title || r.id),
    platform: String(r.platform || 'dos'),
    size: Number(r.size) || 0,
    sha256: String(r.sha256 || ''),
    config: r.config && typeof r.config === 'object' ? r.config : {},
    source: r.source === 'catalog' ? 'catalog' : 'custom',
    addedAt: Number(r.addedAt) || Date.now(),
    lastPlayedAt: r.lastPlayedAt == null ? null : Number(r.lastPlayedAt)
  };
}

export async function saveGame(id, file, meta = {}) {
  assertId(id);
  if (!(file instanceof Blob)) throw err('BAD_ARCHIVE', 'No file was provided.');
  const sha256 = meta.sha256 || await hashFile(file);
  const rec = await run(['games', 'blobs'], 'readwrite', async (tx) => {
    const games = tx.objectStore('games');
    const old = await rq(games.get(id));
    const next = cleanRecord({
      id,
      title: meta.title || (old && old.title),
      platform: meta.platform || (old && old.platform),
      size: file.size,
      sha256,
      config: meta.config || (old && old.config),
      source: meta.source || (old && old.source),
      addedAt: old ? old.addedAt : Date.now(),
      lastPlayedAt: old ? old.lastPlayedAt : null
    });
    games.put(next);
    tx.objectStore('blobs').put(anon(file), id);
    return next;
  });
  notify('game-saved', id);
  return rec;
}

export async function getGame(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) return null;
  return run(['games', 'blobs'], 'readonly', async (tx) => {
    const [rec, blob] = await Promise.all([rq(tx.objectStore('games').get(id)), rq(tx.objectStore('blobs').get(id))]);
    return rec && blob ? { ...rec, blob } : null;
  });
}

// Most recently played first; never-played games sort by when they were added.
export async function listGames() {
  const all = await run(['games'], 'readonly', (tx) => rq(tx.objectStore('games').getAll()));
  return all.sort((a, b) => (b.lastPlayedAt ?? b.addedAt) - (a.lastPlayedAt ?? a.addedAt));
}

export async function updateGameConfig(id, config) {
  assertId(id);
  const rec = await run(['games'], 'readwrite', async (tx) => {
    const store = tx.objectStore('games');
    const old = await rq(store.get(id));
    if (!old) throw err('NOT_FOUND', 'That game is not in your library.');
    const next = { ...old, config: { ...(old.config || {}), ...config } };
    store.put(next);
    return next;
  });
  notify('game-updated', id);
  return rec;
}

export async function touchGame(id) {
  assertId(id);
  await run(['games'], 'readwrite', async (tx) => {
    const store = tx.objectStore('games');
    const old = await rq(store.get(id));
    if (!old) throw err('NOT_FOUND', 'That game is not in your library.');
    store.put({ ...old, lastPlayedAt: Date.now() });
  });
  notify('game-touched', id);
}

export async function deleteGame(id) {
  assertId(id);
  await run(['games', 'blobs', 'states'], 'readwrite', async (tx) => {
    const stateKeys = await rq(tx.objectStore('states').index('gameId').getAllKeys(IDBKeyRange.only(id)));
    tx.objectStore('games').delete(id);
    tx.objectStore('blobs').delete(id);
    for (const key of stateKeys) {
      tx.objectStore('states').delete(key);
      tx.objectStore('blobs').delete(`state:${key}`);
    }
  });
  notify('game-deleted', id);
}

/* ---------- save states ---------- */

export async function saveState(gameId, slot, bytes) {
  assertId(gameId);
  assertSlot(slot);
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const key = `${gameId}:${slot}`;
  await run(['games', 'blobs', 'states'], 'readwrite', async (tx) => {
    if (!(await rq(tx.objectStore('games').getKey(gameId)))) throw err('NOT_FOUND', 'That game is not in your library.');
    tx.objectStore('states').put({ key, gameId, slot, savedAt: Date.now(), size: data.length });
    tx.objectStore('blobs').put(data, `state:${key}`);
  });
  notify('state-saved', gameId);
}

export async function loadState(gameId, slot) {
  assertId(gameId);
  assertSlot(slot);
  const data = await run(['blobs'], 'readonly', (tx) => rq(tx.objectStore('blobs').get(`state:${gameId}:${slot}`)));
  return data ? new Uint8Array(data) : null;
}

export async function listStates(gameId) {
  assertId(gameId);
  const rows = await run(['states'], 'readonly', (tx) => rq(tx.objectStore('states').index('gameId').getAll(IDBKeyRange.only(gameId))));
  return rows.map((r) => ({ slot: r.slot, savedAt: r.savedAt, size: r.size })).sort((a, b) => a.slot - b.slot);
}

export async function deleteState(gameId, slot) {
  assertId(gameId);
  assertSlot(slot);
  await run(['blobs', 'states'], 'readwrite', async (tx) => {
    tx.objectStore('states').delete(`${gameId}:${slot}`);
    tx.objectStore('blobs').delete(`state:${gameId}:${slot}`);
  });
  notify('state-deleted', gameId);
}

/* ---------- housekeeping ---------- */

/**
 * { usedBytes, quotaBytes, persisted, gamesBytes }
 * usedBytes/quotaBytes come from the browser estimate for the whole site (includes caches);
 * gamesBytes (extra field) is the exact total size of stored game files.
 */
export async function getStorageInfo() {
  const sm = typeof navigator !== 'undefined' ? navigator.storage : null;
  let est = {};
  let persisted = false;
  try { if (sm && sm.estimate) est = await sm.estimate(); } catch (_) { /* leave zeros */ }
  try { if (sm && sm.persisted) persisted = await sm.persisted(); } catch (_) { /* leave false */ }
  let gamesBytes = 0;
  try { gamesBytes = (await listGames()).reduce((n, g) => n + (g.size || 0), 0); } catch (_) { /* storage unavailable */ }
  return { usedBytes: est.usage || gamesBytes, quotaBytes: est.quota || 0, persisted: !!persisted, gamesBytes };
}

export async function requestPersistence() {
  try {
    const sm = navigator.storage;
    if (!sm || !sm.persist) return false;
    return !!(await sm.persisted() || await sm.persist());
  } catch (_) { return false; }
}

// Tiny key/value store for flags (extra API, see HANDOFF CONTRACT REQUEST).
export async function getMeta(name) {
  const v = await run(['blobs'], 'readonly', (tx) => rq(tx.objectStore('blobs').get(`meta:${name}`)));
  return v === undefined ? null : v;
}
export async function setMeta(name, value) {
  await run(['blobs'], 'readwrite', async (tx) => { tx.objectStore('blobs').put(value, `meta:${name}`); });
}

/* ---------- backup ---------- */
/*
 * File layout: "KZBK1\n", then repeated entries until end of file:
 *   [uint32 big-endian header length][header JSON utf-8][payload bytes]
 * header = { type: 'game', record, size } | { type: 'state', gameId, slot, savedAt, size }
 * Game payloads are Blob slices, so the browser never loads all games into memory at once.
 * Import reads entry by entry for the same reason.
 */

const enc = new TextEncoder();
function entry(header, payload) {
  const h = enc.encode(JSON.stringify({ ...header, size: payload.size ?? payload.length }));
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, h.length);
  return [len, h, payload];
}

export async function exportBackup() {
  const { recs, blobsByKey, stateRows } = await run(['games', 'blobs', 'states'], 'readonly', async (tx) => {
    const recs = await rq(tx.objectStore('games').getAll());
    const stateRows = await rq(tx.objectStore('states').getAll());
    const blobsByKey = new Map();
    for (const r of recs) blobsByKey.set(r.id, await rq(tx.objectStore('blobs').get(r.id)));
    for (const s of stateRows) blobsByKey.set(s.key, await rq(tx.objectStore('blobs').get(`state:${s.key}`)));
    return { recs, blobsByKey, stateRows };
  });
  const parts = [enc.encode(MAGIC)];
  for (const r of recs) {
    const blob = blobsByKey.get(r.id);
    if (blob) parts.push(...entry({ type: 'game', record: r }, blob));
  }
  for (const s of stateRows) {
    const bytes = blobsByKey.get(s.key);
    if (bytes) parts.push(...entry({ type: 'state', gameId: s.gameId, slot: s.slot, savedAt: s.savedAt }, new Blob([bytes])));
  }
  await setMeta('lastBackupAt', Date.now());
  return new Blob(parts, { type: 'application/octet-stream' });
}

export async function importBackup(blob) {
  const bad = (e) => err('BAD_ARCHIVE', 'This is not a valid KritZaar backup file.', e);
  if (!(blob instanceof Blob) || (await blob.slice(0, MAGIC.length).text()) !== MAGIC) throw bad();
  let off = MAGIC.length;
  const count = { games: 0, states: 0 };
  while (off < blob.size) {
    if (off + 4 > blob.size) throw bad();
    const hl = new DataView(await blob.slice(off, off + 4).arrayBuffer()).getUint32(0);
    off += 4;
    if (hl > 65536 || off + hl > blob.size) throw bad();
    let h;
    try { h = JSON.parse(await blob.slice(off, off + hl).text()); } catch (e) { throw bad(e); }
    off += hl;
    if (!h || !Number.isInteger(h.size) || h.size < 0 || off + h.size > blob.size) throw bad();
    const payload = blob.slice(off, off + h.size, 'application/octet-stream');
    off += h.size;

    if (h.type === 'game' && h.record && typeof h.record.id === 'string' && ID_RE.test(h.record.id)) {
      const rec = cleanRecord({ ...h.record, size: h.size });
      await run(['games', 'blobs'], 'readwrite', async (tx) => {
        tx.objectStore('games').put(rec);
        tx.objectStore('blobs').put(payload, rec.id);
      });
      count.games++;
    } else if (h.type === 'state' && ID_RE.test(String(h.gameId)) && [1, 2, 3].includes(h.slot)) {
      const bytes = new Uint8Array(await payload.arrayBuffer());
      const key = `${h.gameId}:${h.slot}`;
      await run(['games', 'blobs', 'states'], 'readwrite', async (tx) => {
        if (!(await rq(tx.objectStore('games').getKey(h.gameId)))) return; // state without its game: skip
        tx.objectStore('states').put({ key, gameId: h.gameId, slot: h.slot, savedAt: Number(h.savedAt) || Date.now(), size: bytes.length });
        tx.objectStore('blobs').put(bytes, `state:${key}`);
        count.states++;
      });
    } else {
      throw bad();
    }
  }
  notify('backup-imported', null);
  return count;
}
