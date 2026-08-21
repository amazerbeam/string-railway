# Tasks: Quick-kill payout (DLR-95)

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-21

**Goal:** Pay a coin per card left unplayed in the player's hand at the instant the Quarry's bar empties, multiplied by a tier that depends on which hand of that fight the kill landed in, credited additively beside the flat win coin and named on the verdict screen.

**Spec:** `plan.md` in this folder. Layout and copy for the verdict's new line: `mockup.html` in this folder (approved at the planning gate, 2026-08-20).

---

## File map

**Created:**

- `src/hunt/quickKill.ts` — the `QuickKill` shape, the tier lookup, and `quickKillPayout`; the one place `Math.floor` is applied to this figure.
- `src/hunt/__tests__/quickKill.test.ts` — AC7's four named cases plus the guards.
- `src/hunt/__tests__/run.shop.test.ts` — the two shop describe blocks moved out of `run.test.ts` so it stays under the 400-line budget.
- `src/hunt/__tests__/run.quickKill.test.ts` — the additive credit, `handOfFight`'s lifecycle, and `lastQuickKillPayout`.
- `src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts` — the reducer captures the hand size once, at the resolving transition.

**Modified:**

- `src/hunt/config.ts` — add `QUICK_KILL_TIER_MULTIPLIERS`.
- `src/hunt/index.ts` — export the new key, type, and two functions.
- `src/hunt/run.ts:44-108` — two new `RunState` fields and their seeds in `startRun`.
- `src/hunt/runTransitions.ts:34-71` — `recordEncounter`'s sixth parameter, the additive credit, `lastQuickKillPayout`; `:78-93` `advanceRun` resets `handOfFight`; new private `handOfFightAfter`.
- `src/hunt/__tests__/run.test.ts` — remove the two moved describe blocks and their now-unused imports; append the sixth argument to its 20 remaining `recordEncounter` calls.
- `src/hunt/__tests__/run.flask.test.ts` — sixth argument on 4 calls.
- `src/hunt/__tests__/envenom.test.ts` — sixth argument on 3 calls.
- `src/hunt/__tests__/poisonGuard.test.ts` — sixth argument on 3 calls.
- `src/hunt/__tests__/run.whetstone.test.ts` — sixth argument on 1 call.
- `src/app/warCouncilMount.ts:56-78` — `unplayedAtResolve` on `WarCouncilRoundResult`.
- `src/app/warCouncil/roundUiState.ts:69-140` — `unplayedAtResolve` on `RoundUiState`; seeded `null` in `createRoundUiState`.
- `src/app/warCouncil/roundReducer.ts:47-72` — rename the switch to `applyAction`, add the exported wrapper and `captureUnplayed`.
- `src/app/warCouncil/WarCouncilRound.tsx` — both `onComplete({ … })` literals carry the new field.
- `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx:230-235` — one added assertion on the reported figure.
- `src/App.tsx` — pass the count into `recordEncounter`; pass the two new props to `RunOutcomePanel`.
- `src/app/run/runLabels.ts` — `coinsText` and `rewardText`.
- `src/app/run/RunOutcomePanel.tsx` — two new props and the reward line.
- `src/app/run/run.css` — `.run-reward`.
- `src/app/run/__tests__/runLabels.test.ts` — cover `rewardText` and `coinsText`.
- `src/app/run/__tests__/RunOutcomePanel.test.tsx` — two props on `baseProps`; cover the line's presence, its absence at 0, and its absence on a lost run.

**Deleted:** *(none)*

**Developer decides or observes:**

- The reward line's copy — `Fight won +1 coin · Quick kill +10 coins` is placeholder, exactly as `runLabels.ts`'s own header states all its copy is. Whether it should also name *why* (how many cards, which hand) is a copy call; the richer form costs two more `RunState` fields.
- Whether the shop is now too affordable. A first-hand kill can pay up to 13 coins where a fight paid 1, against a `WHETSTONE_PRICE` of 4. What to look for: how many purchases are affordable at the first shop visit after a fast opening fight. **No price is retuned in this ticket.**
- Whether the reward line sits well in the verdict column at a short viewport — a look-and-feel call once QA has confirmed it renders.

**Not a developer observation — these are QA's, and they have right answers:** that the verdict's quick-kill figure matches the purse's jump; that a mid-hand Apply Damage kill and a last-trick kill pay visibly different amounts; that no page scroll appears on the verdict at the viewport sizes QA names.

---

## Phase 1 — The payout rule, as pure arithmetic

The rule itself, with nothing wired to it. Self-contained inside `src/hunt/`: a new configuration key, a new pure module, its barrel exports, and its spec. Nothing outside this phase changes, so the codebase type-checks and every existing test passes untouched at the boundary.

### Task 1: Add the tier curve to `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**

- Config: `src/hunt/config.ts` — add `QUICK_KILL_TIER_MULTIPLIERS` (value transcribed from `version-4-scope.md` §4, not a developer decision)

- [x] **Step 1: Append the key immediately after `WHETSTONE_PRICE`'s block**

```ts
// DLR-95 AC2 — the quick-kill payout's tier curve: COINS PER CARD left unplayed, indexed by
// (hand of the fight − 1). TRANSCRIBED from version-4-scope.md §4 ("×2 in the first hand, ×1 in
// the second, ×0.5 in the third, ×0 from the fourth on"), which marks the curve "Confirmed as
// final" — NOT an open tuning value.
//
// A hand beyond this array's length pays 0, which IS AC5's taper: the array's LENGTH is the rule,
// so extending or shortening the curve is one edit here and no code change. ONE key rather than a
// separate coins-per-card rate beside it — the ×1 second-hand tier IS the design's "1 coin per
// card" base, and two numbers that must multiply out to the documented figure is the pair that
// drifts.
//
// All three values are exactly representable in binary, so `cards × multiplier` is exact and this
// needs none of the numerator/denominator treatment FORCED_CASH_OUT_* required below.
// UNIT: coins per card left unplayed in the player's hand at the kill.
export const QUICK_KILL_TIER_MULTIPLIERS: readonly number[] = [2, 1, 0.5]
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Write the failing spec for `quickKillPayout` ✓

- Skill: react-frontend

**Files:**

- Test: `src/hunt/__tests__/quickKill.test.ts`

- [x] **Step 1: Create the spec, covering every case AC7 names**

```ts
import { describe, expect, it } from 'vitest'
import { quickKillPayout, quickKillTierMultiplier } from '../quickKill'
import { HAND_SIZE, QUICK_KILL_TIER_MULTIPLIERS } from '../config'

