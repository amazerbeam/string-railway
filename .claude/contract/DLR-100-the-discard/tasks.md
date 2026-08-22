# Tasks: The Discard — swap cards from hand between tricks

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox
> (`- [ ]`) syntax for tracking.

> **Note:** This ticket touches UI (`src/app/warCouncil/`), so `plan.md`'s own Step 3.5 calls for an
> interactive mockup before the approval gate. The developer approved `plan.md` directly at the
> single-question gate without one being built. Flagged here so `/fb-apply`'s reviewers know the
> rail control's layout and copy are placeholder, judged only by the developer once Phase 5 lands.

Status: COMPLETE
Started: 2026-08-22

**Goal:** Give the player a between-tricks action that swaps up to `MAX_CARDS_PER_DISCARD` cards
from hand for the same number drawn blind from the pile, spendable up to `DISCARDS_PER_FIGHT` times
per fight (chainable), including before the Quarry's own lead is chosen.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/warCouncil/discard.ts` — the pure swap, its refusal enum, its stock interface
- `src/warCouncil/__tests__/discard.test.ts` — AC10's engine-level coverage
- `src/app/warCouncil/DiscardPlate.tsx` — the felt-rail control
- `src/app/warCouncil/__tests__/DiscardPlate.test.tsx` — the control's disabled/refusal/commit states
- `src/app/warCouncil/warCouncilDiscard.css` — the control's stylesheet
- `src/app/warCouncil/__tests__/roundReducer.discard.test.ts` — AC10's reducer-level coverage
  (chaining, refusals, the void-in-suit widening case)
- `src/hunt/__tests__/run.discard.test.ts` — the per-fight budget across `advanceRun`/`recordEncounter`

**Modified:**
- `src/hunt/config.ts` — add `DISCARDS_PER_FIGHT`, `MAX_CARDS_PER_DISCARD`
- `src/hunt/index.ts` — barrel-export the two new constants
- `src/hunt/run.ts` — `RunState.discardsRemaining`, `startRun` seeds it
- `src/hunt/runTransitions.ts` — `advanceRun` resets it, `recordEncounter` gains it as a required parameter
- `src/warCouncil/index.ts` — barrel-export `DiscardRefusal`, `discardRefusalFor`, `applyDiscard`, `DiscardStock`
- `src/app/warCouncilMount.ts` — `WarCouncilMountProps.discardsRemaining`, `WarCouncilRoundResult.discardsRemaining`
- `src/App.tsx` — pass `discardsRemaining` into the mount and into `recordEncounter`
- `src/app/warCouncil/roundUiState.ts` — `RoundUiState`/`RoundUiSeed` fields, two new action kinds,
  `discardSelecting`/`discardWindowOpen`/`discardStock` predicates, `createRoundUiState` seeding
- `src/app/warCouncil/roundReducer.ts` — `handleTapDiscard`/`handleCancelDiscard`/`toggleDiscardCard`,
  `applyAction`'s new cases, `handleTapCard`'s new first branch, mutual-exclusion guards on
  `handleTapCheat`/`handleTapEnvenom`
- `src/app/warCouncil/HandFan.tsx` — `discardSelecting`/`discardSelection` props, `illegal`/`isFocusable`
  relaxation, `discardSelected` passed to `PlayingCard`
- `src/app/warCouncil/PlayingCard.tsx` — `discardSelected` prop, marker span, `aria-pressed` fold-in
- `src/app/warCouncil/labels.ts` — `DISCARD_RAIL_LABEL`, two hint strings, `DISCARD_REFUSAL_MESSAGE`, `discardAccessibleName`
- `src/app/warCouncil/roundHint.ts` — new cascade branch for `discardSelection`
- `src/app/warCouncil/WarCouncilRound.tsx` — mount wiring, `handInteractive`, renders `DiscardPlate`,
  imports the new stylesheet

**Deleted:** (none)

**Developer decides or observes:**
- The discard window's exact boundary (closed while a trick reveal is held, open again once
  `CarryOn` clears it, including before the Quarry's own lead) — confirm this matches intent; see
  `plan.md` → Risks.
- Whether chaining should require a second tap to re-arm, or reopen automatically after a commit —
  see `plan.md` → Risks.
- All placeholder copy: `DISCARD_RAIL_LABEL`, `DISCARD_SELECT_HINT`, `DISCARD_READY_HINT`, the three
  `DISCARD_REFUSAL_MESSAGE` sentences.
- All visual values: the discard-selected marker's glyph/colour, the rail control's glyph, any
  `clamp()` bounds the felt rail needs now that it holds four controls.
- `DISCARDS_PER_FIGHT = 3` and `MAX_CARDS_PER_DISCARD = 3` are shipped as specified — not a
  decision for this contract, but the values to watch and retune after play per the design doc's
  own instruction.
- Re-measure `roundReducer.ts` and `roundUiState.ts` line counts at the end of Phase 4; split
  further only if either has crossed 400 (see `plan.md` → Risks).

---

## Phase 1 — Config constants and the pure engine module

Establishes `DISCARDS_PER_FIGHT`/`MAX_CARDS_PER_DISCARD` and the swap itself as a self-contained,
DOM-free unit with its own refusal predicate — nothing outside `src/warCouncil/` and `src/hunt/`
changes in this phase, so it type-checks and is fully covered by its own tests before anything
touches `RunState` or the UI.

### Task 1: Add the two config constants ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/config.ts`
- Config: `src/hunt/config.ts` — add `DISCARDS_PER_FIGHT`, `MAX_CARDS_PER_DISCARD`

- [x] **Step 1: Append the two constants at the end of `src/hunt/config.ts`**

```ts
// DLR-100 D4/D5 (the-discard.md) — the discard's two figures. BOTH PROVISIONAL, the developer's
// values set 2026-08-19, explicitly expected to move after play — the design doc's own words:
// "ship it, play it, move it." Two separate keys, not one shared number, because they answer
// different questions — how many TIMES per fight vs how BIG one throw can be — and retuning one
// must not accidentally move the other.
// UNIT: DISCARDS_PER_FIGHT — discard actions per fight, reset by advanceRun at every fight
// boundary. MAX_CARDS_PER_DISCARD — cards per single discard action.
export const DISCARDS_PER_FIGHT = 3
export const MAX_CARDS_PER_DISCARD = 3
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Barrel-export the two constants from `src/hunt/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/index.ts`

- [x] **Step 1: Add `DISCARDS_PER_FIGHT, MAX_CARDS_PER_DISCARD` to the existing `export { ... } from './config'` list**

Insert alongside `CHEAT_SLOT_COUNT`/`WHETSTONE_PRICE` in the same export statement.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 3: Write the failing tests for `src/warCouncil/discard.ts` ✓

- Skill: react-frontend

**Files:**
- Test: `src/warCouncil/__tests__/discard.test.ts`

- [x] **Step 1: Write `src/warCouncil/__tests__/discard.test.ts`** covering:
  - `applyDiscard` removes exactly the discarded cards from the hand and returns a hand of the
    same length (AC2/AC10 "swap preserving hand size") — build a fixture `RoundState` (reuse the
    shape `deal.test.ts`/`abilities.test.ts` already construct) with a known hand and a known
    `drawPile`, discard 2 cards, assert `result.hands[side].length === before.hands[side].length`
    and that the drawn cards (the first 2 of `drawPile`) are now in hand.
  - Discarded cards land at the bottom of `drawPile`, in the order discarded, and `drawPile.length`
    is unchanged (AC3/AC10 "discards going to the bottom of the pile") — assert
    `result.drawPile.slice(-2)` equals the discarded cards and `result.drawPile.length ===
    before.drawPile.length`.
  - `applyDiscard` throws a `RangeError` when `discarded.length` is 0 or exceeds
    `MAX_CARDS_PER_DISCARD`, and when a discarded card is not in `side`'s hand.
  - `discardRefusalFor` returns `DiscardRefusal.NotAvailable` when `windowOpen` is `false`,
    regardless of the other fields.
  - `discardRefusalFor` returns `DiscardRefusal.NoDiscardsRemaining` when `windowOpen` is `true`
    and `discardsRemaining <= 0`.
  - `discardRefusalFor` returns `DiscardRefusal.EmptySelection` when `windowOpen` is `true`,
    `discardsRemaining > 0`, `selecting` is `true`, and `selectionSize <= 0`.
  - `discardRefusalFor` returns `null` when `windowOpen` is `true`, `discardsRemaining > 0`, and
    either `selecting` is `false` or `selectionSize > 0`.
  - **AC10's void-in-suit case**: build a hand holding every card of one suit, discard all of them,
    then assert `legalMoves` (imported from `./legalMoves`) on a `RoundState` led by that suit
    returns the player's whole hand rather than an empty-then-fallback set that happens to look the
    same — i.e. assert directly that none of the returned legal cards are of the discarded suit
    unless the drawn replacements happened to include one, by discarding a suit and independently
    asserting `cardsOfSuit(resultHand, discardedSuit).length` before calling `legalMoves`, then
    calling `legalMoves` and asserting it returns `resultHand` in full when that count is 0.

Run: `npx vitest run src/warCouncil/__tests__/discard.test.ts`
Expected: fails — `discard.ts` does not exist yet (`Cannot find module './discard'` or equivalent).

Confirmed: `Error: Cannot find module '../discard' imported from
.../src/warCouncil/__tests__/discard.test.ts` — 1 failed suite, no tests.

### Task 4: Implement `src/warCouncil/discard.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/discard.ts`

- [x] **Step 1: Write the module**

```ts
import { MAX_CARDS_PER_DISCARD } from '../hunt'
import { containsCard, removeCard } from './cardUtils'
import type { Card, PlayerSide, RoundState } from './types'

