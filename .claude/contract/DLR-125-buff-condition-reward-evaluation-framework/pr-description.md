# DLR-125 — Engine: buff condition/reward evaluation framework

Plan: [`plan.md`](plan.md) in this folder. Contract: `.claude/contract/DLR-125-buff-condition-reward-evaluation-framework/`.

## Summary

`src/hunt/buffAccrual.ts` shipped on DLR-124 with **no caller**. Eleven tickets built the buff pile, the AP costs, the slot draw, the loadout bar and the shop — and an activated condition buff still paid nothing. This ticket builds the missing middle.

Three pieces, with one seam between each pair:

1. **`src/hunt/buffEvaluation.ts`** — a pure predicate over a `Buff` and a `BuffTrickContext` of plain values. `buffFires` is a total `switch` over the eleven shipping condition families; `firedBuffs` layers DLR-124 R4's event/threshold/terminal cadence on top; `resolveTrickBuffs` folds R1/R2/R5/R6 by delegating to the pre-existing `resolveFiredBuffs`.
2. **The call site, inside `resolveTrickBank`.** Two conditions read figures that exist only inside that function — Hoarder's bank *after* this trick's climb, and Unbloodied's "did this trick cost the player health" — and R3 puts Momentum **inside** the cash-out product and Blade **outside** it, and the product is `bank.ts`'s. Evaluating before it would need a discarded first pass or a duplicated climb; evaluating after it cannot work at all.
3. **`src/app/warCouncil/buffRoundState.ts`** — the hand's bookkeeping and the post-trick fold: R3 step 1 (Second Wind → the AP pool, for the *next* window), step 5 (Purse → coins), the once-per-hand fired list, and the no-hit counter.

## Which of the twelve condition families fire, and which do not

This is the list that tells you — and DLR-130's balance simulator — which of the 78 v1 cards are real.

