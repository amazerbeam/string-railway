# Tasks: Apply Damage — a player-triggered cash-out

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-20

**Goal:** Give the player a control they press before committing a card that cashes the full `bank × multiplier` into the Quarry at no health cost, and make a forced hit pay only two-thirds of that figure — floored — so holding a growing bank becomes a bet against being caught first.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved 2026-08-20).

---

## File map

**Created:**

- `src/warCouncil/voluntaryCashOut.ts` — the voluntary cash-out, its refusal reasons, its `DuelSide` crossing
- `src/warCouncil/__tests__/voluntaryCashOut.test.ts` — specs for the above
- `src/app/warCouncil/quarryAdvance.ts` — the CPU-advance trio, moved verbatim out of `roundReducer.ts`
- `src/app/warCouncil/ApplyDamagePlate.tsx` — the felt-rail plate
- `src/app/warCouncil/warCouncilApplyDamage.css` — that plate's styles
- `src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx` — component specs
- `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts` — reducer specs for the commit path

**Modified:**

- `src/hunt/config.ts` — add `FORCED_CASH_OUT_NUMERATOR` and `FORCED_CASH_OUT_DENOMINATOR`
- `src/hunt/index.ts` — export both constants
- `src/warCouncil/bank.ts:100-200` — add `cashValue` / `forcedCashValue`; forced branch pays the reduced figure, end-of-hand pays full
- `src/warCouncil/index.ts` — export the new arithmetic and the whole voluntary-cash-out surface
- `src/warCouncil/__tests__/bank.test.ts` — every forced-hit assertion moves to the two-thirds figure (AC6)
- `src/app/warCouncil/roundUiState.ts` — `applyPoised` field, two action kinds, `canAct` and `applyDamageStock` predicates
- `src/app/warCouncil/roundReducer.ts:66-95,325-390` — remove the CPU trio, add the Apply Damage handler and its two cases
- `src/app/warCouncil/labels.ts` — Apply Damage copy
- `src/app/warCouncil/roundHint.ts` — the poised hint
- `src/app/warCouncil/BankMeter.tsx` — the second figure
- `src/app/warCouncil/WarCouncilRound.tsx` — mount the plate, read `canAct`
- `src/app/warCouncil/__tests__/roundReducer.bank.test.ts:64-65` — forced-hit figure
- `src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx:123` — forced-hit figure
- `src/app/warCouncil/__tests__/BankMeter.test.tsx` — the second figure

**Deleted:** *(none)*

**Developer decides or observes:**

- All new copy in `labels.ts` — `APPLY_DAMAGE_RAIL_LABEL`, `APPLY_DAMAGE_POISED_HINT`, the three `APPLY_DAMAGE_REFUSAL_MESSAGE` sentences, `applyDamageAccessibleName`'s wording, and `BankMeter`'s new line. Placeholder wording ships; the words are the developer's.
- The plate's glyph (`⤓` in the mockup) and its size bounds — `game-ux` forbids inventing these.
- Whether a third plate crowds `.wc-felt-rail` at a short viewport. QA proves no-scroll at named sizes; whether it *reads* crowded is the developer's eye.
- Whether two taps (poise-then-commit) is right, or one tap is better. Only felt by playing.
- Whether the absent breaking-hearts beat on a voluntary apply reads as abrupt. The Quarry's hearts drop with no intermediate frame, because that frame reads off `resolvedTrick` and no trick resolves.
- Confirmation that the two-thirds penalty applying to a **poison** hit is the intended reading (`plan.md` → Risks, first bullet).
- Confirmation that Apply Damage being available on a **follow** as well as a lead is the intended reading (`plan.md` → Risks, second bullet).

---

## Phase 1 — The two-thirds forced cash-out

The rule change, landed before anything new is built on top of it. The phase adds two configured constants, routes all three cash-outs through one named product, reduces the forced branch, and moves every assertion in the codebase that reads a forced-hit figure — engine specs and app specs together — so the phase ends with the suite internally consistent rather than red. Nothing new is exported to a component yet.

### Task 1: Name the forced-cash-out fraction in `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**

- Config: `src/hunt/config.ts` — add `FORCED_CASH_OUT_NUMERATOR` and `FORCED_CASH_OUT_DENOMINATOR`
- Modify: `src/hunt/index.ts` — export both

- [x] **Step 1: Append both constants immediately after `DAMAGE_PER_HIT`**

`DAMAGE_PER_HIT` is the last declaration of its block (currently line 399). Add below it:

```ts
// version-4-scope §3 / DLR-94 AC4 — a FORCED cash-out (a hit the player did not choose) pays this
// fraction of `bank × multiplier`. A cash-out the player CHOSE (`voluntaryCashOut.ts`) and the
// end-of-hand one both pay in full; this is the "you got caught before you applied" cost, and it
// is what makes Apply Damage a decision rather than a button with no wrong answer.
// SETTLED by the design on 2026-08-19. UNIT: dimensionless ratio, numerator over denominator.
//
// TWO CONSTANTS RATHER THAN ONE FLOAT, and that is arithmetic rather than style. `2 / 3` is
// 0.6666666666666666, so `3 * (2 / 3)` is 1.9999999999999998 and floors to 1 where the rule says
// 2 — wrong for every multiple of 3. Keeping them separate lets `forcedCashValue` multiply before
// it divides, so the dividend is an exact integer.
export const FORCED_CASH_OUT_NUMERATOR: number = 2
export const FORCED_CASH_OUT_DENOMINATOR: number = 3
```

- [x] **Step 2: Add both names to the existing `./config` export block in `src/hunt/index.ts`**

That file already re-exports a long alphabetical-ish list from `./config`. Insert both names beside `DAMAGE_PER_HIT`:

```ts
  DAMAGE_PER_HIT,
  FORCED_CASH_OUT_NUMERATOR,
  FORCED_CASH_OUT_DENOMINATOR,
```

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Reduce the forced branch in `src/warCouncil/bank.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/warCouncil/bank.ts:100-200` — add two exported functions; change two lines inside `resolveTrickBank`
- Test: `src/warCouncil/__tests__/bank.test.ts`

- [x] **Step 1: Write the failing specs for the new arithmetic**

Append a new `describe` block to `src/warCouncil/__tests__/bank.test.ts`, and add `cashValue, forcedCashValue` to its existing import from `'../bank'`:

```ts
describe('cashValue and forcedCashValue — DLR-94 AC4', () => {
  it('cashValue is the plain product', () => {
    expect(cashValue(3, 3)).toBe(9)
    expect(cashValue(5, 5)).toBe(25)
    expect(cashValue(0, 0)).toBe(0)
  })

  it('forcedCashValue pays two-thirds, rounded DOWN so the Quarry is never overpaid', () => {
    expect(forcedCashValue(3, 3)).toBe(6) // 9 -> 6 exactly
    expect(forcedCashValue(2, 2)).toBe(2) // 4 -> 2.66 -> 2
    expect(forcedCashValue(5, 5)).toBe(16) // 25 -> 16.66 -> 16
    expect(forcedCashValue(1, 1)).toBe(0) // 1 -> 0.66 -> 0
  })

  // The regression the float form produces: `3 * (2 / 3)` is 1.9999999999999998, which floors to
  // 1. Multiplying by the numerator BEFORE dividing keeps the dividend an exact integer.
  it('is exact on every multiple of three, where a float fraction loses one', () => {
    for (const product of [3, 6, 9, 12, 15, 30, 300]) {
      expect(forcedCashValue(1, product)).toBe((product * 2) / 3)
      expect(Math.floor(product * (2 / 3))).toBeLessThanOrEqual(forcedCashValue(1, product))
    }
  })

  it('floors a degenerate bank or multiplier to zero rather than propagating it', () => {
    for (const bad of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(cashValue(bad, 3)).toBe(0)
      expect(forcedCashValue(bad, 3)).toBe(0)
      expect(forcedCashValue(3, bad)).toBe(0)
    }
  })
})
```

- [x] **Step 2: Run the new specs and watch them fail for the right reason**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts -t "cashValue and forcedCashValue"`
Expected: the file fails to collect with a transform error naming `cashValue` / `forcedCashValue` as missing exports of `../bank`. That is the expected pre-implementation failure; it is not a defect.

- [x] **Step 3: Widen `bank.ts`'s import from `../hunt`**

Replace the first line of `src/warCouncil/bank.ts`:

```ts
import { DAMAGE_PER_HIT, DuelSide, type Damage, type IncomingDamage } from '../hunt'
```

with:

```ts
import {
  DAMAGE_PER_HIT,
  DuelSide,
  FORCED_CASH_OUT_DENOMINATOR,
  FORCED_CASH_OUT_NUMERATOR,
  type Damage,
  type IncomingDamage,
} from '../hunt'
```

- [x] **Step 4: Add both functions immediately above `resolveTrickBank`**

Insert after `isTaken` and before `resolveTrickBank`'s docblock:

```ts
/**
 * The figure a bank of `bank` at a multiplier of `multiplier` is worth IN FULL — the plain
 * product. THE one statement of it, so the three cash-outs this game now has (a voluntary apply,
 * the end of the hand, and a forced hit's reduced share) cannot disagree about what they are a
 * share OF.
 *
 * Floors a non-integer, non-positive, NaN or infinite input to 0 rather than propagating it, for
 * the reason `bankAdded`'s own guard below states: this figure feeds damage, then a rendered heart
 * row, so a NaN would vanish into a health bar with nothing logged anywhere
 * (`web-project.md` → "NaN propagates silently"). Every real input is a non-negative integer, so
 * this is a guard rather than a live path.
 */
export function cashValue(bank: number, multiplier: number): number {
  if (!Number.isInteger(bank) || !Number.isInteger(multiplier) || bank <= 0 || multiplier <= 0) {
    return 0
  }
  return bank * multiplier
}