describe('quickKillTierMultiplier (AC2, AC5)', () => {
  it('doubles in the first hand of the fight', () => {
    expect(quickKillTierMultiplier(1)).toBe(2)
  })

  it('pays the base rate in the second', () => {
    expect(quickKillTierMultiplier(2)).toBe(1)
  })

  it('halves in the third', () => {
    expect(quickKillTierMultiplier(3)).toBe(0.5)
  })

  it('pays nothing from the fourth hand on — the taper, not a bug (AC5)', () => {
    expect(quickKillTierMultiplier(4)).toBe(0)
    expect(quickKillTierMultiplier(9)).toBe(0)
  })

  it('reads its curve from configuration rather than a literal', () => {
    QUICK_KILL_TIER_MULTIPLIERS.forEach((multiplier, index) => {
      expect(quickKillTierMultiplier(index + 1)).toBe(multiplier)
    })
  })

  it('refuses a hand number that is not a positive integer rather than returning NaN', () => {
    expect(() => quickKillTierMultiplier(0)).toThrow(RangeError)
    expect(() => quickKillTierMultiplier(-1)).toThrow(RangeError)
    expect(() => quickKillTierMultiplier(1.5)).toThrow(RangeError)
    expect(() => quickKillTierMultiplier(Number.NaN)).toThrow(RangeError)
  })
})

describe('quickKillPayout (AC2, AC4, AC7)', () => {
  // THE pinned regression test. version-4-scope.md §4: "a first-hand, one-trick kill with five
  // cards left pays 10 coins, which is the figure Whetstone's price above is sized against."
  it('pays the design doc’s own worked example: first hand, five cards left → 10 coins', () => {
    expect(quickKillPayout({ unplayedCards: 5, handOfFight: 1 })).toBe(10)
  })

  it('pays one coin per card in the second hand', () => {
    expect(quickKillPayout({ unplayedCards: 4, handOfFight: 2 })).toBe(4)
  })

  it('floors a fractional third-hand payout rather than crediting half a coin (AC4)', () => {
    expect(quickKillPayout({ unplayedCards: 5, handOfFight: 3 })).toBe(2)
    expect(quickKillPayout({ unplayedCards: 3, handOfFight: 3 })).toBe(1)
    expect(quickKillPayout({ unplayedCards: 1, handOfFight: 3 })).toBe(0)
  })

  it('pays exactly nothing on a fourth-hand kill, however full the hand (AC5)', () => {
    expect(quickKillPayout({ unplayedCards: HAND_SIZE, handOfFight: 4 })).toBe(0)
  })

  it('pays nothing for a kill on the last trick, with nothing left in hand', () => {
    expect(quickKillPayout({ unplayedCards: 0, handOfFight: 1 })).toBe(0)
  })

  it('never returns a fractional value for any tier and any hand size', () => {
    for (let hand = 1; hand <= QUICK_KILL_TIER_MULTIPLIERS.length + 1; hand += 1) {
      for (let cards = 0; cards <= HAND_SIZE; cards += 1) {
        expect(Number.isInteger(quickKillPayout({ unplayedCards: cards, handOfFight: hand }))).toBe(
          true,
        )
      }
    }
  })

  it('refuses a negative or non-finite card count rather than poisoning the purse', () => {
    expect(() => quickKillPayout({ unplayedCards: -1, handOfFight: 1 })).toThrow(RangeError)
    expect(() => quickKillPayout({ unplayedCards: Number.NaN, handOfFight: 1 })).toThrow(RangeError)
    expect(() => quickKillPayout({ unplayedCards: Number.POSITIVE_INFINITY, handOfFight: 1 })).toThrow(
      RangeError,
    )
  })
})
```

- [x] **Step 2: Run it and confirm it fails for the right reason**

Run: `npx vitest run src/hunt/__tests__/quickKill.test.ts`
Expected: the run fails to collect the file — `Failed to load` / `Cannot find module '../quickKill'`. That is the module not existing yet, not a failing assertion.

### Task 3: Implement `src/hunt/quickKill.ts` ✓

- Skill: react-frontend

**Files:**

- Create: `src/hunt/quickKill.ts`
- Test: `src/hunt/__tests__/quickKill.test.ts` (written in Task 2)

- [x] **Step 1: Write the module**

```ts
import { QUICK_KILL_TIER_MULTIPLIERS } from './config'
import type { Coins } from './types'

/**
 * DLR-95 AC2 — everything the quick-kill rule needs, and nothing else. The sibling of `FlaskStock`
 * and `ShopStock`, for their stated reason: this module owns the payout's rule and must not learn
 * the run's shape or the card layer's. `runTransitions.ts`'s `recordEncounter` builds it.
 */
export interface QuickKill {
  /** Cards still in the player's hand at the instant the Quarry's bar emptied. Counted AFTER the
   *  killing trick's own card has left the hand, which is what makes the design doc's worked
   *  example (five left after one trick of six) come out at 10. */
  readonly unplayedCards: number
  /** Which hand OF THE FIGHT the kill landed in. 1-BASED: the fight's first hand is 1, not 0.
   *  Deliberately NOT the run-global hand counter — see `RunState.handOfFight`. */
  readonly handOfFight: number
}

/**
 * AC2/AC5 — the tier, expressed as COINS PER UNPLAYED CARD. THE only reader of
 * `QUICK_KILL_TIER_MULTIPLIERS`.
 *
 * A hand past the end of the configured curve returns 0. That is AC5's taper rather than an error:
 * "a kill on the fourth hand or later pays exactly 0 from this mechanic — a deliberate taper, not
 * a bug". The array's LENGTH is therefore the rule, so re-shaping the curve is a config edit.
 *
 * Throws on a hand number that is not a positive integer rather than indexing with it. A
 * fractional or `NaN` index yields `undefined`, which would become `NaN` on the multiply, land in
 * `coins`, and vanish from the purse with nothing logged anywhere — the numeric-safety trap
 * `web-project.md` names. `flaskHealAmount` guards its own input for exactly this reason.
 */
export function quickKillTierMultiplier(handOfFight: number): number {
  if (!Number.isInteger(handOfFight) || handOfFight < 1) {
    throw new RangeError(
      `Cannot price a quick kill on hand ${handOfFight} of the fight: it must be a positive integer, counting from 1`,
    )
  }
  return QUICK_KILL_TIER_MULTIPLIERS[handOfFight - 1] ?? 0
}

/**
 * AC2/AC4 — the payout. THE only place `Math.floor` is applied to this figure, so a fractional
 * third-tier result can never reach `Coins`, which `types.ts` documents as "a whole number...
 * never fractional".
 *
 * Floors rather than rounds, deliberately: AC4 asks that the rounding artefact never fall in the
 * player's favour. The same direction `forcedCashValue` already floors in.
 *
 * The multiplication needs no numerator/denominator split — `2`, `1` and `0.5` are all exactly
 * representable in binary, so the product is exact and the floor only ever removes a genuine `.5`.
 * That is precisely what `FORCED_CASH_OUT_NUMERATOR`/`_DENOMINATOR` exist to work around for
 * `2/3`, which is not.
 */
