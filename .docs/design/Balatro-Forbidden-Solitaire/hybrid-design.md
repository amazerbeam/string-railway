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
  *presents* itself, mapped onto this design's screens: which of its readouts The Hunt already ships,
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

## 1. The equation

```
Score = Spoils × Standing
```

evaluated once at the end of each 13-trick round (**the Hunt** — §10 carries the full vocabulary).

**Spoils** is the summed value of the cards you captured in tricks. It is additive: every card you
take adds to it, and nothing about the term itself punishes taking more.

**Standing** is a multiplier read off the band your final trick count lands in. The **band
boundaries** are taken unchanged from the base game's own printed end-of-round table
(`fox-in-the-forest.md` → End-of-round scoring): Humble 0–3, Defeated 4/5/6, Victorious 7–9, Greedy
10–13. The **values** are first-pass — ×6 / ×1,×2,×3 / ×6 / ×0 as printed — and are **§9's to
decide, not settled by transcription**: §6 shows the printed Humble ×6 leaves that band dominated,
so at least one of the six is wrong for this game. Every number below that reads a multiplier is
stated at the printed values and moves if §9 moves them.

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
is the load-bearing property of `Score = Chips × Mult`: Spoils adds, Standing multiplies. No
device that only raises Spoils can ever cross a Standing threshold it doesn't independently
reach.

**The asymmetry, stated rather than implied.** Balatro's two terms are independent axes — a Joker
can raise one without touching the other. These two are not, and the difference matters enough to
name here rather than leave to be discovered downstream:

- **Standing cannot be built.** No device in the table below raises it directly; every device
  listed as intervening on Standing does so by changing which tricks you win. It is capped at ×6,
  permanently, and is better read as a **gate you must not fail** than as a multiplier you grow.
- **At plain card value the two terms are the same variable.** Winning `k` tricks captures exactly
  `2k` cards, so Spoils is fully determined by trick count and `Score = 2k × f(k)` is a
  single-variable function. The terms only come apart into genuine independent axes once card
  values differ from one another — which is Forage's work, and the reason §9's undecided
  card-value row is the highest-leverage number in this document.

§3 derives the ceiling that follows from this, and what it forces the outer loop to be.

**Component table.** Every device this document proposes anywhere below is required to be an
intervention on one of these two terms — neither term is optional cover, both are load-bearing.

| Device                                   | Intervenes on                        | How                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capturing a trick                        | Spoils                               | Adds the two cards' values to your captured pile.                                                                                                                                            |
| A Treasure (7)                           | Spoils                               | `fox-in-the-forest.md` — the trick's winner gains 1 point per Treasure in it; a direct addition to Spoils.                                                                                   |
| A Poison (8)                             | Spoils                               | `fox-in-the-forest.md` — the trick's winner loses 1 point per Poison in it; a negative addition to Spoils.                                                                                   |
| A Forage edit that raises a card's value | Spoils                               | Changes what that card is worth the next time it is captured — an edit to the additive term's unit price, not a new term.                                                                    |
| A Forage edit that moves an ability      | Standing, usually                    | Most odd-rank abilities constrain who wins a trick or who leads next, which shifts your final trick count and therefore your Standing band.                                                  |
| A Quarry rule-break                      | Standing, usually — sometimes Spoils | A round-long rule that changes which tricks you can win shifts your trick count; one that curses a card's value shifts Spoils instead. Either way it is an intervention on an existing term. |
| The Demand                               | Neither — it is the comparator       | The Demand is not a term of the equation; it is the number `Score` is checked against at the end of the Hunt. Its role belongs to §3 and §5, not this table.                                 |

Any device that would add a third scoring channel — a resource, a bonus, or a track running
alongside Spoils and Standing — is a design defect, not a table entry: it competes with the
equation this section just established as the whole of the game's scoring vocabulary. §8 drops
the base game's Goal cards for exactly that reason.

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
Gameplay). Each trick contains exactly 2 cards, and the trick's winner takes both. So winning `k`
tricks captures exactly `2k` cards, and at plain card value **Spoils = 2k**.

The two terms are therefore not independent maxima to be multiplied together — **both are
functions of the same variable.** Standing is read off the band `k` lands in, so the round's score
at plain card value is the single-variable function `2k × f(k)`, and the ceiling is its maximum
over the fourteen possible values of `k`:

| k         | 0   | 1   | 2   | 3      | 4   | 5   | 6   | 7   | 8   | 9       | 10–13 |
| --------- | --- | --- | --- | ------ | --- | --- | --- | --- | --- | ------- | ----- |
| Spoils    | 0   | 2   | 4   | 6      | 8   | 10  | 12  | 14  | 16  | 18      | 20–26 |
| Standing  | ×6  | ×6  | ×6  | ×6     | ×1  | ×2  | ×3  | ×6  | ×6  | ×6      | ×0    |
| **Score** | 0   | 12  | 24  | **36** | 8   | 20  | 36  | 84  | 96  | **108** | 0     |

```
max(2k × f(k)) = 18 × 6 = 108, at k = 9
```

**The naive product `26 × 6 = 156` is not reachable.** Capturing all 26 cards means winning all 13
tricks, and 13 tricks is Greedy → ×0. The maximum of Spoils and the maximum of Standing are
mutually exclusive by the very table that defines them; the highest `k` still paying ×6 is 9, which
captures 18 cards. That is a hard structural ceiling, not a tuning value — it falls directly out of
the round length fixed in §1 and the printed multiplier table reused unchanged, and it does not
move unless one of those two things moves.

Two further facts fall out of the same table and are used later in this document:

- **The curve is bimodal.** Two local maxima — Humble at `k=3` (36) and Victorious at `k=9` (108) —
  separated by a valley bottoming at `k=4` (8), which scores less than taking two tricks. §6's
  Humble-lane argument rests on this shape, not merely on the two bands sharing a ×6.
- **Standing is a gate, not a term you can build.** Nothing in §1's component table raises Standing
  directly; every device listed as intervening on it does so by changing which tricks you win.
  Standing is capped at whatever the table's largest value is, permanently. All unbounded growth
  must therefore come through Spoils — which is what makes Forage's edits to card _value_ the
  load-bearing ones.

**What the 108 is contingent on.** Three things, and §9 has reopened one of them since this was
written. It moves if the round length changes (13 tricks), if the card-value rule changes (below),
or **if any Standing multiplier is raised such that a lower-`k` band out-earns `k=9`**. That last
one is live: §6 computes ×18 as the Humble break-even, and ×18 is the exact value at which `k=3`
also reaches 108 — the ceiling survives at the break-even and only at or below it. Any Humble value
above ×18 raises the ceiling and every downstream number keyed to it, including §5's crossing point.

The consequence follows without needing a rule: a Demand (the encounter's score target, named in
full in §5) that rises past 108 **cannot** be met by winning more tricks. There is no `k` that pays
better, and the multiplier is already at its ceiling. It can only be met by making the captured
cards _worth_ more — which only editing the deck accomplishes. The outer loop's job is therefore
structurally forced to be "change what is in the deck and what its cards do," never "add a bonus to
the score."

