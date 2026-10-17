// Generates ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET in the browser, in the same
// format as quotation-generator/backend/scripts/hash-password.mjs, for setup without a computer.
(function () {
  // 100000 is the highest PBKDF2 iteration count Cloudflare Workers allows.
  const ITERATIONS = 100000;

  const form = document.getElementById('setupForm');
  const errorBox = document.getElementById('setupError');
  const button = document.getElementById('setupBtn');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
  const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
    return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = form.password.value;
    if (password.length < 8) return showError('Use at least 8 characters.');
    if (password !== form.confirm.value) return showError('The two passwords do not match.');
    if (!window.crypto || !crypto.subtle) return showError('This browser cannot do this. Try Safari or Chrome.');

    showError('');
    button.disabled = true;
    button.textContent = 'Working…';
    try {
      document.getElementById('hashOut').value = await hashPassword(password);
      document.getElementById('secretOut').value = hex(crypto.getRandomValues(new Uint8Array(32)));
      document.getElementById('results').hidden = false;
      form.password.value = '';
      form.confirm.value = '';
    } catch (err) {
      showError('Could not generate the values. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = 'Generate values';
    }
  });

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const box = document.getElementById(btn.dataset.copy);
      try {
        await navigator.clipboard.writeText(box.value);
      } catch (e) {
        box.select();
        document.execCommand('copy');
      }
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  });
})();
