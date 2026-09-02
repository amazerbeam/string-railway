# The Hunt: a Balatro × Forbidden Solitaire treatment of The Fox in the Forest

This is a design, not a research survey: it describes one specific single-player game, not a menu
of options. Every genuine fork below names the branch this design takes and buries the discarded
one in a single line — a section that lists options without choosing one is a failed section, not
a style choice. The parent games' rules are **cited, not restated**, per the single-source-of-truth
rule in `CLAUDE.md`; nothing in `balatro.md`, `forbidden-solitaire.md`, or `fox-in-the-forest.md`
is transcribed here.

**Given constraint.** The opponent is a CPU. That is a constraint handed down by DLR-44, not a
design choice this document makes or is free to re-open.

**Read alongside:**

- [`balatro.md`](./balatro.md) — what Balatro does and what it teaches.
- [`balatro-play-notes.md`](./balatro-play-notes.md) — a play session's notes on how Balatro
  _presents_ itself, mapped onto this design's screens: which of its readouts The Hunt already ships,
  which are gaps, and which are structurally unavailable here.
- [`forbidden-solitaire.md`](./forbidden-solitaire.md) — the clear-is-the-damage coupling and the
  toll-booth argument this design is built to avoid.
- [`../../game_rules/fox-in-the-forest.md`](../../game_rules/fox-in-the-forest.md) — the base game:
  the trick-count table, the odd-rank abilities, the decree/trump rule, the follow-suit rule.
- [`../design-principles.md`](../design-principles.md) — the frameworks and
  the §6 critique checklist this document is run against in §12.
- [`ideas.md`](./ideas.md) — the parking lot: ideas not yet argued for, and the record of which
  ones were rejected and why. Nothing there is settled; nothing here depends on it.

---

## The direction: both sides deal damage, both hold health

This design is a duel, not a solitaire round graded against a target. Before the first card of a
Hunt, the player declares **Win** or **Lose** — pre-Hunt, after the deal, exactly as it is built
(`the-hunt.md` §3) — and that single declaration governs the whole Hunt for both sides. **Both
sides read that same declaration's** card values and multiplier table; the Quarry never declares
for itself.

**Card value** depends on the declaration, not on who is holding the card: on Win, a card is worth
its printed rank, 1 through 11; on Lose, a card is worth `12 − r`, so 11 down to 1. No modifier of
any kind touches either value — no Treasure `+1`, no Poison `−1` (§1).

On the Lose path the two capture piles swap both ways: you are paid for the cards **the Quarry**
captured, at inverted value, and the Quarry is paid for the cards **you** captured, at inverted
value. Each pile is counted exactly once, by the side that did not win it.

Both sides read the same multiplier table for whichever declaration is in force, and the two tables
are exact complements — `Lose(k) = Win(13 − k)` at every one of the fourteen possible trick splits,
with no exceptions:

| Final trick count | Win path | Lose path |
| ----------------- | -------- | --------- |
| 0–3               | ×1       | ×0.5      |
| 4                 | ×2       | ×5        |
| 5                 | ×3       | ×5        |
| 6                 | ×4       | ×5        |
| 7                 | ×5       | ×4        |
| 8                 | ×5       | ×3        |
| 9                 | ×5       | ×2        |
| 10–13             | ×0.5     | ×1        |

Both sides hold **health** — 1,350 each (§9) — and each side's `card value × multiplier` for the
Hunt just played is **damage** dealt to the other side's health, rather than a score compared
against a target. Damage is applied **once**, at the end of the thirteenth trick, and it is forced
rather than chosen: the multiplier is read off the _final_ trick count, so no total can be applied
— or even known — before the last trick resolves.

**Why the Quarry never declares for itself, stated because a later reader will try to "fix" it.**
Leaving the Quarry free to declare looks like a missing symmetry, not a rule. It is not missing:
the two tables' complementarity is exact, so a Quarry declaring the _opposite_ path from the player
would make the two mirrored tables and the two mirrored value schemes cancel exactly, netting zero
damage in every one of the fourteen splits at average card values. Free declaration for both sides
deletes the game — this rule is load-bearing, not an asymmetry that slipped through.

Every figure below that is keyed to the old 108-point ceiling, or to a single ×6-family multiplier
table, is **void**. §3 restates the arithmetic under the two tables above rather than carrying the
old numbers forward.

---

## 1. The equation

```
damage = card value × Standing
```

evaluated once at the end of each 13-trick round (**the Hunt** — §10 carries the full vocabulary),
for both sides, and applied to the other side's health rather than checked against a target (the
direction, above).

**The additive term is now exactly the printed ranks of the cards on your side, with no modifier
of any kind.** `Spoils` is retired as a named term along with the comparator it used to feed —
there is no score, and there is no Demand to check one against. What survives is the shape: card
value is additive, every card you're paid for adds to your total, and nothing about the term
itself punishes taking more. The direction section above states the two value schemes (printed
rank on Win, `12 − r` on Lose) and the pile-swap that decides whose cards you're paid for on the
Lose path.

**Standing** is a multiplier read off the band your final trick count lands in — now two tables,
one per declaration, both stated in the direction section above and expanded in the `###`
subsection below. The **band boundaries** are still taken unchanged from the base game's own
printed end-of-round table (`fox-in-the-forest.md` → End-of-round scoring): Humble 0–3, Defeated
4/5/6, Victorious 7–9, Greedy 10–13. The **values** are no longer a transcription — §6 retires the
proof that made the printed values a live problem, and the values themselves are the two tables
above, designed rather than printed, capped at ×5 on either path.

Why this equation and not a fresh one: Fox in the Forest's signature property is that winning
too many tricks is punished exactly as hard as winning too few. In the base game that property
lives in a lookup table bolted onto the end of the round. Making it the _multiplicative_ term of
the scoring equation instead means overreach is punished by the arithmetic itself, not by a rule
someone has to remember to apply. That is Knizia's method (`design-principles.md` §2) — the
German designer whose approach is to find the single scoring principle that reshapes every
decision, and to prefer a system that punishes overreach through its own arithmetic rather than a
bolted-on consequence. Fox in the Forest already has that principle sitting in its scoring table;
this equation just promotes it from a table lookup to a term of the game's one equation.

The two terms are also different **growth classes**, in the sense `balatro.md` §1.1 / §2.1 argues
is the load-bearing property of `Score = Chips × Mult`: card value adds, Standing multiplies. No
device that only raises card value can ever cross a Standing threshold it doesn't independently
reach.

**The asymmetry, stated rather than implied.** Balatro's two terms are independent axes — a Joker
can raise one without touching the other. These two are not, and the difference matters enough to
name here rather than leave to be discovered downstream:

- **Standing cannot be built.** No device in the table below raises it directly; every device
  listed as intervening on Standing does so by changing which tricks you win. It is capped at ×5,
  permanently, and is better read as a **gate you must not fail** than as a multiplier you grow.
- **At flat card value the two terms would have been the same variable — a retired hypothetical.**
  Winning `k` tricks would capture cards worth exactly `2k`, collapsing the additive term to a pure
  function of trick count. That regime never shipped: card value is decided at printed rank (the
  direction, above), so the two terms are independent from the first Hunt — a trick's two cards
  are not fixed at value 12, and card value varies apart from trick count by construction. §3
  carries the arithmetic this decision replaces.

§3 derives the ceiling that follows from this, and what it forces the outer loop to be.

**Component table.** Every device this document proposes anywhere below is required to be an
intervention on one of these two terms — neither term is optional cover, both are load-bearing.

| Device                                   | Intervenes on                            | How                                                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capturing a trick                        | Card value                               | Adds the two cards' value — printed rank on Win, `12 − r` on Lose — to the total you're paid for.                                                                                                       |
| A Forage edit that raises a card's value | Card value                               | Changes what that card is worth the next time it is captured — an edit to the additive term's unit price, not a new term.                                                                               |
| A Forage edit that moves an ability      | Standing, usually                        | Most odd-rank abilities constrain who wins a trick or who leads next, which shifts your final trick count and therefore your Standing band.                                                             |
| A Quarry rule-break                      | Standing, usually — sometimes card value | A round-long rule that changes which tricks you can win shifts your trick count; one that curses a card's value shifts the additive term instead. Either way it is an intervention on an existing term. |

Three rows are **deleted rather than converted**, each for its own reason:

- **The Demand row.** It was the table's one entry that was not an intervention on either term —
  "it is the comparator" — and there is no comparator now: a side's total is damage to the other's
  health, not a number checked against a target.
- **The Treasure (7) row and the Poison (8) row.** Rank 7 keeps its identity as a named card and
  does nothing for now; rank 8's `−1` goes. The arithmetic that justifies dropping both: at ×5 a
  ±1 card modifier moves a Hunt by 5 damage out of 540 — under 1% — so both rules were paying
  rules budget for a rounding error.

Every surviving row is still an intervention on one of the two terms — that rule is what this
section exists to enforce, and it does not relax.

Any device that would add a third scoring channel — a resource, a bonus, or a track running
alongside card value and Standing — is a design defect, not a table entry: it competes with the
equation this section just established as the whole of the game's scoring vocabulary. §8 drops
the base game's Goal cards for exactly that reason.

**Discarded branch: a per-trick combo bonus.** One proposal read each trick captured as a "combo,"
paying every card in the pile `+1` per combo — `Spoils = Σranks + 2k²` in the old vocabulary.
Rejected on three counts: it fixes no documented problem, since its job was feel and pending
damage (§6) does that job better and for free; `2k²` depends on trick count alone, so it escalates
the numbers without escalating the choices a player makes; and it forces a recomputation of a
value the developer owns rather than the design. Its motivating arithmetic — a ×18 → ×30
break-even — was computed against the single ×6-family table and is **void**.

### The declaration, the two tables, and what each side is paid for

The declaration is what lets one equation serve two roles. Without it, `card value × Standing`
would have to mean one fixed thing; with it, the player chooses each Hunt which of two regimes
both sides play under. Why the choice exists at all, and when it is made, is `the-hunt.md` §3's
procedure to state — this subsection carries only the _why_.

Both tables are reproduced in the direction section above. Their defining property is that they
are exact complements: `Lose(k) = Win(13 − k)` at every one of the fourteen trick splits. That is
a **property**, not a coincidence dressed up as one — it is what makes the same-path rule above
hold. Swap declarations and you are reading the same table backwards, so two sides on opposite
paths cancel exactly.

**Why the Lose table peaks at 4–6 rather than at 0–3, derived rather than asserted.** On the Lose
path you are paid for the cards the Quarry captures, and the Quarry is paid for the cards you
capture — so every trick you win is material handed to the opponent. Taking a trick therefore does
two things on this path at once: it lowers your own pile, and it hands the opponent a card to be
paid for. The peak sits at 4–6 because that is where those two costs are still worth paying — fewer
tricks than that leaves your own multiplier low for no reason; more, and you are handing over
cards faster than the multiplier compensates. The table's shape is a consequence of the pile-swap
rule, not a tuning choice laid on top of it.

**The three-credit mechanic and its four guards are replaced, not tuned.** The Lose path was
previously built around a credit mechanic — a cap of three credits and four guards around it, as
built (`the-hunt.md` §3) — bounding how much of the Quarry's pile could count for the player. It
existed because, under the old single-table model, an uncapped Lose path scored off only the 6
cards a Humble-band player captured against the 18 a Victorious player captured at `k = 9`: capping
the credit was the guard against that gap. Under two-sided damage the pile-swap rule above
replaces it outright — every card the Quarry captures counts for the player, and every card the
player captures counts for the Quarry, both inverted, with no cap. The motivating figures that
came with the credit mechanic — `ideas.md`'s 918 / 936 / 378 / 216 comparison — were computed
against a fixed Demand of 220, where the relevant question was a total crossing a target. Under
two-sided damage the relevant question is a net, and those figures are **void**: the mechanism
(pay for the cards the Quarry captured) is adopted; its arithmetic is not.

