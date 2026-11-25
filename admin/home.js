// Home (phase 1 placeholder): greeting + quick links. Phase 3 adds next appointment,
// contest progress, this week and follow-ups from the existing API.
(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }
  const $ = (id) => document.getElementById(id);
  mountPortalNav('home', session);
  const me = Session.user(session);
  const full = String(me.name || session.username || '').trim();
  const first = (full.split(/\s+/)[0] || '') + (/\(demo\)/.test(full) ? ' (demo)' : '');

  const now = new Date();
  const hour = Number(now.toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
  const part = hour < 12 ? 'Good morning' : hour < 19 ? 'Good afternoon' : 'Good evening';
  $('greeting').textContent = first ? `${part}, ${first}` : part;
  $('today').textContent = now.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const links = [
    { label: 'Customers', sub: 'Every application, by status', href: 'dashboard.html', icon: 'users' },
    { label: 'VB pipeline', sub: 'Names, follow-ups and cases', href: 'vb.html', icon: 'target' },
    { label: 'Appointments', sub: 'Your calendar', href: 'appointments.html', icon: 'cal' },
    { label: 'Share my form link', sub: 'WhatsApp or copy', href: 'forms.html', icon: 'share' }
  ];
  $('quickLinks').replaceChildren(...links.map((l) => el('a', { class: 'li', href: l.href },
    el('span', { class: 'li__icon' }, iconEl(l.icon, 22)),
    el('div', { class: 'li__main' }, el('div', { class: 'li__title', text: l.label }), el('div', { class: 'li__sub', text: l.sub })),
    iconEl('chev', 20, null))));
})();