**The one dependency, stated.** All of the above assumes a plain card is worth 1. That rule is not
settled — §9 leaves it open against the alternative of printed rank. Under rank-weighted values
Spoils stops being a function of `k` alone, the two terms genuinely come apart into independent
axes, and the ceiling rises to roughly `153 × 6 = 918` in a best-case deal (typical nearer 650 at an
average card rank of 6) while becoming deal-dependent rather than fixed. **The ceiling argument in
this section is stated for the flat-value rule and must be recomputed if that fork is decided the
other way** — the card-value row in §9 and the Demand curve are one decision, not two.

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

| Where a Foraged card lands | Chance | |
| -------------------------- | ------ | --- |
| Your hand                  | 13/33 = **39.4%** | The intended case |
| The Quarry's hand          | 13/33 = **39.4%** | See below — depends entirely on the edit type |
| The undealt seven          | 7/33 = **21.2%**  | The edit did nothing this round |

**Roughly one edit in five is a no-op**, on the outer loop's only verb, against a Demand that keeps
rising. Neither of these failure modes exists in the game the mechanic was borrowed from, so the
precedent does not cover them.

**The two edit types behave completely differently, and the document's "four verbs" framing hides
it.**

- **A value edit in the Quarry's hand is not a loss** — arguably it is the best case. A card worth 8
  sitting in the opponent's hand is a concrete objective: force it out, take the trick it lands in.
  That is a specific thing to play for each round rather than an abstract trick target, and it is
  what the round is named after. It is also not a _new_ uncertainty — Fox in the Forest already
  deals its three Monarchs at random and players cope. Forage raises the stakes on existing texture
  rather than introducing a new problem.
- **An ability edit in the Quarry's hand is pure downside.** You spent an edit arming your opponent.
  There is no version of that which plays well.

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
- **Treasure onto a card you reliably win with.** The Treasure's +1 goes to the trick's winner; on a
  7 that is a coin flip. On your Bells 11 you collect it every time — an ability edit doing a Spoils
  job.
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
volume, halves the per-round impact of the dead-edit rate, and makes the Humble lane reachable — but
it does not touch what this proposal is actually for. A Forage edit made between rounds is chosen
with **no information**: the player does not know the next Quarry, the deal, or the decree. Four
blind edits is a bigger bet than two, not a better decision — Meier's "the consequence is invisible"
(`design-principles.md` §2) rather than his "dominant option." The in-round layer is the only thing
proposed anywhere in this document that makes an edit a decision taken with the board visible. The
two fix different problems and neither substitutes for the other.

**The shape.** Two separate editing systems, deliberately kept as different objects:

| Layer                  | When            | Targets                    | Persists      | Answers                  |
| ---------------------- | --------------- | -------------------------- | ------------- | ------------------------ |
| **Forage**             | Between Hunts   | Any of the 33 deck cards   | For the run   | _What my deck is_        |
| **Snare** *(placeholder name)* | Mid-Hunt | Cards currently in your hand | Spent on use | _What I do right now_    |

The name **Snare** is a placeholder and the developer's to red-line, per §10 — a snare is set during
a hunt rather than gathered between them, which is the distinction the two layers encode. What must
not happen is both layers being called Forage; the whole value of the split is that they are
different objects.

**This is Forbidden Solitaire's structure, not an invention.** `forbidden-solitaire.md` §6 documents
the same split and states why it is load-bearing: **Gems** are passive, purchased between battles,
permanent, and set the _rate_ at which a run scales; **Jokers** are active, cast during the solve,
situational, and change _this board_. That file's own summary — *"Forbidden Solitaire pays two
slots' worth of UI to keep 'what my run is' and 'what I do right now' as different objects"* — is
exactly the argument for adopting it here.

**What the in-round layer fixes, and these are the reasons to want it.**

- **It deletes the variance problem above.** A card in your hand cannot be undealt and cannot be in
  the Quarry's hand. Every in-round edit lands, on a card you can see.
- **It converts a blind bet into a situational decision.** Between-round Forage is "pump a card and
  hope." Mid-round it is "trump is Keys, they have spent their high Keys, make this Keys 6 worth 8
  and take the trick" — Meier's situational value (`design-principles.md` §2), which the outer-loop
  version cannot have because nothing is visible when the choice is made.
- **It makes the Humble lane executable.** §6 establishes that Humble needs a few very fat cards.
  Mid-round, a player can see which three tricks they are actually going to win and pump exactly
  those cards. This is the first form of the Humble lane a player could deliberately execute rather
  than hope into.
- **Information rises while options fall.** Later in a round you know more — what has been played,
  where trump has moved — but hold fewer cards to apply it to. That tension is free; nobody designs
  it.

**What it costs, and why the between-round layer must survive.** An in-round-only version would
delete the outer loop: §3's Cook's-loop argument requires that something between Hunts changes the
conditions the next Hunt runs under, and if all editing happens inside the round, nothing persists
and the run becomes a sequence of independent puzzles rather than a build. Keeping Forage as the
permanent layer is what preserves that; the in-round layer is an addition, never a replacement.

**It passes §1's component test.** A mid-round value edit is an intervention on Spoils; a mid-round
ability or suit edit is an intervention on Standing by the same route as its Forage equivalent.
Neither opens a third scoring channel, so the rule §1 sets is not breached.

**It moves the 108 ceiling, and §5 depends on that number.** This is the consequence most likely to
be missed. If a player can add value to cards mid-round, the plain-value ceiling is no longer
`18 × 6`. At an illustrative four in-round edits of +3 each, all landing on captured cards:

```
(18 + 12) × 6 = 180
```

**§3's ceiling and §5's Demand-crossing point must both be recomputed against whatever in-round
budget is chosen.** The ceiling stops being a property of the round's shape alone and becomes a
function of that budget — which weakens, though does not destroy, the argument that the ceiling is
"derived, not tuned."

#### The blocking problem: pump-what-I-am-about-to-win is a dominant strategy

Stated as blocking rather than as a caveat, because the proposal is not viable until it is answered.
"Raise the value of the card I am about to play and win with" is correct almost every time. At four
in-round edits of +3, that is a reliable **+12 Spoils, +72 score**, with no decision attached — which
is Meier's dominant-option failure landing on the new mechanic before it ships.

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

**Both dials, kept independent.** The Demand rises with each encounter, and the Quarry's
rule-break changes with each encounter — two knobs, not one, and they must stay separate.
`balatro.md` §2.7 gives the precedent directly: The Wall (a Boss Blind asking 4× the normal target
with no rule broken) and The Needle (asking only 1× the target, but restricting the round to a
single hand played) are Balatro's own proof that "how hard is this round" and "what rule is
broken" are independent knobs, and most designs wrongly fold them into one.

**The structural argument, with the count.** `balatro.md` §2.3 enumerates all 23 Boss Blinds and
finds that only 3 of the 23 touch the score directly; 20 of the 23 attack an input to the engine
instead — the cards usable, the information held, the resources spent, or the hand types
nameable. That count is the reason a Balatro boss reads as a test of your specific build rather
than a difficulty spike: the question it asks is whether your particular machine still works with
one part removed, and that question is different every run. This design follows the 20, not the
3 — every Quarry rule-break named in §4 and below attacks something the player builds with, never
the Demand or the `Spoils × Standing` equation directly.