**Discarded branch, per the house style.** The alternative considered was both sides counting the
Quarry's pile — the player paid for it as usual, and the Quarry also paid for its own pile rather
than the player's. That pays one pile out twice and inverts the incentive at exactly the edge case
that should reward perfect play: a player who declares Lose and wins zero tricks — executing the
plan as well as it can be executed — would finish 78 behind instead of 78 ahead, because the one
pile in play (the Quarry's 13-card sweep) would be paying the Quarry rather than the player. Each
pile is counted exactly once, by the side that did not win it, for that reason.

---

## 2. The shared object

The design has one shared object: **the deck-and-decree**. Forage, the outer loop's only verb
(see §3), edits the 33-card deck the round's hands are dealt from and the decree card that sets
trump for that round; the inner loop — the Hunt — plays and captures those same physical cards.
There is nothing else either loop touches.

No exchange rate exists anywhere in this design, because both terms of §1's equation are read
directly off that one object. The cards you captured _are_ Spoils — not a number derived from
them, the cards themselves, summed. The count of the tricks those cards came in _is_ Standing —
not a resource paid to reach a band, the band itself. There is no intermediate currency to
define, balance, or convert between the outer loop and the inner one: a deck edit changes what is
available to be captured, and what gets captured is the score.

This object is not invented for the hybrid. Fox in the Forest already treats the deck as a piece
of shared state that multiple actors reach into during a single round: both hands are dealt from
it, the decree card sits on top of the remainder and sets trump, the Woodcutter (5) draws from it
and discards to its bottom, and the Fox (3) exchanges the decree card itself for a card from hand
(`fox-in-the-forest.md` → Suit card reference, ranks 5 and 3). The object this design promotes to
the outer loop's editing target is a piece of furniture the base game had already built.

The demonstration of why this matters is the closest counterexample available, because it is the
base game's own co-op sequel: _Fox in the Forest Duet_ converts trick outcomes into movement
along a separate tug-of-war track, and that spatial layer reviewed at 2.5/5 for generating no
tension (`design-principles.md` §7, §8). Trick outcomes become a number fed to a different
system — exactly the exchange-rate shape `forbidden-solitaire.md` §4 identifies as the toll-booth
signature: whenever two layers are joined by a conversion ("trick points become X"), the minigame
degrades into a fee paid to reach the real game, because the player can now diverge between
"playing well" and "advancing the system that matters," and those two things are no longer the
same event. This design has no such conversion anywhere, for the same reason Forbidden
Solitaire's clear-is-the-damage coupling has none (`forbidden-solitaire.md` §4, §10.1): the two
things that would need converting are already the same object.

**Discarded branch:** the alternative considered was an explicit conversion — "each trick won
becomes N resource," spent in the outer loop on Forage edits. Rejected because it reproduces the
Duet's toll-booth shape exactly: a resource layer inserted between the round and the run gives
the outer loop a number to consume rather than an input to rewrite, which is the failure §3
exists to rule out by construction.

---

## 3. What the run rewrites

The ceiling, derived rather than asserted: a round is 13 tricks (`fox-in-the-forest.md` →
Gameplay), and the two tables above are read off the final trick count `k`. At **average card
values** — a trick's two cards worth roughly 12 between them, at an average printed rank of 6 —
the ceiling is **540 damage per side per Hunt**, reached at `k = 9` on the Win path and `k = 4` on
the Lose path, the peak of each path's own table. In a **best-case pile** — the eighteen fattest
cards in the deck, summing to 153, valued at the ×5 peak multiplier — the ceiling rises to **765**,
still at the same trick counts. The **maximum net swing** between the two sides in a single Hunt is
**±444**.

Where the old single table produced two local maxima sharing one multiplier — a **bimodal** curve —
the two new tables each have **one peak per path**: 7–9 on Win, 4–6 on Lose. There is no valley to
fall into and climb back out of; a side's damage rises to its own peak and falls away on both sides
of it. §6 rebuilds the argument that used to rest on the old shape's two shared-multiplier bands.

Two further facts survive from the earlier account of this section, restated in the new unit:

- **Standing is a gate, not a term you can build.** Nothing in §1's component table raises Standing
  directly; every device listed as intervening on it does so by changing which tricks you win.
  Standing is capped at ×5 on either path, permanently. All unbounded growth must therefore come
  through card value — which is what makes Forage's edits to a card's value the load-bearing ones.
- **A bigger health bar cannot be met by winning more tricks.** The old Demand-crossing force,
  restated in the new unit: 7–9 is the Win path's ceiling and 10+ collapses to ×0.5; 4–6 is the
  Lose path's ceiling and 0–3 collapses to ×0.5 on that path. Past either peak there is no `k` that
  pays better — the multiplier is already falling. Health can only be depleted faster by making the
  captured cards worth more, which only editing the deck accomplishes. The outer loop's job is
  therefore structurally forced to be "change what is in the deck and what its cards do," never
  "add a bonus to the damage."

**Forage** is named as the outer loop's only verb: the thing a player does between encounters is
edit the deck the next Hunt will be dealt from. It may edit exactly four things — a card's value,
a card's ability, a card's suit, and the decree — and nothing else. There is no shop selling flat
score bonuses.

This is Cook's loop test (`design-principles.md` §4) passed by construction: an outer loop only
counts as a loop, rather than an arc the player exits immediately, if it changes the conditions
the inner loop runs under. Forage does exactly that — the deck it hands back to the Hunt is not
the deck the Hunt started with, so the following round is played under genuinely different
conditions, not merely scored differently. `balatro.md` §2.6 makes the identical argument for why
Balatro's Tarot cards editing the deck — rather than the shop handing over a flat bonus — is the
coupling worth stealing.

The connection to Balatro's own growth-class lesson (`balatro.md` §2.1) is direct: a build that
only ever wins more tricks — the equivalent of a Balatro build made entirely of flat `+Mult` or
`+Chips` Jokers — is arithmetically dead at a predictable point, and by construction the game
does not need to tell the player so; the ceiling tells them. This costs **zero rules added**: it
is not a mechanic anyone had to design, it falls straight out of the 13-trick round already fixed
in §1 and the printed multiplier table already reused unchanged.

### Where a Forage edit actually lands — the variance nobody costed

The precedent cited above is Balatro's Tarot cards, and the transplant is not clean. Balatro's deck
belongs to one player and is heavily cycled: 8 cards in hand, 4 hands, 3 discards, so a round sees
roughly 35 of 52 cards. An enhanced card is very likely to appear, and it is always **yours**.

Here the deck is dealt once, split two ways, and a fifth of it is never seen at all:

| Where a Foraged card lands | Chance            |                                               |
| -------------------------- | ----------------- | --------------------------------------------- |
| Your hand                  | 13/33 = **39.4%** | The intended case                             |
| The Quarry's hand          | 13/33 = **39.4%** | See below — depends entirely on the edit type |
| The undealt seven          | 7/33 = **21.2%**  | The edit did nothing this round               |

**Roughly one edit in five is a no-op**, on the outer loop's only verb, against a Demand that keeps
rising. Neither of these failure modes exists in the game the mechanic was borrowed from, so the
precedent does not cover them.

**The two edit types behave completely differently, and the document's "four verbs" framing hides
it.**

- **A value edit in the Quarry's hand is not a loss — this section's original conclusion — and it
  reverses under two-sided damage.** The original argument was that a card worth 8 sitting in the
  opponent's hand is a concrete objective: force it out, take the trick it lands in, and it is not
  even a _new_ uncertainty — Fox in the Forest already deals its three Monarchs at random and
  players cope. That argument depended on the Quarry not scoring. Under two-sided damage a card is
  worth its value to **whoever's pile it lands in**, so a Foraged card the Quarry captures is
  damage aimed at the player — the "best case" was only the best case when the opponent had no
  stake in holding it. And because any captured card can end up on either side (the pile-swap rule,
  above, cuts both ways), **no value edit is safe**: every one becomes a bet on capture rather than
  a raise to your own ceiling. The 39.4% / 39.4% / 21.2% split above survives unchanged; only the
  conclusion drawn from it does not.
- **An ability edit in the Quarry's hand is pure downside.** You spent an edit arming your opponent.
  There is no version of that which plays well. This one did not depend on the Quarry scoring, so
  it is unaffected.

**A new question this exposes, and it is unasked rather than answered.** How a Forage value edit
interacts with the Lose path's inversion is unspecified. If a card is edited to value 20, is its
inverted value `12 − 20`? Or does inversion read the printed rank regardless of edits? The two
readings differ by the whole size of an edit, and neither is decided. Routed to §9 as **deferred**
— it blocks Forage, which is out of the first fight's scope (§11), not the first fight itself.

**One cheap mitigation, consistent with what the design already does.** Show the player where their
Foraged cards landed — "2 in your hand, 1 with the Quarry, 1 undealt" — without revealing anything
else about the hidden hand. Without it, the 39% case is invisible variance rather than a hunt,
because §4 keeps the Quarry's hand hidden and you therefore cannot chase what you cannot locate.
This is consistent with the design's existing information posture: §4's visibility table already
telegraphs the Quarry's intent every trick, and the base game already turns the decree card face up.
It does not address the 21% dead-edit rate, which needs a different answer — the base game has two
verbs that reach into the undealt cards (the Woodcutter's draw, the Fox's decree exchange) if one is
wanted.

### The ability edit has real depth and the document demonstrates none of it

The value edit is self-explanatory; the ability edit is not, and as written a reader is entitled to
ask what the strategy even is. The answer is that **rank and ability are currently welded together**
— the power that forces an opponent's highest card is printed on the 11, a card that already wins
the trick regardless. Moving an ability decouples _which card wins_ from _what the card does_. Four
worked plays, none of which the document currently contains:

- **Monarch onto a low card — the sacrifice lead.** Put the Monarch's power on a Bells 2. You lead a
  card that _loses_ and it drags out the opponent's highest Bells. This is better here than in the
  base game for a reason specific to this design: **deliberately losing tricks is a strategy**, because
  you are trying to land in a band. Giving away a trick is sometimes the goal, which is never true in
  a game scored on tricks alone.
- **Treasure onto a card you reliably win with — retired.** This example moved a Treasure's +1 onto
  a card you win with every time, an ability edit doing a card-value job. The Treasure ability
  itself is removed (§1, above; rank 7 does nothing for now), so the example no longer has a
  target. Kept as a historical note of the _shape_ of move-an-ability-for-a-value-job, which the
  other three worked plays below still demonstrate.
- **Swan onto a high card — insurance.** "If you play this and lose, you lead next" is automatic on
  the 1, which always loses. On a Keys 10 it becomes a safety net against being trumped.
- **Fox onto a card worth playing.** The decree swap is stranded on the 3, a card you rarely want to
  spend. On a 10 you can flip trump _and_ win the trick.

**Three things this exposes as unspecified**, and all three block an implementation: whether two
abilities may be stacked on one card; whether the source card keeps its ability or loses it; and
whether Forage may target any of the 33 cards or only cards the player captured. The last is the
interesting one — restricting edits to captured cards would tie the two loops tighter, since the
right to upgrade a card would have to be earned in the Hunt that preceded it.

### Proposed: a second, in-round edit resource — the two-layer split

**Status: open proposal, 2026-08-09. Explicitly kept separate from the Forage budget decision.**
Originated in play-through as "what if you could Forage mid-round, on cards in your hand." The
version below is the two-layer form the idea resolves into; the blocking problem in the last
subsection must be solved before it is viable.

**Why it stayed open after the budget was raised to 4.** Raising the between-round budget (§9) fixes
volume and halves the per-round impact of the dead-edit rate. Its third original justification — that
it also makes the Humble lane reachable — is retired along with §6's dominance proof, for the same
reason the in-round Snare proposal's own "Humble lane executable" bullet below is retired: there is
no dominated lane left to reach. Neither retirement touches what this proposal is actually for. A Forage edit made between rounds is chosen
with **no information**: the player does not know the next Quarry, the deal, or the decree. Four
blind edits is a bigger bet than two, not a better decision — Meier's "the consequence is invisible"
(`design-principles.md` §2) rather than his "dominant option." The in-round layer is the only thing
proposed anywhere in this document that makes an edit a decision taken with the board visible. The
two fix different problems and neither substitutes for the other.

**The shape.** Two separate editing systems, deliberately kept as different objects:

| Layer                          | When          | Targets                      | Persists     | Answers               |
| ------------------------------ | ------------- | ---------------------------- | ------------ | --------------------- |
| **Forage**                     | Between Hunts | Any of the 33 deck cards     | For the run  | _What my deck is_     |
| **Snare** _(placeholder name)_ | Mid-Hunt      | Cards currently in your hand | Spent on use | _What I do right now_ |

The name **Snare** is a placeholder and the developer's to red-line, per §10 — a snare is set during
a hunt rather than gathered between them, which is the distinction the two layers encode. What must
not happen is both layers being called Forage; the whole value of the split is that they are
different objects.

**This is Forbidden Solitaire's structure, not an invention.** `forbidden-solitaire.md` §6 documents
the same split and states why it is load-bearing: **Gems** are passive, purchased between battles,
permanent, and set the _rate_ at which a run scales; **Jokers** are active, cast during the solve,
situational, and change _this board_. That file's own summary — _"Forbidden Solitaire pays two
slots' worth of UI to keep 'what my run is' and 'what I do right now' as different objects"_ — is
exactly the argument for adopting it here.

**What the in-round layer fixes, and these are the reasons to want it.**

- **It deletes the variance problem above.** A card in your hand cannot be undealt and cannot be in
  the Quarry's hand. Every in-round edit lands, on a card you can see.
- **It converts a blind bet into a situational decision.** Between-round Forage is "pump a card and
  hope." Mid-round it is "trump is Keys, they have spent their high Keys, make this Keys 6 worth 8
  and take the trick" — Meier's situational value (`design-principles.md` §2), which the outer-loop
  version cannot have because nothing is visible when the choice is made.
- **This bullet's original justification is retired, not replaced.** It used to argue that a
  mid-round edit "makes the Humble lane executable" — letting a player concentrate value into the
  few cards a low trick count would actually capture, so a dominated-but-reachable lane became
  something a player could aim for on purpose rather than hope into. That argument depended on §6's
  superset proof, where two bands shared a top multiplier and one of them needed rescuing. §6's
  rewrite dissolves that proof rather than reversing it: the two tables each have one peak, landing
  few tricks is the low end of both, and there is no dominated lane left to make executable. What
  survives of the want underneath this bullet — acting on a board you can see, rather than editing
  blind between Hunts — is already carried by the two bullets above it; this one is retired rather
  than given a new target.
- **Information rises while options fall.** Later in a round you know more — what has been played,
  where trump has moved — but hold fewer cards to apply it to. That tension is free; nobody designs
  it.

**What it costs, and why the between-round layer must survive.** An in-round-only version would
delete the outer loop: §3's Cook's-loop argument requires that something between Hunts changes the
conditions the next Hunt runs under, and if all editing happens inside the round, nothing persists
and the run becomes a sequence of independent puzzles rather than a build. Keeping Forage as the
permanent layer is what preserves that; the in-round layer is an addition, never a replacement.

**It passes §1's component test.** A mid-round value edit is an intervention on card value; a
mid-round ability or suit edit is an intervention on Standing by the same route as its Forage
equivalent. Neither opens a third scoring channel, so the rule §1 sets is not breached.

**It would move the Hunt ceiling, and §5 would depend on that number.** This is the consequence
most likely to be missed. If a player can add value to cards mid-round, the ceiling derived above
is no longer fixed by the deal alone. _(The illustrative figure that used to sit here —
`(18 + 12) × 6 = 180` — was computed against the retired `18 × 6 = 108` ceiling and is void; this
proposal is still open and unadopted, so the equivalent recomputation under the two tables above is
not made here rather than made incorrectly.)_ **§3's ceiling and §5's health-crossing point would
both need recomputing against whatever in-round budget is chosen** — the ceiling stops being a
property of the round's shape alone and becomes a function of that budget, which weakens, though
does not destroy, the argument that the ceiling is "derived, not tuned."

#### The blocking problem: pump-what-I-am-about-to-win is a dominant strategy

Stated as blocking rather than as a caveat, because the proposal is not viable until it is answered.
"Raise the value of the card I am about to play and win with" is correct almost every time. At four
in-round edits of +3, that is a reliable **+12 card value**, with no decision attached — the
specific damage figure this used to carry (`+72`) was computed against the retired ×6 table and is
void, but the shape of the problem is not: this is Meier's dominant-option failure (Sid Meier's
test for an uninteresting decision — players take it every time) landing on the new mechanic before
it ships.

The in-round edit needs a cost that makes it a trade-off. Three candidates, none chosen here:

- **Limited and consumed**, as Forbidden Solitaire does — you hold a small number, using one spends
  it. Makes _when_ the decision rather than _whether_.
- **Spent from the same pool as between-round Forage**, so an in-round edit costs you a permanent
  deck edit. This is the strongest version structurally, because it puts the two layers in direct
  tension — tactics now versus build later — and needs no new resource.
- **Charged against something the round already has**, e.g. only usable on a trick you go on to lose.

The second is the one worth trying first: it adds no new currency, keeps §3's no-shop position
intact, and turns the two layers into a single interesting choice rather than two independent
handouts.

#### Two details from the originating proposal, recorded

- **"Every 3 tricks" gives dead offers at the end.** After trick 9 the hand holds four cards; after
  trick 12, one. The final one or two opportunities are close to worthless. Either space them
  unevenly toward the early round or offer fewer.
- **"One buy at the start" implies a currency this design does not have.** §3 rejected a shop
  deliberately. If the in-round layer is granted rather than purchased, no currency is needed and
  the no-shop position survives; if it is bought, that decision is reopened.