/**
 * DLR-94 AC4 — what a FORCED cash-out pays: `cashValue` reduced to the configured fraction and
 * rounded DOWN, so the Quarry is never overpaid by a rounding artefact.
 *
 * MULTIPLIES BEFORE IT DIVIDES, which is load-bearing rather than stylistic. `x * (2 / 3)` is
 * `x * 0.6666666666666666`, so `3 * (2 / 3)` is `1.9999999999999998` and floors to 1 where the
 * rule says 2 — wrong for every multiple of 3. Taking the numerator first keeps the dividend an
 * exact integer at what is the only division in this file.
 *
 * Throws on a non-positive or non-finite denominator rather than returning `NaN`, exactly as
 * `flaskHealAmount` and `duelHealthBars` throw on theirs. Both figures are configured integers, so
 * this is a guard, not a path a player reaches.
 */
export function forcedCashValue(bank: number, multiplier: number): number {
  if (!Number.isFinite(FORCED_CASH_OUT_DENOMINATOR) || FORCED_CASH_OUT_DENOMINATOR <= 0) {
    throw new RangeError(
      `Cannot reduce a cash-out by a denominator of ${FORCED_CASH_OUT_DENOMINATOR}: it must be a positive finite number`,
    )
  }
  return Math.floor(
    (cashValue(bank, multiplier) * FORCED_CASH_OUT_NUMERATOR) / FORCED_CASH_OUT_DENOMINATOR,
  )
}
```

- [x] **Step 5: Route the forced branch and the end-of-hand branch through them**

Inside `resolveTrickBank`, replace:

```ts
  if (trickHit || poisonResets) {
    // A1 — the win above has already banked, so a won-but-poisoned trick cashes the LARGER figure.
    cashOut = bank * multiplier
    bank = 0
    multiplier = 0
  }

  const handEndCash = trick.finalTrick ? bank * multiplier : 0
```

with:

```ts
  if (trickHit || poisonResets) {
    // A1 — the win above has already banked, so a won-but-poisoned trick cashes the LARGER figure.
    //
    // DLR-94 AC4 — but a hit the player did not CHOOSE pays only the configured fraction of it.
    // That reduction is the whole cost that makes Apply Damage (`voluntaryCashOut.ts`) a decision:
    // cash the streak yourself for its full worth, or push it and be paid a share when caught.
    //
    // POISON REACHES THIS BRANCH TOO, and deliberately (`plan.md` → Assumptions). D3's poison hit
    // is the case the-hunt.md calls "the moment you cannot choose" — precisely what the reduction
    // is charging for. Paying poison in full would make being poisoned the CHEAPEST way to lose a
    // streak, which inverts the item this rule sits beside.
    cashOut = forcedCashValue(bank, multiplier)
    bank = 0
    multiplier = 0
  }

  // AC5 — UNCHANGED, and deliberately so: the end-of-hand cash pays IN FULL. The reduction above
  // is specifically the "you got caught before you chose to apply" cost, and the sixth trick
  // simply arriving is not being caught.
  const handEndCash = trick.finalTrick ? cashValue(bank, multiplier) : 0
```

- [x] **Step 6: Run the new specs — they now pass, and the pre-existing ones now fail**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts`
Expected: the `cashValue and forcedCashValue` block passes. Roughly ten pre-existing assertions now fail on the old full-payout figures. That is AC6's intentional behaviour change, not a regression — Step 7 moves them.

- [x] **Step 7: Move every forced-hit assertion in `bank.test.ts` to the reduced figure**

Each edit below is `old` → `new`. **Leave every other assertion alone** — comparative assertions (`ate.cashOut` vs `lost.cashOut`), `bankAdded` assertions, `multiplier` assertions, the replaced-clean-loss cases (`cashOut` 0) and the end-of-hand cases all hold unchanged, and the last of those is what pins AC5.

| Spec | `old` | `new` |
| --- | --- | --- |
| `a clean loss cashes bank × multiplier and resets both` | `expect(r.cashOut).toBe(9)` | `expect(r.cashOut).toBe(6)` |
| `AC8 — a sixth trick that takes damage cashes once, not twice` | `expect(r.cashOut).toBe(4)` | `expect(r.cashOut).toBe(2)` |
| `pays n × n across a whole unbroken streak — 1, 4, 9, 16, 25, 36` | `toEqual([1, 4, 9, 16, 25, 36])` | `toEqual([0, 2, 6, 10, 16, 24])` |
| `it.each` row `bonus: 0` | `payouts: [1, 4, 9, 16, 25, 36]` | `payouts: [0, 2, 6, 10, 16, 24]` |
| `it.each` row `bonus: 1` | `payouts: [2, 8, 18, 32, 50, 72]` | `payouts: [1, 5, 12, 21, 33, 48]` |
| `it.each` row `bonus: 2` | `payouts: [3, 12, 27, 48, 75, 108]` | `payouts: [2, 8, 18, 32, 50, 72]` |
| `DLR-92 — a bonus is never added to a trick that is not taken` | `expect(r.cashOut).toBe(9)` | `expect(r.cashOut).toBe(6)` |
| `incomingFrom` → `keys damage by the side it depletes` | `{ [DuelSide.Player]: 1, [DuelSide.Quarry]: 9 }` | `{ [DuelSide.Player]: 1, [DuelSide.Quarry]: 6 }` |
| `still charges a SKULL the player chose to eat, on top of the delayed hit` | `expect(r.cashOut).toBe(9)` | `expect(r.cashOut).toBe(6)` |
| `D3 — poison owed to the player cashes the streak out…` | `expect(r.cashOut).toBe(25)` | `expect(r.cashOut).toBe(16)` |
| `D2 — a trick the player loses while poisoned…` | `expect(r.cashOut).toBe(9)` | `expect(r.cashOut).toBe(6)` |
| `A4 — a Guard does NOT save the streak from the trick's own hit…` | `expect(r.cashOut).toBe(16)` | `expect(r.cashOut).toBe(10)` |

Also rename the streak spec so its title stops claiming the old figures, and update the `it.each` title:

```ts
  it('a forced hit pays two-thirds of n × n across a whole unbroken streak — 0, 2, 6, 10, 16, 24', () => {
```

```ts
    'DLR-92 AC2/AC7 + DLR-94 AC4 — a bank-climb bonus of $bonus pays two-thirds of (1 + bonus) × n² when the streak is caught',
```

- [x] **Step 8: Pin AC5 — the end-of-hand cash-out is untouched**

Append to the `resolveTrickBank` describe block:

```ts
  it('AC5 — the end-of-hand cash-out still pays IN FULL, unlike a forced hit', () => {
    // The SAME streak, cashed two ways: caught on a lost trick, versus surviving to the sixth.
    const streak: BankState = { bank: 3, multiplier: 3 }
    const caught = resolveTrickBank(streak, facts())
    const survived = resolveTrickBank(streak, facts({ playerWon: true, finalTrick: true }))

    expect(caught.cashOut).toBe(6) // two-thirds of 9
    expect(caught.cashedAtHandEnd).toBe(false)
    // The win banks first, so the sixth trick cashes 4 x 4 = 16 — in full, not two-thirds (10).
    expect(survived.cashOut).toBe(16)
    expect(survived.cashedAtHandEnd).toBe(true)
  })
```

- [x] **Step 9: Run the file green**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts`
Expected: exits 0, Vitest reports 0 failed.

- [x] **Step 10: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 3: Move the app-layer specs that read a forced-hit figure ✓

- Skill: react-frontend

**Files:**

- Test: `src/app/warCouncil/__tests__/roundReducer.bank.test.ts:64-65`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx:123`

- [x] **Step 1: `roundReducer.bank.test.ts` — the mid-hand clean loss now pays 2, not 4**

In `cashes the bank into the Quarry the moment a clean trick is lost` (bank 2 × multiplier 2), replace:

```ts
    expect(ui.resolvedTrick?.resolution.cashOut).toBe(4)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 4)
```

with:

```ts
    // DLR-94 AC4 — a forced hit pays two-thirds of 2 x 2, floored: 2.
    expect(ui.resolvedTrick?.resolution.cashOut).toBe(2)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 2)
```

- [x] **Step 2: `WarCouncilRound.readouts.test.tsx` — the same streak through the rendered meter**

Replace:

```ts
    expect(Number(healthMeter(quarryLabelFixture).getAttribute('aria-valuenow'))).toBe(
      quarryHealthForEncounter(0) - 4,
    )
```

with:

```ts
    // DLR-94 AC4 — a forced hit pays two-thirds of 2 x 2, floored: 2.
    expect(Number(healthMeter(quarryLabelFixture).getAttribute('aria-valuenow'))).toBe(
      quarryHealthForEncounter(0) - 2,
    )
```

- [x] **Step 3: Run every spec that exercises the bank, both projects**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.bank.test.ts src/app/warCouncil/__tests__/roundReducer.poison.test.ts src/app/warCouncil/__tests__/roundReducer.envenom.test.ts src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.envenom.test.tsx`
Expected: exits 0, Vitest reports 0 failed. The poison and envenom specs assert bank/multiplier resets and pending-poison figures rather than cash-out amounts, and `WarCouncilRound.envenom.test.tsx`'s `cashes for 6` reads the FULL preview — all four are expected to pass with no edit. If any fails on a cash figure, move that figure to `forcedCashValue`'s result and note it in the Implementer Report.

- [x] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — The voluntary cash-out, as pure logic

The third kind of cash-out AC2 asks for, built as a pure module with no React and no DOM so it is fully unit-testable and cannot reach the felt's state shape. Nothing imports it yet, so the phase ends type-checking with the app unchanged.

### Task 4: Write `src/warCouncil/voluntaryCashOut.ts` ✓

- Skill: react-frontend

**Files:**

- Create: `src/warCouncil/voluntaryCashOut.ts`
- Test: `src/warCouncil/__tests__/voluntaryCashOut.test.ts`

- [x] **Step 1: Write the failing specs**

Create `src/warCouncil/__tests__/voluntaryCashOut.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DuelSide } from '../../hunt'
import {
  ApplyDamageRefusal,
  applyDamageRefusalFor,
  cashBankNow,
  incomingFromCashOut,
  type ApplyDamageStock,
} from '../voluntaryCashOut'
import { PlayerSide, RoundPhase, Suit, type RoundState } from '../types'

