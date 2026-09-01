# DLR-157 — Every card movement animates: one shared card-motion system

Base commit: `d65e7fe` on branch `Version-6-UX`.

- Plan: [`plan.md`](./plan.md)
- Inventory: [`card-movement-inventory.md`](./card-movement-inventory.md)
- Visual/pacing reference: [`mockup.html`](./mockup.html)

## Summary

DLR-156 built one proven card flight — a cloned card on a fixed layer, an arc, a gap that closes
only after landing, and a three-path landing race so a hidden tab can't strand the game — for
exactly one movement: the player's own play. Cards teleported everywhere else.

This ticket takes that proven mechanism and makes it the game's **only** way a card moves:

- **One shared primitive**, `useCardMotion` (renamed and generalised from `useCardFlight`),
  carrying DLR-156's landing race verbatim and adding a request list, a stagger, a flip and a
  `prefers-reduced-motion` short circuit.
- **A named-anchor registry** (`MotionAnchors.tsx` + `motionAnchorContext.ts`) so a movement names
  a *place* — `PlaceId` — rather than handing over a live element. Six of the game's movements land
  in a slot that doesn't exist until the state commits, so this replaces the app's only
  `document.querySelector` on a motion path.
- **A pure placement differ** (`cardPlacement.ts`) and **a pure planner** (`cardMotionPlan.ts`) that
  turn two consecutive `RoundState`s into a staggered, flip-aware schedule of `CardMoveRequest`s.
  No React import, no DOM access in either module.
- **One CSS token block**, `warCouncilMotion.css`, owning every duration, distance and easing a
  card movement uses.

