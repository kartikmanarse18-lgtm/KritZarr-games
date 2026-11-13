// KritZaar "My Games" page. All text is written with textContent (no innerHTML).
import { listGames, deleteGame, getStorageInfo, importBackup, requestPersistence, onStorageChange } from '/js/storage.js';
import { downloadBackup } from '/js/pwa-install.js';
import { formatBytes, formatRelativeTime, tileHue, recordBackupDone } from '/js/continue-playing.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

function say(msg) { $('kz-lib-status').textContent = msg; }
function showError(err) {
  const box = $('kz-lib-error');
  const code = err && err.code;
  box.textContent = code === 'QUOTA_EXCEEDED' ? 'Not enough storage space on this device for that.'
    : code === 'BAD_ARCHIVE' ? 'That file is not a valid KritZaar backup.'
    : code === 'STORAGE_UNAVAILABLE' ? 'Your browser is blocking storage (private mode?). Games cannot be saved here.'
    : 'Something went wrong. Please try again.';
  box.hidden = false;
}
function clearError() { $('kz-lib-error').hidden = true; }

function card(game) {
  const li = el('li', 'kz-card kz-lib-card');
  const tile = el('span', 'kz-tile kz-lib-tile', [...String(game.title || '?').trim()][0]?.toUpperCase() || '?');
  tile.style.setProperty('--tile-hue', tileHue(game.id));
  tile.setAttribute('aria-hidden', 'true');
  const info = el('div');
  info.append(
    el('h2', 'kz-lib-name', game.title || game.id),
    el('p', 'kz-lib-meta', `${formatBytes(game.size)} · ${game.lastPlayedAt ? 'Played ' + formatRelativeTime(game.lastPlayedAt) : 'Not played yet'}`)
  );
  const row = el('div', 'kz-lib-row');
  const play = el('a', 'kz-btn kz-btn--primary', 'Play');
  play.href = `/emulator/index.html?game=${encodeURIComponent(game.id)}`;
  play.setAttribute('aria-label', `Play ${game.title || game.id}`);
  const del = el('button', 'kz-btn', 'Delete');
  del.type = 'button';
  del.setAttribute('aria-label', `Delete ${game.title || game.id}`);
  const confirm = el('p', 'kz-lib-confirm', 'Delete this game and its saves from this device?');
  confirm.hidden = true;
  const yes = el('button', 'kz-btn kz-btn--danger', 'Yes, delete'); yes.type = 'button'; yes.hidden = true;
  const no = el('button', 'kz-btn', 'Keep it'); no.type = 'button'; no.hidden = true;
  const toggle = (open) => { confirm.hidden = yes.hidden = no.hidden = !open; del.hidden = open; (open ? no : del).focus(); };
  del.addEventListener('click', () => toggle(true));
  no.addEventListener('click', () => toggle(false));
  yes.addEventListener('click', async () => {
    try { clearError(); await deleteGame(game.id); say(`${game.title || game.id} deleted.`); await render(); } catch (e) { showError(e); }
  });
  row.append(play, del, confirm, yes, no);
  li.append(tile, info, row);
  return li;
}

async function render() {
  let games = [];
  try { games = await listGames(); } catch (e) { showError(e); }
  const grid = $('kz-lib-grid');
  grid.replaceChildren(...games.map(card));
  $('kz-lib-empty').hidden = games.length > 0;
  try {
    const info = await getStorageInfo();
    const games_ = info.gamesBytes ?? 0;
    const quota = info.quotaBytes || 0;
    $('kz-lib-meter').value = quota ? Math.min(1, games_ / quota) : 0;
    $('kz-lib-usage').textContent = quota
      ? `Games use ${formatBytes(games_)} of about ${formatBytes(quota)} available to this site.`
      : `Games use ${formatBytes(games_)}.`;
    const p = $('kz-lib-persist');
    if (games.length && info.persisted === false) {
      p.textContent = 'Your browser may clear this storage if the device runs low on space. Download a backup to be safe.';
      p.hidden = false;
    } else p.hidden = true;
  } catch { $('kz-lib-usage').textContent = 'Storage information is not available in this browser.'; }
}

$('kz-lib-export').addEventListener('click', async () => {
  clearError();
  try { await downloadBackup(); recordBackupDone(); say('Backup downloaded.'); } catch (e) { showError(e); }
});
$('kz-lib-import').addEventListener('change', async (ev) => {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  clearError();
  try { const r = await importBackup(file); say(`Restored ${r.games} game(s).`); await render(); } catch (e) { showError(e); await render(); }
});

onStorageChange(() => render());
window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });
render().then(async () => {
  try { const g = await listGames(); if (g.length) await requestPersistence(); } catch { /* optional */ }
  if (location.hash === '#backup') $('backup').scrollIntoView();
});
