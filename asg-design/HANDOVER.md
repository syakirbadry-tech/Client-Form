# ASG Portal — design handover to Claude Code (round 2: mobile app)

**From:** Claude Design · **To:** Claude Code · **Date:** 25 Nov 2026 · **Approver:** Syakir
**Live canvas (all artboards, interactive ones have Play):** https://claude.ai/artifact/7ZwggZbpnFfovoq2NbbCDk

> Read `CLAUDE.md` first (rules). This file = what was decided, what is in the pack, what to build next.

---

## 1. Decisions (approved by Syakir)

| # | Decision | Notes |
|---|---|---|
| 1 | **Direction A "Calm Teal"** chosen over B "Onyx & Gold" | Evolves today's portal: cream ground, teal primary, gold highlight. B's dark palette lives on as the **dark mode** |
| 2 | **One primary colour: teal** `#11706F` | Gold `#C9A227` demoted to highlight only (fixes the gold-vs-teal button clash) |
| 3 | **Type:** IBM Plex Sans (UI) · Playfair Display (page titles) · Poppins (wordmark only) | Plex = calm, trustworthy, good numerals |
| 4 | **Dark mode follows the device** | No toggle. Tokens in `asg.css` §1 |
| 5 | **Phone nav:** 4 tabs Home · Customers · VB · More + separate "+" Create | Apple: tabs navigate, don't act — so "+" is not a tab (unlike Merc Lab) |
| 6 | **iPad/desktop nav:** sidebar from the 21st.dev "dashboard-sidebar" pattern, rebuilt in vanilla | Switcher, grouped nav, 2-level expand, badges, ⌘K, collapse to rail, tap-outside to close, hidden scrollbar, device dark mode |
| 7 | **Home is the new first tab** | Next appointment → **Contest progress** → This week → Needs you today → quick actions |
| 8 | **Contest targets 2026:** Prudential Wealth Planner **125,000 TPC**, Star Club **280,000 TPC** | Owner-editable in Settings (never hard-code). Other tiers not needed yet |
| 9 | **Start animation:** A·S·G letters → the three strokes of the real logo → mark glides into the Sign-in logo | Then Sign in → Home transition. See `design/splash/README.md` |
| 10 | **Delete customer:** owner only, quiet danger button at the bottom of the detail sheet → action sheet → toast; plus select mode + "Test entries" filter | "It can't be undone" copy kept |
| 11 | **Status change = one tap** on a status chip in the detail sheet (saves immediately, shows "Saved") | Replaces select + "Update status" |
| 12 | **NRIC masked in lists**, full only in detail | |

## 2. What's in this pack

```
asg-design/
  CLAUDE.md                     rules for you (read first)
  HANDOVER.md                   this file
  KICKOFF-PROMPT.md             first message to paste into Claude Code
  design/asg.css                tokens (light+dark) + every component — replaces admin.css
  design/icons.js               ASG_ICON(name, size, label) — 43 stroke icons, replaces emoji
  design/asg-mark.svg           the logo mark as vector (A leg · S gold · G leg)
  design/splash/                start animation → sign in: splash.html/.css/.js + README timeline
  design/screens/*.html         21 static reference pages (rendered from the canvas, demo data)
  design/screens/png/*.png      the same at 2× (P- phone 390, T- iPad 1194×834; sidebar also -dark)
  docs/SCREEN-MAP.md            page → reference → IDs → status
  docs/CLASS-MAP.md             admin.css class → asg.css class
  docs/brief/                   the original briefs (round 1 + round 2) for context
  assets/                       asg-ansar-logo.jpg, prubsn-takaful-logo.png (client pages only)
```

**About the reference HTML:** they are pixel references rendered from the design canvas, so they use **inline styles**. Do **not** copy them into the app. Build each page with `asg.css` classes (see `CLASS-MAP.md`) and match the PNG. `design/splash/` is the exception — it is production-ready vanilla code.

## 3. Screens designed

| Area | Reference (design/screens/) | Status |
|---|---|---|
| Start animation → Sign in | `P-00-Splash-to-Sign-in` + `design/splash/` | Ready to build |
| Sign in | `P-01-Sign-in` | Ready (add wrong-password shake + error state) |
| Sign in → Home transition | `P-01b-Sign-in-to-Home` | Ready (spec in splash README) |
| Home (phone) | `P-15-Home` | Ready |
| Home (iPad) | `T-15-Home-iPad` | Ready — use the sidebar from `T-20` |
| Customers list | `P-02-Customers` | Ready |
| Customers select + delete | `P-02b-Select-and-delete` | Ready (owner only) |
| Customer detail sheet | `P-03-Customer-detail` | Ready |
| Delete confirm | `P-03b-Delete-confirm` | Ready |
| VB pipeline | `P-05-VB-pipeline` | Ready |
| Quotation — review step | `P-14-Quotation-review` | Ready (upload + share steps: follow the same pattern) |
| Introduction 1–4 | `P-16a…d` | Ready |
| Alerts inbox / lock-screen / settings | `P-17a…c` | Ready |
| More tab | `P-18-More` | Ready |
| Create sheet | `P-19-Create-sheet` | Ready |
| Sidebar (iPad/desktop) | `T-20-Sidebar-iPad` (+ `-dark.png`) | Ready |

### Not designed yet — build in the same system, then ask Syakir to review
- Appointments (07), Presentation (08), Presentation answers (09), Forms (10), Insights (04), Team/invite/deactivate/reset code + agent profile (11), Setup (12).
- Wrong-password state, "What's new" sheet (≤ 3 items, once), Customers **empty / loading / error** states (use `.empty`, `.skel`, `.alert`).
- Client form (13) and quotation client page (14) restyle = **phase 2**.

## 4. Build order (phases)

