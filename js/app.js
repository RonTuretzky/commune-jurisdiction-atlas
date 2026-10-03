/* Commune Jurisdiction Atlas — application state, URL state, event wiring. */
(async function () {
  const A = ATLAS, G = GLOBE, U = UI; const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const V = { view: 'globe', metric: 'comp', sel: null, selCm: null, fams: new Set(Object.keys(A.FAMILIES)), historic: false, comms: true, scored: true, rotate: true, mode: '3d', compare: [], tblSort: { key: 'comp', dir: -1 }, cmSort: { key: 'name', dir: 1 }, cmPage: 1 };
  let ST; try { ST = await A.load(); } catch (e) { $('#loading').innerHTML = `<span style="color:var(--bad)">Could not load data: ${A.esc(e.message)}</span>`; console.error(e); return; }
  U.init(ST); window.__ST = ST;

  // ---------- URL state ----------
  function readHash() {
    const h = new URLSearchParams(location.hash.replace(/^#/, '')); const w = h.get('w');
    if (h.get('view')) V.view = h.get('view'); if (h.get('m') && A.METRICS[h.get('m')]) V.metric = h.get('m');
    if (w && /^\d{6}$/.test(w)) A.LENSES.forEach((l, i) => ST.weights[l] = +w[i]);
    if (h.get('sel') && ST.byIso[h.get('sel')]) V.sel = h.get('sel'); if (h.get('cm')) { const cm = ST.communities.find(x => x.id === h.get('cm')); if (cm) V.selCm = cm; }
    if (h.get('fam')) V.fams = new Set(h.get('fam').split(',').filter(f => A.FAMILIES[f])); if (h.get('hist') === '1') V.historic = true;
    if (h.get('mode')) V.mode = h.get('mode'); if (h.get('cmp')) V.compare = h.get('cmp').split(',').filter(i => ST.byIso[i]).slice(0, 4);
    if (h.get('comms') === '0') V.comms = false;
    if (h.get('embed') === '1') { V.embed = true; document.body.classList.add('embed'); }
  }
  let hashLock = false;
  function writeHash() {
    const h = new URLSearchParams(); h.set('view', V.view); if (V.metric !== 'comp') h.set('m', V.metric); const w = A.LENSES.map(l => ST.weights[l]).join(''); if (w !== A.LENSES.map(l => A.DEFAULT_WEIGHTS[l]).join('')) h.set('w', w);
    if (V.sel) h.set('sel', V.sel); if (V.selCm) h.set('cm', V.selCm.id); if (V.fams.size !== Object.keys(A.FAMILIES).length) h.set('fam', [...V.fams].join(',')); if (V.historic) h.set('hist', '1'); if (!V.comms) h.set('comms', '0');
    if (V.mode !== '3d') h.set('mode', V.mode); if (V.compare.length) h.set('cmp', V.compare.join(','));
    hashLock = true; history.replaceState(null, '', '#' + h.toString()); setTimeout(() => hashLock = false, 50);
  }
  readHash();

  // ---------- globe ----------
  let scale = A.metricScale(V.metric, ST);
  const scoredSet = new Set(ST.countries.map(c => c.iso));
  function colorFn(a2) {
    if (!a2) return null;
    if (V.metric === 'density') { const n = ST.densityAll[a2] || 0; return n ? scale.color(n) : '#232833'; }
    if (!V.scored || !scoredSet.has(a2)) return null;
    return scale.color(scale.value(ST.byIso[a2]));
  }
  function pointList() {
    if (!V.comms) return [];
    return ST.communities.filter(cm => V.fams.has(cm.fam) && (V.historic || (cm.status !== 'historic' && cm.fam !== 'historic'))).map(cm => ({ lat: cm.lat, lng: cm.lng, color: A.commColor(cm), ref: cm }));
  }
  const webgl = G.init(ST, { onPick: pick, onHover: hover });
  if (!webgl) { $('#stage-note').textContent = 'WebGL is off in this browser — showing the 2D globe (same data, drag to spin).'; $('#stage-note').classList.add('warn'); V.mode = V.mode === 'flat' ? 'flat' : 'ortho2d'; }
  G.setMode(V.mode === 'flat' ? 'flat' : (webgl ? '3d' : 'ortho2d'));
  $('#mode-3d').classList.toggle('on', V.mode !== 'flat'); $('#mode-flat').classList.toggle('on', V.mode === 'flat');
  G.setAutoRotate(V.rotate);
  function recolor() { scale = A.metricScale(V.metric, ST); G.recolor(colorFn, { scored: V.scored, labels: true }); legend(); ranked(); fitTop(); }
  function repoints() { G.setPoints(pointList()); $('#comm-count').textContent = pointList().length.toLocaleString(); }
  function legend() {
    $('#legend-title').textContent = scale.label; $('#metric-help').textContent = scale.help || '';
    const lo = scale.invert ? scale.hi : scale.lo, hi = scale.invert ? scale.lo : scale.hi;
    $('#legend-lo').textContent = scale.fmt ? scale.fmt(lo) : lo; $('#legend-hi').textContent = scale.fmt ? scale.fmt(hi) : hi;
    const lt = $('#legend-types'); if (V.comms) { lt.hidden = false; lt.innerHTML = [...V.fams].map(f => `<span style="--c:${A.FAMILIES[f].color}"><i></i>${A.esc(A.FAMILIES[f].label.split(' (')[0].split(',')[0])}</span>`).join(''); } else lt.hidden = true;
  }
  function ranked() {
    const rows = ST.countries.map(c => ({ c, v: scale.value(c) })).filter(r => r.v != null).sort((a, b) => scale.invert ? a.v - b.v : b.v - a.v);
    $('#ranked').innerHTML = rows.slice(0, 50).map(r => `<li data-iso="${r.c.iso}" class="${V.sel === r.c.iso ? 'sel' : ''}"><span class="sw" style="background:${scale.color(r.v)}"></span>${A.esc(r.c.name)}<span class="val">${scale.fmt ? scale.fmt(r.v) : r.v}</span></li>`).join('');
    $('#ranked-note').textContent = V.metric === 'density' ? 'scored jurisdictions only' : '';
  }
  function fitTop() {
    const rows = ST.countries.map(c => ({ c, f: A.fit(c, ST.weights) })).sort((a, b) => b.f - a.f); const t = rows[0];
    $('#fit-top').innerHTML = `<div class="top1">Your #1 match → <b>${A.flag(t.c.iso)} ${A.esc(t.c.name)}</b> <span class="pct">${t.f}%</span><div class="tiny">${A.esc(t.c.verdict)}</div></div><div class="rest">${rows.slice(1, 7).map(r => `<span data-iso="${r.c.iso}">${A.esc(r.c.name)} ${r.f}%</span>`).join('')}</div>`;
  }

  // ---------- selection / detail ----------
  const detail = $('#detail');
  function openCountry(iso, fly) {
    const c = ST.byIso[iso]; if (!c) return; V.sel = iso; V.selCm = null; detail.innerHTML = U.countryCard(c); detail.scrollTop = 0; wireCard(c);
    G.select(iso, null); if (fly) G.flyTo(c.lat, c.lng); $('#view-globe').classList.remove('right-closed'); ranked(); writeHash();
  }
  function openCommunity(cm, fly) {
    V.selCm = cm; V.sel = null; detail.innerHTML = U.communityCard(cm); detail.scrollTop = 0; wireCard(null, cm);
    G.select(cm.country && scoredSet.has(cm.country) ? cm.country : null, { lat: cm.lat, lng: cm.lng }); if (fly) G.flyTo(cm.lat, cm.lng, 1.7); $('#view-globe').classList.remove('right-closed'); writeHash();
  }
  function wireCard(c, cm) {
    detail.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { detail.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b)); detail.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === b.dataset.tab)); });
    detail.querySelectorAll('[data-act]').forEach(a => a.onclick = e => { e.preventDefault(); const act = a.dataset.act; if (act === 'fly') { if (c) G.flyTo(c.lat, c.lng); else G.flyTo(cm.lat, cm.lng, 1.7); } else if (act === 'share') share(); else if (act === 'compare' && c) { addCompare(c.iso); showView('compare'); } else if (act === 'table' && c) { showView('table'); const tr = $(`#tbl tr[data-id="${c.iso}"]`); if (tr) tr.scrollIntoView({ block: 'center' }); } else if (act === 'country') openCountry(a.dataset.iso, true); });
    detail.querySelectorAll('.scores .sc').forEach(s => s.onclick = () => { setMetric(s.dataset.lens); });
    detail.querySelectorAll('.dims button').forEach(b => b.onclick = () => { const w = detail.querySelector('[data-why]'); const on = b.classList.contains('on'); detail.querySelectorAll('.dims button').forEach(x => x.classList.remove('on')); if (on) { w.hidden = true; return; } b.classList.add('on'); w.hidden = false; const d = b.dataset.dim; w.innerHTML = `<b>${A.esc(A.STAB_LABEL[d])} ${c.stab6 ? c.stab6[d] : '—'}/100</b> — ${A.esc(c.stabWhy && c.stabWhy[d] || 'no note')}`; });
    detail.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => { const x = ST.communities.find(z => z.id === b.dataset.cm); if (x) openCommunity(x, true); });
  }
  function pick(h) {
    if (!h) return; if (h.kind === 'community') { openCommunity(h.ref, false); return; }
    if (h.a2 && scoredSet.has(h.a2)) openCountry(h.a2, false);
    else if (h.a2) { V.sel = null; V.selCm = null; G.select(null, null); const n = ST.densityAll[h.a2] || 0; const nm = ST.a2name[h.a2] || h.name || h.a2; detail.innerHTML = `<div class="card"><div class="crumbs"><span class="flag">${A.flag(h.a2)}</span><span>not a scored jurisdiction</span></div><h2>${A.esc(nm)}</h2><p class="verdict">${n ? `${n} intentional communit${n === 1 ? 'y' : 'ies'} mapped here.` : 'No communities mapped here yet.'}</p>${n ? `<div class="comm-list">${ST.communities.filter(x => x.country === h.a2).slice(0, 80).map(x => `<button data-cm="${A.esc(x.id)}" style="--c:${A.commColor(x)}"><i></i><span><b>${A.esc(x.name)}</b><small>${A.esc(A.typeLabel(x.type))}${x.founded ? ' · est. ' + x.founded : ''}</small></span></button>`).join('')}</div>` : ''}<p class="tiny" style="margin-top:12px">The 50 scored jurisdictions were chosen for the intersection of cheap or depopulating land, viable visas, quality of life and stability — plus a few instructive contrasts. See Method.</p></div>`; wireCard(null, null); writeHash(); }
  }
  const tip = $('#tooltip');
  function hover(h, x, y) {
    if (!h || (!h.a2 && h.kind === 'country')) { tip.hidden = true; return; }
    const r = $('#stage').getBoundingClientRect(); tip.style.left = Math.min(x - r.left + 14, r.width - 270) + 'px'; tip.style.top = Math.min(y - r.top + 14, r.height - 70) + 'px'; tip.hidden = false;
    if (h.kind === 'community') { const cm = h.ref; tip.innerHTML = `<b>${A.esc(cm.name)}</b><small>${A.esc(A.typeLabel(cm.type))} · ${A.esc(cm.countryLabel || ST.a2name[cm.country] || '')}${cm.founded ? ' · ' + cm.founded : ''}</small>`; return; }
    const c = ST.byIso[h.a2]; if (c) { const v = scale.value(c); tip.innerHTML = `<b>${A.flag(c.iso)} ${A.esc(c.name)}</b><span class="tv">${v == null ? 'no data' : (scale.fmt ? scale.fmt(v) : v)} · ${A.esc(scale.label)}</span><small>${A.esc(c.verdict.slice(0, 110))}${c.verdict.length > 110 ? '…' : ''}</small>`; }
    else { const n = ST.densityAll[h.a2] || 0; tip.innerHTML = `<b>${A.flag(h.a2)} ${A.esc(ST.a2name[h.a2] || h.name || h.a2)}</b><small>not scored · ${n} communit${n === 1 ? 'y' : 'ies'} mapped</small>`; }
  }

  // ---------- controls ----------
  function setMetric(m) { V.metric = m; $('#metric').value = m; recolor(); writeHash(); }
  $('#metric').value = V.metric; $('#metric').onchange = e => setMetric(e.target.value);
  $$('#weights input[type=range]').forEach(inp => { inp.value = ST.weights[inp.dataset.lens]; inp.nextElementSibling.textContent = inp.value; inp.oninput = () => { ST.weights[inp.dataset.lens] = +inp.value; inp.nextElementSibling.textContent = inp.value; if (V.metric !== 'fit') { V.metric = 'fit'; $('#metric').value = 'fit'; } recolorDebounced(); writeHash(); }; });
  let rt = null; function recolorDebounced() { fitTop(); if (rt) return; rt = setTimeout(() => { rt = null; recolor(); }, 90); }
  function applyWeights(w) { Object.assign(ST.weights, w); $$('#weights input[type=range]').forEach(inp => { inp.value = ST.weights[inp.dataset.lens]; inp.nextElementSibling.textContent = inp.value; }); setMetric('fit'); }
  $$('.presets button').forEach(b => b.onclick = () => applyWeights(A.PRESETS[b.dataset.p]));
  $('#w-reset').onclick = () => { applyWeights(A.DEFAULT_WEIGHTS); setMetric('comp'); };
  $('#fit-top').addEventListener('click', e => { const s = e.target.closest('[data-iso]'); if (s) openCountry(s.dataset.iso, true); });
  $('#ranked').addEventListener('click', e => { const li = e.target.closest('li[data-iso]'); if (li) openCountry(li.dataset.iso, true); });
  // layers
  $('#ly-scored').checked = V.scored; $('#ly-scored').onchange = e => { V.scored = e.target.checked; recolor(); };
  $('#ly-comms').checked = V.comms; $('#ly-comms').onchange = e => { V.comms = e.target.checked; repoints(); legend(); writeHash(); };
  $('#ly-historic').checked = V.historic; $('#ly-historic').onchange = e => { V.historic = e.target.checked; repoints(); writeHash(); };
  $('#ly-rotate').checked = V.rotate; $('#ly-rotate').onchange = e => { V.rotate = e.target.checked; G.setAutoRotate(V.rotate); };
  const tf = $('#type-filters'); tf.innerHTML = Object.keys(A.FAMILIES).map(f => `<button data-fam="${f}" style="--c:${A.FAMILIES[f].color}" class="${V.fams.has(f) ? 'on' : ''}"><i></i>${A.esc(A.FAMILIES[f].label.split(' (')[0].split(' &')[0].split(',')[0])}</button>`).join('');
  tf.querySelectorAll('button').forEach(b => b.onclick = () => { const f = b.dataset.fam; if (V.fams.has(f)) V.fams.delete(f); else V.fams.add(f); b.classList.toggle('on', V.fams.has(f)); repoints(); legend(); writeHash(); });
  // stage tools
  $('#mode-3d').onclick = () => { V.mode = webgl ? '3d' : 'ortho2d'; G.setMode(V.mode); $('#mode-3d').classList.add('on'); $('#mode-flat').classList.remove('on'); writeHash(); };
  $('#mode-flat').onclick = () => { V.mode = 'flat'; G.setMode('flat'); $('#mode-flat').classList.add('on'); $('#mode-3d').classList.remove('on'); writeHash(); };
  $('#zoom-in').onclick = () => G.zoomBy(1.35); $('#zoom-out').onclick = () => G.zoomBy(1 / 1.35); $('#reset-view').onclick = () => G.reset();
  $('#left-toggle').onclick = () => $('#view-globe').classList.toggle('left-closed'); $('#right-toggle').onclick = () => $('#view-globe').classList.toggle('right-closed');
  if (window.innerWidth < 980 || V.embed) { $('#view-globe').classList.add('left-closed', 'right-closed'); }
  if (V.embed) { const a = document.createElement('a'); a.href = location.href.replace(/([&#])embed=1&?/, '$1').replace(/[&#]$/, ''); a.target = '_blank'; a.rel = 'noopener'; a.id = 'embed-open'; a.textContent = 'open full atlas ↗'; $('#stage').appendChild(a); }
  if (V.embed) writeHash = (function (orig) { return function () { orig(); if (!/embed=1/.test(location.hash)) history.replaceState(null, '', location.hash + (location.hash.length > 1 ? '&' : '#') + 'embed=1'); }; })(writeHash);
  // search
  const sr = $('#search-results');
  $('#search').oninput = e => {
    const q = e.target.value.trim().toLowerCase(); if (q.length < 2) { sr.innerHTML = ''; return; }
    const cs = ST.countries.filter(c => c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q).slice(0, 6);
    const cms = ST.communities.filter(cm => cm.name.toLowerCase().includes(q) || (cm.countryLabel || '').toLowerCase().includes(q) && q.length > 3 || A.typeLabel(cm.type).toLowerCase().includes(q) && q.length > 4).slice(0, 14);
    sr.innerHTML = cs.map(c => `<button data-iso="${c.iso}" style="--c:${A.viridis(c.comp / 18)}"><i></i>${A.flag(c.iso)} ${A.esc(c.name)}<small>jurisdiction · ${c.comp}/18</small></button>`).join('') + cms.map(cm => `<button data-cm="${A.esc(cm.id)}" style="--c:${A.commColor(cm)}"><i></i>${A.esc(cm.name)}<small>${A.esc(A.typeLabel(cm.type))} · ${A.esc(cm.countryLabel || ST.a2name[cm.country] || '')}</small></button>`).join('') || '<p class="tiny">nothing found</p>';
    sr.querySelectorAll('button').forEach(b => b.onclick = () => { if (b.dataset.iso) openCountry(b.dataset.iso, true); else { const cm = ST.communities.find(x => x.id === b.dataset.cm); if (cm) openCommunity(cm, true); } if (window.innerWidth < 980) $('#view-globe').classList.add('left-closed'); });
  };
  // nav / views
  function showView(name) { V.view = name; $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.view === name)); $$('.view').forEach(v => v.classList.toggle('on', v.id === 'view-' + name)); $('#nav').classList.remove('open'); if (name === 'globe') setTimeout(() => G.resize(), 30); if (name === 'table') renderTable(); if (name === 'communities') renderComms(); if (name === 'compare') renderCompare(); if (name === 'method') renderMethod(); writeHash(); }
  $$('#nav button').forEach(b => b.onclick = () => showView(b.dataset.view)); $('#brand').onclick = e => { e.preventDefault(); showView('globe'); };
  $('#nav-toggle').onclick = () => { $('#nav').classList.toggle('open'); };
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => t.hidden = true, 2200); }
  function share() { writeHash(); const u = location.href; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Link copied — it reproduces exactly this view'), () => { prompt('Copy this link', u); }); }
  $('#btn-share').onclick = share;

  // ---------- table view ----------
  function renderTable() {
    const sel = $('#tbl-region'); if (sel.options.length === 1) [...new Set(ST.countries.map(c => c.region))].sort().forEach(r => sel.add(new Option(r, r)));
    const q = $('#tbl-search').value.trim().toLowerCase(), reg = sel.value, own = $('#tbl-own').value;
    const rows = ST.countries.filter(c => (!q || (c.name + ' ' + c.verdict + ' ' + c.region + ' ' + c.archetype).toLowerCase().includes(q)) && (!reg || c.region === reg) && (!own || c.land.ownership === own)).map(c => Object.assign(Object.create(c), { __id: c.iso }));
    U.table($('#tbl'), rows, U.COUNTRY_COLS, V.tblSort, iso => { showView('globe'); openCountry(iso, true); });
  }
  ['#tbl-search', '#tbl-region', '#tbl-own'].forEach(s => $(s).addEventListener('input', renderTable));
  $('#tbl-csv').onclick = () => A.download('commune-atlas-jurisdictions.csv', A.toCSV(ST.countries, U.COUNTRY_COLS.concat([{ key: 'lat', label: 'lat', get: c => c.lat }, { key: 'lng', label: 'lng', get: c => c.lng }, { key: 'src', label: 'sources', get: c => (c.sources || []).join(' ') }])), 'text/csv');
  $('#tbl-json').onclick = () => A.download('commune-atlas-jurisdictions.json', JSON.stringify(ST.countries.map(c => { const o = Object.assign({}, c); delete o.communities; return o; }), null, 1), 'application/json');

  // ---------- communities view ----------
  const PAGE = 150;
  function commFilter() {
    const q = $('#cm-search').value.trim().toLowerCase(), co = $('#cm-country').value, ty = $('#cm-type').value, stt = $('#cm-status').value;
    return ST.communities.filter(cm => (!q || (cm.name + ' ' + (cm.description || '') + ' ' + (cm.admin || '') + ' ' + (cm.countryLabel || '')).toLowerCase().includes(q)) && (!co || cm.country === co) && (!ty || cm.type === ty) && (!stt || cm.status === stt));
  }
  function renderComms() {
    const cs = $('#cm-country'); if (cs.options.length === 1) { const cnt = {}; ST.communities.forEach(cm => { if (cm.country) cnt[cm.country] = (cnt[cm.country] || 0) + 1; }); Object.keys(cnt).map(k => [k, ST.a2name[k] || k, cnt[k]]).sort((a, b) => a[1].localeCompare(b[1])).forEach(([k, nm, n]) => cs.add(new Option(`${nm} (${n})`, k))); }
    const ts = $('#cm-type'); if (ts.options.length === 1) { const cnt = {}; ST.communities.forEach(cm => cnt[cm.type] = (cnt[cm.type] || 0) + 1); Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).forEach(t => ts.add(new Option(`${A.typeLabel(t)} (${cnt[t]})`, t))); }
    const rows = commFilter(); const sortKey = $('#cm-sort').value; V.cmSort.key = sortKey; V.cmSort.dir = sortKey === 'founded' || sortKey === 'population' ? -1 : 1;
    const shown = rows.slice(0, PAGE * V.cmPage).map(cm => Object.assign(Object.create(cm), { __id: cm.id }));
    U.table($('#cm-tbl'), shown, U.COMM_COLS, V.cmSort, id => { const cm = ST.communities.find(x => x.id === id); if (cm) { showView('globe'); openCommunity(cm, true); } });
    $('#cm-total').textContent = ST.communities.length.toLocaleString(); $('#cm-shown').textContent = `showing ${Math.min(shown.length, rows.length)} of ${rows.length}`; $('#cm-more').disabled = shown.length >= rows.length;
    const fams = {}; rows.forEach(cm => fams[cm.fam] = (fams[cm.fam] || 0) + 1); const countries = new Set(rows.map(r => r.country).filter(Boolean)).size;
    $('#cm-stats').innerHTML = `<div class="st"><b>${rows.length.toLocaleString()}</b><small>communities</small></div><div class="st"><b>${countries}</b><small>countries</small></div>` + Object.keys(A.FAMILIES).filter(f => fams[f]).map(f => `<div class="st" style="border-color:${A.FAMILIES[f].color}"><b>${fams[f]}</b><small>${A.esc(A.FAMILIES[f].label.split(' (')[0].split(',')[0])}</small></div>`).join('');
  }
  ['#cm-search', '#cm-country', '#cm-type', '#cm-status', '#cm-sort'].forEach(s => $(s).addEventListener('input', () => { V.cmPage = 1; renderComms(); }));
  $('#cm-more').onclick = () => { V.cmPage++; renderComms(); };
  const CM_EXPORT = [{ key: 'id', label: 'id', get: c => c.id }, { key: 'name', label: 'name', get: c => c.name }, { key: 'type', label: 'type', get: c => c.type }, { key: 'country', label: 'country', get: c => c.country }, { key: 'admin', label: 'admin', get: c => c.admin }, { key: 'lat', label: 'lat', get: c => c.lat }, { key: 'lng', label: 'lng', get: c => c.lng }, { key: 'founded', label: 'founded', get: c => c.founded }, { key: 'status', label: 'status', get: c => c.status }, { key: 'population', label: 'population', get: c => c.population }, { key: 'economy', label: 'economy', get: c => c.economy }, { key: 'land_tenure', label: 'land_tenure', get: c => c.land_tenure }, { key: 'description', label: 'description', get: c => c.description }, { key: 'website', label: 'website', get: c => c.website }, { key: 'sources', label: 'sources', get: c => (c.sources || []).join(' ') }, { key: 'origin', label: 'origin', get: c => c.origin }];
  $('#cm-csv').onclick = () => A.download('commune-atlas-communities.csv', A.toCSV(commFilter(), CM_EXPORT), 'text/csv');
  $('#cm-json').onclick = () => A.download('commune-atlas-communities.json', JSON.stringify(commFilter().map(c => { const o = Object.assign({}, c); delete o._i; delete o.fam; return o; }), null, 1), 'application/json');

  // ---------- compare view ----------
  function addCompare(iso) { if (!V.compare.includes(iso)) { V.compare.push(iso); if (V.compare.length > 4) V.compare.shift(); } }
  function renderCompare() {
    if (!V.compare.length) V.compare = ['PY', 'UY', 'ES', 'GE'].filter(i => ST.byIso[i]);
    const pk = $('#cmp-pickers'); pk.innerHTML = [0, 1, 2, 3].map(i => `<select data-i="${i}"><option value="">— pick a jurisdiction —</option>${ST.countries.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.iso}" ${V.compare[i] === c.iso ? 'selected' : ''}>${A.esc(c.name)} (${c.comp}/18)</option>`).join('')}</select>`).join('');
    pk.querySelectorAll('select').forEach(s => s.onchange = () => { V.compare = [...pk.querySelectorAll('select')].map(x => x.value).filter(Boolean); writeHash(); U.compare(V.compare); });
    U.compare(V.compare);
  }

  // ---------- method view ----------
  let methodDone = false;
  function renderMethod() {
    if (methodDone) return; methodDone = true;
    $('#scenario-table').innerHTML = `<thead><tr><th>Scenario</th>${A.STAB_DIMS.map(d => `<th>${A.esc(A.STAB_LABEL[d])}</th>`).join('')}</tr></thead><tbody>${Object.keys(A.SCENARIOS).map(k => `<tr><td><b>${A.esc(A.SCENARIO_LABEL[k])}</b></td>${A.SCENARIOS[k].map(w => `<td>×${w}</td>`).join('')}</tr>`).join('')}</tbody>`;
    const m = ST.meta; const fams = {}; ST.communities.forEach(c => fams[c.fam] = (fams[c.fam] || 0) + 1);
    $('#src-stats').innerHTML = `<div class="st"><b>${m.countries}</b><small>jurisdictions</small></div><div class="st"><b>${m.researched}</b><small>researched Oct 2026</small></div><div class="st"><b>${m.verified}</b><small>fact-checked</small></div><div class="st"><b>${ST.communities.length.toLocaleString()}</b><small>communities</small></div><div class="st"><b>${m.communityCountries}</b><small>countries with communities</small></div><div class="st"><b>${ST.sources.length.toLocaleString()}</b><small>source URLs</small></div><div class="st"><b>${A.esc(m.built)}</b><small>data built</small></div>`;
    $('#src-count').textContent = ST.sources.length.toLocaleString();
    const by = {}; ST.sources.forEach(s => (by[s.host] = by[s.host] || []).push(s));
    const list = $('#sources-list');
    function draw(q) { const hosts = Object.keys(by).sort(); list.innerHTML = hosts.map(h => { const items = by[h].filter(s => !q || s.url.toLowerCase().includes(q) || h.includes(q)); if (!items.length) return ''; return `<details ${q ? 'open' : ''}><summary><b>${A.esc(h)}</b><small>${items.length} link${items.length > 1 ? 's' : ''}</small></summary><ul>${items.map(s => `<li><a href="${A.esc(s.url)}" target="_blank" rel="noopener">${A.esc(s.url)}</a>${s.countries.length ? `<small>${s.countries.join(', ')}</small>` : ''}${s.communities ? `<small>${s.communities} communit${s.communities === 1 ? 'y' : 'ies'}</small>` : ''}</li>`).join('')}</ul></details>`; }).join(''); }
    draw(''); $('#src-filter').oninput = e => draw(e.target.value.trim().toLowerCase());
  }
  $('#data-note').innerHTML = `Data built ${A.esc(ST.meta.built)} · ${ST.meta.countries} jurisdictions (${ST.meta.researched} with the October-2026 research pass) · ${ST.communities.length.toLocaleString()} communities · ${ST.sources.length.toLocaleString()} sources. Decision-support, not legal advice.`;

  // ---------- wizard ----------
  const wiz = $('#wizard'); let wAns = {}, wStep = 0;
  function wizRender() {
    $('#wiz-dots').innerHTML = U.WIZ.map((s, i) => `<i class="${i === wStep ? 'on' : i < wStep ? 'done' : ''}"></i>`).join('') + `<i class="${wStep >= U.WIZ.length ? 'on' : ''}"></i>`;
    $('#wiz-back').style.visibility = wStep > 0 ? 'visible' : 'hidden'; $('#wiz-restart').hidden = wStep < U.WIZ.length;
    if (wStep < U.WIZ.length) { const s = U.WIZ[wStep]; $('#wiz-body').innerHTML = `<p class="wiz-q">${A.esc(s.q)}</p><p class="wiz-h">${A.esc(s.h)}</p><div class="opts">${s.o.map(o => `<button data-v="${o[0]}" class="${wAns[s.k] === o[0] ? 'on' : ''}"><b>${A.esc(o[1])}</b>${o[2] ? `<small>${A.esc(o[2])}</small>` : ''}</button>`).join('')}</div>`; $('#wiz-body').querySelectorAll('button').forEach(b => b.onclick = () => { wAns[s.k] = b.dataset.v; wStep++; wizRender(); }); }
    else { $('#wiz-body').innerHTML = U.wizardResult(wAns); $('#wiz-body').querySelectorAll('[data-iso]').forEach(el => el.onclick = () => { wiz.hidden = true; showView('globe'); openCountry(el.dataset.iso, true); }); $('#wiz-body').querySelector('[data-wiz=apply]').onclick = () => { const { W } = U.wizardScore(wAns); const mx = Math.max(...Object.values(W)); const w = {}; A.LENSES.forEach(l => w[l] = Math.round(5 * W[l] / mx)); wiz.hidden = true; showView('globe'); applyWeights(w); toast('Sliders set from your answers'); }; }
  }
  $('#btn-wizard').onclick = () => { wAns = {}; wStep = 0; wiz.hidden = false; wizRender(); };
  $('#wiz-close').onclick = () => wiz.hidden = true; wiz.addEventListener('click', e => { if (e.target === wiz) wiz.hidden = true; });
  $('#wiz-back').onclick = () => { if (wStep > 0) { wStep--; wizRender(); } }; $('#wiz-restart').onclick = () => { wAns = {}; wStep = 0; wizRender(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') wiz.hidden = true; });

  // ---------- boot ----------
  recolor(); repoints();
  showView(V.view);
  if (V.selCm) openCommunity(V.selCm, true); else if (V.sel) openCountry(V.sel, true);
  window.addEventListener('hashchange', () => { if (hashLock) return; readHash(); $('#metric').value = V.metric; recolor(); repoints(); showView(V.view); if (V.selCm) openCommunity(V.selCm, true); else if (V.sel) openCountry(V.sel, true); });
  $('#loading').classList.add('off');
})();
