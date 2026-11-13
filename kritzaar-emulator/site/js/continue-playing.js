/* KritZaar "Continue playing" strip and backup reminder (Agent 4).
   Mount it on the home page:
     import { mountContinuePlaying } from '/js/continue-playing.js';
     mountContinuePlaying(document.getElementById('kz-continue'));
   The storage module is loaded lazily, so the home page pays for this file only.
   Styles live in /css/emulator-shared.css (classes prefixed kz-cp). */

const DAY_MS = 24 * 60 * 60 * 1000;
const REMIND_AFTER_DAYS = 7;

// Two tiny timestamps (not game data) live in localStorage; games and saves never do.
const BACKUP_KEY = 'kz-last-backup';
const SNOOZE_KEY = 'kz-backup-snooze';

/* ---------- Helpers shared with /library/library.js ---------- */

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 || value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** "just now", "5 minutes ago", "yesterday", "3 months ago". */
export function formatRelativeTime(timestamp) {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return relativeFormat.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relativeFormat.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return relativeFormat.format(-days, 'day');
  const months = Math.round(days / 30);
  if (months < 12) return relativeFormat.format(-months, 'month');
  return relativeFormat.format(-Math.round(days / 365), 'year');
}

/** Stable hue (0-359) from a game id, for the placeholder tile colour. */
export function tileHue(id) {
  let hash = 0;
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

/** Call after a backup file has been exported, so the reminder resets. */
export function recordBackupDone() {
  writeStamp(BACKUP_KEY, Date.now());
}

/* ---------- localStorage stamps (may be blocked, so every call is guarded) ---------- */

function readStamp(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeStamp(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* blocked: the reminder just repeats */ }
}

/* ---------- Component ---------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function playUrl(id) {
  return `/emulator/index.html?game=${encodeURIComponent(id)}`;
}

function buildItem(game) {
  const li = el('li');
  const link = el('a', 'kz-cp-link');
  link.href = playUrl(game.id);

  const tile = el('span', 'kz-tile kz-cp-tile', [...game.title.trim()][0]?.toUpperCase() ?? '?');
  tile.style.setProperty('--tile-hue', tileHue(game.id));
  tile.setAttribute('aria-hidden', 'true');

  const text = el('span');
  text.append(
    el('span', 'kz-cp-name', game.title),
    el('span', 'kz-cp-when', `Played ${formatRelativeTime(game.lastPlayedAt)}`)
  );
  link.append(tile, text);
  li.append(link);
  return li;
}

/** Days since the later of: last backup, or the oldest game being added. */
function daysSinceProtected(games) {
  const oldestAdded = Math.min(...games.map((g) => g.addedAt || Date.now()));
  const since = Math.max(readStamp(BACKUP_KEY), oldestAdded);
  return Math.floor((Date.now() - since) / DAY_MS);
}

function buildReminder(days, onSnooze) {
  const note = el('div', 'kz-cp-note kz-card');
  note.setAttribute('role', 'note');
  note.append(el('p', '',
    `Your games are saved only in this browser, and it has been ${days} days since your last backup. ` +
    'A backup file keeps them safe if the browser clears its data.'));

  const actions = el('div', 'kz-cp-note-actions');
  const now = el('a', 'kz-btn kz-btn--primary', 'Back up now');
  now.href = '/library/#backup';
  const later = el('button', 'kz-btn', 'Remind me later');
  later.type = 'button';
  later.addEventListener('click', onSnooze);
  actions.append(now, later);
  note.append(actions);
  return note;
}

/**
 * Fill containerEl with the last played games (up to max) and, when due, a
 * backup reminder. The container stays hidden when there is nothing to show.
 * Returns { refresh, destroy }.
 */
export async function mountContinuePlaying(containerEl, { max = 3 } = {}) {
  containerEl.hidden = true;

  let storage;
  try {
    storage = await import('/js/storage.js');
  } catch {
    return { refresh() {}, destroy() {} }; // storage unavailable: show nothing
  }

  let token = 0;
  async function refresh() {
    const mine = ++token;
    let games;
    try {
      games = await storage.listGames();
    } catch {
      if (mine === token) containerEl.hidden = true;
      return;
    }
    if (mine !== token) return;

    const recent = games
      .filter((g) => g.lastPlayedAt)
      .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
      .slice(0, max);

    const days = games.length ? daysSinceProtected(games) : 0;
    const snoozed = Date.now() - readStamp(SNOOZE_KEY) < REMIND_AFTER_DAYS * DAY_MS;
    const remind = games.length > 0 && days >= REMIND_AFTER_DAYS && !snoozed;

    const section = el('section', 'kz-cp');
    section.setAttribute('aria-label', 'Continue playing');
    const parts = [];

    if (recent.length) {
      const list = el('ul', 'kz-cp-list');
      list.append(...recent.map(buildItem));
      parts.push(el('h2', 'kz-cp-title', 'Continue playing'), list);
    }
    if (remind) {
      parts.push(buildReminder(days, () => {
        writeStamp(SNOOZE_KEY, Date.now());
        refresh();
      }));
    }

    if (!parts.length) {
      containerEl.replaceChildren();
      containerEl.hidden = true;
      return;
    }
    section.append(...parts);
    containerEl.replaceChildren(section);
    containerEl.hidden = false;
  }

  // Back/forward navigation can restore the page from cache; show fresh data
  const onPageShow = (e) => { if (e.persisted) refresh(); };
  window.addEventListener('pageshow', onPageShow);
  const unsubscribe = storage.onStorageChange(() => refresh());

  await refresh();

  return {
    refresh,
    destroy() {
      window.removeEventListener('pageshow', onPageShow);
      if (typeof unsubscribe === 'function') unsubscribe();
      containerEl.replaceChildren();
      containerEl.hidden = true;
    }
  };
}