**Discarded branch:** the alternative considered was a Balatro-style shop selling flat score
bonuses — buy +10 Spoils, buy a one-round ×1.5 Standing token. Rejected because a constant added
to a capped additive term loses to an escalating requirement by the same arithmetic that makes
flat Jokers lose to Balatro's ante curve: a fixed addition to a term with a hard ceiling can never
keep pace with a target that keeps rising, so the shop would only delay the moment the round
becomes unwinnable, not change it. Only an edit to what the deck's cards are worth — Forage —
changes the ceiling itself.

**The fuller version of that branch, extended rather than re-argued.** The shop proposal that
surfaced in this design session goes further than the one above: random per-run upgrades plus
_permanent_ ones — more health, higher card damage — bought with money earned inside the run. It
is discarded for three reasons, not one. Money earned from encounter performance is §2's
already-discarded "each trick becomes N resource" branch wearing a different noun — the same
toll-booth shape, the same rejection. `+N per card` is exactly the additive-only build the health
bar exists to defeat (this section's whole argument, above): a shop that sells the thing the
design is built to make insufficient on its own undoes the design. And a third scoring or damage
channel is what §1's component table forbids outright, health or no health. The cross-run _power_
half of the proposal is pointed at §7 (its banked-progress item); this section owns why a shop
specifically, as a mechanism, does not fit.

One variant of it is worth recording without adopting: **"Planets, not Jokers"** — permanently
levelling one Standing band for the run, the way Balatro's Planet cards level a hand type. It is
**closer to reachable** than it used to be, since the multipliers are now designed rather than
transcribed and a level-up is just another way of arriving at a number this document already
owns choosing. But it breaks §1's _Standing cannot be built_ invariant on purpose and moves the
ceiling by a chosen amount rather than a derived one — recorded here as a candidate, not adopted.

---

## 4. The Quarry

**The model: a per-encounter character, not a neutral skilled trick-taker.** Discarded branch, in
one line: a neutral strong player can only escalate by playing better, which is a difficulty
slider rather than a design — it produces harder rounds, not different ones.

**The fiction.** The characters are the deck's own odd-rank cards: the Monarch (11), the Witch
(9), the Woodcutter (5), the Fox (3), the Swan (1) (`fox-in-the-forest.md` → Suit card
reference). Each encounter takes one character and turns its printed ability on for the entire
round, rather than for the single card that prints it. Facing the Monarch, the highest-or-lowest
constraint it normally attaches to one lead now applies every time you follow, all round; facing
the Fox, the decree can move under you on any trick, not only the one where the actual Fox card is
played.

This is the cheap move, not merely the thematic one: the cast is already in the deck, so
escalation's entire vocabulary — five characters, five round-long rule-breaks — costs nothing to
teach. Mark Rosewater's resonance lesson applies directly: a rule that matches what the theme
already implies needs less explaining, because the player has already met the Monarch, the Fox,
and the rest as single-card abilities before any encounter turns one loose for a whole round
(`design-principles.md` §2). The alternative — inventing five new characters with new names and
new abilities — would have to teach the cast and the escalation both, instead of one for free.

**Bound by the player's rules, with one printed exception per character.** The Quarry follows
suit, holds 13 cards, and plays one trick at a time exactly as the player does; the one thing each
encounter grants it is that character's single round-long rule-break. Cole Wehrle's asymmetry rule
is why this stays one exception per character rather than a growing pile of them: balance a strong
position with a readable liability, rather than by shaving numbers (`design-principles.md` §5).
Two worked examples:

- **The Fox (3).** The printed exception turns the Fox's single-use ability — exchange the decree
  card with a card from hand — into a standing threat: at the start of every trick, the Quarry may
  swap the decree, so trump can shift under you between tricks rather than once per round at most.
  The liability: the swap is never hidden. The new decree card is shown the instant it lands, so
  every shift is information the moment it happens, not a secret held to the end of the round — a
  player tracking decree changes across 13 tricks can read which suits the Quarry has already
  spent.
- **The Monarch (11).** The base game's ability — if you lead this, an opponent holding a card of
  this suit must play their Swan of it or their highest card of it — normally fires once, when the
  actual card is led. The printed exception makes it fire every time the Quarry leads a suit the
  player holds, for the whole round. The liability: the constraint only bites if the player still
  holds the two constrained cards, so a player who sheds their Swan or their highest card of a
  suit early neutralises the Monarch's bite against that suit before it is ever led.

**A visibility table.**

| What                                       | Visible to the player | Why                                                                                                                                                  |
| ------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Quarry's hand                          | Hidden                | The base game already hides both hands; nothing here removes it.                                                                                     |
| The Quarry's next-trick intent             | Telegraphed           | `forbidden-solitaire.md` §5 / §10.5 — telegraphing converts the opponent from a die roll resolved after you commit into information you plan around. |
| The Quarry's trick count                   | Public                | `fox-in-the-forest.md` → Gameplay already makes trick counts public while the cards inside them stay hidden; this design changes nothing here.       |
| The Quarry's printed exception             | On screen always      | The character and its round-long rule-break are the encounter's whole content; hiding it makes the test unlearnable rather than hard.                |
| The current Demand and your running Spoils | Open                  | Both are comparisons the player needs to plan against, not information withheld for drama.                                                           |

**The honest caveat.** The hidden hand is the only entry in this table preserving the base game's
read-the-opponent drama — guessing what your opponent holds from what they have already played.
Whether that drama survives when the opponent is a CPU rather than a person is the ticket's
headline risk, and it is not a question this document can settle on paper: it is a feel question,
and §11 names it as the one thing the smallest testable slice exists to test.

---

## 5. Escalation

**Both dials, kept independent.** How hard an encounter is, and which rule is broken while it runs,
stay two knobs rather than one. What "how hard" means has changed — it is no longer a rising
Demand, it is the two health totals and the cap on how many Hunts an encounter may run (below) —
but the independence itself survives intact. `balatro.md` §2.7 gives the precedent directly: The
Wall (a Boss Blind asking 4× the normal target with no rule broken) and The Needle (asking only 1×
the target, but restricting the round to a single hand played) are Balatro's own proof that "how
hard is this round" and "what rule is broken" are independent knobs, and most designs wrongly fold
them into one.

**The structural argument, with the count.** `balatro.md` §2.3 enumerates all 23 Boss Blinds and
finds that only 3 of the 23 touch the score directly; 20 of the 23 attack an input to the engine
instead — the cards usable, the information held, the resources spent, or the hand types
nameable. That count is the reason a Balatro boss reads as a test of your specific build rather
than a difficulty spike: the question it asks is whether your particular machine still works with
one part removed, and that question is different every run. This design follows the 20, not the
3 — every Quarry rule-break named in §4 and below attacks something the player builds with, never
health or the `card value × Standing` equation directly.

**Mapping onto Fox in the Forest's inputs.** The base game hands the Quarry five things to attack:
the follow-suit obligation, the decree and trump, hand size, the abilities printed on the odd
ranks, and which cards are in the deck at all. Four worked examples, covering four of those five —
the fifth, deck contents, is the boss's alone, worked below:

- **Follow-suit obligation — the Swan (1).** Normally, holding no card of the lead suit frees you
  to play anything. The Swan encounter narrows that freedom instead of removing it: when you have
  no card of the lead suit, you must play your lowest-ranked card rather than any card, so the one
  moment the base rules hand you a free choice is exactly the moment this encounter takes it back.
- **Decree and trump — the Fox (3).** Already worked in §4: the decree can move under you on any
  trick, not only the one where the Fox card itself is led.
- **Hand size — the Woodcutter (5).** The Woodcutter's base ability draws a card and discards one
  to the bottom of the deck when played. The round-long version removes a card from your hand
  before the round starts and never gives the draw back, so all 13 tricks are played a card short.
- **The odd-rank abilities — the Witch (9).** The Witch's base rule fires only when a trick holds
  exactly one Witch, treating it as trump. The round-long version extends that condition to every
  odd-ranked card: a trick holding exactly one odd-ranked card resolves as if that card were
  trump, all round — multiplying how often the base game's rarest ruling actually applies.

**Health, and the encounter's end conditions, replace the rising Demand.** The Quarry holds
health; the player's damage (the direction, above) depletes it. The player holds health too, and
the Quarry's damage depletes that. An encounter is a sequence of Hunts, played until a bar empties:
the Quarry's empties first and the encounter is won; the player's empties first and the run ends;
**both empty on the same Hunt and the player loses** — the ruling for a case that previously had no
stated answer.

**Health is not a toll booth.** §2 argues this design has one shared object and no exchange rate —
a captured card _is_ the value it is worth, not a number converted into something else on its way
to mattering. Health does not break that: it is not a second system with its own play, a resource
spent or traded. It is the Demand with memory — the same number (`card value × Standing`), the
same source, checked cumulatively across many Hunts instead of once against a single target.

**The cap, and its real job.** The cap is the maximum number of Hunts one encounter may run. It
does not price a fast-costly lane against a slow-safe one — those lanes do not exist once each
declared path has exactly one peak (§3, §6). Its real job is **bounding the low-stakes extremes**:
a Hunt landing at the 6/7 boundary puts 708 damage on the table between both sides; one landing at
an extreme puts 78–96, a **7.4× to 9.1× slowdown** — so an encounter spent at the extremes barely
moves either bar. `ideas.md` → _Fight length is symmetric about the middle, and bimodal_ works this
arithmetic in full; cited rather than restated. At the decided `H = 1,350`, the fast band (4–9
tricks) resolves an encounter in **3–4 Hunts**; everything outside it takes **18–23**. There is
nothing in between: session length is a step function of whether a Hunt lands inside 4–9, not a
dial anyone tunes. The top end is additionally **unloseable** rather than a dominant strategy —
landing 10+ tricks needs the cards, not the intent, so it is an unbounded tail a patient opponent
can wait out, not a strategy a player can simply choose into.

**The `P = H` boundary property.** Equal health totals put the win/lose boundary **exactly on the
6/7 line** the declaration commits a player to: landing 7 tricks a Hunt wins the encounter on Hunt
4 with 486 of 1,350 left; landing 6 loses it on Hunt 4. That is a consequence of `P = H`, not of
1,350 specifically, and it is worth stating as a property rather than a coincidence of the current
numbers — a later tuning pass that rescales health without preserving the equality moves this
boundary too, and should know that in advance.

**The Quarry's job, restated.** The Quarry's round-long rule-break now has a single precise job for
the first time: **push the player across the 6/7 line**, away from whichever side the declaration
commits them to. Every worked example above already does this; §8 states why that job matters now
that a tug across the line is a contest again, not a fight against arithmetic alone.

**The boss attacks the fifth input: deck contents.** Four of the base game's five inputs are
already spoken for above. The fifth — which cards are in the deck at all — is the only one that
tests what a run's Forage actually built, since the player's engine _is_ the Foraged deck; nothing
else here is assembled the way a deck is. The boss's escalation is specified against exactly that:
**suppressing a subset of the player's Forage edits, for that Hunt.** Removing cards outright is
the discarded branch — it attacks the deal rather than the build, testing luck rather than what the
run assembled, which is the wrong thing for a final encounter to measure. `ideas.md` flags the risk
on the idea as a whole and it is worth carrying forward rather than discovering later: a deck
attack can read as **theft** rather than a **test** — Balatro's own debuffed and stolen cards
survive that read because its roughly-150-Joker engine has redundancy a 33-card deck edited by a
Forage budget of 16 may not. A second candidate sits beside it, not chosen over it: not an attack
on deck contents at all, but **the character that best punishes a correct declaration read** —
since §6 names the declaration free option as the design's largest open problem, a boss built to
answer that directly is a live alternative to one built to answer this section's escalation
question. Both are design readings, not tuning values; the choice is the developer's.

### Resolving several buffs on one trick — the stacking rule

> **Agent-chosen, 2026-08-23, under DLR-124's sprint-run override of the tuning-value pause.**
> Every number in this subsection — the four per-hand caps, the Overlap Bonus magnitude, and the
> firing cadence that decides how often any of them is paid — was chosen by the agent writing this
> section, not by the developer. `CLAUDE.md`'s normal pause condition puts tuning values with the
> developer; DLR-124's dispatch explicitly overrode that pause for this unattended run and required
> the numbers be chosen and justified so DLR-108 and DLR-125 are not blocked on them. The *shape* of
> the rule — per-axis, additive, ordered, capped — is argued from arithmetic and from
> `v1-buff-card-list.md`'s shipped cost model; the *magnitudes* are a first pass to be argued with.
> Every one of them is listed again, with what it trades off, in
> [Every number here is the developer's to move](#every-number-here-is-the-developers-to-move).

**The question this answers.** Buffs are bought per hand and several of them can be true at once. A
player holding `Bell-Taker (Blade)`, `Mark of the 9 (Blade)` and `Bell-Taker (Second Wind)` who wins
a trick with the 9 of Bells has fired three cards on one trick, and until now the design had no
statement of what that pays. The proposal in `ideas.md` was **sum the rewards fired, then multiply by
the count that fired**. That proposal is rejected here, and what replaces it is R1–R7 below.

#### 1. "Sum the rewards" has no arithmetic to sum

The `ideas.md` entry's growth table reads `2 buffs → 12`, `3 → 36`, `5 → 125`, off a column headed
"avg reward each: 3, 4, 5". **No such quantity exists.** Per `v1-buff-card-list.md`'s reward master
tier list, a fired buff pays on exactly one of four axes, and the four are different units:

| Axis | Suffix | Unit | Where it lands |
|---|---|---|---|
| Flat damage | Blade | damage | added to a cash-out, once |
| Coin | Purse | coins | the run's wallet, permanently |
| AP refund | Second Wind | action points | this hand's activation budget |
| Multiplier | Momentum | multiplier points | multiplied by the bank when it cashes |

Adding `+5 damage`, `+10 coins` and `3 AP` into `18` is a category error — three quantities with
three different consumers, none convertible into another at any stated rate, and the design has never
had an exchange rate between them (§2's "one shared object, no exchange rate" argument is the reason
it does not). So the "avg reward each" column is a number the game cannot produce, and every figure
in the 2→12 / 3→36 / 5→125 table inherits the defect.

**The verdict, for the record: the ×count proposal is rejected on definition, before it is rejected
on magnitude.** It is also rejected on magnitude — the [worked hand](#a-worked-hand) below computes
what it would actually pay on an ordinary bronze-heavy loadout, and the answer is 123 damage on trick
three of hand one against a 34-health opponent — but that second rejection is a consequence of the
first, not an independent finding. A rule with no defined operand cannot be tuned into one.

The salvage was considered and discarded: declare one canonical axis for the multiplier to act on, so
"sum the rewards" means "sum the Blade contributions" and the count multiplies that. It fails because
`v1-buff-card-list.md`'s cost model prices each axis separately and *against its own consumer* —
multiplier costs more than flat damage because it is multiplied by the bank, coin costs more than
flat damage because it is run-permanent. Nominating one axis as the one that stacks silently re-prices
every card on the other three across the whole 78-template list, which is a re-costing of the entire
pool disguised as a resolution rule.

#### 2. R1–R2 — resolution is per-axis, and within an axis contributions add

**R1. Every fired buff pays into its own axis and nowhere else.** Four independent accumulators, one
per axis, held for the duration of the hand. A trick that fires a Blade card and a Momentum card
moves two counters and creates no interaction between them.

**R2. Within an axis, contributions add.** Two Blade cards firing on one trick pay the sum of their
two flat-damage figures. That is the whole combination rule.

Two alternatives were available and both are rejected by name.

**Multiply, rejected.** The Momentum axis feeds a cash-out that is *already* a product — `the-hunt.md`
§7 cashes the bank as `bank × multiplier`, and the bank and multiplier climb together, so an unbought
streak of *n* already pays `n²`. A multiplicative Momentum stack makes the payout cubic in the thing
the shop sells, which is the failure the `ideas.md` proposal exhibits in a different costume.

**Take-the-highest, rejected.** Paying only the largest contribution on an axis makes the second card
on that axis worth exactly nothing. A player holding two Blade cards is holding one Blade card and one
piece of dead paper they paid AP for, so a **wide** loadout becomes strictly worse than a **tall** one
at every AP budget — which deletes the point of a loadout system, and this epic exists to build a
loadout system. In Meier's terms it is a dominant option: buy the highest tier on one axis, never
diversify, and the choice stops being a choice.

Addition is what is left, and it is also the only one of the three that a player can do in their head
while looking at the felt.

#### 3. R3 — the resolution order, which is forced rather than chosen

**R3. A trick resolves its buffs in five steps, in this order:**

| # | Step | Why here |
|---|---|---|
| 1 | **Second Wind** — refund AP | So refunded AP is spendable at the *next* trick's Apply Buff window and never retroactively at this one |
| 2 | **Momentum** — add to the multiplier | So a cash-out on this trick cashes at the buffed multiplier |
| 3 | **The cash-out product** — `bank × multiplier` | The existing rule, untouched |
| 4 | **Blade** — add flat damage to the result | So flat damage is never multiplied by the bank |
| 5 | **Purse** — add coins | Last, because coins never affect this hand at all |

**This order is not a preference, it is forced by a costing decision that has already shipped.**
`v1-buff-card-list.md` → *Why multiplier and coin cost more than flat damage* prices the multiplier
bases at 2/3/5 against flat damage's 1/2/3, and the stated reason is precisely that one gets multiplied
by the bank and the other does not. Put Blade inside the product and a bronze `+1 damage` at a bank of
3 becomes worth 3 rather than 1, and the entire price gap the cost model argues for evaporates — the
document would be charging a premium for a property the resolution order had quietly given away for
free. Put Momentum after the product and a Momentum card cannot affect the cash-out it was bought for.
Any order other than the one above contradicts a shipped pricing decision somewhere. Cited, not
restated: the arithmetic lives in that section.

Two smaller consequences worth stating so nobody has to rediscover them:

- **Step 1 is deliberately not "spend it now".** Second Wind resolving first means the refund is in
  the pool before the next window opens, not that the current trick gets a second activation. The
  alternative — a refund the player can immediately re-spend on the trick that generated it — is a
  loop, and it is the loop `MAX_REFUND_PER_HAND` exists to bound.
- **Step 4 lands after `the-hunt.md` §7's two-thirds floor.** When a streak is *caught* rather than
  cashed, §7 already reduces it to two-thirds, rounded down. Blade is added to whatever number that
  rule produced. Buffs therefore never interact with that rounding, and the floor never has a
  fractional buff figure to round.

#### 4. R4 — firing cadence: event, threshold, terminal

**R4. Each family fires on one of three cadences.**

| Cadence | Families | Fires |
|---|---|---|
| **Event** | Taker, Feeder, Mark of the *R*, Sidestep, Glutton, Debt Collector | Once per trick on which the condition is true — so many times in a hand |
| **Threshold** | Hoarder, Unbloodied, Miser, Cornered | Once per hand, on the trick where the condition first becomes true |
| **Terminal** | Keepsake | Once, at the moment the hand ends |

The split follows the conditions' own grammar. An event family names something that *happens* on a
trick and can happen again; a threshold family names a level that is *reached* and, once reached,
stays reached, so paying it per trick would pay for standing still; Keepsake names a state at a single
instant that has no other instants to check.

**Why event families really do fire per trick, rather than once a hand.** The flat alternative —
every family pays once per hand — is simpler and is wrong, because the shipped cost model has already
been calibrated against repeat firing. `v1-buff-card-list.md` prices Feeder a point *above* Taker at
every cell on the explicit grounds that "you can always throw away a trick in a suit you hold, so it
fires close to every hand" — reliability is the thing being paid for, and reliability only has a price
if firing repeatedly has value. Under once-per-hand the pricing inverts into an absurdity: a gold
`Bell-Taker (Momentum)` at **5 AP** pays `+5` once, and a bronze `Mark of the 9 (Momentum)` at **1 AP**
pays `+2` once, so five times the price buys two and a half times the reward — and the bronze card is
strictly the better buy at any AP budget above one. Per-trick firing is what makes the ladder mean
anything.

#### 5. R5 — the Overlap Bonus

**R5. On a trick where `k ≥ 2` buffs fire, add `k − 1` to the Momentum axis**, drawn from the same
`MAX_MULTIPLIER_BONUS_PER_HAND` pool as Momentum cards themselves.

This is where the original idea's intent survives. The `ideas.md` entry was reaching for something
real — an overlap should feel like an event, not like two unrelated payouts that happened to land on
the same trick — and the Overlap Bonus is that feeling, priced as a rule rather than as arithmetic on
an undefined quantity.

**The basis is the count of buffs fired, linear — not pairs.** Pairs is `k(k−1)/2`, and at `k = 6`,
which is affordable the moment the shop's `+5 AP` capacity item is bought, the pairs basis pays 15
Momentum *from the bonus alone* — two and a half times the entire natural six-trick multiplier ceiling
of 6, from no card's printed reward at all. Worse, it grows as the **square** of exactly the quantity
the shop sells: buying AP capacity would buy quadratic multiplier, which makes one shop item the only
purchase in the game worth making. Linear `k − 1` grows at the same rate as the thing the player is
buying, which is the property a bonus on a purchased quantity has to have.

**Sharing the Momentum pool is a design decision, not an implementation shortcut, and it is the best
property the rule has.** A tall Momentum loadout has already spent `MAX_MULTIPLIER_BONUS_PER_HAND` on
its own cards, so its Overlap Bonus is clipped to nothing — it gets no reward for width because it did
not build width. A **wide, mixed** loadout — a Blade card, a Purse card, a Second Wind card firing
together — has an empty Momentum pool and collects the whole bonus. So the Overlap Bonus pays most to
precisely the loadout the original idea was trying to reward, and pays nothing to the one that was
already winning. The [worked hand](#a-worked-hand) shows both halves of that: the bonus carries tricks
1 and 2, and is clipped to zero on trick 3.

#### 6. R6 — the four per-hand caps

**R6. Each axis accrues under a named per-hand cap.** Contributions past the cap are clipped to it and
lost; nothing is banked for later.

| Constant | Value | Unit | Status |
|---|---|---|---|
| `MAX_REFUND_PER_HAND` | 6 | action points per hand | Unchanged — restated from `v1-buff-card-list.md` |
| `MAX_MULTIPLIER_BONUS_PER_HAND` | 6 | multiplier points per hand | New, agent-chosen |
| `MAX_FLAT_DAMAGE_BONUS_PER_HAND` | 12 | damage per hand | New, agent-chosen |
| `MAX_COIN_BONUS_PER_HAND` | 10 | coins per hand | New, agent-chosen |

Each is derived from the ceiling of the thing it bounds, one line each:

- **`MAX_MULTIPLIER_BONUS_PER_HAND = 6`** is the natural six-trick multiplier ceiling, so bought
  multiplier can at most **double** the earned one. This is the identical move `v1-buff-card-list.md`
  made setting `MAX_REFUND_PER_HAND = STARTING_AP` — "a hand can at most double its budget."
- **`MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12`** is one third of a perfect hand's 36 (`the-hunt.md` §7),
  so Blade can **finish** a hand and never **replace** the streak. A flat-damage cap at or above 36
  would make the streak optional, and the streak is the game.
- **`MAX_COIN_BONUS_PER_HAND = 10`** is one gold Purse — the largest single coin reward the master
  tier list authorises. Coins are the only **run-permanent** axis, so coin inflation is the one
  stacking failure that losing the hand cannot undo; stacking therefore never pays more on coins than
  the single best card on that axis already would.

**The load-bearing asymmetry: the cap counters reset per hand, and NOT on a hit.** A hit resets the
multiplier itself to zero, per `the-hunt.md` §7, and it **does not refund the cap**. A player who has
spent all 6 of their Momentum bonus, then takes a hit, restarts their streak from zero with no bonus
left to spend for the rest of the hand. Without that asymmetry the cap is not a cap at all — it is a
per-streak allowance, refreshed by the very event the player is trying to avoid, and a hand containing
three hits would pay three full pools. **That asymmetry is the entire containment mechanism, and it
must survive into DLR-108's implementation intact.** It is the single most likely thing on this page
to be lost in translation, because "reset the buff state when the streak resets" is the obvious and
wrong reading.

#### 7. R7 — contradictions cannot occur in v1

**R7. No buff on the v1 list can contradict another, and no buff ever cancels another.**

This is a structural claim rather than a rule, and it holds for two reasons that are both properties
of the shipped pool. First, **no template on the 78-card list has a negative or preventive effect** —
every reward on the master tier list is a non-negative addition to one of four axes, and no condition
suppresses another card. Second, **a trick is won or lost but never both**, so no two conditions on
the same trick can be simultaneously true in mutually exclusive senses. A condition that is false
simply does not fire; there is no reward-stage disagreement to adjudicate, and therefore no error path
to write.

A player holding both `Bell-Taker` and `Bell-Feeder` has not created a contradiction. Exactly one of
them fires on any Bells trick and the other stays silent — the player has simply paid AP for a card
that could not fire this trick. **That is a player mistake, and it is a legitimate one to be allowed
to make.**

Two forward constraints follow, and they are the reason this rule is worth writing down rather than
leaving implicit:

- **Any future buff whose reward is negative, or whose effect suppresses another buff, must be
  re-costed against this rule before it ships.** R2's addition and R6's clipping both assume
  non-negative operands; a negative contribution turns "clip at the cap" into a question about
  ordering that has no answer here.
- **An apply-to-card conflict is refused at attachment time, not resolved at reward time.** `Sidestep`
  and `Glutton` attached to the same card would demand that one card both dodge and eat the same
  skull. The attachment is refused when the player tries to make it, where they can see it and choose
  again — so no reward-stage error path exists at all.

#### What this asks of DLR-108

The rule needs one piece of state the current types do not have: a **per-hand accrual**, reset when a
hand begins, holding the four running totals R6 clamps. It is state on the hand, and it is emphatically
**not** a field on `Buff` — a `Buff` is a card the player owns, and how much of a cap that card's axis
has consumed this hand is not a property of the card.

```ts
/** Per-hand running totals, reset when a hand begins — NOT a field on `Buff`. */
interface BuffBonusAccrual {
  readonly multiplierBonus: number // clamped at MAX_MULTIPLIER_BONUS_PER_HAND
  readonly flatDamageBonus: number // clamped at MAX_FLAT_DAMAGE_BONUS_PER_HAND
  readonly coinBonus: number //       clamped at MAX_COIN_BONUS_PER_HAND
  readonly apRefunded: number //      clamped at MAX_REFUND_PER_HAND
}
```

Three notes on where it goes and what it costs:

- **It belongs in `src/hunt/**`,** behind the pure-core ESLint boundary that tree already carries — no
  React import, no DOM access — so the whole resolution pipeline stays unit-testable without a
  renderer. Every one of R1–R7 is a function from a trick outcome and an accrual to a new accrual, and
  none of it needs a screen.
- **The naive loop is correct and no memoisation is warranted.** Resolution runs at most six times a
  hand (six tricks) against at most eleven active buffs, so the worst case is 66 condition checks per
  hand. There is nothing here to optimise and a cache would be a bug surface bought with no
  measurement, which the project's conventions forbid outright.
- **Nothing can produce `NaN`.** Every operand is an integer, combined by addition and then an integer
  clamp. There is no division anywhere in R1–R7, so there is no divisor to guard — the same property
  `v1-buff-card-list.md` states for the AP cost formula, and for the same reason: a spoiled number here
  feeds a health bar and would empty it with nothing said.

The four cap constants belong in `src/hunt/config.ts` with the other tunables, not inline at a call
site. **None of the four is a `config.ts` key today — DLR-108 creates all four.**

#### The worst case is not the one the ticket names

DLR-124 asks about several *different* buffs landing on one trick. That case is bounded by how many
cards fit in an AP budget. The genuinely dangerous case is one buff firing on **every trick**, and it
is why R6 exists.

Take a persistent suit-Taker on the Momentum axis, re-firing on each trick it wins: a gold
`Bell-Taker (Momentum)` at **5 AP** plus a gold `Mark of the 9 (Momentum)` at **4 AP** — a 9 AP
loadout, comfortably inside the 11 AP the shop's `+5 AP` capacity item allows, with 2 AP to spare.
Deal that player a hand holding four Bells and let them win with all four.

| | Momentum bonus accrued | Cash-out at a full bank of 6 and a natural multiplier of 6 |
|---|---|---|
| **Uncapped** | `+5 × 4` firings `= +20`, plus `+5` from the Mark `= +25` | `6 × (6 + 25) =` **186** |
| **Capped at `MAX_MULTIPLIER_BONUS_PER_HAND = 6`** | `+6` | `6 × (6 + 6) =` **72** |

**Diarmuid, the run's final boss, holds 135.** The uncapped figure one-shots every opponent in the
run, on hand one, from a loadout of two cards.

The capped figure is the argument for the cap, and it is stronger than it looks: **72 is exactly the
one-Whetstone perfect hand `the-hunt.md` §7 already prints in its Whetstone table.** The ceiling this
rule introduces is a number the design has already blessed as a legitimate best case, reached by an
already-shipped route. The cap does not invent a new maximum for the game; it declines to exceed the
one the game already has.

**The secondary corner, since `Mark of the R` is 22 templates deep.** A player could in principle own
many Marks — but **a winning card has exactly one rank**, so on any single trick at most **two** Marks
can fire: that rank's Blade crossing and its Momentum crossing. The family's depth is **pool breadth,
not stack depth**, and the same logic bounds Taker and Feeder to one suit's worth per trick, since a
trick is won or lost in exactly one suit. The 22 is a variety number for DLR-112's draw pool, not a
stacking exposure.

#### A worked hand

Everything above, run once end to end on an ordinary hand. Seven buffs at **exactly 11 AP** — the
whole budget, with the shop's `+5 AP` capacity item bought. Every cost is `v1-buff-card-list.md`'s AP
table and every reward its master tier list.

| Card | Tier | AP | Reward |
|---|---|---|---|
| `Mark of the 9 (Momentum)` | bronze | 1 | +2 multiplier |
| `Mark of the 9 (Blade)` | bronze | 1 | +1 damage |
| `Bell-Taker (Blade)` | bronze | 1 | +1 damage |
| `Bell-Taker (Second Wind)` | bronze | 1 | refund 1 AP |
| `Sidestep (Momentum)` | bronze | 1 | +2 multiplier |
| `Hoarder (Purse)` | silver | 3 | reach a bank of 3 this hand → +5 coins |
| `Debt Collector (Blade)` | silver | 3 | Apply Damage this hand → +3 damage |

**Opponent:** an ordinary Quarry holding **34** health — `ORDINARY_HEALTH_BASE 10 +
ORDINARY_HEALTH_STEP 4 × 6`, from `src/hunt/config.ts`.
**Hand:** 9 of Bells, 4 of Bells, 11 of Keys, 7 of Moons, 2 of Moons, 5 of Keys.
`Sidestep (Momentum)` is attached to the 11 of Keys.

**Trick 1 — wins with the 9 of Bells.** Four buffs fire (`k = 4`): `Mark of the 9 (Momentum)` +2 M,
`Mark of the 9 (Blade)` +1 B, `Bell-Taker (Blade)` +1 B, `Bell-Taker (Second Wind)` +1 AP. Overlap
Bonus `k − 1 = +3` M. Pools: Momentum **5/6**, Blade **2/12**, refund **1/6**, coins 0/10. Bank 1,
multiplier `1 + 5 = 6`.

**Trick 2 — wins with the 4 of Bells.** Two fire (`k = 2`) — both Bell-Takers. The Marks are event
conditions and there is no 9 on this trick, so they stay silent. Overlap Bonus `+1` M, taking Momentum
to **6/6 — cap reached**. Blade **3/12**, refund **2/6**. Bank 2, multiplier `2 + 6 = 8`.

**Trick 3 — wins with the 11 of Keys, dodging a revealed skull.** Two fire (`k = 2`):
`Sidestep (Momentum)` pays `+2` M, **clipped to 0**; `Hoarder (Purse)` fires as the bank reaches 3 —
threshold cadence, so this is its only firing all hand — paying +5 coins, **5/10**. The Overlap Bonus's
`+1` M is **clipped** too. Bank 3, multiplier `3 + 6 = 9`. Worth pausing on: a cash-out here would be
`3 × 9 = 27` against an unbuffed 9 — **and 36 without the cap**, which is a whole perfect hand's worth
of damage delivered on trick three.

**Trick 4 — the player presses Apply Damage before committing a card.** The cash-out is `3 × 9 = 27`,
paid in **full** because it is voluntary (`the-hunt.md` §7). `Debt Collector (Blade)` fires on that
press; `k = 1`, so no Overlap Bonus. Blade takes `+3` → **6/12**. Per R3 step 4 the Blade total is
added **after** the product: `27 + 6 = 33` damage. Bank and multiplier reset — and **the Momentum pool
stays spent at 6/6 and does not refill**, which is R6's asymmetry doing its job on a voluntary reset
exactly as it would on a hit. Quarry **34 → 1**.

**Trick 5 — wins with the 7 of Moons.** `k = 0`. Bank 1, multiplier 1.

**Trick 6 — wins with the 5 of Keys.** `k = 0`. Bank 2, multiplier 2. The sixth trick cashes at hand's
end: `2 × 2 = 4`. The Quarry dies.

**Result: 37 damage (33 + 4), +5 coins, 2 AP refunded — for 11 AP of buffs.**

Two counterfactuals, computed on the same six tricks:

| | Trick 4 cash-out | Hand's-end cash-out | Total damage |
|---|---|---|---|
| **This rule** | `3 × 9 = 27`, `+6` Blade → 33 | `2 × 2 = 4` | **37** |
| **Unbuffed** | `3 × 3 = 9` | `2 × 2 = 4` | **13** |
| **The rejected ×count rule** | 123 **on trick 3**, before the player chooses anything | — | encounter already over |

**Against no buffs at all, the loadout multiplied output 2.85× for 11 AP.** That is what an
eleven-point investment should look like: decisive, visible, and not a different game.

**The rejected rule, computed on the same hand.** Reading the summed rewards onto the multiplier is the
most generous *coherent* reading available, since the rule as written names no axis at all: trick 1
pays `(2 + 1 + 1 + 1) × 4 = 20`; trick 2 pays `(1 + 1) × 2 = 4`; trick 3 pays `(2 + 5) × 2 = 14`. The
multiplier entering trick 3 is therefore `3 + 38 = 41` against a bank of 3 — **123 damage on trick
three of hand one**, from a loadout that is five-sevenths bronze. The 34-health Quarry is dead before
the player has made a single interesting decision, and Diarmuid's 135 very nearly is.

#### Every number here is the developer's to move

Naming the agent-chosen figures rather than burying them, per `v1-buff-card-list.md`'s precedent:

- **`MAX_MULTIPLIER_BONUS_PER_HAND = 6`** — trades a contained ceiling (72, a figure the design
  already prints) against ever feeling an uncapped jackpot. This is the largest lever on the page.
- **`MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12`** — trades "Blade can finish a hand" against "Blade can
  replace the streak". Raise it and flat damage starts competing with playing well.
- **`MAX_COIN_BONUS_PER_HAND = 10`** — trades shop-progression pace against coin inflation on the only
  run-permanent axis. It is the cap whose failure is least visible in a single session and least
  reversible across a run.
- **The Overlap Bonus at `k − 1`, drawn from the Momentum pool** — trades a clean, readable reward for
  width against the fact that a Momentum-heavy loadout feels it not at all. Giving it its own separate
  cap is the live alternative, and it is a different design, not a retune.
- **The event / threshold / terminal cadence** — trades a cost model that already assumes repeat
  firing against a multiplier that then needs capping. Flipping every family to once-per-hand would
  remove the need for the multiplier cap and contradict `v1-buff-card-list.md`'s shipped pricing. This
  is the second-largest lever, and it is a rule rather than a number.

The same two caveats `v1-buff-card-list.md` attaches to `MAX_REFUND_PER_HAND` apply to all four caps.
**None of them is a `config.ts` key yet — DLR-108 creates all four.** And **none of them has been
played**: each is reasoned from the shape of the failure it prevents, not measured.

> **One transcription correction, recorded rather than silently applied.** DLR-124's dispatch cited a
> gold `Bell-Taker (Momentum)` at **6 AP** in two places. `v1-buff-card-list.md`'s AP table prices
> Taker/Momentum at 2/3/**5**, so gold is **5 AP**; 6 is Feeder/Momentum's gold. The figure is used at
> 5 above, which makes the degenerate loadout cost 9 AP rather than 10 and therefore makes the case
> against an uncapped rule slightly *stronger*, not weaker. Neither argument's conclusion moves.

---

## 6. Catch-up

**The position: a cheap restart, plus pending damage and the declaration itself as the built-in
catch-up routes.** Two branches were discarded, one line each, unaffected by the direction. A
gentler requirement curve was rejected because it removes the growth-class lesson §3 derives —
softening the curve so more builds survive it is the same move as removing the ceiling §3 derives,
and that ceiling is the design's main source of depth. Sub-run checkpointing was rejected because
it is the linear-narrative answer, and §7 does not choose a linear-narrative structure — there is
nothing below a short, restartable run worth checkpointing into.

### The Humble-dominance proof, retired as a historical note

This section used to open by calling itself "the design's weakest claim." That framing is gone —
not because the claim was wrong, but because its subject stopped existing. The proof is kept below
because it is the record of **why the multiplier table stopped being a transcription and became
designed** (decision 3, the direction above), which is the most useful thing it can do now.

**The setup, as it stood.** The base game's single table paid the 0–3 band the same ×6 as 7–9
(`fox-in-the-forest.md` → End-of-round scoring). At flat card value a Victorious round taking 8
tricks captured 16 cards for `16 × 6 = 96`; a Humble round taking 3 captured 6 for `6 × 6 = 36`.
Same multiplier, and Humble lost by a factor of nearly three.

**The superset argument.** Concentrating Forage into a few enormous cards was thought to favour the
lane that only needs a few cards. It didn't, because the Victorious player captures those same
cards and then twelve more:

```
Humble      (6 cards):   20 + 20 + 20 + 1 + 1 + 1          =  63    ×6 =  378
Victorious (18 cards):   20 + 20 + 20 + fifteen 1s         =  75    ×6 =  450
```

Winning more tricks never cost you the pumped cards. So as long as every additional card carried a
**positive** value, the Victorious pile was a superset of anything Humble could assemble, and
Victorious won by construction — Meier's definition of an uninteresting decision (`design-
principles.md` §2, the test for whether a choice is worth making) landing on one of the two terms
of the equation.

**Why it is retired, not reversed.** The proof depended on two bands _sharing_ a top multiplier —
0–3 and 7–9 both paying ×6 in the single printed table, so the pile that could reach either band's
multiplier for cheaper (fewer cards) was strictly worse than the pile that could reach it too and
also capture more. The two tables decision 3 introduces have **one peak each** — 7–9 on Win, 4–6 on
Lose — so there is no second band anywhere sharing either path's top multiplier for the superset
argument to compare against. The problem is not argued away; it is dissolved by construction. §3
records the same fact from the ceiling's side.

**The exits this section used to weigh, and what happened to them.** Two exits were named,
composing rather than alternative: (a) raising the Humble multiplier to its break-even
(`6 × M = 18 × 6 → M = 18`), and (b) letting Forage set a card's value below zero, so some cards
become worth declining. (a) is moot for the reason above — there is no dominance left to break even
against. **(b) is now retired outright, and for a reason worth stating precisely.** It leaned on
the Poison 8s as the deck's example of a card a player would rather leave behind — three of
thirty-three, a rounding error even then. Under the direction's decision to remove Poison entirely
(§1: rank 8's `−1` goes, at ×5 a ±1 modifier moved a Hunt by under 1% of the ceiling), card value is
now the printed rank alone, with no modifier of any kind — so every captured card is a gain, and
there are **zero cards worth declining, permanently rather than incidentally.** `the-hunt.md`'s
Known-tensions block records this same point about the Poison 8s specifically; the direction closes
it for the same reason here, at the level this section owns.

### The real structure: one disaster, one slow leak

Overreaching in the direction you declared is nearly harmless. Declare Win and sweep all 13 tricks
and you still deal +78 net (the `k = 13` row of §8's rebuilt table); declare Lose and take none and
the same +78 lands the other way. Both extremes of your **own** declared path cost almost nothing.

The **disaster** is being pushed across the line you declared against, into the opponent's peak
band. Declare Win, get pushed to `k = 4`, and the swing is **444 damage against you** — a single
Hunt that, at 1,350 health, is a loss on Hunt 3.

The **slow leak** is undershooting past the opponent's peak into their own tail. Declare Win and
land on 0–3 tricks and you are only −24 a Hunt — but it is still a loss, arriving over **18–23
Hunts**, a 299-trick session rather than a 39-trick one. Both must be stated, not just the
disaster: a document that called both extremes safe would be wrong in exactly the direction that
costs a player the longer of the two losses.

### Pending damage, the catch-up route the equation already pays for

Damage accumulates visibly through the Hunt on both bars and lands only at trick 13 (the direction,
above). Because nothing is applied until then, **no Hunt is decided until the last trick**: a
Quarry sitting on 9 tricks with lethal pending damage can still be pushed to a 10th, collapsing its
own pending total from a ×5 band to a ×0.5 one. The endgame objective this creates is _force them to
take one more_ — the player deliberately dumping a trick they could have won, which the base game's
follow-suit rule already makes possible and this design merely gives a reason to want.

**Cost in new rules: zero.** This is a presentation of a number `card value × Standing` already
produces, not a new mechanic — the pending total is just that same equation evaluated early. What
to watch: four figures move every trick — both sides' pending totals and both health bars — and
whether that reads as tension or as noise is a feel question, the developer's; the cheap fallback
if it is too busy is to show only the **net** pending figure, one bar, one direction.

### The declaration's free option — the section's live problem

This is the finding the design session produced, and it is not covered by the ticket that scoped
this rewrite. Card strength is an asset on the Win path and a liability on the Lose path (the
direction, above — printed rank on Win, `12 − r` on Lose), and the player chooses which regime
applies **after seeing their hand**, while the Quarry cannot choose at all (decision 5 — it always
follows the player's own declaration). Worked: a player holding a weak hand declares Lose, lands on
5 tricks, deals 480, takes 180 — **+300 for holding the worse hand.**

Two things keep this honest, and the document owes both:

- **The option is only worth what the read is worth.** What makes a hand good at Win — high cards,
  trump length — is not the opposite of what makes it good at Lose — low cards, short suits. A hand
  of middling ranks is bad at both and cannot steer to either band, and that is most hands. So the
  interesting case is the common one: committing before trick one without knowing which side of the
  6/7 line you will land on.
- **The character roster is already a counterweight, and the document has never noticed it.** The
  Monarch forces the player's Swan or highest card of a led suit, which forces trick wins — an
  anti-Lose tool that shoves the player past 6. The Swan forces the lowest card when void, so the
  player cannot trump in — an anti-Win tool that drags them below 7. Two of five characters already
  punish one declaration each, at zero new rules. **The gap that follows: which declaration do the
  Woodcutter, the Fox and the Witch punish?** If the answer is "neither," that is a design hole, not
  a detail — recorded here rather than by editing §4, which this contract does not touch.

Two cheap levers exist and neither is taken here. **Declaring before the decree is turned** is not
actually open — trump is the biggest single factor in whether a trick count can be steered, so
moving the declaration earlier would cut read quality at zero rules, which is exactly why the
third-pass decision on timing already recorded it as a **discarded branch**: the declaration is
built pre-Hunt, after the deal, with the decree already visible. **Sorting the character roster so
each one punishes a declaration** remains genuinely open — it costs nothing arithmetically and would
close the three-character gap above, but which characters get reassigned to which side is a design
reading this section states rather than makes.

---

## 7. Run length and depth budget

### The target: a run is 30–40 minutes — decided by the developer, 2026-09-02

**A run should be one sitting, and one sitting is 30 to 40 minutes.** That is the figure the
roster is sized against from now on, and it is a design target rather than a tuning value: the
number of opponents is derived from it, not chosen alongside it.

**The twenty-five currently configured were never a decision.** They were picked as a goal known to
be out of reach at the time, as a stand-in — *"I just picked the number 25 out of the air as a goal
that I knew was unreachable."* Nothing was measured against them and nothing depends on them.

**Measured against the target, the run today is roughly ten times too long.** The first narrated
play session (`the-hunt-play-session-2026-09-02.md`) covered two fights and a shop visit in 33
minutes, which is about 16 minutes per fight-plus-shop. Narrating inflates that, but the later
fights are longer — opponents hold more health — and the shop visit lengthens as income outruns
prices, so 25 fights is on the order of **six hours**. A Balatro run, the direct comparison, is
30–40 minutes (`balatro.md` §1.5: eight antes, three blinds each).

**What this makes derivable.** Once a fight-plus-shop is timed against a player who is not narrating
and knows what they are doing, the roster length is that time divided into the target — and the
number of stages follows from it, because a stage is wherever a boss sits. Nothing else in the game
has to change to shorten a run: the run's length is however many names are configured, and adding or
removing a name adds or removes a fight ([`the-hunt.md` §10](../../game_rules/the-hunt.md)).

**Two consequences worth stating before the roster is cut.** A shorter run makes each opponent's
health curve and the boss multiplier matter far more per fight, since there are fewer fights to
spread the climb over. And it sharpens rather than softens §12's depth-budget risk: fewer encounters
means the pattern has to be worth re-entering, which is an argument about repeatability, not length.

**Still open:** the fight-plus-shop time to divide by, which needs one un-narrated timed session;
and whether the five-stage shape survives a shorter roster.

---

**The choice: roguelike-repeatable and short.** The discarded branch, in one line: a
linear-narrative arc was rejected because `balatro.md` §2.4 shows Balatro's slippery slope is only
tolerable when a run is short and restarting is free — a narrative spine would inherit that same
slope while discarding the only thing that makes it bearable.

**The dependency, made explicit.** §6's catch-up position — a cheap restart, pending damage and the
declaration itself as the routes back into a Hunt, no comeback mechanic beyond either — only works
because of this choice. A short, repeatable run makes an unwinnable encounter a minor cost; a
linear-narrative run makes the identical unwinnable encounter the collapse of a multi-hour
investment. If this section's choice is ever reopened, §6 has to be rewritten, not merely
revisited.

**The depth-budget argument.** Raph Koster's framing treats games as pattern-learning machines:
fun is the sensation of grokking a pattern, and a game is over once that pattern is mastered
(`design-principles.md` §1). What a player is learning on encounter five that they were not
learning on encounter one is not a new card or a new Quarry character — the roster in §4 is five
characters and does not grow — it is the growth-class lesson from §3 and §5: which builds' card
values keep pace with the ceiling §3 derives and can still be pushed across the 6/7 line without
dying for it, and which are additive-only and therefore stall at a predictable point. That pressure
is no longer supplied by a rising target across the run — health resets each encounter — it is
supplied consistently, every Hunt, by the same equation. It is the same shape as Balatro's
requirement curve teaching `Chips × Mult` (`balatro.md` §2.1), reapplied here to
`card value × Standing`.

**One progression system against four — the sharpest version of the risk this section accepts.**
The comparison usually drawn is roster size, five Quarry characters against Balatro's ~150 Jokers.
The more damaging comparison is structural. Balatro runs **four** progression systems concurrently
(`balatro.md` §1.8–§1.10, §1.7):

| System               | What it does                                                        |
| -------------------- | ------------------------------------------------------------------- |
| **Jokers** (5 slots) | Persistent multipliers sitting outside the deck — the actual engine |
| **Tarots** (22)      | Deck edits — **the only one this design has**                       |
| **Planets** (12)     | Permanently level a hand type                                       |
| **Vouchers**         | Run-long upgrades to the shop and economy                           |

Deck editing is Balatro's _supporting_ system; the Jokers are what make a build. Here, Forage is the
whole of it — and by §3's own measurement it fires less reliably than Balatro's Tarots do, being a
no-op roughly one edit in five.

This is not an argument for adding a Joker layer: §1's component table forbids any device that is
not an intervention on card value or Standing, and a persistent flat multiplier would be a third
channel. It is an argument that **this section's accepted risk is larger than it states.** The
honest position in the paragraph below — that this design is choosing to risk "runs out of steam
quickly" — should be read against one progression system, not five characters, because that is where
the depth budget actually is.

**The critique this design is accepting.** `forbidden-solitaire.md` §9 records reviews splitting
on exactly this decision: Shacknews calls the game one that _"has the good sense to get out while
the going is good,"_ while other reviews say _"the gameplay runs out of steam quickly due to how
shallow and straightforward it is"_ — both describing the same fact, a small depth budget spent
over a short length. This design's roster is five characters against Balatro's roughly 150 Jokers,
and its ruleset delta (§8) is deliberately small, so the honest position is that it is choosing to
risk _"runs out of steam quickly,"_ not claiming exemption from that verdict by pointing at the
short run length. Repeatability is there to let a player who exhausts one run's pattern try again
with a different Forage line, not to manufacture depth the roster doesn't have.

**The run's shape.** Four characters plus a boss — **five encounters, the no-repeat length** —
with the encounter order randomised. This closes two things at zero cost, neither of which needed a
new component. First, five encounters is exactly §4's roster, so the pigeonhole problem behind
§12's Problem 3 — any run longer than five must repeat a character, and nothing said how —
disappears by construction rather than by a scheduling rule bolted on top. Second, randomising the
order turns a fixed sequence into **24 distinct sequences** with the boss fixed as the fifth
encounter, or **120** if the boss is drawn into the shuffle too — which also closes this section's
own "every run shows the same five characters" gap, below, at no cost beyond a shuffle.

### What a run keeps, and what happens when one fails

Two questions this section left implicit, both surfaced in play-through on 2026-08-09 and both
**decided by the developer**, provisionally, pending a playtest.

**Forage persists within a run, and nothing persists across one.** A card pumped at encounter 1 is
still pumped at encounter 5 — that is what makes a run feel like building something. But a new run
starts on a bare 33-card deck with every card back to base value: every run is a clean test, and what
improves between runs is the player, not the deck.

> **Correction, 2026-08-17.** This paragraph used to cite Balatro as the source of that model.
> Balatro is **not** a clean-test roguelike — `balatro.md` §1.11 and §2.4 now record that its
> discovery-gated decks hand out flat starting power (+1 hand, +$10) on a counter that accrues from
> losing runs. The clean-test rule above stands on its own merits and is unaffected; only the
> attribution was wrong.

**The player's health emptying during an encounter ends the run.** This follows from §6 rather
than being a separate choice. §6's whole answer to having no catch-up mechanic beyond pending
damage and the declaration itself is that losing is cheap and restarting is free — which is only
true if failure actually ends the run. Retries would make the health bar decorative: an
under-built deck would never fail, it would merely take more attempts, and §3's growth-class lesson
would stop being taught. Note the two parents disagree here and the disagreement is instructive —
Forbidden Solitaire grants effectively unlimited retries because it is a 2–3 hour linear story that
cannot afford to delete progress, and this design chose the other structure in this section.

**Banked progress across runs: rejected for _accruing_ power, left open for options and for a
bounded pick.** The developer is open to a Hades/Rogue Legacy-style layer in which failed runs still
bank something. Carrying **accruing power** across runs — more health, higher card damage, each
unlock adding to the last — is **rejected**: it dissolves the growth-class lesson the health bar
exists to teach, because enough runs and the starting deck is strong enough that build quality stops
mattering, which is the same failure §3's discarded shop-and-money branch describes from inside a
single run rather than across several. Carrying **options** stays open — unlocking a new Quarry
character or a new kind of Forage edit puts variety in the pool, the deck still resets every run,
and it costs nothing arithmetically.

**Revised 2026-08-17: a third answer sits between those two, and Balatro is it.** This paragraph
previously described Balatro as the cautious middle that unlocks content "into the pool rather than
handing over a head start." That is factually wrong and the correction opens a door the paragraph
had closed. Per `balatro.md` §1.11, Balatro hands over a real head start — but **one that never
stacks**: the player picks exactly one deck per run, so a two-hundred-hour player starts with the
same _count_ of modifiers as a fresh save, and the Stake ladder raises the difficulty floor
alongside the widening pool. The rejection above is a rejection of _accrual_, not of cross-run power
as such, and a **pick-one** bank — unlocked starting loadouts the player chooses exactly one from —
does not trigger it. That shape is untested here and unadopted; it is recorded as live rather than
foreclosed. See `ideas.md`, _The buff persistence ladder_, for the stacking/pick-one distinction
stated generally.

Hades is the third weighing worth naming: its banked progress is real and it _does_ accrue, but the
difficulty it is spent against (Pact of Punishment) is a separate dial the player opts into on top
of it, so the base test — can this run's build clear this run's content — stays re-armable rather
than gradually trivialised. Balatro reaches the same end by capping the bank instead of raising the
target. Either device would work; what an answer here cannot do is bank accruing power with no
counterweight at all.

**Settled by playtest, not on paper.** Whether run failure is too harsh, and whether banked progress
is wanted, are both feel questions. The measurement: run a full session under the clean-test rule
and record whether players restart voluntarily or stop playing. A player who restarts immediately
does not need banked progress; a player who quits after one failed run does.

### Two gaps, closed by the run's shape

Both surfaced in play-through on 2026-08-09, from a developer describing the run back in their own
words. Neither was a tuning value; both are now closed — one by the direction generally, one by the
run's shape stated above.

**A run has no defeated opponent — resolved.** The developer's phrasing was "then we beat the CPU,"
and the design as it stood did not permit that: the Quarry had no score, no health, and no failure
state, so clearing the final Demand won the run while nothing was beaten. The direction resolves the
structural half of this outright: the Quarry now holds health and a stake in the outcome (the
direction, above), so the run ends with an opponent defeated rather than an opponent that simply
stops. What it does not resolve is the emotional half. Balatro's Ante 8 Boss is also just a number,
but Balatro spends its whole climax on the _reveal_ (`balatro.md` §2.5 — the Rube Goldberg machine
going off), an aesthetic this design has not claimed and would have to build deliberately. §12's
existing smaller finding that the document never names its target emotion (Rosewater #6) is the
general form of this; the run's ending is where it bites hardest, and health answers the structural
half, not that one. **Nothing is proposed here.** It is recorded so that whatever names the target
emotion has to answer it.

**Every run shows the same five characters — closed by the run's shape.** §4 fixes the roster at
five and this section's own choice fixes a run's length at five, so without a stated build rule
every run would face the same five Quarries in the same order — Balatro draws each Ante's Boss from
a pool, so two runs differ in which constraints they meet and when, and this design as first
written had none of that variation. The run's shape stated above closes it: randomising the order
gives 24 (or 120) distinct sequences, which is the same fix this section already named as
cheapest — "randomise the order, or hold a roster larger than the run length so each run draws a
subset" — now actually taken rather than left as an option. This is also the between-runs
counterpart to §12's Problem 3, which covers repeats _within_ a run; both close by the same
decision.

---

## 8. The ruleset: kept, modified, dropped

Every rule of the base game gets one line below and a reason, not just a verdict — a bare
kept/dropped list says nothing about whether the design still works once the reason is missing.

| Rule                                          | Kept / Modified / Dropped                                        | Reason                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decree and trump                              | Kept                                                             | Promoted to the run's shared object (§2) — Forage edits the same deck-and-decree the Hunt is dealt from and played with; nothing new was invented for it.                                                                                                                                                                                                                                                                  |
| Follow-suit obligation                        | Kept, unchanged                                                  | `fox-in-the-forest.md` → Following. It is the entire tension of a trick-taker: without it, card choice is free and the layer collapses into "play your best card." It is also the input the Quarry attacks in §5's Swan (1) worked example.                                                                                                                                                                                |
| Odd-rank abilities (1, 3, 5, 7, 9, 11)        | Kept as substrate, made editable by Forage                       | `fox-in-the-forest.md` → Abilities. Abilities already sit on cards, so "move or add an ability" is a deck edit that needs no new vocabulary — the cheapest possible Forage extension per §3's Cook's-loop argument.                                                                                                                                                                                                        |
| Trick-count scoring curve                     | Modified                                                         | From a points lookup (`fox-in-the-forest.md` → End-of-round scoring) to the Standing multiplier (§1). The _boundaries_ are unchanged from the base game — `{0–3} {4} {5} {6} {7–9} {10–13}` — but the _values_ are no longer a transcription: there are now two tables, one per declaration, and the Lose path reads that same boundary set in mirror. Whether the shape still does the same job is the sub-section below. |
| The Win/Lose declaration                      | Added                                                            | Not in the base game. Recorded and reasoned in §1's `### The declaration, the two tables, and what each side is paid for` — this row exists so a reader arriving from this table finds the pointer rather than searching for it.                                                                                                                                                                                           |
| 13-card hands / 13 tricks / 33-card base deck | Kept, as the round's fixed shape                                 | Everything quantitative in this document — the ceiling §3 derives (540 typical, 765 best case) and the 14-split enumeration below — is derived from this shape staying fixed. The deck's _contents_ grow as Forage edits them; the round's _length_ does not.                                                                                                                                                              |
| The 21-point match                            | Dropped, restored in a new form                                  | `fox-in-the-forest.md` → End of game. Match-to-21 is the ending condition of a symmetric two-player contest — and that contest is back: a race to deplete two health bars **is** match-to-21 with the sign flipped, ended by an empty bar rather than a crossed score. §7's fixed encounter sequence still replaces the specific number and unit; the shape returns intact.                                                |
| Goal cards (16)                               | Dropped                                                          | `fox-in-the-forest.md` → Goal cards. A second damage channel running alongside `card value × Standing`, which §1's component table rules out by construction — any device that isn't an intervention on card value or Standing is a design defect, not a table entry.                                                                                                                                                      |
| Poison 8s (3)                                 | Dropped as a modifier                                            | `fox-in-the-forest.md` → Poison cards. The `−1` is retired along with Treasure's `+1` (§1): at ×5 a ±1 card modifier moves a Hunt by 5 damage out of 540, under 1% of the ceiling, so the rule was paying rules budget for a rounding error. Rank 8 is now an ordinary card, worth its printed rank like any other.                                                                                                        |
| Special cards (9)                             | The _unsuited_ concept kept; the nine specific cards not carried | `fox-in-the-forest.md` → Special cards. _Unsuited_ — a card that counts as the trick's other suit regardless of its own — is the cheapest existing grammar for a Forage edit that changes a card's suit (§3). Bow, Hammer, Potion, Shovel, Axe, Tree, Fairy, Crown and Mirror are not adopted as printed; they sit outside Forage's four-thing vocabulary.                                                                 |

### The trick curve, now that both sides score

**The position this section held.** With 13 tricks split between two players, there are exactly 14
possible outcomes — the player's trick count `k` runs 0 through 13, and the Quarry always holds the
remaining `13 − k`. Reading the base game's own printed Standing table down either column repeated
one fact at all fourteen rows: exactly one side scored ×6 and the other side's Standing never rose
above ×3 — not a property of any single split, but a property of the table itself, because the
Humble/Victorious bands and the Greedy/Defeated bands mirror each other across the 13-trick line. In
the base game that mirroring _is_ the mid-round tension: every trick either side takes pulls the
other side's band toward the mirrored loss.

**What happened when the Quarry stopped scoring, and why the position changed rather than merely
weakened.** A CPU that does not score has no band to be pushed into. The "exactly one side scores 6"
fact is a fact about two Standings being computed and compared — remove the second scorer and it
does not weaken, it stops being a fact about anything, because there is no second Standing left to
compute. What replaced it was a curve read as **a self-limit on the player alone**: Standing still
punished overreach — Greedy still paid ×0, Defeated still paid ×1/×2/×3 — whether or not anyone was
competing for the band the player didn't reach. That was a plainly weaker version of the original
property, and the design accepted the trade because the old plain-value ceiling supplied the
pressure the opponent's mirrored band used to supply.

**The premise that moved.** The mirrored-band tension was always a property of a **symmetric**
contest read off a shared table, not of the table's printed values alone. That did not stop being
true when the Quarry stopped scoring; what changed is that the direction restores the second
scorer — the Quarry now reads the player's own declaration and deals damage by the same equation
(the direction, above; §1) — so the contest the tension depends on exists again.

**The new position: the tug is restored, in a graded rather than binary form.** The table below
walks every one of the fourteen splits against **both** of the two tables decision 3 introduces, at
printed rank, average rank 6 — a trick's two cards worth roughly 12 between them (the frame every
figure in this document is now computed against):

| Player `k` | Quarry `k` | **Win declared:** player deals / Quarry deals / net | **Lose declared:** player deals / Quarry deals / net |
| ---------- | ---------- | --------------------------------------------------- | ---------------------------------------------------- |
| 0          | 13         | 0 / 78 / **−78**                                    | 78 / 0 / **+78**                                     |
| 1          | 12         | 12 / 72 / −60                                       | 72 / 12 / +60                                        |
| 2          | 11         | 24 / 66 / −42                                       | 66 / 24 / +42                                        |
| 3          | 10         | 36 / 60 / −24                                       | 60 / 36 / +24                                        |
| 4          | 9          | 96 / 540 / **−444**                                 | 540 / 96 / **+444**                                  |
| 5          | 8          | 180 / 480 / −300                                    | 480 / 180 / +300                                     |
| 6          | 7          | 288 / 420 / −132                                    | 420 / 288 / +132                                     |
| 7          | 6          | 420 / 288 / +132                                    | 288 / 420 / −132                                     |
| 8          | 5          | 480 / 180 / +300                                    | 180 / 480 / −300                                     |
| 9          | 4          | 540 / 96 / **+444**                                 | 96 / 540 / **−444**                                  |
| 10         | 3          | 60 / 36 / +24                                       | 36 / 60 / −24                                        |
| 11         | 2          | 66 / 24 / +42                                       | 24 / 66 / −42                                        |
| 12         | 1          | 72 / 12 / +60                                       | 12 / 72 / −60                                        |
| 13         | 0          | 78 / 0 / **+78**                                    | 0 / 78 / **−78**                                     |

The old table zeroed one side outright at ten of the fourteen rows (Greedy ×0 against Humble ×6).
This one never does: **the mirror is now graded rather than binary**, and the net is perfectly
antisymmetric — `Net(k) = −Net(13 − k)`, with the Lose column the exact negative of the Win column
at every row.

**The winner property, stated carefully, because the obvious phrasing overclaims.** At these
average card values, no split in the table comes out even, so the tables give **every split a
winner at average values**. That is not the same claim as "every Hunt has a winner." Antisymmetry
alone does not forbid a zero — it permits a zero _pair_, at `k` and `13 − k` together — and the
round's odd length (13) only rules out a single split that pairs with itself. A real deal is not the
average: its actual pile sums diverge from the mean the table above assumes, so **a real deal can
tie**, and that outcome is reachable in play, not merely a theoretical gap in the arithmetic.

**What this closes, stated once rather than twice.** This section's own residual risk — that with
nobody contesting the Victorious band, a player would have no built-in reason to avoid aiming for
7–9 every Hunt — is answered by the same restoration: the Quarry now has a stake in keeping the
player off whichever side of the line the declaration commits them to (§5's restatement of the
Quarry's job), and the declaration itself means "aim for 7–9" is not even always the target — half
the time it is 4–6. What this section used to call "upgraded from a risk to a proof" — §6's superset
argument that Victorious dominates Humble by construction — is retired rather than surviving here:
it depended on two bands _sharing_ a top multiplier, and the two tables above have one peak each, so
there is no second band left for a superset to dominate. §6 carries that argument as a historical
note; it is not repeated here.

---

## 9. First-pass values

This section used to open by promising that no number in it was a chosen value. That promise no
longer holds, and restating it anyway would be tidier than it would be honest: several of the rows
below are now the developer's decisions, dated, and this section's job for those rows has narrowed
from _avoiding_ a number to _recording_ one. What follows distinguishes three states, because a
reader needs to know which is which:

- **Decided** — a developer decision, dated, and recorded here rather than made here.
- **Undecided** — genuinely open, with the cheapest measurement that would settle it.
- **Deferred** — open, but not blocking the first fight, so it is parked rather than pursued.

The rule that survives unchanged, and the one this section keeps making for itself: **this document
chooses nothing on its own authority.** Every Decided row below is the developer's decision,
attributed and dated; none of it is this document's own conclusion dressed up as one.

| Value                                  | Status                                                                             | Note or settling measurement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card base value                        | **Decided — printed rank** (2026-08-11)                                            | Closed by the direction: the Lose path's `12 − r` inversion has no meaning at flat value 1. Was this document's highest-leverage open fork.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| The multipliers                        | **Decided — two mirrored tables** (2026-08-11)                                     | Values in the opening section. They are now _designed_, not transcribed, and the exact complementarity is load-bearing per the same-path rule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Quarry health `H`                      | **Decided — 1,350** (2026-08-11)                                                   | Developer's value, chosen so the fast lane is 3–4 Hunts rather than 2 — the declaration has to be made several times for the slice to say anything about it. `ideas.md`'s _Fight length is symmetric about the middle_ entry owns the arithmetic and illustrates at 1,620; this row cites that entry and states the lengths **at 1,350** rather than restating its table. At 1,350 the fast band (4–9 tricks) resolves in **3–4 Hunts** and the tail (0–3, 10–13) in **18–23**. Every structural finding in that entry survives unchanged — the antisymmetry, the bimodality with nothing between, and the slowest line sitting at 10 tricks (23 Hunts) rather than 13 (18).                                                                                                                                                                                                                                                                                                                                                                         |
| Player health `P`                      | **Decided — 1,350** (2026-08-11)                                                   | Developer's value, equal to `H`. The equality is what puts the win/lose boundary **exactly on the 6/7 line** the declaration commits to: 7 tricks a Hunt wins on Hunt 4 with 486 left, 6 tricks loses on Hunt 4. That is the design's single failure mode made into the encounter's own decision boundary, and it is a consequence of `P = H` rather than of the number — so the property survives any later rescaling of health, which §5 states so a future tuning pass does not break it by accident.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Rounding of the ×0.5 bands             | **Undecided — or dissolved, developer's choice**                                   | ×0.5 produces half-point damage on any odd card sum, so as stated the rule needs a rounding direction. **Doubling every entry in both tables removes the question entirely** — all multipliers become integers, ratios and complementarity are preserved, health totals double, and the ceiling reads 1,080 instead of 540. That is a presentation of the same table, not a change to it. Decide whether it rounds and which way, or double and delete the row.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Hunts per encounter — the cap `R`      | **Deferred — a session-length guard, and the slice measures whether it is needed** | Worked in full in `ideas.md` → _Fight length is symmetric about the middle, and bimodal_; §5 and this row cite it rather than restating it. In short: outcomes inside 4–9 tricks resolve fast, everything outside takes an order of magnitude longer, and there is nothing between — the extremes put 78–96 damage on the table against 708 at the 6/7 boundary, a 7.4× to 9.1× slowdown. So session length is a step function of whether the player lands in the middle band, not a dial. **Restated at the decided `H = 1,350`** (that entry illustrates at 1,620): the fast band resolves in **3–4 Hunts** and the tail in **18–23**, up to 299 tricks. The top end (10–13 tricks) is additionally **unloseable**, taking 0–36 a Hunt. That is an unbounded tail rather than a dominant strategy — landing 10+ needs the cards, not the intent — so the cap is insurance on length. If it is needed, its value is derivable: above `H / 540` and well below `H / 78`, biased low — **at 1,350 that is above 2.5 and well under 17.3, so 3 to 5.** |
| A Quarry that plays for band position  | **Not a value — an in-scope deliverable** (2026-08-11)                             | Recorded here so the slice's cost is visible next to its numbers. The built CPU maximises tricks, which lands it in 10–13 on either declaration and has it deal 24–78 against a competent player's 420–540. It is the slice's largest engineering item; without it, _"is the declaration a live read"_ is measured against an opponent that cannot make it a hard one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Treasure (7) and Poison (8) modifiers  | **Decided — removed** (2026-08-11)                                                 | Rank 7 keeps its identity and does nothing for now; rank 8's `−1` goes. At ×5 a ±1 modifier moves a Hunt by 5 out of 540 — under 1% — so both were paying rules budget for a rounding error. The additive term is now the printed ranks alone, with no modifier of any kind.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| When the declaration is made           | **Decided — pre-Hunt, after the deal** (2026-08-11)                                | As currently built. "Declare before the decree is turned" is recorded as a discarded branch with its reason, per the house style.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Simultaneous depletion                 | **Decided — the player loses** (2026-08-11). **Overturned 2026-08-19.**             | Stated in §5 so the end-of-encounter condition is complete. **Overturned, not deleted: DLR-91's D7 resequences `applyDamage` to deplete the Quarry FIRST, so a Quarry killed by an event spares the player that event's damage entirely — a mutual kill is now a player win, and the simultaneous case this row decided is unreachable by construction rather than by a tie-break rule.** `SIMULTANEOUS_DEPLETION_WINNER`, the constant this row's ruling was implemented as, was deleted rather than retargeted to the new winner — a constant with no reader left in the code is a tunable that silently does nothing, which is worse than having none.                                                                                                                                                                                                                                                                                                                                                                                        |
| Overkill past a depleted bar           | **Deferred**                                                                       | Wasted for now; may later pay out as cash or similar. Recorded so the surplus question stays findable rather than looking designed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Forage value edits under inversion     | **Deferred — no Forage in the slice**                                              | Whether `12 − r` reads the printed rank or the edited value. The two readings differ by the whole size of an edit; it blocks Forage, not the first fight.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| What each side counts on the Lose path | **Decided — the piles swap both ways** (2026-08-11)                                | You count the Quarry's pile, it counts yours, both inverted. Closes the last input to the enumeration; the discarded branch (both sides counting the Quarry's pile) is recorded with its edge-case reason.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**The Demand base and growth rate row is deleted, not marked Undecided.** There is no Demand to
settle — a side's total is damage to the other's health, not a number checked against a target, and
the row that used to hold that question simply has nothing left to ask.

---

## 10. Vocabulary

Every term this document defines, and nothing else — the complete set, reproduced from `plan.md`
Part 2 → Data shapes. The framing name is the round itself: a Hunt, run against the Quarry §4 casts
from the deck's own odd ranks. Everything else names a term of §1's equation or a verb that edits
one.

| Term                | Is                                                                                                                         | Note                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **the Hunt**        | one 13-trick round                                                                                                         | the inner loop — §1's equation is scored once per Hunt                                                                    |
| **the Quarry**      | the CPU opponent for one encounter                                                                                         | a character from the deck's odd ranks                                                                                     |
| **Standing**        | the multiplier read off the band a side's final trick count lands in                                                       | the multiplicative term; now two mirrored tables, one per declaration (§1)                                                |
| **health**          | the total each side's damage depletes                                                                                      | the Demand with memory                                                                                                    |
| **damage**          | a side's card value × its Standing for the Hunt, applied to the other side once at the end                                 | §1, the direction above                                                                                                   |
| **pending damage**  | the damage a Hunt has accumulated so far, shown but not yet applied                                                        | §6's catch-up route                                                                                                       |
| **the declaration** | the player's pre-first-trick choice of Win or Lose, which sets the card values and the multiplier table **for both sides** | §1's `###` subsection                                                                                                     |
| **the line**        | the 6/7 trick boundary the declaration commits you to a side of                                                            | §6, §8                                                                                                                    |
| **the cap**         | the maximum number of Hunts one encounter may run                                                                          | §5; deferred to §9 for the slice                                                                                          |
| **the boss**        | the fifth and final encounter, whose escalation attacks deck contents                                                      | §5, §7                                                                                                                    |
| **Forage**          | the between-encounter deck edit                                                                                            | the outer loop's only verb                                                                                                |
| **Snare**           | the in-round edit, on cards in hand                                                                                        | **proposed, not decided** — §3. Placeholder name; the layer it names is the developer's to accept before the name matters |

Removed: `Spoils` and `the Demand`, retired along with the score-and-target model they belonged to
(the direction, above; §1, §5). `Standing` survives — it is still the name for the multiplicative
term — but it is no longer one table; §1 states the two mirrored tables the term now covers.

This table is **first-pass and the developer's to red-line** — naming is a copy judgement, not a
decision this document is entitled to make on its own authority.

**Flagged, not fixed: the band names.** Humble / Defeated / Victorious / Greedy name the base
game's own _values_ — a plain score of 1, 2, 3, 6 points for landing in each band. Under one table
that naming was harmless; under two, it describes the Win path and **misdescribes the Lose path**,
where 4–6 — the base game's "Defeated" — is the peak (§1, §8). A player reading "Defeated" on the
table they are trying to land in is reading a name pointed at the wrong half of the mirror.
Renaming would ripple past this document: `the-hunt.md` states the same four names, and the built
configuration's band constants carry them as identifiers, so a rename here is not a documentation
edit alone. **Whether the bands keep one name set, gain a second for the Lose path, or lose their
names entirely is a copy judgement and the developer's** — the third-pass decision, 2026-08-11, was
that the names stand for now, and this section records the mismatch rather than acting on it.

One consequence is stated and deliberately not acted on: if this naming is accepted, the
repository's own naming pointer in `CLAUDE.md` needs a follow-up edit so that this direction's
vocabulary is the one a reader of a Fox in the Forest layer is sent to. **This document does not
make that edit.** It is out of scope for this contract, and propagating the naming decision into
`CLAUDE.md` is the developer's to authorise separately.

---

## 11. Smallest testable slice

**The one question the slice answers.** Not "does a single Hunt against a CPU stay a live decision
each trick" — that was the old headline risk, and it belonged to a version of this design where the
Quarry had no stake in the hand. The new question is: **is the declaration a live read, and does
the Monarch make it a hard one?** Everything below exists to answer that; anything that would not
help answer it is cut.

**What is in.**

- One encounter against the **Monarch**, the only built character.
- Two health bars, `H = P = 1,350` each (§9).
- The declaration, made pre-Hunt after the deal, exactly as built.
- Both multiplier tables (the direction, above; §1).
- Card value = printed rank, with no modifier of any kind (§1, §9).
- Damage applied once at the thirteenth trick, in **both** directions.
- Pending damage shown on both bars, every trick (§6).
- Repeated Hunts until a bar empties.
- A draw — both bars emptying on the same Hunt — going to the Quarry (§5).

**The band-position CPU is the slice's largest engineering item, and the slice does not work
without it.** The Quarry that plays today favours winning a trick cheaply over winning it
expensively — it maximises tricks. Under these tables that is close to the worst policy available
to it: on either declaration a trick-maximising Quarry lands near its own `k = 10–13`, where its own
multiplier is ×0.5 or ×1, and deals roughly 24–78 against a competent player's 420–540 (§9). **A
Quarry that never plays toward a band never threatens the 6/7 line the declaration commits the
player to** — so the slice's own question would be measured against an opponent that cannot make it
a hard one, which answers nothing. `ideas.md` → _The Quarry deals damage too_ flagged exactly this
risk first — _"a CPU that knows when to dump a trick is a materially harder opponent to build than
the one that slice assumed"_ — and it is real: building it is materially harder than the CPU
shipping today, and that is where the slice's cost sits, not in the health bars or the second table.
The Monarch is **not** listed here as though the existing CPU were sufficient for it; it isn't.

**What is out, each with its reason.**

- **Forage.** Nothing about whether the declaration is a live read needs the deck to be editable
  between Hunts.
- **The run.** One encounter tests the declaration; four more characters and a boss test the roster,
  which is a separate question (§7).
- **Escalation** beyond the Monarch's own round-long rule-break. Testing five rule-breaks tests the
  roster, not the declaration.
- **The other four characters.** Any one Quarry is sufficient to test whether the declaration is a
  live read; which one is not load-bearing for that test, and the Monarch is chosen because §6
  already names it as one of the two characters that punish a declaration directly.
- **Overkill.** Damage past a depleted bar does nothing for now. Recorded as **deferred, not
  designed** — it may later pay out as cash or similar (§9) — because the slice does not need an
  answer to ship.
- **The cap.** Both bars drain every Hunt, so a single encounter self-terminates without one; the
  cap is a run-pacing device and there is no run in the slice to pace. More usefully, **the slice is
  what decides whether a cap is needed at all**: if Hunts keep landing at the extremes and the fight
  stalls — 78–96 damage on the table against 708 at the 6/7 boundary (§5, §9) — that stall is the
  evidence a cap is required, collected for free rather than guessed at.

**The kill criterion, restated against the new question.** If a playtester who has never read this
document declares, watches both pending bars move, and visibly plays toward or away from the 6/7
line — and still reports, across a small sample of slice playthroughs rather than one, that the
declaration felt like a coin flip they were not equipped to make, then the free option (§6) is not a
decision, and the declaration needs one of §6's two named mitigations or it needs removing. No
amount of tuning health, the cap, or Forage repairs that, because all three operate one level above
the single choice the kill criterion tests. That is the condition for abandoning this direction
rather than tuning it.

**What already exists, and what one earlier claim about it no longer holds.** The deck and its
deal, legal-move generation including the base game's single-trick Monarch follow constraint, the
Fox exchange, the Woodcutter draw-and-discard and the Swan next-leader rule as single-card
abilities, trick resolution and a full play orchestration, and a working CPU that only ever plays
legal moves and already resolves the Fox and Woodcutter ability choices all ship, tested — and
DLR-63 has since added the declaration itself, built pre-Hunt after the deal. **One claim from the
earlier reading of this inventory is corrected here, because the direction voids it:** the band
lookup used to be the base game's own six printed values doing a second job for free, reused rather
than rewritten. It no longer is. The values are now designed, not transcribed, and there are two
mirrored tables rather than one — so the slice inherits a **changed lookup**, not a reused one.

Genuinely new for the slice, against that inventory: **two health bars and damage application** in
both directions; **the second multiplier table and the pile swap** the Lose path needs; **pending
totals surfaced per trick**, on both bars; and **the band-position CPU** named above as the slice's
largest item. Four additions to an engine that already plays a full round and already declares —
not a new game.

**One line on sizing basis.** This slice is sized against the trick-taking engine already on disk,
as it exists today. If the developer instead wants it sized as though nothing exists — for instance
because this direction would start a clean prototype rather than build on that engine — this section
changes materially. That is the developer's call, flagged in `plan.md`'s Risks, not this document's
to make.

---

## 12. Critique

Run against `.docs/design/design-principles.md` §6's fourteen checks, over the direction and §1–§11
read as a finished argument, not a work in progress.

### What is genuinely strong

- **The band boundaries survive completely free, even though the values inside them don't.** The
  base game's own end-of-round trick-count thresholds — 0–3, 4, 5, 6, 7–9, 10–13 — needed no
  redesign; only the numbers behind them are now the design's own, split into two mirrored tables
  rather than one. That is Rosewater's lesson #17 (Mark Rosewater's observation that you rarely need
  to change much of a design to change everything about how it plays) doing real work on the
  boundaries even after it stopped applying to the values themselves.
- **The ceiling and the two peaks are derived, not chosen.** §3's 540 typical, 765 best case, and
  ±444 maximum swing fall straight out of the round's fixed length and the two tables' exact
  complementarity; nothing had to be designed on top of that arithmetic to keep Forage the lever
  that matters past a point, and the same is true of the 708-damage figure §5 and §9 both cite for
  the 6/7 boundary Hunt.
- **The Quarry's cast still costs nothing to teach, because the player has already met it.** The
  Monarch, Fox, Woodcutter, Witch and Swan are cards the base game prints; turning each one's
  ability from a single-card trigger into a round-long condition is one sentence of new fiction per
  character, not five new characters.

### Problem 1 — The declaration is a free option taken with the hand visible

Ranked first, displacing the design's earlier top-ranked problem, closed below: this is the design's
largest unresolved balance question. Check 1 of the critique checklist (Sid Meier's test for an
interesting decision — is there a dominant option, is any choice ever wrong to take) is close to
answering itself the wrong way, because the option in question costs nothing to take and nothing to
be wrong about.

- **Evidence.** Card strength is an asset on the Win path and a liability on the Lose path (the
  direction, above), and the player commits to one after seeing their hand while the Quarry cannot
  choose at all — it always follows the player's own declaration (§1). Worked: a player holding a
  weak hand declares Lose, lands on 5 tricks, deals 480, takes 180 — **+300 for holding the worse
  hand.** The asymmetry compounds a second way: the roster already punishes exactly two of the five
  declarations at zero new rules (the Monarch anti-Lose, the Swan anti-Win — §6), so three characters
  currently offer no resistance to a correct read at all.
- **What the player experiences.** Not a bad hand — a decision made blind that turns out to have had
  a right answer the whole time, discoverable only after the fact. A player who declares well every
  Hunt is not making thirteen decisions across the round; they made the one decision that mattered
  before the first card, and everything after is execution.
- **What it connects to.** The **middling-hand** finding below — most hands cannot steer to either
  band, so this problem is invisible on most Hunts and sharp on the hands where it isn't, which is
  exactly the shape of a dominant option that survives a short playtest. It also connects to Problem
  2 below in the same direction that closing the design's earlier Problem 1 did: any answer that
  increases Quarry pressure to punish a bad declaration also increases the variance that makes a
  losing Hunt more sudden.
- **Options, not a prescription.** §6 names two cheap levers and chooses neither: declaring before
  the decree is turned — recorded there as a discarded branch, since trump is the single biggest
  factor in whether a trick count can be steered, so moving the declaration earlier would cut read
  quality at zero rules; this critique is not reopening that closed branch, only naming it as the
  lever available if the free option needs one — and sorting the roster so every character punishes
  a declaration, which stays open. Its falsifier is the measurement §11's kill criterion already
  collects: whether a playtester who declares and watches both pending bars move still reports the
  declaration as a coin flip they were not equipped to make.

### Problem 2 — A run can be arithmetically dead several Hunts before the player can tell

Restated rather than closed, because health genuinely helps and genuinely costs something at the
same time, and the honest statement says both.

- **The fix.** Health makes the decline **visible**. §6 traces the earlier version of this problem to
  a losing round that still plays all 13 tricks and still produces a number, so it _feels_ alive
  right up to the check that ends it; health turns that single check into a bar the player watches
  empty, trick by trick and Hunt by Hunt, so there is no longer one moment where a dead build is
  revealed all at once.
- **The cost.** A multi-Hunt encounter makes a dying run **longer**. At the decided `H = 1,350`, a
  build stuck outside the 4–9 trick band takes 18–23 Hunts to lose — a 299-trick session — rather
  than the single round's worth of dead air the earlier version of this problem described. Sirlin's
  slippery slope (David Sirlin's term for positive feedback that lets one early event decide a match
  well before it ends) still applies; the slope is longer now, not gone.
- **The coupling that survives.** Strengthening the Quarry's pressure to make the declaration a hard
  read — Problem 1's own falsifier, and the Monarch's whole job per §5 — increases how often a build
  is pushed across the line it declared, which is exactly the variance this problem names. The two
  problems remain downstream of the same lever; only the lever's target changed, from Quarry pressure
  against a fixed band to Quarry pressure against a declared one.
- **What to watch.** Whether the two costs above trade against each other in practice — a Quarry
  tuned hard enough to make Problem 1's free option costly will, by the same tuning, make this
  problem's tail longer and more frequent. Neither problem can be tuned in isolation from the other.

### Closed since the last pass

- **Standing as a dominant strategy — closed, but not for the reason a first reading of the ticket
  gives.** The design's original top-ranked problem was that with nothing contesting the 7–9 band,
  "aim for 7–9 every Hunt" would answer "which band do I aim for" almost every time — Meier's
  dominant-option failure landing on one of the equation's two terms. The Quarry acquiring a stake in
  the outcome helps, but it is not what closes this: the two tables that came with the direction
  remove any single dominant band on their own terms, because each declared path has **one** peak and
  the two peaks sit on opposite sides of the 6/7 line. "Which band do I aim for" no longer has a
  fixed answer at all — it is answered by the declaration, made fresh each Hunt.
- **Quarry repeats across a run — Problem 3 — closes by construction.** The original finding was a
  pigeonhole problem: five characters, an unstated run length, and no rule for what happens past
  five. §7's run shape closes it outright — four characters plus a boss is exactly five encounters,
  the no-repeat length, with the order randomised. No run longer than the roster is possible, so there
  is nothing left to schedule around.

### Smaller findings

- **The surplus-damage finding is answered, and a residual survives it.** The design used to flag
  that clearing the Demand with points to spare was dead air — nothing rewarded the surplus. Against
  health, every point of damage carries: there is no threshold to clear past, only a bar to empty
  faster. What survives as a residual, unresolved gap: **overkill past a depleted bar is wasted**
  (§9) — the one place a point of damage still buys nothing, recorded as deferred rather than
  designed.
- **No cross-character difficulty read.** §4's Wehrle asymmetry treatment (Cole Wehrle's rule of
  balancing a strong position with a readable liability) is given per character, but nothing compares
  the five characters' pressure against each other — whether the Woodcutter's permanent card-down is
  harsher than the Swan's narrowed free play, for instance. Still a tuning question in the same family
  as §9's undecided rows, not a structural gap, and still routed there rather than answered here.
- **No named target emotion.** Rosewater's #6 (know what emotion the game evokes, one of Mark
  Rosewater's ten things every game needs) is answerable from the fiction — the Hunt, the Quarry — but
  the document never states it outright, unlike §7's explicit naming of the depth-budget lesson.
  §7's "run has no defeated opponent" passage now answers the structural half of a run's ending; the
  emotional half this finding names is still open. Cheap to add, not load-bearing.
- **The middling-hand question.** Most hands cannot steer reliably to either band — what makes a hand
  good at Win (high cards, trump length) is not the opposite of what makes it good at Lose (low
  cards, short suits), so a hand of middling ranks is bad at both, and that is most hands. For those
  hands the declaration is a commitment made with no read at all, a different experience from Problem
  1's worked example above, where the read existed and paid off. Whether that reads as tension (a
  coin flip made interesting by the stakes) or as a coin flip plainly (a decision with no information
  behind it) is a feel question, and it is the developer's.
- **The three unassigned characters.** The Monarch punishes Lose and the Swan punishes Win (§6), at
  zero new rules, the cheapest possible counterweight to Problem 1. Nothing in the document says
  which declaration the Woodcutter, the Fox, or the Witch punish. If the honest answer is "neither,"
  that is a design hole in the roster rather than a detail, and it sits three-fifths unaddressed
  against a problem now ranked first.

### What to measure

- **For Problem 1 (the free option):** §11's slice already produces this measurement as a side
  effect of its own kill criterion — record whether a playtester who has never read this document
  visibly plays toward or away from the 6/7 line after declaring, and whether they report the
  declaration as a read or a coin flip across a small sample.
- **For the middling-hand question:** the same slice sessions can record how often a dealt hand
  actually favours one declaration over the other, versus how often it is genuinely ambiguous — the
  measurement §11 already collects also answers this one.
- **For the Problem 1 / Problem 2 coupling:** once a Quarry-pressure tuning exists that makes the
  declaration a harder read, measure it against how often a build is pushed across its declared line
  and how long the resulting losing tail runs. A tuning that improves one number while worsening the
  other by more is not a fix, it is a transfer — the same test this design already applied to its
  earlier pair of problems.

### The one-line summary

The old summary said the design's real exposure was whether removing a scoring opponent would
quietly turn Standing into a fixed answer and losing into an unannounced formality. Both questions
are closed — by the two tables and by health. The exposure that replaces them is the declaration: a
free option taken with the hand already visible, against an opponent that cannot answer in kind —
and whether that reads as the tension the design intends or as a coin flip is the one question
§11's slice exists to answer.
