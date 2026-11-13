/* KritZaar touch controls (Agent 4, contract 3.10).
   Talks to the player only through window.KZPlayer.sendKey(keyCode, pressed).
   keyCode values are standard DOM KeyboardEvent.keyCode numbers; the player
   maps them to the emulator's own codes.
   Styles live in /css/emulator-shared.css (classes prefixed kz-tc). */

const KEY = Object.freeze({
  LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
  CTRL: 17, ALT: 18, SHIFT: 16, SPACE: 32, ENTER: 13, ESC: 27
});

const DEFAULT_LAYOUT = 'dpad-2btn';

const LAYOUTS = {
  'dpad-2btn': {
    pad: 'dpad',
    buttons: [['Ctrl', KEY.CTRL], ['Alt', KEY.ALT]],
    util: [['Esc', KEY.ESC], ['Enter', KEY.ENTER]]
  },
  'dpad-4btn': {
    pad: 'dpad',
    buttons: [['Ctrl', KEY.CTRL], ['Alt', KEY.ALT], ['Space', KEY.SPACE], ['Shift', KEY.SHIFT]],
    util: [['Esc', KEY.ESC], ['Enter', KEY.ENTER]]
  },
  // The contract only allows sendKey, so the pad moves with arrow keys and
  // the two buttons stand in for mouse buttons (Enter and Space).
  'mouse-pad': {
    pad: 'trackpad',
    buttons: [['Click', KEY.ENTER], ['Click 2', KEY.SPACE]],
    util: [['Esc', KEY.ESC]]
  }
};

const TAP_MS = 250;      // a touch shorter than this on the pad is a tap
const TAP_SLOP_PX = 10;  // and it must not move further than this
const DIR_THRESHOLD = 0.38; // about sin(22.5deg): splits the circle into 8 directions

/** Mount on-screen controls inside containerEl. Returns { show, hide, destroy }. */
export function mountTouchControls(containerEl, layout = DEFAULT_LAYOUT) {
  const layoutName = LAYOUTS[layout] ? layout : DEFAULT_LAYOUT;
  const spec = LAYOUTS[layoutName];
  const keys = createKeyHolder();
  const pads = [];

  if (getComputedStyle(containerEl).position === 'static') {
    containerEl.style.position = 'relative';
  }

  const root = el('div', 'kz-tc');
  root.dataset.layout = layoutName;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'On-screen game controls');

  const pad = spec.pad === 'dpad' ? buildDpad(keys, pads) : buildTrackpad(keys, pads);

  const actions = el('div', 'kz-tc-actions');
  for (const [label, code] of spec.buttons) {
    actions.append(keyButton(keys, label, code, 'kz-tc-btn kz-tc-action'));
  }

  const util = el('div', 'kz-tc-util');
  for (const [label, code] of spec.util) {
    util.append(keyButton(keys, label, code, 'kz-tc-btn kz-tc-pill'));
  }

  root.append(pad, actions, util);
  containerEl.append(root);

  /* Visibility: shown on touch-first devices, hidden once a physical key is
     pressed, shown again on the next touch. */
  let visible = true;
  function setVisible(next) {
    if (next === visible) return;
    visible = next;
    root.hidden = !next;
    if (!next) releaseEverything();
  }
  function releaseEverything() {
    pads.forEach((p) => p.cancel());
    keys.releaseAll();
    root.querySelectorAll('.is-down').forEach((n) => n.classList.remove('is-down'));
  }

  const onKeyDown = (e) => {
    // Ignore synthetic events and keys pressed on the controls themselves
    if (!e.isTrusted || root.contains(e.target)) return;
    setVisible(false);
  };
  const onPointerDown = (e) => { if (e.pointerType === 'touch') setVisible(true); };
  const onVisibility = () => { if (document.hidden) releaseEverything(); };

  setVisible(window.matchMedia('(pointer: coarse)').matches);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', releaseEverything);
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    show: () => setVisible(true),
    hide: () => setVisible(false),
    destroy() {
      releaseEverything();
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', releaseEverything);
      root.remove();
    }
  };
}

/* ---------- Key state ---------- */

/* Several fingers (or a finger plus the keyboard) can hold the same key.
   The key goes down on the first holder and up when the last one lets go. */
function createKeyHolder() {
  const held = new Map(); // keyCode -> Set of source ids
  const send = (code, pressed) => window.KZPlayer?.sendKey(code, pressed);
  return {
    press(code, source) {
      let sources = held.get(code);
      if (!sources) { sources = new Set(); held.set(code, sources); }
      const first = sources.size === 0;
      sources.add(source);
      if (first) send(code, true);
    },
    release(code, source) {
      const sources = held.get(code);
      if (!sources || !sources.delete(source)) return;
      if (sources.size === 0) { held.delete(code); send(code, false); }
    },
    releaseAll() {
      for (const code of held.keys()) send(code, false);
      held.clear();
    }
  };
}

/* ---------- Building blocks ---------- */

