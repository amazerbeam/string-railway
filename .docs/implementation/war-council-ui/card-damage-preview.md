Part of [War Council UI](README.md).

# The per-card damage preview — asking the resolution rather than re-deriving it

Every card in the hand carries a small strip beneath it reading `W<n> L<n>`: the damage the
Quarry takes if that card **wins** its trick, and the damage the player takes if it **loses**.
Built by DLR-117, extended by DLR-125 (which met its AC3 — see below).

The strip's whole reason to exist is that the numbers are true, so the interesting part of this
mechanic is not the rendering — it is the single decision that makes the numbers impossible to
disagree with what the game actually pays.

## The one rule this module obeys: it performs no damage arithmetic

`cardDamagePreview` in `cardDamage.ts` does not compute damage. It builds a hypothetical
`TrickFacts`, hands it to `resolveTrickBank` (`src/warCouncil/streak.ts`), hands the resulting
`TrickResolution` to **`applyResolution` in `commitHandlers.ts` — the same fold a committed trick
goes through** — and reports the **health delta** it reads back off the returned encounter:

```
toQuarry = before.health[Quarry] - after.health[Quarry]
toPlayer = before.health[Player] - after.health[Player]
shielded = before.shieldHearts - after.shieldHearts
```

Because the figure is a delta across the real fold, everything that fold does is inherited rather
than restated: `absorbWithShield`'s blue-heart absorption, `deplete`'s zero floor on health, D7's
rule that a Quarry killed by the event spares the player entirely, and DLR-109 AC3's rule that a hit
destroys an Apply Damage payout due at the same resolution. There is no second `Math.min(shield, …)`
anywhere in the preview, no second copy of the damage formula, and no second `DAMAGE_PER_HIT`. **This is why DLR-156's new equation reached the preview with no arithmetic change at all** — the largest single saving in that ticket.

`applyDamage`'s own docblock in `src/hunt/encounter.ts` sanctions exactly this: _"Returns a new
state; the input is never mutated. That is what lets a caller preview an event by applying it to a
copy, rather than writing a second projection routine that could drift from this one."_

