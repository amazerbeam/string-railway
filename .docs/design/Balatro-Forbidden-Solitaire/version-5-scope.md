# Version 5 — Catch-Up, a Hand-Long Shelf, and the First Boss Rule

Design scope agreed 2026-08-22, covering the next release. This is committed direction, not a
parking-lot idea — see [`ideas.md`](./ideas.md) for the wider candidate list this scope was drawn
from, and the run-winnability simulation
(`../../implementation/run-winnability-simulation.md`, including its 2026-08-22 addendum) for the
evidence behind it. **Revised same day, after a critique found the first draft aimed at the wrong
constraint** — see the note at the end of each section that changed.

## 0. What this scope answers, and what it doesn't

Two findings set the agenda, and a third correction narrowed it to what actually matters.

**First:** the run's own simulation harness had a bug. It reused a skull-dodge check that only ever
filters the Quarry's hand, so the "reasonable" simulated player was never actually skull-aware. Fixed,
fight one alone wins **73%** of the time over 300 trials (see the simulation doc's addendum), and
every remaining loss is a genuine forced follow-suit trap — real variance, not a rigged opener. **Fight
one is not this scope's problem.**

**Second:** the same fix, run across a full 25-fight attempt, still produced 0 clears out of 150, with
deaths landing mostly around fight 3–4 instead of fight 0.

**Third, and this is the number that actually sizes the work:** the run asks for a fixed amount of
damage and offers a fixed ceiling of health to survive it with, and the two are nowhere close.
`QUARRY_ENCOUNTER_HEALTH` sums to **1,395** across all 25 opponents (960 ordinary + 435 boss). The
player's health bar never restores mid-fight and clamps at `PLAYER_START_HEALTH` (10) between fights —
so the most damage absorbable across an entire run, even with a full heal before every single fight, is
roughly **260**. No amount of coin raises that ceiling; it's the bar, not the purse. Divide the two and
the run asks for a damage-dealt-to-damage-taken ratio of roughly **5.4**; the original, naive-strategy
simulation measured about **1.15**. That's a 4.7× gap, and only two shapes of purchase can close it —
something that multiplies what you deal, or something that divides what you take. **Whetstone is
already the first kind.** This scope's job is to make sure it ships something of the second kind that
actually qualifies, rather than several things that don't.

**Explicitly paused, on the developer's call, not part of this scope:** the shop moving from a fixed
menu to randomized, scarce offers, and any cross-run meta-progression on the game-permanent shelf. Both
stay exactly where DLR-89 left them — visible, honestly labelled, unbuilt.

## 1. Poison Guard is scrapped

Poison Guard existed to patch a problem Envenom itself creates — your own poison landing back on you —
and its own known tension (holding a Guard can suppress a cash-out that would have killed the Quarry,
costing you health instead of saving it) never had a good answer. Rather than fix the patch, this scope
removes it outright. The fight-long shelf's one existing item is gone; what replaces it is a genuinely
different kind of item (§3), not a like-for-like swap.

## 2. Envenom becomes Timebomb — one-time-use, price *unchanged*

Same mechanic, reframed only. Arm it, tap a card to mark it; the trick resolves normally, and at the
next trick's resolution whoever won it takes the delayed hit (4 to the Quarry, 2 to the player).

- **Renamed**, to close a collision already on record: rank 8 of every suit is named Poison and carries
  no rule at all, and the-hunt.md already flags this as a known tension. "Timebomb" describes the
  mechanic — a fuse that goes off one trick later — without touching a name the deck already uses for
  something else.
- **Price does not move.** The first draft of this scope raised Timebomb's price to compensate for
  Poison Guard's removal, on the reasoning that it needed to cover its own backfire risk. That's
  backwards: a poisoned trick the Quarry wins cleanly costs the player nothing at all — no health, no
  cash-out, streak intact — and still deals 4 to the Quarry. Judged by damage dealt per health spent,
  which §0's ratio makes the only figure that matters, that's already the best purchase in the shop by
  a distance. Raising its price to fund insurance against a risk that's mostly a misprediction (you
  mark a card expecting to lose with it; it only bites if you win instead) pulls against the whole point
  of this scope. Guard's removal is just a subtraction — nothing compensates for it.

