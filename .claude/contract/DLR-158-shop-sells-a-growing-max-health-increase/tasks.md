# Tasks: Shop sells a permanent max-health increase whose price grows with each purchase

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-09-01

**Goal:** Turn the player's maximum health from a module constant into a field the run owns and carries, and sell a second shop item that raises it — restoring the player to full at the new ceiling — for a price that climbs with every copy bought in the run.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved 2026-09-01).

---

## File map

**Created:**
- `src/hunt/runCarry.ts` — the five fight-boundary carry helpers, moved out of `runTransitions.ts` to make room under the 400-line budget.
- `src/hunt/maxHealth.ts` — the three max-health configuration keys plus `maxHealthPriceFor` and `raisedMaxHealthFor`.
- `src/hunt/__tests__/maxHealth.test.ts` — the price formula and the ceiling raise.
- `src/hunt/__tests__/run.maxHealth.test.ts` — AC8's six cases.
- `src/app/run/shopPrices.ts` — `shopPricesFor(stock)`, the sibling of `shopRefusals.ts`.
- `src/app/run/__tests__/shopPrices.test.ts` — the projection is total over the union and reads `priceOf`.

**Modified:**
- `src/hunt/runTransitions.ts` — helpers moved out; `buyFromShop` and `drinkFlask` lose their `maxPlayerHealth` parameter; new `ShopItem.MaxHealth` branch and `fullyHealed` helper.
- `src/hunt/run.ts:57-170` — `RunState` gains `maxPlayerHealth` and `maxHealthPurchases`; `startRun` seeds both; `shopStockFor` and `flaskStockFor` lose their second parameter.
- `src/hunt/shop.ts` — new `ShopItem.MaxHealth`, on `SHOP_ITEMS`; `ShopStock.maxHealthPurchases`; `priceOf` takes the stock; `categoryOf` and `tieredRankOf` grow a case.
- `src/hunt/config.ts:212-213` — one cross-reference comment beside `HEAL_PRICE` naming `maxHealth.ts` as the max-health price keys' home.
- `src/hunt/index.ts` — export the new module's names and the new item.
- `src/App.tsx:113-125,300-316` — the heart row's player denominator and `ShopPanel`'s `maxPlayerHealth` prop read `run.maxPlayerHealth`; the panel gains a `prices` prop.
- `src/app/run/ShopPanel.tsx` — a `prices` prop, read on the tile and in the accessible name.
- `src/app/run/shopLabels.ts` — `priceText` and `shopItemAccessibleName` take a price; `SHOP_ITEM_NAME` and `SHOP_ITEM_BLURB` grow a row.
- `src/hunt/__tests__/shop.test.ts` — the `baseStock` factory gains a field; 12 `priceOf` calls gain the stock.
- `src/hunt/__tests__/run.shop.test.ts` — 3 three-argument `buyFromShop` calls.
- `src/hunt/__tests__/run.flask.test.ts` — 11 two-argument `drinkFlask` calls and 1 two-argument `flaskStockFor` call.
- `src/hunt/__tests__/shield.encounter.test.ts` — 1 three-argument `buyFromShop` call and 1 two-argument `drinkFlask` call.
- `src/hunt/__tests__/run.purchaseIsolation.test.ts` — `drinkFlask` call sites.
- `src/app/run/__tests__/shopRefusals.test.ts` — the `ShopStock` literal gains a field.
- `src/app/run/__tests__/ShopPanel.test.tsx` — the new `prices` prop and the new tile.

**Deleted:** *(none)*

**Developer decides or observes:**
- `src/hunt/maxHealth.ts` → `MAX_HEALTH_PER_PURCHASE` — how much one purchase adds to the ceiling. Ships at `2`. Bigger makes each buy a bigger swing and compounds harder with the flask's percentage heal; smaller makes the ladder finer.
- `src/hunt/maxHealth.ts` → `MAX_HEALTH_PRICE_BASE` — what the first copy costs. Ships at `3`. Too low and it displaces Heal (1 coin) outright, since it heals fully as well as upgrading; too high and nobody reaches the first rung.
- `src/hunt/maxHealth.ts` → `MAX_HEALTH_PRICE_STEP` — coins added per copy already bought. Ships at `2`, giving 3 / 5 / 7 / 9 against a 10-coin encounter win. This is the limiter; it is the whole reason Heal stays worth buying.
- Whether the ladder should be linear (`base + step × n`) or multiplicative (`base × step^n`). The plan chose linear; the ticket requires only that each copy costs more than the last.
- The item's name, currently the placeholder `Max health`, and its blurb.
- Whether a second buy tile still reads clearly beside Heal, the flask and the leave control, and whether the price ticking up feels like a mechanic rather than a glitch. `mockup.html` is the reference; judge it in the running app.

---

## Phase 1 — Make room under the line budget

`runTransitions.ts` is 396 lines against a 400-line blocking budget, so the feature cannot be added to it as it stands. This phase moves the five fight-boundary carry helpers into their own module and changes nothing else — a pure move, no expression altered — so it can be reviewed on its own and the whole existing suite must pass unchanged at the end of it.

### Task 1: Extract the fight-boundary carry helpers to `src/hunt/runCarry.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/runCarry.ts`
- Modify: `src/hunt/runTransitions.ts:322-355,382-396`

- [x] **Step 1: Create `src/hunt/runCarry.ts` holding the five helpers, verbatim**

Move `guardAfter`, `feederCarryAfter`, `streakAfter` (lines 322–355 of `runTransitions.ts`) and `flaskAfter` (lines 382–396) into a new file, exported rather than private, with their docblocks carried over unchanged. Two signatures change so this module does not import `run.ts` and no import cycle is created: `handOfFightAfter` takes the number rather than the run, and `flaskAfter` takes the two figures it reads.

```ts
import { OpponentKind, FLASK_STARTING_CHARGES, runEncounterAt } from './config'
import { EMPTY_BUFF_CARRY, type BuffCarry } from './buffAccrual'
import { isEncounterResolved } from './encounter'
import type { EncounterState } from './types'
import type { StreakState } from '../warCouncil'

export function guardAfter(encounter: EncounterState, held: boolean): boolean {
  return isEncounterResolved(encounter) ? false : held
}

export function feederCarryAfter(encounter: EncounterState, carry: BuffCarry): BuffCarry {
  return isEncounterResolved(encounter) ? EMPTY_BUFF_CARRY : carry
}

export function streakAfter(encounter: EncounterState, streak: StreakState): StreakState {
  return isEncounterResolved(encounter) ? { total: 0, roll: 0 } : streak
}

export function handOfFightAfter(handOfFight: number, encounter: EncounterState): number {
  return isEncounterResolved(encounter) ? handOfFight : handOfFight + 1
}

export function flaskAfter(
  encounterIndex: number,
  flaskCharges: number,
  wonThisEncounter: boolean,
): number {
  const beatABoss = wonThisEncounter && runEncounterAt(encounterIndex).kind === OpponentKind.Boss
  return beatABoss ? FLASK_STARTING_CHARGES : flaskCharges
}
```

