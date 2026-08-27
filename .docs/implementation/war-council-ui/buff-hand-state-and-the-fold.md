Part of [War Council UI](README.md).

# The hand's buff bookkeeping, and the fold that pays it out

Built by DLR-125, DLR-150. `buffRoundState.ts` is the felt's half of buff evaluation: it holds what a hand
knows about its own buffs, assembles that into the one `PlayCardOptions` all three readers share,
and folds a resolved trick's outcome back onto `RoundUiState`.

**It decides nothing.** Every rule lives one or two modules deeper — which buffs fire is
[hunt/buff-condition-evaluation.md](../hunt/buff-condition-evaluation.md), where a contribution
lands in the cash-out is [war-council/buffs-in-the-cash-out.md](../war-council/buffs-in-the-cash-out.md).
This module moves values between the felt and those two.

## Why it is its own file rather than three more fields on `roundUiState.ts`

`roundUiState.ts` stood at 379 of its 400-line blocking budget. `BuffHandState` plus its seeding and
its fold would have breached it. `roundUiState.ts` still owns the `RoundUiState.buffHand`
declaration and `createRoundUiState`'s call to `startBuffHand()`.

## `BuffHandState` — five fields, one lifetime

| Field                | What it holds                                                              |
| -------------------- | -------------------------------------------------------------------------- |
| `accrual`            | the hand's running `BuffBonusAccrual`, already clipped at its four caps    |
| `firedThisHand`      | ids of once-per-hand families that have already paid                       |
| `tricksWithoutHit`   | Unbloodied's condition counter                                            |
| `coinsEarned`        | Purse, accumulated this hand and handed up at hand's end                   |
| `applyDamagePressed` | DLR-109's reading — Apply Damage was **pressed**, not landed              |

The `accrual` row carries two more fields since DLR-150 — `carriedIn`, what seeded this hand, and
`carryOut`, what a Loss-firing Feeder has banked for the next one. Neither is a new channel: both
ride the accrual the fold already adopts wholesale. See
[hunt/the-feeder-carry.md](../hunt/the-feeder-carry.md).

> **DLR-150 gave the reset an argument.** `startBuffHand(carriedIn?)` forwards to
> `startHandAccrual(carriedIn)`, so a new hand's `accrual` opens on the Feeder carry the last hand
> banked rather than on zero — and `createRoundUiState` now passes `seed.feederCarry`. It is still a
> reset, and still the only one: the carry arrives as a value from `RunState`, and the hand's own
> figures start where they always did. Optional, defaulted to `EMPTY_BUFF_CARRY`, so all 11 existing
> seed literals reproduce today's game exactly. `createRoundUiState` and `RoundUiSeed` themselves
> moved to a sibling `roundUiSeed.ts` in the same ticket (`roundUiState.ts` had reached its 400-line
> budget) and are re-exported from `roundUiState.ts`, so no importer changed.

`createRoundUiState` calling `startBuffHand()` **is** the per-hand reset, which works because
`App.tsx` remounts the felt per hand (`key={hand}`) — the identical argument `startBuffActivation`
already makes for the AP pool. Nothing else writes the accrual, and no per-hit reset exists to write.

`applyDamagePressed` is set in `roundReducer.ts`'s `handleTapApplyDamage`, in the branch where the
press **commits** — the same transition that spends `APPLY_DAMAGE_AP_COST`. That is what makes Debt
Collector fire on the press rather than on the delayed landing.

## `buffHandInputFor` — reading the pile exactly once

The active set is `offeredBuffs(state)` filtered by `buffActivation.activatedThisTrick`. Reaching
the offered pile through `offeredBuffs` — which already routes through `activatableBuffs` — is what
keeps `BuffKind.Unassigned` placeholders out without a second filter anywhere. `firedOncePerHandIds`
resolves fired ids back to their `Buff` the same way, so an Event family that fired stays free to
fire again this hand while a Threshold or Terminal family is recorded as spent.