## 3. A new hand-long shelf — Shield and Berserk

A duration tier between one-time-use (a single trick) and fight-long (the whole encounter): an effect
that lasts exactly one hand, cleared at the next deal.

**Shield.** The first **N** hits you'd take this hand cost you no health. **Revised from the first
draft, which specified "halves incoming damage."** `DAMAGE_PER_HIT` is exactly 1 — a whole heart, never
a fraction — so a percentage halving of a single hit is undefined: round down and it's total immunity
for the hand, round up and it does nothing. The only figure in the game that halves cleanly is
`ENVENOM_PLAYER_DAMAGE` (2), which would have made Shield, as specified, an item that mostly blunts
your own Timebomb backfire — the exact job §1 just deleted Poison Guard for. A count is the correct
unit: it's integer-safe, tunable in whole steps, and it expresses "caps the spike, doesn't touch the
average" more precisely than a fraction does — a fraction reduces the average too, a count only ever
removes the top of it. N is the developer's to pick.

**Berserk.** Doubles damage dealt *and* taken for the hand — both directions, so it needs its own
inbound-and-outbound multiplier rather than sharing Shield's counter (the two are different kinds of
mechanism now, not variants of one flag). **Worth being precise about what this buys:** doubling both
sides leaves §0's ratio exactly where it was — it doesn't make a run more survivable in either
direction. What it actually does is convert health-variance into coin, since the quick-kill payout pays
2× in a fight's first hand and Berserk's whole function is ending fights in hand one. That's a real,
legible playstyle fork worth having — it's just not a catch-up tool, and shouldn't be counted as one.

Shield and Berserk are **mutually exclusive within a hand**, not stackable. Combined, Shield's
hit-absorption plus Berserk's doubled-dealt-normal-taken would be strictly better than either alone at
every price where both are affordable — a dominant option neither is meant to be on its own.

## 4. The run-permanent catch-up item — Bulwark

**This section replaced Ward and Bandage entirely, on the same critique that fixed Shield.** The first
draft's catch-up pair both raised the fraction an *involuntary* cash-out pays (two-thirds since
DLR-94, toward full value). Worked against the settled cash-out table, the gap they buy back is small
exactly where it matters: at streak 1 the whole gap is 1 damage, at streak 2 it's 2 — and a run that's
struggling is a run of streaks that keep breaking short, not long ones that grow and get caught. Sized
against §0's ratio, even an infinite stack of the run-permanent version recovers at most the third that
forced cash-outs currently lose — roughly +20% on damage dealt, moving the ratio from 1.15 to about
1.39 against a target of 5.4. One Whetstone, at the same 4-coin price point, **doubles** the whole
curve. The pair was dominated by a shelf-mate at every price above roughly nothing, and — worse — it
paid *least* exactly when a run was going worst, reproducing the very pattern §0 exists to break.

**Bulwark** takes that shelf slot instead: a stacking run-permanent purchase where each copy raises, by
1, how many hits per hand cost you no health — the permanent, always-on version of hand-long Shield's
counter. This is the item that actually reaches §0's constraint, because it divides what you take the
same way Whetstone multiplies what you deal — buy both and they compound into a genuine build axis,
the first one in this shop that isn't just "a bigger version of the same number." It pays exactly when
a run is struggling, because a struggling run is one taking repeated hits, and that's precisely when a
per-hand hit-absorption count matters most.