const stock = (over: Partial<ApplyDamageStock> = {}): ApplyDamageStock => ({
  bank: 3,
  multiplier: 3,
  poisonPending: false,
  canAct: true,
  ...over,
})

/** A minimal mid-trick round: the Quarry has led and the player owes a follow. */
function round(over: Partial<RoundState> = {}): RoundState {
  const lead = { side: PlayerSide.Cpu, card: { suit: Suit.Bells, rank: 9 } }
  return {
    dealer: PlayerSide.Cpu,
    hands: { [PlayerSide.Player]: [{ suit: Suit.Bells, rank: 2 }], [PlayerSide.Cpu]: [] },
    drawPile: [],
    decree: { suit: Suit.Keys, rank: 10 },
    trumpSuit: Suit.Keys,
    tricksWon: { [PlayerSide.Player]: 1, [PlayerSide.Cpu]: 2 },
    skulledCards: [],
    envenomedCards: [],
    bank: 3,
    multiplier: 3,
    lastResolution: null,
    currentTrick: [lead],
    leader: PlayerSide.Cpu,
    tricksPlayed: 3,
    phase: RoundPhase.AwaitingFollow,
    ...over,
  }
}

describe('applyDamageRefusalFor — AC1 and D6', () => {
  it('allows the apply when the bank is up, nothing is owed, and it is the player’s move', () => {
    expect(applyDamageRefusalFor(stock())).toBeNull()
  })

  it('AC1 — refuses an empty bank, naming the reason', () => {
    expect(applyDamageRefusalFor(stock({ bank: 0, multiplier: 0 }))).toBe(
      ApplyDamageRefusal.EmptyBank,
    )
  })

  it('D6 — refuses while a poison hit is still owed', () => {
    expect(applyDamageRefusalFor(stock({ poisonPending: true }))).toBe(
      ApplyDamageRefusal.PoisonPending,
    )
  })

  it('refuses when the player’s card is not the next thing to be committed', () => {
    expect(applyDamageRefusalFor(stock({ canAct: false }))).toBe(ApplyDamageRefusal.NotYourMove)
  })

  // The order is the reason that will still be true after the next trick banks — `flaskRefusalFor`
  // states the same discipline. Getting it backwards tells a poisoned player to go take a trick.
  it('names the move gate first, then poison, then the bank', () => {
    expect(
      applyDamageRefusalFor(stock({ bank: 0, poisonPending: true, canAct: false })),
    ).toBe(ApplyDamageRefusal.NotYourMove)
    expect(applyDamageRefusalFor(stock({ bank: 0, poisonPending: true }))).toBe(
      ApplyDamageRefusal.PoisonPending,
    )
  })

  it('refuses a degenerate bank rather than treating it as a streak', () => {
    for (const bad of [Number.NaN, -1, 1.5]) {
      expect(applyDamageRefusalFor(stock({ bank: bad }))).toBe(ApplyDamageRefusal.EmptyBank)
      expect(applyDamageRefusalFor(stock({ multiplier: bad }))).toBe(ApplyDamageRefusal.EmptyBank)
    }
  })
})

describe('cashBankNow — AC2 and AC3', () => {
  it('AC2 — pays the FULL bank × multiplier, unlike a forced hit', () => {
    expect(cashBankNow(round()).cashOut).toBe(9)
  })

  it('AC2 — zeroes the bank and the multiplier', () => {
    const { state } = cashBankNow(round())
    expect(state.bank).toBe(0)
    expect(state.multiplier).toBe(0)
  })

  it('AC2 — the player takes no damage at all', () => {
    const incoming = incomingFromCashOut(cashBankNow(round()).cashOut)
    expect(incoming[DuelSide.Player]).toBe(0)
    expect(incoming[DuelSide.Quarry]).toBe(9)
  })

  // AC3 is a property of what is NOT touched: the trick is mid-flight and stays mid-flight, so the
  // player's next tap plays their card by the ordinary rules against a zeroed bank.
  it('AC3 — leaves the trick, the phase, the leader and the hands exactly as they were', () => {
    const before = round()
    const { state } = cashBankNow(before)
    expect(state.currentTrick).toEqual(before.currentTrick)
    expect(state.phase).toBe(before.phase)
    expect(state.leader).toBe(before.leader)
    expect(state.hands).toEqual(before.hands)
    expect(state.tricksPlayed).toBe(before.tricksPlayed)
    expect(state.tricksWon).toEqual(before.tricksWon)
  })

  it('does NOT write lastResolution — no trick resolved', () => {
    expect(cashBankNow(round()).state.lastResolution).toBeNull()
    const carried = { outcome: 'cleanWin' } as unknown as RoundState['lastResolution']
    expect(cashBankNow(round({ lastResolution: carried })).state.lastResolution).toBe(carried)
  })

  it('never mutates the round it was given', () => {
    const before = round()
    cashBankNow(before)
    expect(before.bank).toBe(3)
    expect(before.multiplier).toBe(3)
  })

  it('pays nothing from an empty bank, and is safe to call anyway', () => {
    const { state, cashOut } = cashBankNow(round({ bank: 0, multiplier: 0 }))
    expect(cashOut).toBe(0)
    expect(state.bank).toBe(0)
  })
})
```

- [x] **Step 2: Run and watch it fail for the right reason**

Run: `npx vitest run src/warCouncil/__tests__/voluntaryCashOut.test.ts`
Expected: the file fails to collect — `Failed to load .../voluntaryCashOut`. That is the expected pre-implementation failure.

- [x] **Step 3: Create the module**

Create `src/warCouncil/voluntaryCashOut.ts`:

```ts
import { DuelSide, type IncomingDamage } from '../hunt'
import { cashValue } from './bank'
import type { RoundState } from './types'

/**
 * DLR-94 AC1 — why Apply Damage cannot be pressed. A reason CODE, not a sentence: `src/warCouncil/`
 * holds no user-facing copy, and `src/app/warCouncil/labels.ts` maps these to words. Exactly
 * `src/hunt/flask.ts`'s `FlaskRefusal` and `src/hunt/shop.ts`'s `PurchaseRefusal`.
 */
export const ApplyDamageRefusal = {
  /** AC1 — nothing banked, so there is nothing to cash. */
  EmptyBank: 'emptyBank',
  /** D6 (version-4-scope §3, decided 2026-08-19) — a booked poison hit has not landed yet, and a
   *  player able to cash out on demand could otherwise dodge the interaction between the two
   *  systems entirely. */
  PoisonPending: 'poisonPending',
  /** The felt is not waiting on the player's card — a trick reveal is held, an ability prompt is
   *  open, the Quarry is to move, or the hand is over. */
  NotYourMove: 'notYourMove',
} as const
export type ApplyDamageRefusal = (typeof ApplyDamageRefusal)[keyof typeof ApplyDamageRefusal]

/**
 * Everything the rule needs and nothing else — PLAIN VALUES, never an `EncounterState` or a
 * `RoundUiState`. `FlaskStock` and `ShopStock` state the same discipline: this module owns the
 * rule and must not learn the shape of the layer that calls it. `roundUiState.ts`'s
 * `applyDamageStock` builds it.
 */
export interface ApplyDamageStock {
  readonly bank: number
  readonly multiplier: number
  /** Poison is owed to either side and has not been paid. */
  readonly poisonPending: boolean
  /** The player's own card is the next thing to be committed. */
  readonly canAct: boolean
}

/**
 * THE single statement of whether Apply Damage is available — read by the reducer before it
 * commits anything, and by the plate to disable itself and print the reason. Two readings of one
 * rule, never two rules: a greyed control and a reducer branch that decide availability separately
 * is exactly how the two drift apart, which is why `cheatArmed` and `envenomArmed` are exported
 * from `roundUiState.ts` rather than recomputed in the component.
 *
 * `NotYourMove` comes FIRST because it is true of the whole felt rather than of this control, and
 * `PoisonPending` before `EmptyBank` for `flaskRefusalFor`'s stated reason: report the reason that
 * will still be true after the next trick banks. Telling a poisoned player with an empty bank to
 * go and take a trick would be actively wrong.
 *
 * A non-integer or non-positive bank or multiplier refuses rather than passing the comparison.
 * `NaN > 0` is `false`, but a fractional bank would otherwise present a fractional cash-out as
 * applicable — and that figure would reach a heart row that renders whole hearts.
 */
export function applyDamageRefusalFor(stock: ApplyDamageStock): ApplyDamageRefusal | null {
  if (!stock.canAct) return ApplyDamageRefusal.NotYourMove
  if (stock.poisonPending) return ApplyDamageRefusal.PoisonPending
  if (cashValue(stock.bank, stock.multiplier) <= 0) return ApplyDamageRefusal.EmptyBank
  return null
}

/** AC2 — the round with the streak spent, and what spending it cost the Quarry. */
export interface VoluntaryCashOut {
  /** Bank and multiplier zeroed. EVERYTHING else — `lastResolution`, `currentTrick`, `phase`,
   *  `leader`, both hands — is carried through untouched. */
  readonly state: RoundState
  /** The FULL `cashValue`, not a forced hit's reduced share: choosing is what buys the difference. */
  readonly cashOut: number
}

/**
 * AC2 — cash the current streak into the Quarry by choice, at no cost in health.
 *
 * NOT a fifth `TrickOutcome` and not a synthetic trick, deliberately. Making it one would force
 * `trickOutcomeFor` to become partial, give every `isTaken` consumer a case that is not a trick,
 * and produce a `TrickResolution` describing a trick that never happened — which `BankMeter` and
 * `TrickWell` both read as "what the last trick did". It shares `cashValue` with `resolveTrickBank`
 * and nothing else, which is precisely what AC2 asks for.
 *
 * AC3 is a consequence of what this does NOT touch rather than a rule it enforces: the trick is
 * mid-flight and stays mid-flight, so the player's next tap plays their card through the ordinary
 * `playCard` path, against a freshly zeroed bank.
 */
