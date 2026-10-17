# ASG Ansar Client App — Design Handover

**Purpose:** turn the existing web dashboard into a phone app (iOS + Android) for ASG Ansar Group, a Prudential BSN Takaful agency in Sungai Petani, Kedah.
**Audience:** Claude Design (UI/UX + front-end build).
**Status of the backend:** live and working. The app is a **new front end only** — no backend changes are needed for v1.

---

## 1. What exists today

| Piece | Where | Notes |
|---|---|---|
| Client sign-up form (public) | https://syakirbadry-tech.github.io/Client-Form/client-detail-form.html | 4-step form clients fill in. `?agent=<code>` tags the client to an agent. |
| Staff dashboard (web) | https://syakirbadry-tech.github.io/Client-Form/admin/ | Login, client list, client detail, status changes, Print/PDF, Insights, Team. |
| API (Cloudflare Worker) | `https://prubsn-submission-service.syakirbadry.workers.dev` | Repo `syakirbadry-tech/quotation-generator`, folder `backend/`. |
| Database | Airtable (Clients table + Dashboard Users table) | Only the Worker talks to Airtable. The app must **never** hold an Airtable key. |

Source code of the current web app (use as the functional reference):
`Client-Form/admin/` — `index.html`/`login.js` (sign in), `dashboard.*` (list + detail + PDF), `insights.*`, `team.*`, `admin.js` (shared helpers, birthday logic), `admin.css` (styles).

---

## 2. Users and roles

| Role | Who | Sees | Extra |
|---|---|---|---|
| **Owner** | Syakir (syakirbadry@gmail.com) | All clients | Team management screen. Cannot change password in-app (set in server secrets). |
| **Leader** | Roslinda binti Tan | All clients | Change own password. |
| **Agent** | Ain Sabrina, Nur Syamimi (more later) | **Only their own clients** | Change own password. |

The server enforces all of this — the app just hides screens the role can't use (`user.role` from login).

---

## 3. Recommended app approach

**Build as an installable PWA (Progressive Web App) hosted in the same GitHub Pages site**, e.g. `https://syakirbadry-tech.github.io/Client-Form/app/`.

