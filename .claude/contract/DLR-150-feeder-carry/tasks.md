# Tasks: Feeder carry — a Feeder that fires on a Loss banks into the next hand

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-08-26

**Goal:** A Feeder firing on a Loss diverts its reward into a carry pool that pays nothing this hand, seeds the next hand's accrual, and dies at the fight boundary; a Feeder firing on a dodge pays this hand as today; Momentum is restored to the Feeder family; and both halves of the carry are on the felt.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved 2026-08-26).

---

## File map

**Created:**

- `src/app/warCouncil/roundResult.ts` — `roundResultFor(ui)`, the one statement of what a finished hand hands back; extracted from `WarCouncilRound.tsx`'s two literals and adopted by the simulator's third.
- `src/app/warCouncil/__tests__/roundResult.test.ts` — pins that the extracted result reproduces every field.
- `src/app/screenFor.ts` — `screenFor(phase, encounterOver)`, extracted from `App.tsx`'s inline ternary chain.
- `src/app/__tests__/screenFor.test.ts` — a case per branch.
- `src/hunt/__tests__/buffCarry.test.ts` — AC1/AC2/AC3 on the pure accrual: a Loss-fire carries and does not pay, a dodge-fire pays and counts toward the Overlap Bonus, the carry seeds a hand, and a seeded carry survives a later same-axis accrual unclipped.
- `src/hunt/__tests__/run.feederCarry.test.ts` — AC4: the carry rides `recordEncounter` within a fight and is empty once the encounter resolves.

**Modified:**

- `src/hunt/buffAccrual.ts` — add `BuffCarry`, `EMPTY_BUFF_CARRY`, `accrueCarry`; add `carriedIn` / `carryOut` to `BuffBonusAccrual` and `EMPTY_BUFF_ACCRUAL`; `startHandAccrual(carriedIn?)`; `resolveFiredBuffs(accrual, fired, trickIsLoss)`.
- `src/hunt/buffEvaluation.ts:163-169` — `resolveTrickBuffs(input, ctx, trickIsLoss)`, passed straight through.
- `src/warCouncil/bank.ts:269` — supply `!isTaken(outcome)` as the third argument.
- `src/hunt/index.ts` — export `BuffCarry`, `EMPTY_BUFF_CARRY`, `accrueCarry`.
- `src/hunt/buffTemplates.ts:110-116` — restore the Momentum row for Feeder.
- `src/hunt/__tests__/buffTemplates.test.ts:16-17` — 13 → 16, plus the three new ids.
- `src/sim/__tests__/reachability.test.ts:72` — 13 → 16.
- `src/hunt/__tests__/buffAccrual.test.ts` — the two full-literal assertions and every `resolveFiredBuffs` call.
- `src/hunt/run.ts` — `RunState.feederCarry`; `startRun` seeds `EMPTY_BUFF_CARRY`.
- `src/hunt/runTransitions.ts` — `recordEncounter`'s optional 8th parameter and `feederCarryAfter`.
- `src/app/warCouncilMount.ts` — `WarCouncilMountProps.feederCarry?`, `WarCouncilRoundResult.feederCarry`.
- `src/app/warCouncil/roundUiState.ts:170-189,226-253` — `RoundUiSeed.feederCarry?`; pass it to `startBuffHand`.
- `src/app/warCouncil/buffRoundState.ts:42-50` — `startBuffHand(carriedIn?)`.
- `src/app/warCouncil/WarCouncilRound.tsx:252,268,358` — adopt `roundResultFor`; pass the seed's carry; feed `BankMeter` the two carry figures.
- `src/app/warCouncil/BankMeter.tsx` — `carriedIn` / `carryOut` props and their two lines.
- `src/app/warCouncil/__tests__/BankMeter.test.tsx` — the two new lines, present and absent.
- `src/app/warCouncil/warCouncilTable.css` — `.wc-bank-carried-in` / `.wc-bank-carry-out`.
- `src/App.tsx:150-162,178-186,380-395` — adopt `screenFor`; pass `feederCarry` down and back.
- `src/sim/playHandWindows.ts:38-50` — `seedFor` passes `run.feederCarry`.
- `src/sim/playHand.ts:222-231` — adopt `roundResultFor`.
- `src/sim/playRun.ts:130-138` — pass the carry to `recordEncounter`.
- `CLAUDE.md` — correct the pool size and the Feeder's axes in *Cut buffs are cut until a ticket brings them back*.

**Deleted:** (none)

**Developer decides or observes:**

- **Feeder-only vs. any buff firing on a Loss.** Built Feeder-only per AC1. A Taker that wins a skulled trick still pays into the hand it lost.
- **The Overlap Bonus on a Loss trick.** Left in this hand's accrual, where the reset wipes it.
- **The Momentum Feeder's tier ladder.** Ships on the existing shared `REWARD_TIER_VALUE[Multiplier]` 2/3/5. A Feeder-specific ladder is a new tuning value.
- **The carry's size.** Bronze Blade carries +1, bronze Momentum +2, from the existing ladders. The ticket's live risk is that this is too small to be felt — judge by playing.
- **Whether the pool moving 13 → 16 makes the slot machine feel right.** No weight changed, but three more Momentum Feeders shift every draw.
- **Whether the carried-in line should be persistent (as built) or a one-off flourish at hand start.** Visual and pacing judgement; `mockup.html` shows the persistent form.
- **Every colour, glyph, border weight and word in the two new lines.** Placeholder, per `mockup.html`'s own footer.

