# Tasks: Two-branch buff projection â€” what would fire if you play THIS card, take it or not

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-27

**Goal:** Add one pure module that answers, for a single candidate card, which activated buffs would fire and what they would pay on each branch â€” take the trick or not â€” computed by calling the same `firedBuffs` and `resolveFiredBuffs` the real trick resolution calls, reporting rather than guessing what the face-down Quarry card leaves undecidable.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**

- `src/warCouncil/buffProjection.ts` â€” the two-branch projection and the `reach` count; pure, plain values in, plain values out.
- `src/warCouncil/__tests__/buffProjection.test.ts` â€” Vitest coverage for AC1â€“AC8.

**Modified:**

- `src/warCouncil/buffTrickFacts.ts:17-53` â€” export the `Suit â†’ BuffTargetSuit` crossing as `targetSuitOf(suit)`; `TARGET_SUIT` itself stays private and `buffTrickFactsFor` uses the new function.
- `src/warCouncil/index.ts:35-36` â€” re-export `targetSuitOf` alongside `buffTrickFactsFor`, and add the new module's public surface.

**Deleted:** (none)

**Developer decides or observes:** (none)

Confirmed at the Step 3 approval gate: the `outcomes[]` branch shape that follows from DLR-150's `trickIsLoss`, the derived (rather than `sidestep`-named) `indeterminate` set, the caller-supplied `playerHit`/`bankAfterTrick`, the `won`/`lost` branch names, the absence of a `gain` delta, and `reach` counting indeterminate cards. No tuning value is introduced, and there is no visible surface to judge by playing â€” this ticket is verified entirely by Vitest and the static gates.

---

## Phase 1 â€” The suit crossing, shared rather than copied

One mechanical widening, alone in its own phase because it is the only change to an existing file that other code already calls. It ends type-checking with `buffTrickFactsFor` behaving identically â€” the map is still stated once, it is just now reachable by name.

### Task 1: Export the `Suit â†’ BuffTargetSuit` crossing from `src/warCouncil/buffTrickFacts.ts` âœ“

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/buffTrickFacts.ts:17-53`
- Test: `src/warCouncil/__tests__/buffTrickFacts.test.ts` (existing spec â€” must still pass unchanged; do not edit it)

- [x] **Step 1: Add `targetSuitOf` immediately below the `TARGET_SUIT` declaration and route the two existing lookups through it**

`TARGET_SUIT` stays `const` and stays module-private, so it remains the single total map and a member added to `Suit` still fails to compile in this file. Insert after the `TARGET_SUIT` object literal closes (currently line 21):

```ts
/** The `Suit â†’ BuffTargetSuit` crossing, as a function so a second module can reuse the ONE
 *  statement of it rather than making a second map. `TARGET_SUIT` stays private and stays
 *  total, so a member added to `Suit` still fails to compile here rather than mapping to
 *  `undefined`. */
export function targetSuitOf(suit: Suit): BuffTargetSuit {
  return TARGET_SUIT[suit]
}
```

Then replace the two lookups inside `buffTrickFactsFor` (currently lines 50 and 52):

```ts
        playerSuits: played.map((t) => targetSuitOf(t.card.suit)),
        playerRanks: played.map((t) => t.card.rank),
        remainingSuits: remainingHand.map((c) => targetSuitOf(c.suit)),
```

The `Suit` import at the top of the file is already a value import (`import { PlayerSide, Suit, type Card, type TrickCard } from './types'`) â€” leave it as it is.

- [x] **Step 2: Confirm the existing spec still passes and the types are sound**

Run: `npx vitest run src/warCouncil/__tests__/buffTrickFacts.test.ts; npm run typecheck`
Expected: Vitest reports `Tests  5 passed` (or whatever that file currently holds, all passing, 0 failed) and `tsc -b` exits 0 with no errors.

### Task 2: Re-export `targetSuitOf` from `src/warCouncil/index.ts` âœ“

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/index.ts:35`

- [x] **Step 1: Widen the existing `buffTrickFacts` export line**

Replace line 35:

```ts
export { buffTrickFactsFor } from './buffTrickFacts'
```

with:

```ts
export { buffTrickFactsFor, targetSuitOf } from './buffTrickFacts'
```

Leave line 36 (`export type { BuffHandInput } from './buffTrickFacts'`) untouched.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 â€” The projection module

The substance of the ticket. Test-first, because every acceptance criterion here is a stated invariant and the module's whole value is that it agrees with the resolver. The phase ends with `buffProjection.ts` complete, exported, type-checking, and its spec green â€” the codebase is internally consistent at every task boundary because the module has no consumer inside `src/` yet.

### Task 3: Write the failing spec for the two branches, the equivalence guarantee, and the caps âœ“

- Skill: `react-frontend`

**Files:**

- Test: `src/warCouncil/__tests__/buffProjection.test.ts` (create)

- [x] **Step 1: Create the spec with its fixtures and the AC1/AC2/AC3/AC4 cases**

