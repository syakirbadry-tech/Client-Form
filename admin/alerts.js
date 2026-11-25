// In-app alerts, worked out in the browser from data the portal already loads
// (/admin/submissions, /admin/vb, /admin/presentation-answers). No server change.
// Read state and settings live on this device (localStorage), per signed-in person.
// Privacy: alert lines use first names and plan names only - never NRIC, phone, income or amounts.
(function (root) {
  const DAY = 86400000;
  const MY = 8 * 3600000;
  const KEEP_DAYS = 14;
  const FOLLOW_UP_DAYS = 3;
  const TYPES = [
    { id: 'forms', label: 'New client forms', sub: 'When a client sends your form' },
    { id: 'appointments', label: 'Appointments', sub: 'Morning summary of today’s appointments' },
    { id: 'followups', label: 'VB follow-ups', sub: `Names waiting ${FOLLOW_UP_DAYS} days for an appointment` },
    { id: 'answers', label: 'Presentation answers', sub: 'When a client sends their answers' }
  ];

  const dayIndex = (t) => Math.floor((t + MY) / DAY);
  const firstName = (name) => String(name || '').replace(/\(.*?\)/g, '').trim().split(/\s+/)[0] || 'a client';
  const shortPlan = (plan) => String(plan || '').replace(/^PruBSN\s+/i, '').replace(/\s+—\s+Medic TotalCare Plan\s+/i, ' ').trim();
  const timeText = (t) => new Date(t).toLocaleTimeString('en-MY', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?m\.?/i, ' $1m').toLowerCase();

  function who() {
    const s = Session.get();
    return s ? String((s.user && s.user.email) || s.username || 'me').toLowerCase() : 'me';
  }
  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(`${key}:${who()}`)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(`${key}:${who()}`, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  function prefs() {
    const p = load('asg-alert-prefs', {});
    const out = {};
    for (const t of TYPES) out[t.id] = p[t.id] !== false;
    return out;
  }
  function setPref(id, on) {
    const p = load('asg-alert-prefs', {});
    p[id] = Boolean(on);
    save('asg-alert-prefs', p);
  }

  function build({ submissions = [], prospects = [], answers = [] }) {
    const now = Date.now();
    const today = dayIndex(now);
    const since = now - KEEP_DAYS * DAY;
    const on = prefs();
    const list = [];

    if (on.forms) {
      for (const s of submissions) {
        const at = Date.parse(s.submittedAt || s.createdTime);
        if (at >= since && (s.status || 'Received') === 'Received') {
          list.push({ id: `form:${s.id}`, type: 'forms', at, icon: 'file', title: `New form from ${firstName(s.fullName)}`, sub: [shortPlan(s.plan), 'tap to review'].filter(Boolean).join(' · '), href: `dashboard.html#open=${s.id}` });
        }
      }
    }
    if (on.appointments) {
      const todays = prospects.filter((p) => p.stage === 3 && p.appointmentAt && dayIndex(Date.parse(p.appointmentAt)) === today)
        .sort((a, b) => Date.parse(a.appointmentAt) - Date.parse(b.appointmentAt));
      if (todays.length) {
        const first = todays[0];
        list.push({ id: `appt:${today}:${todays.length}`, type: 'appointments', at: today * DAY - MY + 8.5 * 3600000, icon: 'cal',
          title: `${todays.length} ${todays.length === 1 ? 'appointment' : 'appointments'} today`, sub: `First at ${timeText(Date.parse(first.appointmentAt))} with ${firstName(first.name)}`, href: 'appointments.html' });
      }
    }
    if (on.followups) {
      const waiting = prospects.filter((p) => p.stage === 2 && !p.appointmentAt && p.contactedAt && today - dayIndex(Date.parse(p.contactedAt)) >= FOLLOW_UP_DAYS);
      if (waiting.length) {
        list.push({ id: `follow:${today}:${waiting.length}`, type: 'followups', at: today * DAY - MY + 9 * 3600000, icon: 'target',
          title: `${waiting.length} ${waiting.length === 1 ? 'name' : 'names'} waiting for an appointment`, sub: `Contacted ${FOLLOW_UP_DAYS}+ days ago`, href: 'vb.html' });
      }
    }
    if (on.answers) {
      for (const a of answers) {
        const at = Date.parse(a.createdAt);
        if (at >= since) list.push({ id: `ans:${a.id}`, type: 'answers', at, icon: 'present', title: `${firstName(a.client)} sent their answers`, sub: 'From your presentation', href: 'answers.html' });
      }
    }
    // Morning summaries are dated today but never "in the future".
    for (const item of list) item.at = Math.min(item.at, now);
    list.sort((a, b) => b.at - a.at);

    const read = new Set(load('asg-alerts-read', []));
    for (const item of list) item.unread = !read.has(item.id);
    const unread = list.filter((i) => i.unread).length;
    save('asg-alerts-unread', unread);
    showBadge(unread);
    return list;
  }

  function markRead(ids) {
    const read = load('asg-alerts-read', []);
    const set = new Set(read);
    for (const id of ids) set.add(id);
    save('asg-alerts-read', [...set].slice(-400));
  }

  function showBadge(n) {
    if (typeof setNavBadge === 'function') setNavBadge('alerts', n);
  }

  // Data for the alerts (any part may fail; the rest still shows).
  async function fetchAll() {
    const [subs, vb, ans] = await Promise.allSettled([api('/admin/submissions'), api('/admin/vb'), api('/admin/presentation-answers')]);
    const failed = [subs, vb, ans].filter((r) => r.status === 'rejected');
    if (failed.some((r) => r.reason && r.reason.status === 401)) throw failed.find((r) => r.reason.status === 401).reason;
    return {
      submissions: subs.status === 'fulfilled' ? subs.value.submissions || [] : [],
      prospects: vb.status === 'fulfilled' ? vb.value.prospects || [] : [],
      answers: ans.status === 'fulfilled' ? ans.value.answers || [] : [],
      partial: failed.length > 0 && failed.length < 3,
      failed: failed.length === 3 ? failed[0].reason : null
    };
  }

  root.ASGAlerts = { TYPES, build, markRead, prefs, setPref, fetchAll, cachedUnread: () => load('asg-alerts-unread', 0), dayIndex };
})(window);
