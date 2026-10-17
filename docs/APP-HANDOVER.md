# ASG Ansar Client App — Design Handover

**Purpose:** turn the existing web dashboard into a phone app (iPhone first, Android too) for ASG Ansar Group, a Prudential BSN Takaful agency in Sungai Petani, Kedah.
**Audience:** Claude Design (UI/UX + front-end build).
**Design standard:** Apple Human Interface Guidelines (HIG). Every rule below cites the HIG page it comes from, or is marked *judgment*.
**Backend:** live and working. The app is a **new front end only**. No backend changes are needed for v1.

---

## 0. The design in one sentence

> A calm, one-handed tool that tells an agent **who to call today**, and gets them from a name to a phone call or WhatsApp message in two taps.

- **Signature element:** the **birthday sheet**. Gold is used for birthdays and nothing else, so gold always means "celebrate a client today" (*judgment*, following `branding.md › Best practices`: use brand colour "intentionally for primary actions or status indicators").
- **Everything else stays quiet:** system components, system font for controls, teal only for primary actions and the selected tab.

---

## 1. What exists today

| Piece | Where | Notes |
|---|---|---|
| Client sign-up form (public) | https://syakirbadry-tech.github.io/Client-Form/client-detail-form.html | 4-step form clients fill in. `?agent=<code>` tags the client to an agent. |
| Staff dashboard (web) | https://syakirbadry-tech.github.io/Client-Form/admin/ | Login, client list, client detail, status changes, Print/PDF, Insights, Team. |
| API (Cloudflare Worker) | `https://prubsn-submission-service.syakirbadry.workers.dev` | Repo `syakirbadry-tech/quotation-generator`, folder `backend/`. |
| Database | Airtable (Clients table + Dashboard Users table) | Only the Worker talks to Airtable. The app must **never** hold an Airtable key. |

Reference source for behaviour: `Client-Form/admin/`:
- `index.html` and `login.js`: sign in
- `dashboard.*`: client list, client detail, PDF
- `insights.*` and `team.*`
- `admin.js`: shared helpers and birthday logic
- `admin.css`: current styles

---

## 2. Users and roles

| Role | Who | Sees | Extra |
|---|---|---|---|
| **Owner** | Syakir (syakirbadry@gmail.com) | All clients | Team management. Password is set in server secrets, so there is no in-app change. |
| **Leader** | Roslinda binti Tan | All clients | Can change own password. |
| **Agent** | Ain Sabrina, Nur Syamimi (more later) | **Only their own clients** | Can change own password. |

The server enforces all access rules. The app only adapts what it shows to `user.role` from the login response.

---

## 3. Platform approach

**Build an installable PWA** in the same GitHub Pages site: `https://syakirbadry-tech.github.io/Client-Form/app/`.

- **Why the same site:** the API only accepts browser requests from `https://syakirbadry-tech.github.io` (CORS), so the same site means zero backend changes. If you choose another domain, the owner must change the Worker setting `ADMIN_ALLOWED_ORIGIN`. Flag this; don't assume it.
- **Install:** "Add to Home Screen" on iPhone and Android gives an app icon, full screen, and no App Store fees.
- **Later:** it can be wrapped with Capacitor for the App Store or Play Store.

**PWA requirements:**
- `manifest.webmanifest`:
  - name "ASG Ansar Clients", short name "ASG Clients"
  - `display: standalone`
  - `theme_color` `#11706F`, `background_color` `#F7F4F0`
  - icons at 192, 512 and maskable
- Viewport: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- Pad bars with `env(safe-area-inset-top/bottom/left/right)`. From `layout.md › Guides and safe areas`: "Respecting the safe area is essential to make sure system UI and hardware features like the Dynamic Island don't obstruct content and controls."
- The service worker caches **only the app shell** (HTML, CSS, JS, logos). It must **never cache API responses**, because they contain NRIC and bank details.

---

## 4. Design tokens (contrast checked)

All ratios were computed from the hex values (WCAG formula). The targets are from `accessibility.md › Color and effects`: **4.5:1** for text up to 17 pt, **3:1** for text 18 pt and larger or bold.