A `.test.ts` under `src/warCouncil/__tests__/`, so it is collected by the `node` Vitest project and needs no DOM. Buff fixtures follow `src/hunt/__tests__/buffCarry.test.ts`'s literal-`Buff` shape; the equivalence case in Step 2's task uses real templates the way `buffEvaluation.test.ts` does.

```ts
import { describe, expect, it } from 'vitest'
import {
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  PLAYER_START_HEALTH,
  startHandAccrual,
  type Buff,
} from '../../hunt'
import { TrickOutcome } from '../bank'
import {
  buffReach,
  projectBuffBranches,
  type BuffProjectionFacts,
  type BuffProjectionInput,
} from '../buffProjection'
import { Suit, type Card } from '../types'

/**
 * DLR-152 â€” the two-branch projection. Every case here asserts that the projection AGREES with
 * the resolver rather than that it produces a particular number: the module's whole reason to
 * exist is that a preview derived from a second copy of the rules drifts from the rules.
 */

const bellsCard: Card = { suit: Suit.Bells, rank: 4 }
const keysCard: Card = { suit: Suit.Keys, rank: 6 }

const bladeTaker: Buff = {
  id: 1,
  kind: BuffKind.Taker,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.Taker, target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
}

const bladeFeeder: Buff = {
  id: 2,
  kind: BuffKind.Feeder,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.Feeder, target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
}

const momentumSidestep: Buff = {
  id: 3,
  kind: BuffKind.Sidestep,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.Sidestep, target: {} },
  reward: { axis: BuffRewardAxis.Multiplier, value: 2 },
}

/** Every field of `BuffProjectionFacts` at its neutral value. The five fields the projection
 *  itself supplies â€” playerWon, skullTrick, playerSuits, playerRanks, remainingSuits â€” are
 *  deliberately absent from this type, which is the point of the `Omit`. */
const FACTS: BuffProjectionFacts = {
  playerHit: false,
  finalTrick: false,
  bankAfterTrick: 0,
  tricksWithoutHit: 0,
  coins: 0,
  playerHealth: PLAYER_START_HEALTH,
  applyDamagePressed: false,
}

function input(overrides: Partial<BuffProjectionInput> = {}): BuffProjectionInput {
  return {
    active: [],
    firedThisHand: [],
    accrual: startHandAccrual(),
    facts: FACTS,
    skullTrick: false,
    hand: [bellsCard, keysCard],
    ...overrides,
  }
}

describe('AC1 â€” both branches, for one candidate card', () => {
  it('fires the Taker only on the take branch and the Feeder only on the other', () => {
    const projection = projectBuffBranches(
      input({ active: [bladeTaker, bladeFeeder] }),
      bellsCard,
    )
    expect(projection.won.playerWon).toBe(true)
    expect(projection.lost.playerWon).toBe(false)
    expect(projection.won.fired.map((b) => b.id)).toEqual([1])
    expect(projection.lost.fired.map((b) => b.id)).toEqual([2])
  })

  it('fires neither when the candidate card is off-suit', () => {
    const projection = projectBuffBranches(input({ active: [bladeTaker, bladeFeeder] }), keysCard)
    expect(projection.won.fired).toEqual([])
    expect(projection.lost.fired).toEqual([])
  })

  it('gives each branch exactly one outcome when the skull is known', () => {
    const known = projectBuffBranches(input({ skullTrick: false }), bellsCard)
    expect(known.skullKnown).toBe(true)
    expect(known.won.outcomes.map((o) => o.outcome)).toEqual([TrickOutcome.CleanWin])
    expect(known.lost.outcomes.map((o) => o.outcome)).toEqual([TrickOutcome.CleanLoss])
  })
})

describe('AC3 â€” the Overlap Bonus is computed per branch, never across the union', () => {
  it('never counts a Taker and a Feeder on the same suit toward one Overlap Bonus', () => {
    const projection = projectBuffBranches(
      input({ active: [bladeTaker, bladeFeeder] }),
      bellsCard,
    )
    // One buff fires per branch, so `overlapBonusFor(1)` is 0 on BOTH. A union of the two
    // branches would be 2 fired and a spurious +1 multiplier â€” the mockup's exact defect.
    expect(projection.won.outcomes[0].accrual.multiplierBonus).toBe(0)
    expect(projection.lost.outcomes[0].accrual.multiplierBonus).toBe(0)
    expect(projection.won.outcomes[0].accrual.flatDamageBonus).toBe(1)
  })
})

describe('AC4 â€” the projected multiplier respects the same per-hand cap the live accrual does', () => {
  it('clips at MAX_MULTIPLIER_BONUS_PER_HAND when pushed past it', () => {
    const maxed = { ...startHandAccrual(), multiplierBonus: MAX_MULTIPLIER_BONUS_PER_HAND }
    const bigTaker: Buff = {
      ...bladeTaker,
      reward: { axis: BuffRewardAxis.Multiplier, value: MAX_MULTIPLIER_BONUS_PER_HAND },
    }
    const projection = projectBuffBranches(
      input({ active: [bigTaker], accrual: maxed }),
      bellsCard,
    )
    expect(projection.won.fired.map((b) => b.id)).toEqual([1])
    expect(projection.won.outcomes[0].accrual.multiplierBonus).toBe(MAX_MULTIPLIER_BONUS_PER_HAND)
  })
})
```

