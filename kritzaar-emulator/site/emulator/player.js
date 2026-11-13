// KritZaar player: runs a game stored in this browser with js-dos (DOSBox).
// Game data comes from IndexedDB only. Nothing is uploaded. Text is set with textContent.
import * as storage from '/js/storage.js';
import { inspectArchive, buildBundle, applyState } from '/emulator/bundler.js';

const VENDOR = '/emulator/vendor/';
const AUTOSAVE_SLOT = 3;
const EMU_OPTIONS = ['renderBackend', 'renderAspect', 'mouseCapture', 'volume', 'mouseSensitivity'];
// js-dos (GLFW) key codes, plus aliases for DOM KeyboardEvent.code names.
const KEYS = { Space: 32, Enter: 257, Escape: 256, Tab: 258, Backspace: 259, ArrowRight: 262, ArrowLeft: 263, ArrowDown: 264, ArrowUp: 265,
  ShiftLeft: 340, ControlLeft: 341, AltLeft: 342, ShiftRight: 344, ControlRight: 345, AltRight: 346 };
for (let i = 0; i < 12; i++) KEYS['F' + (i + 1)] = 290 + i;
for (let i = 0; i < 26; i++) KEYS['Key' + String.fromCharCode(65 + i)] = 65 + i;
for (let i = 0; i < 10; i++) KEYS['Digit' + i] = 48 + i;

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const requestedId = (params.get('game') || '').toLowerCase();
const ID_RE = /^[a-z0-9-]{1,80}$/;

const S = { id: null, record: null, entry: null, blob: null, bundle: null, dos: null, ci: null, paused: false, started: false, exiting: false, gen: 0 };
const listeners = {};

