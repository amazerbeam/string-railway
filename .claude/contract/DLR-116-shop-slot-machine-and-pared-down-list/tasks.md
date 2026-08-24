# Tasks: Shop screen — slot machine and pared-down purchasable list

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-24

> `plan.md` and `mockup.html` were NOT developer-confirmed: this is a non-interactive unattended sprint run, `AskUserQuestion` could not be presented, and the mockup went **unseen**. Every stated default in `plan.md` Part 1 → Assumptions made was taken automatically and logged to `.claude/sprint-runs/2026-08-23-sprint/log.md`.

**Goal:** Make the slot machine playable on the shop screen — choose a machine, read its face-up strip and posted odds, pull a three-reel spin whose awards land on the buff pile — while paring the shop's purchasable list down to exactly Health and AP capacity.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder.

---

## File map

**Created:**
- `src/hunt/slotOdds.ts` — outcome probabilities and expected cards per pull, derived from `REEL_COUNT` / `REEL_POOL_SIZE`
- `src/hunt/__tests__/slotOdds.test.ts`
- `src/hunt/__tests__/run.slot.test.ts` — `pullSlotMachine`, `slotVisitStockFor`, the per-visit reset
- `src/hunt/__tests__/run.apCapacity.test.ts` — the AP-capacity purchase
- `src/app/run/slotLabels.ts` — every user-facing string on the slot surface
- `src/app/run/SlotMachinePanel.tsx` — machine chooser, strip, odds, pull, last result
- `src/app/run/useShopSlot.ts` — the hook that seeds, derives and commits a pull
- `src/app/run/shopSlot.css`
- `src/app/run/__tests__/SlotMachinePanel.test.tsx`
- `src/app/run/__tests__/slotLabels.test.ts`

**Modified:**
- `src/hunt/apConfig.ts` — add `AP_CAPACITY_STEP`
- `src/hunt/config.ts` — add `AP_CAPACITY_PRICE`; re-export `AP_CAPACITY_STEP`
- `src/hunt/actionPoints.ts` — add `apCapacityFor`
- `src/hunt/buffActivation.ts` — `startBuffActivation` gains a defaulted `capacity`
- `src/hunt/slotMachine.ts` — add `spinSeedFor`
- `src/hunt/shop.ts` — add `ShopItem.ApCapacity`; pare `SHOP_ITEMS`; extend `priceOf` / `categoryOf`
- `src/hunt/run.ts` — three `RunState` fields, `startRun`'s third parameter, `slotVisitStockFor`
- `src/hunt/runTransitions.ts` — `advanceRun` resets `slotPullsThisVisit`; `buyFromShop` gains the `ApCapacity` case; new `pullSlotMachine`
- `src/hunt/index.ts` — export the new names
- `src/hunt/__tests__/shop.test.ts` — the pared `SHOP_ITEMS` and the new item's price/category
- `src/app/warCouncilMount.ts` — optional `apCapacity`
- `src/app/warCouncil/roundUiState.ts` — optional `apCapacity` on `RoundUiSeed`; seed the pool from it
- `src/app/warCouncil/WarCouncilRound.tsx` — pass `apCapacity` into the seed
- `src/app/run/ShopPanel.tsx` — pared list, no tabs, mounts `SlotMachinePanel`
- `src/app/run/shopLabels.ts` — the new item's name and blurb, the AP purse label; delete the tab copy
- `src/app/run/shop.css` — drop the tab/tabpanel rules, make room for the slot section
- `src/app/run/__tests__/ShopPanel.test.tsx` — rewritten for the pared screen
- `src/app/run/__tests__/shopLabels.test.ts` — drop the tab-label assertions
- `src/App.tsx` — `runSeed`, the slot hook, the pared `ShopPanel` props, `apCapacity` to the felt

**Deleted:**
- `src/app/run/ShopCategoryTabs.tsx`
- `src/app/run/__tests__/ShopCategoryTabs.test.tsx`

**Developer decides or observes:**
- config → `AP_CAPACITY_PRICE` — ships at a documented placeholder of `3` coins, never played. It trades the shop's only non-slot sink against the machine's 1-coin reroll: too low and it dominates, too high and AP capacity is decorative. What settles it: one run to fight 3, counting the pulls forgone to buy it.
- Whether the odds line's four figures read as clarity or clutter — copy and visual judgement. Fallback is to drop the expected-cards-per-pull figure.
- **Whether the pared shop plus the slot section fits without scrolling or cropping**, at 1280×800, 1024×768, 1366×768 and 390×844. jsdom has no layout engine, and no browser pass was requested this run. `shop.css` already carries a documented history of vertical clipping.
- Whether one tap to pull, with no confirm step, feels right for the screen's most repeated action.
- `Miser` rewards unspent coins and this screen is now the game's strongest coin sink — a design tension, not a defect. Reported, not fixed.

---

## Phase 1 — The pure layer: odds, spin seeds, and the AP-capacity item

Everything in this phase lives under `src/hunt/`, imports no React, touches no DOM, and is unit-tested with no renderer. The phase is a safe stopping point because nothing outside `src/hunt/` reads any of it yet: `SHOP_ITEMS` shrinks and `ShopItem` widens, and the only consumers that break are inside this phase's own file list.

### Task 1: Derive the reel's odds in `src/hunt/slotOdds.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/slotOdds.ts`
- Test: `src/hunt/__tests__/slotOdds.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/hunt/__tests__/slotOdds.test.ts` asserting, against the shipped `REEL_COUNT = 3` / `REEL_POOL_SIZE = 8`:

