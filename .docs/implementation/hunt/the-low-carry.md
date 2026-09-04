Part of [Hunt](README.md).

# The low carry — a reward that leaves the hand that earned it

Built by DLR-150, renamed onto the two-axis vocabulary by DLR-165. A **Suit Low** card pays for not
taking a trick, and until DLR-150 its reward landed in the same hand's accrual — where the cash-out
that a Defeat itself triggered spent it immediately, into a pot that was near zero precisely because
the streak had just reset. Three deliberate Defeats in a bad hand paid three points into three tiny
cash-outs and accumulated into nothing. The defect was never the size of the reduction; it was that
the reward was spent at the worst possible moment instead of accumulating.

This page covers the whole path: where the split is decided, how the carry crosses a hand boundary,
and where it dies. What a Suit Low card's condition _asks_ is
[condition evaluation](buff-condition-evaluation.md); where a payable bonus lands inside a trick's
damage is
[war-council/buffs-in-the-trick-damage.md](../war-council/buffs-in-the-trick-damage.md); the readout
is [war-council-ui/hunt-readouts-and-telegraph.md](../war-council-ui/hunt-readouts-and-telegraph.md).

## The split is by outcome, and the outcome is stated exactly once

The rule needs the **outcome axis** — did the trick bank or hurt — not the **mechanical axis**
(`playerWentHigh`, did the player physically take the cards) that every buff condition reads. On a
skull trick the two disagree: going high on a skulled trick is a **High Defeat**, and going low on
one is a **Low Victory**. `src/warCouncil/streak.ts` already owns that inversion, once, in the total
`TAKEN` table behind `isTaken` — and `isTaken(outcome)` is already exactly "this trick banked".

So nothing in `src/hunt/` re-derives it. `resolveTrickBank` computes the outcome it was going to
compute anyway and supplies `!isTaken(outcome)` as a plain boolean:

```
resolveTrickBank → resolveTrickBuffs(input, ctx, trickIsDefeat) → resolveFiredBuffs(accrual, fired, trickIsDefeat)
```

`resolveTrickBuffs` passes it straight through and reads it for nothing of its own. **The tempting
shape was rejected deliberately**: a `trickWasDefeat(ctx)` predicate in `buffEvaluation.ts` reading
`playerWentHigh === skullTrick` would have been a second statement of the game's single most misread
rule, sitting in a different module from the first.

## `resolveFiredBuffs` — one branch, Suit Low only

```ts
return trickIsDefeat && buff.kind === BuffKind.SuitLow
  ? accrueCarry(running, axis, buff.reward.value)
  : accrueAxisBonus(running, axis, buff.reward.value)
```

Everything else is unchanged, and three consequences of that are deliberate rather than oversights:

- **A Low Victory pays into the hand exactly as before.** A skull trick the player did not take
  banks, so `trickIsDefeat` is false and the card's reward goes through `accrueAxisBonus` and counts
  toward the Overlap Bonus alongside every other buff that fired on that trick.
- **Only Suit Low carries.** A **Suit High** card that goes high on a trick carrying a skull has
  fired on a High Defeat and still pays into the hand it lost. That is today's behaviour — and the
  reading most likely to be revisited. The wider rule (_any_ buff firing on a Defeat carries) is one
  line's difference here.
- **The Overlap Bonus is unchanged.** It still lands in this hand's multiplier accrual on every
  trick, including a Defeat where the reset then wipes it.

## `BuffCarry` and `accrueCarry`

> **DLR-156 made the carry's payout inert, and this section is the record of that.** The carry is
> still earned, still crosses the hand boundary, still rides on `RunState`, and is still shown on
> the felt — but **nothing spends it any more**. The damage a trick deals is now computed by
> `trickBonusFor` from the buffs fired _on that trick_, and it never reads the hand's accrual, so
> the two figures the carry seeds are no longer part of any equation. The mechanism below is intact
> and its wiring is unchanged; what it fed was deleted. **A ticket restoring the carry has to decide
> where a carried-in bonus lands under the new equation** — most plausibly as a term inside the next
> banked trick's bracket — and that is a design decision, not a repair.

