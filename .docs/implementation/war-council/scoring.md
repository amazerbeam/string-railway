_Part of [War Council](README.md)._

### Spoils — the summed value of the one pile a side is paid for (DLR-49, DLR-67, DLR-69)

`spoils(state, side, scheme = cardValueSchemeFor(declaredPath(state)))` in `spoils.ts` is the additive
term of the Hunt scoring equation (`.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`
§1/§3). It resolves **which** capture pile this side is paid for, then reduces over it — each card
contributes `scheme.value(card.rank)` and nothing else. See
[Trick resolution](trick-resolution-and-play.md)'s `capturedCards` section for how the piles fill up.

**The declaration decides the pile, not just the per-rank value (DLR-69).** The two lines that do it:

```ts
const paidFor = scheme.paidPile === PaidPile.Other ? otherSide(side) : side
return state.capturedCards[paidFor].reduce((total, card) => total + scheme.value(card.rank), 0)
```

On Win `paidPile` is `Own`, so a side sums its own pile at printed rank. On Lose it is `Other`, so a
side sums the *other* side's pile at `12 − r`. §1's invariant — "each pile is counted exactly once, by
the side that did not win it" — therefore **needs no counter, no set, and no bookkeeping**: it falls
out of each side reading exactly one pile and the two sides reading different ones. `otherSide` is
already the module's single statement of "the other seat", so the pile swap is the same crossing
`huntDamage` performs on the damage axis, applied on the value axis.

**Exactly two non-test sites index a capture pile** — `playCard.ts` writes a captured trick into the
winner's pile, and this function reads one. That is the property worth grepping for if the
counted-once invariant is ever suspected: a third site indexing `capturedCards[…]` is how it would
silently break.

**Nothing is added or subtracted on top.** DLR-49's Treasure(+1)/Poison(−1) fold was removed by
DLR-67 — see [the declaration and the Lose path](declaration-and-lose-path.md) for the reasoning and
the design citation. There is no modifier anywhere in this function.

**`scheme` carries both axes on purpose, and defaults off the state's own declaration** via
`cardValueSchemeFor(declaredPath(state))` (see
[../hunt/scoring-tunables.md](../hunt/scoring-tunables.md)). It stays injectable so a test can
substitute a flat `{ value: () => 1, paidPile: PaidPile.Own }` and prove the summation itself is
correct independent of the real per-rank values, the same pattern `resolveStanding` uses. **A value
scheme is never re-derived at a call site.**

> **Why one parameter and not two.** Splitting the value function and the paid pile into separate
> parameters would make a genuinely bad state reachable: a caller injecting the Lose value function
> while the pile defaulted from an undeclared state would apply inverted values to the **own** pile —
> which is precisely the DLR-67 interim DLR-69 retired, reproduced by a caller who supplied half the
> answer. Bundling them makes that unrepresentable while keeping both injectable.

The signature has churned three times and is worth reading in that light: DLR-49 built it
single-branch over the capture pile at `cardBaseValue`; DLR-63 added a Lose-declared-player branch
over credited cards plus a fourth `inverted` parameter; DLR-67 deleted that branch and both extra
parameters, returning it to one branch pointed at `cardValueFor`, so the Lose path's inversion reached
Spoils through a *value scheme* rather than a *branch*; DLR-69 widened that scheme from a bare
function to a `CardValueScheme` carrying the pile as well, which is what finally made the Lose path
read the right pile.

Its production consumers are `scoreHunt` (below) and the Hunt screen, which calls it indirectly
through `scoreHunt` for both sides every render.

> **The interim is closed.** Each side being paid for its own capture pile on both paths was never
> §1's design — §1 specifies the two-way swap, and DLR-67 chose the own-pile reading as a coherent
> intermediate while the Lose-credit pool it replaced was removed. **DLR-69 landed the swap on
> 2026-08-12**, so this file no longer describes an interim. `__tests__/huntEnumeration.test.ts` now
> carries §8's published fourteen-row Lose column rather than the interim column DLR-68 pinned, and
> `__tests__/spoils.test.ts` asserts the counted-once property directly against the discarded branch
> that would double-count the Quarry's pile.

### The Hunt outcome — `scoreHunt` (DLR-50, DLR-67)

