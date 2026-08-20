# Tasks: Whetstone — run-permanent bank-climb buff

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-19
Phase 2 (+ Task 5b) completed: 2026-08-19 — see Implementer Report for the Task 6 Step 2 grep note

**Goal:** Fill the shop's empty run-permanent shelf with a 4-coin Whetstone that can be bought repeatedly, each copy permanently raising the bank's per-trick climb by 1 while leaving the multiplier alone.

**Spec:** `plan.md` in this folder. Layout reference: `mockup.html` in this folder.

> **Note on approval:** the developer pre-authorised this contract in chat on 2026-08-19 ("when the plan is ready run `/fb-apply` … I'll review in the morning") rather than at an interactive `AskUserQuestion` gate. `plan.md` and `mockup.html` were therefore **not** individually confirmed before this file was written. The mockup is published and linked in the plan folder for review after the fact.

---

## File map

**Created:** *(none — no new files)*

**Modified:**
- `src/hunt/config.ts` — add `WHETSTONE_PRICE`
- `src/hunt/index.ts` — re-export `WHETSTONE_PRICE` and `bankClimbBonusFor`
- `src/hunt/shop.ts` — add `ShopItem.Whetstone`; `SHOP_ITEMS`, `priceOf`, `categoryOf`
- `src/hunt/run.ts` — `RunState.whetstones`, `startRun`, `buyFromShop` branch, `bankClimbBonusFor`
- `src/warCouncil/bank.ts` — `TrickFacts.bankClimbBonus`; `bankAdded = 1 + bonus` in the taken branch
- `src/warCouncil/legalMoves.ts` — `PlayCardOptions.bankClimbBonus`
- `src/warCouncil/playCard.ts:108-119` — fill `bankClimbBonus` from options
- `src/app/warCouncilMount.ts` — `WarCouncilMountProps.bankClimbBonus`
- `src/app/warCouncil/roundUiState.ts` — `RoundUiSeed` / `RoundUiState` / `createRoundUiState`
- `src/app/warCouncil/roundReducer.ts:222-236` — rename `poisonOptions` → `playOptions`, add the field
- `src/app/warCouncil/WarCouncilRound.tsx` — accept and seed the new prop
- `src/app/run/shopLabels.ts` — `SHOP_WHETSTONE_LABEL`, `SHOP_ITEM_NAME`, `SHOP_ITEM_BLURB`
- `src/app/run/ShopPanel.tsx` — `whetstones` prop and its purse cell
- `src/App.tsx` — `whetstones`, the `refusals` entry, `bankClimbBonus`
- `src/hunt/__tests__/shop.test.ts:217` — repoint the empty run-permanent assertion
- `src/hunt/__tests__/run.test.ts` — stacking purchase, carry across `advanceRun`
- `src/warCouncil/__tests__/bank.test.ts:16` — one line on the `facts()` factory, plus new specs
- `src/app/run/__tests__/shopLabels.test.ts` — the new item's name and blurb
- `src/app/run/__tests__/ShopPanel.test.tsx:42-45,198-200` — `noRefusals` entry; the shelf now has an item

**Deleted:** *(none)*

**Developer decides or observes:**
- Final copy for the item name `Whetstone`, its blurb, and the `Whetstones held` purse label — all marked `PLACEHOLDER`. No engine behaviour depends on any of them.
- Whether the purse row still reads well at **five** cells (it was four). Named in `plan.md` → Risks; this is a look-at-it question, not a functional one.
- Whether 4 coins and `(1 + copies) × n²` pace correctly in play — a full six-trick streak goes 36 → 72 (one copy) → 108 (two). Feel, not correctness.
- Whether `SHOP_CATEGORY_EMPTY` should survive now that no reachable shelf is empty. This contract keeps the copy and its label spec; see `plan.md` → Risks.

---

## Phase 1 — The item exists and can be bought

Everything in `src/hunt/`: the price, the catalogue entry, the shelf assignment, the run-level count, and the one statement of what a copy is worth. A safe stopping point because it type-checks on its own — `ShopItem` widening forces the two label maps and `App.tsx`'s `refusals` record to grow, so Task 3 lands in this phase too, and nothing in `src/warCouncil/` has changed yet. At the end of this phase a Whetstone is purchasable and stacks; it just does not do anything yet.

### Task 1: Add `WHETSTONE_PRICE` and `ShopItem.Whetstone` to the run-permanent rung ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/shop.ts`
- Modify: `src/hunt/index.ts`
- Modify: `src/hunt/__tests__/shop.test.ts:217`
- Config: `src/hunt/config.ts` — add `WHETSTONE_PRICE` (value 4, transcribed, NOT a developer decision)

