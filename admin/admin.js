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
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); } catch (e) { /* private mode: session lasts for this page only */ }
  },
  clear() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  },
  // Sessions from before team accounts existed were always the owner. The server enforces access; this only shapes the UI.
  user(s) {
    return (s && s.user) || { name: s ? s.username : '', role: 'owner' };
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
  const okBtn = el('button', { class: 'btn btn-primary', type: 'button', onclick: close }, 'OK');
  const overlay = el('div', { class: 'reminder-overlay', onclick: (e) => { if (e.target === overlay) close(); } },
    el('div', { class: 'reminder', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'reminderTitle' },
      el('h2', { id: 'reminderTitle', text: '🎂 Birthday reminder' }),
      todays.length ? el('section', {}, el('h3', { text: 'Today' }), el('ul', {}, todays.map(person))) : null,
      coming.length ? el('section', {}, el('h3', { text: `Next ${BIRTHDAY_REMINDER_DAYS} days` }), el('ul', {}, coming.map(person))) : null,
      el('div', { class: 'reminder-actions' }, okBtn)
    )
  );
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  okBtn.focus();
}

// ---------- Portal menu (left sidebar; a slide-in drawer on phones) ----------

// Sections still being built are listed so agents can see what is coming, but are not links yet.
const NAV_GROUPS = [
  ['Client journey', [
    { id: 'customers', label: 'Customers', href: 'dashboard.html', icon: '👥' },
    { id: 'vb', label: 'VB', href: 'vb.html', icon: '🎯' },
    { id: 'appointments', label: 'Appointments', href: 'appointments.html', icon: '📅' },
    { id: 'presentation', label: 'Presentation', href: 'presentation.html', icon: '🖥️' },
    { id: 'forms', label: 'Forms', href: 'forms.html', icon: '📝' }
  ]],
  ['Motivation', [
    { id: 'contests', label: 'Contests', icon: '🏆', soon: true }
  ]],
  ['Reports', [
    { id: 'insights', label: 'Insights', href: 'insights.html', icon: '📊' },
    { id: 'team', label: 'Team', href: 'team.html', icon: '🧑‍🤝‍🧑', ownerOnly: true }
  ]]
];

// Adds the menu to a signed-in page. `active` is the NAV_GROUPS id of the current page.
function mountPortalNav(active, session) {
  const me = Session.user(session);
  const close = () => document.body.classList.remove('nav-open');
  const item = (n) => {
    const content = [el('span', { class: 'nav-icon', 'aria-hidden': 'true', text: n.icon }), el('span', { class: 'nav-label', text: n.label })];
    if (n.soon) return el('li', {}, el('span', { class: 'nav-item soon', 'aria-disabled': 'true' }, content, el('span', { class: 'nav-soon', text: 'Soon' })));
    return el('li', {}, el('a', { class: 'nav-item', href: n.href, 'aria-current': n.id === active ? 'page' : null }, content));
  };
  const nav = el('nav', { class: 'portal-nav', id: 'portalNav', 'aria-label': 'Portal menu' },
    el('div', { class: 'nav-brand' },
      el('img', { src: 'img/asg-ansar-logo.jpg', alt: '', class: 'nav-logo' }),
      el('div', {}, el('div', { class: 'nav-brand-name', text: 'ASG Portal' }), el('div', { class: 'nav-brand-sub', text: 'Ansar Group' }))
    ),
    NAV_GROUPS.map(([title, items]) => {
      const shown = items.filter((n) => !n.ownerOnly || me.role === 'owner');
      return el('div', { class: 'nav-group' }, el('div', { class: 'nav-group-title', text: title }), el('ul', {}, shown.map(item)));
    }),
    el('div', { class: 'nav-foot' },
      el('div', { class: 'nav-who' }, el('div', { class: 'name', text: me.name || session.username }), el('div', { class: 'sub', text: ROLE_LABELS[me.role] || '' })),
      el('button', { class: 'btn nav-signout', type: 'button', onclick: () => { Session.clear(); location.replace('./'); } }, 'Sign out')
    )
  );
  const menuBtn = el('button', { class: 'btn nav-toggle', type: 'button', 'aria-controls': 'portalNav', 'aria-label': 'Open menu', onclick: () => document.body.classList.add('nav-open') }, '☰');
  const scrim = el('div', { class: 'nav-scrim', onclick: close });
  document.body.classList.add('has-nav');
  document.body.prepend(nav, scrim);
  const bar = document.querySelector('.topbar');
  if (bar) bar.prepend(menuBtn);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
