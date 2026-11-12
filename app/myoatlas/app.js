/* MyoAtlas — app logic (three.js r147, classic script build; works from file://)
 * Code: MIT.  Mesh/catalogue data: CC BY-SA 4.0 (Z-Anatomy / BodyParts3D) — see LICENSES.md */
(function () {
  'use strict';

  const A = window.ATLAS, MG = window.GEO_MUSCLES, SG = window.GEO_SKELETON;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rad = d => d * Math.PI / 180;
  const tick = () => new Promise(r => setTimeout(r, 0));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const REG = {}; A.regions.forEach(r => { REG[r.id] = r; });
  const MUS = A.muscles;
  const byId = {}; MUS.forEach(m => { byId[m.id] = m; });
  const CORE = new Set((window.TIERS && window.TIERS.core) || MUS.map(m => m.id));
  MUS.forEach(m => { m.tier = CORE.has(m.id) ? 'core' : 'adv'; });
  const RX = window.REFERENCE || { regions: [], items: [] }, REF = RX.items, REFREG = RX.regions, REGS = A.regions.concat(REFREG), ALL = MUS.concat(REF);
  REFREG.forEach(r => { REG[r.id] = r; }); REF.forEach(m => { m.tier = 'ref'; byId[m.id] = m; });
  const inLevel = M => state.level === 'all' || M.tier === state.level;

  /* ------------------------------------------------------------------ state */
  const state = {
    level: (function () { try { return localStorage.getItem('myo2.level') || 'core'; } catch (e) { return 'core'; } })(), mode: 'explore', selected: null, selPart: null, hovered: null, query: '',
    learned: new Set(store.get('myo2.learned', []).filter(id => byId[id])),
    hiddenM: new Set(), hiddenR: new Set(), solo: null,
    opts: Object.assign({ groupColor: true, isolate: true, rotate: false, skeleton: 'ghost' }, store.get('myo2.opts', {})),
    quiz: { type: 'locate', scope: 'all', target: null, focus: null, streak: 0, best: store.get('myo2.best', 0), firstTry: 0, asked: 0, tries: 0, hinted: false, locked: false, seen: [] },
    flash: null, currentView: 'front', open: new Set(['arm'])
  };

  /* --------------------------------------------------------------- renderer */
  const canvas = $('#c'), stage = $('#stage');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { $('#nogl').hidden = false; $('#loader').classList.add('done'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  const FOV = 32;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.02, 40);
  const BODY_CENTER = new THREE.Vector3(0, 0.88, 0.05);
  const controls = new THREE.OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, rotateSpeed: 0.85, zoomSpeed: 0.9, minDistance: 0.18, maxDistance: 6, autoRotateSpeed: 1.6, screenSpacePanning: true });
  controls.maxPolarAngle = rad(168); controls.minPolarAngle = rad(12);
  controls.target.copy(BODY_CENTER);

  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1a1d28, 0.5));
  const key = new THREE.DirectionalLight(0xfff1e0, 1.0); key.position.set(2.2, 3.2, 3); scene.add(key);
  const back = new THREE.DirectionalLight(0xffe6d0, 0.85); back.position.set(-2, 2.6, -3.2); scene.add(back);
  const rim = new THREE.DirectionalLight(0x7fb2ff, 0.5); rim.position.set(-3, 1.4, 1.2); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffd9c2, 0.3); fill.position.set(2.6, 0.6, -1.8); scene.add(fill);

  (function floor() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(256, 256, 10, 256, 256, 256);
    grd.addColorStop(0, 'rgba(255,179,71,0.24)'); grd.addColorStop(0.5, 'rgba(255,179,71,0.05)'); grd.addColorStop(1, 'rgba(255,179,71,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.001, 0.03); scene.add(glow);
    [[0.55, 0.56, 0.5], [0.85, 0.855, 0.2], [1.15, 1.155, 0.1]].forEach(([a, b, o]) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(a, b, 128), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.002, 0.03); scene.add(ring);
    });
  })();

  /* ----------------------------------------------------------- mesh decoding */
  function b64ToBuf(b64) { const bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  async function buildGeometries(G, label) {
    const buf = b64ToBuf(G.b64), { bmin, bmax, items } = G.meta;
    const sx = (bmax[0] - bmin[0]) / 65535, sy = (bmax[1] - bmin[1]) / 65535, sz = (bmax[2] - bmin[2]) / 65535;
    const out = new Array(items.length);
    for (let n = 0; n < items.length; n++) {
      const it = items[n], nvb = it.nv * 6;
      const q = new Uint16Array(buf.slice(it.off, it.off + nvb));
      const pos = new Float32Array(it.nv * 3);
      for (let i = 0; i < it.nv; i++) { pos[i * 3] = bmin[0] + q[i * 3] * sx; pos[i * 3 + 1] = bmin[1] + q[i * 3 + 1] * sy; pos[i * 3 + 2] = bmin[2] + q[i * 3 + 2] * sz; }
      const ib = buf.slice(it.off + nvb, it.off + nvb + it.ni * it.ib);
      const idx = it.ib === 2 ? new Uint16Array(ib) : new Uint32Array(ib);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
      out[n] = g;
      if (n % 60 === 59) { $('#loaderText').textContent = label + ' ' + Math.round(n / items.length * 100) + '%'; await tick(); }
    }
    return out;
  }

  /* ------------------------------------------------------------ build scene */
  const bodyGroup = new THREE.Group(); scene.add(bodyGroup);
  const boneGroup = new THREE.Group(), muscleGroup = new THREE.Group(); bodyGroup.add(boneGroup, muscleGroup);
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };
  const TENDON = new THREE.Color('#e8dfca');
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.8, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false });
  const boneMeshes = [];
  let allMuscleMeshes = [];

  async function build() {
    const gM = await buildGeometries(MG, 'Building muscles');
    MUS.forEach(M => {
      M.cReg = new THREE.Color(REG[M.r].color);
      M.cNat = new THREE.Color().setHSL(0.99 + hash(M.id) * 0.03, 0.62, 0.3 + hash(M.id + 'x') * 0.08);
      M.tmat = new THREE.MeshStandardMaterial({ color: TENDON.clone(), roughness: 0.6, metalness: 0, emissive: 0x000000 });
      M.meshes = [];
      const add = (idx, side, part, isT) => {
        const mat = isT ? M.tmat : part.mat;
        const mesh = new THREE.Mesh(gM[idx], mat);
        mesh.userData = { m: M, part, side, tendon: isT };
        muscleGroup.add(mesh); M.meshes.push(mesh); allMuscleMeshes.push(mesh);
        (part || M).meshes = (part || M).meshes || []; (part || M).meshes.push(mesh);
      };
      M.parts.forEach(P => {
        P.mat = new THREE.MeshStandardMaterial({ color: M.cReg.clone(), roughness: 0.55, metalness: 0, emissive: 0x000000 });
        P.meshes = [];
        P.m.forEach(([idx, side]) => add(idx, side, P, false));
      });
      M.tm = [];
      (M.t || []).forEach(([idx, side]) => { const mesh = new THREE.Mesh(gM[idx], M.tmat); mesh.userData = { m: M, part: null, side, tendon: true }; muscleGroup.add(mesh); M.meshes.push(mesh); allMuscleMeshes.push(mesh); M.tm.push(mesh); });
      const box = new THREE.Box3(); M.meshes.forEach(ms => box.union(ms.geometry.boundingBox));
      M.box = box;
      M.opacity = 1;
    });
    await tick();
    const gS = await buildGeometries(SG, 'Building skeleton');
    gS.forEach((g, i) => {
      const mesh = new THREE.Mesh(g, boneMat); mesh.userData = { bone: A.bones[i] }; mesh.renderOrder = -1;
      boneGroup.add(mesh); boneMeshes.push(mesh);
    });
  }

  /* ------------------------------------------------------------------ camera */
  let tween = null;
  const sph1 = new THREE.Spherical(), tmpV = new THREE.Vector3();
  function fitDist() { const t = Math.tan(rad(FOV / 2)); return Math.max(0.98 / t, 0.55 / (t * camera.aspect)) * 1.22; }
  const VIEWS = { front: [0, 0.06, 1], back: [0, 0.06, -1], right: [-1, 0.06, 0], left: [1, 0.06, 0] };
  function flyTo(pos, target, dur) {
    tween = { t0: performance.now(), dur: dur || 1000, ft: controls.target.clone(), tt: target.clone(),
      fs: new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)), ts: new THREE.Spherical().setFromVector3(pos.clone().sub(target)) };
    let d = tween.ts.theta - tween.fs.theta;
    tween.dth = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  }
  function goView(name, dur) {
    const d = VIEWS[name]; if (!d) return;
    flyTo(BODY_CENTER.clone().add(new THREE.Vector3(...d).normalize().multiplyScalar(fitDist())), BODY_CENTER, dur);
    state.currentView = name; markViews();
  }
  function focusMuscle(M, side, dur) {
    const box = new THREE.Box3();
    M.meshes.forEach(ms => { if (!side || ms.userData.side === side || ms.userData.side === 'M') box.union(ms.geometry.boundingBox); });
    if (box.isEmpty()) box.copy(M.box);
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()).length();
    let dist = Math.min(2.4, Math.max(0.5, size * 1.8 + 0.3)); if (camera.aspect < 1) dist *= 1 + (1 - camera.aspect) * 0.9;
    const zs = c.z > 0.04 ? 1 : -1, xs = Math.abs(c.x) > 0.08 ? Math.sign(c.x) * 0.45 : 0;
    flyTo(c.clone().add(new THREE.Vector3(xs, 0.12, zs).normalize().multiplyScalar(dist)), c, dur || 950);
    state.currentView = ''; markViews();
  }
  function stepTween(now) {
    if (!tween) return;
    const k = Math.min(1, (now - tween.t0) / tween.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    controls.target.lerpVectors(tween.ft, tween.tt, e);
    sph1.radius = tween.fs.radius + (tween.ts.radius - tween.fs.radius) * e;
    sph1.phi = tween.fs.phi + (tween.ts.phi - tween.fs.phi) * e;
    sph1.theta = tween.fs.theta + tween.dth * e;
    camera.position.copy(controls.target).add(tmpV.setFromSpherical(sph1));
    if (k >= 1) tween = null;
  }
  controls.addEventListener('start', () => { tween = null; state.currentView = ''; markViews(); canvas.classList.add('grabbing'); });
  controls.addEventListener('end', () => canvas.classList.remove('grabbing'));
  function markViews() { $$('.toolbar [data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === state.currentView)); }

  let viewOffsetY = 0, viewOffsetTarget = 0;
  const isMobile = () => window.matchMedia('(max-width: 820px)').matches;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  /* --------------------------------------------------------------- visibility */
  let pickList = [];
  const isVisible = M => !state.hiddenM.has(M.id) && !state.hiddenR.has(M.r);
  function refreshVisibility() {
    pickList = [];
    MUS.forEach(M => { const v = isVisible(M); M.meshes.forEach(ms => { ms.visible = v; if (v) pickList.push(ms); }); });
    if (state.selected && !isVisible(state.selected)) deselect();
    updateTreeStates();
  }
  function applySkeleton() {
    const sk = state.opts.skeleton;
    boneGroup.visible = sk !== 'off';
    boneMat.transparent = sk === 'ghost'; boneMat.opacity = sk === 'ghost' ? 0.2 : 1; boneMat.depthWrite = sk !== 'ghost'; boneMat.needsUpdate = true;
    $$('#skelSeg button').forEach(b => b.classList.toggle('active', b.dataset.sk === sk));
  }

  /* ------------------------------------------------------------------ picking */
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function setRay(cx, cy) { const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(ndc, camera); }
  function pickMuscle(cx, cy) { setRay(cx, cy); const h = raycaster.intersectObjects(pickList, false)[0]; return h ? h.object : null; }
  function pickBone(cx, cy) { if (!boneGroup.visible) return null; setRay(cx, cy); const h = raycaster.intersectObjects(boneMeshes, false)[0]; return h ? h.object : null; }

  const tooltip = $('#tooltip');
  let ptr = { x: 0, y: 0, moved: false, type: 'mouse' }, down = null, lastHover = 0;
  canvas.addEventListener('pointermove', e => {
    ptr = { x: e.clientX, y: e.clientY, moved: true, type: e.pointerType };
    const r = stage.getBoundingClientRect(); tooltip.style.left = (e.clientX - r.left) + 'px'; tooltip.style.top = (e.clientY - r.top) + 'px';
  });
  canvas.addEventListener('pointerleave', () => { ptr.moved = false; setHover(null); });
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t; down = null;
    if (Math.hypot(dx, dy) < 6 && dt < 600) { const o = pickMuscle(e.clientX, e.clientY); onTap(o ? o.userData : null); }
  });
  function setHover(M, label) {
    const changed = state.hovered !== M;
    state.hovered = M;
    canvas.classList.toggle('over', !!M);
    if (state.mode === 'explore' && (M || label)) { tooltip.textContent = label || M.n; tooltip.hidden = false; } else tooltip.hidden = true;
    return changed;
  }
  function hoverTick(now) {
    if (!ptr.moved || down || ptr.type === 'touch' || now - lastHover < 70) return;
    ptr.moved = false; lastHover = now;
    const o = pickMuscle(ptr.x, ptr.y);
    if (o) setHover(o.userData.m, null);
    else if (state.mode === 'explore') { const b = pickBone(ptr.x, ptr.y); setHover(null, b ? b.userData.bone : null); }
    else setHover(null);
  }
  function onTap(ud) {
    if (state.mode === 'quiz') { if (ud && state.quiz.type === 'locate') answerLocate(ud.m); return; }
    if (ud) select(ud.m, false, ud.side); else deselect();
  }

  /* ---------------------------------------------------------------- selection */
  const card = $('#card');
  function select(M, fly, side) {
    state.selected = M; state.selPart = null;
    fillCard(M); card.hidden = false;
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    updateTreeStates();
    const el = $('.item.active'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (fly && M.meshes) focusMuscle(M, side || 'L');
    viewOffsetTarget = isMobile() ? stage.clientHeight * 0.2 : 0;
  }
  function deselect() { state.selected = null; state.selPart = null; card.hidden = true; updateTreeStates(); viewOffsetTarget = 0; }
  function fillCard(M) {
    card.style.setProperty('--c', REG[M.r].color);
    $('#cBadge').textContent = REG[M.r].name + (M.sub ? ' · ' + M.sub : ''); $('#cTier').textContent = M.tier === 'core' ? 'Core' : M.tier === 'adv' ? 'Advanced' : 'Reference'; $('#cTier').dataset.t = M.tier;
    const dts = $$('.facts dt', card), lab = M.labels || ['Origin', 'Insertion', 'Nerve supply', 'Action']; dts.forEach((d, i) => { d.textContent = lab[i]; });
    $('#hideBtn').hidden = !!M.ref; $('#cNo').hidden = !M.ref; $('#cNo').textContent = M.tissue ? 'Tissue / concept entry: no 3D model.' : 'No 3D model for this muscle in the open source atlas. Described in text only.';
    $('#cName').textContent = M.n; $('#cLatin').textContent = M.la;
    $('#cOri').textContent = M.o; $('#cIns').textContent = M.i; $('#cNerve').textContent = M.nv; $('#cAct').textContent = M.a;
    $('#cTip').textContent = M.p; $('#cTipBox').hidden = !M.p;
    const pc = $('#cParts'); pc.innerHTML = '';
    if (M.parts.length > 1) M.parts.forEach(P => {
      const b = document.createElement('button'); b.className = 'pchip'; b.textContent = P.l || P.k;
      b.onclick = () => { state.selPart = state.selPart === P ? null : P; fillPart(); $$('.pchip', pc).forEach((x, i) => x.classList.toggle('active', M.parts[i] === state.selPart)); };
      pc.appendChild(b);
    });
    pc.hidden = M.parts.length < 2; fillPart(); syncLearnBtn();
  }
  function fillPart() {
    const P = state.selPart, box = $('#cPartBox');
    if (!P || !(P.o || P.i || P.x)) { box.hidden = true; return; }
    box.hidden = false; $('#cPartTitle').textContent = P.l || P.k;
    $('#cPartText').textContent = [P.o && 'Origin: ' + P.o, P.i && 'Insertion: ' + P.i, P.x].filter(Boolean).join(' · ');
  }
  function syncLearnBtn() {
    const b = $('#learnBtn'), M = state.selected; if (!M) return;
    const l = state.learned.has(M.id); b.textContent = l ? '✓ Learned' : 'Mark as learned'; b.classList.toggle('done', l);
  }
  function persistLearned() { store.set('myo2.learned', [...state.learned]); }
  function toggleLearned(id) { state.learned.has(id) ? state.learned.delete(id) : state.learned.add(id); persistLearned(); syncLearnBtn(); updateTreeStates(); updateProgress(); }
  function step(dir) {
    const list = listed(); if (!list.length) return;
    let i = list.indexOf(state.selected); i = i < 0 ? 0 : (i + dir + list.length) % list.length;
    select(list[i], true);
  }
  function hideSelected() { const M = state.selected; if (!M) return; state.hiddenM.add(M.id); refreshVisibility(); toast(M.n + ' hidden — press A to show all'); }
  $('#cardClose').onclick = deselect;
  $('#learnBtn').onclick = () => state.selected && toggleLearned(state.selected.id);
  $('#hideBtn').onclick = hideSelected;
  $('#prevBtn').onclick = () => step(-1); $('#nextBtn').onclick = () => step(1);

  /* --------------------------------------------------------------------- tree */
  const treeEl = $('#tree');
  const EYE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  function matches(M, q) { return !q || (M.n + ' ' + M.la + ' ' + M.sub + ' ' + M.nv + ' ' + M.a + ' ' + M.o + ' ' + M.i + ' ' + REG[M.r].name).toLowerCase().includes(q); }
  function listed() { const q = state.query.trim().toLowerCase(); return ALL.filter(M => (q || inLevel(M)) && matches(M, q)); }
  function renderTree() {
    const q = state.query.trim().toLowerCase(), items = listed();
    $('#count').textContent = items.length + ' muscle' + (items.length === 1 ? '' : 's');
    treeEl.innerHTML = '';
    if (!items.length) { treeEl.innerHTML = '<div class="empty">No muscles match your search.</div>'; return; }
    REGS.forEach(R => {
      const ms = items.filter(M => M.r === R.id); if (!ms.length) return;
      const reg = document.createElement('div'); reg.className = 'reg'; reg.dataset.r = R.id; reg.style.setProperty('--c', R.color);
      if (q || state.open.has(R.id)) reg.classList.add('open');
      reg.innerHTML = '<div class="reg-head"><svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg><span class="dot"></span><span class="rn"></span><span class="rc"></span><button class="mini solo" title="Show only this region">SOLO</button><button class="mini eyeb" title="Show / hide this region">' + EYE + '</button></div><div class="reg-body"></div>';
      $('.rn', reg).textContent = R.name; $('.rc', reg).textContent = ms.length;
      $('.reg-head', reg).onclick = e => {
        if (e.target.closest('.mini')) return;
        reg.classList.toggle('open'); reg.classList.contains('open') ? state.open.add(R.id) : state.open.delete(R.id);
      };
      $('.solo', reg).onclick = () => { if (state.solo === R.id) showAll(); else { state.solo = R.id; state.hiddenR = new Set(A.regions.map(x => x.id).filter(x => x !== R.id)); state.hiddenM.clear(); refreshVisibility(); } };
      $('.eyeb', reg).onclick = () => { state.solo = null; state.hiddenR.has(R.id) ? state.hiddenR.delete(R.id) : state.hiddenR.add(R.id); refreshVisibility(); };
      if (R.id.charAt(0) === 'x') $$('.mini', reg).forEach(x => x.remove());
      const body = $('.reg-body', reg); let lastSub = null;
      ms.forEach(M => {
        if (M.sub && M.sub !== lastSub) { const s = document.createElement('div'); s.className = 'sub'; s.textContent = M.sub; body.appendChild(s); lastSub = M.sub; }
        const w = document.createElement('div'); w.className = 'item-wrap';
        const b = document.createElement('button'); b.className = 'item'; b.dataset.id = M.id; b.style.setProperty('--c', R.color);
        b.innerHTML = '<span class="dot"></span><span class="t"><b></b><small></small></span><span class="ck">' + CHECK + '</span>';
        $('b', b).textContent = M.n; $('small', b).textContent = M.nv.split(/[;(]/)[0].trim();
        b.onclick = () => { if (state.mode === 'explore') { ensureVisible(M); select(M, true); closeMenu(); } };
        const ey = document.createElement('button'); ey.className = 'eye'; ey.title = 'Show / hide'; ey.innerHTML = EYE;
        ey.onclick = () => { state.hiddenM.has(M.id) ? state.hiddenM.delete(M.id) : state.hiddenM.add(M.id); refreshVisibility(); };
        if (M.ref) w.append(b); else w.append(b, ey); body.appendChild(w);
      });
      treeEl.appendChild(reg);
    });
    updateTreeStates();
  }
  function updateTreeStates() {
    $$('.item', treeEl).forEach(b => {
      const M = byId[b.dataset.id]; if (!M) return;
      b.classList.toggle('learned', state.learned.has(M.id)); b.classList.toggle('active', state.selected === M);
      b.classList.toggle('hid', !isVisible(M));
    });
    $$('.reg', treeEl).forEach(r => { r.classList.toggle('hidden-reg', state.hiddenR.has(r.dataset.r)); const so = $('.solo', r); if (so) so.classList.toggle('on', state.solo === r.dataset.r); });
  }
  function ensureVisible(M) { let ch = false; if (state.hiddenM.delete(M.id)) ch = true; if (state.hiddenR.has(M.r)) { state.hiddenR.delete(M.r); state.solo = null; ch = true; } if (ch) refreshVisibility(); }
  function showAll() { state.hiddenM.clear(); state.hiddenR.clear(); state.solo = null; refreshVisibility(); }
  $('#search').addEventListener('input', e => { state.query = e.target.value; renderTree(); });
  $('#showAllBtn').onclick = showAll; $('#showAllBtn2').onclick = showAll;
  $('#collapseBtn').onclick = () => { state.open.clear(); $$('.reg', treeEl).forEach(r => r.classList.remove('open')); };

  function setLevel(lv) {
    state.level = lv; try { localStorage.setItem('myo2.level', lv); } catch (e) {}
    $$('#levelSeg button').forEach(b => b.classList.toggle('active', b.dataset.lv === lv));
    state.quiz.seen = []; state.quiz.target = null; renderTree(); updateProgress();
    if (state.mode === 'quiz') nextQuestion();
    toast(lv === 'adv' ? 'Advanced level: deeper and specialist muscles' : lv === 'ref' ? 'Reference level: text-only entries, no 3D model' : lv === 'core' ? 'Core level: the essentials' : 'Showing all muscles');
  }
  function updateProgress() {
    const set = ALL.filter(inLevel), n = set.filter(M => state.learned.has(M.id)).length, t = set.length;
    const cs = MUS.filter(M => M.tier === 'core'), cd = cs.filter(M => state.learned.has(M.id)).length, as = MUS.length - cs.length, ad = MUS.filter(M => M.tier === 'adv' && state.learned.has(M.id)).length;
    $('#levelNote').textContent = state.level === 'core' ? 'Core: ' + cs.length + ' muscles every MBBS/physiology student is expected to know. Learned ' + cd + ' / ' + cs.length + '.'
      : state.level === 'adv' ? 'Advanced: ' + as + ' deeper, smaller and specialist muscles. Learned ' + ad + ' / ' + as + '.'
      : state.level === 'ref' ? 'Reference: ' + REF.length + ' text-only entries (muscles the open atlas has no 3D model for, plus cardiac, smooth and skeletal muscle tissue). Learned ' + REF.filter(M => state.learned.has(M.id)).length + ' / ' + REF.length + '.'
      : 'All ' + ALL.length + ' entries. Core ' + cd + ' / ' + cs.length + ' · Advanced ' + ad + ' / ' + as + ' · Reference ' + REF.filter(M => state.learned.has(M.id)).length + ' / ' + REF.length + '.';
    const done = cd === cs.length; $('#advGo').hidden = !(done && state.level === 'core');
    $('#progText').textContent = n + ' / ' + t; $('#progPct').textContent = Math.round(n / t * 100) + '%';
    $('#progRing').style.strokeDashoffset = 97.4 * (1 - n / t);
  }
  $('#resetProgress').onclick = () => { if (!state.learned.size || confirm('Clear all learned muscles?')) { state.learned.clear(); persistLearned(); updateTreeStates(); updateProgress(); syncLearnBtn(); } };

  const sidebar = $('#sidebar'), scrim = $('#scrim');
  function openMenu() { sidebar.classList.add('open'); scrim.classList.add('show'); }
  function closeMenu() { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
  $('#menuBtn').onclick = openMenu; $('#closeMenu').onclick = closeMenu; scrim.onclick = closeMenu;
  $$('.toolbar [data-view]').forEach(b => b.onclick = () => goView(b.dataset.view));
  $('#resetView').onclick = () => goView('front');

  /* ------------------------------------------------------------------ options */
  const optBtn = $('#displayBtn'), optPanel = $('#options');
  optBtn.onclick = () => { optPanel.hidden = !optPanel.hidden; optBtn.setAttribute('aria-expanded', String(!optPanel.hidden)); };
  document.addEventListener('pointerdown', e => { if (!optPanel.hidden && !e.target.closest('.display')) { optPanel.hidden = true; optBtn.setAttribute('aria-expanded', 'false'); } });
  $$('[data-opt]').forEach(inp => { inp.checked = !!state.opts[inp.dataset.opt]; inp.onchange = () => setOpt(inp.dataset.opt, inp.checked); });
  $$('#skelSeg button').forEach(b => b.onclick = () => setOpt('skeleton', b.dataset.sk));
  function setOpt(k, v) {
    state.opts[k] = v; store.set('myo2.opts', state.opts);
    const inp = $('[data-opt="' + k + '"]'); if (inp) inp.checked = v;
    controls.autoRotate = !!state.opts.rotate; applySkeleton();
  }

  /* ------------------------------------------------------------------ materials */
  const tgt = new THREE.Color(), emT = new THREE.Color(), AMBER = new THREE.Color(1, 0.55, 0.12), GREY = new THREE.Color(0.6, 0.65, 0.75);
  function updateMaterials(dt, now) {
    const k = 1 - Math.exp(-dt * 10), quiz = state.mode === 'quiz';
    if (state.flash && now > state.flash.until) state.flash = null;
    const focusM = quiz ? state.quiz.focus : (state.opts.isolate && state.selected && state.selected.meshes ? state.selected : null);
    const emph = quiz ? state.quiz.focus : (state.selected && state.selected.meshes ? state.selected : null);
    for (let n = 0; n < MUS.length; n++) {
      const M = MUS[n]; if (!isVisible(M)) continue;
      const flashing = state.flash && state.flash.m === M, isE = emph === M, hov = state.hovered === M;
      const op = (!focusM || M === focusM || flashing) ? 1 : 0.1;
      M.opacity += (op - M.opacity) * k;
      const trans = M.opacity < 0.995;
      const mats = M.parts.map(P => P.mat); mats.push(M.tmat);
      for (let i = 0; i < mats.length; i++) {
        const mat = mats[i], isT = i === mats.length - 1, P = isT ? null : M.parts[i];
        if (isT) tgt.copy(TENDON); else tgt.copy(state.opts.groupColor && !quiz ? M.cReg : M.cNat);
        emT.setRGB(0, 0, 0);
        if (isE) { const f = (state.selPart && P && state.selPart !== P && !quiz) ? 0.05 : 0.2; emT.copy(AMBER).multiplyScalar(f); }
        else if (hov) emT.copy(GREY).multiplyScalar(0.25);
        if (flashing) { if (!isT) tgt.copy(state.flash.c); emT.copy(state.flash.c).multiplyScalar(0.5); }
        mat.color.lerp(tgt, k); mat.emissive.lerp(emT, k);
        mat.opacity = M.opacity;
        if (mat.transparent !== trans) { mat.transparent = trans; mat.depthWrite = !trans || M.opacity > 0.6; mat.needsUpdate = true; }
      }
    }
  }

  /* -------------------------------------------------------------------- toast */
  let toastT;
  function toast(msg, kind) { const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + (kind || ''); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

  /* --------------------------------------------------------------------- quiz */
  const GOOD = new THREE.Color('#3ddc97'), BAD = new THREE.Color('#ff5d6c'), HINT = new THREE.Color('#ffb347');
  const QHELP = { recall: 'A description appears (attachments, nerve, action). Choose the muscle or tissue it describes. Works for every level, including Reference.', locate: 'A muscle name appears on the stage. Rotate the body, peel layers if needed, and tap the right muscle.', name: 'A muscle is highlighted. Choose its correct name from four options.', nerve: 'A muscle is highlighted. Choose the nerve that supplies it.' };
  const QLABEL = { recall: 'Which one is described?', locate: 'Find this muscle', name: 'What is this muscle?', nerve: 'Which nerve supplies…' };
  function flash(M, c, ms) { state.flash = { m: M, c, until: performance.now() + ms }; }
  function quizStats() { const q = state.quiz; $('#qStreak').textContent = q.streak; $('#qBest').textContent = q.best; $('#qAcc').textContent = q.asked ? Math.round(q.firstTry / q.asked * 100) + '%' : '–'; }
  function scopePool() { const q = state.quiz; return (q.type === 'recall' ? ALL : MUS).filter(M => inLevel(M) && (q.scope === 'all' || M.r === q.scope)); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const nerveKey = M => M.nv.split(';')[0].trim();
  function nextQuestion() {
    const q = state.quiz; let pool = scopePool();
    if (pool.length < 2) { toast(state.level === 'ref' && state.quiz.type !== 'recall' ? 'Reference entries have no 3D model: use the From description quiz' : 'Not enough muscles in this selection for a quiz'); return; }
    let fresh = pool.filter(M => !q.seen.includes(M.id) && M !== q.target);
    if (!fresh.length) { q.seen = []; fresh = pool.filter(M => M !== q.target); }
    const unl = fresh.filter(M => !state.learned.has(M.id));
    const src = unl.length && Math.random() < 0.7 ? unl : fresh;
    const M = src[Math.floor(Math.random() * src.length)];
    q.target = M; q.seen.push(M.id); q.tries = 0; q.hinted = false; q.locked = false; state.flash = null;
    $('#qLabel').textContent = QLABEL[q.type];
    const ch = $('#choices'); ch.innerHTML = ''; ch.hidden = q.type === 'locate';
    $('#qTarget').classList.toggle('long', q.type === 'recall');
    if (q.type === 'locate') { q.focus = null; viewOffsetTarget = 0; $('#qTarget').textContent = M.n; }
    else if (q.type === 'recall') {
      q.focus = null; viewOffsetTarget = 0;
      const lb = M.labels || ['Origin', 'Insertion', 'Nerve supply', 'Action'], cut = s => s.length > 130 ? s.slice(0, 127) + '…' : s;
      $('#qTarget').textContent = [lb[0] + ': ' + cut(M.o), lb[3] + ': ' + cut(M.a), lb[2] + ': ' + cut(M.nv)].join('  ·  ');
      const d = shuffle(ALL.filter(x => x !== M && x.tissue === M.tissue && (x.r === M.r || Math.random() < 0.25)).slice()).slice(0, 3);
      const opts = shuffle([M, ...d]).map(x => ({ label: x.n, ok: x === M }));
      opts.forEach(o => { const b = document.createElement('button'); b.className = 'choice'; b.textContent = o.label; b.onclick = () => answerChoice(b, o, opts, ch); ch.appendChild(b); });
    } else {
      ensureVisible(M); q.focus = M; focusMuscle(M, 'L', 900); viewOffsetTarget = isMobile() ? -stage.clientHeight * 0.24 : 0;
      let opts;
      if (q.type === 'name') {
        const d = shuffle(MUS.filter(x => x !== M && (x.r === M.r || Math.random() < 0.15)).slice()).slice(0, 3);
        opts = shuffle([M, ...d]).map(x => ({ label: x.n, ok: x === M }));
        $('#qTarget').textContent = 'Identify the highlighted muscle';
      } else {
        const right = nerveKey(M), seen = new Set([right]), d = [];
        shuffle(MUS.filter(x => x !== M).slice()).forEach(x => { const nk = nerveKey(x); if (d.length < 3 && !seen.has(nk) && (x.r === M.r || d.length >= 1 || Math.random() < 0.5)) { seen.add(nk); d.push(nk); } });
        shuffle(MUS.filter(x => x !== M).slice()).forEach(x => { const nk = nerveKey(x); if (d.length < 3 && !seen.has(nk)) { seen.add(nk); d.push(nk); } });
        opts = shuffle([right, ...d]).map(l => ({ label: l, ok: l === right }));
        $('#qTarget').textContent = M.n;
      }
      opts.forEach(o => {
        const b = document.createElement('button'); b.className = 'choice'; b.textContent = o.label;
        b.onclick = () => answerChoice(b, o, opts, ch); ch.appendChild(b);
      });
    }
    deselect(); quizStats();
  }
  function credit(M, first) {
    const q = state.quiz; q.asked++;
    if (first) { q.firstTry++; q.streak++; if (q.streak > q.best) { q.best = q.streak; store.set('myo2.best', q.best); } if (q.type !== 'nerve') { state.learned.add(M.id); persistLearned(); updateProgress(); updateTreeStates(); } }
    else q.streak = 0;
    quizStats();
  }
  function answerLocate(M) {
    const q = state.quiz; if (q.locked || !q.target) return;
    if (M === q.target) {
      q.locked = true; const first = q.tries === 0 && !q.hinted; credit(M, first); flash(M, GOOD, 1700);
      toast(first ? 'Correct! ✓ Marked as learned' : 'Correct — keep practising this one', 'good');
      setTimeout(() => { if (state.mode === 'quiz') nextQuestion(); }, 2300);
    } else {
      q.tries++; q.streak = 0; quizStats(); flash(M, BAD, 700);
      toast("That's the " + M.n + '.' + (q.tries >= 2 ? ' Need help? Tap Hint.' : ' Try again!'), 'bad');
    }
  }
  function answerChoice(btn, o, opts, ch) {
    const q = state.quiz; if (q.locked) return; q.locked = true;
    $$('.choice', ch).forEach((b, i) => { b.disabled = true; if (opts[i].ok) b.classList.add('good'); });
    if (o.ok) { credit(q.target, !q.hinted); toast('Correct!' + (q.type === 'name' ? ' ✓' : ''), 'good'); }
    else { btn.classList.add('bad'); credit(q.target, false); toast(q.type !== 'nerve' ? 'It was ' + q.target.n : 'Correct: ' + nerveKey(q.target), 'bad'); }
    if (q.type === 'name' || q.type === 'recall') $('#qTarget').textContent = q.target.n;
    setTimeout(() => { if (state.mode === 'quiz') nextQuestion(); }, o.ok ? 1700 : 3000);
  }
  $('#hintBtn').onclick = () => {
    const q = state.quiz; if (!q.target || q.locked) return; q.hinted = true;
    if (q.type === 'locate') { ensureVisible(q.target); focusMuscle(q.target, 'L', 900); setTimeout(() => flash(q.target, HINT, 1400), 700); }
    else toast('Region: ' + REG[q.target.r].name + (q.target.sub ? ' · ' + q.target.sub : ''));
  };
  $('#skipBtn').onclick = () => {
    const q = state.quiz; if (!q.target || q.locked) return; q.locked = true; q.asked++; q.streak = 0; quizStats();
    if (q.type === 'locate') { ensureVisible(q.target); focusMuscle(q.target, 'L', 800); flash(q.target, HINT, 2000); toast('That was the ' + q.target.n, 'bad'); }
    else { const ch = $('#choices'); const t = q.type !== 'nerve' ? q.target.n : nerveKey(q.target); $$('.choice', ch).forEach(b => { b.disabled = true; if (b.textContent === t) b.classList.add('good'); }); toast('Answer: ' + t, 'bad'); }
    setTimeout(() => { if (state.mode === 'quiz') nextQuestion(); }, 2300);
  };
  $('#qRestart').onclick = () => { Object.assign(state.quiz, { streak: 0, firstTry: 0, asked: 0, seen: [], target: null }); nextQuestion(); };
  $('#qExit').onclick = () => setMode('explore');
  $$('#quizType button').forEach(b => b.onclick = () => { state.quiz.type = b.dataset.qt; $$('#quizType button').forEach(x => x.classList.toggle('active', x === b)); $('#quizHelp').textContent = QHELP[state.quiz.type]; Object.assign(state.quiz, { seen: [], target: null }); if (state.mode === 'quiz') nextQuestion(); });
  const scopeSel = $('#quizScope');
  scopeSel.innerHTML = '<option value="all">All regions</option>' + REGS.map(r => '<option value="' + r.id + '">' + r.name + '</option>').join('');
  scopeSel.onchange = () => { state.quiz.scope = scopeSel.value; state.quiz.seen = []; state.quiz.target = null; if (state.mode === 'quiz') nextQuestion(); };

  /* --------------------------------------------------------------------- mode */
  const modeBtns = $$('.mode-switch button'), thumb = $('.mode-switch .thumb');
  function placeThumb() { const b = modeBtns.find(x => x.classList.contains('active')); thumb.style.width = b.offsetWidth + 'px'; thumb.style.transform = 'translateX(' + (b.offsetLeft - 4) + 'px)'; }
  function setMode(mode) {
    state.mode = mode; modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode)); placeThumb();
    const quiz = mode === 'quiz'; stage.classList.toggle('qm', quiz);
    $('#explorePane').hidden = quiz; $('#quizPane').hidden = !quiz; $('#banner').hidden = !quiz;
    tooltip.hidden = true; state.hovered = null; state.flash = null; deselect();
    if (quiz) { showAll(); $('#quizHelp').textContent = QHELP[state.quiz.type]; state.quiz.target = null; goView('front', 800); nextQuestion(); }
    else { state.quiz.focus = null; viewOffsetTarget = 0; }
  }
  modeBtns.forEach(b => b.onclick = () => { setMode(b.dataset.mode); if (b.dataset.mode === 'quiz') closeMenu(); });

  /* ------------------------------------------------------------------ modals */
  const help = $('#help'), about = $('#about');
  $('#helpBtn').onclick = () => { help.hidden = false; }; $('#helpClose').onclick = () => { help.hidden = true; };
  $('#aboutBtn').onclick = () => { about.hidden = false; }; $('#aboutBtn2').onclick = () => { about.hidden = false; closeMenu(); }; $('#aboutClose').onclick = () => { about.hidden = true; };
  [help, about].forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m) m.hidden = true; }));

  window.addEventListener('keydown', e => {
    if (e.target.matches('input,select')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case '1': goView('front'); break; case '2': goView('right'); break; case '3': goView('back'); break; case '4': goView('left'); break;
      case 'r': case 'R': setOpt('rotate', !state.opts.rotate); break;
      case 's': case 'S': setOpt('skeleton', { off: 'ghost', ghost: 'solid', solid: 'off' }[state.opts.skeleton]); break;
      case 'h': case 'H': hideSelected(); break;
      case 'a': case 'A': showAll(); break;
      case 'Escape': help.hidden = true; about.hidden = true; deselect(); closeMenu(); break;
      case 'ArrowRight': if (state.mode === 'explore') step(1); break;
      case 'ArrowLeft': if (state.mode === 'explore') step(-1); break;
      case '?': help.hidden = false; break;
    }
  });

  /* ------------------------------------------------------------------- render */
  let last = performance.now();
  const clampLo = new THREE.Vector3(-0.7, 0.0, -0.7), clampHi = new THREE.Vector3(0.7, 1.85, 0.7);
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    stepTween(now); controls.target.clamp(clampLo, clampHi); controls.update();
    viewOffsetY += (viewOffsetTarget - viewOffsetY) * Math.min(1, dt * 8);
    if (Math.abs(viewOffsetY) > 0.5) camera.setViewOffset(stage.clientWidth, stage.clientHeight, 0, viewOffsetY, stage.clientWidth, stage.clientHeight);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    hoverTick(now); updateMaterials(dt, now);
    renderer.render(scene, camera);
  }

  /* --------------------------------------------------------------------- init */
  (async function init() {
    $('#brandSub').textContent = MUS.length + ' in 3D · ' + REF.length + ' reference';
    await tick();
    await build();
    controls.autoRotate = !!state.opts.rotate; applySkeleton();
    $$('#levelSeg button').forEach(b => { b.classList.toggle('active', b.dataset.lv === state.level); b.onclick = () => setLevel(b.dataset.lv); });
    $('#advGo').onclick = () => setLevel('adv');
    refreshVisibility(); renderTree(); updateProgress(); markViews(); placeThumb(); quizStats();
    window.addEventListener('resize', placeThumb);
    camera.position.copy(BODY_CENTER).add(new THREE.Vector3(-0.8, 0.12, -1).normalize().multiplyScalar(fitDist() * 1.15)); controls.update();
    requestAnimationFrame(t => { last = t; frame(t); });
    setTimeout(() => { $('#loader').classList.add('done'); goView('front', 2200); }, 350);
    window.MyoAtlas = { pickMuscle, state, select, goView, setMode, MUS, byId, showAll, focusMuscle, camera, controls, setOpt, refreshVisibility };
  })().catch(err => { console.error(err); $('#loaderText').textContent = 'Failed to load: ' + err.message; });
})();
