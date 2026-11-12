/* MyoAtlas — app logic (Three.js r147, classic script build) */
(function () {
  'use strict';

  const MUSCLES = window.MUSCLES, GROUPS = window.GROUPS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rad = d => d * Math.PI / 180;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ------------------------------------------------------------------ state */
  const state = {
    mode: 'explore',
    selected: null,
    hovered: null,
    group: null,
    query: '',
    learned: new Set(store.get('myo.learned', [])),
    opts: Object.assign({ groupColor: true, labels: false, isolate: true, shell: true, rotate: false }, store.get('myo.opts', {})),
    quiz: { target: null, streak: 0, best: store.get('myo.best', 0), firstTry: 0, asked: 0, tries: 0, hinted: false, locked: false, seen: [] },
    flash: null,
    currentView: 'front'
  };
  const byId = {};
  MUSCLES.forEach(m => { byId[m.id] = m; });

  /* ---------------------------------------------------------------- renderer */
  const canvas = $('#c');
  const stage = $('#stage');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    $('#nogl').hidden = false; $('#loader').classList.add('done');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const FOV = 32;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 40);
  const BODY_CENTER = new THREE.Vector3(0, 0.93, 0);

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.9;
  controls.minDistance = 0.6;
  controls.maxDistance = 6.5;
  controls.maxPolarAngle = rad(168);
  controls.minPolarAngle = rad(12);
  controls.autoRotateSpeed = 1.6;
  controls.screenSpacePanning = true;
  controls.target.copy(BODY_CENTER);

  /* ------------------------------------------------------------------ lights */
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1a1d28, 0.38));
  const key = new THREE.DirectionalLight(0xfff1e0, 1.05);
  key.position.set(2.2, 3.2, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 2.4, bottom: -0.4, near: 0.5, far: 9 });
  key.shadow.bias = -0.001; key.shadow.normalBias = 0.025; key.shadow.radius = 4;
  scene.add(key);
  const back = new THREE.DirectionalLight(0xffe6d0, 0.55);
  back.position.set(-2, 2.6, -3.2); scene.add(back);
  const rimBlue = new THREE.DirectionalLight(0x7fb2ff, 0.5);
  rimBlue.position.set(-3, 1.4, 1.2); scene.add(rimBlue);
  const fill = new THREE.DirectionalLight(0xffd9c2, 0.25);
  fill.position.set(2.6, 0.6, -1.8); scene.add(fill);

  /* ------------------------------------------------------------------ floor */
  (function buildFloor() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    grd.addColorStop(0, 'rgba(255,179,71,0.22)');
    grd.addColorStop(0.45, 'rgba(255,179,71,0.05)');
    grd.addColorStop(1, 'rgba(255,179,71,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.001; scene.add(glow);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.ShadowMaterial({ opacity: 0.38 }));
    shadow.rotation.x = -Math.PI / 2; shadow.receiveShadow = true; scene.add(shadow);

    [[0.62, 0.64, 0.5], [0.98, 0.99, 0.2], [1.3, 1.31, 0.1]].forEach(([a, b, o]) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(a, b, 128),
        new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);
    });
  })();

  /* ---------------------------------------------------------- body (shell) */
  const body = new THREE.Group(); scene.add(body);
  const shellGroup = new THREE.Group(); body.add(shellGroup);
  const muscleGroup = new THREE.Group(); body.add(muscleGroup);
  const pickables = [];

  const shellMat = new THREE.MeshStandardMaterial({ color: 0x2c3345, roughness: 0.78, metalness: 0.05 });

  function ellipsoid(x, y, z, sx, sy, sz) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), shellMat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = m.receiveShadow = true; shellGroup.add(m); pickables.push(m); return m;
  }
  function limb(a, b, r, mirror) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const dir = B.clone().sub(A), len = dir.length();
    const mk = sgn => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 2), 8, 24), shellMat);
      const mid = A.clone().add(B).multiplyScalar(0.5); mid.x *= sgn;
      const d = dir.clone(); d.x *= sgn;
      m.position.copy(mid);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      m.castShadow = m.receiveShadow = true; shellGroup.add(m); pickables.push(m);
    };
    mk(1); if (mirror !== false) mk(-1);
  }
  (function buildShell() {
    ellipsoid(0, 1.7, 0.005, 0.088, 0.112, 0.1);                 // head
    limb([0, 1.57, 0], [0, 1.63, 0], 0.045, false);               // neck
    ellipsoid(0, 1.3, 0, 0.16, 0.21, 0.085);                      // chest
    ellipsoid(0, 1.1, 0, 0.14, 0.17, 0.08);                       // abdomen
    ellipsoid(0, 0.96, 0, 0.15, 0.11, 0.085);                     // pelvis
    ellipsoid(0.2, 1.43, 0, 0.052, 0.052, 0.052).position.x = 0.2;
    ellipsoid(-0.2, 1.43, 0, 0.052, 0.052, 0.052);
    limb([0.2, 1.43, 0], [0.27, 1.12, 0], 0.031);                 // upper arm
    limb([0.27, 1.12, 0], [0.30, 0.88, 0], 0.025);                // forearm
    ellipsoid(0.31, 0.82, 0.004, 0.024, 0.052, 0.016); ellipsoid(-0.31, 0.82, 0.004, 0.024, 0.052, 0.016); // hands
    limb([0.09, 0.93, 0], [0.085, 0.5, 0], 0.058);                // thigh
    limb([0.085, 0.5, 0], [0.085, 0.09, 0], 0.04);                // shin
    ellipsoid(0.085, 0.04, 0.045, 0.04, 0.032, 0.09); ellipsoid(-0.085, 0.04, 0.045, 0.04, 0.032, 0.09); // feet
    ellipsoid(0.085, 0.5, 0, 0.052, 0.05, 0.05); ellipsoid(-0.085, 0.5, 0, 0.052, 0.05, 0.05); // knees
  })();

  /* ---------------------------------------------------------------- muscles */
  function fiberTexture() {
    // soft, low-frequency streaks (no per-pixel noise -> no moire / aliasing)
    const c = document.createElement('canvas'); c.width = 256; c.height = 8;
    const g = c.getContext('2d');
    const img = g.createImageData(256, 8);
    for (let x = 0; x < 256; x++) {
      const v = 128 + 38 * Math.sin(x * 0.42) + 24 * Math.sin(x * 0.97 + 1.3) + 14 * Math.sin(x * 2.1);
      for (let y = 0; y < 8; y++) { const i = (y * 256 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); t.anisotropy = 4;
    return t;
  }
  const fiber = fiberTexture();
  const sphereGeo = new THREE.SphereGeometry(1, 56, 40);
  const PLAIN = new THREE.Color('#c4473d'), DIM = new THREE.Color('#2a3040');

  MUSCLES.forEach(m => {
    m.cGroup = new THREE.Color(GROUPS[m.group].color);
    m.cPlain = PLAIN;
    m.mat = new THREE.MeshPhysicalMaterial({
      color: m.cGroup.clone(), roughness: 0.55, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.5,
      emissive: 0x000000
    });
    m.meshes = [];
    let ax = 0, ay = 0, az = 0, n = 0;
    let ext = 0;
    m.parts.forEach(p => {
      const mirrored = Math.abs(p.p[0]) > 1e-4 && p.mirror !== false;
      (mirrored ? [1, -1] : [1]).forEach(sgn => {
        const mesh = new THREE.Mesh(sphereGeo, m.mat);
        mesh.position.set(p.p[0] * sgn, p.p[1], p.p[2]);
        mesh.scale.set(p.s[0], p.s[1], p.s[2]);
        const r = p.r || [0, 0, 0];
        mesh.rotation.set(rad(r[0]), rad(r[1] * sgn), rad(r[2] * sgn));
        mesh.castShadow = true; mesh.receiveShadow = false;
        mesh.userData.muscle = m;
        muscleGroup.add(mesh); m.meshes.push(mesh); pickables.push(mesh);
      });
      ax += p.p[0]; ay += p.p[1]; az += p.p[2]; n++;
      ext = Math.max(ext, p.s[0] * 2, p.s[1] * 2);
    });
    m.anchor = new THREE.Vector3(ax / n, ay / n, az / n + (m.side === 'back' ? -0.03 : 0.03));
    m.extent = ext;
    m.cur = new THREE.Color().copy(m.cGroup);
  });

  /* ------------------------------------------------------------------ camera */
  let tween = null;
  const sph1 = new THREE.Spherical(), sph2 = new THREE.Spherical(), tmpV = new THREE.Vector3();

  function fitDist() {
    const t = Math.tan(rad(FOV / 2));
    return Math.max(1.0 / t, 0.58 / (t * camera.aspect)) * 1.04;
  }
  function viewDir(name) {
    return ({ front: [0, 0.06, 1], back: [0, 0.06, -1], right: [1, 0.06, 0], left: [-1, 0.06, 0] })[name];
  }
  function flyTo(pos, target, dur) {
    tween = {
      t0: performance.now(), dur: dur || 1000, ft: controls.target.clone(), tt: target.clone(),
      fs: new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)),
      ts: new THREE.Spherical().setFromVector3(pos.clone().sub(target))
    };
    let d = tween.ts.theta - tween.fs.theta;
    d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    tween.dth = d;
  }
  function goView(name, dur) {
    const d = viewDir(name); if (!d) return;
    const dir = new THREE.Vector3(...d).normalize();
    flyTo(BODY_CENTER.clone().add(dir.multiplyScalar(fitDist())), BODY_CENTER, dur);
    state.currentView = name; markViews();
  }
  function focusMuscle(m, dur) {
    const side = m.side === 'back' ? -1 : 1;
    const c = m.anchor.clone(); c.x = Math.abs(c.x) * 0.9; // focus on the +x copy
    const dist = Math.min(1.7, Math.max(0.75, m.extent * 3.1 + 0.5));
    const dir = new THREE.Vector3(0.35 * (c.x > 0.05 ? 1 : 0.4), 0.12, side).normalize();
    flyTo(c.clone().add(dir.multiplyScalar(dist)), c, dur || 900);
    state.currentView = ''; markViews();
  }
  function stepTween(now) {
    if (!tween) return;
    const k = Math.min(1, (now - tween.t0) / tween.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
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

  /* -------------------------------------------------------------- resizing */
  let viewOffsetY = 0, viewOffsetTarget = 0;
  const isMobile = () => window.matchMedia('(max-width: 820px)').matches;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* --------------------------------------------------------------- picking */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return hit && hit.object.userData.muscle ? hit.object.userData.muscle : null;
  }

  const tooltip = $('#tooltip');
  let ptr = { x: 0, y: 0, moved: false, type: 'mouse' }, down = null;

  canvas.addEventListener('pointermove', e => {
    ptr = { x: e.clientX, y: e.clientY, moved: true, type: e.pointerType };
    if (down) return;
    if (e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect();
    tooltip.style.left = (e.clientX - r.left) + 'px'; tooltip.style.top = (e.clientY - r.top) + 'px';
  });
  canvas.addEventListener('pointerleave', () => { ptr.moved = false; setHover(null); });
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t;
    down = null;
    if (Math.hypot(dx, dy) < 6 && dt < 600) onTap(pick(e.clientX, e.clientY));
  });

  function setHover(m) {
    if (state.hovered === m) return;
    state.hovered = m;
    canvas.classList.toggle('over', !!m);
    if (m && state.mode === 'explore') { tooltip.textContent = m.name; tooltip.hidden = false; }
    else tooltip.hidden = true;
  }
  function hoverTick() {
    if (!ptr.moved || down || ptr.type === 'touch') return;
    ptr.moved = false;
    setHover(pick(ptr.x, ptr.y));
  }

  function onTap(m) {
    if (state.mode === 'quiz') { if (m) answer(m); return; }
    if (m) select(m, false); else deselect();
  }

  /* ------------------------------------------------------------- selection */
  const card = $('#card');
  function select(m, fly) {
    state.selected = m;
    fillCard(m);
    card.hidden = false;
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    $$('.item').forEach(i => i.classList.toggle('active', i.dataset.id === m.id));
    const el = $('.item.active'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (fly) focusMuscle(m);
    viewOffsetTarget = isMobile() ? stage.clientHeight * 0.2 : 0;
  }
  function deselect() {
    state.selected = null; card.hidden = true;
    $$('.item.active').forEach(i => i.classList.remove('active'));
    viewOffsetTarget = 0;
  }
  function fillCard(m) {
    const c = GROUPS[m.group].color;
    card.style.setProperty('--c', c);
    $('#cBadge').textContent = m.group;
    $('#cName').textContent = m.name;
    $('#cLatin').textContent = m.latin;
    $('#cLoc').textContent = m.location;
    $('#cAct').textContent = m.action;
    $('#cOri').textContent = m.origin;
    $('#cIns').textContent = m.insertion;
    $('#cTip').textContent = m.tip;
    syncLearnBtn();
  }
  function syncLearnBtn() {
    const b = $('#learnBtn'), m = state.selected; if (!m) return;
    const l = state.learned.has(m.id);
    b.textContent = l ? '✓ Learned' : 'Mark as learned';
    b.classList.toggle('done', l);
  }
  function toggleLearned(id) {
    state.learned.has(id) ? state.learned.delete(id) : state.learned.add(id);
    persistLearned(); syncLearnBtn(); renderList(); updateProgress();
  }
  function persistLearned() { store.set('myo.learned', [...state.learned]); }
  function step(dir) {
    const list = filtered(); if (!list.length) return;
    let i = list.indexOf(state.selected);
    i = i < 0 ? 0 : (i + dir + list.length) % list.length;
    select(list[i], true);
  }
  $('#cardClose').onclick = deselect;
  $('#learnBtn').onclick = () => state.selected && toggleLearned(state.selected.id);
  $('#prevBtn').onclick = () => step(-1);
  $('#nextBtn').onclick = () => step(1);

  /* --------------------------------------------------------------- sidebar */
  const listEl = $('#list'), chipsEl = $('#chips');
  function filtered() {
    const q = state.query.trim().toLowerCase();
    return MUSCLES.filter(m =>
      (!state.group || m.group === state.group) &&
      (!q || (m.name + ' ' + m.latin + ' ' + m.group + ' ' + m.action).toLowerCase().includes(q)));
  }
  function renderChips() {
    chipsEl.innerHTML = '';
    const all = document.createElement('button');
    all.className = 'chip' + (!state.group ? ' active' : ''); all.textContent = 'All';
    all.onclick = () => { state.group = null; renderChips(); renderList(); };
    chipsEl.appendChild(all);
    Object.keys(GROUPS).forEach(g => {
      const b = document.createElement('button');
      b.className = 'chip' + (state.group === g ? ' active' : '');
      b.style.setProperty('--c', GROUPS[g].color);
      b.innerHTML = '<i></i>' + g;
      b.onclick = () => { state.group = state.group === g ? null : g; renderChips(); renderList(); };
      chipsEl.appendChild(b);
    });
  }
  function renderList() {
    const items = filtered();
    $('#count').textContent = items.length + ' muscle' + (items.length === 1 ? '' : 's');
    listEl.innerHTML = '';
    if (!items.length) { listEl.innerHTML = '<li class="empty">No muscles match your search.</li>'; return; }
    items.forEach(m => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'item' + (state.learned.has(m.id) ? ' learned' : '') + (state.selected === m ? ' active' : '');
      b.dataset.id = m.id; b.style.setProperty('--c', GROUPS[m.group].color);
      b.innerHTML = '<span class="dot"></span><span class="t"><b></b><small></small></span>' +
        '<span class="ck"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span>';
      $('b', b).textContent = m.name; $('small', b).textContent = m.group;
      b.onclick = () => { select(m, true); closeMenu(); };
      li.appendChild(b); listEl.appendChild(li);
    });
  }
  $('#search').addEventListener('input', e => { state.query = e.target.value; renderList(); });

  function updateProgress() {
    const n = state.learned.size, t = MUSCLES.length, pct = Math.round(n / t * 100);
    $('#progText').textContent = n + ' / ' + t;
    $('#progPct').textContent = pct + '%';
    $('#progRing').style.strokeDashoffset = 97.4 * (1 - n / t);
  }
  $('#resetProgress').onclick = () => {
    if (!state.learned.size || confirm('Clear all learned muscles?')) {
      state.learned.clear(); persistLearned(); renderList(); updateProgress(); syncLearnBtn();
    }
  };

  /* mobile drawer */
  const sidebar = $('#sidebar'), scrim = $('#scrim');
  function openMenu() { sidebar.classList.add('open'); scrim.classList.add('show'); }
  function closeMenu() { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
  $('#menuBtn').onclick = openMenu; $('#closeMenu').onclick = closeMenu; scrim.onclick = closeMenu;

  /* ------------------------------------------------------------- toolbar */
  $$('.toolbar [data-view]').forEach(b => b.onclick = () => goView(b.dataset.view));
  $('#resetView').onclick = () => goView('front');

  /* --------------------------------------------------------------- options */
  const optBtn = $('#displayBtn'), optPanel = $('#options');
  optBtn.onclick = () => { optPanel.hidden = !optPanel.hidden; optBtn.setAttribute('aria-expanded', String(!optPanel.hidden)); };
  document.addEventListener('pointerdown', e => {
    if (!optPanel.hidden && !e.target.closest('.display')) { optPanel.hidden = true; optBtn.setAttribute('aria-expanded', 'false'); }
  });
  $$('[data-opt]').forEach(inp => {
    inp.checked = !!state.opts[inp.dataset.opt];
    inp.onchange = () => setOpt(inp.dataset.opt, inp.checked);
  });
  function setOpt(k, v) {
    state.opts[k] = v; store.set('myo.opts', state.opts);
    const inp = $('[data-opt="' + k + '"]'); if (inp) inp.checked = v;
    applyOpts();
  }
  function applyOpts() {
    shellGroup.visible = state.opts.shell;
    controls.autoRotate = state.opts.rotate;
    $('#labels').style.display = (state.opts.labels && state.mode === 'explore') ? '' : 'none';
  }

  /* ---------------------------------------------------------------- labels */
  const labelsEl = $('#labels');
  MUSCLES.forEach(m => {
    const d = document.createElement('div');
    d.className = 'lbl'; d.textContent = m.name; d.style.setProperty('--c', GROUPS[m.group].color);
    labelsEl.appendChild(d); m.label = d;
  });
  const lblV = new THREE.Vector3();
  function updateLabels() {
    if (!state.opts.labels || state.mode !== 'explore') return;
    const w = stage.clientWidth, h = stage.clientHeight;
    const facingFront = camera.position.z - controls.target.z > 0;
    const placed = [];
    MUSCLES.forEach(m => {
      let show = (m.side === 'front') === facingFront;
      if (Math.abs(camera.position.x) > Math.abs(camera.position.z) * 1.6) show = true;   // side views show both
      if (show && state.group && m.group !== state.group) show = false;
      let x = 0, y = 0, rect = null;
      if (show) {
        lblV.copy(m.anchor); lblV.x = Math.abs(lblV.x); lblV.project(camera);
        x = (lblV.x * 0.5 + 0.5) * w; y = (-lblV.y * 0.5 + 0.5) * h;
        const lw = m.name.length * 6.4 + 26, lh = 22;
        rect = { x: x - lw / 2, y: y - lh / 2, w: lw, h: lh };
        if (lblV.z > 1 || x < 0 || x > w || y < 0 || y > h) show = false;
        else if (placed.some(p => rect.x < p.x + p.w && rect.x + rect.w > p.x && rect.y < p.y + p.h && rect.y + rect.h > p.y)) show = false;
      }
      if (show) placed.push(rect);
      m.label.classList.toggle('on', show);
      if (show) m.label.style.transform = 'translate(' + (rect.x) + 'px,' + (rect.y) + 'px)';
    });
  }

  /* ------------------------------------------------------------ materials */
  const tgt = new THREE.Color(), emT = new THREE.Color();
  const AMBER = new THREE.Color(1.0, 0.55, 0.12), WHITE = new THREE.Color(0.55, 0.6, 0.7);
  function updateMaterials(dt, now) {
    const k = 1 - Math.exp(-dt * 11);
    const quiz = state.mode === 'quiz';
    const sel = state.selected;
    const useGroup = state.opts.groupColor && !quiz;
    if (state.flash && now > state.flash.until) state.flash = null;
    MUSCLES.forEach(m => {
      tgt.copy(useGroup ? m.cGroup : m.cPlain);
      let dim = false;
      if (!quiz && state.group && m.group !== state.group) dim = true;
      if (!quiz && sel && state.opts.isolate && m !== sel) dim = true;
      if (dim) tgt.lerp(DIM, 0.78);
      emT.setRGB(0, 0, 0);
      if (!quiz && m === sel) emT.copy(AMBER).multiplyScalar(0.32);
      else if (m === state.hovered) emT.copy(WHITE).multiplyScalar(0.3);
      if (state.flash && state.flash.m === m) { tgt.copy(state.flash.c); emT.copy(state.flash.c).multiplyScalar(0.55); }
      m.mat.color.lerp(tgt, k);
      m.mat.emissive.lerp(emT, k);
    });
  }

  /* ------------------------------------------------------------------ toast */
  let toastT;
  function toast(msg, kind) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + (kind || '');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ------------------------------------------------------------------- quiz */
  const GOOD = new THREE.Color('#3ddc97'), BAD = new THREE.Color('#ff5d6c'), HINT = new THREE.Color('#ffb347');
  function flash(m, c, ms) { state.flash = { m, c, until: performance.now() + ms }; }
  function quizStats() {
    const q = state.quiz;
    $('#qStreak').textContent = q.streak; $('#qBest').textContent = q.best;
    $('#qAcc').textContent = q.asked ? Math.round(q.firstTry / q.asked * 100) + '%' : '–';
  }
  function nextQuestion() {
    const q = state.quiz;
    let pool = MUSCLES.filter(m => !q.seen.includes(m.id) && m !== q.target);
    if (!pool.length) { q.seen = []; pool = MUSCLES.filter(m => m !== q.target); }
    const unl = pool.filter(m => !state.learned.has(m.id));
    const src = unl.length && Math.random() < 0.7 ? unl : pool;
    const m = src[Math.floor(Math.random() * src.length)];
    q.target = m; q.seen.push(m.id); q.tries = 0; q.hinted = false; q.locked = false;
    $('#qTarget').textContent = m.name;
    deselect(); state.flash = null; quizStats();
  }
  function answer(m) {
    const q = state.quiz; if (q.locked || !q.target) return;
    if (m === q.target) {
      q.locked = true; q.asked++;
      const first = q.tries === 0 && !q.hinted;
      if (first) { q.firstTry++; q.streak++; if (q.streak > q.best) { q.best = q.streak; store.set('myo.best', q.best); } state.learned.add(m.id); persistLearned(); updateProgress(); renderList(); }
      else q.streak = 0;
      flash(m, GOOD, 1600);
      toast(first ? 'Correct! ✓ Marked as learned' : 'Correct — keep practising this one', 'good');
      quizStats();
      state.selected = null; select(m, false);
      setTimeout(() => { if (state.mode === 'quiz') nextQuestion(); }, 2300);
    } else {
      q.tries++; q.streak = 0; quizStats();
      flash(m, BAD, 700);
      toast('That\'s the ' + m.name + '.' + (q.tries >= 2 ? ' Need help? Tap Hint.' : ' Try again!'), 'bad');
    }
  }
  $('#hintBtn').onclick = () => {
    const q = state.quiz; if (!q.target || q.locked) return;
    q.hinted = true; focusMuscle(q.target, 900);
    setTimeout(() => flash(q.target, HINT, 1400), 700);
  };
  $('#skipBtn').onclick = () => {
    const q = state.quiz; if (!q.target || q.locked) return;
    q.locked = true; q.asked++; q.streak = 0; quizStats();
    focusMuscle(q.target, 800); flash(q.target, HINT, 2000);
    toast('That was the ' + q.target.name, 'bad');
    setTimeout(() => { if (state.mode === 'quiz') nextQuestion(); }, 2300);
  };
  $('#qRestart').onclick = () => { const q = state.quiz; Object.assign(q, { streak: 0, firstTry: 0, asked: 0, seen: [], target: null }); nextQuestion(); };
  $('#qExit').onclick = () => setMode('explore');

  /* ------------------------------------------------------------------- mode */
  const modeBtns = $$('.mode-switch button'), thumb = $('.mode-switch .thumb');
  function placeThumb() {
    const b = modeBtns.find(x => x.classList.contains('active'));
    thumb.style.width = b.offsetWidth + 'px'; thumb.style.transform = 'translateX(' + (b.offsetLeft - 4) + 'px)';
  }
  function setMode(mode) {
    state.mode = mode;
    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    placeThumb();
    const quiz = mode === 'quiz';
    $('#explorePane').hidden = quiz; $('#quizPane').hidden = !quiz; $('#banner').hidden = !quiz;
    $('.toolbar').classList.toggle('quiz-on', quiz);
    tooltip.hidden = true; state.hovered = null; state.flash = null;
    deselect();
    if (quiz) { state.quiz.target = null; goView('front', 800); nextQuestion(); }
    applyOpts();
    if (!quiz) $$('.lbl').forEach(l => l.classList.remove('on'));
  }
  modeBtns.forEach(b => b.onclick = () => { setMode(b.dataset.mode); if (b.dataset.mode === 'quiz') closeMenu(); });

  /* ------------------------------------------------------------------- help */
  const help = $('#help');
  $('#helpBtn').onclick = () => { help.hidden = false; };
  $('#helpClose').onclick = () => { help.hidden = true; };
  help.addEventListener('pointerdown', e => { if (e.target === help) help.hidden = true; });

  /* --------------------------------------------------------------- keyboard */
  window.addEventListener('keydown', e => {
    if (e.target.matches('input')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case '1': goView('front'); break; case '2': goView('right'); break;
      case '3': goView('back'); break; case '4': goView('left'); break;
      case 'r': case 'R': setOpt('rotate', !state.opts.rotate); break;
      case 'l': case 'L': setOpt('labels', !state.opts.labels); break;
      case 'Escape': help.hidden = true; deselect(); closeMenu(); break;
      case 'ArrowRight': if (state.mode === 'explore') step(1); break;
      case 'ArrowLeft': if (state.mode === 'explore') step(-1); break;
      case '?': help.hidden = false; break;
    }
  });

  /* ---------------------------------------------------------------- render */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    stepTween(now);
    controls.target.clamp(new THREE.Vector3(-0.7, 0.05, -0.7), new THREE.Vector3(0.7, 1.9, 0.7));
    controls.update();
    // mobile: nudge the model up while the bottom sheet is open
    viewOffsetY += (viewOffsetTarget - viewOffsetY) * Math.min(1, dt * 8);
    if (Math.abs(viewOffsetY) > 0.5) {
      camera.setViewOffset(stage.clientWidth, stage.clientHeight, 0, viewOffsetY, stage.clientWidth, stage.clientHeight);
    } else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    hoverTick();
    updateMaterials(dt, now);
    updateLabels();
    renderer.render(scene, camera);
  }

  /* ------------------------------------------------------------------- init */
  renderChips(); renderList(); updateProgress(); applyOpts(); markViews(); placeThumb(); quizStats();
  window.addEventListener('resize', placeThumb);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeThumb);

  // intro: start from a three-quarter back view and glide to the front
  const d0 = new THREE.Vector3(-0.8, 0.12, -1).normalize().multiplyScalar(fitDist() * 1.15);
  camera.position.copy(BODY_CENTER).add(d0);
  controls.update();
  requestAnimationFrame(t => { last = t; frame(t); });
  setTimeout(() => { $('#loader').classList.add('done'); goView('front', 2200); }, 450);

  // expose for debugging
  window.MyoAtlas = { state, select, goView, setMode };
})();