> **DLR-145 widened both readings from the pile to `pile ∪ spent-this-trick`, 2026-08-25.** Taker,
> Feeder and Sidestep became single-use, and `activateFromPile` removes a consumed card from
> `state.buffs` at the commit tap — before the trick it was spent on has resolved. Filtering the
> pile alone therefore found nothing and the card paid nothing: no throw, no refusal, no log. Both
> functions now build their candidate list as
> `[...offeredBuffs(state), ...state.buffActivation.spentThisTrick]`. The two sets are **disjoint by
> construction**, so nothing is double-counted and R5's overlap-bonus count is unaffected.
> `spentThisTrick` is cleared by `openBuffWindow` on the same edge that clears `activatedThisTrick`,
> which is what bounds it to one trick. The **"read the pile exactly once"** discipline this section
> is named for is unchanged — there is still one candidate list, built in one expression, and still
> no second filter. See
> [buff activation](../hunt/buff-activation-and-ap-costs.md#spentthistrick--how-a-consumed-card-still-gets-paid--dlr-145-2026-08-25).

The rest of the input is plain values the trick cannot supply: the accrual, the fired list, the
no-hit counter, `state.coins` (Miser), the player's red hearts (Cornered) and the press flag.
`RoundUiState.coins` is the run's purse at the **start** of the hand and is read-only for the hand's
whole life, exactly as `bankClimbBonus` is — a hand cannot spend coins, only the shop can. It arrives
through a new optional `RoundUiSeed.coins`, defaulted to `0`, so all 38 existing `createRoundUiState`
fixtures reproduce today's game exactly.

## `foldBuffOutcome` — R3's steps 1 and 5, after the trick has resolved

`foldBuffOutcome(prev, next)` fires on the `null → non-null` edge of `resolvedTrick` — the same edge
`openWindowOnTrickResolved` already uses — and is pure and two-argument, so StrictMode's development
double dispatch recomputes an identical value.

It credits the **delta** in `apRefunded` into `buffActivation.apPool` (step 1 — a dead credit since
DLR-145, since the `apRefund` axis no longer mints and nothing spends from the pool) and the delta in
`coinBonus` into `coinsEarned` (step 5); deltas rather than totals, because the accrual is the hand's
running figure and the pool has already been credited with everything before this trick. It then
appends the newly-fired once-per-hand ids and advances `tricksWithoutHit` through
`advanceTricksWithoutHit` — the engine's single statement of that counter, so the value the fold
stores and the value `resolveTrickBank` evaluated against cannot disagree.

**Two orderings are load-bearing.**

1. In `roundReducer`, `foldBuffOutcome` runs **before** `openWindowOnTrickResolved`. The fold reads
   this trick's activations; the window clear erases them. Reversed, the fold would read an empty
   slate.
2. The fold runs **after** the trick has resolved, never during it. A Second Wind refund the player
   could re-spend on the very trick that generated it is the loop `MAX_REFUND_PER_HAND` exists to
   bound — so the refund lands in the pool for the **next** window (R3's own note).

The `accrual === null` branch — a trick where no buffs were evaluated at all — still advances
`tricksWithoutHit`, because Unbloodied's streak is a fact about the hand rather than about the buffs
held.

## Purse — and, since DLR-150, the carry — leaving the hand

`ui.buffHand.coinsEarned` reaches `WarCouncilRoundResult.coinsEarned`, and `App.tsx` passes it to
`recordEncounter` as the optional `buffCoinsEarned` argument. **DLR-150 collapsed the construction
sites**: `WarCouncilRound.tsx` had two identical literals and `src/sim/playHand.ts` a third
hand-built copy, and all three now call `roundResultFor(ui)` in `roundResult.ts`. That same function
puts `ui.buffHand.accrual.carryOut` on `WarCouncilRoundResult.feederCarry`, which `App.tsx` and
`sim/playRun.ts` hand to `recordEncounter` as its optional eighth parameter. Nothing about the coin path is re-derived at the component: the figure was clipped at
`MAX_COIN_BONUS_PER_HAND` by the accrual long before it got here.

## No new effect, no new state manager, no memoisation

Nothing in this module adds a listener, timer, observer or `requestAnimationFrame`, and there is no
module-level mutable state. The two functions are pure; the fold is called from the reducer beside
`openWindowOnTrickResolved`; and the preview's per-render cost is bounded at `HAND_SIZE` cards times
the handful of buffs an AP pool can afford. No `memo`/`useMemo`/`useCallback` was added, and there is
no profiling evidence that would justify one.