/**
 * DLR-100 AC9 — why the discard rail cannot be tapped, or cannot yet commit. A reason CODE, not a
 * sentence: `src/warCouncil/` holds no user-facing copy, and `src/app/warCouncil/labels.ts` maps
 * these to words. Exactly `voluntaryCashOut.ts`'s `ApplyDamageRefusal`, `src/hunt/flask.ts`'s
 * `FlaskRefusal`, and `src/hunt/shop.ts`'s `PurchaseRefusal`.
 */
export const DiscardRefusal = {
  /** AC1 — mid-trick, a reveal is held, a prompt is open, or the hand/fight is over. */
  NotAvailable: 'notAvailable',
  /** AC5 — the per-fight budget is spent. */
  NoDiscardsRemaining: 'noDiscardsRemaining',
  /** AC9 — the selection mode is open but nothing has been toggled in yet. */
  EmptySelection: 'emptySelection',
} as const
export type DiscardRefusal = (typeof DiscardRefusal)[keyof typeof DiscardRefusal]

/**
 * Everything the rule needs and nothing else — PLAIN VALUES, never a `RoundUiState`.
 * `applyDamageStock`'s own discipline: this module owns the rule and must not learn the shape of
 * the layer that calls it. `roundUiState.ts`'s `discardStock` builds it.
 */
export interface DiscardStock {
  readonly discardsRemaining: number
  /** Whether the selection mode is currently open. `EmptySelection` only fires while this is
   *  `true` — otherwise "nothing chosen yet" would refuse the rail control before it has ever
   *  been tapped. */
  readonly selecting: boolean
  readonly selectionSize: number
  /** AC1 — the moment is right: not mid-trick, no reveal held, no prompt open, hand and fight both
   *  still live. Independent of whose turn it is — `roundUiState.ts`'s `discardWindowOpen` is what
   *  reaches the Quarry-to-lead gap. */
  readonly windowOpen: boolean
}

/**
 * THE single statement of whether the discard rail is available — read by the reducer before it
 * commits anything, and by the rail control to disable itself and print the reason. `windowOpen`
 * first, because it is true of the whole felt rather than of this control, mirroring
 * `applyDamageRefusalFor`'s own stated ordering.
 */
export function discardRefusalFor(stock: DiscardStock): DiscardRefusal | null {
  if (!stock.windowOpen) return DiscardRefusal.NotAvailable
  if (stock.discardsRemaining <= 0) return DiscardRefusal.NoDiscardsRemaining
  if (stock.selecting && stock.selectionSize <= 0) return DiscardRefusal.EmptySelection
  return null
}

/**
 * AC2/AC3 — the swap. `n` cards out of `side`'s hand, the same `n` off the FRONT of `drawPile`,
 * the discarded cards appended to its BACK — `applyWoodcutterDraw`'s own convention, generalised
 * from one card to n. `drawPile.length` is invariant across the call.
 *
 * THROWS rather than returning the state unchanged, the discipline `envenomCard` and `cheats.ts`'s
 * `addCheat` already set: a silent no-op would let the caller spend a discard for a swap that never
 * happened. The reducer guards every precondition before calling — a reducer must not throw,
 * because a throw during an event handler unmounts the tree — so reaching either throw here is a
 * driver bug.
 */
export function applyDiscard(
  state: RoundState,
  side: PlayerSide,
  discarded: readonly Card[],
): RoundState {
  if (discarded.length === 0 || discarded.length > MAX_CARDS_PER_DISCARD) {
    throw new RangeError(
      `Cannot discard ${discarded.length} cards — must be 1 to ${MAX_CARDS_PER_DISCARD}`,
    )
  }
  const missing = discarded.find((c) => !containsCard(state.hands[side], c))
  if (missing) {
    throw new RangeError(
      `Cannot discard the ${missing.rank} of ${missing.suit} — it is not in the ${side}'s hand`,
    )
  }
  const drawn = state.drawPile.slice(0, discarded.length)
  const handAfterRemoval = discarded.reduce((hand, c) => removeCard(hand, c), state.hands[side])
  return {
    ...state,
    hands: { ...state.hands, [side]: [...handAfterRemoval, ...drawn] },
    drawPile: [...state.drawPile.slice(discarded.length), ...discarded],
  }
}
```

- [x] **Step 2: Run the discard spec and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/discard.test.ts; npm run typecheck`
Expected: Vitest reports every case passing, 0 failed; typecheck exits 0.

Confirmed: `Test Files  1 passed (1)`, `Tests  11 passed (11)`; typecheck exits 0.

### Task 5: Barrel-export the new module from `src/warCouncil/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/index.ts`

- [x] **Step 1: Add the export, beside the `voluntaryCashOut.ts` exports it sits next to**

```ts
export { DiscardRefusal, discardRefusalFor, applyDiscard } from './discard'
export type { DiscardStock } from './discard'
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — The per-fight budget on `RunState`

Wires `discardsRemaining` through `startRun`, `advanceRun`, and `recordEncounter` exactly as
`cheats`/`envenomCharges`/`poisonGuardHeld` already are. `App.tsx`'s one `recordEncounter` call site
is updated in the same task that widens the signature, so the phase ends with `src/hunt/` and
`src/App.tsx` both type-checking and internally consistent — no UI surfaces this yet.

### Task 6: Add `RunState.discardsRemaining` and seed it in `startRun` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/run.ts`

- [x] **Step 1: Add the field to `RunState`, directly after `handOfFight`**

```ts
  /** DLR-100 AC5 — the discard's per-fight budget. Carried across every hand within a fight,
   *  exactly as `cheats` and `envenomCharges` are — NOT on `EncounterState`, which `advanceRun`
   *  re-seeds. Reset to `DISCARDS_PER_FIGHT` by `startRun` and by `advanceRun`; carried through
   *  `recordEncounter`'s spread otherwise, because the hand owns it for its life and hands the
   *  survivor back through `WarCouncilRoundResult`, exactly as `cheats` and `envenomCharges` do.
   *  NEVER persisted, exactly as `coins` above. */
  readonly discardsRemaining: number
```

- [x] **Step 2: Import `DISCARDS_PER_FIGHT` and seed it in `startRun`'s returned object**

