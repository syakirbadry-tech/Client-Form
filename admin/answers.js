(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }

  const $ = (id) => document.getElementById(id);
  mountPortalNav('answers', session);
  const me = Session.user(session);

  function signOut(message) {
    Session.clear();
    if (message) {
      try { sessionStorage.setItem('prubsn-admin-notice', message); } catch (e) { /* ignore */ }
    }
    location.replace('./');
  }

  setTimeout(() => signOut('Your session has expired. Please sign in again.'), Math.max(0, session.expiresAt * 1000 - Date.now()));

  function showError(err) {
    if (err.status === 401) return signOut(err.message);
    $('pageError').textContent = err.message;
    $('pageError').hidden = false;
  }

  // Older decks may send answers without summary lines; show the raw choices instead.
  function linesOf(a) {
    if (a.summary && a.summary.length) return a.summary;
    return Object.entries(a.answers || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
  }

  function item(a) {
    const del = el('button', { class: 'btn', type: 'button' }, 'Delete');
    del.addEventListener('click', async () => {
      if (del.dataset.confirm !== '1') {
        del.dataset.confirm = '1';
        del.textContent = 'Tap again to delete';
        setTimeout(() => { del.dataset.confirm = ''; del.textContent = 'Delete'; }, 3000);
        return;
      }
      del.disabled = true;
      try {
        await api(`/admin/presentation-answers/${a.id}`, { method: 'DELETE' });
        load();
      } catch (err) {
        del.disabled = false;
        showError(err);
      }
    });
    const meta = [a.source, me.role !== 'agent' && a.agentName ? a.agentName : '', formatDateTime(a.createdAt)].filter(Boolean).join('  ·  ');
    return el('li', { class: 'answer-item' },
      el('div', {},
        el('div', { class: 'name', text: a.client }),
        el('div', { class: 'sub', text: meta }),
        el('ul', { class: 'answer-lines' }, linesOf(a).map((t) => el('li', { text: t })))
      ),
      del
    );
  }

  async function load() {
    try {
      const { answers } = await api('/admin/presentation-answers');
      $('lastUpdated').textContent = `${answers.length} ${answers.length === 1 ? 'response' : 'responses'}`;
      $('list').replaceChildren(...(answers.length
        ? answers.map(item)
        : [el('li', { class: 'sub', text: 'No answers yet. They appear here when a client taps Send at the end of a presentation.' })]));
    } catch (err) {
      showError(err);
      $('lastUpdated').textContent = 'Could not load answers';
    }
  }

  load();
})();
