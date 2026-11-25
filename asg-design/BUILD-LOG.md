# ASG Portal mobile app — build log

## Phase 1 · Foundation (25 Nov 2026)

**Built**
- `admin/asg.css` (exact copy of `design/asg.css`), `admin/icons.js`, `admin/asg-mark.svg`.
- `admin/legacy.css`: the old page classes restyled on asg tokens. Delete each block when its page is rebuilt.
- `admin/app.css`: shell pieces asg.css leaves to the build (sidebar head/foot, icon-tile rows, ⌘K list, avatar colour tokens `--av-1…8`).
- `admin/admin.v1.css`: backup of the old `admin.css` (not loaded).
- App shell in `mountPortalNav()` (admin.js): wraps each page in `.app` > `.sidebar` + `.app-main`; phone `.tabbar` (Home · Customers · VB · More) + `#fab` → Create sheet (`#createSheet`); ≥ 768 px sidebar with `#sbCollapse` (remembered in localStorage), ⌘K / Ctrl K page search (`#cmdk`). `setNavBadge(id, n)` ready for phase 3+.
- `?create` on `vb.html` / `appointments.html` opens the page's own `#addBtn` form after its data loads.
- New pages: `home.html` (placeholder: greeting + quick links; real Home is phase 3), `more.html` (P-18).
- PWA: `manifest.webmanifest`, `img/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (from `asg-mark.svg`), theme-color light `#F7F4F0` / dark `#0F0E0C`, CSP `manifest-src 'self'`. No service worker yet.
- Fonts: IBM Plex Sans, Playfair Display, Poppins.
- Emoji removed from the staff UI (menu, ☰, birthday pop-up, "Copied ✓", ▶). Presentation **stage** (client-facing) keeps its emoji until phase 2; `presentation.html` is forced light (`html.theme-light`), like print.
- Sign-in still lands on Customers (no flow change).

**Not mapped yet (kept in legacy.css until their page is rebuilt)**
- Clashes handled: `.kv` (old = `dl.kv` grid; asg = row), `.pill[data-status]` → status pairs, `.stat` cards (statstrip in phase 4).
- Classes: `toolbar`, `toolbar-actions`, `agent-filter`, `grow`, `right`, `row`, `name`, `missing`, `blank`, `doc`, `docs`, `col-hide-*`, `vb-*`, `members`/`member-*`, `add-form`, `role-select`, `team-help`/`team-pad`, `answers-list`/`answer-*`, `forms-actions`, `reminder-*`, `print-*`, `printing-sheet`, `no-print`, `cal-*`, `pres-*`, `bar*`, `insight-*`.
- IDs: `refreshBtn`, `passwordBtn` (suggest More › Profile), `agentFilter` (sidebar switcher, phase 4), `ownerLink`.

## Phase 2 · Sign in + start animation (25 Nov 2026)

**Built**
- `admin/index.html` rebuilt on the approved layout (mark, wordmark, card). IDs kept: `loginForm loginBtn loginError setupForm setupBtn setupError showLogin` (+ `username`, `password`, `newPassword`, `newPassword2`). New: `signin`, `signinMark`, `signinLead`, `capsHint`, `splash`.
- `admin/splash.css` / `admin/splash.js`: the approved start animation (A·S·G letters → three strokes → mark glides up and becomes the sign-in logo). Inline styles from the reference moved into CSS (the page CSP blocks inline styles).
  - Plays once per browser tab, only when signed out; not when the page shows a "session ended" message.
  - Tap, click, Esc, Enter or Space skips. Hard cap 6 s. Reduced motion: no letters or flight, 0.2 s fade.
  - Offline: "You're offline. Signing in needs a connection."
- `admin/login.js`: one feedback language. Busy = "Signing in…" with the gold-edged spinner. Done = green with a drawn tick, "Welcome back, <first name>"; then the card slides down and the portal opens. Wrong ID = the button shakes, the error shows above the button and the password box is marked invalid.
- Caps Lock hint, double-submit guard. Inputs are 48 px / 16 px.
- Dark mode: the green "done" button uses dark text (white was below 4.5:1).

**Kept as before (no flow change)**
- A correct sign-in still opens Customers. It switches to Home in phase 3, when Home has real content (`AFTER_SIGN_IN` in login.js).
- The first sign-in still goes to "Choose your password". Introduction screens come in phase 6.
- The "First time? Use setup code" and "Forgot password" links in the reference are not added: there is no such flow or endpoint yet.