export function quickKillPayout(kill: QuickKill): Coins {
  if (!Number.isFinite(kill.unplayedCards) || kill.unplayedCards < 0) {
    throw new RangeError(
      `Cannot pay a quick kill for ${kill.unplayedCards} unplayed cards: it must be a finite count of zero or more`,
    )
  }
  return Math.floor(kill.unplayedCards * quickKillTierMultiplier(kill.handOfFight))
}
```

- [x] **Step 2: Run the spec and confirm it passes**

Run: `npx vitest run src/hunt/__tests__/quickKill.test.ts`
Expected: exits 0; Vitest reports `Tests  13 passed` and 0 failed.

### Task 4: Export the new surface from the `src/hunt` barrel ✓

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/index.ts:16-53` (the `from './config'` block) and after the `./flask` block

- [x] **Step 1: Add `QUICK_KILL_TIER_MULTIPLIERS` to the existing config export block**

Insert it immediately after `WHETSTONE_PRICE,` in the `export { … } from './config'` list.

- [x] **Step 2: Add the module's own two lines, directly after the `./flask` pair**

```ts
export type { QuickKill } from './quickKill'
export { quickKillTierMultiplier, quickKillPayout } from './quickKill'
```

- [x] **Step 3: Typecheck and lint the phase**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. Lint is run here as well as at the end because this phase adds a file inside `src/hunt/**`, which carries the enforced React-free / DOM-free override in `eslint.config.js`.

---

## Phase 2 — Capture the unplayed count at the killing transition

The app-layer reducer is the only place that holds both the encounter and the round, so this is where the hand size is observed. Purely additive: a field appears on `RoundUiState` and on `WarCouncilRoundResult` that nothing yet reads, so the codebase type-checks and every existing test still passes at the boundary. The reducer restructuring is a rename plus a wrapper with no behaviour change.

### Task 5: Add `unplayedAtResolve` to `RoundUiState` and seed it ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/roundUiState.ts:69-140` (the `RoundUiState` interface and `createRoundUiState`)

- [x] **Step 1: Add the field to `RoundUiState`, directly after `applyPoised`**

```ts
  /** DLR-95 AC2 — the player's hand size at the FIRST transition after which the encounter reads
   *  resolved, frozen from then on. `null` until then, and `null` for a hand that never ends the
   *  fight.
   *
   *  FROZEN rather than re-derived at `onComplete` time, and that is load-bearing. The live hand
   *  length happens to give the same answer today only because `canAct` goes false once the
   *  encounter resolves, so nothing further can be played — correctness that rests on an unrelated
   *  predicate staying false is correctness that breaks silently. The same reasoning
   *  `openingEncounter` above already documents. */
  readonly unplayedAtResolve: number | null
```

- [x] **Step 2: Seed it in `createRoundUiState`, beside `applyPoised: false`**

```ts
    applyPoised: false,
    unplayedAtResolve: null,
```

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 6: Write the failing spec for the reducer's capture ✓

- Skill: react-frontend

**Files:**

- Test: `src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts`

- [x] **Step 1: Create the spec**

A `.test.ts` (the `node` Vitest project), not a `.test.tsx` — the reducer is pure and needs no DOM, and `roundFixture.ts` imports nothing browser-bound.

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import { DuelSide, isEncounterResolved } from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiSeed } from '../roundUiState'
import {
  bankClimbBonusFixture,
  encounterFixture,
  envenomChargesFixture,
  makeRound,
  poisonGuardHeldFixture,
} from './roundFixture'

/** A fight the player can end on demand: a banked streak worth exactly the Quarry's last health,
 *  with the full six-card hand still undealt onto the table. Tapping Apply Damage twice cashes it
 *  and empties the Quarry's bar with every card still in hand — the cleanest expression of "at the
 *  instant the Quarry's health reaches zero". */
function seedOneTapKill(quarryHealth: number): RoundUiSeed {
  return {
    round: makeRound({ bank: quarryHealth, multiplier: 1 }),
    encounter: {
      ...encounterFixture,
      health: { ...encounterFixture.health, [DuelSide.Quarry]: quarryHealth },
    },
    cheats: [],
    envenomCharges: envenomChargesFixture,
    poisonGuardHeld: poisonGuardHeldFixture,
    bankClimbBonus: bankClimbBonusFixture,
  }
}

const applyDamage = { kind: RoundUiActionKind.TapApplyDamage } as const

describe('roundReducer — capturing the unplayed count at the kill (DLR-95 AC2)', () => {
  it('holds null while the encounter is still live', () => {
    const state = createRoundUiState(seedOneTapKill(4))
    expect(state.unplayedAtResolve).toBeNull()

    // One tap only POISES the plate — nothing has been cashed and nothing has died.
    const poised = roundReducer(state, applyDamage)
    expect(isEncounterResolved(poised.encounter)).toBe(false)
    expect(poised.unplayedAtResolve).toBeNull()
  })

  it('freezes the player’s hand size on the transition that empties the Quarry’s bar', () => {
    const state = createRoundUiState(seedOneTapKill(4))
    const handSize = state.round.hands[PlayerSide.Player].length

    const killed = roundReducer(roundReducer(state, applyDamage), applyDamage)

    expect(isEncounterResolved(killed.encounter)).toBe(true)
    expect(killed.encounter.health[DuelSide.Quarry]).toBe(0)
    expect(killed.unplayedAtResolve).toBe(handSize)
  })

  it('never overwrites the captured figure on a later dispatch', () => {
    const state = createRoundUiState(seedOneTapKill(4))
    const killed = roundReducer(roundReducer(state, applyDamage), applyDamage)
    const captured = killed.unplayedAtResolve

    const later = roundReducer(roundReducer(killed, applyDamage), {
      kind: RoundUiActionKind.CarryOn,
    })
    expect(later.unplayedAtResolve).toBe(captured)
  })
})
```

- [x] **Step 2: Run it and confirm the capture assertions fail**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts`
Expected: exits non-zero. The first test passes (the field is seeded `null`); the second fails on `expected null to be 6`, because nothing writes the field yet.

### Task 7: Restructure `roundReducer` so the capture happens at one site ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/roundReducer.ts:47-72` (the exported reducer)
- Test: `src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts` (written in Task 6)

- [x] **Step 1: Rename the existing exported switch to a private `applyAction`**

Change the signature line only. The whole `switch (action.kind) { … }` body is unchanged.

```ts
/** Every action's own transition. Private since DLR-95: `roundReducer` below is the exported
 *  entry point, and it runs this function's result through `captureUnplayed`. */
function applyAction(state: RoundUiState, action: RoundUiAction): RoundUiState {
  switch (action.kind) {
```

- [x] **Step 2: Add the exported wrapper and the capture, immediately above `applyAction`**