### 4.1 Colour

| Token | Light | Dark | Role | Contrast |
|---|---|---|---|---|
| `bg` | `#F7F4F0` | `#141615` | Page background | – |
| `surface` | `#FFFFFF` | `#1F2221` | Cards, sheets, grouped rows | – |
| `label` | `#2C2A28` | `#EDEAE6` | Primary text | 13.0:1 light · 13.4:1 dark |
| `secondaryLabel` | `#6B6560` | `#A8A29C` | Secondary text | 5.2:1 light · 6.4:1 dark |
| `separator` | `#E4DED8` | `#2E3231` | Hairlines between rows only | decorative |
| `fieldBorder` | `#8E8780` | `#6F6A65` | Text field outlines | 3.5:1 on white (*judgment*: 3:1 for control boundaries) |
| `tint` (buttons and selected tab) | `#11706F` with white text | `#5CC4C9` with `#141615` text | Primary actions, selected tab, links | 5.9:1 light · 8.8:1 dark |
| `tintText` (teal text on bg) | `#11706F` | `#5CC4C9` | Links, small teal text | 5.4:1 light · 8.8:1 dark |
| `brandTeal` | `#178D93` | `#5CC4C9` | **Large titles only** (≥ 22 pt bold) | 3.6:1 light, which passes for large text only |
| `celebrate` (gold) | `#C9A227` fill with `#2C2A28` text | `#E0BE4F` fill with `#141615` text | **Birthdays only** | 5.9:1 light · 10.1:1 dark |
| `danger` | `#B3261E` | `#F2938C` | Rejected, Block, errors | 6.5:1 light · 7.1:1 dark |

**Fixes from the current web dashboard** (do not copy these):
- **Primary buttons:** white on `#178D93` is **4.0:1**, below 4.5:1. Use `#11706F`, which gives **5.9:1**.
- **Gold buttons:** white on `#C9A227` is **2.4:1**, a clear fail. Use dark text on gold, which gives **5.9:1**.
- **Small teal text:** `#178D93` on `#F7F4F0` is **3.6:1**. Use `#11706F` (**5.4:1**) for anything under 18 pt.
- **Input borders:** `#E4DED8` on `#F7F4F0` is **1.2:1** and nearly invisible. Use `fieldBorder`.

Colour rules:
- **Follow the system appearance, with no in-app light/dark switch.** From `dark-mode.md › Best practices`: "Avoid offering an app-specific appearance setting." Implement with `prefers-color-scheme` and CSS custom properties.
- **Never show status by colour alone.** From `accessibility.md › Color and effects`: "Convey information with more than color alone." Every status pill carries its word, and the list also shows a small symbol per status.
- **Keep brand colour sparse.** From `branding.md › Best practices`: "Minimize its use on controls and instead use it intentionally for primary actions or status indicators."

### 4.2 Type

- **System font for all UI:** `font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif`.
- **Brand serif in large titles only:** Playfair Display 700, used for the screen's large title and the PDF letterhead. Nowhere else.
- **Default body size 17 pt; nothing below 11 pt.** From `typography.md`: iOS "Default size 17 pt, Minimum size 11 pt". The current web dashboard uses 15 px body and 12–13 px labels, so raise them.
- **Support larger text.** From `accessibility.md › Vision`: "give people the option to enlarge text by at least 200 percent". In Safari, use `font: -apple-system-body` (and `-apple-system-headline` and similar) on the root so text follows the iPhone's Text Size setting.
- **Layouts must survive the largest sizes:** rows wrap and nothing truncates names.

| Style | Size / weight | Use |
|---|---|---|
| Large Title | 34 pt Playfair 700 | Screen title (collapses to 17 pt semibold system on scroll) |
| Title 3 | 20 pt semibold | Section headers in detail |
| Headline | 17 pt semibold | Client name in rows |
| Body | 17 pt regular | Values |
| Subheadline | 15 pt regular, `secondaryLabel` | Plan, agent, date in rows |
| Footnote | 13 pt regular | Helper text under fields |
| Caption | 12 pt medium | Status pill text (with symbol) |

