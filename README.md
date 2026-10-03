# Commune Jurisdiction Atlas

**Live:** https://ronturetzky.github.io/commune-jurisdiction-atlas/

An interactive globe for groups asking *where in the world an agrarian intentional community actually pencils out*. It grew out of Session 6 (“Choosing Ground”) of the course *Design an Agrarian Industrial Commune* at The Convent, Greenpoint, Brooklyn ([course deck](https://ronturetzky.github.io/session6-choosing-ground/)).

## What it does

- **50 jurisdictions scored** on six lenses — **LAND · VISA · TAX · LAW · LIFE · STAB** (0–3 each, composite 0–18) — with a full dossier per country: farmland prices, foreign-ownership rules, every realistic visa route (thresholds, terms, processing, years to residency and citizenship), tax system and foreign-pension treatment, healthcare access for newcomers, agricultural support, the legal vehicles a commune could use, zoning, climate and water risk, a six-dimension resilience model with shock scenarios, dealbreakers, and the sources behind each figure.
- **1,000+ real intentional communities mapped** — ecovillages, communes, income-sharing communities, cohousing, kibbutzim and moshavim, Hutterite, Bruderhof, Twelve Tribes and Camphill communities, cooperative villages, Mennonite colonies, kin's-domain settlements and the historic utopias that came before — harvested from Wikidata, Wikipedia, the Global Ecovillage Network map, the Foundation for Intentional Community directory and regional networks, then geo-checked and de-duplicated.
- **Weight what matters** — six sliders re-rank the world live; presets for "cheap land + visa", "low-tax remote", "safe & high QoL", "hedge".
- **Colour the map by anything** — any lens, total suitability, resilience under a currency crisis / regional war / climate shock / authoritarian turn, farmland price, cost of living, ownership rules, years to residency, top tax rate, published indices (Global Peace Index, Corruption Perceptions Index, Fragile States Index, HDI, Numbeo), or community density for every country on Earth.
- **Find my match** — a six-question wizard (group, priority, land ownership, climate, region, risk appetite) that lands on a starting jurisdiction with its visa route, legal stack and dealbreakers.
- **Compare** up to four jurisdictions side by side, **table** of all 50 with CSV/JSON export, a filterable **communities** table with export, and a **Method & sources** page listing every URL cited.
- **Works everywhere** — a WebGL globe with a filled-country choropleth; if WebGL is blocked, the same data renders as a 2D orthographic globe; a flat map mode; mobile layout; shareable URLs that reproduce the exact view.

## Running it

Static site, no build step. Serve the folder over HTTP (e.g. `python3 -m http.server`) and open `index.html`. All libraries are vendored (`three.js`, `d3`, `topojson`, Natural Earth via `world-atlas`); the only network requests are Google Fonts (optional).

## Data

| file | contents |
|---|---|
| `data/countries.json` | the 50 jurisdiction dossiers |
| `data/communities.json` | the community census (id, name, type, country, lat/lng, founded, status, description, website, sources, origin) |
| `data/sources.json` | every cited URL with the jurisdictions / communities that cite it |
| `data/meta.json` | build date and counts |
| `data/iso.json` | ISO 3166 code table used to join map polygons |

Scores were first set in a July-2026 synthesis for the course deck, then re-checked country by country by research agents working from primary sources, each followed by an independent adversarial fact-check (verdicts are shown on every dossier). Communities come from a Wikidata harvest (every item typed intentional community, ecovillage, kibbutz, cohousing, moshav or Hutterite colony with coordinates), a recursive Wikipedia category harvest, the FIC and GEN directories, regional census sweeps with checkers, and the country research; every point was tested against country polygons and duplicates merged by name and distance.

**Decision-support, not legal advice.** Visa thresholds, tax regimes and ownership rules change constantly — confirm anything load-bearing with a local lawyer.

## Reuse

Code and data are open. Cite as *Commune Jurisdiction Atlas, The Convent / Decentral Park, 2026*. Map geometry: Natural Earth (public domain) via world-atlas. Index publishers retain rights to their figures.

Sibling repos: [session6-choosing-ground](https://github.com/RonTuretzky/session6-choosing-ground) · [session5-feasibility](https://github.com/RonTuretzky/session5-feasibility) · [communes-that-work](https://github.com/RonTuretzky/communes-that-work) · [session3-classical-theories](https://github.com/RonTuretzky/session3-classical-theories)