**Mapping onto Fox in the Forest's inputs.** The base game hands the Quarry five things to attack:
the follow-suit obligation, the decree and trump, hand size, the abilities printed on the odd
ranks, and which cards are in the deck at all. Four worked examples, covering four of those five:

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

**The Demand's shape, not its value.** The Demand rises with each encounter and must eventually
cross the plain-value ceiling derived in §3 — **108 as the design currently stands, and higher if
§3's proposed in-round edit layer is adopted, since that layer raises the ceiling as a function of
its budget** — that crossing is the moment §3's lesson
actually lands on a player, the same way Balatro's requirement curve eventually outruns a
flat-Joker build (`balatro.md` §2.1). The curve's base value and its rate of rise are not chosen
here; §9 states the shape and the range and routes the numbers to the developer.

---

## 6. Catch-up

This is the design's weakest claim, and it is written as such rather than oversold.

**The position: a cheap restart, plus the Humble lane as a bounded second route.** Two branches
were discarded, one line each. A gentler requirement curve was rejected because it removes the
growth-class lesson §3 derives — softening the curve so more builds survive it is the same move as
removing the 108-point ceiling, and that ceiling is the design's main source of depth. Sub-run
checkpointing was rejected because it is the linear-narrative answer, and §7 does not choose a
linear-narrative structure — there is nothing below a short, restartable run worth checkpointing
into.

### The Humble lane is dominated at the printed multipliers, and Forage does not rescue it

An earlier draft of this section argued the opposite — that Humble becomes competitive "once the
deck has been Foraged so a small number of captured cards are each worth far more than face value."
That argument does not survive being written out, and the correction is load-bearing enough to
replace it rather than footnote it.

**The setup.** The base game's table pays the 0–3 band ×6, the same multiplier as 7–9
(`fox-in-the-forest.md` → End-of-round scoring). At flat card value a Victorious round taking 8
tricks captures 16 cards for `16 × 6 = 96`; a Humble round taking 3 captures 6 for `6 × 6 = 36`.
Same multiplier, and Humble loses by a factor of nearly three — the whole gap is in Spoils, because
Spoils is made of captured cards and Humble captures fewer.

**Why Forage does not close it — the superset argument.** The intuition was that concentrating
Forage into a few enormous cards favours the lane that only needs a few cards. It doesn't, because
**the Victorious player captures those same cards and then twelve more.** Worked, with three cards
Foraged to value 20 and everything else left at 1:

```
Humble      (6 cards):   20 + 20 + 20 + 1 + 1 + 1          =  63    ×6 =  378
Victorious (18 cards):   20 + 20 + 20 + fifteen 1s         =  75    ×6 =  450
```

Winning more tricks does not make you miss the pumped cards. So as long as every additional card
carries **positive** value, the Victorious pile is a superset of anything Humble can assemble and
Victorious wins by construction — not narrowly, and not for a tuning reason that could be tuned
away. Humble is not a weaker lane; it is a **dominated** one, which is Meier's definition of an
uninteresting decision (`design-principles.md` §2) landing on one of the two terms of §1's equation.

**The two exits, both of which reuse existing pieces.** Neither is chosen here.

**(a) Raise the Humble multiplier.** The dominance is a fixed ratio — 6 cards against 18 — so a
constant fixes it, and the break-even is computable rather than a feel judgement:

```
6 × M = 18 × 6   →   M = 18
```

Below ×18 Victorious still dominates; above it Humble does. ×18 also leaves the 108 ceiling
untouched (both peaks land on 108), so §3's argument survives unchanged. The better property is what
happens after Forage: writing `A` for the value of the best 6 cards and `B` for the next 12,

```
Humble = 18A     Victorious = 6(A + B)     Humble wins when   B < 2A
```

— so **concentrating** Forage favours Humble and **spreading** it favours Victorious. That is a
genuine build fork driven by the player's own edits, which is what this section originally claimed
to have and did not. Costs: the multiplier table stops being transcribed and becomes designed (§9),
and the low end gets generous — at ×18 two tricks scores 72 against seven tricks' 84, so whether
1–2 tricks reads as a build or as a no-op needs watching.

**(b) Let Forage set a card's value below zero.** The superset argument depends on every extra card
being a gain. It collapses the moment the deck holds cards you would rather leave behind. The base
game already ships them — the Poison 8s, −1 to whoever takes the trick (`fox-in-the-forest.md` →
Poison cards) — but three cards in thirty-three is a rounding error. Negative values are not a new
device: they are §3's existing "edit a card's value" verb with the sign flipped, so **rules added:
zero**. This fixes the problem one level lower than (a) does, at the trick rather than the round: it
creates a reason to decline a trick you could win, a decision the player currently never faces.

The two compose; they are not alternatives. (a) makes a small pile worth more, (b) makes some cards
worth dodging. Which, whether, and at what value is the developer's — §9 carries the row and the
measurement.

**The honest consequence.** This is a second _strategy_, not a comeback _mechanic_: it gives a
build already leaning toward high-value, low-count captures a second way to hit the Demand, and it
does nothing at all for a player whose deck is simply too weak for either lane. The design
therefore inherits `balatro.md` §2.4's problem verbatim — a run can be arithmetically dead several
encounters before the player can tell, because a losing Hunt still plays out all 13 tricks and
still produces a Standing band, so the round _feels_ alive right up to the score check. David
Sirlin's slippery slope names the shape: positive feedback, where being ahead makes you more
ahead, decides the game early and turns the rest into a formality (`design-principles.md` §3). The
design's only mitigation is the short run chosen in §7 — losing is meant to be cheap here for the
same reason it is in Balatro, not because catch-up itself was solved.

**The open option — the developer's, not this document's.** Whether to add a still-winnable
signal — some visible check telling the player their current build can no longer reach the
Demand — has a real cost on both sides. Showing it removes the reveal-drama `balatro.md` §2.5
argues Balatro is right to withhold; hiding it taxes exactly the players most invested in the
design, who will compute "am I still alive" by hand whether the game offers it or not. This
document states the cost on both sides and does not choose.

---

## 7. Run length and depth budget

**The choice: roguelike-repeatable and short.** The discarded branch, in one line: a
linear-narrative arc was rejected because `balatro.md` §2.4 shows Balatro's slippery slope is only
tolerable when a run is short and restarting is free — a narrative spine would inherit that same
slope while discarding the only thing that makes it bearable.

**The dependency, made explicit.** §6's catch-up position — cheap restart, Humble as a bounded
second lane, no comeback mechanic — only works because of this choice. A short, repeatable run
makes an unwinnable Hunt a minor cost; a linear-narrative run makes the identical unwinnable Hunt
the collapse of a multi-hour investment. If this section's choice is ever reopened, §6 has to be
rewritten, not merely revisited.

