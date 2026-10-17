(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }

  const $ = (id) => document.getElementById(id);
  mountPortalNav('forms', session);
  const me = Session.user(session);
  const FORM_URL = new URL('../client-detail-form.html', location.href).href;
  const RECENT_COUNT = 10;

  function signOut(message) {
    Session.clear();
    if (message) {
      try { sessionStorage.setItem('prubsn-admin-notice', message); } catch (e) { /* ignore */ }
    }
    location.replace('./');
  }

  setTimeout(() => signOut('Your session has expired. Please sign in again.'), Math.max(0, session.expiresAt * 1000 - Date.now()));

  async function copy(text, button) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // Older browsers: fall back to a hidden textarea.
      const t = el('textarea', {}, text);
      document.body.append(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    const label = button.textContent;
    button.textContent = 'Copied ✓';
    setTimeout(() => { button.textContent = label; }, 1500);
  }

  // The owner's clients use the plain link; everyone else's link carries their form code.
  // Sessions from before the code was included in sign-in have no code, so ask for a fresh sign-in.
  function myFormLink() {
    if (me.role === 'owner') return FORM_URL;
    return me.formCode ? `${FORM_URL}?agent=${encodeURIComponent(me.formCode)}` : '';
  }

  function renderLink() {
    const url = myFormLink();
    if (!url) {
      $('formLink').replaceChildren(el('p', { class: 'sub', text: 'Sign out and sign in again to see your personal form link.' }));
      return;
    }
    const copyBtn = el('button', { class: 'btn', type: 'button' }, 'Copy');
    copyBtn.addEventListener('click', () => copy(url, copyBtn));
    $('formLink').replaceChildren(el('div', { class: 'link-row' }, el('code', { text: url }), copyBtn));
    const message = `Assalamualaikum / Hi, please fill in your details for your Takaful application here:\n${url}`;
    $('formActions').replaceChildren(
      el('a', { class: 'btn btn-primary', href: `https://wa.me/?text=${encodeURIComponent(message)}`, target: '_blank', rel: 'noopener' }, 'Share on WhatsApp'),
      el('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener' }, 'Open the form')
    );
  }

  async function loadRecent() {
    try {
      const { submissions } = await api('/admin/submissions');
      const recent = submissions
        .slice()
        .sort((a, b) => String(b.submittedAt || b.createdTime).localeCompare(String(a.submittedAt || a.createdTime)))
        .slice(0, RECENT_COUNT);
      $('lastUpdated').textContent = `${submissions.length} ${submissions.length === 1 ? 'form' : 'forms'} submitted`;
      $('recent').replaceChildren(...(recent.length
        ? recent.map((s) => el('li', {},
          el('div', {}, el('div', { class: 'name', text: s.fullName || '(no name)' }), el('div', { class: 'sub', text: [s.plan, me.role !== 'agent' ? agentLabel(s) : ''].filter(Boolean).join('  ·  ') })),
          el('div', { class: 'sub', text: formatDateTime(s.submittedAt || s.createdTime) })))
        : [el('li', { class: 'sub', text: 'No forms submitted yet.' })]));
    } catch (err) {
      if (err.status === 401) return signOut(err.message);
      $('pageError').textContent = err.message;
      $('pageError').hidden = false;
      $('lastUpdated').textContent = 'Could not load submitted forms';
    }
  }

  renderLink();
  loadRecent();
})();
