Part of [Hunt — `src/hunt/`](README.md).

# The slot machine — reel strips, spins, and the pull

The shop's card source. DLR-112 built the draw model and left it with no screen; **DLR-116 made it
reachable**, so a player can now choose a machine, read its strip, and pull. The screen half lives in
[../run-ui/the-slot-machine-screen.md](../run-ui/the-slot-machine-screen.md); the Vault's odds
adjustment lives in [../vault/README.md](../vault/README.md). This file is the engine.

## The draw model, and why it is shaped this way

Three reels. Each machine has a **strip of 8 distinct buff templates** (`REEL_POOL_SIZE`,
`slotConfig.ts`), shared by all three reels — the only construction under which a match can happen at
all. The strip is drawn **without replacement**, because the eight must be distinct; a spin picks
**with replacement**, because otherwise no two reels could ever agree.

The important half is where the weighting sits. **All of it is spent choosing which 8 templates make
the strip. The spin itself is flat uniform over those 8.** `drawReelPool` in `slotMachine.ts` takes
the weight function (`templateWeightFor`, `slotWeights.ts`) and draws the strip;
`spinReels` then takes three uniform picks with no weighting whatsoever. The consequence is that a
player who reads the posted strip can compute their own odds exactly — a hidden per-symbol weight
cannot be read, and a slot machine whose posted strip lies about its odds is the one thing the
fantasy does not survive.

**Tier distribution is therefore a consequence, not a dial.** Nobody chose 1.6% gold. It falls out of
8 symbols over 3 reels, and `slotOdds.ts` derives it rather than transcribing it:

| Outcome | Rule | Probability | Pays |
| --- | --- | --- | --- |
| `ThreeMatch` | all three reels agree | `n / n³` = 1/64 = **1.5625%** | one **gold** card |
| `TwoMatch` | exactly two agree | `3n(n−1) / n³` = 168/512 = **32.8125%** | one **silver** on the matched template, one **bronze** on the odd one |
| `AllDifferent` | no two agree | `n(n−1)(n−2) / n³` = 336/512 = **65.625%** | three **bronze** cards |

with `n = REEL_POOL_SIZE`. `expectedCardsPerPull()` sums the award counts against those weights to
**2.640625 cards per pull**. Every figure the shop screen posts comes from these functions, so
retuning `REEL_POOL_SIZE` moves the posted odds automatically instead of leaving the screen quoting a
number the engine no longer uses.

`slotOutcomeOdds` throws a `RangeError` for any `REEL_COUNT` other than 3, mirroring `resolvePull`'s
own guard: no other match rule has ever been defined, and a plausible-looking wrong distribution is
worse than a refusal. `resolvePull` states the match rule once and is the only place it is stated.

## Seeds — a strip is recomputed, never stored

Nothing anywhere holds a strip. Both seeds are pure functions of state already on `RunState`:

- **The strip seed** is `slotSeedFor(runSeed, machineId, visitIndex)`, which folds the machine's
  *index* in `SLOT_MACHINE_IDS` (not the id string) and the visit index through `mixSeed`, so two
  machines and two visits never collide. The **visit index is `run.encounterIndex`** — the shop is
  reachable exactly once per resolved encounter, so that field is already a monotonic per-visit
  integer and no second field was added for it. A useful consequence: walking shop → map → shop
  returns to the *same* strip, which is correct. A strip must not reroll because you looked away.
- **The spin seed** is `spinSeedFor(stripSeed, pullIndex)` = `mixSeed(stripSeed, pullIndex)`, with
  `pullIndex = run.slotPullsThisVisit`. Because the pull index feeds only the *spin*, **a paid reroll
  re-spins the same strip rather than redrawing it.** That is the rule, and `slotOdds.test.ts`
  asserts it directly by recomputing a strip after any number of spins and finding it identical.

Every generator is `createSeededRng` (mulberry32, `seededRng.ts`) over one of those seeds.
**`src/hunt/` and `src/vault/` contain no `Math.random()` at all** — the only call in the seed path is
in `src/App.tsx`, choosing `runSeed` once per run. That is not tidiness: DLR-130's headless balance
simulator needs the whole tree reproducible, and a stray `Math.random()` in a screen would break no
test while quietly making the game unmeasurable.

## What a pull costs, and what it pays

`pullPriceFor(pullsThisVisit)` is **free for the first `SLOT_FREE_PULLS_PER_VISIT` (1) pull of a
visit and `SLOT_REROLL_PRICE` (1 coin) thereafter, with no cap on rerolls.**
`slotPullRefusalFor(stock)` is the single statement of whether a pull is available, read by the guard
*and* by the screen's disabled state, so the two cannot disagree; a non-finite coin balance refuses
rather than passing the comparison. `slotVisitStockFor(run)` (`run.ts`) projects a run into the two
figures that rule needs, the sibling of `shopStockFor` and `flaskStockFor`.

