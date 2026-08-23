# Tasks: Buff activation flow and tiered AP costs

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Gate note:** this contract ran in an unattended sprint session. `plan.md` was **not** developer-confirmed — the plan-approval gate was auto-approved per the run's dispatch, taking every stated default in Part 1 → Assumptions made. No mockup was built: Step 1.5b classified this as pure-logic + config work with no `.tsx` surface, so the mockup step did not apply.

Status: COMPLETE
Started: 2026-08-23

**Goal:** Give a `Buff` a price and a way to be brought into a trick — close the four shape gaps DLR-111 names, ship the AP cost model as a formula over two retunable tables, add the four per-hand caps and the `BuffBonusAccrual` DLR-124 asks for, and build the pure activation flow gated by the existing `discardWindowOpen`.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/apConfig.ts` — the AP block moved out of `config.ts`, plus the four per-hand cap keys.
- `src/hunt/buffCosts.ts` — `REWARD_BASE`, `CONDITION_MODIFIER`, `CONSUMABLE_AP_COST`, the clamp bounds, `buffApCost`, `apCostOf`.
- `src/hunt/buffAccrual.ts` — `BuffBonusAccrual`, the axis caps, `accrueAxisBonus`, `overlapBonusFor`, `resolveFiredBuffs`.
- `src/hunt/buffActivation.ts` — `BuffActivationRefusal`, `BuffActivationStock`, `BuffActivationState`, `buffActivationRefusalFor`, `activateBuff`, `openBuffWindow`, `refreshBuffsForNewHand`.
- `src/hunt/__tests__/apConfig.test.ts`
- `src/hunt/__tests__/buffCosts.test.ts`
- `src/hunt/__tests__/buffAccrual.test.ts`
- `src/hunt/__tests__/buffActivation.test.ts`
- `src/app/warCouncil/__tests__/buffActivationStock.test.ts`

**Modified:**
- `src/hunt/config.ts:360-385` — AP block removed, replaced by a re-export of `./apConfig`.
- `src/hunt/buffs.ts` — `BuffKind` +16 members, `BuffRewardAxis` +8, `BuffCondition` gains `target`, new `BuffTargetSuit` / `BuffTarget` / `BuffCadence` / `BUFF_CADENCE` / target accessors.
- `src/hunt/index.ts` — re-export the new types, tables and functions.
- `src/app/warCouncil/roundUiState.ts` — add `buffActivationStock`, fed by the existing `discardWindowOpen`.
- `src/hunt/__tests__/buffs.test.ts` — cover the widened unions, the `target` payload, and the cadence map.

**Deleted:** (none)

**Developer decides or observes:**
- **Divergence from AC2** — `BUFF_ACTIVATION_COST = { bronze: 3, silver: 5, gold: 8 }` is not shipped. DLR-111's `clamp(REWARD_BASE[axis][tier] + CONDITION_MODIFIER[family], 1, 6)` replaces it, and gold Cheat is priced **7 AP**, not 8. Confirm or reverse.
- **Every AP figure** in `REWARD_BASE`, `CONDITION_MODIFIER` and `CONSUMABLE_AP_COST` — agent-chosen on DLR-111, never played. Retune by editing those two tables.
- **All four per-hand caps** — `MAX_REFUND_PER_HAND = 6`, `MAX_MULTIPLIER_BONUS_PER_HAND = 6`, `MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12`, `MAX_COIN_BONUS_PER_HAND = 10` — agent-chosen on DLR-111/DLR-124, never played.
- **`apCost` as a derived lookup rather than a field on `Buff`** — confirm before DLR-112 mints buffs from a reel, since a per-card discounted price would need a field.
- **`BuffTargetSuit` duplicating `warCouncil`'s `Suit` values** — forced by the module boundary; the alternative is moving `Suit` down into `src/hunt/`.
- **Two carried-forward defects, deliberately not fixed here:** `Keepsake` may be unfireable in a full six-trick hand; `Ward` silver/gold buy nothing while `DAMAGE_PER_HIT = 1`.

---

## Phase 1 — Config split and the four per-hand caps

`src/hunt/config.ts` is at 385 of a 400-line blocking budget, so the caps have nowhere to live until the AP block moves. This phase is behaviour-preserving: names move, `config.ts` re-exports them, and every existing importer resolves unchanged. It ends type-checking with the full suite's AP tests still green, which is what proves the move lost nothing.

### Task 1: Move the AP block to `src/hunt/apConfig.ts` and add the four cap keys ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/apConfig.ts`
- Modify: `src/hunt/config.ts:360-385`
- Test: `src/hunt/__tests__/apConfig.test.ts`
- Config: `src/hunt/config.ts` — the AP tunable block moves out; four new tunable keys are added in `apConfig.ts` with the values `plan.md` Part 2 → Data shapes transcribes from DLR-111/DLR-124.