- [x] **Step 2: Confirm the spec fails for the right reason**

Run: `npx vitest run src/warCouncil/__tests__/buffProjection.test.ts`
Expected: a **collection/transform failure** naming `Failed to load` or `Cannot find module '../buffProjection'` â€” the module does not exist yet. This is the expected red; it is not a passing run and it is not a defect.

### Task 4: Implement `projectBuffBranches` in `src/warCouncil/buffProjection.ts` âœ“

- Skill: `react-frontend`

**Files:**

- Create: `src/warCouncil/buffProjection.ts`
- Test: `src/warCouncil/__tests__/buffProjection.test.ts` (from Task 3)

- [x] **Step 1: Write the module â€” types, the readings constant, the context builder, and the branch fold**

```ts
import {
  firedBuffs,
  resolveFiredBuffs,
  type Buff,
  type BuffBonusAccrual,
  type BuffId,
  type BuffTrickContext,
} from '../hunt'
import { isTaken, trickOutcomeFor, type TrickOutcome } from './bank'
import { targetSuitOf } from './buffTrickFacts'
import { sameCard } from './cardUtils'
import type { Card } from './types'

/**
 * DLR-152 â€” "if I play THIS card, what do my riding buffs pay â€” whether or not I take the
 * trick". A THIN ADAPTER, never a calculator: it builds a `BuffTrickContext` from plain values
 * and hands it to `firedBuffs` and `resolveFiredBuffs`, the same two functions the real trick
 * resolution calls. Cadence, the four per-hand caps, the Overlap Bonus and DLR-150's Feeder
 * carry are therefore INHERITED, not restated â€” which is the whole point. The DLR-147 mockup
 * re-derived the predicates in the view layer and reported +6 damage for a load whose ceiling
 * was +4; a preview built on a second copy of the rules drifts from the rules.
 *
 * It contains NO switch over `BuffConditionKind`. `buffFires` is deliberately total so a
 * twelfth family fails to compile there, and a parallel table here would silently never fire a
 * new family â€” the exact failure that switch exists to prevent.
 *
 * The buff-side sibling of `src/app/warCouncil/cardDamage.ts`, which does the same job for
 * damage, including its `exact` flag (here `skullKnown`).
 */

/** `BuffTrickContext` minus the five fields a candidate card and a branch decide. The caller
 *  supplies the rest as plain values â€” never a `RoundState`. */
export type BuffProjectionFacts = Omit<
  BuffTrickContext,
  'playerWon' | 'skullTrick' | 'playerSuits' | 'playerRanks' | 'remainingSuits'
>

export interface BuffProjectionInput {
  /** The buffs activated for this trick â€” already filtered through `activatableBuffs`. */
  readonly active: readonly Buff[]
  /** Ids of once-per-hand families that have already fired this hand. */
  readonly firedThisHand: readonly BuffId[]
  /** The hand's running accrual, before this trick. */
  readonly accrual: BuffBonusAccrual
  readonly facts: BuffProjectionFacts
  /** `true`/`false` once the Quarry's card is on the table; `null` while the PLAYER LEADS and
   *  the Quarry's card is face down. `null` is NOT "no skull" â€” it is "not knowable", and the
   *  difference is the reason this module reports rather than guesses. */
  readonly skullTrick: boolean | null
  /** The player's hand INCLUDING the candidate card. `remainingSuits` is derived from it, the
   *  way `buffTrickFactsFor` derives it from `remainingHand`. */
  readonly hand: readonly Card[]
}

/** One still-possible resolution of a branch. */
export interface BuffBranchOutcome {
  readonly outcome: TrickOutcome
  /** The accrual AFTER this branch's fired buffs resolve. */
  readonly accrual: BuffBonusAccrual
}

export interface BuffBranchProjection {
  /** The MECHANICAL axis â€” the player physically took the cards, before the skull inverts what
   *  that is worth. This is the axis every buff condition reads. NOT `bank.ts`'s `isTaken`,
   *  which is the OUTCOME axis and counts a Dodge as taken. */
  readonly playerWon: boolean
  /** Buffs that fire on this branch under EVERY still-possible skull reading. */
  readonly fired: readonly Buff[]
  /** One entry per still-possible `TrickOutcome`: exactly one when the skull is known, two while
   *  the player leads. Never empty. Two entries can differ in more than their label â€” a Feeder
   *  pays into THIS hand on a Dodge and into the carry on a Clean Loss (DLR-150). */
  readonly outcomes: readonly BuffBranchOutcome[]
}

export interface BuffProjection {
  readonly won: BuffBranchProjection
  readonly lost: BuffBranchProjection
  /** Buffs that fire under some still-possible skull reading but not all. Today that is only
   *  `sidestep`, and only on a lead â€” but this is DERIVED by diffing the fired sets across the
   *  readings, never by naming a family, so a future skull-reading family is handled here with
   *  no edit. The UI words these as "may fire" rather than printing a figure. */
  readonly indeterminate: readonly Buff[]
  /** `false` while the player leads. The buff-side twin of `CardDamagePreview.exact`. */
  readonly skullKnown: boolean
}

/** Both skull readings, for the lead case where neither can be ruled out. */
const BOTH_READINGS: readonly boolean[] = [false, true]

/**
 * Both branches for one candidate card. Pure: never mutates `input`, `candidate`, or anything
 * reachable from them, and reads no clock, no random source and no global.
 */
export function projectBuffBranches(
  input: BuffProjectionInput,
  candidate: Card,
): BuffProjection {
  const readings = input.skullTrick === null ? BOTH_READINGS : [input.skullTrick]
  const remainingSuits = input.hand
    .filter((card) => !sameCard(card, candidate))
    .map((card) => targetSuitOf(card.suit))

  const won = branchFor(input, candidate, remainingSuits, readings, true)
  const lost = branchFor(input, candidate, remainingSuits, readings, false)

  return {
    won: won.branch,
    lost: lost.branch,
    indeterminate: dedupeById([...won.indeterminate, ...lost.indeterminate]),
    skullKnown: input.skullTrick !== null,
  }
}

/** AC7 â€” how many of `legalCards` could fire `buff` this trick. "Could" includes "might": a card
 *  for which the buff lands in `indeterminate` still counts, because reporting 0 for a buff that
 *  may well pay reads as "this buff is dead" at exactly the moment the player is deciding
 *  whether to activate it. `legalCards` is the caller's `legalMoves(state, PlayerSide.Player,
 *  options)` output â€” an illegal card is not counted because it is not in the list, and this
 *  module takes plain values rather than a `RoundState` so it cannot compute legality itself. */
export function buffReach(
  input: BuffProjectionInput,
  legalCards: readonly Card[],
  buff: Buff,
): number {
  return legalCards.filter((card) => {
    const projection = projectBuffBranches(input, card)
    return (
      hasBuff(projection.won.fired, buff.id) ||
      hasBuff(projection.lost.fired, buff.id) ||
      hasBuff(projection.indeterminate, buff.id)
    )
  }).length
}

/** One branch, evaluated once per still-possible skull reading. A buff that fires under every
 *  reading is certain; one that fires under some but not all is lifted out to `indeterminate`,
 *  because the ruleset withholds the Quarry's card and printing a figure for it would either
 *  fabricate or leak information about that card. */
function branchFor(
  input: BuffProjectionInput,
  candidate: Card,
  remainingSuits: readonly ReturnType<typeof targetSuitOf>[],
  readings: readonly boolean[],
  playerWon: boolean,
): { readonly branch: BuffBranchProjection; readonly indeterminate: readonly Buff[] } {
  const perReading = readings.map((skullTrick) =>
    firedBuffs(
      input.active,
      input.firedThisHand,
      contextFor(input, candidate, remainingSuits, playerWon, skullTrick),
    ),
  )
  const certain = perReading[0].filter((buff) =>
    perReading.every((fired) => hasBuff(fired, buff.id)),
  )
  const indeterminate = perReading
    .flat()
    .filter((buff) => !hasBuff(certain, buff.id))

  return {
    branch: {
      playerWon,
      fired: certain,
      outcomes: readings.map((skullTrick) => {
        const outcome = trickOutcomeFor(playerWon, skullTrick)
        return {
          outcome,
          // `bank.ts`'s `TAKEN` table is the SINGLE statement of the skull inversion; this reads
          // it rather than restating it, exactly as `resolveTrickBuffs` does.
          accrual: resolveFiredBuffs(input.accrual, certain, !isTaken(outcome)),
        }
      }),
    },
    indeterminate: dedupeById(indeterminate),
  }
}

/** The candidate card's context: the caller's facts with the five branch- and card-determined
 *  fields overridden. `playerSuits` and `playerRanks` are PLURAL â€” one candidate card means a
 *  single-element array, not a scalar. */
function contextFor(
  input: BuffProjectionInput,
  candidate: Card,
  remainingSuits: readonly ReturnType<typeof targetSuitOf>[],
  playerWon: boolean,
  skullTrick: boolean,
): BuffTrickContext {
  return {
    ...input.facts,
    playerWon,
    skullTrick,
    playerSuits: [targetSuitOf(candidate.suit)],
    playerRanks: [candidate.rank],
    remainingSuits,
  }
}

function hasBuff(buffs: readonly Buff[], id: BuffId): boolean {
  return buffs.some((buff) => buff.id === id)
}

/** Order follows first appearance, which follows `active` â€” the pile's order is the player's
 *  mental order, the same reason `firedBuffs` preserves it. */
function dedupeById(buffs: readonly Buff[]): readonly Buff[] {
  return buffs.filter((buff, i) => buffs.findIndex((b) => b.id === buff.id) === i)
}
```

