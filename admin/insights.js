(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }

  // Share of monthly income used as a rough "can afford" guide for premiums.
  const BUDGET_SHARE = 0.10;

  const $ = (id) => document.getElementById(id);
  const state = { all: [], clients: [], agent: 'All', sortBy: 'birthday' };

  function signOut(message) {
    Session.clear();
    if (message) {
      try { sessionStorage.setItem('prubsn-admin-notice', message); } catch (e) { /* ignore */ }
    }
    location.replace('./');
  }

  setTimeout(() => signOut('Your session has expired. Please sign in again.'), Math.max(0, session.expiresAt * 1000 - Date.now()));

  async function call(path) {
    try {
      return await api(path);
    } catch (err) {
      if (err.status === 401) signOut(err.message);
      throw err;
    }
  }

  // ---------- Data ----------

  function toClient(sub, now) {
    const bd = birthDate(sub.dateOfBirth, sub.nric);
    const { age, daysToBirthday } = birthdayInfo(bd, now);
    const income = Number(sub.monthlyIncome);
    return {
      id: sub.id,
      name: sub.fullName || '(no name)',
      phone: sub.phone || '',
      agent: agentLabel(sub),
      bd,
      age,
      daysToBirthday,
      occupation: String(sub.occupation || '').trim(),
      field: String(sub.fieldOfWork || '').trim(),
      employmentType: sub.employmentType || '',
      maritalStatus: sub.maritalStatus || '',
      existingCoverage: sub.existingCoverage || '',
      income: sub.monthlyIncome != null && sub.monthlyIncome !== '' && Number.isFinite(income) ? income : null
    };
  }

  async function load() {
    try {
      // The list already carries every column this page needs (and only the signed-in person's clients).
      const { submissions } = await call('/admin/submissions');
      const now = todayMY();
      state.all = submissions.map((s) => toClient(s, now));
      $('lastUpdated').textContent = `Updated ${formatDateTime(new Date().toISOString())}`;
      renderAgentFilter();
      render();
      showBirthdayReminder(state.all);
    } catch (err) {
      $('pageError').textContent = err.message;
      $('pageError').hidden = false;
      $('lastUpdated').textContent = 'Could not load clients';
    }
  }

  function renderAgentFilter() {
    if (Session.user(session).role === 'agent') return;
    const names = [...new Set(state.all.map((c) => c.agent))].sort();
    $('agentFilter').replaceChildren(
      el('option', { value: 'All' }, 'All agents'),
      ...names.map((n) => el('option', { value: n }, n))
    );
    $('agentFilterWrap').hidden = names.length < 2;
  }

  // ---------- Rendering ----------

  const money = (v) => (v == null ? '—' : `RM ${Math.round(v).toLocaleString('en-MY')}`);

  function median(nums) {
    if (!nums.length) return null;
    const s = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function birthdayText(c) {
    if (!c.bd) return '—';
    return `${c.bd.d} ${MONTHS[c.bd.m]}`;
  }

  function renderStats() {
    const incomes = state.clients.map((c) => c.income).filter((v) => v != null);
    const ages = state.clients.map((c) => c.age).filter((v) => v != null);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const soon = state.clients.filter((c) => c.daysToBirthday != null && c.daysToBirthday <= BIRTHDAY_REMINDER_DAYS).length;
    const tiles = [
      ['total', 'Clients', state.clients.length],
      ['received', 'Average income', money(avg(incomes))],
      ['review', 'Median income', money(median(incomes))],
      ['approved', 'Average age', ages.length ? Math.round(avg(ages)) : '—'],
      ['followup', `Birthdays in ${BIRTHDAY_REMINDER_DAYS} days`, soon]
    ];
    $('stats').replaceChildren(...tiles.map(([cls, label, value]) =>
      el('div', { class: `stat ${cls}` }, el('div', { class: 'stat-label', text: label }), el('div', { class: 'stat-value', text: value }))
    ));
  }

  // Horizontal bar chart from [[label, count], ...].
  function bars(target, entries) {
    const shown = entries.filter(([, n]) => n > 0);
    if (!shown.length) {
      $(target).replaceChildren(el('div', { class: 'sub', text: 'No data yet.' }));
      return;
    }
    const max = Math.max(...shown.map(([, n]) => n));
    $(target).replaceChildren(...shown.map(([label, n]) => {
      const fill = el('div', { class: 'bar-fill' });
      fill.style.width = `${Math.max(4, (n / max) * 100)}%`;
      return el('div', { class: 'bar' },
        el('div', { class: 'bar-label', text: label }),
        el('div', { class: 'bar-track' }, fill),
        el('div', { class: 'bar-count', text: n })
      );
    }));
  }

  // Groups free-text answers case-insensitively, most common first.
  function tally(values, blankLabel, limit = 8) {
    const groups = new Map();
    for (const raw of values) {
      const v = String(raw || '').trim();
      const key = v.toLowerCase() || '\u0000';
      const g = groups.get(key) || { label: v || blankLabel, n: 0 };
      g.n++;
      groups.set(key, g);
    }
    const sorted = [...groups.values()].sort((a, b) => b.n - a.n);
    const top = sorted.slice(0, limit).map((g) => [g.label, g.n]);
    const rest = sorted.slice(limit).reduce((t, g) => t + g.n, 0);
    if (rest) top.push(['Others', rest]);
    return top;
  }

  function renderCharts() {
    const cs = state.clients;
    const band = (lo, hi) => cs.filter((c) => c.income != null && c.income >= lo && c.income < hi).length;
    bars('incomeChart', [
      ['Below RM 2,000', band(0, 2000)],
      ['RM 2,000 – 3,999', band(2000, 4000)],
      ['RM 4,000 – 5,999', band(4000, 6000)],
      ['RM 6,000 – 9,999', band(6000, 10000)],
      ['RM 10,000 and above', band(10000, Infinity)],
      ['Not stated', cs.filter((c) => c.income == null).length]
    ]);
    const ageBand = (lo, hi) => cs.filter((c) => c.age != null && c.age >= lo && c.age < hi).length;
    bars('ageChart', [
      ['Under 25', ageBand(0, 25)],
      ['25 – 34', ageBand(25, 35)],
      ['35 – 44', ageBand(35, 45)],
      ['45 – 54', ageBand(45, 55)],
      ['55 and above', ageBand(55, 200)],
      ['Unknown', cs.filter((c) => c.age == null).length]
    ]);
    bars('occupationChart', tally(cs.map((c) => c.occupation || c.field), 'Not stated'));
    bars('employmentChart', tally(cs.map((c) => c.employmentType), 'Not stated'));
    bars('maritalChart', tally(cs.map((c) => c.maritalStatus), 'Not stated'));
    bars('coverageChart', tally(cs.map((c) => c.existingCoverage), 'Not asked (older form)'));
  }

  function sorted() {
    // Clients missing the sort value go last.
    const key = {
      income: (c) => (c.income == null ? Infinity : -c.income),
      age: (c) => (c.age == null ? Infinity : -c.age),
      name: () => 0,
      birthday: (c) => (c.daysToBirthday == null ? Infinity : c.daysToBirthday)
    }[state.sortBy];
    return [...state.clients].sort((a, b) => (key(a) === key(b) ? 0 : key(a) < key(b) ? -1 : 1) || a.name.localeCompare(b.name));
  }

  function renderRows() {
    $('rows').replaceChildren(...sorted().map((c) =>
      el('tr', {},
        el('td', {}, el('div', { class: 'name', text: c.name }), el('div', { class: 'sub num', text: c.phone })),
        el('td', { class: 'num', text: c.age == null ? '—' : c.age }),
        el('td', {}, el('div', { text: birthdayText(c) }), c.daysToBirthday != null ? el('div', { class: 'sub', text: untilText(c.daysToBirthday) }) : null),
        el('td', {}, el('div', { text: c.occupation || '—' }), el('div', { class: 'sub', text: [c.field, c.employmentType].filter(Boolean).join(' · ') })),
        el('td', { class: 'num right', text: money(c.income) }),
        el('td', { class: 'num right', text: c.income == null ? '—' : money(c.income * BUDGET_SHARE) })
      )
    ));
  }

  function render() {
    state.clients = state.agent === 'All' ? state.all : state.all.filter((c) => c.agent === state.agent);
    renderStats();
    renderCharts();
    renderRows();
  }

  $('agentFilter').addEventListener('change', (e) => { state.agent = e.target.value; render(); });
  $('sortBy').addEventListener('change', (e) => { state.sortBy = e.target.value; renderRows(); });
  $('printBtn').addEventListener('click', () => window.print());

  load();
})();
