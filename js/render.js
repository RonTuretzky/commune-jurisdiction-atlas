/* Commune Jurisdiction Atlas — globe renderer.
   Primary: three.js sphere whose texture is a choropleth painted on a 2D canvas (robust filled countries, no triangulation).
   Fallback / flat: the same painter drives a 2D canvas with d3 orthographic (no WebGL) or Natural Earth (flat) projections. */
window.GLOBE = (function () {
  const S = { mode: null, webgl: false, state: null, cb: {}, colorFn: null, labelsOn: true, scoredOn: true, selected: null, points: [], autoRotate: true, touched: false, three: null, two: null, hover: null };
  const stage = () => document.getElementById('stage');
  const D2R = Math.PI / 180;

  function latlngToVec(lat, lng, r) { const phi = (90 - lat) * D2R, th = (lng + 180) * D2R; return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); }
  function vecToLatLng(v) { const r = v.length(); const lat = 90 - Math.acos(v.y / r) / D2R; let lng = Math.atan2(v.z, -v.x) / D2R - 180; if (lng < -180) lng += 360; if (lng > 180) lng -= 360; return { lat, lng }; }

  function supportsWebGL() { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } }

  // ---------- country lookup ----------
  function countryAt(lng, lat, feats) {
    for (const f of feats) { const b = f.bbox; const inLng = b[0][0] <= b[1][0] ? (lng >= b[0][0] && lng <= b[1][0]) : (lng >= b[0][0] || lng <= b[1][0]); if (!inLng || lat < b[0][1] || lat > b[1][1]) continue; if (d3.geoContains(f, [lng, lat])) return f; }
    return null;
  }

  // ---------- shared painter ----------
  // Paints ocean, graticule, land, scored fills, borders, labels through any d3 projection.
  function paint(ctx, projection, W, H, opts) {
    const st = S.state; const path = d3.geoPath(projection, ctx);
    const feats = opts.feats || st.feats50; const topo = opts.topo || st.topo50;
    ctx.save();
    if (opts.sphere) { ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = '#0b1220'; ctx.fill(); }
    else { ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H); }
    ctx.beginPath(); path(d3.geoGraticule10()); ctx.strokeStyle = 'rgba(130,150,185,0.13)'; ctx.lineWidth = opts.scale * 1; ctx.stroke();
    for (const f of feats) { const col = S.colorFn ? S.colorFn(f.a2) : null; ctx.beginPath(); path(f); ctx.fillStyle = col || '#2c313b'; ctx.fill(); }
    ctx.beginPath(); path(topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b)); ctx.strokeStyle = 'rgba(12,16,24,0.95)'; ctx.lineWidth = opts.scale * 1.1; ctx.stroke();
    ctx.beginPath(); path(topojson.mesh(topo, topo.objects.countries, (a, b) => a === b)); ctx.strokeStyle = 'rgba(190,180,150,0.38)'; ctx.lineWidth = opts.scale * 0.9; ctx.stroke();
    if (S.selected) { const f = feats.find(x => x.a2 === S.selected); if (f) { ctx.beginPath(); path(f); ctx.strokeStyle = '#f5deb3'; ctx.lineWidth = opts.scale * 3; ctx.stroke(); } }
    if (opts.sphere) { ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = 'rgba(212,163,115,0.45)'; ctx.lineWidth = opts.scale * 1.5; ctx.stroke(); }
    if (S.labelsOn && opts.labels !== false) {
      ctx.font = `600 ${opts.labelPx}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const stream = opts.sphere ? d3.geoRotation(projection.rotate()) : null;
      for (const c of st.countries) {
        if (!S.scoredOn && !opts.allLabels) continue;
        if (opts.sphere) { const r = stream([c.lng, c.lat]); if (r[0] > 90 || r[0] < -90) { } const dist = d3.geoDistance([c.lng, c.lat], [-projection.rotate()[0], -projection.rotate()[1]]); if (dist > Math.PI / 2 - 0.05) continue; }
        const p = projection([c.lng, c.lat]); if (!p) continue;
        ctx.lineWidth = opts.labelPx * 0.22; ctx.strokeStyle = 'rgba(8,10,14,0.85)'; ctx.strokeText(c.name, p[0], p[1]); ctx.fillStyle = 'rgba(245,235,215,0.92)'; ctx.fillText(c.name, p[0], p[1]);
      }
    }
    ctx.restore();
  }

  // ---------- 3D (three.js) ----------
  function init3D() {
    const canvas = document.getElementById('gl'); const el = stage();
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 300); camera.position.set(0.3, 0.7, 4.1);
    const small = Math.max(window.innerWidth, window.innerHeight) < 1100 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    const TW = small ? 2048 : 4096, TH = TW / 2;
    const texCanvas = document.createElement('canvas'); texCanvas.width = TW; texCanvas.height = TH;
    const texture = new THREE.CanvasTexture(texCanvas); texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshBasicMaterial({ map: texture })); scene.add(sphere);
    // atmosphere (fresnel rim)
    const atm = new THREE.Mesh(new THREE.SphereGeometry(1.0, 96, 72), new THREE.ShaderMaterial({
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position * 1.16, 1.0); }',
      fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.66 - dot(vN, vec3(0.0,0.0,1.0)), 3.2); gl_FragColor = vec4(0.42, 0.62, 1.0, 1.0) * i * 0.9; }',
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false }));
    scene.add(atm);
    // stars
    const n = 1800, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = 60 + Math.random() * 40, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1); pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pos[i * 3 + 2] = r * Math.cos(ph); }
    const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xb7c4d8, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.55 })));
    // community points
    const dot = document.createElement('canvas'); dot.width = dot.height = 64; const dctx = dot.getContext('2d');
    dctx.beginPath(); dctx.arc(32, 32, 26, 0, Math.PI * 2); dctx.fillStyle = '#fff'; dctx.fill(); dctx.lineWidth = 6; dctx.strokeStyle = 'rgba(0,0,0,0.55)'; dctx.stroke();
    const dotTex = new THREE.CanvasTexture(dot);
    const ptGeo = new THREE.BufferGeometry();
    const ptMat = new THREE.PointsMaterial({ size: 0.028, sizeAttenuation: true, map: dotTex, transparent: true, alphaTest: 0.35, vertexColors: true, depthWrite: false });
    const points = new THREE.Points(ptGeo, ptMat); points.visible = false; scene.add(points);
    // selected-community marker
    const selMark = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.03, 32), new THREE.MeshBasicMaterial({ color: 0xf5deb3, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })); selMark.visible = false; scene.add(selMark);
    const controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.rotateSpeed = 0.45; controls.minDistance = 1.25; controls.maxDistance = 7; controls.enablePan = false; controls.zoomSpeed = 0.8;
    controls.autoRotate = S.autoRotate; controls.autoRotateSpeed = 0.45;
    controls.addEventListener('start', () => { S.touched = true; controls.autoRotate = false; });
    const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2();
    const T = { renderer, scene, camera, sphere, texture, texCanvas, TW, TH, points, ptGeo, controls, ray, mouse, selMark, anim: null };
    S.three = T;
    paint3D();
    // events
    let down = null;
    canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    canvas.addEventListener('pointerup', e => { if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved < 6) { const h = hit3D(e.clientX, e.clientY, true); if (S.cb.onPick) S.cb.onPick(h); } });
    let hoverRaf = null;
    canvas.addEventListener('pointermove', e => { if (hoverRaf) return; hoverRaf = requestAnimationFrame(() => { hoverRaf = null; const h = hit3D(e.clientX, e.clientY, false); if (S.cb.onHover) S.cb.onHover(h, e.clientX, e.clientY); }); });
    canvas.addEventListener('pointerleave', () => { if (S.cb.onHover) S.cb.onHover(null); });
    function loop() { T.raf = requestAnimationFrame(loop); if (S.mode !== '3d') return; const d = camera.position.length(); controls.rotateSpeed = Math.max(0.06, Math.min(0.5, 0.5 * (d - 1) / 2.2)); controls.update(); renderer.render(scene, camera); }
    loop();
  }
  function paint3D() {
    const T = S.three; if (!T) return; const ctx = T.texCanvas.getContext('2d');
    const proj = d3.geoEquirectangular().scale(T.TW / (2 * Math.PI)).translate([T.TW / 2, T.TH / 2]).precision(0.3);
    paint(ctx, proj, T.TW, T.TH, { sphere: false, scale: T.TW / 4096 * 1.6, labelPx: Math.round(T.TW / 4096 * 34) });
    T.texture.needsUpdate = true;
  }
  function hit3D(cx, cy, precise) {
    const T = S.three; const r = T.renderer.domElement.getBoundingClientRect();
    T.mouse.x = ((cx - r.left) / r.width) * 2 - 1; T.mouse.y = -((cy - r.top) / r.height) * 2 + 1;
    T.ray.setFromCamera(T.mouse, T.camera); T.ray.params.Points = { threshold: 0.0075 * T.camera.position.length() };
    const objs = [T.sphere]; if (T.points.visible) objs.push(T.points);
    const hits = T.ray.intersectObjects(objs, false); if (!hits.length) return null;
    const sh = hits.find(h => h.object === T.sphere); const ph = hits.find(h => h.object === T.points);
    if (ph && (!sh || ph.distance <= sh.distance + 0.03)) { const p = S.points[ph.index]; if (p) return { kind: 'community', ref: p.ref, lat: p.lat, lng: p.lng }; }
    if (sh) { const ll = vecToLatLng(sh.point); const f = countryAt(ll.lng, ll.lat, precise ? S.state.feats50 : S.state.feats110); return { kind: 'country', a2: f ? f.a2 : null, name: f ? f.properties.name : null, lat: ll.lat, lng: ll.lng }; }
    return null;
  }
  function setPoints3D() {
    const T = S.three; if (!T) return; const n = S.points.length;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); const c = new THREE.Color();
    S.points.forEach((p, i) => { const v = latlngToVec(p.lat, p.lng, 1.008); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; c.set(p.color); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; });
    T.ptGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); T.ptGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); T.ptGeo.computeBoundingSphere(); T.points.visible = n > 0;
  }
  function flyTo3D(lat, lng, dist) {
    const T = S.three; if (!T) return; T.controls.autoRotate = false; S.touched = true;
    const from = T.camera.position.clone(); const d0 = from.length(); const d1 = dist || Math.min(d0, 2.3);
    const a = from.clone().normalize(), b = latlngToVec(lat, lng, 1).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(a, b); const t0 = performance.now(); const dur = 900;
    if (T.anim) cancelAnimationFrame(T.anim);
    (function step() { const t = Math.min(1, (performance.now() - t0) / dur); const e = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; const qi = new THREE.Quaternion().slerp(q, e); const dir = a.clone().applyQuaternion(qi); T.camera.position.copy(dir.multiplyScalar(d0 + (d1 - d0) * e)); T.camera.lookAt(0, 0, 0); if (t < 1) T.anim = requestAnimationFrame(step); else T.anim = null; })();
  }
  function markSelected3D(lat, lng) { const T = S.three; if (!T) return; if (lat == null) { T.selMark.visible = false; return; } const v = latlngToVec(lat, lng, 1.012); T.selMark.position.copy(v); T.selMark.lookAt(v.clone().multiplyScalar(2)); T.selMark.visible = true; }

  // ---------- 2D (canvas + d3) ----------
  function init2D() {
    const canvas = document.getElementById('c2d'); const ctx = canvas.getContext('2d');
    const Z = { canvas, ctx, rot: [-20, -25], scale: 1, k: 1, tx: 0, ty: 0, proj: null, W: 0, H: 0, raf: null, timer: null };
    S.two = Z;
    function size() { const el = stage(); Z.W = el.clientWidth; Z.H = el.clientHeight; const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Z.W * dpr; canvas.height = Z.H * dpr; canvas.style.width = Z.W + 'px'; canvas.style.height = Z.H + 'px'; Z.dpr = dpr; }
    Z.size = size; size();
    function setup() {
      if (S.mode === 'flat') { Z.proj = d3.geoNaturalEarth1().fitExtent([[12, 12], [Z.W - 12, Z.H - 12]], { type: 'Sphere' }); }
      else { Z.proj = d3.geoOrthographic().rotate(Z.rot).translate([Z.W / 2, Z.H / 2]).scale((Math.min(Z.W, Z.H) / 2 - 12) * Z.scale).clipAngle(90).precision(0.5); }
    }
    Z.setup = setup;
    function draw() {
      Z.raf = null; if (S.mode !== 'flat' && S.mode !== 'ortho2d') return; setup();
      const c = ctx; c.save(); c.setTransform(Z.dpr, 0, 0, Z.dpr, 0, 0); c.clearRect(0, 0, Z.W, Z.H);
      const flat = S.mode === 'flat';
      if (flat) { c.translate(Z.tx, Z.ty); c.scale(Z.k, Z.k); }
      const sc = flat ? 1 / Z.k : 1;
      const feats = flat ? (Z.k > 2.5 ? S.state.feats50 : S.state.feats110) : (Z.scale > 1.8 ? S.state.feats50 : S.state.feats110);
      const topo = feats === S.state.feats50 ? S.state.topo50 : S.state.topo110;
      paint(c, Z.proj, Z.W, Z.H, { sphere: !flat, scale: sc, labelPx: Math.max(9, 11 * sc), feats, topo, labels: flat ? Z.k > 1.6 : Z.scale > 1.2 });
      // points
      const vis = []; const center = flat ? null : [-Z.rot[0], -Z.rot[1]];
      for (const p of S.points) { if (!flat && d3.geoDistance([p.lng, p.lat], center) > Math.PI / 2 - 0.01) continue; const q = Z.proj([p.lng, p.lat]); if (!q) continue; vis.push([q[0], q[1], p]); }
      const rad = 3.2 * sc * (flat ? 1 : Math.min(1.6, Math.sqrt(Z.scale)));
      for (const [x, y, p] of vis) { c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fillStyle = p.color; c.fill(); c.lineWidth = 0.8 * sc; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.stroke(); }
      Z.vis = vis;
      if (S.selPoint) { const q = Z.proj([S.selPoint.lng, S.selPoint.lat]); if (q && (flat || d3.geoDistance([S.selPoint.lng, S.selPoint.lat], center) < Math.PI / 2)) { c.beginPath(); c.arc(q[0], q[1], rad * 2.4, 0, Math.PI * 2); c.strokeStyle = '#f5deb3'; c.lineWidth = 2 * sc; c.stroke(); } }
      c.restore();
    }
    Z.draw = () => { if (!Z.raf) Z.raf = requestAnimationFrame(draw); };
    // interactions
    let down = null, moved = false;
    const toMap = (cx, cy) => { const r = canvas.getBoundingClientRect(); let x = cx - r.left, y = cy - r.top; if (S.mode === 'flat') { x = (x - Z.tx) / Z.k; y = (y - Z.ty) / Z.k; } return [x, y]; };
    function hitAt(cx, cy, precise) {
      const [x, y] = toMap(cx, cy); const flat = S.mode === 'flat';
      const tol = (flat ? 7 / Z.k : 7); let best = null, bd = tol * tol;
      for (const [px, py, p] of (Z.vis || [])) { const d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = p; } }
      if (best) return { kind: 'community', ref: best.ref, lat: best.lat, lng: best.lng };
      const ll = Z.proj.invert && Z.proj.invert([x, y]); if (!ll || !isFinite(ll[0])) return null;
      if (!flat) { const q = Z.proj(ll); if (!q || Math.hypot(q[0] - x, q[1] - y) > 1) return null; }
      const f = countryAt(ll[0], ll[1], precise ? S.state.feats50 : S.state.feats110);
      return { kind: 'country', a2: f ? f.a2 : null, name: f ? f.properties.name : null, lat: ll[1], lng: ll[0] };
    }
    canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY, Z.rot[0], Z.rot[1], Z.tx, Z.ty]; moved = false; canvas.setPointerCapture(e.pointerId); S.touched = true; });
    canvas.addEventListener('pointermove', e => {
      if (down) { const dx = e.clientX - down[0], dy = e.clientY - down[1]; if (Math.hypot(dx, dy) > 3) moved = true; if (S.mode === 'flat') { Z.tx = down[4] + dx; Z.ty = down[5] + dy; } else { const k = 0.25 / Z.scale; Z.rot = [down[2] + dx * k, Math.max(-90, Math.min(90, down[3] - dy * k))]; } Z.draw(); return; }
      const h = hitAt(e.clientX, e.clientY, false); if (S.cb.onHover) S.cb.onHover(h, e.clientX, e.clientY);
    });
    canvas.addEventListener('pointerup', e => { if (down && !moved) { const h = hitAt(e.clientX, e.clientY, true); if (S.cb.onPick) S.cb.onPick(h); } down = null; });
    canvas.addEventListener('pointerleave', () => { if (S.cb.onHover) S.cb.onHover(null); });
    canvas.addEventListener('wheel', e => { e.preventDefault(); S.touched = true; const f = Math.exp(-e.deltaY * 0.0012); zoom2D(f, e.clientX, e.clientY); }, { passive: false });
    // auto-rotate
    function tick() { if ((S.mode === 'ortho2d') && S.autoRotate && !S.touched) { Z.rot[0] += 0.12; Z.draw(); } Z.timer = requestAnimationFrame(tick); }
    tick();
  }
  function zoom2D(f, cx, cy) {
    const Z = S.two; if (!Z) return;
    if (S.mode === 'flat') { const r = Z.canvas.getBoundingClientRect(); const x = cx != null ? cx - r.left : Z.W / 2, y = cy != null ? cy - r.top : Z.H / 2; const k2 = Math.max(1, Math.min(10, Z.k * f)); const ff = k2 / Z.k; Z.tx = x - (x - Z.tx) * ff; Z.ty = y - (y - Z.ty) * ff; Z.k = k2; if (Z.k === 1) { Z.tx = 0; Z.ty = 0; } }
    else { Z.scale = Math.max(0.6, Math.min(8, Z.scale * f)); }
    Z.draw();
  }
  function flyTo2D(lat, lng) { const Z = S.two; if (!Z) return; S.touched = true; if (S.mode === 'flat') { Z.k = Math.max(Z.k, 3); Z.setup(); const p = Z.proj([lng, lat]); Z.tx = Z.W / 2 - p[0] * Z.k; Z.ty = Z.H / 2 - p[1] * Z.k; Z.draw(); return; }
    const from = [Z.rot[0], Z.rot[1]], to = [-lng, -lat]; const t0 = performance.now(); let d0 = to[0] - from[0]; d0 = ((d0 + 540) % 360) - 180; const sTo = Math.max(Z.scale, 1.8), s0 = Z.scale;
    (function step() { const t = Math.min(1, (performance.now() - t0) / 800); const e = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; Z.rot = [from[0] + d0 * e, from[1] + (to[1] - from[1]) * e]; Z.scale = s0 + (sTo - s0) * e; Z.draw(); if (t < 1) requestAnimationFrame(step); })();
  }

  // ---------- public API ----------
  function init(state, cb) {
    S.state = state; S.cb = cb || {}; S.webgl = supportsWebGL();
    init2D();
    if (S.webgl) { try { init3D(); } catch (e) { console.warn('3D init failed, falling back to 2D', e); S.webgl = false; } }
    setMode(S.webgl ? '3d' : 'ortho2d');
    const ro = new ResizeObserver(() => resize()); ro.observe(stage());
    return S.webgl;
  }
  function setMode(m) {
    if (m === '3d' && !S.webgl) m = 'ortho2d';
    S.mode = m; const el = stage(); el.classList.toggle('flat', m === 'flat'); el.classList.toggle('ortho2d', m === 'ortho2d');
    if (m === '3d') { resize(); paint3D(); setPoints3D(); } else { S.two.size(); S.two.draw(); }
  }
  function resize() { const el = stage(); const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return; if (S.three) { S.three.camera.aspect = W / H; S.three.camera.updateProjectionMatrix(); S.three.renderer.setSize(W, H, false); } if (S.two) { S.two.size(); S.two.draw(); } }
  function recolor(colorFn, opts) { S.colorFn = colorFn; if (opts) { if (opts.labels != null) S.labelsOn = opts.labels; if (opts.scored != null) S.scoredOn = opts.scored; } if (S.mode === '3d') paint3D(); else if (S.two) S.two.draw(); }
  function setPoints(list) { S.points = list || []; if (S.three) setPoints3D(); if (S.two) S.two.draw(); }
  function flyTo(lat, lng, dist) { if (S.mode === '3d') flyTo3D(lat, lng, dist); else flyTo2D(lat, lng); }
  function select(a2, point) { S.selected = a2 || null; S.selPoint = point || null; if (S.mode === '3d') { paint3D(); markSelected3D(point ? point.lat : null, point ? point.lng : null); } else if (S.two) S.two.draw(); }
  function zoomBy(f) { if (S.mode === '3d') { const T = S.three; const d = T.camera.position.length(); const nd = Math.max(T.controls.minDistance, Math.min(T.controls.maxDistance, d / f)); T.camera.position.multiplyScalar(nd / d); S.touched = true; T.controls.autoRotate = false; } else zoom2D(f); }
  function reset() { if (S.mode === '3d') { const T = S.three; T.camera.position.set(0.3, 0.7, 4.1); T.camera.lookAt(0, 0, 0); T.controls.autoRotate = S.autoRotate; S.touched = false; } else { const Z = S.two; Z.rot = [-20, -25]; Z.scale = 1; Z.k = 1; Z.tx = 0; Z.ty = 0; S.touched = false; Z.draw(); } }
  function setAutoRotate(on) { S.autoRotate = on; if (S.three) S.three.controls.autoRotate = on && !S.touched; if (on) S.touched = false; }
  function mode() { return S.mode; }
  return { init, setMode, mode, recolor, setPoints, flyTo, select, zoomBy, reset, setAutoRotate, resize, supportsWebGL, countryAt: (lng, lat) => countryAt(lng, lat, S.state.feats50) };
})();
