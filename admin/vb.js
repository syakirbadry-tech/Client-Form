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

  // Malaysian numbers for wa.me: 012-345 6789 -> 60123456789.
  function waNumber(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('60')) return d;
    return d.startsWith('0') ? `6${d}` : d;
  }

  // <input type="datetime-local"> value for an ISO time, in Malaysia time.
  function localInputValue(iso) {
    if (!iso) return '';
    const d = new Date(new Date(iso).getTime() + 8 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  }
  const fromLocalInput = (v) => (v ? new Date(`${v}:00+08:00`).toISOString() : '');

  // ---------- Load & render ----------

  async function load() {
    try {
      const data = await call('/admin/vb');
      state.prospects = data.prospects;
      state.week = data.week;
      state.team = data.team;
      $('lastUpdated').textContent = `Week of ${dateMY(data.week.start)}`;
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

  function renderStats() {
    const c = state.week.counts;
    const tile = (cls, label, value, sub) => el('div', { class: `stat ${cls}` },
      el('div', { class: 'stat-label', text: label }), el('div', { class: 'stat-value', text: value }), sub ? el('div', { class: 'sub', text: sub }) : null);
    $('stats').replaceChildren(
      tile('vb1', 'VB1 · new names', c.vb1),
      tile('vb2', 'VB2 · contacted', c.vb2),
      tile('vb3', 'VB3 · appointments', c.vb3),
      tile('vb4', 'VB4 · approved', c.vb4),
      tile('total', 'Cases this week', number(c.cases), `TPC ${number(c.tpc)}`)
    );
  }

  function renderChips() {
    const options = [['All', `All (${state.prospects.length})`], ...Object.entries(STAGES).map(([n, label]) => [n, `VB${n} ${label} (${state.prospects.filter((p) => String(p.stage) === n).length})`])];
    $('chips').replaceChildren(...options.map(([value, label]) => el('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(state.stage === value),
      onclick: () => { state.stage = value; renderChips(); renderRows(); }
    }, label)));
  }

  function nextStep(p) {
    if (p.stage === 4) return `${p.product} · TPC ${number(p.tpc)} · ${p.cases} case`;
    if (p.stage === 3) return `Appointment ${formatDateTime(p.appointmentAt)}`;
    if (p.stage === 2) return 'Next: set an appointment';
    return 'Next: call or WhatsApp';
  }

  function renderRows() {
    const q = state.query.toLowerCase();
    const shown = state.prospects.filter((p) => (state.stage === 'All' || String(p.stage) === state.stage)
      && (!q || p.name.toLowerCase().includes(q) || p.phone.includes(q)));
    $('rows').replaceChildren(...shown.map((p) => el('li', {},
      el('button', { class: 'vb-row', type: 'button', onclick: () => openDetail(p.id) },
        el('span', { class: 'vb-badge', 'data-stage': p.stage, text: `VB${p.stage}` }),
        el('span', { class: 'grow' },
          el('span', { class: 'name', text: p.name }),
          el('span', { class: 'sub', text: [p.phone, p.source].filter(Boolean).join('  ·  ') })),
        el('span', { class: 'sub vb-next', text: nextStep(p) })))));
    $('empty').hidden = shown.length > 0;
    $('empty').textContent = state.prospects.length ? 'No names match.' : 'No names yet. Tap "+ Add name" to start your VB list.';
  }

  function renderTeam() {
    $('teamPanel').hidden = !state.team;
    if (!state.team) return;
    const cell = (v) => el('td', { class: 'right num', text: v });
    $('teamRows').replaceChildren(...(state.team.length ? state.team.map((t) => el('tr', {},
      el('td', { class: 'name', text: t.agent }),
      cell(t.week.vb1), cell(t.week.vb2), cell(t.week.vb3), cell(t.week.vb4), cell(number(t.week.cases)), cell(number(t.week.tpc)),
      cell(`${t.byStage.vb1} / ${t.byStage.vb2} / ${t.byStage.vb3} / ${t.byStage.vb4}`)))
      : [el('tr', {}, el('td', { colspan: '8', class: 'sub', text: 'Nobody has added names yet.' }))]));
  }

  // ---------- Drawer (add name / one name's detail) ----------

  function openDrawer(title, sub, body) {
    $('drawerTitle').textContent = title;
    $('drawerSub').textContent = sub;
    $('drawerBody').replaceChildren(...body);
    $('drawer').hidden = false;
    $('scrim').hidden = false;
  }

  function closeDrawer() {
    state.openId = null;
    $('drawer').hidden = true;
    $('scrim').hidden = true;
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
    const btn = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Add to VB1');
    const form = el('form', { class: 'section vb-form', novalidate: true }, f.nodes, box, btn);
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

  function renderDetail(p) {
    const path = `/admin/vb/${p.id}`;
    const sections = [];

    // Reach out: calling or messaging logs VB2 automatically.
    const contactBox = errorBox();
    const logContacted = () => { if (p.stage < 2) call(path, { method: 'PATCH', body: { action: 'contacted' } }).then(load).catch((err) => showError(contactBox, err)); };
    const wa = waNumber(p.phone);
    const markBtn = el('button', { class: 'btn', type: 'button' }, 'Mark contacted');
    markBtn.addEventListener('click', () => save(path, 'PATCH', { action: 'contacted' }, markBtn, contactBox));
    sections.push(el('section', { class: 'section' },
      el('h3', { text: 'Reach out' }),
      el('div', { class: 'vb-actions' },
        p.phone ? el('a', { class: 'btn btn-primary', href: `tel:${p.phone.replace(/[^\d+]/g, '')}`, onclick: logContacted }, 'Call') : null,
        wa ? el('a', { class: 'btn btn-primary', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener', onclick: logContacted }, 'WhatsApp') : null,
        p.stage < 2 ? markBtn : el('span', { class: 'saved', text: `Contacted ${formatDateTime(p.contactedAt)}` })),
      p.phone ? null : el('p', { class: 'sub', text: 'Add a phone number below to call or WhatsApp from here.' }),
      contactBox));

    // Appointment (VB3).
    if (p.stage < 4) {
      const at = el('input', { class: 'input', id: 'fAt', type: 'datetime-local', value: localInputValue(p.appointmentAt) });
      const box = errorBox();
      const btn = el('button', { class: 'btn btn-primary', type: 'button' }, p.appointmentAt ? 'Change appointment' : 'Set appointment');
      btn.addEventListener('click', () => {
        if (!at.value) return showError(box, new Error('Please choose the appointment date and time.'));
        save(path, 'PATCH', { action: 'appointment', at: fromLocalInput(at.value) }, btn, box);
      });
      sections.push(el('section', { class: 'section' }, el('h3', { text: 'Appointment' }), field('Date and time', at), box, el('div', { class: 'vb-actions' }, btn)));
    }

    // Policy approved (VB4): keyed in by the agent once Prudential approves it.
    {
      const product = el('input', { class: 'input', id: 'fProduct', value: p.product || '', placeholder: 'e.g. PRUBSN Protect', maxlength: '100' });
      const premium = el('input', { class: 'input', id: 'fPremium', type: 'number', inputmode: 'decimal', min: '0', step: '0.01', value: p.premium ?? '' });
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
      const btn = el('button', { class: 'btn btn-gold', type: 'button' }, p.stage === 4 ? 'Update policy' : 'Mark policy approved');
      btn.addEventListener('click', () => save(path, 'PATCH', { action: 'approved', product: product.value, premium: Number(premium.value), frequency: frequency.value }, btn, box));
      sections.push(el('section', { class: 'section' },
        el('h3', { text: p.stage === 4 ? `Policy approved ${dateMY(p.approvedAt)}` : 'Policy approved' }),
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
      const del = el('button', { class: 'link-btn vb-delete', type: 'button' }, 'Remove this name');
      del.addEventListener('click', async () => {
        if (!confirm(`Remove ${p.name} from your VB list?`)) return;
        if (await save(path, 'DELETE', undefined, del, box)) closeDrawer();
      });
      sections.push(el('section', { class: 'section vb-form' }, el('h3', { text: 'Details' }), f.nodes, box, el('div', { class: 'vb-actions' }, btn, del)));
    }

    openDrawer(p.name, `VB${p.stage} · ${STAGES[p.stage]} · added ${dateMY(p.createdAt)}`, sections);
  }

  // ---------- Wire up ----------

  $('addBtn').addEventListener('click', openAdd);
  $('search').addEventListener('input', (e) => { state.query = e.target.value.trim(); renderRows(); });
  $('closeDrawer').addEventListener('click', closeDrawer);
  $('scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('drawer').hidden) closeDrawer(); });

  load();
})();
