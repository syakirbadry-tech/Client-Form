# admin.css → asg.css class map

Old classes on the left (from today's `admin.css`), new on the right. Where a new class is "same", keep the name — `asg.css` restyles it.
Tokens: `--teal`→`--primary`, `--teal-dark`→`--primary-press`, `--teal-soft`→`--primary-soft`, `--gold` (highlight only), `--ink`, `--muted`, `--line`, `--bg`, `--card`, `--danger`, `--danger-soft`→`--st-now-bg`, `--radius`→`--r-md`, `--shadow`→`--shadow-1`.

| admin.css | asg.css | Notes |
|---|---|---|
| `.btn` | `.btn` | now 44 px min, 16 px text |
| `.btn-primary` | `.btn--primary` | the only primary colour |
| `.btn-gold` | `.btn` (secondary) | **gold buttons removed** — Export CSV / Print become secondary |
| `.link-btn` | `.btn--ghost` | |
| `.vb-delete`, delete buttons | `.btn--danger` | + action sheet confirm |
| `.input` | `.input` | 48 px, 16 px |
| `.field` | `.field` | + `.field__error`, `.field__hint` |
| `.alert` | `.alert` | |
| `.panel`, `.section` | `.card` / `.card--pad` | |
| `.stats` + `.stat` `.stat-label` `.stat-value` | `.statstrip` (phone) | 4-up strip; desktop may keep cards inside `.card` |
| `.chips` / `.chip` | `.chips` / `.chip[aria-pressed]` | scroll sideways, no wrapping |
| `.pill` | `.pill.pill--{neutral\|soon\|info\|ok\|now}` | see SCREEN-MAP status table |
| `.vb-badge` | `.pill` + stage modifier | |
| `table` rows / `.vb-row` / `.member` / `.cal-up-row` | `.list` > `.li` (`.li__main` `.li__title` `.li__sub` `.li__meta`) | two-line rows on phone |
| `.table-scroll` | `.list` on phone; table allowed ≥ 768 px inside `.card` | |
| `.kv` | `.kv-group` > `.kv` (`dt`/`dd`) | |
| `.drawer`, `.drawer-head`, `.drawer-body` | `.sheet` (+ `.sheet--full`), `.sheet__grabber`, `.sheet__head`, `.sheet__close` | becomes a right drawer ≥ 768 px automatically |
| `.scrim`, `.nav-scrim` | `.scrim` | |
| `.status-row` (select + Update button) | `.chips` of status `.chip[aria-pressed]` — saves on tap | |
| `.saved` | `.toast` or inline `role=status` "Saved" line | |
| `.empty` | `.empty` (+ `.empty__title`) | |
| `.loading` | `.skel` rows | |
| `.topbar` `.topbar-sub` `.topbar-right` | `.topbar` `.topbar__title .sub` | |
| `.portal-nav`, `.nav-group`, `.nav-group-title`, `.nav-item`, `.nav-icon`, `.nav-label`, `.nav-soon` | phone: `.tabbar` + More page · ≥ 768: `.sidebar`, `.sb-head`, `.sb-item`, `.sb-label`, `.pill--neutral` "Soon" | emoji `.nav-icon` → `ASG_ICON()` |
| `.nav-toggle` (☰) | removed on phone (tab bar); `sbCollapse` button on ≥ 768 | |
| `.nav-brand`, `.nav-logo`, `.nav-brand-name` | sidebar switcher button with `asg-mark.svg` + "Viewing: …" | |
| `.nav-who`, `.nav-signout`, `.who` | More › profile card + Sign out; sidebar footer | |
| `.login-wrap`, `.login-card`, `.login-foot` | splash/sign-in layout in `design/splash/splash.html` (`.card`, `.wordmark`) | |
| `.code-box`, `.code-actions`, `.code-message` | `.card--pad` + `.btn--wa` share | setup codes on WhatsApp |
| `.forms-list`, `.link-row` | `.list` + copy `.icon-btn` + `.btn--wa` | |
| `.bar*`, `.insight-*` | keep for Insights until redesigned; use `--primary`/`--gold` tokens | |
| `.cal-*` | keep until Appointments is redesigned; swap colours to tokens | |
| `.pres-*`, `.letterhead*`, `.print-*` | unchanged (client-facing / print) — phase 2 | |