- [x] **Step 2: Delete the five helpers from `runTransitions.ts` and import them, updating the two changed call sites**

Remove lines 322–355 and 382–396. Add `import { feederCarryAfter, flaskAfter, guardAfter, handOfFightAfter, streakAfter } from './runCarry'`. In `recordEncounter`'s returned object, change `handOfFight: handOfFightAfter(run, encounter)` to `handOfFight: handOfFightAfter(run.handOfFight, encounter)` and `flaskCharges: flaskAfter(run, wonThisEncounter)` to `flaskCharges: flaskAfter(run.encounterIndex, run.flaskCharges, wonThisEncounter)`. Drop any import of `OpponentKind`, `runEncounterAt`, `FLASK_STARTING_CHARGES`, `EMPTY_BUFF_CARRY` or `BuffCarry` that `runTransitions.ts` no longer uses. `healedBy` (lines 356–381) stays where it is.

- [x] **Step 3: Confirm both files are under budget and the move changed nothing**

Run: `npm run typecheck; (Get-Content src\hunt\runTransitions.ts).Count; (Get-Content src\hunt\runCarry.ts).Count`
Expected: typecheck exits 0; `runTransitions.ts` reports roughly 353 and in any case under 400; `runCarry.ts` reports under 100.

- [x] **Step 4: Run every spec that exercises a carry rule**

Run: `npx vitest run src/hunt/__tests__/run.feederCarry.test.ts src/hunt/__tests__/run.streak.test.ts src/hunt/__tests__/run.flask.test.ts src/hunt/__tests__/blastGuard.test.ts src/hunt/__tests__/run.test.ts`
Expected: exits 0, Vitest reports 0 failed. No spec is edited in this task — a pure move must not need one.

---

## Phase 2 — The run owns its maximum health

`RunState` gains the ceiling and the purchase count, and the four functions that took `maxPlayerHealth` as a defaulted parameter lose it. The phase is one shape change plus every reader of it, per `plan.md`'s config-change rule: splitting the signature change from its call sites would leave a boundary where the app does not compile. Nothing about the shop changes yet — at the end of this phase the ceiling is run state and still never moves.

### Task 2: Put `maxPlayerHealth` and `maxHealthPurchases` on `RunState`, and drop the projections' parameter ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/run.ts:57-170,180-200,228-255`
- Modify: `src/hunt/shop.ts:80-95` — `ShopStock` gains `maxHealthPurchases`
- Test: `src/hunt/__tests__/shop.test.ts:28-36` — the `baseStock` factory
- Test: `src/app/run/__tests__/shopRefusals.test.ts` — the `ShopStock` literal
- Test: `src/hunt/__tests__/run.flask.test.ts:61` — the two-argument `flaskStockFor` call

- [x] **Step 1: Add the two fields to `RunState`, documented in the house style**

Add to the interface in `src/hunt/run.ts`, after `whetstones`:

```ts
  /** DLR-158 AC3 — the run's LIVE maximum health, raised by `ShopItem.MaxHealth`. Was
   *  `PLAYER_START_HEALTH`, a module constant threaded through four defaulted parameters, which
   *  meant the health bar's denominator, the flask's percentage heal and Heal's at-full-health
   *  refusal were all pinned to the figure the run opened on. Run-permanent like `whetstones`
   *  and carried by `advanceRun`'s and `recordEncounter`'s spreads. NEVER persisted, exactly as
   *  `coins` above. */
  readonly maxPlayerHealth: Health
  /** DLR-158 AC4 — max-health copies bought this run. A COUNT, not a flag: each stacks and the
   *  climbing price is the only limiter (AC6), exactly as `whetstones` and `apCapacityBonus`
   *  stack. `maxHealthPriceFor` owns the arithmetic, so the growth step is stated once. NEVER
   *  persisted, exactly as `coins` above. */
  readonly maxHealthPurchases: number
```

- [x] **Step 2: Seed both in `startRun`**

In the returned object, add `maxPlayerHealth: playerHealth` beside `encounter: startEncounter(0, playerHealth)` and `maxHealthPurchases: 0` beside `whetstones: 0`. Extend `startRun`'s docblock with one sentence: the `playerHealth` argument now seeds both the opening health and the opening ceiling, because a run that starts hurt is not a thing the game has and two figures that can disagree is one more than is needed.

- [x] **Step 3: Drop the second parameter from `shopStockFor` and `flaskStockFor`**

```ts
export function shopStockFor(run: RunState): ShopStock {
  return {
    coins: run.coins,
    playerHealth: run.encounter.health[DuelSide.Player],
    maxPlayerHealth: run.maxPlayerHealth,
    blastGuardHeld: run.blastGuardHeld,
    rankTiers: run.rankTiers,
    maxHealthPurchases: run.maxHealthPurchases,
  }
}

export function flaskStockFor(run: RunState): FlaskStock {
  return {
    charges: run.flaskCharges,
    playerHealth: run.encounter.health[DuelSide.Player],
    maxPlayerHealth: run.maxPlayerHealth,
  }
}
```

Drop the now-unused `PLAYER_START_HEALTH` import from `run.ts` only if `startRun`'s default no longer needs it — it does, so keep it. Replace each docblock's "projects a run into the four figures" wording with the new count.

- [x] **Step 4: Add `maxHealthPurchases` to `ShopStock`**

In `src/hunt/shop.ts`, add to the interface after `rankTiers`:

```ts
  /** DLR-158 AC4 — copies of the max-health raise bought this run, so this module can price the
   *  NEXT one without learning the run's shape. The discipline `ShopStock`'s own docblock states:
   *  everything the shop's rules need, and nothing else. */
  readonly maxHealthPurchases: number
```

- [x] **Step 5: Update the three `ShopStock` construction sites the compiler names**

`src/hunt/__tests__/shop.test.ts`'s `baseStock` factory gains `maxHealthPurchases: 0`; `src/app/run/__tests__/shopRefusals.test.ts`'s literal gains the same; `src/hunt/__tests__/run.flask.test.ts:61` drops its second argument to `flaskStockFor` and instead builds its run with the ceiling it wants (`{ ...run, maxPlayerHealth: MAX }`).

