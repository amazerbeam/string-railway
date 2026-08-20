# DLR-92 — Whetstone: run-permanent bank-climb buff

Contract: [`plan.md`](plan.md) · layout reference: [`mockup.html`](mockup.html) ([published](https://claude.ai/code/artifact/bea1ca6c-3ad5-46c5-b1bd-e67438d6db0c))

## What changed

The shop's run-permanent shelf — built empty by DLR-89 — now sells its first item. A **Whetstone** costs 4 coins, can be bought as many times as the purse allows, and each copy permanently raises how fast the bank climbs on a taken trick. One copy makes every taken trick bank 2 instead of 1; two copies bank 3. The multiplier is untouched, so an unbroken streak of `n` tricks cashes `(1 + copies) × n²` rather than `n²` — a full six-trick hand goes 36 → 72 → 108.

The owned count lives on `RunState` beside `coins` and `envenomCharges` and survives `advanceRun`, so a good run compounds instead of resetting to the same baseline every fight.

## How the count reaches the arithmetic

`resolveTrickBank` is pure and knew nothing about `RunState`. Rather than teach it, the count crosses the boundary as a plain number, by the same route DLR-91 used for `poisonGuarded`:

```
RunState.whetstones
  → bankClimbBonusFor(run)        src/hunt/run.ts — the one statement of "+1 per copy"
  → App.tsx                        the only place RunState and the card layer meet
  → WarCouncilMountProps.bankClimbBonus
  → RoundUiSeed → RoundUiState     read-only for the hand's whole life
  → roundReducer's playOptions     renamed from poisonOptions — it now assembles every field
  → playCard → TrickFacts.bankClimbBonus
  → resolveTrickBank               bankAdded = 1 + bonus
```

**The card layer is handed the *effect*, not the item.** `src/warCouncil/` contains zero code references to `Whetstone` or `RunState` — the only two grep hits are docblock prose explaining why the boundary exists. That is deliberate: "Whetstone" is placeholder copy that may be renamed, and a rename should touch `src/hunt/` and `shopLabels.ts` only. It is also why the field is called `bankClimbBonus` rather than a Whetstone count.

`WarCouncilRoundResult` is unchanged — unlike `envenomCharges` and `poisonGuardHeld`, a hand cannot spend a Whetstone, so nothing is handed back up.

## Deliberate omissions

- **No multiplier-side twin item.** Named future scope by AC5 and the design doc. No `multiplierClimbBonus` field and no speculative shared abstraction built to host one.
- **No cap, so no new refusal.** Stacking is uncapped and the price is the limiter, so `refusalFor` gained no branch and `ShopStock` gained no field — `NotEnoughCoins` is the only refusal that can fire.
- **No config key for the per-copy +1.** AC1 names exactly one new key (`WHETSTONE_PRICE`). The +1 is the item's definition, matching how `bank.ts` already defends its unconfigured `bankAdded = 1` ("1 is what counting a trick means"). If you want the per-copy figure retunable independently, that is a second key and a design change — say so and it's a one-line follow-up.
- **No change to how the bank cashes out.** Only the taken branch's `bankAdded` moved; `cashOut`, the poison branch, the hit branch and `incomingFrom` are untouched. This matters for the Apply Damage ticket, which changes the cash-out branch of the same function — the two should not conflict, but re-read `bank.ts` before starting it rather than trusting either plan's line numbers.

## Verification

| Gate | Result |
|---|---|
| `npm test` | **843 passed / 843, 62 files, 0 failed** |
| `npm run lint` | exits 0, silent |
| `npx prettier --check` (15 touched files) | "All matched files use Prettier code style!" |
| `npm run typecheck` | 0 errors in every file this contract touched — see the caveat below |
| `npm run build` | **blocked** — see the caveat below |
| Purity boundary grep (`src/hunt`, `src/warCouncil`) | 0 hits |
| Card-layer vocabulary grep (code, comments excluded) | 0 hits |
| No `src/warCouncil` import of `hunt/run` or `RunState` | 0 hits |
| `WHETSTONE_PRICE` grep | only `config.ts`, `index.ts`, `shop.ts` (`priceOf`) and tests — no stray literal `4` |
| File budgets (`(Get-Content).Count`) | all under 400; `roundReducer.ts` 390, `run.test.ts` 397 |

**Reviewers:** Code-Evaluator APPROVED (0 issues) · Defender APPROVED (0 Critical / 0 Warning / 0 Info) · QA ALL PASSED with one finding — a Prettier formatting slip on the new test file, fixed and re-verified.

All seven acceptance criteria trace to named specs. **AC6 was checked by reading the file:** the pre-existing `[1, 4, 9, 16, 25, 36]` spec is byte-identical to its pre-DLR-92 form and passes; the only change to that file's prior content was one line on the shared `facts()` factory.

Live in the browser, QA confirmed: the run-permanent shelf renders "Whetstone — 4 coins" where it previously read "Nothing on this shelf yet"; the fifth purse cell reads "Whetstones held / 0"; the control disables with the exact `NotEnoughCoins` sentence below 4 coins; and a bare 0-Whetstone streak read 1, 4, 9, 16 live, matching the untouched unit spec. Console clean across ~90 interactions and two full runs.

## What you need to do

1. **`src/__tests__/sim.test.ts` needs one line, and it is blocking the build.** That file is untracked (never committed) and was ruled out of scope, so nothing here touched it. It now has three typecheck errors: two pre-existing (`node:fs`, `process`) and one new — a missing `bankClimbBonus` in its own `RoundUiSeed` literal, caused by this contract's required-field widening. Add `bankClimbBonus: 0` to that literal and both `npm run typecheck` and `npm run build` go green. The widening was the right call (both reviewers concurred): a required field is what makes the compiler enumerate every seed site rather than let one silently run with `undefined`.
2. **Play one run and buy a Whetstone.** This is the one thing nobody has seen work. QA played two full runs but only reached 2 coins before dying on fight 3, so the moment of a 4-coin purchase and the following fight's +2-per-trick climb were never observed live. The arithmetic is pinned at unit level against the same function the browser calls, so this is a confidence check rather than a doubt — but it is the whole point of the ticket. Watch the bank add 2 per taken trick while the multiplier still climbs by 1.
3. **Word the copy.** Three placeholder strings are yours: the item name `Whetstone`, its blurb ("Every trick you take banks one more, for the rest of the run. Buy it again to stack it."), and the purse label `Whetstones held`. All marked `PLACEHOLDER` in `shopLabels.ts`. No engine behaviour depends on any of them.
4. **Look at the purse row at five cells.** It was four. `.shop-purse` already flexes with no fixed cell width, so no CSS change was needed and no new size literal was invented — but whether five cells still read at a glance is your eye's call.
5. **Decide whether 4 coins and `(1 + copies) × n²` pace correctly.** The design doc claims roughly +100% on an average hand for one copy, which the arithmetic bears out. Whether that is reachable often enough to matter, and whether two copies break a fight, is feel.
6. **Decide what happens to `SHOP_CATEGORY_EMPTY`.** With this shelf filled, three of four rungs have items and the fourth (game-permanent) is a *refused* tab that cannot be selected — so "Nothing on this shelf yet." is no longer reachable by playing. The copy and its `shopLabels` spec were kept (the branch is still correct and will be needed the next time a rung is added), but the `ShopPanel` test that reached it via the run-permanent tab was repointed to assert the Whetstone card. Live with it, or cut it.

## Note for future contributors

**A new run-permanent buff is added by extending `bankClimbBonusFor` in `src/hunt/run.ts`, not by threading a second prop through the mount.** That function is the single statement of what a copy is worth, and it exists precisely so the next item on this rung contributes its figure in one place rather than at a JSX wiring site. The multiplier-side twin named as future scope should get a sibling function, not a reinterpretation of this one.

Two smaller conventions this contract set:

- **The two vocabularies across the boundary are load-bearing.** `whetstones` / `Whetstone` on the `src/hunt/` side; `bankClimbBonus` from `App.tsx` inward. A Phase 3 grep enforces it, and that grep excludes comment lines — the docblocks in `bank.ts` and `legalMoves.ts` name both words as prose explaining why the boundary exists.
- **A test file that outgrows 400 lines splits to a sibling**, following `playCard.envenom.test.ts`'s precedent. Phase 1 pushed `run.test.ts` to 438; DLR-92's four run-level specs now live in `run.whetstone.test.ts` (69 lines), with `run.test.ts` back to 397. The two files run the same total test count as before the split.