Against the inventory's 27 rows: **seventeen movements animate**, **five are instant with a stated
reason** (the resolution-screen clone, the ledger plaque, Timebomb priming, arming a card, the slot
reels — each already has its own approved motion or isn't a place-change at all), and **four are
recorded as unreachable** (the five cut consumables, the unobtainable Shield, the eight cut
condition families, the two cut reward axes) — see the inventory's "Unreachable in play" table.

## Developer decisions — every one shipped unchosen, restated here

None of the following was chosen by this contract. Each ships as a documented placeholder; the
developer sets it by playing.

| Tunable | Ships as | What it controls |
|---|---|---|
| `--wc-flip-at` | `0.5` | AC6's in-transit-vs-on-landing call, as a 0–1 fraction of the flight. `0.5` turns the card in mid-air; `1.0` turns it as it lands. Compare both on the Quarry's play in `mockup.html`. |
| `--wc-flight-stagger` | `70ms` | The number that decides whether the deal reads as a beat or as a tax. Six cards at `70ms` is 350ms of stagger on top of the 380ms flight, every hand. |
| `PILE_COLLAPSE_THRESHOLD` (`cardMotionPlan.ts`) | `3` | Above how many cards moving into/out of one pile in a single commit, the group collapses to one representative flight instead of *n* — the reshuffle and hand-end sweep exist because of this. |
| `--wc-flight-lift` | `34px` | The arc's peak lift. Transcribed unchanged from DLR-156's literal — tunable for the first time. |
| `--wc-flight-tilt` | `4deg` | The mid-flight rotation. Same transcription. |
| **Whether seventeen animated movements is the right amount of motion at all** | — | The ticket's own risk section predicts the first playable version is too slow. Every number above is a single-pass tuning knob so this is a token pass, not a rewrite — but the judgement needs a keyboard, not a diff. |

## Verification results (real numbers, this run)

- `npx vitest run --project node` — `Test Files  145 passed (145)`, `Tests  1871 passed (1871)`.
- `npx vitest run --project dom` — `Test Files  48 passed (48)`, `Tests  449 passed (449)`.
- `npm run typecheck` — `tsc -b` exited 0, no diagnostics.
- `npm run lint` — `eslint .` exited 0, no output.
- `npm test` (unfiltered) — `Test Files  193 passed (193)`, `Tests  2320 passed (2320)`.
- `npx prettier --check src/app/warCouncil src/app/run` — exited 0, "All matched files use Prettier code style!"
- `npm run build` — exited 0; `220 modules transformed`; `dist/index.html`, `dist/assets/index-*.css` (99.15 kB), `dist/assets/index-*.js` (367.49 kB) written; `✓ built in 275ms`.
- Pure-core boundary grep (`cardPlacement.ts`, `cardMotionPlan.ts` for React/DOM references) — zero hits.
- `git status --porcelain src/warCouncil src/hunt` — no output; the engine tree is untouched.
- Token-literal escape grep — every real hit is inside `cardMotionConfig.ts`'s documented `FALLBACK_*` constants or a test fixture asserting against them; no escaped duration, distance or easing found elsewhere.
- `useCardFlight`/`CardFlight` grep — zero hits; the rename left nothing behind.
- Motion-token declaration grep — all six `--wc-flight*`/`--wc-flip-at` tokens declared exactly once, in `warCouncilMotion.css`.
- 400-line budget — every file this contract created or modified is under 400 lines. (One pre-existing, untouched file — `WarCouncilRound.duelHealthBars.test.tsx` at 402 lines — was flagged by the sweep but confirmed byte-for-byte unchanged since the base commit; not this contract's to fix.)

## Implementation notes for the reviewer

1. `MotionAnchors.tsx` was split into `MotionAnchors.tsx` (the `MotionAnchorProvider` component)
   and `motionAnchorContext.ts` (the context, `anchorKeyFor`, `useMotionAnchors`, `useMotionAnchor`
   and the two types) because `react-refresh/only-export-components` forbids a `.tsx` file
   exporting both a component and other bindings — a real, enforced lint rule, not one this
   contract disabled.
2. `cardMotionPlan.ts`'s `hide` rule is `faceAt(to) === 'down' ? 'from' : 'to'` — an arrival into a
   face-up per-card place hides the *destination* until it lands; a departure into a face-down
   stack-only pile hides the *source* until it's gone. This is what keeps AC7's reflow rule
   symmetric across both directions.
3. `BuffGallery.tsx` wraps each `BuffCard` in a bare `<span ref>` because `BuffCard.tsx` forwards no
   ref and was out of scope for this contract. That span, not the button, is the CSS grid item —
   this is a layout claim only a browser can confirm.
4. Phase 5 modelled the shop's purchase-button origin and slot-machine origin as
   `{ kind: PlaceKind.HeldTray, slot: 'offer:<item>' | 'slotMachine' }` rather than adding new
   `PlaceKind` members, to stay inside Task 14's file list. The slot-win origin is the whole
   `<main className="shop-stage">`, not a per-symbol anchor.
5. M15 (buff activation) and M21 (a slot win) are driven by a "new id since the previous render"
   effect rather than a deferred dispatch, because their commit happens outside the file the motion
   was wired into.
6. Several existing component test files gained a `MotionAnchorProvider` wrapper because
   `useMotionAnchors()` throws outside a provider. No assertion in any of them changed.

## What a browser must check — jsdom has no layout engine

None of this has been seen rendering. jsdom proves the end state is reached, the reduced-motion
path is a distinct code branch, and the differ's arithmetic is right — it cannot prove anything
about a box's actual position, a stagger's actual cadence, or whether a reflow is visible. This is
the QA browser pass's agenda, not an open-ended hunt:

- **Every movement lands on its destination's box**, at both **1440×900** and **1024×640** — the
  Quarry's play, the trick close, the refill, the deal (hand, Quarry hand, decree), the reshuffle,
  the discard swap, the Fox exchange, the Woodcutter's draw and return, the hand-end sweep, both
  buff directions, and both shop movements.
- **No gap closes mid-flight in the hand** — a departing card's slot holds its space until landing,
  never before.
- **The deal's six cards stagger rather than fire at once** — should read as a beat, not a tax, at
  the shipped `70ms`.
- **The Quarry's card flips** as part of its play, at the shipped `--wc-flip-at: 0.5` (mid-air).
  Compare against `1.0` (on landing) using the mockup's tuning rail, and confirm which reads right.
- **`prefers-reduced-motion` forced on** leaves every card in place with nothing mid-flight — no
  clone appended, no stagger, every movement resolved to its end state on the same frame.
- **Switching tabs mid-deal** (a `visibilitychange` while several staggered requests are in flight)
  still lands every card — none stranded, none duplicated.
- **The `BuffGallery` wrapper-span grid layout** — confirm the `<span ref>` wrapping each `BuffCard`
  doesn't visibly change the gallery's grid spacing or alignment now that it's the grid item instead
  of the button.
- **Whether the shop's slot-win flight reads as coming from the machine** — the origin is the whole
  `shop-stage`, not a per-symbol anchor; confirm that reads as intentional rather than vague.

## For future contributors

**A new card movement is added by teaching `placementsOf` about a new place and registering its
anchor — not by calling `move` at a new site.** Every movement except the player's own play (M1,
which stays caller-driven and pre-commit by design) is driven off the diff between two consecutive
`RoundState`s. Wiring a new movement by hand at its commit site would be exactly the
"ten implementations of the same idea" AC3 forbids.