- `slotOutcomeOdds()[SlotOutcome.ThreeMatch]` is `1 / 64` (`0.015625`)
- `slotOutcomeOdds()[SlotOutcome.TwoMatch]` is `168 / 512` (`0.328125`)
- `slotOutcomeOdds()[SlotOutcome.AllDifferent]` is `336 / 512` (`0.65625`)
- the three sum to `1` within `1e-12` — a named epsilon, not exact float equality
- `expectedCardsPerPull()` is `2.640625`
- `awardCountFor` returns `1` / `2` / `3` for `ThreeMatch` / `TwoMatch` / `AllDifferent`
- each `awardCountFor(outcome)` equals `resolvePull`'s actual `awards.length` for a hand-built three-symbol array of that shape — so the count table cannot drift from the resolver

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/hunt/__tests__/slotOdds.test.ts`
Expected: FAIL — `src/hunt/slotOdds.ts` does not exist.

- [x] **Step 3: Implement `slotOdds.ts`**

Derive, never transcribe. With `n = REEL_POOL_SIZE`, `k = REEL_COUNT`, total outcomes `n ** k`:
`ThreeMatch = n / n**k`, `TwoMatch = 3 * n * (n - 1) / n**k`, `AllDifferent = n * (n - 1) * (n - 2) / n**k`.
Throw a `RangeError` naming `REEL_COUNT` when `REEL_COUNT !== 3`, mirroring `resolvePull`'s own guard — no other match rule is defined. Module doc comment must state that the figures are derived so a retuned `REEL_POOL_SIZE` cannot leave a screen quoting a stale percentage.

```ts
export function slotOutcomeOdds(): Readonly<Record<SlotOutcome, number>>
export function awardCountFor(outcome: SlotOutcome): number
export function expectedCardsPerPull(): number
```

- [x] **Step 4: Re-run the spec**

Run: `npx vitest run src/hunt/__tests__/slotOdds.test.ts`
Expected: PASS.

### Task 2: Add `spinSeedFor` to `src/hunt/slotMachine.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/slotMachine.ts` — append beside `slotSeedFor`
- Test: `src/hunt/__tests__/slotOdds.test.ts` — add a `describe('spinSeedFor')` block

- [x] **Step 1: Add the function**

```ts
/** DLR-116 — the seed for pull number `pullIndex` on an ALREADY-DRAWN strip. Folds the pull index
 *  into the strip's own seed, so a paid reroll re-spins the SAME strip rather than redrawing it —
 *  the rule `drawReelPool`'s own comment states. Pure; no `Math.random()`. */
export function spinSeedFor(stripSeed: number, pullIndex: number): number {
  return mixSeed(stripSeed, pullIndex)
}
```

- [x] **Step 2: Add the spec block**

Assert: the same `(stripSeed, pullIndex)` gives the same seed twice; two different `pullIndex` values give different seeds; and — the load-bearing one — `drawReelPool(id, createSeededRng(slotSeedFor(7, id, 0)))` yields an **identical reel** whether it is computed before or after any number of spins, proving a reroll never redraws the strip.

- [x] **Step 3: Run it**

Run: `npx vitest run src/hunt/__tests__/slotOdds.test.ts`
Expected: PASS.

### Task 3: AP capacity in configuration and in the AP pool ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/apConfig.ts` — add `AP_CAPACITY_STEP`
- Modify: `src/hunt/config.ts` — add `AP_CAPACITY_PRICE`; add `AP_CAPACITY_STEP` to the existing `apConfig` re-export list
- Modify: `src/hunt/actionPoints.ts` — add `apCapacityFor`
- Modify: `src/hunt/buffActivation.ts` — `startBuffActivation(capacity: ActionPoints = STARTING_AP)`
- Test: `src/hunt/__tests__/run.apCapacity.test.ts`

- [x] **Step 1: Add the two configuration keys**

In `apConfig.ts`, beside `STARTING_AP`:

```ts
// DLR-116 AC2, TRANSCRIBED from the ticket ("+5 AP per purchase") — not a chosen value.
// UNIT: action points added to the per-hand pool per purchase.
export const AP_CAPACITY_STEP: ActionPoints = 5
```

In `config.ts`, beside the other shop prices:

```ts
// DLR-116 — what one AP-capacity purchase costs. A separate key from HEAL_PRICE for the reason
// CHEAT_PRICE and HEAL_PRICE are already separate: re-pricing one item must not move another.
// VALUE UNCHOSEN — a documented placeholder, NEVER PLAYED. The developer's to move.
// UNIT: coins per purchase.
export const AP_CAPACITY_PRICE: Coins = 3
```

Add `AP_CAPACITY_STEP` to `config.ts`'s existing `export { … } from './apConfig'` block so no importer needs a new path.

- [x] **Step 2: Add `apCapacityFor` and widen `startBuffActivation`**

```ts
// actionPoints.ts — THE statement of the per-hand pool once bought capacity is counted.
export function apCapacityFor(bonus: number): ActionPoints {
  return STARTING_AP + AP_CAPACITY_STEP * bonus
}
```

`bonus` is a **count of purchases**, not a point total. Guard a negative or non-finite `bonus` by returning `STARTING_AP` rather than producing a `NaN` pool — a `NaN` pool renders nothing and logs nothing.

In `buffActivation.ts`, change the signature to `startBuffActivation(capacity: ActionPoints = STARTING_AP)` returning `{ apPool: capacity, activatedThisTrick: [] }`, and update the docstring to say the default reproduces the pre-DLR-116 value exactly so every existing call site is unchanged.

- [x] **Step 3: Write and run the spec**

Create `src/hunt/__tests__/run.apCapacity.test.ts` asserting `apCapacityFor(0) === STARTING_AP`, `apCapacityFor(2) === STARTING_AP + 2 * AP_CAPACITY_STEP`, `apCapacityFor(-1) === STARTING_AP`, `apCapacityFor(Number.NaN) === STARTING_AP`, `startBuffActivation().apPool === STARTING_AP`, and `startBuffActivation(11).apPool === 11`.

Run: `npx vitest run src/hunt/__tests__/run.apCapacity.test.ts`
Expected: PASS.

### Task 4: Add `ShopItem.ApCapacity` and pare `SHOP_ITEMS` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/shop.ts` — `ShopItem`, `SHOP_ITEMS`, `priceOf`, `categoryOf`
- Modify: `src/hunt/__tests__/shop.test.ts` — the `SHOP_ITEMS`, `SHOP_ITEMS_BY_CATEGORY`, `UNCATEGORISED_SHOP_ITEMS` and `categoryOf` expectations
- Config: `src/hunt/config.ts` — import `AP_CAPACITY_PRICE` into `shop.ts`

- [x] **Step 1: Widen the union and pare the offered list**

Add `ApCapacity: 'apCapacity'` to `ShopItem`. Replace `SHOP_ITEMS` with:

```ts
/** DLR-116 AC2/AC3 — what the shop OFFERS, pared to the two fixed, always-purchasable items.
 *  The `ShopItem` union above keeps every member and `priceOf` / `categoryOf` / `refusalFor` /
 *  `buyFromShop` stay TOTAL over it, so no mechanic is deleted — only this list changed. Cheat,
 *  Timebomb, Blast Guard and Whetstone are still priced, still buyable by a caller, and still
 *  tested; they are simply not on the shelf while this pared-down version is played. */
export const SHOP_ITEMS: readonly ShopItem[] = [ShopItem.ApCapacity, ShopItem.Heal]
```

Add `case ShopItem.ApCapacity: return AP_CAPACITY_PRICE` to `priceOf` and `case ShopItem.ApCapacity: return ShopCategory.RunPermanent` to `categoryOf`. Leave `refusalFor` untouched — AP capacity has no item-specific refusal, which is exactly what "always-purchasable" means, so only the coin check applies.

- [x] **Step 2: Update `shop.test.ts` to the pared list**