function el(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function buzz() { navigator.vibrate?.(8); }

/** A round or pill button that holds one key while pressed. */
function keyButton(keys, label, code, className) {
  const b = el('button', className);
  b.type = 'button';
  b.textContent = label;
  b.setAttribute('aria-label', `${label} key`);

  const down = (source) => { keys.press(code, source); b.classList.add('is-down'); };
  const up = (source) => { keys.release(code, source); b.classList.remove('is-down'); };

  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    down(`p${e.pointerId}`);
    buzz();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    b.addEventListener(type, (e) => up(`p${e.pointerId}`));
  }
  addKeyboardSupport(b, down, up);
  return b;
}

/* Enter or Space on a focused control presses its key, for keyboard and
   switch users who reach the controls with Tab. */
function addKeyboardSupport(b, down, up) {
  const isActivation = (e) => e.key === 'Enter' || e.key === ' ';
  b.addEventListener('keydown', (e) => {
    if (!isActivation(e)) return;
    e.preventDefault();
    e.stopPropagation(); // keep the player's own key listener from seeing it twice
    if (!e.repeat) down('kb');
  });
  b.addEventListener('keyup', (e) => {
    if (!isActivation(e)) return;
    e.stopPropagation();
    up('kb');
  });
  b.addEventListener('blur', () => up('kb'));
}

/** Turn a drag vector into the set of arrow keys it points at (8-way). */
function directionKeys(dx, dy, deadZone) {
  const dist = Math.hypot(dx, dy);
  const out = new Set();
  if (dist < deadZone) return out;
  const cos = dx / dist;
  const sin = dy / dist; // screen y grows downward
  if (cos > DIR_THRESHOLD) out.add(KEY.RIGHT); else if (cos < -DIR_THRESHOLD) out.add(KEY.LEFT);
  if (sin > DIR_THRESHOLD) out.add(KEY.DOWN); else if (sin < -DIR_THRESHOLD) out.add(KEY.UP);
  return out;
}

/* One finger steers a pad. relative=false measures from the pad's centre
   (d-pad); relative=true measures from where the finger landed (trackpad). */
function trackDirection(pad, keys, { relative, onChange = () => {}, onTap = null }) {
  let active = null;

  function apply(next) {
    const source = `pad${active.id}`;
    for (const code of active.dirs) if (!next.has(code)) keys.release(code, source);
    for (const code of next) if (!active.dirs.has(code)) keys.press(code, source);
    active.dirs = next;
    onChange(next);
  }

  function update(e) {
    const dx = e.clientX - active.ox;
    const dy = e.clientY - active.oy;
    if (Math.hypot(dx, dy) > TAP_SLOP_PX) active.moved = true;
    apply(directionKeys(dx, dy, active.dead));
  }

  function end(e) {
    if (!active || e.pointerId !== active.id) return;
    const wasTap = relative && e.type === 'pointerup' && !active.moved &&
      performance.now() - active.startedAt < TAP_MS;
    apply(new Set());
    active = null;
    if (wasTap && onTap) onTap();
  }

  pad.addEventListener('pointerdown', (e) => {
    if (active) return;
    e.preventDefault();
    const rect = pad.getBoundingClientRect();
    active = {
      id: e.pointerId,
      ox: relative ? e.clientX : rect.left + rect.width / 2,
      oy: relative ? e.clientY : rect.top + rect.height / 2,
      dead: relative ? 14 : rect.width * 0.12,
      startedAt: performance.now(),
      moved: false,
      dirs: new Set()
    };
    pad.setPointerCapture(e.pointerId);
    buzz();
    update(e);
  });
  pad.addEventListener('pointermove', (e) => { if (active && e.pointerId === active.id) update(e); });
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);

  return { cancel() { if (active) { apply(new Set()); active = null; } } };
}

function buildDpad(keys, pads) {
  const pad = el('div', 'kz-tc-pad kz-tc-pad--dpad');
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', 'Directional pad');

  const arrows = new Map();
  for (const [code, name] of [[KEY.UP, 'Up'], [KEY.LEFT, 'Left'], [KEY.RIGHT, 'Right'], [KEY.DOWN, 'Down']]) {
    const b = el('button', 'kz-tc-arrow');
    b.type = 'button';
    b.dataset.key = String(code);
    b.setAttribute('aria-label', `${name} arrow`);
    addKeyboardSupport(
      b,
      (source) => keys.press(code, source),
      (source) => keys.release(code, source)
    );
    arrows.set(code, b);
    pad.append(b);
  }

  pads.push(trackDirection(pad, keys, {
    relative: false,
    onChange: (dirs) => arrows.forEach((b, code) => b.classList.toggle('is-down', dirs.has(code)))
  }));
  return pad;
}

function buildTrackpad(keys, pads) {
  const pad = el('div', 'kz-tc-pad kz-tc-pad--trackpad');
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', 'Move pad. Drag to move, tap to click.');

  const hint = el('span', 'kz-tc-hint');
  hint.textContent = 'Drag to move, tap to click';
  hint.setAttribute('aria-hidden', 'true');
  pad.append(hint);

  pads.push(trackDirection(pad, keys, {
    relative: true,
    onTap() {
      keys.press(KEY.ENTER, 'tap');
      setTimeout(() => keys.release(KEY.ENTER, 'tap'), 60);
    }
  }));
  return pad;
}