---

## Phase 1 — Make room under the 400-line budget

Two files this contract must edit are at or over `CLAUDE.md`'s blocking budget before it touches them: `WarCouncilRound.tsx` at 415 lines and `App.tsx` at 399. Both extractions are behaviour-preserving and land before any feature work, so every later phase edits a file with room in it. The phase boundary is safe because nothing changes shape — the app type-checks and plays identically at the end of it.

### Task 1: Extract the round result into `src/app/warCouncil/roundResult.ts`

- Skill: react-frontend

**Files:**

- Create: `src/app/warCouncil/roundResult.ts`
- Test: `src/app/warCouncil/__tests__/roundResult.test.ts`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:245-275`, `src/sim/playHand.ts:222-231`

- [ ] **Step 1: Write the module**

```ts
import type { WarCouncilRoundResult } from '../warCouncilMount'
import type { RoundUiState } from './roundUiState'

/** THE statement of what a finished hand hands back. Extracted from `WarCouncilRound.tsx`'s two
 *  identical literals (DLR-150 — that file stood at 415 of its 400-line budget) and adopted by
 *  `src/sim/playHand.ts`, which held a third hand-built copy. Three construction sites become one,
 *  so a field added to the result can no longer reach the felt and miss the simulator. */
export function roundResultFor(ui: RoundUiState): WarCouncilRoundResult {
  return {
    finalState: ui.round,
    encounter: ui.encounter,
    blastGuardHeld: ui.blastGuardHeld,
    discardsRemaining: ui.discardsRemaining,
    buffs: ui.buffs,
    unplayedAtResolve: ui.unplayedAtResolve,
    coinsEarned: ui.buffHand.coinsEarned,
  }
}
```

- [ ] **Step 2: Replace both literals in `WarCouncilRound.tsx` with `roundResultFor(ui)`**

Both `onComplete({ … })` call sites at lines 245-275 currently build the same seven-field object. Replace each with `onComplete(roundResultFor(ui))`, keeping whatever surrounding condition each sits behind unchanged, and add the import.

- [ ] **Step 3: Replace the simulator's copy in `src/sim/playHand.ts`**

Replace the `const result: WarCouncilRoundResult = { … }` literal with `const result = roundResultFor(ui)`, keeping the `WarCouncilRoundResult` type import only if it is still referenced elsewhere in the file.

- [ ] **Step 4: Write the spec**

`src/app/warCouncil/__tests__/roundResult.test.ts` — build a `RoundUiState` through `createRoundUiState` with a seed from the nearest existing fixture (`src/app/warCouncil/__tests__/roundReducer.test.ts` is the pattern to copy), then assert `roundResultFor(ui)` reports each of the seven fields from the state it was given: `finalState` is `ui.round`, `encounter` is `ui.encounter`, and `coinsEarned` reads through `ui.buffHand.coinsEarned` rather than a constant.

- [ ] **Step 5: Verify**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/roundResult.test.ts`
Expected: typecheck exits 0; Vitest reports 0 failed.

- [ ] **Step 6: Measure the file that forced this**

Run: `(Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count`
Expected: under 400. If it is not, extract the felt's prop assembly for `<BankMeter>`/`<RoundStatusBand>` into `roundControlsProps.ts`, which already exists for exactly this purpose, and measure again.

### Task 2: Extract `App.tsx`'s screen derivation into `src/app/screenFor.ts`

- Skill: react-frontend

**Files:**

- Create: `src/app/screenFor.ts`
- Test: `src/app/__tests__/screenFor.test.ts`
- Modify: `src/App.tsx:150-165`

- [ ] **Step 1: Write the module**

```ts
import { RunPhase } from '../hunt'

/** The screens `App` switches between, as the debug mirror already names them. */
export type AppScreen = 'start' | 'map' | 'shop' | 'vault' | 'verdict' | 'warCouncil'

/** Which screen the app is showing, as a pure function of the two values that decide it.
 *  Extracted from `App.tsx`'s inline ternary chain (DLR-150 — 400-line budget) so the derivation
 *  is unit-testable and `debugState`'s mirror cannot disagree with the render, which is the
 *  property the chain's own comment already claims. */
export function screenFor(phase: RunPhase, encounterOver: boolean): AppScreen {
  if (phase === RunPhase.Start) return 'start'
  if (!encounterOver) return 'warCouncil'
  if (phase === RunPhase.Map) return 'map'
  if (phase === RunPhase.Shop) return 'shop'
  if (phase === RunPhase.Vault) return 'vault'
  return 'verdict'
}
```

- [ ] **Step 2: Adopt it in `App.tsx`**

Replace the seven-branch `const screen = phase === RunPhase.Start ? 'start' : …` chain with `const screen = screenFor(phase, encounterOver)` and add the import. The comment above it — that the mirror follows the same branch order the render switches on — stays, reworded to say the derivation now lives in `screenFor`.

- [ ] **Step 3: Write the spec**

`src/app/__tests__/screenFor.test.ts` — one assertion per branch, including the two that the ternary's ordering makes easy to get wrong: `screenFor(RunPhase.Start, true)` is `'start'` (Start wins over an over encounter) and `screenFor(RunPhase.Map, false)` is `'warCouncil'` (an unresolved encounter wins over every non-Start phase).