**The depth-budget argument.** Raph Koster's framing treats games as pattern-learning machines:
fun is the sensation of grokking a pattern, and a game is over once that pattern is mastered
(`design-principles.md` §1). What a player is learning on encounter five that they were not
learning on encounter one is not a new card or a new Quarry character — the roster in §4 is five
characters and does not grow — it is the growth-class lesson from §3: which builds keep pace with
a rising Demand and which are additive-only and therefore doomed at a predictable point. That is
the same shape as Balatro's requirement curve teaching `Chips × Mult` (`balatro.md` §2.1),
reapplied here to `Spoils × Standing`.

**One progression system against four — the sharpest version of the risk this section accepts.**
The comparison usually drawn is roster size, five Quarry characters against Balatro's ~150 Jokers.
The more damaging comparison is structural. Balatro runs **four** progression systems concurrently
(`balatro.md` §1.8–§1.10, §1.7):

| System                | What it does                                                      |
| --------------------- | ----------------------------------------------------------------- |
| **Jokers** (5 slots)  | Persistent multipliers sitting outside the deck — the actual engine |
| **Tarots** (22)       | Deck edits — **the only one this design has**                     |
| **Planets** (12)      | Permanently level a hand type                                     |
| **Vouchers**          | Run-long upgrades to the shop and economy                         |

Deck editing is Balatro's _supporting_ system; the Jokers are what make a build. Here, Forage is the
whole of it — and by §3's own measurement it fires less reliably than Balatro's Tarots do, being a
no-op roughly one edit in five.

This is not an argument for adding a Joker layer: §1's component table forbids any device that is
not an intervention on Spoils or Standing, and a persistent flat multiplier would be a third
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

**Run shape only.** A run is a fixed sequence of Quarry encounters ending in a final one. The
encounter count and the target session length are not chosen here; §9 routes both to the
developer.

### What a run keeps, and what happens when one fails

Two questions this section left implicit, both surfaced in play-through on 2026-08-09 and both
**decided by the developer**, provisionally, pending a playtest.

**Forage persists within a run, and nothing persists across one.** A card pumped at encounter 1 is
still pumped at encounter 5 — that is what makes a run feel like building something. But a new run
starts on a bare 33-card deck with every card back to base value. This is Balatro's model
(`balatro.md` §2.4): every run is a clean test, and what improves between runs is the player, not
the deck.

**Missing the Demand ends the run.** This follows from §6 rather than being a separate choice. §6's
whole answer to having no catch-up mechanic is that losing is cheap and restarting is free — which
is only true if failure actually ends the run. Retries would make the Demand curve decorative: an
under-built deck would never fail, it would merely take more attempts, and §3's growth-class lesson
would stop being taught. Note the two parents disagree here and the disagreement is instructive —
Forbidden Solitaire grants effectively unlimited retries because it is a 2–3 hour linear story that
cannot afford to delete progress, and this design chose the other structure in this section.

**Open, and explicitly held open: banked progress across runs.** The developer is open to a
Hades/Rogue Legacy-style layer in which failed runs still bank something. The consequence to weigh
is that carrying **power** across runs dissolves the lesson §3 exists to teach — enough runs and the
starting deck is strong enough that build quality stops mattering. Balatro's own cautious middle is
worth noting as a third option: beating content unlocks new Jokers and decks **into the pool**, so
the player gains *options* rather than a head start, and the deck still resets. Unlocking a new
Quarry character or a new kind of Forage edit would be this design's equivalent and costs nothing
arithmetically.

**Settled by playtest, not on paper.** Whether run failure is too harsh, and whether banked progress
is wanted, are both feel questions. The measurement: run a full session under the clean-test rule
and record whether players restart voluntarily or stop playing. A player who restarts immediately
does not need banked progress; a player who quits after one failed run does.

### Two gaps in how a run ends and how runs differ

Both surfaced in play-through on 2026-08-09, from a developer describing the run back in their own
words. Neither is a tuning value; both are structural and unanswered.

**A run has no defeated opponent.** The developer's phrasing was "then we beat the CPU" — and the
design does not permit that. The Quarry has no score, no health, and no failure state. Clearing the
final Demand wins the run, but nothing is beaten; the Quarry simply stops. This is the same fact
§8 establishes about the Standing bands, arriving at the emotional layer rather than the arithmetic
one: removing the opponent's stake in the outcome removes the player's stake in defeating it.