Hand-long Shield isn't made redundant by this — it's the temporary top-up for one hand you have a
specific reason to worry about (you can see the deal looks bad, or you're walking into a boss), bought
without committing run-length coin to raising the permanent baseline.

**One trap to watch, inherited from the same idea in `ideas.md`:** if this or any version of it ever
stopped costing the streak (not just the health), losing a trick becomes free and the whole tension
`the-hunt.md` §7 is built on dissolves. Bulwark only ever removes the health cost of a hit, never the
cash-out or the multiplier reset — that distinction is load-bearing, not a detail.

## 5. Deck modification is *not* part of this scope

**The first draft shipped Graft here. It's cut.** Checked against the actual skull assignment
(`assignSkulls`: `Math.min(Math.round(hand.length * SKULL_DENSITY), eligible.length)`, a flat 2 of 6 at
today's density), branding one card out of eligibility doesn't reduce the Quarry's skull count — it
stays 2 either way, and Graft only *relocates* a skull, and only when the branded card both lands in
the Quarry's hand (18% of a hand) and would have been chosen (roughly a third at average weight) —
about 6% of hands. Worse, the active skull curve deliberately weights ranks 5–6 highest because those
are the ones the player's own card decides the outcome of; branding the card worth protecting most
pushes that risk toward the extremes the curve made rare *because* they have no counterplay. By the
curve's own stated reasoning, Graft is close to a coin flip on whether it helps or hurts. `ideas.md`
also already lists "anything that reduces skull density" as something the shop must not sell, since the
skull is the game's only inversion; Graft doesn't technically do that, but it's sold on the promise
that it does, which is its own problem.

**Chisel — permanently removing a card from the 33 outright — is the version that actually works**,
because a smaller deck genuinely changes what can be dealt (remove the Monarch and its follow-narrowing
rule retires for the run). It remains out of this scope for the reason the first draft already gave: the
deal assumes a fixed 33-card pool (6 + 6 + a 13th-card decree + a 20-card draw pile), and a shrinking
pool needs that logic costed properly first. No deck-modification item ships this cycle; Chisel stays a
candidate in `ideas.md` until that groundwork is scoped.

## 6. Diarmuid gets the rule-break the design already promises

`the-hunt.md` §9 already states the intent in writing: the final boss is meant to ignore follow-suit,
mirroring the player's own Cheat, and nothing enforces it today. This scope builds exactly that one
rule, scoped to Diarmuid alone. It's cheap specifically because the constraint already exists as the
player's Cheat logic in `legalMoves`; the boss version points the same mechanism the other direction.

**Worth stating plainly: this is the one change in the whole scope that makes the run harder, not
easier.** When the Monarch carried an equivalent permanent rule-break, a play session measured it at
five follows in twelve tricks with exactly one legal card, and its removal note records that it roughly
halved a hand's damage — so an ignore-follow-suit Diarmuid plays closer to 270 effective health than
135. That's not a reason to cut it — it's an already-decided piece of design, independent of this
scope's catch-up goal — but it's added at a fight no simulated run has ever reached, so its actual cost
is untested by anything in this document. The other four bosses remain ordinary opponents with more
health, unchanged.

## What isn't touched

`QUARRY_ENCOUNTER_HEALTH`, `PLAYER_START_HEALTH`, the shop's fixed-menu structure, and the
game-permanent shelf are all unchanged, on purpose — see §0.

## Open questions the developer still owns

- The placeholder names *Timebomb*, *Shield*, *Berserk*, and *Bulwark* — functional descriptions only,
  not chosen copy.
- Shield's N (hits per hand) and Bulwark's per-copy increment and price — the shape (a count, stacking
  on the run-permanent copy) is settled; the numbers are the developer's to set and tune by play.
- Whether Diarmuid's ignore-follow-suit should bind for the whole fight or only after some condition —
  `the-hunt.md` §9 doesn't specify, only that it's owed. Given §6's cost finding, also whether it should
  ship this cycle at all versus waiting until a run has actually been played that far.
- Chisel's deck-shrinking groundwork is not costed here and is not assumed to land in the release after
  this one either — it's a candidate, not a queued ticket.

## What would disprove this scope's own reasoning

Measure damage-dealt-per-damage-taken over a full run, per stage, with the skull-dodge fix in and
Bulwark actually purchased. If it's already well above 1.15 without Bulwark, §0's 4.7× gap is
overstated. If Bulwark stacked several times still leaves the ratio far under 5.4, the run needs a
second lever beyond this scope — most likely something that reaches `QUARRY_ENCOUNTER_HEALTH` directly,
which §0 currently takes off the table.
