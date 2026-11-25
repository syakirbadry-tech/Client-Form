(function () {
  if (Session.get()) {
    location.replace('home.html');
    return;
  }

  const MIN_PASSWORD_LENGTH = 8;
  // Where a correct sign-in lands.
  const AFTER_SIGN_IN = 'home.html';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const page = document.getElementById('signin');
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('loginError');
  const button = document.getElementById('loginBtn');
  const setupForm = document.getElementById('setupForm');
  const setupError = document.getElementById('setupError');
  const setupBtn = document.getElementById('setupBtn');
  const capsHint = document.getElementById('capsHint');
  // The temporary password, kept only in memory while they choose a new one.
  let pending = null;

  function showError(box, message) {
    box.textContent = message;
    box.hidden = false;
  }

  // One feedback language: busy (gold-edged spinner) → done (green tick) / failed (shake).
  function setButton(btn, state, label, icon) {
    if (state) btn.dataset.state = state;
    else delete btn.dataset.state;
    btn.setAttribute('aria-busy', state === 'busy' ? 'true' : 'false');
    btn.querySelector('.btn__label').replaceChildren(...(icon ? [iconEl(icon, 20)] : []), label);
  }
  function fail(btn, label) {
    setButton(btn, null, label);
    void btn.offsetWidth; // restart the shake if it just ran
    btn.dataset.state = 'failed';
    setTimeout(() => { if (btn.dataset.state === 'failed') delete btn.dataset.state; }, 400);
  }

  function startSession(data, username, btn, firstTime) {
    Session.set({ token: data.token, expiresAt: data.expiresAt, username, user: data.user || null });
    const first = String((data.user && data.user.name) || '').trim().split(/\s+/)[0];
    setButton(btn, 'done', first ? `Welcome back, ${first}` : 'Signed in', 'check');
    setTimeout(() => page.classList.add('is-leaving'), reduceMotion ? 150 : 700);
    // First sign-in (just chose a password) → the introduction; otherwise Home.
    setTimeout(() => location.replace(firstTime ? 'intro.html' : AFTER_SIGN_IN), reduceMotion ? 300 : 1050);
  }

  let notice = '';
  try {
    notice = sessionStorage.getItem('prubsn-admin-notice') || '';
    if (notice) {
      sessionStorage.removeItem('prubsn-admin-notice');
      showError(errorBox, notice);
    }
  } catch (e) { /* ignore */ }

  // The start animation plays once per tab, not when coming back with a message (e.g. session ended).
  ASGSplash.start({ skip: Boolean(notice) });

  // Caps Lock hint on the password boxes.
  capsHint.replaceChildren(iconEl('capslock', 16), 'Caps Lock is on');
  const caps = (e) => { if (e.getModifierState) capsHint.hidden = !e.getModifierState('CapsLock'); };
  form.password.addEventListener('keydown', caps);
  form.password.addEventListener('keyup', caps);
  form.password.addEventListener('blur', () => { capsHint.hidden = true; });

  function showChoosePassword(on) {
    form.hidden = on;
    setupForm.hidden = !on;
    setupError.hidden = true;
    document.getElementById('signinLead').textContent = on ? 'One more step' : 'Sign in to the Agent Portal';
    if (on) {
      setupForm.email.value = pending.username;
      setupForm.password.focus();
    } else {
      pending = null;
      setupForm.reset();
      form.password.focus();
    }
  }
  document.getElementById('showLogin').addEventListener('click', () => showChoosePassword(false));

  const working = (btn) => btn.dataset.state === 'busy' || btn.dataset.state === 'done';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (working(button)) return;
    const username = form.username.value.trim();
    const password = form.password.value;
    form.username.removeAttribute('aria-invalid');
    form.password.removeAttribute('aria-invalid');
    if (!username || !password) {
      if (!username) form.username.setAttribute('aria-invalid', 'true');
      if (!password) form.password.setAttribute('aria-invalid', 'true');
      showError(errorBox, 'Please enter your email and password.');
      fail(button, 'Sign in');
      return;
    }

    errorBox.hidden = true;
    setButton(button, 'busy', 'Signing in…');
    try {
      const data = await api('/admin/login', { method: 'POST', body: { username, password }, auth: false });
      startSession(data, username, button);
    } catch (err) {
      form.password.value = '';
      if (err.code === 'password_change_required') {
        setButton(button, null, 'Sign in');
        pending = { username, code: password };
        showChoosePassword(true);
        return;
      }
      form.password.setAttribute('aria-invalid', 'true');
      showError(errorBox, err.message);
      fail(button, 'Sign in');
      form.password.focus();
    }
  });

  setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (working(setupBtn)) return;
    const password = setupForm.password.value;
    if (password.length < MIN_PASSWORD_LENGTH) {
      showError(setupError, `Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      fail(setupBtn, 'Save password and sign in');
      return;
    }
    if (password !== setupForm.password2.value) {
      showError(setupError, 'The two passwords do not match.');
      fail(setupBtn, 'Save password and sign in');
      return;
    }

    setupError.hidden = true;
    setButton(setupBtn, 'busy', 'Saving…');
    try {
      const data = await api('/admin/set-password', { method: 'POST', body: { username: pending.username, code: pending.code, password }, auth: false });
      startSession(data, pending.username, setupBtn, true);
    } catch (err) {
      showError(setupError, err.message);
      fail(setupBtn, 'Save password and sign in');
    }
  });
})();
