# Tasks: Earn coins and buy a Cheat card or a heal between fights

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-16

**Goal:** Give the run a coin balance paid for beating an opponent, and a shop screen of its own — reached by choice from the verdict, guarded by a warning when the player walks past it with something affordable — selling a Cheat into a free slot or 4 health restored immediately, each priced from configuration and each refusable with a stated reason.

**Spec:** `plan.md` in this folder. Layout and interaction: `mockup.html` in this folder (approved at the 2026-08-16 gate, after the developer's red-line made the shop opt-in behind a `Continue` / `Shop` pair with an unspent-coin warning).

---

## File map

**Created:**
- `src/hunt/shop.ts` — the catalogue, `priceOf`, `refusalFor`, `canBuyAnything`, and the `ShopStock` snapshot
- `src/hunt/__tests__/shop.test.ts` — every refusal, its ordering, and the price lookup
- `src/app/run/ShopPanel.tsx` — the shop screen: purse row, two purchase cards, refusal sentences, leave control
- `src/app/run/shopLabels.ts` — every user-visible string on the shop screen
- `src/app/run/shop.css` — `.shop-*` rules; reuses `.run-shell` and `.run-btn` from `run.css`
- `src/app/run/__tests__/ShopPanel.test.tsx` — the two purchases, the refusals, the leave control, `Escape`
- `src/app/run/__tests__/shopLabels.test.ts` — refusal copy is total and distinct; blurbs quote configuration

**Modified:**
- `src/hunt/types.ts` — add the `Coins` type
- `src/hunt/config.ts` — add `COINS_PER_ENCOUNTER_WIN`, `CHEAT_PRICE`, `HEAL_PRICE`, `HEAL_HEALTH_RESTORED`
- `src/hunt/__tests__/config.test.ts` — pin the four new keys' shape
- `src/hunt/run.ts` — `RunState.coins`, the payout in `recordEncounter`, `shopStockFor`, `buyFromShop`
- `src/hunt/__tests__/run.test.ts` — the payout, the carry, the clamp, the refusal throws
- `src/hunt/index.ts` — barrel exports for everything new
- `src/app/run/runLabels.ts` — `CONTINUE_LABEL`, `SHOP_LABEL`, `VISIT_SHOP_LABEL`, `CONTINUE_ANYWAY_LABEL`, `unspentCoinsText`
- `src/app/run/__tests__/runLabels.test.ts` — the new labels are distinct; the warning sentence names the balance
- `src/app/run/RunOutcomePanel.tsx` — `coins`, `warning`, `onShop`, `onDismissWarning`; `onNextFight` → `onContinue`
- `src/app/run/run.css` — the `.run-warning` / `.run-warning-text` block for the unspent-coin warning
- `src/app/run/__tests__/RunOutcomePanel.test.tsx` — the two forward controls and the warning's swap
- `src/App.tsx` — the `BetweenPhase` union, the shop mount, the warning gate, the purchase handler
- `src/app/warCouncilMount.ts` — `coins` on `WarCouncilMountProps`
- `src/app/warCouncil/WarCouncilRound.tsx` — thread `coins` to the status band
- `src/app/warCouncil/RoundStatusBand.tsx` — the `.wc-coins` plate
- `src/app/warCouncil/labels.ts` — `COINS_PLATE_LABEL`
- `src/app/warCouncil/warCouncil.css` — the `.wc-coins` block beside `.wc-run`
- `src/app/warCouncil/__tests__/roundFixture.ts` — `coinsFixture`
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` — supply `coins` at the mount site
- `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx` — supply `coins` at three mount sites

**Deleted:** (none)

**Developer decides or observes:**
- **Copy** — `SHOP_TITLE`, `SHOP_ITEM_NAME`, `SHOP_ITEM_BLURB`, the three `PURCHASE_REFUSAL_MESSAGE` sentences, `CONTINUE_LABEL`, `SHOP_LABEL`, `VISIT_SHOP_LABEL`, `CONTINUE_ANYWAY_LABEL`, `unspentCoinsText`, `COINS_PLATE_LABEL`. All placeholder, marked as such in the files.
- **Every `clamp()` bound and every hue** in `src/app/run/shop.css` and the new `.wc-coins` block. Transcribed from `mockup.html`; yours to retune.
- **Whether the warning is a safety net or a nag.** It fires on every visit where anything is affordable, which with a 1-coin payout and 1-coin prices is every unspent visit. A threshold or removing it is one line in `App.tsx`'s `handleContinue`.
- **Whether `Escape` should dismiss the warning or mean "continue anyway".** Built as dismiss.
- **Whether 4 health per fight is the right answer** to DLR-82's predicted fight-three wall. `QUARRY_ENCOUNTER_HEALTH` is deliberately not retuned here.
- **The ticket's own pricing watch:** if you buy Heal on every single visit, the Cheat is mispriced, not uninteresting. `CHEAT_PRICE` and `HEAL_PRICE` are separate keys so the fix is one line.
- **Whether the `Continue` / `Shop` pair reads at a glance**, and whether the two purchase cards and their refusal sentences are legible. QA confirms they render and commit; feel is yours.

---

## Phase 1 — The economy, inside the pure core

Everything in this phase lands in `src/hunt/`, which `eslint.config.js` holds DOM-free and React-free. No component is touched, so the app compiles and plays exactly as it does today at the end of it — the new exports simply have no caller yet. Every task here has a testable invariant, so all four follow the test-first shape.

### Task 1: Add the `Coins` type and the four shop tunables to `src/hunt/` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/types.ts`
- Test: `src/hunt/__tests__/config.test.ts`
- Config: `src/hunt/config.ts` — add `COINS_PER_ENCOUNTER_WIN`, `CHEAT_PRICE`, `HEAL_PRICE`, `HEAL_HEALTH_RESTORED` (all four values transcribed from the ticket, none invented)

- [x] **Step 1: Add the `Coins` type to `src/hunt/types.ts`, below `Health`**

```ts
/** The run's spendable currency (DLR-84). A whole number of coins, never fractional and never
 *  negative — `buyFromShop` refuses a purchase it cannot pay for rather than going below zero. */
export type Coins = number
```

- [x] **Step 2: Add the four keys to `src/hunt/config.ts`, after `RUN_STARTING_CHEATS`**

Import `Coins` alongside the existing `Health`/`Damage` type imports on line 1.

```ts
// DLR-84 AC1 — what beating an opponent pays. TRANSCRIBED FROM THE TICKET (developer's
// specification, 2026-08-15), not chosen here. Credited by `recordEncounter`, which is the one
// place a fight is known to have been won.
// UNIT: coins, credited once per encounter won.
export const COINS_PER_ENCOUNTER_WIN: Coins = 1

// DLR-84 AC3 — the shop's two prices. Both TRANSCRIBED, both 1, and deliberately TWO keys rather
// than one shared price: the ticket predicts the player buying Heal every visit and names
// re-pricing the Cheat as the one-line answer, which is only one line if they are separate.
// UNIT: coins per purchase.
export const CHEAT_PRICE: Coins = 1
export const HEAL_PRICE: Coins = 1

// DLR-84 AC4 — health restored by one Heal, BEFORE the clamp to PLAYER_START_HEALTH. TRANSCRIBED.
// The ONLY source of healing in the game: the ticket states there is no flask and no rest site,
// and `ENCOUNTER_PLAYER_RESTORE` above stays deliberately unread.
// UNIT: health points, added once on purchase.
export const HEAL_HEALTH_RESTORED: Health = 4
```

- [x] **Step 3: Pin the four keys in `src/hunt/__tests__/config.test.ts`**

Assert the shape rather than the developer's values — the numbers are theirs to retune and a test that pins `1` turns a one-line re-price into a two-line one. Add:

```ts
describe('DLR-84 shop tunables', () => {
  it('prices both items and the payout as non-negative whole numbers of coins', () => {
    for (const value of [COINS_PER_ENCOUNTER_WIN, CHEAT_PRICE, HEAL_PRICE]) {
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })

  it('restores a positive, finite amount of health that cannot exceed the player maximum in one buy', () => {
    expect(HEAL_HEALTH_RESTORED).toBeGreaterThan(0)
    expect(Number.isFinite(HEAL_HEALTH_RESTORED)).toBe(true)
    expect(HEAL_HEALTH_RESTORED).toBeLessThanOrEqual(PLAYER_START_HEALTH)
  })
})
```

- [x] **Step 4: Run the config spec and the fast gate**

Run: `npx vitest run src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0 with no errors.

### Task 2: Write `src/hunt/shop.ts` — the catalogue and the single refusal predicate ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/shop.ts`
- Test: `src/hunt/__tests__/shop.test.ts`

- [x] **Step 1: Write the failing spec at `src/hunt/__tests__/shop.test.ts`**

Cover: `SHOP_ITEMS` holds exactly the two members; `priceOf` reads configuration for each; `refusalFor` returns `null` when affordable and available; `SlotsFull` when `cheatCount >= CHEAT_SLOT_COUNT`; `AlreadyFullHealth` when `playerHealth >= maxPlayerHealth`; `NotEnoughCoins` when `coins < priceOf(item)`; **the ordering** — with full slots *and* zero coins, buying a Cheat returns `SlotsFull`, not `NotEnoughCoins`; a `NaN` coin balance returns `NotEnoughCoins` rather than passing the comparison; and `canBuyAnything` is `false` only when *both* items refuse.

```ts
import { describe, expect, it } from 'vitest'
import { CHEAT_PRICE, CHEAT_SLOT_COUNT, HEAL_PRICE } from '../config'
import {
  canBuyAnything,
  priceOf,
  PurchaseRefusal,
  refusalFor,
  SHOP_ITEMS,
  ShopItem,
  type ShopStock,
} from '../shop'

const stock = (over: Partial<ShopStock> = {}): ShopStock => ({
  coins: 5,
  cheatCount: 0,
  playerHealth: 6,
  maxPlayerHealth: 10,
  ...over,
})

it('names the slots before the coins when both refuse (the durable reason wins)', () => {
  expect(refusalFor(stock({ coins: 0, cheatCount: CHEAT_SLOT_COUNT }), ShopItem.Cheat)).toBe(
    PurchaseRefusal.SlotsFull,
  )
})
```

- [x] **Step 2: Run the spec and watch it fail to resolve the module**

Run: `npx vitest run src/hunt/__tests__/shop.test.ts`
Expected: non-zero exit, reporting a failure to resolve `../shop` — the module does not exist yet.

- [x] **Step 3: Write `src/hunt/shop.ts`**

Imports only `./config` and `./types` — no React, no DOM global, so the `src/hunt/**` lint override holds.

```ts
import { CHEAT_PRICE, CHEAT_SLOT_COUNT, HEAL_PRICE } from './config'
import type { Coins, Health } from './types'

export const ShopItem = {
  Cheat: 'cheat',
  Heal: 'heal',
} as const
export type ShopItem = (typeof ShopItem)[keyof typeof ShopItem]

/** AC3 — exactly two, in the order the screen renders them. THE statement of the catalogue: a
 *  screen maps this, it never lists the two items itself. */
export const SHOP_ITEMS: readonly ShopItem[] = [ShopItem.Cheat, ShopItem.Heal]

/** Why a purchase cannot be made. A reason CODE, not a sentence — `src/hunt/` holds no
 *  user-facing copy; `src/app/run/shopLabels.ts` maps these to words. */
export const PurchaseRefusal = {
  SlotsFull: 'slotsFull',
  AlreadyFullHealth: 'alreadyFullHealth',
  NotEnoughCoins: 'notEnoughCoins',
} as const
export type PurchaseRefusal = (typeof PurchaseRefusal)[keyof typeof PurchaseRefusal]

/** Everything the refusal rules need, and nothing else. Deliberately NOT `RunState`: this module
 *  states the shop's rules and must not learn the run's shape. `run.ts`'s `shopStockFor` builds it. */
export interface ShopStock {
  readonly coins: Coins
  readonly cheatCount: number
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
}

/** Total over `ShopItem`, so adding a third item is a compile error here rather than an
 *  `undefined` price at runtime. */
export function priceOf(item: ShopItem): Coins {
  switch (item) {
    case ShopItem.Cheat:
      return CHEAT_PRICE
    case ShopItem.Heal:
      return HEAL_PRICE
  }
}

/**
 * THE single statement of whether a purchase is available (AC6/AC7), read by `buyFromShop`
 * (which throws on a non-null result) and by the screen (which disables the control and prints
 * the reason). Two readings of one rule, never two rules.
 *
 * Item-specific reasons come BEFORE the coin check deliberately: with full slots and no coins,
 * the slots are the reason that will still be true when the coin arrives.
 *
 * A non-finite balance refuses rather than passing the comparison — `NaN >= 1` is `false`, which
 * would otherwise read as "not enough coins" by accident and hide a poisoned figure.
 */
export function refusalFor(stock: ShopStock, item: ShopItem): PurchaseRefusal | null {
  if (item === ShopItem.Cheat && stock.cheatCount >= CHEAT_SLOT_COUNT) {
    return PurchaseRefusal.SlotsFull
  }
  if (item === ShopItem.Heal && stock.playerHealth >= stock.maxPlayerHealth) {
    return PurchaseRefusal.AlreadyFullHealth
  }
  if (!Number.isFinite(stock.coins) || stock.coins < priceOf(item)) {
    return PurchaseRefusal.NotEnoughCoins
  }
  return null
}

/**
 * Whether ANY item is purchasable right now — `some()` over `refusalFor`, never a second reading
 * of the rules. THE predicate the verdict's `Continue` warning fires on: a player holding a coin
 * with full slots and full health has nothing to stop for, and a warning they cannot act on is
 * noise.
 */
export function canBuyAnything(stock: ShopStock): boolean {
  return SHOP_ITEMS.some((item) => refusalFor(stock, item) === null)
}
```

- [x] **Step 4: Re-run the spec and the fast gate**

Run: `npx vitest run src/hunt/__tests__/shop.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 3: Give `RunState` a purse, pay it on a win, and spend it ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/run.ts`
- Test: `src/hunt/__tests__/run.test.ts`

- [x] **Step 1: Write the failing specs in `src/hunt/__tests__/run.test.ts`**

Cover: `startRun` opens on 0 coins; `recordEncounter` credits `COINS_PER_ENCOUNTER_WIN` when the adopted encounter resolves with `winner === DuelSide.Player`; it credits **nothing** when the encounter is still live, and nothing when the Quarry won; `advanceRun` carries the balance untouched; `buyFromShop(run, ShopItem.Cheat)` deducts `CHEAT_PRICE` and lengthens `cheats` by one with a **fresh id** taken from `nextCheatId`, which advances; `buyFromShop(run, ShopItem.Heal)` raises player health by `HEAL_HEALTH_RESTORED`; the **clamp** — from `maxPlayerHealth - 1`, one Heal lands exactly on `maxPlayerHealth` and the surplus leaves no trace anywhere in the returned state (AC4); buying twice in one visit works when the coins allow (AC8); and each of the three refusals throws a `RangeError` whose message contains the reason code, with the run left unmodified.

```ts
it('mints a fresh id for a bought Cheat, so a spent card cannot be re-issued', () => {
  const run = { ...startRun(), coins: 5 }
  const bought = buyFromShop(run, ShopItem.Cheat)
  expect(bought.nextCheatId).toBe(run.nextCheatId + 1)
  expect(bought.cheats.map((c) => c.id)).toContain(run.nextCheatId)
})

it('discards overheal rather than exceeding the maximum (AC4)', () => {
  const run = { ...startRun(9), coins: 5 }
  const healed = buyFromShop(run, ShopItem.Heal, 10)
  expect(healed.encounter.health[DuelSide.Player]).toBe(10)
})
```

- [x] **Step 2: Run the specs and watch them fail**

Run: `npx vitest run src/hunt/__tests__/run.test.ts`
Expected: non-zero exit — `buyFromShop`, `shopStockFor` and `RunState.coins` do not exist yet.

- [x] **Step 3: Add `coins` to `RunState` and seed it in `startRun`**

```ts
  /** AC2 — the run's purse. Starts at 0, credited by `recordEncounter` on a won encounter, spent
   *  by `buyFromShop`, and carried through `advanceRun` untouched by the spread. NEVER persisted:
   *  the ticket puts cross-run carry-over out of scope. */
  readonly coins: Coins
```

In `startRun`'s returned object, alongside `cheats` and `nextCheatId`: `coins: 0,`.

- [x] **Step 4: Credit the payout inside `recordEncounter`**

The single payout point — the one place `outcomeFor` already decides a fight was won, and a function that already refuses a finished run. Replace the returned object with:

```ts
  // AC1 — THE payout, here and nowhere else. `advanceRun` would never pay for the final fight of
  // a won run, and the driver is a component and must not hold the rule.
  const wonThisEncounter = encounter.winner === DuelSide.Player
  return {
    ...run,
    encounter,
    cheats,
    coins: wonThisEncounter ? run.coins + COINS_PER_ENCOUNTER_WIN : run.coins,
    outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter),
  }
```

- [x] **Step 5: Add `shopStockFor` and `buyFromShop` below `advanceRun`**

```ts
/** Projects a run into the four figures the shop's rules need, so no screen assembles a
 *  `ShopStock` by hand and gets one field wrong. */
export function shopStockFor(run: RunState, maxPlayerHealth: Health = PLAYER_START_HEALTH): ShopStock {
  return {
    coins: run.coins,
    cheatCount: run.cheats.length,
    playerHealth: run.encounter.health[DuelSide.Player],
    maxPlayerHealth,
  }
}

/**
 * AC4/AC5/AC7 — the purchase. Throws a `RangeError` naming the `PurchaseRefusal` rather than
 * returning the run unchanged: a silent no-op is exactly the "took payment for nothing" failure
 * `cheats.ts`'s `addCheat` already refuses to allow. Reaching the throw is a driver bug, because
 * the control is disabled whenever `refusalFor` is non-null.
 *
 * The heal writes into `encounter.health[Player]` because that IS the carried figure — this
 * module's own docblock states a second copy beside it is the number that drifts, and
 * `advanceRun` seeds the next fight from it. It deliberately does NOT go through `applyDamage`,
 * which refuses a resolved encounter: a restore is not a damage event.
 *
 * `maxPlayerHealth` is a defaulted parameter, matching `startEncounter`/`startRun`'s injectable
 * pattern, so a spec varies the clamp without mutating module state.
 */
export function buyFromShop(
  run: RunState,
  item: ShopItem,
  maxPlayerHealth: Health = PLAYER_START_HEALTH,
): RunState {
  if (!Number.isFinite(maxPlayerHealth) || maxPlayerHealth <= 0) {
    throw new RangeError(
      `Cannot buy against a maximum health of ${maxPlayerHealth}: it must be a positive finite number`,
    )
  }
  const refusal = refusalFor(shopStockFor(run, maxPlayerHealth), item)
  if (refusal !== null) {
    throw new RangeError(
      `Cannot buy ${item} — ${refusal} (holding ${run.coins} coins, ${run.cheats.length} Cheats, ${run.encounter.health[DuelSide.Player]} of ${maxPlayerHealth} health)`,
    )
  }
  const paid = { ...run, coins: run.coins - priceOf(item) }
  if (item === ShopItem.Cheat) {
    return {
      ...paid,
      cheats: addCheat(run.cheats, { id: run.nextCheatId }),
      nextCheatId: run.nextCheatId + 1,
    }
  }
  return {
    ...paid,
    encounter: {
      ...run.encounter,
      health: {
        ...run.encounter.health,
        // THE clamp, and therefore also the single place overheal is discarded (AC4).
        [DuelSide.Player]: Math.min(
          maxPlayerHealth,
          run.encounter.health[DuelSide.Player] + HEAL_HEALTH_RESTORED,
        ),
      },
    },
  }
}
```

Extend the imports at the top of the file: `COINS_PER_ENCOUNTER_WIN` and `HEAL_HEALTH_RESTORED` from `./config`, `addCheat` from `./cheats`, and `priceOf`, `refusalFor`, `ShopItem`, `type ShopStock` from `./shop`; add `type Coins` to the `./types` import.

- [x] **Step 6: Re-run the run spec and the fast gate**

Run: `npx vitest run src/hunt/__tests__/run.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

- [x] **Step 7: Confirm `run.ts` is inside the file budget**

Run: `(Get-Content src\hunt\run.ts).Count`
Expected: under 400. (`Measure-Object -Line` drops blank lines and undercounts — do not use it.)

### Task 4: Export the economy from the `src/hunt/` barrel ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/index.ts`

- [x] **Step 1: Add the new exports**

```ts
export type { Coins } from './types'
```
appended to the existing `export type { … } from './types'` line's list, and:

```ts
export {
  // …existing config exports…
  COINS_PER_ENCOUNTER_WIN,
  CHEAT_PRICE,
  HEAL_PRICE,
  HEAL_HEALTH_RESTORED,
} from './config'

export type { ShopStock } from './shop'
export { ShopItem, SHOP_ITEMS, PurchaseRefusal, priceOf, refusalFor, canBuyAnything } from './shop'

export { RunOutcome, startRun, recordEncounter, canAdvanceRun, advanceRun, shopStockFor, buyFromShop } from './run'
```

- [x] **Step 2: Typecheck and run both `src/hunt/` specs**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/`
Expected: `tsc -b` exits 0; Vitest reports 0 failed.

---

## Phase 2 — The shop screen

The screen and its copy, built and tested in isolation. Nothing mounts `ShopPanel` yet, so `App.tsx` is untouched and the app still plays as it does today — the phase ends type-checking with a component that has a spec and no caller. It is the first `.tsx` work in this contract, so its specs go in the `dom` Vitest project (`*.test.tsx`, which `vite.config.ts` already collects under jsdom) and query by role and accessible name.

### Task 5: Write `src/app/run/shopLabels.ts` — every string on the shop screen ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/run/shopLabels.ts`
- Test: `src/app/run/__tests__/shopLabels.test.ts`

- [x] **Step 1: Write the failing spec at `src/app/run/__tests__/shopLabels.test.ts`**

Cover: `PURCHASE_REFUSAL_MESSAGE` has an entry for every `PurchaseRefusal` member and all three differ; `SHOP_ITEM_NAME` covers every `SHOP_ITEMS` member and the two differ; `SHOP_ITEM_BLURB[ShopItem.Heal]` **contains `String(HEAL_HEALTH_RESTORED)`** so a re-tuned key cannot leave the screen quoting an old number; `shopItemAccessibleName` produces a different string with a refusal than without; `nextOpponentText` still reads sensibly with `undefined` for the name.

- [x] **Step 2: Run the spec and watch it fail to resolve the module**

Run: `npx vitest run src/app/run/__tests__/shopLabels.test.ts`
Expected: non-zero exit, failing to resolve `../shopLabels`.

- [x] **Step 3: Write `src/app/run/shopLabels.ts`**

Header docblock states, as `runLabels.ts` already does, that ALL COPY IS PLACEHOLDER and the wording is the developer's.

```ts
import {
  HEAL_HEALTH_RESTORED,
  priceOf,
  PurchaseRefusal,
  ShopItem,
  type Coins,
  type Health,
} from '../../hunt'

export const SHOP_TITLE = 'Between fights'
export const SHOP_COINS_LABEL = 'Coins'
export const SHOP_HEALTH_LABEL = 'Health'
export const SHOP_SLOTS_LABEL = 'Cheat slots'
export const SHOP_NOTHING_TO_BUY_HINT = 'Buy nothing and carry the coin if you would rather.'

export const SHOP_ITEM_NAME: Readonly<Record<ShopItem, string>> = {
  [ShopItem.Cheat]: 'Cheat',
  [ShopItem.Heal]: 'Heal',
}

/** Built FROM the configuration keys, never from a literal, so re-pricing or re-tuning the heal
 *  does not leave the screen quoting a number the engine no longer uses. */
export const SHOP_ITEM_BLURB: Readonly<Record<ShopItem, string>> = {
  [ShopItem.Cheat]: 'A card for a slot. Play it later to ignore follow-suit.',
  [ShopItem.Heal]: `Restore ${HEAL_HEALTH_RESTORED} health, now. Anything over your maximum is lost.`,
}

/** AC6 — the reason, in words. Total over `PurchaseRefusal`, so a fourth reason code is a
 *  compile error here rather than a blank sentence on screen. */
export const PURCHASE_REFUSAL_MESSAGE: Readonly<Record<PurchaseRefusal, string>> = {
  [PurchaseRefusal.SlotsFull]: 'Both Cheat slots are full.',
  [PurchaseRefusal.AlreadyFullHealth]: 'You are already at full health.',
  [PurchaseRefusal.NotEnoughCoins]: 'You do not have the coins for this.',
}

export function priceText(item: ShopItem): string
export function shopItemAccessibleName(item: ShopItem, refusal: PurchaseRefusal | null): string
export function nextOpponentText(name: string | undefined, progressText: string): string
export function purseText(coins: Coins, health: Health, maxHealth: Health): string
```

Implement the four functions to satisfy the spec written in Step 1.

- [x] **Step 4: Re-run the spec and the fast gate**

Run: `npx vitest run src/app/run/__tests__/shopLabels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 6: Build `src/app/run/ShopPanel.tsx` and its stylesheet ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/run/ShopPanel.tsx`, `src/app/run/shop.css`
- Test: `src/app/run/__tests__/ShopPanel.test.tsx`

Layout, class names, and every `clamp()` bound come from `.claude/contract/DLR-84-earn-coins-and-buy-a-cheat-or-a-heal/mockup.html` — its `.shop-*` block and its second screen. `.run-shell` and `.run-btn` are reused unchanged from `run.css`.

- [x] **Step 1: Write the failing spec at `src/app/run/__tests__/ShopPanel.test.tsx`**

Opens `/** @vitest-environment jsdom */` and `afterEach(cleanup)`, matching `RunOutcomePanel.test.tsx`. Cover: both purchase controls render, queried by `getByRole('button', { name })` built from `shopItemAccessibleName`; a control whose `refusals` entry is non-null is `disabled` **and** its reason sentence is in the document (AC6); clicking an available control fires `onBuy` **exactly once** with the right `ShopItem`; clicking a disabled one fires nothing; the leave control fires `onLeave` once (AC9); the screen states the coming opponent, the coins and the health (AC10); `Escape` on the container fires `onLeave`; and the panel renders with `nextOpponentName={undefined}` without crashing.

- [x] **Step 2: Run the spec and watch it fail to resolve the module**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.test.tsx`
Expected: non-zero exit, failing to resolve `../ShopPanel`.

- [x] **Step 3: Write `src/app/run/ShopPanel.tsx`**

```ts
interface ShopPanelProps {
  readonly coins: Coins
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
  readonly cheatCount: number
  readonly cheatSlotCount: number
  /** AC10 — the coming opponent's display name, `undefined` while the roster has no entry.
   *  Reads "The Monarch" on every fight until DLR-85 lands the roster; that is correct today. */
  readonly nextOpponentName: string | undefined
  /** AC10 — the run's position, ALREADY WORDED by `runProgressText`. */
  readonly progressText: string
  /** One entry per `SHOP_ITEMS` member, derived by the driver from `refusalFor` — never
   *  re-derived here. `null` means the purchase is available. */
  readonly refusals: Readonly<Record<ShopItem, PurchaseRefusal | null>>
  readonly onBuy: (item: ShopItem) => void
  readonly onLeave: () => void
}
```

The component **computes nothing** — it maps `SHOP_ITEMS`, reads `refusals`, and fires two callbacks, exactly as `RunOutcomePanel` computes nothing. Structure per the mockup: `.run-shell` > `.shop` containing the title, `nextOpponentText(...)`, a `.shop-purse` `role="group"` labelled by `purseText(...)`, a `.shop-grid` of two `<button class="shop-item">` each followed by its `<p class="shop-refusal" role="status">`, the hint, and a `.run-actions` with the `NEXT_FIGHT_LABEL` button. `onKeyDown` on the container calls `onLeave` for `Escape`. Imports `./run.css` and `./shop.css`.

- [x] **Step 4: Write `src/app/run/shop.css`**

Transcribe the mockup's `.shop-*` block verbatim, with a header comment matching `run.css`'s: the source mockup path, and that every `clamp()` bound and hue is the developer's to retune. The refused state must be `border-style: dashed` **as well as** dimmed — `game-ux` forbids a state that reads only in colour.

- [x] **Step 5: Re-run the spec and the fast gate**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

- [x] **Step 6: Confirm both new files are inside the file budget**

Run: `(Get-Content src\app\run\ShopPanel.tsx).Count; (Get-Content src\app\run\shop.css).Count`
Expected: both under 400.

---

## Phase 3 — Two forward controls, the warning, and the driver

The verdict's props change and `App.tsx` adopts them in the same phase, deliberately: a `RunOutcomePanel` with a renamed `onContinue` and a new required `coins` breaks its only caller, so splitting these leaves a boundary where the app does not type-check. At the end of this phase the ticket is playable end to end — coins are earned, the shop is reachable, and purchases carry into the next fight.

### Task 7: Add the verdict's new copy to `src/app/run/runLabels.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/run/runLabels.ts`
- Test: `src/app/run/__tests__/runLabels.test.ts`

- [x] **Step 1: Add the four labels and the warning sentence**

```ts
/** The verdict's two forward controls (DLR-84, developer's gate decision 2026-08-16). The shop is
 *  OPT-IN: `Continue` goes to the fight, `Shop` goes to the shop. `NEXT_FIGHT_LABEL` above keeps
 *  its value and moves to the shop's own leave button, where it is literally true (AC9).
 *  ALL PLACEHOLDER COPY, exactly as this file's header states. */
export const CONTINUE_LABEL = 'Continue'
export const SHOP_LABEL = 'Shop'

/** The unspent-coin warning's own pair. Both must differ from the two above — a component test
 *  tells the warned verdict from the plain one by button name. */
export const VISIT_SHOP_LABEL = 'Visit the shop'
export const CONTINUE_ANYWAY_LABEL = 'Continue anyway'

/** The warning sentence. Takes the balance so it names what is being left behind; the driver
 *  decides WHETHER to warn (`canBuyAnything`), this only decides the words. */
export function unspentCoinsText(coins: Coins): string {
  return `You still have ${coins} coin${coins === 1 ? '' : 's'} to spend.`
}
```

Add `type Coins` to the existing `../../hunt` import.

- [x] **Step 2: Extend `src/app/run/__tests__/runLabels.test.ts`**

Assert all five control labels are mutually distinct (`NEXT_FIGHT_LABEL`, `NEW_RUN_LABEL`, `CONTINUE_LABEL`, `SHOP_LABEL`, `VISIT_SHOP_LABEL`, `CONTINUE_ANYWAY_LABEL`), and that `unspentCoinsText` contains the balance and reads singular at 1 and plural at 2.

- [x] **Step 3: Run the spec and the fast gate**

Run: `npx vitest run src/app/run/__tests__/runLabels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 8: Give `RunOutcomePanel` its two controls and the warning swap ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/run/RunOutcomePanel.tsx`, `src/app/run/run.css`
- Test: `src/app/run/__tests__/RunOutcomePanel.test.tsx`

- [x] **Step 1: Change the props and the actions block**

Add `coins: Coins`, `warning: boolean`, `onShop: () => void`, `onDismissWarning: () => void`, and rename `onNextFight` to `onContinue` (docblocks per `plan.md` Part 2 → Data shapes). Replace the `.run-actions` block:

```tsx
{!canContinue ? (
  <div className="run-actions">
    <button type="button" className="run-btn is-primary" onClick={onNewRun}>
      {NEW_RUN_LABEL}
    </button>
  </div>
) : warning ? (
  // An in-place swap of the two controls, NOT a modal — so there is no focus trap, no
  // document-level key listener, and nothing to clean up.
  <div className="run-warning" onKeyDown={(e) => { if (e.key === 'Escape') onDismissWarning() }}>
    <p className="run-warning-text" role="status">{unspentCoinsText(coins)}</p>
    <div className="run-actions">
      <button type="button" className="run-btn is-primary" onClick={onShop}>
        {VISIT_SHOP_LABEL}
      </button>
      <button type="button" className="run-btn" onClick={onContinue}>
        {CONTINUE_ANYWAY_LABEL}
      </button>
    </div>
  </div>
) : (
  <div className="run-actions">
    <button type="button" className="run-btn is-primary" onClick={onContinue}>
      {CONTINUE_LABEL}
    </button>
    <button type="button" className="run-btn" onClick={onShop}>
      {SHOP_LABEL}
    </button>
  </div>
)}
```

Extend the `.run-carry` line to state the coins alongside the carried health (AC2).

- [x] **Step 2: Add the `.run-warning` rules to `src/app/run/run.css`**

Transcribe the mockup's `.run-warning` / `.run-warning-text` block — a dashed bracket, so the held decision reads in greyscale as well as in colour.

- [x] **Step 3: Update and extend `src/app/run/__tests__/RunOutcomePanel.test.tsx`**

Add `coins`, `warning: false`, `onShop`, `onContinue`, `onDismissWarning` to `baseProps` and replace every `onNextFight`/`NEXT_FIGHT_LABEL` reference. New cases: a won fight offers **both** `CONTINUE_LABEL` and `SHOP_LABEL`; `warning` replaces that pair with `VISIT_SHOP_LABEL` and `CONTINUE_ANYWAY_LABEL` and neither of the first two remains queryable; the warning's sentence contains the balance; a lost run offers none of the four; `Escape` on the warning fires `onDismissWarning` exactly once.

- [x] **Step 4: Run the spec and the fast gate**

Run: `npx vitest run src/app/run/__tests__/RunOutcomePanel.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed. `tsc -b` will still report `src/App.tsx` as broken — that is Task 9's job and is expected here.

### Task 9: Wire the between-fights phase into the run driver ✓

- Skill: react-frontend

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: Add the `BetweenPhase` union at module scope, beside `HUNT` and `NO_TRICKS`**

```ts
/** Which of the three between-fights surfaces is showing. A union rather than two booleans,
 *  because "in the shop AND warned" is a state that must not exist. */
const BetweenPhase = {
  Verdict: 'verdict',
  Warned: 'warned',
  Shop: 'shop',
} as const
type BetweenPhase = (typeof BetweenPhase)[keyof typeof BetweenPhase]
```

- [x] **Step 2: Add the state and the four handlers**

```ts
const [between, setBetween] = useState<BetweenPhase>(BetweenPhase.Verdict)

// AC7 — the same predicate the shop's buttons read, so the warning cannot claim there is
// something to buy while every purchase card is greyed out.
const stock = shopStockFor(run)

// The ONE call to advanceRun. Reached from Continue on an unwarned verdict, Continue anyway on a
// warned one, and Next fight in the shop — three controls, one transition.
function leaveForNextFight() {
  setRun(advanceRun(run))
  setBetween(BetweenPhase.Verdict)
  setTricks(NO_TRICKS)
  dealNextHand()
}

function handleContinue() {
  if (between === BetweenPhase.Verdict && canBuyAnything(stock)) {
    setBetween(BetweenPhase.Warned)
    return
  }
  leaveForNextFight()
}

// AC8 — the FUNCTIONAL updater, so two clicks batched into one render cannot both compute from
// the same stale run and lose a purchase. `buyFromShop` is pure, so StrictMode's development
// double-invocation recomputes an identical value.
function handleBuy(item: ShopItem) {
  setRun((r) => buyFromShop(r, item))
}
```

`handleNewRun` also resets `setBetween(BetweenPhase.Verdict)`.

- [x] **Step 3: Mount the shop as its own screen, before the verdict branch**

```tsx
if (encounterOver && between === BetweenPhase.Shop) {
  return (
    <ShopPanel
      coins={run.coins}
      playerHealth={run.encounter.health[DuelSide.Player]}
      maxPlayerHealth={PLAYER_START_HEALTH}
      cheatCount={run.cheats.length}
      cheatSlotCount={CHEAT_SLOT_COUNT}
      nextOpponentName={quarryCharacterInfo(SLICE_QUARRY_CHARACTER)?.name}
      progressText={runProgressText(run.encounterIndex + 1, run.encounterCount)}
      refusals={{
        [ShopItem.Cheat]: refusalFor(stock, ShopItem.Cheat),
        [ShopItem.Heal]: refusalFor(stock, ShopItem.Heal),
      }}
      onBuy={handleBuy}
      onLeave={leaveForNextFight}
    />
  )
}
```

Then extend the existing `if (encounterOver)` branch's `RunOutcomePanel` with `coins={run.coins}`, `warning={between === BetweenPhase.Warned}`, `onShop={() => setBetween(BetweenPhase.Shop)}`, `onContinue={handleContinue}`, `onDismissWarning={() => setBetween(BetweenPhase.Verdict)}`.

Do **not** touch the `WarCouncilRound` element here — the felt's `coins` prop and its mount site land together in Task 10, so this phase ends type-checking rather than leaving a required prop half-applied across a boundary.

- [x] **Step 4: Typecheck and run every spec this phase touched**

Run: `npm run typecheck; npx vitest run src/app/run/__tests__/`
Expected: `tsc -b` exits 0 with no errors; Vitest reports 0 failed.

---

## Phase 4 — The purse on the felt

One string-bound thread — a required prop, its four mount sites, and the plate that renders it — done in a single task, because a required prop added without its callers leaves the phase not type-checking. This closes AC2's "visible … across the whole run": the balance is readable during the fight that is earning it, not only on the screens the player passes through.

### Task 10: Thread `coins` to the status band and render its plate ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncilMount.ts`, `src/app/warCouncil/WarCouncilRound.tsx`, `src/app/warCouncil/RoundStatusBand.tsx`, `src/app/warCouncil/labels.ts`, `src/app/warCouncil/warCouncil.css:148`, `src/App.tsx` (the `WarCouncilRound` element only)
- Test: `src/app/warCouncil/__tests__/roundFixture.ts`, `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`, `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`

- [x] **Step 1: Add the prop to `WarCouncilMountProps`**

```ts
  /** AC2 — the run's purse during a hand. A number, not a `RunState`: the same contract
   *  `runLabel` above states — the card layer renders a run figure and must not change it.
   *  Required, not optional, so the compiler enumerates every mount site rather than letting one
   *  silently render a blank plate. */
  readonly coins: Coins
```

Add `Coins` to the file's `../hunt` type import.

- [x] **Step 2: Add `COINS_PLATE_LABEL` to `src/app/warCouncil/labels.ts`**

```ts
/** The purse plate on the status band (DLR-84). PLACEHOLDER copy, as this file's other labels
 *  are. Distinct from `runLabels.ts`'s `SHOP_COINS_LABEL`: each file owns its own surface's
 *  copy, so the felt and the shop can be reworded independently. */
export const COINS_PLATE_LABEL = 'Coins'
```

- [x] **Step 3: Render the plate in `RoundStatusBand.tsx`**

Add `readonly coins: Coins` to `RoundStatusBandProps`, destructure it, and add beside the existing `.wc-run` div:

```tsx
<div className="wc-coins">
  <span className="wc-plate-label">{COINS_PLATE_LABEL}</span>
  <span className="wc-run-value">{coins}</span>
</div>
```

- [x] **Step 4: Add the `.wc-coins` block to `src/app/warCouncil/warCouncil.css`, immediately after `.wc-run` at line 148**

Mirror `.wc-run`'s own rules so the two plates read as a pair. Every value is the developer's to retune, noted in a comment. Implemented as a shared `.wc-run, .wc-coins` selector rather than a duplicated block — the file was already 2 lines under the 400-line budget (per `.wc-pile`'s own comment) and a second full block would have pushed it to 410. The `warCouncil.css:148` file map path is confirmed still current: `.wc-run,` starts at line 150 after the extended comment, `.wc-coins` joining it directly below.

- [x] **Step 5: Pass `coins` through `WarCouncilRound.tsx` and supply it in `App.tsx`**

Add `coins` to `WarCouncilRound`'s destructured props and pass `coins={coins}` to `RoundStatusBand`. Then add `coins={run.coins}` to the `WarCouncilRound` element in `src/App.tsx` — the prop and its production mount site land in the same step, so the required prop is never half-applied.

- [x] **Step 6: Supply `coins` at every test mount site**

Add `export const coinsFixture = 2` to `src/app/warCouncil/__tests__/roundFixture.ts`; add `coins={overrides.coins ?? coinsFixture}` to `WarCouncilRound.test.tsx`'s render helper; add `coins={coinsFixture}` to all three JSX mounts in `WarCouncilRound.duelHealthBars.test.tsx`. Also added a new spec asserting the coins plate renders the actual supplied value (7), scoped to `.wc-coins` to avoid colliding with the "7 of Bells" card in the fixture hand.

- [x] **Step 7: Typecheck and run every touched spec**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`
Expected: `tsc -b` exits 0 with **no** remaining errors anywhere, including `src/App.tsx`; Vitest reports 0 failed.

---

## Phase 5 — Final verification

No production changes. Only cumulative sanity checks: the purity boundary still holds, no tunable was written as a literal, and every gate is green.

### Task 11: Confirm the `src/hunt/` purity boundary still holds ✓

- Skill: none — a verification grep, no code written

- [x] **Step 1: Grep the pure tree for React and DOM references** (run by QA)

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits. (`Select-String -Path` does not recurse — the `Get-ChildItem -Recurse` form is required, per `.claude/workflow/web-project.md`.) — Confirmed clean by QA.

### Task 12: Confirm no shop tunable was hard-coded outside configuration ✓

- Skill: none — a verification grep, no code written

- [x] **Step 1: Grep source and copy for a literal heal amount or price outside `config.ts`** (run by QA)

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "COINS_PER_ENCOUNTER_WIN|CHEAT_PRICE|HEAL_PRICE|HEAL_HEALTH_RESTORED"`
Expected: every hit is an import, an export, a `config.ts` declaration, or an interpolation — **no hit is a bare number standing in for one of these keys**. In particular `SHOP_ITEM_BLURB[ShopItem.Heal]` must interpolate `HEAL_HEALTH_RESTORED` rather than quote `4`. — Confirmed clean by QA.

### Task 13: Static gates and the full suite ✓

- Skill: none — verification only, no code written

- [x] **Step 1: Warm the Vitest transform cache, then run the unfiltered suite** (run by QA)

Run: `npx vitest run --project node; npx vitest run --project dom; npm test`
Expected: all three exit 0; the final run reports 0 failed. Warming first is required, not optional: a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project, which is infrastructure and **must never be reported as a test failure** (`.claude/workflow/web-project.md`). — QA reported 581 passed across 46 files, 0 failed.

- [x] **Step 2: Typecheck and lint** (run by QA, re-confirmed by the Implementer after the review fix pass)

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. — Both exit 0 after the review fix pass.

- [x] **Step 3: Check formatting of this contract's files only** (fixed and re-confirmed by the Implementer after QA found 4 files unformatted)

Run: `npx prettier --check src/hunt/shop.ts src/hunt/run.ts src/hunt/config.ts src/hunt/types.ts src/hunt/index.ts src/App.tsx src/app/run src/app/warCouncilMount.ts src/app/warCouncil/RoundStatusBand.tsx src/app/warCouncil/WarCouncilRound.tsx src/app/warCouncil/labels.ts src/app/warCouncil/warCouncil.css`
Expected: exits 0. The repo-wide `format:check` fails on pre-existing `.docs/**` files this contract has not touched — do not "fix" those. — QA's first pass found `ShopPanel.tsx`, `ShopPanel.test.tsx`, `shopLabels.test.ts` and `RunOutcomePanel.test.tsx` unformatted; the Implementer ran `npx prettier --write` on those four and re-ran `--check` on them, exit 0, "All matched files use Prettier code style!".

- [x] **Step 4: Production build** (run by QA)

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. — Confirmed by QA.

- [x] **Step 5: Measure every file created or grown**

Run: `Get-ChildItem src\hunt\shop.ts,src\hunt\run.ts,src\App.tsx,src\app\run\ShopPanel.tsx,src\app\run\shopLabels.ts,src\app\run\RunOutcomePanel.tsx,src\app\run\runLabels.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count under 400. — Re-measured after the review fix pass: `App.tsx` 202, `ShopPanel.tsx` 133, `shopLabels.ts` 56, `shop.css` 148 — all clear.

### Task 14: Write the PR description ✓

- Skill: none — a document for the developer, no code written

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- A link to `plan.md` and `mockup.html` in this folder.
- A summary of the change: the coin, the payout point, the opt-in shop, the warning, and the felt plate.
- Every decision the developer must make and every behaviour they must judge by playing — copied from the File map's "Developer decides or observes" block, in full.
- Verification results from Phase 5, quoting the actual Vitest summary line and exit codes.
- A one-line note for future contributors on the convention introduced: **one exported predicate (`refusalFor`) is read by the transition that throws, the button that greys, and the warning that fires — never re-derived at a call site.**

Written to `pr-description.md` in this folder, after the review fix pass (cheat-slots readout wired up, the double-click race fixed, and the formatting failure resolved).

---

## Self-review

**Spec coverage:**
- *A `coins` field on `RunState`, seeded to 0 and carried across fights* — Task 3.
- *The payout at the single moment a fight is won* — Task 3 (Step 4), verified by Task 3's spec.
- *`src/hunt/shop.ts` — catalogue, price lookup, single refusal predicate* — Task 2.
- *`buyFromShop` — deduct, mint a Cheat or heal with the clamp* — Task 3 (Step 5).
- *Four configuration keys and the `Coins` type* — Task 1.
- *The shop screen, its copy, and its stylesheet* — Tasks 5 and 6.
- *Two forward controls on the verdict, and the unspent-coin warning* — Tasks 7 and 8.
- *`canBuyAnything`, the predicate the warning fires on* — Task 2.
- *The driver's between-fights phase* — Task 9.
- *A coins readout on the felt* — Task 10.
- *Vitest coverage for rules, payout, clamp, refusals, controls and copy* — Tasks 1–3 and 5–8, each inside the task that introduces the behaviour.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact edit, or a runnable command with `Run:` / `Expected:`. No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json` / `node_modules/` / `dist/`. No step invents a tuning value — all four numbers are transcribed from the ticket and their tests assert shape, not value.

**Type / name consistency:** `Coins`, `ShopItem`, `SHOP_ITEMS`, `PurchaseRefusal`, `ShopStock`, `priceOf`, `refusalFor`, `canBuyAnything`, `shopStockFor`, `buyFromShop`, `COINS_PER_ENCOUNTER_WIN`, `CHEAT_PRICE`, `HEAL_PRICE`, `HEAL_HEALTH_RESTORED`, `CONTINUE_LABEL`, `SHOP_LABEL`, `VISIT_SHOP_LABEL`, `CONTINUE_ANYWAY_LABEL`, `unspentCoinsText`, `COINS_PLATE_LABEL`, `BetweenPhase`, `coinsFixture` are each spelled identically in every task that names them and in `plan.md` Part 2 → Data shapes. `onNextFight` → `onContinue` is renamed in exactly one task (Task 8) together with its only caller's update (Task 9) and its spec.

**Phase boundary cleanliness:**
- *Phase 1* ends with `src/hunt/` complete, fully specced, and exported from the barrel; nothing imports it yet, so the app type-checks and plays unchanged.
- *Phase 2* ends with `ShopPanel` and its copy built and specced but unmounted; `App.tsx` is untouched, so the tree still type-checks.
- *Phase 3* ends with the verdict's prop change and its only caller updated together and `npm run typecheck` clean, so no half-applied rename survives the boundary. The felt's `coins` prop is deliberately held back to Task 10 so that a required prop is never introduced without its mount sites in the same task.
- *Phase 4* ends with `npm run typecheck` clean, the felt plate rendering, and the feature playable end to end.
- *Phase 5* writes no production code at all.