`scoreHunt(state, side, scheme?, standingTable?)` in `scoring.ts` is §1's whole equation for one
finished round, returning a `HuntDamage` of `{ spoils, tricks, band, standing, damage }`. It reads
`state.tricksWon[side]` for the trick count, calls `resolveStanding(tricks, standingTable)` once for
the band and its multiplier, calls `spoils(state, side, scheme)` once for the additive term, and
multiplies the two — `damage = spoils × band.multiplier`.

Every field comes from a single pass over an **already-final** `RoundState`; there is no accumulator,
no loop over tricks, and no mutation, so the function is safe to call repeatedly and meaningless to
call mid-round. `standing` and `band` are not independent lookups — `standing` is literally
`band.multiplier`, so the two can never disagree.

**Both optional terms now default off the state's own declaration** (DLR-67):
`scheme = cardValueSchemeFor(declaredPath(state))` and
`standingTable = standingTableFor(declaredPath(state))`. They defaulted to the base card value and
the Win table until then, which was only correct while the Demand made the player's side the sole
thing being scored. This is a change the compiler could not catch — the *types* did not move, only
the values — which is why `__tests__/scoring.test.ts` pins the defaults by comparing a no-argument
call against an explicit one, `it.each` over both paths, at a 4-trick split where the two tables
genuinely disagree (Win ×2, Lose ×5). A default re-pointed at the wrong table fails loudly there.

**DLR-69 strengthened that fixture, because the swap made it vacuous.** Its state gave the Quarry an
empty pile, so once the Lose path scored the player off the Quarry's pile both sides of the assertion
were `0` and the test passed while proving nothing. The Quarry now gets a non-empty pile.

They stay injectable so a test can hold one term flat while varying the other. Since DLR-69 the card
term is one object rather than two independent parameters — see the note under Spoils for why the pile
cannot be injected apart from the value function.

**Both sides are scored now.** DLR-67's screen calls `scoreHunt` once per side and derives a
`Record<PlayerSide, HuntDamage>` from it, feeding the same record to the end panel and to
`WarCouncilRoundResult.damage` — so the number the player reads and the number the mount reports
cannot diverge. Until then only the player's side was ever computed, because the design scored the
player against a Demand rather than the Quarry.

#### What DLR-67 deleted from this file

- **`tricksToPoints` and `scoreRound`** — the end-of-round band lookup and its two-sided wrapper.
  They existed to feed `WarCouncilRoundResult`, which now carries `scoreHunt`'s damage per side
  instead.
- **`checkDemand` and `DemandOutcome`** — the inclusive comparison of a score against a target,
  returning `'cleared'` | `'missed'`. §1 retires the Demand outright: there is no threshold, so
  there is no verdict.

The rename that came with them: `HuntScore` became `HuntDamage` and its `score` field became
`damage`, adopting §1's vocabulary ("**damage** — a side's card value × its Standing for the Hunt,
applied to the other side once at the end"). The rename stopped deliberately short of `scoreHunt`
itself and of the `Spoils` term.

**That inconsistency is now permanent, not transitional.** DLR-67 recorded it as something DLR-68
would finish; DLR-68 did not. Asked whether its AC1 rename of `spoils` → `cardValue` should be
allowed to reach the three read sites in `.tsx` files it would break, the developer declined it
outright — *"spoils is an ok name to code with for a prototype and if we want to change the UI later
I can"* (2026-08-12). `scoreHunt` keeps its name for the same reason: renaming it would churn three
call sites in the mid-round UI ledger for no behavioural gain. So a function called `scoreHunt`
returns a `HuntDamage` whose first field is `spoils`, and that is a decision, not a leftover. The
docblock on `HuntDamage` in `scoring.ts` states it at the type, so nobody re-opens it from the
ticket's text alone.

### Rounding, at exactly one point (DLR-68)

`scoreHunt`'s `damage` field is `roundDamage(spoilsValue * band.multiplier)`. That call is the **only**
place in the project where a raw product becomes damage — greppable, and worth keeping that way — so
every `HuntDamage` value in the program means the same thing: *rounded, applicable damage*.

The placement is deliberate and was chosen over the obvious alternative. Rounding one level up, inside
`huntDamage`, would also satisfy "exactly one point" — but it would leave `scoreHunt`'s `damage`
unrounded and `huntDamage`'s rounded, giving one type two meanings depending on which function
produced it. Here the type is honest everywhere instead.