Change the `SHOP_ITEMS` equality to `[ShopItem.ApCapacity, ShopItem.Heal]`; `SHOP_ITEMS_BY_CATEGORY[OneTimeUse]`/`[FightLong]` to `[]`, `[RunPermanent]` to `[ShopItem.ApCapacity]`, `[GamePermanent]` to `[]`; `UNCATEGORISED_SHOP_ITEMS` stays `[ShopItem.Heal]`. Keep every `categoryOf(ShopItem.Cheat|Timebomb|BlastGuard|Whetstone)` assertion exactly as it is — they prove AC3's "mechanics are not deleted" — and **add** `categoryOf(ShopItem.ApCapacity) === ShopCategory.RunPermanent` and `priceOf(ShopItem.ApCapacity) === AP_CAPACITY_PRICE`. Add one assertion that `priceOf` still answers for all six `Object.values(ShopItem)` members, which is the AC3 guarantee stated as a test.

- [x] **Step 3: Verify the phase**

Run: `npx vitest run src/hunt/__tests__/shop.test.ts src/hunt/__tests__/slotOdds.test.ts src/hunt/__tests__/run.apCapacity.test.ts; npm run typecheck`
Expected: all specs PASS. `typecheck` may still report errors in `src/app/**` and `src/App.tsx` for the not-yet-added `ApCapacity` key — that is Phase 4's work and is expected here; every error must name a file in Phase 4's or Phase 2's file list and nothing else.

---

## Phase 2 — Run state, the pull transition, and the purchase

`RunState` gains its three fields and the run learns how to take a pull and how to buy AP capacity. The phase boundary is safe because `src/hunt/` type-checks end-to-end at the end of it — `startRun` is the single construction site (`plan.md` Part 1 → audit check 7) and every other producer is a spread.

### Task 5: Three `RunState` fields and the slot-visit projection ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/run.ts` — `RunState`, `startRun`, add `slotVisitStockFor`
- Modify: `src/hunt/runTransitions.ts:117-126` — `advanceRun` resets `slotPullsThisVisit`
- Test: `src/hunt/__tests__/run.slot.test.ts`

- [x] **Step 1: Add the fields**

Add to `RunState`, each with the docstring `plan.md` Part 2 → Data shapes gives, and each ending in the house's `NEVER persisted, exactly as `coins` above.`:

```ts
readonly runSeed: number
readonly apCapacityBonus: number
readonly slotPullsThisVisit: number
```

Add `startRun`'s third parameter `runSeed: number = 1`, defaulted to a **fixed documented seed**, never `Math.random()` — this tree may not call it. Initialise `apCapacityBonus: 0` and `slotPullsThisVisit: 0`.

- [x] **Step 2: Add `slotVisitStockFor` beside `shopStockFor`**

```ts
/** DLR-116 — projects a run into the two figures the pull-cost rule needs, the sibling of
 *  `shopStockFor` and `flaskStockFor` and for the same reason: no screen assembles a
 *  `SlotVisitStock` by hand and gets one field wrong. */
export function slotVisitStockFor(run: RunState): SlotVisitStock {
  return { coins: run.coins, pullsThisVisit: run.slotPullsThisVisit }
}
```

- [x] **Step 3: Reset the count at the fight boundary**

In `advanceRun`'s returned object, add `slotPullsThisVisit: 0` beside `discardsRemaining: DISCARDS_PER_FIGHT`, with a one-line comment stating that a shop visit is per resolved encounter, so the free pull returns at every fight boundary exactly as the discard budget does. `runSeed` and `apCapacityBonus` are carried by the spread untouched — do **not** list them.

- [x] **Step 4: Write and run the spec**

Create `src/hunt/__tests__/run.slot.test.ts` with a `describe('slotVisitStockFor / the per-visit reset')` block asserting: a fresh run has `slotPullsThisVisit === 0` and `apCapacityBonus === 0`; `startRun(undefined, undefined, 99).runSeed === 99`; `slotVisitStockFor` mirrors `coins` and `slotPullsThisVisit`; and that `advanceRun` over a won encounter resets `slotPullsThisVisit` to 0 while leaving `runSeed` and `apCapacityBonus` unchanged.

Run: `npx vitest run src/hunt/__tests__/run.slot.test.ts`
Expected: PASS. — 5 passed.

### Task 6: `pullSlotMachine` and the AP-capacity purchase ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/runTransitions.ts` — add `pullSlotMachine`; add `buyFromShop`'s `ApCapacity` case
- Test: `src/hunt/__tests__/run.slot.test.ts` — add `describe('pullSlotMachine')`
- Test: `src/hunt/__tests__/run.apCapacity.test.ts` — add the purchase assertions

- [x] **Step 1: Add the `buyFromShop` case**

```ts
case ShopItem.ApCapacity:
  return { ...paid, apCapacityBonus: run.apCapacityBonus + 1 }
```

A COUNT of purchases, not a point total — `apCapacityFor` owns the multiplication, so the step size is stated once.

- [x] **Step 2: Add the transition**

```ts
/**
 * DLR-116 — one pull, ALREADY RESOLVED by the caller. Taking a `SlotPull` rather than an `Rng`
 * keeps this whole module randomness-free and keeps the seeding in exactly one place.
 *
 * Throws a `RangeError` naming the `SlotPullRefusal` rather than returning the run unchanged,
 * exactly as `buyFromShop` and `drinkFlask` do: a silent no-op is the "spent the coin for nothing"
 * failure this module refuses to allow. Reaching the throw is a driver bug — the control is
 * disabled whenever `slotPullRefusalFor` is non-null.
 *
 * Every award is taken; there is no choose-one gate. DLR-112's expected 2.64 cards per pull is a
 * per-pull YIELD that only holds if all of them land (`plan.md` Part 1 → Assumptions made).
 */
export function pullSlotMachine(run: RunState, pull: SlotPull): RunState
```

Body: refuse via `slotPullRefusalFor(slotVisitStockFor(run))`; deduct `pullPriceFor(run.slotPullsThisVisit)` from `coins`; `slotPullsThisVisit: run.slotPullsThisVisit + 1`; `buffs: [...run.buffs, ...mintPullAwards(pull, run.nextBuffId)]`; `nextBuffId: run.nextBuffId + pull.awards.length`.

- [x] **Step 3: Write the specs**

In `run.slot.test.ts`, build a `SlotPull` by hand with `resolvePull` over three chosen `BUFF_TEMPLATES` entries and assert:
- the first pull of a visit costs **0** (`SLOT_FREE_PULLS_PER_VISIT`) — `coins` unchanged, `slotPullsThisVisit` 1
- the second costs `SLOT_REROLL_PRICE` — `coins` down by exactly that
- awards land on `run.buffs` in order, with **consecutive ids from `nextBuffId`**, and `nextBuffId` advances by `pull.awards.length`
- every appended buff satisfies `isPricedBuff` — the `Unassigned` trap, asserted rather than assumed
- a three-different pull appends 3 buffs, a two-match pull 2, a three-match pull 1
- with `coins: 0` and `slotPullsThisVisit: 1`, `pullSlotMachine` **throws** a `RangeError` whose message names `notEnoughCoins`
- the original run object is not mutated

