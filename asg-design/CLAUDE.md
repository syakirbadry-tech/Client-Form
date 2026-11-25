# CLAUDE.md — ASG Portal (staff app) rules for Claude Code

Read this before every change. Then `HANDOVER.md`, then `docs/SCREEN-MAP.md`.

## What this is
The private staff portal of **ASG Ansar Group**, a Prudential BSN Takaful agency in Sungai Petani, Kedah. Agents run the whole client journey in it: VB pipeline → appointments → quotation → presentation → client form → application tracking. We are turning it into an installable **phone-first web app (PWA)** that also works on iPad and desktop.

Owner/approver: **Syakir** ("the Chairman"). Roles: **Owner** (everything + Team + delete customer), **Leader** (all clients), **Agent** (own clients only). Clients never sign in.

## Hard rules (from the original brief — do not break)
1. **Stack:** plain HTML + CSS + vanilla JavaScript on GitHub Pages. **No React, no Tailwind, no framework, no build step.** One shared stylesheet (`asg.css`, replaces `admin.css`), one shared `admin.js`, one `.html` + `.js` per page.
2. **Keep the element IDs** each page's JS uses (`docs/SCREEN-MAP.md`). If an ID must change, record it in `docs/CLASS-MAP.md`.
3. **No server/API changes** (Cloudflare Worker `/admin/*`) and no role changes. The only new endpoint is **delete customer** (owner only) — add it, nothing else.
4. **Brand:** it is the *agency's* app. Never make it look like Prudential BSN's official app or site. The PRUBSN logo appears **only** on client-facing pages (client form, quotation, presentation). No slogans or product claims in the staff portal.
5. **Privacy (PDPA):** dummy data only in designs, tests and screenshots, marked "(demo)". Mask NRIC in lists (`900101-14-••••`); show it in full only in the customer detail. **Notifications: first names and plan names only** — never NRIC, phone, income or amounts.
6. **Formats:** money `RM 1,234.50` · date `24 Nov 2026` · time `11:15 am` · zone `Asia/Kuala_Lumpur` · phone `012-345 6789` · NRIC `900101-14-5678`.
7. **Language:** English now; leave ~30 % room for Bahasa Melayu labels (no fixed-width text boxes).
8. **Accessibility:** tap targets ≥ 44 px; inputs 16 px (no iOS zoom); WCAG AA contrast; visible focus ring; real `<button>`/`<a>`/`<label>`; `aria-label` on icon-only buttons; respect `env(safe-area-inset-*)`; honour `prefers-reduced-motion`.
9. **Fonts:** Google Fonts, free for commercial use: IBM Plex Sans (UI), Playfair Display (page titles only), Poppins (the "ASG ANSAR GROUP" wordmark only).

## Design rules (approved in Claude Design, Direction A "Calm Teal")
- **Use `design/asg.css` tokens and classes.** No raw hex in page CSS; add a token if one is missing.
- **One primary colour: teal `--primary`.** Gold is a highlight only (goal/contest bars, logo, "Suggested" tag) — never a button, never text on a light background.
- **Status = 5 pairs everywhere** (`.pill--neutral|soon|info|ok|now`). Never colour alone: always a word too.
- **Light + dark follow the device** (`prefers-color-scheme`). No in-app theme toggle.
- **One primary button per screen.** Job pages swap the tab bar for `.actionbar` (More · secondary · one primary).
- **Phone navigation:** tab bar with **4 tabs** — Home · Customers · VB · More. Tabs navigate, never act. A separate round **"+"** (`.fab`) opens the Create sheet. Badges are numbers.
- **iPad (≥ 768 px) and desktop:** the tab bar becomes the **sidebar** (`.sidebar`), collapsible to a 76 px icon rail, with the "Viewing: All agents ▾" switcher (owner/leader) and ⌘K search.
- **Every table becomes a two-line list on the phone** (`.li`).
- **Sheets:** one at a time, grabber, swipe/✕ to close, Cancel beside any Done. Destructive actions use the **action sheet**: destructive button on top, Cancel at the bottom, then a toast.
- **Icons:** `design/icons.js` only (one stroke family). **No emoji** anywhere in the UI.
- **Motion:** 150–300 ms, `--ease-out`; one feedback language (gold sheen/spinner = working → green tick = saved). Never animate on frequent actions.
- **Copy:** labels say what happens ("Create client link", "Delete customer"); errors say what went wrong and how to fix it; empty states invite the next action.

## How to work
- Small, reviewable commits per page. Test at **375 px, 390 px, iPad 1194×834 and 1440 px**, light **and** dark, with reduced motion on.
- Compare every page with its PNG in `design/screens/png/` and its reference HTML in `design/screens/`.
- Before calling a page done, run the checklist at the bottom of `HANDOVER.md`.
- Ask Syakir before: changing a flow, adding a dependency, or anything touching real client data.
