# Tasks: Tiered rank abilities — refill the run-permanent shop shelf

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

> `plan.md` was NOT developer-confirmed: this ran non-interactively as part of the 2026-08-23 unattended sprint run, so `AskUserQuestion` was never presented. `mockup.html` in this folder was published but went **unseen** for the same reason.

Status: COMPLETE
Started: 2026-08-24

**Goal:** Refill the shop's run-permanent shelf with bought, run-permanent bronze/silver/gold ability tiers for the deck's named ranks, applying to the player's copies only, with the Swan ladder built in full.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/rankTiers.ts` — the tier model, the offered shelf list, and `RANK_TIER_STEP_PRICE` (AC7's single pricing point)
- `src/hunt/__tests__/rankTiers.test.ts` — the ladder's invariants
- `src/hunt/__tests__/run.rankTier.test.ts` — the purchase, the refusal, and run-permanence
- `src/warCouncil/rankTierRules.ts` — AC3's player-only gate and the Swan fact derivation
- `src/warCouncil/__tests__/rankTiers.resolution.test.ts` — AC6's resolution-layer coverage

**Modified:**
- `src/hunt/shop.ts` — two new `ShopItem` members, `SHOP_ITEMS` refilled, `priceOf` / `categoryOf` / `refusalFor` / `tieredRankOf`, `ShopStock.rankTiers`, `PurchaseRefusal.RankAtMaxTier`
- `src/hunt/run.ts` — `RunState.rankTiers`, `startRun`'s seed, `shopStockFor`, `playerRankTiersFor`
- `src/hunt/runTransitions.ts` — `buyFromShop`'s two new `switch` arms
- `src/hunt/index.ts` — re-exports
- `src/warCouncil/bank.ts` — `TrickFacts.swanKeepsMultiplier` / `swanKeepsBank` and the clean-loss rule in `resolveTrickBank`
- `src/warCouncil/resolveTrick.ts` — the `playerWitchTier` parameter and the two upgraded-Witch branches
- `src/warCouncil/legalMoves.ts` — `PlayCardOptions.playerRankTiers`
- `src/warCouncil/playCard.ts` — thread the tiers into `resolveTrickWinner` and `resolveTrickBank`
- `src/warCouncil/cpuPlayer.ts` — document the two bronze-heuristic call sites
- `src/warCouncil/index.ts` — re-exports
- `src/app/warCouncil/roundUiState.ts` — `RoundUiSeed.rankTiers?`, `RoundUiState.rankTiers`, the seed default
- `src/app/warCouncil/commitHandlers.ts` — `playOptions` folds in `playerRankTiers`
- `src/app/warCouncil/cardDamage.ts` — the preview mirrors the two new `TrickFacts` fields
- `src/app/warCouncil/WarCouncilRound.tsx` — the `rankTiers` prop
- `src/app/warCouncilMount.ts` — the `rankTiers` prop type
- `src/App.tsx` — pass `playerRankTiersFor(run)`
- `src/app/run/shopLabels.ts` — names, blurbs, and the new refusal sentence
- `src/hunt/__tests__/shop.test.ts` — the `stock()` fixture gains `rankTiers`
- `src/hunt/__tests__/run.shop.test.ts` — the hand-built `ShopStock` gains `rankTiers`
- `src/warCouncil/__tests__/bank.test.ts` — the `facts()` base literal gains the two booleans
- `src/warCouncil/__tests__/bank.integration.test.ts` — the same
- `.docs/game_rules/the-hunt.md` — §5's ability table and §7's bank/outcome rules (AC8)

**Deleted:** (none)

**Developer decides or observes:**
- `RANK_TIER_STEP_PRICE` → **5 coins per step** (10 for a full ladder). Transcribed from §7b's own reading, not chosen here. It makes one step the most expensive purchase in the game (Whetstone 4, AP capacity 3, reroll 1, `COINS_PER_ENCOUNTER_WIN` 1). §7b's two unruled alternatives are a flat 5 for the whole ladder, or an escalating 5/10/15.
- **The shelf ships Swan and Witch only.** Fox, Woodcutter, Treasure, Poison and Monarch are typed and documented but not offered. Confirm the split and how the remaining five should be ticketed.
- **Rank tiers do not stack** — two purchases per rank, maximum. Confirm the shelf is meant to have a ceiling.
- **Swan gold spares a Timebomb-forced reset when it coincides with a clean loss.** Confirm that reading.
- **The Quarry's move heuristic evaluates at bronze**, so a gold Witch is occasionally misjudged by the Quarry. Confirm that is flavour, not a bug.
- **`the-hunt.md`'s "the Quarry has no powers… no exceptions" line becomes false** and Task 11 amends it. This reverses a documented statement and is the developer's to ratify.
- **What a browser would have checked, had the browser pass been on** (it was **off** for this run): that the shop's run-permanent shelf renders four purchase cards rather than two without the panel scrolling or cropping at the target viewport; that the two tier cards read their price from `priceOf` and show "5 coins"; that buying Swan silver disables nothing and re-renders the card at silver with gold now offered; that buying gold then disables that card with the sentence "That rank is already at gold."; that the browser console stays clean across a purchase; and that a full hand can be played after a purchase with no stuck trick. **None of this was executed.** All of it is additionally covered by the specs in Tasks 3, 5, 6 and 9 at the logic layer.
- **Feel, which no automation covers:** whether 5 coins reads as steep-but-fair at the moment of purchase, and whether a gold Swan makes a clean loss feel free rather than merely cheap.

