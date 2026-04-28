/* shared.js — Terminal6 brand dashboards
 *
 * Shared runtime for every <brand>.html page. Brand pages must set
 *     window.T6_BRAND_SLUG = 'basil';   // or 'sprig', etc.
 * BEFORE loading this script. That slug is used to set the X-Brand header
 * on every /v1/* call so the same page works whether hit via the brand
 * subdomain (nginx injects X-Brand) OR the main-domain fallback (we inject
 * it ourselves).
 *
 * Rule: nothing brand-specific lives here. Tab switching, tab renderers,
 * brand-specific formatters all stay in the per-brand HTML. This file is
 * the small, stable API-client + formatter layer every page uses.
 */

(function(){
  'use strict';

  /* ========== CONFIG ========== */
  // On brand subdomains (sprig.terminal6.io), nginx proxies /v1/ and injects X-Brand.
  // On main domain (terminal6.io) or a GitHub Pages preview, fall back to api.terminal6.io
  // and send X-Brand ourselves based on the slug the page declared.
  const IS_SUBDOMAIN = location.hostname.endsWith('.terminal6.io')
    && location.hostname !== 'terminal6.io'
    && location.hostname !== 'www.terminal6.io';
  const API_BASE = IS_SUBDOMAIN ? '' : 'https://api.terminal6.io';

  function token(){ return sessionStorage.getItem('t6_token') || ''; }

  async function api(path){
    const t = token();
    if(!t) throw new Error('No auth token');
    const headers = { 'Authorization': 'Bearer ' + t };
    // Inject X-Brand on fallback path; on subdomain nginx already set it, but
    // sending it again is harmless and makes local dev + GH Pages preview work.
    if(window.T6_BRAND_SLUG) headers['X-Brand'] = window.T6_BRAND_SLUG;
    const r = await fetch(API_BASE + path, { headers });
    if(r.status === 401 || r.status === 403){
      sessionStorage.removeItem('t6_user');
      sessionStorage.removeItem('t6_token');
      location.replace('/home.html');
      throw new Error('Session expired');
    }
    if(!r.ok) throw new Error('API ' + r.status);
    return r.json();
  }

  /* ========== FORMATTERS ========== */
  function fmt(n){ return n == null ? '--' : n.toLocaleString('en-IN'); }

  function cur(n){
    if(n == null) return '--';
    if(n >= 1e7) return '\u20B9' + (n / 1e7).toFixed(2) + ' Cr';
    if(n >= 1e5) return '\u20B9' + (n / 1e5).toFixed(2) + ' L';
    if(n >= 1e3) return '\u20B9' + (n / 1e3).toFixed(1) + 'K';
    return '\u20B9' + Math.round(n);
  }

  function pct(n, d){
    return n == null ? '--' : n.toFixed(d == null ? 2 : d) + '%';
  }

  function shortD(d){
    const p = d.split('-');
    return p[2] + ' ' + ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]];
  }

  /* Inline change indicator for KPI tiles — returns ready-to-use HTML. */
  function chg(v){
    if(v == null) return '';
    const s = v > 0 ? 'u' : v < 0 ? 'd' : 'n';
    const a = v > 0 ? '\u2191' : v < 0 ? '\u2193' : '';
    return '<span class="kd ' + s + '">' + a + ' ' + Math.abs(v).toFixed(1) + '%</span>';
  }

  /* Delta pill for table cells. `inv=true` means lower is better (e.g. ACoS).
   * Returns a <span class="dp"> with class u/d/n depending on direction + goodness. */
  function dp(v, inv){
    if(v == null) return '<span class="dp n">&mdash;</span>';
    const good = (v >= 0) !== !!inv;
    const cls = v > 0 ? (good ? 'u' : 'd') : (v < 0 ? (good ? 'u' : 'd') : 'n');
    const arrow = v > 0 ? '\u2191' : (v < 0 ? '\u2193' : '');
    return '<span class="dp ' + cls + '">' + arrow + Math.abs(v).toFixed(1) + '%</span>';
  }

  /* ========== ERROR UTILITY ========== */
  function showErr(elId){
    return function(e){
      const el = document.getElementById(elId);
      if(el) el.innerHTML = '<div class="error">' + (e && e.message ? e.message : e) + '</div>';
    };
  }

  /* ========== USER CHROME ==========
   * Reads sessionStorage.t6_user and populates the sidebar name + avatar
   * (elements: #sidebarName, #sidebarAvatar). Call from each brand page's
   * init after the DOM is ready. Safe to call with no saved user (no-op). */
  function initUserChrome(){
    try {
      const u = JSON.parse(sessionStorage.getItem('t6_user') || 'null');
      if(!u) return;
      const nameEl = document.getElementById('sidebarName');
      const avEl = document.getElementById('sidebarAvatar');
      if(nameEl) nameEl.textContent = u.name || 'Operator';
      if(avEl){
        if(u.picture){ avEl.style.backgroundImage = 'url(' + u.picture + ')'; avEl.textContent = ''; }
        else if(u.name) avEl.textContent = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      }
    } catch(e) { /* sessionStorage malformed — ignore */ }
  }

  /* tip(content, opts) — build an info-icon + hover-tooltip HTML snippet.
   * Usage in a template string:
   *   `<th>Days Cover ${T6.tip('fulfillable / velocity(14d)')}</th>`
   * Or richer:
   *   T6.tip({formula: 'x = y + z', note: 'y excludes cancelled'})
   * Pass opts.rightAlign=true for columns on the right edge that would
   * clip off-screen with center anchoring. */
  function tip(content, opts){
    opts = opts || {};
    let body;
    if(typeof content === 'string'){
      body = escapeHtml(content);
    } else {
      const formula = content.formula ? '<code>' + escapeHtml(content.formula) + '</code>' : '';
      const note = content.note ? '<span class="nt">' + escapeHtml(content.note) + '</span>' : '';
      body = formula + note;
    }
    const cls = opts.rightAlign ? 'th-info rt' : 'th-info';
    return '<span class="' + cls + '" tabindex="0" aria-label="What is this?">i<span class="th-tip">' + body + '</span></span>';
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* ========== PERMISSIONS ==========
   * Per-user sidebar visibility. Backend gates /v1/* routes by sidebar key
   * (see api/permissions.py). The frontend mirrors that gate by hiding sidebar
   * items the user can't see. Admins (owner/admin/platform_admin) get the full
   * registry back from the API and see every sidebar.
   *
   * Usage in a brand page (call before any sw() and before the first data load):
   *     await T6.permissions.init();
   *     T6.permissions.applyToSidebar();
   *
   * Per-page render gate:
   *     if(!T6.permissions.canSee('users')) location.replace('/<brand>.html');
   */
  const _perm = {
    role: null,
    isAdmin: false,
    visible: null,    // Set<string> of sidebar keys this user can see
    all: [],          // full SIDEBAR_REGISTRY, with {key,label,group,hidden?}
    loaded: false,
  };

  async function permInit(){
    if(_perm.loaded) return _perm;
    try {
      const data = await api('/v1/users/permissions');
      _perm.role = data.role;
      _perm.isAdmin = !!data.is_admin;
      _perm.visible = new Set(data.visible_sidebars || []);
      _perm.all = data.all_sidebars || [];
      _perm.loaded = true;
    } catch(e) {
      // Don't lock the user out on a transient failure — backend still gates
      // every API call, so the worst case here is a sidebar the user can't
      // actually open. Surface the error in the console for debugging.
      console.warn('permissions: init failed', e);
      _perm.loaded = true;       // mark loaded so we don't retry forever
      _perm.visible = null;      // null = treat as unrestricted (show all)
    }
    return _perm;
  }

  function canSee(key){
    if(!_perm.loaded || _perm.visible == null) return true;  // fail-open until loaded
    return _perm.visible.has(key);
  }

  /* Hide every sidebar item whose onclick references a forbidden sw('<key>',...)
   * or swSub('<key>',...). Also hides the section label (.sl) above an
   * empty sub-list so we don't leave dangling group headers. */
  function applyToSidebar(){
    if(!_perm.loaded || _perm.visible == null) return;  // unrestricted
    const items = document.querySelectorAll('.si');
    items.forEach(el => {
      const oc = el.getAttribute('onclick') || '';
      const m = oc.match(/sw(?:Sub)?\(\s*['"]([\w-]+)['"]/);
      if(!m) return;
      const key = m[1];
      if(!_perm.visible.has(key)) el.style.display = 'none';
    });
    // Hide group labels whose section has no visible .si children left
    document.querySelectorAll('.ss').forEach(section => {
      const visibleItem = Array.from(section.querySelectorAll('.si'))
        .some(el => el.style.display !== 'none');
      if(!visibleItem){
        section.style.display = 'none';
      }
    });
  }

  /* Pick the first visible sidebar key matching a candidate list. Used by
   * brand pages to pick the landing tab when the default is hidden. */
  function firstVisible(candidates){
    if(!_perm.loaded || _perm.visible == null) return candidates[0];
    return candidates.find(k => _perm.visible.has(k)) || null;
  }

  /* ========== EXPORTS ==========
   * Surface the helpers on window so per-brand <script> blocks can call them
   * directly without imports. This is deliberate — no build step, vanilla JS. */
  window.T6 = {
    IS_SUBDOMAIN: IS_SUBDOMAIN,
    API_BASE: API_BASE,
    token: token,
    api: api,
    fmt: fmt, cur: cur, pct: pct, shortD: shortD, chg: chg, dp: dp,
    tip: tip,
    showErr: showErr,
    initUserChrome: initUserChrome,
    permissions: {
      init: permInit,
      canSee: canSee,
      applyToSidebar: applyToSidebar,
      firstVisible: firstVisible,
      get role(){ return _perm.role; },
      get isAdmin(){ return _perm.isAdmin; },
      get all(){ return _perm.all; },
    },
  };
  // Also surface commonly-used helpers at top level for readability in
  // brand pages. These names were already used inline in sprig.html / basil.html.
  window.api = api;
  window.fmt = fmt; window.cur = cur; window.pct = pct; window.shortD = shortD;
  window.chg = chg; window.dp = dp; window.showErr = showErr; window.tip = tip;
})();