export function cashBankNow(state: RoundState): VoluntaryCashOut {
  return {
    state: { ...state, bank: 0, multiplier: 0 },
    cashOut: cashValue(state.bank, state.multiplier),
  }
}

/**
 * The `PlayerSide` -> `DuelSide` crossing for a voluntary cash-out, in one named place for the
 * reason `incomingFrom`'s docblock gives: a caller assembling this record by hand is one
 * transposition away from depleting the wrong bar forever.
 *
 * The player's entry is a hard 0 — AC2's "deals no damage to the player" is this line.
 */
export function incomingFromCashOut(cashOut: number): IncomingDamage {
  return {
    [DuelSide.Player]: 0,
    [DuelSide.Quarry]: cashOut,
  }
}
```

- [x] **Step 4: Run the specs green**

Run: `npx vitest run src/warCouncil/__tests__/voluntaryCashOut.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 5: Export the new surface from the `warCouncil` barrel ✓

- Skill: react-frontend

**Files:**

- Modify: `src/warCouncil/index.ts`

- [x] **Step 1: Widen the `./bank` export and add the `./voluntaryCashOut` block**

Replace:

```ts
export { incomingFrom, isTaken, resolveTrickBank, TrickOutcome, trickOutcomeFor } from './bank'
export type { BankState, TrickFacts, TrickResolution } from './bank'
```

with:

```ts
export {
  cashValue,
  forcedCashValue,
  incomingFrom,
  isTaken,
  resolveTrickBank,
  TrickOutcome,
  trickOutcomeFor,
} from './bank'
export type { BankState, TrickFacts, TrickResolution } from './bank'
export {
  ApplyDamageRefusal,
  applyDamageRefusalFor,
  cashBankNow,
  incomingFromCashOut,
} from './voluntaryCashOut'
export type { ApplyDamageStock, VoluntaryCashOut } from './voluntaryCashOut'
```

- [x] **Step 2: Typecheck and lint the pure tree**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. Lint passing matters specifically here: `eslint.config.js`'s override forbids React imports and DOM globals under `src/warCouncil/**`, and this is the phase that adds a file there.

---

## Phase 3 — The reducer

The felt's state and its transition. The CPU-advance trio moves out first so `roundReducer.ts` has room — it stands at 390 of its 400-line budget and cannot take a new handler otherwise. Widening before cutting is what keeps each step in this phase type-checking. The phase ends with the action fully working and no way to reach it from the screen.

### Task 6: Extract the CPU-advance trio into `src/app/warCouncil/quarryAdvance.ts` ✓

- Skill: react-frontend

**Files:**

- Create: `src/app/warCouncil/quarryAdvance.ts`
- Modify: `src/app/warCouncil/roundReducer.ts:66-71,325-390` — remove the interface and the three functions, import them instead

- [x] **Step 1: Create the new module with the three functions moved verbatim**

Create `src/app/warCouncil/quarryAdvance.ts`. Move `CpuAdvanceResult`, `deriveResolvedTrick`, `advanceQuarryFollow` and `advanceQuarryLead` out of `roundReducer.ts` **with their docblocks unchanged**, export all four, and add this file-level docblock at the top:

```ts
/**
 * The Quarry's half of a commit — deriving a resolved trick's reveal, committing its follow, and
 * committing its lead — separated from the reducer that calls them.
 *
 * Split out of `roundReducer.ts` on DLR-94 for the reason `roundUiState.ts` was split out on
 * DLR-90: that file stood at 390 of its 400-line budget before the Apply Damage handler was
 * written. The seam is the same kind of seam — this is the block that talks to `cpuPlayer` and
 * `playCard` and decides nothing about the player's own state, so nothing here needs to know what
 * a `RoundUiState` is. PURE MOVE: no behaviour changed, and every docblock came with its function.
 */
```

Its imports:

```ts
import {
  chooseCpuMove,
  commitQuarryMove,
  legalMoves,
  playCard,
  PlayerSide,
  QUARRY_SIDE,
  TrickOutcome,
  type PlayCardOptions,
  type TrickCard,
  type WarCouncilState,
} from '../../warCouncil'
import type { CpuFault, ResolvedTrick } from './roundUiState'
```

- [x] **Step 2: Import them back into `roundReducer.ts` and delete the moved code**

Add to `roundReducer.ts`:

```ts
import { advanceQuarryFollow, advanceQuarryLead, deriveResolvedTrick } from './quarryAdvance'
```

Delete the `CpuAdvanceResult` interface and all three function bodies from `roundReducer.ts`. Then prune its now-unused imports — `chooseCpuMove`, `commitQuarryMove`, `TrickOutcome`, and `type TrickCard` are only referenced by the moved code; `legalMoves`, `playCard`, `PlayerSide` and `QUARRY_SIDE` are still used by what remains, so keep those.

- [x] **Step 3: Confirm the move changed no behaviour**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts src/app/warCouncil/__tests__/roundReducer.bank.test.ts src/app/warCouncil/__tests__/roundReducer.poison.test.ts src/app/warCouncil/__tests__/roundReducer.envenom.test.ts`
Expected: exits 0, Vitest reports 0 failed. No spec was edited in this task, so any failure is a bad move rather than a changed rule.

- [x] **Step 4: Confirm the budget headroom the extraction bought**

Run: `(Get-Content src\app\warCouncil\roundReducer.ts).Count; (Get-Content src\app\warCouncil\quarryAdvance.ts).Count`
Expected: `roundReducer.ts` is comfortably under 330 — it was 390 — and `quarryAdvance.ts` is under 100. Use `(Get-Content …).Count`, never `Measure-Object -Line`, which drops blank lines and undercounts.

- [x] **Step 5: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. Lint is what catches an import left behind by the move.

### Task 7: Add the state, the actions, and the two shared predicates in `roundUiState.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/roundUiState.ts`

- [x] **Step 1: Add the `applyPoised` field to `RoundUiState`**

After the `bankClimbBonus` field:

```ts
  /** DLR-94 — the Apply Damage plate has been tapped once and awaits its confirming second tap.
   *  The hand's OWN transient: dies on remount, never touches `RunState`.
   *
   *  A single BOOLEAN rather than `EnvenomStage`'s two-stage union, deliberately. Envenom needs
   *  two stages because its armed state waits for a THIRD tap on a hand card; Apply Damage's
   *  second tap IS the action, so "poised" is the only state there is to be in. */
  readonly applyPoised: boolean
```

Seed it in `createRoundUiState` as `applyPoised: false`. `RoundUiSeed` is unchanged — nothing about this control is run state.

- [x] **Step 2: Add the two action kinds and their variants**

To `RoundUiActionKind`:

```ts
  TapApplyDamage: 'tapApplyDamage',
  CancelApplyDamage: 'cancelApplyDamage',
```

To `RoundUiAction`:

```ts
  | { readonly kind: typeof RoundUiActionKind.TapApplyDamage }
  | { readonly kind: typeof RoundUiActionKind.CancelApplyDamage }
```

Neither carries a payload: there is one plate and it is not addressed by id, unlike `TapCheat`.

- [x] **Step 3: Move `canAct` here from `roundReducer.ts`, exported**

`canAct` is a pure predicate over `RoundUiState`, which is what this file is documented to hold — and `WarCouncilRound.tsx` currently recomputes the identical six-clause expression inline as `interactive`. One statement, read by both, is the same discipline `cheatArmed` and `envenomArmed` already carry in this file. Add the imports it needs (`currentTurn`, `PlayerSide`, `RoundPhase` as values from `'../../warCouncil'`, and `isEncounterResolved` from `'../../hunt'`), then:

```ts
/** The felt is waiting on the player's own card — nothing is held, nothing is prompting, the
 *  engine has not faulted, the hand and the fight are both still live, and it is their turn.
 *
 *  EXPORTED and moved here from `roundReducer.ts` on DLR-94, because `WarCouncilRound.tsx` was
 *  recomputing the identical six clauses inline as `interactive`. Two readings of one gate is how
 *  a greyed control and a reducer branch drift apart — the same reason `cheatArmed` and
 *  `envenomArmed` below are exported rather than recomputed in the component. */
export function canAct(state: RoundUiState): boolean {
  return (
    state.round.phase !== RoundPhase.Complete &&
    !isEncounterResolved(state.encounter) &&
    state.resolvedTrick === null &&
    state.prompt === null &&
    state.cpuFault === null &&
    currentTurn(state.round) === PlayerSide.Player
  )
}
```

- [x] **Step 4: Add `applyDamageStock`**

```ts
/** The plain values `applyDamageRefusalFor` needs, assembled in ONE place so the reducer's guard
 *  and the plate's disabled state cannot read availability differently.
 *
 *  This is where the app layer's shape is translated into the pure module's — `hasPendingEnvenom`
 *  and `canAct` are read HERE and nowhere else, which is what lets `voluntaryCashOut.ts` take four
 *  plain values and stay ignorant of both `EncounterState` and `RoundUiState`. */
