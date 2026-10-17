(function () {
  if (Session.get()) {
    location.replace('dashboard.html');
    return;
  }

  const MIN_PASSWORD_LENGTH = 8;
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('loginError');
  const button = document.getElementById('loginBtn');
  const setupForm = document.getElementById('setupForm');
  const setupError = document.getElementById('setupError');
  const setupBtn = document.getElementById('setupBtn');
  // The temporary password, kept only in memory while they choose a new one.
  let pending = null;

  function showError(box, message) {
    box.textContent = message;
    box.hidden = false;
  }

  function startSession(data, username) {
    Session.set({ token: data.token, expiresAt: data.expiresAt, username, user: data.user || null });
    location.replace('dashboard.html');
  }

  try {
    const notice = sessionStorage.getItem('prubsn-admin-notice');
    if (notice) {
      sessionStorage.removeItem('prubsn-admin-notice');
      showError(errorBox, notice);
    }
  } catch (e) { /* ignore */ }

  function showChoosePassword(on) {
    form.hidden = on;
    setupForm.hidden = !on;
    setupError.hidden = true;
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;
    if (!username || !password) {
      showError(errorBox, 'Please enter your email and password.');
      return;
    }

    errorBox.hidden = true;
    button.disabled = true;
    button.textContent = 'Signing in…';
    try {
      const data = await api('/admin/login', { method: 'POST', body: { username, password }, auth: false });
      startSession(data, username);
    } catch (err) {
      form.password.value = '';
      button.disabled = false;
      button.textContent = 'Sign in';
      if (err.code === 'password_change_required') {
        pending = { username, code: password };
        showChoosePassword(true);
        return;
      }
      showError(errorBox, err.message);
      form.password.focus();
    }
  });

  setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = setupForm.password.value;
    if (password.length < MIN_PASSWORD_LENGTH) {
      showError(setupError, `Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== setupForm.password2.value) {
      showError(setupError, 'The two passwords do not match.');
      return;
    }

    setupError.hidden = true;
    setupBtn.disabled = true;
    setupBtn.textContent = 'Saving…';
    try {
      const data = await api('/admin/set-password', { method: 'POST', body: { username: pending.username, code: pending.code, password }, auth: false });
      startSession(data, pending.username);
    } catch (err) {
      showError(setupError, err.message);
      setupBtn.disabled = false;
      setupBtn.textContent = 'Save password and sign in';
    }
  });
})();
