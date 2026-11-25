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

## Phase 3 · Home (25 Nov 2026)

- `home.html` / `home.js` built from the existing API only (`/admin/vb`, `/admin/submissions`). No server change.
  - **Next appointment:** the earliest VB3 appointment today or tomorrow, with WhatsApp and "Open presentation" (`presentation.html#vb=<id>` picks that name). If there is none, it says so and offers "Book appointment".
  - **Contest progress:** your approved TPC this calendar year (VB4 names) against the targets in `admin/config.js` (PWP 125,000, Star Club 280,000). Days left, % per target, and the weekly pace to the next target ("≈ N cases at TPC 2,500").
  - **This week:** VB1–VB4 counts, cases and TPC. The goal is the weekly pace above.
  - **Needs you today:** new forms received today (opens `dashboard.html#open=<id>`), VB2 contacted ≥ 3 days ago with no appointment, and VB3 with no time set.
  - States: skeletons while loading, an empty-state message, and an error with "Try again". If only one source fails, the rest still shows with a note.
- iPad/desktop: two columns from 1100 px (T-15), and a "+ Create" button in the header (the FAB is phone-only).
- **Sign-in now lands on Home** (the design's hand-over).
- `admin/config.js` holds the contest targets, the average case TPC and feature flags (`deleteCustomer: false`). A Settings screen needs a server endpoint, so for now the owner changes this file.
- Leaders and the owner see their own TPC. The API returns only weekly counts per agent, not yearly totals.

## Phase 4 · Customers (25 Nov 2026)

- `dashboard.html` / `dashboard.js` rebuilt. Kept IDs: `stats search agentFilter chips exportBtn rows empty pageError lastUpdated refreshBtn passwordBtn scrim drawer drawerTitle drawerSub statusRow printBtn closeDrawer drawerBody printSheet`. New: `selectBtn selectAll selectDone selectedCount bulkHead bulkBar bulkDeleteBtn testFilter statusSaved deleteBtn custActions toast confirmSheet confirmDeleteBtn confirmCancelBtn`.
- List: 4-cell stat strip (tap to filter), search, agent filter, sideways status chips, and two-line rows. Each row shows name, short plan and **masked NRIC** (`900101-14-••••`), with date and status pill on the right; the agent also shows on wide screens. Skeleton while loading; empty states that invite the next step.
- **TEST tag** and a "Test entries" chip for names containing test/testing/dummy.
- Detail: a **bottom sheet** on phones (swipe down, ✕ or Esc to close), a right drawer at ≥ 768 px.
  - **One-tap status** chips that save immediately ("Saved · In review"; if it fails, the old status comes back with the reason).
  - WhatsApp, Call and Print buttons. Full NRIC is shown only here.
- **Delete customer (owner only) is built but switched OFF** (`config.js → features.deleteCustomer: false`). The flows are ready: detail "Delete customer", and select mode → "Delete N selected". Both use the action sheet (destructive on top, Cancel below), then a toast.
  - Both call `DELETE /admin/submissions/<recId>`. **The Worker does not have this endpoint yet.** Add it (owner only; delete the Airtable record, attachments included), deploy it, then set the flag to `true`.
- Customers tab badge = forms received today (set on Home and Customers).
- More › "Change password" (leaders and agents) opens it via `dashboard.html#password`.
- Shared helpers in admin.js: `showToast`, `confirmAction`, `enableSwipeClose`, `maskNric`, `formatNric`, `waNumber`, `isTestEntry`. Added a `refresh` icon to icons.js in the same stroke style.
- Print sheet unchanged (still light in dark mode). Fixed "Form vv3.4".
