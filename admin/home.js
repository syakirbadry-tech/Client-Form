// Home (P-15 / T-15): the agent's day in one place.
// Data comes from the existing API only (/admin/vb and /admin/submissions); nothing new on the server.
(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }
  const $ = (id) => document.getElementById(id);
  mountPortalNav('home', session);
  const me = Session.user(session);
  const CONFIG = (window.ASG_CONFIG && window.ASG_CONFIG.contest) || { year: new Date().getFullYear(), targets: [], averageCaseTpc: 2500 };
  const FOLLOW_UP_DAYS = 3;
  const NEEDS_SHOWN = 5;
  const DAY = 86400000;
  const MY_OFFSET = 8 * 3600000;

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

  // ---------- Formatting (Malaysia time) ----------
  const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-MY');
  const myDayIndex = (t) => Math.floor((t + MY_OFFSET) / DAY); // whole days since epoch, Malaysia calendar
  const timeText = (iso) => new Date(iso).toLocaleTimeString('en-MY', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?m\.?/i, ' $1m').toLowerCase();
  function dayWord(iso) {
    const diff = myDayIndex(Date.parse(iso)) - myDayIndex(Date.now());
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
  }
  function untilText(iso) {
    const mins = Math.round((Date.parse(iso) - Date.now()) / 60000);
    if (mins <= 0) return 'now';
    if (mins < 60) return `in ${mins} min`;
    if (mins < 24 * 60) return `in ${Math.round(mins / 60)} h`;
    return dayWord(iso).toLowerCase();
  }
  const shortPlan = (plan) => String(plan || '').replace(/^PruBSN\s+/i, '').replace(/\s+—\s+Medic TotalCare Plan\s+/i, ' ').trim();

  // ---------- Header ----------
  const now = new Date();
  const hour = Number(now.toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
  const part = hour < 12 ? 'Good morning' : hour < 19 ? 'Good afternoon' : 'Good evening';
  const full = String(me.name || session.username || '').trim();
  const first = (full.split(/\s+/)[0] || '') + (/\(demo\)/.test(full) ? ' (demo)' : '');
  const dateText = now.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  $('today').replaceChildren(dateText, first ? el('span', { class: 'home-greet', text: ` · ${part}, ${first}` }) : '');
  $('createBtn').replaceChildren(iconEl('plus', 20), 'Create');
  $('createBtn').addEventListener('click', () => openCreateSheet('home'));

  // ---------- Next appointment ----------
  function renderNextAppt(prospects) {
    const nowT = Date.now();
    const lastDay = myDayIndex(nowT) + 1; // today or tomorrow
    const next = prospects
      .filter((p) => p.stage === 3 && p.appointmentAt && Date.parse(p.appointmentAt) >= nowT - 30 * 60000 && myDayIndex(Date.parse(p.appointmentAt)) <= lastDay)
      .sort((a, b) => Date.parse(a.appointmentAt) - Date.parse(b.appointmentAt))[0];
    const box = $('nextAppt');
    if (!next) {
      box.className = 'home-appt card card--pad home-appt--empty';
      box.replaceChildren(
        el('div', { class: 'label', text: 'Next appointment' }),
        el('p', { class: 'home-empty-text', text: 'No appointment today or tomorrow.' }),
        el('a', { class: 'btn', href: 'appointments.html?create' }, iconEl('cal', 20), 'Book appointment'));
      return;
    }
    const wa = waNumber(next.phone);
    box.className = 'home-appt card card--pad';
    box.replaceChildren(
      el('div', { class: 'home-appt__top' },
        el('h2', { class: 'label', text: `Next appointment · ${untilText(next.appointmentAt)}` }),
        el('span', { class: 'pill pill--soon', text: 'VB3' })),
      el('div', { class: 'home-appt__name', text: next.name }),
      el('div', { class: 'home-appt__sub', text: [`${dayWord(next.appointmentAt)}, ${timeText(next.appointmentAt)}`, next.source].filter(Boolean).join(' · ') }),
      el('div', { class: 'home-appt__actions' },
        wa ? el('a', { class: 'btn btn--wa', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener' }, iconEl('chat', 20), 'WhatsApp') : null,
        el('a', { class: 'btn', href: `presentation.html#vb=${next.id}` }, 'Open presentation')));
  }

  // ---------- Contest progress ----------
  function yearTpc(prospects) {
    return prospects
      .filter((p) => p.stage === 4 && p.approvedAt && new Date(p.approvedAt).toLocaleDateString('en-CA', { timeZone: TZ }).startsWith(String(CONFIG.year)))
      .reduce((sum, p) => sum + (Number(p.tpc) || 0), 0);
  }
  function daysLeftInYear() {
    const end = Date.UTC(CONFIG.year, 11, 31) - MY_OFFSET; // 31 Dec, Malaysia midnight
    return Math.max(0, myDayIndex(end) - myDayIndex(Date.now()));
  }
  // The first target not reached yet, with the weekly pace to reach it by 31 Dec.
  function pace(tpc) {
    const goal = CONFIG.targets.find((t) => tpc < t.tpc);
    if (!goal) return null;
    const weeks = Math.max(1, daysLeftInYear() / 7);
    const weekly = Math.ceil((goal.tpc - tpc) / weeks);
    return { goal, weekly, cases: Math.max(1, Math.ceil(weekly / (CONFIG.averageCaseTpc || 2500))) };
  }

  function renderContest(prospects) {
    const tpc = yearTpc(prospects);
    const targets = CONFIG.targets.slice().sort((a, b) => a.tpc - b.tpc);
    const max = targets.length ? targets[targets.length - 1].tpc : Math.max(tpc, 1);
    const days = daysLeftInYear();
    const p = pace(tpc);
    const bar = el('div', { class: 'progress progress--primary' }, el('span'));
    bar.style.setProperty('--pct', `${Math.min(100, (tpc / max) * 100).toFixed(1)}%`);
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'TPC towards the top target');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(max));
    bar.setAttribute('aria-valuenow', String(Math.round(tpc)));
    const marks = targets.map((t) => {
      const m = el('div', { class: 'milestone' }, el('span', { text: `${t.short} ${num(t.tpc / 1000)}k` }));
      m.style.setProperty('--at', `${Math.min(100, (t.tpc / max) * 100)}%`);
      return m;
    });
    const rows = targets.map((t, i) => {
      const pct = Math.min(100, Math.floor((tpc / t.tpc) * 100));
      const left = Math.max(0, t.tpc - tpc);
      return el('div', { class: 'home-target' },
        el('div', { class: 'li__main' },
          el('div', { class: 'home-target__name', text: t.label }),
          el('div', { class: 'sub', text: left ? `Target ${num(t.tpc)} · ${num(left)} to go` : `Target ${num(t.tpc)} · reached` })),
        el('b', { class: `home-target__pct${i === 0 ? ' is-first' : ''}`, text: `${pct}%` }));
    });
    const note = p
      ? el('p', { class: 'note' }, `To make ${p.goal.label.replace(/^Prudential /, '')} by 31 Dec: about `,
        el('b', { text: `${num(p.weekly)} TPC a week` }), ` (≈ ${p.cases} ${p.cases === 1 ? 'case' : 'cases'} at TPC ${num(CONFIG.averageCaseTpc)}).`)
      : el('p', { class: 'note', text: targets.length ? 'Every target reached this year. Well done.' : 'No contest targets set yet.' });
    $('contest').replaceChildren(
      el('div', { class: 'home-card-head' },
        el('h2', { class: 'home-card-title', id: 'contestTitle' }, iconEl('trophy', 22), `Contest progress ${CONFIG.year}`),
        el('span', { class: 'sub', text: `${days} ${days === 1 ? 'day' : 'days'} left` })),
      el('div', { class: 'home-big' }, el('b', { class: 'num', text: num(tpc) }), el('span', { class: 'sub', text: 'your TPC this year' })),
      el('div', { class: 'milestones' }, bar, marks),
      el('div', { class: 'home-targets' }, rows),
      note,
      el('p', { class: 'sub home-foot', text: `${CONFIG.year} targets, set by the owner. Counts policies marked approved in your VB.` }));
    return p;
  }

  // ---------- This week ----------
  function renderWeek(week, p) {
    const c = (week && week.counts) || { vb1: 0, vb2: 0, vb3: 0, vb4: 0, cases: 0, tpc: 0 };
    const goalCases = p ? p.cases : 0;
    const pct = goalCases ? Math.min(100, Math.round((c.cases / goalCases) * 100)) : 0;
    const bar = el('div', { class: 'progress' }, el('span'));
    bar.style.setProperty('--pct', `${pct}%`);
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Cases this week towards the weekly goal');
    bar.setAttribute('aria-valuenow', String(pct));
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    const tile = (label, n) => el('a', { class: 'home-tile', href: 'vb.html' }, el('span', { text: label }), el('b', { class: 'num', text: num(n) }));
    $('thisWeek').replaceChildren(
      el('div', { class: 'home-card-head' },
        el('h2', { class: 'home-card-title', id: 'weekTitle', text: 'This week' }),
        p ? el('span', { class: 'sub', text: `Goal: ${p.cases} ${p.cases === 1 ? 'case' : 'cases'} · TPC ${num(p.weekly)}` }) : null),
      el('div', { class: 'home-tiles' }, tile('Added', c.vb1), tile('Contacted', c.vb2), tile('Booked', c.vb3), tile('Approved', c.vb4)),
      el('div', { class: 'home-week-line' },
        el('span', { text: `${num(c.cases)}${goalCases ? ` of ${goalCases}` : ''} ${goalCases === 1 ? 'case' : 'cases'} · TPC ${num(c.tpc)}` }),
        goalCases ? el('span', { class: 'sub', text: `${pct}%` }) : null),
      goalCases ? bar : null);
  }

  // ---------- Needs you today ----------
  function needsItems(prospects, submissions) {
    const items = [];
    const today = myDayIndex(Date.now());
    for (const s of submissions) {
      const when = Date.parse(s.submittedAt || s.createdTime);
      if ((s.status || 'Received') === 'Received' && myDayIndex(when) === today) {
        items.push({ at: when, pill: ['pill--info', 'New form'], title: s.fullName || '(no name)', sub: [shortPlan(s.plan), timeText(new Date(when).toISOString())].filter(Boolean).join(' · '), href: `dashboard.html#open=${s.id}` });
      }
    }
    for (const p of prospects) {
      if (p.stage === 2 && !p.appointmentAt && p.contactedAt) {
        const days = today - myDayIndex(Date.parse(p.contactedAt));
        if (days >= FOLLOW_UP_DAYS) items.push({ at: Date.parse(p.contactedAt), pill: ['pill--soon', 'Follow up'], title: p.name, sub: `Contacted ${days} days ago · no appointment`, href: `vb.html#open=${p.id}` });
      }
      if (p.stage === 3 && !p.appointmentAt) items.push({ at: Date.parse(p.createdAt) || 0, pill: ['pill--soon', 'Follow up'], title: p.name, sub: 'VB3 with no time set', href: `vb.html#open=${p.id}` });
    }
    return items.sort((a, b) => b.at - a.at);
  }

  function renderNeeds(items, partial) {
    const head = el('div', { class: 'card__head' },
      el('h2', { id: 'needsTitle', text: 'Needs you today' }),
      items.length > NEEDS_SHOWN ? el('a', { class: 'home-seeall', href: 'vb.html' }, `See all ${items.length}`) : null);
    const list = items.length
      ? el('div', { class: 'home-needs__list' }, items.slice(0, NEEDS_SHOWN).map((n) => el('a', { class: 'li', href: n.href },
        el('span', { class: `pill ${n.pill[0]}`, text: n.pill[1] }),
        el('div', { class: 'li__main' }, el('div', { class: 'li__title', text: n.title }), el('div', { class: 'li__sub', text: n.sub })),
        iconEl('chev', 20))))
      : el('p', { class: 'home-needs__none' }, el('b', { text: 'Nothing needs you right now. ' }), 'New forms and follow-ups show up here.');
    $('needsYou').replaceChildren(...[head, list, partial ? el('p', { class: 'sub home-pad', text: partial }) : null].filter(Boolean));
  }

  // ---------- Load ----------
  async function load() {
    $('pageError').hidden = true;
    const [vb, subs, ans] = await Promise.allSettled([call('/admin/vb'), call('/admin/submissions'), call('/admin/presentation-answers')]);
    if (vb.status === 'rejected' && subs.status === 'rejected') {
      $('pageError').replaceChildren(`${vb.reason.message} `, el('button', { class: 'btn btn--ghost', type: 'button', onclick: load }, 'Try again'));
      $('pageError').hidden = false;
      $('lastUpdated').textContent = 'Could not load Home';
      return;
    }
    const prospects = vb.status === 'fulfilled' ? vb.value.prospects || [] : [];
    const submissions = subs.status === 'fulfilled' ? subs.value.submissions || [] : [];
    renderNextAppt(prospects);
    const p = renderContest(prospects);
    renderWeek(vb.status === 'fulfilled' ? vb.value.week : null, p);
    if (window.ASGAlerts) ASGAlerts.build({ submissions, prospects, answers: ans.status === 'fulfilled' ? ans.value.answers || [] : [] });
    const today = myDayIndex(Date.now());
    setNavBadge('customers', submissions.filter((x) => (x.status || 'Received') === 'Received' && myDayIndex(Date.parse(x.submittedAt || x.createdTime)) === today).length);
    renderNeeds(needsItems(prospects, submissions),
      vb.status === 'rejected' ? 'VB names could not load, so follow-ups are missing.' : subs.status === 'rejected' ? 'Customers could not load, so new forms are missing.' : '');
    $('lastUpdated').textContent = `Updated ${timeText(new Date().toISOString())}`;
  }
  load();
})();