- [x] **Step 2: Run the spec and the fast gate**

Run: `npx vitest run src/warCouncil/__tests__/buffProjection.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed with every AC1/AC3/AC4 case passing, and `tsc -b` exits 0.

- [x] **Step 3: Measure the new file against the 400-line budget**

Run: `(Get-Content src\warCouncil\buffProjection.ts).Count`
Expected: a number under 400. `(Get-Content â€¦).Count` is the array length and counts blank lines; `Measure-Object -Line` drops them and undercounts, per `.claude/workflow/web-project.md`. If the file is over 400, split it in this task â€” do not hand it forward.

### Task 5: Add the AC2 equivalence guarantee â€” the projection must agree with real resolution âœ“

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/__tests__/buffProjection.test.ts`

- [x] **Step 1: Append the equivalence case, asserting against `resolveTrickBuffs` rather than against a hand-computed number**

This is the ticket's central guarantee: a projection that merely happens to agree today is not enough. The assertion is that for one synthesised context, the projected branch's fired ids and accrual equal what the real resolution path produces for that same context. Add to the imports at the top of the file:

```ts
import { resolveTrickBuffs, type BuffTrickContext } from '../../hunt'
```

and append:

```ts
describe('AC2 â€” the projection equals real resolution for the same context', () => {
  /** Rebuilds, by hand, the context the projection builds internally, and runs it through
   *  `resolveTrickBuffs` â€” the function `bank.ts` calls on a real trick. If the projection ever
   *  stops delegating and starts deriving, these two diverge and this test fails. */
  function realResolution(playerWon: boolean, skullTrick: boolean) {
    const ctx: BuffTrickContext = {
      ...FACTS,
      playerWon,
      skullTrick,
      playerSuits: [BuffTargetSuit.Bells],
      playerRanks: [bellsCard.rank],
      remainingSuits: [BuffTargetSuit.Keys],
    }
    return resolveTrickBuffs(
      {
        active: [bladeTaker, bladeFeeder, momentumSidestep],
        accrual: startHandAccrual(),
        firedThisHand: [],
        hand: {
          playerSuits: ctx.playerSuits,
          playerRanks: ctx.playerRanks,
          remainingSuits: ctx.remainingSuits,
          tricksWithoutHit: FACTS.tricksWithoutHit,
          coins: FACTS.coins,
          playerHealth: FACTS.playerHealth,
          applyDamagePressed: FACTS.applyDamagePressed,
        },
      },
      ctx,
      !isTakenOutcome(playerWon, skullTrick),
    )
  }

  it.each([
    ['take, clean', true, false],
    ['take, skulled', true, true],
    ['do not take, clean', false, false],
    ['do not take, skulled', false, true],
  ])('matches fired ids and accrual on %s', (_label, playerWon, skullTrick) => {
    const projection = projectBuffBranches(
      input({ active: [bladeTaker, bladeFeeder, momentumSidestep], skullTrick }),
      bellsCard,
    )
    const branch = playerWon ? projection.won : projection.lost
    const real = realResolution(playerWon, skullTrick)
    expect(branch.fired.map((b) => b.id)).toEqual([...real.firedIds])
    expect(branch.outcomes).toHaveLength(1)
    expect(branch.outcomes[0].accrual).toEqual(real.accrual)
  })
})
```

