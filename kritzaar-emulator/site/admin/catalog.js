// KritZaar catalog admin. Rules mirror /scripts/validate-catalog.mjs (contract 3.2 and 3.3).
// All text is written with textContent; no innerHTML.

const LICENSES = ['freeware', 'shareware', 'open-source', 'homebrew', 'commercial-official'];
const STATUSES = ['draft', 'approved', 'removed'];
const LAYOUTS = ['dpad-2btn', 'dpad-4btn', 'mouse-pad'];
const MIN_WORDS = 150;

const $ = (id) => document.getElementById(id);
const state = { games: [], current: -1, domains: [], updatedAt: null };

// ---------- validation ----------
export function hostAllowed(host, domains) {
  host = host.toLowerCase();
  return domains.some((d) => host === d || host.endsWith('.' + d));
}
export function wordCount(paragraphs) {
  return paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length;
}
// Returns { errors: [], warnings: [] } for one entry; allGames used for duplicate IDs.
export function validateEntry(g, allGames, domains) {
  const errors = [], warnings = [];
  const e = (m) => errors.push(m);
  if (!/^[a-z0-9-]+$/.test(g.id || '')) e('ID must use lowercase letters, digits and hyphens only.');
  if (allGames.filter((x) => x.id === g.id).length > 1) e('ID is already used by another entry.');
  if (!STATUSES.includes(g.status)) e('Status must be draft, approved or removed.');
  if (g.status === 'removed') return { errors, warnings }; // tombstone: only id and status matter
  if (!g.title) e('Title is required.');
  if (g.platform !== 'dos') e('Platform must be "dos" in v1.');
  if (!Number.isInteger(g.year)) e('Year must be a whole number.');
  if (!g.developer) e('Developer is required.');
  if (!Array.isArray(g.genres) || !g.genres.length) e('At least one genre is required.');
  if (!g.description) e('Description is required.');
  const words = wordCount(g.editorial || []);
  if (words < MIN_WORDS) (g.status === 'approved' ? e : (m) => warnings.push(m))(`Editorial has ${words} words; ${MIN_WORDS} needed to approve.`);
  if (!g.cover) e('Cover path is required.');
  if (!g.coverCredit) e('Cover credit is required.');
  if (!LICENSES.includes(g.license)) e('License is not an allowed value.');
  if (!g.sourceName) e('Source name is required.');
  try {
    const u = new URL(g.officialUrl);
    if (u.protocol !== 'https:') e('Official URL must be https.');
    else if (!hostAllowed(u.hostname, domains)) e(`Domain "${u.hostname}" is not in allowed-sources.json.`);
  } catch { e('Official URL is missing or not a valid URL.'); }
  const ef = g.expectedFile || {};
  if (!Array.isArray(ef.extensions) || !ef.extensions.length || ef.extensions.some((x) => !/^\.[a-z0-9]+$/i.test(x))) e('Extensions must look like ".zip".');
  if (!(ef.approxSizeMB >= 0)) e('Approx size must be a number.');
  if (ef.sha256 && ef.sha256.some((h) => !/^[a-f0-9]{64}$/i.test(h))) e('Each SHA-256 must be 64 hex characters.');
  if (!Array.isArray(g.instructions) || !g.instructions.length) e('At least one instruction step is required.');
  if (!Array.isArray(g.controls) || !g.controls.length) e('At least one control is required.');
  if (!LAYOUTS.includes(g.touchLayout)) e('Touch layout is not an allowed value.');
  if (!g.emulator || g.emulator.type !== 'jsdos') e('Emulator type must be jsdos.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.addedAt || '')) e('Added at must be a date.');
  return { errors, warnings };
}

// ---------- form <-> entry ----------
const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const csv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const today = () => new Date().toISOString().slice(0, 10);

function blank() {
  return {
    id: '', title: '', platform: 'dos', year: new Date().getFullYear(), developer: '', genres: [],
    description: '', editorial: [], cover: '', coverCredit: '', license: 'shareware',
    officialUrl: '', sourceName: '',
    expectedFile: { extensions: ['.zip'], approxSizeMB: 1, exeHint: '' },
    instructions: [], controls: [], touchLayout: 'dpad-2btn',
    emulator: { type: 'jsdos', options: {} }, status: 'draft', addedAt: today(),
  };
}

function readForm() {
  const ef = { extensions: csv($('f-ext').value), approxSizeMB: Number($('f-size').value) };
  const sha = csv($('f-sha').value);
  if (sha.length) ef.sha256 = sha;
  if ($('f-exe').value.trim()) ef.exeHint = $('f-exe').value.trim();
  return {
    id: $('f-id').value.trim(), title: $('f-title').value.trim(), platform: $('f-platform').value,
    year: parseInt($('f-year').value, 10), developer: $('f-developer').value.trim(),
    genres: csv($('f-genres').value), description: $('f-description').value.trim(),
    editorial: $('f-editorial').value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    cover: $('f-cover').value.trim(), coverCredit: $('f-coverCredit').value.trim(),
    license: $('f-license').value, officialUrl: $('f-officialUrl').value.trim(),
    sourceName: $('f-sourceName').value.trim(), expectedFile: ef,
    instructions: lines($('f-instructions').value),
    controls: lines($('f-controls').value).map((l) => {
      const [keys, ...rest] = l.split('|');
      return { keys: keys.trim(), action: rest.join('|').trim() };
    }),
    touchLayout: $('f-touch').value, emulator: { type: 'jsdos', options: {} },
    status: $('f-status').value, addedAt: $('f-addedAt').value,
  };
}

function fillForm(g) {
  const set = (id, v) => { $(id).value = v ?? ''; };
  set('f-id', g.id); set('f-title', g.title); set('f-platform', g.platform); set('f-year', g.year);
  set('f-developer', g.developer); set('f-genres', (g.genres || []).join(', '));
  set('f-description', g.description); set('f-editorial', (g.editorial || []).join('\n\n'));
  set('f-cover', g.cover); set('f-coverCredit', g.coverCredit); set('f-license', g.license);
  set('f-officialUrl', g.officialUrl); set('f-sourceName', g.sourceName);
  const ef = g.expectedFile || {};
  set('f-ext', (ef.extensions || []).join(', ')); set('f-size', ef.approxSizeMB);
  set('f-sha', (ef.sha256 || []).join(', ')); set('f-exe', ef.exeHint);
  set('f-instructions', (g.instructions || []).join('\n'));
  set('f-controls', (g.controls || []).map((c) => `${c.keys} | ${c.action}`).join('\n'));
  set('f-touch', g.touchLayout); set('f-status', g.status); set('f-addedAt', g.addedAt);
  refreshLive();
}

// ---------- rendering ----------
function el(tag, text, attrs) {
  const n = document.createElement(tag);
  if (text != null) n.textContent = text;
  if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function renderList() {
  const ul = $('list');
  ul.replaceChildren();
  state.games.forEach((g, i) => {
    const li = el('li');
    const b = el('button', `${g.title || g.id || 'Untitled'} (${g.status})`, { type: 'button' });
    if (i === state.current) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', () => select(i));
    li.append(b);
    ul.append(li);
  });
  const n = (s) => state.games.filter((g) => g.status === s).length;
  $('summary').textContent = `${state.games.length} entries: ${n('approved')} approved, ${n('draft')} draft, ${n('removed')} removed.`;
}

function renderPreview(g) {
  const p = $('preview');
  p.replaceChildren();
  p.append(el('h1', g.title || 'Untitled'));
  p.append(el('p', `${g.developer || ''} · ${g.year || ''} · ${(g.genres || []).join(', ')}`));
  p.append(el('span', g.license, { class: 'badge' }));
  p.append(el('p', g.description));
  (g.editorial || []).forEach((t) => p.append(el('p', t)));
  const a = el('a', 'Get it from the official source', { rel: 'noopener noreferrer', target: '_blank' });
  try { const u = new URL(g.officialUrl); if (u.protocol === 'https:') a.href = u.href; } catch { /* no link */ }
  p.append(a);
  p.append(el('h2', 'How to play'));
  const ol = el('ol');
  (g.instructions || []).forEach((t) => ol.append(el('li', t)));
  p.append(ol);
  if ((g.controls || []).length) {
    const tb = el('table');
    g.controls.forEach((c) => { const tr = el('tr'); tr.append(el('td', c.keys), el('td', c.action)); tb.append(tr); });
    p.append(el('h2', 'Controls'), tb);
  }
  p.append(el('p', g.cover ? `Cover: ${g.cover} (${g.coverCredit || 'no credit'})` : 'No cover set.'));
}

function refreshLive() {
  const g = readForm();
  $('wc').textContent = `${wordCount(g.editorial)} / ${MIN_WORDS} words`;
  const s = $('srcCheck');
  try {
    const u = new URL(g.officialUrl);
    const ok = u.protocol === 'https:' && hostAllowed(u.hostname, state.domains);
    s.textContent = ok ? '✓ allowed' : '✗ not allowed';
    s.className = ok ? 'ok' : 'err';
  } catch { s.textContent = ''; }
  renderPreview(g);
}

function showResults({ errors, warnings }) {
  const ul = $('errors');
  ul.replaceChildren();
  errors.forEach((m) => ul.append(el('li', m, { class: 'err' })));
  warnings.forEach((m) => ul.append(el('li', m, { class: 'warn' })));
}

function select(i) {
  state.current = i;
  $('empty').hidden = true;
  $('formWrap').hidden = false;
  fillForm(state.games[i]);
  showResults(validateEntry(state.games[i], state.games, state.domains));
  renderList();
}

// ---------- actions ----------
function save() {
  const g = readForm();
  const copy = state.games.slice();
  copy[state.current] = g;
  const res = validateEntry(g, copy, state.domains);
  showResults(res);
  if (res.errors.length) return; // fix errors before saving
  state.games = copy;
  renderList();
  $('errors').prepend(el('li', 'Saved in this session. Export to keep it.', { class: 'ok' }));
}

function exportJson() {
  const bad = state.games.filter((g) => validateEntry(g, state.games, state.domains).errors.length);
  if (bad.length && !confirm(`${bad.length} entries have errors. Export anyway?`)) return;
  const data = { version: 1, updatedAt: today(), games: state.games };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
  const a = el('a', null, { href: url, download: 'games.json' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadData(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.games)) throw new Error('Not a valid games.json (version 1).');
  state.games = data.games;
  state.current = -1;
  $('formWrap').hidden = true; $('empty').hidden = false;
  renderList();
}

async function init() {
  try {
    const r = await fetch('/data/allowed-sources.json', { cache: 'no-store' });
    state.domains = (await r.json()).domains || [];
  } catch { $('summary').textContent = 'Could not load allowed-sources.json; source checks will fail.'; }

  $('addBtn').addEventListener('click', () => { state.games.push(blank()); select(state.games.length - 1); });
  $('saveBtn').addEventListener('click', save);
  $('removeBtn').addEventListener('click', () => { $('f-status').value = 'removed'; save(); });
  $('deleteBtn').addEventListener('click', () => {
    if (!confirm('Delete this entry? Use "Mark removed" instead if the game was ever public.')) return;
    state.games.splice(state.current, 1);
    state.current = -1; $('formWrap').hidden = true; $('empty').hidden = false; renderList();
  });
  $('exportBtn').addEventListener('click', exportJson);
  $('importFile').addEventListener('change', async (ev) => {
    try { loadData(JSON.parse(await ev.target.files[0].text())); } catch (err) { alert(err.message); }
    ev.target.value = '';
  });
  $('loadLive').addEventListener('click', async () => {
    try { loadData(await (await fetch('/data/games.json', { cache: 'no-store' })).json()); }
    catch { alert('Could not load /data/games.json.'); }
  });
  $('formWrap').addEventListener('input', refreshLive);
  renderList();
}

init();