**The cautionary case is in this module.** `projectedDepletion` in `duelHealthBars.ts` carried its
own absorption arithmetic and previewed red hearts breaking that blue hearts would in fact have
absorbed, until DLR-115 routed it through `absorbWithShield` behind a deliberately undefaulted fifth
`shieldHearts` parameter. See [The duel's health bars](duel-health-bars.md). DLR-117 avoids
reintroducing that class of defect by never owning a figure it could get wrong.

A consequence worth knowing: the preview is also **immune to the `breaking`-overlay over-draw**
`roundBars.ts` documents. That defect exists because the overlay needs the _absorbed_ portion of a
landed hit and `ResolvedTrick` does not record it; this preview only ever needs the health delta,
which `applyDamage` returns directly.

## What DLR-117 had to export, and why that is safe

`playOptions` and `applyResolution` (with its `FoldedResolution` result type) were module-private in
`commitHandlers.ts` because nothing outside the commit path had needed them. DLR-117 added `export`
to all three — **visibility only, no signature and no behaviour change**. Their pre-existing call
sites are still exactly the three each inside `commitHandlers.ts`; the preview is the only new
consumer of either.

Reusing `playOptions` rather than reading the queue again is the same single-statement discipline its
own docblock already argued for: the preview and the commit cannot read "what is pending" differently,
because they ask the same function. The run facts it carries — `baseDamageBonus` (the Whetstone
count **summed with this fight's earned Treasure bonus**), `swanTier` and `buffs` — arrive from it
with `playCard.ts`'s own `?? 0` / `?? false` defaulting reproduced field for field. (It carried four
Timebomb-and-Guard facts until DLR-166 deleted them.)

## The only facts the preview assembles itself — and the only ones that can be wrong

Three fields of `TrickFacts` are not `playOptions`':

- `finalTrick` — `round.tricksPlayed + 1 === HAND_SIZE`. Always exact.
- `skullTrick` — `trickIsSkulled`, called with `skullsOn(round)` so a **cursed** card counts, over
  the **cards the player can actually see**: the Quarry's lead if it is already on the table, plus
  the card being considered.
- `treasureTrick` — whether a 7 is in that same visible set.

The last two are the only facts that can be wrong, and only in one direction. While the player is to
**lead**, the Quarry's card is face down, and dealt skulls go to the Quarry — so a skulled Quarry
card would turn the high branch from a `HighVictory` into a `HighDefeat` and invert both figures. The
preview says so rather than guessing silently: `exact` is `true` only when
`round.currentTrick.length === 1`, and both rendered forms carry the flag.

**The preview deliberately never resolves which branch will actually happen**, even though it could.
`chooseCpuCard` in `src/warCouncil/cpuPlayer.ts` is fully deterministic, so after the player picks a
card the Quarry's answer — and therefore the winner — is computable. Collapsing the two branches into
one certain number would leak the Quarry's exact card past `TELEGRAPH_FIDELITY`, which
the (since-deleted) `previewQuarryIntent` existed precisely to avoid: it gave suit and stance and
nothing more. **DLR-148 deleted the telegraph outright**, so this preview and
[the consequence readout](felt-rail-and-the-trick-readout.md) are now the only two surfaces that say
anything about what a trick will do — and both state **both** branches, for this same reason. Two
conditional branches is the design-preserving reading, not a limitation.

## When nothing is previewed

`cardDamagePreview` returns `null` — and `HandFan` then renders no strip and leaves the card with no
`aria-describedby` at all — when `round.phase === RoundPhase.Complete` or the encounter is already
resolved. The guard is checked **before** `applyResolution`, because `applyDamage` throws a
`RangeError` on a resolved encounter and a throw during render would unmount the tree. A confident
`0 / 0` was rejected as the alternative: it would read as "no damage" when it means "nothing to
preview".

## Two forms, and where each one is announced

`labels.ts` owns both, as it owns every other piece of copy on this screen:

| Export                       | Form                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `cardDamageGlyphText`        | The compact `W6 L1`, or `~W6 L1` for an estimate. Rendered `aria-hidden`.     |
| `cardDamageText`             | The full sentence — both branches, both sides of each, any shield absorption. |
| `CARD_DAMAGE_ESTIMATE_NOTE`  | The caveat appended to the sentence while the Quarry's card is face down.     |
| `CARD_DAMAGE_ESTIMATE_GLYPH` | The `~`. A form signal, not colour — paired with an italic slant in the CSS.  |

**The visible form carries two figures; the spoken form carries all four.** The two shown are the
card-_dependent_ ones. The two omitted were identical whichever card was played and were already
previewed on the health bars — DLR-101's ticking hearts and DLR-86 AC3's at-risk band. **The ticking
hearts went with the Timebomb on DLR-166**, so the at-risk band is the whole of that argument now.

`cardDamageBranchText` omits a zero term rather than saying "0 damage to you", and says `no damage`
when a branch costs nobody anything — which is reachable, and is exactly DLR-90 AC5's REPLACED clean
loss, the branch a player most needs stated plainly.

## The numbers reach a screen reader as a description, never as the card's name

The strip sits **beside** the card button, not inside it, and the button points at it with
`aria-describedby` — a new optional `describedBy` prop on `PlayingCard`. `cardAccessibleName` is
untouched, and deliberately: a card's accessible name is its identity, and folding a derived figure
into it would both conflate two different claims and break the 37 assertions across this suite that
query cards by exact name. Ids are composed from `useId()` plus `cardKey(card)`, so two hands could
coexist without colliding.

This is also what makes the readout testable the way DLR-117 AC4 asks: component specs query
`getByRole('button', { name, description })`.

## Where it sits on screen, and what that cost

The strip could not go on the card face. All four corners are taken — rank top-left, skull
top-right, wild mark bottom-left, ability pip bottom-right — and the centre is the large suit
mark, so there is no free area at a legible size. Keeping the numbers off the face also keeps
`game-ux`'s "the cards take visual precedence" intact.

So `HandFan` wraps each card in a `.wc-fan-slot` flex column and puts the strip beneath it.

> **The slot outlived the fan that named it.** DLR-117 introduced `.wc-fan-slot` with an inline
> style split across two elements: `--wc-fan-rot` and `--wc-fan-lift` on the `PlayingCard` button,
> where `warCouncilCards.css` composed them with the hover and armed states, and `margin-left` and
> `z-index` on the slot, because the slot was the flex item participating in the fan's layout and
> stacking order. The DLR-149 follow-up retired the fan — that overlap was making a slice of every
> card's visible face hit-test to the wrong card — so all four are gone and `HandFan` sets no inline
> style at all. The wrapper stays, because the strip still needs a column to sit in; only its name
> is a fossil. See [Layout and styling](layout-and-styling.md).

`useRovingTabIndex`'s `focusIndex` queries `groupRef.current.querySelectorAll('button')` — a
**descendant** query — so the extra wrapper changes neither the arrow-key order nor the count, and
the strip is a `<span>` that never enters that list. See [Accessibility](accessibility.md).

**Vertical cost: roughly 7-12px on the `hand` grid row** — one line of
`calc(var(--wc-card-w) * 0.2)` text plus a `calc(var(--wc-card-w) * 0.04)` gap, less the ~3.2px of
slack already inside `.wc-fan`'s `min-height`. No grid row was added to `.wc-shell`, and `.wc-fan`'s
lift-reserve top padding was deliberately **not** spent. (That reserve was DLR-119's territory at the
time; it is now `calc(var(--wc-card-w) * 0.35)`, re-derived by the DLR-149 follow-up once the
rotation term left it.)
See [Layout and styling](layout-and-styling.md).

## Live updating needs no machinery at all

`WarCouncilRound` passes `damageForCard={(card) => cardDamagePreview(ui, card)}` — a fresh inline
closure over committed reducer state, every render. There is **no effect, no memoisation, and no
second copy of state**, which is exactly what makes DLR-117 AC2's "updates live, without a refresh
the player has to invoke" free: the hand re-derives on every render and cannot go stale. The cost is
bounded — at most `HAND_SIZE` cards × 2 branches = 12 `resolveTrickBank` + `applyResolution` pairs
per render, each a handful of integer operations, on a surface driven by discrete taps rather than
pointer moves.

## What the preview does not show — the honest list

1. ~~**A Timebomb this card would BOOK for the next trick.**~~ **Closed by DLR-166** — nothing books
   damage for a later trick any more, so there is no deferred cost for the delta to be missing.
2. **Gross damage.** Every figure is a health delta and `deplete` floors health at zero, so "win: 4"
   against a Quarry on 4 health means "enough", not "exactly 4". This matches how `duelHealthBars`
   already truncates overkill.
3. ~~**Anything an activated buff would add.**~~ **No longer true — DLR-125 wired it, and the
   prediction below held exactly.** The entry used to read that `buffAccrual.ts` had no caller, that
   DLR-117's **AC3** was therefore not met, and that it would become true "with no edit to any file
   described here the moment accrual is wired into `playOptions`". DLR-125 wired it, and **AC3 is
   now met**: `playOptions` gained a `buffs` field, `cardDamage.ts` gained the one line that spreads
   `buffTrickFactsFor(visible, remainingHand, options.buffs ?? null)` into the hypothetical
   `TrickFacts`, and everything else — R3's five-step order, the four per-hand caps, the Overlap
   Bonus, the once-per-hand spend of the Momentum and Blade pools — is inherited through
   `resolveTrickBank` and `applyResolution` rather than restated. The preview still performs **no**
   damage arithmetic of its own. See
   [The hand's buff bookkeeping, and the fold that pays it out](buff-hand-state-and-the-fold.md).
   - One structural note, raised as an Info finding by DLR-125's defender review and left as a note
     rather than a change: the preview derives `remainingHand` as
     `state.round.hands[Player].filter(...)`, which is **structurally different** from the commit's
     post-ability hand in `playCard`. The two coincide only because both reduce to an empty hand at
     every reachable final trick — an invariant that is true today, but is nowhere stated and nowhere
     tested. It is moot while Keepsake cannot fire (see the Known defects in
     [hunt/buff-condition-evaluation.md](../hunt/buff-condition-evaluation.md)), and live the moment
     it can.
4. **DLR-117's AC1 gate — still deliberately not built, and still deferred after DLR-125.** "Once
   any buff is active for the hand" was scoped out again: the readout is always visible, because
   the streak's two figures, a Treasure in the trick and the final trick all
   already move these numbers, and hiding a true number until a buff fires would withhold it for no
   reason. Hiding and revealing a readout that is currently always on screen is a judgement about
   what the felt looks like at rest, which is the developer's, and DLR-125 was an `engine`-labelled
   ticket. **Do not read AC3's arrival as AC1 having landed with it.**

## Verifying it has not drifted

Three checks, run as the closing phase of DLR-117 and cheap to re-run:

- `Select-String -Path src\app\warCouncil\cardDamage.ts -Pattern "applyResolution|playOptions|resolveTrickBank"`
  — the module's only routes to a damage figure.
- `Get-ChildItem src\app\warCouncil -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Math\.min\(.*[Ss]hield|absorbWithShield"`
  — expected to find only `duelHealthBars.ts`'s pre-existing calls and this module's docblock prose.
- `cardDamage.test.ts` reads every expected figure off the engine's own `DAMAGE_PER_HIT`,
  the engine's own `potValue` rather than hard-coding a number, so the spec would actually
  catch drift rather than pinning whatever the code happened to produce.
