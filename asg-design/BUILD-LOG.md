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