```ts
export function roundReducer(state: RoundUiState, action: RoundUiAction): RoundUiState {
  return captureUnplayed(applyAction(state, action))
}

/**
 * DLR-95 AC2 — ONE site for "how many cards were left when the Quarry went down", rather than one
 * at each of the three places an encounter can currently become resolved (`handleTapApplyDamage`,
 * and `commit`'s two `applyResolution` calls). A fourth way to end a fight — and this file has
 * gained one per ticket for four tickets running — is covered for free.
 *
 * Writes exactly once: the first transition after which the encounter reads resolved and the field
 * is still `null`. The null check IS the "has this already been captured" test, which is why no
 * `before` state is needed and why this stays a pure function of one argument — so the reducer as
 * a whole stays pure and StrictMode's development double-dispatch recomputes an identical value.
 *
 * Deliberately NOT gated on the winner. A hand that ends with the PLAYER down also freezes the
 * figure; `recordEncounter` is what decides no payout is owed, because deciding that here would be
 * a second reading of a rule `src/hunt/` already owns.
 */
function captureUnplayed(next: RoundUiState): RoundUiState {
  if (next.unplayedAtResolve !== null || !isEncounterResolved(next.encounter)) {
    return next
  }
  return { ...next, unplayedAtResolve: next.round.hands[PlayerSide.Player].length }
}
```

`isEncounterResolved` and `PlayerSide` are both already imported by this file — no import change.

- [x] **Step 3: Run the new spec and the whole reducer-adjacent suite**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts; npm run typecheck`
Expected: Vitest reports `Tests  3 passed`, 0 failed; `typecheck` exits 0.

### Task 8: Carry the figure up through `WarCouncilRoundResult` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncilMount.ts:56-78` (the `WarCouncilRoundResult` interface)
- Modify: `src/app/warCouncil/WarCouncilRound.tsx` (both `onComplete({ … })` literals inside `handleCarryOn`)
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx:230-235`

- [x] **Step 1: Add the field to `WarCouncilRoundResult`, after `poisonGuardHeld`**

```ts
  /** DLR-95 AC2 — how many cards were left in the player's hand at the instant the encounter
   *  resolved, or `null` when this hand did not resolve it. Frozen by the reducer at that
   *  transition rather than read off the live hand here — see `RoundUiState.unplayedAtResolve`
   *  for why the two are not interchangeable. The run consumes it through `recordEncounter`'s
   *  sixth parameter. */
  readonly unplayedAtResolve: number | null
```

- [x] **Step 2: Add the field to both `onComplete` literals in `handleCarryOn`**

Both call sites gain the same line beside `poisonGuardHeld: ui.poisonGuardHeld,`:

```ts
        unplayedAtResolve: ui.unplayedAtResolve,
```

- [x] **Step 3: Pin the reported figure in the test that already drives a mid-hand kill**

In `WarCouncilRound.duelHealthBars.test.tsx`, the test named `reports onComplete with the whole hand’s damage once the encounter resolves mid-hand` destructures `const { encounter } = onComplete.mock.calls[0][0]`. Widen that destructure and add one assertion. That fixture kills on the hand's final trick with both cards played, so the count is 0 — which is the taper's own edge and worth pinning.

```ts
    const { encounter, unplayedAtResolve } = onComplete.mock.calls[0][0]
```

and, after the existing damage assertions:

```ts
    // DLR-95 AC2 — the killing blow is this hand's last trick, so nothing is left unplayed. The
    // 0 is the figure a quick-kill payout would be computed from, not an absence of one.
    expect(unplayedAtResolve).toBe(0)
```

- [x] **Step 4: Run the two affected component specs and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

---

## Phase 3 — The run's own hand counter, and the additive credit

`RunState` gains the hand-within-fight counter and the payout receipt, `recordEncounter` gains its sixth parameter and credits additively, and every one of its 31 call sites is updated in the same phase — because a signature and its readers split across a phase boundary leaves the app silently broken. The `run.test.ts` split comes first so that file never crosses the blocking 400-line budget.

### Task 9: Split the shop blocks out of `run.test.ts` ✓

- Skill: react-frontend

**Files:**

- Create: `src/hunt/__tests__/run.shop.test.ts`
- Modify: `src/hunt/__tests__/run.test.ts` — remove lines 266-321 and 385-397, and the imports they were the only users of

- [x] **Step 1: Create `run.shop.test.ts` holding the two moved describe blocks verbatim**

Move `describe('buyFromShop (DLR-84)', …)` (currently `run.test.ts:266-321`) and `describe('shopStockFor (DLR-84)', …)` (currently `run.test.ts:385-397`) into the new file **unchanged** — no test body is edited, only relocated. Neither block calls `recordEncounter`, which is why they are the clean cut. The new file's header:

```ts
import { describe, expect, it } from 'vitest'
import { buyFromShop, shopStockFor, startRun } from '../run'
import { CHEAT_PRICE, HEAL_HEALTH_RESTORED, HEAL_PRICE, PLAYER_START_HEALTH } from '../config'
import { ShopItem } from '../shop'
import { DuelSide } from '../types'

// DLR-95 Phase 3 — split out of `run.test.ts` before that file's 21 `recordEncounter` call sites
// each gained a sixth argument, which would have pushed it past the blocking 400-line budget
// (`CLAUDE.md`, `react-frontend`). A pure move: no expression or assertion below differs from what
// `run.test.ts` held. Follows the existing `run.flask.test.ts` / `run.whetstone.test.ts` sibling
// convention.
```

- [x] **Step 2: Delete the two blocks from `run.test.ts` and drop its now-unused imports**

Remove `buyFromShop` and `shopStockFor` from the `from '../run'` import, and `CHEAT_PRICE`, `HEAL_PRICE`, `HEAL_HEALTH_RESTORED` from the `from '../config'` import, and delete the `import { ShopItem } from '../shop'` line entirely. **Keep** `PLAYER_START_HEALTH` and `DuelSide` — both are still used by the remaining tests and the `damage` helper.

- [x] **Step 3: Confirm both files pass and neither is over budget**

Run: `npx vitest run src/hunt/__tests__/run.test.ts src/hunt/__tests__/run.shop.test.ts; npm run lint`
Expected: Vitest reports the same total count as before the move, 0 failed; `lint` exits 0 with no unused-import error.

- [x] **Step 4: Measure the line counts**

Run: `(Get-Content src\hunt\__tests__\run.test.ts).Count; (Get-Content src\hunt\__tests__\run.shop.test.ts).Count`
Expected: `run.test.ts` under 340 (it was 397); `run.shop.test.ts` under 100. **Use `(Get-Content …).Count`, not `Measure-Object -Line`** — the latter drops blank lines and has already hidden a real breach on this project.

### Task 10: Add the two `RunState` fields ✓

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/run.ts:44-108` (the `RunState` interface and `startRun`)

- [x] **Step 1: Add both fields to `RunState`, after `flaskCharges`**

