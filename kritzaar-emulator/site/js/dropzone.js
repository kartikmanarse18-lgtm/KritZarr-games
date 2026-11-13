/*
 * KritZaar drop zone (Agent 2). Contract v1.0, section 3.5.
 *
 *   const dz = createDropZone(el, { accept: ['.zip', '.jsdos'], maxWarnMB: 500, onFile, onError });
 *
 * onFile(file, { setProgress }) may be async. While it runs, the zone shows a busy state.
 * Call setProgress(0..1, 'Checking file…') for a determinate bar, or setProgress(null, text) for text only.
 * Returned controller: { setProgress(fraction, text), setBusy(bool, text), reset(), destroy() }.
 * All text is inserted with textContent. Styles are self-contained (kz-drop-*) and use the
 * shared --kz-* variables with fallbacks. The file never leaves the device.
 */

const CSS = `
.kz-drop-zone{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:1.75rem 1rem;text-align:center;
 border:2px dashed var(--kz-muted,#8a8aa3);border-radius:var(--kz-radius,14px);background:var(--kz-surface,#1c1a2b);color:var(--kz-text,#f1f0fa);
 font-family:var(--kz-font,inherit);cursor:pointer;transition:border-color .15s,background-color .15s;-webkit-tap-highlight-color:transparent}
.kz-drop-zone:hover,.kz-drop-zone.kz-drop-active{border-color:var(--kz-accent,#7c5cff);background:color-mix(in srgb,var(--kz-accent,#7c5cff) 12%,var(--kz-surface,#1c1a2b))}
.kz-drop-zone:focus-visible{outline:3px solid var(--kz-accent,#7c5cff);outline-offset:3px}
.kz-drop-zone[aria-busy="true"]{cursor:progress;opacity:.9}
.kz-drop-title{margin:0;font-size:1.1rem;font-weight:600}
.kz-drop-sub,.kz-drop-hint,.kz-drop-status{margin:0;font-size:.9rem;color:var(--kz-muted,#a9a8c0)}
.kz-drop-status{min-height:1.2em;color:var(--kz-text,#f1f0fa)}
.kz-drop-progress{width:min(100%,320px);height:.6rem;accent-color:var(--kz-accent,#7c5cff)}
.kz-drop-confirm{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-top:.25rem}
.kz-drop-btn{font:inherit;padding:.55rem 1rem;border-radius:var(--kz-radius,10px);border:1px solid var(--kz-accent,#7c5cff);
 background:transparent;color:var(--kz-text,#f1f0fa);cursor:pointer;min-height:44px}
.kz-drop-btn-primary{background:var(--kz-accent,#7c5cff);color:#fff}
.kz-drop-btn:focus-visible{outline:3px solid var(--kz-text,#f1f0fa);outline-offset:2px}
.kz-drop-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
@media (prefers-reduced-motion:reduce){.kz-drop-zone{transition:none}}
`;