`pullSlotMachine(run, pull)` (`runTransitions.ts`) is the transition. It takes an **already-resolved
`SlotPull`**, not an `Rng` — which is what keeps `runTransitions.ts` free of randomness entirely and
puts the seeding in exactly one place, the shop's hook. It re-derives the refusal and **throws a
`RangeError` naming it** rather than no-opping, the discipline `buyFromShop` and `drinkFlask` already
set; reaching that throw is a driver bug, since the control is disabled whenever the refusal is
non-null. It then deducts the price, increments `slotPullsThisVisit`, and appends
`mintPullAwards(pull, run.nextBuffId)` to `run.buffs` with `nextBuffId` advanced by the award count.

**Every award is taken. There is no choose-one gate**, and that is a deliberate call rather than an
omission: the 2.64-cards-per-pull figure above is a per-pull *yield* that only holds if all of them
land, so a choose-one would have made the real yield 1.0 and silently invalidated the balance
simulator. `advanceRun` resets `slotPullsThisVisit` to 0 at the fight boundary, exactly as it already
resets `discardsRemaining`, so the free pull returns at every visit.

Awards are minted through `mintFromTemplate`, so every card the machine pays is a priced buff — the
`Unassigned` placeholders that `apCostOf` throws on can never come out of a reel.
`run.slot.test.ts` asserts `isPricedBuff` over every buff a pull appends rather than assuming it.

## Key exports

| Export | Purpose | File |
| --- | --- | --- |
| `SlotMachine`, `SlotPull`, `SlotAward`, `SlotOutcome` | the strip, one resolved pull, one card won, the three match patterns (codes, not copy) | `slotMachine.ts` |
| `slotSeedFor` / `spinSeedFor` | the strip seed and the per-pull spin seed | `slotMachine.ts` |
| `drawReelPool` | draws 8 distinct templates onto a strip; `weightOf` is a **defaulted** parameter — the Vault's seam | `slotMachine.ts` |
| `spinReels` / `resolvePull` / `pullMachine` | three uniform picks; the match rule; the two composed | `slotMachine.ts` |
| `mintPullAwards` | a pull's awards as ordinary `Buff`s with consecutive ids | `slotMachine.ts` |
| `pullPriceFor` / `slotPullRefusalFor` / `SlotVisitStock` | the cost rule and the single availability statement | `slotMachine.ts` |
| `slotOutcomeOdds` / `awardCountFor` / `expectedCardsPerPull` | the derived posted odds | `slotOdds.ts` |
| `SLOT_MACHINE_IDS`, `REEL_COUNT`, `REEL_POOL_SIZE`, `SLOT_FREE_PULLS_PER_VISIT`, `SLOT_REROLL_PRICE` | the machine roster and the four tunables | `slotConfig.ts` |
| `slotVisitStockFor` | projects a `RunState` into a `SlotVisitStock` | `run.ts` |
| `pullSlotMachine` | the transition: pay, count, mint onto the pile | `runTransitions.ts` |

## Deferred / not yet implemented

- **Only two machines exist** (`Skirmisher`, `Strongbox`) and their weight tables are
  `slotWeights.ts`'s, untouched by DLR-116.
- **The 7 consumable/activated templates are still absent from `BUFF_TEMPLATES`, and this is now a
  known gap rather than a deferral** (DLR-120). DLR-126 landed and answered AC6 **affirmatively** —
  a consumable is an ordinary `Buff` and the draw mechanism needs no change at all — but no template
  was ever added, so `Ward` and its four siblings are **not in the reel pool** and no play path can
  produce one. `src/sim/__tests__/reachability.test.ts` pins that. Closing it is **not** a data edit:
  `BuffTemplate.kind` is typed `BuffConditionKind` and `axis` is typed `BuffCostAxis`, and a
  consumable has neither — it is priced through `CONSUMABLE_AP_COST` and pays in its effect. It also
  needs 14 slot weights (7 kinds × 2 machines) nobody has chosen. Whether consumables ship in v1's
  reel is the developer's call. (DLR-126 separately **disproved** the old claim that Ward's silver
  and gold tiers are indistinguishable: `bank.ts` adds `trick.timebombToPlayer`, whose column is
  2/4/6, so a hit is 1 **or** 3/5/7 — all three Ward rows ship.)
- **`Keepsake` is unfireable in live play** and ships at floor weight, so a player can win a
  `Keepsake` card from a reel that never fires. It is a dud card, not a crash — `apCostOf` prices it
  fine. DLR-125 confirmed the defect rather than fixing it: see
  [Condition evaluation](buff-condition-evaluation.md).
- ~~**A drawn buff still does nothing when activated.**~~ **Fixed by DLR-125 on 2026-08-24** —
  `buffAccrual.ts` has a caller, conditions are evaluated and rewards are paid, so a card won here
  now genuinely changes damage, coins or the action-point pool.
