(function () {
  if (Session.get()) {
    location.replace('dashboard.html');
    return;
  }

  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('loginError');
  const button = document.getElementById('loginBtn');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  try {
    const notice = sessionStorage.getItem('prubsn-admin-notice');
    if (notice) {
      sessionStorage.removeItem('prubsn-admin-notice');
      showError(notice);
    }
  } catch (e) { /* ignore */ }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;
    if (!username || !password) {
      showError('Please enter your username and password.');
      return;
    }

    errorBox.hidden = true;
    button.disabled = true;
    button.textContent = 'Signing in…';
    try {
      const data = await api('/admin/login', { method: 'POST', body: { username, password }, auth: false });
      Session.set({ token: data.token, expiresAt: data.expiresAt, username });
      location.replace('dashboard.html');
    } catch (err) {
      form.password.value = '';
      showError(err.message);
      button.disabled = false;
      button.textContent = 'Sign in';
      form.password.focus();
    }
  });
})();