Add `DISCARDS_PER_FIGHT` to the existing `import { ... } from './config'` line. Add
`discardsRemaining: DISCARDS_PER_FIGHT,` to `startRun`'s return, beside `flaskCharges`.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: fails — `advanceRun`/`recordEncounter` in `runTransitions.ts` do not yet supply
`discardsRemaining`, and `App.tsx`'s `recordEncounter` call is one argument short. Confirms the
compiler is enumerating every call site (this task's whole point); Task 7 fixes it.

Actual: exits 0 — does NOT fail. `advanceRun` and `recordEncounter` both build their result via
`{ ...run, ... }` spreads over an existing `RunState`, so the new required field flows through
untouched without either function needing to name it explicitly. Only `startRun` constructs a
`RunState` object literal from scratch, and that already seeds the field. Confirmed and continuing
per the framing instruction to report the actual state rather than force the predicted failure.

### Task 7: Reset the budget in `advanceRun`, thread it through `recordEncounter` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/runTransitions.ts`

- [x] **Step 1: `advanceRun` — add `discardsRemaining: DISCARDS_PER_FIGHT,` to the returned object**, beside `handOfFight: 1`. Add `DISCARDS_PER_FIGHT` to the existing `import { ... } from './config'` line.

- [x] **Step 2: Widen `recordEncounter`'s signature** — insert `discardsRemaining: number,` as a new
required parameter between `poisonGuardHeld: boolean,` and `unplayedCards: number | null,`. Update
the docblock: renumber `unplayedCards`'s "sixth parameter" to "seventh parameter", and add a line
for `discardsRemaining` documenting it as the sixth, following the same pattern the docblock already
uses for `cheats`/`envenomCharges`/`poisonGuardHeld` ("the hand owns it for its lifetime and hands
the survivors back through `WarCouncilRoundResult`").

- [x] **Step 3: Add `discardsRemaining,` to `recordEncounter`'s returned spread**, beside `cheats,`
and `envenomCharges,` — carried through unchanged, exactly as those two are.

- [x] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: fails — `App.tsx`'s `recordEncounter` call is still one argument short. Task 8 fixes it.

Actual: fails, but with a much larger error set than predicted — 38 `TS2554: Expected 7 arguments,
but got 6` errors across `src/App.tsx` AND six pre-existing test files
(`src/hunt/__tests__/envenom.test.ts`, `poisonGuard.test.ts`, `run.flask.test.ts`,
`run.integration.test.ts`, `run.quickKill.test.ts`, `run.test.ts`, `run.whetstone.test.ts`) that
all call `recordEncounter` with the old 6-argument signature. **This contradicts the contract's own
Config and persisted-shape audit** ("Its one call site … is in scope … No other call site exists")
— flagged as a planner defect; see Implementer Report.

### Task 8: Update `App.tsx`'s `recordEncounter` call ✓

- Skill: react-frontend

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: Add `result.discardsRemaining,` to `handleComplete`'s `recordEncounter` call**,
between `result.poisonGuardHeld,` and `result.unplayedAtResolve,`.

Note: `result` is `WarCouncilRoundResult`, whose `discardsRemaining` field does not exist until
Phase 3 — this task alone will not typecheck clean. That is expected; Task 8's typecheck runs at
the end of Phase 3 instead (its own Task 11), once `WarCouncilRoundResult` has the field this call
needs. Leave this edit in place.

- [x] **Step 2: No standalone verification for this task** — folded into Phase 3's Task 11
typecheck, since `App.tsx` cannot compile clean until `WarCouncilRoundResult` is widened.

### Task 9: Write and run the per-fight budget tests ✓

- Skill: react-frontend

**Files:**
- Test: `src/hunt/__tests__/run.discard.test.ts`

- [x] **Step 1: Write `src/hunt/__tests__/run.discard.test.ts`**, following the shape of the
existing `run.flask.test.ts`/`run.whetstone.test.ts` siblings, covering:
  - `startRun().discardsRemaining === DISCARDS_PER_FIGHT`.
  - `recordEncounter` with a `discardsRemaining` argument lower than `DISCARDS_PER_FIGHT` (a hand
    that spent one or more) carries that lower figure onto the returned `RunState`.
  - `advanceRun` on a run whose `discardsRemaining` was spent down resets it to
    `DISCARDS_PER_FIGHT` on the new fight.
  - `recordEncounter` on a run whose fight is NOT over (the encounter unresolved) still carries the
    spent-down figure through — the reset is `advanceRun`'s alone, not `recordEncounter`'s,
    matching how `handOfFight` is reset only by `advanceRun`/`startRun`.

Run: `npx vitest run src/hunt/__tests__/run.discard.test.ts; npm run typecheck`
Expected: Vitest reports every case passing, 0 failed; typecheck exits 0 across the whole project
(this is the point Task 8's edit finally typechecks — `WarCouncilRoundResult` from Phase 3 must
land first if these are run out of order; run this after Phase 3 if Phase 3 has not yet landed).

Actual: Vitest — `Test Files  1 passed (1)`, `Tests  4 passed (4)`. Typecheck — exits 2 with 39
errors, as expected per this phase's own design (Phase 3 has not landed). NOTE: a chunk of those
errors are NOT closed by Phase 3 at all — 37 of the 39 are the six pre-existing test files
(`envenom.test.ts`, `poisonGuard.test.ts`, `run.flask.test.ts`, `run.integration.test.ts`,
`run.quickKill.test.ts`, `run.test.ts`, `run.whetstone.test.ts`) calling `recordEncounter` with its
OLD 6-argument signature — a planner defect the Config and persisted-shape audit missed and no
later phase's file map lists. See Implementer Report.

---

## Phase 3 — Mount-prop plumbing

Widens `WarCouncilMountProps`/`WarCouncilRoundResult` and threads `discardsRemaining` through the
mount boundary and `RoundUiState`'s own seed — pure plumbing, no new interaction yet. Ends with the
whole project type-checking clean, including Phase 2's Task 8 edit.

### Task 10: Widen `WarCouncilMountProps` and `WarCouncilRoundResult` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncilMount.ts`

- [x] **Step 1: Add to `WarCouncilMountProps`**, directly after `poisonGuardHeld`:

```ts
  /** DLR-100 AC5 — discards remaining at the START of this hand. Same contract as `envenomCharges`
   *  above: an opening figure the reducer owns for the hand's life and hands back through
   *  `WarCouncilRoundResult`. REQUIRED rather than optional so the compiler enumerates every mount
   *  site instead of letting one silently render an inert rail. */
  readonly discardsRemaining: number
```

- [x] **Step 2: Add to `WarCouncilRoundResult`**, directly after `poisonGuardHeld`:

```ts
  /** DLR-100 AC5 — discards remaining after this hand. One fewer for each discard spent; the run
   *  adopts it through `recordEncounter`'s sixth parameter. */
  readonly discardsRemaining: number
```

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: fails — `App.tsx`'s `<WarCouncilRound>` JSX is missing the now-required
`discardsRemaining` prop, and `WarCouncilRound.tsx`'s `onComplete` call is missing the field on its
result object. Task 11 fixes both.

Confirmed: fails as expected, plus — beyond `App.tsx` and `WarCouncilRound.tsx` — five
`WarCouncilRound.*.test.tsx` files under `src/app/warCouncil/__tests__/` that mount
`<WarCouncilRound>` directly also now fail with the same `discardsRemaining` missing-property error.
These are NOT among the six `src/hunt/__tests__/` files this phase was told to fix, and no task in
this file lists them as Modified. Flagged as a further planner gap in the Implementer Report rather
than fixed here, per this phase's own instruction to report unexpected errors rather than guess at a
fix outside the named scope.

### Task 11: Wire `discardsRemaining` through `App.tsx` and `WarCouncilRound.tsx`'s mount boundary ✓

- Skill: react-frontend

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`

- [x] **Step 1: `App.tsx`** — add `discardsRemaining={run.discardsRemaining}` to the
`<WarCouncilRound>` JSX props, beside `poisonGuardHeld={run.poisonGuardHeld}`.

- [x] **Step 2: `WarCouncilRound.tsx`** — destructure `discardsRemaining` from
`WarCouncilMountProps` in the component's parameter list, beside `poisonGuardHeld`. Add
`discardsRemaining` to the `useReducer` seed object passed to `createRoundUiState`, beside
`poisonGuardHeld`. Add `discardsRemaining: ui.discardsRemaining,` to both `onComplete` calls in
`handleCarryOn` (the `encounterOver` early-return branch and the `roundComplete` branch), beside
`poisonGuardHeld: ui.poisonGuardHeld,`.

Note: `ui.discardsRemaining` does not exist on `RoundUiState` until Phase 4 — this task alone will
not typecheck clean. Leave the edit in place; Phase 4's own typecheck step is where this lands
green.

Confirmed: after this task and the additional 6-file test fixup below, `npm run typecheck` reports
exactly 2 `TS2339` errors on `WarCouncilRound.tsx` (both `ui.discardsRemaining`, expected —
Phase 4's own gap), plus 6 `TS2741` errors on five pre-existing `WarCouncilRound.*.test.tsx` files
under `src/app/warCouncil/__tests__/` that mount `<WarCouncilRound>` directly and are missing the
new `discardsRemaining` prop. These five files were NOT part of this phase's named 6-file fixup
scope (`src/hunt/__tests__/` only) and are not listed as Modified by any task in this file — a
further planner gap, left unfixed here and flagged in the Implementer Report rather than guessed at,
per this phase's own instruction.

- [x] **Step 3: No standalone verification for this task** — folded into Phase 4's typecheck, since
`RoundUiState` does not carry `discardsRemaining` until then.

---

## Phase 4 — Reducer: state, actions, predicates, handlers

Adds `discardSelection`/`discardsRemaining` to `RoundUiState`, the two new action kinds, the three
new predicates, and the handlers that open, toggle, commit, and cancel a selection — with mutual
exclusion against Cheat and Envenom. Ends with the whole project type-checking clean (closing the
gap Phase 3 left open) and the reducer's own behaviour fully covered by Vitest, independent of any
rendered component.

### Task 12: Add `RoundUiState`/`RoundUiSeed` fields, the two action kinds, and the three predicates ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts`

- [x] **Step 1: Add to `RoundUiState`**, directly after `unplayedAtResolve`:

```ts
  /** DLR-100 AC5 — mirrored from the mount's opening prop, decremented on each committed discard.
   *  Run state carried for the life of the hand — the same contract `cheats` and `envenomCharges`
   *  document. */
  readonly discardsRemaining: number
  /** DLR-100 — the hand's OWN transient: dies on remount, never touches `RunState`. `null` when
   *  the discard rail is closed; an array (possibly empty) while it is open, holding the hand
   *  cards currently toggled in. ONE field rather than a boolean-plus-array pair, for
   *  `CheatSelection`'s stated reason: two independent fields would admit "closed but holding a
   *  stale selection". */
  readonly discardSelection: readonly Card[] | null
```

- [x] **Step 2: Add `discardsRemaining: number` to `RoundUiSeed`**, directly after `bankClimbBonus`.

- [x] **Step 3: Add `TapDiscard: 'tapDiscard', CancelDiscard: 'cancelDiscard',` to `RoundUiActionKind`**,
after `CancelApplyDamage`. Add the two matching variants to the `RoundUiAction` union:

```ts
  | { readonly kind: typeof RoundUiActionKind.TapDiscard }
  | { readonly kind: typeof RoundUiActionKind.CancelDiscard }
```

- [x] **Step 4: Seed the two new fields in `createRoundUiState`**: `discardsRemaining:
seed.discardsRemaining, discardSelection: null,` beside `applyPoised: false,`.

- [x] **Step 5: Add the three new exported predicates**, after `applyDamageStock`:

```ts
/** `true` once the mode is open — mirrors `envenomArmed`'s "is a hand-card tap reinterpreted" role,
 *  but for a MULTI-card selection rather than a single armed target. */
export function discardSelecting(state: RoundUiState): boolean {
  return state.discardSelection !== null
}

/** AC1 — the moment the action is available, independent of whose turn it is. Deliberately does
 *  NOT read `canAct`/`currentTurn`: this is what reaches the Quarry-to-lead gap, where `canAct` is
 *  false because the Quarry, not the player, is next to move — but the trick has not started. */
export function discardWindowOpen(state: RoundUiState): boolean {
  return (
    state.round.phase !== RoundPhase.Complete &&
    !isEncounterResolved(state.encounter) &&
    state.round.currentTrick.length === 0 &&
    state.resolvedTrick === null &&
    state.prompt === null &&
    state.cpuFault === null
  )
}

/** The plain values `discardRefusalFor` needs, assembled in ONE place so the reducer's guard and
 *  the rail control's disabled state cannot read availability differently — the same discipline
 *  `applyDamageStock` above documents. */
export function discardStock(state: RoundUiState): DiscardStock {
  return {
    discardsRemaining: state.discardsRemaining,
    selecting: discardSelecting(state),
    selectionSize: state.discardSelection?.length ?? 0,
    windowOpen: discardWindowOpen(state),
  }
}
```

Add `DiscardStock` to the existing `import { ... } from '../../warCouncil'` line.

- [x] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: fails — `roundReducer.ts` does not yet handle the two new action kinds in its `applyAction`
switch, which TypeScript's exhaustiveness would otherwise catch as a missing case once the union is
widened (confirm this is the actual error; if the switch is not declared to require exhaustiveness,
the error instead comes from `App.tsx`/`WarCouncilRound.tsx`'s still-unresolved
`discardsRemaining` references from Phase 2/3, which this task's Step 4 seed value now finally
supplies — either way, Task 13 closes the remaining gap).

Confirmed: fails with exactly the predicted exhaustiveness error — `roundReducer.ts(76,67): error
TS2366: Function lacks ending return statement and return type does not include 'undefined'` — the
`applyAction` switch is missing the two new cases. Additionally, before this fix, widening
`RoundUiSeed` surfaced the same "planner gap" pattern flagged in Phases 2/3: every
`roundReducer.*.test.ts`/`roundHint.test.ts`/`WarCouncilRound.*.test.tsx` file that builds a seed
object or mounts `<WarCouncilRound>` directly needed `discardsRemaining`/`discardsRemainingFixture`
added — fixed inline as part of this task per the Implementer's dispatch instructions (added
`discardsRemainingFixture` to `roundFixture.ts` and threaded it through every seed/mount call site);
see Implementer Report for the full file list.

### Task 13: Add the reducer handlers ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundReducer.ts`

- [x] **Step 1: Add the two new cases to `applyAction`'s switch**:

```ts
    case RoundUiActionKind.TapDiscard:
      return handleTapDiscard(state)
    case RoundUiActionKind.CancelDiscard:
      return handleCancelDiscard(state)
```

- [x] **Step 2: Add a first branch to `handleTapCard`**, ahead of the existing `envenomArmed`
check:

```ts
  if (discardSelecting(state)) {
    return toggleDiscardCard(state, tapped)
  }
```

- [x] **Step 3: Add `discardSelecting(state)` to `handleTapCheat`'s opening guard**, alongside
`!canAct(state)`, and add `discardSelection: null` to its poising branch's returned object (beside
`envenomStage: null`):