- [x] **Step 1: Add the price key to `src/hunt/config.ts`, beside `POISON_GUARD_PRICE`**

```ts
// DLR-92 AC1 — the Whetstone's price. TRANSCRIBED from version-4-scope.md §1's own heading
// ("Run-permanent — new item: Whetstone (placeholder name), 4 coins"), which prices it as "the
// shop's one real splurge": four times a Heal, and reachable early only via the quick-kill payout
// rather than by grinding 1-coin fight wins. NOT chosen here and NOT an open tuning value. Its own
// key for the reason every other item's price already has one: re-pricing one item must not move
// another.
// UNIT: coins per purchase.
export const WHETSTONE_PRICE: Coins = 4
```

- [x] **Step 2: Add the union member, the catalogue entry, the price case and the rung case in `src/hunt/shop.ts`**

Import `WHETSTONE_PRICE` in the existing `./config` import. Then:

```ts
export const ShopItem = {
  Cheat: 'cheat',
  Envenom: 'envenom',
  PoisonGuard: 'poisonGuard',
  Whetstone: 'whetstone',
  Heal: 'heal',
} as const
```

`SHOP_ITEMS` gains `ShopItem.Whetstone` **before** `ShopItem.Heal` — that file's own comment requires the Heal stay last, because `UNCATEGORISED_SHOP_ITEMS` derives from this order. Update its docblock count ("four now" → "five now").

In `priceOf`:

```ts
    case ShopItem.Whetstone:
      return WHETSTONE_PRICE
```

In `categoryOf`, filling the rung DLR-89 left empty:

```ts
    // DLR-92 AC1 — the run-permanent rung, which DLR-89 built and left empty for exactly this.
    case ShopItem.Whetstone:
      return ShopCategory.RunPermanent
```

Leave `refusalFor`, `ShopStock` and `PurchaseRefusal` **untouched**: stacking is uncapped, so `NotEnoughCoins` is the only refusal that can fire.

- [x] **Step 3: Re-export `WHETSTONE_PRICE` from `src/hunt/index.ts`**

Add `WHETSTONE_PRICE,` to the existing `export { … } from './config'` block, beside `POISON_GUARD_PRICE`.

- [x] **Step 4: Repoint the assertion that the run-permanent rung is empty**

In `src/hunt/__tests__/shop.test.ts`, line 217 currently reads
`expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.RunPermanent]).toEqual([])`. Change it to
`expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.RunPermanent]).toEqual([ShopItem.Whetstone])` and adjust
the surrounding `it(...)` name so it no longer claims the rung is empty. Leave the
`GamePermanent`/`toEqual([])` assertion on the next line alone, and leave lines 222-228's derived
cross-check alone — it passes unchanged, which is the point of it.

- [x] **Step 5: Add specs for the price and the rung**

In `src/hunt/__tests__/shop.test.ts`, inside the existing `priceOf` and `categoryOf` describes:

```ts
  it('DLR-92 AC1 — prices the Whetstone from WHETSTONE_PRICE', () => {
    expect(priceOf(ShopItem.Whetstone)).toBe(WHETSTONE_PRICE)
  })

  it('DLR-92 AC1 — puts the Whetstone on the run-permanent rung', () => {
    expect(categoryOf(ShopItem.Whetstone)).toBe(ShopCategory.RunPermanent)
  })
```

Import `WHETSTONE_PRICE` from `../config` (or `../index`, matching however that file already imports the sibling prices).

- [x] **Step 6: Run the shop spec and the fast gate**

Run: `npx vitest run src/hunt/__tests__/shop.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0. A `TS2741`/`TS2345` on a missing `whetstone` key in `src/app/run/shopLabels.ts` or `src/App.tsx` at this point is EXPECTED and is fixed in Task 3 — note it and continue.

### Task 2: Carry the owned count on `RunState` and state what a copy is worth ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/run.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/run.test.ts`

- [x] **Step 1: Write the failing specs for stacking and for surviving a fight boundary**

In `src/hunt/__tests__/run.test.ts`, following however that file already drives a run to a won encounter for its `advanceRun` specs (reuse its existing helper rather than writing a new one):

