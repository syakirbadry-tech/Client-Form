/* ASG start animation controller — vanilla JS, no dependencies.
   Decides the hand-over and handles skip, slow network, offline, 6 s cap.

   Usage (in index.html, after the splash markup):
     ASGSplash.start({
       ready: api('/admin/session'),          // Promise: resolves {signedIn, firstSignIn}
       onDone: function (state) { ... }       // route to sign-in / intro / home
     });
*/
(function (root) {
  var ANIM_MS = 4500, MAX_MS = 6000, SLOW_MS = 3000;
  function start(opts) {
    var el = document.querySelector('.splash');
    if (!el) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var animDone = false, data = null, finished = false, waitingTimer, capTimer;
    var status = el.querySelector('.status');

    function finish() {
      if (finished) return; finished = true;
      clearTimeout(waitingTimer); clearTimeout(capTimer);
      el.classList.remove('is-waiting');
      document.body.removeAttribute('aria-busy');
      // Signed out: the splash ends ON the sign-in layout (mark already at the top), so just remove the overlay chrome.
      // Signed in / first sign-in: fade the splash out and route.
      if (data && data.signedIn) {
        el.style.transition = 'opacity .25s ease'; el.style.opacity = '0';
        setTimeout(function () { el.remove(); }, 260);
      } else {
        el.querySelectorAll('.skip,.status,.cap,.word,.lt').forEach(function (n) { n.remove(); });
        el.classList.add('is-landed');   // mark stays as the sign-in logo
      }
      if (opts.onDone) opts.onDone(data || { signedIn: false, offline: !navigator.onLine });
    }
    function maybeFinish() { if (animDone && data) finish(); }

    document.body.setAttribute('aria-busy', 'true');
    setTimeout(function () { animDone = true; maybeFinish(); }, reduce ? 200 : ANIM_MS);

    // Tap anywhere = skip to the end state (Apple: let people skip)
    el.addEventListener('click', function () { el.classList.add('is-skipped'); animDone = true; maybeFinish(); });

    // Slow network: keep the sheen sweeping as the loader, say "Connecting…" after 3 s
    waitingTimer = setTimeout(function () {
      if (!data) { el.classList.add('is-waiting'); if (status) status.textContent = 'Connecting…'; }
    }, SLOW_MS);
    // Never hold the app longer than 6 s
    capTimer = setTimeout(function () {
      if (!data) data = { signedIn: false, timedOut: true };
      animDone = true; finish();
    }, MAX_MS);

    if (!navigator.onLine) {
      data = { signedIn: false, offline: true };
      if (status) status.innerHTML = 'You’re offline. Showing what was saved. <button type="button" class="btn btn--ghost" data-retry>Retry</button>';
    }
    Promise.resolve(opts.ready).then(function (d) { data = d || { signedIn: false }; maybeFinish(); },
      function () { data = { signedIn: false, error: true }; maybeFinish(); });
  }
  root.ASGSplash = { start: start };
})(window);