export function applyDamageStock(state: RoundUiState): ApplyDamageStock {
  return {
    bank: state.round.bank,
    multiplier: state.round.multiplier,
    poisonPending: hasPendingEnvenom(state.encounter),
    canAct: canAct(state),
  }
}
```

Import `hasPendingEnvenom` from `'../../hunt'` and `type ApplyDamageStock` from `'../../warCouncil'`.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: errors in `roundReducer.ts` only — it still declares its own private `canAct` (now a duplicate) and its `switch` is not exhaustive over the two new action kinds. Both are fixed by Task 8; nothing else should be reported. This is the one deliberately red step in the phase.

### Task 8: Commit the voluntary cash-out in `roundReducer.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/roundReducer.ts` — delete the private `canAct`, add two `switch` cases and the handler
- Test: `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts`

- [x] **Step 1: Write the failing reducer specs**

Create `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide, RoundPhase, Suit, TrickOutcome, type WarCouncilState } from '../../../warCouncil'
import {
  DuelSide,
  PLAYER_START_HEALTH,
  isEncounterResolved,
  queueEnvenom,
  quarryHealthForEncounter,
  startEncounter,
  type EncounterState,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { card, envenomChargesFixture, makeRound } from './roundFixture'

const tapApply = { kind: RoundUiActionKind.TapApplyDamage } as const
const cancelApply = { kind: RoundUiActionKind.CancelApplyDamage } as const

function uiFrom(
  round: WarCouncilState,
  encounter: EncounterState = startEncounter(0),
): RoundUiState {
  return createRoundUiState({
    round,
    encounter,
    cheats: [],
    envenomCharges: envenomChargesFixture,
    poisonGuardHeld: false,
    bankClimbBonus: 0,
  })
}

/** The player is to lead, holding a streak of 3 x 3 = 9. */
function streakRound(): WarCouncilState {
  return makeRound({
    leader: PlayerSide.Player,
    trumpSuit: Suit.Keys,
    bank: 3,
    multiplier: 3,
    currentTrick: [],
  })
}

const apply = (ui: RoundUiState) => roundReducer(roundReducer(ui, tapApply), tapApply)

describe('Apply Damage — the poise, and the refusals (AC1, D6)', () => {
  it('one tap poises and changes nothing else', () => {
    const ui = roundReducer(uiFrom(streakRound()), tapApply)
    expect(ui.applyPoised).toBe(true)
    expect(ui.round.bank).toBe(3)
    expect(ui.round.multiplier).toBe(3)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
  })

  it('AC1 — an empty bank cannot even be poised', () => {
    const ui = roundReducer(uiFrom(makeRound({ leader: PlayerSide.Player })), tapApply)
    expect(ui.applyPoised).toBe(false)
  })

  it('D6 — a pending poison hit cannot be poised past', () => {
    const owed = queueEnvenom(startEncounter(0), DuelSide.Player)
    const ui = roundReducer(uiFrom(streakRound(), owed), tapApply)
    expect(ui.applyPoised).toBe(false)
    expect(ui.round.bank).toBe(3)
  })

  // The felt can change under a poised plate. A poise made while the control was live must not
  // commit after it stopped being — which is D6's "read the predicate before it commits".
  it('D6 — poison booked AFTER the poise still stops the commit, and drops the poise', () => {
    let ui = roundReducer(uiFrom(streakRound()), tapApply)
    expect(ui.applyPoised).toBe(true)
    ui = { ...ui, encounter: queueEnvenom(ui.encounter, DuelSide.Player) }
    ui = roundReducer(ui, tapApply)
    expect(ui.applyPoised).toBe(false)
    expect(ui.round.bank).toBe(3)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
  })

  it('cancels a poise without spending anything', () => {
    let ui = roundReducer(uiFrom(streakRound()), tapApply)
    ui = roundReducer(ui, cancelApply)
    expect(ui.applyPoised).toBe(false)
    expect(ui.round.bank).toBe(3)
    expect(ui.round.multiplier).toBe(3)
  })
})

describe('Apply Damage — the commit (AC2, AC3)', () => {
  it('AC2 — the second tap pays the FULL bank × multiplier into the Quarry', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 9)
  })

  it('AC2 — and costs the player nothing', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
  })

  it('AC2 — resets the bank and the multiplier, and un-poises', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.round.bank).toBe(0)
    expect(ui.round.multiplier).toBe(0)
    expect(ui.applyPoised).toBe(false)
  })

  it('AC3 — no trick is resolved, so no reveal is held and the hand stays live', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.resolvedTrick).toBeNull()
    expect(ui.round.lastResolution).toBeNull()
    expect(ui.round.phase).toBe(RoundPhase.AwaitingLead)
    expect(ui.round.currentTrick).toEqual([])
  })

  it('AC3 — the player then plays their card by the ordinary rules, against a zeroed bank', () => {
    let ui = apply(
      uiFrom(
        makeRound({
          leader: PlayerSide.Player,
          trumpSuit: Suit.Keys,
          bank: 3,
          multiplier: 3,
          hands: {
            [PlayerSide.Player]: [card(Suit.Bells, 2)],
            [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
          },
          currentTrick: [],
        }),
      ),
    )
    const quarryAfterApply = ui.encounter.health[DuelSide.Quarry]
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Bells, 2) })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Bells, 2) })

    // The trick is lost, but the bank was already spent — so the forced cash-out pays nothing.
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    expect(ui.resolvedTrick?.resolution.cashOut).toBe(0)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryAfterApply)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 1)
  })

  it('cashing out a lethal streak ends the fight through the ordinary machinery', () => {
    const ui = apply(uiFrom(makeRound({ leader: PlayerSide.Player, bank: 500, multiplier: 2 })))
    expect(isEncounterResolved(ui.encounter)).toBe(true)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(0)
    // AC2 holds even on the killing blow: the player took nothing for it.
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
  })

  it('a further tap on a resolved fight is inert rather than throwing', () => {
    const settled = apply(uiFrom(makeRound({ leader: PlayerSide.Player, bank: 500, multiplier: 2 })))
    expect(roundReducer(settled, tapApply)).toBe(settled)
  })
})
```

- [x] **Step 2: Run and watch it fail for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts`
Expected: a transform/collection error — `TapApplyDamage` does not exist on `RoundUiActionKind` yet from the reducer's side, and `applyPoised` never changes. Pre-implementation failure, not a defect.

- [x] **Step 3: Delete the private `canAct` and import the shared one**

Remove the `canAct` function body from `roundReducer.ts` (it now lives in `roundUiState.ts`) and add `canAct` plus `applyDamageStock` to the existing import from `'./roundUiState'`. Every existing call site inside the file — `handleTapCard`, `handleTapCheat`, `handleTapEnvenom` — keeps calling `canAct(state)` unchanged.

- [x] **Step 4: Add the handler**

Add to `roundReducer.ts`, beside `handleTapEnvenom`:

```ts
/**
 * DLR-94 AC1/AC2 — three outcomes on one control, mirroring `handleTapEnvenom`'s shape. A refusal
 * changes nothing; nothing poised poises; poised COMMITS. There is no third stage: unlike Envenom,
 * this control's second tap IS the action rather than a prelude to a hand-card tap.
 *
 * Asks `applyDamageRefusalFor` on BOTH taps, not just the first. The felt can change under a
 * poised plate — a poison booking lands, a reveal is held, the turn passes — and re-reading is what
 * stops a poise made while the control was live from committing after it stopped being. D6
 * (version-4-scope §3) asks for exactly this: the control must read the pending-poison predicate
 * "before it commits to anything".
 *
 * AC3 needs no code here. `cashBankNow` returns the round with only `bank` and `multiplier` moved,
 * `resolvedTrick` stays null, and nothing writes `lastResolution` — so no reveal is held, the felt
 * never enters its waiting state, and the player's next tap plays their card by the ordinary rules.
 *
 * Poising does NOT clear the Cheat or Envenom selection, and they do not clear it. Those two
 * reinterpret the next hand-card tap and therefore cannot coexist; this one reinterprets nothing,
 * so a player may poise a Cheat and apply damage in either order without losing either.
 */
function handleTapApplyDamage(state: RoundUiState): RoundUiState {
  if (applyDamageRefusalFor(applyDamageStock(state)) !== null) {
    // A refusal drops a held poise rather than leaving it stranded, and never half-applies. The
    // reason is already on the plate's face, so the player is never left with no visible cause.
    return state.applyPoised ? { ...state, applyPoised: false } : state
  }
  if (!state.applyPoised) {
    return { ...state, applyPoised: true }
  }

  const { state: round, cashOut } = cashBankNow(state.round)
  // Guarded for the reason `applyResolution` guards: `applyDamage` THROWS on an already-resolved
  // encounter, and a reducer must not throw — a throw during an event handler unmounts the tree.
  // Unreachable in practice, since a resolved encounter already fails `canAct`.
  const encounter = isEncounterResolved(state.encounter)
    ? state.encounter
    : applyDamage(state.encounter, incomingFromCashOut(cashOut))
  return { ...state, round, encounter, applyPoised: false }
}
```

Add `applyDamageRefusalFor`, `cashBankNow` and `incomingFromCashOut` to the existing import from `'../../warCouncil'`.

- [x] **Step 5: Add the two `switch` cases**

In `roundReducer`'s `switch`, after the `CancelEnvenom` case:

```ts
    case RoundUiActionKind.TapApplyDamage:
      return handleTapApplyDamage(state)
    case RoundUiActionKind.CancelApplyDamage:
      return state.applyPoised ? { ...state, applyPoised: false } : state
```

- [x] **Step 6: Run the new specs green, then the whole reducer set for regressions**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts src/app/warCouncil/__tests__/roundReducer.test.ts src/app/warCouncil/__tests__/roundReducer.bank.test.ts src/app/warCouncil/__tests__/roundReducer.poison.test.ts src/app/warCouncil/__tests__/roundReducer.envenom.test.ts`
Expected: exits 0, Vitest reports 0 failed.

- [x] **Step 7: Typecheck, lint, and confirm the budget**

Run: `npm run typecheck; npm run lint; (Get-Content src\app\warCouncil\roundReducer.ts).Count; (Get-Content src\app\warCouncil\roundUiState.ts).Count`
Expected: both gates exit 0. Both files are under 400 — `roundReducer.ts` should land near 350 and `roundUiState.ts` near 215. If either exceeds 400, split it in this task rather than reporting it as a finding.

---

## Phase 4 — The screen

The plate, its copy, and the second figure on the bank readout. Every rule is already decided and tested by this point, so nothing in this phase adjudicates anything: the component renders a figure and a refusal it is handed, and calls back. Layout follows `mockup.html`'s felt rail.

### Task 9: Add the Apply Damage copy to `labels.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/labels.ts`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Append the copy block**

At the end of `labels.ts`, mirroring the Envenom block above it. Add `ApplyDamageRefusal` to the file's existing type-only import from `'../../warCouncil'`:

```ts
/** The Apply Damage plate's copy (DLR-94). PLACEHOLDER — the wording is the developer's, exactly
 *  as `ENVENOM_RAIL_LABEL` and the rest of this file are. */