`BuffCarry` is `{ multiplierBonus, flatDamageBonus }` — structurally identical to the deleted
`CashOutBonus`, and deliberately so: the carry seeded exactly the two figures a cash-out could
spend. It is a distinct **named** type because it lives on `RunState` and crosses the mount seam in
both directions. `EMPTY_BUFF_CARRY` is the module `const` for none of it, in the style of
`EMPTY_BUFF_ACCRUAL`.

`accrueCarry(accrual, axis, amount)` adds one Defeat-firing Suit Low card's reward into
`accrual.carryOut`, never mutating its argument. It is **uncapped**: R6's four `MAX_*_PER_HAND`
ceilings bound what a hand may _pay_, and the carry pays nothing in the hand that earns it. On
`Coins` or `ApRefund` it **throws a `RangeError` naming the axis** rather than accruing a plausible
zero. That branch is unreachable today, because `MintableRewardAxis` is exactly Blade and Momentum;
it exists so a widened axis union fails loudly instead of minting a card that quietly pays nothing.

## `carriedIn` / `carryOut`, and why seeding beats a second pool

`BuffBonusAccrual` carries two `BuffCarry` fields. **These two kept their names through DLR-165** —
they are about the carry itself, not about which family earned it, so there was nothing to rename:

| Field       | What it holds                                                                        |
| ----------- | ------------------------------------------------------------------------------------ |
| `carriedIn` | what seeded this hand. **Display only** — the seed is already inside the two figures |
| `carryOut`  | what a Defeat-firing Suit Low card banked this hand. Never payable this hand         |

`startHandAccrual(carriedIn = EMPTY_BUFF_CARRY)` writes the carry straight into `multiplierBonus`
and `flatDamageBonus`, with `multiplierPaid` / `flatDamagePaid` at zero. That is what made the carry
spendable through **every** cash-out route with no new arithmetic anywhere — routes DLR-156 has
since deleted, so the seeding still happens and pays nothing (see the note above).
`startHandAccrual` remains the **only** reset this module exports.

The rejected alternative was a separate `carriedIn`-payable pool inside `payableCashOutBonus`.
(Reading it back after DLR-156, the rejected shape is the one a restoration would now have to build
anyway, because the pool it was an alternative to no longer feeds anything.) **Seeding therefore
depends on both damage caps being infinite**, which they are
(`MAX_MULTIPLIER_BONUS_PER_HAND` and `MAX_FLAT_DAMAGE_BONUS_PER_HAND` are both
`Number.POSITIVE_INFINITY` since DLR-145) — if either became finite, `accrueAxisBonus`'s `Math.min`
would clip a seeded carry _down_ on the next accrual of that axis.
`src/hunt/__tests__/buffCarry.test.ts` asserts both constants directly, so that day produces a named
failing spec rather than a carry that silently vanishes.

`carriedIn` is kept as a field although nothing reads it to decide a payout, so the readout can show
the opening figure for the **whole** hand rather than only at trick 0.

## The run holds it between hands, and `lowCarryAfter` kills it at the fight

`lowCarryAfter` lives in `src/hunt/runCarry.ts` with the other fight-boundary helpers, moved out of
`runTransitions.ts` when that file crossed the 400-line budget.

`App.tsx` remounts the felt per hand (`key={hand}`), so nothing inside the felt can survive a hand
boundary by construction. `RunState.lowCarry` is where the per-fight figure lives — seeded
`EMPTY_BUFF_CARRY` by `startRun` and **never persisted**, exactly as `coins` is not.

The seam, in both directions:

```
RunState.lowCarry
  → WarCouncilMountProps.lowCarry?   (optional, defaults to EMPTY_BUFF_CARRY — apCapacity's precedent)
  → RoundUiSeed.lowCarry?            (optional, so every existing seed literal is untouched)
  → startBuffHand(carriedIn) → startHandAccrual(carriedIn)
  … the hand plays …
  → roundResultFor(ui) puts accrual.carryOut on WarCouncilRoundResult.lowCarry (REQUIRED, so the
    compiler enumerates every construction site — coinsEarned's precedent)
  → recordEncounter(…, lowCarry?)    (optional trailing parameter; App.tsx and sim/playRun.ts are
    the only callers that pass it)
```

`recordEncounter` adopts it through a named rule:

```ts
export function lowCarryAfter(encounter: EncounterState, carry: BuffCarry): BuffCarry {
  return isEncounterResolved(encounter) ? EMPTY_BUFF_CARRY : carry
}
```

One statement of "a carry does not outlive the fight that earned it", a named function rather than
an inline ternary. It is deliberately **not** a reset in `advanceRun`: a _lost_ fight ends the run
and never reaches `advanceRun` at all, and the rule is "wiped at the fight boundary, whether the
fight was won or lost". So the carry compounds hand to hand **within** a fight and never across one.

`src/sim/` walks the identical seam (`playHandWindows.ts`'s seed → `playHand.ts`'s
`roundResultFor(ui)` → `playRun.ts`'s `recordEncounter`), so the headless simulator measures the
game the felt plays. `HandReport` reports the pair as `lowCarryIn` / `lowCarryOut` — the simulator's
own field names, read straight off `accrual.carriedIn` / `accrual.carryOut`.

## Momentum came back to the Suit Low family

DLR-145 had cut it to Blade-only for exactly one reason: a Suit Low card's condition is
`!ctx.playerWentHigh`, which covers a **Low Defeat and a Low Victory alike**, and a multiplier raised
on the Defeat half was wiped by that Defeat's own reset before it could ever be spent. The carry
removes precisely that failure mode, so the `TEMPLATE_FAMILIES` row went back to
`BLADE_AND_MOMENTUM`: 6 Suit High + **6** Suit Low + 2 Skull Low condition templates.

The eight cut condition families and the two cut reward axes (Purse, Second Wind) stay unreachable.
That restored one row, not the pruning.

## What is not decided

Nothing here chose a number, and two of these are the reason the mechanic is on screen before it is
tuned.

- **The carry's size.** It reuses the existing shared reward ladders unchanged, so a bronze **Blade**
  Suit Low card carries `+1` damage and a bronze **Momentum** one carries `+2` multiplier
  (`REWARD_TIER_VALUE`: Magnitude 1/3/5, Multiplier 2/3/5). The recorded risk is that this is too
  small to be felt. **Developer's, after playing.**
- **Whether the Momentum Suit Low card should have its own ladder.** It ships on the shared
  `REWARD_TIER_VALUE[Multiplier]` ladder, which invents no number, but the card is substantially
  bigger than the damage version. **Developer's.**
- **Whether Suit-Low-only is the right scope**, and **whether the Overlap Bonus should follow the
  trick's outcome too.** Both above; both the developer's.
- **Whether the carried-in readout should be persistent** (as built) or a one-off flourish at hand
  start. Pacing judgement, **the developer's**.

## Tests

- `src/hunt/__tests__/buffCarry.test.ts` — the Defeat route into `carryOut`, the Low Victory route
  into the payable axis, `startHandAccrual`'s seeding, the infinite-cap regression, and a Suit High
  card on a Defeat still paying into the hand.
- `src/hunt/__tests__/run.lowCarry.test.ts` — `startRun`'s empty seed, the carry surviving
  `recordEncounter` on an unresolved encounter, and `lowCarryAfter` wiping it on a resolved one, won
  or lost.
- `src/app/warCouncil/__tests__/WarCouncilRound.lowCarry.test.tsx` — the mount-level regression that
  a seeded carry reaches the felt and a banked carry leaves it.
