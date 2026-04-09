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
├── sprig.html             — **LIVE PRODUCT PAGE.** See SPRIG_FRONTEND.md for full context.
├── funnel.html            — Standalone D2C funnel page (simpler entry point, same API).
├── app.html               — **DESIGN PROTOTYPE** (mock data). See PROTOTYPE.md for full context.
├── architecture.html      — Investor-facing product architecture doc (mirrored from
│                            terminal6/product/terminal6-architecture.html). Access gated.
├── investor_thesis.html   — Pre-seed investor thesis. Access gated.
└── todos.html             — Layered roadmap (L0–L5, ~80 tasks) with filters, color
                             coding, and per-task copy-prompt buttons. Access gated.
```

## Live vs Prototype — two separate context files

| Page | Data | Context file |
|---|---|---|
| `sprig.html` + `funnel.html` | **Live API** (PostgreSQL via api.terminal6.io) | **SPRIG_FRONTEND.md** — API endpoints, auth, views, chart library |
| `app.html` | **Mock data** (hardcoded HTML) | **PROTOTYPE.md** — hierarchical agent model, view structure, design principles |

When iterating on the live product, read `SPRIG_FRONTEND.md`.
When iterating on the design prototype, read `PROTOTYPE.md`.

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

## Deployment — Two serving paths

### GitHub Pages (dev/testing)
- **Branch:** `dev` (changed 9 Apr 2026 — was `main` before)
- **URL:** `https://terminal6.io`
- Pushing to `dev` triggers a rebuild — takes ~30 seconds
- Used by Nitin to test changes before shipping to customers

### DO Droplet (production / customer-facing)
- **Branch:** `main`
- **Repo on droplet:** `/opt/terminal6-website/` (git clone)
- **URL:** `<brand>.terminal6.io` (e.g. `sprig.terminal6.io`)
- Nginx serves `/$brand.html` based on subdomain, proxies `/v1/` to API with `X-Brand` header
- Deploy: `ssh root@159.89.175.160 "cd /opt/terminal6-website && git pull"`

### Workflow
```
dev branch  ──push──▶  GitHub Pages (terminal6.io)  ── Nitin tests
                │
                │ merge when ready
                ▼
main branch ──pull──▶  Droplet (sprig.terminal6.io)  ── Customer sees
```

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
