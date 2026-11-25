(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }

  const STATUSES = ['Received', 'In Review', 'Documents Verified', 'Approved', 'Rejected', 'Needs Follow-up'];

  // Detail view layout - mirrors the client form's steps and the Airtable Clients table's field names.
  const SECTIONS = [
    ['Personal Information', [
      ['NRIC'], ['Date of Birth', 'date'], ['Gender'], ['Race'], ['Religion'],
      ['Email'], ['Phone Number'], ['Residential Address', 'wide']
    ]],
    ['Employment', [
      ['Employment Type'], ['Occupation'], ['Field of Work'], ["Employer's Name"],
      ['Monthly Income', 'money'], ['Work Place Address', 'wide']
    ]],
    ['Family', [
      ['Marital Status'], ['Spouse Name'], ['Spouse NRIC'], ['Number of Children'], ['Children Details', 'wide']
    ]],
    ['Medical History', [
      ['Height (cm)'], ['Weight (kg)'], ['Smoking Status'],
      ['Pre-existing Medical Conditions', 'wide'], ['Current Medications', 'wide'],
      ['Allergies', 'wide'], ['Previous Surgery/Hospitalization', 'wide']
    ]],
    ['Existing Coverage', [
      ['Existing Coverage'], ['Existing Premium per Year', 'money'], ['Existing Policies', 'wide']
    ]],
    ['Plan & Beneficiary', [
      ['Selected Plan', 'wide'], ['Beneficiary Name'], ['Beneficiary NRIC'],
      ['Beneficiary Relationship'], ['Benefit Weightage (%)']
    ]],
    ['Bank Details', [
      ['Bank Name'], ['Account Number'], ['Account Holder Name']
    ]],
    ['Submission', [
      ['Submission ID', 'wide'], ['Submitted At', 'datetime'], ['Agent Name'], ['Form Version'], ['Payload Version']
    ]]
  ];

  // Sections shown before the Documents block; the rest (bank, submission) come after it.
  const CLIENT_SECTIONS = SECTIONS.findIndex(([title]) => title === 'Bank Details');

  const DOCUMENTS = [['NRIC Front Photo', 'NRIC front'], ['NRIC Rear Photo', 'NRIC back'], ['Selfie with IC Photo', 'Selfie with IC'], ['Signature', 'Signature']];

  const $ = (id) => document.getElementById(id);
  const me = Session.user(session);
  const seesAll = me.role !== 'agent';
  const state = { submissions: [], filter: 'All', agent: 'All', query: '', openId: null, current: null };

  function signOut(message) {
    Session.clear();
    if (message) {
      try { sessionStorage.setItem('prubsn-admin-notice', message); } catch (e) { /* ignore */ }
    }
    location.replace('./');
  }

  // End the session the moment the token expires, even if the tab sits idle.
  setTimeout(() => signOut('Your session has expired. Please sign in again.'), Math.max(0, session.expiresAt * 1000 - Date.now()));

  async function call(path, opts) {
    try {
      return await api(path, opts);
    } catch (err) {
      if (err.status === 401) signOut(err.message);
      throw err;
    }
  }

  function showPageError(message) {
    $('pageError').textContent = message;
    $('pageError').hidden = !message;
  }

  // ---------- List ----------

  async function load() {
    $('refreshBtn').disabled = true;
    showPageError('');
    if (!state.submissions.length) skeleton();
    try {
      const data = await call('/admin/submissions');
      state.submissions = data.submissions;
      $('lastUpdated').textContent = `Updated ${formatDateTime(new Date().toISOString())}`;
      render();
      const linked = (/^#open=(rec[A-Za-z0-9]{14})$/.exec(location.hash) || [])[1];
      if (linked) { history.replaceState(null, '', location.pathname); openDetail(linked); }
      showBirthdayReminder(state.submissions.map((s) => ({ name: s.fullName || '(no name)', phone: s.phone, bd: birthDate(s.dateOfBirth, s.nric) })));
    } catch (err) {
      showPageError(err.message);
      $('lastUpdated').textContent = 'Could not load submissions';
    } finally {
      $('refreshBtn').disabled = false;
    }
  }

  function statusOf(s) {
    return s.status || 'Received';
  }

  function matches(s) {
    if (state.agent !== 'All' && agentLabel(s) !== state.agent) return false;
    if (state.filter !== 'All' && statusOf(s) !== state.filter) return false;
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    const digits = q.replace(/\D/g, '');
    return [s.fullName, s.email, s.plan, s.agentName].some((v) => v && String(v).toLowerCase().includes(q)) ||
      (digits.length >= 3 && [s.nric, s.phone].some((v) => v && String(v).replace(/\D/g, '').includes(digits)));
  }

  // Submissions for the chosen agent (all of them for "All agents"); status chips and tiles count within it.
  function pool() {
    return state.agent === 'All' ? state.submissions : state.submissions.filter((s) => agentLabel(s) === state.agent);
  }

  const flags = (window.ASG_CONFIG && window.ASG_CONFIG.features) || {};
  const canDelete = me.role === 'owner' && Boolean(flags.deleteCustomer);
  const PILL = { 'Received': 'neutral', 'In Review': 'soon', 'Documents Verified': 'info', 'Approved': 'ok', 'Rejected': 'now', 'Needs Follow-up': 'now' };
  const SHORT = { 'Documents Verified': 'Verified', 'Needs Follow-up': 'Follow-up', 'In Review': 'In review' };
  const TEST = 'Test entries';
  const shortPlan = (plan) => String(plan || '').replace(/^PruBSN\s+/i, '').replace(/\s+—\s+Medic TotalCare Plan\s+/i, ' ').trim();
  const dayMonth = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' }) : '');
  const pill = (status) => el('span', { class: `pill pill--${PILL[status] || 'neutral'}`, text: SHORT[status] || status });
  const isTest = (s) => isTestEntry(s.fullName);
  state.selecting = false;
  state.selected = new Set();

  function renderStats() {
    const count = (st) => pool().filter((s) => statusOf(s) === st).length;
    const cells = [
      ['Received', 'New', count('Received'), 'var(--muted)'],
      ['In Review', 'Review', count('In Review') + count('Documents Verified'), 'var(--gold)'],
      ['Approved', 'Approved', count('Approved'), 'var(--success)'],
      ['Needs Follow-up', 'Follow-up', count('Needs Follow-up'), 'var(--danger)']
    ];
    $('stats').replaceChildren(...cells.map(([filter, label, n, colour]) => {
      const dot = el('span', { class: 'dot', 'aria-hidden': 'true' });
      dot.style.setProperty('color', colour);
      return el('button', { class: 'statstrip__cell', type: 'button', 'aria-pressed': String(state.filter === filter), onclick: () => { state.filter = state.filter === filter ? 'All' : filter; render(); } },
        el('b', { class: 'num', text: n }), el('span', {}, dot, label));
    }));
  }

  function renderAgentFilter() {
    if (!seesAll) return;
    const names = [...new Set(state.submissions.map(agentLabel))].sort();
    if (state.agent !== 'All' && !names.includes(state.agent)) state.agent = 'All';
    const select = $('agentFilter');
    select.replaceChildren(
      el('option', { value: 'All', selected: state.agent === 'All' }, 'All agents'),
      ...names.map((n) => el('option', { value: n, selected: state.agent === n }, `${n} (${state.submissions.filter((s) => agentLabel(s) === n).length})`))
    );
    select.hidden = false;
  }

  function renderChips() {
    const tests = pool().filter(isTest).length;
    const chips = ['All', ...STATUSES].map((st) => {
      const n = st === 'All' ? pool().length : pool().filter((s) => statusOf(s) === st).length;
      return el('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.filter === st), onclick: () => { state.filter = st; render(); } },
        `${st === 'All' ? 'All' : (SHORT[st] || st)} ${n}`);
    });
    if (tests) {
      chips.push(el('button', { class: 'chip chip--test', id: 'testFilter', type: 'button', 'aria-pressed': String(state.filter === TEST), onclick: () => { state.filter = state.filter === TEST ? 'All' : TEST; render(); } },
        iconEl('tag', 16), `${TEST} ${tests}`));
    }
    $('chips').replaceChildren(...chips);
  }

  function renderRows() {
    const list = state.filter === TEST
      ? state.submissions.filter((s) => isTest(s) && (state.agent === 'All' || agentLabel(s) === state.agent) && (!state.query || matchesQuery(s)))
      : state.submissions.filter(matches);
    state.visible = list.map((s) => s.id);
    $('rows').replaceChildren(...list.map((s) => {
      const selected = state.selected.has(s.id);
      const when = s.submittedAt || s.createdTime;
      const sub = [shortPlan(s.plan), maskNric(s.nric)].filter(Boolean).join(' · ');
      const main = el('div', { class: 'li__main' },
        el('div', { class: 'li__title' }, s.fullName || '(no name)', isTest(s) ? el('span', { class: 'tag-test', text: 'TEST' }) : null),
        el('div', { class: 'li__sub num', text: sub }),
        seesAll ? el('div', { class: 'li__sub cust-agent', text: agentLabel(s) }) : null);
      const meta = el('div', { class: 'cust-meta' }, el('span', { class: 'li__meta', text: dayMonth(when) }), pill(statusOf(s)));
      const check = state.selecting ? el('span', { class: `checkcircle${selected ? ' is-on' : ''}`, 'aria-hidden': 'true' }, selected ? iconEl('check', 16) : null) : null;
      return el('button', {
        class: `li li--btn cust-row${selected ? ' is-selected' : ''}`, type: 'button', role: 'listitem',
        'aria-pressed': state.selecting ? String(selected) : null,
        'aria-label': state.selecting ? `${selected ? 'Deselect' : 'Select'} ${s.fullName || 'customer'}` : null,
        onclick: () => (state.selecting ? toggleSelect(s.id) : openDetail(s.id))
      }, check, main, meta);
    }));
    const empty = $('empty');
    empty.hidden = list.length > 0;
    $('rows').hidden = list.length === 0;
    empty.replaceChildren(...(state.submissions.length
      ? [el('div', { class: 'empty__title', text: 'No customers match' }), el('div', { text: 'Try another search or filter.' })]
      : [el('div', { class: 'empty__title', text: 'No customers yet' }), el('div', { text: 'Share your form link and new applications appear here.' }), el('a', { class: 'btn btn--primary', href: 'forms.html' }, 'Share my form link')]));
    if (state.selecting) renderBulk();
  }

  function matchesQuery(s) {
    const q = state.query.toLowerCase();
    const digits = q.replace(/\D/g, '');
    return [s.fullName, s.email, s.plan, s.agentName].some((v) => v && String(v).toLowerCase().includes(q)) ||
      (digits.length >= 3 && [s.nric, s.phone].some((v) => v && String(v).replace(/\D/g, '').includes(digits)));
  }

  function render() {
    renderAgentFilter();
    renderStats();
    renderChips();
    renderRows();
    const newToday = state.submissions.filter((s) => statusOf(s) === 'Received' && new Date(s.submittedAt || s.createdTime).toLocaleDateString('en-CA', { timeZone: TZ }) === new Date().toLocaleDateString('en-CA', { timeZone: TZ })).length;
    setNavBadge('customers', newToday);
  }

  function skeleton() {
    $('rows').replaceChildren(...[0, 1, 2, 3, 4].map(() => el('div', { class: 'li', 'aria-hidden': 'true' },
      el('div', { class: 'li__main' }, el('div', { class: 'skel cust-skel-a' }), el('div', { class: 'skel cust-skel-b' })))));
  }

  // ---------- Select mode + delete (owner; behind config.features.deleteCustomer) ----------

  function setSelecting(on) {
    state.selecting = on;
    state.selected.clear();
    $('bulkHead').hidden = !on;
    document.querySelector('.app-main > .topbar').hidden = on;
    $('bulkBar').hidden = !on;
    document.body.classList.toggle('is-selecting', on);
    renderRows();
    renderBulk();
  }
  function toggleSelect(id) {
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    renderRows();
  }
  function renderBulk() {
    const n = state.selected.size;
    $('selectedCount').textContent = `${n} selected`;
    $('selectAll').textContent = state.visible && n === state.visible.length && n ? 'Select none' : 'Select all';
    $('bulkDeleteBtn').disabled = n === 0;
    $('bulkDeleteBtn').replaceChildren(iconEl('trash', 20), n ? `Delete ${n} selected` : 'Select customers to delete');
  }

  async function deleteCustomers(ids) {
    const names = ids.map((id) => (state.submissions.find((s) => s.id === id) || {}).fullName || 'this customer');
    const one = ids.length === 1;
    const ok = await confirmAction({
      title: one ? `Delete ${names[0]}?` : `Delete ${ids.length} customers?`,
      message: 'This removes the form, IC photos and signature. It can’t be undone.',
      confirmLabel: one ? 'Delete customer' : `Delete ${ids.length} customers`
    });
    if (!ok) return false;
    const done = [];
    let error = null;
    for (const id of ids) {
      try {
        await call(`/admin/submissions/${id}`, { method: 'DELETE' });
        done.push(id);
      } catch (err) {
        error = err;
        break;
      }
    }
    state.submissions = state.submissions.filter((s) => !done.includes(s.id));
    done.forEach((id) => state.selected.delete(id));
    if (state.filter === TEST && !state.submissions.some(isTest)) state.filter = 'All';
    render();
    if (done.length) showToast(one ? `Deleted ${names[0]}` : `Deleted ${done.length} customers`);
    if (error) showPageError(`Could not delete: ${error.message}`);
    return done.length === ids.length;
  }

  // ---------- Detail sheet ----------

  function valueText(v, kind) {
    if (v == null || v === '') return '';
    if (kind === 'date') return formatDate(v);
    if (kind === 'datetime') return formatDateTime(v);
    if (kind === 'money') return formatMoney(v);
    if (typeof v === 'object') return v.name || JSON.stringify(v);
    return String(v);
  }

  // Printed sheet: the original grid layout.
  function renderSection(title, fields, data) {
    return el('section', { class: 'section' },
      el('h3', { text: title }),
      el('dl', { class: 'kv' }, fields.map(([name, kind]) => {
        const text = valueText(data[name], kind);
        return el('div', { class: kind === 'wide' ? 'wide' : null },
          el('dt', { text: name }),
          el('dd', { class: text ? null : 'blank', text: text || '—' })
        );
      }))
    );
  }

  // On screen: label/value rows. Long values stack under their label.
  function renderDetailSection(title, fields, data) {
    return el('section', { class: 'cust-section' },
      el('h3', { class: 'label', text: title }),
      el('dl', { class: 'kv-group' }, fields.map(([name, kind]) => {
        let text = valueText(data[name], kind);
        if (/NRIC/.test(name)) text = formatNric(text);
        return el('div', { class: `kv${kind === 'wide' ? ' kv--stack' : ''}` },
          el('dt', { text: name }),
          el('dd', { class: text ? null : 'blank', text: text || '—' }));
      })));
  }

  function safeUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' ? u.href : null;
    } catch (e) {
      return null;
    }
  }

  function renderDocuments(data, onScreen) {
    return el('section', { class: onScreen ? 'cust-section' : 'section' },
      el('h3', { class: onScreen ? 'label' : null, text: 'Documents' }),
      el('div', { class: 'docs' }, DOCUMENTS.map(([field, label]) => {
        const file = Array.isArray(data[field]) ? data[field][0] : null;
        const full = file && safeUrl(file.url);
        const thumb = file && safeUrl((file.thumbnails && file.thumbnails.large && file.thumbnails.large.url) || file.url);
        return el('div', { class: 'doc' },
          label,
          full
            ? el('a', { href: full, target: '_blank', rel: 'noopener noreferrer', title: `Open ${label}` },
                el('img', { src: thumb, alt: label, loading: 'lazy' }))
            : el('div', { class: 'missing', text: 'Not uploaded' })
        );
      }))
    );
  }

  // One tap on a status saves it (no separate Update button).
  function renderStatusControl(id, current) {
    const saved = el('div', { class: 'cust-saved', id: 'statusSaved', role: 'status', 'aria-live': 'polite' });
    const chips = el('div', { class: 'chips cust-status__chips', role: 'radiogroup', 'aria-label': 'Status' });
    const draw = (busy) => chips.replaceChildren(...STATUSES.map((st) => el('button', {
      class: 'chip', type: 'button', role: 'radio', 'aria-checked': String(st === current), 'aria-pressed': String(st === current), disabled: busy || null,
      onclick: () => save(st)
    }, st === current ? iconEl('check', 16) : null, SHORT[st] || st)));
    async function save(st) {
      if (st === current) return;
      const before = current;
      current = st;
      draw(true);
      saved.replaceChildren('Saving…');
      try {
        const { submission } = await call(`/admin/submissions/${id}`, { method: 'PATCH', body: { status: st } });
        current = submission.status;
        const row = state.submissions.find((s) => s.id === id);
        if (row) row.status = current;
        render();
        saved.replaceChildren(iconEl('check', 16), `Saved · ${SHORT[current] || current}`);
      } catch (err) {
        current = before;
        saved.replaceChildren(el('span', { class: 'field__error', text: `Not saved: ${err.message}` }));
      }
      draw(false);
    }
    draw(false);
    $('statusRow').replaceChildren(el('div', { class: 'label', text: 'Status · saves on tap' }), chips, saved);
  }

  function renderActions(f) {
    const wa = waNumber(f['Phone Number']);
    const tel = String(f['Phone Number'] || '').replace(/[^\d+]/g, '');
    $('custActions').replaceChildren(
      wa ? el('a', { class: 'btn btn--wa', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener' }, iconEl('chat', 20), 'WhatsApp') : null,
      tel ? el('a', { class: 'btn', href: `tel:${tel}` }, iconEl('phone', 20), 'Call') : null,
      $('printBtn'));
    $('printBtn').replaceChildren(iconEl('print', 20), 'Print');
  }

  async function openDetail(id) {
    const summary = state.submissions.find((s) => s.id === id) || {};
    state.openId = id;
    $('drawerTitle').textContent = summary.fullName || 'Customer';
    $('drawerSub').textContent = [shortPlan(summary.plan), `sent ${formatDateTime(summary.submittedAt || summary.createdTime)}`].filter(Boolean).join(' · ');
    $('statusRow').replaceChildren();
    $('custActions').replaceChildren($('printBtn'));
    state.current = null;
    $('printBtn').hidden = true;
    $('drawerBody').replaceChildren(...[0, 1, 2].map(() => el('div', { class: 'skel cust-skel-block', 'aria-hidden': 'true' })));
    $('scrim').hidden = false;
    $('drawer').hidden = false;
    $('drawer').scrollTop = 0;
    document.body.style.overflow = 'hidden';
    $('closeDrawer').focus();

    try {
      const { submission } = await call(`/admin/submissions/${id}`);
      if (state.openId !== id) return;
      const f = submission.fields;
      state.current = submission;
      $('printBtn').hidden = false;
      renderStatusControl(id, f['Submission Status'] || 'Received');
      renderActions(f);
      $('drawerBody').replaceChildren(
        ...SECTIONS.slice(0, CLIENT_SECTIONS).map(([title, fields]) => renderDetailSection(title, fields, f)),
        renderDocuments(f, true),
        ...SECTIONS.slice(CLIENT_SECTIONS).map(([title, fields]) => renderDetailSection(title, fields, f)),
        canDelete ? el('section', { class: 'cust-section' },
          el('h3', { class: 'label', text: 'Owner only' }),
          el('button', { class: 'btn btn--danger btn--block', id: 'deleteBtn', type: 'button', onclick: async () => { if (await deleteCustomers([id])) closeDetail(); } },
            iconEl('trash', 20), 'Delete customer')) : null
      );
    } catch (err) {
      if (state.openId === id) $('drawerBody').replaceChildren(el('div', { class: 'alert', text: err.message }));
    }
  }

  function closeDetail() {
    state.openId = null;
    state.current = null;
    $('scrim').hidden = true;
    $('drawer').hidden = true;
    document.body.style.overflow = '';
    $('drawerBody').replaceChildren();
  }

  // ---------- Print / save as PDF ----------

  // Builds a clean A4 sheet of the open client and hands it to the browser's
  // print dialog, where "Save as PDF" gives a PDF copy.
  async function printDetail() {
    const sub = state.current;
    if (!sub) return;
    const f = sub.fields;
    const summary = state.submissions.find((s) => s.id === sub.id) || {};
    // Letterhead, then the client's details only (no internal submission/status info).
    const sheet = el('div', { class: 'print-sheet', id: 'printSheet' },
      el('div', { class: 'print-watermark', 'aria-hidden': 'true' }, 'ASG ANSAR', el('br'), 'USE ONLY'),
      el('header', { class: 'letterhead' },
        el('img', { class: 'letterhead-logo', src: 'img/asg-ansar-logo.jpg', alt: 'ASG Ansar Group' }),
        el('div', { class: 'grow' },
          el('div', { class: 'letterhead-name', text: 'ASG ANSAR GROUP' }),
          el('div', { class: 'letterhead-sub', text: 'Ejen Takaful · Prudential BSN Takaful Berhad' }),
          el('div', { class: 'letterhead-sub', text: 'Sungai Petani, Kedah' })
        ),
        el('div', { class: 'letterhead-right' },
          el('img', { class: 'letterhead-partner', src: 'img/prubsn-takaful-logo.png', alt: 'Prudential BSN Takaful' }),
          el('div', { class: 'letterhead-title', text: 'Client Details' }),
          el('div', { text: formatDate(new Date().toISOString()) }),
          f['Form Version'] ? el('div', { text: `Form v${String(f['Form Version']).replace(/^v/i, '')}` }) : null
        )
      ),
      el('div', { class: 'print-client' },
        el('h1', { text: f['Full Name'] || summary.fullName || 'Client' }),
        el('div', { class: 'sub', text: f['Selected Plan'] || '' })
      ),
      ...SECTIONS.slice(0, CLIENT_SECTIONS).map(([title, fields]) => renderSection(title, fields, f)),
      renderDocuments(f),
      renderSection(...SECTIONS[CLIENT_SECTIONS], f)
    );
    document.getElementById('printSheet')?.remove();
    document.body.append(sheet);

    // Give the photos a moment to load so they appear on the page.
    const imgs = [...sheet.querySelectorAll('img')];
    imgs.forEach((img) => img.removeAttribute('loading'));
    await Promise.race([
      Promise.all(imgs.map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))),
      new Promise((r) => setTimeout(r, 4000))
    ]);

    const prevTitle = document.title;
    document.title = `Client - ${f['Full Name'] || sub.id}`;
    document.body.classList.add('printing-sheet');
    window.addEventListener('afterprint', () => {
      sheet.remove();
      document.body.classList.remove('printing-sheet');
      document.title = prevTitle;
    }, { once: true });
    window.print();
  }

  // ---------- Change password (leaders and agents) ----------

  function openChangePassword() {
    const err = el('div', { class: 'alert', role: 'alert', hidden: true });
    const field = (label, name, autocomplete) => el('div', { class: 'field' },
      el('label', { for: `cp-${name}`, text: label }),
      el('input', { class: 'input', id: `cp-${name}`, name, type: 'password', autocomplete, required: true }));
    const saveBtn = el('button', { class: 'btn btn--primary', type: 'submit' }, 'Save');
    const cancelBtn = el('button', { class: 'btn', type: 'button' }, 'Cancel');
    const form = el('form', { class: 'reminder', novalidate: true },
      el('h2', { text: 'Change password' }),
      err,
      field('Current password', 'current', 'current-password'),
      field('New password (at least 8 characters)', 'next', 'new-password'),
      field('Type the new password again', 'again', 'new-password'),
      el('div', { class: 'reminder-actions' }, cancelBtn, saveBtn));
    const overlay = el('div', { class: 'reminder-overlay' }, form);
    const close = () => overlay.remove();
    cancelBtn.addEventListener('click', close);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const show = (m) => { err.textContent = m; err.hidden = false; };
      if (form.next.value.length < 8) return show('Your new password needs at least 8 characters.');
      if (form.next.value !== form.again.value) return show('The two new passwords do not match.');
      saveBtn.disabled = true;
      try {
        const data = await call('/admin/change-password', { method: 'POST', body: { currentPassword: form.current.value, newPassword: form.next.value } });
        Session.set({ ...session, token: data.token, expiresAt: data.expiresAt, user: data.user });
        session.token = data.token;
        close();
        alert('Your password has been changed.');
      } catch (ex) {
        show(ex.message);
        saveBtn.disabled = false;
      }
    });
    document.body.append(overlay);
    form.current.focus();
  }

  // ---------- CSV export (summary columns) ----------

  function csvCell(v) {
    let s = v == null ? '' : String(v);
    // Stop spreadsheet apps from treating client-entered text as a formula.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportCsv() {
    const list = state.submissions.filter(matches);
    const header = ['Full Name', 'NRIC', 'Phone', 'Email', 'Plan', 'Status', 'Agent', 'Employment Type', 'Marital Status', 'Submitted At'];
    const lines = [header, ...list.map((s) => [
      s.fullName, s.nric, s.phone, s.email, s.plan, statusOf(s), agentLabel(s), s.employmentType, s.maritalStatus, formatDateTime(s.submittedAt || s.createdTime)
    ])].map((r) => r.map(csvCell).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `client-submissions-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Wire up ----------

  mountPortalNav('customers', session);
  $('refreshBtn').replaceChildren(iconEl('refresh', 20));
  $('searchIcon').replaceWith(iconEl('search', 18));
  $('closeDrawer').replaceChildren(iconEl('x', 22));
  $('passwordBtn').hidden = me.role === 'owner';
  $('passwordBtn').addEventListener('click', openChangePassword);
  $('agentFilter').addEventListener('change', (e) => { state.agent = e.target.value; render(); });
  $('refreshBtn').addEventListener('click', load);
  $('exportBtn').addEventListener('click', exportCsv);
  $('search').addEventListener('input', (e) => { state.query = e.target.value.trim(); renderRows(); });
  $('closeDrawer').addEventListener('click', closeDetail);
  $('printBtn').addEventListener('click', printDetail);
  $('scrim').addEventListener('click', closeDetail);
  enableSwipeClose($('drawer'), closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (state.openId && !document.getElementById('confirmSheet')) closeDetail();
    else if (state.selecting) setSelecting(false);
  });
  if (canDelete) {
    $('selectBtn').hidden = false;
    $('selectBtn').addEventListener('click', () => setSelecting(true));
    $('selectDone').addEventListener('click', () => setSelecting(false));
    $('selectAll').addEventListener('click', () => {
      const all = state.visible && state.selected.size === state.visible.length;
      state.selected = new Set(all ? [] : state.visible);
      renderRows();
    });
    $('bulkDeleteBtn').addEventListener('click', async () => {
      if (await deleteCustomers([...state.selected])) setSelecting(false);
    });
  }
  // dashboard.html#password (from More) opens "Change password".
  if (location.hash === '#password' && me.role !== 'owner') { history.replaceState(null, '', location.pathname); openChangePassword(); }

  load();
})();