```ts
  /** DLR-95 AC3 — which hand OF THE CURRENT FIGHT is being played. 1-BASED: a fight's first hand
   *  is 1.
   *
   *  DISTINCT from `App.tsx`'s `hand`, which AC3 forbids repurposing: that one is monotonic across
   *  the WHOLE run because it is React's remount `key` and feeds `dealerForRound`'s parity, so it
   *  can never reset. This one must reset at every fight boundary and answers a different
   *  question.
   *
   *  Lives on the run rather than in the driver because AC3's requirement is a reset "whenever a
   *  new encounter starts", and `startRun`/`advanceRun` are exactly the two functions that start
   *  one — which makes the reset structural instead of something three separate callbacks have to
   *  remember. `recordEncounter` advances it. NEVER persisted, exactly as `coins` above. */
  readonly handOfFight: number
  /** DLR-95 AC6 — the receipt: what the quick-kill payout paid for the encounter just recorded, so
   *  the verdict renders a figure the run RECORDED rather than re-deriving the rule from state a
   *  component would have to hold in parallel. `RunOutcomePanel` computes nothing, and this is
   *  what keeps that true.
   *
   *  Written on EVERY `recordEncounter`, `0` included — a field written only on a win is the field
   *  that shows the last fight's payout on this one's verdict. NEVER persisted, exactly as `coins`
   *  above. */
  readonly lastQuickKillPayout: Coins
```

- [x] **Step 2: Seed both in `startRun`, after `flaskCharges`**

```ts
    handOfFight: 1,
    lastQuickKillPayout: 0,
```

- [x] **Step 3: Typecheck and confirm the expected breakage is only in `runTransitions.ts`**

Run: `npm run typecheck`
Expected: exits 0. `startRun` is the sole constructor of a `RunState`, and every other producer spreads an existing one, so adding two required fields breaks nothing.

### Task 11: Credit the payout in `recordEncounter` and reset the counter in `advanceRun` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/runTransitions.ts:11-19` (imports), `:34-71` (`recordEncounter`), `:78-93` (`advanceRun`), and the private-helper block near `guardAfter`/`flaskAfter`

- [x] **Step 1: Import the payout function**

Add `quickKillPayout` to the imports, from `./quickKill`, and `type Coins` to the existing `./types` type import:

```ts
import { quickKillPayout } from './quickKill'
import { DuelSide, type Coins, type EncounterState, type Health } from './types'
```

- [x] **Step 2: Add the sixth parameter and extend `recordEncounter`'s docblock**

```ts
 * `unplayedCards` (DLR-95 AC2) is REQUIRED, not defaulted, for the reason `cheats` and
 * `envenomCharges` above are: the compiler must enumerate every call site. A defaulted `null`
 * would pay 0 forever the first time a driver forgot to thread the figure through, and would do it
 * silently. `null` is the legitimate value for a hand that did not end the fight.
 */
export function recordEncounter(
  run: RunState,
  encounter: EncounterState,
  cheats: readonly CheatCard[],
  envenomCharges: number,
  poisonGuardHeld: boolean,
  unplayedCards: number | null,
): RunState {
```

- [x] **Step 3: Compute the payout and credit it additively**

Directly below the existing `const wonThisEncounter = …` line:

```ts
  // DLR-95 AC1 — ADDITIVE, settled by the developer 2026-08-20: a win pays the flat coin AND the
  // quick kill. The alternative reading (this payout REPLACING the flat coin) would make a
  // fourth-hand kill pay literally nothing for winning a fight, which is the outcome the taper is
  // explicitly designed to avoid. Do not "simplify" the sum below back into a replacement.
  //
  // `run.handOfFight` is the hand just PLAYED — `handOfFightAfter` has not run yet — so it is the
  // hand the kill landed in, which is the figure AC2 scales by.
  const quickKill: Coins =
    wonThisEncounter && unplayedCards !== null
      ? quickKillPayout({ unplayedCards, handOfFight: run.handOfFight })
      : 0
```

and change the returned object's `coins` line, adding the two new fields beside it:

```ts
    coins: wonThisEncounter ? run.coins + COINS_PER_ENCOUNTER_WIN + quickKill : run.coins,
    lastQuickKillPayout: quickKill,
    handOfFight: handOfFightAfter(run, encounter),
```

- [x] **Step 4: Add the private helper beside `guardAfter` and `flaskAfter`**

```ts
/**
 * DLR-95 AC3 — ONE statement of "a fight that continues moves on to its next hand; a fight that
 * ended stays on the hand it ended in, and `advanceRun` is what resets it".
 *
 * A named function rather than an inline ternary, following `guardAfter` and `flaskAfter`
 * immediately above and for their reason: a second transition adopting a hand's end state is
 * exactly the kind of thing that gets added without remembering this rule, and a named rule is
 * what a reviewer finds.
 *
 * Holding the counter still on the deciding hand — rather than incrementing past it — is what lets
 * the verdict and any later reader say which hand the kill landed in.
 */
function handOfFightAfter(run: RunState, encounter: EncounterState): number {
  return isEncounterResolved(encounter) ? run.handOfFight : run.handOfFight + 1
}
```

- [x] **Step 5: Reset the counter in `advanceRun`**

In `advanceRun`'s returned object, beside `encounterIndex` and `outcome`:

```ts
    handOfFight: 1,
```

`lastQuickKillPayout` deliberately rides through the spread untouched — the verdict is never on screen at that point, and the next `recordEncounter` overwrites it.

- [x] **Step 6: Typecheck and read off the call sites that now fail**

Run: `npm run typecheck`
Expected: exits non-zero with `Expected 6 arguments, but got 5` at 32 sites — `src/App.tsx` plus the 31 in `src/hunt/__tests__/`. That enumeration is the point of the required parameter; Task 12 clears it.

### Task 12: Thread the count through every `recordEncounter` call site ✓

- Skill: react-frontend

**Files:**

- Modify: `src/App.tsx` (`handleComplete`)
- Modify: `src/hunt/__tests__/run.test.ts` (20 calls), `run.flask.test.ts` (4), `envenom.test.ts` (3), `poisonGuard.test.ts` (3), `run.whetstone.test.ts` (1)

- [x] **Step 1: Pass the reported figure in `App.tsx`**

```ts
    const recorded = recordEncounter(
      run,
      result.encounter,
      result.cheats,
      result.envenomCharges,
      result.poisonGuardHeld,
      result.unplayedAtResolve,
    )
```

The driver passes it straight through without inspecting it — `src/hunt/` owns whether a payout is owed.

- [x] **Step 2: Append `null` to all 31 test call sites**

Every existing test is asserting behaviour that predates this mechanic, so `null` — "this hand reported no quick-kill figure" — preserves each one's meaning exactly: `quickKill` computes to 0 and the coin assertions are unchanged. Do **not** invent a card count at a site that was not testing this.

- [x] **Step 3: Typecheck and run the whole `src/hunt` node suite**

Run: `npm run typecheck; npx vitest run src/hunt`
Expected: `typecheck` exits 0 with no remaining argument-count errors; Vitest reports 0 failed.

### Task 13: Pin the credit, the counter's lifecycle, and the receipt ✓

- Skill: react-frontend

**Files:**

- Test: `src/hunt/__tests__/run.quickKill.test.ts`