- [ ] **Step 4: Verify and measure**

Run: `npm run typecheck; npx vitest run src/app/__tests__/screenFor.test.ts; (Get-Content src\App.tsx).Count`
Expected: typecheck exits 0; Vitest reports 0 failed; the line count is under 395, leaving room for Phase 4's two lines.

---

## Phase 2 — The carry, in the pure accrual

The whole rule, in `src/hunt/`, with no caller changed yet beyond the one signature `bank.ts` must satisfy. AC1, AC2 and the arithmetic half of AC3 are decided here and covered by tests that need no renderer. The boundary is safe because `resolveFiredBuffs` and `resolveTrickBuffs` grow a required parameter that Task 4 supplies in the same phase — the phase, not each task, is the checkpoint.

### Task 3: `BuffCarry`, `accrueCarry`, and the Loss branch in `resolveFiredBuffs`

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/buffAccrual.ts`, `src/hunt/index.ts`
- Test: `src/hunt/__tests__/buffCarry.test.ts` (create), `src/hunt/__tests__/buffAccrual.test.ts`

- [ ] **Step 1: Write the failing spec for the four AC7 cases**

`src/hunt/__tests__/buffCarry.test.ts`, mirroring `buffAccrual.test.ts`'s existing style (plain function-in, value-out; buffs built as `Buff` literals with `kind: BuffKind.Feeder`):

```ts
// AC1 — a Feeder firing on a Loss carries and pays nothing this hand.
const bladeFeeder: Buff = { id: 1, kind: BuffKind.Feeder, tier: BuffTier.Bronze,
  condition: { kind: BuffKind.Feeder, target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Magnitude, value: 1 } }
const carried = resolveFiredBuffs(startHandAccrual(), [bladeFeeder], true)
expect(carried.carryOut).toEqual({ multiplierBonus: 0, flatDamageBonus: 1 })
expect(payableCashOutBonus(carried)).toEqual({ multiplierBonus: 0, flatDamageBonus: 0 })

// AC2 — the same card firing on a dodge pays this hand, and a second fired buff adds the
// Overlap Bonus to the multiplier axis exactly as it does today.
const paid = resolveFiredBuffs(startHandAccrual(), [bladeFeeder, momentumFeeder], false)
expect(paid.carryOut).toEqual(EMPTY_BUFF_CARRY)
expect(payableCashOutBonus(paid)).toEqual({ multiplierBonus: 2 + 1, flatDamageBonus: 1 })

// AC3 — the carry seeds the next hand, spendable through payableCashOutBonus.
const next = startHandAccrual({ multiplierBonus: 3, flatDamageBonus: 2 })
expect(payableCashOutBonus(next)).toEqual({ multiplierBonus: 3, flatDamageBonus: 2 })
expect(next.carriedIn).toEqual({ multiplierBonus: 3, flatDamageBonus: 2 })
expect(next.carryOut).toEqual(EMPTY_BUFF_CARRY)

// The cap dependency, pinned. Seeding writes into a capped axis; both caps are
// POSITIVE_INFINITY today, and a finite one would clip the seed DOWN on the next accrual.
const later = accrueAxisBonus(next, BuffRewardAxis.Multiplier, 2)
expect(later.multiplierBonus).toBe(5)
expect(MAX_MULTIPLIER_BONUS_PER_HAND).toBe(Number.POSITIVE_INFINITY)
expect(MAX_FLAT_DAMAGE_BONUS_PER_HAND).toBe(Number.POSITIVE_INFINITY)

// A non-Feeder firing on a Loss is unchanged — a Taker that ate a skull still pays this hand.
const takerLoss = resolveFiredBuffs(startHandAccrual(), [bladeTaker], true)
expect(takerLoss.carryOut).toEqual(EMPTY_BUFF_CARRY)
expect(payableCashOutBonus(takerLoss).flatDamageBonus).toBe(1)
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/hunt/__tests__/buffCarry.test.ts`
Expected: fails to collect or fails on the missing exports — `startHandAccrual` takes no argument and `carryOut` does not exist yet.

- [ ] **Step 3: Add the shape to `src/hunt/buffAccrual.ts`**

Add `BuffCarry`, `EMPTY_BUFF_CARRY`, the two accrual fields on `BuffBonusAccrual` and on `EMPTY_BUFF_ACCRUAL`, and the seeding parameter — exactly the declarations in `plan.md` Part 2 → Data shapes, docblocks included. `startHandAccrual` stays the only exported reset in the module; the docblock's R6 note is extended to say the carry is deliberately outside R6's caps because it pays nothing in the hand that earns it.

```ts
export function startHandAccrual(carriedIn: BuffCarry = EMPTY_BUFF_CARRY): BuffBonusAccrual {
  return {
    ...EMPTY_BUFF_ACCRUAL,
    multiplierBonus: carriedIn.multiplierBonus,
    flatDamageBonus: carriedIn.flatDamageBonus,
    carriedIn,
  }
}

/** AC1 — one Loss-firing Feeder's reward into `carryOut`. UNCAPPED: R6's caps bound what a hand
 *  may PAY, and this pays nothing this hand. Throws on an axis that cannot carry rather than
 *  accruing a plausible zero — `mintFromTemplate`'s discipline. Never mutates `accrual`. */