### 4.3 Size, spacing, motion

- **Every tappable thing is at least 44 × 44 pt**, with at least 8 pt between controls. From `accessibility.md › Mobility`: iOS "44x44 pt" default, "28x28 pt" minimum.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Side margins: 16 pt. Corner radius: 12 pt for cards, 10 pt for fields.
- Icons: one set only (SF Symbols-style line icons, e.g. Lucide), matched to text weight, and each icon-only button has an `aria-label`.
- Motion: system-like push and sheet transitions only. Honour `prefers-reduced-motion` (crossfade instead). No decorative animation (*judgment*, following `design-principles.md`: "don't mistake delight for decoration").

### 4.4 Logos

- The ASG Ansar + Prudential BSN Takaful logos appear in **two places only**: the sign-in screen and the PDF letterhead. Files: `Client-Form/admin/img/asg-ansar-logo.jpg`, `prubsn-takaful-logo.png`.
- From `branding.md › Best practices`: "Resist the temptation to display your logo throughout your app".

---

## 5. Navigation

**Tab bar with three tabs, the same for every role:** **Clients · Insights · Account**.

```
┌───────────────────────────────┐
│ status bar / Dynamic Island   │
│ Clients            (34pt)  ⋯  │  ← large title, ⋯ = More menu
│ [🔍 Search name, NRIC, phone ] │
│ [All 42][Received 5][Review 3]→│  ← status filter chips (scroll)
│ ┌───────────────────────────┐ │
│ │ Nur Aisyah        ✓ Approved│ │
│ │ AnugerahMax Plan 200 · Ain │ │
│ │ 12 Oct                  ›  │ │
│ ├───────────────────────────┤ │
│ │ ...                        │ │
│ └───────────────────────────┘ │
├───────────────────────────────┤
│  👥 Clients  📊 Insights  👤 Account │ ← tab bar + home indicator inset
└───────────────────────────────┘
```

- **Tabs navigate; they don't act.** From `tab-bars.md › Best practices`: "Use a tab bar to support navigation, not to provide actions." Print, Share and Change Status live in toolbars or menus on the screen they affect.
- **Team is a row inside Account for the owner**, not a fourth tab. From `tab-bars.md › Best practices`: "Don't disable or hide tab bar buttons". Keeping the same three tabs for every role avoids a tab that exists for some people and not others.
- **Search is in a primary position.** From `searching.md › Best practices`: "If search is important, give it a primary position". Put the search field at the top of Clients, visible on load (not hidden behind a pull).
- **Back navigation:** a standard back button with the previous title, plus swipe-from-left-edge to go back.
- **Wider screens:** the app keeps a centred single column, max 640 px wide, on tablets and desktop.

---

## 6. Screens

### 6.1 Sign In

- Logos (small, centred), then "Sign In" in the large title.
- **Email field:**
  - `type="email"`, `autocomplete="username"`, `autocapitalize="none"`, `inputmode="email"`
  - The `autocomplete` value lets iCloud Keychain / Google Password Manager fill it.
- **Password field:**
  - `autocomplete="current-password"`
  - A "Show" text button inside the field (44 pt tap area)
  - Never prefilled. From `entering-data.md › Best practices`: "Never prepopulate a password field."
- **Main button:** "Sign In" (prominent, full width).
- **Temporary password flow:**
  - If the API returns `code: "password_change_required"` (403), push a **Choose a New Password** screen.
  - It has a new password field (`autocomplete="new-password"`) and a confirm field.
  - A live checklist ("At least 8 characters", "Both match") ticks as they type, so there are no surprise errors on submit.
  - Submit calls `POST /admin/set-password` with `{ username, code: <temporary password just typed>, password }`.
- **Errors:**
  - Show inline under the field, not in an alert. Use the API's `error` text.
  - From `feedback.md › Best practices`, alerts are for "critical — and ideally actionable — information".
