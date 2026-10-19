(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }

  const $ = (id) => document.getElementById(id);
  mountPortalNav('presentation', session);
  const me = Session.user(session);

  // Financial check lines (monthly RM). Income first; the rest are commitments.
  const MONEY = [
    ['income', 'Take-home income'],
    ['housing', 'House loan / rent'],
    ['car', 'Car loan'],
    ['personal', 'Personal loan / PTPTN'],
    ['cards', 'Credit cards'],
    ['insurance', 'Existing insurance / takaful'],
    ['living', 'Household & living costs'],
  ];
  const BUDGET_SHARE = 0.10; // common rule of thumb: 10% of income towards protection
  const HIGH_COMMITMENT = 0.6; // loans + bills above 60% of income leaves little room
  const CHECKS = [
    'Quotation prepared in PRUServe / Mobility',
    'Financial check filled in',
    'Plan and benefits entered above',
    'Client reminded to bring IC',
  ];
  const PEN_COLOURS = [['#FFFFFF', 'White'], ['#F5C542', 'Yellow'], ['#5FD3C6', 'Teal'], ['#FF6B6B', 'Red']];
  // The prep is kept for this browser tab only (closing the tab clears it): it can hold a client's finances.
  const PREP_KEY = 'prubsn-presentation-prep';

  const state = { prospects: [], money: {}, answers: { coverage: '', coverageNote: '', concern: '' }, slide: 0, strokes: {}, pen: false, colour: PEN_COLOURS[0][0], erase: false, blank: false };

  function signOut(message) {
    Session.clear();
    if (message) {
      try { sessionStorage.setItem('prubsn-admin-notice', message); } catch (e) { /* ignore */ }
    }
    location.replace('./');
  }

  setTimeout(() => signOut('Your session has expired. Please sign in again.'), Math.max(0, session.expiresAt * 1000 - Date.now()));

  const rm = (n) => `RM ${Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const num = (v) => Math.max(0, Number(v) || 0);

  // ---------- Prep form ----------

  function clientName() {
    const typed = $('walkin').value.trim();
    if (typed) return typed;
    const p = state.prospects.find((x) => x.id === $('client').value);
    return p ? p.name : '';
  }

  function finances() {
    const m = state.money;
    const income = num(m.income);
    const committed = MONEY.slice(1).reduce((sum, [k]) => sum + num(m[k]), 0);
    const left = income - committed;
    const guide = income * BUDGET_SHARE;
    return { income, committed, left, guide, budget: Math.max(0, Math.min(guide, left)), ratio: income ? committed / income : 0 };
  }

  function renderMoneyResult() {
    const f = finances();
    if (!f.income) {
      $('moneyResult').replaceChildren(el('span', { class: 'sub', text: 'Enter the take-home income to see the result.' }));
      return;
    }
    const warn = f.ratio > HIGH_COMMITMENT;
    $('moneyResult').replaceChildren(
      el('div', {}, el('span', { class: 'sub', text: 'Commitments' }), el('b', { text: `${rm(f.committed)} (${Math.round(f.ratio * 100)}%)` })),
      el('div', {}, el('span', { class: 'sub', text: 'Left each month' }), el('b', { class: f.left < 0 ? 'pres-neg' : '', text: rm(f.left) })),
      el('div', {}, el('span', { class: 'sub', text: 'Comfortable for protection' }), el('b', { class: 'pres-good', text: rm(f.budget) })),
      warn ? el('p', { class: 'pres-warn', text: 'Commitments are over 60% of income. Keep the new contribution small, or review existing commitments first.' }) : null
    );
  }

  function savePrep() {
    const prep = {
      client: $('client').value, walkin: $('walkin').value, money: state.money,
      planName: $('planName').value, planAmount: $('planAmount').value, planPoints: $('planPoints').value,
      checks: [...document.querySelectorAll('#checks input')].map((c) => c.checked),
    };
    try { sessionStorage.setItem(PREP_KEY, JSON.stringify(prep)); } catch (e) { /* ignore */ }
  }

  function restorePrep() {
    let prep = null;
    try { prep = JSON.parse(sessionStorage.getItem(PREP_KEY) || 'null'); } catch (e) { /* ignore */ }
    return prep || {};
  }

  function buildPrep() {
    const prep = restorePrep();
    state.money = prep.money || {};
    $('money').replaceChildren(...MONEY.map(([key, label]) => {
      const input = el('input', { class: 'input', id: `m_${key}`, type: 'number', inputmode: 'decimal', min: '0', step: '1', value: state.money[key] ?? '' });
      input.addEventListener('input', () => { state.money[key] = input.value; renderMoneyResult(); savePrep(); });
      return el('div', { class: 'field' }, el('label', { for: input.id, text: label }), input);
    }));
    renderMoneyResult();
    $('checks').replaceChildren(...CHECKS.map((text, i) => el('li', {}, el('label', {},
      el('input', { type: 'checkbox', checked: Boolean(prep.checks && prep.checks[i]), onchange: savePrep }), ' ', text))));
    $('walkin').value = prep.walkin || '';
    $('planName').value = prep.planName || '';
    $('planAmount').value = prep.planAmount || '';
    $('planPoints').value = prep.planPoints || '';
    for (const id of ['walkin', 'planName', 'planAmount', 'planPoints']) $(id).addEventListener('input', savePrep);
    $('client').addEventListener('change', savePrep);
    return prep;
  }

  async function loadClients(prep) {
    const select = $('client');
    select.replaceChildren(el('option', { value: '' }, 'Loading your VB list…'));
    try {
      const { prospects } = await api('/admin/vb');
      state.prospects = prospects.slice().sort((a, b) => (b.appointmentAt || '').localeCompare(a.appointmentAt || '') || a.name.localeCompare(b.name));
      select.replaceChildren(el('option', { value: '' }, state.prospects.length ? 'Choose from your VB list…' : 'No names in VB yet'),
        ...state.prospects.map((p) => el('option', { value: p.id, selected: p.id === prep.client }, `${p.name} · VB${p.stage}${p.appointmentAt ? ` · ${formatDateTime(p.appointmentAt)}` : ''}`)));
    } catch (err) {
      if (err.status === 401) return signOut(err.message);
      select.replaceChildren(el('option', { value: '' }, 'Could not load VB names'));
    }
    $('lastUpdated').textContent = 'Prepare, then present full screen';
  }

  // ---------- Slides ----------

  function slides() {
    const name = clientName() || 'you';
    const f = finances();
    const points = $('planPoints').value.split('\n').map((s) => s.trim()).filter(Boolean);
    const today = new Date().toLocaleDateString('en-MY', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
    const answerBtn = (key, value) => el('button', {
      class: 'pres-answer', type: 'button', 'aria-pressed': String(state.answers[key] === value),
      onclick: () => { state.answers[key] = value; showSlide(); }
    }, value);
    const noteBox = (key, placeholder) => {
      const t = el('textarea', { class: 'pres-note', rows: '3', placeholder, maxlength: '300' }, state.answers[key]);
      t.addEventListener('input', () => { state.answers[key] = t.value; });
      return t;
    };

    return [
      () => el('div', { class: 'pres-cover' },
        el('img', { src: 'img/asg-ansar-logo.jpg', alt: '', class: 'pres-logo' }),
        el('div', { class: 'pres-kicker', text: 'Protection plan' }),
        el('h1', { text: clientName() ? `Prepared for ${name}` : 'Your protection plan' }),
        el('p', { text: `${me.name || session.username} · ASG Ansar Group · ${today}` })),
      () => el('div', {},
        el('div', { class: 'pres-kicker', text: 'Why protection matters' }),
        el('h1', { text: 'What could stop your income?' }),
        el('div', { class: 'pres-cards' },
          [['🏥', 'Hospital bills', 'Medical costs rise every year, and one stay can wipe out savings.'],
            ['🎗️', 'Critical illness', 'Cancer, heart attack or stroke: months off work while bills continue.'],
            ['🛡️', 'Death or disability', 'Who would keep paying the house, the car and the children\'s school?'],
            ['👨‍👩‍👧', 'Your family\'s plans', 'Protection keeps their plans going, whatever happens to you.']]
            .map(([icon, title, text]) => el('div', { class: 'pres-card' }, el('div', { class: 'pres-icon', text: icon }), el('h3', { text: title }), el('p', { text }))))),
      () => el('div', {},
        el('div', { class: 'pres-kicker', text: 'Let\'s talk' }),
        el('h1', { text: 'Do you already have any protection?' }),
        el('div', { class: 'pres-answers' }, ['Yes', 'No', 'Not sure'].map((v) => answerBtn('coverage', v))),
        noteBox('coverageNote', 'Which company, what type, how much? (agent notes)'),
        el('h2', { class: 'pres-q2', text: 'What worries you most?' }),
        el('div', { class: 'pres-answers' }, ['Medical bills', 'Income if I fall sick', 'My family\'s future', 'Savings'].map((v) => answerBtn('concern', v)))),
      () => el('div', {},
        el('div', { class: 'pres-kicker', text: 'Your numbers' }),
        el('h1', { text: 'What you can comfortably set aside' }),
        f.income
          ? el('div', { class: 'pres-bars' },
            bar('Income', f.income, f.income, 'income'),
            bar('Commitments', f.committed, f.income, 'committed'),
            bar('Left each month', Math.max(0, f.left), f.income, 'left'),
            bar('Comfortable for protection', f.budget, f.income, 'budget'),
            el('p', { class: 'pres-small', text: `Guide: about ${Math.round(BUDGET_SHARE * 100)}% of income, never more than what is left after commitments.` }))
          : el('p', { class: 'pres-small', text: 'Fill in the financial check on the prep page to show this slide.' })),
      () => el('div', {},
        el('div', { class: 'pres-kicker', text: 'Recommended for you' }),
        el('h1', { text: $('planName').value || 'Your plan' }),
        $('planAmount').value ? el('div', { class: 'pres-price' }, el('b', { text: rm($('planAmount').value) }), el('span', { text: ' / month' })) : null,
        points.length ? el('ul', { class: 'pres-points' }, points.map((p) => el('li', { text: p }))) : el('p', { class: 'pres-small', text: 'Add the key benefits on the prep page.' }),
        f.budget && $('planAmount').value ? el('p', { class: 'pres-small', text: num($('planAmount').value) <= f.budget ? '✓ Within the comfortable amount from your numbers.' : 'Above the comfortable amount; we can adjust the cover to fit.' }) : null),
      () => el('div', {},
        el('div', { class: 'pres-kicker', text: 'Next steps' }),
        el('h1', { text: 'Getting started is simple' }),
        el('ol', { class: 'pres-points' },
          el('li', { text: 'Fill in the registration form on your phone (about 10 minutes).' }),
          el('li', { text: 'Photo of your IC, front and back, and a selfie with your IC.' }),
          el('li', { text: 'We submit, and you will be notified once the policy is approved.' })),
        el('p', { class: 'pres-small', text: 'Questions? Ask anytime, we are here to help.' })),
    ];
  }

  function bar(label, value, max, cls) {
    const pct = max ? Math.max(2, Math.round((value / max) * 100)) : 0;
    // Set through the style property: the page's Content-Security-Policy blocks style="" attributes.
    const fill = el('div', { class: `pres-bar-fill ${cls}` });
    fill.style.width = `${pct}%`;
    return el('div', { class: 'pres-bar' },
      el('div', { class: 'pres-bar-label' }, el('span', { text: label }), el('b', { text: rm(value) })),
      el('div', { class: 'pres-bar-track' }, fill));
  }

  function showSlide() {
    const list = state.blank ? [() => el('div')] : slides();
    state.slide = Math.max(0, Math.min(state.slide, list.length - 1));
    $('slide').replaceChildren(list[state.slide]());
    $('slide').classList.toggle('blank', state.blank);
    $('slideCount').textContent = state.blank ? 'Blackboard' : `${state.slide + 1} / ${list.length}`;
    $('prevSlide').disabled = state.blank || state.slide === 0;
    $('nextSlide').disabled = state.blank || state.slide === list.length - 1;
    redraw();
  }

  // ---------- Blackboard ----------

  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  let drawing = null;

  const slideKey = () => (state.blank ? 'blank' : state.slide);
  const strokesHere = () => (state.strokes[slideKey()] = state.strokes[slideKey()] || []);

  function sizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * ratio);
    canvas.height = Math.round(r.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    redraw();
  }

  // Points are stored as fractions of the screen so drawings survive rotating the phone.
  function drawStroke(s) {
    const r = canvas.getBoundingClientRect();
    ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.colour;
    ctx.lineWidth = s.erase ? 28 : 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * r.width, y * r.height) : ctx.moveTo(x * r.width, y * r.height)));
    if (s.points.length === 1) ctx.lineTo(s.points[0][0] * r.width + 0.1, s.points[0][1] * r.height);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  function redraw() {
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    (state.strokes[slideKey()] || []).forEach(drawStroke);
  }

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!state.pen) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = { colour: state.colour, erase: state.erase, points: [point(e)] };
    strokesHere().push(drawing);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    drawing.points.push(point(e));
    redraw();
  });
  const stop = () => { drawing = null; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  function renderTools() {
    $('penBtn').setAttribute('aria-pressed', String(state.pen));
    $('penBtn').textContent = state.pen ? '✋ Stop drawing' : '✏️ Draw';
    canvas.classList.toggle('active', state.pen);
    $('tools').hidden = !state.pen;
    $('tools').replaceChildren(
      ...PEN_COLOURS.map(([c, label]) => {
        const swatch = el('button', {
          class: 'pres-swatch', type: 'button', 'aria-label': label, 'aria-pressed': String(!state.erase && state.colour === c),
          onclick: () => { state.colour = c; state.erase = false; renderTools(); }
        });
        swatch.style.background = c;
        return swatch;
      }),
      el('button', { class: 'pres-btn', type: 'button', 'aria-pressed': String(state.erase), onclick: () => { state.erase = !state.erase; renderTools(); } }, 'Eraser'),
      el('button', { class: 'pres-btn', type: 'button', onclick: () => { state.strokes[slideKey()] = []; redraw(); } }, 'Clear'));
  }

  // ---------- Presenting ----------

  function present(blank) {
    state.blank = blank;
    state.slide = 0;
    state.pen = blank;
    $('stage').hidden = false;
    document.body.classList.add('presenting');
    const fs = $('stage').requestFullscreen && $('stage').requestFullscreen();
    if (fs && fs.catch) fs.catch(() => { /* phones without full-screen support still get the full-window view */ });
    renderTools();
    showSlide();
    requestAnimationFrame(sizeCanvas);
  }

  function summary() {
    const f = finances();
    const a = state.answers;
    const date = new Date().toLocaleDateString('en-MY', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
    return [
      `Presentation ${date}:`,
      a.coverage ? `Existing protection: ${a.coverage}${a.coverageNote ? ` (${a.coverageNote.trim()})` : ''}` : '',
      a.concern ? `Main concern: ${a.concern}` : '',
      f.income ? `Income ${rm(f.income)}, commitments ${rm(f.committed)}, comfortable ${rm(f.budget)}/month` : '',
      $('planName').value ? `Proposed: ${$('planName').value}${$('planAmount').value ? ` ${rm($('planAmount').value)}/month` : ''}` : '',
    ].filter(Boolean).join('\n');
  }

  function end() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    $('stage').hidden = true;
    document.body.classList.remove('presenting');
    const p = state.prospects.find((x) => x.id === $('client').value);
    if (state.blank || !p || $('walkin').value.trim()) return;
    // Offer to keep the client's answers on their VB name.
    const text = summary();
    if (!text.includes('\n')) return;
    const box = el('div', { class: 'alert', role: 'alert', hidden: true });
    const saveBtn = el('button', { class: 'btn btn-primary', type: 'button' }, `Save to ${p.name}'s VB note`);
    const card = el('section', { class: 'panel insight-panel pres-summary' },
      el('h2', { text: 'Presentation notes' }),
      el('pre', { class: 'code-message', text }),
      box,
      el('div', { class: 'forms-actions' }, saveBtn, el('button', { class: 'btn', type: 'button', onclick: () => card.remove() }, 'Dismiss')));
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      try {
        const note = [p.note, text].filter(Boolean).join('\n\n').slice(-1000);
        const { prospect } = await api(`/admin/vb/${p.id}`, { method: 'PATCH', body: { action: 'edit', note } });
        Object.assign(p, prospect);
        card.replaceChildren(el('h2', { text: 'Presentation notes' }), el('p', { class: 'saved', text: `Saved to ${p.name}'s note in VB ✓` }), el('a', { class: 'btn', href: `vb.html#open=${p.id}` }, 'Open in VB'));
      } catch (err) {
        box.textContent = err.message;
        box.hidden = false;
        saveBtn.disabled = false;
      }
    });
    document.querySelector('.pres-summary')?.remove();
    document.querySelector('main').prepend(card);
    card.scrollIntoView({ behavior: 'smooth' });
  }

  $('startBtn').addEventListener('click', () => present(false));
  $('boardBtn').addEventListener('click', () => present(true));
  $('endBtn').addEventListener('click', end);
  $('prevSlide').addEventListener('click', () => { state.slide -= 1; showSlide(); });
  $('nextSlide').addEventListener('click', () => { state.slide += 1; showSlide(); });
  $('penBtn').addEventListener('click', () => { state.pen = !state.pen; renderTools(); });
  window.addEventListener('resize', () => { if (!$('stage').hidden) sizeCanvas(); });
  document.addEventListener('keydown', (e) => {
    if ($('stage').hidden || e.target.closest('textarea, input')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') $('nextSlide').click();
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') $('prevSlide').click();
    else if (e.key === 'Escape') end();
  });
  document.addEventListener('fullscreenchange', () => { if (!$('stage').hidden) requestAnimationFrame(sizeCanvas); });

  loadClients(buildPrep());
})();
