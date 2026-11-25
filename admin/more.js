// More tab (P-18): profile card, every other page, sign out.
(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }
  const $ = (id) => document.getElementById(id);
  mountPortalNav('more', session);
  const me = Session.user(session);
  const name = me.name || session.username || '';

  $('meCard').replaceChildren(avatarEl(me, name),
    el('div', { class: 'li__main' }, el('div', { class: 'li__title', text: name }), el('div', { class: 'li__sub', text: ROLE_LABELS[me.role] || '' })));

  const row = (n) => {
    const kids = [
      el('span', { class: 'li__icon' }, iconEl(n.icon, 22)),
      el('div', { class: 'li__main' }, el('div', { class: 'li__title', text: n.label }))
    ];
    if (n.soon) return el('div', { class: 'li', 'aria-disabled': 'true' }, kids, el('span', { class: 'pill pill--neutral', text: 'Soon' }));
    return el('a', { class: 'li', href: n.href }, kids, iconEl('chev', 20));
  };
  const inTabs = new Set(NAV_TABS.map((t) => t.id));
  const groups = NAV_GROUPS.map(([title, items]) => [title, items.filter((n) => !inTabs.has(n.id) && navVisible(n, me))]).filter(([, items]) => items.length);

  $('moreGroups').replaceChildren(
    ...groups.map(([title, items]) => el('section', { 'aria-label': title },
      el('h2', { class: 'eyebrow list-head', text: title }),
      el('div', { class: 'list' }, items.map(row)))),
    el('section', { 'aria-label': 'Account' },
      el('h2', { class: 'eyebrow list-head', text: 'Account' }),
      el('div', { class: 'list' },
        me.role !== 'owner' ? el('a', { class: 'li', href: 'dashboard.html#password' },
          el('span', { class: 'li__icon' }, iconEl('lock', 22)),
          el('div', { class: 'li__main' }, el('div', { class: 'li__title', text: 'Change password' })),
          iconEl('chev', 20)) : null,
        el('button', { class: 'li li--btn li--danger', type: 'button', onclick: signOut },
          el('span', { class: 'li__icon li__icon--danger' }, iconEl('signout', 22)),
          el('div', { class: 'li__main' }, el('div', { class: 'li__title', text: 'Sign out' })))))
  );
})();
