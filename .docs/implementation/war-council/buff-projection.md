Part of [War Council](README.md).

# The two-branch buff projection — "if I play THIS card, what do my buffs pay?"

`buffProjection.ts` answers one question, for one card the player is considering: **which of the
buffs riding this trick would fire, and what would they pay — if the player takes the trick, and if
the player does not.** It is the buff-side sibling of `src/app/warCouncil/cardDamage.ts`, which
does the same job for damage, and it shares that file's shape down to the flag naming the one thing
it cannot know (`exact` there, `skullKnown` here).

DLR-152 built it deliberately ahead of the activation UI that would read it, so for one ticket it
shipped with a full spec and no call site inside `src/`. **DLR-153 is that consumer**:
`src/app/warCouncil/buffRideModel.ts` calls `projectBuffBranches` once per legal card and builds the
lit hand, the reach figures and the per-card breakdown off the result. `buffReach` is the one export
that still has no caller — see the last paragraph of its own section below.

## Why it delegates everything, and what that buys

The module is a **thin adapter, not a calculator**. It performs no condition evaluation and no
accrual arithmetic of its own: it builds a `BuffTrickContext` from plain values, hands it to
`firedBuffs`, hands the result to `resolveFiredBuffs`, and returns what comes back. Every rule the
preview appears to know — the cadence filter, the four per-hand caps, the Overlap Bonus, and
DLR-150's Feeder carry — is **inherited because those two functions apply it**, never because this
file reproduces it.

That discipline is the whole reason the module exists. The DLR-147 mockup re-derived the buff
predicates in the view layer and reported +6 damage for a load whose real ceiling was +4: a preview
built on a second copy of the rules drifts from the rules, and it drifts silently, because nothing
type-checks the second copy against the first. Delegating means a preview cannot disagree with the
commit, and the spec pins that as an assertion rather than a hope — `buffProjection.test.ts`'s AC2
block rebuilds the same context by hand and runs it through `resolveTrickBuffs`, the function
`resolveTrickBank` calls on a real trick, then diffs the fired ids and the accrual against the
projection. If the module ever stops delegating and starts deriving, that test fails.

**It contains no `switch` over `BuffConditionKind`, and must never gain one.** `buffFires` is
deliberately total, so a twelfth condition family fails to compile there and nowhere else. A
parallel table here would compile fine and silently never fire the new family — the exact failure
the total switch exists to prevent. A Phase 3 grep audit checks for this by pattern.

## The face-down card, and why one branch is not one answer

`skullTrick` enters as `boolean | null`. `null` does not mean "no skull" — it means **the player
leads and the Quarry's card is face down, so the reading is not knowable.** The module treats that
as a fact to report rather than a gap to fill, and it costs a second evaluation pass: the readings
to try are `[skullTrick]` when it is known, and `[false, true]` when it is not.

The consequence is larger than which buffs fire, and it is what drives the return shape. Since
DLR-150, `resolveFiredBuffs` takes a third argument, `trickIsLoss`, derived from the **outcome**
axis — and on the `playerWon: false` branch the outcome is a **Dodge** when the trick is skulled
and a **Clean Loss** when it is not. A Feeder fires identically in both (its predicate has no skull
term at all), but its reward is **payable this hand** on a Dodge and **carried into the next hand**
on a Clean Loss. Reporting a single figure there would be right about the amount and wrong about
when the player can spend it.

So each branch returns `outcomes` — one `{ outcome, accrual }` entry per still-possible
`TrickOutcome`. A follow gives one entry; a lead gives two. `trickIsLoss` is derived per entry as
`!isTaken(trickOutcomeFor(playerWon, reading))`, reading `streak.ts`'s table rather than restating the
skull inversion, exactly as `resolveTrickBank` does.

## `indeterminate` falls out of a diff, not out of a name

A buff that fires under **every** still-possible reading lands in that branch's `fired` set. One
that fires under some readings but not all is lifted out into the projection's single
`indeterminate` set, deduplicated by `BuffId` across both branches.

Today that set contains only Sidestep, and only on a lead — but **nothing in this module knows
that.** The split is a set difference over the per-reading results, so the module holds no knowledge
of _which_ family reads the skull and cannot fall out of step with `buffFires`. A future
skull-reading family is handled here with no edit. The ticket's "today only `sidestep`" became a
test assertion instead of an implementation constant.

DLR-153 surfaces the same diff a second way, without changing what it means. `branchFor` already
computed each branch's own indeterminate set before merging it into the projection-level union and
discarding the per-branch value — that discarded value is now kept as `BuffBranchProjection.mayFire`.
`indeterminate` is untouched and stays the deduped union of `won.mayFire` and `lost.mayFire`; the
split is still a plain set difference over `perReading`, so `mayFire` carries no knowledge of which
family produced it either. The reason to keep it: a consumer that wants "how many buffs could this
branch pay" — the reach figure the activation UI reads — needs the per-branch ceiling, and computing
that from the projection-level union alone would mean re-deriving which entries belong to which
branch, exactly the second copy of the rules this module exists to prevent.