---

## Phase 1 — The tier model and the shelf, in `src/hunt/`

Everything in this phase is pure logic behind the shop's existing purchase pipeline. The boundary is safe because the run gains a field that nothing yet reads, and the shop gains two items that buy a field change and nothing else — the card layer is untouched, so the game plays exactly as it does today at the end of this phase.

### Task 1: Create the tier model in `src/hunt/rankTiers.ts`

- Skill: react-frontend

**Files:**
- Create: `src/hunt/rankTiers.ts`
- Test: `src/hunt/__tests__/rankTiers.test.ts`

- [x] **Step 1: Write the failing spec for the ladder's invariants**

`src/hunt/__tests__/rankTiers.test.ts` asserts, by behaviour and never by re-listing the constants:

```ts
// ALL_BRONZE is total over TieredRank and every entry is Bronze — AC1's "buys nothing plays as now"
// tierAtLeast(Gold, Silver) is true; tierAtLeast(Bronze, Silver) is false; every tier is >= itself
// nextTierAfter(Bronze) === Silver; nextTierAfter(Silver) === Gold; nextTierAfter(Gold) === null
// steppedTo(ALL_BRONZE, Swan) raises Swan to Silver and leaves every OTHER rank at Bronze
// steppedTo returns a NEW table — the input is not mutated
// steppedTo twice reaches Gold; a third call throws RangeError naming the rank and 'gold'
// isAtMaxTier is false at Bronze and Silver, true at Gold
// every member of TIERED_RANKS is a member of TieredRank (the shelf is a subset of the type)
// RANK_TIER_STEP_PRICE is a positive integer
```

Run: `npx vitest run src/hunt/__tests__/rankTiers.test.ts`
Expected: fails to resolve `../rankTiers` — the module does not exist yet.

- [x] **Step 2: Write `src/hunt/rankTiers.ts`**

Exactly the shapes in `plan.md` Part 2 → Data shapes → *New — `src/hunt/rankTiers.ts`*. Docblocks must state:

- why `TIERED_RANKS` is separate from `TieredRank` (the `SHOP_ITEMS` / `ShopItem` convention DLR-116 introduced), and name the five deferred ranks with the surface each is waiting on;
- why `AbilityTier` is not `BuffTier` (a rank tier must never reach `apCostOf`);
- `RANK_TIER_STEP_PRICE`'s UNIT (`coins per tier STEP`), its provenance (TRANSCRIBED from `version-5-developer-idea.md` §7b, not chosen here), and that it is AC7's single pricing point;
- why this file rather than `config.ts` (`config.ts` stands at 381 of its 400-line budget; `slotConfig.ts` and `apConfig.ts` are the precedent).

`steppedTo` throws:

```ts
throw new RangeError(
  `Cannot upgrade ${rank} beyond ${AbilityTier.Gold}: it is already at ${current}`,
)
```

- [x] **Step 3: Run the spec and the typecheck**

Run: `npx vitest run src/hunt/__tests__/rankTiers.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 2: Put the two tier items on the shelf in `src/hunt/shop.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/shop.ts`
- Test: `src/hunt/__tests__/shop.test.ts`

- [x] **Step 1: Extend the fixture and add the failing assertions to `shop.test.ts`**

Add `rankTiers: ALL_BRONZE` to the `stock()` base literal at line 29, then assert:

```ts
// SHOP_ITEMS contains SwanTier and WitchTier, and still contains ApCapacity and Heal
// categoryOf(SwanTier) === ShopCategory.RunPermanent, likewise WitchTier
// SHOP_ITEMS_BY_CATEGORY[RunPermanent] holds ApCapacity, SwanTier and WitchTier
// priceOf(SwanTier) === RANK_TIER_STEP_PRICE, likewise WitchTier
// refusalFor(stock({ coins: RANK_TIER_STEP_PRICE - 1 }), SwanTier) === NotEnoughCoins
// refusalFor(stock({ coins: 99 }), SwanTier) === null at bronze and at silver
// refusalFor(stock({ coins: 99, rankTiers: { ...ALL_BRONZE, swan: Gold } }), SwanTier)
//   === RankAtMaxTier — and it is returned BEFORE the coin check, i.e. it is still
//   RankAtMaxTier with coins: 0
// tieredRankOf(SwanTier) === TieredRank.Swan; tieredRankOf(Heal) === null
```

Run: `npx vitest run src/hunt/__tests__/shop.test.ts`
Expected: fails — the members do not exist.

- [x] **Step 2: Widen `ShopItem`, `SHOP_ITEMS`, `PurchaseRefusal` and `ShopStock`**

Add `SwanTier: 'swanTier'` and `WitchTier: 'witchTier'` to `ShopItem`. Rewrite `SHOP_ITEMS` to `[ShopItem.ApCapacity, ShopItem.SwanTier, ShopItem.WitchTier, ShopItem.Heal]` and update its docblock: DLR-116 pared this list to two; DLR-122 refills the RUN-PERMANENT rung with the two rank ladders whose effects this ticket actually implements — nothing DLR-116 removed comes back, and the five deferred ranks stay off the list for the same reason Cheat and Whetstone do. Add `RankAtMaxTier: 'rankAtMaxTier'` to `PurchaseRefusal` and `readonly rankTiers: RankTierTable` to `ShopStock`.

- [x] **Step 3: Add `tieredRankOf` and extend the three total functions**

```ts
/** DLR-122 — the rank a tier item upgrades, or `null` for an item that is not a tier purchase.
 *  Total over `ShopItem` like `priceOf` and `categoryOf`, so a third tier item is a compile error
 *  here rather than an item that silently upgrades nothing. THE single mapping — `refusalFor` and
 *  `buyFromShop` both read it rather than each carrying a second `switch`. */