export function accrueCarry(
  accrual: BuffBonusAccrual,
  axis: BuffCostAxis,
  amount: number,
): BuffBonusAccrual {
  switch (axis) {
    case BuffRewardAxis.Multiplier:
      return { ...accrual, carryOut: { ...accrual.carryOut,
        multiplierBonus: accrual.carryOut.multiplierBonus + amount } }
    case BuffRewardAxis.Magnitude:
      return { ...accrual, carryOut: { ...accrual.carryOut,
        flatDamageBonus: accrual.carryOut.flatDamageBonus + amount } }
    case BuffRewardAxis.Coins:
    case BuffRewardAxis.ApRefund:
      throw new RangeError(
        `Axis ${axis} cannot carry across a hand boundary: only Momentum and Blade seed a hand`,
      )
  }
}
```

- [ ] **Step 4: Add the Loss branch to `resolveFiredBuffs`**

```ts
/** R1/R2/R5 for one trick's fired buffs, plus DLR-150 AC1/AC2's outcome split. `trickIsLoss` is
 *  supplied by `bank.ts` from `!isTaken(outcome)` — this module never re-derives the skull
 *  inversion, which is stated exactly once, in `bank.ts`'s `TAKEN` table. A FEEDER firing on a
 *  Loss carries; every other family and every Win is unchanged, and so is the Overlap Bonus. */
export function resolveFiredBuffs(
  accrual: BuffBonusAccrual,
  fired: readonly Buff[],
  trickIsLoss: boolean,
): BuffBonusAccrual {
  let next = fired.reduce((running, buff) => {
    const axis = narrowToCostAxis(buff.reward.axis, 'Fired buff reward axis')
    return trickIsLoss && buff.kind === BuffKind.Feeder
      ? accrueCarry(running, axis, buff.reward.value)
      : accrueAxisBonus(running, axis, buff.reward.value)
  }, accrual)
  const overlap = overlapBonusFor(fired.length)
  if (overlap > 0) {
    next = accrueAxisBonus(next, BuffRewardAxis.Multiplier, overlap)
  }
  return next
}
```

- [ ] **Step 5: Export the three new names from `src/hunt/index.ts`**

Add `BuffCarry` (type), `EMPTY_BUFF_CARRY` and `accrueCarry` beside the existing `EMPTY_BUFF_ACCRUAL` / `startHandAccrual` / `resolveFiredBuffs` entries at lines 139-144.

- [ ] **Step 6: Update `buffAccrual.test.ts`**

Two full-object `toEqual({ … })` assertions (around lines 32 and 118) gain `carriedIn` and `carryOut`; every `resolveFiredBuffs(…)` call gains a third argument of `false`, which is today's behaviour. The existing assertion that `startHandAccrual` is the only `^start|reset` export is unchanged and must stay passing.

- [ ] **Step 7: Verify**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/buffCarry.test.ts src/hunt/__tests__/buffAccrual.test.ts`
Expected: typecheck exits 0; Vitest reports 0 failed.

### Task 4: Thread `trickIsLoss` from the one place that owns the outcome axis

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/buffEvaluation.ts:160-170`, `src/warCouncil/bank.ts:260-280`
- Test: `src/hunt/__tests__/buffEvaluation.test.ts`, `src/warCouncil/__tests__/bank.buffs.test.ts`

- [ ] **Step 1: Widen `resolveTrickBuffs`**

```ts
/** R4's cadence and R1/R2/R5/R6 in one call, so `bank.ts` states R3's ORDER and nothing else.
 *  `trickIsLoss` is the OUTCOME axis and is passed straight through to `resolveFiredBuffs` — it
 *  arrives from `bank.ts`'s `!isTaken(outcome)` because `src/hunt/` deliberately does not hold a
 *  second statement of the skull inversion. */
export function resolveTrickBuffs(
  input: BuffTrickInput,
  ctx: BuffTrickContext,
  trickIsLoss: boolean,
): BuffTrickOutcome {
  const fired = firedBuffs(input.active, input.firedThisHand, ctx)
  return {
    accrual: resolveFiredBuffs(input.accrual, fired, trickIsLoss),
    firedIds: fired.map((buff) => buff.id),
  }
}
```

- [ ] **Step 2: Supply it from `resolveTrickBank`**

At `src/warCouncil/bank.ts:269`, pass `!isTaken(outcome)` as the third argument to `resolveTrickBuffs`, reading the `TrickOutcome` the function has already computed rather than re-deriving anything from `playerWon` / `skullTrick`. Add a one-line comment naming `TAKEN` as the single statement of the inversion.

- [ ] **Step 3: Cover the crossing**

In `src/warCouncil/__tests__/bank.buffs.test.ts`, add two cases against the real `resolveTrickBank`: a Bells Feeder on a **clean loss** raises `buffAccrual.carryOut.flatDamageBonus` and leaves that trick's `cashOut` exactly what it is with no buffs; the same card on a **dodge** raises the paid bonus and leaves `carryOut` empty. Existing `resolveTrickBuffs` calls in `buffEvaluation.test.ts` gain a third argument of `false`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/buffEvaluation.test.ts src/warCouncil/__tests__/bank.buffs.test.ts`
Expected: typecheck exits 0; Vitest reports 0 failed.

