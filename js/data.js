/* Commune Jurisdiction Atlas — data model, scoring, metrics, colour scales. No DOM here. */
window.ATLAS = (function () {
  const LENSES = ['LAND', 'VISA', 'TAX', 'LAW', 'LIFE', 'STAB'];
  const LENS_COL = { LAND: '#4a9a5a', VISA: '#4f86c6', TAX: '#d9a441', LAW: '#9a6fb0', LIFE: '#3fb0a0', STAB: '#8a94a6' };
  const LENS_LABEL = { LAND: 'Land', VISA: 'Visa', TAX: 'Tax', LAW: 'Law', LIFE: 'Life', STAB: 'Stability' };
  const LENS_DESC = { LAND: 'cheap & ownable land', VISA: 'a whole group can get in', TAX: 'light tax burden', LAW: 'communal vehicles & zoning', LIFE: 'quality of life, health, safety', STAB: 'political & economic stability' };
  const STAB_DIMS = ['pol', 'law', 'safe', 'econ', 'peace', 'clim'];
  const STAB_LABEL = { pol: 'Political', law: 'Rule of law', safe: 'Safety', econ: 'Economic', peace: 'Peace / conflict', clim: 'Climate' };
  const SCENARIOS = { overall: [1, 1, 1, 1, 1, 1], currency: [0.6, 1, 0.3, 3, 0.4, 0.4], war: [1.5, 0.6, 0.6, 0.6, 3, 0.3], climate: [0.4, 0.5, 0.4, 1, 0.4, 3], authoritarian: [2, 3, 1, 0.4, 1.5, 0.3] };
  const SCENARIO_LABEL = { overall: 'overall', currency: 'a currency crisis', war: 'war in the region', climate: 'a climate shock', authoritarian: 'an authoritarian turn' };
  const PRESETS = {
    land: { LAND: 5, VISA: 5, TAX: 2, LAW: 3, LIFE: 1, STAB: 1 },
    digital: { LAND: 1, VISA: 4, TAX: 5, LAW: 1, LIFE: 3, STAB: 2 },
    qol: { LAND: 1, VISA: 2, TAX: 1, LAW: 3, LIFE: 5, STAB: 5 },
    hedge: { LAND: 3, VISA: 2, TAX: 2, LAW: 2, LIFE: 3, STAB: 5 },
    balanced: { LAND: 3, VISA: 3, TAX: 3, LAW: 3, LIFE: 3, STAB: 3 },
  };
  const DEFAULT_WEIGHTS = { LAND: 3, VISA: 3, TAX: 2, LAW: 2, LIFE: 3, STAB: 3 };

  // Community type families (Okabe–Ito, colour-blind safe)
  const FAMILIES = {
    eco: { label: 'Ecovillages & land trusts', color: '#009E73' },
    commune: { label: 'Communes & income-sharing', color: '#E69F00' },
    cohousing: { label: 'Cohousing & housing co-ops', color: '#56B4E9' },
    kibbutz: { label: 'Kibbutzim, moshavim & co-op villages', color: '#0072B2' },
    religious: { label: 'Religious communal (Hutterite, Bruderhof, Camphill…)', color: '#D55E00' },
    spiritual: { label: 'Spiritual & kin-domain', color: '#CC79A7' },
    historic: { label: 'Historic / defunct', color: '#8d8d8d' },
  };
  const TYPE_META = {
    'ecovillage': { label: 'Ecovillage', fam: 'eco' },
    'land-trust': { label: 'Land-trust community', fam: 'eco' },
    'commune': { label: 'Commune', fam: 'commune' },
    'income-sharing': { label: 'Income-sharing community', fam: 'commune' },
    'intentional-community': { label: 'Intentional community', fam: 'commune' },
    'anarchist-squat': { label: 'Anarchist / squat', fam: 'commune' },
    'cohousing': { label: 'Cohousing', fam: 'cohousing' },
    'housing-coop': { label: 'Housing co-op', fam: 'cohousing' },
    'kibbutz': { label: 'Kibbutz', fam: 'kibbutz' },
    'moshav': { label: 'Moshav (co-operative village)', fam: 'kibbutz' },
    'moshav-shitufi': { label: 'Moshav shitufi', fam: 'kibbutz' },
    'cooperative-village': { label: 'Co-operative village', fam: 'kibbutz' },
    'hutterite': { label: 'Hutterite colony', fam: 'religious' },
    'bruderhof': { label: 'Bruderhof', fam: 'religious' },
    'twelve-tribes': { label: 'Twelve Tribes', fam: 'religious' },
    'camphill': { label: 'Camphill', fam: 'religious' },
    'mennonite-colony': { label: 'Mennonite colony', fam: 'religious' },
    'religious': { label: 'Religious community', fam: 'religious' },
    'spiritual': { label: 'Spiritual community', fam: 'spiritual' },
    'kin-domain': { label: "Kin's domain (Anastasia)", fam: 'spiritual' },
    'historic-utopian': { label: 'Historic utopian colony', fam: 'historic' },
    'other': { label: 'Other', fam: 'commune' },
  };
  function famOf(c) { if (c.status === 'historic' || c.type === 'historic-utopian') return 'historic'; return (TYPE_META[c.type] || TYPE_META.other).fam; }
  function typeLabel(t) { return (TYPE_META[t] || TYPE_META.other).label; }
  function commColor(c) { return FAMILIES[famOf(c)].color; }

  // Viridis (perceptually uniform, colour-blind safe)
  const VIRIDIS = [[68, 1, 84], [72, 36, 117], [65, 68, 135], [53, 95, 141], [42, 120, 142], [33, 145, 140], [34, 168, 132], [68, 191, 112], [122, 209, 81], [189, 223, 38], [253, 231, 37]];
  function viridis(t) {
    t = Math.max(0, Math.min(1, +t || 0)); const p = t * (VIRIDIS.length - 1), i = Math.min(VIRIDIS.length - 2, Math.floor(p)), k = p - i;
    const c = VIRIDIS[i].map((s, j) => Math.round(s + (VIRIDIS[i + 1][j] - s) * k)); return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  const NO_DATA = '#3a3f4a';

  // ---- scoring ----
  function stabBlend(c, mode) { const s = c.stab6; if (!s) return null; const W = SCENARIOS[mode] || SCENARIOS.overall; let n = 0, d = 0; STAB_DIMS.forEach((k, i) => { if (typeof s[k] === 'number') { n += W[i] * s[k]; d += W[i]; } }); return d ? n / d : null; }
  function fit(c, W) { let n = 0, d = 0; LENSES.forEach(l => { const w = +W[l] || 0; n += w * c.scores[l]; d += w * 3; }); return d ? Math.round(100 * n / d) : 0; }
  function minVisa(c, key) { const v = (c.visas || []).map(x => x[key]).filter(x => typeof x === 'number' && x > 0); return v.length ? Math.min(...v) : null; }

  const fmtInt = v => v == null ? '—' : Math.round(v).toLocaleString('en-US');
  const fmtUSD = v => v == null ? '—' : '$' + fmtInt(v);

  // Metric registry: val(c, state) -> number|null; lo/hi fixed or auto; log; invert (lower is better → brighter)
  const METRICS = {
    comp: { label: 'total suitability', lo: 0, hi: 18, val: c => c.comp, fmt: v => v + ' / 18', help: 'Sum of the six lens scores (0–3 each). Opinionated, comparable, not precise.' },
    fit: { label: 'your weighted fit', lo: 0, hi: 100, val: (c, s) => fit(c, s.weights), fmt: v => v + '%', help: 'Σ(weight × score) ÷ Σ(weight × 3). Move the sliders to change it.' },
    'res:overall': { label: 'resilience — overall', lo: 0, hi: 100, val: c => stabBlend(c, 'overall'), fmt: v => Math.round(v) + ' / 100', help: 'Mean of the six stability dimensions.' },
    'res:currency': { label: 'resilience — currency crisis', lo: 0, hi: 100, val: c => stabBlend(c, 'currency'), fmt: v => Math.round(v) + ' / 100', help: 'Economic ×3, rule of law ×1, politics ×0.6 — who keeps their savings when the money breaks.' },
    'res:war': { label: 'resilience — war in the region', lo: 0, hi: 100, val: c => stabBlend(c, 'war'), fmt: v => Math.round(v) + ' / 100', help: 'Peace/conflict ×3, politics ×1.5 — distance from the fight and the state’s ability to stay out of it.' },
    'res:climate': { label: 'resilience — climate shock', lo: 0, hi: 100, val: c => stabBlend(c, 'climate'), fmt: v => Math.round(v) + ' / 100', help: 'Climate readiness ×3, economy ×1 — water, heat, fire and the capacity to adapt.' },
    'res:authoritarian': { label: 'resilience — authoritarian turn', lo: 0, hi: 100, val: c => stabBlend(c, 'authoritarian'), fmt: v => Math.round(v) + ' / 100', help: 'Rule of law ×3, politics ×2 — courts and institutions that would still protect a strange little community.' },
    farm: { label: 'farmland price (USD/ha)', log: true, invert: true, val: c => c.farm_usd_ha, fmt: v => fmtUSD(v) + '/ha', help: 'Typical productive farmland, USD per hectare, log scale. Brighter = cheaper.' },
    cost: { label: 'monthly cost per adult (USD)', invert: true, val: c => c.cost_month, fmt: v => fmtUSD(v) + '/mo', help: 'Rural / small-town budget per adult excluding property purchase. Brighter = cheaper.' },
    own: { label: 'foreign farmland ownership', lo: 0, hi: 2, val: c => ({ banned: 0, restricted: 1, allowed: 2 })[c.land.ownership], fmt: v => ['banned (lease only)', 'restricted', 'allowed'][Math.round(v)] || '—', help: 'Can a foreigner or foreign-owned entity own agricultural land freehold?' },
    pr: { label: 'years to permanent residency', invert: true, lo: 0, val: c => minVisa(c, 'pr_years'), fmt: v => v + ' yr', help: 'Fastest realistic route for a non-citizen. Brighter = sooner.' },
    cit: { label: 'years to citizenship', invert: true, lo: 0, val: c => minVisa(c, 'citizenship_years'), fmt: v => v + ' yr', help: 'Fastest realistic naturalisation path. Brighter = sooner.' },
    toptax: { label: 'top income-tax rate', invert: true, lo: 0, hi: 60, val: c => c.tax.income_top_rate_pct, fmt: v => v + '%', help: 'Top marginal personal income-tax rate (before special regimes). Brighter = lower.' },
    'idx:gpi_2025_score': { label: 'Global Peace Index (2026 edition)', invert: true, val: c => c.indices.gpi_2025_score, fmt: v => v.toFixed(2), help: 'Institute for Economics & Peace, 2026 edition. Lower score = more peaceful; brighter here = more peaceful.' },
    'idx:wjp_2025_score': { label: 'WJP Rule of Law Index 2025', lo: 0.3, hi: 0.9, val: c => c.indices.wjp_2025_score, fmt: v => v.toFixed(2), help: 'World Justice Project overall score (0–1), from each country’s research pass.' },
    'idx:cpi_2025': { label: 'Corruption Perceptions Index 2025', lo: 20, hi: 90, val: c => c.indices.cpi_2025, fmt: v => v + ' / 100', help: 'Transparency International, 2025 edition. Higher = cleaner.' },
    'idx:nd_gain_score': { label: 'ND-GAIN climate readiness', val: c => c.indices.nd_gain_score, fmt: v => v.toFixed(1), help: 'Notre Dame Global Adaptation Index, from each country’s research pass. Higher = more resilient.' },
    'idx:fsi_2025': { label: 'Fragile States Index 2024', invert: true, val: c => c.indices.fsi_2025, fmt: v => v.toFixed(1), help: 'Fund for Peace, 2024 edition. Lower = more stable; brighter here = more stable.' },
    'idx:hdi': { label: 'Human Development Index (2023 values)', lo: 0.5, hi: 0.97, val: c => c.indices.hdi, fmt: v => v.toFixed(3), help: 'UNDP Human Development Report 2025 (2023 values).' },
    'idx:numbeo_qol': { label: 'Numbeo quality of life (2026)', val: c => c.indices.numbeo_qol, fmt: v => Math.round(v), help: 'Numbeo crowd-sourced quality-of-life index, mid-2026 country ranking.' },
    density: { label: 'mapped communities per country', log: true, lo: 0, all: true, val: c => c.community_count, fmt: v => fmtInt(v) + ' mapped', help: 'How many intentional communities this atlas has mapped in the country — a rough signal of how normal communal living is there.' },
  };
  LENSES.forEach(l => { METRICS[l] = { label: l + ' — ' + LENS_DESC[l], lo: 0, hi: 3, val: c => c.scores[l], fmt: v => v + ' / 3', help: LENS_DESC[l] }; });

  // Resolve a metric into a colour function and legend bounds
  function metricScale(key, state) {
    const m = METRICS[key] || METRICS.comp;
    const vals = state.countries.map(c => m.val(c, state)).filter(v => typeof v === 'number' && isFinite(v));
    let lo = m.lo != null ? m.lo : (vals.length ? Math.min(...vals) : 0);
    let hi = m.hi != null ? m.hi : (vals.length ? Math.max(...vals) : 1);
    if (key === 'density') { const all = Object.values(state.densityAll); hi = all.length ? Math.max(...all) : 1; }
    const tr = m.log ? (v => Math.log10(Math.max(0, v) + 1)) : (v => v);
    const a = tr(lo), b = tr(hi);
    const t = v => { if (v == null || !isFinite(v)) return null; let x = b === a ? 0.5 : (tr(v) - a) / (b - a); x = Math.max(0, Math.min(1, x)); return m.invert ? 1 - x : x; };
    return { m, lo, hi, t, color: v => { const x = t(v); return x == null ? NO_DATA : viridis(x); }, value: c => m.val(c, state), fmt: m.fmt, label: m.label, help: m.help, invert: !!m.invert };
  }

  // ---- loading ----
  async function loadJSON(u) { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
  async function load() {
    const [countries, communities, sources, meta, iso, topo50, topo110] = await Promise.all([
      loadJSON('data/countries.json'), loadJSON('data/communities.json'), loadJSON('data/sources.json'), loadJSON('data/meta.json'), loadJSON('data/iso.json'),
      loadJSON('vendor/countries-50m.json'), loadJSON('vendor/countries-110m.json')]);
    const NAME_A2 = { 'Kosovo': 'XK', 'N. Cyprus': 'CY', 'Somaliland': 'SO', 'Siachen Glacier': 'IN' };
    const tag = (topo) => { const f = topojson.feature(topo, topo.objects.countries).features; f.forEach(x => { x.a2 = iso.num2a2[x.id] || NAME_A2[x.properties.name] || null; x.bbox = d3.geoBounds(x); }); return f; };
    const feats50 = tag(topo50), feats110 = tag(topo110);
    const byIso = {}; countries.forEach(c => { byIso[c.iso] = c; c.communities = []; });
    communities.forEach((cm, i) => { cm._i = i; cm.fam = famOf(cm); if (cm.country && byIso[cm.country]) byIso[cm.country].communities.push(cm); });
    const densityAll = {}; communities.forEach(cm => { if (cm.country) densityAll[cm.country] = (densityAll[cm.country] || 0) + 1; });
    countries.forEach(c => { c.community_count = densityAll[c.iso] || 0; c.comp = LENSES.reduce((s, l) => s + (c.scores[l] || 0), 0); });
    const a2name = iso.a2name || {};
    return { countries, byIso, communities, sources, meta, iso, a2name, feats50, feats110, topo50, topo110, densityAll, weights: Object.assign({}, DEFAULT_WEIGHTS) };
  }

  // ---- helpers ----
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function flag(iso) { if (!iso || iso.length !== 2) return ''; const A = 0x1F1E6; return String.fromCodePoint(A + iso.charCodeAt(0) - 65, A + iso.charCodeAt(1) - 65); }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  function ownBadge(o) { return o === 'allowed' ? '<span class="badge ok">foreigners may own</span>' : o === 'restricted' ? '<span class="badge warn">restricted</span>' : o === 'banned' ? '<span class="badge bad">banned — lease only</span>' : '<span class="badge">unknown</span>'; }
  function toCSV(rows, cols) { const q = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return [cols.map(c => q(c.label)).join(',')].concat(rows.map(r => cols.map(c => q(c.get(r))).join(','))).join('\n'); }
  function download(name, text, type) { const b = new Blob([text], { type: type || 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  return { LENSES, LENS_COL, LENS_LABEL, LENS_DESC, STAB_DIMS, STAB_LABEL, SCENARIOS, SCENARIO_LABEL, PRESETS, DEFAULT_WEIGHTS, FAMILIES, TYPE_META, famOf, typeLabel, commColor, viridis, NO_DATA, stabBlend, fit, minVisa, METRICS, metricScale, load, esc, flag, host, ownBadge, fmtInt, fmtUSD, toCSV, download };
})();