- **Loading:** the button shows a spinner and the label "Signing In…", and stays disabled until the request finishes.
- **Later (needs backend):** passkeys / Face ID. From `managing-accounts.md › Best practices`: "prefer using a passkey". For v1, make sure password managers work via the `autocomplete` attributes above.

### 6.2 Birthday sheet (signature moment)

- After sign-in, **once per day**, if any client has a birthday **today or within the next 5 days**.
- Present as a **sheet at the medium detent with a grabber**, not an alert. From `sheets.md › Best practices`: "consider supporting the medium detent to allow progressive disclosure" and "Include a grabber in a resizable sheet."
- Can be swiped down to dismiss. It has a Done button top-right.
- The header carries a gold accent: "🎂 3 birthdays this week".
- Each row:
  - Client name and "Today" / "Tomorrow" / "In 3 days"
  - Age they're turning
  - Two 44 pt buttons: **Call** and **WhatsApp**. WhatsApp opens `https://wa.me/60…` with a short pre-written greeting the agent can edit.
- Also shown as a gold badge count on the Clients tab, so it can be reopened from the Clients toolbar (🎂 button) any time.
- **Date logic:**
  - Use `dateOfBirth`. If it's missing, derive it from the NRIC (first 6 digits, YYMMDD).
  - Use Malaysia time (UTC+8).
  - Reuse `birthDate` and `birthdayInfo` from `admin/admin.js`.

### 6.3 Clients (home tab)

- **Large title:** "Clients", or "My Clients" for agents.
- **Toolbar trailing:**
  - 🎂 birthdays, with a badge
  - ⋯ More menu, containing: **Sort** (Newest, Name, Status) and **Filter by Agent** (owner and leader only)
- **Search field:** name, NRIC, phone, email, agent.
- **Status chips:** a horizontally scrolling row (All · Received · In Review · Documents Verified · Approved · Rejected · Needs Follow-up). Each chip shows its count.
- **List rows (grouped inset list):**
  - Line 1: name (Headline) and status pill (symbol + word)
  - Line 2: plan · agent (Subheadline, secondary)
  - Line 3: submitted date
  - Chevron
  - Whole row tappable, minimum 64 pt tall
- **Swipe actions:**
  - Swipe left: **Call** and **WhatsApp**
  - Swipe right: **Change Status**
  - Every swipe action is also available in the detail screen, so swiping is never the only way.
- **Pull to refresh.**
- **Loading:** grey placeholder rows right away, never a blank screen. From `loading.md › Best practices`: "Show something as soon as possible."
- **Empty states:**
  - **Agent with no clients:** "No clients yet. Share your form link and new clients will appear here." Button: **Share Form Link**.
  - **No search results:** "No clients match '…'." Button: **Clear Search**.
  - From `writing.md › Best practices`: "Provide clear next steps on any blank screens."
- **Summary tiles** (Total, Received, In Review, Approved, Follow-up) are **not** on this screen. They live in Insights, so the list starts high on the screen (*judgment*: progressive disclosure).

### 6.4 Client detail

- **Title:** client name. **Toolbar trailing:** Share (opens PDF), then ⋯ More menu (Print / Save PDF, Copy NRIC, Copy Phone).
- **Action row under the name:** three equal 44 pt buttons: **Call**, **WhatsApp**, **Email**.
- **Status row:** the current status pill and a **Change Status** button.
  - Change Status opens a **medium-detent sheet** listing the 6 statuses with a checkmark on the current one.
  - Tapping a status saves immediately (`PATCH`), closes the sheet, and shows a small confirmation "Status changed to Approved".
  - No confirmation alert, because the change is easy to undo. From `alerts.md › Best practices`: "Avoid displaying alerts for common, undoable actions".
- **Grouped sections:** Personal · Contact · Employment · Health · Plan & Beneficiary · Family · Bank · IC Photos.
  - Each section is collapsible. Personal and Plan are open by default.
  - Label above, value below (stacks cleanly at large text sizes).
