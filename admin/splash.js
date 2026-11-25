// ASG start animation controller (from asg-design/design/splash, adapted for this page).
// Plays once per browser tab, only when signed out. Tap/click/Esc skips; never longer than 6 s.
// Sign-in state is local (sessionStorage), so there is no network wait to cover.
(function (root) {
  var ANIM_MS = 4500, MAX_MS = 6000, KEY = 'asg-splash-played';

  function start(opts) {
    opts = opts || {};
    var el = document.getElementById('splash');
    var body = document.body;
    var played = false;
    try { played = sessionStorage.getItem(KEY) === '1'; } catch (e) { /* ignore */ }
    if (!el || played || opts.skip) {
      if (el) el.remove();
      if (opts.onDone) opts.onDone();
      return;
    }
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finished = false, endTimer, capTimer;
    el.hidden = false;
    body.classList.add('is-splashing');
    body.setAttribute('aria-busy', 'true');

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(endTimer); clearTimeout(capTimer);
      document.removeEventListener('keydown', onKey);
      body.removeAttribute('aria-busy');
      el.remove();                                   // the page's own mark takes over in the same spot
      body.classList.remove('is-splashing', 'is-skipped');
      if (opts.onDone) opts.onDone();
    }
    function skip() {
      body.classList.add('is-skipped');
      el.classList.add('is-skipped');
      setTimeout(finish, 60);
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); } }

    endTimer = setTimeout(finish, reduce ? 250 : ANIM_MS);
    capTimer = setTimeout(finish, MAX_MS);
    el.addEventListener('click', skip);
    document.addEventListener('keydown', onKey);

    if (!navigator.onLine) {
      var status = el.querySelector('.status');
      if (status) status.textContent = 'You’re offline. Signing in needs a connection.';
    }
  }

  root.ASGSplash = { start: start };
})(window);