```ts
function handleTapCheat(state: RoundUiState, id: CheatCardId): RoundUiState {
  if (!canAct(state) || discardSelecting(state) || !hasCheat(state.cheats, id)) {
    return state
  }
  const current = state.cheatSelection
  if (current === null || current.id !== id) {
    return {
      ...state,
      cheatSelection: { id, stage: CheatStage.Poised },
      envenomStage: null,
      discardSelection: null,
    }
  }
  // …rest unchanged…
```

- [x] **Step 4: Add `discardSelecting(state)` to `handleTapEnvenom`'s opening guard**, and add
`discardSelection: null` to its poising branch (mirroring Step 3 exactly):

```ts
function handleTapEnvenom(state: RoundUiState): RoundUiState {
  if (!canAct(state) || discardSelecting(state) || state.envenomCharges <= 0) {
    return state
  }
  if (state.envenomStage === null) {
    return {
      ...state,
      envenomStage: EnvenomStage.Poised,
      cheatSelection: null,
      armed: null,
      discardSelection: null,
    }
  }
  // …rest unchanged…
```

- [x] **Step 5: Add the three new private functions**, after `handleTapApplyDamage`:

```ts
/**
 * DLR-100 — three outcomes on one control. Not selecting, refusal null → OPEN (clearing any Cheat
 * or Envenom selection and any armed card, mutual exclusion mirroring `handleTapEnvenom`'s own).
 * Selecting, refusal null → the only way that happens is a non-empty selection, so COMMIT through
 * `applyDiscard` and decrement the budget. Refused → no-op, matching `handleTapApplyDamage`'s own
 * shape.
 */
function handleTapDiscard(state: RoundUiState): RoundUiState {
  if (discardRefusalFor(discardStock(state)) !== null) {
    return state
  }
  if (state.discardSelection === null) {
    return {
      ...state,
      discardSelection: [],
      cheatSelection: null,
      envenomStage: null,
      armed: null,
    }
  }
  const round = applyDiscard(state.round, PlayerSide.Player, state.discardSelection)
  return {
    ...state,
    round,
    discardsRemaining: state.discardsRemaining - 1,
    discardSelection: null,
  }
}

/** AC9 — close the selection without spending, mirroring `clearCheat`'s and `CancelEnvenom`'s own
 *  shape. */
function handleCancelDiscard(state: RoundUiState): RoundUiState {
  return state.discardSelection === null ? state : { ...state, discardSelection: null }
}

/**
 * Toggle `tapped`'s membership in the open selection, capped at `MAX_CARDS_PER_DISCARD` and
 * silently ignoring a tap past the cap or on a card not in hand — matching this codebase's existing
 * silent-guard style (`clearCheat`'s stale-selection drop).
 */
function toggleDiscardCard(state: RoundUiState, tapped: Card): RoundUiState {
  const selection = state.discardSelection ?? []
  if (containsCard(selection, tapped)) {
    return { ...state, discardSelection: selection.filter((c) => !sameCard(c, tapped)) }
  }
  if (
    selection.length >= MAX_CARDS_PER_DISCARD ||
    !containsCard(state.round.hands[PlayerSide.Player], tapped)
  ) {
    return state
  }
  return { ...state, discardSelection: [...selection, tapped] }
}
```