In `run.apCapacity.test.ts`, assert `buyFromShop(run, ShopItem.ApCapacity)` deducts `AP_CAPACITY_PRICE`, raises `apCapacityBonus` by exactly 1, and that `apCapacityFor` of the result is `STARTING_AP + AP_CAPACITY_STEP`; and that buying twice stacks.

- [x] **Step 4: Run them**

Run: `npx vitest run src/hunt/__tests__/run.slot.test.ts src/hunt/__tests__/run.apCapacity.test.ts`
Expected: PASS. — 20 passed.

### Task 7: Export the new names from the `hunt` barrel ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/index.ts`

- [x] **Step 1: Add the exports**

Export from their owning modules, in the barrel's existing grouping style: `AP_CAPACITY_STEP`, `AP_CAPACITY_PRICE`, `apCapacityFor`, `slotOutcomeOdds`, `awardCountFor`, `expectedCardsPerPull`, `spinSeedFor`, `slotVisitStockFor`, `pullSlotMachine`. Confirm `slotSeedFor`, `drawReelPool`, `pullMachine`, `mintPullAwards`, `pullPriceFor`, `slotPullRefusalFor`, `SlotOutcome`, `SlotPullRefusal`, `SlotMachineId`, `SLOT_MACHINE_IDS`, `REEL_POOL_SIZE`, `REEL_COUNT`, `createSeededRng`, `BuffTier`, `apCostOf`, `isPricedBuff`, `activatableBuffs` and the `SlotMachine` / `SlotPull` / `SlotAward` / `SlotVisitStock` / `BuffTemplate` types are already exported; add any that are not.

- [x] **Step 2: Verify Phase 2**

Run: `npx vitest run --project node; npm run typecheck`
Expected: every `src/hunt/**` and `src/warCouncil/**` spec PASSES. `typecheck` errors are permitted **only** in `src/App.tsx`, `src/app/run/ShopPanel.tsx`, `src/app/run/shopLabels.ts` and `src/app/run/__tests__/ShopPanel.test.tsx` — the missing `ApCapacity` key — and are fixed in Phase 4. Any error elsewhere is a defect in this phase; stop and fix it here.