```ts
  it('DLR-92 AC2 — a Whetstone is buyable more than once and the count stacks', () => {
    const run = { ...startRun(), coins: WHETSTONE_PRICE * 2 }
    const one = buyFromShop(run, ShopItem.Whetstone)
    const two = buyFromShop(one, ShopItem.Whetstone)
    expect(one.whetstones).toBe(1)
    expect(two.whetstones).toBe(2)
    expect(two.coins).toBe(0)
  })

  it('DLR-92 AC2 — the third copy is refused only for coins, never a cap', () => {
    const broke = { ...startRun(), coins: 0, whetstones: 5 }
    expect(refusalFor(shopStockFor(broke), ShopItem.Whetstone)).toBe(PurchaseRefusal.NotEnoughCoins)
    const flush = { ...broke, coins: WHETSTONE_PRICE }
    expect(refusalFor(shopStockFor(flush), ShopItem.Whetstone)).toBeNull()
  })

  it('DLR-92 AC3 — the count survives advanceRun, exactly as coins do', () => {
    // …drive to a won encounter using this file's existing helper, with whetstones: 2 set…
    expect(advanceRun(won).whetstones).toBe(2)
  })

  it('DLR-92 AC2 — bankClimbBonusFor is +1 per copy and 0 with none', () => {
    expect(bankClimbBonusFor(startRun())).toBe(0)
    expect(bankClimbBonusFor({ ...startRun(), whetstones: 3 })).toBe(3)
  })
```

- [x] **Step 2: Run them and confirm they fail for the right reason**

Run: `npx vitest run src/hunt/__tests__/run.test.ts`
Expected: non-zero exit. The failures name `whetstones` / `bankClimbBonusFor` as missing — a *transform* error naming a different file is a different problem, so read the output before implementing.

- [x] **Step 3: Add the field, the starting value, the purchase branch and the exported rule**

In `src/hunt/run.ts`, `RunState` gains:

```ts
  /** DLR-92 AC2/AC3 — Whetstones owned. A COUNT, not a flag: each copy stacks, and the price is
   *  the only limiter. Run-level like `coins` rather than on `EncounterState`, and carried by
   *  `advanceRun`'s and `recordEncounter`'s spread — a run-permanent buff that reset at a fight
   *  boundary would be a fight-long one. Unlike `cheats`, `envenomCharges` and `poisonGuardHeld`
   *  it is NEVER handed back by a hand, because a hand cannot spend one. NEVER persisted, exactly
   *  as `coins` above. */
  readonly whetstones: number
```

`startRun` gains `whetstones: 0`. `buyFromShop`'s `switch` gains, before the `Heal` case:

```ts
    case ShopItem.Whetstone:
      return { ...paid, whetstones: run.whetstones + 1 }
```

And, beside `shopStockFor`:

```ts
/**
 * DLR-92 AC2 — THE statement of "each Whetstone adds +1 to the bank's per-trick climb", so the
 * rule is stated once rather than at whichever wiring site happens to need it. `App` reads this
 * and hands the RESULT to the card layer as a plain number, which is what keeps `src/warCouncil/`
 * free of `RunState` (AC4). The multiplier-side twin named as future scope would contribute its
 * own figure through a sibling of this function, never by reinterpreting this one.
 */
export function bankClimbBonusFor(run: RunState): number {
  return run.whetstones
}
```

Do **not** add a sixth parameter to `recordEncounter` and do **not** touch `advanceRun`: both already carry the field through `...run`.

- [x] **Step 4: Export `bankClimbBonusFor` from `src/hunt/index.ts`**

Add it to the existing `export { … } from './run'` block, beside `shopStockFor`.

- [x] **Step 5: Run the run spec and the fast gate**

Run: `npx vitest run src/hunt/__tests__/run.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed. `typecheck` may still report the missing label-map and `refusals` keys from Task 1 — those are Task 3's.

### Task 3: Name it on the shop screen and show the stacking count ✓

- Skill: game-ux

**Files:**
- Modify: `src/app/run/shopLabels.ts`
- Modify: `src/app/run/ShopPanel.tsx`
- Modify: `src/App.tsx`
- Test: `src/app/run/__tests__/shopLabels.test.ts`
- Test: `src/app/run/__tests__/ShopPanel.test.tsx`

- [x] **Step 1: Add the copy to `src/app/run/shopLabels.ts`**

```ts
/** DLR-92 — the purse cell for Whetstones owned, so a player deciding on another copy can see what
 *  they already hold. A count with no denominator, exactly as `SHOP_ENVENOM_LABEL`: there is no cap.
 *  PLACEHOLDER copy. */