It matters most at the exact moment a design can least afford flatness — the end of a run.
Balatro's Ante 8 Boss is also just a number, but Balatro spends its whole climax on the _reveal_
(`balatro.md` §2.5 — the Rube Goldberg machine going off), an aesthetic this design has not claimed
and would have to build deliberately. §12's existing smaller finding that the document never names
its target emotion (Rosewater #6) is the general form of this; the run's ending is where it bites
hardest. **Nothing is proposed here.** It is recorded so that whatever names the target emotion has
to answer it.

**Every run shows the same five characters.** §4 fixes the roster at five and §7 fixes a run at a
sequence of encounters. If the run length is five — the no-repeat length — then every run faces the
same five Quarries, and if the order is also fixed, every run is the same sequence. Balatro draws
each Ante's Boss from a pool, so two runs differ in which constraints they meet and when; that
variation is a real part of what makes its runs distinct, and this design as written has none of it.

This is the between-runs counterpart to §12's Problem 3, which covers repeats _within_ a run, and
the two are answered by the same decision: how the encounter sequence is built. It also directly
undercuts this section's own claim that repeatability exists "to let a player who exhausts one run's
pattern try again with a different Forage line" — a different Forage line against an identical
sequence of five is a narrower kind of variation than that sentence implies. Cheapest fixes, neither
chosen: randomise the order, or hold a roster larger than the run length so each run draws a subset.
The second costs new characters; the first costs nothing.

---

## 8. The ruleset: kept, modified, dropped

Every rule of the base game gets one line below and a reason, not just a verdict — a bare
kept/dropped list says nothing about whether the design still works once the reason is missing.

| Rule                                          | Kept / Modified / Dropped                                        | Reason                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decree and trump                              | Kept                                                             | Promoted to the run's shared object (§2) — Forage edits the same deck-and-decree the Hunt is dealt from and played with; nothing new was invented for it.                                                                                                                                                                                                  |
| Follow-suit obligation                        | Kept, unchanged                                                  | `fox-in-the-forest.md` → Following. It is the entire tension of a trick-taker: without it, card choice is free and the layer collapses into "play your best card." It is also the input the Quarry attacks in §5's Swan (1) worked example.                                                                                                                |
| Odd-rank abilities (1, 3, 5, 7, 9, 11)        | Kept as substrate, made editable by Forage                       | `fox-in-the-forest.md` → Abilities. Abilities already sit on cards, so "move or add an ability" is a deck edit that needs no new vocabulary — the cheapest possible Forage extension per §3's Cook's-loop argument.                                                                                                                                        |
| Trick-count scoring curve                     | Modified                                                         | From a points lookup (`fox-in-the-forest.md` → End-of-round scoring) to the Standing multiplier (§1). Bands preserved verbatim; only the curve's _role_ changes, from an end-of-round score to a term of the equation. Whether its shape still does the same job is the sub-section below.                                                                 |
| 13-card hands / 13 tricks / 33-card base deck | Kept, as the round's fixed shape                                 | Everything quantitative in this document — the 26-card cap, the 108 ceiling and the `2k × f(k)` score curve (§3), the 14-split enumeration below — is derived from this shape staying fixed. The deck's _contents_ grow as Forage edits them; the round's _length_ does not.                                                                                                                |
| The 21-point match                            | Dropped, replaced by the run                                     | `fox-in-the-forest.md` → End of game. Match-to-21 is the ending condition of a symmetric two-player contest, which no longer exists once the opponent does not score. §7's fixed encounter sequence replaces it.                                                                                                                                           |
| Goal cards (16)                               | Dropped                                                          | `fox-in-the-forest.md` → Goal cards. A second scoring channel running alongside `Score = Spoils × Standing`, which §1's component table rules out by construction — any device that isn't an intervention on Spoils or Standing is a design defect, not a table entry.                                                                                     |
| Poison 8s (3)                                 | Kept                                                             | `fox-in-the-forest.md` → Poison cards. A negative-value card is an intervention on Spoils per §1's table, and it doubles as the Quarry's "curse a card" device — the direct analogue of Forbidden Solitaire's board-attacking enemies (`forbidden-solitaire.md` §5).                                                                                       |
| Special cards (9)                             | The _unsuited_ concept kept; the nine specific cards not carried | `fox-in-the-forest.md` → Special cards. _Unsuited_ — a card that counts as the trick's other suit regardless of its own — is the cheapest existing grammar for a Forage edit that changes a card's suit (§3). Bow, Hammer, Potion, Shovel, Axe, Tree, Fairy, Crown and Mirror are not adopted as printed; they sit outside Forage's four-thing vocabulary. |

### The trick curve without a scoring opponent

With 13 tricks split between two players, there are exactly 14 possible outcomes — the player's
trick count `k` runs 0 through 13, and the opponent always holds the remaining `13 − k`. The table
below walks every one of them against the printed Standing bands from §1, before any reasoning
about what the split means:

| k (player's tricks) | Player's band → Standing | 13 − k (Quarry's tricks) | Quarry's band → Standing |
| ------------------- | ------------------------ | ------------------------ | ------------------------ |
| 0                   | Humble → ×6              | 13                       | Greedy → ×0              |
| 1                   | Humble → ×6              | 12                       | Greedy → ×0              |
| 2                   | Humble → ×6              | 11                       | Greedy → ×0              |
| 3                   | Humble → ×6              | 10                       | Greedy → ×0              |
| 4                   | Defeated → ×1            | 9                        | Victorious → ×6          |
| 5                   | Defeated → ×2            | 8                        | Victorious → ×6          |
| 6                   | Defeated → ×3            | 7                        | Victorious → ×6          |
| 7                   | Victorious → ×6          | 6                        | Defeated → ×3            |
| 8                   | Victorious → ×6          | 5                        | Defeated → ×2            |
| 9                   | Victorious → ×6          | 4                        | Defeated → ×1            |
| 10                  | Greedy → ×0              | 3                        | Humble → ×6              |
| 11                  | Greedy → ×0              | 2                        | Humble → ×6              |
| 12                  | Greedy → ×0              | 1                        | Humble → ×6              |
| 13                  | Greedy → ×0              | 0                        | Humble → ×6              |

Read down either Standing column and the same fact repeats at every one of the fourteen rows:
**exactly one side scores ×6 and the other side's Standing never rises above ×3.** (Stated at the
printed values, per §1. If §9 raises the Humble band the phrasing changes — one side lands in a high
band and the other in a low one — but the mirroring itself is a property of the band _boundaries_,
which nothing here proposes moving, so the argument below is unaffected.) That is not a
property of any single split — it is a property of the table itself, because the Humble/Victorious
bands and the Greedy/Defeated bands mirror each other across the 13-trick line. In the base game
that mirroring _is_ the mid-round tension: every trick either side takes pulls the other side's band
toward the mirrored loss, so a trick-taker is always deciding how hard to press a threshold someone
else is contesting from the opposite side. This is a property of the **symmetric** two-player
contest, not of the Standing table read alone.

**What dies.** A CPU that does not score has no band to be pushed into. The "exactly one side scores
6" structure walked above is a fact about two Standings being computed and compared — remove the
second scorer and the fact does not weaken, it stops being a fact about anything, because there is
no second Standing left to compute. Nothing in the printed table changes; what changes is that half
of it is now read by nobody.

**What replaces it.** The curve still functions, but only as a **self-limit on the player alone**:
Standing punishes your own overreach — Greedy still pays ×0, Defeated still pays ×1/×2/×3 — whether
or not anyone is competing for the band you didn't reach. This is plainly a weaker version of the
original property: the base game's tension was "I am fighting someone for this threshold," and what
survives is "I am fighting arithmetic for this threshold." The design accepts that trade because
§3's 108 ceiling supplies the pressure the opponent's mirrored band used to supply — the Demand
plays the role the opponent's loss used to play, forcing the player to care which band they land in
even with nobody contesting the other side of it.

**The residual risk.** With no opponent competing for the Victorious band, a player has no built-in
reason not to aim for 7–9 every round. Sid Meier's test for an uninteresting decision applies
directly: a decision is uninteresting if players almost always pick the same option
(`design-principles.md` §2). If ×6 Standing is reliably reachable and nobody is contesting it,
"which band do I aim for" stops being a decision and becomes a fixed answer, which would leave the
Standing term of §1's equation load-bearing in name only. What is meant to stop this is the Quarry:
its round-long rule-break (§4, §5) is chosen specifically to push the player's _achievable_ trick
count away from whichever band they are aiming for — the Woodcutter costs a card before the round
starts, the Swan narrows the free-play case, the Monarch constrains what may be played to follow —
all of which move where `k` actually lands rather than where the player wants it to land. Whether
that pressure is strong enough to keep 7–9 from being a dominant strategy is not decided here. It is
flagged as this design's most likely balance failure, and §9 states the measurement that would
settle it.

**Upgraded from a risk to a proof.** §6 now demonstrates that at the printed multipliers this is not
merely _likely_ — Victorious dominates Humble by construction, because a 9-trick pile is a superset
of a 3-trick pile and every card carries positive value. That has one consequence for this section:
Quarry pressure cannot be the whole answer. Displacing the player's achievable `k` makes Humble
_reachable_; it does not make Humble _worth reaching_, so it converts Humble from a dominated choice
into an assigned outcome rather than into a decision. Making it a decision requires one of §6's two
exits — a higher Humble multiplier, or negative card values — and Quarry pressure then does the job
this section describes on top of that, rather than instead of it.

---

## 9. First-pass values

**No number in this section is a chosen value.** Every row below is the developer's to accept,
reject, or replace outright. What follows states which numbers are illustrative, which two are
already settled arithmetic rather than tuning, and — for every number that is genuinely undecided —
the cheapest measurement that would settle it.

| Value                           | First-pass                                                                     | Status                                                                                                          | What would settle it                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standing multipliers            | ×6 / ×1 / ×2 / ×3 / ×6 / ×0 (Humble / Defeated ×1,×2,×3 / Victorious / Greedy) | **Undecided** — transcribed, but §6 proves the transcription does not hold up here            | Two rows of this table are now live decisions rather than copies. **The Humble ×6 is wrong as transcribed**: §6 shows Victorious dominates Humble by construction at these values, and computes the break-even at **×18** (`6 × M = 18 × 6`), which also leaves the 108 ceiling intact since both peaks then land on 108. Settle it by playing Hunts at a candidate value and counting how often `k` lands in 1–2 rather than 3 — at ×18 two tricks scores 72 against seven tricks' 84, so the risk is the low end becoming a no-op. **The ×0 Greedy band is the second**: it zeroes a whole round's Spoils, harsher than the base game, where a 0-point round still leaves your running total toward 21 intact. Settle it by playing several Greedy-band Hunts and checking whether the zeroed round reads as a proportionate cost or a null round. Note that the transcription argument is weaker than it looks for every row: the printed table was tuned for a **symmetric** contest in which both players read it, and §8 establishes that half of it is now read by nobody. |
| In-round edit budget            | How many mid-round edits, how spaced, and what they cost                       | **Undecided** — §3 proposal, blocked                                                                            | Only live if the two-layer split in §3 is adopted. The blocking question is not the budget but the **cost**: without one, "pump the card I am about to win with" is a dominant strategy. §3 names three candidate costs and recommends trying the shared-pool version first, since it introduces no currency. Once a cost exists, settle the budget by recomputing the ceiling — four edits at +3 moves it from 108 to 180 — and checking the Demand curve still crosses it inside the run length. |
| Negative card values            | Whether Forage may set a card's value below zero                               | **Undecided** — §6 exit (b)                                                                                     | The alternative to re-tuning the Humble multiplier, and it composes with rather than replaces it. Rules added: zero — it is §3's existing value edit with the sign flipped. Settle it by counting how often a player declines a trick they could win; if the answer is never, the deck does not yet hold enough cards worth dodging and the Poison 8s alone (3 of 33) are too thin to carry it.                                                                                                                                                                                                                                                                                             |
| Plain-card score ceiling — 108  | `max(2k × f(k)) = 18 × 6`, at `k = 9`                                          | Derived arithmetic, not tuning (§3)                                                                             | Already settled as arithmetic; it moves only if the round length (13 tricks), the top Standing multiplier (×6), or the card-value rule two rows below is revised. **Corrected from an earlier figure of 156**, which multiplied the maximum of Spoils by the maximum of Standing as though they were independent — capturing all 26 cards means winning all 13 tricks, which is Greedy ×0. The highest `k` still paying ×6 is 9.                                                        |
| Encounters per run              | A range, not a number                                                          | **Undecided**                                                                                                   | Play a full run at a guessed length and count how many encounters it takes an additive-only build (one that only raises Spoils) to first miss its Demand (§3, §7). The honest run length is roughly that count plus one, so a poorly-built run discovers the lesson before it overstays it.                                                                                                                                                                                             |
| Demand base and growth rate     | Shape only — rising, and crossing 108 at some point                            | **Undecided**                                                                                                   | `balatro.md` Part 3's first suggestion, adapted: plot the Demand curve against the best achievable score for a build that only raises Spoils, and check whether it dies at a _predictable_ encounter (the lesson is being taught) or a random one (it is noise).                                                                                                                                                                                                                        |
| Forage budget per encounter     | **4 edits** (developer decision, 2026-08-09). Chosen vs drafted still undecided | **Decided, provisional**                                                                                        | Set to 4 over an earlier 2 for three reasons, all arithmetic. **Volume:** a 5-encounter run gives 4 Forage opportunities, so 4 edits is 16 edits across a 33-card deck — roughly half the deck touched, which is a build; at 2 it was 8, which is not. **Variance:** the 21% dead-edit rate in §3 does not change, but its impact per round halves — one dead edit out of 4 costs a quarter of a Forage rather than half. **Humble reachability:** 4 edits can be stacked on one card for +12 in a single Forage, which is what makes §6's concentrate-vs-spread fork playable rather than theoretical. Cost: zero — this row already existed. **What to watch, per this row's original warning:** a budget much larger than needed removes scarcity. The test is whether the player ever leaves an edit unspent or regrets how one was spent. If that never happens, 4 is too many. |
| Card base values                | Whether a plain card is worth 1 or its printed rank                            | **Undecided**                                                                                                   | Recompute the ceiling under both rules — 108 at value 1 (`18 × 6`, fixed), versus roughly 918 best-case and ~650 typical under rank weighting, which is deal-dependent rather than fixed — and check which keeps the Demand's crossing point inside the encounters-per-run range chosen above. This is the highest-leverage number in the document, and for a second reason §3 now states: at value 1, Spoils is fully determined by trick count, so `Spoils × Standing` collapses to the single-variable function `2k × f(k)` and the equation has no genuine second axis. Rank weighting is what makes the two terms independent. |

**One row is not marked undecided**, and it says plainly why: the 108 ceiling is **derived**, an
arithmetic consequence of the round length and the top multiplier rather than a value picked for
feel. Note that "derived" is not the same as "unreviewed" — it was previously stated as 156, and the
error survived because a derivation was trusted rather than enumerated.

The Standing multipliers row used to sit alongside it on the grounds that a **transcribed** value
involves no choice. That reasoning has been withdrawn. Transcription answers "where did this number
come from," not "is it right for this game" — and §6 shows that at least one of the six is not,
because the printed table assumes a symmetric contest that no longer exists. **A number copied from
a source whose assumptions the design has changed is not a settled number; it is an unexamined
one.** Every other row is a first-pass illustration only, and none of them may be treated as a
conclusion this document reached. Every other row is a first-pass illustration
only, and none of them may be treated as a conclusion this document reached.

---

## 10. Vocabulary

Every term this document defines, and nothing else — the complete set, reproduced from `plan.md`
Part 2 → Data shapes. The framing name is the round itself: a Hunt, run against the Quarry §4 casts
from the deck's own odd ranks. Everything else names a term of §1's equation or a verb that edits
one.

| Term           | Is                                   | Note                                      |
| -------------- | ------------------------------------ | ----------------------------------------- |
| **the Hunt**   | one 13-trick round                   | the inner loop — §1's equation is scored once per Hunt |
| **the Quarry** | the CPU opponent for one encounter   | a character from the deck's odd ranks     |
| **Spoils**     | summed value of cards captured       | the additive term                         |
| **Standing**   | multiplier from the trick-count band | the multiplicative term                   |
| **the Demand** | the encounter's score target         | rises per encounter                       |
| **Forage**     | the between-encounter deck edit      | the outer loop's only verb                |
| **Snare**      | the in-round edit, on cards in hand  | **proposed, not decided** — §3. Placeholder name; the layer it names is the developer's to accept before the name matters |

This table is **first-pass and the developer's to red-line** — naming is a copy judgement, not a
decision this document is entitled to make on its own authority.

One consequence is stated and deliberately not acted on: if this naming is accepted, the
repository's own naming pointer in `CLAUDE.md` needs a follow-up edit so that this direction's
vocabulary is the one a reader of a Fox in the Forest layer is sent to. **This document does not
make that edit.** It is out of scope for this contract, and propagating the naming decision into
`CLAUDE.md` is the developer's to authorise separately.

---

## 11. Smallest testable slice

**The one question the slice answers.** Does a single Hunt against one Quarry stay a live decision
each trick, or does it read as a slot machine with extra steps once the opponent is a CPU rather
than a person — the ticket's headline risk, and §4's own honest caveat? Everything below exists to
answer that one question; anything that would not help answer it is cut.

**What is in.**

- One encounter: one 13-trick Hunt, dealt once and played to completion.
- One Quarry, holding one round-long rule-break (§4, §5) — any single character is sufficient; which
  of the five is not load-bearing for the test.
- The Quarry's next-trick intent telegraphed every trick, exactly as §4's visibility table states.
- `Score = Spoils × Standing`, computed once at the end, checked against one fixed Demand.
- A visible outcome at the end: cleared or missed.

**What is out, explicitly:** no run, no Forage, no shop, no second encounter, no escalation curve,
no deck editing. These are out precisely because none of them bears on whether one round against one
telegraphed, rule-breaking CPU feels tense. They are the outer loop; the question above is about the
inner one alone, and a slice that pulls in the outer loop answers a different, cheaper question than
the one that matters.

**What already exists.** Per Step 1, `src/warCouncil/` (`abilities.ts`, `cardUtils.ts`, `cpuPlayer.ts`,
`deal.ts`, `deck.ts`, `index.ts`, `legalMoves.ts`, `playCard.ts`, `resolveTrick.ts`, `scoring.ts`,
`shuffle.ts`, `types.ts`) already ships, tested:

- The 33-card deck and its deal (`deck.ts`, `deal.ts`) — three suits, ranks 1–11, a decree that sets
  trump, a 13-card hand each.
- Legal-move generation, including the base game's single-trick Monarch follow constraint
  (`legalMoves.ts`).
- The Fox exchange, the Woodcutter draw-and-discard, and the Swan next-leader rule, each already
  coded as a single-card ability (`abilities.ts`).
- Trick resolution and a full play orchestration (`resolveTrick.ts`, `playCard.ts`).
- `scoring.ts`'s `tricksToPoints` — this **is**, verbatim, the Standing multiplier table §1 cites
  (≤3 tricks → ×6, 4 → ×1, 5 → ×2, 6 → ×3, 7–9 → ×6, ≥10 → ×0). The _band boundaries_ need nothing
  invented; the _values_ are now a live decision per §6 and §9, so the slice should read them from a
  configurable table rather than hard-code the printed six. That is a smaller change than it sounds
  — one lookup, same shape — but it has to be true from the first commit, because the slice is where
  the Humble-multiplier question gets measured.
- A working CPU (`cpuPlayer.ts`) that only ever plays legal moves, favours winning a trick cheaply
  over winning it expensively, and already resolves the Fox and Woodcutter ability choices.

Genuinely new for the slice, against that inventory:

- **Spoils.** The engine currently tracks `tricksWon` as a count, not the value of the cards inside
  each trick — summing captured-card value is a small addition over trick resolution's existing
  output, not a new subsystem.
- **The Demand.** A fixed target and a pass/fail check against `Spoils × Standing` — new, but pure
  arithmetic; no new game state beyond one number.
- **The Quarry's round-long rule-break.** Every constraint in `legalMoves.ts` and every ability in
  `abilities.ts` is scoped to the single card that carries it. Turning one into a round-long
  condition — the Monarch's follow constraint firing on every lead of a suit the player holds,
  rather than only when the Monarch card itself is led — is new engine logic, though it reuses the
  same functions' shape and the same `RoundState`.
- **The intent telegraph.** Nothing in the engine currently surfaces a move before it is played;
  `chooseCpuMove` computes and returns a completed move in one call. Telegraphing needs that single
  call split into a visible "intent" step and a later "commit" step.

So the slice is substantially smaller than a from-scratch reading of AC 10 would suggest: the deck,
deal, legal-move engine, trick resolution, the base single-card abilities, the Standing table, and a
legal-move-respecting CPU are all already built and tested. What remains is one new term
(Spoils-as-captured-value), one comparison (the Demand), one round-long rule-break, and one
telegraph — four small additions to a working engine, not a new game.

**The kill criterion.** Stated so it can actually fire, not so it flatters the design: if a
playtester who has never seen this document reads the telegraphed intent, visibly plans a lead or a
follow around it, and still reports — across a small sample of slice playthroughs, not one — that
the round felt like watching a number happen to them rather than a decision they made, the
CPU-opponent premise this entire document rests on (§4's honest caveat) is wrong. No amount of tuning
Standing, the Demand, or Forage repairs that, because all three operate one level above the
trick-by-trick decision the kill criterion tests. That is the condition for abandoning this
direction rather than tuning it.

**One line on sizing basis.** This slice is sized against the trick-taking engine already on disk,
as it exists today. If the developer instead wants it sized as though nothing exists — for instance
because this direction would start a clean prototype rather than build on that engine — this section
changes materially. That is the developer's call, flagged in `plan.md`'s Risks, not this document's
to make.

---

## 12. Critique

Run against `.docs/design/design-principles.md` §6's fourteen checks, over §1–§11 read as
a finished argument, not a work in progress.

### What is genuinely strong

- **The Standing multiplier is not a new component — it is `scoring.ts`'s `tricksToPoints`, already
  coded to the exact bands §1 cites, doing a second job for free.** The base game's own end-of-round
  table becomes the multiplicative term of the run's one equation at, per §11's inventory, near-zero
  new code. That is Rosewater's lesson #17 (you don't have to change much to change everything)
  demonstrated rather than argued for. **Qualified since drafting:** the claim holds for the band
  _structure_, which is what makes the strength real. It no longer holds for the band _values_ — §6
  shows the printed Humble ×6 leaves that band dominated, so at least one number is the design's to
  own rather than to inherit.
- **The 108 ceiling forces the outer loop to edit an input rather than hand over a bonus, and the
  force is arithmetic, not a rule someone wrote.** §3 derives it from the round length and the
  printed multiplier alone; nothing needed to be designed to make Forage the only lever that keeps
  working past a point. A design that instead let a shop sell +10 Spoils would have needed a second
  argument for why that shop eventually stops helping — this one doesn't, because the cap already
  makes the case.
- **The Quarry's cast costs nothing to teach because the player has already met it.** The Monarch,
  Fox, Woodcutter, Witch and Swan are cards the base game prints; turning each one's ability from a
  single-card trigger into a round-long condition is one sentence of new fiction per character, not
  five new characters. §4 and §11's code inventory both confirm this is cheap in prose and cheap in
  engine terms alike.

### Problem 1 — Standing risks being a dominant strategy, not a decision

Ranked first: this is the design's own flagged most-likely balance failure (§8), and it fails check 1
of the critique checklist (Meier — is there a dominant option?) directly if it lands as feared.

- **Evidence.** §8's own 14-row enumeration shows the "exactly one side scores ×6" tension is a
  property of the _symmetric_ contest, and it is gone once the Quarry doesn't score. What remains is
  Standing as a self-limit on the player alone, with nothing on the board contesting the Victorious
  band. If the Quarry's round-long rule-break does not reliably displace the player's achievable
  trick count away from 7–9, "aim for Victorious every Hunt" becomes the answer to "which band do I
  aim for" almost every time — Meier's own definition of an uninteresting decision.
- **What the player experiences.** Not a bad round — a _flat_ one. The Standing term of §1's equation
  is meant to be a live choice each Hunt; if it collapses to a fixed target, the equation quietly
  loses one of its two terms as a decision, even though both terms are still present in the score.
- **What it connects to.** Directly to Problem 2, below — see that problem's third bullet for the
  two-way argument.
- **Options, not a prescription.** §8 already names the intended answer (Quarry pressure that moves
  `k` away from the target band) and already routes the measurement to §9. What this critique adds is
  the coupling to Problem 2 that §8 does not mention: whichever way the developer tunes Quarry
  pressure to solve this problem has a cost paid on the other one.

### Problem 2 — A run can be arithmetically dead several Hunts before the player can tell

- **Evidence.** §6 states this outright and traces it to `balatro.md` §2.4: a losing Hunt still plays
  all 13 tricks and still produces a Standing band, so the round _feels_ alive right up to the score
  check. Sirlin's slippery slope (positive feedback deciding the game early, `design-principles.md`
  §3) applies because the Humble lane §6 offers is a second strategy, not a comeback mechanic — it
  does nothing for a build too weak for either lane. Check 5 of the critique checklist (where is the
  positive feedback, can one event decide the outcome) is answered honestly in the document already;
  credit is given rather than re-raised as new.
- **What the player experiences.** A run that is over in substance several encounters before it is
  over on screen — the player keeps making Forage choices and playing full Hunts against a Demand
  they can no longer reach, with no in-game signal saying so.
- **What it connects to — the two-way argument with Problem 1.** These two problems are not
  independent, and fixing one moves the other. Strengthening the Quarry's round-long pressure to stop
  Victorious from being a dominant target (Problem 1's fix) means displacing the player's trick count
  _more often and more forcefully_ — which increases how often a build gets pushed toward Defeated or
  Greedy it didn't choose, raising the variance that makes an already-dead run die faster and less
  predictably, exactly the failure Problem 2 names. Running the fix the other way — softening the
  Greedy ×0 penalty to make catch-up gentler (§9's already-flagged suspect value) — removes some of
  the cost that is supposed to be discouraging the Victorious-chasing play Problem 1 worries about.
  The two problems are both downstream of the same design fact: removing the scoring opponent took
  away the thing that used to punish greed _and_ the thing that used to give a losing player hope, in
  one move, and both replacement jobs were handed to the same lever — Quarry pressure and the Greedy
  penalty. Neither problem can be tuned in isolation from the other.
- **Options, not a prescription.** §6 already states the open option (a still-winnable signal) and
  its cost on both sides; nothing here overrides that. What this critique adds is that any answer to
  Problem 1 should be checked against its effect on Problem 2's variance before it is called settled,
  and vice versa — a joint measurement, not two separate ones.

### Problem 3 — The Quarry's appearance across a run's encounters is unspecified, and repeats are forced past five

- **Evidence.** §4 names exactly five characters. §7 states a run is "a fixed sequence of Quarry
  encounters ending in a final one," and §9 leaves the encounter count as "a range, not a number." No
  section states whether that sequence draws without repetition, repeats deliberately, or is chosen
  by the developer some other way. By simple counting — a pigeonhole, not a judgement call — any run
  longer than five encounters must repeat at least one character, and the document never says how.
- **What the player experiences.** If repeats are unmanaged, a player can face the same round-long
  rule-break twice (or more) inside one run, at exactly the point the Demand is rising and Forage
  choices matter most. §7's depth-budget argument claims the player is learning the growth-class
  lesson on encounter five, not a new character — which survives a repeat — but it is a claim about
  what the _design intends_ to teach, and it goes untested by a document that never states whether
  the encounter sequence is built to support it.
- **What it connects to.** §7's own accepted risk — that this design's five-character roster against
  Balatro's roughly 150 Jokers risks "running out of steam quickly," a critique §7 already accepts
  rather than denies. An unmanaged repeat schedule would make that critique land _earlier_ than the
  roster size alone implies, because the same rule-break teaching nothing new can arrive on encounter
  three instead of encounter six.
- **Options, not a prescription.** A drafted or shuffled-without-immediate-repeat sequence is the
  cheapest fix and adds no new component — it is a scheduling rule over the cast §4 already
  established, not a sixth character. This is not fixed here: doing so would mean rewriting §5 or §7,
  and this phase is append-only. It is acknowledged in place, per AC 11, as an accepted gap for
  whichever section is next revised to close.

### Smaller findings

- **No stated consequence for clearing the Demand with surplus Spoils.** §5 and §9 state the Demand
  as a threshold to clear, not a score to maximise past that point. If nothing rewards overshoot, the
  moment a Hunt is arithmetically safe becomes dead air for the rest of the round — a mild version of
  Soren Johnson's optimisation warning (`design-principles.md` §2): a player who has already cleared
  the Demand has no stated reason to keep playing sharply. Not urgent, because §9 already treats the
  Demand's shape as undecided and this is one property of that same undecided shape.
- **No cross-character difficulty read.** §4's Wehrle asymmetry treatment (strong position, readable
  liability) is given per character, but nothing compares the five characters' pressure against each
  other — whether the Woodcutter's permanent card-down is harsher than the Swan's narrowed free play,
  for instance. This is a tuning question in the same family as §9's undecided rows, not a structural
  gap, and is routed there rather than answered here.
- **No named target emotion.** Rosewater's #6 (`design-principles.md` §2 — know what emotion the game
  evokes) is answerable from the fiction (the Hunt, the Quarry) but the document never states it
  outright, unlike §7's explicit naming of the depth-budget lesson. Cheap to add, not load-bearing.

### What to measure

Cross-referencing §9 rather than duplicating it — these are the checks that are new to this critique:

- **For Problem 1:** the slice in §11 already produces this measurement as a side effect of its kill
  criterion — record which Standing band the player actually lands in across several slice
  playthroughs against different Quarries, and check whether 7–9 dominates the sample.
- **For the Problem 1 / Problem 2 coupling:** once both a Quarry-pressure tuning and a Greedy-penalty
  tuning exist, measure them together — vary one, hold the other fixed, and record both "how often is
  Victorious the reachable band" and "how many Hunts does an already-weak build survive." A fix that
  improves one number while worsening the other by more is not a fix, it is a transfer.
- **For Problem 3:** this is cheap because it is arithmetic on a number §9 already asks the developer
  to choose. Once an encounters-per-run figure is picked, check whether it exceeds five; if it does,
  decide the repeat policy before the run length is called settled, not after.

### The one-line summary

The equation and the shared object are close to a free lunch — already coded, already correctly
tuned to the base game's own numbers, and costing nothing new to teach — but the design's real
exposure is behavioural rather than arithmetic: whether removing a scoring opponent quietly turns
Standing into a fixed answer and turns losing into an unannounced formality, and neither question is
answerable on paper. §11's slice is where both start to get answered.
