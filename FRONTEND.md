# Terminal6 Frontend — Shared Shell Pattern

> Read this before adding a new brand page, extracting something into shared,
> or deciding whether a piece of code belongs in a brand file vs. `shared.*`.
> For Sprig-specific implementation details see `SPRIG_FRONTEND.md`.
> For the design prototype (mock data) see `PROTOTYPE.md`.

## Why this pattern exists

We serve one dashboard per brand: `sprig.terminal6.io` → `sprig.html`,
`basil.terminal6.io` → `basil.html`, etc. Brands share 90% of their chrome
(sidebar, cards, tables, formatters, API client) and differ in 10% (which
tabs, which renderers, which KPIs matter).

At small N (2-3 brands), a per-brand HTML file with extracted shared bits
gives us:
- One place to fix a CSS bug or update a formatter
- Per-brand freedom to reorder tabs / drop sections without conditional logic
- A clean path to unification (one `app.html` with a tab registry) whenever
  adding brand N+1 would be cheaper as config than as a new file

The alternative (one monolithic `app.html` with a `/v1/brand/config` endpoint
driving everything) is correct at larger N but premature today.

## File layout

```
terminal6-website/
├── shared.css        — tokens, layout, sidebar, cards, tables, pills,
│                       loading/error/empty, delta pill, section header,
│                       placeholder view. Loaded by every brand page.
├── shared.js         — window.T6 namespace: api() client, formatters
│                       (fmt, cur, pct, shortD, chg, dp), showErr,
│                       initUserChrome. Loaded by every brand page.
├── <brand>.html      — per-brand shell: sidebar tab list, tab markup,
│                       tab renderers, brand-specific CSS.
```

Both `shared.*` files are served as static assets by nginx at `/shared.css`
and `/shared.js` on every brand subdomain.

## The drift rule

**If a style or helper applies to 2+ brands, move it to `shared.*`. If it
applies to only 1 brand, keep it in that brand's file.**

When in doubt, check: would a hypothetical third brand likely need this?
If yes, shared. If no (or "maybe — depends on channels"), keep brand-local
and migrate later when the third brand actually needs it.

Duplicating one line across two brand files is cheaper than a premature
abstraction. Duplicating ten is a smell. The grep-for-duplication check is
cheap: `grep "function <name>" *.html`.

## Contracts

### The `api()` client

Defined in `shared.js`, exposed as `window.api` and `window.T6.api`.

```js
// Brand page must declare its slug BEFORE loading shared.js:
<script>window.T6_BRAND_SLUG = 'basil';</script>
<script src="/shared.js"></script>
```

On every call, `api()`:
1. Reads `sessionStorage.t6_token` (Google ID token from sign-in).
2. Sets `Authorization: Bearer <token>`.
3. Sets `X-Brand: <slug>` so the page works on both subdomain (redundant
   with nginx) and main-domain fallback (needed for local dev / GH Pages
   preview).
4. Redirects to `/home.html` on 401/403 (token expired / brand access denied).
5. Throws `Error('API <status>')` on other failures — let renderers catch.

Endpoints requiring a brand (e.g. `/v1/amazon/*`) 404 if the server can't
resolve a brand_id. That's expected — the brand slug must correspond to
an entry in `BRAND_REGISTRY` in `api/brand.py`.

### Tab renderer contract

A renderer is an `async` function that paints one view. Convention:

```js
async function loadOverview() {
  // Hit one or more endpoints in parallel, paint each section independently.
  // Never gate the whole page on the slowest query.
  api('/v1/overview/pacing').then(renderMTD).catch(showErr('ov-mtd-rev'));
  api('/v1/marketing/blended?days=7').then(renderBlended).catch(showErr('ov-7d-spend'));
  api('/v1/amazon/revenue?days=30').then(renderRev).catch(showErr('ov-revTable'));
}

function renderMTD(payload) {
  // Read payload, write to specific DOM IDs. No fetch here.
  // Renderers are pure paint — testable in isolation if we ever want to.
}
```

**Errors:** every fetch chains `.catch(showErr('some-dom-id'))`. `showErr`
paints a red error box in that target. A broken endpoint leaves the rest
of the page usable — operators see "Revenue load failed" instead of a
blank screen.

**Empty states:** when the API returns `data: []` or `count: 0`, renderers
write `<div class="empty">No X in window</div>` instead of a blank table.
The `.empty` class is in `shared.css`.

### `window.T6_BRAND_SLUG`

One variable, set at the top of each brand page. Drives:
- `X-Brand` header on every API call (main-domain fallback path).
- Logged implicitly in browser network tab for debugging.

That's it. The slug is **not** used for tab filtering or rendering logic;
tabs are declared explicitly in each brand's HTML sidebar. When we unify
to `app.html`, the slug will key into a tab registry, but today it's just
a header value.