export const APPLY_DAMAGE_RAIL_LABEL = 'Apply'
export const APPLY_DAMAGE_POISED_HINT = 'Tap Apply again to cash your streak'

/** Why the control is dark, in the player's words. A total `Record`, so a fourth refusal reason is
 *  a compile error here rather than an `undefined` sentence under a disabled button. */
export const APPLY_DAMAGE_REFUSAL_MESSAGE: Readonly<Record<ApplyDamageRefusal, string>> = {
  [ApplyDamageRefusal.EmptyBank]: 'No streak to cash — take a trick first.',
  [ApplyDamageRefusal.PoisonPending]:
    'A poison hit is still owed — you cannot apply until it lands.',
  [ApplyDamageRefusal.NotYourMove]: 'Not your move yet.',
}

/** The plate's accessible name. The three readings — live, poised, refused — MUST differ:
 *  `getByRole('button', { name })` is how the spec tells them apart, and a player who cannot see
 *  the dimming learns the reason from here or not at all. The figure is in the name rather than
 *  only in the glyph, for the reason `envenomAccessibleName` carries its count. */
export function applyDamageAccessibleName(
  cashValue: number,
  poised: boolean,
  refusal: ApplyDamageRefusal | null,
): string {
  if (refusal !== null) {
    return `${APPLY_DAMAGE_RAIL_LABEL} Damage, unavailable — ${APPLY_DAMAGE_REFUSAL_MESSAGE[refusal]}`
  }
  const base = `${APPLY_DAMAGE_RAIL_LABEL} Damage, ${cashValue} to the Quarry`
  return poised ? `${base} — tap again to confirm` : base
}
```

- [x] **Step 2: Add specs for the three readings**

Append to `src/app/warCouncil/__tests__/labels.test.ts`:

```ts
describe('applyDamageAccessibleName — DLR-94', () => {
  it('names the figure the apply would deal', () => {
    expect(applyDamageAccessibleName(9, false, null)).toMatch(/9 to the Quarry/)
  })

  it('gives the three readings three different names', () => {
    const live = applyDamageAccessibleName(9, false, null)
    const poised = applyDamageAccessibleName(9, true, null)
    const refused = applyDamageAccessibleName(0, false, ApplyDamageRefusal.EmptyBank)
    expect(new Set([live, poised, refused]).size).toBe(3)
  })

  it('puts the reason in the name of a refused control, not only in the styling', () => {
    expect(applyDamageAccessibleName(0, false, ApplyDamageRefusal.PoisonPending)).toContain(
      APPLY_DAMAGE_REFUSAL_MESSAGE[ApplyDamageRefusal.PoisonPending],
    )
  })

  it('a refusal outranks a poise — a stranded poise must never sound available', () => {
    expect(applyDamageAccessibleName(9, true, ApplyDamageRefusal.NotYourMove)).toMatch(
      /unavailable/,
    )
  })
})
```

- [x] **Step 3: Run**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 10: Build `ApplyDamagePlate.tsx` and its stylesheet ✓

- Skill: game-ux

**Files:**

- Create: `src/app/warCouncil/ApplyDamagePlate.tsx`
- Create: `src/app/warCouncil/warCouncilApplyDamage.css`
- Test: `src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx`

- [x] **Step 1: Write the component**

Create `src/app/warCouncil/ApplyDamagePlate.tsx`, mirroring `EnvenomCharge.tsx`'s structure and keyboard contract. Layout per `mockup.html`'s third rail group.

```tsx
import type { ApplyDamageRefusal } from '../../warCouncil'
import {
  APPLY_DAMAGE_RAIL_LABEL,
  APPLY_DAMAGE_REFUSAL_MESSAGE,
  applyDamageAccessibleName,
} from './labels'
import './warCouncilApplyDamage.css'

interface ApplyDamagePlateProps {
  /** What applying right now would deal. `bank.ts`'s `cashValue` owns the figure; this component
   *  asserts nothing about it. */
  readonly cashValue: number
  readonly poised: boolean
  /** `null` when the control is live; otherwise WHY it is not. `applyDamageRefusalFor` is the one
   *  statement of this — the plate never decides its own availability, which is what keeps its
   *  disabled state and the reducer's guard from drifting apart. */
  readonly refusal: ApplyDamageRefusal | null
  readonly onTap: () => void
  readonly onCancel: () => void
}

/**
 * DLR-94 AC1 — the felt-rail plate for the Apply Damage action, a SIBLING of `CheatSlots` and
 * `EnvenomCharge` rather than a generalisation of either: the three controls keep independent copy
 * and independent components, so retuning one never risks the others.
 *
 * `onClick` STOPS PROPAGATION for the load-bearing reason `EnvenomCharge.tsx`'s does: this mounts
 * inside `.wc-table`, which fires `handleCarryOn` on click whenever the felt is waiting — so
 * without it, poising the plate while a trick reveal is held would also clear the reveal and commit
 * the Quarry's lead as a side effect.
 *
 * The refusal sentence renders on the face of the control rather than in a tooltip: `game-ux`
 * forbids hiding anything the current decision needs behind hover, and touch has no hover at all.
 * One control is far below the roving-tabindex threshold, so it is a plain tab stop.
 */
export default function ApplyDamagePlate({
  cashValue,
  poised,
  refusal,
  onTap,
  onCancel,
}: ApplyDamagePlateProps) {
  const disabled = refusal !== null

  return (
    <div
      className="wc-apply-rail"
      role="group"
      aria-label={APPLY_DAMAGE_RAIL_LABEL}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <span className="wc-plate-label">{APPLY_DAMAGE_RAIL_LABEL}</span>
      <button
        type="button"
        className={`wc-apply-plate${poised && !disabled ? ' is-poised' : ''}`}
        aria-pressed={poised && !disabled}
        aria-label={applyDamageAccessibleName(cashValue, poised, refusal)}
        disabled={disabled}
        onClick={onTap}
      >
        <span className="wc-apply-glyph" aria-hidden="true">
          ⤓
        </span>
        <span className="wc-apply-figure" aria-hidden="true">
          {cashValue}
        </span>
      </button>
      {refusal !== null && (
        <p className="wc-apply-refusal">{APPLY_DAMAGE_REFUSAL_MESSAGE[refusal]}</p>
      )}
    </div>
  )
}
```

- [x] **Step 2: Write the stylesheet**

Create `src/app/warCouncil/warCouncilApplyDamage.css`, mirroring `warCouncilEnvenom.css`'s selectors and tokens so the three rail controls read as one family. Copy that file's `.wc-envenom-rail`, `.wc-envenom-plate`, `.wc-envenom-glyph`, `.wc-envenom-count`, `:disabled`, `.is-poised` (including the `::after` corner notch), `:focus-visible`, `@media (hover: hover)` and `:active` blocks, renaming `envenom` to `apply` and `count` to `figure` throughout, and drop the `.is-armed` block — this control has no armed stage. Then add the refusal line, which has no Envenom counterpart:

```css
/* The refusal sentence, on the face of the control. `game-ux` forbids putting anything a decision
   needs behind hover, and touch has no hover — so this is rendered text, never a title attribute.
   Width-capped to the rail so a long sentence wraps instead of widening the felt's rail column. */
.wc-apply-refusal {
  margin: 0;
  max-width: 7rem;
  font-family: var(--wc-sans);
  font-size: clamp(0.5rem, 1.1vmin, 0.62rem);
  line-height: 1.35;
  text-align: center;
  color: var(--wc-alarm);
}

@media (prefers-reduced-motion: reduce) {
  .wc-apply-plate {
    transition: none;
  }
}
```

Keep `min-width: 2.75rem` and `min-height: 2.75rem` on `.wc-apply-plate` — that is `react-frontend`'s ≥44px hit-area floor and it is not a tuning value to adjust.

- [x] **Step 3: Write the component specs**

Create `src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApplyDamageRefusal } from '../../../warCouncil'
import ApplyDamagePlate from '../ApplyDamagePlate'
import { APPLY_DAMAGE_REFUSAL_MESSAGE } from '../labels'

afterEach(cleanup)

const plate = () => screen.getByRole('button', { name: /apply damage/i })

function renderPlate(over: Partial<Parameters<typeof ApplyDamagePlate>[0]> = {}) {
  const onTap = vi.fn()
  const onCancel = vi.fn()
  render(
    <ApplyDamagePlate
      cashValue={9}
      poised={false}
      refusal={null}
      onTap={onTap}
      onCancel={onCancel}
      {...over}
    />,
  )
  return { onTap, onCancel }
}

