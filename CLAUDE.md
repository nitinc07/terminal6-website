# Terminal6 Website — Project Intelligence File

> Read by every Claude Code session that touches this repo.
> This is a **separate GitHub repo** (`nitinc07/terminal6-website`, public) from the main private `terminal6` repo. It hosts **terminal6.io** via GitHub Pages. Both repos live side-by-side on disk at `C:\Users\User\downloads\terminal6\` and `C:\Users\User\downloads\terminal6-website\`.

## What this repo is

Static site served as terminal6.io. Two audiences:

1. **Public** (anyone on the internet) — `index.html` only, the marketing landing page.
2. **Gated workspace** (Nitin + `contact@terminal6.io` only) — everything behind Google Sign-In: the prototype dashboard, architecture doc, roadmap.

## File structure

```
terminal6-website/
├── CLAUDE.md              ← YOU ARE HERE
├── CNAME                  — "terminal6.io" (GitHub Pages custom domain)
├── shared.css             — Design tokens + layout + sidebar + cards + tables + pills +
│                            loading/error/empty states + delta pill + section header +
│                            placeholder view. Used by every <brand>.html.
├── shared.js              — Access-gate-friendly API client (X-Brand header driven by
│                            window.T6_BRAND_SLUG), formatters (fmt, cur, pct, shortD,
│                            chg, dp), showErr, initUserChrome, **T6.permissions** (sidebar
│                            allowlist gate — see "Sidebar permissions" below). window.T6
│                            namespace.
├── index.html             — Public landing page. Sign-in button routes to /home.html.
├── home.html              — Sign-in + workspace hub. The ONLY entry point for gated pages.
│                            Stores Google credential as `t6_token` in sessionStorage.
├── sprig.html             — **LIVE SPRIG DASHBOARD.** Reads /shared.css + /shared.js;
│                            owns Sprig-only CSS (agentic strip, red flags, chart cards,
│                            mini-bar) + Sprig tab renderers. See SPRIG_FRONTEND.md.
├── basil.html             — **LIVE BASIL DASHBOARD.** Amazon-only Phase 1. Reads
│                            /shared.css + /shared.js; owns Basil-only CSS (SERP rank
│                            badge, Phase-2 callout) + Basil tab renderers.
├── users.html             — **ADMIN USER MANAGEMENT.** Generic across brands (auto-detects
│                            brand from subdomain). Lists `brand_users` with role dropdown +
│                            per-row collapsible sidebar checkbox grid. Admin-only —
│                            non-admins are redirected back to `/`. PATCHes
│                            `/v1/users/{email}/permissions` on save.
├── product.html           — **PRODUCT DETAIL PAGE.** Per-SKU dossier opened by clicking
│                            product name or seller_sku on any dashboard table. Seller
│                            Central-inspired layout: left sidebar (product image, status
│                            badge, SKU/ASIN IDs, section nav) + right content with
│                            sectioned cards (sales, P&L, inventory, ads, SERP, reviews,
│                            returns, content health). Reads `msku_id` + optional `sku`
│                            from URL params. Calls `GET /v1/products/{msku_id}`.
├── funnel.html            — Standalone D2C funnel page (simpler entry point, same API).
├── app.html               — **DESIGN PROTOTYPE** (mock data). See PROTOTYPE.md.
├── architecture.html      — Investor-facing product architecture doc (mirrored from
│                            terminal6/product/terminal6-architecture.html). Access gated.
├── investor_thesis.html   — Pre-seed investor thesis. Access gated.
└── todos.html             — Layered roadmap with filters. Access gated.
```

### Shared shell pattern (for new brands)

When onboarding brand N:

1. Clone `basil.html` → `<brand>.html` (the smaller template).
2. Change `window.T6_BRAND_SLUG = '<brand>'` at top of the page.
3. Change sidebar brand label + initials.
4. Swap tab set + renderers to match what the brand actually has data for.
5. Keep the `<link rel="stylesheet" href="/shared.css">` + `<script src="/shared.js">` refs — do NOT copy shared CSS/JS inline.
6. **Wire the permissions gate.** The brand init must call `await T6.permissions.init()` then `T6.permissions.applyToSidebar()` *before* the first data load. Use `T6.permissions.canSee('<key>')` / `firstVisible([...])` to pick a landing tab the user can actually see. Every sidebar item must use `onclick="sw('<key>',this)"` so the gate matches it against the user's allowlist.

Rule: **if a style or JS helper applies to more than one brand, it belongs in `shared.*`.** Fighting this rule causes drift; the whole point of extraction was to kill drift before it starts. If you find yourself reaching for copy-paste across brand files, extract instead.

The eventual unification (one `app.html` serving every subdomain) just merges the per-brand files into a tab registry; `shared.css` / `shared.js` are already ready for that day.

## Where to look for what

| Question | File |
|---|---|
| Where does a new CSS rule / JS helper belong (shared vs brand)? | **FRONTEND.md** — the shared shell pattern + drift rule |
| How do I add a new brand dashboard? | **FRONTEND.md** — 5-step recipe near the end |
| Sprig-specific: Chart.js / MSKU table / brand-card markdown | **SPRIG_FRONTEND.md** |
| Design prototype (`app.html`, mock data) | **PROTOTYPE.md** |
| Backend endpoints the frontend calls | `terminal6/api/CLAUDE.md` (main repo) |

**Default reading order for a new frontend task:** this file → `FRONTEND.md` →
per-brand file. Read `SPRIG_FRONTEND.md` only when touching Sprig-specific
conventions.

## Access control — Two-tier model

### Tier 1: Main domain (terminal6.io — GitHub Pages)
Platform-internal workspace. Client-side email allowlist in `home.html`:

```js
const PLATFORM_EMAILS = ['contact@terminal6.io', 'nitinc07@gmail.com', 'kangkan.b14@gmail.com'];
```

On the main domain, only these emails can sign in. Gated pages check `sessionStorage.t6_user` exists and redirect to `/home.html` if not.

### Tier 2: Brand subdomains (sprig.terminal6.io — DO droplet)
Customer-facing dashboards. **Anyone can sign in** — the API enforces access via `brand_users` table:
- `home.html` detects subdomain (`IS_SUBDOMAIN` flag), skips client-side email check
- After sign-in, redirects straight to `/` (the brand dashboard), skipping the workspace hub
- API returns 403 if the email isn't in `brand_users` for that brand
- Platform admins bypass brand check (always have access)

### The access gate script (must be preserved on gated pages)

```html
<script>
/* ACCESS GATE — checks sessionStorage for signed-in user.
   Actual brand access is verified server-side by the API (brand_users table). */