export function tieredRankOf(item: ShopItem): TieredRank | null
```

`priceOf` returns `RANK_TIER_STEP_PRICE` for both; `categoryOf` returns `ShopCategory.RunPermanent` for both. In `refusalFor`, add the max-tier check **above** the coin check, matching the docblock's stated order ("item-specific reasons come BEFORE the coin check"):

```ts
const tieredRank = tieredRankOf(item)
if (tieredRank !== null && isAtMaxTier(stock.rankTiers, tieredRank)) {
  return PurchaseRefusal.RankAtMaxTier
}
```

- [x] **Step 4: Run the spec and the typecheck**

Run: `npx vitest run src/hunt/__tests__/shop.test.ts; npm run typecheck`
Expected: Vitest 0 failed. `typecheck` will still report errors in `run.ts` / `run.shop.test.ts` (missing `rankTiers` on `ShopStock`) — that is Task 3's work and is the expected state at this step.

### Task 3: Carry the tiers on the run and buy them in `src/hunt/run.ts` + `runTransitions.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/run.ts`, `src/hunt/runTransitions.ts`, `src/hunt/index.ts`
- Modify: `src/hunt/__tests__/run.shop.test.ts`
- Test: `src/hunt/__tests__/run.rankTier.test.ts`

- [x] **Step 1: Write the failing purchase spec**

`src/hunt/__tests__/run.rankTier.test.ts`:

```ts
// startRun().rankTiers equals ALL_BRONZE
// buyFromShop(run, SwanTier) spends RANK_TIER_STEP_PRICE and raises Swan to Silver only
// buying twice reaches Gold; a third buy THROWS a RangeError naming rankAtMaxTier
// buyFromShop with fewer coins than the price THROWS naming notEnoughCoins
// the tier SURVIVES advanceRun and recordEncounter — AC2's "persists for the rest of the run"
// playerRankTiersFor(run) returns the run's own table
// shopStockFor(run).rankTiers is the run's table
// buying WitchTier leaves Swan at Bronze
```

Run: `npx vitest run src/hunt/__tests__/run.rankTier.test.ts`
Expected: fails — `rankTiers` is not on `RunState`.

- [x] **Step 2: Add the field, the seed, the projection and the query in `run.ts`**

Add `readonly rankTiers: RankTierTable` to `RunState` with a docblock in the file's established voice: run-permanent like `whetstones`, carried by `advanceRun`'s and `recordEncounter`'s spreads because a tier that reset at a fight boundary would be a fight-long one; never handed back by a hand, because a hand cannot spend one; NEVER persisted, exactly as `coins` above. Seed `rankTiers: ALL_BRONZE` in `startRun`. Add `rankTiers: run.rankTiers` to `shopStockFor`. Add:

```ts
/** DLR-122 AC2/AC3 — THE statement of "the bought ladder that the PLAYER's cards resolve at",
 *  the sibling of `bankClimbBonusFor` and for its stated reason: `App` reads this and hands the
 *  RESULT to the card layer as a plain value, which is what keeps `src/warCouncil/` free of
 *  `RunState`. The name carries AC3's asymmetry: there is no Quarry counterpart to pass by
 *  mistake. */
export function playerRankTiersFor(run: RunState): RankTierTable {
  return run.rankTiers
}
```

- [x] **Step 3: Add the two `buyFromShop` arms in `runTransitions.ts`**

```ts
case ShopItem.SwanTier:
case ShopItem.WitchTier: {
  // DLR-122 AC2 — one STEP up the ladder, never a counter: a rank is a rung, unlike
  // `whetstones` and `apCapacityBonus` above, which stack. `tieredRankOf` is the single
  // mapping from item to rank; `refusalFor` above has already refused a rank at gold, so
  // `steppedTo`'s own RangeError is a guard, not a path a player reaches.
  const rank = tieredRankOf(item)
  if (rank === null) {
    throw new RangeError(`Cannot upgrade a rank from ${item}: it names no tiered rank`)
  }
  return { ...paid, rankTiers: steppedTo(run.rankTiers, rank) }
}
```

- [x] **Step 4: Fix the hand-built `ShopStock` in `run.shop.test.ts` and re-export from `index.ts`**

Add `rankTiers: run.rankTiers` at `src/hunt/__tests__/run.shop.test.ts:76`. Export from `src/hunt/index.ts`: `TieredRank`, `AbilityTier`, `TIER_LADDER`, `TIERED_RANKS`, `ALL_BRONZE`, `RANK_TIER_STEP_PRICE`, `tierAtLeast`, `tierIndexOf`, `nextTierAfter`, `isAtMaxTier`, `steppedTo`, `type RankTierTable`, `tieredRankOf`, `playerRankTiersFor`.

- [x] **Step 5: Run the hunt specs and the typecheck**

Run: `npx vitest run src/hunt/__tests__/rankTiers.test.ts src/hunt/__tests__/run.rankTier.test.ts src/hunt/__tests__/shop.test.ts src/hunt/__tests__/run.shop.test.ts; npm run typecheck`
Expected: Vitest 0 failed; `typecheck` exits 0.

---

## Phase 2 — The rules, in `src/warCouncil/`

The card layer learns the ladder. The boundary is safe because every new parameter is optional or defaulted to bronze, so the game still resolves exactly as it does today until Phase 3 wires a real table through — and `npm run typecheck` passes at the end of this phase with the app unchanged.

### Task 4: Create AC3's player-only gate in `src/warCouncil/rankTierRules.ts`

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/rankTierRules.ts`
- Test: `src/warCouncil/__tests__/rankTiers.resolution.test.ts` (created here, extended by Tasks 5 and 6)