---

## Phase 3 — The run holds it between hands

`RunState` gains the field and the fight-boundary rule. Nothing carries yet — the felt is not wired until Phase 4 — so the game plays exactly as it does today at the end of this phase, with a field that is always empty. That is what makes the boundary safe.

### Task 5: `RunState.feederCarry` and `feederCarryAfter`

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/run.ts:51-155`, `src/hunt/runTransitions.ts:70-120`
- Test: `src/hunt/__tests__/run.feederCarry.test.ts` (create)

- [ ] **Step 1: Write the failing spec for AC4**

`src/hunt/__tests__/run.feederCarry.test.ts`, following `run.integration.test.ts`'s fixture style:

```ts
// It rides an unresolved encounter into the next hand.
const carried = recordEncounter(startRun(), unresolved, false, 3, null, 0, undefined,
  { multiplierBonus: 2, flatDamageBonus: 1 })
expect(carried.feederCarry).toEqual({ multiplierBonus: 2, flatDamageBonus: 1 })

// AC4 — it is empty once the encounter resolves, on a WIN…
expect(recordEncounter(carried, quarryDown, false, 3, 2, 0, undefined,
  { multiplierBonus: 9, flatDamageBonus: 9 }).feederCarry).toEqual(EMPTY_BUFF_CARRY)
// …and on a LOSS.
expect(recordEncounter(carried, playerDown, false, 3, null, 0, undefined,
  { multiplierBonus: 9, flatDamageBonus: 9 }).feederCarry).toEqual(EMPTY_BUFF_CARRY)

// A caller that passes nothing keeps what the run held — the 48 existing call sites.
expect(recordEncounter(carried, unresolved, false, 3, null).feederCarry)
  .toEqual({ multiplierBonus: 2, flatDamageBonus: 1 })

// A fresh run carries nothing.
expect(startRun().feederCarry).toEqual(EMPTY_BUFF_CARRY)
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/hunt/__tests__/run.feederCarry.test.ts`
Expected: fails to collect — `feederCarry` is not a property of `RunState`.

- [ ] **Step 3: Add the field and seed it**

In `src/hunt/run.ts`, add `readonly feederCarry: BuffCarry` to `RunState` with the docblock from `plan.md` Part 2 → Data shapes, and `feederCarry: EMPTY_BUFF_CARRY` to `startRun`'s returned object. `advanceRun` needs no entry — the spread carries an already-empty value, and the reset is stated in `feederCarryAfter` instead.

- [ ] **Step 4: Add the parameter and the named rule to `runTransitions.ts`**

```ts
/** AC4 — ONE statement of "a carry does not outlive the fight that earned it". A named function
 *  rather than an inline ternary, exactly as `guardAfter` immediately below is and for its
 *  reason: a second transition adopting a hand's end state is what gets added without
 *  remembering this rule, and a named rule is what a reviewer finds. */
function feederCarryAfter(encounter: EncounterState, carry: BuffCarry): BuffCarry {
  return isEncounterResolved(encounter) ? EMPTY_BUFF_CARRY : carry
}
```

and in `recordEncounter`'s returned object, `feederCarry: feederCarryAfter(encounter, feederCarry ?? run.feederCarry)`, with the optional 8th parameter documented as `plan.md` specifies.

- [ ] **Step 5: Verify**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/run.feederCarry.test.ts src/hunt/__tests__/run.integration.test.ts`
Expected: typecheck exits 0; Vitest reports 0 failed. A failure naming a missing `feederCarry` on a hand-built `RunState` fixture is a fixture to fix in this task, not a defect.

---

## Phase 4 — Wire the seam, felt and simulator together

The carry crosses the mount boundary in both directions and the simulator adopts the same path. This is the phase where the mechanic becomes live. Felt and simulator move in one phase deliberately: a carry that reaches the felt and not `src/sim/` would make every measured run a measurement of a different game.

### Task 6: The mount seam and the seed

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncilMount.ts:60-125`, `src/app/warCouncil/roundUiState.ts:170-189,226-253`, `src/app/warCouncil/buffRoundState.ts:42-50`, `src/app/warCouncil/roundResult.ts`

- [ ] **Step 1: Add the two seam fields**

`WarCouncilMountProps.feederCarry?: BuffCarry` (optional, defaulted at the read site to `EMPTY_BUFF_CARRY`, following `apCapacity`) and `WarCouncilRoundResult.feederCarry: BuffCarry` (required, following `coinsEarned`), with the docblocks from `plan.md` Part 2 → Data shapes.

- [ ] **Step 2: Seed the hand from it**

`RoundUiSeed.feederCarry?: BuffCarry` in `roundUiState.ts`; `startBuffHand(carriedIn?: BuffCarry)` in `buffRoundState.ts` passing it to `startHandAccrual`; and `createRoundUiState`'s line becomes `buffHand: startBuffHand(seed.feederCarry)`. Update `startBuffHand`'s docblock to say a hand no longer always opens empty.

- [ ] **Step 3: Report it back**

Add `feederCarry: ui.buffHand.accrual.carryOut` to `roundResultFor`. Because Task 1 collapsed three construction sites to one, this is the only edit needed to satisfy the required field.

- [ ] **Step 4: Verify**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/buffRoundState.test.ts src/app/warCouncil/__tests__/roundResult.test.ts`
Expected: typecheck exits 0; Vitest reports 0 failed.

