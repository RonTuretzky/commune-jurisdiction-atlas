/* Commune Jurisdiction Atlas — UI builders: dossier cards, tables, compare, communities, sources, wizard. */
window.UI = (function () {
  const A = ATLAS; const esc = A.esc; let ST = null;
  function init(state) { ST = state; }
  const n = (v, suf) => v == null ? '—' : `<span class="n">${esc(v)}${suf || ''}</span>`;
  const srcLinks = (arr, max) => { arr = (arr || []).filter(Boolean); if (!arr.length) return ''; const shown = max ? arr.slice(0, max) : arr; return `<div class="src">Sources: ${shown.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(A.host(u))}</a>`).join('')}${arr.length > shown.length ? ` <span class="muted">+${arr.length - shown.length} more in Sources tab</span>` : ''}</div>`; };
  const p = (t, cls) => t ? `<p class="p ${cls || ''}">${esc(t)}</p>` : '';
  const kv = rows => { const r = rows.filter(x => x[1] != null && x[1] !== ''); return r.length ? `<dl class="kv">${r.map(x => `<dt>${esc(x[0])}</dt><dd>${x[2] ? x[1] : esc(x[1])}</dd>`).join('')}</dl>` : ''; };
  const sysBadge = s => s === 'territorial' ? '<span class="badge ok">territorial</span>' : s === 'worldwide-with-special-regime' ? '<span class="badge warn">worldwide + special regime</span>' : s === 'hybrid' ? '<span class="badge info">hybrid</span>' : s === 'worldwide' ? '<span class="badge bad">worldwide</span>' : '';
  const confBadge = c => c === 'high' ? '<span class="badge ok">high confidence</span>' : c === 'medium' ? '<span class="badge warn">medium confidence</span>' : c === 'low' ? '<span class="badge bad">low confidence</span>' : '';

  function scoresGrid(c) {
    return `<div class="scores">${A.LENSES.map(l => { const v = c.scores[l]; const d = c.scores_deck && c.scores_deck[l] !== v ? `<small title="was ${c.scores_deck[l]} in the July-2026 deck">was ${c.scores_deck[l]}</small>` : `<small>${v}/3</small>`; return `<div class="sc" style="--c:${A.LENS_COL[l]}" data-lens="${l}" title="${esc(A.LENS_DESC[l])}"><b>${l}</b><div class="pips">${[1, 2, 3].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</div>${d}</div>`; }).join('')}</div>`;
  }
  function radarSVG(s6, size) {
    size = size || 260; const cx = size / 2, cy = size / 2, R = size / 2 - 34; const dims = A.STAB_DIMS;
    const pt = (i, r) => { const a = -Math.PI / 2 + i * Math.PI * 2 / dims.length; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    let g = ''; [25, 50, 75, 100].forEach(l => { g += `<polygon points="${dims.map((d, i) => pt(i, R * l / 100).join(',')).join(' ')}" fill="none" stroke="#2b2b21" stroke-width="1"/>`; });
    dims.forEach((d, i) => { const [x, y] = pt(i, R); g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#2b2b21"/>`; const [lx, ly] = pt(i, R + 20); g += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-family="Inter,sans-serif" font-size="10.5" fill="#9c8f74">${A.STAB_LABEL[d]}</text>`; });
    const vals = dims.map((d, i) => pt(i, R * ((s6 && s6[d]) || 0) / 100));
    g += `<polygon points="${vals.map(v => v.join(',')).join(' ')}" fill="rgba(212,163,115,0.28)" stroke="#d4a373" stroke-width="2"/>`;
    vals.forEach(v => { g += `<circle cx="${v[0]}" cy="${v[1]}" r="3" fill="#f5deb3"/>`; });
    return `<svg class="radar" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="stability radar">${g}</svg>`;
  }
  function visaCard(v) {
    return `<div class="visa"><b>${esc(v.name)}</b><span class="vt">${esc(v.type)}</span><div class="p" style="margin:3px 0">${esc(v.requirement)}</div><div class="row">${v.initial_term ? `<span>term <b>${esc(v.initial_term)}</b></span>` : ''}${v.processing_time ? `<span>processing <b>${esc(v.processing_time)}</b></span>` : ''}${v.pr_years != null ? `<span>PR <b>${esc(v.pr_years)} yr</b></span>` : ''}${v.citizenship_years != null ? `<span>citizenship <b>${esc(v.citizenship_years)} yr</b></span>` : ''}${v.work_allowed != null ? `<span>work <b>${v.work_allowed ? 'allowed' : 'not allowed'}</b></span>` : ''}</div>${v.source ? `<div class="src"><a href="${esc(v.source)}" target="_blank" rel="noopener">${esc(A.host(v.source))}</a></div>` : ''}</div>`;
  }
  function groupSources(urls) { const by = {}; (urls || []).forEach(u => { const h = A.host(u); (by[h] = by[h] || []).push(u); }); return Object.keys(by).sort().map(h => `<details><summary><b>${esc(h)}</b><small>${by[h].length}</small></summary><ul>${by[h].map(u => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></li>`).join('')}</ul></details>`).join(''); }

  // ---------- country dossier ----------
  function countryCard(c) {
    const comms = c.communities || []; const nSrc = (c.sources || []).length;
    const bestPR = A.minVisa(c, 'pr_years'), bestCit = A.minVisa(c, 'citizenship_years');
    const idx = c.indices || {}; const idxRows = [['Global Peace Index 2026', idx.gpi_2025_score != null ? `${idx.gpi_2025_score}${idx.gpi_2025_rank ? ` (rank ${idx.gpi_2025_rank} of 163)` : ''}` : null], ['WJP Rule of Law 2025', idx.wjp_2025_score], ['Corruption Perceptions 2025', idx.cpi_2025 != null ? idx.cpi_2025 + ' / 100' : null], ['ND-GAIN climate readiness', idx.nd_gain_score], ['Fragile States Index 2024', idx.fsi_2025 != null ? idx.fsi_2025 + ' (lower = more stable)' : null], ['HDI (2023 values)', idx.hdi], ['Numbeo quality of life 2026', idx.numbeo_qol], ['Numbeo safety 2026', idx.numbeo_safety], ['Numbeo healthcare 2026', idx.numbeo_healthcare]];
    const tabs = [['over', 'Overview'], ['land', 'Land'], ['visa', 'Visa'], ['tax', 'Tax'], ['law', 'Law & zoning'], ['life', 'Life'], ['stab', 'Stability'], ['comm', `Communities (${comms.length})`], ['src', `Sources (${nSrc})`]];
    if (c.verification || (c.corrections || []).length) tabs.push(['fact', 'Fact-check']);
    const res = Object.keys(A.SCENARIOS).map(k => { const v = A.stabBlend(c, k); return `<div><span>${esc(A.SCENARIO_LABEL[k])}</span><i style="width:${Math.round(v || 0)}%"></i><b>${v == null ? '—' : Math.round(v)}</b></div>`; }).join('');
    return `<div class="card" data-iso="${c.iso}">
      <div class="crumbs"><span class="flag">${A.flag(c.iso)}</span><span>${esc(c.region)}</span><span>·</span><span>${esc(c.archetype)}</span>${c.researched ? `<span>·</span><span title="per-country research pass, October 2026">researched Oct 2026</span>` : `<span>·</span><span title="from the July-2026 course-deck synthesis; per-country verification pending">deck synthesis Jul 2026</span>`}</div>
      <h2>${esc(c.name)}<span class="comp">${c.comp} / 18</span></h2>
      <p class="verdict">${esc(c.verdict)}</p>
      ${scoresGrid(c)}
      <div class="fig">
        <div class="f"><small>farmland</small><b>${A.fmtUSD(c.farm_usd_ha)}/ha</b><i>${c.farm_low || c.farm_high ? `${A.fmtUSD(c.farm_low)} – ${A.fmtUSD(c.farm_high)}` : 'typical productive land'}</i></div>
        <div class="f"><small>monthly / adult</small><b>${A.fmtUSD(c.cost_month)}</b><i>rural, excl. purchase</i></div>
        <div class="f"><small>foreign farmland</small><b style="font-size:12px;line-height:1.3;margin-top:5px">${A.ownBadge(c.land.ownership)}</b><i>${c.land.ownership_inferred ? 'inferred from zoning note' : '&nbsp;'}</i></div>
        <div class="f"><small>residency → citizenship</small><b>${bestPR != null ? bestPR + ' yr' : '—'} → ${bestCit != null ? bestCit + ' yr' : '—'}</b><i>fastest realistic route</i></div>
        <div class="f"><small>tax</small><b>${c.tax.income_top_rate_pct != null ? c.tax.income_top_rate_pct + '% top' : '—'}</b><i>${sysBadge(c.tax.system) || (c.tax.text ? esc(c.tax.text.slice(0, 60)) : '')}</i></div>
      </div>
      <div class="actionsrow"><a href="#" data-act="fly">⌖ fly here</a><a href="#" data-act="compare">⇄ compare</a><a href="#" data-act="share">⎘ share link</a><a href="#" data-act="table">▦ in table</a></div>
      <div class="tabs">${tabs.map((t, i) => `<button data-tab="${t[0]}" class="${i === 0 ? 'on' : ''}">${t[1]}</button>`).join('')}</div>

      <div class="tab on" data-tab="over">
        ${c.summary && c.summary !== c.verdict ? `<p class="p serif">${esc(c.summary)}</p>` : ''}
        ${(c.dealbreakers || []).length ? `<h4>Dealbreakers to verify first</h4>${c.dealbreakers.map(d => `<div class="deal">${esc(d)}</div>`).join('')}` : ''}
        ${c.commune_history ? `<h4>Communal land here — the precedent</h4><p class="p">${esc(c.commune_history)}</p>` : ''}
        <h4>At a glance</h4>
        ${kv([['Land', c.land.text], ['Visa', c.visa_text], ['Tax', c.tax.text], ['Zoning', c.zoning.text], ['Communal law', c.legal.text], ['Quality of life', c.life_text], ['Healthcare', c.health.text], ['Pensions', c.pension.text], ['Farm support', c.ag.text], ['Stability', c.stab_text], ['Languages', c.languages], ['Currency', c.currency]])}
        ${c.score_rationale ? `<h4>Why these scores</h4><p class="p">${esc(c.score_rationale)}</p>` : ''}
      </div>

      <div class="tab" data-tab="land">
        <h4>Can foreigners own farmland?</h4><p class="p">${A.ownBadge(c.land.ownership)} ${esc(c.land.ownership_note || '')}</p>
        <h4>Prices</h4>
        <div class="fig"><div class="f"><small>cheapest usable</small><b>${A.fmtUSD(c.farm_low)}/ha</b></div><div class="f"><small>typical productive</small><b>${A.fmtUSD(c.farm_usd_ha)}/ha</b></div><div class="f"><small>prime</small><b>${A.fmtUSD(c.farm_high)}/ha</b></div></div>
        ${p(c.land.text)}${p(c.land.note)}
        ${c.land.cheap_house_program || c.land.house ? `<h4>Cheap-house / abandoned-village programmes</h4>${p(c.land.cheap_house_program || c.land.house)}` : ''}
        ${c.land.build_rules ? `<h4>Building on farmland — minimums & rules</h4>${p(c.land.build_rules)}` : ''}
        <h4>Zoning</h4>${p(c.zoning.text)}${kv([['Build on farmland', c.zoning.build_on_farmland], ['Communal title', c.zoning.communal_title], ['Note', c.zoning.note]])}
        ${srcLinks([].concat(c.land.sources, c.zoning.sources))}
      </div>

      <div class="tab" data-tab="visa">
        ${p(c.visa_text)}${c.visa_detail ? `<div class="why">${esc(c.visa_detail)}</div>` : ''}${p(c.visa_note)}
        ${(c.visas || []).length ? `<h4>Every realistic route (${c.visas.length})</h4>${c.visas.map(visaCard).join('')}` : `<p class="tiny">Detailed per-route data for this country is pending the verification pass; the summary above comes from the course-deck synthesis.</p>`}
        <h4>Pensions & retirees</h4>${p(c.pension.text)}${kv([['Foreign pension tax', c.pension.foreign_pension_tax], ['Retiree visa', c.pension.retiree_visa]])}${srcLinks(c.pension.sources)}
      </div>

      <div class="tab" data-tab="tax">
        <p class="p">${sysBadge(c.tax.system)} ${c.tax.income_top_rate_pct != null ? `top personal rate <span class="n">${c.tax.income_top_rate_pct}%</span>` : ''}</p>
        ${p(c.tax.text)}
        ${kv([['Capital gains', c.tax.capital_gains], ['Wealth tax', c.tax.wealth_tax], ['Property tax', c.tax.property_tax], ['Foreign pensions', c.tax.foreign_pension], ['Special regime', c.tax.special_regime], ['Crypto', c.tax.crypto], ['Co-op treatment', c.tax.coop_treatment]])}
        ${srcLinks(c.tax.sources)}
        <h4>Monthly cost of living</h4><p class="p"><span class="n">${A.fmtUSD(c.cost_month)}</span> per adult, rural / small town. ${esc(c.cost.note || '')}</p>${srcLinks(c.cost.sources)}
      </div>

      <div class="tab" data-tab="law">
        <h4>Who can hold the land, who runs the farm</h4>${p(c.legal.text)}
        ${(c.legal.vehicles || []).length ? `<ul class="list">${c.legal.vehicles.map(v => `<li><b>${esc(v.name)}</b> <span class="badge">${esc(v.type)}</span> — ${esc(v.note)}${v.source ? ` <a class="tiny" href="${esc(v.source)}" target="_blank" rel="noopener">[${esc(A.host(v.source))}]</a>` : ''}</li>`).join('')}</ul>` : ''}
        <h4>Agricultural support</h4>${p(c.ag.text)}${kv([['Subsidies', c.ag.subsidies], ['Co-op law', c.ag.coop_law], ['Equipment', c.ag.equipment_note]])}${srcLinks(c.ag.sources)}
        <h4>Zoning</h4>${p(c.zoning.text)}${kv([['Build on farmland', c.zoning.build_on_farmland], ['Communal title', c.zoning.communal_title]])}${srcLinks(c.zoning.sources)}
      </div>

      <div class="tab" data-tab="life">
        ${p(c.life_text)}
        <h4>Healthcare</h4>${p(c.health.text)}${kv([['System', c.health.system], ['Cost for residents', c.health.cost_for_residents], ['Access for newcomers', c.health.immigrant_access], ['Quality', c.health.quality_note]])}${srcLinks(c.health.sources)}
        <h4>Climate & water</h4>${kv([['Zone', c.climate.zone], ['Risks', c.climate.risks], ['Water', c.climate.water]])}${srcLinks(c.climate.sources)}
        ${idxRows.some(r => r[1] != null) ? `<h4>Published indices</h4>${kv(idxRows)}${srcLinks(idx.sources)}` : ''}
      </div>

      <div class="tab" data-tab="stab">
        ${radarSVG(c.stab6)}
        <div class="dims">${A.STAB_DIMS.map(d => `<button data-dim="${d}"><span>${esc(A.STAB_LABEL[d])}</span><b>${c.stab6 && c.stab6[d] != null ? c.stab6[d] : '—'} / 100</b></button>`).join('')}</div>
        <div class="why" data-why hidden></div>
        <h4>Under stress</h4><div class="result"><div class="bars">${res}</div></div>
        ${p(c.stab_text)}${srcLinks(c.stab_sources)}
      </div>

      <div class="tab" data-tab="comm">
        ${comms.length ? `<p class="tiny">${comms.length} mapped in ${esc(c.name)} — click to fly there.</p><div class="comm-list">${comms.slice().sort((a, b) => (a.status === 'historic') - (b.status === 'historic') || a.name.localeCompare(b.name)).map(cm => `<button data-cm="${esc(cm.id)}" style="--c:${A.commColor(cm)}"><i></i><span><b>${esc(cm.name)}</b><small>${esc(A.typeLabel(cm.type))}${cm.founded ? ' · est. ' + cm.founded : ''}${cm.status === 'historic' ? ' · historic' : ''}${cm.admin ? ' · ' + esc(cm.admin) : ''}</small></span></button>`).join('')}</div>` : `<p class="p muted">No communities mapped here yet.</p>`}
      </div>

      <div class="tab" data-tab="src">
        ${nSrc ? `<p class="tiny">${nSrc} sources cited for ${esc(c.name)}, grouped by site.</p>${groupSources(c.sources)}` : `<p class="p muted">Per-country sources are attached as each jurisdiction completes its verification pass. Until then the figures come from the July-2026 course synthesis (see Method &amp; sources).</p>`}
      </div>

      ${(c.verification || (c.corrections || []).length) ? `<div class="tab" data-tab="fact">
        ${c.verification ? `<p class="p">${c.verification.publishable === true ? '<span class="badge ok">fact-check passed</span>' : c.verification.publishable === false ? '<span class="badge bad">fact-check flagged issues</span>' : ''} ${esc(c.verification.overall || '')}</p>${(c.verification.checks || []).map(k => `<div class="fact"><span class="v ${esc(k.verdict)}">${esc(k.verdict)}</span>${esc(k.claim)}${k.corrected_value ? `<div class="p" style="margin:3px 0 0"><b>→ ${esc(k.corrected_value)}</b></div>` : ''}${k.note ? `<div class="tiny">${esc(k.note)}</div>` : ''}${k.source ? `<div class="src"><a href="${esc(k.source)}" target="_blank" rel="noopener">${esc(A.host(k.source))}</a></div>` : ''}</div>`).join('')}` : ''}
        ${(c.corrections || []).length ? `<h4>Corrections to the July-2026 deck</h4>${c.corrections.map(k => `<div class="fact"><b>${esc(k.field)}</b>: <span class="muted">${esc(k.old)}</span> → ${esc(k.new)}${k.source ? `<div class="src"><a href="${esc(k.source)}" target="_blank" rel="noopener">${esc(A.host(k.source))}</a></div>` : ''}</div>`).join('')}` : ''}
      </div>` : ''}
      <div class="meta">${confBadge(c.confidence)} Scores 0–3 per lens; composite ${c.comp}/18. ${c.researched ? 'Figures verified country-by-country in October 2026 with an independent fact-check; ' : 'Figures from the July-2026 course synthesis; '}decision-support, not legal advice.</div>
    </div>`;
  }

  // ---------- community card ----------
  function communityCard(cm) {
    const j = cm.country && ST.byIso[cm.country];
    const links = [cm.website ? ['website', cm.website] : null].concat((cm.sources || []).map(u => [A.host(u), u])).filter(Boolean);
    return `<div class="card" data-cm="${esc(cm.id)}">
      <div class="crumbs"><span class="flag">${A.flag(cm.country)}</span><span>${esc(cm.countryLabel || ST.a2name[cm.country] || cm.country || '')}</span>${cm.admin ? `<span>·</span><span>${esc(cm.admin)}</span>` : ''}<span>·</span><span style="color:${A.commColor(cm)}">${esc(A.FAMILIES[A.famOf(cm)].label)}</span></div>
      <h2>${esc(cm.name)}</h2>
      <p class="verdict">${esc(A.typeLabel(cm.type))}${cm.founded ? ` · founded ${cm.founded}` : ''}${cm.status === 'historic' ? ' · <span class="badge">historic</span>' : cm.status === 'forming' ? ' · <span class="badge warn">forming</span>' : ''}</p>
      ${cm.description ? `<p class="p serif">${esc(cm.description)}</p>` : ''}
      ${kv([['Population', cm.population], ['Size', cm.size_ha ? cm.size_ha + ' ha' : null], ['Land tenure', cm.land_tenure], ['Economy', cm.economy], ['Network', cm.network], ['Coordinates', `${cm.lat.toFixed(4)}, ${cm.lng.toFixed(4)}`], ['Record', cm.origin === 'wikidata' ? 'Wikidata harvest' : cm.origin === 'wikipedia' ? 'Wikipedia category harvest' : cm.origin === 'fic' ? 'FIC directory' : cm.origin === 'gen' ? 'GEN map' : cm.origin === 'country-research' ? 'country research' : (cm.origin || '').replace('census:', 'census sweep: ')], ['Confidence', cm.confidence]])}
      <div class="actionsrow"><a href="#" data-act="fly">⌖ fly here</a><a href="#" data-act="share">⎘ share link</a>${links.map(l => `<a href="${esc(l[1])}" target="_blank" rel="noopener">${esc(l[0])} ↗</a>`).join('')}</div>
      ${j ? `<h4>Jurisdiction</h4><button class="primary" data-act="country" data-iso="${j.iso}">${A.flag(j.iso)} Open the ${esc(j.name)} dossier →</button>` : cm.country ? `<p class="tiny">${esc(ST.a2name[cm.country] || cm.country)} is not one of the 50 scored jurisdictions.</p>` : ''}
      ${cm.check_note ? `<div class="meta">Checker note: ${esc(cm.check_note)}</div>` : ''}
    </div>`;
  }

  // ---------- generic sortable table ----------
  function table(el, rows, cols, sort, onRow) {
    const key = sort.key, dir = sort.dir || 1; const col = cols.find(c => c.key === key);
    const sorted = rows.slice().sort((a, b) => { const va = col ? col.get(a) : 0, vb = col ? col.get(b) : 0; if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1; return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * dir; });
    el.innerHTML = `<thead><tr>${cols.map(c => `<th data-key="${c.key}" class="${c.key === key ? 'sorted' : ''}">${esc(c.label)}${c.key === key ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>${sorted.map(r => `<tr class="click" data-id="${esc(r.__id)}">${cols.map(c => `<td>${c.html ? c.html(r) : esc(c.get(r) == null ? '—' : c.get(r))}</td>`).join('')}</tr>`).join('')}</tbody>`;
    el.querySelectorAll('th').forEach(th => th.onclick = () => { const k = th.dataset.key; if (sort.key === k) sort.dir = -sort.dir; else { sort.key = k; sort.dir = 1; } table(el, rows, cols, sort, onRow); });
    el.querySelectorAll('tbody tr').forEach(tr => tr.onclick = () => onRow(tr.dataset.id));
    return sorted;
  }
  const COUNTRY_COLS = [
    { key: 'name', label: 'Country', get: c => c.name, html: c => `${A.flag(c.iso)} <b>${esc(c.name)}</b>` },
    { key: 'region', label: 'Region', get: c => c.region },
    { key: 'comp', label: 'Total', get: c => c.comp, html: c => `<span class="n">${c.comp}</span>` },
    ...A.LENSES.map(l => ({ key: l, label: l, get: c => c.scores[l], html: c => `<span style="color:${A.LENS_COL[l]}">${'●'.repeat(c.scores[l])}${'○'.repeat(3 - c.scores[l])}</span>` })),
    { key: 'farm', label: 'Farmland $/ha', get: c => c.farm_usd_ha, html: c => `<span class="n">${A.fmtUSD(c.farm_usd_ha)}</span>` },
    { key: 'cost', label: 'Cost / mo', get: c => c.cost_month, html: c => `<span class="n">${A.fmtUSD(c.cost_month)}</span>` },
    { key: 'own', label: 'Foreign farmland', get: c => c.land.ownership, html: c => A.ownBadge(c.land.ownership) },
    { key: 'pr', label: 'PR (yr)', get: c => A.minVisa(c, 'pr_years') },
    { key: 'cit', label: 'Citizenship (yr)', get: c => A.minVisa(c, 'citizenship_years') },
    { key: 'tax', label: 'Tax', get: c => c.tax.income_top_rate_pct, html: c => `${c.tax.income_top_rate_pct != null ? c.tax.income_top_rate_pct + '%' : '—'} ${c.tax.system ? `<span class="tiny">${esc(c.tax.system)}</span>` : ''}` },
    { key: 'res', label: 'Resilience', get: c => Math.round(A.stabBlend(c, 'overall') || 0) },
    { key: 'comms', label: 'Communities', get: c => c.community_count },
    { key: 'verdict', label: 'Verdict', get: c => c.verdict, html: c => `<span class="tiny" style="display:block;min-width:340px;max-width:420px;color:var(--ink)">${esc(c.verdict)}</span>` },
  ];
  const COMM_COLS = [
    { key: 'name', label: 'Community', get: c => c.name, html: c => `<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${A.commColor(c)};margin-right:6px"></i><b>${esc(c.name)}</b>` },
    { key: 'type', label: 'Type', get: c => A.typeLabel(c.type) },
    { key: 'country', label: 'Country', get: c => c.countryLabel || ST.a2name[c.country] || c.country, html: c => `${A.flag(c.country)} ${esc(c.countryLabel || ST.a2name[c.country] || c.country || '—')}${c.admin ? `<span class="tiny"> · ${esc(c.admin)}</span>` : ''}` },
    { key: 'founded', label: 'Founded', get: c => c.founded },
    { key: 'population', label: 'People', get: c => c.population },
    { key: 'status', label: 'Status', get: c => c.status },
    { key: 'economy', label: 'Economy', get: c => c.economy },
    { key: 'description', label: 'About', get: c => c.description, html: c => `<span class="tiny" style="display:block;max-width:420px;color:var(--ink)">${esc((c.description || '').slice(0, 220))}${(c.description || '').length > 220 ? '…' : ''}</span>` },
    { key: 'links', label: 'Links', get: c => (c.sources || []).length, html: c => [c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">site</a>` : '', ...(c.sources || []).slice(0, 2).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(A.host(u).split('.')[0])}</a>`)].filter(Boolean).join(' · ') },
  ];

  // ---------- compare ----------
  function compare(isos) {
    const cs = isos.map(i => ST.byIso[i]).filter(Boolean); const out = document.getElementById('cmp-out');
    if (!cs.length) { out.innerHTML = '<p class="p muted">Pick at least one jurisdiction above.</p>'; return; }
    const row = (label, fn, srcFn) => `<tr><td>${esc(label)}</td>${cs.map(c => { const s = srcFn ? (srcFn(c) || [])[0] : null; return `<td>${fn(c)}${s ? ` <a class="tiny" href="${esc(s)}" target="_blank" rel="noopener" title="${esc(s)}">[src]</a>` : ''}</td>`; }).join('')}</tr>`;
    const bestVisa = c => (c.visas || []).slice().sort((a, b) => (a.pr_years || 99) - (b.pr_years || 99))[0];
    out.innerHTML = `<div class="tbl-wrap" style="max-height:none"><table class="data"><thead><tr><th></th>${cs.map(c => `<th><div class="cmp-head">${A.flag(c.iso)} <b>${esc(c.name)}</b> <span class="n">${c.comp}/18</span></div></th>`).join('')}</tr></thead><tbody>
      ${row('Verdict', c => `<span class="tiny" style="color:var(--ink)">${esc(c.verdict)}</span>`)}
      ${row('Scores', c => scoresGrid(c))}
      ${row('Farmland USD/ha', c => `<span class="n">${A.fmtUSD(c.farm_usd_ha)}</span> <span class="tiny">${c.farm_low ? `${A.fmtUSD(c.farm_low)}–${A.fmtUSD(c.farm_high)}` : ''}</span>`, c => c.land.sources)}
      ${row('Foreign farmland ownership', c => `${A.ownBadge(c.land.ownership)}<div class="tiny">${esc((c.land.ownership_note || c.zoning.text || '').slice(0, 200))}</div>`, c => c.land.sources)}
      ${row('Monthly cost / adult', c => `<span class="n">${A.fmtUSD(c.cost_month)}</span>`, c => c.cost.sources)}
      ${row('Best visa route', c => { const v = bestVisa(c); return v ? `<b>${esc(v.name)}</b><div class="tiny">${esc(v.requirement)}${v.initial_term ? ' · ' + esc(v.initial_term) : ''}</div>` : `<span class="tiny">${esc(c.visa_text)}</span>`; }, c => (bestVisa(c) ? [bestVisa(c).source] : []))}
      ${row('Years to PR → citizenship', c => `<span class="n">${A.minVisa(c, 'pr_years') ?? '—'} → ${A.minVisa(c, 'citizenship_years') ?? '—'}</span>`)}
      ${row('Tax', c => `${sysBadge(c.tax.system)} ${c.tax.income_top_rate_pct != null ? `<span class="n">${c.tax.income_top_rate_pct}%</span> top` : ''}<div class="tiny">${esc(c.tax.special_regime || c.tax.text || '')}</div>`, c => c.tax.sources)}
      ${row('Foreign pensions', c => esc(c.tax.foreign_pension || c.pension.text || '—'), c => c.pension.sources)}
      ${row('Healthcare', c => esc(c.health.immigrant_access || c.health.text || '—'), c => c.health.sources)}
      ${row('Legal vehicles', c => (c.legal.vehicles || []).length ? c.legal.vehicles.map(v => `<div><b>${esc(v.name)}</b> <span class="tiny">${esc(v.type)}</span></div>`).join('') : esc(c.legal.text || '—'))}
      ${row('Farm support', c => esc(c.ag.subsidies || c.ag.text || '—'), c => c.ag.sources)}
      ${row('Climate', c => esc([c.climate.zone, c.climate.risks].filter(Boolean).join(' — ') || c.life_text || '—'), c => c.climate.sources)}
      ${row('Stability (6 dims)', c => A.STAB_DIMS.map(d => `<div class="tiny">${esc(A.STAB_LABEL[d])} <span class="n">${c.stab6 ? c.stab6[d] : '—'}</span></div>`).join(''), c => c.stab_sources)}
      ${row('Resilience · overall / currency / war / climate / authoritarian', c => Object.keys(A.SCENARIOS).map(k => Math.round(A.stabBlend(c, k) || 0)).join(' / '))}
      ${row('Dealbreakers', c => (c.dealbreakers || []).length ? `<ul class="list" style="padding-left:16px">${c.dealbreakers.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : '—')}
      ${row('Communities mapped', c => `<span class="n">${c.community_count}</span>`)}
      ${row('Sources cited', c => `<span class="n">${(c.sources || []).length}</span>`)}
    </tbody></table></div>`;
  }

  // ---------- wizard ----------
  const WIZ = [
    { k: 'group', q: 'Who is your group, mostly?', h: 'This sets the baseline weights.', o: [['ret', 'Retirees on pensions or savings', 'they qualify for passive-income visas; healthcare and stability matter most'], ['remote', 'Remote workers', 'income from abroad; tax treatment and digital-nomad routes matter'], ['fam', 'Families with kids', 'schools, healthcare, safety, long-term legal footing'], ['young', 'Young and cash-poor', 'cheapest land, easiest entry, willing to rough it']] },
    { k: 'prio', q: 'What matters most?', h: 'One thing you would not trade away.', o: [['own', 'Owning the land outright', 'freehold title in the group’s own vehicle'], ['cost', 'The lowest possible cost', 'land and living, every month'], ['move', 'Getting everyone in legally', 'a visa route for every adult, not just the founders'], ['qol', 'Quality of life', 'safety, healthcare, services, climate']] },
    { k: 'land', q: 'Do you need to own the land?', h: 'Some of the cheapest countries only lease to foreigners.', o: [['freehold', 'Yes — freehold or nothing', 'rules out countries that bar foreign farmland ownership'], ['lease', 'A long lease would be fine', '30–99-year leases or a local company holding title'], ['access', 'Access and use are enough', 'we can live on land held another way']] },
    { k: 'climate', q: 'What climate?', h: 'A soft nudge, not a hard filter.', o: [['temperate', 'Temperate — four seasons', 'roughly 27°–49° from the equator'], ['warm', 'Warm — tropical or subtropical', 'within ~27° of the equator'], ['any', 'No preference', '']] },
    { k: 'region', q: 'Which part of the world?', h: 'Also a nudge — the engine will still be honest if your region has no good fit.', o: [['europe', 'Europe & the Mediterranean', 'incl. Caucasus and Turkey'], ['americas', 'The Americas', 'Latin America, US, Canada'], ['asia', 'Asia-Pacific', 'incl. New Zealand'], ['africa', 'Africa', ''], ['anywhere', 'Anywhere', '']] },
    { k: 'risk', q: 'Risk appetite?', h: 'How much stability are you willing to trade for cheapness?', o: [['safe', 'Rock-solid only', 'stable politics, strong courts, sound currency'], ['balanced', 'Balanced', ''], ['bold', 'Bold — cheap beats safe', 'we accept weaker institutions for land we can afford']] },
  ];
  function wizardScore(ans) {
    const W = { LAND: 1, VISA: 1, TAX: 1, LAW: 1, LIFE: 1, STAB: 1 };
    const add = o => { for (const k in o) W[k] = Math.max(0, W[k] + o[k]); };
    add({ ret: { LIFE: 3, TAX: 3, STAB: 2, VISA: 1 }, remote: { TAX: 3, VISA: 3, LAND: 2 }, fam: { LIFE: 3, LAW: 2, STAB: 3 }, young: { LAND: 3, VISA: 3, TAX: 2, LIFE: -1 } }[ans.group] || {});
    add({ own: { LAND: 3, LAW: 3 }, cost: { LAND: 3, TAX: 2 }, move: { VISA: 4 }, qol: { LIFE: 3, STAB: 2 } }[ans.prio] || {});
    add({ freehold: { LAND: 3, LAW: 2 }, lease: { LAND: 1, VISA: 1 }, access: { VISA: 1, LIFE: 1 } }[ans.land] || {});
    add({ safe: { STAB: 3, LIFE: 1 }, balanced: {}, bold: { STAB: -1, LAND: 2, TAX: 1 } }[ans.risk] || {});
    const REG = { europe: ['Europe', 'Eurasia', 'MENA'], americas: ['Latin America', 'North America'], asia: ['Asia', 'Oceania'], africa: ['Africa'] };
    const warmth = c => { const a = Math.abs(c.lat); return a < 27 ? 'warm' : a < 49 ? 'temperate' : 'cold'; };
    const ranked = ST.countries.map(c => {
      let f = A.fit(c, W); const notes = [];
      if (ans.climate && ans.climate !== 'any') { if (warmth(c) === ans.climate) { f += 6; notes.push('climate match'); } }
      if (ans.region && ans.region !== 'anywhere') { if ((REG[ans.region] || []).includes(c.region)) { f += 8; notes.push('region match'); } }
      if (ans.land === 'freehold' && c.land.ownership === 'banned') { f -= 25; notes.push('foreigners cannot own farmland'); }
      if (ans.land === 'freehold' && c.land.ownership === 'restricted') { f -= 6; notes.push('ownership restricted'); }
      return { c, f: Math.max(0, Math.min(100, Math.round(f))), notes };
    }).sort((a, b) => b.f - a.f);
    return { W, ranked };
  }
  function wizardResult(ans) {
    const { W, ranked } = wizardScore(ans); const top = ranked[0], alts = ranked.slice(1, 5);
    const c = top.c; const bestVisa = (c.visas || []).slice().sort((a, b) => (a.pr_years || 99) - (b.pr_years || 99))[0];
    const max = Math.max(...Object.values(W));
    return `<div class="result">
      <p class="kicker">Your starting point</p>
      <div class="big">${A.flag(c.iso)} ${esc(c.name)}<span class="pct">${top.f}% fit</span></div>
      <p class="p serif" style="font-size:17px">${esc(c.verdict)}</p>
      <div class="alt">Also look at: ${alts.map(a => `<span data-iso="${a.c.iso}">${esc(a.c.name)} ${a.f}%</span>`).join(' · ')}</div>
      <div class="grid">
        <div class="g"><small>Visa route</small>${bestVisa ? `<b>${esc(bestVisa.name)}</b> — ${esc(bestVisa.requirement.length > 200 ? bestVisa.requirement.slice(0, 200).replace(/\s+\S*$/, '') + '…' : bestVisa.requirement)}${bestVisa.pr_years != null ? ` · PR in ${bestVisa.pr_years} yr` : ''}${bestVisa.citizenship_years != null ? ` · citizenship ${bestVisa.citizenship_years} yr` : ''}` : esc(c.visa_detail || c.visa_text)}</div>
        <div class="g"><small>Legal stack</small>${(c.legal.vehicles || []).length ? c.legal.vehicles.slice(0, 3).map(v => `<b>${esc(v.name)}</b>`).join(' · ') : esc(c.legal.text)}</div>
        <div class="g"><small>Land</small>${A.ownBadge(c.land.ownership)} · <b>${A.fmtUSD(c.farm_usd_ha)}/ha</b> typical</div>
        <div class="g"><small>Resilience</small><b>${Math.round(A.stabBlend(c, 'overall') || 0)}/100</b> overall · ${Math.round(A.stabBlend(c, 'currency') || 0)} currency · ${Math.round(A.stabBlend(c, 'climate') || 0)} climate</div>
      </div>
      ${(c.dealbreakers || []).length ? `<div class="deal"><b>Verify first:</b> ${esc(c.dealbreakers[0])}</div>` : ''}
      ${top.notes.length ? `<p class="tiny">Adjustments: ${esc(top.notes.join(', '))}</p>` : ''}
      <h4>How your answers weighted the lenses</h4>
      <div class="bars">${A.LENSES.map(l => `<div><span style="color:${A.LENS_COL[l]}">${esc(A.LENS_LABEL[l])}</span><i style="width:${Math.round(100 * W[l] / max)}%;background:${A.LENS_COL[l]}"></i><b>${W[l]}</b></div>`).join('')}</div>
      <div class="wiz-nav" style="margin-top:14px"><button class="primary" data-wiz="open" data-iso="${c.iso}">Open the ${esc(c.name)} dossier →</button><button data-wiz="apply">Apply these weights to the globe</button></div>
    </div>`;
  }

  return { init, countryCard, communityCard, radarSVG, table, COUNTRY_COLS, COMM_COLS, compare, WIZ, wizardScore, wizardResult, groupSources };
})();