- [x] **Step 6: Update imports** — add `applyDiscard, discardRefusalFor` to the existing
`import { ... } from '../../warCouncil'` block; add `MAX_CARDS_PER_DISCARD` to it as well (re-exported
from `src/hunt/`, so confirm which barrel actually re-exports it per Task 2 and import from there —
`../../hunt` if `src/warCouncil/index.ts` does not re-export hunt's own constants); add
`discardSelecting, discardStock` to the existing `import { ... } from './roundUiState'` block.

Confirmed: `src/warCouncil/index.ts` does not re-export `MAX_CARDS_PER_DISCARD` (it is a hunt-owned
constant) — imported from `'../../hunt'` alongside the other hunt imports, exactly as Task 2's
own resolved path predicted.

- [x] **Step 7: Typecheck and run every reducer-touching spec**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts src/app/warCouncil/__tests__/roundReducer.envenom.test.ts src/app/warCouncil/__tests__/roundReducer.poison.test.ts src/app/warCouncil/__tests__/roundReducer.bank.test.ts src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts`
Expected: typecheck exits 0 across the whole project; every existing reducer spec still passes,
0 failed — confirms the mutual-exclusion guards did not regress Cheat/Envenom/Apply Damage.

Confirmed: `npm run typecheck` exits 0 clean, project-wide (no remaining errors at all — Phase 4 is
the first phase to end fully green, per this file's own Self-review). `Test Files 6 passed (6)`,
`Tests 67 passed (67)` across the six named reducer specs — zero regressions.

**Flagged, not a defect in this task's own code, but worth recording:** as literally specified,
`handleTapCard`'s NEW `discardSelecting(state)` branch sits AFTER the existing `if (!canAct(state))
return state` guard (Step 2 only adds the branch "ahead of the existing `envenomArmed` check", not
ahead of the `canAct` guard). `canAct` requires `currentTurn(state.round) === PlayerSide.Player`,
which is false throughout the Quarry-to-lead gap `discardWindowOpen`/AC1 is explicitly written to
reach (see `WarCouncilRound.tsx`'s own `quarryToLead`, a real rendered waiting state, not a
transient one). The practical effect: `TapDiscard` can OPEN the selection during that gap
(`discardWindowOpen` doesn't check `canAct`), but a subsequent `TapCard` to toggle a hand card into
that selection is swallowed by the earlier `canAct` guard, so no card can actually be added to the
selection — and therefore no commit — while genuinely in the pre-lead gap. Task 14's own AC1 case
only asserts that `TapDiscard` (the open) succeeds pre-lead; it does not assert a subsequent toggle
succeeds, so this gap passes every listed test unnoticed. Implemented exactly as tasks.md specifies
per this dispatch's instruction to match given code exactly and flag rather than silently deviate —
see Implementer Report for the same finding surfaced to the developer/QA.

### Task 14: Write and run the reducer-level discard tests (AC10: chaining, refusals, void-in-suit) ✓

- Skill: react-frontend

**Files:**
- Test: `src/app/warCouncil/__tests__/roundReducer.discard.test.ts`

- [x] **Step 1: Write `src/app/warCouncil/__tests__/roundReducer.discard.test.ts`**, following
`roundFixture.ts`'s existing helper (used by the sibling `roundReducer.*.test.ts` files) to build a
starting `RoundUiState` with a known hand and `drawPile`, covering:
  - `TapDiscard` from a closed state with `discardsRemaining > 0` and the window open opens
    selection mode (`discardSelection` becomes `[]`), and clears any prior `cheatSelection`/
    `envenomStage`/`armed`.
  - `TapCard` while selecting toggles the tapped card into `discardSelection`, and a second
    `TapCard` on the same card removes it.
  - `TapCard` while selecting on a card already at the `MAX_CARDS_PER_DISCARD` cap is a no-op —
    `discardSelection` is unchanged.
  - `TapDiscard` with a non-empty selection commits: `discardsRemaining` decrements by 1,
    `discardSelection` returns to `null`, the hand still holds `HAND_SIZE` cards, and the
    discarded cards are gone from hand.
  - **Chaining (AC6/AC10)**: two consecutive commit cycles (`TapDiscard`, `TapCard`×n,
    `TapDiscard`) in the same gap — assert `discardsRemaining` drops by 2 total and the window
    (`discardWindowOpen`) stays open throughout, with no card played and no turn advanced between
    them.
  - **`TapDiscard` before the Quarry's own lead (AC1)**: from a state where `currentTurn` is the
    Quarry and `currentTrick` is empty (mirroring how `WarCouncilRound.tsx`'s own `quarryToLead`
    is derived), assert `discardRefusalFor(discardStock(state))` is `null` and `TapDiscard`
    succeeds — this is the case `canAct(state)` would refuse but `discardWindowOpen` must not.
  - **`TapDiscard` mid-trick (AC1 "never mid-trick")**: from a state with one card already played
    into `currentTrick`, assert `discardRefusalFor(discardStock(state))` is
    `DiscardRefusal.NotAvailable` and `TapDiscard` is a no-op.
  - **Refusal: none remaining (AC9)**: a state with `discardsRemaining: 0` — `TapDiscard` is a
    no-op and never opens selection mode.
  - **Refusal: empty selection (AC9)**: open selection mode, then dispatch `TapDiscard` again with
    nothing toggled in — state is unchanged (the control is refused, not a close-on-empty).
  - `CancelDiscard` while selecting closes the mode without spending a discard or changing the
    hand.
  - **Void-in-suit widening a later trick (AC10)**: discard every card of one suit from a hand that
    holds more than one suit, commit, then simulate a later trick in the SAME hand led by that
    suit (construct the follow-up `RoundState` by hand or via `legalMoves` directly on the
    post-discard round) and assert `legalMoves` returns the full hand rather than an
    empty-then-narrowed set — i.e. the player is free of that suit's follow-suit binding for the
    rest of the hand.

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.discard.test.ts`
Expected: every case passing, 0 failed.

Confirmed: `Test Files 1 passed (1)`, `Tests 12 passed (12)`. `cardsOfSuit` is not barrel-exported
from `src/warCouncil/index.ts` (unlike Phase 1's own `discard.test.ts`, which lives inside
`src/warCouncil/` and can import it directly) — a small local `ofSuit` filter helper is used instead
of reaching past the barrel. The void-in-suit case's `drawPile` is reordered from the shared
`makeRound()` default (which leads with Bells) so the two cards drawn to replace the discarded
Bells are Keys, not Bells — otherwise the swap would silently hand the discarded suit straight back
and the case would prove nothing. Full project `npm run typecheck` — exits 0, clean, no remaining
gaps at all (Phase 4 is confirmed the first fully-green phase). `npx vitest run
src/app/warCouncil/__tests__` (the whole folder) — `Test Files 31 passed (31)`, `Tests 280 passed
(280)`, zero regressions.

**Line-count check, done now per this file's own instruction rather than deferred to Phase 6's
Task 22.4**: `roundReducer.ts` measured 458 lines the moment Task 13's three discard-handler
functions landed — over the 400-line budget. Split immediately, following this codebase's own
`quarryAdvance.ts` precedent: `handleTapDiscard`/`handleCancelDiscard`/`toggleDiscardCard` moved
into a new `src/app/warCouncil/discardHandlers.ts` (a PURE MOVE — no behaviour changed, every
docblock came with its function), with `roundReducer.ts` importing the three names instead.
Re-measured: `roundReducer.ts` 400 lines (one further blank line trimmed from `handleTapCard` to
land exactly at the ceiling rather than one over), `discardHandlers.ts` 73 lines, `roundUiState.ts`
unchanged at 285. `npm run typecheck` and the full `src/app/warCouncil/__tests__` run (above) were
re-confirmed green after the split. This file's own File map does not list `discardHandlers.ts` as
Created — a further planner gap of the same shape Phases 2/3 already flagged (the plan's line-budget
risk note predicted the crossing but not this file's name), recorded here and in the Implementer
Report rather than silently absorbed.

---

## Phase 5 — UI: the rail control, the hand fan, and copy

Renders the mechanic: a new `DiscardPlate` sibling control, `HandFan`'s third "every card is a
target" mode, `PlayingCard`'s third marker, the hint cascade, and the placeholder copy. Ends with
the whole project type-checking clean, every component test passing, and `npm run lint` clean on
every file this phase touches.

**Pre-Phase-5 fix, done first per this phase's own dispatch instruction, not itself a numbered
task:** Task 13's own flagged finding (`handleTapCard`'s `discardSelecting` branch sitting behind
the `canAct` guard, silently defeating AC1's pre-Quarry-lead purpose) was fixed by reordering the
two checks in `roundReducer.ts`'s `handleTapCard` — `discardSelecting(state)` now runs first. A new
case was added to `roundReducer.discard.test.ts` asserting the full pre-lead flow (open → toggle →
commit) works end to end from a state where `currentTurn` is the Quarry, `currentTrick` is empty,
and `discardSelection` is already open. `npx vitest run
src/app/warCouncil/__tests__/roundReducer.discard.test.ts` — `Test Files 1 passed (1)`,
`Tests 13 passed (13)`.

### Task 15: Add discard copy to `labels.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/labels.ts`

- [x] **Step 1: Add imports** — `DiscardRefusal` to the existing
`import { ... } from '../../warCouncil'` block, `MAX_CARDS_PER_DISCARD` to whichever barrel
re-exports it per Task 13's own resolved import path.

- [x] **Step 2: Add the new copy**, after `applyDamageAccessibleName`:

```ts
/** The discard rail's copy (DLR-100). PLACEHOLDER — the wording is the developer's, exactly as
 *  `CHEAT_RAIL_LABEL`/`ENVENOM_RAIL_LABEL`/`APPLY_DAMAGE_RAIL_LABEL` above are. */
export const DISCARD_RAIL_LABEL = 'Discard'
export const DISCARD_SELECT_HINT = `Pick up to ${MAX_CARDS_PER_DISCARD} cards to discard`
export const DISCARD_READY_HINT = 'Tap Discard again to swap them'

/** Why the control is dark, in the player's words. A total `Record`, so a fourth refusal reason is
 *  a compile error here rather than an `undefined` sentence under a disabled button — the same
 *  discipline `APPLY_DAMAGE_REFUSAL_MESSAGE` above already sets. */
export const DISCARD_REFUSAL_MESSAGE: Readonly<Record<DiscardRefusal, string>> = {
  [DiscardRefusal.NotAvailable]: 'Not available yet.',
  [DiscardRefusal.NoDiscardsRemaining]: 'No discards left this fight.',
  [DiscardRefusal.EmptySelection]: 'Select a card to discard.',
}

/** The rail's accessible name. The readings — held, selecting, ready, refused — MUST differ:
 *  `getByRole('button', { name })` is how the spec tells them apart. */
export function discardAccessibleName(
  discardsRemaining: number,
  selecting: boolean,
  selectionSize: number,
  refusal: DiscardRefusal | null,
): string {
  if (refusal !== null) {
    return `${DISCARD_RAIL_LABEL}, unavailable — ${DISCARD_REFUSAL_MESSAGE[refusal]}`
  }
  const held = `${DISCARD_RAIL_LABEL}, ${discardsRemaining} left`
  if (!selecting) return held
  return selectionSize > 0 ? `${held}, ${selectionSize} selected — tap to swap` : `${held}, selecting`
}
```

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

Confirmed: exits 0.

### Task 16: Add `discardSelected` to `PlayingCard` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/PlayingCard.tsx`

- [x] **Step 1: Add the prop**, after `envenomed`:

```ts
  /** DLR-100 — a card currently toggled into the open discard selection. Defaults to `false` so
   *  every existing call site keeps compiling; a caller that knows the state passes it. The SAME
   *  rendering path as `skulled`/`envenomed` — one more conditional `<span>`, not a second
   *  component. */
  readonly discardSelected?: boolean
```

- [x] **Step 2: Destructure it with `discardSelected = false`**, render a third conditional marker
span (mirroring the `skulled`/`envenomed` spans exactly — glyph is a developer decision, use a
placeholder), and fold it into `aria-pressed`:

```tsx
aria-pressed={armed || discardSelected ? true : undefined}
```

and

```tsx
{discardSelected && (
  <span className="wc-discard-mark" aria-hidden="true">
    ✕
  </span>
)}
```

placed after the `envenomed` span. Add `discardSelected && 'wc-is-discard-selected'` to the
`className` array, mirroring the `armed && 'wc-is-armed'` entry.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

Confirmed: exits 0.

### Task 17: Wire `HandFan`'s third selection mode ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/HandFan.tsx`

- [x] **Step 1: Add the two new props**, after `envenomArmed`:

```ts
  /** DLR-100 — the discard selection is open. Mirrors `envenomArmed`'s role: while true, every
   *  held card is a valid tap target, including one illegal to play, because discarding is not a
   *  move. Read from the reducer's own `discardSelecting` predicate, never re-derived here. */
  readonly discardSelecting: boolean
  /** DLR-100 — the cards currently toggled into the open selection, so the fan can mark them. */
  readonly discardSelection: readonly Card[]
```

- [x] **Step 2: Relax `isFocusable` and the `illegal` expression** — add `|| discardSelecting`
beside the existing `envenomArmed` clause in both:

```ts
  const isFocusable = (index: number) =>
    hand[index] !== undefined &&
    interactive &&
    (envenomArmed || discardSelecting || containsCard(legal, hand[index]))
```

and, in the `PlayingCard` render:

```tsx
illegal={!interactive || (!envenomArmed && !discardSelecting && !containsCard(legal, card))}
```

- [x] **Step 3: Pass `discardSelected` to each `PlayingCard`**:

```tsx
discardSelected={containsCard(discardSelection, card)}
```

- [x] **Step 4: Add `wc-is-discarding` to the fan's own `className`** when `discardSelecting` is
true, mirroring the existing `wc-is-marking`/`envenomArmed` conditional — presentational only,
changes nothing about behaviour or the accessible tree.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: fails — `WarCouncilRound.tsx` does not yet pass the two new required `HandFan` props.
Task 19 closes this.

Note: per the phase-end batching policy, this typecheck was not run standalone at this step —
Tasks 17–19's edits were all applied before the first typecheck of this phase was run (after
Task 20). At that point it surfaced a pre-existing `HandFan.test.tsx` mounting `<HandFan>` directly,
also missing the two new required props (`discardSelecting`/`discardSelection`) — fixed inline, the
same planner-gap pattern flagged in earlier phases; see Implementer Report. Confirmed green in the
Task 20 typecheck below.

### Task 18: Add discard copy to the hint cascade ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundHint.ts`

- [x] **Step 1: Import `DISCARD_SELECT_HINT, DISCARD_READY_HINT`** from `./labels`.

- [x] **Step 2: Add a branch directly after the `ui.resolvedTrick` check and before
`quarryToLead`**:

```ts
  if (ui.discardSelection !== null) {
    return ui.discardSelection.length > 0 ? DISCARD_READY_HINT : DISCARD_SELECT_HINT
  }
```

Placed ahead of `quarryToLead` deliberately: a discard selection in progress is the more specific,
more actionable thing to tell the player, and per AC1 the two states can genuinely coexist (a
selection open during the Quarry-to-lead gap).

- [x] **Step 3: Update `deriveHint`'s own docblock** to name the new branch in its priority summary.

- [x] **Step 4: Typecheck and run the existing hint spec**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/roundHint.test.ts`
Expected: typecheck fails for the same reason Task 17's did (unchanged from that step); the hint
spec itself passes unchanged, 0 failed, since no existing case exercises the new branch yet — Task
20 adds that coverage.

Note: deferred to the phase-end block per this file's own batching policy; confirmed green under
Task 20's typecheck and re-run with the new AC10 hint case added in Task 21 (18 tests passed across
both specs together).

### Task 19: Build `DiscardPlate.tsx` and its stylesheet ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/DiscardPlate.tsx`
- Create: `src/app/warCouncil/warCouncilDiscard.css`

- [x] **Step 1: Write `DiscardPlate.tsx`**, mirroring `ApplyDamagePlate.tsx`'s exact shape —
`role="group"` rail, `onClick` stopping propagation (load-bearing: this mounts inside `.wc-table`,
which fires `handleCarryOn` on any click while the felt is waiting), `Escape` wired to `onCancel`, a
single plain tab stop, `disabled = refusal !== null`, the refusal sentence rendered on the control's
own face:

```tsx
import type { DiscardRefusal } from '../../warCouncil'
import { DISCARD_RAIL_LABEL, DISCARD_REFUSAL_MESSAGE, discardAccessibleName } from './labels'
import './warCouncilDiscard.css'

interface DiscardPlateProps {
  readonly discardsRemaining: number
  readonly selecting: boolean
  readonly selectionSize: number
  readonly refusal: DiscardRefusal | null
  readonly onTap: () => void
  readonly onCancel: () => void
}

/**
 * DLR-100 AC1/AC9 — the felt-rail plate for the discard, a SIBLING of `CheatSlots`, `EnvenomCharge`
 * and `ApplyDamagePlate` rather than a generalisation of any of them: the four controls keep
 * independent copy and independent components, so retuning one never risks the others.
 *
 * `onClick` STOPS PROPAGATION for `ApplyDamagePlate.tsx`'s own load-bearing reason: this mounts
 * inside `.wc-table`, which fires `handleCarryOn` on click whenever the felt is waiting — so
 * without it, opening the discard selection while a trick reveal is held would also clear the
 * reveal and commit the Quarry's lead as a side effect. (In practice `discardRefusalFor` already
 * refuses the tap while a reveal is held, since `discardWindowOpen` requires `resolvedTrick ===
 * null` — this guard is defence in depth, matching every sibling control's own.)
 *
 * The refusal sentence renders on the control's own face rather than in a tooltip: `game-ux`
 * forbids hiding anything the current decision needs behind hover, and touch has no hover at all.
 * One control is far below the roving-tabindex threshold, so it is a plain tab stop.
 */
export default function DiscardPlate({
  discardsRemaining,
  selecting,
  selectionSize,
  refusal,
  onTap,
  onCancel,
}: DiscardPlateProps) {
  const disabled = refusal !== null

  return (
    <div
      className="wc-discard-rail"
      role="group"
      aria-label={DISCARD_RAIL_LABEL}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <span className="wc-plate-label">{DISCARD_RAIL_LABEL}</span>
      <button
        type="button"
        className={`wc-discard-plate${selecting ? ' is-selecting' : ''}`}
        aria-pressed={selecting && !disabled}
        aria-label={discardAccessibleName(discardsRemaining, selecting, selectionSize, refusal)}
        disabled={disabled}
        onClick={onTap}
      >
        <span className="wc-discard-glyph" aria-hidden="true">
          ⇄
        </span>
        <span className="wc-discard-count" aria-hidden="true">
          {discardsRemaining}
        </span>
      </button>
      {refusal !== null && <p className="wc-discard-refusal">{DISCARD_REFUSAL_MESSAGE[refusal]}</p>}
    </div>
  )
}
```

- [x] **Step 2: Write `warCouncilDiscard.css`**, mirroring `warCouncilApplyDamage.css`'s existing
selectors (`.wc-apply-rail`, `.wc-apply-plate`, `.wc-apply-refusal`, its `:focus-visible`/`:hover`/
`:active` states per `react-frontend`'s accessibility floor) renamed to the `wc-discard-*` classes
this component uses. Colour, glyph sizing, and any `clamp()` bounds are the developer's to choose —
this task establishes the file's structure and the required states (`:disabled`, `.is-selecting`,
`:focus-visible`, `@media (hover: hover)` wrapping any hover rule, `touch-action: manipulation`) with
placeholder values.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: fails — nothing yet imports/renders `DiscardPlate`. Task 20 closes this, which is the
final task of this phase.

Note: deferred to the phase-end block; confirmed green under Task 20's own typecheck below.

### Task 20: Wire `DiscardPlate` and `HandFan`'s new props into `WarCouncilRound.tsx` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`

- [x] **Step 1: Import `DiscardPlate`** and the new predicates
`discardSelecting, discardStock` from `./roundUiState` (added to the existing
`import { ... } from './roundUiState'` block); import `discardRefusalFor` from `'../../warCouncil'`.

- [x] **Step 2: Compute the two derived values**, beside the existing `applyRefusal`/`applyCash`:

```ts
  const discardRefusal = discardRefusalFor(discardStock(ui))
  const handInteractive = interactive || discardSelecting(ui)
```

- [x] **Step 3: Pass `interactive={handInteractive}` to `HandFan`** in place of the bare
`interactive` it receives today — every other consumer of `interactive`
(`CheatSlots`/`EnvenomCharge`/`ApplyDamagePlate`) keeps reading the unchanged `interactive`. Also
pass `discardSelecting={discardSelecting(ui)}` and `discardSelection={ui.discardSelection ?? []}` to
`HandFan`.

- [x] **Step 4: Render `DiscardPlate` in the felt rail**, alongside `ApplyDamagePlate`:

```tsx
<DiscardPlate
  discardsRemaining={ui.discardsRemaining}
  selecting={discardSelecting(ui)}
  selectionSize={ui.discardSelection?.length ?? 0}
  refusal={discardRefusal}
  onTap={() => dispatch({ kind: RoundUiActionKind.TapDiscard })}
  onCancel={() => dispatch({ kind: RoundUiActionKind.CancelDiscard })}
/>
```

- [x] **Step 5: Import `'./warCouncilDiscard.css'`** alongside the component's other per-feature
stylesheet imports.

- [x] **Step 6: Typecheck and run every WarCouncilRound-touching spec**

Run: `npm run typecheck; npx vitest run --project dom`
Expected: typecheck exits 0 across the whole project; every `.test.tsx` spec passes, 0 failed
(confirms the mount-boundary and reducer wiring from Phases 2–4 land correctly under a real
render, not just in isolated reducer tests).

Confirmed: `npm run typecheck` exits 0 (after fixing the pre-existing `HandFan.test.tsx` call site
flagged in Task 17's note — not listed as Modified by any task in this file, a further planner gap
of the same shape flagged in Phases 2–4, fixed inline). `npx vitest run --project dom` —
`Test Files 24 passed (24)`, `Tests 198 passed (198)`.

### Task 21: Component tests for `DiscardPlate` and the hint cascade's new branch ✓

- Skill: react-frontend

**Files:**
- Test: `src/app/warCouncil/__tests__/DiscardPlate.test.tsx`
- Modify: `src/app/warCouncil/__tests__/roundHint.test.ts`

- [x] **Step 1: Write `DiscardPlate.test.tsx`**, querying by role and accessible name per
`react-frontend`'s testing posture (mirroring `ApplyDamagePlate.test.tsx`'s own shape), covering:
  - Renders a `button` with an accessible name naming the count when `refusal` is `null` and
    `selecting` is `false`.
  - The button is `disabled` (and therefore not focusable) when `refusal` is non-`null`, and its
    accessible name includes `DISCARD_REFUSAL_MESSAGE[refusal]`.
  - The refusal sentence renders as visible text on the control's own face, never only in an
    attribute — per `game-ux`'s "nothing a current decision needs is hover-only" floor.
  - Clicking the button while enabled calls `onTap` exactly once.
  - Pressing `Escape` on the rail calls `onCancel` exactly once.
  - The accessible name differs across all four readings (held / selecting / ready-to-commit /
    refused), so `getByRole('button', { name })` can tell them apart — mirroring
    `applyDamageAccessibleName`'s own tested discipline.