- [ ] **Step 5: Measure the file that was closest to the budget**

Run: `(Get-Content src\app\warCouncil\roundUiState.ts).Count`
Expected: under 400. If it is not, move `RoundUiSeed` and `createRoundUiState` into a new `src/app/warCouncil/roundUiSeed.ts` and re-export both names from `roundUiState.ts`, so no importer changes — the move `runTransitions.ts` already is for `run.ts`. Then measure again.

### Task 7: The driver

- Skill: react-frontend

**Files:**

- Modify: `src/App.tsx:178-190,380-395`

- [ ] **Step 1: Hand the carry down**

Add `feederCarry={run.feederCarry}` to the `<WarCouncilRound … />` props, beside `blastGuardHeld` and `discardsRemaining`.

- [ ] **Step 2: Hand it back up**

In `handleComplete`, pass `result.feederCarry` as `recordEncounter`'s eighth argument, after `result.buffs`.

- [ ] **Step 3: Verify**

Run: `npm run typecheck; (Get-Content src\App.tsx).Count`
Expected: typecheck exits 0; the line count is under 400.

### Task 8: The simulator walks the same seam

- Skill: react-frontend

**Files:**

- Modify: `src/sim/playHandWindows.ts:38-50`, `src/sim/playRun.ts:128-140`

- [ ] **Step 1: Seed from the run**

Add `feederCarry: run.feederCarry` to the object `seedFor` returns, beside `discardsRemaining`.

- [ ] **Step 2: Adopt it on the way out**

Add `outcome.result.feederCarry` as the eighth argument to `playRun.ts`'s `recordEncounter` call, after `outcome.result.buffs`.

- [ ] **Step 3: Verify the simulator still runs a whole run**

Run: `npm run typecheck; npx vitest run src/sim`
Expected: typecheck exits 0; Vitest reports 0 failed. `src/sim/` is lint-enforced pure — nothing added here imports React or touches a DOM global.

---

## Phase 5 — Momentum returns, and the readout

AC5 and AC6. The pool widens and the felt learns to show both halves of the carry. Kept last deliberately, following the ticket's own instruction to build the readout before tuning anything: at the end of this phase the mechanic is visible and nothing has been balanced.

### Task 9: Restore the Momentum Feeder

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/buffTemplates.ts:105-120`
- Test: `src/hunt/__tests__/buffTemplates.test.ts:14-20`, `src/sim/__tests__/reachability.test.ts:70-75`

- [ ] **Step 1: Restore the row**

```ts
const TEMPLATE_FAMILIES: readonly TemplateFamily[] = [
  { kind: BuffKind.Taker, axes: BLADE_AND_MOMENTUM, param: 'suit' },
  // DLR-150 AC5 — Momentum restored. Feeder was Blade-only because `buffFires` reads it as
  // `!ctx.playerWon`, covering both a clean loss and a dodge, and a multiplier raised on the
  // loss half was wiped by that loss's own reset. The carry removes exactly that: on the loss
  // half the bonus leaves the hand before the reset, and the dodge half never had the problem.
  { kind: BuffKind.Feeder, axes: BLADE_AND_MOMENTUM, param: 'suit' },
  { kind: BuffKind.Sidestep, axes: BLADE_AND_MOMENTUM },
]
```

The file's own DLR-145 docblock is updated in the same edit to say the pool is 16, and that Feeder's Momentum row was restored by DLR-150 while the eight cut families and two cut axes stay unreachable. No slot weight changes: `slotWeights.ts` already carries a `[BuffRewardAxis.Multiplier]` entry and keys family weight on `BuffKind.Feeder`.

- [ ] **Step 2: Move the two pool-size assertions**

`buffTemplates.test.ts:16-17` — `toHaveLength(13)` and `toBe(13)` become `16`; add an assertion that `templateById('feeder:bells:multiplier')`, `'feeder:keys:multiplier'` and `'feeder:moons:multiplier'` all resolve, since those three ids are persisted by the Vault the moment they ship. `reachability.test.ts:72` — `toBe(13)` becomes `16`.

- [ ] **Step 3: Verify, including the slot-draw specs the wider pool touches**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/buffTemplates.test.ts src/hunt/__tests__/slotWeights.test.ts src/hunt/__tests__/slotOdds.test.ts src/sim/__tests__/reachability.test.ts`
Expected: typecheck exits 0; Vitest reports 0 failed. A slot spec asserting an exact probability against a 13-template pool is an assertion to move to the 16-template figure in this task, not a defect.