function injectStyles() {
  if (document.getElementById('kz-drop-style') || (document.adoptedStyleSheets && window.__kzDropSheet)) return;
  try { // constructable sheet: works even under a strict style-src CSP
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    window.__kzDropSheet = true;
  } catch (_) {
    const s = document.createElement('style');
    s.id = 'kz-drop-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

const fmtMB = (bytes) => `${Math.round(bytes / 1048576)} MB`;

export function createDropZone(containerEl, options = {}) {
  const accept = (options.accept || ['.zip', '.jsdos']).map((e) => e.toLowerCase());
  const maxWarnMB = options.maxWarnMB ?? 500;
  const onFile = options.onFile || (async () => {});
  const onError = options.onError || (() => {});
  injectStyles();

  const zone = el('div', 'kz-drop-zone');
  zone.tabIndex = 0;
  zone.setAttribute('role', 'button');
  zone.setAttribute('aria-label', `Choose a game file (${accept.join(', ')}) or drop it here`);
  const title = el('p', 'kz-drop-title', 'Drop your game file here');
  const sub = el('p', 'kz-drop-sub', 'or tap to choose a file');
  const hint = el('p', 'kz-drop-hint', `Accepted: ${accept.join(', ')}. Your file stays on this device.`);
  const progress = el('progress', 'kz-drop-progress');
  progress.max = 1;
  progress.hidden = true;
  const status = el('p', 'kz-drop-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const confirmBox = el('div', 'kz-drop-confirm');
  confirmBox.hidden = true;
  const input = el('input', 'kz-drop-input');
  input.type = 'file';
  input.accept = accept.join(',');
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');
  zone.append(title, sub, hint, progress, status, confirmBox, input);
  containerEl.appendChild(zone);

  let busy = false;
  let destroyed = false;

  function setProgress(fraction, text) {
    progress.hidden = fraction == null;
    if (fraction != null) progress.value = Math.max(0, Math.min(1, fraction));
    if (text != null) status.textContent = text;
  }
  function setBusy(on, text) {
    busy = on;
    zone.setAttribute('aria-busy', String(on));
    if (!on) progress.hidden = true;
    status.textContent = text || '';
    if (on && progress.hidden) { progress.removeAttribute('value'); progress.hidden = false; } // indeterminate
  }
  function reset() {
    busy = false;
    zone.removeAttribute('aria-busy');
    progress.hidden = true;
    status.textContent = '';
    confirmBox.hidden = true;
    confirmBox.replaceChildren();
    input.value = '';
  }
  function fail(message) {
    reset();
    status.textContent = message;
    onError(message);
  }

  async function deliver(file) {
    setBusy(true, 'Working…');
    try {
      await onFile(file, { setProgress });
      status.textContent = '';
    } catch (e) {
      fail((e && e.message) || 'Something went wrong with that file.');
      return;
    }
    setBusy(false);
  }

  function askConfirm(file) {
    confirmBox.replaceChildren();
    status.textContent = `This file is large (${fmtMB(file.size)}). It can be slow, or fail, on phones with little memory. Continue?`;
    const yes = el('button', 'kz-drop-btn kz-drop-btn-primary', 'Continue');
    const no = el('button', 'kz-drop-btn', 'Cancel');
    yes.type = no.type = 'button';
    yes.addEventListener('click', (e) => { e.stopPropagation(); confirmBox.hidden = true; deliver(file); });
    no.addEventListener('click', (e) => { e.stopPropagation(); reset(); });
    confirmBox.append(yes, no);
    confirmBox.hidden = false;
    yes.focus();
  }

  function handle(files) {
    if (busy || !files || !files.length) return;
    if (files.length > 1) { fail('Please choose one file at a time.'); return; }
    const file = files[0];
    const name = (file.name || '').toLowerCase();
    if (!accept.some((ext) => name.endsWith(ext))) {
      fail(`That file type is not supported. Choose a ${accept.join(' or ')} file.`);
      return;
    }
    if (file.size === 0) { fail('That file is empty. Download it again from the official page.'); return; }
    reset();
    if (file.size > maxWarnMB * 1048576) askConfirm(file); else deliver(file);
  }

  const on = (target, type, fn) => { target.addEventListener(type, fn); return () => target.removeEventListener(type, fn); };
  const offs = [
    on(zone, 'click', (e) => { if (!busy && !confirmBox.contains(e.target)) input.click(); }),
    on(zone, 'keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === zone) { e.preventDefault(); if (!busy) input.click(); }
    }),
    on(input, 'change', () => { handle(input.files); input.value = ''; }),
    on(zone, 'dragenter', (e) => { e.preventDefault(); zone.classList.add('kz-drop-active'); }),
    on(zone, 'dragover', (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; zone.classList.add('kz-drop-active'); }),
    on(zone, 'dragleave', (e) => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('kz-drop-active'); }),
    on(zone, 'drop', (e) => { e.preventDefault(); zone.classList.remove('kz-drop-active'); handle(e.dataTransfer && e.dataTransfer.files); })
  ];

  return {
    setProgress,
    setBusy,
    reset,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      offs.forEach((off) => off());
      zone.remove();
    }
  };
}
