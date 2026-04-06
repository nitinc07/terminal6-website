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
├── index.html             — Public landing page. Sign-in button routes to /home.html.
├── home.html              — Sign-in + workspace hub. The ONLY entry point for gated pages.
│                            Shows 5 cards: Sprig V1, Dashboard Prototype, Architecture,
│                            Roadmap, Investor Thesis. Stores Google credential as
│                            `t6_token` in sessionStorage for API auth.
├── sprig.html             — **LIVE PRODUCT PAGE** (6 Apr 2026). Full sidebar app shell
│                            matching the app.html prototype layout. Views:
│                            Brand Overview (KPIs, channel cards, channel sales table
│                            with day/week/month granularity + MTD/YTD, D2C daily table,
│                            MoM comparison), Growth Agent, D2C Funnel (charts + tables
│                            via Chart.js), Supply Agent, Category Agent, Data Coverage
│                            (source matrix + table coverage), Policies. Calls
│                            api.terminal6.io/v1/* endpoints with Bearer token auth.
├── funnel.html            — Standalone D2C funnel page (superseded by sprig.html but
│                            kept as a simpler entry point). Same API calls.
├── app.html               — Interactive dashboard prototype with MOCK DATA (mirrored from
│                            terminal6/product/terminal6-os-v4_2.html). NOT live data.
├── architecture.html      — Investor-facing product architecture doc (mirrored from
│                            terminal6/product/terminal6-architecture.html). Access gated.
├── investor_thesis.html   — Pre-seed investor thesis. Access gated.
└── todos.html             — Layered roadmap (L0–L5, ~80 tasks) with filters, color
                             coding, and per-task copy-prompt buttons. Access gated.
```

## API Integration

Product pages (`sprig.html`, `funnel.html`) call the Terminal6 API at `api.terminal6.io`:

- **Auth:** Google ID token passed as `Authorization: Bearer <token>`. Token stored in
  `sessionStorage.t6_token` at sign-in time (set by `home.html`). Backend verifies with
  Google's public keys + checks email against allowlist.
- **Token lifecycle:** Google ID tokens expire after ~1 hour. If API returns 401, the
  frontend clears session and redirects to `/home.html` for re-auth.
- **API base URL:** hardcoded as `const API = 'https://api.terminal6.io'` in each page.
  For local dev, comment and use `http://localhost:8000`.
- **Endpoints used by sprig.html:**
  - `/v1/overview/daily?days=7` — Brand Overview D2C daily table
  - `/v1/overview/monthly?months=6` — Brand Overview MoM table
  - `/v1/channels/summary?days=7` — Channel performance cards (revenue, orders, units, share %)
  - `/v1/channels/sales?granularity=daily&periods=7` — Channel × period sales matrix + MTD + YTD
  - `/v1/funnel/site?days=90` — D2C Funnel site-level data
  - `/v1/funnel/products?days=90&limit=20` — D2C Funnel top products
  - `/v1/funnel/traffic?days=90` — D2C Funnel traffic sources
  - `/v1/data/coverage` — Data Coverage tab: per-table row counts and date ranges
  - `/v1/data/sources` — Data Coverage tab: source connection matrix
- **Chart library:** Chart.js 4.4.7 loaded via CDN `<script>` tag. No build step.

## Live vs Prototype pages

| Page | Data source | Purpose |
|---|---|---|
| `sprig.html` | **Live API** (PostgreSQL via api.terminal6.io) | Production product page |
| `funnel.html` | **Live API** | Standalone funnel view (simpler) |
| `app.html` | **Mock data** (hardcoded HTML) | Design prototype / demo |

When iterating on the product UI, edit `sprig.html`. The `app.html` prototype is the
design reference but does NOT receive live data.

## Access control — SECURITY CRITICAL

The gated pages (`home`, `sprig`, `funnel`, `app`, `architecture`, `todos`, `investor_thesis`) enforce a **client-side email allowlist**:

```js
const ALLOWED_EMAILS = ['contact@terminal6.io', 'nitinc07@gmail.com'];
```

Flow:
1. User clicks "Sign in" on `index.html` → redirected to `/home.html`
2. `home.html` shows Google Sign-In button → Google returns a JWT → we decode the `email` claim
3. If email is in `ALLOWED_EMAILS`, store `{name, email, picture}` in `sessionStorage.t6_user` and show the hub. Otherwise show "Access restricted" error and clear sessionStorage.
4. Every gated page (`app`, `architecture`, `todos`) has an **access gate script** in `<head>` that runs BEFORE render — it reads `sessionStorage.t6_user`, re-validates the email against `ALLOWED_EMAILS`, and redirects to `/home.html` if invalid.

### The access gate script (must be preserved everywhere)

Every gated page has this as the first thing in `<head>`, immediately after the `<title>` tag:

```html
<script>
(function(){
  const ALLOWED_EMAILS=['contact@terminal6.io','nitinc07@gmail.com'];
  const saved=sessionStorage.getItem('t6_user');
  let ok=false;
  if(saved){try{const u=JSON.parse(saved);ok=ALLOWED_EMAILS.includes((u.email||'').toLowerCase());}catch(e){}}
  if(!ok){sessionStorage.removeItem('t6_user');location.replace('/home.html');document.documentElement.style.display='none';}
})();
</script>
```

**Why this matters:** This gate was lost once during a naïve sync and the workspace was briefly open to anyone with a Google account. Do NOT remove or weaken it. If you regenerate `architecture.html` or `todos.html` from the main repo's source, you MUST re-inject this script before pushing.

**Limitation to be honest about:** this is a client-side gate. The static HTML is still public on GitHub Pages — anyone who reads the source can see the content. It prevents casual access, not a determined reader. For real protection we'd need server-side auth (Cloudflare Access, a private host, etc.) — that's a future task.

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

- **GitHub Pages** serves `main` branch root as `https://terminal6.io`
- The `CNAME` file contains just `terminal6.io`
- Pushing to `main` triggers a rebuild — takes ~30 seconds
- No build step, no framework — static HTML/CSS/JS only
- Never add a bundler or SSG without a clear reason — the zero-build simplicity is a feature

## Sync with the main repo

`architecture.html` and `todos.html` are **derived** from sources in the main `terminal6` repo:

| Source (terminal6) | Destination (this repo) |
|---|---|
| `product/terminal6-architecture.html` | `architecture.html` |
| `TODO.md` | `todos.html` (hand-styled, not a raw render) |

When the source changes, the website copy must be regenerated, the access gate script re-injected, and both repos committed and pushed in the same session. This rule lives in the main repo's memory as `feedback_sync_website_docs.md`. See it for the exact procedure.

`app.html` is loosely mirrored from `terminal6/product/terminal6-os-v4_2.html` but with the sign-in redirect and sidebar "← Workspace" link added. Keep these additions when syncing.

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