### Task 10: Both carry lines on `BankMeter`

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/BankMeter.tsx`, `src/app/warCouncil/WarCouncilRound.tsx:355-362`, `src/app/warCouncil/warCouncilTable.css`
- Test: `src/app/warCouncil/__tests__/BankMeter.test.tsx`

- [ ] **Step 1: Add the two props and their lines**

Layout, line order and the exclusion rule per `mockup.html` in this folder: the carried-in line sits directly under the existing "Buff bonus pending" line and the banking-for-next-hand line under that. Both are optional props defaulted to `EMPTY_BUFF_CARRY` and both render only when non-zero, exactly as `hasPendingBonus` already gates its line.

```tsx
{hasCarriedIn && (
  <p className="wc-bank-carried-in" aria-hidden="true">
    Carried in from last hand: <b>+{carriedIn.multiplierBonus}</b> multiplier,{' '}
    <b>+{carriedIn.flatDamageBonus}</b> damage
  </p>
)}
{hasCarryOut && (
  <p className="wc-bank-carry-out" aria-hidden="true">
    Banking for next hand: <b>+{carryOut.multiplierBonus}</b> multiplier,{' '}
    <b>+{carryOut.flatDamageBonus}</b> damage
  </p>
)}
```

`carryOut` is deliberately **not** folded into `shownMultiplier`, `cash` or `forced` — AC1 says this hand's cash-out pays nothing from it, and folding it in would be the component inventing a payout. Both figures are appended to the existing `wc-bank-figures` `aria-label` so a screen reader gets them without a new landmark, following the pattern `pendingBonus` already uses.

- [ ] **Step 2: Style the two lines**

Add `.wc-bank-carried-in` and `.wc-bank-carry-out` to `warCouncilTable.css`, adapting the rules in `mockup.html`'s `<style>` block to the felt's existing tokens. State is carried by border style and position as well as colour — a solid rule on the carried-in line, a dashed one on the accumulating line — so a static screenshot and a colour-vision difference both still read. Every colour comes from an existing `--wc-*` token; no new token and no new tuning value is introduced.

- [ ] **Step 3: Feed it from the felt**

At `WarCouncilRound.tsx:358`, beside the existing `pendingBonus={payableCashOutBonus(ui.buffHand.accrual)}`, add `carriedIn={ui.buffHand.accrual.carriedIn}` and `carryOut={ui.buffHand.accrual.carryOut}`.

- [ ] **Step 4: Cover both lines, present and absent**

In `src/app/warCouncil/__tests__/BankMeter.test.tsx`, add cases queried by accessible role and text: with a non-zero `carriedIn` the "Carried in from last hand" text is present and the `aria-label` names it; with a non-zero `carryOut` the "Banking for next hand" text is present **and** the rendered "Cashes for" figure is unchanged from the same render with an empty `carryOut` — that assertion is AC1 on the readout; with both empty, neither string appears at all.

- [ ] **Step 5: Verify**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/BankMeter.test.tsx`
Expected: typecheck exits 0; Vitest reports 0 failed.

- [ ] **Step 6: Format the files this contract changed**

Run: `npx prettier --write src/app/warCouncil/BankMeter.tsx src/app/warCouncil/warCouncilTable.css src/app/warCouncil/roundResult.ts src/app/screenFor.ts src/hunt/buffAccrual.ts src/hunt/buffTemplates.ts src/hunt/run.ts src/hunt/runTransitions.ts`
Expected: exits 0. Scoped to this contract's files — never `npm run format`, which rewrites ~58 unrelated markdown files.

### Task 11: Correct the pool figures in `CLAUDE.md`

- Skill: none — a prose correction to project instructions, no TypeScript in the diff.

**Files:**

- Modify: `CLAUDE.md` — the *Cut buffs are cut until a ticket brings them back* section

- [ ] **Step 1: Update the two invalidated statements**

That section currently reads "DLR-145 pared the mintable buff pool to **13 templates** — Taker (3 suits × Blade/Momentum), Feeder (3 suits × Blade), Sidestep (Blade/Momentum), plus the two activated cards Cheat and Timebomb." Replace the count with **16** and Feeder's axes with **Blade/Momentum**, and add one sentence naming DLR-150 as what restored the Momentum row and why (the carry lets the bonus escape the loss's own reset). Everything else in that section — the eight cut families, the two cut axes, the five consumables, and the two superseded documents — is untouched and stays true.

- [ ] **Step 2: Confirm no other file still quotes the old figure**

