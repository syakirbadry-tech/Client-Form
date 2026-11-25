// Alert settings (P-17c): which alerts show, and this device's status.
(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }
  const $ = (id) => document.getElementById(id);
  mountPortalNav('alertsettings', session);
  $('backLink').replaceChildren(iconEl('back', 20), 'Alerts');

  function renderToggles() {
    const on = ASGAlerts.prefs();
    $('alertToggles').replaceChildren(...ASGAlerts.TYPES.map((t) => {
      const id = `alert-${t.id}`;
      const sw = el('button', { class: 'switch', id, type: 'button', role: 'switch', 'aria-checked': String(on[t.id]), 'aria-labelledby': `${id}-label`, 'aria-describedby': `${id}-sub` });
      sw.addEventListener('click', () => {
        const next = sw.getAttribute('aria-checked') !== 'true';
        ASGAlerts.setPref(t.id, next);
        sw.setAttribute('aria-checked', String(next));
      });
      return el('div', { class: 'li' },
        el('div', { class: 'li__main' }, el('div', { class: 'li__title', id: `${id}-label`, text: t.label }), el('div', { class: 'li__sub', id: `${id}-sub`, text: t.sub })),
        sw);
    }));
  }

  function renderDevice() {
    const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
    $('deviceList').replaceChildren(
      el('div', { class: 'li' },
        el('span', { class: 'li__icon' }, iconEl('device', 22)),
        el('div', { class: 'li__main' },
          el('div', { class: 'li__title', text: 'This device' }),
          el('div', { class: `li__sub${installed ? ' is-ok' : ''}`, text: installed ? 'Added to Home Screen' : 'Opened in the browser' }))),
      installed ? null : el('div', { class: 'li' },
        el('span', { class: 'li__icon' }, iconEl(iphone ? 'shareios' : 'plussq', 22)),
        el('div', { class: 'li__main' },
          el('div', { class: 'li__title', text: 'Add ASG to your Home Screen' }),
          el('div', { class: 'li__sub li__sub--wrap', text: iphone ? 'In Safari tap Share, then Add to Home Screen.' : 'In the browser menu choose Install app or Add to Home Screen.' }))));
  }

  renderToggles();
  renderDevice();
})();