describe('ApplyDamagePlate', () => {
  it('is live and tappable while nothing refuses it', () => {
    const { onTap } = renderPlate()
    expect((plate() as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(plate())
    expect(onTap).toHaveBeenCalledOnce()
  })

  it('AC1 — a refusal disables the control AND states the reason on its face', () => {
    renderPlate({ refusal: ApplyDamageRefusal.EmptyBank, cashValue: 0 })
    expect((plate() as HTMLButtonElement).disabled).toBe(true)
    expect(
      screen.getByText(APPLY_DAMAGE_REFUSAL_MESSAGE[ApplyDamageRefusal.EmptyBank]),
    ).toBeTruthy()
  })

  it('D6 — states the pending-poison reason rather than going quiet', () => {
    renderPlate({ refusal: ApplyDamageRefusal.PoisonPending })
    expect(
      screen.getByText(APPLY_DAMAGE_REFUSAL_MESSAGE[ApplyDamageRefusal.PoisonPending]),
    ).toBeTruthy()
  })

  it('marks the poised state to assistive tech as well as in the class', () => {
    renderPlate({ poised: true })
    expect(plate().getAttribute('aria-pressed')).toBe('true')
    expect(plate().className).toContain('is-poised')
  })

  it('never reads as poised while refused', () => {
    renderPlate({ poised: true, refusal: ApplyDamageRefusal.NotYourMove })
    expect(plate().getAttribute('aria-pressed')).toBe('false')
    expect(plate().className).not.toContain('is-poised')
  })

  it('Escape cancels a poise from the keyboard', () => {
    const { onCancel } = renderPlate({ poised: true })
    fireEvent.keyDown(screen.getByRole('group', { name: /apply/i }), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  // Load-bearing: this mounts inside `.wc-table`, whose own onClick commits the Quarry's lead
  // whenever the felt is waiting. Without the stop, poising would clear a held reveal too.
  it('does not let its click reach the felt behind it', () => {
    const onFelt = vi.fn()
    render(
      <div onClick={onFelt}>
        <ApplyDamagePlate cashValue={9} poised={false} refusal={null} onTap={vi.fn()} onCancel={vi.fn()} />
      </div>,
    )
    fireEvent.click(screen.getAllByRole('button', { name: /apply damage/i })[0])
    expect(onFelt).not.toHaveBeenCalled()
  })
})
```

- [x] **Step 4: Run**

Run: `npx vitest run src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx`
Expected: exits 0, Vitest reports 0 failed.

### Task 11: Show the reduced figure on `BankMeter` ✓

- Skill: game-ux

**Files:**

- Modify: `src/app/warCouncil/BankMeter.tsx`
- Test: `src/app/warCouncil/__tests__/BankMeter.test.tsx`

- [x] **Step 1: Add the second figure**

In `BankMeter.tsx`, import `cashValue` and `forcedCashValue` from `'../../warCouncil'` and replace `const cash = bank * multiplier` with:

```ts
  const cash = cashValue(bank, multiplier)
  // DLR-94 AC4 — what the same streak pays if the player is caught before applying. Computed
  // through `forcedCashValue` rather than restated as a fraction, so this copy cannot drift from
  // the configured constants. It is on the face of the readout rather than behind a hover because
  // it is precisely the number the new decision needs (`game-ux`).
  const forced = forcedCashValue(bank, multiplier)
```

Extend the existing `aria-label` — keeping the `cashes for ${cash}` substring intact, because `WarCouncilRound.envenom.test.tsx` matches on `/cashes for 6\b/i`:

```tsx
        aria-label={`${TRICKS_LABEL} ${bank}, ${MULTIPLIER_LABEL} ${multiplier}, cashes for ${cash}, or ${forced} if you are hit first`}
```

And add the line below the existing `wc-bank-cash` paragraph:

```tsx
      <p className="wc-bank-forced" aria-hidden="true">
        If you&rsquo;re hit first: <b>{forced}</b>
      </p>
```

Add `.wc-bank-forced` to whichever stylesheet already carries `.wc-bank-cash`, following `mockup.html`: dimmer than the full figure and prefixed with a `↓` caret via `::before`, so the pair reads as full-versus-reduced without relying on colour alone.

- [x] **Step 2: Add specs**

Append to `src/app/warCouncil/__tests__/BankMeter.test.tsx`:

```tsx
  it('DLR-94 — shows what the streak pays if the player is hit before applying', () => {
    render(<BankMeter bank={3} multiplier={3} lastResolution={null} />)
    // 3 x 3 = 9 in full; two-thirds of 9, floored, is 6.
    expect(screen.getByLabelText(/cashes for 9, or 6 if you are hit first/i)).toBeTruthy()
  })

  it('DLR-94 — the reduced figure is on the face of the readout, not behind a hover', () => {
    const { container } = render(<BankMeter bank={5} multiplier={5} lastResolution={null} />)
    // 5 x 5 = 25; two-thirds floored is 16.
    expect(container.querySelector('.wc-bank-forced')?.textContent).toContain('16')
  })
```

- [x] **Step 3: Run both bank-readout specs**

Run: `npx vitest run src/app/warCouncil/__tests__/BankMeter.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.envenom.test.tsx`
Expected: exits 0, Vitest reports 0 failed. The envenom spec's `/cashes for 6\b/i` must still match the widened label — if it does not, the label was rewritten rather than extended.

### Task 12: Add the poised hint to `roundHint.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/roundHint.ts`
- Test: `src/app/warCouncil/__tests__/roundHint.test.ts`

- [x] **Step 1: Add the branch**

In `deriveHint`, insert immediately **above** the `ui.armed` branch, importing `APPLY_DAMAGE_POISED_HINT` from `'./labels'`:

```ts
  // Above `ui.armed` deliberately: a poised plate is the more specific thing to say, and unlike
  // the Cheat and Envenom selections it can legitimately coexist with an armed card, because it
  // does not reinterpret the next hand-card tap.
  if (ui.applyPoised) return APPLY_DAMAGE_POISED_HINT
```

- [x] **Step 2: Add specs**

The existing fixture in `roundHint.test.ts` builds a `RoundUiState`; add `applyPoised: false` to it, then append:

```ts
  it('DLR-94 — a poised Apply plate says so', () => {
    expect(deriveHint({ ...base, applyPoised: true }, true, false)).toBe(APPLY_DAMAGE_POISED_HINT)
  })

  it('DLR-94 — but a held reveal or a rejection still outranks it', () => {
    expect(deriveHint({ ...base, applyPoised: true, resolvedTrick: aResolvedTrick }, false, false)).toBe(
      'Trick resolved',
    )
  })
```

Use whatever the file already names its base state and its resolved-trick fixture rather than introducing new ones.

- [x] **Step 3: Run**

Run: `npx vitest run src/app/warCouncil/__tests__/roundHint.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 13: Mount the plate in `WarCouncilRound.tsx` ✓

- Skill: game-ux

**Files:**

- Modify: `src/app/warCouncil/WarCouncilRound.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Read `interactive` from the shared predicate**

Replace the inline six-clause expression:

```tsx
  const interactive =
    !roundComplete &&
    !encounterOver &&
    ui.resolvedTrick === null &&
    ui.prompt === null &&
    ui.cpuFault === null &&
    currentTurn(ui.round) === PlayerSide.Player
```

with:

```tsx
  // The SAME predicate the reducer gates on — moved to `roundUiState.ts` on DLR-94, where
  // `cheatArmed` and `envenomArmed` already live, because this component and `roundReducer.ts`
  // were computing the identical six clauses separately. Two readings of one gate is how a greyed
  // control and a reducer branch drift apart.
  const interactive = canAct(ui)
```

Add `canAct` and `applyDamageStock` to the existing import from `'./roundUiState'`. `currentTurn` and `RoundPhase` may become unused — let lint report it and prune accordingly, keeping `roundComplete` and `encounterOver`, which are still read elsewhere.

- [x] **Step 2: Derive the plate's two inputs and mount it**

Beside the existing `legal` derivation:

```tsx
  // DLR-94 — both derived, no new state. `applyDamageRefusalFor` is the one statement of
  // availability, so the plate's disabled state and `handleTapApplyDamage`'s guard cannot disagree.
  const applyRefusal = applyDamageRefusalFor(applyDamageStock(ui))
  const applyCash = cashValue(ui.round.bank, ui.round.multiplier)
```

Import `applyDamageRefusalFor` and `cashValue` from `'../../warCouncil'` and `ApplyDamagePlate` from `'./ApplyDamagePlate'`. Then add the plate to `.wc-felt-rail`, immediately after `<EnvenomCharge … />`:

```tsx
          <ApplyDamagePlate
            cashValue={applyCash}
            poised={ui.applyPoised}
            refusal={applyRefusal}
            onTap={() => dispatch({ kind: RoundUiActionKind.TapApplyDamage })}
            onCancel={() => dispatch({ kind: RoundUiActionKind.CancelApplyDamage })}
          />
```

Add `import './warCouncilApplyDamage.css'` beside the other stylesheet imports.

- [x] **Step 3: Add an end-to-end spec through the rendered felt**

Append to `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`, using the file's existing `renderRound` helper:

```tsx
  it('DLR-94 — applying cashes the streak into the Quarry at no cost, and the hand plays on', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })

    const plate = () => screen.getByRole('button', { name: /apply damage/i })
    const playerBefore = healthMeter('Your health').getAttribute('aria-valuenow')

    fireEvent.click(plate()) // poise
    fireEvent.click(plate()) // commit

    expect(Number(healthMeter(quarryLabelFixture).getAttribute('aria-valuenow'))).toBe(
      quarryHealthForEncounter(0) - 9,
    )
    expect(healthMeter('Your health').getAttribute('aria-valuenow')).toBe(playerBefore)
    expect(screen.getByLabelText(/cashes for 0\b/i)).toBeTruthy()

    // AC3 — the card is still there to play, and the plate is now refused for want of a bank.
    expect((plate() as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '2 of Bells' })).toBeTruthy()
  })
```

Match the file's existing import list and helper names (`healthMeter`, `quarryLabelFixture`) rather than introducing new ones.

- [x] **Step 4: Run the whole felt suite**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.readouts.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.envenom.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.telegraph.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`
Expected: exits 0, Vitest reports 0 failed.

- [x] **Step 5: Typecheck, lint, and measure the file**

Run: `npm run typecheck; npm run lint; (Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count`
Expected: both gates exit 0. The file was 345 lines and should land near 360 — under the 400 ceiling. If it exceeds 400, split it in this task rather than reporting it as a finding.

---

## Phase 5 — Final verification

No production changes. Only sanity-checks that the cumulative work is clean, the boundary still holds, and no tunable was hard-coded.

**For QA, when it drives the running app.** These five have right answers and belong to QA, not to the developer — filing them as developer observations would bury them:

- The Apply plate renders on the felt rail beside the Cheat and Envenom plates, and the console is clean.
- With a bank up: one click poises it (visibly lifted and dashed), a second click drops the Quarry's hearts by the full `bank × multiplier`, leaves the player's hearts untouched, and zeroes the bank readout.
- After applying, the player's cards are still playable and the trick resolves normally.
- With an empty bank, the plate is disabled and its reason sentence is on screen — not in a tooltip.
- The page does not scroll at 1920×1080, 1440×900 and 1280×720; name the sizes checked in the report.

Whether the arrangement *feels* crowded, and whether the missing breaking-hearts beat reads as abrupt, are **not** QA's — both are in "Developer decides or observes" above.

### Task 14: Confirm the pure-core boundary still holds ✓

- Skill: none — a verification grep, no code written

- [x] **Step 1: Grep the pure tree for React imports and DOM globals**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits. This is the phase's most valuable check — `voluntaryCashOut.ts` is new inside the protected tree. Note the recursive `Get-ChildItem` form: `Select-String -Path 'src\**\*.ts'` reaches exactly one directory level and would silently miss `__tests__/`, reporting a false green.

### Task 15: Confirm no tunable was hard-coded and every new name is used consistently ✓

- Skill: none — verification greps, no code written

- [x] **Step 1: Confirm the fraction exists only as the configured constants**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\(2 / 3\)|0\.66|two-thirds of \d"`
Expected: zero hits outside comments. A literal fraction anywhere in `src/` means the constants were bypassed; a hard-coded "two-thirds of 9" in a user-facing string means copy will drift from config.

- [x] **Step 2: Confirm the constants are read in exactly one place**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "FORCED_CASH_OUT_"`
Expected: hits in `src\hunt\config.ts` (the declarations), `src\hunt\index.ts` (the re-exports), and `src\warCouncil\bank.ts` (`forcedCashValue`, its only reader) — and nowhere else.

- [x] **Step 3: Confirm every new identifier is spelled identically across the change**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "cashBankNow|forcedCashValue|applyDamageRefusalFor|applyDamageStock|applyPoised|TapApplyDamage"`
Expected: every name appears in its defining module, its barrel where one applies, its consumers, and its specs — with no near-miss variant (`cashBank`, `applyDamageRefusal(`, `applyPoise`). A name that appears exactly once outside its own definition is a typo, not an export.

- [x] **Step 4: Confirm the 400-line budget across every file this contract grew**

Run: `Get-ChildItem src\warCouncil\bank.ts,src\warCouncil\voluntaryCashOut.ts,src\app\warCouncil\roundReducer.ts,src\app\warCouncil\roundUiState.ts,src\app\warCouncil\quarryAdvance.ts,src\app\warCouncil\WarCouncilRound.tsx,src\app\warCouncil\labels.ts,src\app\warCouncil\BankMeter.tsx,src\app\warCouncil\ApplyDamagePlate.tsx | ForEach-Object { "$((Get-Content $_).Count) $($_.Name)" }`
Expected: every count under 400. Use `(Get-Content …).Count`, never `Measure-Object -Line` — it drops blank lines and hid a real breach on DLR-63.

### Task 16: Static gates and the full suite ✓

- Skill: none — verification only, no code written

- [x] **Step 1: Warm the transform cache, then run everything**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all five exit 0; Vitest reports 0 failed and collects every spec file. The two scoped runs come first deliberately: a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project, which is infrastructure and not a failing test. Report a single cold timeout as such; treat a **second consecutive** one as a real problem.

- [x] **Step 2: Check formatting on this contract's own files only**

Run: `npx prettier --check src/hunt/config.ts src/hunt/index.ts src/warCouncil/bank.ts src/warCouncil/index.ts src/warCouncil/voluntaryCashOut.ts src/warCouncil/__tests__/bank.test.ts src/warCouncil/__tests__/voluntaryCashOut.test.ts src/app/warCouncil/quarryAdvance.ts src/app/warCouncil/roundReducer.ts src/app/warCouncil/roundUiState.ts src/app/warCouncil/labels.ts src/app/warCouncil/roundHint.ts src/app/warCouncil/BankMeter.tsx src/app/warCouncil/ApplyDamagePlate.tsx src/app/warCouncil/WarCouncilRound.tsx src/app/warCouncil/warCouncilApplyDamage.css`
Expected: exits 0. Scoped deliberately — the repo-wide `npm run format:check` fails on pre-existing `.docs/**` files no contract here has touched, and fixing those is not this contract's work.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 17: Update the module docs and the ruleset ✓

- Skill: implementation-doc-writer

**Files:**

- Modify: `.docs/implementation/war-council/` and `.docs/implementation/app/` (whichever folders exist for the touched modules), plus `.docs/implementation/README.md`
- Modify: `.docs/game_rules/the-hunt.md`

- [x] **Step 1: Invoke the skill and work its Step 1–5 against this contract**

This contract **does** change the rules, so the check is not a formality. Specifically:

- Section 7's *"Taking damage — a clean loss, or eating a skull"* states the cash-out pays `bank × multiplier`. It now pays two-thirds, floored. `[settled]`, procedure and figure both.
- Section 7's *"Poison landing on you cashes out your streak"* pays the same reduced figure — the reading recorded in `plan.md` → Assumptions.
- *"At the end of the sixth trick, the bank cashes"* is **unchanged** and now needs saying explicitly, because it is the exception rather than the rule.
- A **new Apply Damage rule** joins section 7 in playing order — not appended as a per-ticket section.
- *"Applying damage cannot be delayed while poison is pending"* graduates from `[not built]` to `[settled]`: `applyDamageRefusalFor` enforces it now.
- The Status register gains rows for `voluntaryCashOut.ts` and the two new constants; every existing path in it is re-checked as a set.
- Every number stated is read from `src/hunt/config.ts`, not from this file.

### Task 18: Write the PR description ✓

- Skill: none — a document for the developer, no code written

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:

- A link to `plan.md` and `mockup.html` in this folder.
- A summary of the change: the voluntary cash-out, the two-thirds forced payout, and the untouched end-of-hand rule.
- **Every decision the developer owns**, copied from the File map's "Developer decides or observes" — in particular the two rule readings (poison paying two-thirds; the control being available on a follow) and all placeholder copy.
- Verification results from every phase, quoting the actual Vitest summary lines and exit codes.
- A one-line note for future contributors on the numerator/denominator convention and *why* the float form is wrong, since this is the first fractional rule in the codebase and the next one will be tempted to write `* (2 / 3)`.

---

## Self-review

**Spec coverage:**

- AC1 (a pre-card action, enabled when `bank > 0`, disabled with a stated reason) — Tasks 4, 8, 9, 10, 13.
- AC2 (full payout, both counters reset, no player damage, a third kind of event sharing the arithmetic) — Tasks 2, 4, 8.
- AC3 (the trick proceeds normally afterwards) — Tasks 4, 8, 13.
- AC4 (forced hits pay two-thirds, floored, on every forced hit) — Tasks 1, 2.
- AC5 (the end-of-hand cash-out is unaffected) — Task 2, Steps 5 and 8.
- AC6 (`bank.test.ts`'s forced-hit assertions updated as an intended change) — Task 2, Step 7.
- AC7 (coverage for the voluntary payout and zero damage, the disabled-at-zero state, the non-integer two-thirds case, and the untouched end-of-hand cash-out) — Tasks 2, 4, 8, 10, 11.
- D6 (disabled while poison is pending) — Tasks 4, 8, 10.
- The banked-streak heart preview decision (keeps showing the full figure; the reduced one goes on `BankMeter`) — Task 11; `duelHealthBars.ts` is deliberately absent from the file map.
- `roundReducer.ts`'s 400-line budget — Task 6, with measurement in Tasks 6, 8, 13 and 15.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact `old` → `new` edit, or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `FORCED_CASH_OUT_NUMERATOR` / `FORCED_CASH_OUT_DENOMINATOR`, `cashValue`, `forcedCashValue`, `ApplyDamageRefusal` (`EmptyBank` / `PoisonPending` / `NotYourMove`), `ApplyDamageStock`, `applyDamageRefusalFor`, `cashBankNow`, `VoluntaryCashOut`, `incomingFromCashOut`, `applyPoised`, `canAct`, `applyDamageStock`, `TapApplyDamage`, `CancelApplyDamage`, `APPLY_DAMAGE_RAIL_LABEL`, `APPLY_DAMAGE_POISED_HINT`, `APPLY_DAMAGE_REFUSAL_MESSAGE`, `applyDamageAccessibleName`, `ApplyDamagePlate`, `.wc-apply-rail` / `.wc-apply-plate` / `.wc-apply-figure` / `.wc-apply-refusal`, `.wc-bank-forced` — each is spelled identically in its defining task, every consuming task, and Task 15's grep, and each matches `plan.md` Part 2 → Data shapes. Two names appear in tasks but not in `plan.md`'s Data shapes — `canAct` and `applyDamageStock`, both in `roundUiState.ts`. They are the mechanism by which `plan.md`'s approved "one predicate, read twice" is realised (the component cannot call `applyDamageRefusalFor` without them), not a new design; flagged in the handoff rather than re-gated.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking with the two-thirds rule live and every assertion in the repo that reads a forced-hit figure — engine and app — already moved, so the suite is green rather than red at the boundary.
- **Phase 2** ends type-checking with a new pure module fully specced and exported from the barrel but imported by nothing, so no half-wired consumer exists.
- **Phase 3** ends type-checking with the action fully working and unreachable from the screen. Its one deliberately red step is Task 7 Step 5, whose expected errors are named exactly and are closed inside the same phase by Task 8 — the phase *boundary* is clean, not every step within it.
- **Phase 4** ends type-checking with the plate mounted, styled and specced, no dead import left by the `canAct` move (Task 13 Step 5's lint run is what catches one), and no half-applied rename.
- **Phase 5** makes no production change at all.