Run: `Get-ChildItem . -Recurse -Include *.md -Exclude node_modules | Select-String -Pattern "13 templates|Feeder \(3 suits . Blade\)"`
Expected: hits only in `.claude/contract/**` (this contract and DLR-145's archived plan, both historical records) and in `.docs/implementation/**`, which `/fb-apply`'s `implementation-doc-writer` step owns and updates.

---

## Phase 6 — Final verification

No production changes. Only cumulative sanity checks, plus the boundary and budget greps this contract's own design depends on.

### Task 12: Confirm the pure-core boundary still holds

- Skill: none — verification only, no code written.

**Files:**

- (none — read-only checks)

- [ ] **Step 1: Grep the two pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits. `src/hunt/` and `src/warCouncil/` are lint-enforced pure and this contract adds real logic to both.

- [ ] **Step 2: Grep the simulator, which is lint-enforced pure for the same reason**

Run: `Get-ChildItem src\sim -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|Math\.random"`
Expected: zero hits.

### Task 13: Confirm the skull inversion is still stated once, and no budget is breached

- Skill: none — verification only, no code written.

**Files:**

- (none — read-only checks)

- [ ] **Step 1: Confirm no second statement of the outcome axis was introduced**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "playerWon === ctx.skullTrick|playerWon !== ctx.skullTrick|trickWasLoss"`
Expected: zero hits. The inversion lives only in `bank.ts`'s `TAKEN` table and `trickOutcomeFor`, and `trickIsLoss` reaches `src/hunt/` as a parameter.

- [ ] **Step 2: Measure every file this contract created or grew**

Run: `Get-ChildItem src\App.tsx,src\app\warCouncil\WarCouncilRound.tsx,src\app\warCouncil\roundUiState.ts,src\app\warCouncil\BankMeter.tsx,src\app\warCouncil\buffRoundState.ts,src\app\warCouncil\roundResult.ts,src\app\screenFor.ts,src\hunt\buffAccrual.ts,src\hunt\buffTemplates.ts,src\hunt\run.ts,src\hunt\runTransitions.ts,src\warCouncil\bank.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count under 400. `(Get-Content).Count` and not `Measure-Object -Line`, which drops blank lines and hid a real breach on DLR-63.

### Task 14: Static gates and full suite

- Skill: none — verification only, no code written.

**Files:**

- (none — read-only checks)

- [ ] **Step 1: Warm the transform cache, then run the whole suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. The two project runs first are deliberate — a cold-cache `npm test` can report a `[vitest-pool-runner]` worker timeout on the `dom` project, which is infrastructure and not a failing test.

- [ ] **Step 2: Formatting of this contract's files only**

Run: `npx prettier --check src/app/warCouncil/BankMeter.tsx src/app/warCouncil/warCouncilTable.css src/app/warCouncil/roundResult.ts src/app/screenFor.ts src/hunt/buffAccrual.ts src/hunt/buffEvaluation.ts src/hunt/buffTemplates.ts src/hunt/run.ts src/hunt/runTransitions.ts src/warCouncil/bank.ts src/App.tsx`
Expected: exits 0. The repo-wide `npm run format:check` fails on pre-existing `.docs/**` files no contract has touched; run it and report it, but do not gate on it and do not "fix" it here.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 15: Update the PR description

- Skill: none — a document for the developer, no code written.

**Files:**

- Create: `.claude/contract/DLR-150-feeder-carry/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` and `mockup.html` in this folder.
- Summary: the Loss/dodge split, the carry pool's life from hand start to fight boundary, the restored Momentum Feeder (pool 13 → 16), and the two readout lines.
- Every decision the developer must make and every behaviour they must judge by playing — the whole "Developer decides or observes" list above, reproduced with its context.
- Verification results from the prior phases, quoting the actual Vitest summary lines and line counts.
- A one-line note for future contributors on the convention introduced: **the skull inversion is stated exactly once, in `bank.ts`'s `TAKEN` table; anything downstream that needs the outcome axis receives it as a parameter rather than re-deriving it.**

---

## Self-review

**Spec coverage:**

- AC1 — a Loss-fire carries and pays nothing this hand — Tasks 3, 4.
- AC2 — a dodge-fire pays this hand and counts toward the Overlap Bonus — Tasks 3, 4.
- AC3 — the carry seeds the next hand and is spendable through any cash-out route — Tasks 3, 5, 6, 7.
- AC4 — the carry resets at the fight boundary, won or lost — Task 5.
- AC5 — Momentum restored for the Feeder family — Task 9.
- AC6 — both halves of the carry on screen — Task 10.
- AC7 — Vitest coverage of all four named cases — Tasks 3, 4, 5, 10.
- In-scope bullet "the same threading through `src/sim/`" — Tasks 1, 8.
- In-scope bullet "two in-ticket 400-line-budget fixes" — Tasks 1, 2, and the measured contingency in Task 6.
- In-scope bullet "correcting `CLAUDE.md`" — Task 11.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact edit, or a runnable command with `Run:` / `Expected:`. Both contingencies (Task 1 Step 6, Task 6 Step 5) name the specific file and the specific move rather than deferring the decision.

**Type / name consistency:** `BuffCarry`, `EMPTY_BUFF_CARRY`, `accrueCarry`, `carriedIn`, `carryOut`, `feederCarry`, `feederCarryAfter`, `trickIsLoss`, `roundResultFor`, `screenFor` and `AppScreen` are spelled identically in every task that uses them and match `plan.md` Part 2 → Data shapes exactly. `carryOut` is the accrual's field and `feederCarry` is the run's and the seam's — deliberately different names for the same value at different scopes, following `blastGuardHeld`'s precedent of one name per layer. `resolveFiredBuffs` takes `(accrual, fired, trickIsLoss)` and `resolveTrickBuffs` takes `(input, ctx, trickIsLoss)` in every mention.

**Phase boundary cleanliness:**

- Phase 1 ends type-checking: two pure extractions, all three former construction sites of the result adopted in the same task, both new modules tested.
- Phase 2 ends type-checking: `resolveFiredBuffs` and `resolveTrickBuffs` grow a required parameter in Task 3 and every caller is updated in Task 4, inside the same phase.
- Phase 3 ends type-checking: `RunState` gains a required field, `startRun` seeds it, `recordEncounter`'s new parameter is optional so all 48 existing call sites compile unchanged, and the game plays identically with a field that is always empty.
- Phase 4 ends type-checking: the seam's required outbound field is satisfied by the single `roundResultFor` Phase 1 created, the inbound field is optional so no fixture changes, and felt and simulator adopt it together.
- Phase 5 ends type-checking: the pool widens with both assertions moved in the same task, and the readout's props are optional and defaulted so no other render site changes.
- Phase 6 makes no production change at all.