(function(){
  const saved=sessionStorage.getItem('t6_user');
  if(!saved){location.replace('/home.html');document.documentElement.style.display='none';}
})();
</script>
```

**Important:** If you regenerate `architecture.html` or `todos.html` from the main repo, you MUST re-inject this gate script.

**Limitation:** GitHub Pages pages are client-side gated only — prevents casual access, not determined readers.

### Tier 3: Sidebar permissions (per-user, inside a brand)

On top of brand-level access, every `/v1/*` route is sidebar-gated server-side. Owners and admins always see everything; viewers see only the sidebar keys in their `brand_users.allowed_sidebars` list (`NULL` = unrestricted).

The frontend mirrors that gate:

- `T6.permissions.init()` — calls `GET /v1/users/permissions` once on load. Caches `role`, `is_admin`, `visible_sidebars` (Set of keys), and `all_sidebars` (full `SIDEBAR_REGISTRY`).
- `T6.permissions.applyToSidebar()` — hides every `.si` whose `onclick="sw('<key>',...)"` (or `swSub`) references a forbidden key, then collapses any `.ss` group whose items are all hidden.
- `T6.permissions.canSee(key)` / `firstVisible([...])` — used by per-brand init logic to pick a landing tab the user is allowed on.
- Fail-open: if `/v1/users/permissions` errors, the sidebar renders unrestricted. The backend gate still applies, so a forbidden tab simply 403s on click.

The sidebar registry lives in the **main repo** at `api/permissions.py` (`SIDEBAR_REGISTRY` + `PATH_SIDEBAR_MAP`). Adding a new sidebar item to a brand HTML requires a corresponding entry there. See `terminal6/api/CLAUDE.md` "Sidebar permissions" for the full procedure.

The Users admin page is `users.html` — generic across brands, gated on the `users` sidebar key. Bump `?v=` cache-bust on `/shared.css` and `/shared.js` whenever this contract changes (last bump: `2026-04-29a`).

### Google OAuth client

- Client ID: `32739695176-gkc23he5t5l0h7gfq57rkm5pm673l3e5.apps.googleusercontent.com`
- Registered in GCP project `terminal6-492306` (same project as the main backend)
- The consent screen is still in "testing" mode — publishing it is a task in the main repo's TODO.md (M6 Infra)

## Design tokens (shared across all pages)

The pages use a consistent warm serif-and-sans palette defined as CSS variables. When creating new pages or components, reuse these:

```css
--bg: #FAFAF8;          /* warm off-white page bg */
--bg-card: #FFF;        /* card bg */
--bg-warm: #F5F0EB;     /* sections, hover */
--text: #1C1917;        /* primary text */
--text-mid: #57534E;    /* secondary */
--text-light: #A8A29E;  /* tertiary, captions */
--accent: #C2410C;      /* brand orange — logos, CTAs, in-progress */
--accent-light: #FFF7ED;/* orange tint */
--teal: #0F766E;        /* secondary accent, architecture card */
--blue: #1565C0;        /* tertiary, roadmap card */
--green: #2E7D32;       /* done/success */
--border: #E7E5E4;

