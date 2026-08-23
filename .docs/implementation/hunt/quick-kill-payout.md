Part of [Hunt](README.md).

# The quick-kill payout — paying for how fast a fight ended

`src/hunt/quickKill.ts` (DLR-95) prices a win by **how much of the player's hand was still unspent
when the Quarry's bar hit zero**, scaled by which hand *of that fight* the killing blow landed in.
It is the second thing in the game that credits a coin, and the first that pays a variable amount.

Before DLR-95 a win paid a flat `COINS_PER_ENCOUNTER_WIN` and nothing else, so a fight won on the
first trick and a fight ground out over five hands paid identically — the run's economy had no
opinion about how the fight went. See
[Coins and the shop](coins-and-the-shop.md) for the flat coin and everything it buys.

## The rule

```
payout = floor(unplayedCards × tier(handOfFight))
```

`unplayedCards` is how many cards were left in the player's hand at the instant the Quarry's health
reached zero. `tier` is a lookup into `QUICK_KILL_TIER_MULTIPLIERS` in `config.ts` — `[2, 1, 0.5]`,
transcribed from `version-4-scope.md` §4, which marks the curve "Confirmed as final". So:

| Hand of the fight | Tier | 5 cards left pays |
| ----------------- | ---- | ----------------- |
| 1st               | ×2   | 10                |
| 2nd               | ×1   | 5                 |
| 3rd               | ×0.5 | 2 (floored from 2.5) |
| 4th and after     | ×0   | 0                 |

**The tier IS the coins-per-card rate**, not a separate multiplier applied to one. The design's "1
coin per card left unplayed" is the ×1 second-hand tier; there is deliberately no
`QUICK_KILL_COINS_PER_CARD` beside the curve, because two numbers that must multiply out to a
documented figure are the pair that drifts.

### The array's length is the taper

`quickKillTierMultiplier` returns `QUICK_KILL_TIER_MULTIPLIERS[handOfFight - 1] ?? 0`. A hand past
the end of the curve is not an error — it is the design's deliberate taper, "to avoid a hard cliff
a player learns to resent". That makes the array's **length** part of the rule: extending or
shortening the curve is one edit in `config.ts` and no code change at all.

### Where the floor lives, and which way it rounds

`quickKillPayout` is **the only place `Math.floor` is applied to this figure**. `Coins` is
documented in `types.ts` as a whole number, never fractional, and the ×0.5 tier is the one that can
produce a half — so flooring at the single point the figure is computed is what stops a fraction
ever reaching a purse, rather than trusting whichever caller remembers. It floors rather than
rounds so the artefact never falls in the player's favour, the same direction `forcedCashValue`
already floors in.

The multiplication needs none of the numerator/denominator treatment
`FORCED_CASH_OUT_NUMERATOR`/`_DENOMINATOR` required: `2`, `1` and `0.5` are all exactly
representable in binary, so the product is exact and the floor only ever removes a genuine `.5`.
`2/3` is not, which is why that pair had to be split. The claim is tested rather than asserted —
`quickKill.test.ts` loops every `(hand, cards)` combination up to `HAND_SIZE` and asserts
`Number.isInteger` on each result.

### Both entry points throw rather than return `NaN`

`quickKillTierMultiplier` throws a `RangeError` on a `handOfFight` that is not a positive integer;
`quickKillPayout` throws on an `unplayedCards` that is negative or non-finite. This follows
`flaskHealAmount`'s precedent for its stated reason: a fractional or `NaN` index yields `undefined`,
which becomes `NaN` on the multiply, lands in `coins`, and then vanishes from the purse with nothing
logged anywhere. Nothing catches either throw — reaching one is a caller bug and must surface.

Note the asymmetry that is *not* a guard: an out-of-curve hand returns `0` deliberately, because
that is the taper. Only a malformed hand number throws.

## Which hand of the fight — a second counter, not the existing one

The rule needs to know which hand of the **current fight** is being played, and nothing in the
codebase could answer that. `App.tsx` already holds a `hand` counter, but it is **run-global**: it
is React's remount `key` and it feeds `dealerForRound`'s parity, so it can never reset. Repurposing
it would have broken both. `RunState` therefore gained a second, differently-scoped counter:

```ts
readonly handOfFight: number      // 1-BASED: a fight's first hand is 1
readonly lastQuickKillPayout: Coins
```

**The counter lives on the run rather than in the driver**, and that placement is the load-bearing
choice. The rule is "reset whenever a new encounter starts", and `startRun` and `advanceRun` are
exactly the two functions that start one — so putting it here makes the reset **structural** rather
than something three separate callbacks in `App.tsx` have to remember, and the fourth callback added
later is the one that would have forgotten. It also means `recordEncounter` reads the hand number
off the run it was handed instead of taking it as a second new parameter.

`startRun` seeds it `1`. `advanceRun` resets it to `1`. `recordEncounter` advances it through a
named private helper, following `guardAfter` and `flaskAfter`'s established shape:

```ts
function handOfFightAfter(run: RunState, encounter: EncounterState): number {
  return isEncounterResolved(encounter) ? run.handOfFight : run.handOfFight + 1
}
```

`App.handleComplete` calls `recordEncounter` once per hand whether or not the fight ended, so "the
fight continues, therefore the next hand is n+1" is a rule that transition can own outright. The
counter **holds still on the hand that ended the fight** rather than incrementing past it — which
is what lets the payout, and any later reader, say which hand the kill landed in.

## Crediting is additive, and must stay that way

```ts
coins: wonThisEncounter ? run.coins + COINS_PER_ENCOUNTER_WIN + quickKill : run.coins,
```

A won fight pays the flat coin **and** the quick kill. The ticket flagged this as genuinely
ambiguous — the design doc's Definition of Done does not say whether the new payout stacks on the
flat coin or supersedes it — and **the developer resolved it as additive on 2026-08-20**. The
reasoning is worth keeping, because it is what stops a later reader "simplifying" the sum back into
a replacement: the taper to ×0 at hand four means that under the superseding reading, a
fourth-hand kill would pay literally nothing for winning a fight. The flat coin is what guarantees
that floor.

The payout is computed once above the return:

```ts
const quickKill: Coins =
  wonThisEncounter && unplayedCards !== null
    ? quickKillPayout({ unplayedCards, handOfFight: run.handOfFight })
    : 0
```

`run.handOfFight` is read **before** `handOfFightAfter` runs, so it is the hand the kill actually
landed in.

### `recordEncounter`'s sixth parameter is required on purpose

```ts
unplayedCards: number | null
```

`null` is the legitimate value for a hand that did not end the fight — not a failure, and not a
defaulted zero. The parameter is **required rather than optional**, which is this module's
established idiom (`cheats`, `timebombCharges` and `blastGuardHeld` all arrived the same way): the
compiler then enumerates every call site. A defaulted `null` would pay 0 forever the first time a
driver forgot to thread the figure through, and would do it silently. The cost was 31 mechanical
test-call edits, which is exactly the point of the enumeration.

### The receipt is written on every call, including losses

`lastQuickKillPayout` records what the payout just paid — `0` included, and on a lost fight too.
A field written only on a win is the field that shows the **previous** fight's payout on this one's
verdict. `RunOutcomePanel` renders this figure rather than re-deriving the rule from state a
component would have to hold in parallel, which is what keeps that panel's documented "computes
nothing" property true. See
[../run-ui/verdict-panel.md](../run-ui/verdict-panel.md).

`advanceRun` deliberately lets `lastQuickKillPayout` ride through its spread untouched — the
verdict is never on screen at that point, and the next `recordEncounter` overwrites it.

## Where the count comes from

`src/hunt/` never learns what a hand of cards is. `applyDamage` has no notion of either side's hand
and does not gain one; the figure arrives as a plain `number`, the same way `bankClimbBonusFor`
takes a plain number rather than a `RunState`. The count is observed one layer up, in the app's
round reducer, at the exact transition where the encounter resolves — see
[../war-council-ui/interaction-and-state.md](../war-council-ui/interaction-and-state.md).

One consequence worth stating, because the design doc's worked example depends on it: the count is
taken **after** the killing trick's own card has left the player's hand. `playCard` removes it
before the trick resolves, so a first-trick kill leaves 5 of `HAND_SIZE` 6 — which is what makes
"a first-hand, one-trick kill with five cards left pays 10 coins" come out right. That figure is
pinned as a regression test in `quickKill.test.ts`.