export const SHOP_WHETSTONE_LABEL = 'Whetstones held'
```

`SHOP_ITEM_NAME` gains `[ShopItem.Whetstone]: 'Whetstone', // PLACEHOLDER copy — the developer's call`.
`SHOP_ITEM_BLURB` gains:

```ts
  [ShopItem.Whetstone]:
    'Every trick you take banks one more, for the rest of the run. Buy it again to stack it.', // PLACEHOLDER copy
```

The blurb quotes no number, so it interpolates nothing — the price is rendered by `priceText` as it is for every other item.

- [x] **Step 2: Add the purse cell to `src/app/run/ShopPanel.tsx`**

`ShopPanelProps` gains, after `poisonGuardHeld`:

```ts
  /** DLR-92 AC2 — Whetstones owned, so the player can see what they already hold before buying
   *  another. A count with no denominator, exactly as `envenomCharges`: there is no cap. */
  readonly whetstones: number
```

Destructure it, and add a fifth cell after the Poison Guard cell, following the existing cells verbatim in shape (layout per `mockup.html`'s purse row):

```tsx
          <span className="shop-purse-cell">
            <span className="shop-purse-label">{SHOP_WHETSTONE_LABEL}</span>
            <span className="shop-purse-value">{whetstones}</span>
          </span>
```

Import `SHOP_WHETSTONE_LABEL` from `./shopLabels`. Add **no** per-item markup: the Whetstone's card is already rendered by the existing `SHOP_ITEMS_BY_CATEGORY[selectedCategory].map(renderItem)`, which is what DLR-89's derived catalogue was built for. Check `src/app/run/shop.css`'s `.shop-purse` rule wraps or flexes at five cells rather than overflowing; if it needs a change, change only that rule and do not introduce a new size literal — the developer owns any new bound (`plan.md` → Risks).

- [x] **Step 3: Wire it in `src/App.tsx`**

Add `[ShopItem.Whetstone]: refusalFor(stock, ShopItem.Whetstone),` to the `refusals` record, `whetstones={run.whetstones}` to `<ShopPanel …>`, and — this line is Phase 2's payoff but belongs in the same wiring edit — `bankClimbBonus={bankClimbBonusFor(run)}` to `<WarCouncilRound …>`. Import `bankClimbBonusFor` from `./hunt`. The `WarCouncilRound` prop does not exist until Phase 2 Task 5, so leave this line commented with a `// Phase 2` marker if the executor prefers a type-clean intermediate state, and uncomment it in Task 5.

- [x] **Step 4: Fix the total-record fixture and repoint the empty-shelf test**

In `src/app/run/__tests__/ShopPanel.test.tsx`, `noRefusals` (lines 42-45) gains `[ShopItem.Whetstone]: null,` — without it the file will not compile. Then the test at lines 198-200, which selects the run-permanent tab and expects `SHOP_CATEGORY_EMPTY`, is rewritten to assert the shelf now sells something:

```tsx
  it('DLR-92 — the run-permanent shelf sells the Whetstone', () => {
    render(<ShopPanel {...props} />)
    fireEvent.click(screen.getByRole('tab', { name: SHOP_CATEGORY_LABEL[ShopCategory.RunPermanent] }))
    expect(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Whetstone, null) }),
    ).toBeTruthy()
  })
```

Match the file's existing render/click idiom rather than the sketch above where they differ. Add one more, for the purse cell:

```tsx
  it('DLR-92 — shows how many Whetstones are held', () => {
    render(<ShopPanel {...props} whetstones={2} />)
    expect(screen.getByText(SHOP_WHETSTONE_LABEL)).toBeTruthy()
  })
```

Remove `SHOP_CATEGORY_EMPTY` from this file's imports only if nothing else in it still uses the constant.

- [x] **Step 5: Add the label spec**

In `src/app/run/__tests__/shopLabels.test.ts` — the existing "names every SHOP_ITEMS member" loop already covers the new name and needs no edit. Add:

```ts
  it('DLR-92 — blurbs the Whetstone as stacking, without quoting a price', () => {
    expect(SHOP_ITEM_BLURB[ShopItem.Whetstone]).toContain('stack')
    expect(SHOP_ITEM_BLURB[ShopItem.Whetstone]).not.toContain(String(WHETSTONE_PRICE))
  })
```

- [x] **Step 6: Run the three shop-side specs and the fast gate**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.test.tsx src/app/run/__tests__/shopLabels.test.ts src/hunt/__tests__/shop.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0 with no remaining missing-key errors from Task 1.

---

## Phase 2 — The buff changes the arithmetic

The card layer. `bank.ts` learns a bonus number, `playCard` passes one, and the route from `RunState` to that number is completed through the mount, the seed and the reducer. The boundary is safe because Phase 1 left a purchasable item that did nothing, and this phase makes it do something without changing what it costs or where it sells. Every step here type-checks on completion of its own task.

### Task 4: Read a bank-climb bonus in `resolveTrickBank` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/bank.ts`
- Modify: `src/warCouncil/legalMoves.ts`
- Modify: `src/warCouncil/playCard.ts:108-119`
- Test: `src/warCouncil/__tests__/bank.test.ts`

- [x] **Step 1: Add the required field to `TrickFacts` and one line to the test factory**

In `src/warCouncil/bank.ts`, `TrickFacts` gains:

```ts
  /** DLR-92 AC4 — extra bank added by a TAKEN trick, on top of the trick's own 1. A plain number
   *  handed in, never a run figure read: this module must not learn what bought it, which is why
   *  it is not called a Whetstone count. 0 is the bare rule. The MULTIPLIER is unaffected (AC5). */
  readonly bankClimbBonus: number
```

Update that interface's docblock, which currently says "seven facts", to eight. In
`src/warCouncil/__tests__/bank.test.ts`, the `facts()` factory at line 16 gains `bankClimbBonus: 0,`
and its docblock's "seven facts" becomes "eight facts". **Nothing else in that file changes at this
step** — AC6's `[1, 4, 9, 16, 25, 36]` spec at line 112 is not touched, and it must still pass.

- [x] **Step 2: Write the failing specs for one copy, two stacked, the untouched multiplier, and a poisoned bonus**

Append to `bank.test.ts`'s `resolveTrickBank` describe:

```ts
  it.each([
    { bonus: 0, payouts: [1, 4, 9, 16, 25, 36] },
    { bonus: 1, payouts: [2, 8, 18, 32, 50, 72] },
    { bonus: 2, payouts: [3, 12, 27, 48, 75, 108] },
  ])(
    'DLR-92 AC2/AC7 — a bank-climb bonus of $bonus pays (1 + bonus) × n² across a streak',
    ({ bonus, payouts }) => {
      const got: number[] = []
      let state = { bank: 0, multiplier: 0 }
      for (let n = 1; n <= 6; n++) {
        const taken = resolveTrickBank(state, facts({ playerWon: true, bankClimbBonus: bonus }))
        state = { bank: taken.bank, multiplier: taken.multiplier }
        got.push(resolveTrickBank(state, facts({ bankClimbBonus: bonus })).cashOut)
      }
      expect(got).toEqual(payouts)
    },
  )

  it('DLR-92 AC4 — one copy banks 2 a trick and two copies bank 3', () => {
    expect(resolveTrickBank(START, facts({ playerWon: true, bankClimbBonus: 1 })).bankAdded).toBe(2)
    expect(resolveTrickBank(START, facts({ playerWon: true, bankClimbBonus: 2 })).bankAdded).toBe(3)
  })

  it('DLR-92 AC5 — the multiplier climbs by exactly 1 whatever the bonus', () => {
    for (const bonus of [0, 1, 5]) {
      const r = resolveTrickBank({ bank: 4, multiplier: 2 }, facts({ playerWon: true, bankClimbBonus: bonus }))
      expect(r.multiplier).toBe(3)
    }
  })

  it('DLR-92 — a bonus is never added to a trick that is not taken', () => {
    const r = resolveTrickBank({ bank: 3, multiplier: 3 }, facts({ bankClimbBonus: 4 }))
    expect(r.bankAdded).toBe(0)
    expect(r.cashOut).toBe(9)
  })

  it('DLR-92 — a bonus that is not a positive integer floors to the bare rule', () => {
    for (const bonus of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      const r = resolveTrickBank(START, facts({ playerWon: true, bankClimbBonus: bonus }))
      expect(r.bankAdded).toBe(1)
      expect(Number.isFinite(r.bank)).toBe(true)
    }
  })
```

- [x] **Step 3: Run them and confirm they fail on the arithmetic, not on a transform error**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts`
Expected: non-zero exit, with the bonus cases failing on the payout numbers and the `bonus: 0` row plus the untouched AC6 spec both PASSING. If the file reports "Transform failed" instead, the factory edit in Step 1 is wrong — fix that before going on.

- [x] **Step 4: Implement the arithmetic in the taken branch**

In `resolveTrickBank`, replace the `bankAdded = 1` line (and extend the comment above it) with:

```ts
    // PT-002 — the bank counts TRICKS, not card values, so the base is 1 and that is not a config
    // key: 1 is what counting a trick means. DLR-92 AC4 adds the run's bank-climb bonus on top,
    // so a streak of n now cashes (1 + bonus) × n².
    //
    // Floored to 0 unless it is a positive integer. `bankAdded` feeds `bank`, then `bank ×
    // multiplier`, then damage, then a rendered heart row — so a NaN or a fraction would vanish
    // into a health bar with nothing logged (`web-project.md` → "NaN propagates silently"). It
    // degrades to the bare pre-DLR-92 rule rather than throwing, because mid-trick is the wrong
    // place to abort a hand.
    const bonus =
      Number.isInteger(trick.bankClimbBonus) && trick.bankClimbBonus > 0 ? trick.bankClimbBonus : 0
    bankAdded = 1 + bonus
    bank += bankAdded
    // AC5 — UNCHANGED, and deliberately so: the multiplier-side twin is a separate future item.
    multiplier += 1
```

- [x] **Step 5: Widen `PlayCardOptions` and fill the fact in `playCard`**

In `src/warCouncil/legalMoves.ts`, `PlayCardOptions` gains:

```ts
  /** DLR-92 AC4 — the bank-climb bonus in force for this hand. Handed IN for the reason this
   *  interface's docblock already gives: it is a run figure and `src/warCouncil/` must not learn
   *  `RunState`. Absent means 0, so the Quarry's own call sites stay untouched. */
  readonly bankClimbBonus?: number
```

In `src/warCouncil/playCard.ts`, the `resolveTrickBank` facts object gains
`bankClimbBonus: options?.bankClimbBonus ?? 0,` after `poisonGuarded`.

- [x] **Step 6: Run the card-layer specs and the fast gate**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts src/warCouncil/__tests__/playCard.test.ts src/warCouncil/__tests__/resolveTrick.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed, including the unedited `[1, 4, 9, 16, 25, 36]` spec.

### Task 5: Thread the bonus from the run to the reducer ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncilMount.ts`
- Modify: `src/app/warCouncil/roundUiState.ts`
- Modify: `src/app/warCouncil/roundReducer.ts:222-236`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: Add the mount prop**

In `src/app/warCouncilMount.ts`, `WarCouncilMountProps` gains, after `poisonGuardHeld`:

```ts
  /** DLR-92 AC4 — the bank-climb bonus in force for this hand, ALREADY RESOLVED from the run's
   *  Whetstone count by `bankClimbBonusFor`. A number, not a `RunState` and not an item count: the
   *  card layer renders a run figure and must not learn what bought it. REQUIRED rather than
   *  optional so the compiler enumerates every mount site instead of letting one silently fight
   *  without the buff. Unlike `envenomCharges` and `poisonGuardHeld` it does NOT come back on
   *  `WarCouncilRoundResult` — a hand cannot spend it. */
  readonly bankClimbBonus: number
```

`WarCouncilRoundResult` is **not** changed.

- [x] **Step 2: Seed it onto the UI state**

In `src/app/warCouncil/roundUiState.ts`: `RoundUiSeed` gains `readonly bankClimbBonus: number`;
`RoundUiState` gains the same field with a docblock noting it is read-only for the hand's whole life
and never written by any action; `createRoundUiState` gains `bankClimbBonus: seed.bankClimbBonus,`.
The initialiser stays a pure restructuring of its seed, so StrictMode's double invocation still
recomputes an identical value.

- [x] **Step 3: Rename `poisonOptions` → `playOptions` and add the field**

In `src/app/warCouncil/roundReducer.ts`, rename the helper at line ~222 and both of its call sites
(the player's follow in `commit` and `advanceQuarryFollow`), update its docblock to say it assembles
every `PlayCardOptions` field rather than only the poison ones, and add:

```ts
    bankClimbBonus: state.bankClimbBonus,
```

- [x] **Step 4: Accept and pass the prop in `WarCouncilRound.tsx`**

Destructure `bankClimbBonus` from props and add it to the `createRoundUiState` seed object at line
~82, beside `poisonGuardHeld`. The two `onComplete` result objects (lines ~192 and ~206) are **not**
changed — nothing is handed back.

- [x] **Step 5: Complete the `App.tsx` wiring**

Uncomment (or add) `bankClimbBonus={bankClimbBonusFor(run)}` on `<WarCouncilRound …>`, per Task 3
Step 3. This is the only place `RunState` and the card layer meet, and the crossing is a number.

- [x] **Step 6: Run the reducer and mount specs and the fast gate**

Run: `npx vitest run src/app/warCouncil/__tests__ src/__tests__/App.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0. A missing-prop error on a `WarCouncilRound`
or `createRoundUiState` call inside a test file is a real find — fix the fixture, do not make the
prop optional.

### Task 5b: Split DLR-92's Whetstone specs out of `run.test.ts` to stay under the 400-line budget ✓

- Skill: react-frontend

**Files:**
- Create: `src/hunt/__tests__/run.whetstone.test.ts`
- Modify: `src/hunt/__tests__/run.test.ts`

- [x] **Step 1: Move the four Whetstone specs Phase 1 added into a new sibling file**
- [x] **Step 2: Follow `playCard.envenom.test.ts`'s precedent — duplicate small local helpers rather than importing across spec files**
- [x] **Step 3: One-line header comment on the new file stating why it is separate**
- [x] **Step 4: Measure both files**

Run: `(Get-Content src\hunt\__tests__\run.test.ts).Count`; `(Get-Content src\hunt\__tests__\run.whetstone.test.ts).Count`
Result: `run.test.ts` 397 lines; `run.whetstone.test.ts` 68 lines. Both under 400.

- [x] **Step 5: Run both files**

Run: `npx vitest run src/hunt/__tests__/run.test.ts src/hunt/__tests__/run.whetstone.test.ts`
Result: 2 files passed, 38 tests passed, 0 failed — the same total test count as before the split (4 specs moved, none lost).

---

## Phase 3 — Final verification

No production changes. Confirms the purity boundary still holds, no tunable was hard-coded, no file breached its budget, and the cumulative work is clean.

### Task 6: Confirm the purity boundary and the file budget ✓
- Skill: none — verification greps and line counts only, no code written

**Files:**
- Modify: *(none)*

- [x] **Step 1: Confirm no React import or DOM global entered the pure trees**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 2: Confirm the card layer never learned the shop's vocabulary**

Run: `Get-ChildItem src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "[Ww]hetstone|RunState" | Where-Object { $_.Line -notmatch '^\s*(//|\*|/\*)' }`
Expected: zero hits **in code**. Any hit means AC4's boundary was crossed and the fix is to rename to `bankClimbBonus`, not to widen the grep.

The comment-line exclusion is deliberate and was **corrected mid-run on 2026-08-19**: this plan's own required docblocks in `bank.ts` and `legalMoves.ts` name both words as prose explaining *why* the boundary exists ("it is not called a Whetstone count"; "`src/warCouncil/` must not learn `RunState`"), so the original bare `Select-String` with an "Expected: zero hits" line contradicted the code the same plan prescribed. The check that matters is whether an import, a type annotation, or an identifier binds to either name — not whether a comment mentions one. Two comment-only hits are the expected, correct result.

- [x] **Step 2b: Confirm no import in the card layer reaches the run module**

Run: `Get-ChildItem src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "^\s*import .*(hunt/run|RunState)"`
Expected: zero hits. `bank.ts` importing `DAMAGE_PER_HIT` and `DuelSide` from `'../hunt'` is pre-existing and correct — the boundary this contract must not cross is the run's *shape*, not the hunt barrel.

- [x] **Step 3: Confirm the price is not hard-coded anywhere outside its key**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "WHETSTONE_PRICE"`
Expected: hits only in `src/hunt/config.ts` (the declaration), `src/hunt/index.ts` (the re-export), `src/hunt/shop.ts` (`priceOf`), and test files. No literal `4` standing in for it in `shopLabels.ts` or any component.

- [x] **Step 4: Measure every file this contract grew**

Run: `foreach ($f in "src\hunt\run.ts","src\hunt\shop.ts","src\hunt\config.ts","src\warCouncil\bank.ts","src\app\warCouncil\roundReducer.ts","src\app\warCouncil\roundUiState.ts","src\app\run\ShopPanel.tsx","src\App.tsx","src\warCouncil\__tests__\bank.test.ts") { "$f  $((Get-Content $f).Count)" }`
Expected: every count under 400. `roundReducer.ts` opened at 388 and is the one at real risk — if it exceeds 400, stop and report it rather than trimming a docblock to squeeze under; the fix is a split and that is a design change (`plan.md` → Risks).

### Task 7: Static gates, full suite and build ✓
- Skill: none — runner invocations only, no code written

**Files:**
- Modify: *(none)*

- [x] **Step 1: Warm the Vitest cache one project at a time**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. A single cold `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project is infrastructure, not a test failure — re-run that project once before treating it as real.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. Quote the `Tests  N passed` line.

- [x] **Step 3: Formatting, scoped to the files this contract touched**

Run: `npx prettier --check src\hunt\config.ts src\hunt\shop.ts src\hunt\run.ts src\hunt\index.ts src\warCouncil\bank.ts src\warCouncil\legalMoves.ts src\warCouncil\playCard.ts src\app\warCouncilMount.ts src\app\warCouncil\roundUiState.ts src\app\warCouncil\roundReducer.ts src\app\warCouncil\WarCouncilRound.tsx src\app\run\shopLabels.ts src\app\run\ShopPanel.tsx src\App.tsx`
Expected: exits 0. The repo-wide `npm run format:check` fails on pre-existing `.docs/**` files this contract has not touched — do not "fix" that.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 8: Update the PR description ✓
- Skill: none — a document for the developer, no code written

**Files:**
- Create: `.claude/contract/DLR-92-whetstone-run-permanent-bank-climb/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` and `mockup.html` in this folder.
- What changed: the 4-coin Whetstone on the run-permanent shelf, stacking, and `(1 + copies) × n²` on an unbroken streak.
- The route the bonus takes from `RunState` to `resolveTrickBank`, and the one sentence on why the card layer sees a number called `bankClimbBonus` rather than a Whetstone count.
- Every entry from this file's "Developer decides or observes" list, verbatim — the placeholder copy, the five-cell purse row, the pacing question, and the `SHOP_CATEGORY_EMPTY` reachability question.
- The verification results from Phase 3, with real numbers.
- A one-line note for future contributors: a new run-permanent buff is added by extending `bankClimbBonusFor`, not by threading a second prop through the mount.

---

## Self-review

**Spec coverage:**
- `WHETSTONE_PRICE` config key (AC1) — Task 1.
- `ShopItem.Whetstone` on the run-permanent rung (AC1) — Task 1.
- Buyable more than once, stacking, no cap (AC2) — Task 2; rendered in Task 3.
- Carried on `RunState`, survives `advanceRun` (AC3) — Task 2.
- `resolveTrickBank` adds `1 + count`, with no `RunState` dependency in `src/warCouncil/` (AC4) — Tasks 4 and 5; enforced by Task 6 Step 2.
- Multiplier unaffected, no twin item (AC5) — Task 4 Steps 2 and 4.
- The existing `[1, 4, 9, 16, 25, 36]` spec passes unedited (AC6) — Task 4 Steps 1 and 3 state it explicitly; Task 7 Step 2 confirms it in the full suite.
- Coverage for one copy, two stacked, and the unchanged multiplier (AC7) — Task 4 Step 2.
- Shop-screen surface and its consumers — Task 3.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact edit, or a runnable command with `Run:` / `Expected:`. No step runs bare `vitest` or `npm run dev`, hand-edits `package-lock.json`, invents a tuning value, or reaches for an `eslint-disable`.

**Type / name consistency:** `WHETSTONE_PRICE`, `ShopItem.Whetstone`, `RunState.whetstones`, `bankClimbBonusFor`, `TrickFacts.bankClimbBonus`, `PlayCardOptions.bankClimbBonus`, `WarCouncilMountProps.bankClimbBonus`, `RoundUiSeed.bankClimbBonus`, `RoundUiState.bankClimbBonus`, `playOptions`, `SHOP_WHETSTONE_LABEL`, and `ShopPanelProps.whetstones` are each spelled identically in every task that names them, and each matches `plan.md` → Data shapes. The two vocabularies are deliberately different across the boundary — `whetstones` on the `hunt` side, `bankClimbBonus` from `App.tsx` inward — and Task 6 Step 2 enforces that split rather than trusting it.

**Phase boundary cleanliness:**
- **Phase 1** ends with the item purchasable and stacking, every widened total map filled, and both repointed shelf assertions green. `typecheck` is clean at the end of Task 3 — the one intentional intermediate break (the missing label-map keys after Task 1) is named in Task 1 Step 6 and closed inside the same phase. No half-applied rename, no dead import.
- **Phase 2** ends with the bonus reaching `resolveTrickBank` and every mount site passing the required prop. Task 4 leaves `src/warCouncil/` self-consistent on its own (the field is required on `TrickFacts`, optional on `PlayCardOptions`, so nothing outside that module must change for it to compile); Task 5 completes the wiring.
- **Phase 3** changes no production code — greps, line counts, gates, build, and one document.
