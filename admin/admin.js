// Shared helpers for the admin login + dashboard pages.
// All data comes from the Worker's /admin/* API (see quotation-generator/backend/src/admin.js);
// nothing secret lives in this file.

// GitHub Pages can't send X-Frame-Options, so refuse to run inside another site's frame (clickjacking).
if (window.top !== window.self) {
  document.documentElement.hidden = true;
  window.top.location = window.self.location.href;
}

const API_BASE = 'https://prubsn-submission-service.syakirbadry.workers.dev';
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
  }
};

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