--serif: 'Source Serif 4', Georgia, serif;  /* headings */
--sans: 'DM Sans', system-ui, sans-serif;   /* body */
--mono: 'JetBrains Mono', monospace;        /* code, metrics */
```

Fonts are loaded from Google Fonts via a single `<link>` tag — keep that pattern.

## Deployment

### Production — DO Droplet (everything)
- **Branch:** `main`
- **Repo on droplet:** `/opt/terminal6-website/` (git clone)
- **URLs served:**
  - `https://terminal6.io` — public landing page + gated workspace
  - `https://sprig.terminal6.io` (and any `<brand>.terminal6.io`) — brand dashboards
  - `https://api.terminal6.io` — FastAPI backend (proxied)
- Nginx serves static files from `/opt/terminal6-website/`, proxies `/v1/` to API with `X-Brand` header
- Deploy: `ssh root@159.89.175.160 "cd /opt/terminal6-website && git pull"`

### Dev Preview — droplet-hosted (changed 15 Apr 2026)
- **Branch:** `dev`
- **URL:** `https://dev.basil.terminal6.io` (and analogous `dev.<brand>.terminal6.io` as brands are added)
- Clone at `/opt/terminal6-website-dev/` on the droplet, nginx vhost proxies `/v1/` to the **staging API on port 8002** (not prod's 8001) so backend changes can be tested end-to-end
- Deploy: `ssh root@159.89.175.160 /opt/terminal6-website-dev/deploy.sh` — pulls latest `dev` branch
- Previously used GitHub Pages at `dev.terminal6.io` (CNAME to `nitinc07.github.io`); that still works as a fallback for pure-static preview but is not the dev environment for API-backed work

### DNS (Bigrock)
- `terminal6.io` — A record → `159.89.175.160` (droplet)
- `www.terminal6.io` — A record → `159.89.175.160` (droplet)
- `*.terminal6.io` — A record → `159.89.175.160` (wildcard, covers all brand subdomains AND dev-subdomains like `dev-api.terminal6.io`, `dev.basil.terminal6.io`, `dev.sprig.terminal6.io`)
- `api.terminal6.io` — A record → `159.89.175.160`
- `dev.terminal6.io` — CNAME → `nitinc07.github.io` (legacy GitHub Pages preview — only the bare `dev.terminal6.io` hostname; sub-subdomains like `dev.basil.terminal6.io` go to the droplet via the wildcard)

### SSL (Let's Encrypt / Certbot on droplet)
- `terminal6.io` + `www.terminal6.io` — single cert, auto-renews
- `api.terminal6.io` — own cert, auto-renews
- `sprig.terminal6.io`, `basil.terminal6.io` — own certs, auto-renew
- `dev-api.terminal6.io`, `dev.basil.terminal6.io` — own certs (issued 15 Apr 2026), auto-renew
- New brands: `certbot --nginx -d <brand>.terminal6.io` (one command per brand). Same for dev variants.

### Workflow
```
dev branch  ──push──▶  Droplet /opt/terminal6-website-dev (dev.basil.terminal6.io)
                │                    hits staging API port 8002
                │ merge dev → main when ready
                ▼
main branch ──pull──▶  Droplet /opt/terminal6-website (basil.terminal6.io)
                                     hits prod API port 8001
```

For backend-touching work, the dev → staging-API cycle is now one flow:
1. Work on feature branch in `terminal6` repo → push
2. `ssh root@159.89.175.160 "/opt/terminal6-staging/deploy.sh feature-branch"` to deploy API to staging
3. Work on `dev` branch in `terminal6-website` repo → push → `/opt/terminal6-website-dev/deploy.sh` on droplet
4. Test at `https://dev.basil.terminal6.io` (website-dev talks to staging API)
5. When green: merge both to `main`, run prod deploys

### Onboarding a new brand subdomain
1. No DNS needed (wildcard A record covers all subdomains)
2. Create `<brand>.html` in this repo
3. `certbot --nginx -d <brand>.terminal6.io` on droplet
4. Add `https://<brand>.terminal6.io` to Google OAuth authorized origins (GCP Console)
5. Add brand slug to `BRAND_REGISTRY` in `api/brand.py`
6. Add CORS origin in `api/main.py`
7. Create `BrandProfile` row + seed `brand_users` in DB

- No build step, no framework — static HTML/CSS/JS only
- Never add a bundler or SSG without a clear reason — the zero-build simplicity is a feature

## Sync with the main repo

`architecture.html` and `todos.html` are **derived** from sources in the main `terminal6` repo:

| Source (terminal6) | Destination (this repo) |
|---|---|
| `product/terminal6-architecture.html` | `architecture.html` |
| `TODO.md` | `todos.html` (hand-styled, not a raw render) |

When the source changes, the website copy must be regenerated, the access gate script re-injected, and both repos committed and pushed in the same session. This rule lives in the main repo's memory as `feedback_sync_website_docs.md`. See it for the exact procedure.

`app.html` is the design prototype — edited directly in this repo, not mirrored. See `PROTOTYPE.md` for full context.

## Conventions

- **No new files unless necessary.** The current 6-file structure (CNAME + 5 HTML) is deliberate. If you need to add a new gated page, copy the access gate script verbatim from an existing gated page.
- **No external JS/CSS frameworks.** Vanilla HTML/CSS/JS only. The only external dependencies are Google Fonts and the Google Identity Services SDK (for sign-in).
- **Never commit secrets.** The OAuth client ID is public by design (it's in the HTML). Anything else — API keys, tokens, service accounts — belongs in the main repo's `.env` on the DO droplet, not here.
- **Keep `index.html` public.** The landing page must work without sign-in. Only the workspace pages are gated.
- **Line endings:** Git is configured with `autocrlf=true` on Windows — don't fight it, the LF→CRLF warnings are expected.

## Access from the main terminal6 session

Sessions started from `C:\Users\User\downloads\terminal6\` can natively Read/Edit/Write this folder because `.claude/settings.local.json` in the main repo includes it under `additionalDirectories`. No `/add-dir` needed.

Bash commands (`git`, `cp`, `mv`) can always reach here regardless of tool permissions.

## Known quirks

- **Write tool `/tmp` path on Windows:** if you use the Write/Edit tools with `/tmp/terminal6-website/...`, the file lands in `C:\tmp\...`, NOT in Bash's `/tmp`. Always use the full Windows path (`C:\Users\User\downloads\terminal6-website\<file>`) for Write/Edit. Bash commands can still use `/tmp/...` — only the Write/Edit tools are affected. This is captured in main-repo memory as `feedback_windows_write_tmp.md` but worth repeating here.