- [x] **Step 1: Create the spec**

```ts
import { describe, expect, it } from 'vitest'
import { advanceRun, recordEncounter, startRun } from '../run'
import { applyDamage } from '../encounter'
import { COINS_PER_ENCOUNTER_WIN, HAND_SIZE, PLAYER_START_HEALTH } from '../config'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

const damage = (toPlayer: number, toQuarry: number): IncomingDamage => ({
  [DuelSide.Player]: toPlayer,
  [DuelSide.Quarry]: toQuarry,
})

/** The same two-event split `run.test.ts`'s own `winEncounter` helper uses, and for its reason:
 *  D7 spares the player on any event that empties the Quarry's bar, so a single simultaneous
 *  event would leave the player's loss unapplied. */
function winEncounter(encounter: EncounterState): EncounterState {
  return applyDamage(encounter, damage(0, encounter.health[DuelSide.Quarry]))
}

/** Record an unresolved hand — the fight goes on, so the counter advances. */
function playAnotherHand(run: ReturnType<typeof startRun>) {
  return recordEncounter(
    run,
    applyDamage(run.encounter, damage(1, 1)),
    run.cheats,
    run.envenomCharges,
    run.poisonGuardHeld,
    null,
  )
}

describe('handOfFight — the hand-within-encounter counter (AC3)', () => {
  it('opens a run on its first hand', () => {
    expect(startRun().handOfFight).toBe(1)
  })

  it('advances only while the fight is unresolved', () => {
    const run = startRun()
    expect(playAnotherHand(run).handOfFight).toBe(2)
    expect(playAnotherHand(playAnotherHand(run)).handOfFight).toBe(3)
  })

  it('holds still on the hand that ended the fight, so the kill’s tier stays readable', () => {
    const second = playAnotherHand(startRun())
    const won = recordEncounter(
      second,
      winEncounter(second.encounter),
      second.cheats,
      second.envenomCharges,
      second.poisonGuardHeld,
      3,
    )
    expect(won.handOfFight).toBe(2)
  })

  it('resets to 1 when the next fight opens (AC3)', () => {
    const third = playAnotherHand(playAnotherHand(startRun()))
    const won = recordEncounter(
      third,
      winEncounter(third.encounter),
      third.cheats,
      third.envenomCharges,
      third.poisonGuardHeld,
      0,
    )
    expect(advanceRun(won).handOfFight).toBe(1)
  })
})

describe('recordEncounter — the quick-kill payout (AC1, AC2, AC4, AC5)', () => {
  function winOn(handOfFight: number, unplayedCards: number) {
    let run = startRun()
    for (let i = 1; i < handOfFight; i += 1) run = playAnotherHand(run)
    return recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.envenomCharges,
      run.poisonGuardHeld,
      unplayedCards,
    )
  }

  // The design doc's worked example, credited: 5 × 2 = 10, PLUS the flat coin (AC1, resolved
  // additive by the developer 2026-08-20).
  it('pays the flat win coin AND the quick-kill payout on a first-hand kill (AC1)', () => {
    const won = winOn(1, 5)
    expect(won.lastQuickKillPayout).toBe(10)
    expect(won.coins).toBe(COINS_PER_ENCOUNTER_WIN + 10)
  })

  it('halves into a floored payout on a third-hand kill (AC2, AC4)', () => {
    const won = winOn(3, 5)
    expect(won.lastQuickKillPayout).toBe(2)
    expect(won.coins).toBe(COINS_PER_ENCOUNTER_WIN + 2)
  })

  it('still pays the flat coin when the taper pays nothing (AC5)', () => {
    const won = winOn(4, HAND_SIZE)
    expect(won.lastQuickKillPayout).toBe(0)
    expect(won.coins).toBe(COINS_PER_ENCOUNTER_WIN)
  })

  it('pays nothing extra when the hand reported no figure', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      winEncounter(run.encounter),
      run.cheats,
      run.envenomCharges,
      run.poisonGuardHeld,
      null,
    )
    expect(won.lastQuickKillPayout).toBe(0)
    expect(won.coins).toBe(COINS_PER_ENCOUNTER_WIN)
  })

  it('pays nothing at all when the player is the one who went down', () => {
    const run = startRun()
    const dead = applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0))
    const lost = recordEncounter(run, dead, run.cheats, run.envenomCharges, run.poisonGuardHeld, 6)
    expect(lost.lastQuickKillPayout).toBe(0)
    expect(lost.coins).toBe(0)
  })

  it('clears the receipt on a hand that resolved nothing, so a stale figure cannot be shown', () => {
    const paid = winOn(1, 5)
    expect(paid.lastQuickKillPayout).toBe(10)
    expect(playAnotherHand(advanceRun(paid)).lastQuickKillPayout).toBe(0)
  })
})
```

- [x] **Step 2: Run it**

Run: `npx vitest run src/hunt/__tests__/run.quickKill.test.ts`
Expected: exits 0; Vitest reports `Tests  10 passed`, 0 failed.

- [x] **Step 3: Typecheck and lint the phase**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

---

## Phase 4 — The verdict names what it paid

The last wiring: the copy, the panel prop, the style, and the driver line that connects the run's receipt to the screen. Layout and wording follow `mockup.html` in this folder. Nothing in `src/hunt/` or `src/warCouncil/` changes in this phase.

### Task 14: Add the reward copy to `runLabels.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/run/runLabels.ts` (append beside `unspentCoinsText`)
- Test: `src/app/run/__tests__/runLabels.test.ts`

- [x] **Step 1: Add `coinsText` and `rewardText`**

```ts
/** `1 coin` / `3 coins`. ONE statement of the plural, so two readouts of the same purse cannot
 *  disagree about it. */
export function coinsText(coins: Coins): string {
  return `${coins} coin${coins === 1 ? '' : 's'}`
}

/**
 * DLR-95 AC1/AC6 — what the win paid, with the two payouts NAMED SEPARATELY so a quick kill never
 * reads as the flat coin having grown. AC1 is additive (developer, 2026-08-20), which is why this
 * is two clauses rather than one figure.
 *
 * The quick-kill clause is omitted entirely at 0 — AC5's taper read as copy, so a slow fight's
 * verdict does not advertise a mechanic that paid it nothing.
 *
 * PLACEHOLDER COPY, exactly as this file's header states all of it is.
 */
export function rewardText(winCoins: Coins, quickKillPayout: Coins): string {
  const flat = `Fight won +${coinsText(winCoins)}`
  return quickKillPayout > 0
    ? `${flat} · ${QUICK_KILL_LABEL} +${coinsText(quickKillPayout)}`
    : flat
}

export const QUICK_KILL_LABEL = 'Quick kill'
```

Change `unspentCoinsText` to read through the new helper, so the plural is stated once:

```ts
export function unspentCoinsText(coins: Coins): string {
  return `You still have ${coinsText(coins)} to spend.`
}
```

- [x] **Step 2: Add the spec's cases to `runLabels.test.ts`**