// ---- tiny helpers -------------------------------------------------------
function emit(name, data) { (listeners[name] || []).slice().forEach((cb) => { try { cb(data); } catch (e) { console.error(e); } }); }
function fail(code, message) { const e = new Error(message); e.code = code; return e; }
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k === 'text') n.textContent = v; else n.setAttribute(k, v); }
  kids.forEach((k) => n.append(k));
  return n;
}
const MESSAGES = {
  QUOTA_EXCEEDED: 'This device is out of storage space. Delete a game in My Games or free up space, then try again.',
  NOT_FOUND: 'We could not find that game on this device.',
  STORAGE_UNAVAILABLE: 'Your browser is not letting KritZaar save games. Private browsing or blocked site data can cause this.',
  BAD_ARCHIVE: 'This file could not be opened. Download it again from the official page and do not unzip it.',
  NO_EXECUTABLE: 'We could not find a program to start in this file.',
  UNSUPPORTED_BROWSER: 'This browser cannot run the emulator. Try a recent Chrome, Firefox, Edge or Safari.',
  EMULATOR_CRASH: 'The emulator stopped unexpectedly. Try again, or restart the game.',
  NETWORK: 'The emulator files could not be loaded. Check your connection and try again.',
};
function friendly(err) {
  if (err && MESSAGES[err.code]) return err.message && err.code === 'BAD_ARCHIVE' ? err.message : MESSAGES[err.code];
  if (err && err.name === 'QuotaExceededError') return MESSAGES.QUOTA_EXCEEDED;
  return MESSAGES.EMULATOR_CRASH;
}
function show(name) {
  for (const id of ['loading', 'missing', 'ready', 'picker', 'error', 'stage']) $('kzp-' + id).hidden = id !== name;
  $('kzp-tools').hidden = name !== 'stage';
}
function setProgress(text, pct) { $('kzp-loading-text').textContent = text; $('kzp-progress').value = pct; show('loading'); }
function showError(err, title) {
  console.error(err);
  $('kzp-error-title').textContent = title || 'Something went wrong';
  $('kzp-error-text').textContent = friendly(err);
  show('error');
  emit('error', { code: (err && err.code) || 'EMULATOR_CRASH', message: friendly(err) });
}
function sizeLabel(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

// ---- public API ----------------------------------------------------------
window.KZPlayer = {
  sendKey(keyCode, pressed) {
    const code = typeof keyCode === 'string' ? KEYS[keyCode] : keyCode;
    if (S.ci && Number.isInteger(code)) S.ci.sendKeyEvent(code, !!pressed);
  },
  pause() { if (S.ci && !S.paused) { S.ci.pause(); S.paused = true; syncPause(); emit('paused'); } },
  resume() { if (S.ci && S.paused) { S.ci.resume(); S.paused = false; syncPause(); emit('resumed'); focusGame(); } },
  saveState: (slot) => saveSlot(slot),
  loadState: (slot) => loadSlot(slot),
  on(name, cb) {
    (listeners[name] = listeners[name] || []).push(cb);
    return () => { listeners[name] = listeners[name].filter((f) => f !== cb); };
  },
  keys: KEYS,
};

function syncPause() {
  $('kzp-paused').hidden = !S.paused;
  const b = $('kzp-pause');
  b.textContent = S.paused ? 'Resume' : 'Pause';
  b.setAttribute('aria-pressed', String(S.paused));
}
function focusGame() { const c = $('kzp-dos').querySelector('canvas'); if (c) c.focus(); }

// ---- start-up flow ---------------------------------------------------------
async function init() {
  if (!window.WebAssembly || !window.indexedDB || !window.Worker) return showError(Object.assign(new Error(), { code: 'UNSUPPORTED_BROWSER' }), 'Browser not supported');
  if (requestedId && !ID_RE.test(requestedId)) return showMissing();
  S.id = requestedId || null;
  try {
    if (S.id) S.entry = await lookupCatalog(S.id);
    if (S.id) S.record = await storage.getGame(S.id);
  } catch (e) { return showError(e); }
  if (S.entry) { $('kzp-title').textContent = S.entry.title; document.title = S.entry.title + ' | KritZaar'; }
  if (S.record) { S.blob = S.record.blob; S.id = S.record.id; return showReady(S.record.title); }
  showMissing();
}

// The catalog is optional here: custom games work without it.
async function lookupCatalog(id) {
  try { return await (await import('/js/catalog.js')).getCatalogGame(id); } catch { return null; }
}

function showReady(title) {
  $('kzp-title').textContent = title;
  document.title = title + ' | KritZaar';
  $('kzp-ready-title').textContent = title;
  show('ready');
  $('kzp-play').focus();
}

async function showMissing() {
  const e = S.entry;
  $('kzp-missing-title').textContent = e ? 'Add ' + e.title : 'Add a game';
  const lic = $('kzp-license');
  lic.hidden = !e; if (e) lic.textContent = e.license;
  if (e) {
    $('kzp-missing-intro').textContent = 'KritZaar does not host game files. Get the game from its official source, then drop the file below. It stays on this device.';
    const a = $('kzp-official');
    a.href = e.officialUrl; a.textContent = 'Open the official page' + (e.sourceName ? ' (' + e.sourceName + ')' : '');
    $('kzp-official-wrap').hidden = false;
    const ol = $('kzp-steps'); ol.replaceChildren();
    (e.instructions || []).forEach((t) => ol.append(el('li', { text: t })));
    ol.hidden = !ol.children.length;
  }
  show('missing');
  const accept = (e && e.expectedFile && e.expectedFile.extensions) || ['.zip', '.jsdos'];
  try {
    const { createDropZone } = await import('/js/dropzone.js');
    createDropZone($('kzp-drop'), { accept, maxWarnMB: 500, onFile: onDropped, onError: (m) => { $('kzp-drop-status').textContent = m; } });
  } catch (err) { showError(Object.assign(err, { code: err.code || 'EMULATOR_CRASH' })); }
}

async function onDropped(file) {
  const status = $('kzp-drop-status');
  try {
    status.textContent = 'Checking the file…';
    const sha = await storage.hashFile(file);
    const known = S.entry && S.entry.expectedFile && S.entry.expectedFile.sha256;
    if (known && known.length) {
      status.textContent = known.map((h) => h.toLowerCase()).includes(sha) ? 'This matches the official file.' : 'Unrecognized file, will try anyway.';
    }
    // Reject files we cannot run before anything is stored.
    const info = await inspectArchive(file, { exeHint: S.entry && S.entry.expectedFile && S.entry.expectedFile.exeHint });
    const id = S.id || 'custom-' + sha.slice(0, 12);
    const title = S.entry ? S.entry.title : file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'My game';
    let config = (S.entry && S.entry.emulator && S.entry.emulator.options) || {};
    if (info.kind === 'zip') {
      const exe = info.suggestedExe || (await pickExe(info.executables));
      config = { ...config, exe };
    }
    S.record = await storage.saveGame(id, file, { title, platform: 'dos', sha256: sha, config, source: S.entry ? 'catalog' : 'custom' });
    S.id = id; S.blob = file;
    $('kzp-title').textContent = title; document.title = title + ' | KritZaar'; // show the real name in the bar while it plays
    if (!requestedId) history.replaceState(null, '', '?game=' + encodeURIComponent(id));
    startGame();
  } catch (err) {
    status.textContent = '';
    showError(err);
  }
}

function pickExe(executables) {
  return new Promise((resolve) => {
    const ul = $('kzp-picker-list'); ul.replaceChildren();
    executables.forEach((name) => {
      const b = el('button', { type: 'button', class: 'kzp-btn kzp-btn-primary', text: 'Use this' });
      b.addEventListener('click', () => resolve(name));
      ul.append(el('li', {}, el('span', { text: name }), b));
    });
    show('picker');
  });
}

// Chooses the program for a stored plain zip that has no remembered choice yet.
async function ensureConfig(record, blob) {
  if ((record.config && record.config.exe) || record.platform !== 'dos') return record.config || {};
  const info = await inspectArchive(blob, { exeHint: S.entry && S.entry.expectedFile && S.entry.expectedFile.exeHint });
  if (info.kind === 'jsdos') return record.config || {};
  const exe = info.suggestedExe || (await pickExe(info.executables));
  const config = { ...(record.config || {}), exe };
  await storage.updateGameConfig(record.id, config);
  return config;
}

// ---- emulator ------------------------------------------------------------------
let vendorPromise;
function loadVendor() {
  if (window.Dos) return Promise.resolve();
  vendorPromise = vendorPromise || new Promise((resolve, reject) => {
    const css = el('link', { rel: 'stylesheet', href: VENDOR + 'js-dos.css' });
    const js = el('script', { src: VENDOR + 'js-dos.js' });
    js.onload = resolve;
    js.onerror = () => { vendorPromise = null; reject(fail('NETWORK', MESSAGES.NETWORK)); };
    document.head.append(css, js);
  });
  return vendorPromise;
}

async function startGame(stateBytes) {
  try {
    setProgress('Reading your saved game…', 10);
    if (!S.blob) { const g = await storage.getGame(S.id); if (!g) throw fail('NOT_FOUND', MESSAGES.NOT_FOUND); S.record = g; S.blob = g.blob; }
    const config = await ensureConfig(S.record, S.blob);
    setProgress('Preparing the game…', 35);
    let bundle = await buildBundle(S.blob, { exe: config.exe, config });
    if (stateBytes) bundle = await applyState(bundle, stateBytes);
    S.bundle = bundle;
    setProgress('Loading the emulator…', 65);
    await loadVendor();
    setProgress('Starting…', 90);
    await boot(bundle, config);
    storage.touchGame(S.id).catch(() => {});
    $('kzp-progress').value = 100;
  } catch (err) { showError(err); }
}

function boot(bundle, config) {
  return new Promise((resolve, reject) => {
    teardown();
    S.exiting = false;
    const gen = ++S.gen; // lets us ignore exit events from a previous run
    show('stage');
    const root = $('kzp-dos'); root.replaceChildren();
    const opts = { ...((S.entry && S.entry.emulator && S.entry.emulator.options) || {}), ...config };
    const extra = {};
    EMU_OPTIONS.forEach((k) => { if (opts[k] !== undefined) extra[k] = opts[k]; });
    const timer = setTimeout(() => reject(fail('EMULATOR_CRASH', MESSAGES.EMULATOR_CRASH)), 60000);
    try {
      S.dos = window.Dos(root, {
        ...extra,
        url: URL.createObjectURL(bundle),
        pathPrefix: VENDOR + 'emulators/',
        backend: 'dosbox', backendLocked: true,
        kiosk: true, noCloud: true, autoStart: true, theme: 'dark',
        onEvent: (name, ci) => {
          if (name === 'ci-ready') {
            clearTimeout(timer);
            S.ci = ci; S.started = true; S.paused = false; syncPause();
            ci.events().onExit(() => { if (gen === S.gen) onProgramExit(); });
            mountTouch(); focusGame(); emit('started'); resolve();
          } else if (name === 'emu-error' || name === 'bnd-error') {
            clearTimeout(timer); reject(fail('EMULATOR_CRASH', MESSAGES.EMULATOR_CRASH));
          }
        },
      });
    } catch (e) { clearTimeout(timer); reject(fail('EMULATOR_CRASH', MESSAGES.EMULATOR_CRASH)); }
  });
}

async function teardown() {
  const dos = S.dos;
  S.dos = null; S.ci = null; S.started = false;
  if (dos) { try { await dos.stop(); } catch { /* already stopped */ } }
}

function onProgramExit() {
  if (S.exiting) return;
  S.ci = null; S.started = false;
  $('kzp-error-title').textContent = 'The game has ended';
  $('kzp-error-text').textContent = 'The program closed. You can start it again or go back to My Games.';
  show('error');
  emit('exit', { reason: 'program' });
}

async function mountTouch() {
  const layout = S.entry && S.entry.touchLayout;
  if (!layout || !matchMedia('(pointer: coarse)').matches) return;
  try { (await import('/js/touch-controls.js')).mountTouchControls($('kzp-touch'), layout); } catch { /* optional module */ }
}

// ---- states ----------------------------------------------------------------------
async function saveSlot(slot) {
  if (!S.ci) throw fail('EMULATOR_CRASH', MESSAGES.EMULATOR_CRASH);
  // persist() can hang if the program has already ended; do not leave the Saves dialog stuck.
  const bytes = await Promise.race([
    S.ci.persist(),
    new Promise((_, rej) => setTimeout(() => rej(fail('EMULATOR_CRASH', 'Could not save right now. The game may have ended.')), 15000)),
  ]);
  await storage.saveState(S.id, slot, bytes || new Uint8Array(0));
  emit('state-saved', { slot });
}
async function loadSlot(slot) {
  const bytes = await storage.loadState(S.id, slot);
  if (!bytes) throw fail('NOT_FOUND', 'That slot is empty.');
  await startGame(bytes);
  emit('state-loaded', { slot });
}

async function renderStates() {
  const ul = $('kzp-states-list'); ul.replaceChildren();
  const st = $('kzp-states-status'); st.textContent = '';
  const have = new Map((await storage.listStates(S.id)).map((s) => [s.slot, s]));
  for (let slot = 1; slot <= 3; slot++) {
    const s = have.get(slot);
    const label = el('span', { text: 'Slot ' + slot + ': ' + (s ? new Date(s.savedAt).toLocaleString() : 'empty') });
    const save = el('button', { type: 'button', class: 'kzp-btn', text: 'Save' });
    const load = el('button', { type: 'button', class: 'kzp-btn', text: 'Load' });
    if (!s) load.disabled = true;
    save.addEventListener('click', async () => {
      try { await saveSlot(slot); st.textContent = 'Saved to slot ' + slot + '.'; await renderStates(); st.textContent = 'Saved to slot ' + slot + '.'; }
      catch (e) { st.textContent = friendly(e); }
    });
    load.addEventListener('click', async () => {
      $('kzp-states-dialog').close();
      try { await loadSlot(slot); } catch (e) { showError(e); }
    });
    ul.append(el('li', {}, label, el('span', { class: 'kzp-row' }, save, load)));
  }
}

// ---- UI wiring --------------------------------------------------------------------
function renderHelp() {
  const body = $('kzp-help-body'); body.replaceChildren();
  const controls = (S.entry && S.entry.controls) || [];
  controls.forEach((c) => body.append(el('tr', {}, el('td', { text: c.keys }), el('td', { text: c.action }))));
  $('kzp-help-note').hidden = controls.length > 0;
  $('kzp-help-dialog').querySelector('table').hidden = controls.length === 0;
}

function toggleFullscreen() {
  const stage = $('kzp-stage');
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  if (stage.requestFullscreen) stage.requestFullscreen().catch(() => stage.classList.toggle('kzp-soft-fs'));
  else stage.classList.toggle('kzp-soft-fs'); // iPhone Safari has no element fullscreen
}

async function exitToLibrary(e) {
  e.preventDefault();
  S.exiting = true;
  try {
    if (S.ci && $('kzp-autosave').checked) await saveSlot(AUTOSAVE_SLOT);
  } catch (err) { console.error(err); }
  emit('exit', { reason: 'user' });
  await teardown();
  location.href = '/library/';
}

$('kzp-play').addEventListener('click', () => {
  try { localStorage.setItem('kz-autosave', $('kzp-autosave').checked ? '1' : '0'); } catch { /* optional preference */ }
  startGame();
});
$('kzp-error-retry').addEventListener('click', () => (S.record ? startGame() : location.reload()));
$('kzp-pause').addEventListener('click', () => (S.paused ? window.KZPlayer.resume() : window.KZPlayer.pause()));
$('kzp-resume').addEventListener('click', () => window.KZPlayer.resume());
$('kzp-full').addEventListener('click', toggleFullscreen);
$('kzp-exit').addEventListener('click', exitToLibrary);
$('kzp-help').addEventListener('click', () => { renderHelp(); $('kzp-help-dialog').showModal(); });
$('kzp-states').addEventListener('click', async () => {
  const d = $('kzp-states-dialog');
  try { await renderStates(); } catch (e) { $('kzp-states-status').textContent = friendly(e); }
  d.showModal();
});
['kzp-help-dialog', 'kzp-states-dialog'].forEach((id) => $(id).addEventListener('close', focusGame));
try { $('kzp-autosave').checked = localStorage.getItem('kz-autosave') === '1'; } catch { /* optional preference */ }
init();