Add the small local helper beside the fixtures at the top of the file, so the test derives the outcome axis the same way production does rather than restating the table:

```ts
import { isTaken, trickOutcomeFor } from '../bank'

function isTakenOutcome(playerWon: boolean, skullTrick: boolean): boolean {
  return isTaken(trickOutcomeFor(playerWon, skullTrick))
}
```

Merge this `../bank` import with the existing `TrickOutcome` import from the same module rather than writing a second import statement.

- [x] **Step 2: Run the spec**

Run: `npx vitest run src/warCouncil/__tests__/buffProjection.test.ts`
Expected: 0 failed; the four `it.each` rows all pass.

### Task 6: Add the AC5 cadence and AC6 indeterminate cases âœ“

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/__tests__/buffProjection.test.ts`

- [x] **Step 1: Append the cadence assertions and the lead-vs-follow indeterminate cases**

AC5 says cadence must be asserted, not assumed, even though it is inherited. AC6 needs both halves â€” a follow where Sidestep resolves cleanly into a branch, and a lead where it cannot.

```ts
describe('AC5 â€” cadence is honoured because the projection goes through firedBuffs', () => {
  it('never fires an Activated card', () => {
    const cheat: Buff = {
      id: 9,
      kind: BuffKind.Cheat,
      tier: BuffTier.Bronze,
      condition: { kind: BuffKind.Cheat, target: {} },
      reward: { axis: BuffRewardAxis.Multiplier, value: 3 },
    }
    const projection = projectBuffBranches(input({ active: [cheat] }), bellsCard)
    expect(projection.won.fired).toEqual([])
    expect(projection.lost.fired).toEqual([])
    expect(projection.indeterminate).toEqual([])
  })

  it('respects firedThisHand for a once-per-hand family', () => {
    // Taker is Event cadence, so firedThisHand does NOT suppress it â€” asserting that keeps the
    // filter honest in the direction it actually matters for the live pool.
    const again = projectBuffBranches(
      input({ active: [bladeTaker], firedThisHand: [bladeTaker.id] }),
      bellsCard,
    )
    expect(again.won.fired.map((b) => b.id)).toEqual([1])
  })
})

