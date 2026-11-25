# ASG Portal — screen map (round 2)

Pages live in `admin/` of the Client-Form site and share `asg.css` + `admin.js` + `icons.js`.
**Keep every existing ID.** New IDs are marked **new**.

| # | Screen | Page / script | Who | Reference (design/screens/) | IDs the JS needs |
|---|---|---|---|---|---|
| 00 | Start animation | `index.html` + `splash.js` | everyone | `P-00-Splash-to-Sign-in`, `../splash/` | new: `.splash` overlay (no IDs needed) |
| 01 | Sign in + choose password | `index.html` / `login.js` | everyone | `P-01-Sign-in` | loginForm loginBtn loginError setupForm setupBtn setupError showLogin · new: capsHint |
| 01b | Sign in → Home transition | `login.js` → `home.html` | everyone | `P-01b-Sign-in-to-Home` | uses loginBtn `data-state` busy/done/failed |
| 15 | **Home (new first tab)** | **new** `home.html` / `home.js` | all (leader/owner: switcher) | `P-15-Home`, `T-15-Home-iPad` | new: nextAppt contestCard weekStats todoList quickActions bellBtn |
| 02 | Customers | `dashboard.html` / `dashboard.js` | all (agents: own) | `P-02-Customers` | stats search agentFilter chips exportBtn rows empty pageError lastUpdated refreshBtn passwordBtn · new: selectBtn |
| 02b | Customers select + delete | same page | **owner only** | `P-02b-Select-and-delete` | new: selectAll bulkBar bulkDeleteBtn testFilter toast |
| 03 | Customer detail (sheet on phone, drawer ≥ 768) | same page | all | `P-03-Customer-detail` | scrim drawer drawerTitle drawerSub statusRow printBtn closeDrawer drawerBody printSheet · new: deleteBtn (owner), statusSaved |
| 03b | Delete confirm (action sheet) | same page | owner | `P-03b-Delete-confirm` | new: confirmSheet confirmDeleteBtn confirmCancelBtn |
| 04 | Insights | `insights.html` / `insights.js` | all | — not redesigned yet | stats agentFilter agentFilterWrap sortBy rows printBtn pageError lastUpdated |
| 05 | VB pipeline | `vb.html` / `vb.js` | all (own names) | `P-05-VB-pipeline` | stats search chips addBtn rows empty teamPanel teamRows pageError lastUpdated |
| 06 | VB prospect drawer | same page | all | follow P-03 sheet pattern | scrim drawer drawerTitle drawerSub drawerBody closeDrawer |
| 07 | Appointments | `appointments.html` | all | — not redesigned yet | viewChips calTitle prevBtn todayBtn nextBtn calendar upcoming addBtn drawer drawerBody scrim closeDrawer pageError lastUpdated |
| 08 | Presentation | `presentation.html` | all | — not redesigned yet | (unchanged, see brief) |
| 09 | Presentation answers | `answers.html` | all | — not redesigned yet | list pageError lastUpdated |
| 10 | Forms (my form link) | `forms.html` | all | pattern in `P-16c-Intro-form-link` | formLink formActions recent pageError lastUpdated |
| 11 | Team | `team.html` | owner | sidebar Team › Branch › Agent in `T-20` | members addBtn addForm addError ownerLink pageError lastUpdated |
| 12 | Setup | `setup.html` | owner | — unchanged | setupForm setupBtn setupError results hashOut secretOut |
| 13 | Client registration form | bundled page | clients | phase 2 | — |
| 14 | Quotation tool | separate repo | all | `P-14-Quotation-review` (review step) | phase 2 for the tool itself |
| 16 | **Introduction (first run, once)** | **new** `intro.html` / `intro.js` | new agents | `P-16a…d` | new: introStep introNext introBack introSkip alertsBtn formLinkCopy addNameSheet |
| 17 | **Alerts inbox** | **new** `alerts.html` / `alerts.js` | all | `P-17a-Alerts-inbox` | new: alertList markAllRead alertEmpty |
| 17b | Lock-screen pop-ups (copy spec) | Worker push payloads | — | `P-17b-Lock-screen` | — |
| 17c | **Alert settings** | **new** `alert-settings.html` | all | `P-17c-Alert-settings` | new: alertToggles quietHours deviceList testAlertBtn |
| 18 | **More tab** | **new** `more.html` | all | `P-18-More` | new: profileCard moreList signOutBtn |
| 19 | **Create sheet ("+")** | in `admin.js` (shared) | all | `P-19-Create-sheet` | new: fab createSheet |
| 20 | **Sidebar (≥ 768 px)** | in `admin.js` (shared) | all | `T-20-Sidebar-iPad` (+ dark png) | new: sidebar sbCollapse viewSwitcher cmdk |

## Status values (Customers) → pill class
| Status | Pill |
|---|---|
| Received | `.pill--neutral` |
| In Review | `.pill--soon` |
| Documents Verified | `.pill--info` |
| Approved | `.pill--ok` |
| Rejected | `.pill--now` |
| Needs Follow-up | `.pill--now` |

## VB stages → pill class
VB1 New name `.pill--neutral` · VB2 Contacted `.pill--info` · VB3 Appointment `.pill--soon` · VB4 Policy approved `.pill--ok`

## Navigation
- **Phone:** tabs Home · Customers (badge = new forms) · VB · More. "+" = Create sheet. Bell (badge = unread) on Home and Customers headers.
- **More:** Appointments · Quotations · Presentation · Presentation answers · My form link · Insights · Contests · Team (owner) · Alert settings · Help & introduction · Sign out.
- **iPad/desktop:** sidebar — Search ⌘K · Home · Alerts · *Client journey* (Customers ▸ by status, VB pipeline ▸ VB1–VB4, Appointments, Quotations, Presentation, Answers, Forms) · *Motivation & reports* (Contests "Soon", Insights, Team ▸ Branch ▸ Agent) · Settings · Sign out.
