// Alerts inbox (P-17a): today / yesterday / earlier, unread dots, mark all read.
(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }
  const $ = (id) => document.getElementById(id);
  mountPortalNav('alerts', session);
  $('settingsLink').replaceChildren(iconEl('gear', 18), 'Alert settings');
  let items = [];

  const timeText = (t) => new Date(t).toLocaleTimeString('en-MY', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?m\.?/i, ' $1m').toLowerCase();
  function whenText(t) {
    const diff = ASGAlerts.dayIndex(Date.now()) - ASGAlerts.dayIndex(t);
    if (diff <= 1) return timeText(t);
    return new Date(t).toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
  }

  function render() {
    const unread = items.filter((i) => i.unread).length;
    $('lastUpdated').textContent = items.length ? (unread ? `${unread} unread` : 'All read') : 'Nothing new';
    $('markAllBtn').hidden = unread === 0;
    if (!items.length) {
      $('alertList').replaceChildren(el('div', { class: 'card empty' },
        el('span', { class: 'li__icon' }, iconEl('bell', 22)),
        el('div', { class: 'empty__title', text: 'No alerts' }),
        el('div', { text: 'New forms, today’s appointments, follow-ups and presentation answers show up here.' })));
      return;
    }
    const today = ASGAlerts.dayIndex(Date.now());
    const groups = [['Today', (d) => d === today], ['Yesterday', (d) => d === today - 1], ['Earlier', (d) => d < today - 1]];
    $('alertList').replaceChildren(...groups.map(([title, test]) => {
      const list = items.filter((i) => test(ASGAlerts.dayIndex(i.at)));
      if (!list.length) return null;
      return el('section', { 'aria-label': title },
        el('h2', { class: 'eyebrow list-head', text: title }),
        el('div', { class: 'list' }, list.map((i) => el('a', {
          class: `li alert-row${i.unread ? ' li--unread' : ''}`, href: i.href,
          onclick: () => ASGAlerts.markRead([i.id])
        },
        el('span', { class: `li__icon alert-icon--${i.type}` }, iconEl(i.icon, 22)),
        el('div', { class: 'li__main' },
          el('div', { class: 'li__title', text: i.title }),
          el('div', { class: 'li__sub', text: i.sub })),
        el('span', { class: 'li__meta', text: whenText(i.at) }),
        i.unread ? el('span', { class: 'sr-only', text: 'Unread' }) : null))));
    }).filter(Boolean));
  }

  async function load() {
    $('alertList').replaceChildren(...[0, 1, 2].map(() => el('div', { class: 'skel alerts-skel', 'aria-hidden': 'true' })));
    try {
      const data = await ASGAlerts.fetchAll();
      if (data.failed) throw data.failed;
      items = ASGAlerts.build(data);
      render();
      if (data.partial) {
        $('pageError').textContent = 'Some alerts could not load. Pull down or come back to try again.';
        $('pageError').hidden = false;
      }
    } catch (err) {
      if (err.status === 401) {
        Session.clear();
        try { sessionStorage.setItem('prubsn-admin-notice', err.message); } catch (e) { /* ignore */ }
        location.replace('./');
        return;
      }
      $('alertList').replaceChildren();
      $('pageError').replaceChildren(`${err.message} `, el('button', { class: 'btn btn--ghost', type: 'button', onclick: load }, 'Try again'));
      $('pageError').hidden = false;
      $('lastUpdated').textContent = 'Could not load alerts';
    }
  }

  $('markAllBtn').addEventListener('click', () => {
    ASGAlerts.markRead(items.map((i) => i.id));
    items.forEach((i) => { i.unread = false; });
    setNavBadge('alerts', 0);
    try { localStorage.setItem(`asg-alerts-unread:${String((Session.user(session).email) || session.username).toLowerCase()}`, '0'); } catch (e) { /* ignore */ }
    render();
    showToast('All alerts marked as read');
  });
  load();
})();