- [x] **Step 6: Typecheck to enumerate what is left**

Run: `npm run typecheck`
Expected: the only remaining errors name `src/hunt/runTransitions.ts` (the two internal two-argument calls) and are fixed by the next task. Record the list — it is the worklist for Task 3.

### Task 3: Drop the parameter from `buyFromShop` and `drinkFlask`, and point the driver at the run ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/runTransitions.ts:165-240`
- Modify: `src/App.tsx:113-125,296-316`
- Test: `src/hunt/__tests__/run.shop.test.ts` — 3 three-argument `buyFromShop` calls
- Test: `src/hunt/__tests__/run.flask.test.ts` — 11 two-argument `drinkFlask` calls
- Test: `src/hunt/__tests__/shield.encounter.test.ts` — 1 `buyFromShop` and 1 `drinkFlask` call
- Test: `src/hunt/__tests__/run.purchaseIsolation.test.ts` — its `drinkFlask` call sites

- [x] **Step 1: Remove the parameter from both transitions and read the run instead**

```ts
export function drinkFlask(run: RunState): RunState {
  if (!isEncounterResolved(run.encounter)) { /* unchanged throw */ }
  const refusal = flaskRefusalFor(flaskStockFor(run))
  if (refusal !== null) {
    throw new RangeError(
      `Cannot drink the flask — ${refusal} (holding ${run.flaskCharges} charges, ${run.encounter.health[DuelSide.Player]} of ${run.maxPlayerHealth} health)`,
    )
  }
  return {
    ...healedBy(run, flaskHealAmount(run.maxPlayerHealth), run.maxPlayerHealth),
    flaskCharges: run.flaskCharges - 1,
  }
}

export function buyFromShop(run: RunState, item: ShopItem): RunState {
  if (!Number.isFinite(run.maxPlayerHealth) || run.maxPlayerHealth <= 0) {
    throw new RangeError(
      `Cannot buy against a maximum health of ${run.maxPlayerHealth}: it must be a positive finite number`,
    )
  }
  // …refusal check and message unchanged except that `maxPlayerHealth` becomes `run.maxPlayerHealth`
  // and `shopStockFor(run, maxPlayerHealth)` becomes `shopStockFor(run)`…
  // The Heal branch becomes `healedBy(paid, HEAL_HEALTH_RESTORED, run.maxPlayerHealth)`.
}
```

Replace each docblock's "`maxPlayerHealth` is a defaulted parameter, matching `startEncounter`/`startRun`'s injectable pattern, so a spec varies the clamp without mutating module state" note with: the ceiling is the run's own field now (DLR-158 AC3), so there is no argument to get wrong; a spec that wants a different ceiling spreads `{ ...run, maxPlayerHealth: N }`. Drop `PLAYER_START_HEALTH` from this file's imports if nothing else uses it.

- [x] **Step 2: Point `App.tsx` at the run's ceiling**

At `src/App.tsx:119`, change `[DuelSide.Player]: PLAYER_START_HEALTH` to `[DuelSide.Player]: run.maxPlayerHealth`, and extend the comment above it — the player's maximum is not a module constant any more either, for the same reason the Quarry's is not. At `src/App.tsx:303`, change `maxPlayerHealth={PLAYER_START_HEALTH}` to `maxPlayerHealth={run.maxPlayerHealth}`. Leave the three `startRun(PLAYER_START_HEALTH, …)` calls alone — that argument still means "the health this run opens on".

- [x] **Step 3: Update every spec the compiler named**

Drop the trailing `maxPlayerHealth` argument from all 4 `buyFromShop` calls and all 12 `drinkFlask` calls listed in the `**Files:**` block. Where a spec passed a ceiling other than `PLAYER_START_HEALTH` in order to test the clamp, build the run with that ceiling instead — `const run = { ...startRun(), maxPlayerHealth: 6 }` — so the assertion still exercises what it was written to exercise. Do not weaken an assertion to make it compile.

- [x] **Step 4: Typecheck and run the affected specs**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/run.shop.test.ts src/hunt/__tests__/run.flask.test.ts src/hunt/__tests__/shield.encounter.test.ts src/hunt/__tests__/run.purchaseIsolation.test.ts src/hunt/__tests__/run.test.ts src/app/run/__tests__/shopRefusals.test.ts`
Expected: typecheck exits 0 with no errors; Vitest exits 0 and reports 0 failed.

- [x] **Step 5: Confirm no reader is left on the constant where it means "current maximum"**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "maxPlayerHealth\s*=\s*PLAYER_START_HEALTH"`
Expected: zero hits — every defaulted-parameter form is gone.

---

## Phase 3 — The screen stops looking prices up for itself

A price that depends on run state cannot be read by a copy function that only knows the item. This phase moves price derivation to the driver, in the exact shape `shopRefusalsFor` already uses, while `priceOf` still takes one argument — so it is a behaviour-preserving refactor that type-checks and passes the suite on its own, before the signature changes underneath it.

### Task 4: Derive prices in the driver and hand them to `ShopPanel` ✓

- Skill: `react-frontend`, and `game-ux` for the tile's reading

**Files:**
- Create: `src/app/run/shopPrices.ts`
- Test: `src/app/run/__tests__/shopPrices.test.ts`
- Modify: `src/app/run/shopLabels.ts:87-98`
- Modify: `src/app/run/ShopPanel.tsx:36-70,110-135`
- Modify: `src/App.tsx:296-316`
- Test: `src/app/run/__tests__/ShopPanel.test.tsx`

- [x] **Step 1: Write the failing test for the price projection**

Create `src/app/run/__tests__/shopPrices.test.ts`. Assert that `shopPricesFor` returns an entry for every member of `ShopItem` — including the ones off the shelf — and that each entry equals `priceOf` for that item, so the projection can never be a second reading of the price rule.

```ts
import { describe, expect, it } from 'vitest'
import { priceOf, ShopItem, type ShopStock } from '../../../hunt'
import { shopPricesFor } from '../shopPrices'
import { ALL_BRONZE } from '../../../hunt/rankTiers'

const stock = (over: Partial<ShopStock> = {}): ShopStock => ({
  coins: 5,
  playerHealth: 6,
  maxPlayerHealth: 10,
  blastGuardHeld: false,
  rankTiers: ALL_BRONZE,
  maxHealthPurchases: 0,
  ...over,
})

describe('shopPricesFor', () => {
  it('prices every ShopItem member, shelved or not', () => {
    const prices = shopPricesFor(stock())
    for (const item of Object.values(ShopItem)) {
      expect(typeof prices[item]).toBe('number')
    }
  })

  it('never reads the price rule a second time', () => {
    const prices = shopPricesFor(stock())
    for (const item of Object.values(ShopItem)) {
      expect(prices[item]).toBe(priceOf(item))
    }
  })
})
```

