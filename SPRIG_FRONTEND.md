# Sprig Frontend — Live Product Page

> Context for `sprig.html` and `funnel.html` — the live product pages
> that hit real data via the Terminal6 API.

## What these pages are

| Page | Purpose | Data |
|---|---|---|
| `sprig.html` | **Main product page.** Full sidebar app shell with multiple views. | Live API (PostgreSQL) |
| `funnel.html` | Standalone D2C funnel view. Simpler entry point, same API. | Live API |

When iterating on the product UI, edit `sprig.html`. `funnel.html` is kept as a simpler fallback.

## Current views in sprig.html

- **Brand Overview** — KPIs, channel cards, channel sales table (day/week/month granularity + MTD/YTD), D2C daily table, MoM comparison
- **Growth Agent** — campaign-level view (placeholder — being redesigned to match hierarchical model)
- **D2C Funnel** — charts + tables via Chart.js: site-level funnel, top products, traffic sources
- **Supply Agent** — inventory health (placeholder)
- **Category Agent** — pricing/competitive (placeholder)
- **Data Coverage** — source connection matrix + per-table row counts and date ranges
- **Policies** — BrandDirective display

**Note:** The sidebar naming still uses the flat agent model (Growth Agent, Supply Agent, Category Agent). These should be updated to match the hierarchical model from `app.html` (Marketing, Operations, Category & Pricing, Marketplace, Finance) as the live product evolves.

## API Integration

**Base URL:** `https://api.terminal6.io` (hardcoded as `const API = '...'`).
For local dev: comment and use `http://localhost:8000`.

**Auth:** Google ID token passed as `Authorization: Bearer <token>`. Token stored in `sessionStorage.t6_token` at sign-in time (set by `home.html`). Backend verifies with Google's public keys + checks email against allowlist.

**Token lifecycle:** Google ID tokens expire after ~1 hour. If API returns 401, frontend clears session and redirects to `/home.html` for re-auth.

### Endpoints used by sprig.html

| Endpoint | View | Returns |
|---|---|---|
| `/v1/overview/daily?days=7` | Brand Overview | D2C daily table |
| `/v1/overview/monthly?months=6` | Brand Overview | MoM comparison table |
| `/v1/channels/summary?days=7` | Brand Overview | Channel performance cards (revenue, orders, units, share %) |
| `/v1/channels/sales?granularity=daily&periods=7` | Brand Overview | Channel × period sales matrix + MTD + YTD |
| `/v1/funnel/site?days=90` | D2C Funnel | Site-level funnel data |
| `/v1/funnel/products?days=90&limit=20` | D2C Funnel | Top products by views/revenue |
| `/v1/funnel/traffic?days=90` | D2C Funnel | Traffic source breakdown |
| `/v1/data/coverage` | Data Coverage | Per-table row counts and date ranges |
| `/v1/data/sources` | Data Coverage | Source connection matrix |

### Chart library

Chart.js 4.4.7 loaded via CDN `<script>` tag. No build step. Used for funnel charts and trend sparklines.

## What's next for the live product

The live product should evolve toward the `app.html` prototype design:
1. Rename sidebar from flat agents → domain views (Marketing, Category, Marketplace, Operations, Finance)
2. Add Morning Briefing view (currently the overview is just KPIs, not the narrative briefing)
3. Add Brand Profile page
4. Add Chat interface (conversational, data-grounded)
5. Add role-based view switching
6. Add proactive alert panel (recommendations, not just data display)

Each of these requires new API endpoints — coordinate with the backend (`terminal6/api/`).
