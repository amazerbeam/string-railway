# DLR-86 — Health as breakable hearts, with a pending-cash preview on the Quarry

**Contract:** [`plan.md`](plan.md) · [`mockup.html`](mockup.html) (approved 2026-08-16) · [`tasks.md`](tasks.md)
**Parent epic:** DLR-81 — Run slice — sequenced fights, a spendable charge, and a shop

---

## Summary

Both duel health bars stop being percentage-width tracks and become **rows of discrete hearts, one
per health point, counted from `maxHealth`** — so the Quarry's `[10, 14, 18]` progression needs no UI
change. A heart is in exactly one of four states, carried on a `data-state` attribute:

| State      | Means                                                        |
| ---------- | ------------------------------------------------------------ |
| `whole`    | survives even if the banked streak cashes right now           |
| `atRisk`   | standing, but the streak would take it — dimmed and flashing  |
| `breaking` | the trick currently on screen just took it — cracks and breaks |
| `broken`   | already gone                                                  |

The Quarry's row gains a **preview of the banked streak**: while `bank × multiplier > 0`, that many
of its last standing hearts flash, so the cash-out figure finally sits on the thing it will empty.
When the streak cashes, those same hearts at the same indices flip `atRisk → breaking` in one render.

**Retired in the same pass:** `securePct` / `pendingPct` on `HealthBarView` (dead once nothing has a
width), the `.wc-hp-track` class name (it is a row of countable glyphs, not a depletion track), and
the `--wc-hp-track` / `--wc-hp-move-ms` tokens.

### The design decision everything else follows from

The whole feature is a **pure function of committed reducer state**. No `useState`, no `useEffect`,
no ref, no timer, no `requestAnimationFrame`, no memoisation is added anywhere — so there is nothing
to release in a cleanup, nothing that double-fires under StrictMode, and no module-level state to
reset between tests.

That works because both new readings already sit in the reducer: the streak is `bank × multiplier`,
and the damage of the event on screen is `incomingFrom(ui.resolvedTrick.resolution)`. `roundReducer`
never applies damage without setting `resolvedTrick` in the same transition, so **the held reveal
*is* the damage event**. The rejected alternative — mirroring last render's health in a `useState`
and diffing it — would have duplicated state the reducer owns and decoupled the crack from the cards
that caused it.

**AC4 needed no code at all**: a cash-out zeroes bank and multiplier and sets `resolvedTrick` in one
transition, so the conversion is a single render by construction.

---

## Developer decisions outstanding

Nothing below was chosen by the pipeline. Every value is transcribed verbatim from the approved
`mockup.html`.

### The six new CSS tokens (`warCouncil.css`)

| Token                    | Shipped value                       | What it trades off                                                                              |
| ------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `--wc-hp-heart-size`     | `clamp(0.62rem, 1.5vmin, 0.95rem)`  | **Look at this one first.** The **min** bound is what decides whether the 18-heart Quarry fits; legibility against band height. |
| `--wc-hp-heart-gap`      | `0.18rem`                           | Spacing between hearts; competes with heart size for the same horizontal budget.                  |
| `--wc-hp-broken`         | `#3a4a52`                           | The empty-socket colour.                                                                          |
| `--wc-hp-atrisk-opacity` | `0.55`                              | How far a previewed heart dims. Too low and the preview vanishes; too high and it reads as damage already dealt. |
| `--wc-hp-break-ms`       | `520ms`                             | One-shot break duration. Pacing: the crack only lives as long as the trick reveal is held, so a slow value can be tapped past. |
| `--wc-hp-flash-ms`       | `900ms`                             | One at-risk flash cycle.                                                                          |

### Glyphs and copy

- **Both `<symbol>` path shapes in `HeartMark.tsx`** — placeholders transcribed from `mockup.html`.
  Judge by eye at final rendered size. The constraint they must keep: whole and broken are two
  genuinely different *shapes*, not one shape in two colours, because that is what carries state
  without relying on colour.
- **The at-risk sentence wording in `labels.ts`** (`"10 of 10. 6 at risk."`) — and, more than the
  wording, **whether the preview should be announced to assistive tech at all**. This contract says
  yes, on the grounds that a meter's text should not be less true than its picture. The brief asked
  for neither, so it is an assumption worth confirming or overturning.

### Three questions only playing answers

- **Do the at-risk hearts read as *pending*, or as damage already dealt?** This is the reading DLR-80
  removed when it retired the bars' pending segment, reintroduced deliberately in a different
  grammar. It has one right answer and a cheap measurement: **ask a player mid-hand what the flashing
  hearts will do.**
