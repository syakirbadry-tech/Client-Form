(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }
  if (Session.user(session).role !== 'owner') {
    location.replace('dashboard.html');
    return;
  }

  const $ = (id) => document.getElementById(id);
  mountPortalNav('team', session);
  const FORM_URL = new URL('../client-detail-form.html', location.href).href;
  const LOGIN_URL = new URL('./', location.href).href;
  const state = { users: [], codes: {} };

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

  function formLink(user) {
    return `${FORM_URL}?agent=${encodeURIComponent(user.formCode)}`;
  }

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

  function linkRow(url) {
    const copyBtn = el('button', { class: 'btn', type: 'button' }, 'Copy');
    copyBtn.addEventListener('click', () => copy(url, copyBtn));
    return el('div', { class: 'link-row' }, el('code', { text: url }), copyBtn);
  }

  function setupMessage(user, code, expiresAt) {
    return [
      `Hi ${user.name}, here is your sign-in for the ASG Ansar client dashboard:`,
      '',
      `Link: ${LOGIN_URL}`,
      `Email: ${user.email}`,
      `Temporary password: ${code}`,
      '',
      'After you sign in you will be asked to choose your own password (at least 8 characters).',
      `The temporary password works once and expires on ${formatDateTime(expiresAt)}.`,
      user.formCode ? `\nSend this form link to your clients so they appear in your dashboard:\n${formLink(user)}` : ''
    ].join('\n').trim();
  }

  function accessText(u) {
    if (!u.active) return 'Blocked – cannot sign in';
    if (u.setupCodeExpires && Date.parse(u.setupCodeExpires) > Date.now()) {
      return `Temporary password issued – valid until ${formatDateTime(u.setupCodeExpires)}`;
    }
    if (u.hasPassword) return `Can sign in · password set ${u.passwordSetAt ? formatDate(u.passwordSetAt) : ''}`.trim();
    return 'Needs a temporary password to sign in';
  }

  async function update(user, body, button) {
    button.disabled = true;
    try {
      const { user: updated } = await call(`/admin/team/${user.id}`, { method: 'PATCH', body });
      Object.assign(user, updated);
      render();
    } catch (err) {
      alert(err.message);
      button.disabled = false;
    }
  }

  async function makeCode(user, button) {
    if (user.hasPassword && !confirm(`${user.name} already has a password. A temporary password lets them choose a new one (their old password keeps working until they do). Continue?`)) return;
    button.disabled = true;
    button.textContent = 'Creating…';
    try {
      const { code, expiresAt, user: updated } = await call(`/admin/team/${user.id}/setup-code`, { method: 'POST' });
      Object.assign(user, updated);
      state.codes[user.id] = { code, expiresAt };
      render();
    } catch (err) {
      alert(err.message);
      button.disabled = false;
      button.textContent = 'Temporary password';
    }
  }

  function codeBox(user) {
    const issued = state.codes[user.id];
    if (!issued) return null;
    const message = setupMessage(user, issued.code, issued.expiresAt);
    const copyBtn = el('button', { class: 'btn btn-primary', type: 'button' }, 'Copy message');
    copyBtn.addEventListener('click', () => copy(message, copyBtn));
    const wa = el('a', { class: 'btn btn-gold', href: `https://wa.me/?text=${encodeURIComponent(message)}`, target: '_blank', rel: 'noopener noreferrer' }, 'Send by WhatsApp');
    return el('div', { class: 'code-box' },
      el('div', { class: 'sub', text: 'Temporary password (shown only now – send it to them):' }),
      el('div', { class: 'code', text: issued.code }),
      el('pre', { class: 'code-message', text: message }),
      el('div', { class: 'code-actions' }, copyBtn, wa)
    );
  }

  function member(u) {
    const codeBtn = el('button', { class: 'btn', type: 'button', disabled: !u.active }, 'Temporary password');
    codeBtn.addEventListener('click', () => makeCode(u, codeBtn));
    const activeBtn = el('button', { class: 'btn', type: 'button' }, u.active ? 'Block' : 'Unblock');
    activeBtn.addEventListener('click', () => {
      if (u.active && !confirm(`Block ${u.name}? They will be signed out and cannot sign in until you unblock them.`)) return;
      update(u, { active: !u.active }, activeBtn);
    });
    const roleSelect = el('select', { class: 'input role-select', 'aria-label': `Role for ${u.name}` },
      el('option', { value: 'agent', selected: u.role === 'agent' }, 'Agent'),
      el('option', { value: 'leader', selected: u.role === 'leader' }, 'Leader'));
    roleSelect.addEventListener('change', () => update(u, { role: roleSelect.value }, roleSelect));

    return el('article', { class: u.active ? 'member' : 'member inactive' },
      el('div', { class: 'member-head' },
        el('div', { class: 'grow' },
          el('div', { class: 'name', text: u.name }),
          el('div', { class: 'sub', text: u.email })
        ),
        el('span', { class: 'pill', 'data-status': u.role === 'leader' ? 'In Review' : 'Documents Verified', text: ROLE_LABELS[u.role] || 'No role' })
      ),
      el('div', { class: 'sub', text: accessText(u) }),
      u.formCode ? el('div', {}, el('div', { class: 'sub', text: 'Form link for their clients:' }), linkRow(formLink(u))) : null,
      el('div', { class: 'member-actions' }, codeBtn, roleSelect, activeBtn),
      codeBox(u)
    );
  }

  function render() {
    $('members').replaceChildren(...state.users.map(member));
    if (!state.users.length) $('members').replaceChildren(el('div', { class: 'sub team-pad', text: 'Nobody yet – add a person below.' }));
  }

  async function load() {
    try {
      const { users } = await call('/admin/team');
      state.users = users;
      $('lastUpdated').textContent = `${users.length} ${users.length === 1 ? 'person' : 'people'}`;
      render();
    } catch (err) {
      $('pageError').textContent = err.message;
      $('pageError').hidden = false;
      $('lastUpdated').textContent = 'Could not load the team';
    }
  }

  $('ownerLink').replaceChildren(linkRow(FORM_URL));

  $('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = { name: form.name.value.trim(), email: form.email.value.trim(), role: form.role.value };
    if (!body.name || !body.email) {
      $('addError').textContent = 'Please enter a name and email.';
      $('addError').hidden = false;
      return;
    }
    $('addError').hidden = true;
    $('addBtn').disabled = true;
    try {
      const { user } = await call('/admin/team', { method: 'POST', body });
      state.users.push(user);
      state.users.sort((a, b) => a.name.localeCompare(b.name));
      form.reset();
      render();
    } catch (err) {
      $('addError').textContent = err.message;
      $('addError').hidden = false;
    } finally {
      $('addBtn').disabled = false;
    }
  });

  load();
})();