- [x] **Step 2: Run it and watch it fail for the right reason**

Run: `npx vitest run src/app/run/__tests__/shopPrices.test.ts`
Expected: exits non-zero, failing to resolve `../shopPrices` — not an assertion failure.

- [x] **Step 3: Create `src/app/run/shopPrices.ts`**

```ts
import { priceOf, ShopItem, type Coins, type ShopStock } from '../../hunt'

/**
 * Every `ShopItem`'s CURRENT price in one pass — the sibling of `shopRefusals.ts` and written to
 * its shape for its reason. DERIVED from the union rather than hand-listed, so an item added to
 * `ShopItem` needs no edit here and cannot arrive as an `undefined` the panel renders as blank.
 * Pure, and testable with no renderer.
 *
 * Exists because a price is stock-dependent from DLR-158 on: `ShopItem.MaxHealth` costs more with
 * every copy already bought. `ShopPanel` computes nothing, so the driver derives this and hands it
 * down — which is also what makes AC5's "the price updates after a purchase without leaving the
 * shop" fall out of the ordinary render rather than needing a mechanism.
 */
export function shopPricesFor(stock: ShopStock): Readonly<Record<ShopItem, Coins>> {
  const prices = {} as Record<ShopItem, Coins>
  for (const item of Object.values(ShopItem)) {
    prices[item] = priceOf(item)
  }
  return prices
}
```

- [x] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/app/run/__tests__/shopPrices.test.ts`
Expected: exits 0, Vitest reports 0 failed.

- [x] **Step 5: Make the copy functions take a price rather than an item**

In `src/app/run/shopLabels.ts`, replace `priceText` and `shopItemAccessibleName`:

```ts
/** A price, in words. Takes the ALREADY-DERIVED figure rather than the item: from DLR-158 the
 *  price depends on run state, and a copy layer that called `priceOf` itself would have to learn
 *  the shop's rules to do it. `shopPrices.ts` is the single reader of `priceOf` on this side. */
export function priceText(price: Coins): string {
  return `${price} coin${price === 1 ? '' : 's'}`
}

export function shopItemAccessibleName(
  item: ShopItem,
  price: Coins,
  refusal: PurchaseRefusal | null,
): string {
  const base = `${SHOP_ITEM_NAME[item]} — ${priceText(price)}`
  return refusal === null ? base : `${base} — ${PURCHASE_REFUSAL_MESSAGE[refusal]}`
}
```

Drop the now-unused `priceOf` import from this file, and add `type Coins` to the import from `'../../hunt'`.

- [x] **Step 6: Add the `prices` prop to `ShopPanel` and read it on the tile**

In `ShopPanelProps`, after `refusals`:

```ts
  /** DLR-158 AC5 — one entry per `ShopItem`, derived by the driver from `priceOf` and never
   *  re-derived here: the price of the NEXT purchase, which for the max-health raise climbs with
   *  every copy bought. Total over the whole union, exactly as `refusals` is. */
  readonly prices: Readonly<Record<ShopItem, Coins>>
```

Destructure `prices` in the parameter list, and inside `renderItem` replace `priceText(item)` with `priceText(prices[item])` and `shopItemAccessibleName(item, refusal)` with `shopItemAccessibleName(item, prices[item], refusal)`.

- [x] **Step 7: Pass the prices from the driver**

In `src/App.tsx`'s `ShopPanel` element, add `prices={shopPricesFor(stock)}` beside `refusals={shopRefusalsFor(stock)}`, and add the import from `'./app/run/shopPrices'`. `stock` is already derived from `run` on every render, so a purchase re-derives it and the tile re-renders with the new figure — nothing further is needed for AC5.

- [x] **Step 8: Update `ShopPanel.test.tsx` for the new prop and confirm the screen is unchanged**

Add a `prices` entry to the test's prop factory, built the same way `refusals` is. Assert the Heal tile still renders `1 coin` and that its accessible name still reads `Heal — 1 coin`, so this refactor is proven to have changed nothing a player sees.

Run: `npm run typecheck; npx vitest run --project dom src/app/run/__tests__/ShopPanel.test.tsx; npx vitest run src/app/run/__tests__/shopPrices.test.ts`
Expected: typecheck exits 0; both Vitest runs exit 0 with 0 failed.

---

## Phase 4 — The item, its climbing price, and the purchase

Everything the ticket actually asks for. The price rule lands first as a self-contained pure module, then the shelf item and `priceOf`'s new signature with every reader in one task, then the transition, then AC8's coverage. Each task type-checks on its own except the signature change, which carries its readers by design.

### Task 5: The price formula and the ceiling raise, in `src/hunt/maxHealth.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/maxHealth.ts`
- Test: `src/hunt/__tests__/maxHealth.test.ts`
- Config: `src/hunt/maxHealth.ts` — `MAX_HEALTH_PER_PURCHASE`, `MAX_HEALTH_PRICE_BASE`, `MAX_HEALTH_PRICE_STEP` (all three values are developer decisions; documented placeholders ship)
- Modify: `src/hunt/config.ts:212-213` — a cross-reference comment only

- [x] **Step 1: Write the failing tests for the two rules**

Create `src/hunt/__tests__/maxHealth.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  MAX_HEALTH_PER_PURCHASE,
  MAX_HEALTH_PRICE_BASE,
  MAX_HEALTH_PRICE_STEP,
  maxHealthPriceFor,
  raisedMaxHealthFor,
} from '../maxHealth'

describe('maxHealthPriceFor', () => {
  it('charges the base price for the first copy', () => {
    expect(maxHealthPriceFor(0)).toBe(MAX_HEALTH_PRICE_BASE)
  })

  it('AC4 — every copy costs more than the one before it', () => {
    for (let n = 0; n < 8; n++) {
      expect(maxHealthPriceFor(n + 1)).toBeGreaterThan(maxHealthPriceFor(n))
    }
  })

  it('climbs by exactly the configured step, so the growth is stated once', () => {
    expect(maxHealthPriceFor(1) - maxHealthPriceFor(0)).toBe(MAX_HEALTH_PRICE_STEP)
    expect(maxHealthPriceFor(4)).toBe(MAX_HEALTH_PRICE_BASE + MAX_HEALTH_PRICE_STEP * 4)
  })

  it('throws rather than returning NaN on a corrupted count', () => {
    expect(() => maxHealthPriceFor(Number.NaN)).toThrow(RangeError)
    expect(() => maxHealthPriceFor(-1)).toThrow(RangeError)
  })
})