| # | Family | Cadence | Cards | Fires? |
|---|---|---|---|---|
| 1 | Taker — win a trick with suit S | Event | 12 | **Yes** |
| 2 | Feeder — lose a trick with suit S | Event | 12 | **Yes** |
| 3 | Mark of the *R* — win a trick with rank R | Event | 22 | **Yes** |
| 4 | Sidestep — dodge a skull with this card | Event | 2 | **Yes** |
| 5 | Glutton — eat a skull with this card | Event | 4 | **Yes** |
| 6 | Hoarder — reach a bank of N this hand | Threshold | 4 | **Yes** |
| 7 | Unbloodied — survive N tricks without a hit | Threshold | 4 | **Yes** |
| 8 | Long Fall — lose the next N tricks | — | 0 | **No — not shipped.** DLR-111 deferred it for want of a UI answer; no template is generated and none is planned here. |
| 9 | Debt Collector — Apply Damage this hand | Event | 4 | **Yes**, on the **press** (DLR-109's reading, enforced in code for the first time) |
| 10 | Keepsake — hold a card of suit S at hand's end | Terminal | 3 | **Evaluates correctly, but never fires in live play.** See Known defects. |
| 11 | Miser — have at least N coins | Threshold | 2 | **Yes** |
| 12 | Cornered — be below N% health | Threshold | 2 | **Yes** |

**Ten of the twelve fire and pay. One (Keepsake, 3 cards) is enforced but unsatisfiable. One (Long Fall, 0 cards) does not exist.** Every Activated card — Cheat, Timebomb, Shield and the five consumables — answers `false` to every condition by design: they fire on a player action, not a trigger.

Sidestep and Glutton's "with this card" needed a reading. A buff is activated in the between-tricks window **for the coming trick**, and `openBuffWindow` clears `activatedThisTrick` at each resolution — so "this card" is already exactly "the card played on the trick this buff was bought for". No target-card field was added. A test attaches the same generic Sidestep template to two different played cards in one hand and shows it firing off both.

## Does an activated buff genuinely pay?

**Yes, on all four axes**, and there is one assertion that proves it end to end: `src/warCouncil/__tests__/bank.buffs.test.ts` resolves the same trick twice — once with `buffs: null`, once with a real activated bronze `taker:bells:magnitude` — hands both to the actual `applyResolution` fold, and asserts the Quarry's health delta is strictly larger in the buffed case. If any link in the chain breaks, that is the test that fails.

- **Blade** → flat damage added to the cash-out, after §7's two-thirds floor.
- **Momentum** → added to the multiplier *inside* the product.
- **Second Wind** → refunded into the live AP pool, for the next window.
- **Purse** → accumulated in the hand and paid into the run's purse through `recordEncounter`'s new optional eighth parameter — **on a loss as well as a win**, because the buff's condition already decided whether it fired and the run's purse is not the place to re-judge that.

## Does DLR-117's preview inherit the contributions?

**Yes, for free — DLR-117 AC3 is met.** The preview computes no damage itself: it hands a hypothetical `TrickResolution` to `applyResolution` and reads the health delta. `playOptions(state)` is the one assembly the player's commit, the Quarry's follow and the preview all read, so adding `buffs` to it means the preview's hypothetical resolution already carries the buffed multiplier and the Blade bonus before `applyResolution` is asked what it costs. **R3's order, the four caps and the Overlap Bonus are inherited, never restated in the preview** — that is the preview's whole correctness argument, and it survives intact. One line changed in `cardDamage.ts`.

**DLR-117 AC1 — the "once any buff is active" visibility gate — is deliberately NOT met.** Hiding a readout that is currently always visible changes what the felt looks like at rest, which is a visual judgement the developer owns, and this is an `engine`-labelled ticket. Follow-up, not a gap.

## The per-hand-not-per-hit reset asymmetry

`hybrid-design.md` §5 R6 calls this "the single most likely thing on this page to be lost in translation": the four caps reset **per hand and NOT on a hit**, because a per-streak allowance refreshed by the very event the player is avoiding would pay three full pools in a hand containing three hits.

It is preserved structurally, and made stronger:

- `startHandAccrual()` remains the **only** reset in `buffAccrual.ts`, and no `resetOnHit`-shaped function was added — the wrong reading still has no function to call. A grep for `resetOnHit|resetForStreak|resetOnDamage|export function reset` finds only the docblock sentence stating the absence.
- The per-hand reset is `createRoundUiState` calling `startBuffHand()`, which works because `App.tsx` remounts the felt per hand (`key={hand}`) — the identical argument `startBuffActivation` already makes. Nothing else writes the accrual.
- The two counters this ticket adds — `multiplierPaid` and `flatDamagePaid` — move **forward only**, and only when a cash-out actually pays. They are what make R6's cap a per-**hand** bound rather than a per-cash-out one: a hand can hold a forced cash-out, a voluntary Apply Damage and an end-of-hand fold, and without them each would pay a full pool.
- The one counter that legitimately zeroes on a hit is `tricksWithoutHit` — Unbloodied's **condition**, not a cap. It lives in `buffRoundState.ts`, on the far side of the module boundary from the caps, precisely so no reader can mistake one for the other.

## How the three known open defects moved

- **`Keepsake` — confirmed unfireable, and now pinned by a test.** With `HAND_SIZE` cards and that many tricks, every dealt card is played, so the player's hand at the final trick's resolution is empty and "hold a card of suit S at hand's end" is false by construction. The evaluator is correct — a test shows it firing on a non-empty remaining hand — and a second test records that the live path hands it an empty one. **Three Purse cards pay nothing.** Two exits, both yours: redefine "hand's end" against DLR-123's persistent encounter deck, or retire the family. Not decided here.
- **`Ward` silver/gold indistinguishable at `DAMAGE_PER_HIT = 1` — unmoved.** Ward is an Activated consumable with no condition and never reaches the evaluator.
- **`Miser` fights the shop — now genuinely live rather than theoretical.** A Miser buff will fire and pay whenever the purse clears 5/10/20, so the tension between hoarding and spending is real from this ticket onward. A balance call for the end-of-epic pass, not a code defect.

## What you must decide, and what you must judge by playing

- **`Keepsake`**: redefine "hand's end", or retire the family and its three Purse cards.
- **The Momentum/Blade spend model.** `hybrid-design.md` R6 states a per-hand cap but does not say in so many words what happens when a hand has more than one cash-out. This ships spending each pool once, because the alternative makes the cap not a cap. Reversing it is a one-line change in `bank.ts` and the two `*Paid` counters come out.
- **The Overlap Bonus fires on real play for the first time** — `+(k−1)` Momentum from the shared multiplier pool. Its magnitude is arithmetic from `hybrid-design.md`, never played against a real hand.
- **Nothing announces a buff firing.** A player sees a larger number with no cause named. That is a UX gap this ticket creates by making buffs work.
- **DLR-117 AC1**, the visibility gate — a follow-up ticket.

**No browser pass was run** (opt-in, off by default, not requested). What a browser would have checked: open the loadout between tricks, activate a Bell-Taker (Blade), win a trick with a Bells card, and confirm the Quarry's health drops by more than the unbuffed cash-out; confirm the hand fan's per-card readout shows the larger figure *before* the card is played; confirm the AP plate's pool climbs after a Second Wind buff fires; confirm the purse after the hand includes the Purse contribution; confirm a clean console across a full hand and across a remount.

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0, no errors |
| `npm run lint` | exit 0, 0 errors / 0 warnings, no `eslint-disable` anywhere in the diff |
| `npm test` | **1702 passed of 1702, 131 files, 0 failures** (baseline before this contract: 1655/1655 across 127 files — the delta is this contract's four new spec files plus added cases) |
| `npm run build` | exit 0, `dist/` written, no bundler errors |
| `npx prettier --check` (scoped) | exit 0 across every file in the contract |
| Pure-core boundary grep | zero hits for React / DOM globals in `src/hunt/` and `src/warCouncil/` |
| Determinism grep | zero `Math.random()` calls in `src/hunt/`, `src/vault/`, `src/warCouncil/` |
| 400-line budget | every file created or grown measured with `(Get-Content <path>).Count`; tightest are `App.tsx` 393, `roundUiState.ts` 392, `WarCouncilRound.tsx` 390, `runTransitions.ts` 374, `bank.ts` 373 — all under |

Reviewers: Code-Evaluator **APPROVED**, Defender **APPROVED** (0 Critical, 0 Warning, 2 Info), QA found one scoped Prettier miss which was fixed and all four gates re-run green.

## A note for whoever comes next

**`BuffTrickContext` is the extension point for a twelfth condition family.** Adding one means widening `BuffConditionKind` in `buffCosts.ts` and then adding a case to `buffFires`'s `switch` — which will not compile until you do, because the switch is total with no `default`. That is deliberate: a family added to the cost table but forgotten in the evaluator would be a card the player can buy and that silently never pays.

Two conventions worth carrying forward:

- **`buffTrickFactsFor` mirrors `swanTierFactsFor`** — one producer of a `TrickFacts` fragment, read by both the commit and the preview. If you need a third per-trick fact, that is the shape.
- **The `Unassigned` trap has now been avoided four times** by reaching the pile through `offeredBuffs` / `activatableBuffs` / `isPricedBuff`. Keep doing that; `apCostOf` throws on placeholder content and there is still no `ErrorBoundary` (DLR-131).