- [x] **Step 1: Write the failing gate spec**

```ts
// tierForSide(table, PlayerSide.Player, Swan) returns the table's tier
// tierForSide(table, PlayerSide.Cpu, Swan) returns Bronze even when the table says Gold  <- AC3
// tierForSide(undefined, PlayerSide.Player, Swan) returns Bronze
// swanTierFactsFor(trick with the PLAYER's Swan, gold table) -> both booleans true
// swanTierFactsFor(trick with the PLAYER's Swan, silver table) -> keepsMultiplier only
// swanTierFactsFor(trick with the QUARRY's Swan, gold table) -> both false            <- AC3
// swanTierFactsFor(trick with no Swan, gold table) -> both false
```

Run: `npx vitest run src/warCouncil/__tests__/rankTiers.resolution.test.ts`
Expected: fails — the module does not exist.

- [x] **Step 2: Write `src/warCouncil/rankTierRules.ts`**

Exactly the shapes in `plan.md` Part 2 → Data shapes → *New — `src/warCouncil/rankTierRules.ts`*. The docblock must say this is THE statement of AC3's asymmetry and that no rank effect anywhere may read a tier by any other route.

```ts
export function tierForSide(
  tiers: RankTierTable | undefined,
  side: PlayerSide,
  rank: TieredRank,
): AbilityTier {
  // AC3 — the FIRST thing checked, before the table is consulted at all. The Quarry plays the
  // same 33-card deck and resolves every named rank at bronze; this is the deck's first
  // asymmetry and it is enforced here, once, rather than falling out of shared resolution code.
  if (side !== PlayerSide.Player) return AbilityTier.Bronze
  return tiers === undefined ? AbilityTier.Bronze : tiers[rank]
}
```

- [x] **Step 3: Run the spec and the typecheck**

Run: `npx vitest run src/warCouncil/__tests__/rankTiers.resolution.test.ts; npm run typecheck`
Expected: Vitest 0 failed; `typecheck` exits 0.

### Task 5: The Swan ladder in `src/warCouncil/bank.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/bank.ts`
- Modify: `src/warCouncil/__tests__/bank.test.ts` (the `facts()` base literal, line ~20), `src/warCouncil/__tests__/bank.integration.test.ts`
- Test: `src/warCouncil/__tests__/rankTiers.resolution.test.ts`

- [x] **Step 1: Write the failing bank rules into `rankTiers.resolution.test.ts` (AC6)**

Against `resolveTrickBank` directly, from a `before` of a real streak (e.g. `{ bank: 3, multiplier: 3 }`):

```ts
// bronze baseline (both false), CLEAN LOSS: bank -> 0, multiplier -> 0, cashOut ===
//   forcedCashValue(3, 3), damageToPlayer === DAMAGE_PER_HIT       <- AC1 unchanged
// silver, CLEAN LOSS: multiplier SURVIVES at 3, bank -> 0, cashOut === forcedCashValue(3, 3),
//   damageToPlayer === DAMAGE_PER_HIT                              <- AC4 exactly
// gold, CLEAN LOSS: multiplier 3 AND bank 3 both survive, cashOut === 0,
//   damageToPlayer === DAMAGE_PER_HIT                              <- AC5 exactly
// silver, SKULL WIN (an eaten skull): behaves as bronze — bank 0, multiplier 0, cash paid
// gold,   SKULL WIN: behaves as bronze                             <- AC4's "not an eaten skull"
// gold, DODGE and CLEAN WIN: identical to bronze (no hit to spare)
```

Run: `npx vitest run src/warCouncil/__tests__/rankTiers.resolution.test.ts`
Expected: fails — the fields do not exist.

- [x] **Step 2: Add the two fields to `TrickFacts`**

```ts
/** DLR-122 AC4 — the player's Swan ladder stands at silver or better AND the player played a
 *  Swan into this trick. A plain FACT handed in, never a run figure read, exactly as
 *  `blastGuarded` and `bankClimbBonus` above: this module must not learn who holds which card.
 *  `rankTierRules.ts`'s `swanTierFactsFor` is the single producer, and AC3's player-only gate
 *  lives there. Only ever consulted on a CLEAN LOSS — see `resolveTrickBank`. */
readonly swanKeepsMultiplier: boolean
/** DLR-122 AC5 — as above, at gold. Implies `swanKeepsMultiplier`; `resolveTrickBank` does not
 *  rely on the caller for that and folds it in itself. */
readonly swanKeepsBank: boolean
```

- [x] **Step 3: Apply the rule inside `resolveTrickBank`'s existing hit branch**

Above the branch:

```ts
// DLR-122 AC4/AC5 — the Swan ladder, gated on CLEAN LOSS here rather than at the call site.
// "Not an eaten skull" is a rule about OUTCOMES, and outcomes are this module's subject; a
// caller-side gate would put half of AC4 in `playCard.ts` where no bank test would see it.
// A Dodge and a Clean Win have no hit to spare, so `CleanLoss` is the whole of it.
const swanCleanLoss = outcome === TrickOutcome.CleanLoss
const swanKeepsBank = swanCleanLoss && trick.swanKeepsBank
// Gold IMPLIES silver — folded in here so a caller that sets only `swanKeepsBank` cannot
// produce the nonsense state "the bank survives but the streak that valued it does not".
const swanKeepsMultiplier = swanCleanLoss && (trick.swanKeepsMultiplier || trick.swanKeepsBank)
```

Then rewrite the reset block, changing nothing else:

```ts
if (trickHit || timebombResets) {
  // DLR-122 AC5 — gold spares the cash-out entirely. This is the poisoned-clean-loss
  // exception's own shape (`the-hunt.md` §7) reached by a different trigger, not a second
  // implementation of it: `replaced` above already skips the hit for the same reason, and
  // this skips the cash-out one branch below it.
  if (!swanKeepsBank) {
    cashOut = forcedCashValue(bank, multiplier)
    bank = 0
    // DLR-122 AC4 — silver spares the RATE, not the POT: the bank above still cashes at
    // two-thirds and still resets, and the damage was already booked in `damageToPlayer`.
    if (!swanKeepsMultiplier) {
      multiplier = 0
    }
  }
}
```

- [x] **Step 4: Fix the two spec fixtures**

Add `swanKeepsMultiplier: false, swanKeepsBank: false` to the `facts()` base literal in `bank.test.ts` and to the `TrickFacts` literal in `bank.integration.test.ts`.

