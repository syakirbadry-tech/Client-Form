// Introduction (P-16a–d): shown once after the first sign-in, and again from More › Help & introduction.
// Skippable at every step; Back on steps 2–4. Step 4 adds a real VB name (existing API).
(function () {
  const session = Session.get();
  if (!session) {
    location.replace('./');
    return;
  }
  const $ = (id) => document.getElementById(id);
  const me = Session.user(session);
  const DONE_KEY = `asg-intro-done:${String(me.email || session.username || 'me').toLowerCase()}`;
  const SOURCES = ['Family & friends', 'Referral', 'Social media', 'Walk-in', 'Event', 'Other'];
  const FORM_URL = new URL('../client-detail-form.html', location.href).href;
  const full = String(me.name || '').trim();
  const first = (full.split(/\s+/)[0] || '') + (/\(demo\)/.test(full) ? ' (demo)' : '');
  let step = 1;

  function finish() {
    try { localStorage.setItem(DONE_KEY, '1'); } catch (e) { /* ignore */ }
    location.replace('home.html');
  }

  function go(n) {
    step = n;
    for (let i = 1; i <= 4; i++) $(`step${i}`).hidden = i !== n;
    [...$('dots').children].forEach((d, i) => { if (i === n - 1) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
    $('backBtn').hidden = n === 1;
    $('stepLabel').textContent = `Step ${n} of 4`;
    const h = $(`step${n}`).querySelector('h1');
    if (h) h.focus();
    window.scrollTo(0, 0);
  }

  const title = (text) => el('h1', { class: 'intro__title', tabindex: '-1', text });
  const lead = (text) => el('p', { class: 'intro__lead', text });
  const actions = (...nodes) => el('div', { class: 'intro__actions' }, ...nodes);

  // 1 · Welcome
  $('step1').replaceChildren(
    el('img', { class: 'intro__mark', src: 'asg-mark.svg', alt: '', width: '76', height: '66' }),
    el('div', { class: 'label intro__eyebrow', text: first ? `Welcome to ASG, ${first}` : 'Welcome to ASG' }),
    title('Your clients, your pipeline, your day: in one place.'),
    el('ul', { class: 'intro__list' },
      [['bell', 'Get told when a client sends a form'], ['link', 'Share your own client form link'], ['useradd', 'Add your first VB name']]
        .map(([icon, text]) => el('li', {}, el('span', { class: 'li__icon' }, iconEl(icon, 20)), text))),
    actions(el('button', { class: 'btn btn--primary btn--lg btn--block', type: 'button', onclick: () => go(2) }, 'Let’s set up · 1 min')));

  // 2 · Alerts + Home Screen
  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  $('step2').replaceChildren(
    title('Never miss a new form'),
    lead('The bell tells you when a client sends a form, when you have appointments today and when a name needs a follow-up. One alert per event.'),
    el('div', { class: 'card card--pad intro__sample', 'aria-hidden': 'true' },
      el('img', { src: 'asg-mark.svg', alt: '', width: '28', height: '25' }),
      el('div', { class: 'li__main' }, el('b', { text: 'ASG Portal' }), el('div', { class: 'sub', text: 'New form from Aisyah (demo) · AnugerahMax 200' }))),
    installed ? null : el('div', { class: 'card card--pad intro__how' },
      el('b', { text: iphone ? 'On iPhone, add the app first' : 'Add the app to your Home Screen' }),
      el('p', { class: 'sub', text: 'It opens full screen, like an app, straight from your Home Screen.' }),
      el('ol', { class: 'intro__steps' },
        (iphone ? ['Tap Share in Safari', 'Choose Add to Home Screen', 'Open ASG from your Home Screen'] : ['Open the browser menu', 'Choose Install app or Add to Home Screen', 'Open ASG from your Home Screen'])
          .map((t, i) => el('li', {}, el('span', { class: 'intro__num', text: String(i + 1) }), t)))),
    actions(el('button', { class: 'btn btn--primary btn--lg btn--block', type: 'button', onclick: () => go(3) }, iconEl('bell', 20), 'Got it')));

  // 3 · Form link
  const link = me.role === 'owner' ? FORM_URL : (me.formCode ? `${FORM_URL}?agent=${encodeURIComponent(me.formCode)}` : '');
  const copied = el('div', { class: 'cust-saved', role: 'status' });
  const copyBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Copy link' }, iconEl('copy', 20));
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(link); } catch (e) {
      const t = el('textarea', {}, link); document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
    }
    copied.replaceChildren(iconEl('check', 16), 'Copied');
  });
  const message = `Assalamualaikum / Hi, please fill in your details for your Takaful application here:\n${link}`;
  $('step3').replaceChildren(
    title('This link is yours'),
    lead('Clients who fill in the form through it land in your Customers list, tagged to you.'),
    link ? el('div', { class: 'card card--pad' },
      el('div', { class: 'label', text: 'Your client form link' }),
      el('div', { class: 'intro__link' }, el('code', { text: link }), copyBtn), copied)
      : el('p', { class: 'alert', text: 'Sign out and sign in again to see your personal form link.' }),
    actions(
      link ? el('a', { class: 'btn btn--wa btn--lg btn--block', href: `https://wa.me/?text=${encodeURIComponent(message)}`, target: '_blank', rel: 'noopener' }, iconEl('chat', 20), 'Share on WhatsApp') : null,
      el('button', { class: 'btn btn--ghost btn--block', type: 'button', onclick: () => go(4) }, 'Next')));

  // 4 · First VB name (real POST /admin/vb)
  const name = el('input', { class: 'input', id: 'introName', autocomplete: 'off', maxlength: '100' });
  const phone = el('input', { class: 'input', id: 'introPhone', type: 'tel', placeholder: '012-345 6789', maxlength: '30' });
  let source = '';
  const chips = el('div', { class: 'intro__chips', role: 'radiogroup', 'aria-label': 'How you know them' });
  const drawChips = () => chips.replaceChildren(...SOURCES.map((s) => el('button', { class: 'chip', type: 'button', role: 'radio', 'aria-checked': String(s === source), 'aria-pressed': String(s === source), onclick: () => { source = s === source ? '' : s; drawChips(); } }, s)));
  drawChips();
  const err = el('div', { class: 'field__error', role: 'alert', hidden: true });
  const addBtn = el('button', { class: 'btn btn--primary btn--lg btn--block', type: 'submit' }, el('span', { class: 'btn__label', text: 'Add and finish' }));
  const form = el('form', { class: 'card card--pad intro__form', novalidate: true },
    el('div', { class: 'field' }, el('label', { for: 'introName', text: 'Name' }), name),
    el('div', { class: 'field' }, el('label', { for: 'introPhone', text: 'Phone' }), phone),
    el('div', { class: 'field' }, el('span', { class: 'label', text: 'How you know them' }), chips),
    err, addBtn);
  name.addEventListener('input', () => { err.hidden = true; name.removeAttribute('aria-invalid'); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (addBtn.dataset.state === 'busy') return;
    if (!name.value.trim()) { err.textContent = 'Please enter a name.'; err.hidden = false; name.setAttribute('aria-invalid', 'true'); name.focus(); return; }
    err.hidden = true;
    name.removeAttribute('aria-invalid');
    addBtn.dataset.state = 'busy';
    addBtn.querySelector('.btn__label').textContent = 'Adding…';
    try {
      await api('/admin/vb', { method: 'POST', body: { name: name.value, phone: phone.value, source, note: '' } });
      addBtn.dataset.state = 'done';
      addBtn.querySelector('.btn__label').replaceChildren(iconEl('check', 20), 'Added to VB1');
      setTimeout(finish, 700);
    } catch (ex) {
      delete addBtn.dataset.state;
      addBtn.querySelector('.btn__label').textContent = 'Add and finish';
      err.textContent = ex.message;
      err.hidden = false;
      addBtn.dataset.state = 'failed';
      setTimeout(() => { if (addBtn.dataset.state === 'failed') delete addBtn.dataset.state; }, 400);
    }
  });
  $('step4').replaceChildren(
    title('Add your first name'),
    lead('Someone you’ll talk to this week. They become VB1 in your pipeline. Only you can see the names you add.'),
    form,
    actions(el('button', { class: 'btn btn--ghost btn--block', type: 'button', onclick: finish }, 'Not now')));

  $('backBtn').replaceChildren(iconEl('back', 20), 'Back');
  $('backBtn').addEventListener('click', () => go(Math.max(1, step - 1)));
  $('skipBtn').addEventListener('click', finish);
  go(1);
})();
