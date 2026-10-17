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
    ['Plan & Beneficiary', [
      ['Selected Plan', 'wide'], ['Beneficiary Name'], ['Beneficiary NRIC'],
      ['Beneficiary Relationship'], ['Benefit Weightage (%)']
    ]],
    ['Bank Details', [
      ['Bank Name'], ['Account Number'], ['Account Holder Name']
    ]],
    ['Submission', [
      ['Submission ID', 'wide'], ['Submitted At', 'datetime'], ['Agent Name'], ['Payload Version']
    ]]
  ];

  const DOCUMENTS = [['NRIC Front Photo', 'NRIC front'], ['NRIC Rear Photo', 'NRIC back'], ['Selfie with IC Photo', 'Selfie with IC'], ['Signature', 'Signature']];

  const $ = (id) => document.getElementById(id);
  const state = { submissions: [], filter: 'All', query: '', openId: null, current: null };

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
    try {
      const data = await call('/admin/submissions');
      state.submissions = data.submissions;
      $('lastUpdated').textContent = `Updated ${formatDateTime(new Date().toISOString())}`;
      render();
      // The list carries the NRIC, whose first six digits are the date of birth.
      showBirthdayReminder(state.submissions.map((s) => ({ name: s.fullName || '(no name)', phone: s.phone, bd: birthDate(null, s.nric) })));
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
    if (state.filter !== 'All' && statusOf(s) !== state.filter) return false;
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    const digits = q.replace(/\D/g, '');
    return [s.fullName, s.email, s.plan].some((v) => v && String(v).toLowerCase().includes(q)) ||
      (digits.length >= 3 && [s.nric, s.phone].some((v) => v && String(v).replace(/\D/g, '').includes(digits)));
  }

  function renderStats() {
    const count = (st) => state.submissions.filter((s) => statusOf(s) === st).length;
    const tiles = [
      ['total', 'Total submissions', state.submissions.length],
      ['received', 'New (Received)', count('Received')],
      ['review', 'In review', count('In Review') + count('Documents Verified')],
      ['approved', 'Approved', count('Approved')],
      ['followup', 'Needs follow-up', count('Needs Follow-up')]
    ];
    $('stats').replaceChildren(...tiles.map(([cls, label, value]) =>
      el('div', { class: `stat ${cls}` }, el('div', { class: 'stat-label', text: label }), el('div', { class: 'stat-value', text: value }))
    ));
  }

  function renderChips() {
    $('chips').replaceChildren(...['All', ...STATUSES].map((st) => {
      const n = st === 'All' ? state.submissions.length : state.submissions.filter((s) => statusOf(s) === st).length;
      return el('button', {
        class: 'chip',
        type: 'button',
        'aria-pressed': String(state.filter === st),
        onclick: () => { state.filter = st; render(); }
      }, `${st} (${n})`);
    }));
  }

  function renderRows() {
    const list = state.submissions.filter(matches);
    $('rows').replaceChildren(...list.map((s) =>
      el('tr', {
        class: 'row',
        tabindex: '0',
        onclick: () => openDetail(s.id),
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(s.id); } }
      },
        el('td', {}, el('div', { class: 'name', text: s.fullName || '(no name)' }), el('div', { class: 'sub num', text: s.nric || '' })),
        el('td', { class: 'col-hide-sm' }, el('div', { class: 'num', text: s.phone || '' }), el('div', { class: 'sub', text: s.email || '' })),
        el('td', { class: 'col-hide-md', text: s.plan || '' }),
        el('td', {}, el('span', { class: 'pill', 'data-status': statusOf(s), text: statusOf(s) })),
        el('td', { class: 'col-hide-sm sub', text: formatDateTime(s.submittedAt || s.createdTime) })
      )
    ));
    const empty = $('empty');
    empty.hidden = list.length > 0;
    empty.textContent = state.submissions.length ? 'No submissions match your search or filter.' : 'No submissions yet.';
  }

  function render() {
    renderStats();
    renderChips();
    renderRows();
  }

  // ---------- Detail drawer ----------

  function valueText(v, kind) {
    if (v == null || v === '') return '';
    if (kind === 'date') return formatDate(v);
    if (kind === 'datetime') return formatDateTime(v);
    if (kind === 'money') return formatMoney(v);
    if (typeof v === 'object') return v.name || JSON.stringify(v);
    return String(v);
  }

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

  function safeUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' ? u.href : null;
    } catch (e) {
      return null;
    }
  }

  function renderDocuments(data) {
    return el('section', { class: 'section' },
      el('h3', { text: 'Documents' }),
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

  function renderStatusControl(id, current) {
    const select = el('select', { 'aria-label': 'Submission status' },
      STATUSES.map((st) => el('option', { value: st, selected: st === current }, st)));
    const saveBtn = el('button', { class: 'btn btn-primary', type: 'button', disabled: true }, 'Update status');
    const note = el('span', { class: 'saved', role: 'status' });

    select.addEventListener('change', () => {
      saveBtn.disabled = select.value === current;
      note.textContent = '';
    });
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try {
        const { submission } = await call(`/admin/submissions/${id}`, { method: 'PATCH', body: { status: select.value } });
        current = submission.status;
        const row = state.submissions.find((s) => s.id === id);
        if (row) row.status = current;
        render();
        note.textContent = 'Saved';
      } catch (err) {
        note.textContent = '';
        alert(err.message);
        saveBtn.disabled = false;
      } finally {
        saveBtn.textContent = 'Update status';
      }
    });

    $('statusRow').replaceChildren(el('span', { class: 'sub', text: 'Status:' }), select, saveBtn, note);
  }

  async function openDetail(id) {
    const summary = state.submissions.find((s) => s.id === id) || {};
    state.openId = id;
    $('drawerTitle').textContent = summary.fullName || 'Submission';
    $('drawerSub').textContent = `Submitted ${formatDateTime(summary.submittedAt || summary.createdTime)}`;
    $('statusRow').replaceChildren();
    state.current = null;
    $('printBtn').hidden = true;
    $('drawerBody').replaceChildren(el('div', { class: 'loading', text: 'Loading full details…' }));
    $('scrim').hidden = false;
    $('drawer').hidden = false;
    document.body.style.overflow = 'hidden';
    $('closeDrawer').focus();

    try {
      const { submission } = await call(`/admin/submissions/${id}`);
      if (state.openId !== id) return;
      const f = submission.fields;
      state.current = submission;
      $('printBtn').hidden = false;
      renderStatusControl(id, f['Submission Status'] || 'Received');
      $('drawerBody').replaceChildren(
        ...SECTIONS.slice(0, 5).map(([title, fields]) => renderSection(title, fields, f)),
        renderDocuments(f),
        ...SECTIONS.slice(5).map(([title, fields]) => renderSection(title, fields, f))
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
          el('div', { text: formatDate(new Date().toISOString()) })
        )
      ),
      el('div', { class: 'print-client' },
        el('h1', { text: f['Full Name'] || summary.fullName || 'Client' }),
        el('div', { class: 'sub', text: f['Selected Plan'] || '' })
      ),
      ...SECTIONS.slice(0, 5).map(([title, fields]) => renderSection(title, fields, f)),
      renderDocuments(f),
      renderSection(...SECTIONS[5], f)
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

  // ---------- CSV export (summary columns) ----------

  function csvCell(v) {
    let s = v == null ? '' : String(v);
    // Stop spreadsheet apps from treating client-entered text as a formula.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportCsv() {
    const list = state.submissions.filter(matches);
    const header = ['Full Name', 'NRIC', 'Phone', 'Email', 'Plan', 'Status', 'Employment Type', 'Marital Status', 'Submitted At'];
    const lines = [header, ...list.map((s) => [
      s.fullName, s.nric, s.phone, s.email, s.plan, statusOf(s), s.employmentType, s.maritalStatus, formatDateTime(s.submittedAt || s.createdTime)
    ])].map((r) => r.map(csvCell).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `client-submissions-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Wire up ----------

  $('who').textContent = `Signed in as ${session.username}`;
  $('logoutBtn').addEventListener('click', () => signOut());
  $('refreshBtn').addEventListener('click', load);
  $('exportBtn').addEventListener('click', exportCsv);
  $('search').addEventListener('input', (e) => { state.query = e.target.value.trim(); renderRows(); });
  $('closeDrawer').addEventListener('click', closeDetail);
  $('printBtn').addEventListener('click', printDetail);
  $('scrim').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.openId) closeDetail(); });

  load();
})();
