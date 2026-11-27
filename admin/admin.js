// Shared helpers for the admin login + dashboard pages.
// All data comes from the Worker's /admin/* API (see quotation-generator/backend/src/admin.js);
// nothing secret lives in this file.

// GitHub Pages can't send X-Frame-Options, so refuse to run inside another site's frame (clickjacking).
if (window.top !== window.self) {
  document.documentElement.hidden = true;
  window.top.location = window.self.location.href;
}

const API_BASE = 'https://prubsn-submission-service.syakirbadry.workers.dev';
// Clients with no agent tag came from the owner's own form link (and everything before agent links existed).
const OWNER_AGENT_LABEL = 'Syakir';
const SESSION_KEY = 'prubsn-admin-session';
// The Quotation Generator (quotation-generator repo) lives on this same site, so it shares
// this sign-in when opened in the same tab. ?vb=<id> links its quotation to that VB name.
const QUOTATION_TOOL_URL = 'https://syakirbadry-tech.github.io/quotation-generator/browser-tool/';
const quotationToolUrl = (vbId) => (vbId ? `${QUOTATION_TOOL_URL}?vb=${encodeURIComponent(vbId)}` : QUOTATION_TOOL_URL);

// The owner signs in with an email and has no name on the server, so show this instead.
// Every team member is created with a name; only the owner's "name" can be an email.
const OWNER_DISPLAY_NAME = 'Syakir';
const personName = (raw) => {
  const s = String(raw || '').trim();
  return s.includes('@') ? OWNER_DISPLAY_NAME : s;
};

const Session = {
  get() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (!s || !s.token || !s.expiresAt || s.expiresAt * 1000 <= Date.now()) return null;
      return s;
    } catch (e) {
      return null;
    }
  },
  set(value) {
    DataCache.clear();
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); } catch (e) { /* private mode: session lasts for this page only */ }
  },
  clear() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    DataCache.clear();
  },
  // Sessions from before team accounts existed were always the owner. The server enforces access; this only shapes the UI.
  user(s) {
    const u = (s && s.user) || { name: s ? s.username : '', role: 'owner' };
    return { ...u, name: personName(u.name || (s && s.username)) };
  }
};

// The last copy of each main list, so a page can show it at once and then refresh
// from the server (owner's OK, 27 Nov 2026). It lives in sessionStorage only: it is
// tied to this sign-in, gone when the app is closed, and wiped on sign-out.
const DataCache = {
  PREFIX: 'asg-data:',
  PATHS: ['/admin/vb', '/admin/submissions', '/admin/presentation-answers'],
  MAX_AGE: 12 * 3600 * 1000,
  key(path) {
    const s = Session.get();
    return s && this.PATHS.includes(path) ? `${this.PREFIX}${s.expiresAt}:${path}` : null;
  },
  get(path) {
    try {
      const k = this.key(path);
      const v = k && JSON.parse(sessionStorage.getItem(k) || 'null');
      return v && Date.now() - v.t < this.MAX_AGE ? v.d : null;
    } catch (e) {
      return null;
    }
  },
  set(path, data) {
    const k = this.key(path);
    if (!k) return;
    try {
      sessionStorage.setItem(k, JSON.stringify({ t: Date.now(), d: data }));
    } catch (e) {
      this.clear(); // storage full or blocked: keep nothing rather than half
    }
  },
  clear() {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(DataCache.PREFIX)) sessionStorage.removeItem(k);
      }
    } catch (e) { /* ignore */ }
  }
};

const ROLE_LABELS = { owner: 'Owner', leader: 'Leader', agent: 'Agent' };

function agentLabel(s) {
  return s.agentName || OWNER_AGENT_LABEL;
}

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const s = Session.get();
    if (!s) throw new ApiError('Your session has expired. Please sign in again.', 401, 'unauthorized');
    headers.Authorization = `Bearer ${s.token}`;
  }
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit'
    });
  } catch (e) {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0, 'network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new ApiError(data.error || `Request failed (HTTP ${res.status}).`, res.status, data.code);
  }
  if (method === 'GET' && auth) DataCache.set(path, data);
  return data;
}