describe('AC6 â€” an undecidable branch is reported, not guessed', () => {
  it('places Sidestep in a branch when the Quarry has already led and the trick is skulled', () => {
    const follow = projectBuffBranches(
      input({ active: [momentumSidestep], skullTrick: true }),
      bellsCard,
    )
    expect(follow.skullKnown).toBe(true)
    expect(follow.indeterminate).toEqual([])
    expect(follow.lost.fired.map((b) => b.id)).toEqual([3])
    expect(follow.won.fired).toEqual([])
  })

  it('reports Sidestep as indeterminate when the player leads', () => {
    const lead = projectBuffBranches(
      input({ active: [momentumSidestep], skullTrick: null }),
      bellsCard,
    )
    expect(lead.skullKnown).toBe(false)
    expect(lead.indeterminate.map((b) => b.id)).toEqual([3])
    expect(lead.won.fired).toEqual([])
    expect(lead.lost.fired).toEqual([])
  })

  it('gives each branch both still-possible outcomes on a lead', () => {
    const lead = projectBuffBranches(input({ skullTrick: null }), bellsCard)
    expect(lead.won.outcomes.map((o) => o.outcome)).toEqual([
      TrickOutcome.CleanWin,
      TrickOutcome.SkullWin,
    ])
    expect(lead.lost.outcomes.map((o) => o.outcome)).toEqual([
      TrickOutcome.CleanLoss,
      TrickOutcome.Dodge,
    ])
  })

  it("splits a Feeder's destination across the two lead outcomes â€” carried on a Clean Loss, payable on a Dodge", () => {
    const lead = projectBuffBranches(
      input({ active: [bladeFeeder], skullTrick: null }),
      bellsCard,
    )
    // The Feeder FIRES either way â€” its predicate has no skull term â€” but DLR-150 sends the
    // reward to the carry on a Loss and pays it this hand on a Dodge. Reporting one figure
    // would be right about the amount and wrong about when it can be spent.
    expect(lead.lost.fired.map((b) => b.id)).toEqual([2])
    const [cleanLoss, dodge] = lead.lost.outcomes
    expect(cleanLoss.accrual.carryOut.flatDamageBonus).toBe(1)
    expect(cleanLoss.accrual.flatDamageBonus).toBe(0)
    expect(dodge.accrual.flatDamageBonus).toBe(1)
    expect(dodge.accrual.carryOut.flatDamageBonus).toBe(0)
  })
})
```

- [x] **Step 2: Run the spec**

Run: `npx vitest run src/warCouncil/__tests__/buffProjection.test.ts`
Expected: 0 failed. If the Activated-cadence case fails to construct because `BuffKind.Cheat`'s `condition` shape differs, read `src/hunt/buffs.ts` for the real shape and fix the fixture â€” do not weaken the assertion.

### Task 7: Add the AC7 `reach` cases âœ“

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/__tests__/buffProjection.test.ts`

- [x] **Step 1: Append the reach cases, including the illegal-card exclusion**

```ts
describe('AC7 â€” reach counts only the cards that are legal to play this trick', () => {
  const bells2: Card = { suit: Suit.Bells, rank: 2 }
  const bells9: Card = { suit: Suit.Bells, rank: 9 }
  const moons5: Card = { suit: Suit.Moons, rank: 5 }
  const fullHand = [bells2, bells9, moons5]

  it('counts every legal card that could fire the buff', () => {
    expect(buffReach(input({ active: [bladeTaker], hand: fullHand }), fullHand, bladeTaker)).toBe(2)
  })

  it('does not count a card that is in hand but not legal to play', () => {
    // `legalCards` is narrowed to the Moons follow â€” the two Bells are unplayable this trick, so
    // no buff can fire on them however well they match.
    expect(
      buffReach(input({ active: [bladeTaker], hand: fullHand }), [moons5], bladeTaker),
    ).toBe(0)
  })

  it('counts a card whose branch is indeterminate, because "could" includes "might"', () => {
    const onLead = input({ active: [momentumSidestep], hand: fullHand, skullTrick: null })
    expect(buffReach(onLead, fullHand, momentumSidestep)).toBe(3)
  })

  it('is 0 for an empty legal set', () => {
    expect(buffReach(input({ active: [bladeTaker], hand: fullHand }), [], bladeTaker)).toBe(0)
  })
})
```

- [x] **Step 2: Run the whole spec**

Run: `npx vitest run src/warCouncil/__tests__/buffProjection.test.ts`
Expected: 0 failed across every describe block in the file.