- [x] **Step 2: Add one case to `roundHint.test.ts`** asserting `deriveHint` returns
`DISCARD_SELECT_HINT` when `ui.discardSelection` is `[]` and `DISCARD_READY_HINT` when it holds at
least one card — placed ahead of a `quarryToLead: true` case to also assert the new branch's
priority over it.

Run: `npx vitest run src/app/warCouncil/__tests__/DiscardPlate.test.tsx src/app/warCouncil/__tests__/roundHint.test.ts`
Expected: every case passing, 0 failed.

Confirmed: `Test Files 2 passed (2)`, `Tests 18 passed (18)`.

**Line-count check, done now per this file's own precedent (Task 14) rather than deferred to
Phase 6's Task 22.4**: `(Get-Content <file>).Count` (not `Measure-Object -Line`, which this
project's own lessons record as undercounting) showed `roundReducer.ts` at 404 and
`WarCouncilRound.tsx` at 402 the moment this phase's edits landed — both over the 400-line budget.
Trimmed in place — no functional change, comment prose only shortened — to `roundReducer.ts` 400 and
`WarCouncilRound.tsx` 399. `roundUiState.ts` untouched this phase, still 285. `npm run typecheck`,
`npm run lint`, and the full unfiltered `npm test` were all re-confirmed green after the trim (see
Verification Block Results below).