describe('raisedMaxHealthFor', () => {
  it('AC1 — raises the ceiling by the configured amount', () => {
    expect(raisedMaxHealthFor(10)).toBe(10 + MAX_HEALTH_PER_PURCHASE)
  })

  it('throws rather than returning NaN on a corrupted ceiling', () => {
    expect(() => raisedMaxHealthFor(0)).toThrow(RangeError)
    expect(() => raisedMaxHealthFor(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})
```

- [x] **Step 2: Run them and watch them fail for the right reason**

Run: `npx vitest run src/hunt/__tests__/maxHealth.test.ts`
Expected: exits non-zero, failing to resolve `../maxHealth` — not an assertion failure.

- [x] **Step 3: Create `src/hunt/maxHealth.ts`**

```ts
import type { Coins, Health } from './types'

/**
 * DLR-158 — the max-health purchase's three figures and the two rules that read them.
 *
 * A sibling module rather than three keys in `config.ts`, following `rankTiers.ts`'s precedent
 * with `RANK_TIER_STEP_PRICE`: the shop's other stacking price lives beside the rule it prices,
 * not in `config.ts`, and `config.ts` is close enough to the 400-line blocking budget that a
 * documented formula would breach it. AC4's substance is met either way — ONE formula, in ONE
 * place, with the base and the step both configuration rather than literals at a call site.
 */

// UNIT: health points added to the run's ceiling by one purchase.
// VALUE UNCHOSEN — a documented placeholder, NEVER PLAYED. The developer's to move: DLR-158 puts
// "choosing the final base price, growth curve and health-per-purchase values" out of scope and
// says to ship rough defaults and tune by feel. AC2's own worked example uses +2 on a 6 ceiling.
export const MAX_HEALTH_PER_PURCHASE: Health = 2

// UNIT: coins. What the FIRST max-health purchase of a run costs.
// VALUE UNCHOSEN — see above. Placed between HEAL_PRICE (1) and WHETSTONE_PRICE (4) because this
// item restores to full as well as raising the ceiling, so at Heal's price it would displace Heal
// outright — which the ticket names as the risk the growth curve exists to manage.
export const MAX_HEALTH_PRICE_BASE: Coins = 3

// UNIT: coins added to the price per purchase ALREADY MADE.
// VALUE UNCHOSEN — see above. At 2 the ladder is 3 / 5 / 7 / 9 against a 10-coin encounter win.
// This key is the only limiter there is: AC6 rules out a purchase cap.
export const MAX_HEALTH_PRICE_STEP: Coins = 2

/**
 * AC4 — THE single statement of the escalating price, so the screen, the refusal and the coin
 * deduction cannot disagree about what the next copy costs. Linear in the count already bought,
 * which is the simplest rule satisfying "the Nth costs more than the (N-1)th"; swapping it for a
 * multiplier is an edit to this one expression.
 *
 * Throws on a non-finite or negative count rather than returning `NaN`. A `NaN` price would fail
 * `stock.coins < price` — `NaN` comparisons are always false — and so would read as AFFORDABLE,
 * charging the player an unknowable amount and rendering as nothing on the tile.
 */
export function maxHealthPriceFor(purchases: number): Coins {
  if (!Number.isInteger(purchases) || purchases < 0) {
    throw new RangeError(
      `Cannot price a max-health purchase against a count of ${purchases}: it must be a non-negative integer`,
    )
  }
  return MAX_HEALTH_PRICE_BASE + MAX_HEALTH_PRICE_STEP * purchases
}

/**
 * AC1 — THE single statement of how far one purchase raises the ceiling, so the step size is read
 * from configuration in exactly one place and `buyFromShop` holds no arithmetic of its own.
 *
 * Guards the incoming ceiling for `flaskHealAmount`'s stated reason: a `NaN` maximum would corrupt
 * `Math.min` inside `healedBy`, land in `encounter.health`, and vanish from the health bar with
 * nothing logged anywhere.
 */
export function raisedMaxHealthFor(maxPlayerHealth: Health): Health {
  if (!Number.isFinite(maxPlayerHealth) || maxPlayerHealth <= 0) {
    throw new RangeError(
      `Cannot raise a maximum health of ${maxPlayerHealth}: it must be a positive finite number`,
    )
  }
  return maxPlayerHealth + MAX_HEALTH_PER_PURCHASE
}
```

- [x] **Step 4: Add the cross-reference comment to `config.ts`**

Immediately after `export const HEAL_PRICE: Coins = 1`, add:

```ts
// DLR-158 — the max-health purchase's price is NOT a key here. It climbs with the number already
// bought, so it is a formula rather than a constant, and it lives with its rule in
// `src/hunt/maxHealth.ts` — exactly as `RANK_TIER_STEP_PRICE` lives in `rankTiers.ts`.
```

- [x] **Step 5: Run the tests and the line budget check**

Run: `npx vitest run src/hunt/__tests__/maxHealth.test.ts; npm run typecheck; (Get-Content src\hunt\config.ts).Count`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0; `config.ts` reports under 400.

### Task 6: Put the item on the shelf and make `priceOf` read the stock ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/shop.ts:10-50,96-200,225-240`
- Modify: `src/hunt/runTransitions.ts:233`
- Modify: `src/app/run/shopPrices.ts`
- Modify: `src/app/run/shopLabels.ts:44-80`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/shop.test.ts` — 12 `priceOf` calls plus new cases
- Test: `src/app/run/__tests__/shopPrices.test.ts` — the `priceOf` comparison gains the stock

- [x] **Step 1: Add the member, put it on the shelf, and grow the three total functions**

In `src/hunt/shop.ts`:

```ts
export const ShopItem = {
  // …existing members unchanged…
  /** DLR-158 AC1 — raises the run's maximum health and refills to the new top. */
  MaxHealth: 'maxHealth',
} as const

/** DLR-158 AC1 — the shelf gains a second item, the first addition since the 2026-09-01 pass
 *  pared it to Heal alone. Nothing that left comes back: this is a NEW item, and every card off
 *  the shelf stays off it for the reasons the notes above give. */
export const SHOP_ITEMS: readonly ShopItem[] = [ShopItem.Heal, ShopItem.MaxHealth]
```

`categoryOf` gains `case ShopItem.MaxHealth: return ShopCategory.RunPermanent` — the raise lasts the run, exactly as Whetstone's climb does. `tieredRankOf` gains `ShopItem.MaxHealth` to its `null` group. `refusalFor` gains **no** branch: AC6 says full health must not refuse this purchase, so the item falls through every item-specific check to the coin comparison and `NotEnoughCoins` is the only reason it can produce. Add a comment saying exactly that, so a later reader does not "fix" the omission.

- [x] **Step 2: Make `priceOf` take the stock**

```ts
/**
 * Total over `ShopItem`, so adding an item is a compile error here rather than an `undefined`
 * price at runtime.
 *
 * DLR-158 — takes the STOCK, required, because `MaxHealth`'s price climbs with the number already
 * bought. Required rather than defaulted for the reason this ticket removed four defaulted
 * `maxPlayerHealth` parameters: a default is a silently-wrong answer waiting for a caller who
 * forgets. One function rather than a `currentPriceOf` beside this one, so the tile, the refusal
 * and the coin deduction cannot disagree about what a thing costs.
 */
export function priceOf(item: ShopItem, stock: ShopStock): Coins {
  switch (item) {
    // …existing cases unchanged…
    case ShopItem.MaxHealth:
      return maxHealthPriceFor(stock.maxHealthPurchases)
  }
}
```

Import `maxHealthPriceFor` from `./maxHealth`. Update `refusalFor`'s coin check to `stock.coins < priceOf(item, stock)`.

- [x] **Step 3: Update the three readers the compiler names**

`src/hunt/runTransitions.ts:233` — `buyFromShop` already derives the stock for its refusal check; hoist it to a `const stock = shopStockFor(run)` above the refusal and use `priceOf(item, stock)` in the `paid` line. `src/app/run/shopPrices.ts` — `prices[item] = priceOf(item, stock)`. `src/app/run/__tests__/shopPrices.test.ts` — the second test's comparison becomes `priceOf(item, s)` against the same stock the projection was given.

- [x] **Step 4: Add the copy rows**

In `src/app/run/shopLabels.ts`, add to `SHOP_ITEM_NAME` and `SHOP_ITEM_BLURB` (both are total over the union, so the compiler already demands them):

```ts
  [ShopItem.MaxHealth]: 'Max health', // PLACEHOLDER copy — the developer's call.
```

```ts
  [ShopItem.MaxHealth]: `+${MAX_HEALTH_PER_PURCHASE} maximum health for the rest of the run, and you leave at full. Buy it again to stack it — each one costs more.`, // PLACEHOLDER copy
```

Import `MAX_HEALTH_PER_PURCHASE` from `'../../hunt'`. The blurb is not rendered — the 2026-09-01 pass deleted blurbs from the shelf — but the map stays total, exactly as it stays total for Cheat and Whetstone.

- [x] **Step 5: Export the new names**

In `src/hunt/index.ts`, export `MAX_HEALTH_PER_PURCHASE`, `MAX_HEALTH_PRICE_BASE`, `MAX_HEALTH_PRICE_STEP`, `maxHealthPriceFor` and `raisedMaxHealthFor` from `'./maxHealth'`, beside the existing `priceOf` export.

- [x] **Step 6: Update `shop.test.ts` — every `priceOf` call, and the new item's rows**

All 12 existing `priceOf(x)` calls gain the `baseStock()` argument. Add cases asserting: `SHOP_ITEMS` is `[Heal, MaxHealth]`; `categoryOf(MaxHealth)` is `RunPermanent` and `SHOP_ITEMS_BY_CATEGORY[RunPermanent]` is now `[MaxHealth]`; `tieredRankOf(MaxHealth)` is `null`; `priceOf(MaxHealth, baseStock({ maxHealthPurchases: 2 }))` equals `maxHealthPriceFor(2)`; and AC6 — `refusalFor(baseStock({ playerHealth: 10, maxPlayerHealth: 10 }), MaxHealth)` is `null` while the same stock refuses `Heal` with `AlreadyFullHealth`, and `refusalFor(baseStock({ coins: 0 }), MaxHealth)` is `NotEnoughCoins`.

- [x] **Step 7: Typecheck and run the shop specs**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/shop.test.ts src/app/run/__tests__/shopPrices.test.ts src/app/run/__tests__/shopRefusals.test.ts`
Expected: typecheck exits 0; Vitest exits 0 with 0 failed.

### Task 7: The purchase — raise the ceiling and fill to the new top ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/runTransitions.ts:214-275,356-381`

- [x] **Step 1: Add `fullyHealed` beside `healedBy`**

```ts
/**
 * DLR-158 AC2 — restored to the TOP of the given ceiling. Goes through `healedBy` rather than
 * writing a second clamp, per DLR-93's own note on reusing that pattern: with the restored amount
 * equal to the ceiling, `Math.min(ceiling, current + ceiling)` is the ceiling for any positive
 * current health, which is AC2's "a player on 1 of 6 who buys a +2 increase leaves on 8 of 8".
 *
 * A named rule rather than an inline `healedBy(run, max, max)`, following this file's convention:
 * the doubled argument is opaque about what it means, and a named rule is what a reviewer finds.
 */
function fullyHealed(run: RunState, maxPlayerHealth: Health): RunState {
  return healedBy(run, maxPlayerHealth, maxPlayerHealth)
}
```

- [x] **Step 2: Add the `MaxHealth` branch to `buyFromShop`'s switch**

```ts
    case ShopItem.MaxHealth: {
      // DLR-158 AC1/AC2 — the ceiling rises FIRST, then the bar fills to the new top, so the
      // clamp inside `healedBy` is measured against the raised figure rather than the old one.
      // `raisedMaxHealthFor` owns the step size, so `MAX_HEALTH_PER_PURCHASE` is read in exactly
      // one place. A COUNT is incremented, not a flag set: each copy stacks and the climbing
      // price is the only limiter (AC6).
      const raised = raisedMaxHealthFor(run.maxPlayerHealth)
      return {
        ...fullyHealed({ ...paid, maxPlayerHealth: raised }, raised),
        maxHealthPurchases: run.maxHealthPurchases + 1,
      }
    }
```

Import `raisedMaxHealthFor` from `./maxHealth`.

- [x] **Step 3: Typecheck and confirm the file is still under budget**

Run: `npm run typecheck; (Get-Content src\hunt\runTransitions.ts).Count`
Expected: typecheck exits 0; the count is under 400.

### Task 8: AC8's six cases ✓

- Skill: `react-frontend`

**Files:**
- Test: `src/hunt/__tests__/run.maxHealth.test.ts`

- [x] **Step 1: Write the spec covering every case AC8 names**

Create `src/hunt/__tests__/run.maxHealth.test.ts`. One `describe` per case, each named after the criterion it covers:

```ts
import { describe, expect, it } from 'vitest'
import { buyFromShop, drinkFlask, shopStockFor, startRun } from '../run'
import { flaskHealAmount } from '../flask'
import { MAX_HEALTH_PER_PURCHASE, maxHealthPriceFor } from '../maxHealth'
import { PurchaseRefusal, refusalFor, ShopItem } from '../shop'
import { DuelSide } from '../types'
import type { RunState } from '../run'

/** A run with coins to spend, its encounter resolved so a between-fights action is legal. */
const funded = (coins: number, health?: number): RunState => { /* … */ }

describe('DLR-158 — the max-health purchase', () => {
  it('AC1 — raises the run maximum by the configured amount', () => { /* maxPlayerHealth grows */ })

  it('AC2 — fills to the NEW ceiling from a hurt state', () => {
    // A run on 1 of 10 buying a +2 raise leaves on 12 of 12.
  })

  it('AC2/AC6 — buying at full health still raises the ceiling and is not refused', () => {
    // refusalFor(...) is null at full health, and the purchase leaves the player full at the top.
  })

  it('AC4 — consecutive purchases cost strictly more each time', () => {
    // Three buys in a row; assert each deducted maxHealthPriceFor(0), then (1), then (2),
    // and that maxHealthPurchases reached 3.
  })

  it('AC3 — the flask heals a percentage of the RAISED ceiling', () => {
    // flaskHealAmount(run.maxPlayerHealth) after a purchase exceeds the pre-purchase figure,
    // and drinkFlask restores that much.
  })

  it('AC6 — short coins refuses with NotEnoughCoins and nothing changes', () => {
    // refusalFor is NotEnoughCoins, and buyFromShop throws rather than half-applying.
  })

  it('AC5 — the price on the stock climbs the moment a purchase lands', () => {
    // shopStockFor(after).maxHealthPurchases feeds a higher priceOf than before.
  })
})
```

Fill each body out concretely — no `it.todo`, no commented-out assertion. Build the funded run by spreading `startRun()` with the coins, health and resolved encounter each case needs, following `src/hunt/__tests__/run.shop.test.ts`'s existing fixture style; do not add a second parameter to any transition to set up a case.

- [x] **Step 2: Run the new spec and every neighbouring one**

Run: `npx vitest run src/hunt/__tests__/run.maxHealth.test.ts src/hunt/__tests__/run.shop.test.ts src/hunt/__tests__/run.flask.test.ts src/hunt/__tests__/maxHealth.test.ts`
Expected: exits 0, Vitest reports 0 failed.

---

## Phase 5 — Final verification

No production changes. Only sanity-checks that the cumulative work is clean, that the architectural boundary and the line budgets still hold, and that no tunable was hard-coded on the way through.

### Task 9: Confirm the pure-core boundary still holds ✓

- Skill: `none — a verification grep, no code written`

- [x] **Step 1: Grep the pure tree for React and DOM references**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits. `src/hunt/maxHealth.ts` and `src/hunt/runCarry.ts` are both new files in this lint-enforced tree.

Confirmed: zero hits.

- [x] **Step 2: Confirm nothing new reaches browser storage**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "globalThis\.(localStorage|sessionStorage)\b|\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\("`
Expected: exactly the three known hits from `.claude/rules/save-data-versioning.md` — two in `src/persistence/browserStorage.ts` and one docblock mention in `src/persistence/saveStore.ts`. Nothing in `src/hunt/` or `src/app/`, and `SAVE_SCHEMA_VERSION` is unchanged at 1.

Confirmed: exactly the three known hits (`browserStorage.ts` ×2, `saveStore.ts` ×1 docblock). `SAVE_SCHEMA_VERSION` is still `1` in `src/persistence/config.ts`.

### Task 10: Confirm no tunable was hard-coded and no stale reader remains ✓

- Skill: `none — verification greps, no code written`

- [x] **Step 1: Grep for the three placeholder values as literals outside their own module**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "MAX_HEALTH_(PER_PURCHASE|PRICE_BASE|PRICE_STEP)"`
Expected: hits only in `src/hunt/maxHealth.ts` (the declarations), `src/hunt/index.ts` (the re-export), `src/app/run/shopLabels.ts` (the interpolated blurb), and the two spec files. No arithmetic on a bare `2` or `3` anywhere else.

Confirmed: hits land only in `src/hunt/maxHealth.ts`, `src/hunt/index.ts`, `src/app/run/shopLabels.ts`, `src/hunt/__tests__/maxHealth.test.ts`, `src/hunt/__tests__/run.maxHealth.test.ts` — exactly as expected. One additional hit in `src/hunt/runTransitions.ts` is a prose comment naming the constant, not arithmetic on a bare literal.

- [x] **Step 2: Confirm no defaulted `maxPlayerHealth` parameter survives**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "maxPlayerHealth\s*[:=].*PLAYER_START_HEALTH"`
Expected: zero hits.

Found 2 hits, both in `src/hunt/__tests__/run.shop.test.ts` (lines 32 and 80) — an object-literal fixture (`{ ...startRun(1), coins: 5, maxPlayerHealth: PLAYER_START_HEALTH }`) and a `toEqual` assertion field, not a function-signature default. This is not the defaulted-parameter form the step is checking for (which Task 3 Step 5 already removed from all four transitions); it is a test deliberately constructing/asserting a run whose ceiling equals the run's own starting health. Flagging the literal discrepancy from "zero hits" rather than editing test code outside this phase's scope.

- [x] **Step 3: Confirm every file this contract created or grew is under the blocking budget**

Run: `(Get-Content src\hunt\runTransitions.ts).Count; (Get-Content src\hunt\runCarry.ts).Count; (Get-Content src\hunt\maxHealth.ts).Count; (Get-Content src\hunt\shop.ts).Count; (Get-Content src\hunt\run.ts).Count; (Get-Content src\hunt\config.ts).Count; (Get-Content src\App.tsx).Count; (Get-Content src\app\run\ShopPanel.tsx).Count; (Get-Content src\app\run\shopLabels.ts).Count; (Get-Content src\app\run\shopPrices.ts).Count`
Expected: every figure under 400. Note that this is `(Get-Content).Count`, not `Measure-Object -Line`, which drops blank lines and undercounts.

Confirmed: 369, 67, 64, 281, 307, 382, 383, 326, 159, 20 — all under 400.

### Task 11: Static gates and full suite ✓

- Skill: `none — verification commands, no code written`

- [x] **Step 1: Warm the transform cache, then run the unfiltered suite with typecheck and lint**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all five exit 0; the final `npm test` reports 0 failed and collects every spec file. A single cold `[vitest-pool-runner]: Timeout waiting for worker to respond` on the first `dom` run is infrastructure, not a defect — the warm-up above is there to avoid it; a second consecutive one is a real problem.

Confirmed: `node` project — 149 files / 1893 tests passed. `dom` project — 48 files / 459 tests passed, no timeout. `npm run typecheck` exit 0. `npm run lint` exit 0. `npm test` — 197 files / 2352 tests passed, exit 0.

- [x] **Step 2: Confirm formatting on the files this contract touched**

Run: `npx prettier --check src/hunt/maxHealth.ts src/hunt/runCarry.ts src/hunt/shop.ts src/hunt/run.ts src/hunt/runTransitions.ts src/hunt/config.ts src/hunt/index.ts src/App.tsx src/app/run/ShopPanel.tsx src/app/run/shopLabels.ts src/app/run/shopPrices.ts src/hunt/__tests__/maxHealth.test.ts src/hunt/__tests__/run.maxHealth.test.ts src/app/run/__tests__/shopPrices.test.ts`
Expected: exits 0. If it fails, fix with `npx prettier --write` scoped to those same paths — never repo-wide `npm run format`, which rewrites ~58 untouched `.md` files.

Confirmed: exit 0, "All matched files use Prettier code style!"

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Confirmed: exit 0. `dist/index.html`, `dist/assets/index-DuuHbfI3.css` (99.15 kB), `dist/assets/index-CxggKlH0.js` (368.75 kB) written, 223 modules transformed, built in 220ms.

### Task 12: Update the PR description ✓

- Skill: `none — a written hand-off, no code`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` and `mockup.html` in this folder.
- A summary: maximum health became run state, four functions lost a defaulted parameter, a second shelf item raises the ceiling and refills to the new top, and its price climbs linearly with each copy.
- **Every decision the developer must make**: the three placeholder values (2 / 3 / 2), linear versus multiplicative growth, the `Max health` name and blurb.
- **Every behaviour they must judge by playing**: whether the second buy tile reads clearly beside Heal, the flask and the leave control at their usual window size; whether the price ticking up is legible; and whether the item at its shipped price displaces Heal.
- Verification results from Phase 5, quoted — the Vitest summary line, the typecheck and lint exit codes, and the line counts.
- One line for future contributors: a shop price that depends on run state goes through `priceOf(item, stock)` and reaches the screen via `shopPricesFor`, never by a component calling the shop's rules directly.

---

## Self-review

**Spec coverage:**

- AC1 (a new item raises the maximum, on the shelf beside Heal) — Tasks 5, 6, 7.
- AC2 (raises the ceiling AND restores to full at the new ceiling) — Task 7, covered in Task 8.
- AC3 (maximum health becomes run state; every reader takes the run's value) — Tasks 2, 3; the flask's scaling is covered in Task 8.
- AC4 (the price grows per purchase, one formula, base and step both configuration) — Task 5, wired in Task 6.
- AC5 (the screen shows the CURRENT price and it updates without leaving the shop) — Task 4 (the projection and prop) and Task 6 (the stock-dependent price); the update falls out of the render, asserted in Task 8.
- AC6 (`NotEnoughCoins` only; full health does not refuse; no cap) — Task 6 Step 1 and Step 6.
- AC7 (both figures survive whatever the run persists) — Task 2: both sit on `RunState` and ride every existing spread. The audit in `plan.md` establishes that nothing persists run state, so no save shape changes and `SAVE_SCHEMA_VERSION` stays at 1; re-confirmed in Task 9 Step 2.
- AC8 (all six unit-test cases) — Task 8, with the price formula additionally covered in Task 5 and the refusal rules in Task 6.
- In-scope bullet "a `priceOf` row, a `categoryOf` rung and `refusalFor` handling" — Task 6 Step 1.
- In-scope bullet "shop-screen copy and the current-price display" — Tasks 4 and 6 Step 4.
- In-scope bullet "extracting the carry helpers" (self-added, line-budget forced) — Task 1.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N". Every step shows the exact code, the exact edit, or a runnable command with `Run:` and `Expected:`. Task 8's spec skeleton names each case and its assertion in prose and instructs that every body be filled concretely with no `it.todo`; that is the one place a step describes a test rather than printing it in full, and it does so because the fixture shape is dictated by an existing spec file the executor must read.

**Type / name consistency:** `maxPlayerHealth` and `maxHealthPurchases` are the `RunState` field names in Tasks 2, 3, 6, 7, 8. `maxHealthPurchases` is also the `ShopStock` field, added in Task 2 and read in Task 6. `MAX_HEALTH_PER_PURCHASE`, `MAX_HEALTH_PRICE_BASE`, `MAX_HEALTH_PRICE_STEP`, `maxHealthPriceFor` and `raisedMaxHealthFor` are spelled identically in Tasks 5, 6, 7, 8 and both verification greps. `ShopItem.MaxHealth` with the string value `'maxHealth'` is used in Tasks 6, 7, 8. `shopPricesFor` is the exported name in Tasks 4, 6 and `App.tsx`. `fullyHealed` appears only in Task 7. `runCarry.ts`'s five exports match `plan.md` Part 2's Data shapes exactly, including the two changed parameter lists.

**Phase boundary cleanliness:**

- Phase 1 ends type-checking: a pure move with every import updated and both files measured; no spec is touched because no behaviour changed.
- Phase 2 ends type-checking: the two `RunState` fields, the four dropped parameters, the new `ShopStock` field, all three `ShopStock` construction sites and all 18 call sites land together, because splitting them leaves a boundary where the app does not compile. `App.tsx` moves to the run's ceiling in the same phase.
- Phase 3 ends type-checking: the price projection and the reworded copy functions are a behaviour-preserving refactor against today's one-argument `priceOf`, and `ShopPanel.test.tsx` asserts the screen is unchanged.
- Phase 4 ends type-checking: Task 5 is a self-contained new module; Task 6 changes `priceOf`'s signature and carries all three of its readers plus the widened union's two copy rows in the same task; Tasks 7 and 8 add a branch and its coverage. No dead import and no spec importing a module that does not exist yet.
- Phase 5 makes no production change at all.