```ts
describe('rewardText (DLR-95 AC1, AC6)', () => {
  it('names both payouts when the quick kill fired', () => {
    expect(rewardText(1, 10)).toBe('Fight won +1 coin · Quick kill +10 coins')
  })

  it('drops the quick-kill clause entirely when it paid nothing (AC5)', () => {
    expect(rewardText(1, 0)).toBe('Fight won +1 coin')
  })

  it('singularises a one-coin quick kill', () => {
    expect(rewardText(1, 1)).toBe('Fight won +1 coin · Quick kill +1 coin')
  })
})
```

Add `rewardText` to that file's existing import from `../runLabels`.

- [x] **Step 3: Run the labels spec**

Run: `npx vitest run src/app/run/__tests__/runLabels.test.ts`
Expected: exits 0, 0 failed.

### Task 15: Render the reward line on `RunOutcomePanel` ✓

- Skill: react-frontend, game-ux

**Files:**

- Modify: `src/app/run/RunOutcomePanel.tsx` (props interface, destructure, and the JSX above `.run-carry`)
- Modify: `src/app/run/run.css` (append `.run-reward`)
- Test: `src/app/run/__tests__/RunOutcomePanel.test.tsx`

- [x] **Step 1: Add the two props**

```ts
  /** DLR-95 AC6 — what the quick kill paid, straight off `RunState.lastQuickKillPayout`. `0` when
   *  it did not fire, in which case the line names the flat coin alone. */
  readonly quickKillPayout: Coins
  /** DLR-95 AC1 — the flat per-win coin, HANDED IN rather than imported, so this panel keeps its
   *  documented "computes NOTHING" property and reads no configuration of its own. */
  readonly winCoins: Coins
```

- [x] **Step 2: Render the line directly above the existing `.run-carry` paragraph**

Gated on the outcome rather than on `canContinue`: the final fight of a won run pays a quick kill too, and `canContinue` is false there.

```tsx
        {outcome === RunOutcome.Lost ? null : (
          <p className="run-reward" role="status">
            {rewardText(winCoins, quickKillPayout)}
          </p>
        )}
```

Add `rewardText` to the existing import from `./runLabels`.

- [x] **Step 3: Style it, joining the existing label rule group**

In `run.css`, add `.run-reward` to the shared selector list that already carries `.run-tricks-label, .run-carry, .run-position`, then append its own block. Per `mockup.html`: a bracketed receipt, distinguishable in greyscale because the words differ and the separator is a middot — the tint reinforces, it does not carry the state.

```css
/* DLR-95 AC6 — the win's receipt. Bracketed rather than merely tinted, following `.run-warning`
   above, so it reads as a stated figure in greyscale too. Adds no interactive element, so it costs
   no tap and no tab stop. Every value below is the DEVELOPER'S to retune. */
.run-reward {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid #ffffff14;
  border-radius: 3px;
  background: #ffffff08;
  font-variant-numeric: tabular-nums;
}
```

- [x] **Step 4: Add the panel's spec cases**

Add `quickKillPayout: 10` and `winCoins: 1` to the shared `baseProps` object, then:

```tsx
describe('RunOutcomePanel — the quick-kill receipt (DLR-95 AC6)', () => {
  it('names both payouts on a won fight', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.getByText(rewardText(1, 10))).toBeTruthy()
  })

  it('names the flat coin alone when the taper paid nothing (AC5)', () => {
    render(
      <RunOutcomePanel
        {...baseProps}
        quickKillPayout={0}
        outcome={RunOutcome.InProgress}
        canContinue
      />,
    )
    expect(screen.getByText(rewardText(1, 0))).toBeTruthy()
  })

  it('shows the receipt on the final fight of a won run, where canContinue is false', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.Won} canContinue={false} />)
    expect(screen.getByText(rewardText(1, 10))).toBeTruthy()
  })

  it('shows no receipt at all on a lost run', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.Lost} canContinue={false} />)
    expect(screen.queryByText(rewardText(1, 10))).toBeNull()
    expect(screen.queryByText(rewardText(1, 0))).toBeNull()
  })
})
```

Add `rewardText` to that file's existing import from `../runLabels`.

- [x] **Step 5: Run the panel spec and typecheck**

Run: `npx vitest run src/app/run/__tests__/RunOutcomePanel.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed. `typecheck` exits non-zero at `src/App.tsx` — the panel's two new required props are not supplied yet; Task 16 clears it.

### Task 16: Wire the receipt through `App.tsx` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/App.tsx` — the `./hunt` import list and the `<RunOutcomePanel …>` element

- [x] **Step 1: Import the flat coin's key**

Add `COINS_PER_ENCOUNTER_WIN,` to the existing alphabetical `from './hunt'` import block.

- [x] **Step 2: Pass both props on the `RunOutcomePanel` element**

```tsx
        coins={run.coins}
        quickKillPayout={run.lastQuickKillPayout}
        winCoins={COINS_PER_ENCOUNTER_WIN}
```

No new state and no new effect: `handOfFight` lives on `RunState`, and the run-global `hand` above is untouched (AC3).

- [x] **Step 3: Typecheck and measure the file**

Run: `npm run typecheck; (Get-Content src\App.tsx).Count`
Expected: `typecheck` exits 0; `App.tsx` under 320 lines (it was 304).

---

## Phase 5 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 17: Confirm the pure-core boundary still holds ✓

- Skill: none — a verification grep, no code written

**Files:**

- (no file is created, modified or deleted)

- [x] **Step 1: Grep the pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. The recursive `Get-ChildItem` form is required — `Select-String -Path` with `**` reaches only one directory level and would report a false zero.
Result: zero hits, confirmed.

### Task 18: Confirm no tunable was hard-coded and no file is over budget ✓

- Skill: none — verification only, no code written

**Files:**

- (no file is created, modified or deleted)

- [x] **Step 1: Confirm the tier curve's literals appear only in configuration**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "QUICK_KILL_TIER_MULTIPLIERS"`
Expected: hits only in `src/hunt/config.ts` (the declaration), `src/hunt/index.ts` (the barrel), `src/hunt/quickKill.ts` (the one reader), and `src/hunt/__tests__/quickKill.test.ts`. No other file may read the curve, and no reader may write `2`, `1` or `0.5` as a literal tier.
Result: exactly those four files, no others.

- [x] **Step 2: Measure every file this contract created or grew**