Confirmed: `npx vitest run --project node src/hunt src/warCouncil` — 59 files, 897 passed. `npm run typecheck` reports exactly the 4 permitted errors, all in the 4 named files (2 hits in `shopLabels.ts`, 1 in `App.tsx`, 1 in `ShopPanel.test.tsx`); zero errors elsewhere. An unscoped `npx vitest run --project node` also surfaces one pre-existing failure in `src/app/run/__tests__/shopLabels.test.ts` (`SHOP_ITEM_NAME` missing the `ApCapacity` key) — that file is one of the four Phase-4-owned files and its failure is the same missing-key cause as the typecheck errors above, not a Phase 2 regression; it predates this phase (Phase 1's `SHOP_ITEMS` pare already on disk before Phase 2 started) and is fixed by Task 12.

---

## Phase 3 — Bought AP capacity reaches the felt

One optional field threaded from the run to the hand's opening pool. Optional rather than required precisely because `RoundUiSeed`'s required sibling `bankClimbBonus` has 30 construction sites (`plan.md` Part 1 → audit check 7); with the field optional, **zero** of those fixtures change and no existing test's meaning moves.

### Task 8: Thread `apCapacity` through the mount and the seed ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncilMount.ts` — add `readonly apCapacity?: ActionPoints` to `WarCouncilMountProps`
- Modify: `src/app/warCouncil/roundUiState.ts` — add the same optional field to `RoundUiSeed`; `createRoundUiState` calls `startBuffActivation(seed.apCapacity ?? STARTING_AP)`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:100-113` — accept the prop and put it in the seed object
- Test: `src/app/warCouncil/__tests__/buffActivationStock.test.ts` — add two assertions

- [x] **Step 1: Add the optional field in both places**

Docstring on both: `DLR-116 — the per-hand AP pool including capacity bought in the shop. OPTIONAL and defaulted to STARTING_AP so every existing seed fixture reproduces the pre-DLR-116 pool exactly; the driver passes apCapacityFor(run.apCapacityBonus).`

- [x] **Step 2: Seed the pool from it**

In `createRoundUiState`, replace `buffActivation: startBuffActivation()` with `buffActivation: startBuffActivation(seed.apCapacity ?? STARTING_AP)`. Import `STARTING_AP` from `../../hunt`.

- [x] **Step 3: Pass it through the component**

Destructure `apCapacity` in `WarCouncilRound`'s props and add it to the object literal handed to `useReducer`'s lazy initialiser, beside `bankClimbBonus`.

- [x] **Step 4: Assert both branches**

In `buffActivationStock.test.ts`, add: a seed with no `apCapacity` produces `apPool === STARTING_AP`; a seed with `apCapacity: STARTING_AP + AP_CAPACITY_STEP` produces exactly that pool.

- [x] **Step 5: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/buffActivationStock.test.ts; npm run typecheck`
Expected: spec PASSES; `typecheck` errors confined to the four Phase 4 files named in Task 7 Step 2.

Confirmed: `npx vitest run src/app/warCouncil/__tests__/buffActivationStock.test.ts` — 1 file, 10 passed. `npm run typecheck` reports exactly 4 errors, all in the 4 Phase-4-owned files (`src/App.tsx`, `src/app/run/__tests__/ShopPanel.test.tsx`, `src/app/run/shopLabels.ts` ×2); zero elsewhere.

---

## Phase 4 — The shop screen

The screen is replaced rather than patched, per the ticket's own note. The phase ends with `src/` type-checking clean and every spec green, so it is the last safe boundary before verification.

### Task 9: The slot surface's copy in `src/app/run/slotLabels.ts` ✓

- Skill: react-frontend, game-ux

**Files:**
- Create: `src/app/run/slotLabels.ts`
- Test: `src/app/run/__tests__/slotLabels.test.ts`

- [x] **Step 1: Write the module**

ALL PLACEHOLDER COPY, marked as such in the module docstring exactly as `shopLabels.ts` marks its own. **Every figure is interpolated from the engine, never quoted** — the odds come from `slotOutcomeOdds()` / `expectedCardsPerPull()`, the strip size from `REEL_POOL_SIZE`, the reel count from `REEL_COUNT`, the price from `pullPriceFor`.

```ts
export const SLOT_SECTION_LABEL = 'The machines'
export const SLOT_MACHINE_GROUP_LABEL = 'Choose a machine'
export const SLOT_MACHINE_NAME: Readonly<Record<SlotMachineId, string>> = {
  [SlotMachineId.Skirmisher]: 'Skirmisher',
  [SlotMachineId.Strongbox]: 'Strongbox',
}
export const SLOT_STRIP_GROUP_LABEL = 'What is on this strip'
export const SLOT_RESULT_GROUP_LABEL = 'Your last pull'
export const SLOT_PULL_LABEL = 'Pull'
export const SLOT_FREE_TAG = 'Free'
export const SLOT_NO_PULL_YET = 'No pull yet this visit.'
export const SLOT_TIER_LABEL: Readonly<Record<BuffTier, string>>          // Bronze / Silver / Gold
export const SLOT_OUTCOME_LABEL: Readonly<Record<SlotOutcome, string>>
export const SLOT_REFUSAL_MESSAGE: Readonly<Record<SlotPullRefusal, string>>
export function slotOddsText(): string
export function slotPullPriceText(price: Coins): string
export function slotPullAccessibleName(price: Coins, refusal: SlotPullRefusal | null): string
export function slotMachineAccessibleName(id: SlotMachineId, selected: boolean): string
export function slotSymbolText(template: BuffTemplate): string
```

Copy values — all placeholder, all the developer's:

- `SLOT_OUTCOME_LABEL`: `AllDifferent` → `'Three different — three bronze'`; `TwoMatch` → `'Two matched — one silver and one bronze'`; `ThreeMatch` → `'Three matched — one gold'`. Total over `SlotOutcome`, so a fourth outcome is a compile error here rather than a blank line on screen — the guarantee `PURCHASE_REFUSAL_MESSAGE` already gives.
- `SLOT_REFUSAL_MESSAGE`: `NotEnoughCoins` → `'You do not have the coins for another pull.'` Total over `SlotPullRefusal`.
- `slotPullPriceText(0)` → `SLOT_FREE_TAG`; otherwise `'<n> coin'` / `'<n> coins'`, mirroring `priceText`.
- `slotOddsText()` — one sentence built entirely from `slotOutcomeOdds()` and `expectedCardsPerPull()`, with each probability rendered to one decimal place, e.g. `` `${REEL_POOL_SIZE} symbols, ${REEL_COUNT} reels — three matching 1.6% (gold), two matching 32.8% (silver and bronze), all different 65.6% (three bronze). 2.64 cards a pull on average.` ``. **No percentage literal anywhere in the source.**
- `slotSymbolText(template)` — the strip symbol's one line. A template carries **no tier**, so mint it at `BuffTier.Bronze` with a throwaway id purely for wording and return `` `${buffName(b)} — ${buffConditionSentence(b)}` `` using DLR-114's `buffLabels.ts`. **Do not invent a second way to describe a buff.** Document in the comment that the bronze minting is for wording only and no tier is being claimed.
- `slotPullAccessibleName` / `slotMachineAccessibleName` fold the refusal / the selected state into the control's own name, exactly as `shopItemAccessibleName` does, so a screen-reader user hears WHY a control is disabled without hunting for the sentence beside it.

- [x] **Step 2: Write and run the spec**

`src/app/run/__tests__/slotLabels.test.ts`: assert `SLOT_MACHINE_NAME` names every `SLOT_MACHINE_IDS` member and the names differ; `SLOT_OUTCOME_LABEL` answers for every `Object.values(SlotOutcome)`; `slotPullPriceText(0)` is `SLOT_FREE_TAG` and `slotPullPriceText(1)` is `'1 coin'`; `slotOddsText()` contains `String(REEL_POOL_SIZE)` and `'1.6'` and `'2.64'`, proving the derivation reached the sentence; `slotSymbolText` over a known template equals `buffName(...) + ' — ' + buffConditionSentence(...)` computed independently from `buffLabels.ts`, proving there is one grammar and not two; and `slotPullAccessibleName(1, SlotPullRefusal.NotEnoughCoins)` ends with `SLOT_REFUSAL_MESSAGE[NotEnoughCoins]`.

Run: `npx vitest run src/app/run/__tests__/slotLabels.test.ts`
Expected: PASS.

Confirmed: `npx vitest run src/app/run/__tests__/slotLabels.test.ts` — 1 file, 6 passed.

### Task 10: `SlotMachinePanel` and its stylesheet ✓

- Skill: react-frontend, game-ux

**Files:**
- Create: `src/app/run/SlotMachinePanel.tsx`
- Create: `src/app/run/shopSlot.css`
- Test: `src/app/run/__tests__/SlotMachinePanel.test.tsx`

- [x] **Step 1: Build the component**

Layout per `mockup.html`'s `.slot` section. It **computes nothing** — every figure, refusal and label arrives as a prop, the `RunOutcomePanel` / `ShopPanel` discipline. Props exactly as `plan.md` Part 2 → Data shapes gives them.

Structure, top to bottom, inside one `<section aria-label={SLOT_SECTION_LABEL}>`:

1. **The machine chooser** — `role="radiogroup"` with `aria-label={SLOT_MACHINE_GROUP_LABEL}` on the container (`game-ux`: the group label goes on the container), holding one `<button role="radio" aria-checked>` per `machineIds` member, named by `slotMachineAccessibleName`. **Roving tabindex**: exactly one control at `tabIndex={0}` (the selected one) and the rest at `-1`; `ArrowLeft`/`ArrowRight` move and select, wrapping; `Home`/`End` jump to the ends. Follow the shape `ShopCategoryTabs.tsx` uses today — read that file before deleting it in Task 12. **Guard `machineIds.length === 0` before indexing**: return early with no radiogroup rather than probing index 0 of an empty collection. That guard is not hypothetical — it is the second instance of the trap `plan.md` Part 1 records, and a third is expected. Selection must read without colour alone (a thicker border plus a marker glyph, per `game-ux`).
2. **The odds line** — `slotOddsText()` in a `<p>`.
3. **The strip** — `<ul aria-label={SLOT_STRIP_GROUP_LABEL}>` with one `<li>` per `reel` entry, each `slotSymbolText(template)`. Face-up, always visible, never behind hover: it is what the pull decision needs.
4. **The pull control** — one `<button>`, `aria-label={slotPullAccessibleName(pullPrice, pullRefusal)}`, `disabled={pullRefusal !== null}`, visible text `` `${SLOT_PULL_LABEL} — ${slotPullPriceText(pullPrice)}` ``, followed by `<p role="status">` carrying `SLOT_REFUSAL_MESSAGE[pullRefusal]` or `''`. **One tap, no confirm step** — the screen's most repeated action.
5. **The last pull** — `<div role="group" aria-label={SLOT_RESULT_GROUP_LABEL}>` showing `SLOT_OUTCOME_LABEL[outcome]`, the three symbols by `slotSymbolText`, and one row per award reading `` `${SLOT_TIER_LABEL[award.tier]} — ${buffLine(award, apCostOf(award))}` ``. Render `SLOT_NO_PULL_YET` when `lastPull` is `null`, so an empty result area cannot be mistaken for a broken one — the rule `SHOP_CATEGORY_EMPTY` set.

No `useEffect`, no timer, no listener — there is nothing to clean up in this component and nothing may be added.

- [x] **Step 2: Write `shopSlot.css`**

Only the `.shop-slot-*` rules. Every `clamp()` bound is a PLACEHOLDER the developer owns, stated in the file header. The strip is the one region allowed its own `overflow-y: auto` (eight rows against a bounded height) — say why in a comment, exactly as `shop.css` does for `.shop-panel`. No `100vh`, no `100vw` anywhere. Minimum target size ≥44px on every control.

- [x] **Step 3: Write the component spec — by accessible role and label only (AC4)**

`src/app/run/__tests__/SlotMachinePanel.test.tsx`, using `@testing-library/react` as the existing specs do:

- renders one `radio` per `SLOT_MACHINE_IDS` member, and exactly one has `aria-checked="true"` (AC1, machine selection)
- clicking the unselected radio fires `onSelectMachine` with that id
- `ArrowRight` from the selected radio moves focus to the next and fires `onSelectMachine`; `ArrowRight` from the last wraps to the first
- the strip list renders exactly `reel.length` items, and the first item's text is `slotSymbolText(reel[0])`
- the pull button's accessible name carries the price; clicking it fires `onPull` **once**
- with `pullRefusal = NotEnoughCoins` the pull button is disabled, its accessible name ends with the refusal message, and the refusal sentence is present (the cannot-afford rule)
- with `lastPull = null` the result group shows `SLOT_NO_PULL_YET`
- with a two-match `lastPull`, the result group shows `SLOT_OUTCOME_LABEL[TwoMatch]`, three symbol entries, and **two** award rows whose text is `buffLine(...)` computed independently (AC1, outcome display)
- with a three-match `lastPull`, exactly **one** award row, tiered Gold
- passing `machineIds: []` renders no radio and does not throw — the empty-collection guard

- [x] **Step 4: Run it**

Run: `npx vitest run src/app/run/__tests__/SlotMachinePanel.test.tsx`
Expected: PASS.

Confirmed: `npx vitest run src/app/run/__tests__/SlotMachinePanel.test.tsx` — 1 file, 11 passed.

### Task 11: `useShopSlot` — seeding, deriving, committing ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/run/useShopSlot.ts`

- [x] **Step 1: Write the hook**

```ts
export function useShopSlot(
  run: RunState,
  vault: VaultState,
  onRun: (next: RunState) => void,
): { view: ShopSlotView; selectMachine: (id: SlotMachineId) => void; pull: () => void }
```

Rules the body must follow:

- Two `useState` values only: the chosen `SlotMachineId` (initialised to `SLOT_MACHINE_IDS[0]`) and `lastPull: { machineId, visitIndex, view: SlotPullView } | null`.
- **No `useEffect`, no timer, no listener** — nothing to clean up, and nothing may be added.
- The strip is derived during render, never stored: `const stripSeed = slotSeedFor(run.runSeed, machineId, run.encounterIndex)` then `drawVaultReelPool(vault, machineId, createSeededRng(stripSeed))`. `run.encounterIndex` **is** the visit index (`plan.md` Part 1 → Assumptions made) — do not add a field for it.
- `pull()` resolves the spin with `pullMachine(machine, createSeededRng(spinSeedFor(stripSeed, run.slotPullsThisVisit)))`, captures the awards for display with `mintPullAwards(pull, run.nextBuffId)` (the same ids `pullSlotMachine` will mint, because both read the same `nextBuffId`), then calls `onRun(pullSlotMachine(run, pull))`.
- `pull()` **re-derives** `slotPullRefusalFor(slotVisitStockFor(run))` and returns without calling anything when it is non-null — the stale-closure guard `handleBuy` and `handleDrinkFlask` document, so a double-click cannot reach `pullSlotMachine`'s deliberate throw.
- `lastPull` is rendered only when its stored `machineId` and `visitIndex` still match the current ones; otherwise the view reports `null`. This is what makes switching machines or advancing a fight clear the result **without an effect**.
- `selectMachine` sets the machine; it does not clear `lastPull` (the match check above already hides it).
- `Math.random()` must not appear in this file.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: errors confined to `src/App.tsx`, `src/app/run/ShopPanel.tsx`, `src/app/run/shopLabels.ts`, `src/app/run/__tests__/ShopPanel.test.tsx` — Task 12's and Task 13's files.

Confirmed: `npm run typecheck` reports exactly 4 errors — `src/App.tsx` (1), `src/app/run/shopLabels.ts` (2), `src/app/run/__tests__/ShopPanel.test.tsx` (1) — all the missing `ShopItem.ApCapacity` key, all Task 12/13's files. `ShopPanel.tsx` itself has no error today because it does not yet reference the key (Task 12 adds that reference); zero errors anywhere else.

### Task 12: Replace the shop screen and delete the tab widget ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/run/ShopPanel.tsx`
- Modify: `src/app/run/shopLabels.ts`
- Modify: `src/app/run/shop.css`
- Modify: `src/app/run/__tests__/ShopPanel.test.tsx`
- Modify: `src/app/run/__tests__/shopLabels.test.ts`
- Delete: `src/app/run/ShopCategoryTabs.tsx`
- Delete: `src/app/run/__tests__/ShopCategoryTabs.test.tsx`

- [x] **Step 1: Pare `shopLabels.ts`**

Add:

```ts
export const SHOP_AP_LABEL = 'Action points'
// in SHOP_ITEM_NAME
[ShopItem.ApCapacity]: 'Action points',
// in SHOP_ITEM_BLURB — INTERPOLATED from AP_CAPACITY_STEP, never quoted
[ShopItem.ApCapacity]: `+${AP_CAPACITY_STEP} action points a hand, for the rest of the run. Buy it again to stack it.`,
```

Delete, with their imports: `SHOP_CATEGORY_LABEL`, `SHOP_TABLIST_LABEL`, `SHOP_CATEGORY_COMING_SOON`, `SHOP_CATEGORY_EMPTY`, `shopCategoryAccessibleName`, `shopTabId`, `shopPanelId`, `SHOP_ASIDE_LABEL`, `SHOP_SLOTS_LABEL`, `SHOP_TIMEBOMB_LABEL`, `SHOP_GUARD_LABEL`, `SHOP_GUARD_HELD`, `SHOP_GUARD_NONE`, `SHOP_WHETSTONE_LABEL`. Keep `SHOP_ITEM_NAME` / `SHOP_ITEM_BLURB` **total over the whole `ShopItem` union** — the union still has six members and every one keeps a name, which is AC3's "not deleted" stated in copy.

- [x] **Step 2: Rewrite `ShopPanel.tsx`**

Props after this task: `coins`, `apCapacity`, `playerHealth`, `maxPlayerHealth`, `playerHearts`, `flaskCharges`, `flaskRefusal`, `onDrinkFlask`, `nextOpponentName`, `progressText`, `refusals`, `onBuy`, `onLeave`, `slot: SlotMachinePanelProps`. Removed: `cheatCount`, `cheatSlotCount`, `timebombCharges`, `blastGuardHeld`, `whetstones`.

Screen order, per `mockup.html`: title → next-opponent line → purse (**two cells only**: `SHOP_COINS_LABEL`/`coins` and `SHOP_AP_LABEL`/`apCapacity`) → the health meter row unchanged → `<SlotMachinePanel {...slot} />` → the purchasable list, `SHOP_ITEMS.map(renderItem)` in one flat `.shop-list` with **no tablist, no tabpanel and no aside heading** → the flask row (still in its own `role="group"` with `SHOP_FLASK_GROUP_LABEL`, so it still reads as apart from the priced items) → the hint → the leave button. `renderItem` is unchanged. Delete the `useState<ShopCategory>` and the `ShopCategoryTabs` import. Keep the `Escape` → `onLeave` handler and its comment, minus the now-irrelevant note about the tablist's `onCancel`. Update the component docstring to describe the pared screen and cite `plan.md` and `mockup.html`.

Import `./shopSlot.css` after `./shopFlask.css` so the cascade order matches the import order the file already documents.

- [x] **Step 3: Prune `shop.css`**

Delete the `.shop-tabs`, `.shop-tab`, `.shop-panel` and `.shop-aside*` rule blocks and any selector that no longer has an element. Leave `.shop`, `.shop-title`, `.shop-next`, `.shop-purse*`, `.shop-health`, `.shop-hearts`, `.shop-heart`, `.shop-hint` and the `@media (hover: hover)` block. Update the file header to say the tab rules went with `ShopCategoryTabs` on DLR-116 and that the freed vertical space is what the slot section occupies.

- [x] **Step 4: Delete the tab widget and its spec**

Delete `src/app/run/ShopCategoryTabs.tsx` and `src/app/run/__tests__/ShopCategoryTabs.test.tsx`. `src/hunt/shop.ts`'s `ShopCategory`, `SHOP_CATEGORIES`, `categoryOf`, `SHOP_ITEMS_BY_CATEGORY`, `UNCATEGORISED_SHOP_ITEMS` and `isShopCategoryAvailable` **stay** — the model is not the widget, and AC3 protects mechanics.

- [x] **Step 5: Rewrite `ShopPanel.test.tsx` for the pared screen**

By accessible role and label only (AC4). Assert:
- exactly `SHOP_ITEMS.length` purchase buttons render, and their accessible names are `shopItemAccessibleName(item, null)` for `ApCapacity` and `Heal` — AC2
- **no** button, tab or text names Cheat, Timebomb, Blast Guard or Whetstone — AC3, stated as a test
- `queryAllByRole('tab')` is empty and `queryAllByRole('tabpanel')` is empty — the tabs are gone
- the purse group exposes the coins figure and the AP figure
- a refused item is `disabled` and its refusal sentence renders
- clicking a purchase button fires `onBuy` with that item, once
- the flask row is still inside its own group labelled `SHOP_FLASK_GROUP_LABEL`
- the slot section renders — one `radio` per machine and the pull button — proving `ShopPanel` mounts `SlotMachinePanel` (AC1)
- `Escape` fires `onLeave`

Delete every assertion about tabs, shelves and the removed purse cells.

- [x] **Step 6: Prune `shopLabels.test.ts`**

Drop the `SHOP_CATEGORY_LABEL` / `SHOP_CATEGORIES` assertions. Keep and extend the `SHOP_ITEM_NAME` coverage assertion so it iterates `Object.values(ShopItem)` — all six — rather than `SHOP_ITEMS`, which now proves AC3's "not deleted" directly. Add one assertion that `SHOP_ITEM_BLURB[ShopItem.ApCapacity]` contains `String(AP_CAPACITY_STEP)`.

- [x] **Step 7: Run the run-screen specs**

Run: `npx vitest run src/app/run; npm run typecheck`
Expected: every spec under `src/app/run` PASSES; `typecheck` errors confined to `src/App.tsx`.

Confirmed: `npx vitest run src/app/run` — 8 files, 105 passed. `npm run typecheck` reports exactly 1 error, in `src/App.tsx` (the missing `apCapacity` refusal key and prop, Task 13's job); zero errors elsewhere.

### Task 13: Wire the driver ✓

- Skill: react-frontend

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: Seed the run**

`useState(startRun)` becomes a lazy initialiser that passes a seed: `useState(() => startRun(PLAYER_START_HEALTH, [], Math.floor(Math.random() * 0x100000000)))`. Do the same in `handleNewRun` and in `handleBeginRun` (which already calls `startRun(PLAYER_START_HEALTH, vault.startingGrants)` — add the third argument). Comment that this is the ONLY `Math.random()` in the seed path and that it sits here, in the driver, because `src/hunt/` may not call it — the same reason `dealRound(…, Math.random)` is already in this file.

- [x] **Step 2: Mount the hook and pass the pared props**

Call `useShopSlot(run, vault, setRun)` at the top level of `App` — unconditionally, never inside the `phase === RunPhase.Shop` branch, because a hook called conditionally is a hooks-order violation. Pass its `view` plus `onSelectMachine: selectMachine` and `onPull: pull` to `ShopPanel`'s `slot` prop.

Update `ShopPanel`'s props: drop `cheatCount`, `cheatSlotCount`, `timebombCharges`, `blastGuardHeld`, `whetstones`; add `apCapacity={apCapacityFor(run.apCapacityBonus)}`; add `[ShopItem.ApCapacity]: refusalFor(stock, ShopItem.ApCapacity)` to the `refusals` literal and **keep the other five keys** — the record stays total over the union.

Add `apCapacity={apCapacityFor(run.apCapacityBonus)}` to the `<WarCouncilRound>` element.

- [x] **Step 3: Check the line budget**

Run: `(Get-Content src\App.tsx).Count`
Expected: ≤ 400. If it exceeds 400, extract the `ShopPanel` element into `src/app/run/shopPanelProps.ts` in the shape `src/app/warCouncil/roundControlsProps.ts` already uses, and fix it **in this ticket** — never hand a 400-line breach back as a finding.

Confirmed: 347 lines — under budget, no extraction needed.

- [x] **Step 4: Verify the phase**

Run: `npm run typecheck; npx vitest run src/app src/hunt`
Expected: `typecheck` exits 0 with **no** errors anywhere; every spec PASSES.

Confirmed: `npm run typecheck` exits 0 with no output (no errors anywhere). `npx vitest run src/app src/hunt` — 89 files, 1060 passed.

---

## Phase 5 — Final verification

No production changes. Only sanity checks that the cumulative work is clean.

### Task 14: Confirm the determinism boundary still holds ✓

- Skill: none — verification only, no code is written

**Files:** *(no production file is touched)*

- [x] **Step 1: No `Math.random()` in either pure tree**

Run: `Get-ChildItem src\hunt,src\vault -Recurse -Include *.ts | Select-String -Pattern "Math\.random"`
Expected: zero hits.

- [x] **Step 2: No React or DOM inside the pure trees**

Run: `Get-ChildItem src\hunt,src\vault -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 3: No strip or symbol is stored on run state**

Run: `Select-String -Path src\hunt\run.ts,src\hunt\runTransitions.ts -Pattern "reel|SlotMachine\b|symbols"`
Expected: no hit that assigns a strip or a symbol array onto `RunState` — `pullSlotMachine`'s `SlotPull` parameter and its `pull.awards` read are the only permitted mentions.

### Task 15: Confirm no tunable was hard-coded and no stale name remains ✓

- Skill: none — verification only, no code is written

**Files:** *(no production file is touched)*

- [x] **Step 1: No odds percentage and no AP figure is written as a literal in a component or copy**

Run: `Get-ChildItem src\app,src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "1\.6%|32\.8%|65\.6%|2\.64|\+5 action"`
Expected: zero hits outside `src/app/run/__tests__/slotLabels.test.ts`, which asserts the derived output on purpose.

- [x] **Step 2: The deleted tab names are gone everywhere**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "ShopCategoryTabs|SHOP_CATEGORY_LABEL|SHOP_TABLIST_LABEL|shopTabId|shopPanelId|SHOP_ASIDE_LABEL|SHOP_CATEGORY_EMPTY|SHOP_CATEGORY_COMING_SOON|SHOP_SLOTS_LABEL|SHOP_WHETSTONE_LABEL"`
Expected: zero hits.

- [x] **Step 3: Every changed file is inside the 400-line budget, measured after formatting**

Run: `npm run format; Get-ChildItem src\app\run\ShopPanel.tsx,src\app\run\SlotMachinePanel.tsx,src\app\run\slotLabels.ts,src\app\run\useShopSlot.ts,src\App.tsx,src\hunt\run.ts,src\hunt\runTransitions.ts,src\hunt\shop.ts,src\hunt\slotMachine.ts,src\hunt\slotOdds.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count ≤ 400. Any breach is fixed **in this ticket** by extraction, never reported as a finding.

### Task 16: Static gates and full suite ✓

- Skill: none — verification only, no code is written

**Files:** *(no production file is touched)*

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. The passing count will be **below** the 1474 baseline by the `ShopCategoryTabs.test.tsx` cases deleted in Task 12 and above it by the cases added — report both figures, do not assert a target number.

- [x] **Step 2: Formatting of the changed files only**

Run: `npx prettier --check src\hunt\slotOdds.ts src\hunt\run.ts src\hunt\runTransitions.ts src\hunt\shop.ts src\hunt\slotMachine.ts src\hunt\actionPoints.ts src\hunt\buffActivation.ts src\hunt\apConfig.ts src\hunt\config.ts src\hunt\index.ts src\app\run\ShopPanel.tsx src\app\run\SlotMachinePanel.tsx src\app\run\slotLabels.ts src\app\run\useShopSlot.ts src\app\run\shopLabels.ts src\App.tsx`
Expected: exits 0. The repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files and is **not** a gate.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 17: Update the PR description ✓

- Skill: none — a document, not code

**Files:**
- Create: `.claude/contract/DLR-116-shop-slot-machine-and-pared-down-list/pr-description.md`

- [x] **Step 1: Write it**

Include: a link to `plan.md` in this folder; a summary of the change; every decision the developer must make (the `AP_CAPACITY_PRICE` value, the odds line's density, the one-tap pull's feel) and every behaviour only judgeable by playing; the verification results from Phase 5 with real counts; **precisely what a browser would have checked** and at which viewports; and a one-line note that `SHOP_ITEMS` is now "what the shop offers" while `ShopItem` remains "everything the game prices" — the convention this ticket introduces.

---

## Self-review

**Spec coverage:**
- AC1 machine selection + three-reel pull + outcome display — Tasks 9, 10, 11, 12, 13.
- AC2 exactly Health and AP capacity (`+5 AP`, named constant) plus the slot machine — Tasks 3, 4, 6, 12.
- AC3 Whetstone and the rest off the screen, mechanics intact — Task 4 (union stays total), Task 12 Steps 5–6 (asserted), Task 15 Step 2 (grepped).
- AC4 component tests query by accessible role and label — Task 10 Step 3, Task 12 Step 5.
- In-scope bullet "runSeed on RunState" — Task 5. "pure odds module" — Task 1. "pullSlotMachine" — Task 6. "SlotMachinePanel" — Task 10. "ShopItem.ApCapacity that genuinely raises the pool" — Tasks 3, 6, 8. "delete ShopCategoryTabs" — Task 12 Step 4.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is a concrete code change or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `AP_CAPACITY_STEP`, `AP_CAPACITY_PRICE`, `apCapacityFor`, `ShopItem.ApCapacity`, `slotOutcomeOdds`, `awardCountFor`, `expectedCardsPerPull`, `spinSeedFor`, `slotVisitStockFor`, `pullSlotMachine`, `runSeed`, `apCapacityBonus`, `slotPullsThisVisit`, `apCapacity`, `SlotPullView`, `ShopSlotView`, `useShopSlot`, `SlotMachinePanel`, and every `SLOT_*` copy constant are spelled identically in `plan.md` Part 2 → Data shapes and in every task that uses them.

**Phase boundary cleanliness:**
- Phase 1 ends with `src/hunt/` self-consistent; the only outstanding `tsc` errors are the four `src/app` files awaiting the `ApCapacity` key, named explicitly so an unexpected error is detectable rather than absorbed.
- Phase 2 ends with `src/hunt/` type-checking end-to-end and every node-project spec green; `startRun` is the single `RunState` construction site, so no half-applied widening exists.
- Phase 3 ends type-checking with zero fixture changes, because the new seed field is optional and defaults to today's value.
- Phase 4 ends with `npm run typecheck` clean across the whole repo, every spec green, no dead import, and no spec importing a deleted module.
- Phase 5 changes no production file at all.