`roundDamage` is `src/hunt/config.ts`'s half-away-from-zero rule (see
[../hunt/scoring-tunables.md](../hunt/scoring-tunables.md)); DLR-68 is its **first production caller**,
which is exactly what DLR-66 anticipated when it shipped the function with no consumer.

Two consequences worth knowing:

- **The ×0.5 bands can no longer produce a fractional health value.** Both tables carry one, so before
  this an odd card sum in a Greedy or Humble band gave a `.5` total.
- **It changed a number already on screen, without touching a UI file.** The end panel reads
  `scoreHunt`'s `damage`, so a Hunt whose card value is odd in a ×0.5 band now renders e.g.
  `123 × 0.5 = 62` — correct, and arithmetically odd-looking to a player reading the equation. The
  presentation call belongs to the health-bar ticket. Separately, `HuntLedger.tsx`'s **mid-round
  preview computes its own unrounded `spoils × multiplier`**, so the in-play figure and the end panel
  can disagree by 0.5 until that duplicate is removed — see
  [../war-council-ui/hunt-readouts-and-telegraph.md](../war-council-ui/hunt-readouts-and-telegraph.md).

### Two-sided damage — `huntDamage` (DLR-68)

`huntDamage(finalState)` in `scoring.ts` is the module's answer to the question the code had never
asked: **which health bar does each of the two numbers land on.** It returns a `HuntOutcome` of
`{ declaration, incoming }` and does four things in a fixed order.

**It guards first, and throws rather than returning a zero.** `phase !== RoundPhase.Complete` throws
`HuntNotScorableError` with `reason: 'unfinished'`; a missing `state.declaration` throws with
`reason: 'undeclared'`. Both run before any arithmetic, so a caller cannot receive a
partially-computed answer. The reason codes are a closed `as const` map, `HuntNotScorable`, shaped
exactly like `DeclareRejection` (`declareHunt.ts`) and `IllegalMoveReason` (`types.ts`) — so a test
asserts *which* guard fired without matching a message string.

> **Why a throw and not a `DeclareResult`-style union.** A result union lets a caller ignore the
> failure and carry on, which is the precise outcome the ticket forbids: a `damage: 0` return is
> indistinguishable from a legitimately scoreless Hunt and would be applied to a health bar as real,
> authorised damage of zero. And `resolveStanding`'s `RangeError` propagates through here regardless,
> so an exception path exists either way — a union would have had to wrap it or leak it past a
> total-looking type.

`HuntNotScorableError` is the **first `class` anywhere in `src/`** and the first non-`RangeError`
throw, deviating from the three bare `RangeError`s in `src/hunt/config.ts`. That was approved
deliberately: the ticket distinguishes three failure modes and a bare built-in cannot carry which one
fired. Its `reason` is declared as a field and assigned in the constructor body rather than written as
a parameter property — `erasableSyntaxOnly` is on and forbids that form.

**It reads the declaration directly off `state.declaration`, and pointedly not through
`declaredPath()`.** That helper defaults an undeclared round to Win so the mid-round readouts have a
table to display before the player declares — right for a readout, and wrong here. Routed through it,
an undeclared Hunt would score cleanly off the Win table and deal real damage that no rule
authorised. `types.ts`'s docblock on `declaredPath` now records this, so the next reader does not
"simplify" one into the other.

**It resolves both terms once and hands the same pair to both seats** — `cardValueSchemeFor(declaration)`
and `standingTableFor(declaration)`, passed into two `scoreHunt` calls. This is what makes "both sides
read the player's one declaration" structural rather than merely tested: there is one declaration, it
is read once, and the Quarry reading a different table is not a bug that could occur and be caught
but a state the code cannot express. `DeclarationState` has no side key, so "the Quarry declared
something else" is unrepresentable.

Since DLR-69 that one resolution carries three facts rather than two — the value function, **the pile
each side is paid for**, and the table. So "the two sides read different piles" is one crossing
performed inside `spoils`, not a per-seat decision either caller could get wrong.