---

## Phase 6 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 22.1: Confirm no discard-related literal was hard-coded outside `config.ts` ✓

- [x] **Step 1: Grep for the two figures outside their owning file**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch 'config\.ts$' } | Select-String -Pattern '\bDISCARDS_PER_FIGHT\b|\bMAX_CARDS_PER_DISCARD\b' | Where-Object { $_.Line -notmatch '^\s*import' }`
Expected: every hit is a reference to the named constant (an import or a use), never a bare literal
`3` reintroducing the same figure — `config.ts` itself is excluded from the filter, so this checks
every *consumer*.

Confirmed: 24 hits, every one a named reference — imports, `startRun`/`advanceRun` seeding, test
assertions (`run.discard.test.ts`, `discard.test.ts`, `roundReducer.discard.test.ts`), the
`toggleDiscardCard` cap check, `discardHandlers.ts`'s docblock, and `labels.ts`'s
`DISCARD_SELECT_HINT` template literal. Zero bare literal `3` reintroducing either figure.

### Task 22.2: Confirm the two config values are still a one-line edit ✓

- [x] **Step 1: Confirm the two constants are declared exactly once**

Run: `Select-String -Path src\hunt\config.ts -Pattern '^export const (DISCARDS_PER_FIGHT|MAX_CARDS_PER_DISCARD)'`
Expected: exactly 2 matches, one per constant.

Confirmed: exactly 2 matches — `DISCARDS_PER_FIGHT = 3` (line 349), `MAX_CARDS_PER_DISCARD = 3`
(line 350).

### Task 22.3: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed across every project.

Confirmed: `npm run typecheck` exits 0. `npm run lint` exits 0. `npm test` exits 0 —
`Test Files  78 passed (78)`, `Tests  993 passed (993)`.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Confirmed: exits 0. `dist/index.html`, `dist/assets/index-BnrAeiSQ.css` (37.74 kB),
`dist/assets/index-DSr4Ivmu.js` (257.76 kB) written, no bundler errors.

### Task 22.4: File-size budget check ✓

- [x] **Step 1: Measure every file this contract grew**

Run: `(Get-Content src\app\warCouncil\roundReducer.ts).Count; (Get-Content src\app\warCouncil\roundUiState.ts).Count; (Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count`
Expected: all three under 400. If either `roundReducer.ts` or `roundUiState.ts` has crossed 400,
split it in this task following this codebase's own precedent (`quarryAdvance.ts`,
`roundUiState.ts` itself were both split out of files that hit the same ceiling) — do not hand a
breach back as a finding, per this project's standing instruction.

Confirmed via `(Get-Content <path>).Count` (the accurate form — `Measure-Object -Line` undercounts
by dropping blank lines, confirmed by also running it for comparison): `roundReducer.ts` 400
(`Measure-Object -Line` reports 378), `roundUiState.ts` 285 (`Measure-Object -Line` reports 268),
`WarCouncilRound.tsx` 399 (`Measure-Object -Line` reports 382). Also re-measured
`discardHandlers.ts` (created in Phase 4, not named in this task's own Run: line but part of this
contract's growth): 73 (`Measure-Object -Line` reports 70). All four at or under 400 — no split
needed.

### Task 22.5: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: adds the discard action (DLR-100) — engine swap, per-fight budget on `RunState`, and the
  felt-rail UI to select and spend it, including chaining and the pre-Quarry-lead window AC1 asks
  for.
- Every decision the developer must make and every behaviour they must judge by playing — copied
  from this file's own "Developer decides or observes" section above.
- Verification results from Task 22.3 (typecheck/lint/test/build) and Task 22.4 (line counts).
- One-line note for future contributors: `discardWindowOpen` is the one predicate in this codebase
  deliberately independent of `canAct`/`currentTurn` — a future consumable control that also needs
  to be available before the Quarry's lead should read it rather than inventing a second version.

---

## Self-review

**Spec coverage:**
- AC1 (pre-lead, including before the Quarry's own lead, never mid-trick) — `discardWindowOpen`
  (Task 12), tested directly in Task 14's Quarry-to-lead and mid-trick cases.
- AC2 (swap preserves hand size) — `applyDiscard` (Task 4), tested in Task 3/Task 9.
- AC3 (bottom-of-pile, no discard pile, no reshuffle) — `applyDiscard`'s `drawPile` splice (Task 4),
  tested in Task 3; no pile/reshuffle code exists anywhere in this contract by construction.
- AC4 (two named constants, one-line edit) — Task 1, verified in Task 22.2.
- AC5 (per-fight resource on `RunState`, through `advanceRun`) — Tasks 6–8, tested in Task 9.
- AC6 (chaining) — Tasks 12–13's design, tested in Task 14's chaining case.
- AC7 (blind draw) — no pile-preview UI exists anywhere in this contract; `DiscardPlate` and
  `HandFan` render no pile contents.
- AC8 (Quarry gets nothing) — `applyDiscard` is never called with `QUARRY_SIDE` anywhere in this
  contract; only `handleTapDiscard` calls it, always with `PlayerSide.Player`.
- AC9 (refused with a stated reason, reducer never throws) — `DiscardRefusal`/`discardRefusalFor`
  (Task 4), guarded-before-calling in `handleTapDiscard`/`toggleDiscardCard` (Task 13), tested in
  Task 3 and Task 14's refusal cases.
- AC10 (the six named test cases) — Task 3 (swap/pile/void-in-suit at the engine level), Task 9
  (budget across `advanceRun`), Task 14 (chaining, refusals, void-in-suit at the reducer level).

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or
"similar to Task N" references anywhere above. Every step shows the exact code, or a `Run:`/
`Expected:` pair. Copy values are explicitly marked PLACEHOLDER, matching this codebase's own
convention for every other rail control's labels — not a planning gap.

**Type / name consistency:** `DiscardRefusal`/`DiscardStock`/`discardRefusalFor`/`applyDiscard`
(Phase 1) are the exact names used unchanged through `roundUiState.ts` (Phase 4),
`roundReducer.ts` (Phase 4), `labels.ts` and `DiscardPlate.tsx` (Phase 5).
`discardsRemaining`/`discardSelection`/`discardSelecting`/`discardWindowOpen`/`discardStock` are
each declared exactly once (Phase 2/Phase 4) and referenced identically everywhere else. Every
`- Skill:` value is `react-frontend`, which appears in `plan.md` Part 2's skill list.

**Phase boundary cleanliness:** Phase 1 type-checks and is fully tested in isolation — nothing
outside `src/warCouncil/` and `src/hunt/index.ts` changes. Phase 2 deliberately leaves two
call sites (`App.tsx`'s `recordEncounter` call, Task 8; `WarCouncilRound.tsx`'s mount wiring,
folded into Phase 3) mid-edit against a not-yet-widened type, each flagged in its own task with the
exact downstream task that closes the gap — this is the same "widen the type first, let the
compiler enumerate every site, then fix each one" sequencing `RunState.discardsRemaining` (Task 6)
already uses deliberately. Phase 3 closes Phase 2's gap and opens a new one (`RoundUiState` lacking
the field `WarCouncilRound.tsx` now references), explicitly deferred to Phase 4. Phase 4 closes that
gap and is the first phase to end fully green end-to-end, including every pre-existing spec. Phase 5
adds UI with no further behavioural gap — its own intermediate steps (Tasks 17–19) are flagged
non-green exactly once each, closed by Task 20, matching the same deliberate pattern.

---

## Post-review fix pass (2026-08-22)

Applied all findings from the parallel [code-evaluator + defender + qa] review:

- **Critical (Defender):** `handleCarryOn` in `roundReducer.ts` now refuses to advance the Quarry's
  lead while `discardSelecting(state)` is true, so a felt-background tap during the pre-lead gap
  can no longer silently orphan an open discard selection. Covered by a new reducer test in
  `roundReducer.discard.test.ts`.
- **Warning (Defender):** `HandFan.test.tsx` gained the `discardSelecting`-mode coverage parallel
  to `envenomArmed`'s (tappable illegal card, reported tap, roving tabindex, `discardSelected`
  render treatment). `applyDiscard` in `discard.ts` gained a third `RangeError` guard for
  `discarded.length > state.drawPile.length`, with a covering test in `discard.test.ts`.
- **Formatting (Code-Evaluator):** the 6 flagged files reformatted with `npx prettier --write`;
  `npm run format:check` scoped to every file this pass touched now passes.
- **File-size split:** the `handleCarryOn` guard pushed `roundReducer.ts` to 404 lines. Split
  `commit` (and its private `playOptions`/`applyResolution` helpers) into a new
  `src/app/warCouncil/commitHandlers.ts`, mirroring this file's existing `quarryAdvance.ts` /
  `discardHandlers.ts` split precedent. `roundReducer.ts` is now 288 lines,
  `commitHandlers.ts` is 141.
- Full project-wide gates re-run clean after the fix pass: `npm run typecheck`, `npm run lint`,
  `npm test` (998 passed), `npm run build`. `npm run format:check` still fails only on the
  pre-existing unrelated files this contract never touched (see `.claude/workflow/web-project.md`).