- [x] **Step 5: Run the bank specs and the typecheck**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts src/warCouncil/__tests__/bank.integration.test.ts src/warCouncil/__tests__/rankTiers.resolution.test.ts; npm run typecheck`
Expected: Vitest 0 failed on all three files. `typecheck` will still report `playCard.ts` and `cardDamage.ts` missing the two fields — Tasks 7 and 9 close that, and this is the expected state at this step.

### Task 6: The Witch ladder in `src/warCouncil/resolveTrick.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/resolveTrick.ts`, `src/warCouncil/cpuPlayer.ts`
- Test: `src/warCouncil/__tests__/rankTiers.resolution.test.ts`

- [x] **Step 1: Write the failing Witch rules into `rankTiers.resolution.test.ts` (AC6)**

```ts
// bronze: two Witches still cancel (neither is effective trump) — today's rule, unchanged
// silver, both sides play a Witch: the PLAYER's still counts as trump and wins the trick
// silver, the QUARRY plays the only Witch: it counts as trump, as it does today  <- AC3
// silver, the QUARRY's Witch against the PLAYER's Witch: the PLAYER wins          <- AC3
// gold, the player's Witch (rank 9) against a trump-suit Monarch (rank 11): the PLAYER wins
// gold applied to a QUARRY Witch: the Quarry does NOT win that comparison         <- AC3
// bronze default (no third argument): every existing assertion in resolveTrick.test.ts holds
```

Run: `npx vitest run src/warCouncil/__tests__/rankTiers.resolution.test.ts`
Expected: fails — `resolveTrickWinner` takes two parameters.

- [x] **Step 2: Add the defaulted parameter and the two branches**

```ts
export function resolveTrickWinner(
  trick: readonly [TrickCard, TrickCard],
  trumpSuit: Suit,
  /** DLR-122 — the PLAYER's Witch ladder. DEFAULTED to bronze, which is today's rule exactly, so
   *  every existing caller and every existing spec is unchanged and a caller that forgets it
   *  degrades to the printed ability rather than to nothing. AC3's asymmetry is in the branches
   *  below, which test `t.side === PlayerSide.Player` before they read this at all. */
  playerWitchTier: AbilityTier = AbilityTier.Bronze,
): PlayerSide {
```

An upgraded Witch is the player's own, at silver or better, and it no longer cancels; a gold one additionally outranks every trump. Both predicates test the side first. Fold the silver case into `isEffectiveTrump` and the gold case into the both-trump comparison, ahead of the rank test.

- [x] **Step 3: Document the two bronze heuristic call sites in `cpuPlayer.ts`**

At `cpuPlayer.ts:57` and `:135`, add:

```ts
// DLR-122 — evaluated at BRONZE deliberately, with no tier threaded in. These two calls are the
// Quarry's own EVALUATION of a candidate card, not the rule that resolves the trick — `playCard`
// owns that and does thread the ladder. The consequence is that a player's gold Witch is
// occasionally misjudged by the Quarry, which is a fair consequence of the upgrade rather than a
// defect, and it keeps `chooseCpuMove`'s signature and its four call sites unchanged.
```

- [x] **Step 4: Run the trick specs and the typecheck**

Run: `npx vitest run src/warCouncil/__tests__/rankTiers.resolution.test.ts src/warCouncil/__tests__; npm run typecheck`
Expected: Vitest 0 failed across `src/warCouncil/__tests__` except for any file the Task 7 wiring still owes; `typecheck` reports only the `playCard.ts` / `cardDamage.ts` `TrickFacts` errors Task 7 closes.

### Task 7: Thread the ladder through `playCard.ts` and `legalMoves.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/legalMoves.ts`, `src/warCouncil/playCard.ts`, `src/warCouncil/index.ts`
- Test: `src/warCouncil/__tests__/rankTiers.resolution.test.ts`

- [x] **Step 1: Write the failing end-to-end assertion through `playCard`**

Play a real trick through `playCard` with `options.playerRankTiers` set to a gold Swan table, on a hand where the player loses cleanly, and assert `state.multiplier` and `state.bank` survive. Repeat with the table absent and assert today's reset. Then assert the same table produces no upgrade when the Quarry's Swan is the one in the trick (AC3).

Run: `npx vitest run src/warCouncil/__tests__/rankTiers.resolution.test.ts`
Expected: fails — `playerRankTiers` is not a `PlayCardOptions` field.

- [x] **Step 2: Add `playerRankTiers` to `PlayCardOptions`**

```ts
/** DLR-122 AC2/AC3 — the PLAYER's bought ability ladder, in force for this hand. Handed IN
 *  rather than read, for the reason this interface's docblock already gives: it is a run figure
 *  and `src/warCouncil/` must not learn `RunState`. ABSENT means all-bronze — today's game
 *  exactly — so the Quarry's own call sites stay untouched, exactly as `bankClimbBonus` does. */
readonly playerRankTiers?: RankTierTable
```

- [x] **Step 3: Consume it in `playCard.ts`**

Pass `options?.playerRankTiers` into `resolveTrickWinner` via `tierForSide(options?.playerRankTiers, PlayerSide.Player, TieredRank.Witch)`, and spread `swanTierFactsFor(completedTrick, options?.playerRankTiers)` into the `TrickFacts` literal. Both go through `rankTierRules.ts` and nothing else. Export `tierForSide`, `swanTierFactsFor` and `type SwanTierFacts` from `src/warCouncil/index.ts`.

- [x] **Step 4: Run the whole card layer and the typecheck**

Run: `npx vitest run src/warCouncil; npm run typecheck`
Expected: Vitest 0 failed. `typecheck` reports only `src/app/warCouncil/cardDamage.ts`'s missing `TrickFacts` fields — Phase 3 closes that.

---

## Phase 3 — Wiring, copy, and the preview

The run's table reaches the hand. This is the last phase that changes behaviour, and it ends with the whole suite runnable: after it, buying a tier in the shop actually changes how the next hand resolves, and the DLR-117 preview reports the same figure the commit will.

### Task 8: Carry the table from `RunState` to `RoundUiState`

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts`, `src/app/warCouncilMount.ts`, `src/app/warCouncil/WarCouncilRound.tsx`, `src/App.tsx`

- [x] **Step 1: Add the optional seed field and the state field**

In `roundUiState.ts`, add `readonly rankTiers?: RankTierTable` to `RoundUiSeed` with the `apCapacity?` docblock's own reasoning — OPTIONAL and defaulted so every existing seed fixture reproduces the pre-DLR-122 game exactly — and `readonly rankTiers: RankTierTable` to `RoundUiState`, documented as read-only for the hand's whole life for `bankClimbBonus`'s stated reason: no action ever writes it, because a hand cannot buy a tier. In `createRoundUiState`, set `rankTiers: seed.rankTiers ?? ALL_BRONZE`.

- [x] **Step 2: Add the prop to the mount type and the component**

`src/app/warCouncilMount.ts` gains `readonly rankTiers: RankTierTable` beside `bankClimbBonus`, documented the same way — a plain value, never a `RunState`. `WarCouncilRound.tsx` destructures `rankTiers` and passes it into the seed alongside `bankClimbBonus`.

- [x] **Step 3: Pass it from the driver**

In `src/App.tsx`, beside `bankClimbBonus={bankClimbBonusFor(run)}` at line ~357, add `rankTiers={playerRankTiersFor(run)}`, importing `playerRankTiersFor` from `./hunt` alongside `bankClimbBonusFor`.

- [x] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0 apart from `cardDamage.ts`, which Task 9 closes.

### Task 9: Fold the tiers into `playOptions` and the damage preview

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/commitHandlers.ts`, `src/app/warCouncil/cardDamage.ts`
- Test: `src/app/warCouncil/__tests__/cardDamage.test.ts`

- [x] **Step 1: Add `playerRankTiers` to `playOptions`**

```ts
return {
  timebombToPlayer: state.encounter.pendingTimebomb[DuelSide.Player],
  timebombToQuarry: state.encounter.pendingTimebomb[DuelSide.Quarry],
  blastGuarded: state.blastGuardHeld,
  bankClimbBonus: state.bankClimbBonus,
  // DLR-122 — the FIFTH field, in the one assembly all three readers share. A preview that
  // read the run's ladder itself would be exactly the second reading this docblock warns about.
  playerRankTiers: state.rankTiers,
}
```

Update the docblock's "four fields" wording to five.

- [x] **Step 2: Mirror the two new `TrickFacts` fields in `cardDamage.ts`**

In the `shared` literal, reproduce `playCard.ts`'s derivation field for field — `...swanTierFactsFor(visible, options.playerRankTiers)` — so the preview and the commit cannot disagree about the Swan ladder. Note in a comment that `visible` already carries the correct `side` on every entry, which is what makes AC3's gate work in the preview too.

- [x] **Step 3: Add the preview-parity assertion**

In `src/app/warCouncil/__tests__/cardDamage.test.ts`, assert that a state seeded with a gold Swan table reports a `lose` branch whose `toPlayer` is `DAMAGE_PER_HIT` while the bank is preserved — i.e. the preview reflects the ladder rather than the bronze rule.

- [x] **Step 4: Run the app-layer specs and the typecheck**

Run: `npx vitest run src/app/warCouncil; npm run typecheck`
Expected: Vitest 0 failed; `typecheck` exits 0 with no remaining errors anywhere.

### Task 10: Shop copy for the two items and the new refusal

- Skill: react-frontend

**Files:**
- Modify: `src/app/run/shopLabels.ts`

- [x] **Step 1: Add the names, the blurbs and the refusal sentence**

All PLACEHOLDER copy, flagged as such in the file's established voice. Prices are never quoted — `priceText` already interpolates from `priceOf`.

```ts
[ShopItem.SwanTier]: 'Swan',       // PLACEHOLDER copy — the developer's call
[ShopItem.WitchTier]: 'Witch',     // PLACEHOLDER copy — the developer's call
```

```ts
[ShopItem.SwanTier]:
  'Upgrade the Swan, for the rest of the run. At silver, losing a trick cleanly with a Swan no longer breaks your streak. At gold, it does not cash your bank either. Your Swans only — the Quarry\'s stay as they are.',
[ShopItem.WitchTier]:
  'Upgrade the Witch, for the rest of the run. At silver, two Witches no longer cancel — yours still counts as trump. At gold, yours also beats every trump. Your Witches only — the Quarry\'s stay as they are.',
```

```ts
[PurchaseRefusal.RankAtMaxTier]: 'That rank is already at gold.',
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. The two `Record<ShopItem, string>` maps and the `Record<PurchaseRefusal, string>` map are total, so a missing entry would have been a compile error.

---

## Phase 4 — The ruleset document

No production change. `the-hunt.md` is the game's current ruleset and `implementation-doc-writer` owns it; AC8 names the two sections.

### Task 11: Update `the-hunt.md` §5 and §7

- Skill: implementation-doc-writer

**Files:**
- Modify: `.docs/game_rules/the-hunt.md`

- [x] **Step 1: Extend §5's ability table with the tier ladder**

Add the bronze/silver/gold columns, marking Swan and Witch `[provisional]` (built, unplayed) and Fox, Woodcutter, Treasure, Poison and Monarch `[not built]` with a one-line note that each is typed but not offered. Cite `version-5-developer-idea.md` §7b rather than reproducing its reasoning, per `CLAUDE.md`'s three-doc split. State plainly that bronze is the printed ability and that a run which buys nothing plays exactly as §5 already describes.

- [x] **Step 2: Amend §5's Quarry-symmetry statement**

The line recording that "the Quarry has no powers… it plays by exactly the player's rules, with no exceptions" is now false. Replace it with the single exception this ticket introduces — a bought rank tier applies to the player's copies only — and mark it `[provisional]`, citing §7b's own note that this is the deck's first asymmetry and the opposite of DLR-81's decision.

- [x] **Step 3: Extend §7's four-outcome and bank rules with the Swan exception**

Under the clean-loss row: at Swan silver the multiplier survives the hit while the damage and the two-thirds cash still land; at Swan gold the bank survives too and nothing cashes. State that it fires only on a clean loss, never on an eaten skull, and that it is the poisoned-clean-loss exception's shape reached by a different trigger. Mark both `[provisional]`. Record the price in §7's terms only by naming `RANK_TIER_STEP_PRICE` in the Status register — the ruleset states rules, not tuning values.

- [x] **Step 4: Confirm the file still reads in playing order and names no function outside its Status register**

Run: `Select-String -Path .docs\game_rules\the-hunt.md -Pattern "steppedTo|tierForSide|swanTierFactsFor|resolveTrickBank"`
Expected: zero hits outside the Status register section.

---

## Phase 5 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task M.1: Confirm the pure-core boundary still holds

- Skill: none — verification only, no code written.

**Files:**
- (none — read-only checks)

- [x] **Step 1: Grep the two new modules and the two trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 2: Confirm determinism — no `Math.random()` in either pure tree**

Run: `Get-ChildItem src\hunt,src\vault,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "Math\.random"`
Expected: zero hits.

### Task M.2: Confirm the price is not hard-coded and AC3's gate is the only tier reader

- Skill: none — verification only, no code written.

**Files:**
- (none — read-only checks)

- [x] **Step 1: Grep source and copy for the literal the configuration owns**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "RANK_TIER_STEP_PRICE"`
Expected: hits only in `src/hunt/rankTiers.ts` (the declaration), `src/hunt/shop.ts` (`priceOf`), `src/hunt/index.ts` (the re-export), and the specs. **No bare `5` anywhere as a rank-tier price.**

- [x] **Step 2: Confirm AC3's gate is the only route to a tier inside the card layer**

Run: `Get-ChildItem src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "playerRankTiers\[|rankTiers\["`
Expected: zero hits — every read goes through `tierForSide`.

### Task M.3: Static gates and the full suite

- Skill: none — verification only, no code written.

**Files:**
- (none — read-only checks)

- [x] **Step 1: Format only the files this contract changed**

Run: `npx prettier --write src/hunt/rankTiers.ts src/hunt/shop.ts src/hunt/run.ts src/hunt/runTransitions.ts src/hunt/index.ts src/warCouncil/rankTierRules.ts src/warCouncil/bank.ts src/warCouncil/resolveTrick.ts src/warCouncil/legalMoves.ts src/warCouncil/playCard.ts src/warCouncil/cpuPlayer.ts src/warCouncil/index.ts src/app/warCouncil/roundUiState.ts src/app/warCouncil/commitHandlers.ts src/app/warCouncil/cardDamage.ts src/app/warCouncil/WarCouncilRound.tsx src/app/warCouncilMount.ts src/App.tsx src/app/run/shopLabels.ts src/hunt/__tests__/rankTiers.test.ts src/hunt/__tests__/run.rankTier.test.ts src/hunt/__tests__/shop.test.ts src/hunt/__tests__/run.shop.test.ts src/warCouncil/__tests__/rankTiers.resolution.test.ts src/warCouncil/__tests__/bank.test.ts src/warCouncil/__tests__/bank.integration.test.ts src/app/warCouncil/__tests__/cardDamage.test.ts`
Expected: exits 0. **Never `npm run format`** — it rewrites ~59 files across `.docs/`.

- [x] **Step 2: Confirm no file crossed the 400-line blocking budget**

Run: `Get-ChildItem src\hunt\rankTiers.ts,src\hunt\shop.ts,src\hunt\run.ts,src\hunt\runTransitions.ts,src\warCouncil\rankTierRules.ts,src\warCouncil\bank.ts,src\warCouncil\resolveTrick.ts,src\warCouncil\legalMoves.ts,src\warCouncil\playCard.ts,src\app\warCouncil\roundUiState.ts,src\app\run\shopLabels.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count is under 400. `(Get-Content …).Count`, never `Measure-Object -Line`, which drops blank lines. Any breach is fixed **in this ticket**.

- [x] **Step 3: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npx vitest run --project node; npx vitest run --project dom; npm test`
Expected: all exit 0; Vitest reports 0 failed. The two per-project runs warm the transform cache first — a single cold `[vitest-pool-runner]: Timeout waiting for worker to respond` is infrastructure, not a test failure.

- [x] **Step 4: Formatting of the changed files only**

Run: `npx prettier --check src/hunt/rankTiers.ts src/warCouncil/rankTierRules.ts src/hunt/shop.ts src/hunt/run.ts src/hunt/runTransitions.ts src/warCouncil/bank.ts src/warCouncil/resolveTrick.ts src/warCouncil/playCard.ts src/app/warCouncil/commitHandlers.ts src/app/run/shopLabels.ts src/App.tsx`
Expected: exits 0. Repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files and is **not** this contract's gate.

- [x] **Step 5: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task M.4: Write the PR description

- Skill: none — a document for the developer, no code.

**Files:**
- Create: `.claude/contract/DLR-122-tiered-rank-abilities-run-permanent-shelf/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md`; a summary of the change; **every price and refill rule placed against the coin economy** (`COINS_PER_ENCOUNTER_WIN` 1, reroll 1, Heal/Cheat/Guard 1, Timebomb 2, AP capacity 3, Whetstone 4, rank tier step 5); what returned to `SHOP_ITEMS` and why; how the `Miser` tension moved; every decision listed under "Developer decides or observes"; the verification numbers from Task M.3; and a one-line note that `TIERED_RANKS` follows `SHOP_ITEMS`' convention — the type is everything the game can tier, the array is what the shelf offers.

---

## Self-review

**Spec coverage:**
- Bronze/silver/gold ladder, bronze is today's ability (AC1) — Tasks 1, 5, 6; the two deferred-by-design rows are recorded in Task 11.
- Purchasable from the run-permanent shelf, applies to every copy, persists for the run (AC2) — Tasks 2, 3.
- Player only; the Quarry resolves at bronze, enforced explicitly (AC3) — Task 4, asserted in Tasks 4, 5, 6, 7; grep-verified in Task M.2 Step 2.
- Swan silver (AC4) — Task 5 Steps 1–3.
- Swan gold reusing the poisoned-clean-loss shape (AC5) — Task 5 Steps 1–3.
- Vitest at the resolution layer, both sides, clean loss and eaten skull (AC6) — Tasks 4, 5, 6, 7 in `rankTiers.resolution.test.ts`.
- One pricing configuration point (AC7) — Task 1 Step 2, grep-verified in Task M.2 Step 1.
- `the-hunt.md` §5 and §7 (AC8) — Task 11.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact edit, or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `TieredRank`, `AbilityTier`, `TIER_LADDER`, `TIERED_RANKS`, `RankTierTable`, `ALL_BRONZE`, `RANK_TIER_STEP_PRICE`, `tierIndexOf`, `tierAtLeast`, `nextTierAfter`, `isAtMaxTier`, `steppedTo`, `tieredRankOf`, `playerRankTiersFor`, `tierForSide`, `swanTierFactsFor`, `SwanTierFacts`, `ShopItem.SwanTier`, `ShopItem.WitchTier`, `PurchaseRefusal.RankAtMaxTier`, `TrickFacts.swanKeepsMultiplier`, `TrickFacts.swanKeepsBank`, `PlayCardOptions.playerRankTiers`, `RoundUiSeed.rankTiers`, `RoundUiState.rankTiers` — each spelled identically in `plan.md` Part 2 → Data shapes and in every task that touches it.

**Phase boundary cleanliness:**
- Phase 1 ends type-checking: the run carries a field nothing reads and the shop sells two items that change only that field. The game plays exactly as it does today.
- Phase 2 ends with `npm run typecheck` reporting only the `cardDamage.ts` `TrickFacts` errors Phase 3 closes, and `npx vitest run src/warCouncil` at 0 failed. Every new parameter is optional or defaults to bronze, so no behaviour changes until Phase 3.
- Phase 3 ends type-checking clean with no remaining errors anywhere and the whole suite runnable; this is the first point at which a purchase changes a hand.
- Phase 4 touches one markdown file and no code, so it cannot break the build.
- Phase 5 is read-only apart from a Prettier pass scoped to this contract's own files.