### Task 8: Export the projection from `src/warCouncil/index.ts` âœ“

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/index.ts:35-36`

- [x] **Step 1: Add the new module's public surface beside the `buffTrickFacts` exports**

Insert immediately after line 36 (`export type { BuffHandInput } from './buffTrickFacts'`):

```ts
export { buffReach, projectBuffBranches } from './buffProjection'
export type {
  BuffBranchOutcome,
  BuffBranchProjection,
  BuffProjection,
  BuffProjectionFacts,
  BuffProjectionInput,
} from './buffProjection'
```

- [x] **Step 2: Typecheck and run the two warCouncil buff specs together**

Run: `npm run typecheck; npx vitest run src/warCouncil/__tests__/buffProjection.test.ts src/warCouncil/__tests__/buffTrickFacts.test.ts`
Expected: `tsc -b` exits 0; Vitest reports 0 failed across both files.

---

## Phase 3 â€” Final verification

No production changes. Only the cumulative sanity checks, the static gates and the build â€” the unfiltered suite and the production build belong here and only here.

### Task 9: Confirm the pure-core boundary still holds for the new module âœ“

- Skill: `react-frontend`

**Files:**

- Modify: (none â€” verification only)

- [x] **Step 1: Grep the new file for a React import or a DOM global**

Run: `Get-ChildItem src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|from \"react\"|\bwindow\.|\bdocument\.|localStorage|sessionStorage|Math\.random"`
Expected: zero hits. `Select-String -Path` does not recurse and its `**` matches one level only, so this uses the `Get-ChildItem -Recurse` form per `.claude/workflow/web-project.md`. `npm run lint` in Task 11 is the actual gate; this grep is the fast read.

Result: 2 hits, both docblock prose (not code) in pre-existing files unrelated to this contract â€” `encounterDeck.ts:8` ("free of `Math.random()`") and `skulls.test.ts:29` ("A deterministic stand-in for Math.random"). `buffProjection.ts`, its spec, and `buffTrickFacts.ts` â€” the files this contract actually touches â€” have zero hits.

- [x] **Step 2: Confirm the projection holds no second condition switch**

Run: `Select-String -Path src\warCouncil\buffProjection.ts -Pattern "case '|switch \("`
Expected: zero hits. Every condition decision is delegated to `buffFires` via `firedBuffs`; a `switch` appearing here is the parallel table the ticket's Dependencies & Risks section forbids.

Result: zero hits, confirmed.

### Task 10: Confirm file sizes and formatting âœ“

- Skill: `react-frontend`

**Files:**

- Modify: (none â€” verification only)

- [x] **Step 1: Measure both files this contract created or grew**

Run: `(Get-Content src\warCouncil\buffProjection.ts).Count; (Get-Content src\warCouncil\__tests__\buffProjection.test.ts).Count; (Get-Content src\warCouncil\buffTrickFacts.ts).Count`
Expected: each under 400. If any exceeds it, split it in this contract rather than reporting it as a finding.

Result: 206, 297, 68 â€” all under 400.

- [x] **Step 2: Check formatting of the files this contract touched, scoped**

Run: `npx prettier --check src/warCouncil/buffProjection.ts src/warCouncil/__tests__/buffProjection.test.ts src/warCouncil/buffTrickFacts.ts src/warCouncil/index.ts`
Expected: exits 0 and reports all matched files use Prettier code style. If it fails, run `npx prettier --write` on **exactly those four paths** and re-check. Never run `npm run format` â€” it rewrites ~59 unrelated markdown files.

Result: initial check failed on `buffProjection.ts` and its spec (2 files). Ran `npx prettier --write` on exactly those two paths; re-check then reported all four files use Prettier code style. Scoped Vitest re-run (`buffProjection.test.ts`, `buffTrickFacts.test.ts`) confirmed `Tests  24 passed (24)` after the rewrite.

### Task 11: Static gates, the full suite, and the build

- Skill: `react-frontend`

**Files:**

- Modify: (none â€” verification only)

- [x] **Step 1: Warm the Vite transform cache by running the two Vitest projects separately**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. A cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is a worker-start timeout on the `dom` project and not a failing test â€” warming first avoids it.

Result (QA): both exited 0. node project — `Test Files  130 passed (130)` / `Tests  1759 passed (1759)`. dom project — `Test Files  30 passed (30)` / `Tests  302 passed (302)`.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed and a file count consistent with the whole suite. Quote the `Tests  N passed` line.

Result (QA): all three exited 0. `npm run typecheck` — no errors. `npm run lint` — no errors/warnings. `npm test` — `Test Files  160 passed (160)` / `Tests  2061 passed (2061)`.

- [x] **Step 3: Repo-wide format check, reported not gated**

Run: `npm run format:check`
Expected: it may fail on pre-existing `.docs/**` files no contract here has touched. Report the result and name the failing paths; the gate for this contract is Task 10 Step 2's scoped check. Do not "fix" the repo-wide failure.

Result (QA): FAILS on 86 pre-existing files, all `.docs/**`, `.github/**`, plus one pre-existing test file `src/warCouncil/__tests__/discard.test.ts` — none of the four files this contract touched (`buffProjection.ts`, its spec, `buffTrickFacts.ts`, `index.ts`). Reported, not gated, per Expected:. Task 10 Step 2's scoped check (those four files) passed cleanly.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that `build` runs `npm run lint` first, so a lint regression fails here too.

Result (QA): exits 0, `dist/` written, no bundler errors (`vite build` reported `dist/index.html`, `dist/assets/index-DVByVPY8.css` 73.21 kB, `dist/assets/index-IlYagmPR.js` 330.10 kB, "built in 294ms"). `build` ran `npm run lint` first with no output (0 errors/warnings).

### Task 12: Write the PR description âœ“

- Skill: none â€” a prose hand-off document, no TypeScript is written or edited.

**Files:**

- Create: `.claude/contract/DLR-152-two-branch-buff-projection/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- A link to `plan.md` in this folder, and the DLR-152 key.
- A summary: one new pure module, `src/warCouncil/buffProjection.ts`, projecting both branches for a candidate card by delegating to `firedBuffs` and `resolveFiredBuffs`; plus a `targetSuitOf` widening in `buffTrickFacts.ts` and two `index.ts` re-exports. No visible surface.
- **The one design departure from the ticket, stated plainly:** DLR-150 gave `resolveFiredBuffs` a third argument, `trickIsLoss`, so the `playerWon: false` branch is a Dodge under a skull and a Clean Loss without one, and a fired Feeder pays this hand in the first case and carries in the second. Each branch therefore returns `outcomes[]` â€” one entry per still-possible `TrickOutcome` â€” rather than a single accrual. Approved by the developer at the plan gate.
- The recorded limits: `playerHit` and `bankAfterTrick` are caller-supplied and not branch-derived (only the cut Unbloodied and Hoarder families read them); no `gain` delta is exposed; `reach` counts a card whose buff is indeterminate.
- Verification results from Phase 3, with the real numbers: file line counts, the scoped Prettier result, the `Tests  N passed` line, and the build exit.
- A one-line note for future contributors: the new module is a thin adapter and must stay one â€” no `switch` over `BuffConditionKind` may ever be added to it, because `buffFires` is deliberately total so a new family fails to compile there.

---

## Self-review

**Spec coverage:**

- `plan.md` In-scope bullet 1 (the new pure module with both branches and `reach`) â€” Tasks 4, 7.
- `plan.md` In-scope bullet 2 (`targetSuitOf` widening in `buffTrickFacts.ts`) â€” Task 1.
- `plan.md` In-scope bullet 3 (`src/warCouncil/index.ts` re-exports) â€” Tasks 2, 8.
- `plan.md` In-scope bullet 4 (Vitest coverage: AC2 equivalence, AC4 caps, AC5 cadence, AC6 lead-vs-follow, AC7 illegal-card exclusion) â€” Tasks 3, 5, 6, 7.
- Ticket AC1 â€” Task 3. AC2 â€” Task 5. AC3 â€” Task 3. AC4 â€” Task 3. AC5 â€” Task 6. AC6 â€” Task 6. AC7 â€” Task 7. AC8 (purity, plain values, no `any`) â€” Tasks 4, 9, 10. AC9 (`typecheck`, `lint`, `format:check`, `npm test`) â€” Tasks 10, 11.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. No step runs bare `vitest`, `npm run dev`, `npm run format`, or hand-edits `package-lock.json`. No step invents a tuning value; none is needed.

**Type / name consistency:** `projectBuffBranches`, `buffReach`, `targetSuitOf`, `BuffProjection`, `BuffBranchProjection`, `BuffBranchOutcome`, `BuffProjectionInput` and `BuffProjectionFacts` are spelled identically in `plan.md` Part 2 â†’ Data shapes, in Task 4's implementation, in Tasks 3/5/6/7's spec imports, and in Task 8's re-export block. `BuffProjectionInput.skullTrick` is `boolean | null` at every mention. `won` / `lost` are the branch names throughout â€” never `taken`, which `bank.ts`'s `isTaken` already claims for the outcome axis.

**Phase boundary cleanliness:**

- **Phase 1** ends with `targetSuitOf` exported and `buffTrickFactsFor` unchanged in behaviour; `npm run typecheck` is green and the existing `buffTrickFacts.test.ts` still passes. No half-applied rename â€” `TARGET_SUIT` keeps its name and stays private.
- **Phase 2** ends with `buffProjection.ts` complete, its spec green, and its surface re-exported. The one deliberate red is inside Task 3 Step 2, where the spec is written before the module exists; Task 4 closes it in the same phase, so the phase does not end on a failing collection. Nothing in `src/` imports the new module, so no consumer can be left half-wired.
- **Phase 3** makes no production change at all â€” greps, line counts, the scoped format check, the static gates, the full suite, the build, and the PR description.
