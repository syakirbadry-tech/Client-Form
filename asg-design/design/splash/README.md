# Start animation → Sign in

Files: `splash.html` (reference wiring), `splash.css` (timeline), `splash.js` (hand-over logic). Needs `../asg.css` tokens.
Approved on the canvas: artboard **A · Start animation → Sign in**. PNG: `../screens/png/P-00-Splash-to-Sign-in.png`.

## Idea
The logo is built from three letters: **A** = left leg, **S** = gold centre, **G** = right leg. The letters rise, then each melts into its stroke; the finished mark glides up and *becomes* the Sign-in logo. The same gold sheen is the app's "working" signal everywhere (button busy, skeletons, route line).

## Timeline (runs once, ≈ 4.5 s, skippable)
| Time | What happens |
|---|---|
| 0.0 s | Plain launch screen (iOS launch image stays plain — Apple: don't advertise on launch) |
| 0.0–0.5 s | Letters A, S, G rise in one by one; caption "A · S · G" |
| 0.6–2.0 s | A → left stroke, S → gold centre, G → right stroke. Each draws its outline, then fills |
| 2.0–2.6 s | Sheen sweeps the mark; "ASG ANSAR GROUP · AGENT PORTAL" fades in |
| 3.2–4.0 s | Wordmark fades; mark shrinks to 42 % and glides 212 px up → the Sign-in logo |
| 3.5–4.4 s | Sign-in title, then the card (+0.2 s) slide up into place |

## Hand-over
| State | Destination |
|---|---|
| Signed out | Stays on Sign in (the splash ends on its layout) |
| First sign-in (just chose password) | Introduction (`design/screens/P-16a…d`) |
| Signed in | Home — mark glides to the header (see `P-01b-Sign-in-to-Home`) |

## Rules
- Tap anywhere = jump to the end state. Never hold the app longer than **6 s**.
- Session check slower than 3 s → the sheen loops as the loader and "Connecting…" appears.
- Offline → "You're offline. Showing what was saved." + Retry.
- `prefers-reduced-motion` → no letters, no flight: Sign in fades in over 0.2 s.
- Restore the previous screen when the app restarts (Apple `launching.md`), so the splash only plays on a cold start.

## Sign in → Home (after correct ID)
≈ 2.5 s: button presses → "Signing in…" with a gold-edged spinner → green with a drawn tick "Welcome back, Aina" → card slides down → mark glides from the top centre to the Home header's top-left (translate −151 px, −38 px, scale .455) → greeting, next-appointment card, contest card and "This week" rise in 150 ms apart → tab bar slides up → "+" pops in last.
Wrong password: no transition; the card shakes (`.btn[data-state="failed"]`) and the error shows above the button.