- [x] **Step 1: Create `src/hunt/apConfig.ts` with the four moved names plus the four new caps**

Move `AP_ENABLED`, `STARTING_AP`, `ApRefreshCadence` and `AP_REFRESH_CADENCE` **verbatim, with their existing docblocks**, out of `config.ts:360-385` and into the new file, then add the caps below them.

```ts
import type { ActionPoints } from './types'

// ... the four moved declarations, docblocks intact ...

// DLR-108 — the four per-hand reward caps DLR-124 R6 requires. Contributions past a cap are
// CLIPPED and lost; nothing is banked. Each resets PER HAND and NOT on a hit — that asymmetry is
// the rule's entire containment mechanism (`hybrid-design.md` §5, R6). AGENT-CHOSEN on
// DLR-111/DLR-124 under this sprint's tuning-value override, never played, the developer's to move.
// UNIT: action points per hand.
export const MAX_REFUND_PER_HAND: ActionPoints = 6
// UNIT: multiplier points per hand.
export const MAX_MULTIPLIER_BONUS_PER_HAND = 6
// UNIT: damage per hand.
export const MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12
// UNIT: coins per hand.
export const MAX_COIN_BONUS_PER_HAND = 10
```

- [x] **Step 2: Replace the removed block in `config.ts` with a re-export**

```ts
// DLR-108 — the AP tunables moved to `./apConfig` when this file reached its 400-line blocking
// budget, the same split `run.ts` → `runTransitions.ts` already made. Re-exported here so every
// existing importer (`actionPoints.ts`, `index.ts`, the specs) resolves unchanged.
export {
  AP_ENABLED,
  STARTING_AP,
  ApRefreshCadence,
  AP_REFRESH_CADENCE,
  MAX_REFUND_PER_HAND,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  MAX_FLAT_DAMAGE_BONUS_PER_HAND,
  MAX_COIN_BONUS_PER_HAND,
} from './apConfig'
```

- [x] **Step 3: Add the four cap names to `src/hunt/index.ts`'s `./config` export list**

Append `MAX_REFUND_PER_HAND`, `MAX_MULTIPLIER_BONUS_PER_HAND`, `MAX_FLAT_DAMAGE_BONUS_PER_HAND`, `MAX_COIN_BONUS_PER_HAND` to the existing `export { … } from './config'` block that already lists `AP_ENABLED` and `STARTING_AP`.

- [x] **Step 4: Write `src/hunt/__tests__/apConfig.test.ts` covering the values and the re-export identity**

