/*
 * KritZaar PWA helper (Agent 2).
 *
 *   import { initPwa } from '/js/pwa-install.js';
 *   initPwa();                      // normal pages: SW + persistence + banners
 *   initPwa({ banners: false });    // player page: SW + persistence only, nothing over the game
 *
 * What it does:
 *  - registers /sw.js and offers "Update ready, reload" when a new version is waiting
 *  - asks the browser for persistent storage once the person has games saved
 *  - Android/desktop: shows an "Install KritZaar" banner when the browser allows it
 *  - iOS Safari (not installed): "Add to Home Screen to keep your games safe" banner, because
 *    Safari can delete site data after about a week without a visit
 *  - gentle backup reminder when games exist and the last backup is old
 * One banner at a time. Dismissals are remembered with setMeta (IndexedDB), never localStorage.
 * Extra exports for other pages: canInstall(), promptInstall(), isIosSafari(), isStandalone(),
 * backupReminderDue(days), downloadBackup().
 * All text uses textContent. Styles are injected once (kz-pwa-*).
 */
import { listGames, requestPersistence, getMeta, setMeta, exportBackup } from '/js/storage.js';

const DAY = 86400000;
const CSS = `
.kz-pwa-banner{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .75rem;
 padding:.75rem 1rem calc(.75rem + env(safe-area-inset-bottom,0px));background:var(--kz-surface,#1c1a2b);color:var(--kz-text,#f1f0fa);
 border-top:2px solid var(--kz-accent,#7c5cff);font:.95rem/1.35 var(--kz-font,system-ui,sans-serif)}
.kz-pwa-text{flex:1 1 16rem;margin:0}
.kz-pwa-actions{display:flex;gap:.5rem}
.kz-pwa-btn{font:inherit;min-height:44px;padding:.45rem .9rem;border-radius:var(--kz-radius,10px);border:1px solid var(--kz-accent,#7c5cff);background:transparent;color:inherit;cursor:pointer}
.kz-pwa-btn-primary{background:var(--kz-accent,#7c5cff);color:#fff}
.kz-pwa-btn:focus-visible{outline:3px solid var(--kz-text,#f1f0fa);outline-offset:2px}
`;

function injectStyles() {
  if (document.getElementById('kz-pwa-style') || window.__kzPwaSheet) return;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    window.__kzPwaSheet = true;
  } catch (_) {
    const s = document.createElement('style');
    s.id = 'kz-pwa-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
}

/* ---------- environment ---------- */

export function isStandalone() {
  return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}
export function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/* ---------- install prompt (Chromium) ---------- */

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('kz-installable'));
});
window.addEventListener('appinstalled', () => { deferredPrompt = null; removeBanner(); });

export function canInstall() { return !!deferredPrompt && !isStandalone(); }

export async function promptInstall() {
  if (!deferredPrompt) return false;
  const p = deferredPrompt;
  deferredPrompt = null;
  p.prompt();
  const choice = await p.userChoice;
  return choice.outcome === 'accepted';
}

/* ---------- backup helpers ---------- */

// True when games are stored and the last backup is older than `days` (or never happened and the oldest game is).
export async function backupReminderDue(days = 7) {
  const games = await listGames();
  if (!games.length) return false;
  const last = await getMeta('lastBackupAt');
  const since = last || Math.min(...games.map((g) => g.addedAt));
  return Date.now() - since > days * DAY;
}

// Builds the backup file and starts a download. Nothing is uploaded.
export async function downloadBackup() {
  const blob = await exportBackup();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kritzaar-backup-${new Date().toISOString().slice(0, 10)}.kzbackup`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------- banner ---------- */

let bannerEl = null;
function removeBanner() { if (bannerEl) { bannerEl.remove(); bannerEl = null; } }

function showBanner({ text, actions }) {
  removeBanner();
  injectStyles();
  const b = document.createElement('div');
  b.className = 'kz-pwa-banner';
  b.setAttribute('role', 'region');
  b.setAttribute('aria-label', 'KritZaar notice');
  const p = document.createElement('p');
  p.className = 'kz-pwa-text';
  p.textContent = text;
  const box = document.createElement('div');
  box.className = 'kz-pwa-actions';
  actions.forEach(({ label, primary, onClick }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kz-pwa-btn' + (primary ? ' kz-pwa-btn-primary' : '');
    btn.textContent = label;
    btn.addEventListener('click', async () => { removeBanner(); await onClick(); });
    box.appendChild(btn);
  });
  b.append(p, box);
  document.body.appendChild(b);
  bannerEl = b;
}

const snoozed = async (key, days) => {
  const t = await getMeta(key);
  return !!t && Date.now() - t < days * DAY;
};
const snooze = (key) => setMeta(key, Date.now());

async function pickBanner(hasGames) {
  // 1. iOS Safari, not installed, games at risk
  if (isIosSafari() && !isStandalone() && hasGames && !(await snoozed('snoozeIosInstall', 14))) {
    showBanner({
      text: 'Add to Home Screen to keep your games safe. Tap the Share button, then “Add to Home Screen”. Safari can delete saved games from the browser if you do not visit for a week.',
      actions: [{ label: 'Got it', primary: true, onClick: () => snooze('snoozeIosInstall') }]
    });
    return;
  }
  // 2. Chromium install prompt
  if (canInstall() && !(await snoozed('snoozeInstall', 14))) {
    showBanner({
      text: 'Install KritZaar to play your games offline from your home screen.',
      actions: [
        { label: 'Install', primary: true, onClick: () => promptInstall() },
        { label: 'Not now', onClick: () => snooze('snoozeInstall') }
      ]
    });
    return;
  }
  // 3. Backup reminder
  // Pages with the Continue-playing strip show their own backup note; avoid two reminders.
  if (document.getElementById('kz-continue')) return;
  if (hasGames && (await backupReminderDueSafe()) && !(await snoozed('snoozeBackup', 3))) {
    showBanner({
      text: 'Your saved games live only in this browser. Make a backup file so you can restore them if the browser clears its data.',
      actions: [
        { label: 'Back up now', primary: true, onClick: () => downloadBackup().catch(() => {}) },
        { label: 'Later', onClick: () => snooze('snoozeBackup') }
      ]
    });
  }
}
const backupReminderDueSafe = () => backupReminderDue(7).catch(() => false);

/* ---------- service worker ---------- */

function watchForUpdates(reg) {
  const offerReload = () => showBanner({
    text: 'A new version of KritZaar is ready.',
    actions: [
      { label: 'Reload', primary: true, onClick: () => { if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } },
      { label: 'Later', onClick: () => {} }
    ]
  });
  if (reg.waiting && navigator.serviceWorker.controller) offerReload();
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    if (!w) return;
    w.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) offerReload();
    });
  });
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller; // false on the very first visit
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return; // first install takes over silently; only updates reload
    reloading = true;
    location.reload();
  });
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    watchForUpdates(reg);
    return reg;
  } catch (_) {
    return null; // offline support is optional; the site still works
  }
}

/* ---------- entry point ---------- */

export async function initPwa({ banners = true } = {}) {
  registerServiceWorker();
  let hasGames = false;
  try { hasGames = (await listGames()).length > 0; } catch (_) { /* storage unavailable */ }
  if (hasGames) requestPersistence();
  if (!banners) return;
  const refresh = () => pickBanner(hasGames).catch(() => {});
  window.addEventListener('kz-installable', refresh);
  // Wait a moment so the banner does not compete with first paint.
  setTimeout(refresh, 1500);
}
