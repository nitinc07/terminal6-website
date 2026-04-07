# Dashboard Prototype — app.html

> Context for `app.html` — the interactive design prototype with mock data.
> This is the design reference for the product vision. NOT live data.

## What this page is

`app.html` demonstrates the **hierarchical agent model** with mock data for Basil Home Solutions. It's used for investor demos, design discussions, and as the blueprint for the live product (`sprig.html`).

**Edited directly in this repo.** Not mirrored from the main terminal6 repo.

## Current structure (Apr 2026)

### Sidebar navigation
```
Overview
  ☀️ Morning Briefing        (Chief of Staff L0 view)
  📖 Brand Profile            (onboarding context — always visible)

Team (5 domain views)
  📈 Marketing                (Sr. Marketing Manager L1)
  🏷️ Category & Pricing       (Sr. Category Manager L1)
  🏪 Marketplace              (Sr. Marketplace Manager L1)
  📦 Operations               (Sr. Ops Manager L1)
  💰 Finance                  (Sr. Finance Manager L1)

Workspace
  💬 Chat                     (conversational interface, 4 modes)
  ⚙️ Policies & Directives

[View as] dropdown            (role switcher at bottom of sidebar)
```

### Morning Briefing (L0)
Split into four sections:
- **✓ Caught overnight (proactive)** — input monitors that detected issues
- **⚠ Needs your attention** — requires operator decision
- **↘ Watch list** — leading indicators, monitoring
- **📊 Insight** — cross-domain analysis findings

**V1 language:** all "Detected" + "Recommendation:", never "Auto-paused" or "Approved." The system recommends and informs in V1; it does not execute.

### Brand Profile
Onboarding context page (like Claude's project home page):
- About the brand (description, category tags, founding, location)
- Key numbers (monthly revenue, active SKUs, ASP, team size)
- Channel presence (table: channel, status, revenue share, fulfilment, since, account)
- Fulfilment setup (own warehouse, FBA FCs, Flipkart Assured — with capacity details)
- Ad platforms (Amazon SP, Meta, Google — budgets and targets)
- Team & roles (mapped to Terminal6 hierarchy: Brand Head, Sr. Marketing, etc.)
- Active policies & directives (PERMANENT, STRATEGY, TACTICAL — with source/date)
- Key competitors (positioning notes)
- Onboarding timeline (step-by-step log)

### Domain views (L1)
Each shows the senior manager's perspective:
- **Marketing** — campaign insights (delivery degradation, creative fatigue), KPIs, campaign table, 6 throttle signals. Subtitle: "Managing: Amazon Ads, Google Ads, Meta Ads agents"
- **Category & Pricing** — competitor alerts, BSR, pricing KPIs
- **Marketplace** — listing suppression (image compliance), Shopify sync gap (phantom OOS), Buy Box %, listing health
- **Operations** — FC capacity alerts, inventory health table, reorder pipeline
- **Finance** — settlement variance, channel P&L table (revenue → COGS → fees → ads → contribution margin)

### Chat (4 interaction modes)
Shows 3 example conversations demonstrating:
1. **Data query:** "What's my Shopify revenue this week?" → grounded SQL answer + follow-up suggestion
2. **Investigation:** "Why are SKUs showing sold out?" → routed to Marketplace + Operations, returns root cause
3. **Planning:** "Help me plan budget allocation for next month" → consulting Marketing + Finance + Category (in progress)

Input placeholder: "Ask anything about your brand..." — no @agent hints, routing is invisible.

### Right panel
- **Alerts** — proactive detections (detected, not auto-acted)
- **Recommendations** — action items with "Noted" / "Dismiss" buttons (not "Approve" / "Reject")
- **Log** — decision log showing Recommended / Noted / Dismissed states (not Executed)

### Role switcher
"View as" dropdown at bottom of sidebar:
- Brand Head (full view) — all sidebar items full opacity
- Sr. Marketing Manager — Marketing + Overview + Chat emphasised, others dimmed
- Sr. Category / Marketplace / Ops / Finance — same pattern

**L0 (Morning Briefing) + Brand Profile + Chat are ALWAYS visible** to all roles. Only domain views get dimmed (still clickable for context).

## Design principles

1. **V1 = recommend + inform, not execute.** No auto-execution buttons. Phase 2 adds execution authority.
2. **One interface, multiple modes.** The operator talks to "Terminal6" — the system routes to the right agent. No @agent tags needed.
3. **Structure is standard, content adapts.** Same 5 domain views for every brand. Channels, KPIs, categories adapt from BrandProfile.
4. **Every answer grounded in real data.** Chat responses cite source tables. Recommendations show agent reasoning with data sources.
5. **Hierarchy visible but not complex.** Sidebar shows domains, not the full L0/L1/L2 tree. The hierarchy is felt through "Managing: Amazon Ads, Google Ads, Meta Ads agents" subtitles and through how investigations route.

## Brand context (mock data)

The prototype uses **Basil Home Solutions** (not Sprig):
- Premium home & kitchen brand, insulated drinkware
- Founded 2019, Mumbai
- Channels: Amazon (62%), Shopify D2C (26%), Flipkart (12%), Meesho (paused)
- ~₹3.1 Cr/month revenue, 47 active SKUs
- Warehouses: Own (Mumbai), FBA (Delhi + Mumbai), Flipkart Assured (Delhi)
- Team: Founder + 7 ops (Marketing Lead, Ops Manager, Amazon Executive, etc.)
- Competitors: Milton (price warrior), Borosil (premium), Cello (mass market)