### Empty state vs. hidden tab

Two different things:

| Situation | Approach |
|---|---|
| Channel declared in `active_channels`, data not flowing yet (Basil's Shopify, token pending) | **Show the tab**, render a `.ph2` callout explaining what's blocking |
| Channel not in `active_channels` at all (Basil's UC) | **Hide the tab** — don't include it in the sidebar |

Rule of thumb: operators should see what's coming if it's wired but not
yet delivering; they shouldn't see irrelevant tabs for channels they'll
never enable. Today this decision is hard-coded per brand. Post-unification
it'll come from the brand config endpoint.

## Adding a new brand (5-step recipe)

Say brand slug `foo` is onboarding with Amazon IN + Meta Ads, no Shopify.

1. **Copy template.** `cp basil.html foo.html` — Basil is the smaller,
   more modern template. Sprig carries more legacy baggage.

2. **Swap slug + labels.** In `foo.html`:
   - Change `window.T6_BRAND_SLUG = 'basil'` → `= 'foo'`
   - Change `<title>` + sidebar brand name ("Basil" → "Foo") + sidebar
     initials (`BR` → `FO`)

3. **Swap tab set.** Remove tabs for channels `foo` doesn't have (e.g.,
   if no SERP tracking yet, remove the SERP tab entry from the sidebar
   and its `<div class="vw" id="v-serp">` block). Keep Overview always.

4. **Verify endpoints.** Every `api('/v1/<path>')` call in `foo.html`
   must be brand-scoped at the API layer — either via
   `request.state.brand_id` (the `/v1/overview/*`, `/v1/channels/*`,
   `/v1/marketing/*` pattern) or hard-required (the `/v1/amazon/*`
   pattern, which 404s without a brand). Cross-check
   `api/routes/amazon_metrics.py` + brand-scoping fixes in the other
   route files.

5. **Deploy.** On droplet: `certbot --nginx -d foo.terminal6.io`; clone
   `/etc/nginx/sites-available/sprig.terminal6.io` → `foo.terminal6.io`
   with `X-Brand: foo`; add `https://foo.terminal6.io` to Google OAuth
   authorised origins; add `foo` to `BRAND_REGISTRY` in `api/brand.py`
   + CORS in `api/main.py`. Push repos + `git pull` on droplet.

Adding a truly new channel (say, TikTok Shop) is a bigger task that
probably lives on the backend side (new connector, normaliser, endpoints)
before the frontend needs to care.

## Path to unification

Trigger: the first time you'd benefit from a shared tab (e.g., a new
"Insights" tab that every brand with Amazon Ads should see) and realise
you're editing N brand files.

At that point:

1. Create `/v1/brand/config` (new endpoint) — returns brand slug, name,
   active_channels, and capability flags (`msku_grouping_ready`,
   `cogs_loaded`, etc.) + cheap data-coverage probes.

2. Merge brand files into one `app.html` with a tab registry:
   ```js
   const TABS = [
     { id:'overview',    always:true, render: renderOverview },
     { id:'amz_revenue', requires:['amazon_in.has_sales'], render: renderRev },
     { id:'serp',        requires:['amazon_in.has_serp'],  render: renderSERP },
     // ...
   ];
   ```
   On load: fetch brand config → filter tabs → render sidebar → paint first.

3. nginx serves `app.html` at `/` on every brand subdomain (one config
   file instead of per-brand).

The extraction work already done (`shared.css` + `shared.js` + brand-
required endpoints) is the ~80% of the unification effort. The registry
step is the cleanup.

## When NOT to extract

- A style/helper used by exactly one brand that might go away.
  Premature sharing is worse than duplication you can delete.
- Something that differs subtly between brands. If two "similar" helpers
  aren't byte-identical, share only if you can find a clean parameterisation;
  otherwise keep both.
- Anything involving branding primitives (logo, initials, colour accent if
  it ever differs) — these stay per-brand by design.

## Checking for drift

Quick shell sanity check you can run before a commit:

```bash
grep -h "^function " *.html | sort | uniq -c | sort -rn | head
```

Any function defined in 2+ files is a candidate for `shared.js`. Any CSS
selector duplicated across brand files is a candidate for `shared.css`.

## Related

- `CLAUDE.md` — file tree + deployment + access control (load-first).
- `SPRIG_FRONTEND.md` — Sprig-specific: Chart.js conventions, MSKU table
  structure, brand-card markdown parser, per-view tab details.
- `PROTOTYPE.md` — `app.html` design prototype (mock data, separate track).
- `terminal6/api/CLAUDE.md` — every endpoint the frontend calls, with
  brand-scoping status.