**It crosses the two results, once, here.** `incoming` is keyed by the side the damage is **applied
to** — `incoming[PlayerSide.Player]` is what the Quarry dealt and what depletes the player's health —
built through `otherSide()` so the crossing reads as the rule it is.

> **A dealer-keyed record was the obvious shape and is the wrong one.** Keyed by who *dealt* the
> damage, every consumer has to remember to invert, and the first one that forgets subtracts the
> player's own damage from the player's own health — a bug that type-checks, runs, and produces
> plausible numbers forever. Keying by target moves that inversion into the engine, performed once, in
> a function whose test asserts it. The next ticket's read is
> `playerHealth -= outcome.incoming[PlayerSide.Player].damage`, correct on its face.
>
> The test that pins it uses **deliberately asymmetric trick counts** — player 9, Quarry 4 — so
> `incoming[Cpu].tricks === 9` can only hold if the Quarry's incoming damage came from the *player's*
> nine tricks. A symmetric fixture would pass under either keying and prove nothing.

`HuntOutcome` exposes that **one** keyed view rather than two. A second `dealt` view keyed by the
dealer was considered and dropped: two keyings of the same two objects is the second source of truth
this project's single-source rule exists to prevent, and a caller wanting "what the player dealt"
reads `incoming[Cpu]` correctly.

**Nothing calls it yet.** It is exported from the barrel and exercised only by Vitest; the health bars
that consume it are a later ticket's. Note a name hazard while that is true: `WarCouncilRound.tsx`
holds a **local `const huntDamage`** passed as a prop of the same name, so the first UI ticket to
import the engine function into that file must rename the local first.

### Agreement with the design document — `__tests__/huntEnumeration.test.ts` (DLR-68)

A second spec file exists because it answers a different question from `scoring.test.ts`, and the two
failure meanings should not be mixed. `scoring.test.ts` asks *does the function behave*;
`huntEnumeration.test.ts` asks *does configuration still agree with the design document*.

It enumerates all **fourteen trick splits under both declarations** at average card values, and its
two halves are deliberately different in kind:

- The **enumeration** rows **transcribe** `hybrid-design.md` §8's published damage products as frozen
  literals. They are a canary: if `src/hunt/config.ts`'s tables are retuned, 28 assertions fail, which
  is the entire point. A failure here is a real finding about config having drifted from the design
  doc — not a broken test to adjust.
- The **antisymmetry** property `Net(k) = −Net(13 − k)` **derives** every expectation from
  `standingTableFor(...)`, naming no multiplier and no total, so it survives any table pair the
  developer swaps in.

Collapsing them into one spec would lose whichever guarantee the shared fixture did not happen to
provide.

Both use cards of **rank 6** throughout, which is not arbitrary: §8's frame is "average rank 6", and 6
is the fixed point of the Lose inversion (`12 − 6 = 6`), so `2k` cards of rank 6 are worth exactly
`12k` under **both** value schemes. That is what lets a function whose signature takes only a
`RoundState` be checked against the design table with no injected value function.

> **The Lose column is knowingly not §8's Lose column.** §8 assumes the pile swap, so it publishes
> `78 / 0` at `k=0`; own-pile valuation gives `0 / 156`, and the sign of the whole column inverts once
> DLR-69 lands. The fixture asserts own-pile and says so in a comment at the array. DLR-69 replaces
> that array with §8's.

This couples `src/hunt/config.ts` to the design document on purpose. A table retune is therefore a
two-file change — config plus this fixture — and then the design doc itself.

### An inherited numeric hazard

`resolveStanding` throws a `RangeError` outside 0–13 rather than returning a number for every
conceivable input, and `scoreHunt` does not catch it. That is deliberate — `tricksWon` is initialised
at `0` by `dealRound` and incremented once per trick, bounded by `TRICKS_PER_ROUND` (13), so an
out-of-range count means the round state is itself corrupt and should fail loudly rather than
silently score as `0`.

Two related properties worth not breaking: `spoils` is a sum over a possibly-empty array with an
initial `0`, so an empty capture pile returns `0` and never `NaN`; and **Standing multipliers are not
all integers** — both shipped tables carry a ×0.5 band — so any readout, format string or test
pattern that assumes an integer multiplier is wrong. A spec written with a bare `\d+` against a
multiplier's `aria-label` was corrected on DLR-67 for exactly this reason.