Run: `Get-ChildItem src\hunt\quickKill.ts,src\hunt\run.ts,src\hunt\runTransitions.ts,src\App.tsx,src\app\warCouncil\roundReducer.ts,src\app\warCouncil\roundUiState.ts,src\app\run\RunOutcomePanel.tsx,src\app\run\runLabels.ts,src\hunt\__tests__\run.test.ts,src\hunt\__tests__\run.shop.test.ts,src\hunt\__tests__\run.quickKill.test.ts,src\hunt\__tests__\quickKill.test.ts,src\app\warCouncil\__tests__\roundReducer.quickKill.test.ts,src\app\run\__tests__\RunOutcomePanel.test.tsx,src\app\run\__tests__\runLabels.test.ts | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName).Count)" }`
Expected: every count under 400. **`(Get-Content …).Count`, never `Measure-Object -Line`** — the latter drops blank lines and hid a real breach on DLR-63.
Result: quickKill.ts 61, run.ts 199, runTransitions.ts 296, App.tsx 308, roundReducer.ts 380, roundUiState.ts 235, RunOutcomePanel.tsx 189, runLabels.ts 137, run.test.ts 339, run.shop.test.ts 82, run.quickKill.test.ts 130, quickKill.test.ts 79, roundReducer.quickKill.test.ts 66, RunOutcomePanel.test.tsx 236, runLabels.test.ts 138 — all under 400.

### Task 19: Static gates and the full suite ✓

- Skill: none — verification only, no code written

**Files:**

- (no file is created, modified or deleted)

- [x] **Step 1: Warm the transform cache by running the two Vitest projects separately**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. This step exists because a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is a worker-start timeout on the `dom` project and **not** a failing test.
Result: node project — `Test Files 48 passed (48)`, `Tests 757 passed (757)`. dom project — `Test Files 24 passed (24)`, `Tests 198 passed (198)`. Both exit 0.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed and a file count that includes the four new spec files.
Result: typecheck exit 0, no errors. lint exit 0, no warnings/errors output. Unfiltered suite — `Test Files 72 passed (72)`, `Tests 955 passed (955)`.

- [x] **Step 3: Formatting, scoped to what this contract changed**

Run: `npx prettier --check src/hunt/quickKill.ts src/hunt/config.ts src/hunt/index.ts src/hunt/run.ts src/hunt/runTransitions.ts src/App.tsx src/app/warCouncilMount.ts src/app/warCouncil/roundReducer.ts src/app/warCouncil/roundUiState.ts src/app/warCouncil/WarCouncilRound.tsx src/app/run/RunOutcomePanel.tsx src/app/run/runLabels.ts src/app/run/run.css`
Expected: exits 0. Scoped deliberately — the repo-wide `npm run format:check` fails on pre-existing `.docs/**` files no current contract has touched, and fixing that is not this contract's work.
Result: **FAILED, exit 1**. `[warn] src/app/run/runLabels.ts` — `Code style issues found in the above file`. The multi-line ternary in `rewardText` (Task 14's exact snippet) collapses to one line under this repo's Prettier config. Not fixed in this phase per the no-production-edit constraint — reported as a finding for the developer/fix-pass.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Result: exit 0. `dist/index.html`, `dist/assets/index-DBhihuYh.css` (34.80 kB), `dist/assets/index-BKPB_M46.js` (253.76 kB). `✓ built in 218ms`.

### Task 20: Update the PR description ✓

- Skill: none — a written hand-off, no code

**Files:**

- Create: `.claude/contract/DLR-95-quick-kill-payout/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` and `mockup.html` in this folder.
- Summary of the change: the tier curve as one config key, the pure `quickKill.ts`, `RunState.handOfFight` and `lastQuickKillPayout`, the reducer's single capture site, and the verdict's receipt line.
- **AC1's resolution — additive — attributed to the developer, 2026-08-20**, with the note that the sum in `recordEncounter` must not be "simplified" back into a replacement.
- Every decision the developer must make and every behaviour they must judge by playing, copied from the File map's "Developer decides or observes" block above.
- Verification results from Phase 5, quoting the actual Vitest summary line and the measured line counts.
- A one-line note for future contributors on the new convention: the reducer's exported `roundReducer` is now a wrapper over a private `applyAction`, so a new action goes in the switch and any new "observe the state after every transition" rule goes in the wrapper.

---

## Self-review

(Filled by the planner before handing off so the executor can confirm coverage.)

**Spec coverage:**

- AC1 — the payout is credited alongside `COINS_PER_ENCOUNTER_WIN`, additive per the developer's 2026-08-20 decision — Task 11, pinned by Task 13.
- AC2 — `unplayedCards × tierMultiplier` with the `[2, 1, 0.5]` curve — Tasks 1, 3; the count's capture at the kill instant, Tasks 5, 6, 7, 8.
- AC3 — a hand-within-encounter counter distinct from the run-global one — Tasks 10, 11 (advance and reset), pinned by Task 13. `App.tsx`'s `hand` is not touched in any task.
- AC4 — `Math.floor` before crediting — Task 3, pinned by Task 2's fractional cases and Task 13's third-hand case.
- AC5 — the fourth hand and beyond pays exactly 0 — Task 3's `?? 0` on the curve's end, pinned by Task 2, Task 13, and the copy's own omission in Tasks 14 and 15.
- AC6 — the payout is visible on the verdict, distinct from the flat coin — Tasks 14, 15, 16; layout and copy from `mockup.html`.
- AC7 — the worked example as a pinned regression test, each tier, the zero tier, the fractional case — all four in Task 2, with the credit-level equivalents in Task 13.
- In-scope bullet "splitting `run.test.ts`" — Task 9.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. No step runs bare `vitest`, `npm run dev`, edits `package-lock.json`, or invents a tuning value. No `Skill: none` sits on a task that writes TypeScript — the four `none` tasks are verification greps and a written hand-off.

**Type / name consistency:** `QUICK_KILL_TIER_MULTIPLIERS`, `QuickKill`, `quickKillTierMultiplier`, `quickKillPayout`, `unplayedCards`, `handOfFight`, `handOfFightAfter`, `lastQuickKillPayout`, `unplayedAtResolve`, `applyAction`, `captureUnplayed`, `coinsText`, `rewardText`, `QUICK_KILL_LABEL`, `quickKillPayout`/`winCoins` (props) and the CSS class `.run-reward` are each spelled identically in every task that names them, and each matches `plan.md` Part 2 → Data shapes. `quickKillPayout` is deliberately both a function name in `src/hunt/` and a prop name on `RunOutcomePanel`; the panel imports `rewardText`, never the function, so the two never share a scope.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: a new config key, a new module, its barrel exports and its spec. Nothing outside `src/hunt/` is referenced and no existing signature changes.
- **Phase 2** ends type-checking: three interfaces gain one optionalless field each and both producers are updated in the same phase. The reducer restructuring is a rename plus a pure wrapper — no behaviour change — and the field it writes is not yet read by anything.
- **Phase 3** ends type-checking: the signature change and all 32 of its call sites land inside the phase (Tasks 11 and 12), and the `run.test.ts` split (Task 9) runs before the edits that would otherwise breach its line budget. There is no intermediate task at which `recordEncounter` and its callers disagree across a *phase* boundary.
- **Phase 4** ends type-checking: `RunOutcomePanel`'s two new required props are added in Task 15 and supplied by its only caller in Task 16, within the same phase.
- **Phase 5** changes no production code at all.