- **Does the break beat feel punchy or missed?** The crack is on screen only while the trick reveal
  is held, and clears on the same tap that clears the reveal. That is a deliberate pacing choice —
  the consequence sits with its cause — but a player who taps through fast gets a very short
  animation.
- **Are 18 hearts legible?** QA measured **11.5 × 11.5 px** per heart at 1366×768 (screenshot in the
  QA report). If the answer is no, the fallback is a grouped or two-row treatment — a redesign and a
  separate ticket, not a fix inside this one.

Also: **`the-hunt.md` §9's open question — "whether the player's health bar reads well at 10 in
1-point steps" — is answered *in kind* but not settled.** Hearts are the treatment a small integer
count calls for; whether they actually read better is a play observation. The entry stays open until
someone plays it, and `implementation-doc-writer` retires it after, not before.

---

## Verification

| Gate                                              | Result                                            |
| ------------------------------------------------- | -------------------------------------------------- |
| `npm run typecheck`                               | exit 0, no errors                                  |
| `npm run lint`                                    | exit 0, 0 warnings                                 |
| `npm test` (unfiltered)                           | **`Test Files 41 passed (41)` · `Tests 492 passed (492)`** |
| `npx vitest run --project node`                   | `Test Files 28 passed (28)` · `Tests 414 passed (414)` |
| `npx vitest run --project dom`                    | `Test Files 13 passed (13)` · `Tests 78 passed (78)` |
| `npx prettier --check` (7 changed files)          | "All matched files use Prettier code style!"       |
| `npm run build`                                   | exit 0 in 2.54s — CSS 20.85 kB, JS 225.65 kB       |

**Reviewers:** Code-Evaluator `APPROVED`, Defender `APPROVED` (0 critical / 0 warning / 0 info), QA
`ALL PASSED` — all three on the first round, no fix pass required.

### QA's browser verification

Driven live at **1920×1080**, **1366×768** and **500×844**. No document scroll and a clean console at
all three. The 390×844 case specified by the contract could not be reached — the browser tooling
clamped the window to ~500 px wide on this machine — so **390 px remains unverified**.

- Heart counts are config-driven end to end: 10 a side at fight 1, **14** on the Quarry at fight 2,
  **18** at fight 3 — never a literal in the diff.
- At multiplier 1 the Quarry showed exactly one `atRisk` heart, `aria-valuetext` reading
  `10 of 10. 1 at risk.`
- On the cash: Quarry 10 `breaking` / 0 `atRisk` in the same read, player row broke one heart,
  `aria-valuenow` 10 → 9, bank meter reset to multiplier 0 in the same beat.

**AC7 (`prefers-reduced-motion`) is held by static review of the stylesheet, not by a test** — jsdom
evaluates no media query. The block sets `animation: none` on exactly the two animated states and
pins `breaking` to the colour its keyframe would have landed on.

---

## For future contributors: two string-bound surfaces

Both rename cleanly through TypeScript and fail **silently** at runtime:

1. **`data-state` values on `.wc-hp-heart`** bind `HeartState` in `duelHealthBars.ts` to the
   attribute selectors in `warCouncilHealthBars.css`. Includes the camelCase in `atRisk`. A miss
   renders an unstyled heart.
2. **`<symbol>` ids** bind `HEART_SYMBOL_ID` to the sheet in `HeartMark.tsx`. A miss renders an empty
   `<svg>` with no console error anywhere.

The `as const` map and its one consumer are the only two places either may be written — the same rule
`SUIT_SYMBOL_ID` in `SuitMark.tsx` already carries.

---

## Files changed

**Created**
- `src/app/warCouncil/HeartMark.tsx` (58)

**Modified**
- `src/app/warCouncil/duelHealthBars.ts` (136)
- `src/app/warCouncil/DuelHealthBars.tsx` (77)
- `src/app/warCouncil/WarCouncilRound.tsx`
- `src/app/warCouncil/labels.ts`
- `src/app/warCouncil/warCouncilHealthBars.css` (172)
- `src/app/warCouncil/warCouncil.css` (398)

**Tests**
- `src/app/warCouncil/__tests__/duelHealthBars.test.ts` (129)
- `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx` (110)
- `src/app/warCouncil/__tests__/labels.test.ts`
- `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx` (281)

**Docs** (by `implementation-doc-writer`, not by hand)
- `.docs/implementation/README.md`
- `.docs/implementation/war-council-ui/README.md`, `duel-health-bars.md`, `accessibility.md`,
  `layout-and-styling.md`
- `.docs/game_rules/the-hunt.md` — §9's visibility row, two Status-register rows, two Known-tensions
  entries

No `package.json`, `tsconfig`, `vite.config.ts` or ESLint change. **No new runtime dependency** — the
glyphs are inline SVG in the existing `SuitMark` house pattern.
