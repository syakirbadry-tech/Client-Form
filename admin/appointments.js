(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }

  const $ = (id) => document.getElementById(id);
  mountPortalNav('appointments', session);

  // Appointments are the VB names' appointment times (one per name), so
  // everyone only ever sees their own. All dates are shown in Malaysia time.
  const MY_OFFSET_MS = 8 * 3600 * 1000;
  const DAY_START = 8;
  const DAY_END = 21; // last slot starts at 9pm
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const VIEWS = [['day', 'Day'], ['month', 'Month'], ['year', 'Year']];
  const STAGES = { 1: 'New name', 2: 'Contacted', 3: 'Appointment', 4: 'Policy approved' };

  const today = myParts(new Date().toISOString());
  const state = { prospects: [], view: 'month', y: today.y, m: today.m, d: today.d };

  function signOut(message) {
    Session.clear();
    if (message) {
      try { sessionStorage.setItem('prubsn-admin-notice', message); } catch (e) { /* ignore */ }
    }
    location.replace('./');
  }

  setTimeout(() => signOut('Your session has expired. Please sign in again.'), Math.max(0, session.expiresAt * 1000 - Date.now()));

  async function call(path, opts) {
    try {
      return await api(path, opts);
    } catch (err) {
      if (err.status === 401) signOut(err.message);
      throw err;
    }
  }

  // ---------- Malaysia-time date helpers ----------

  function myParts(iso) {
    const d = new Date(Date.parse(iso) + MY_OFFSET_MS);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), dow: (d.getUTCDay() + 6) % 7 };
  }
  const dayKey = (y, m, d) => `${y}-${m}-${d}`;
  const daysIn = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const firstDow = (y, m) => (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const isToday = (y, m, d) => y === today.y && m === today.m && d === today.d;

  function timeText(p) {
    const h12 = p.h % 12 || 12;
    return `${h12}:${String(p.min).padStart(2, '0')}${p.h < 12 ? 'am' : 'pm'}`;
  }

  function appointments() {
    return state.prospects
      .filter((p) => p.appointmentAt)
      .map((p) => ({ ...p, at: myParts(p.appointmentAt) }))
      .sort((a, b) => a.appointmentAt.localeCompare(b.appointmentAt));
  }

  function byDay(list) {
    const map = new Map();
    for (const a of list) {
      const k = dayKey(a.at.y, a.at.m, a.at.d);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(a);
    }
    return map;
  }

  const openInVb = (a) => { location.href = `vb.html#open=${a.id}`; };

  function apptButton(a, cls) {
    return el('button', { class: `cal-appt ${cls || ''}`, type: 'button', 'data-stage': a.stage, onclick: (e) => { e.stopPropagation(); openInVb(a); }, title: `${timeText(a.at)} ${a.name}` },
      el('b', { text: timeText(a.at) }), ' ', a.name);
  }

  // ---------- Views ----------

  function renderMonth(days) {
    const n = daysIn(state.y, state.m);
    const lead = firstDow(state.y, state.m);
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(el('div', { class: 'cal-cell blank', 'aria-hidden': 'true' }));
    for (let d = 1; d <= n; d++) {
      const list = days.get(dayKey(state.y, state.m, d)) || [];
      const goDay = () => { Object.assign(state, { view: 'day', d }); render(); };
      cells.push(el('div', { class: `cal-cell${isToday(state.y, state.m, d) ? ' today' : ''}` },
        el('button', { class: 'cal-date', type: 'button', onclick: goDay, 'aria-label': `${d} ${MONTH_NAMES[state.m]}, ${list.length} appointment${list.length === 1 ? '' : 's'}` }, String(d)),
        list.slice(0, 3).map((a) => apptButton(a)),
        list.length > 3 ? el('button', { class: 'link-btn cal-more', type: 'button', onclick: goDay }, `+${list.length - 3} more`) : null,
        list.length ? el('span', { class: 'cal-dot', 'aria-hidden': 'true' }) : null));
    }
    return el('div', { class: 'cal-month' },
      WEEKDAYS.map((w) => el('div', { class: 'cal-weekday', text: w })),
      cells);
  }

  function renderDay(days) {
    const list = days.get(dayKey(state.y, state.m, state.d)) || [];
    const rows = [];
    const early = list.filter((a) => a.at.h < DAY_START);
    const late = list.filter((a) => a.at.h > DAY_END);
    if (early.length) rows.push(el('div', { class: 'cal-slot' }, el('div', { class: 'cal-hour', text: 'Earlier' }), el('div', { class: 'cal-slot-body' }, early.map((a) => apptButton(a, 'wide')))));
    for (let h = DAY_START; h <= DAY_END; h++) {
      const inHour = list.filter((a) => a.at.h === h);
      rows.push(el('div', { class: 'cal-slot' },
        el('div', { class: 'cal-hour', text: timeText({ h, min: 0 }) }),
        el('div', { class: 'cal-slot-body' }, inHour.map((a) => apptButton(a, 'wide')))));
    }
    if (late.length) rows.push(el('div', { class: 'cal-slot' }, el('div', { class: 'cal-hour', text: 'Later' }), el('div', { class: 'cal-slot-body' }, late.map((a) => apptButton(a, 'wide')))));
    return el('div', { class: 'cal-day' },
      list.length ? null : el('p', { class: 'sub cal-empty', text: 'No appointments this day.' }),
      rows);
  }

  function renderYear(all) {
    return el('div', { class: 'cal-year' }, MONTH_NAMES.map((name, m) => {
      const count = all.filter((a) => a.at.y === state.y && a.at.m === m).length;
      return el('button', { class: `cal-month-card${state.y === today.y && m === today.m ? ' today' : ''}`, type: 'button', onclick: () => { Object.assign(state, { view: 'month', m, d: 1 }); render(); } },
        el('span', { class: 'name', text: name }),
        el('span', { class: 'cal-count', text: count }),
        el('span', { class: 'sub', text: count === 1 ? 'appointment' : 'appointments' }));
    }));
  }

  function renderUpcoming(all) {
    const now = Date.now();
    const soon = all.filter((a) => { const t = Date.parse(a.appointmentAt); return t >= now - 3600000 && t < now + 7 * 86400000; });
    $('upcoming').replaceChildren(...(soon.length
      ? soon.map((a) => el('li', {}, el('button', { class: 'cal-up-row', type: 'button', onclick: () => openInVb(a) },
        el('span', { class: 'cal-up-date' }, el('b', { text: a.at.d }), el('span', { text: MONTH_NAMES[a.at.m].slice(0, 3) })),
        el('span', { class: 'grow' }, el('span', { class: 'name', text: a.name }), el('span', { class: 'sub', text: `${WEEKDAYS[a.at.dow]} ${timeText(a.at)}${a.phone ? `  ·  ${a.phone}` : ''}` })),
        el('span', { class: 'vb-badge', 'data-stage': a.stage, text: `VB${a.stage}` }))))
      : [el('li', { class: 'sub', text: 'Nothing booked in the next 7 days.' })]));
  }

  function title() {
    if (state.view === 'year') return String(state.y);
    if (state.view === 'month') return `${MONTH_NAMES[state.m]} ${state.y}`;
    const dow = (new Date(Date.UTC(state.y, state.m, state.d)).getUTCDay() + 6) % 7;
    return `${WEEKDAYS[dow]}, ${state.d} ${MONTH_NAMES[state.m]} ${state.y}`;
  }

  function render() {
    const all = appointments();
    const days = byDay(all);
    $('calTitle').textContent = title();
    $('viewChips').replaceChildren(...VIEWS.map(([v, label]) => el('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(state.view === v), onclick: () => { state.view = v; render(); }
    }, label)));
    $('calendar').replaceChildren(state.view === 'day' ? renderDay(days) : state.view === 'year' ? renderYear(all) : renderMonth(days));
    renderUpcoming(all);
  }

  function step(dir) {
    if (state.view === 'year') state.y += dir;
    else if (state.view === 'month') {
      const t = new Date(Date.UTC(state.y, state.m + dir, 1));
      Object.assign(state, { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: 1 });
    } else {
      const t = new Date(Date.UTC(state.y, state.m, state.d + dir));
      Object.assign(state, { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() });
    }
    render();
  }

  // ---------- New appointment ----------

  function openAdd() {
    const open = state.prospects.filter((p) => p.stage < 4).sort((a, b) => a.name.localeCompare(b.name));
    const box = el('div', { class: 'alert', role: 'alert', hidden: true });
    if (!open.length) {
      $('drawerBody').replaceChildren(el('section', { class: 'section' },
        el('p', { text: 'Add the person to your VB list first, then set the appointment here.' }),
        el('a', { class: 'btn btn-primary', href: 'vb.html' }, 'Go to VB')));
    } else {
      const who = el('select', { class: 'input', id: 'fWho' }, open.map((p) => el('option', { value: p.id }, `${p.name} (VB${p.stage})`)));
      const day = state.view === 'day' ? state : today;
      const at = el('input', { class: 'input', id: 'fAt', type: 'datetime-local', value: `${day.y}-${String(day.m + 1).padStart(2, '0')}-${String(day.d).padStart(2, '0')}T10:00` });
      const btn = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Save appointment');
      const form = el('form', { class: 'section vb-form', novalidate: true },
        el('div', { class: 'field' }, el('label', { for: 'fWho', text: 'Who' }), who),
        el('div', { class: 'field' }, el('label', { for: 'fAt', text: 'Date and time' }), at),
        el('p', { class: 'sub', text: 'Each name has one appointment; saving replaces any earlier time.' }),
        box, btn);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!at.value) { box.textContent = 'Please choose the date and time.'; box.hidden = false; return; }
        btn.disabled = true;
        box.hidden = true;
        try {
          const iso = new Date(`${at.value}:00+08:00`).toISOString();
          await call(`/admin/vb/${who.value}`, { method: 'PATCH', body: { action: 'appointment', at: iso } });
          const p = myParts(iso);
          Object.assign(state, { view: 'day', y: p.y, m: p.m, d: p.d });
          closeDrawer();
          await load();
        } catch (err) {
          box.textContent = err.message;
          box.hidden = false;
        } finally {
          btn.disabled = false;
        }
      });
      $('drawerBody').replaceChildren(form);
    }
    $('drawer').hidden = false;
    $('scrim').hidden = false;
  }

  function closeDrawer() {
    $('drawer').hidden = true;
    $('scrim').hidden = true;
  }

  async function load() {
    try {
      const data = await call('/admin/vb');
      state.prospects = data.prospects;
      const n = state.prospects.filter((p) => p.appointmentAt).length;
      $('lastUpdated').textContent = `${n} ${n === 1 ? 'appointment' : 'appointments'} · Malaysia time`;
      $('pageError').hidden = true;
    } catch (err) {
      $('pageError').textContent = err.message;
      $('pageError').hidden = false;
      $('lastUpdated').textContent = 'Could not load appointments';
    }
    render();
  }

  $('prevBtn').addEventListener('click', () => step(-1));
  $('nextBtn').addEventListener('click', () => step(1));
  $('todayBtn').addEventListener('click', () => { Object.assign(state, { y: today.y, m: today.m, d: today.d }); render(); });
  $('addBtn').addEventListener('click', openAdd);
  $('closeDrawer').addEventListener('click', closeDrawer);
  $('scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('drawer').hidden) closeDrawer(); });

  load();
})();