- **Sensitive values:** NRIC and bank account show as `••••••-••-1234` with an eye button (44 pt, `aria-label="Show NRIC"`). Revealing auto-hides after 30 seconds (*judgment*).
- **IC photos:** thumbnails; tap to open full screen with pinch zoom.
- **PDF / Print:**
  - Letterhead: both logos, "ASG ANSAR GROUP", "Ejen Takaful · Prudential BSN Takaful Berhad", "Sungai Petani, Kedah".
  - Body: client details only.
  - Watermark: diagonal **"ASG ANSAR USE ONLY"**.
  - Reuse the layout of `printDetail` in `admin/dashboard.js`.
  - On iPhone, open the print view so the person can use the system Share → Save to Files / Print.

### 6.5 Insights tab

- **Agent picker** at the top (owner and leader): a menu button "All Agents ▾".
- **Tiles in a 2-column grid:** Clients, Average Income, Median Income, Average Age, Birthdays in 5 Days. Tapping the birthday tile opens the birthday sheet.
- **Charts:** horizontal bar charts, one per card: Monthly Income, Age Group, Occupation, Employment Type, Marital Status.
  - Each bar shows its **label and number as text**, not colour or length alone.
  - Each chart has a title that states its point, e.g. "Most clients earn RM 2,000–3,999".
  - Each chart has an `aria-label` summary.
  - From `charts.md › Best practices`: "Make every chart in your app accessible."
- **Client list:** sortable via a menu (Next Birthday, Income, Age, Name).
  - Shows "Est. budget / month" = 10 % of income.
  - A footnote: "A guide only: 10% of stated monthly income."

### 6.6 Account tab

- **Header:** name, email, role.
- **My Form Link** (everyone): the link plus **Copy** and **Share** (system share sheet via `navigator.share`).
- **Team** (owner only): row → Team screen (6.7).
- **Change Password** (leader and agent): row → screen with Current, New, Confirm, using the same live checklist as 6.1. Calls `POST /admin/change-password`, then stores the new token.
- **Sign Out:** a plain red text row at the bottom, no confirmation. They can sign straight back in.
- There is **no** light/dark switch (see 4.1).

### 6.7 Team (owner, from Account)

- **List of members:** name, email, role pill, and an access line (e.g. "Can sign in · password set 12 Oct", "Temporary password valid until 24 Oct", "Blocked").
- **Toolbar trailing:** **+** (Add Person). Opens a sheet with Name, Email (email keyboard), and Role as a 2-segment control (Agent | Leader). The button reads "Add Person".
- **Member detail screen:**
  - Form link with Copy / Share.
  - **Role:** segmented control, Agent | Leader.
  - **Create Temporary Password:**
    - Shows the code in large monospaced text, once, with the expiry.
    - Buttons: **Copy Message** and **Send by WhatsApp**, using the message from `setupMessage` in `admin/team.js`.
    - If they already have a password, first show an alert explaining their old password still works until they choose a new one. Buttons: **Cancel** / **Create**.
  - **Block Access:**
    - A destructive (red) action with a confirmation alert, because it signs them out immediately. Alert buttons: **Cancel** and **Block**, with Block in the destructive style.
    - From `alerts.md › Best practices`: "when people take an uncommon destructive action that they can't undo, it's important to display an alert". Unblock needs no alert.

---

## 7. Writing

- **Title Case for buttons, menu items, tabs and screen titles** ("Sign In", "Change Status", "Send by WhatsApp"). **Sentence case for body and helper text.**
  - From `writing.md › Best practices`: "Choose a style for each UI element type and use it consistently".
  - The current web app mixes these. Fix it in the app.
- **Buttons say what happens:** "Add Person", not "Submit"; "Save PDF", not "Export".
- **Errors say what went wrong and what to do:** "That email or password is wrong. Check both and try again." No apologies, no codes.
- **Words staff use:** "client", "form link", "temporary password". Never "record", "submission ID" or "token".
- **Language:** English for v1. Keep all strings in one file so Bahasa Melayu can be added later.

---

## 8. API contract

Base: `https://prubsn-submission-service.syakirbadry.workers.dev`