## `buffReach` — how many cards could fire this buff

`buffReach(input, legalCards, buff)` runs the same projection once per card and counts a card when
the buff appears in **either** branch's `fired` set **or** in `indeterminate`. "Could fire"
deliberately includes "might fire": a reach of 0 for a Sidestep on a lead would read as "this buff
is dead" at exactly the moment the player is deciding whether to activate it.

**It has no consumer, and that is a decision rather than an oversight.** DLR-153, the ticket that
would have called it, derives reach from its own per-card projection map instead: `buffReach` takes
ONE hand-wide `skullTrick`, and a card the player holds that is itself skulled makes the trick
skulled whatever the Quarry plays — so a hand-wide reading would report that certainty as a maybe on
a lead. The function stays exported and specced for a caller that genuinely has a single reading for
the whole hand.

Legality is the caller's, not the module's. `legalCards` is the caller's `legalMoves(state,
PlayerSide.Player, options)` output, and an illegal card is not counted **because it is not in the
list** — the module takes plain values rather than a `RoundState`, so it could not compute legality
itself even if it wanted to. The spec asserts the exclusion directly: a card sitting in `hand` that
matches the buff perfectly is not counted when it is absent from `legalCards`.

## What the caller supplies, and the one line to revisit later

`BuffProjectionFacts` is `BuffTrickContext` minus the five fields a candidate card and a branch
decide — `playerWon`, `skullTrick`, `playerSuits`, `playerRanks` and `remainingSuits`. The first two
come from the branch and the reading; the last three come from the candidate card, with
`remainingSuits` derived by removing that card from `hand`, the way `buffTrickFactsFor` derives it
from `remainingHand`. `playerSuits` and `playerRanks` are **plural** — one candidate card means a
single-element array, not a scalar.

Everything else the caller passes in unchanged, and **that includes `playerHit` and
`bankAfterTrick`, which are held constant across both branches even though they genuinely differ in
the real game.** Deriving them would mean restating the outcome→damage and outcome→bank-climb rules
that `streak.ts` owns, which is the duplication this module exists to prevent. It is inert today
because the only condition families reading them — Hoarder and Unbloodied — are cut and
unconstructible. A ticket restoring either family is the ticket that must revisit this, and the
type's own docblock says so rather than leaving it to be discovered.

Two further limits were recorded as deliberate rather than left to drift: **no `gain` delta is
exposed** (the consumer can subtract two accruals itself, and a second arithmetic surface here would
be the very duplication the module prevents), and the branch fields are named `won` / `lost` rather
than `taken`. `taken` was unavailable: `streak.ts`'s `isTaken` is the **outcome** axis, where a Dodge
counts as taken, so a `taken` branch here would mean the opposite of the neighbouring helper. Each
branch carries an explicit `playerWon: boolean` and a docblock naming the mechanical axis.

## The suit crossing, stated once

`buffTrickFacts.ts` already owned the `Suit → BuffTargetSuit` map, privately. DLR-152 needed the
same crossing and exported it as `targetSuitOf(suit)` in that file, routing that file's own two
lookups through the new function. `TARGET_SUIT` itself stays `const` and stays module-private, so it
remains the single total map and a member added to `Suit` still fails to compile there rather than
mapping to `undefined`. The crossing is stated exactly once; it is now merely reachable by name.

## Cost, purity, and what cannot go wrong here

The module is pure: it never mutates its inputs, reads no clock, no random source and no global, and
holds no module-level mutable state — its only module-scope binding is a frozen two-element readings
constant. It lives under `src/warCouncil/**`, already covered by `eslint.config.js`'s pure-core
override, and imports only `../hunt`, `./bank`, `./buffTrickFacts`, `./cardUtils` and `./types`.

Worst case per call is 2 branches × 2 readings × `active.length` predicate evaluations, with
`active` bounded by the activation stock; `buffReach` multiplies that by `legalCards.length`,
bounded by the hand. This runs on hover or selection of a hand card, not per pointer move, so no
memoisation was added and none is justified without profiling.

No division is introduced anywhere, so no `NaN` can be minted — the only arithmetic is
`resolveFiredBuffs`'s existing `Math.min` clamping and `overlapBonusFor`'s `Math.max(0, n - 1)`. The
module never throws and never swallows; the one throw reachable through it is `accrueCarry`'s
existing `RangeError` for a non-carrying axis, unreachable from a mintable template and deliberately
left to propagate rather than caught into a plausible zero. A buff that does not fire is not an
error state — it is a legitimate player mistake, represented as absence from `fired`.