Assert each cap equals its transcribed figure and its unit is a whole number; assert `MAX_REFUND_PER_HAND === STARTING_AP` (DLR-111's stated derivation, so a change to one that forgets the other fails here); and assert the `config.ts` re-export and the `apConfig.ts` original are the same value for all eight names, which is what proves the move lost nothing.

- [x] **Step 5: Verify the move**

Run: `npx vitest run src/hunt/__tests__/apConfig.test.ts src/hunt/__tests__/actionPoints.test.ts src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: all three spec files pass with 0 failed; `tsc -b` exits 0.

- [x] **Step 6: Confirm `config.ts` is back under budget**

Run: `(Get-Content src\hunt\config.ts).Count; (Get-Content src\hunt\apConfig.ts).Count`
Expected: both counts strictly below 400.

---

## Phase 2 — The four shape gaps

Widen the three buff types DLR-111's findings 1–3 name and add the cadence classification DLR-124 R4 decided. This is additive: no existing member changes meaning, no existing value becomes invalid, and the audit in `plan.md` confirms there is no `switch` on either widened union anywhere in `src/`. The phase ends with `buffs.ts` and `buffCatalog.ts` type-checking together and their existing specs green.

### Task 2: Widen `BuffKind`, `BuffRewardAxis`, and `BuffCondition`; add the cadence map ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/buffs.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/buffs.test.ts`

- [x] **Step 1: Add the failing assertions to `src/hunt/__tests__/buffs.test.ts` first**

Cover: all 19 `BuffKind` members present and pairwise distinct; all 11 `BuffRewardAxis` members present and pairwise distinct; `BuffTargetSuit`'s three values equal `src/warCouncil/types.ts`'s `Suit` member-for-member (the pinning test — the spec may import both trees even though `src/hunt/` may not); a `BuffCondition` with no `target` still type-checks and `UNASSIGNED_BUFF_CONDITION`/`ACTIVATED_BUFF_CONDITION` are unchanged; `isValidBuffTarget` rejects rank 0 and rank 12 and accepts 1 and 11; `BUFF_CADENCE` classifies the six event families as `event`, the four threshold families as `threshold`, `keepsake` as `terminal`, and Cheat/Timebomb/the five consumables as `activated`.

- [x] **Step 2: Run the new spec and confirm it fails for the right reason**

Run: `npx vitest run src/hunt/__tests__/buffs.test.ts`
Expected: fails with unresolved identifiers (`BuffTargetSuit`, `BUFF_CADENCE`, `isValidBuffTarget`) — a transform/collection error naming those names, not a passing run.

- [x] **Step 3: Widen the three types and add the cadence map in `src/hunt/buffs.ts`**

Apply exactly the declarations in `plan.md` Part 2 → Data shapes → `src/hunt/buffs.ts`: `BuffKind`'s 16 new members appended below the existing three; `BuffRewardAxis`'s 8 new members appended below the existing three; `BuffTargetSuit`, `BUFF_TARGET_RANK_MIN`, `BUFF_TARGET_RANK_MAX`, `BuffTarget`; `BuffCondition` gaining `readonly target?: BuffTarget`; `BuffCadence` and `BUFF_CADENCE`; and the three accessors `buffTargetSuitOf`, `buffTargetRankOf`, `isValidBuffTarget`.

`Buff` itself does **not** change — no `apCost` field; the cost is a lookup, per `plan.md` Part 1 → Assumptions made.

Each new block carries a docblock naming its source: DLR-111 finding 1 for the kinds, finding 2 for the axes, finding 3 for the target payload, DLR-124 R4 for the cadences — and the `BuffTargetSuit` docblock must state why it is not `warCouncil`'s `Suit` (the import cycle) and that a test pins the two together.

- [x] **Step 4: Re-export the new names from `src/hunt/index.ts`**

Add to the existing `./buffs` type export: `BuffTarget`, `BuffCadence`, `BuffTargetSuit`. Add to the existing `./buffs` value export: `BuffCadence`, `BuffTargetSuit`, `BUFF_CADENCE`, `BUFF_TARGET_RANK_MIN`, `BUFF_TARGET_RANK_MAX`, `buffTargetSuitOf`, `buffTargetRankOf`, `isValidBuffTarget`.

**Deviation:** `BuffCadence` and `BuffTargetSuit` are `as const` object maps whose type and value share one name (the same shape as the pre-existing `BuffTier`/`BuffKind`/`BuffRewardAxis`, which this barrel already re-exports value-only). Re-exporting them from *both* the type-only block and the value block, as this step literally says, produces `TS2300: Duplicate identifier` (confirmed by running `tsc -b` with both present). They are re-exported from the value block only — which already carries the type, exactly as `BuffTier`/`BuffKind`/`BuffRewardAxis` do two lines above — and `BuffTarget` (a plain interface, not a merged const) is the only one of the three actually added to the type-only block.

- [x] **Step 5: Verify the widening broke no existing reader**

Run: `npx vitest run src/hunt/__tests__/buffs.test.ts src/hunt/__tests__/buffCatalog.test.ts src/hunt/__tests__/run-buffs.test.ts; npm run typecheck`
Expected: all three spec files pass with 0 failed; `tsc -b` exits 0.

---

## Phase 3 — The AP cost model

The ticket's centre: DLR-111's cost model as a formula over two tables plus one off-curve table, so the whole 78-card list retunes by editing two objects. This phase adds no state and touches nothing that already runs; it ends with a spec that checks the formula against DLR-111's own published per-family AP table, cell by cell, which is what makes a table edit that breaks a documented price fail loudly.

### Task 3: Ship `src/hunt/buffCosts.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/buffCosts.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/buffCosts.test.ts`

- [x] **Step 1: Write the failing spec `src/hunt/__tests__/buffCosts.test.ts`**

Assert, at minimum:

- Every cell of DLR-111's published *AP costs, per family and reward* table — 11 families × their listed reward axes × 3 tiers — equals `buffApCost(kind, axis, tier)`. Write it as a table-driven test whose fixture is the document's table, so a change to `REWARD_BASE` or `CONDITION_MODIFIER` that moves a documented price fails here rather than silently.
- The four worked examples DLR-111 publishes: `Bell-Taker (Blade)` bronze = 1, `Key-Feeder (Blade)` silver = 3, `Mark of the 9 (Momentum)` gold = 4, `Moon-Keepsake (Purse)` silver = 3.
- The clamp bites at both ends: no computed cost is below `AP_COST_MIN` or above `AP_COST_MAX`, across every family × axis × tier combination.
- Each of the seven `CONSUMABLE_AP_COST` rows, including gold Cheat = **7** (deliberately above `STARTING_AP`) and Ward and Timebomb flat at 2.
- `apCostOf(cheatBuff(BuffTier.Gold, 1))` = 7 and `apCostOf(timebombBuff(BuffTier.Gold, 2))` = 2 — reading through the real `buffCatalog.ts` minters, which is what proves the model prices the objects that actually exist.
- `apCostOf` throws `RangeError` on a buff of kind `Unassigned`.
- Every returned cost is an integer.

- [x] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/buffCosts.test.ts`
Expected: fails — `src/hunt/buffCosts.ts` does not exist.

- [x] **Step 3: Implement `src/hunt/buffCosts.ts`**

Exactly the exports in `plan.md` Part 2 → Data shapes → `src/hunt/buffCosts.ts`, with the three tables carrying the transcribed values printed there. The module docblock must state that every figure is DLR-111's, agent-chosen under that ticket's tuning-value override, never played, and retunable by editing `REWARD_BASE` and `CONDITION_MODIFIER` alone — and that AC2's `BUFF_ACTIVATION_COST = { bronze: 3, silver: 5, gold: 8 }` is deliberately not shipped, with gold Cheat at 7 rather than 8.

```ts
export function buffApCost(kind: BuffKind, axis: BuffRewardAxis, tier: BuffTier): ActionPoints {
  if (isConsumableKind(kind)) return CONSUMABLE_AP_COST[kind][tier]
  if (!isConditionFamily(kind)) {
    throw new RangeError(`Buff kind ${kind} has no AP price — it is placeholder content`)
  }
  const base = REWARD_BASE[costAxisOf(axis)][tier]
  return clampApCost(base + CONDITION_MODIFIER[kind])
}
```

`costAxisOf` throws on an axis with no `REWARD_BASE` row rather than defaulting to zero — a condition family minted on `heartCount` is a construction bug, and a silent zero would price it at the clamp floor and look reasonable.

- [x] **Step 4: Re-export from `src/hunt/index.ts`**

Types: `BuffCostAxis`. Values: `AP_COST_MIN`, `AP_COST_MAX`, `REWARD_BASE`, `CONDITION_MODIFIER`, `CONSUMABLE_AP_COST`, `buffApCost`, `apCostOf`, `isConditionFamily`, `isConsumableKind`.

- [x] **Step 5: Verify**

Run: `npx vitest run src/hunt/__tests__/buffCosts.test.ts src/hunt/__tests__/buffCatalog.test.ts; npm run typecheck`
Expected: both spec files pass with 0 failed; `tsc -b` exits 0.

---

## Phase 4 — The per-hand accrual

DLR-124's R1/R2/R5/R6 as pure functions over a four-field record. The phase is self-contained — no existing module reads it — and its whole risk is the one thing both source documents call the most likely to be lost in translation, so the spec asserts the per-hand-not-on-a-hit asymmetry directly and the module deliberately ships no reset function a hit could call.

### Task 4: Ship `src/hunt/buffAccrual.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/buffAccrual.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/buffAccrual.test.ts`

- [x] **Step 1: Write the failing spec `src/hunt/__tests__/buffAccrual.test.ts`**

Assert:

- `startHandAccrual()` equals `EMPTY_BUFF_ACCRUAL` and all four fields are 0.
- **R2 — within an axis, contributions add:** two Blade contributions of 1 and 3 accrue to `flatDamageBonus` 4.
- **R1 — axes do not interact:** accruing on `multiplier` leaves the other three fields at 0.
- **R6 — a contribution past a cap is clipped and the remainder is lost:** accrue 5 then 5 on `coins` against `MAX_COIN_BONUS_PER_HAND = 10`, then accrue 5 more — result is exactly 10, and a subsequent accrual of 0 does not restore anything.
- **R6's asymmetry — the module offers no per-hit reset.** Assert `startHandAccrual` is the only exported reset by asserting the module's exported surface contains no `onHit`/`resetOnHit`-shaped function, and assert directly that a caller who exhausts `MAX_MULTIPLIER_BONUS_PER_HAND` and then continues accruing within the same accrual value still reads 6.
- **R5 — the Overlap Bonus is linear:** `overlapBonusFor(1)` = 0, `overlapBonusFor(2)` = 1, `overlapBonusFor(6)` = 5, `overlapBonusFor(0)` = 0.
- **R5 — the bonus draws from the Momentum cap:** an accrual already at `MAX_MULTIPLIER_BONUS_PER_HAND` receives nothing further from a six-buff overlap (DLR-124's "a tall Momentum loadout gets no reward for width").
- `resolveFiredBuffs` on an empty array returns the accrual unchanged, and on three fired buffs across three different axes moves three counters and adds `k − 1 = 2` to `multiplierBonus`.
- Every field of every returned accrual is a non-negative integer, and the input accrual is never mutated.

- [x] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/buffAccrual.test.ts`
Expected: fails — `src/hunt/buffAccrual.ts` does not exist.

- [x] **Step 3: Implement `src/hunt/buffAccrual.ts`**

Exactly the exports in `plan.md` Part 2 → Data shapes → `src/hunt/buffAccrual.ts`. `accrueAxisBonus` is `Math.min(current + amount, accrualCapFor(axis))`; `overlapBonusFor` is `Math.max(0, firedCount - 1)`; `resolveFiredBuffs` walks the fired buffs into their axes and then applies the overlap bonus to `multiplier`, in R3's stated order (Second Wind → Momentum → cash-out → Blade → Purse), with a docblock stating that the cash-out step is not this module's to perform and why.

The module docblock must carry R6's asymmetry in full: reset per hand, **not** on a hit, and the reason — a per-streak allowance refreshed by the very event the player is avoiding would pay three full pools in a hand containing three hits.

- [x] **Step 4: Re-export from `src/hunt/index.ts`**

Types: `BuffBonusAccrual`. Values: `EMPTY_BUFF_ACCRUAL`, `startHandAccrual`, `accrualCapFor`, `accrueAxisBonus`, `overlapBonusFor`, `resolveFiredBuffs`.

- [x] **Step 5: Verify**

Run: `npx vitest run src/hunt/__tests__/buffAccrual.test.ts; npm run typecheck`
Expected: passes with 0 failed; `tsc -b` exits 0.

---

## Phase 5 — The activation flow

The ticket's acceptance criteria 1, 3, 4 and 5. The refusal function and the spend land together because a guard and a disabled control that read availability separately is exactly how the two drift — the pattern `applyDamageRefusalFor` already sets. The app-layer projection follows in its own task so the pure rule is green before anything outside `src/hunt/` touches it.

### Task 5: Ship `src/hunt/buffActivation.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/buffActivation.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/buffActivation.test.ts`

- [x] **Step 1: Write the failing spec `src/hunt/__tests__/buffActivation.test.ts`**

Assert, mapped to the acceptance criteria:

- **AC5 — refusal with a reason:** `buffActivationRefusalFor` returns `InsufficientAp` when `apPool < apCost`, `WindowClosed` when `windowOpen` is false, `AlreadyActive` when the buff's id is in `activatedThisTrick`, and `null` when all three are satisfied. Assert the precedence explicitly: a closed window with an unaffordable cost reports `WindowClosed`, not `InsufficientAp`.
- **AC3 — stacking:** starting from `STARTING_AP = 6`, activate a bronze Foresight (1 AP) then a bronze Ward (2 AP) in the same trick — the pool reads 3 and `activatedThisTrick` holds both ids. Then assert a gold Cheat (7 AP) is refused `InsufficientAp` against that remaining 3.
- **AC4 — the pool does not silently refresh mid-hand:** spend down across three successive `openBuffWindow` boundaries and assert the pool keeps falling and never returns to `STARTING_AP`; then assert `refreshBuffsForNewHand` — and only it — restores it.
- `openBuffWindow` clears `activatedThisTrick` and leaves `apPool` byte-for-byte unchanged.
- `activateBuff` throws `RangeError` naming the refusal code when called on a state that would be refused, and never returns an unchanged state silently.
- `activateBuff` never mutates its input state.
- With `AP_ENABLED` honoured through `apCostFor`, the pool arithmetic goes through `spendAp` rather than a second subtraction path — assert by activating a buff and checking the pool equals `spendAp(before, apCostOf(buff))`.

- [x] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts`
Expected: fails — `src/hunt/buffActivation.ts` does not exist.

- [x] **Step 3: Implement `src/hunt/buffActivation.ts`**

Exactly the exports in `plan.md` Part 2 → Data shapes → `src/hunt/buffActivation.ts`.

```ts
export function buffActivationRefusalFor(stock: BuffActivationStock): BuffActivationRefusal | null {
  if (!stock.windowOpen) return BuffActivationRefusal.WindowClosed
  if (stock.alreadyActive) return BuffActivationRefusal.AlreadyActive
  if (!canAffordAp(stock.apPool, stock.apCost)) return BuffActivationRefusal.InsufficientAp
  return null
}
```

`activateBuff` builds the stock through `buffActivationStockFor`, calls the refusal function, throws on a non-`null` result, and otherwise returns `{ apPool: spendAp(state.apPool, apCostOf(buff)), activatedThisTrick: [...state.activatedThisTrick, buff.id] }`. `openBuffWindow` returns `{ ...state, activatedThisTrick: [] }`. `refreshBuffsForNewHand` returns `{ apPool: refreshActionPointsForNewHand(state.apPool), activatedThisTrick: [] }` and its docblock must state that it is the only pool reset in the module, which is what AC4 is asserting against.

- [x] **Step 4: Re-export from `src/hunt/index.ts`**

Types: `BuffActivationStock`, `BuffActivationState`, `BuffActivationRefusal`. Values: `BuffActivationRefusal`, `startBuffActivation`, `buffActivationRefusalFor`, `buffActivationStockFor`, `activateBuff`, `openBuffWindow`, `refreshBuffsForNewHand`.

- [x] **Step 5: Verify**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts src/hunt/__tests__/actionPoints.test.ts; npm run typecheck`
Expected: both pass with 0 failed; `tsc -b` exits 0.

### Task 6: Feed the activation window from the existing `discardWindowOpen` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts`
- Test: `src/app/warCouncil/__tests__/buffActivationStock.test.ts`

- [x] **Step 1: Add `buffActivationStock` beside `discardStock` in `src/app/warCouncil/roundUiState.ts`**

```ts
/** AC1 — the Apply Buff window is the DISCARD window. No second timing gate is built: this reads
 *  `discardWindowOpen` and nothing else, exactly as `discardStock` above does, so the two actions
 *  cannot disagree about when the felt is between tricks. */
export function buffActivationStock(
  state: RoundUiState,
  activation: BuffActivationState,
  buff: Buff,
): BuffActivationStock {
  return {
    windowOpen: discardWindowOpen(state),
    apPool: activation.apPool,
    apCost: apCostOf(buff),
    alreadyActive: activation.activatedThisTrick.includes(buff.id),
  }
}
```

- [x] **Step 2: Write `src/app/warCouncil/__tests__/buffActivationStock.test.ts`**

Using the existing `roundFixture.ts` helper in that folder, assert: `windowOpen` is `true` for a round state where `discardWindowOpen` is `true` and `false` for one where it is not (mid-trick, with a card already committed) — and that the two functions agree on the same state, which is the assertion AC1 actually needs; `apCost` equals `apCostOf(buff)` for a minted Cheat; `alreadyActive` flips once that buff's id is in `activatedThisTrick`.

- [x] **Step 3: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/buffActivationStock.test.ts; npm run typecheck`
Expected: passes with 0 failed; `tsc -b` exits 0.

---

## Phase 6 — Final verification

No production changes. Confirm the pure-core boundary still holds, that no cost or cap literal escaped its table, and that the cumulative work is clean under every gate.

### Task 7: Confirm the pure-core boundary still holds [x]

- Skill: `none — verification grep, no code written`

**Files:**
- Test: (none — grep only)

- [x] **Step 1: Grep the hunt tree for React and DOM references**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage|Math\.random"`
Expected: zero hits.

### Task 8: Confirm no cost or cap literal was hard-coded outside its table [x]

- Skill: `none — verification grep, no code written`

**Files:**
- Test: (none — grep only)

- [x] **Step 1: Confirm AC2's superseded constant was not shipped**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "BUFF_ACTIVATION_COST"`
Expected: zero hits.

- [x] **Step 2: Confirm the caps are read by name, never re-typed as literals**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts -Exclude apConfig.ts,*.test.ts | Select-String -Pattern "MAX_(REFUND|MULTIPLIER_BONUS|FLAT_DAMAGE_BONUS|COIN_BONUS)_PER_HAND"`
Expected: hits only in `buffAccrual.ts` and `config.ts` — the cap map and the re-export. No numeric literal `6`, `10`, or `12` standing in for one.

### Task 9: Static gates and full suite [x]

- Skill: `none — verification only, no code written`

**Files:**
- Test: (none — the whole suite)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed, and a total at or above the 1089-passed baseline.

- [x] **Step 2: Formatting of the files this contract changed**

Run: `npx prettier --check src/hunt/apConfig.ts src/hunt/buffCosts.ts src/hunt/buffAccrual.ts src/hunt/buffActivation.ts src/hunt/buffs.ts src/hunt/config.ts src/hunt/index.ts src/app/warCouncil/roundUiState.ts src/hunt/__tests__/apConfig.test.ts src/hunt/__tests__/buffCosts.test.ts src/hunt/__tests__/buffAccrual.test.ts src/hunt/__tests__/buffActivation.test.ts src/hunt/__tests__/buffs.test.ts src/app/warCouncil/__tests__/buffActivationStock.test.ts`
Expected: exits 0. The repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files and is not this contract's gate.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

- [x] **Step 4: Confirm every new and modified source file is under the 400-line budget**

Run: `Get-ChildItem src\hunt\*.ts,src\app\warCouncil\roundUiState.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count strictly below 400.

### Task 10: Update the PR description [x]

- Skill: `none — documentation hand-off, no code written`

**Files:**
- Create: `.claude/contract/DLR-108-buff-activation-flow-and-tiered-ap-costs/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md` in this folder; a summary of the change; **the divergence from AC2 stated plainly** (the flat `{3,5,8}` table is not shipped and gold Cheat is 7); every developer decision from the File map's *Developer decides or observes* block; the verification numbers from Task 9; and a one-line note for future contributors that a buff's AP cost is a lookup over two tables, not a field, so retuning the whole 78-card pool is a two-table edit.

---

## Self-review

**Spec coverage:**
- `BuffKind` widened by 16 — Task 2.
- `BuffRewardAxis` widened by 8 — Task 2.
- `BuffCondition` gains `target`; hunt-local suit and rank bounds — Task 2.
- `BuffCadence` and the family→cadence map — Task 2.
- The AP cost model as a formula over two tables plus the off-curve consumable table — Task 3.
- The four per-hand caps as config keys — Task 1.
- The `config.ts` 400-line split — Task 1.
- `BuffBonusAccrual`, its caps, the Overlap Bonus, the per-hand-not-on-a-hit asymmetry — Task 4.
- The activation flow, refusal codes, stacking, the per-trick and per-hand boundaries — Task 5.
- AC1's wiring from the existing `discardWindowOpen` — Task 6.
- Unit tests beside the logic — Tasks 1–6, each carrying its own `Test:` entry.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N". Every step is a concrete code change or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `buffApCost`, `apCostOf`, `isConditionFamily`, `isConsumableKind`, `REWARD_BASE`, `CONDITION_MODIFIER`, `CONSUMABLE_AP_COST`, `AP_COST_MIN`, `AP_COST_MAX`, `BuffCostAxis`, `BuffBonusAccrual`, `EMPTY_BUFF_ACCRUAL`, `startHandAccrual`, `accrualCapFor`, `accrueAxisBonus`, `overlapBonusFor`, `resolveFiredBuffs`, `BuffActivationRefusal`, `BuffActivationStock`, `BuffActivationState`, `startBuffActivation`, `buffActivationRefusalFor`, `buffActivationStockFor`, `activateBuff`, `openBuffWindow`, `refreshBuffsForNewHand`, `buffActivationStock`, `BuffTargetSuit`, `BuffTarget`, `BuffCadence`, `BUFF_CADENCE`, `BUFF_TARGET_RANK_MIN`, `BUFF_TARGET_RANK_MAX`, `buffTargetSuitOf`, `buffTargetRankOf`, `isValidBuffTarget`, and the four `MAX_*_PER_HAND` keys are each spelled identically in `plan.md` Part 2 → Data shapes and in every task that names them.

**Phase boundary cleanliness:**
- Phase 1 ends type-checking: names moved and re-exported in one task, every existing importer resolving unchanged, verified by the AP and config specs.
- Phase 2 ends type-checking: the widenings are additive, no existing value is invalidated, and `buffCatalog.ts`'s specs are re-run to prove it.
- Phase 3 ends type-checking: `buffCosts.ts` is a new leaf module with no dependants beyond `index.ts`.
- Phase 4 ends type-checking: `buffAccrual.ts` is likewise a new leaf module.
- Phase 5 ends type-checking: `buffActivation.ts` depends only on modules Phases 1–3 completed, and Task 6's app-layer projection lands only after the pure rule is green.
- Phase 6 makes no production change.