Why:
- The API only accepts browser requests from `https://syakirbadry-tech.github.io` (CORS). Same origin = works with zero backend changes.
- "Add to Home Screen" on iPhone/Android gives an app icon, full screen, no App Store fees or review.
- Can later be wrapped with Capacitor for Play Store / App Store if wanted (native requests don't send an Origin, so the API still works; the owner would just need to confirm).

If you choose another domain, the owner must change the Worker setting `ADMIN_ALLOWED_ORIGIN` — flag this, don't assume it.

PWA needs: `manifest.webmanifest` (name "ASG Ansar Clients", short name "ASG Clients", theme colour `#178D93`, background `#F7F4F0`, icons 192/512 + maskable), a service worker that caches **only the app shell** (HTML/CSS/JS/logos) — **never cache API responses** (they contain NRIC, bank details).

---

## 4. Brand

| Token | Value | Use |
|---|---|---|
| Teal | `#178D93` | Primary, headings, buttons |
| Teal dark | `#11706F` | Pressed states |
| Teal soft | `#E6F3F3` | Selected chips, highlights |
| Gold | `#C9A227` | Accent / secondary action (PDF, WhatsApp) |
| Ink | `#2C2A28` | Body text |
| Muted | `#6B6560` | Secondary text |
| Line | `#E4DED8` | Borders |
| Background | `#F7F4F0` | Warm off-white page |
| Danger | `#B3261E` / soft `#FCEBEA` | Errors, Rejected |

- Fonts: **Playfair Display 700** for headings, **Inter 400/600/700** for UI.
- Logos (in `Client-Form/admin/img/`): `asg-ansar-logo.jpg` and `prubsn-takaful-logo.png` — always shown side by side on the letterhead.
- Tone: professional, warm, simple English; staff mostly use phones one-handed.
- Please provide a dark mode.

---

## 5. Screens (v1)

Bottom tab bar: **Clients · Insights · Team (owner only) · Profile**.

### 5.1 Sign in
- Fields: Email, Password. "Show password" toggle.
- If API returns `code: "password_change_required"` (403) → go to **Choose your password** (new password ×2, min 8 chars) → `POST /admin/set-password` with `{ username, code: <the temporary password they just typed>, password }`.
- Error messages come from the API `error` field — show them as-is.

### 5.2 Birthday pop-up (after sign in, once per day)
- Clients whose birthday is **today** or within the **next 5 days**: name, "Today 🎉" / "in 3 days", phone with **Call** and **WhatsApp** buttons.
- Date of birth comes from `dateOfBirth`; if missing, derive from NRIC (YYMMDD first 6 digits). Logic is in `admin/admin.js` → `birthDate`, `birthdayInfo`. Use Malaysia time (UTC+8).

### 5.3 Clients (home)
- Search (name, NRIC, phone, email, agent).
- Status chips: All · Received · In Review · Documents Verified · Approved · Rejected · Needs Follow-up (with counts).
- Agent filter (owner/leader only).
- Card list: name, plan, status pill, submitted date, agent. Pull to refresh.
- Summary tiles at top: Total, Received, In Review, Approved, Follow-up.

### 5.4 Client detail
- Sections: Personal · Contact · Employment · Health · Plan & Beneficiary · Family · Bank · IC photos.
- Quick actions: **Call**, **WhatsApp** (`https://wa.me/60…`), **Email**.
- Change status (bottom sheet with the 6 statuses) → `PATCH`.
- **Print / PDF** — letterhead (both logos, "ASG ANSAR GROUP / Ejen Takaful · Prudential BSN Takaful Berhad / Sungai Petani, Kedah"), client details only, diagonal watermark **"ASG ANSAR USE ONLY"**. Current implementation: `printDetail` in `admin/dashboard.js`. On phone, use the share sheet (print → save PDF).
- NRIC and bank account: mask by default, tap to reveal.

### 5.5 Insights
- Tiles: Clients, Average income, Median income, Average age, Birthdays in 5 days.
- Bar charts: Monthly income bands, Age group, Occupation, Employment type, Marital status.
- Table/list sortable by next birthday, income, age, name. "Est. budget" = 10 % of monthly income (label it as a guide).
- Agent filter (owner/leader).

### 5.6 Team (owner only)
- Owner's own form link + copy.
- Member cards: name, email, role pill, access status, their form link (copy / share).
- Actions: **Temporary password** (shows code once + ready message with **Copy** / **Send by WhatsApp**), change role (Agent/Leader), Block/Unblock (confirm first).
- Add person: name, email, role.
- Message text template: see `setupMessage` in `admin/team.js`.

### 5.7 Profile
- Name, email, role. My form link (agents/leaders) with Share.
- Change password (leader/agent): current, new, confirm → `POST /admin/change-password`.
- Sign out.

---

## 6. API contract

Base: `https://prubsn-submission-service.syakirbadry.workers.dev`
All bodies JSON. Auth: `Authorization: Bearer <token>` on everything except login/set-password.
Every response: `{ success: true, ... }` or `{ success: false, error: "human message", code: "machine_code" }`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/admin/login` | `{ username, password }` | `{ token, expiresAt, user:{name,email,role} }` · 403 `password_change_required` |
| POST | `/admin/set-password` | `{ username, code, password }` | `{ token, expiresAt, user }` |
| POST | `/admin/change-password` | `{ currentPassword, newPassword }` | `{ token, expiresAt, user }` (replace stored token) |
| GET | `/admin/me` | – | `{ user }` |
| GET | `/admin/submissions` | – | `{ submissions:[summary] }` (already filtered to what this user may see) |
| GET | `/admin/submissions/:id` | – | `{ submission:{ id, createdTime, fields } }` (fields use Airtable column names) |
| PATCH | `/admin/submissions/:id` | `{ status }` | `{ submission:summary }` |
| GET | `/admin/team` | – | `{ users:[{id,name,email,role,active,formCode,hasPassword,setupCodeExpires,passwordSetAt}] }` |
| POST | `/admin/team` | `{ name, email, role }` | `{ user }` |
| PATCH | `/admin/team/:id` | `{ active?, role? }` | `{ user }` |
| POST | `/admin/team/:id/setup-code` | – | `{ code, expiresAt, user }` (code shown once) |

**Summary fields:** `id, fullName, nric, phone, email, plan, status, submittedAt, employmentType, maritalStatus, dateOfBirth, occupation, fieldOfWork, monthlyIncome, agentName, agentEmail`. Empty `agentName` = owner's client → show "Syakir".

**Session:** token lasts 8 hours (`expiresAt` is Unix seconds). On any **401** → clear token, back to Sign in with the message. Changing password invalidates old tokens.

**Form links:** owner `…/client-detail-form.html`, others `…/client-detail-form.html?agent=<formCode>`.

---

## 7. Security rules (must keep)

1. Store the token in memory/`sessionStorage` (current behaviour). If "stay signed in" is wanted, ask the owner first — the data is sensitive.
2. Never cache client data offline; service worker caches the shell only.
3. Never log or send client data to analytics/third parties. No third-party scripts except Google Fonts.
4. Keep a strict Content-Security-Policy like the current pages (`connect-src` only the Worker URL).
5. Temporary passwords are shown once and never stored.
6. Hide NRIC/bank by default; auto-lock (back to Sign in) when the token expires.

---

## 8. Out of scope for v1 / ideas for later

- Push notifications for new clients and birthdays (needs a backend addition).
- Email delivery of temporary passwords (currently shared by WhatsApp/copy).
- Editing client details in-app (today only status is editable).
- Owner password managed in-app (today it lives in Cloudflare secrets).

## 9. Done means

- Installable on iPhone (Safari → Add to Home Screen) and Android (Chrome install prompt).
- All screens above work for each role with the real API; agents never see another agent's clients.
- Looks right at 360–430 px wide, light and dark mode, large tap targets (44 px+).
- PDF output matches the current letterhead + watermark.