- All bodies are JSON.
- Auth: `Authorization: Bearer <token>` on everything except login and set-password.
- Every response is `{ success: true, ... }` or `{ success: false, error: "human message", code: "machine_code" }`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/admin/login` | `{ username, password }` | `{ token, expiresAt, user:{name,email,role} }`, or 403 `password_change_required` |
| POST | `/admin/set-password` | `{ username, code, password }` | `{ token, expiresAt, user }` |
| POST | `/admin/change-password` | `{ currentPassword, newPassword }` | `{ token, expiresAt, user }` (replace the stored token) |
| GET | `/admin/me` | – | `{ user }` |
| GET | `/admin/submissions` | – | `{ submissions:[summary] }` (already filtered to what this user may see) |
| GET | `/admin/submissions/:id` | – | `{ submission:{ id, createdTime, fields } }` (fields use Airtable column names) |
| PATCH | `/admin/submissions/:id` | `{ status }` | `{ submission:summary }` |
| GET | `/admin/team` | – | `{ users:[{id,name,email,role,active,formCode,hasPassword,setupCodeExpires,passwordSetAt}] }` |
| POST | `/admin/team` | `{ name, email, role }` | `{ user }` |
| PATCH | `/admin/team/:id` | `{ active?, role? }` | `{ user }` |
| POST | `/admin/team/:id/setup-code` | – | `{ code, expiresAt, user }` (the code is shown once) |

**Summary fields:** `id, fullName, nric, phone, email, plan, status, submittedAt, employmentType, maritalStatus, dateOfBirth, occupation, fieldOfWork, monthlyIncome, agentName, agentEmail`. An empty `agentName` means the owner's client, so show "Syakir".

**Statuses:** `Received`, `In Review`, `Documents Verified`, `Approved`, `Rejected`, `Needs Follow-up`.

**Session:**
- The token lasts 8 hours; `expiresAt` is in Unix seconds.
- On any **401**, clear the token and return to Sign In with the message.
- Changing a password invalidates old tokens.

**Form links:** owner `…/client-detail-form.html`; others `…/client-detail-form.html?agent=<formCode>`.

---

## 9. Security and privacy (must keep)

1. Keep the token in memory / `sessionStorage` (current behaviour). If "stay signed in" is wanted, ask the owner first, because the data is sensitive.
2. Never cache client data offline. The service worker caches the shell only.
3. Never log or send client data to analytics or third parties. No third-party scripts.
4. Keep a strict Content-Security-Policy like the current pages, with `connect-src` limited to the Worker URL.
5. Temporary passwords are shown once and never stored.
6. Mask NRIC and bank details by default. Return to Sign In when the token expires.
7. When the app goes to the background, blur the client screens in the app switcher (*judgment*; use `visibilitychange`).

---

## 10. Quality checklist ("done" means)

- [ ] Installs from Safari (Add to Home Screen) and Chrome (install prompt), and opens full screen with safe areas respected.
- [ ] Every screen works for owner, leader and agent against the real API. Agents never see another agent's clients.
- [ ] All text meets the contrast table in 4.1 in **both** light and dark mode.
- [ ] Usable at iPhone **Text Size: largest** (and Larger Accessibility Sizes) with no clipped names or overlapping controls.
- [ ] Every control is at least 44 × 44 pt; every icon-only button has an accessible label; VoiceOver reads rows as "Name, status, plan".
- [ ] Works at 320–430 pt wide, one-handed: main actions sit in the lower half or in the toolbar.
- [ ] Reduced Motion gives crossfades; nothing depends on animation.
- [ ] PDF matches the letterhead and the "ASG ANSAR USE ONLY" watermark.

## 11. Later (not v1)

- Passkeys / Face ID sign-in (needs backend).
- Push notifications for new clients and birthdays (needs backend).
- Emailing temporary passwords (today they're shared by WhatsApp or copy).
- Editing client details in the app (today only the status is editable).
- Owner password managed in the app (today it lives in Cloudflare secrets).
- Bahasa Melayu.