// Builds DOM nodes without innerHTML so client-entered text can never run as markup.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const TZ = 'Asia/Kuala_Lumpur';

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('en-MY', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('en-MY', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMoney(n) {
  if (n == null || n === '') return '';
  const v = Number(n);
  return Number.isFinite(v) ? `RM ${v.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(n);
}

// ---------- Birthday reminders ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BIRTHDAY_REMINDER_DAYS = 5;

// Date of birth as {y, m (0-11), d}; falls back to the NRIC's YYMMDD prefix.
function birthDate(dob, nric) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob || '');
  if (iso) return { y: +iso[1], m: +iso[2] - 1, d: +iso[3] };
  const ic = /^(\d{2})(\d{2})(\d{2})/.exec(String(nric || '').replace(/\D/g, ''));
  if (!ic) return null;
  const yy = +ic[1];
  const m = +ic[2] - 1;
  const d = +ic[3];
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const nowYY = new Date().getFullYear() % 100;
  return { y: yy > nowYY ? 1900 + yy : 2000 + yy, m, d };
}

// Today's calendar date in Malaysia (as a UTC midnight), whatever the device's time zone.
function todayMY() {
  const [y, m, d] = new Date().toLocaleDateString('en-CA', { timeZone: TZ }).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function birthdayInfo(bd, now) {
  if (!bd) return { age: null, daysToBirthday: null };
  const year = now.getUTCFullYear();
  const age = year - bd.y - ((now.getUTCMonth() < bd.m || (now.getUTCMonth() === bd.m && now.getUTCDate() < bd.d)) ? 1 : 0);
  let next = new Date(Date.UTC(year, bd.m, bd.d));
  if (next < now) next = new Date(Date.UTC(year + 1, bd.m, bd.d));
  return { age, daysToBirthday: Math.round((next - now) / 86400000) };
}

function untilText(days) {
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

// Pops up once per sign-in session with clients whose birthday is today or within the next few days.
// clients: [{ name, phone, bd }]
function showBirthdayReminder(clients) {
  const SHOWN_KEY = 'prubsn-birthday-reminder';
  const now = todayMY();
  const stamp = now.toISOString().slice(0, 10);
  try { if (sessionStorage.getItem(SHOWN_KEY) === stamp) return; } catch (e) { /* ignore */ }

  const due = clients
    .map((c) => ({ ...c, ...birthdayInfo(c.bd, now) }))
    .filter((c) => c.daysToBirthday != null && c.daysToBirthday <= BIRTHDAY_REMINDER_DAYS)
    .sort((a, b) => a.daysToBirthday - b.daysToBirthday || a.name.localeCompare(b.name));
  if (!due.length) return;
  try { sessionStorage.setItem(SHOWN_KEY, stamp); } catch (e) { /* ignore */ }

  const person = (c) => {
    const turns = c.daysToBirthday === 0 ? c.age : c.age + 1;
    return el('li', { class: 'reminder-item' },
      el('div', { class: 'reminder-date' }, el('b', { text: c.bd.d }), el('span', { text: MONTHS[c.bd.m] })),
      el('div', { class: 'grow' },
        el('div', { class: 'name', text: c.name }),
        el('div', { class: 'sub', text: [`Turns ${turns}`, c.phone].filter(Boolean).join('  ·  ') })
      ),
      el('div', { class: 'reminder-until', text: untilText(c.daysToBirthday) })
    );
  };
  const todays = due.filter((c) => c.daysToBirthday === 0);
  const coming = due.filter((c) => c.daysToBirthday > 0);

  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const okBtn = el('button', { class: 'btn btn--primary', type: 'button', onclick: close }, 'OK');
  const overlay = el('div', { class: 'reminder-overlay', onclick: (e) => { if (e.target === overlay) close(); } },
    el('div', { class: 'reminder', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'reminderTitle' },
      el('h2', { id: 'reminderTitle' }, iconEl('cal', 22), 'Birthday reminder'),
      todays.length ? el('section', {}, el('h3', { text: 'Today' }), el('ul', {}, todays.map(person))) : null,
      coming.length ? el('section', {}, el('h3', { text: `Next ${BIRTHDAY_REMINDER_DAYS} days` }), el('ul', {}, coming.map(person))) : null,
      el('div', { class: 'reminder-actions' }, okBtn)
    )
  );
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  okBtn.focus();
}

// ---------- Shared UI helpers (sheets, toast, confirm) ----------

// Swipe down from the top of a bottom sheet to close it (phones only).
function enableSwipeClose(sheet, onClose) {
  let startY = null;
  sheet.addEventListener('touchstart', (e) => {
    startY = sheet.scrollTop <= 0 && window.innerWidth < 768 ? e.touches[0].clientY : null;
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (startY == null) return;
    const dy = Math.max(0, e.touches[0].clientY - startY);
    sheet.style.transform = dy ? `translateY(${dy}px)` : '';
  }, { passive: true });
  sheet.addEventListener('touchend', (e) => {
    if (startY == null) return;
    const dy = e.changedTouches[0].clientY - startY;
    startY = null;
    sheet.style.transform = '';
    if (dy > 90) onClose();
  });
}

// Short confirmation at the bottom of the screen (one at a time).
function showToast(message, { icon = 'check', action } = {}) {
  document.querySelectorAll('.toast[data-shell]').forEach((t) => t.remove());
  const toast = el('div', { class: 'toast', id: 'toast', 'data-shell': '', role: 'status' },
    el('span', { class: 'toast__icon' }, iconEl(icon, 18)),
    el('span', { class: 'grow', text: message }),
    action ? el('button', { type: 'button', onclick: () => { toast.remove(); action.onClick(); } }, action.label) : null);
  document.body.append(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Apple-style action sheet for destructive choices: destructive button on top, Cancel at the bottom.
// Resolves true when confirmed.
function confirmAction({ title, message, confirmLabel, icon = 'trash' }) {
  return new Promise((resolve) => {
    const opener = document.activeElement;
    const scrim = el('div', { class: 'scrim', 'data-shell': '' });
    const ok = el('button', { class: 'actionsheet__btn actionsheet__btn--destructive', id: 'confirmDeleteBtn', type: 'button' }, confirmLabel);
    const cancel = el('button', { class: 'actionsheet__btn', id: 'confirmCancelBtn', type: 'button' }, 'Cancel');
    const sheet = el('div', { class: 'actionsheet', id: 'confirmSheet', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'confirmTitle', 'aria-describedby': 'confirmMsg' },
      el('div', { class: 'actionsheet__group' },
        el('div', { class: 'actionsheet__msg' },
          el('span', { class: 'confirm-icon' }, iconEl(icon, 22)),
          el('div', { class: 'confirm-title', id: 'confirmTitle', text: title }),
          el('div', { class: 'sub', id: 'confirmMsg', text: message })),
        ok),
      el('div', { class: 'actionsheet__group' }, cancel));
    const done = (v) => {
      scrim.remove(); sheet.remove();
      document.removeEventListener('keydown', onKey);
      if (opener && opener.focus) opener.focus();
      resolve(v);
    };
    const onKey = (e) => { if (e.key === 'Escape') done(false); };
    ok.addEventListener('click', () => done(true));
    cancel.addEventListener('click', () => done(false));
    scrim.addEventListener('click', () => done(false));
    document.addEventListener('keydown', onKey);
    document.body.append(scrim, sheet);
    cancel.focus();
  });
}

// NRIC in lists: 900101-14-•••• (full number only in the customer detail).
function maskNric(nric) {
  const d = String(nric || '').replace(/\D/g, '');
  if (d.length < 8) return d ? '••••' : '';
  return `${d.slice(0, 6)}-${d.slice(6, 8)}-••••`;
}

// NRIC in full, formatted 900101-14-5678.
function formatNric(nric) {
  const d = String(nric || '').replace(/\D/g, '');
  return d.length === 12 ? `${d.slice(0, 6)}-${d.slice(6, 8)}-${d.slice(8)}` : String(nric || '');
}

// Malaysian numbers for wa.me: 012-345 6789 -> 60123456789.
function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('60')) return d;
  return d.startsWith('0') ? `6${d}` : d;
}

// Dummy / test entries (shown with a TEST tag and their own filter).
function isTestEntry(name) {
  return /\b(test|testing|dummy)\b/i.test(String(name || ''));
}

// ---------- Icons (design/icons.js; no emoji in the UI) ----------

// Returns the SVG node for an ASG_ICON name. Icon strings are fixed markup from icons.js, never user text.
function iconEl(name, size = 20, label) {
  const t = document.createElement('template');
  t.innerHTML = window.ASG_ICON ? window.ASG_ICON(name, size, label) : '';
  return t.content.firstElementChild || document.createTextNode('');
}

// ---------- App shell: phone tab bar + "+" Create sheet; sidebar on screens ≥ 768 px ----------

// Sections still being built are listed so agents can see what is coming, but are not links yet.
const NAV_HOME = { id: 'home', label: 'Home', href: 'home.html', icon: 'home' };
const NAV_ALERTS = { id: 'alerts', label: 'Alerts', href: 'alerts.html', icon: 'bell' };
const NAV_GROUPS = [
  ['Client journey', [
    { id: 'customers', label: 'Customers', href: 'dashboard.html', icon: 'users' },
    { id: 'vb', label: 'VB pipeline', href: 'vb.html', icon: 'target' },
    { id: 'appointments', label: 'Appointments', href: 'appointments.html', icon: 'cal' },
    { id: 'quotations', label: 'Quotations', href: QUOTATION_TOOL_URL, icon: 'file' },
    { id: 'presentation', label: 'Presentation', href: 'presentation.html', icon: 'present' },
    { id: 'answers', label: 'Presentation answers', href: 'answers.html', icon: 'chat' },
    { id: 'forms', label: 'My form link', href: 'forms.html', icon: 'link' }
  ]],
  ['Motivation', [
    { id: 'contests', label: 'Contests', icon: 'trophy', soon: true }
  ]],
  ['Reports', [
    { id: 'insights', label: 'Insights', href: 'insights.html', icon: 'chart' },
    { id: 'team', label: 'Team', href: 'team.html', icon: 'team', ownerOnly: true }
  ]]
];
const NAV_TABS = [
  { id: 'home', label: 'Home', href: 'home.html', icon: 'home' },
  { id: 'customers', label: 'Customers', href: 'dashboard.html', icon: 'users' },
  { id: 'vb', label: 'VB', href: 'vb.html', icon: 'target' },
  { id: 'more', label: 'More', href: 'more.html', icon: 'grid' }
];
// "+" sheet. `page` + #addBtn: on that page the sheet just opens the page's own add form.
const CREATE_ITEMS = [
  { label: 'Add VB name', sub: 'New prospect in VB1', icon: 'useradd', href: 'vb.html?create', page: 'vb' },
  { label: 'New quotation', sub: 'From 1–3 product illustration PDFs', icon: 'file', href: QUOTATION_TOOL_URL },
  { label: 'Book appointment', sub: 'Pick a VB name and a time', icon: 'cal', href: 'appointments.html?create', page: 'appointments' },
  { label: 'Share my form link', sub: 'WhatsApp or copy', icon: 'share', href: 'forms.html' }
];
const SIDEBAR_KEY = 'asg-sidebar-collapsed';
const AVATAR_COLOURS = 8;

function navVisible(n, me) {
  return !n.ownerOnly || me.role === 'owner';
}

function initials(name) {
  const parts = String(name || '').replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// Round initials badge; stable colour per person (hash of id/name → one of 8 tokens).
function avatarEl(me, name) {
  const key = String(me.id || name || '');
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const node = el('span', { class: 'avatar', 'aria-hidden': 'true', text: initials(name) });
  node.style.setProperty('--av', `var(--av-${(h % AVATAR_COLOURS) + 1})`);
  return node;
}

function signOut() {
  Session.clear();
  location.replace('./');
}

// One sheet at a time: grabber + swipe down, ✕, Escape and tap outside all close it.
function openSheet({ id, title, body }) {
  if (document.querySelector('.sheet[data-shell]')) return null;
  const opener = document.activeElement;
  const scrim = el('div', { class: 'scrim', 'data-shell': '' });
  const closeBtn = el('button', { class: 'sheet__close', type: 'button', 'aria-label': 'Close' }, iconEl('x', 22));
  const sheet = el('div', { class: 'sheet', id, 'data-shell': '', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': `${id}Title` },
    el('div', { class: 'sheet__grabber', 'aria-hidden': 'true' }),
    el('div', { class: 'sheet__head' }, el('h2', { class: 'sheet__title', id: `${id}Title`, text: title }), closeBtn),
    body
  );
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    scrim.remove();
    sheet.remove();
    document.removeEventListener('keydown', onKey);
    if (opener && opener.focus) opener.focus();
  }
  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  enableSwipeClose(sheet, close);
  document.body.append(scrim, sheet);
  closeBtn.focus();
  return { close };
}

// Clicks the page's own add button (once its data has loaded). Returns false if the page has none.
function clickAddWhenReady() {
  const start = Date.now();
  if (!document.getElementById('addBtn')) return false;
  const tryOpen = () => {
    const btn = document.getElementById('addBtn');
    const status = document.getElementById('lastUpdated');
    const ready = btn && !btn.disabled && !(status && /Loading/.test(status.textContent));
    if (ready) btn.click();
    else if (Date.now() - start < 10000) setTimeout(tryOpen, 150);
  };
  tryOpen();
  return true;
}

function openCreateSheet(active) {
  let sheet = null;
  const row = (c) => el('a', {
    class: 'li', href: c.href,
    onclick: (e) => {
      if (c.page && c.page === active && document.getElementById('addBtn')) {
        e.preventDefault();
        sheet.close();
        clickAddWhenReady();
      }
    }
  },
  el('span', { class: 'li__icon' }, iconEl(c.icon, 22)),
  el('div', { class: 'li__main' }, el('div', { class: 'li__title', text: c.label }), el('div', { class: 'li__sub', text: c.sub })),
  iconEl('chev', 20));
  sheet = openSheet({ id: 'createSheet', title: 'Create', body: el('div', { class: 'list' }, CREATE_ITEMS.map(row)) });
}

// ⌘K / Ctrl K: jump to any page by name.
function openCmdk(me) {
  if (document.getElementById('cmdk')) return;
  const opener = document.activeElement;
  const pages = [NAV_HOME, NAV_ALERTS, ...NAV_GROUPS.flatMap(([, items]) => items), { id: 'alertsettings', label: 'Alert settings', href: 'alert-settings.html', icon: 'gear' }, { id: 'intro', label: 'Help & introduction', href: 'intro.html?again', icon: 'help' }].filter((n) => !n.soon && navVisible(n, me));
  const input = el('input', { class: 'input', type: 'search', placeholder: 'Go to a page', 'aria-label': 'Search pages', autocomplete: 'off', role: 'combobox', 'aria-controls': 'cmdkList', 'aria-expanded': 'true' });
  const list = el('ul', { class: 'cmdk__list', id: 'cmdkList', role: 'listbox', 'aria-label': 'Pages' });
  let sel = 0;
  let shown = pages;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    shown = pages.filter((n) => n.label.toLowerCase().includes(q));
    sel = Math.max(0, Math.min(sel, shown.length - 1));
    list.replaceChildren(...(shown.length
      ? shown.map((n, i) => el('li', { role: 'presentation' },
        el('a', { href: n.href, role: 'option', id: `cmdk-${n.id}`, 'aria-selected': i === sel ? 'true' : 'false' }, iconEl(n.icon, 20), n.label)))
      : [el('li', { class: 'cmdk__empty', text: 'No page with that name.' })]));
    if (shown[sel]) input.setAttribute('aria-activedescendant', `cmdk-${shown[sel].id}`);
  };
  const close = () => { overlay.remove(); if (opener && opener.focus) opener.focus(); };
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); }
    else if (e.key === 'Enter' && shown[sel]) { location.href = shown[sel].href; }
    else if (e.key === 'Escape') { close(); }
  });
  const overlay = el('div', { class: 'cmdk', id: 'cmdk', onclick: (e) => { if (e.target === overlay) close(); } },
    el('div', { class: 'cmdk__panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Go to a page' },
      el('div', { class: 'search' }, iconEl('search', 20), input), list));
  render();
  document.body.append(overlay);
  input.focus();
}

// Number badge on a tab / sidebar item (e.g. setNavBadge('customers', 2)). 0 removes it.
function setNavBadge(id, count) {
  document.querySelectorAll(`[data-nav="${id}"]`).forEach((a) => {
    let b = a.querySelector('.badge, .sb-badge');
    if (!count) { if (b) b.remove(); return; }
    if (!b) { b = el('span', { class: a.closest('.sidebar') ? 'sb-badge' : 'badge' }); a.append(b); }
    b.textContent = count > 99 ? '99+' : String(count);
    b.setAttribute('aria-label', `${count} need attention`);
  });
}

// Adds the app shell to a signed-in page. `active` is the nav id of the current page.
function mountPortalNav(active, session) {
  const me = Session.user(session);
  const name = me.name;
  const role = ROLE_LABELS[me.role] || '';
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  let collapsed = false;
  try { collapsed = localStorage.getItem(SIDEBAR_KEY) === '1'; } catch (e) { /* ignore */ }

  // Wrap the page: <div class="app"> sidebar + <div class="app-main">page</div> </div>
  const main = el('div', { class: 'app-main' });
  main.append(...Array.from(document.body.childNodes).filter((n) => !(n.nodeType === 1 && n.tagName === 'SCRIPT')));

  const sbItem = (n) => {
    const kids = [iconEl(n.icon, 22), el('span', { class: 'sb-label', text: n.label })];
    if (n.soon) return el('span', { class: 'sb-item', 'aria-disabled': 'true', title: `${n.label} (soon)` }, kids, el('span', { class: 'pill pill--neutral', text: 'Soon' }));
    return el('a', { class: 'sb-item', href: n.href, title: n.label, 'aria-label': n.label, 'data-nav': n.id, 'aria-current': n.id === active ? 'page' : null }, kids);
  };
  const sidebar = el('nav', { class: 'sidebar', id: 'sidebar', 'aria-label': 'Portal menu', 'data-collapsed': collapsed ? 'true' : 'false' },
    el('div', { class: 'sb-brand' },
      el('img', { src: 'asg-mark.svg', alt: 'ASG Ansar Group', width: '40', height: '35' }),
      el('div', { class: 'sb-brand__text' }, el('div', { class: 'sb-brand__name', text: 'ASG Ansar Group' }), el('div', { class: 'sb-brand__sub', text: [name, role].filter(Boolean).join(' · ') }))),
    el('button', { class: 'sb-item', type: 'button', title: 'Search', 'aria-label': 'Search pages', onclick: () => openCmdk(me) },
      iconEl('search', 22), el('span', { class: 'sb-label', text: 'Search' }), el('kbd', { class: 'sb-kbd', text: isMac ? '⌘K' : 'Ctrl K' })),
    el('div', { class: 'sb-nav' },
      el('div', { class: 'sb-group' }, sbItem(NAV_HOME), sbItem(NAV_ALERTS)),
      NAV_GROUPS.map(([title, items]) => el('div', { class: 'sb-group' }, el('div', { class: 'sb-head', text: title }), items.filter((n) => navVisible(n, me)).map(sbItem)))),
    el('div', { class: 'sb-foot' },
      el('button', { class: 'sb-item sb-item--danger', type: 'button', title: 'Sign out', 'aria-label': 'Sign out', onclick: signOut }, iconEl('signout', 22), el('span', { class: 'sb-label', text: 'Sign out' })),
      el('div', { class: 'sb-me' }, avatarEl(me, name), el('div', { class: 'sb-me__text' }, el('div', { class: 'sb-me__name', text: name }), el('div', { class: 'sub', text: role }))))
  );

  const tab = NAV_TABS.some((t) => t.id === active) ? active : 'more';
  const tabbar = el('nav', { class: 'tabbar', 'aria-label': 'Main' },
    NAV_TABS.map((t) => el('a', { href: t.href, 'data-nav': t.id, 'aria-current': t.id === tab ? 'page' : null }, iconEl(t.icon, 24), el('span', { text: t.label }))));
  const fab = el('button', { class: 'fab', id: 'fab', type: 'button', 'aria-label': 'Create', 'aria-haspopup': 'dialog', onclick: () => openCreateSheet(active) }, iconEl('plus', 26));

  document.body.prepend(el('div', { class: 'app' }, sidebar, main), tabbar, fab);

  // Collapse / expand the sidebar (button sits at the start of the page's top bar).
  const toggle = el('button', { class: 'icon-btn icon-btn--plain sb-toggle', id: 'sbCollapse', type: 'button', 'aria-controls': 'sidebar' }, iconEl('panel', 22));
  const setCollapsed = (v) => {
    sidebar.dataset.collapsed = v ? 'true' : 'false';
    toggle.setAttribute('aria-expanded', v ? 'false' : 'true');
    toggle.setAttribute('aria-label', v ? 'Expand sidebar' : 'Collapse sidebar');
    try { localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0'); } catch (e) { /* ignore */ }
  };
  toggle.addEventListener('click', () => setCollapsed(sidebar.dataset.collapsed !== 'true'));
  setCollapsed(collapsed);
  const bar = main.querySelector('.topbar');
  if (bar) bar.prepend(toggle);
  // Bell (Home, Customers): opens the Alerts inbox; the number is unread alerts on this device.
  if (bar && bar.hasAttribute('data-bell') && active !== 'alerts') {
    bar.append(el('a', { class: 'icon-btn bell', href: 'alerts.html', 'data-nav': 'alerts', 'aria-label': 'Alerts' }, iconEl('bell', 22)));
  }
  try {
    const key = `asg-alerts-unread:${String((me.email) || session.username || 'me').toLowerCase()}`;
    setNavBadge('alerts', Number(JSON.parse(localStorage.getItem(key))) || 0);
  } catch (e) { /* ignore */ }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(me); }
  });

  // vb.html?create / appointments.html?create (from the "+" sheet) open the page's add form.
  if (/[?&]create(=|&|$)/.test(location.search)) {
    history.replaceState(null, '', location.pathname);
    setTimeout(clickAddWhenReady, 0);
  }
}

// Show the page once its script has built it (app.css keeps it hidden until then). It appears at
// once: no fade, so a tap never waits on an animation.
document.addEventListener('DOMContentLoaded', () => { document.body.classList.add('is-ready'); });

// Keep the next pages ready on the phone. GitHub Pages lets the browser keep files for 10 minutes;
// after that each page change has to ask the server again first. So, quietly in the background,
// fetch the four tab pages (and the styles and scripts they use) after a page loads, renew them every
// 9 minutes while the app is open and when it comes back to the front, and fetch a page the moment a
// finger touches its link. Static portal files only, never client data.
(() => {
  const done = new Map();
  const RENEW_MS = 9 * 60 * 1000;
  // renew: ask the server even while the phone's copy is still fresh, so that copy stays fresh.
  const get = (url, renew) => fetch(url, { credentials: 'same-origin', priority: 'low', cache: renew ? 'no-cache' : 'default' })
    .then((r) => (r.ok ? r.text() : '')).catch(() => '');
  const due = (url, renew) => {   // each file at most once per round
    const last = done.get(url);
    if (last && Date.now() - last < (renew ? 60 * 1000 : RENEW_MS)) return false;
    done.set(url, Date.now());
    return true;
  };
  const page = (href, renew) => {
    let url;
    try { url = new URL(href, location.href); } catch (e) { return; }
    if (url.origin !== location.origin || !/\.html$/.test(url.pathname) || url.pathname === location.pathname) return;
    url.search = ''; url.hash = '';
    if (!due(url.href, renew)) return;
    get(url.href, renew).then((html) => {
      const files = [...html.matchAll(/<(?:script[^>]*\ssrc|link[^>]*rel="stylesheet"[^>]*\shref)="([^"]+)"/g)].map((m) => m[1]);
      files.forEach((f) => { const u = new URL(f, url); if (u.origin === location.origin && due(u.href, renew)) get(u.href, renew); });
    });
  };
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  const tabs = (renew) => idle(() => NAV_TABS.forEach((t) => page(t.href, renew)));
  window.addEventListener('load', () => tabs(false));
  setInterval(() => { if (document.visibilityState === 'visible') tabs(true); }, RENEW_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tabs(true); });
  const onPress = (e) => { const a = e.target.closest && e.target.closest('a[href]'); if (a) page(a.getAttribute('href'), false); };
  document.addEventListener('touchstart', onPress, { passive: true });
  document.addEventListener('mousedown', onPress);
  document.addEventListener('mouseover', onPress);
})();

// A tap shows at once: the tapped tab or menu item lights up before the next page loads.
// (The touchstart listener above also lets iPhone Safari show :active pressed states.)
document.addEventListener('click', (e) => {
  const link = e.target.closest && e.target.closest('.tabbar a[href], .sb-item[href]');
  if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || link.getAttribute('aria-current') === 'page') return;
  const bar = link.closest('.tabbar, .sidebar');
  bar.querySelectorAll('[aria-current="page"]').forEach((a) => a.removeAttribute('aria-current'));
  link.setAttribute('aria-current', 'page');
});
