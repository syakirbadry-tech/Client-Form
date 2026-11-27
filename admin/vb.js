(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }

  const $ = (id) => document.getElementById(id);
  mountPortalNav('vb', session);

  const STAGES = { 1: 'New name', 2: 'Contacted', 3: 'Appointment', 4: 'Policy approved' };
  const SOURCES = ['Referral', 'Family & friends', 'Event', 'Social media', 'Walk-in', 'Other'];
  const PAYMENTS_PER_YEAR = { Monthly: 12, Quarterly: 4, 'Half-yearly': 2, Yearly: 1 };
  const FULL_CASE_TPC = 1800;
  const state = { prospects: [], week: null, team: null, stage: 'All', query: '', openId: null };

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

  const tpcOf = (premium, frequency) => Math.round(Number(premium) * (PAYMENTS_PER_YEAR[frequency] || 0) * 100) / 100;
  const casesOf = (tpc) => (tpc >= FULL_CASE_TPC ? 1 : 0.5);
  const dateMY = (iso) => (iso ? new Date(iso).toLocaleDateString('en-MY', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const number = (n) => Number(n || 0).toLocaleString('en-MY', { maximumFractionDigits: 2 });


  // <input type="datetime-local"> value for an ISO time, in Malaysia time.
  function localInputValue(iso) {
    if (!iso) return '';
    const d = new Date(new Date(iso).getTime() + 8 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  }
  const fromLocalInput = (v) => (v ? new Date(`${v}:00+08:00`).toISOString() : '');

  // ---------- Load & render ----------

  async function load() {
    if (!state.prospects.length && !state.week) {
      $('rows').replaceChildren(...[0, 1, 2, 3].map(() => el('div', { class: 'li', 'aria-hidden': 'true' },
        el('div', { class: 'skel vb-skel-av' }), el('div', { class: 'li__main' }, el('div', { class: 'skel cust-skel-a' }), el('div', { class: 'skel cust-skel-b' })))));
    }
    const cached = !state.prospects.length && !state.week && DataCache.get('/admin/vb');
    if (cached) {
      state.prospects = cached.prospects;
      state.week = cached.week;
      state.team = cached.team;
      render();
    }
    try {
      const data = await call('/admin/vb');
      state.prospects = data.prospects;
      state.week = data.week;
      state.team = data.team;
      $('lastUpdated').textContent = `Week of ${dateMY(data.week.start)}`;
      $('lastUpdated').dataset.ready = '1';
      $('pageError').hidden = true;
      render();
    } catch (err) {
      $('pageError').textContent = err.message;
      $('pageError').hidden = false;
      $('lastUpdated').textContent = 'Could not load VB';
    }
  }

  function render() {
    renderStats();
    renderChips();
    renderRows();
    renderTeam();
    if (state.openId) {
      const p = state.prospects.find((x) => x.id === state.openId);
      if (p) renderDetail(p); else closeDrawer();
    }
  }

  const SHORT_STAGE = { 1: 'New', 2: 'Contacted', 3: 'Appt', 4: 'Approved' };
  const LIST_TITLE = { All: 'All names', 1: 'VB1 · New names', 2: 'VB2 · Contacted', 3: 'VB3 · Appointments', 4: 'VB4 · Approved' };
  const timeOnly = (iso) => new Date(iso).toLocaleTimeString('en-MY', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?m\.?/i, ' $1m').toLowerCase();
  const dayIndex = (t) => Math.floor((t + 8 * 3600000) / 86400000);
  function whenText(iso) {
    const diff = dayIndex(Date.parse(iso)) - dayIndex(Date.now());
    const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday'
      : new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
    return `${day}, ${timeOnly(iso)}`;
  }

  // Stage tiles double as the filter (tap again for all names).
  function renderStats() {
    const at = (n) => state.prospects.filter((p) => p.stage === n).length;
    $('stats').replaceChildren(...[1, 2, 3, 4].map((n) => el('button', {
      class: 'stage', type: 'button', 'aria-pressed': String(state.stage === String(n)),
      'aria-label': `VB${n} ${STAGES[n]}: ${at(n)}`,
      onclick: () => { state.stage = state.stage === String(n) ? 'All' : String(n); renderStats(); renderRows(); }
    }, el('b', { text: at(n) }), el('span', { text: SHORT_STAGE[n] }))));
    const c = state.week.counts;
    const note = $('weekNote');
    note.hidden = false;
    note.replaceChildren(iconEl('trophy', 18), el('span', {}, el('b', { text: `${number(c.cases)} ${c.cases === 1 ? 'case' : 'cases'}` }), ` this week · TPC ${number(c.tpc)}`),
      state.team ? el('a', { href: '#teamPanel', class: 'vb-weeknote__link' }, 'Team') : null);
  }

  function renderChips() { /* stage filter lives on the tiles (phase 5); #chips kept for older links */ }

  // What to do next, and when. Sort key: the most urgent first.
  function nextStep(p) {
    if (p.stage === 4) return { text: `${p.product || 'Policy'} · TPC ${number(p.tpc)} · ${p.cases} ${p.cases === 1 ? 'case' : 'cases'}`, key: 4e15 - (Date.parse(p.approvedAt) || 0) };
    if (p.stage === 3) {
      if (!p.appointmentAt) return { text: 'No time set · tap to book', cls: 'is-alert', key: 0 };
      const t = Date.parse(p.appointmentAt);
      const past = t < Date.now() - 2 * 3600000;
      return { text: past ? `${whenText(p.appointmentAt)} · update the outcome` : whenText(p.appointmentAt), cls: past ? 'is-alert' : dayIndex(t) === dayIndex(Date.now()) ? 'is-today' : '', key: past ? 1 : t };
    }
    if (p.stage === 2) {
      const days = dayIndex(Date.now()) - dayIndex(Date.parse(p.contactedAt));
      return { text: days >= 3 ? `Contacted ${days} days ago · set an appointment` : 'Next: set an appointment', cls: days >= 3 ? 'is-alert' : '', key: 2e15 - (Date.parse(p.contactedAt) || 0) };
    }
    return { text: 'Next: call or WhatsApp', key: 3e15 - (Date.parse(p.createdAt) || 0) };
  }

  function renderRows() {
    const q = state.query.toLowerCase();
    const shown = state.prospects
      .filter((p) => (state.stage === 'All' || String(p.stage) === state.stage) && (!q || p.name.toLowerCase().includes(q) || String(p.phone || '').includes(q)))
      .map((p) => ({ p, next: nextStep(p) }))
      .sort((x, y) => x.next.key - y.next.key);
    $('listTitle').textContent = LIST_TITLE[state.stage] || 'All names';
    $('rows').replaceChildren(...shown.map(({ p, next }) => {
      const wa = waNumber(p.phone);
      return el('div', { class: 'li vb-prow', role: 'listitem' },
        el('button', { class: 'vb-prow__open', type: 'button', onclick: () => openDetail(p.id) },
          avatarEl({ id: p.id }, p.name),
          el('div', { class: 'li__main' },
            el('div', { class: 'li__title' }, p.name),
            el('div', { class: 'li__sub', text: [p.phone, p.source].filter(Boolean).join(' · ') || `VB${p.stage} · ${STAGES[p.stage]}` }),
            el('div', { class: `vb-next ${next.cls || ''}`, text: next.text })),
          el('span', { class: `pill pill--${['', 'neutral', 'info', 'soon', 'ok'][p.stage]}`, text: `VB${p.stage}` })),
        wa ? el('a', { class: 'icon-btn btn--wa vb-wa', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener', 'aria-label': `WhatsApp ${p.name}`,
          onclick: () => { if (p.stage < 2) call(`/admin/vb/${p.id}`, { method: 'PATCH', body: { action: 'contacted' } }).then(load).catch(() => {}); } }, iconEl('chat', 20)) : null);
    }));
    $('rows').hidden = shown.length === 0;
    $('empty').hidden = shown.length > 0;
    $('empty').replaceChildren(...(state.prospects.length
      ? [el('div', { class: 'empty__title', text: 'No names match' }), el('div', { text: 'Try another search or stage.' })]
      : [el('div', { class: 'empty__title', text: 'Your VB list is empty' }), el('div', { text: 'Add the first person you want to talk to.' }),
        el('button', { class: 'btn btn--primary', type: 'button', onclick: openAdd }, iconEl('useradd', 20), 'Add name')]));
  }

  function renderTeam() {
    $('teamPanel').hidden = !state.team;
    if (!state.team) return;
    const cell = (v) => el('td', { class: 'right num', text: v });
    $('teamRows').replaceChildren(...(state.team.length ? state.team.map((t) => el('tr', {},
      el('td', { class: 'name', text: personName(t.agent) }),
      cell(t.week.vb1), cell(t.week.vb2), cell(t.week.vb3), cell(t.week.vb4), cell(number(t.week.cases)), cell(number(t.week.tpc)),
      cell(`${t.byStage.vb1} / ${t.byStage.vb2} / ${t.byStage.vb3} / ${t.byStage.vb4}`)))
      : [el('tr', {}, el('td', { colspan: '8', class: 'sub', text: 'Nobody has added names yet.' }))]));
  }

  // ---------- Drawer (add name / one name's detail) ----------

  function openDrawer(title, sub, body) {
    const wasOpen = !$('drawer').hidden;
    $('drawerTitle').textContent = title;
    $('drawerSub').textContent = sub;
    $('drawerBody').replaceChildren(...body);
    $('drawer').hidden = false;
    $('scrim').hidden = false;
    document.body.style.overflow = 'hidden';
    if (!wasOpen) { $('drawer').scrollTop = 0; $('closeDrawer').focus(); }
  }

  function closeDrawer() {
    state.openId = null;
    $('drawer').hidden = true;
    $('scrim').hidden = true;
    document.body.style.overflow = '';
  }

  function errorBox() {
    return el('div', { class: 'alert', role: 'alert', hidden: true });
  }

  function showError(box, err) {
    box.textContent = err.message;
    box.hidden = false;
  }

  async function save(path, method, body, button, box) {
    button.disabled = true;
    box.hidden = true;
    try {
      const data = await call(path, { method, body });
      await load();
      return data;
    } catch (err) {
      showError(box, err);
      return null;
    } finally {
      button.disabled = false;
    }
  }

  function field(label, input) {
    return el('div', { class: 'field' }, el('label', { for: input.id, text: label }), input);
  }

  function detailsFields(p = {}) {
    const name = el('input', { class: 'input', id: 'fName', value: p.name || '', autocomplete: 'off', maxlength: '100' });
    const phone = el('input', { class: 'input', id: 'fPhone', type: 'tel', value: p.phone || '', placeholder: '012-345 6789', maxlength: '30' });
    const source = el('select', { class: 'input', id: 'fSource' }, el('option', { value: '' }, 'Choose…'),
      SOURCES.map((s) => el('option', { value: s, selected: p.source === s }, s)));
    const note = el('textarea', { class: 'input vb-note', id: 'fNote', rows: '3', maxlength: '1000' }, p.note || '');
    return { name, phone, source, note, nodes: [field('Name', name), field('Phone', phone), field('Where you met', source), field('Note', note)] };
  }

  function openAdd() {
    const f = detailsFields();
    const box = errorBox();
    const btn = el('button', { class: 'btn btn--primary btn--block', type: 'submit' }, 'Add to VB1');
    const form = el('form', { class: 'vb-form', novalidate: true }, f.nodes, box, btn);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = await save('/admin/vb', 'POST', { name: f.name.value, phone: f.phone.value, source: f.source.value, note: f.note.value }, btn, box);
      if (data) openDetail(data.prospect.id);
    });
    openDrawer('Add a name', 'Only you can see the names you add.', [form]);
    f.name.focus();
  }

  function openDetail(id) {
    const p = state.prospects.find((x) => x.id === id);
    if (!p) return;
    state.openId = id;
    renderDetail(p);
  }

  // Quotation & story presentation, made in the Quotation Generator and saved back here.
  function quoteSection(p) {
    const wa = waNumber(p.phone);
    const first = p.name.split(/\s+/)[0];
    const share = p.storyUrl || p.quoteUrl;
    const answers = el('div', { class: 'vb-answers' });
    const section = el('section', { class: 'cust-section' },
      el('h3', { class: 'label', text: 'Quotation & presentation' }),
      p.quotedAt
        ? el('p', { class: 'sub', text: [p.quotedProduct, p.quotedMonthly ? `RM${number(p.quotedMonthly)}/month` : '', `updated ${dateMY(p.quotedAt)}`].filter(Boolean).join(' · ') })
        : el('p', { class: 'sub', text: 'Upload their PRU Mobility quotation to make the client quotation and the animated story presentation. The links save here.' }),
      el('div', { class: 'vb-actions' },
        el('a', { class: `btn${p.stage === 3 ? ' btn--primary' : ''}`, href: quotationToolUrl(p.id) }, iconEl('file', 20), p.quotedAt ? 'New quotation' : 'Make quotation'),
        p.storyUrl ? el('a', { class: 'btn', href: p.storyUrl, target: '_blank', rel: 'noopener' }, 'Story presentation') : null,
        p.quoteUrl ? el('a', { class: 'btn', href: p.quoteUrl, target: '_blank', rel: 'noopener' }, 'Quotation') : null,
        share && wa ? el('a', { class: 'btn', target: '_blank', rel: 'noopener',
          href: `https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${first}, here is your takaful plan${p.storyUrl ? ' presentation' : ' quotation'}: ${share}`)}` }, 'Send on WhatsApp') : null),
      answers);
    if (p.storyUrl) loadAnswers(p, answers);
    return section;
  }

  // What the client tapped in their story presentation (Send my answers).
  async function loadAnswers(p, box) {
    try {
      const { answers } = await call('/admin/presentation-answers');
      const mine = answers.filter((a) => a.vbId === p.id);
      if (!mine.length) {
        box.replaceChildren(el('p', { class: 'sub', text: 'Their answers appear here when they tap Send at the end of the story presentation.' }));
        return;
      }
      const a = mine[0];
      box.replaceChildren(
        el('p', { class: 'sub', text: `What they chose · ${formatDateTime(a.createdAt)}${mine.length > 1 ? ` · ${mine.length} sends` : ''}` }),
        el('ul', { class: 'vb-answer-lines' }, (a.summary.length ? a.summary : Object.entries(a.answers).map(([k, v]) => `${k}: ${[].concat(v).join(', ')}`)).map((t) => el('li', { text: t }))));
    } catch (err) {
      if (err.status === 401) return;
      box.replaceChildren(el('p', { class: 'sub', text: 'Could not load their answers.' }));
    }
  }

  function renderDetail(p) {
    const path = `/admin/vb/${p.id}`;
    const sections = [];

    // Reach out: calling or messaging logs VB2 automatically.
    const contactBox = errorBox();
    const logContacted = () => { if (p.stage < 2) call(path, { method: 'PATCH', body: { action: 'contacted' } }).then(load).catch((err) => showError(contactBox, err)); };
    const wa = waNumber(p.phone);
    const markBtn = el('button', { class: 'btn btn--ghost', type: 'button' }, 'Mark contacted');
    markBtn.addEventListener('click', () => save(path, 'PATCH', { action: 'contacted' }, markBtn, contactBox));
    sections.push(el('section', { class: 'cust-section' },
      el('h3', { class: 'label', text: 'Reach out' }),
      el('div', { class: 'vb-actions' },
        wa ? el('a', { class: 'btn btn--wa', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener', onclick: logContacted }, iconEl('chat', 20), 'WhatsApp') : null,
        p.phone ? el('a', { class: 'btn', href: `tel:${p.phone.replace(/[^\d+]/g, '')}`, onclick: logContacted }, iconEl('phone', 20), 'Call') : null,
        p.stage < 2 ? markBtn : el('span', { class: 'saved', text: `Contacted ${formatDateTime(p.contactedAt)}` })),
      p.phone ? null : el('p', { class: 'sub', text: 'Add a phone number below to call or WhatsApp from here.' }),
      contactBox));

    sections.push(quoteSection(p));

    // Appointment (VB3).
    if (p.stage < 4) {
      const at = el('input', { class: 'input', id: 'fAt', type: 'datetime-local', value: localInputValue(p.appointmentAt) });
      const box = errorBox();
      const btn = el('button', { class: `btn${p.stage <= 2 ? ' btn--primary' : ''}`, type: 'button' }, iconEl('cal', 20), p.appointmentAt ? 'Change appointment' : 'Set appointment');
      btn.addEventListener('click', () => {
        if (!at.value) return showError(box, new Error('Please choose the appointment date and time.'));
        save(path, 'PATCH', { action: 'appointment', at: fromLocalInput(at.value) }, btn, box);
      });
      sections.push(el('section', { class: 'cust-section' }, el('h3', { class: 'label', text: 'Appointment' }), field('Date and time', at), box, el('div', { class: 'vb-actions' }, btn)));
    }

    // Policy approved (VB4): keyed in by the agent once Prudential approves it.
    {
      // Until approved, start from the latest quotation's product and monthly contribution.
      const product = el('input', { class: 'input', id: 'fProduct', value: p.product || p.quotedProduct || '', placeholder: 'e.g. PRUBSN Protect', maxlength: '100' });
      const premium = el('input', { class: 'input', id: 'fPremium', type: 'number', inputmode: 'decimal', min: '0', step: '0.01', value: p.premium ?? p.quotedMonthly ?? '' });
      const frequency = el('select', { class: 'input', id: 'fFrequency' }, Object.keys(PAYMENTS_PER_YEAR).map((f) => el('option', { value: f, selected: (p.frequency || 'Monthly') === f }, f)));
      const preview = el('div', { class: 'vb-tpc', role: 'status' });
      const update = () => {
        const tpc = tpcOf(premium.value, frequency.value);
        preview.textContent = tpc > 0 ? `TPC ${number(tpc)} · counts as ${casesOf(tpc)} case` : 'TPC = premium × payments per year';
      };
      premium.addEventListener('input', update);
      frequency.addEventListener('change', update);
      update();
      const box = errorBox();
      const btn = el('button', { class: 'btn', type: 'button' }, iconEl('check', 20), p.stage === 4 ? 'Update policy' : 'Mark policy approved');
      btn.addEventListener('click', () => save(path, 'PATCH', { action: 'approved', product: product.value, premium: Number(premium.value), frequency: frequency.value }, btn, box));
      sections.push(el('section', { class: 'cust-section' },
        el('h3', { class: 'label', text: p.stage === 4 ? `Policy approved ${dateMY(p.approvedAt)}` : 'Policy approved' }),
        p.stage === 4 ? null : el('p', { class: 'sub', text: 'Only once Prudential has approved the policy. TPC of 1,800 or more counts as 1 case; below that, 0.5.' }),
        el('div', { class: 'vb-grid' }, field('Product', product), field('Premium (RM)', premium), field('Paid', frequency)),
        preview, box, el('div', { class: 'vb-actions' }, btn)));
    }

    // Edit / delete.
    {
      const f = detailsFields(p);
      const box = errorBox();
      const btn = el('button', { class: 'btn', type: 'button' }, 'Save details');
      btn.addEventListener('click', () => save(path, 'PATCH', { action: 'edit', name: f.name.value, phone: f.phone.value, source: f.source.value, note: f.note.value }, btn, box));
      const del = el('button', { class: 'btn btn--danger', type: 'button' }, iconEl('trash', 20), 'Remove this name');
      del.addEventListener('click', async () => {
        const ok = await confirmAction({ title: `Remove ${p.name}?`, message: 'They leave your VB list, with their notes and appointment. It can’t be undone.', confirmLabel: 'Remove name' });
        if (!ok) return;
        if (await save(path, 'DELETE', undefined, del, box)) { closeDrawer(); showToast(`Removed ${p.name}`); }
      });
      sections.push(el('section', { class: 'cust-section vb-form' }, el('h3', { class: 'label', text: 'Details' }), f.nodes, box, el('div', { class: 'vb-actions' }, btn, del)));
    }

    openDrawer(p.name, `VB${p.stage} · ${STAGES[p.stage]} · added ${dateMY(p.createdAt)}`, sections);
  }

  // ---------- Wire up ----------

  $('addBtn').replaceChildren(iconEl('useradd', 20), 'Add name');
  $('addBtn').addEventListener('click', openAdd);
  $('searchIcon').replaceWith(iconEl('search', 18));
  $('closeDrawer').replaceChildren(iconEl('x', 22));
  enableSwipeClose($('drawer'), closeDrawer);
  $('search').addEventListener('input', (e) => { state.query = e.target.value.trim(); renderRows(); });
  $('closeDrawer').addEventListener('click', closeDrawer);
  $('scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('drawer').hidden) closeDrawer(); });

  // vb.html#open=<id> (from the Appointments calendar) opens that name straight away.
  load().then(() => {
    const m = /^#open=([0-9a-f-]{36})$/.exec(location.hash);
    if (m) {
      history.replaceState(null, '', location.pathname);
      openDetail(m[1]);
    }
  });
})();