1. **Foundation** — swap `admin.css` → `asg.css`; add `icons.js`; replace emoji in the menu; app shell (`.app`, `.page`, `.tabbar`, `.fab`, `.sidebar` ≥ 768 px). Add PWA manifest + icons + `theme-color` light/dark.
2. **Sign in + splash** — `design/splash/`, keep IDs `loginForm loginBtn loginError setupForm setupBtn setupError showLogin`; busy/done/failed button states; Caps Lock hint.
3. **Home** — new page `home.html`/`home.js` from existing API data (next VB3 appointment, follow-ups due = VB2 contacted ≥ 3 days ago with no appointment, new forms today, weekly VB counts/cases/TPC, contest progress from yearly TPC vs owner targets).
4. **Customers** — stat strip, sideways chips, two-line rows, masked NRIC, detail **sheet** with one-tap status, owner delete flow + select mode + `TEST` tag. Keep IDs `stats search agentFilter chips exportBtn rows empty pageError lastUpdated refreshBtn` and drawer IDs; new: `deleteBtn`, `selectBtn`, `bulkBar`, `confirmSheet`, `toast`.
5. **VB pipeline + Create sheet** — stage tiles, next-step line, WhatsApp button per row; "+" sheet (Add VB name · New quotation · Book appointment · Share form link).
6. **More, Alerts inbox, Alert settings, Introduction** — push needs the existing Worker + Web Push; iPhone requires Add to Home Screen first.
7. **Remaining pages** (07–12) in the same system, then iPad/desktop pass with the sidebar.

## 5. Quality reports

### UI UX Pro Max — pre-delivery checklist (on the designs)
| Check | Result |
|---|---|
| No emoji as icons; one icon family, one stroke width | ✅ `icons.js`, stroke 1.9 |
| Touch targets ≥ 44 px, 8 px+ spacing | ✅ designed; verify in build |
| Text contrast ≥ 4.5:1 (light **and** dark) | ✅ computed: ink 13.0, muted 5.7 (card) / 5.2 (bg), white on teal 5.9, all 5 status pairs 6.5–7.6; dark: muted 6.7, status 8.0–8.7, on-primary 8.3 |
| Semantic tokens, no per-screen hex | ✅ in `asg.css`; ⚠️ reference HTML uses inline hex (renders only) |
| Loading feedback, empty states, confirm destructive + success toast | ✅ busy/done/failed, `.skel`, `.empty`, action sheet + toast |
| Onboarding skippable + progress shown | ✅ Skip/Back + step dots |
| Bottom nav ≤ 5 | ✅ 4 tabs |
| Reduced motion | ✅ every animation has a fade-only fallback |
| Safe areas | ✅ tokens use `env(safe-area-inset-*)`; ⚠️ Home content must get bottom padding so the last card isn't under the tab bar |
| Tested at 375 px, landscape, largest Dynamic Type | ⚠️ **not yet** — do this in the build |

### Apple Design review (5 lenses, on the phone screens)
**Summary: Good.** Thesis: *"the agent's day in one place"* — Home answers "what do I do next?". Remembered by: the A·S·G logo animation and the contest progress card.
- **Accessibility:** AA contrast met in both themes; badges are numbers with text labels ("Alerts, 3 unread"); status never colour-only. *Medium:* Playfair titles at 24–30 px are fine, but don't use Playfair below 20 px. Check largest text size — rows must wrap, not clip.
- **Platform conventions:** `tab-bars.md › Best practices` "Use a tab bar to support navigation, not to provide actions" → "+" kept outside. `sheets.md` "Display only one sheet at a time" + "Provide an alternative to the Done button" → grabber + ✕/Cancel everywhere. `action-sheets.md` "Make destructive choices visually prominent… place these buttons at the top" → delete confirm. On iPad the tab bar converts to a sidebar ✅.
- **Craft:** one signature (the mark + gold), everything else quiet. *Low:* the FAB is an Android-ish pattern on iOS — accepted for thumb reach; alternative is "+" in the nav bar.
- **Interaction:** `onboarding.md` "Teach through interactivity" → step 4 opens the real Add-name sheet; permission is primed *before* the system prompt. `notifications.md` "Avoid including sensitive, personal, or confidential information" + "Avoid sending multiple notifications for the same thing" → first names only, one per event, errors stay in-app.
- **Writing:** action labels name the result ("Create client link", "Delete 3 selected", "Send a test alert"). Keep sentence case everywhere (current designs are consistent).

## 6. Data the new screens need (no API changes — compute client-side)
- **Contest progress:** sum of approved TPC this calendar year for the signed-in agent (leader/owner: per agent and team) vs targets `{ pwp: 125000, starClub: 280000 }` stored in the owner's settings. Weekly pace = remaining ÷ weeks left to 31 Dec; cases ≈ pace ÷ average case TPC (default 2,500, show "≈").
- **Follow-ups due:** VB2 contacted ≥ 3 days ago with no appointment.
- **Next appointment:** earliest future VB3 appointment today/tomorrow.
- **Agent avatar colour:** stable hash of user id → one of 8 palette colours (`--av`).

## 7. Done checklist per page
- [ ] Matches PNG at 390 px (and iPad/desktop with sidebar) in light **and** dark
- [ ] All existing IDs present (or mapped in CLASS-MAP)
- [ ] Only `asg.css` classes/tokens; no emoji; icons from `icons.js`
- [ ] 44 px targets, 16 px inputs, focus ring, labels, `aria-label` on icon buttons
- [ ] Empty, loading (skeleton) and error states
- [ ] Reduced motion; nothing hidden under tab bar / safe areas; 375 px and landscape OK
- [ ] Demo data only in screenshots; NRIC masked in lists; no sensitive data in notifications
