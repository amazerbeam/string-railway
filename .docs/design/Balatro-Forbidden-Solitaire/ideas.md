# Ideas — the parking lot

Raw ideas for The Hunt, before they are arguments. Nothing here is a decision, and nothing here is
load-bearing: if a rule depends on it, it does not belong here — it belongs in
[`hybrid-design.md`](./hybrid-design.md), argued for.

**Why this file exists.** `hybrid-design.md` is a treatment — every section states a position and
buries the discarded branch. That is the right shape for a settled design and the wrong shape for a
thought you had in the shower. An idea forced into a treatment section before it is ready gets
argued for prematurely; an idea left in chat gets lost. This is where it waits.

**The point of Rejected.** An idea killed with its reason recorded stays killed. Without the reason,
the same idea comes back in three months and gets re-litigated from scratch. Move entries down
rather than deleting them.

---

## How to use this

**Adding an idea costs one line.** Title, a sentence on what it is, and — if you know it — the
problem it is reaching for. That is the whole obligation. No table row, no ranking, no cross-
reference. The moment adding an idea requires analysis, ideas stop getting added.

The analysis is opt-in and comes later, when an idea earns it. That is what the three statuses are:

| Status                      | Means                             | What it owes                                                                         |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| **Raw**                     | Written down, not yet examined    | Nothing. A title and a sentence.                                                     |
| **Worth costing**           | Someone thinks this might be real | Which problem it solves, what it costs in _new rules_, and what would prove it wrong |
| **Promoted** / **Rejected** | Resolved                          | The `hybrid-design.md` section it became, or the reason it died                      |

Ideas that arrive with their own context do not need this file — a thought that comes out of a play
session belongs in that session's notes, where the context is. See `balatro-play-notes.md` §2.4 for
one that was handled that way. This file is for the free-floating ones.

---

## Raw

### A player-triggered cash-out — "apply damage" before playing a card

**What it is.** Raised 2026-08-13, during the session-2 redesign
([`the-hunt-play-test-2-feedback.md`](./the-hunt-play-test-2-feedback.md)). In that design the bank
cashes out **automatically** whenever the player takes damage. This idea gives the player a button —
before committing a card, they may choose to cash the bank at its current multiplier and reset,
rather than waiting to be forced.

**Problem it reaches for.** It converts the cash-out from something that _happens to_ the player into
a decision they make. You are sitting on 43 at ×3 and the next trick looks unwinnable — do you bank
129 now, or push for ×4 and risk being cashed out anyway on a trick you can't take? That is
press-your-luck with an explicit stop button, which is the shape of a Balatro "do I play this hand
now" decision.

**Cost in new rules.** One control and one sentence, and it changes nothing else in the loop — the
cash-out arithmetic already exists and already resets. Cheap.

**What to watch.** Whether it is ever _not_ obviously correct to press. If the button is always right
before a trick you expect to lose, it is a chore rather than a decision, and the interesting version
is one where holding has a visible upside — which the multiplier already supplies.

**Status.** Deliberately out of the first build. Recorded so the automatic cash-out is understood as
the simple case, not the only one.

### Declaring before the decree is turned

**What it is.** Move the declaration earlier in the setup sequence — before the decree card is
turned, rather than after it, as built. Raised as a lever for the free-option problem below, not
adopted.

**Problem it solves.** Trump is the single biggest factor in whether a trick count can be steered
toward a band, so declaring before it is visible would cut read quality at zero rules — a
sequencing change over a step that already exists, not a new one. It is one of two cheap levers
`hybrid-design.md` §6 names for the declaration's free-option problem (the other is sorting the
character roster so every character punishes a declaration) and neither is taken there.

**Why it stayed Raw rather than costed.** `hybrid-design.md`'s third-pass decision, 2026-08-11,
already read this branch and discarded it — the declaration is built pre-Hunt, after the deal, with
the decree already visible, and moving it earlier is recorded as a discarded branch with that
reason. Kept here, not in `hybrid-design.md`, as the lever to reach for if the free option ever
needs one and this reading is revisited.

**Cost in new rules.** Zero — it reorders an existing step rather than adding one.

**What would prove it wrong, or right.** The same measurement §11's slice already collects for the
free option: whether a playtester reports the declaration as a read or a coin flip. If the coin-flip
report survives even after this reordering, the lever doesn't fix what it was reached for.

### Abilities as game-permanent unlocks, archetype decks, and challenge runs

**What it is.** Raised 2026-08-17, deliberately parked Raw — _"flag this as an idea for now and we'll
get back to it later, it could help with the shape."_ Three connected moves, in order of ambition:

1. **Abilities move from printed to game-permanent.** Today the six odd-rank abilities are fixed
   properties of the deck, chosen by nobody — a rung the persistence ladder calls _printed_. The base
   deck would instead ship with only the **Swan (1)** live, and the player unlocks the rest across
   runs, switching them on from a home menu. Two exits on placement: **dormant slots with fixed
   homes** (a rank keeps its identity forever; you unlock whether it is switched on — costs almost
   nothing, since it is today's deck with abilities asleep) or **free placement across the odd ranks**
   (richer — the Witch on rank 1 makes your worst card a trump-maker — but pays in UI and in Quarry
   logic, because a mapping that changes per run has to be taught on screen and played by the AI).
2. **Archetype decks.** Pre-built decks that each express a play style — a poison deck, a punching
   deck — introduced as the Quarry sets escalate, so a later set is fought under different rules
   rather than merely against more health.
3. **Player-built decks, and challenge runs.** Eventually the player assembles their own; and "win
   with deck X" becomes a challenge-run frame, which is where the replay spine would come from.

**The spitballed poison example, recorded because two parts of it are structurally new.** An ability
that swaps the decree and makes decree cards poisonous; another card that protects its holder from
poison merely by being **in hand**; poison that does **not** land immediately but resolves on the
**next** hand, giving both sides a window to heal it.

- **Delayed, telegraphed, answerable damage does not exist in this game yet.** Every damage source
  today is immediate — lose a trick, take it. A threat that lands next hand creates a three-beat arc
  across hands (threat → response window → resolution) that both sides can see and both sides can
  answer. This is the strongest single element in the proposal and it is separable from everything
  else here.
- **A card that works while held fills the empty rung.** The persistence ladder's **fight-long** rung
  is unoccupied. A protective card that does its work by sitting in your hand is fight-long, granted
  by the deal rather than bought — which means the empty rung may get filled by cards rather than by
  a new purchase system.

**Two pieces already in the deck, waiting.** **Treasure (7)** and **Poison (8)** are both named cards
with **no rule attached** — furnished empty slots. The poison spitball lands on the second by name.
Note the grammar clash to resolve if it is taken: every ability in the game today is on an **odd**
rank, and 8 is even.

**Problem it reaches for.** The game currently has nothing on the game-permanent rung, no
between-run reason to return, and one Quarry that plays identically every fight. This proposes to
fill all three from content that already exists, which is why it is worth taking seriously despite
its size.

**The symmetric reading, recorded first because it was the initial analysis.** Both sides draw from
the same 33-card deck, so an ability installed on a rank is an ability the **Quarry gets too**, on
roughly half those cards. Under that reading, unlocking cannot inflate the player's strength — it
changes what the game _is_ this run, symmetrically, which is the "options, not power" cell
`hybrid-design.md` §7 wanted and could not populate. The fork it implied was whether an _archetype_
is the player's loadout or the **match's rules** — with a shared deck, picking the poison deck makes
the match poisonous for both sides, so the fantasy is stage-select rather than class-select.

**Superseded 2026-08-17 by the developer's framing, which is asymmetric and better.** The shape they
described is: **the player starts with only the Swan (1) live, and the Quarry has the full deck from
the first run.** Abilities are unlocked **per side** — the same physical card does something in the
Quarry's hand and nothing in the player's until that ability is unlocked. Runs unlock the standard
deck's abilities one at a time until **beating the boss completes it**, at which point a **second
deck** (working name: Fire) opens with its own ability set, and the ladder repeats.

Three consequences, and the first is the reason to prefer this shape:

- **The ceiling is parity, so power creep is impossible by construction.** The player is not growing
  past the content; they are growing **up to** it. The end state of a full unlock is a symmetric
  game, not a player advantage. This is the exact inverse of the Dead Cells bargain §7 rejects, and
  it answers that rejection more cleanly than any bound or cap could — there is nothing to bound.
- **It reframes unlocking as a shrinking handicap rather than a growing bank**, which also gives
  every unlock a legible meaning: you did not get stronger, you got *the thing the Quarry already
  had*.
- **A second deck restarts the ladder with real identity.** A deck is six abilities, not one
  modifier, so each new deck is a far bigger unlock than a Balatro deck and gives the run structure
  **acts** — which the flat fight sequence currently lacks.

**The open problem in this shape, and it is a scheduling choice rather than a wall.** The teaching
curve and the power curve now point in **opposite directions**. Starting with one ability is an
excellent way to teach the game — the drip is the whole virtue — but pairing it with a full-ability
opponent means the newest player faces **maximum incoming complexity with minimum outgoing agency**,
at the exact moment they understand least. Abilities are mostly disruption; facing six while holding
one means the game is chaotic at you and you cannot be chaotic back. The two effects are separable:
the Quarry could unlock **alongside** the player, which keeps the entire teaching benefit and drops
the handicap, at the cost of losing the "the Quarry already had it" meaning above. Cheap to flip in
either direction; the developer's call, after play.

**A legibility cost this shape adds.** The same card face means two different things depending on who
holds it. The screen has to carry that, and the skull read gets harder — a Fox in the Quarry's hand
is live while yours is inert.

**Draw-rate arithmetic, so the base deck is not assumed featureless.** Three cards per rank in 33. In
a six-card hand the player holds at least one **Swan** in **≈46%** of hands (`C(30,6)/C(33,6) =
0.536` for none, so 0.464 for at least one). With all six odd ranks live — today's deck — the chance
of holding at least one ability card is **≈99.5%**. So the unlock path is a real texture ramp from
"occasionally something happens" to "always something happens".

**A connection worth keeping.** That ramp also answers §5's open question — _whether the abilities
survive a six-card hand_, where ability-free hands are currently normal "by default rather than by
decision". Under this idea, sparse early hands stop being an accident and become the designed early
game.

**Collision to note, not a conflict.** **Forage** already lists a card's **ability** as one of the
four things it may edit. The home menu would set the deck's baseline abilities and Forage would move
them within a run — the same verb on two rungs of the ladder, which is a clean division of labour
rather than a duplication.

**Status.** **Raw, deliberately.** The developer's read is that it is a strong idea that "could help
with the shape" and that it wants a **play test to see how it feels** before it is costed. Nothing
here is adopted; the placement fork and the shared-deck framing fork are both open and both the
developer's.

### Delayed damage with a response window — a threat that lands next hand

**What it is.** Split out on 2026-08-17 at the developer's request, from the archetype-deck entry
above, because **it needs none of that structure and can be tested alone.** A damage source that does
not resolve when it is inflicted. It is applied now, it is visible to both sides, and it lands at the
start of the **next** hand — so between infliction and resolution there is a window in which either
side can act to reduce or cancel it. The originating spitball was poison: a card that poisons, and a
separate card that answers poison by being held or played.

**Problem it reaches for.** Every damage source in the game today is **immediate** — a trick is lost
and the health comes off. Nothing can be seen coming and nothing can be answered. This adds a
three-beat structure the game does not have anywhere:

1. **Threat** — the damage is inflicted and displayed, unresolved.
2. **Window** — one hand in which either side may answer it.
3. **Resolution** — whatever is left lands.

That middle beat is the whole point. It creates a decision whose subject is a consequence you can
already see, which is the one thing pending damage on the health bar gestures at but does not
actually make answerable.

**Why it is worth separating from its parent.** It requires no unlock system, no archetype deck, no
home menu and no new currency. In its cheapest form it is one status, one display, and one answer —
testable inside the current deck by giving the effect to a rank that already exists and does nothing.
**Poison (8)** is a named card with **no rule attached**, which is exactly where the spitball put it.
The grammar clash to resolve is that every ability in the game today sits on an **odd** rank, and 8
is even.

**Where it sits on the persistence ladder.** The threat itself is **one-time use** in effect but
**fight-long** in reach — inflicted once, resolving a hand later. The answer to it, if it works by
being **held** rather than played, is squarely **fight-long**, which is the ladder's empty rung. That
makes this idea a candidate occupant of the empty rung without inventing a purchase system for it.

**What to watch, and it is the obvious failure.** If answering the threat is always correct and always
available, the window is not a decision — it is a chore with an extra click, and the net effect is
that the damage simply never happens. The interesting version needs the answer to **cost** something:
it occupies a card slot, or it competes with a trick you wanted to take, or it only partly cancels.
Conversely if the answer is rarely drawn, the delay is pure notification and the mechanic reduces to
immediate damage announced early.

**A second thing to watch, from the shared deck.** Both sides draw from the same 33 cards, so
whatever inflicts the threat and whatever answers it are **both available to the Quarry**. A poison
the Quarry can also apply and also cure is a different mechanic from one the player owns, and the
Quarry's AI has to be able to use the window or the symmetry is nominal only.

**Cost in new rules.** One status that persists across a hand boundary, one place to show it, and one
rule for answering it. Cheap by the standards of everything else in this file — but note it is the
first thing in the game that would carry state **between** hands within a fight, which is a genuinely
new kind of object.

**Status.** **Raw.** Split out to be testable on its own; nothing adopted.

---

## Worth costing

All five below arrived together on 2026-08-11 as one proposal: the Quarry gets health, cards are
damage, poison is the lose path, four characters plus a boss with a cheat tool, and roguelike
upgrades bought with money. They are recorded separately because they cost different things and
three of them can be taken without the other two. **Nothing here is decided.**

### Superseded reading — poison as incoming damage on player health

**Note, 2026-08-11 (DLR-64).** Player health went from an idea in this file to design — `H = P =
1,350`, `hybrid-design.md` §9 — but this entry's _specific mechanism_ (poisoned cards, tracked
independently of what the cards are worth) is not what shipped in the design: the direction pays the
player for the cards the Quarry captures, at inverted printed-rank value, with no separate poison
concept at all. So this entry stays parked rather than promoted. Its blocking finding below is still
live and still worth reading before anyone revisits a card-level damage mechanic.

**What it is.** The player has health too. Poisoned cards damage whoever wins the trick containing
them, so the Quarry's attack lands on the cards rather than on the player's stats.

**Problem it solves.** This is Forbidden Solitaire's enemy design, which `design-principles.md` §8
holds up as the standard and this design has never implemented — enemies there _"curse, poison and
infest tableau cards."_ The Quarry currently attacks only the **rules** (§4/§5's round-long
rule-breaks). Nothing attacks the **cards**. It also rescues §9's open negative-card-values row,
which worries that _"the Poison 8s alone (3 of 33) are too thin to carry it"_ — under a health bar a
poisoned card is a permanent cost carried to the boss, not a dent in a score already banked.

**The blocking constraint — uniform poison is arithmetically a no-op.** If poisoned cards are spread
evenly and each costs 1 health, expected damage taken is `c · 2k` and the round's net is
`2k·(f(k) − c)`. A constant subtracted from every band equally does not move the argmax: `k=9` still
pays `18(6−c)` against Humble's `6(6−c)`. **It shifts no decision and scales the whole curve down** —
arithmetically identical to just lowering damage, for the price of a rule. Poison is only a decision
when it is **concentrated and visible**: a named card, on the table, in a trick the player can
choose to lose.

**Cost in new rules.** One, if player health reads as the negative sum of the same captured pile —
one pile, two readings, which preserves §2's shared-object discipline. Two channels rather than one
if player health is tracked independently of what the cards say, which is what §1's component table
forbids.

**What would prove it wrong.** Count how often a player declines a trick they could win. Zero means
poison is a tax, not a decision. (§9 already proposes this exact count for negative card values.)

### Forage as a draft, instead of random upgrades

**What it is.** Forage offers three edits and the player picks one, four times per encounter, rather
than choosing four edits freely.

**Problem it solves.** The "random per-run upgrades" want, using a system that already exists.
Delivers run-to-run variety (§7's gap), a real decision where there was an open menu, and Balatro's
shop-shaped choice — with no new subsystem and no currency.

**Cost in new rules.** Zero. It is a presentation rule over §3's existing verb.

**Risk.** §9 set the budget to 4 partly so four edits can stack on one card for +12, which is what
makes §6's concentrate-vs-spread fork playable rather than theoretical. A draft can deny that stack,
so the draft and the budget are one decision.

### The full net-damage enumeration, with two-sided damage

**Superseded in place, 2026-08-11 (DLR-64) — not promoted.** This table and its three findings rest
on the single ×6-family table (`Spoils × Standing` off a plain trick-count band), computed before the
direction introduced two mirrored, designed tables. **Findings 1 and 2 below are void**: Finding 1's
"Humble is rescued" has no subject — there is no Humble lane once each declared path has one peak —
and Finding 2's "valley near-lethal" numbers assume 4–6 is a low point rather than the Lose path's
_peak_, which the direction makes it. **Finding 3 survives in a new form** and is promoted
separately, as the one-failure-mode finding in `hybrid-design.md` §6 (see Promoted, below) — its
core observation, that the round's ending needs an endgame where trick 13 plays differently from
trick 1, is exactly what pending damage and the disaster/slow-leak framing deliver. Kept here rather
than deleted, per this file's own rule, because the arithmetic below is a real record of the
single-table model this design no longer uses.

All fourteen splits of 13 tricks, at the **built** rules as they stood before this direction — card
value = printed rank, average rank 6, no combo bonus (dropped 2026-08-11; see Rejected). Both sides
score `Spoils × Standing` off their own capture pile and trick count. This table is the evidence
behind the three findings under it.

| Player `k` | Quarry `k` | Player deals | Quarry deals | Net      |
| ---------- | ---------- | ------------ | ------------ | -------- |
| 0          | 13         | 0            | 0            | 0        |
| 1          | 12         | 72           | 0            | +72      |
| 2          | 11         | 144          | 0            | +144     |
| 3          | 10         | 216          | 0            | **+216** |
| 4          | 9          | 48           | 648          | **−600** |
| 5          | 8          | 120          | 576          | −456     |
| 6          | 7          | 216          | 504          | −288     |
| 7          | 6          | 504          | 216          | +288     |
| 8          | 5          | 576          | 120          | +456     |
| 9          | 4          | 648          | 48           | **+600** |
| 10         | 3          | 0            | 216          | −216     |
| 11         | 2          | 0            | 144          | −144     |
| 12         | 1          | 0            | 72           | −72      |
| 13         | 0          | 0            | 0            | 0        |

**Finding 1 — the Humble lane is rescued, by health rather than by score.** At `k ≤ 3` the Quarry is
in Greedy and deals **zero**; it is the only region of the table where the player takes no damage.
Against a Quarry with health `H`, the Victorious route needs `H/648` rounds and costs `H/13.5` of the
player's health, while the Humble route needs `H/216` rounds — 3× slower — and costs nothing. §6
calls catch-up _"the design's weakest claim"_ and proves at length that Humble is dominated and that
Forage does not rescue it; it is rescued here by a lever §6 never considered, because health adds a
second axis and Humble is the zero-damage band. **This needs health and Quarry damage together** —
neither alone produces it.

Consequence: the round cap (see the health entry) becomes the dial that prices the two lanes against
each other. Cap short and Humble cannot finish; cap long and Humble is free. That makes it a far
more interesting number than it looked like as a pacing fix.

**Finding 2 — the valley becomes near-lethal.** `k = 4, 5, 6` read −600, −456, −288. Under the
current design the valley is merely a low score. §5's Quarry rule-breaks exist specifically to
displace the player's trick count, and §12 already names the coupling: strengthening Quarry pressure
_"increases how often a build gets pushed toward Defeated or Greedy it didn't choose, raising the
variance."_ That sentence was written when the consequence was a low score. **Quarry pressure and
player health must now be tuned as one number, not two.**

**Finding 3 — there is finally an endgame.** At `k=9` with tricks remaining, the player must dodge
every one or fall off an **816-point** cliff (+600 → −216), while the Quarry — now holding a stake —
wants to force tricks on them by leading low. Currently trick 13 plays identically to trick 1. A
self-correcting property helps: winning tricks spends high cards, so a player at `k=9` is naturally
holding the low cards that make dodging possible, and the Quarry has to work for it.

**The ratio worth remembering:** the boundary swing (816) is **2.8×** a typical round's differential
(±288 at the 6/7 split). That ratio is invariant to the combo bonus — the bonus scaled both numbers
by the same factor. See the Rejected entry for the correction that surfaced this.

### Overkill heals

**What it is.** Damage past the Quarry's remaining health becomes healing for the player.

**Problem it solves.** §12's _"no stated consequence for clearing the Demand with surplus Spoils"_ —
the moment a Hunt is arithmetically safe stops being dead air. Gives player health a recovery source
without the comeback mechanic §6 explicitly refused.

**Cost in new rules.** One.

**Risk.** Positive feedback — winning big heals, which makes winning big easier. Sirlin's guidance is
to blend a _limited_ slippery slope with tuned catch-up rather than remove either, so a cap is
likely wanted. The cap is a tuning value and it is the developer's.

### Fight length is symmetric about the middle, and bimodal — 3–4 Hunts, or 21–27

**Annotation, 2026-08-11 (DLR-64) — health is now decided, this entry is not rewritten.** This entry
illustrates at `P = H = 1,620` and says outright that 1,620 is _"not a proposed value."_ Health has
since been **decided at 1,350** (`hybrid-design.md` §9). Rescaled at that number: the fast band (4–9
tricks) stays **3–4 Hunts** — which is exactly why 1,350 was chosen, over a smaller bar, in the same
band as the 1,620 illustrated here — and the tail _shortens_ from 21–27 to **18–23**, up to 299
tricks rather than 351. The derived cap range below, `4 to 10` at 1,620, becomes **3 to 5** at 1,350.
Every structural finding below survives unchanged, including Finding 4 — the slowest line is still
10 tricks, not 13. Annotated rather than rewritten, so the parked finding stays findable and no
superseded count below reads as current: **21–27 Hunts and the 4–10 cap range are the 1,620
figures; 18–23 Hunts and the 3–5 cap range are current, at the decided 1,350.**

**What it is.** Not a proposal. An arithmetic finding about the direction agreed 2026-08-11, recorded
here because it is the thing that decides whether the Hunt cap is needed, and nothing else in this file
carries it. Raised 2026-08-11, parked deliberately — _"we can resolve this later."_

**Computed against.** Card value = printed rank (mean rank 6, so a trick's two cards are worth ~12);
both sides on the player's declared path; piles swapping both ways on the Lose path. The two mirrored
multiplier tables from that session — Win: `0–3 ×1, 4 ×2, 5 ×3, 6 ×4, 7–9 ×5, 10–13 ×0.5`, and Lose as
its exact complement. _Those values are quoted for checkability only. They are owned by
`hybrid-design.md` once DLR-64 lands, and everything below must be rechecked if they move._ Health is
illustrated at `P = H = 1,620` — three perfect Hunts' worth, chosen to make the arithmetic legible and
**not** a proposed value.

**The table. Both bars tracked, not just the Quarry's** — which is the mistake that produced a wrong
answer first time round, because a fight where the Quarry needs six Hunts to die can still end on Hunt
four with the player dead.

| Player's tricks | Deals | Takes | Quarry's bar empties | Player's bar empties | Outcome       |
| --------------- | ----- | ----- | -------------------- | -------------------- | ------------- |
| 0               | 0     | 78    | never                | Hunt 21              | Lose, Hunt 21 |
| 1               | 12    | 72    | Hunt 135             | Hunt 23              | Lose, Hunt 23 |
| 2               | 24    | 66    | Hunt 68              | Hunt 25              | Lose, Hunt 25 |
| 3               | 36    | 60    | Hunt 45              | Hunt 27              | Lose, Hunt 27 |
| 4               | 96    | 540   | Hunt 17              | Hunt 3               | Lose, Hunt 3  |
| 5               | 180   | 480   | Hunt 9               | Hunt 4               | Lose, Hunt 4  |
| 6               | 288   | 420   | Hunt 6               | Hunt 4               | Lose, Hunt 4  |
| 7               | 420   | 288   | Hunt 4               | Hunt 6               | Win, Hunt 4   |
| 8               | 480   | 180   | Hunt 4               | Hunt 9               | Win, Hunt 4   |
| 9               | 540   | 96    | Hunt 3               | Hunt 17              | Win, Hunt 3   |
| 10              | 60    | 36    | Hunt 27              | Hunt 45              | Win, Hunt 27  |
| 11              | 66    | 24    | Hunt 25              | Hunt 68              | Win, Hunt 25  |
| 12              | 72    | 12    | Hunt 23              | Hunt 135             | Win, Hunt 23  |
| 13              | 78    | 0     | Hunt 21              | never                | Win, Hunt 21  |

**Finding 1 — length depends only on distance from the middle; the winner depends only on which side.**
The outcome column is perfectly antisymmetric: `k` and `13 − k` produce the same number of Hunts with
the winner flipped. 6 tricks is a loss on Hunt 4 and 7 tricks is a win on Hunt 4. 3 tricks is a loss on
Hunt 27 and 10 tricks is a win on Hunt 27. So **the trick count sets the clock and the side sets the
result**, which is a much cleaner property than it looks like from the multiplier tables alone.

**Finding 2 — the outcomes are bimodal with nothing in between.** Everything in the 4–9 band resolves
in **3 or 4 Hunts** — roughly 5 to 7 minutes at 13 tricks a Hunt. Everything outside it takes **21 to
27 Hunts**, up to 351 tricks, half an hour or more. There is no 8-Hunt fight. Session length is
therefore not a dial anyone tunes; it is a step function of whether the player lands inside 4–9.

**Finding 3 — the top end cannot be lost, and the bottom end cannot be won.** At 13 tricks the player
takes literally zero (the Quarry holds no cards, so it has nothing to be paid for) and at 12 it takes
12 a Hunt — 276 across the whole fight, 17% of the bar. That is an unloseable 21–23 Hunt grind. Its
mirror at 0–1 tricks is an unwinnable one of the same length.

**Finding 4 — the slowest line is 10 tricks, not 13.** Deals 60 a Hunt against 13's 78, so it runs 27
Hunts. The worst case for session length sits one step past the peak, not at the extreme.

**Calibration, so this is not overstated.** The unloseable grind is **not** a dominant strategy and
should not be written up as one. Landing 10+ tricks means the Quarry lands 0–3, which takes the cards
rather than the intent — and a player able to dominate tricks that hard would reach 9 more profitably.
A realistic player aiming at 9 and mixing in 8s and 10s deals about 405 a Hunt, wins on Hunt 4, and
finishes with three-quarters of the bar. So the finding is about an **unbounded tail**, not a common
case.

**Cost in new rules.** Zero if the tail is acceptable. One — the Hunt cap — if it is not. And the cap's
value is derivable rather than chosen: above `H / 540` (the fast lane's length) and well below `H / 78`
(the slow lane's), biased toward the low end if the player should have to press. At `H = 1,620` that is
roughly 4 to 10.

**What would prove it wrong, and what to measure.** How often a player actually lands outside 4–9. If
overshoot past 9 is rare, no cap is needed and this entry stays parked. If it is common — or if players
discover the grind and choose it — the cap is required and the range above sizes it. The first fight
against the Monarch produces this measurement for free: record the final trick count of every Hunt and
plot the distribution.

### The declaration as a free option

**What it is.** The player declares Win or Lose after seeing their own hand, and that single
declaration fixes which card-value scheme and which multiplier table both sides read for the whole
Hunt (`hybrid-design.md`, the direction). Raised 2026-08-11, the session's largest finding.

**Problem it is, not one it solves.** Card strength is an asset on the Win path and a liability on
the Lose path — high cards and trump length help Win, low cards and short suits help Lose — and the
player picks which regime applies with the hand already visible, while the Quarry cannot choose at
all (it always follows the player's own declaration). Worked: a player holding a weak hand declares
Lose, lands on 5 tricks, deals 480, takes 180 — **+300 for holding the worse hand.** A read taken
for free, with no opponent able to answer in kind, is Sid Meier's dominant-option shape (his test
for an uninteresting decision — is there an option that is always correct, never risky) landing on
the newest mechanic in the design.

**What keeps it from being unconditionally free.** Most hands are middling — not obviously good at
either regime — so the read is only worth what the hand actually supports, and that is most hands
most of the time. The roster is already a partial counterweight at zero new rules: the Monarch
forces trick wins (anti-Lose) and the Swan forces trick losses (anti-Win), so two of five characters
already punish one declaration each. Three do not.

**Two mitigations, neither taken.** Declaring before the decree is turned (see Raw, above) cuts read
quality at zero rules but is a discarded branch in the design itself. Sorting the roster so every
character punishes a declaration stays open and costs nothing arithmetically.

**Cost in new rules.** Zero — the finding is about the declaration already built (DLR-63), not a new
mechanic.

**What would prove it wrong.** The measurement `hybrid-design.md` §11 already collects for its own
kill criterion: whether a playtester who declares and watches both pending bars move still reports
the declaration as a coin flip they were not equipped to make, across a small sample rather than
one round.

### The character roster as declaration counterweight

**What it is.** Of the five Quarry characters, exactly two currently punish a declaration: the
Monarch forces the player's Swan or highest card of a led suit, which forces trick wins — an
anti-Lose tool. The Swan forces the lowest card when void, so the player cannot trump in — an
anti-Win tool. Raised 2026-08-11, alongside the free-option finding above, which it partially
answers.

**Problem it solves, partially.** It is the cheapest available counterweight to the free-option
problem above, at zero new rules — the two characters already exist and already do this. What it
does not solve: the Woodcutter, the Fox and the Witch punish neither declaration, so three-fifths of
the roster offers no resistance to a correct read.

**Cost in new rules.** Zero if left as-is. Zero to extend, too, if the extension is a sorting
question ("which existing rule-break reads as anti-Win or anti-Lose") rather than a new rule per
character — that is the open lever `hybrid-design.md` §6 names and does not take.

**What would prove it wrong.** Whether the Woodcutter, the Fox and the Witch's existing round-long
rule-breaks can be read as punishing one declaration at all, or whether the honest answer is
"neither" for all three — in which case the roster is not actually a counterweight for three-fifths
of encounters, and closing that gap needs a genuinely new rule rather than a relabelling of an old
one.

**Superseded on its Monarch claim, 2026-08-12.** The "Monarch forces trick wins — an anti-Lose tool"
reading above is measured wrong by the entry below. The rest of this entry stands; the Swan is
untested.

### Measured: the declaration is a live 50/50 read, and the Monarch tilts it the wrong way

**What it is.** A simulation of the declaration decision run against the built engine rather than on
paper, 2026-08-12. Not an idea — a measurement of two things `hybrid-design.md` §6 and §11 currently
argue about without numbers: whether the declaration is a genuine read, and which way the Monarch
pushes it.

**Method, so the numbers can be re-derived or disbelieved.** The real modules were driven directly —
`dealRound` (so the deck, the shuffle, the 13/13/7 split and the decree-as-trump are the shipped
ones), `playCard`, `legalMoves` and `resolveTrick`, which means the Witch's odd-card trump, the
Swan's lead-steal, the Fox's mid-Hunt decree swap, the Woodcutter's draw and the Monarch's follow
constraint are all live rather than modelled. 2,500 deals. For each deal, every player trick-count
target 0–13 was swept under both declarations with the Quarry best-responding across its own
targets, and the player's worst case against that response was taken — so these are conservative
numbers, not best-case ones. Damage was computed under **this document's pile-swap rule**, not
`src/warCouncil/spoils.ts`, which still ships the retired three-credit mechanic and the retired
Treasure/Poison ±1 (see the drift note below).

**Finding 1 — the declaration is not a free option in the way the entry above fears.** Under base
rules Win is the better call on **50.6%** of deals and Lose on **49.4%**. Committing to one and
never reading is worth almost exactly nothing: always-Win averages **+6** net damage a Hunt and
always-Lose **−4**. Reading correctly averages **+145**; reading wrongly **−142**. The decision
therefore carries a ~**287** swing per Hunt and has no dominant side — which is the property §6's
free-option entry doubts, measured and found intact.

**Finding 2 — the bands are reachable.** On the best line a Hunt lands 4–6 tricks 37% of the time
and 7–9 tricks 39%, so **76% of hands reach one of the two paying bands**. The dead tails are 11%
(0–3) and 13% (10–13). The "most hands are middling and can steer to neither band" worry in the
entry above is real but much smaller than it reads.

**Finding 3 — the best simple decision rule is hand sum against 78, and it is only 73% accurate.**
Sum the thirteen printed ranks; over 78 call Win, under 78 call Lose. 78 is exactly the deck's
average 13-card hand, which is why it is the threshold. Nothing beat it usefully — counts of 9+
cards, counts of 10+ cards and trump length all scored worse alone, and the best combination found
(`sum ÷ 6 + (cards 9+) + trump length`) reached only 75%, which is not worth the arithmetic. **Trump
length alone is nearly worthless at 59%**, barely above a coin flip: it predicts how many tricks you
take, not which band you land in, and only the band is paid. The 73% rule captures roughly **half**
the value a perfect read would capture (+78 a Hunt against +145), so there is real skill headroom
above the heuristic.

**Finding 4 — the Monarch is an anti-Win tool, not the anti-Lose tool the entry above claims.** With
`QuarryCharacter.Monarch` active, the player's average trick count on the best line **falls** from
6.9 to 6.4, the 10–13 band collapses from 13% of deals to **5%**, Lose becomes the better call on
**58%** of deals rather than 49%, and always-Win drops from +6 to **−45**. The mechanism is visible
in `quarryRuleBreak.ts`: the constraint fires when the **Quarry leads**, forcing the player's Swan or
highest card of a suit the Quarry has already committed to — so it burns the player's winners into
tricks the Quarry chose and usually still takes. It strips trick-winning material without handing
over tricks. Consequences: the roster entry above is wrong on its Monarch half; §6's claim that "two
of five characters already punish one declaration each" needs re-checking, because on this
measurement the Monarch and the Swan may punish the **same** declaration; and §11's slice runs its
declaration test on a board already tilted toward Lose rather than a neutral one.

**Finding 5 — an exact identity worth keeping, because it decides what the read is about.** At a
fixed final trick count `k`, the difference between the two declarations is
`24 × [(13−k)·Win(13−k) − k·Win(k)]` — **card values cancel out of it entirely**. Verified against
§8's fourteen-row table at average values. Two consequences. The declaration is a bet on trick count
alone, never on card strength: §6's worked "+300 for holding the worse hand" is +300 for _landing on
5 tricks_, and a strong hand landing on 5 collects the same. And the two value schemes cancel
_because_ `r` and `12 − r` sum to a constant — so if card values are ever wanted as an input to the
declaration itself, the two schemes have to stop being exact complements, which is the same
complementarity §1 calls load-bearing for the same-path rule. Those two wants are in direct
conflict, and nothing currently records that.

**Cost in new rules.** Zero. Every number above measures what is already built.

**What would prove it wrong.** Both sides play a target-seeking heuristic, not solved cards, so the
point values move under stronger play; the structural results (the ~50/50 split, the 76% band
reachability, the Monarch's direction) should not. The cheapest disproof is re-running the same sweep
with a materially better policy on both sides — if the split stays near 50/50 and the Monarch still
lowers the trick count, the findings hold. Findings 1–4 are policy-dependent; **Finding 5 is
algebraic and holds regardless.**

**Drift noticed while doing this, recorded so it is not re-discovered.** `src/warCouncil/spoils.ts`
still applies the Treasure `+1` and Poison `−1` that §1 and §9 record as Decided-removed
(2026-08-11), and still reads `declaration.creditedCards` for the Lose path — the three-credit
mechanic §1 says the pile-swap "replaces outright". The shipped code therefore scores a different
game from the one this document describes. Not fixed here; this is a parking-lot note, not a ticket.

### Worked declaration examples — real deals, for the tutorial and the declaration screen

**What it is.** Nine deals pulled straight out of `dealRound` during the simulation above, three
each for "Win is clearly right", "Lose is clearly right" and "genuine coin flip", kept because a
tutorial cannot teach the declaration from a rule and a UI cannot decide what to surface without
knowing which features actually carry the read. These are observed hands, not illustrative ones
anybody composed. Trump is marked `*`. **Aim** is the trick count the player plays for; **land** is
where the Quarry's best counter actually puts them — the two differ, and the gap is itself a
finding.

**Win is clearly right.**

```
Win +421 / Lose −450    Bells 11 9 8 7 1   |  Keys* 9 8 7 3      |  Moons 9 5 4 1
                        sum 82 · six cards 8+ · 4 trump · aim 4, land 9

Win +455 / Lose −407    Bells 11 9 6 5 4   |  Keys* 11 10 5 3 1  |  Moons 10 9 3
                        sum 87 · six cards 8+ · 5 trump · aim 8, land 9

Win +349 / Lose −455    Bells* 10 9 7 6 5  |  Keys 8 7 5 1       |  Moons 10 8 6 4
                        sum 86 · five cards 8+ · 5 trump · aim 9, land 9
```

**Lose is clearly right.**

```
Lose +353 / Win −479    Bells 11 10 8 6 4  |  Keys* 7 5 4 1      |  Moons 8 6 3 2
                        sum 75 · four cards 8+ · 4 trump, best a 7 · aim 4, land 4

Lose +433 / Win −343    Bells 11 9 7 4 3 2 |  Keys 8 7 3 1       |  Moons* 8 4 2
                        sum 69 · four cards 8+ · 3 trump · aim 3, land 4

Lose +475 / Win −255    Bells 9 5 4 3 1    |  Keys* 8 2          |  Moons 10 9 8 7 5 1
                        sum 72 · five cards 8+ · 2 trump · aim 4, land 4
```

**Genuine coin flip.**

```
Win −174 / Lose −176    Bells* 10 9 5 3 2  |  Keys 8 3           |  Moons 11 10 7 5 4 3
                        sum 80 · five cards 8+ · 5 trump

Win +281 / Lose +275    Bells 11 10 9 2 1  |  Keys 10 6 5 2      |  Moons* 11 10 2 1
                        sum 80 · six cards 8+ · 4 trump

Win +214 / Lose +221    Bells* 10 6 5 3    |  Keys 9 8 1         |  Moons 9 7 6 4 3 2
                        sum 73 · four cards 8+ · 4 trump
```

**Finding A — the reading order is trump, then sum, then high cards, and that is not the order a
player will guess.** Compare Lose-example 3 (five cards of 8+, Lose right by 730) against
Win-example 3 (five cards of 8+, Win right by 804). The high-card counts are identical; the trump
lengths are 2 and 5. **High cards in a non-trump suit are decoration** — they raise what a pile is
worth but cannot take a trick against a ruff, and only the trick count picks the band. Lose-example
3's power is `Moons 10 9 8 7` with trump in Keys, and it gets trumped all round. Lose-example 1 is
the same trap dressed differently: `Bells 11 10 8` over a trump holding whose best card is a 7.

**Finding B — the trap hand is the one that looks obviously right.** A big-card, no-trump hand is a
Lose hand wearing a Win hand's clothes, and it is the most expensive misread available: the three
Lose-clear examples cost −255 to −479 a Hunt if called Win. Whatever the tutorial teaches, it has to
teach this hand specifically, because the naive read on it is confidently wrong rather than
uncertain.

**Finding C — trick counts are sticky in both directions, which is what makes the declaration a
commitment rather than a plan.** Win-example 1 aims for 4 tricks and lands 9; Lose-example 2's Win
line aims for 0 and lands 5. A strong hand cannot stop winning and a weak one cannot stop losing, so
the declaration is better taught as _"read where this hand is going to end up"_ than as _"choose
what you are going to do"_. That is a different tutorial sentence from the one §1's vocabulary
implies.

**Finding D — the coin-flip hands cluster at sum ~80, just over the 78 break-even, and they are the
common case.** All three sit at 73–80 with respectable high-card counts and adequate trump; they
land on 6 or 7 tricks depending on how the Quarry plays. This band is ~41% of deals. A tutorial that
only shows the two clear cases teaches a read the player will then fail to apply to the hand they
are actually dealt most often.

**What this is for, stated so it is not mistaken for a design proposal.** Three consumers. The
**tutorial** needs a hand sequence — the honest order is Win-clear, Lose-clear, then the big-card
no-trump trap, then a coin flip presented _as_ a coin flip rather than as a puzzle with an answer.
The **declaration screen** needs to know that trump length and hand sum are the two features worth
surfacing and that a raw high-card count is actively misleading on its own (§11's slice can test
whether surfacing either is wanted, or whether the read should stay unaided). The **band-position
CPU** (§9's in-scope deliverable) needs the same features to decide when to dump a trick.

**Cost in new rules.** Zero — worked examples of built behaviour.

**What would prove it wrong.** The same policy caveat as the entry above: both sides play a
target-seeking heuristic, so the exact point values move under stronger play. Findings A and C are
structural and should survive; Finding D's ~41% figure is the one most likely to shift. Re-deriving
these needs the harness rebuilt — it was deliberately not left in `src/`, since it asserts nothing
and would cost every `npm test` run ~30s.

### Tekken-style health bar placement — both bars top of screen, mirrored

**What it is.** A placement proposal, and only that: the player's and the Quarry's health bars sit at
the top of the screen as a mirrored opposed pair, in the fighting-game arrangement, rather than as two
independent readouts placed wherever the layout has room. Raised 2026-08-12. The bars themselves and
the pending-damage overlay on them are already decided (`hybrid-design.md`'s direction section, §6) —
**this proposes no rule and changes no number.**

**Three consequences of the arrangement, which is why it is worth an entry rather than nothing.**

- **It hands the prime slot to the slowest-moving number.** Health changes once per Hunt, at trick 13
  — **3–4 times in a whole fast-band encounter.** Pending damage changes every trick, **39–52 times.**
  Tekken's top-of-screen bar moves on every hit; whatever occupies that position here should be the
  thing that actually moves, which is pending, not health.
- **Two bars adjacent carry the fight's rate; the net bar §6 offers as a fallback does not.** §6's
  cheap fallback if four moving figures read as noise is to show only the net — one bar, one
  direction. Combined depletion across both bars is `708` per Hunt at the 6/7 boundary against
  `78–96` at the extremes, the same 7.4×–9.1× spread §5 cites as its stall diagnostic. Side by side
  that is visible: both bars dropping fast is a fight, both creeping is a stall. A net bar shows
  position only. So the fallback is a real loss, not a neutral simplification.
- **`P = H` is what makes the mirror readable.** Equal-length opposed bars turn "who is ahead" into a
  length comparison rather than a subtraction. §5 already asks a future tuning pass to preserve the
  equality for the 6/7 boundary's sake; this is a second reason.

**One borrowable detail.** Pending damage is the fighting-game **recoverable "grey" segment** — damage
recorded but not yet permanent, drawn by lightness on the same bar rather than as a second widget, and
allowed to _shrink_. That last part matters here, since a tenth trick collapses pending from `540` to
`60`, and a shrinking bar segment is established grammar rather than something to invent
([SFV HUD](https://wiki.supercombo.gg/w/Street_Fighter_V/HUD) ·
[Tekken 8 recoverable health](https://steamcommunity.com/app/1778820/discussions/0/597412189643889679/)).

**Cost in new rules.** Zero. The real cost is **vertical space in a no-scroll shell**, priced against
the hand, the trick well, and the always-visible band table `balatro-play-notes.md` §3.1 asks for.
That trade and the layout itself are `game-ux`'s and the developer's, not this entry's.

**What would prove it wrong.** Whether a playtester can say who is ahead without being told, and can
tell a fast Hunt from a stalling one, from the bars alone. If they manage the first but not the
second, the mirrored pair bought nothing over §6's net-bar fallback and the fallback is free to take.

### A fight timer that pays out — and the arithmetic of what it can read off

**What it is.** A clock on the encounter; time left over when the Quarry dies converts to money.
Raised 2026-08-12, alongside the entry above.

**Both halves collide with something, and neither collision is fatal — but they are different
collisions.** The _timer_ half is not new: §9's cap `R` is already exactly this, deferred, with a
derivable range of **3 to 5** Hunts. The _money_ half was rejected — but rejected **as power**
(more health, higher card damage: see Rejected, below, and `hybrid-design.md` §3), and two live rows
already park the noun: §9's overkill row says surplus damage _"may later pay out as cash or
similar,"_ and `balatro-play-notes.md` note 12 records Balatro's `$1` per unused hand with the want
_"efficiency paid for"_ marked open. So the idea's genuine content is narrower and better than "add
money": **attach a graded payout to a cap that already exists, and pick what the payout reads off.**
That last question is the whole entry, and it has a computed answer.

**Finding 1 — the timer is aimed at precisely what round timers were invented for.** The arcade
origin was cabinet throughput, but the reason the clock deserved to survive onto consoles is that a
time limit stops a player who is ahead from declining to fight
([Round Timer](https://streetfighter.fandom.com/wiki/Round_Timer) ·
[why fighting games have timers](https://www.tumblr.com/askagamedev/683427677337747456/why-some-fighting-games-have-a-timer-in-select)).
§5 describes the design's own version in almost those words — the top end is _"unloseable"_ and _"an
unbounded tail a patient opponent can wait out."_ The developer's instinct here is pointed at the
right problem.

**Finding 2 — the cap as written kills a player who is winning, and the fighting-game rule fixes it
free.** On time over, a fighting-game round goes to **whoever has more health**; it resolves the
round on the evidence already on the bars rather than voiding it. The cap does the opposite — reach
it and the run ends. Worked, at the low end of §9's range (`R = 4`) on the `k = 13` line: after four
Hunts the player has dealt 312 and taken **zero**, so the Quarry sits at 1,038 and the player at
1,350. **The player is ahead by 312 and the cap ends their run as a loss.** `k = 12` at the same cap
is ahead 1,302 to 1,062 and loses identically. Changing the cap's resolution from _run ends_ to
_higher bar wins_ costs zero new rules, ends the session just as fast, and stops the guard firing on
the wrong side of the result.

**Finding 3 — a timer measured in Hunts has a resolution of two.** A Hunt is always 13 tricks and
cannot end early, so any clock in game-time inherits the bimodality §5 and §9 both record. Every
winning line on the Win path, at average card values, `H = P = 1,350`:

| Player `k` | Deals | Takes | Hunts to win | Player health left |
| ---------- | ----- | ----- | ------------ | ------------------ |
| 7          | 420   | 288   | 4            | **198**            |
| 8          | 480   | 180   | 3            | 810                |
| 9          | 540   | 96    | 3            | **1,062**          |
| 10         | 60    | 36    | 23           | 522                |
| 11         | 66    | 24    | 21           | 846                |
| 12         | 72    | 12    | 19           | 1,122              |
| 13         | 78    | 0     | 18           | **1,350**          |

The Hunt counts reproduce §9's decided figures exactly (fast band 3–4; tail 18–23, slowest at
`k = 10`). Inside the fast band the count takes **two values, 3 or 4**. A payout on Hunts remaining
against a cap of 4 therefore pays one of two amounts. It is a pass/fail wearing a curve's clothes.

**Finding 4 — health remaining has full resolution and the wrong sign: the grind pays best.** Ranked
by the last column above: `k = 13` (1,350) beats `k = 12` (1,122) beats `k = 9` (1,062). The two
top-paying lines in the game are the **18- and 19-Hunt grinds**, and a legitimate 4-Hunt win at
`k = 7` pays 198 — **6.8× less than the grind.** Paying out on health alone is Soren Johnson's
optimise-the-fun-out landing on the exact tail §5 already calls unbounded.

**Finding 5 — the two halves fix each other, which is why the developer proposed the time term and
why it is load-bearing.** `health remaining ÷ Hunts taken`:

| `k`   | 9       | 8   | 13  | 12   | 7    | 11   | 10   |
| ----- | ------- | --- | --- | ---- | ---- | ---- | ---- |
| Index | **354** | 270 | 75  | 59.1 | 49.5 | 40.3 | 22.7 |

The design's intended peak is now top, at **4.7× the best grind**. Time supplies the sign, health
supplies the resolution, and neither works alone. **The cheaper route to the same place: if the cap
ships at all, no tail line ever finishes, so every 18–23 Hunt grind pays zero by construction and
health-remaining is safe on its own** — one rule instead of two, and it is the cap §9 has already
deferred rather than anything new. Which of the two, and the curve's shape, are the developer's.

**Finding 6 — overkill is `H mod D`, so §9's parked basis is noise dressed as a reward.** The row
that already exists suggests surplus damage might pay out as cash. Overkill is
`D − (1,350 mod D)` — an alignment artifact of how the last Hunt happens to land, not a measure of
anything: `k = 7` overkills by **330** and `k = 9` by **270**, so it pays the _worst_ win in the fast
band **1.2×** the best one, while the grinds pay 18–54. The sign against the grind is right; the
ordering inside the band is close to arbitrary. If overkill is the basis, that should be a stated
choice rather than a surprise.

**Finding 7 — whether this money is a toll booth is decided by the basis, not by argument.** §2's
test is whether the player can diverge between _playing well_ and _advancing the system that
matters_. Under `health ÷ Hunts` they cannot: the money-maximising line is `k = 9`, which is also the
damage-maximising line. Under health alone they can, and the divergent line is the grind. So §2's
objection lands or does not land depending purely on Findings 4 and 5 — the same question, answered
arithmetically instead of by appeal to the earlier rejection.

**The sink is the harder half, and only one candidate survives §1.** Money must never touch
`card value × Standing`; §1's component table forbids a third channel, and health and card damage are
the rejected power branch by name. What passes: **Snare charges** — §3 already certifies the in-round
edit as an intervention on card value, so money buying charges is a _pricing layer over an existing
verb_, not a new term. It is also a fourth candidate answer to §3's blocking problem (the in-round
edit needs a cost, and money makes that cost _earned by prior performance_ rather than traded against
Forage). The stated catch is §3's own: _"if it is bought, that decision is reopened"_ — the no-shop
position. Buying extra Forage edits is the weaker candidate, because §9's test for the budget of 4 is
whether an edit is ever left unspent, and selling a fifth before that is measured is premature.

**One ambiguity this exposes, recorded rather than resolved.** §5 states `k = 7` _"wins the encounter
on Hunt 4 with 486 of 1,350 left."_ 486 is health _entering_ Hunt 4 (`1,350 − 3 × 288`); after Hunt
4's simultaneous application it is **198**. Both are defensible phrasings of the same line, but a
payout reading off "health remaining" pays **2.5× more** under one than the other, so the idea forces
the reading to be pinned. Not fixed here — §5 and §9 own that number.

**Cost in new rules.** One, if the cap is adopted anyway and this only changes its resolution rule and
attaches a payout. Two, if the cap is not taken and the time term has to exist for Finding 5. Plus a
sink, which is where the real rules budget goes.

**What would prove it wrong.** §11's slice already records the final trick count of every Hunt; two
more free numbers settle this — **Hunts to resolve** and **health remaining at resolution**, per
encounter. If the fast band's health-remaining spread is narrow in real deals rather than the 198 to
1,062 the average-value table gives, the payout has no resolution either and collapses to a flat
bonus, which §3 rejects on its own terms. That measurement also decides Finding 2's cap question for
free, since it is the same data the slice collects to size the cap.

**All figures above are at the undoubled multiplier table.** §9's open rounding row notes that
doubling every entry removes the ×0.5 half-point problem and reads health as 2,700; ratios and
orderings here are preserved under that change, absolute numbers are not.

### Skull rank weighting — a curve per opponent

**What it is.** Replaces the uniform "shuffle the Quarry's eligible cards and draw" skull
assignment with one weight table per rank (`SkullRankWeights`, `src/hunt/config.ts`) and ships
four named curves — uniform, ramp, hump, ambush — of which **hump is active**. Landed 2026-08-14
(PT-001).

**Problem it solves.** `the-hunt.md` §3 marks "How skulls are spread across ranks" **[open]**;
today's draw is uniform across ranks 2–11, and play-test 2 §6 names it Q1, "the open question the
game's feel depends on most." The shape readout (§3, "What you are shown, and what you are not")
gives suit and count but never rank — and rank is what decides whether a skull is a threat or a
gift, per §7's outcome table. A uniform draw means the readout tells you where the mines are
without telling you whether any of them are live.

**The mechanism.** One weight table per rank (0 = never, higher = likelier; only the ratios
matter), read by `assignSkulls` through `weightedDraw`, which consumes exactly one `rng` call per
skull so a seeded deal stays reproducible. **Cost: zero new rules.** It replaces the old
`SKULL_MIN_RANK` constant rather than sitting alongside it — "never rank 1" now lives as `1: 0` in
every curve, so the rule is stated once instead of as a floor plus a separate reasoning comment.

**The four curves and what each does to play**, by simulated per-rank skull rate:

- **Uniform** — flat at ~37% across every eligible rank. The shipped behaviour before this
  contract; kept as the curve a shaped one is judged against.
- **Ramp** — climbs 10% → 56% from rank 2 to rank 11. Counter-intuitively the **gentlest** curve: a
  high skull mostly wins its own trick, and a skull trick the Quarry wins is a dodge the player
  gets for free.
- **Hump** — peaks at ~60% on ranks 5–6, light at both ends. **Active.**
- **Ambush** — the ramp mirrored, 57% → 10% from rank 2 to rank 11. The **harshest**: most skulls
  land on cards the Quarry can only lose with, and most of those are eaten with no counterplay.

**Why hump is active.** The extremes remove the player's decision rather than sharpening it. A
very low skull is one the Quarry can only lose with, so it gets dumped into a trick the player has
already committed to winning and is eaten with no counterplay; a very high skull wins its own
trick, handing the player a dodge they did not earn. Only the middle band leaves the outcome to
the card the player actually plays — a skulled 6 loses to a 9 and beats a 4, so who takes the
trick is a choice rather than a foregone conclusion of rank alone. Under hump a rank 5 or 6 in the
Quarry's hand is skulled about 60% of the time against 11% for a rank 10 or 11 — a gap wide enough
to read off the shape panel, and pointed at exactly the ranks where reading it changes what gets
played.

**The curve as a difficulty and variety lever.** The developer's own framing, and the reason the
three inactive curves ship exported rather than deleted: an opponent handed the ambush curve plays
a materially harsher game than one handed the ramp, with **no new rule anywhere** — the same draw
reading a different constant. That is a cheaper axis of opponent differentiation than the
character rule-breaks DLR-81 removed, and it partly answers the question that ticket left open
about what a boss should actually do differently. **Not built here.** Wiring a curve to a specific
opponent needs `Quarry`/`Hunt` to carry a curve and `dealRound` to receive it, which is a later
contract; this one ships the vocabulary — one active module-level curve plus three others sitting
ready — so that later contract has something to select between.

**What rank-weighting cannot fix.** Two cases, both observed in play-test 4
(`the-hunt-play-test-feedback.md` §7.2), where no per-rank curve reaches the problem:

- **Skulls in the trump suit.** A trump wins its trick regardless of what it is up against, so a
  trump skull is near-harmless at any rank — the same "a skull trick you win is a dodge" logic
  that makes hump's high ranks gentle applies to every trump rank at once.
- **A Quarry void in the led suit.** Confirmed independently in §6.5: when the Quarry cannot
  follow suit, whatever it plays is undodgeable regardless of rank. A weighted draw still decides
  which rank the void card carries, but not whether the player had any way to lose that trick.

Shipping this does not read as having solved skull fairness outright — it solves the part that
lives in rank, and leaves these two named as known limitations rather than built around.

**Cost in new rules.** Zero. The type and the four curves replace `SKULL_MIN_RANK` rather than
adding to it; the draw gains a parameter, not a new step.

**What would prove it wrong.** Play a hand under hump and one under uniform. If hump does not feel
more decision-heavy — if the ranks 5–6 spike reads as noise rather than a signal worth planning
around — the middle-band argument is wrong and the curve should revert to uniform, a one-line
change in `src/hunt/config.ts`.

### Replace the rank-sum bank with a trick-count bank — `Σn²` instead of `Σranks × n`

> **The developer settled the shape of this on 2026-08-14, in the same session that raised it.**
> The direction below is chosen, not merely costed; what remains open is tuning. In summary:
>
> - **Damage per streak is `n × n`** — 1, 4, 9, 16, 25, 36. The `n × max(n,2)` variant with its
>   2, 4, 9 opening was considered and dropped, because its second trick paid the same as its first
>   and the compounding did not start until the third.
> - **Both terms stay on screen as an `× ` readout**, and each trick taken adds one to each side.
> - **The two terms are separate quantities that merely start equal.** This is load-bearing, not
>   cosmetic: the developer wants a one-time-use "+1 ×" item, so the shop needs a term to buy.
>   Three in a row is `3 × 3 = 9`; with `+1 ×` it is `3 × 4 = 12`; with `+2` to the left it is
>   `5 × 3 = 15`; with both, `5 × 4 = 20`. If the two can never come apart there is one number on
>   screen and the shop has nothing to modify — `design-principles.md` §8's Chips × Mult note is
>   the precedent, including the reason a build that only ever feeds one term stops working.
> - **Leftover damage converts to money, and is explicitly an extra rather than the economy.**
>   The developer also intends a flat payout for winning an encounter. Problems 1 and 2 below are
>   therefore acknowledged rather than open, and the scaling problem is to be solved by the shop
>   raising the player's damage rather than by growing the income.
> - **Both health totals are to be tuned after playing**, so every win-rate figure below is a
>   consequence table, not a recommendation.

**Status: Worth costing.** Raised by the developer 2026-08-14 after playing the 10/400 build: _"the
damage numbers are pointless, the ones that come from the card values. I can't really do anything
about them, they're either good or bad — the only skill expression I have is keeping the streak
alive."_ Measured against the shipped engine the same day; every figure below comes from simulating
`src/warCouncil` directly, not from arithmetic on the design.

**Method, so the numbers can be re-derived.** A harness drove the real `dealRound` → `playCard` →
`commitQuarryMove` loop. The Quarry is deterministic, so only the player branches, which makes an
_exact_ perfect-information solve possible (≤6! lines per hand). Four player policies were measured
on identical seeded deals:

| Policy        | What it knows                                                                  | Damage/hand (mean, sd) |
| ------------- | ------------------------------------------------------------------------------ | ---------------------- |
| random legal  | nothing                                                                        | 72 (sd 72)             |
| simple greedy | lead card, skull marks, the suit shape readout                                 | 82 (sd 69)             |
| **PIMC**      | **exactly what the screen shows** — own hand, decree, played cards, suit shape | **125 (sd 103)**       |
| ceiling       | the Quarry's actual ranks (not obtainable in play)                             | 223 (sd 123)           |

PIMC = Perfect Information Monte Carlo, the standard trick-taking AI method already recorded in
`design-principles.md` §7: sample opponent hands consistent with what has been seen, solve each,
average. It is the honest stand-in for a strong player, because it is given no information the
screen withholds. A human sits between _simple greedy_ and _PIMC_.

#### 1. The card-value bank is 94% redundant with the streak

Regressing per-hand damage on `Σn²` — the sum of squared streak lengths — gives **R² = 0.938**
across 6,000 hands. The printed ranks account for the remaining ~6%, and that 6% arrives as a
**±20% jitter that no decision controls**:

| `Σn²` | hands | mean damage | sd   | min | max | ratio max/min |
| ----- | ----- | ----------- | ---- | --- | --- | ------------- |
| 2     | 773   | 23.4        | 5.2  | 8   | 39  | 4.9×          |
| 5     | 1251  | 57.2        | 12.2 | 20  | 93  | 4.7×          |
| 10    | 547   | 116.1       | 22.6 | 52  | 176 | 3.4×          |
| 25    | 121   | 298.1       | 45.8 | 180 | 430 | 2.4×          |
| 36    | 93    | 437.7       | 55.2 | 306 | 570 | 1.9×          |

Read the `Σn²=5` row: **every one of those 1,251 hands took the same shape of tricks, and they paid
between 20 and 93.** The developer's read is correct and this is the number behind it.

**The one decision that could have made ranks matter measures as zero.** Because the bank sums both
cards' printed ranks, "win the trick with your highest affordable card" should bank more than "win
with your cheapest". Over 4,000 identical deals: winning cheap **83.7**, winning rich **82.9** —
indistinguishable. Spending the high card early costs the later tricks it would have won, and the
two effects cancel. So there is no rank lever, only rank noise.

**The precise charge is illegibility, not variance.** Dropping the bank barely moves the relative
spread (`Σn²` has sd/mean 0.86 against damage's 0.82). What it removes is the _unattributable_ part:
`Σn²` is fully determined by which tricks the player took, which is a fact on screen and reasonable
about. `Σranks × n` is that same fact times an unpredictable 0.8–1.2. This is `design-principles.md`
§8's Balatro/Mark Brown finding running in reverse — not information hidden but recoverable by
effort, but information _displayed_ and not recoverable at all.

#### 2. "Keep the multiplier, drop the bank" deletes the multiplier — arithmetic, not opinion

The literal proposal — cash out `multiplier` rather than `bank × multiplier` — collapses to a linear
count, because **the streak lengths of a hand partition the tricks taken**. A hand of streaks
{4, 2} pays 4 + 2 = 6; a hand of one streak of 6 pays 6. Measured: mean 3.2/hand, sd 1.1, range
0–6, and identical to "tricks taken" in every hand. The compounding the developer wants to keep is
exactly what this removes.

**The version that keeps the intent** is to leave the equation `bank × multiplier` alone and change
what the bank _counts_ — tricks instead of ranks. The bank then equals the streak length, so a
cash-out is `n × n`, and a hand pays `Σn²`: mean **7.1**, sd 6.1, range **0–36**. Same quadratic
shape, no card values, one term changed. Cost in new rules: **none** — it deletes a rule
(`resolveTrickBank` stops reading `card.rank`).

Variants, if `Σn²` proves too top-heavy — all one-liners, all preserving super-linearity:

| Model       | mean/hand | range | note                                                    |
| ----------- | --------- | ----- | ------------------------------------------------------- |
| `Σn²`       | 7.1       | 0–36  | the direct analogue of the current equation             |
| `Σn(n+1)/2` | 5.1       | 0–21  | triangular — gentler top end                            |
| `Σn(n−1)`   | 4.0       | 0–30  | pays nothing for a streak of 1; a lone trick is worth 0 |
| `Σn²/2`     | 3.3       | 0–18  | halves the ceiling                                      |

#### 3. A small bar throws the top of the curve away

The reason `Σn²` cannot simply be paired with a 10-point Quarry bar: **24% of hands already reach
`Σn²` ≥ 10** under ordinary play, so a quarter of hands one-shot the encounter and every value above
10 is discarded. Overkill waste, and the encounter length it buys:

| Quarry HP | random win | greedy win | PIMC win | hands | damage wasted as overkill |
| --------- | ---------- | ---------- | -------- | ----- | ------------------------- |
| 10        | 63.8%      | 73.3%      | 85.0%    | 1.9   | **36.6%**                 |
| 20        | 33.9%      | 43.5%      | 63.3%    | 2.8   | 25.3%                     |
| 25        | 21.6%      | 28.8%      | 52.3%    | 3.0   | 18.9%                     |
| 30        | 13.8%      | 20.5%      | 42.7%    | 3.3   | 14.1%                     |
| 40        | 6.0%       | 10.7%      | 26.7%    | 3.6   | 7.3%                      |

At 10 the multiplier stops being legible for the second time — a streak of 4 (16) and a streak of 6
(36) both simply win, so the curve's whole upper half is invisible. **The bar has to be large enough
that the top of the range still buys something**, which is the same requirement the current 400
satisfies by accident. The value is the developer's; the constraint is that it interacts with the
`Σn²` ceiling of 36.

**What would prove this idea wrong.** If `Σn²` plays as _flatter_ than `Σranks × n` — if the numbers
being small enough to predict makes the cash-out unexciting rather than readable — then the jitter
was doing work as spectacle and the finding above mistook noise for a defect. The cheapest test is
one encounter under `Σn²` with the Quarry sized from the table, judged on whether the player can
say what the next cash-out will be _before_ it fires.

#### 4. Leftover damage as money — what it can and cannot be

Measured the same day, on the `n × max(n,2)` table; the shape of the finding is unchanged under
`n × n`, which pays slightly less per hand (mean 7.2 against 8.1).

**Overkill can only ever happen on the cash-out that kills.** Damage lands per cash-out, several per
hand, so spare damage only exists once the bar is nearly empty. Measured across encounters, at every
Quarry size from 10 to 60, **only ~0.8 cash-outs per encounter produce any money at all** — out of
2.9 (at 10 HP) to 6.6 (at 60 HP). A 36-payout hand in the first hand of a three-hand fight earns
nothing; it is simply damage.

Its distribution at Quarry 20 is the rest of the finding: **19% of wins pay 0**, a further 25% pay
exactly 1, the median is **2**, the mean is 4.8, and the maximum is 35 — so the mean is carried
almost entirely by a ~3% tail. As an income that is a scratchcard rather than wages; nothing can be
saved against it.

**It also does not scale**, and cannot: money per encounter sits flat at **4–6** whether the Quarry
holds 10 HP or 60, because it is the overshoot of one cash-out and the overshoot is set by the payout
distribution rather than by the bar.

Both facts are **accepted** — the developer's plan is a flat payout for winning plus shop items that
raise the player's damage, with leftover damage as a bonus on top. Recorded because the numbers say
what the bonus is worth, and "median 2, nothing at all a fifth of the time" is the figure to hold it
against once the shop exists. The alternative that was costed and not taken: a fixed share of
_every_ cash-out, which pays 2.7 → 14.8 per encounter at 25% as the Quarry grows 10 → 60, fires on
every streak, and scales without help.

#### 5. How Balatro pays the player — the reference for the flat payout

Gathered 2026-08-14 to answer the developer's question directly; sources are in
`design-principles.md` §8.

| Source                     | Amount                                                                |
| -------------------------- | --------------------------------------------------------------------- |
| Beating a blind            | **$3** Small, **$4** Big, **$5** Boss — **and this never scales**     |
| Hands not used             | **$1 each** (four hands a blind, so up to $3 kept by finishing early) |
| Interest                   | **$1 per $5 held, capped at $5** (vouchers raise the cap)             |
| Selling a Joker            | half its cost                                                         |
| Money Jokers               | e.g. Golden Joker, +$4 a round                                        |
| Skipping a Small/Big blind | a Tag instead of money, and the shop is forfeited                     |

Three things worth keeping:

- **The flat reward genuinely does not scale.** $3/$4/$5 in Ante 8 as in Ante 1, against blind
  requirements that climb 300 → 100,000. This is direct support for the developer's position that a
  non-scaling flat payout is fine; Balatro solves growth on the _build_ side, not the income side —
  which is exactly the plan here.
- **Interest is where the late economy comes from**, and it is the source of the only real decision
  in Balatro's shop: holding cash earns cash, so every purchase costs more than its price. If the
  shop here ever feels like a vending machine rather than a choice, this is the missing piece.
- **"$1 per unused hand" is the device that rewards playing well**, and it is a better model for
  this game than overkill is: it fires every single round and the player can see it coming. The
  analogue here is money for **hands the encounter did not need** — which rewards the same thing
  overkill was meant to reward, because a long streak kills faster, but reliably rather than only on
  the killing blow.

### Two-thirds of this game's skill is locked behind the Quarry's hidden ranks

**Status: Worth costing.** Measured 2026-08-14, from the same harness. Not a proposal — a diagnosis
that should be settled before any tuning pass, because it explains the "it feels like RNG" reading
that prompted it.

The policy ladder above splits the skill headroom in two:

- **available** — what a strong player can gain using only what the screen shows:
  `PIMC − random = 125 − 72 = **53** damage/hand`
- **locked** — what remains reachable only by seeing the Quarry's ranks:
  `ceiling − PIMC = 223 − 125 = **97** damage/hand`

So **65% of the total skill span in a hand is unreachable in principle**, and the deal's own spread
at strong play (sd **103**) is **twice** the entire available span. Two consequences:

- **Random out-damages strong play on 22% of the same deals.** Roughly one hand in five pays the
  player less for playing well, which is `design-principles.md` §3's input/output-randomness test
  failing in the way that matters: the player loses to the system rather than to their decision.
- **At perfect play a hand still pays between 4 and 522.** The deal, not the decision, sets the
  scale of a hand.

**The encounter, however, is not RNG at all** — and this is the reframing the diagnosis turns on.
At 10 v 400: random wins **10%**, simple greedy **15%**, PIMC **49%**. A 5× separation in win rate
from the same information. So skill decides the _encounter_ while noise decides the _hand_.

**Therefore the complaint is a feedback problem, not a randomness problem.** The skill signal needs
about three hands to clear the noise, and the encounter is 3.3 hands long — so it resolves exactly
as the run ends, and the player never sees evidence that their play mattered. Sid Meier's
"invisible consequence" (`design-principles.md` §2) is the exact failure: the consequence is real,
large, and imperceptible at the frequency the player experiences it.

**What connects this to the bank.** The card-value jitter is not the largest source of noise, but it
is the only source that is _pure_ noise — every other one (the deal, the trump, the skull placement)
is at least something the player can read and plan against. Removing it does not make the game less
random; it makes the randomness attributable, which is what a feedback problem needs.

**What would prove it wrong.** Two cheap measurements, both from one session:

1. Before each cash-out fires, write down what you expect it to be. If you are inside ±20% most of
   the time, the number is legible and the illegibility finding is wrong.
2. Log tricks-taken and damage for every hand of one encounter. If the hands you judged well-played
   are the high-damage hands, the signal is reaching you and the feedback finding is wrong.

A third, if it is ever worth the effort: raising the telegraph's fidelity toward showing rank
information would convert part of the locked 97 into available skill. That is a design change with
its own costs and is not proposed here — only the fact that the headroom exists is.

### The shop and the payment system — what the live equation can actually sell

**Status: Worth costing.** Opened 2026-08-14 at the developer's request ("start designing the shop
and the payment system"), read against the game **as it stands after PT-002**, not against the
retired `card value × Standing` design. Nothing here is decided; prices, health curves and item
counts are the developer's.

**First, a documentation correction, because the shop's standing rejection is void.** The Rejected
entry below (_Money, a shop, and permanent cross-run upgrades_, DLR-64) says its reasons are
"unchanged by the direction". That was true on 2026-08-11 and is **not true now.** Three of its four
reasons cite `hybrid-design.md` §1's component table, which forbids any device that is not an
intervention on **Spoils** or **Standing** — and DLR-80 deleted both terms from the game. The fourth
cites §3's Demand curve, which is also gone. So the shop is not being re-litigated against a live
argument; the argument's subject no longer exists. **The spirit survives and restates cleanly for the
live equation**, and the restatement is what gives the shop its whole vocabulary:

> Every purchase must be an intervention on **the bank**, **the multiplier**, or **which tricks you
> take**. Anything else is a third channel.

Everything below is derived from that one line.

#### 1. There are exactly two growth classes, and the design already has the fields for both

Write the general cash-out. Let the bank climb by `b` per trick taken and the multiplier by `m`, with
flat starting values `B` and `M`. Today `b = m = 1` and `B = M = 0` (`src/warCouncil/bank.ts` —
`resolveTrickBank` adds a literal 1 to each). A streak of `n` then cashes:

```
(b·n + B) × (m·n + M)  =  bm·n²  +  (bM + mB)·n  +  BM
```

- **Buying a rate (`b` or `m`) multiplies the `n²` coefficient.** It is the quadratic class.
- **Buying a flat (`B` or `M`) adds a linear term.** It is the linear class.
- **Buying both rates multiplies them together** — `b = m = 2` is `4n²`, not `2n²`.

That last line is `Chips × Mult` reproduced exactly, and it is the real justification for keeping the
two terms apart. **The stated justification is weaker than the true one, and worth correcting.** The
direction note above records the reason as _"the developer wants a one-time-use `+1 ×` item, so the
shop needs a term to buy."_ But a one-time `+1` to the **multiplier** and a one-time `+1` to the
**bank** both pay `+n` — they are the **same item with two names**, because the two terms are
symmetric in the product. A one-time flat item does **not** need two terms. **Rate items do**, and
they are the ones that compound. Keep the split; keep it for the rate items.

Worked, at the streaks a six-trick hand actually produces:

| Purchase                         | Class     | Streak 3 | Streak 6 | Mean/hand vs base |
| -------------------------------- | --------- | -------- | -------- | ----------------- |
| _(base — `b = m = 1`)_           | —         | **9**    | **36**   | **7.1**           |
| `+1` bank, one-time-use per hand | linear    | 12       | 42       | ~9 (+28%)         |
| `+1` multiplier, one-time-use    | linear    | 12       | 42       | ~9 (+28%)         |
| `B = 1` (bank starts at 1)       | linear    | 12       | 42       | 10.3 (+45%)       |
| `b = 2` (bank climbs 2/trick)    | quadratic | 18       | 72       | 14.2 (+100%)      |
| `m = 2`                          | quadratic | 18       | 72       | 14.2 (+100%)      |
| `b = 2` **and** `m = 2`          | quadratic | **36**   | **144**  | 28.4 (+300%)      |
| hand size 7 (max streak 6 → 7)   | quadratic | —        | **49**   | not computed      |

Mean/hand figures use the measured baseline `Σn² = 7.1` and `Σn = 3.2` tricks taken per hand (both
from the PT-002 harness, above). A flat bonus applied to every cash-out is worth `Σn` = **+3.2**; a
rate doubling is worth `Σn²` = **+7.1**.

**The pricing constraint that falls out, and it is not a tuning value.** A rate purchase beats a flat
purchase at every streak length ≥ 2 and ties at 1 — `n² ≥ n` always. So **if the shop prices the two
classes comparably, the linear class is dominated and nobody buys it** (Meier's dominant-option test,
`design-principles.md` §2, failing on the price list rather than on a rule). Balatro survives the
identical problem by making `+Mult` common and cheap and `×Mult` rare and expensive. Here the whole
payout range is 1–36 — **one order of magnitude, against Balatro's 333× across eight antes** — so
there is far less curve for two growth classes to separate on, and the price ratio has to be tight.

**A consequence for the one-time item specifically.** A one-time `+1` is worth ~`+2` damage on a mean
7.1 hand. Against the current Quarry's **10** health that reads as significant; against any Quarry
sized so the top of the payout table is visible (`Σn² ≥ 10` occurs in 24% of hands — measured above)
it is noise. The item is legible today largely because the bar is small.

#### 2. The strongest thing to sell is not either term — it is the reset

Damage is quadratic in streak length, so merging two streaks pays the **cross term**: `a² + b²`
becomes `(a+b)² = a² + b² + 2ab`. The gain is `2ab`, and it is bought by nothing in either term.

| Hand's streaks | Pays | Merged  | Gain    |
| -------------- | ---- | ------- | ------- |
| {2, 2}         | 8    | {4} 16  | **+8**  |
| {3, 2}         | 13   | {5} 25  | **+12** |
| {3, 3}         | 18   | {6} 36  | **+18** |

An item reading _"the first time you take damage each hand, the multiplier does not reset"_ is
therefore worth up to **+100% on a specific hand**. On the population it is less, and it can be
bounded rather than guessed: removing **every** reset makes a hand pay `T²` where `T` is tricks
taken, and `E[T²] ≥ (E[T])² = 3.2² = 10.24` against the measured 7.1 — so removing all resets is
worth **at least +44%**, and removing one is worth less than that. **It is comparable to a flat
adder, not to a rate doubling** — which is the opposite of what the per-hand worked cases suggest,
and is why the population figure has to be stated next to them.

**One trap, stated because it is easy to ship by accident.** Taking damage does two things —
`1` health **and** the reset (`the-hunt.md` §7). An item that cancels both is two benefits at one
price, and it is the item most likely to make losing a trick feel free, which is the whole tension
§7 built. If this is sold, sell the reset and keep the health.

#### 3. Information is cheaper than it looks, and it is the item that fixes the known complaint

The measurement is already above (_Two-thirds of this game's skill is locked behind the Quarry's
hidden ranks_): available skill `PIMC − random = 53`, locked skill `ceiling − PIMC = 97`, so **65% of
the skill span is unreachable in principle**.

**Those figures are in the retired rank-sum unit and must not be compared to `7.1` directly** — that
comparison would overstate the case by an order of magnitude. Converted to a ratio, which does carry
over: locked headroom is `97 / 125` = **~78% of a strong player's typical hand**. So full sight of the
Quarry's hand is worth slightly **less** than one rate doubling (+100%), and an item revealing *one*
card is worth a fraction of that.

The conclusion reverses the intuition and is the useful part: **information items are a cheap tier,
not a premium one** — and they are the only tier that addresses the diagnosis those measurements were
taken for, that the "it feels like RNG" reading is a feedback problem rather than a randomness
problem. The shop is the natural place to convert locked skill into available skill, one purchase at
a time, which is a thing no arithmetic item can do at any price.

Candidates, all reusing built machinery: raise `TELEGRAPH_FIDELITY` for the run; reveal one of the
Quarry's ranks per hand; reveal which rank carries a skull (the shape readout deliberately withholds
exactly this — `the-hunt.md` §3).

#### 4. Two things the shop must not sell

- **Anything that reduces skull density.** The skull is the game's only inversion — it is what stops
  "take every trick" being correct (`the-hunt.md` §7). Selling `SKULL_DENSITY` down from 2-of-6
  removes decisions rather than adding power, and it is the exact analogue of selling "the Boss Blind
  does not apply."
- **Player health, if health becomes the currency** (§5 below). It would be both the resource and the
  thing bought with it. It is also the branch already rejected by name as *power* rather than
  *options* (`hybrid-design.md` §7).

#### 5. The payment system — four bases, and two of them fail on incentive rather than on size

The size question is already answered in _Leftover damage as money_, above. What that entry does not
test is **whether the money-maximising line is the damage-maximising line** — `hybrid-design.md` §2's
toll-booth test, which is decided by the basis and not by argument.

| Basis                          | Scales?            | Fires                    | Money line = damage line?         |
| ------------------------------ | ------------------ | ------------------------ | --------------------------------- |
| **Overkill** (surplus damage)  | No — flat 4–6      | ~0.8× per encounter      | **No — it inverts it.** See below |
| **Flat payout for winning**    | No (fine — see §5) | once per encounter       | No signal either way              |
| **% of every cash-out**        | Yes — 2.7 → 14.8   | every cash-out           | **Yes**                           |
| **Health remaining** _(new)_   | With the curve     | once per encounter       | **Yes**                           |

**Overkill inverts the incentive, and this is new.** To maximise overkill you want the *killing*
cash-out to overshoot as far as possible — so you want to arrive at 1 remaining HP and then land a
36. Worked against the current Quarry's 10: chip it to 1 with streaks of {2, 2, 1} (4 + 4 + 1 = 9),
which costs **3 breaks = 3 of your 10 health**, then take a clean hand for 36 → **overkill 35.**
Playing to kill fast instead — one streak of 4 for 16 into a 10-point bar — overkills by **6**. The
perverse line pays **~6× more** and costs 3 health of 10. So overkill as income pays the player to
**break their own streaks**, which is precisely the skill the developer named as the only one the game
has (_"the only skill expression I have is keeping the streak alive"_). That is Soren Johnson's
optimise-the-fun-out (`design-principles.md` §2) landing on the economy. It survives as a *flourish*
— a number that appears when it appears — and fails as a *basis*.

**Health remaining is the honest analogue of Balatro's `$1 per unused hand`, and it is not yet in this
file.** The entry above already identifies that device as the better model than overkill, and names
the analogue as "money for hands the encounter did not need". The tighter analogue is **health**: a
break costs exactly 1 health, so health remaining *is* a count of streaks not broken. It pays for the
one skill the game has, it fires every encounter, it is a number already on screen throughout, and it
needs no new quantity. Two things to watch: it is a **slippery slope** (play well → more money →
stronger build → play better — `design-principles.md` §3, the same slope Balatro runs), and it turns
`ENCOUNTER_PLAYER_RESTORE = 0` into a load-bearing decision rather than a placeholder, since health
would then be survival *and* wages at once.

**Interest is probably not worth its rules here, and that is cheap to establish.** The entry above
calls Balatro's interest _"where the late economy comes from"_ and _"the only real decision in
Balatro's shop."_ It compounds over roughly **24 shop visits** in a Balatro run. A five-encounter run
gives **4–5 visits**. `$1 per $5 held` across four visits cannot compound into a decision; the
decision it is wanted for has to come from somewhere else (a reroll price, or few items well chosen).

**Scale, so a price list has a frame.** At 25% of every cash-out the measured income is **2.7 per
encounter** at Quarry 10. Adding a Balatro-shaped flat win payout (**$3–$5**) gives roughly **6–8 per
encounter**, so **~30–40 per run** of five. Items priced at 5 buy **6–8 purchases a run**, against
Balatro's 15–20. Thin but workable; it tightens if the flat payout is smaller.

#### 6. The blocking dependency: there is no run, so there is nothing to price against

`QUARRY_ENCOUNTER_HEALTH` holds **one** entry, `[10]`, and `ENCOUNTERS_PER_RUN = 5` has no consumer
(`the-hunt.md` §10 — the run is **[not built]**). A shop with one visit and no escalating opponent is
a vending machine: nothing is being prepared for.

**This is the same problem as §1's, and that is the connection worth acting on.** §1 says the design
has no growth-class distinction; this says it has nothing to grow *against*. Balatro's shop is
interesting because the requirement climbs `×2` per ante while the engine climbs multiplicatively —
neither half is interesting alone. Here:

- **The Quarry-health curve across the five encounters is the requirement curve**, and it is what
  prices every item in the shop.
- **A run's shop can raise damage by roughly the product of the rates bought.** With two rate slots
  reachable in one run, that is a ceiling near **4×** (`b = m = 2`). So an encounter-5 Quarry more than
  ~4× encounter 1 is unclearable, and much less than that is a shop that changed nothing.

Both numbers are the developer's. The ordering is not: **run and health curve first, shop second.**

#### 7. Where this leaves Forage and Snare — one clean division, at no cost

Three layers already exist on paper, and PT-002 accidentally sorted them. Since a card's rank now
decides **only who wins a trick** (`the-hunt.md` §7), a Forage *value* edit is no longer a damage edit
at all — it is a trick-winning edit. So:

| Layer      | When            | Intervenes on           | Answers                    |
| ---------- | --------------- | ----------------------- | -------------------------- |
| **Forage** | between fights  | **which tricks I take**  | what my deck is            |
| **Shop**   | between fights  | **what a trick pays**    | what my engine is          |
| **Snare**  | mid-hand, spent | which tricks I take, now | what I do right now        |

No overlap, both feeding one equation. This is `forbidden-solitaire.md` §6's Gems/Jokers split with a
third row, and it is the division the two existing docs were reaching for separately.

It also closes a stated blocker for free, which the _fight timer_ entry above already spotted: Snare
is **[open], blocked** because "raise the value of the card I am about to win with" is dominant until
it has a cost (`the-hunt.md` §10). **Money is that cost**, and it is a cost *earned by prior
performance* rather than traded against a Forage edit.

**Cost in new rules.** The vocabulary itself: **zero new terms** — `bank` and `multiplier` are already
two fields, and rate/flat are readings of numbers `resolveTrickBank` already writes. Then one currency,
one payout rule, and one shop screen. The rules budget goes on the item list, and every item above is
an intervention on an existing quantity rather than a new one.

**What would prove this wrong.**

1. **Price-list dominance.** If the linear class is never bought once a rate item is on the shelf, the
   two classes are not separable at this scale (§1's one-order-of-magnitude problem) and the shop
   should sell one class plus structural items only.
2. **Legibility.** PT-002's whole claim was that `n × n` became predictable. Log whether the next
   cash-out can still be called *after* two or three items are stacked. If not, the shop bought damage
   by spending the thing PT-002 was for.
3. **The reset item.** If _"first break each hand doesn't reset"_ makes losing a trick feel free, §7's
   tension was carried by the reset and not by the health point.
4. **Unspent money.** If money is left over at the end of a run, the sink is thinner than the income —
   which is the failure mode a five-visit shop is most exposed to.
5. **Health as wages.** If it is taken, measure whether players start declining risky lines to hoard
   currency. That is the slippery slope showing up as caution rather than as power.

---

### The buff persistence ladder — a shared vocabulary for classifying any new mechanic

**Status: Worth costing.** Opened 2026-08-17 at the developer's request, after a Balatro session
raised the cross-run question: _"we should categorise the buffs in a language we can both understand,
so when I come up with an idea it falls into one of these categories."_ This entry is a
**classification scheme, not a mechanic** — it costs zero new rules and decides nothing. Every
example below is invented to illustrate a rung; none is a proposal, and no number in one is a chosen
value.

#### The question it answers

A buff has three independent properties, and the design has vocabulary for only two of them. The
shop entry above owns both of those: **what it intervenes on** (the bank, the multiplier, or which
tricks you take — anything else is a third channel) and **how it scales** (rate purchases multiply
the `n²` coefficient, flat purchases add a linear term). The missing third is **how long it lasts**,
and it is the one that sets what a thing is worth to buy. Answer all three and most of the balancing
question answers itself.

#### The four rungs

**One-time use.** You hold a charge, you spend it, the effect resolves, it is gone. The decision it
creates is _when_ — never _whether_, because the player always wants the effect eventually. That
makes it the natural home for anything strong enough that having it always-on would be broken.
Scarcity does the balancing, so the tuning knob is how many you hold and how easily one is replaced.

> _Example — **Turncoat**._ Spend it as you commit a card, and that card's suit becomes the new trump
> for the rest of the hand. Enormous, obviously worth having, and the whole game of it is nerve:
> burn it on trick two to rescue a bad opening, or hold to trick ten when you can see what the Quarry
> has left. Built from the Fox's shape rather than a new device.

**Fight-long.** It switches on when a hand begins and expires when the hand ends. The decision it
creates is _commitment_ — chosen with the decree turned and your opening thirteen in hand, then lived
with for the whole hand. Buffs here can safely be larger than a one-time use, because they are paid
for by the hands where the board does not suit them.

> _Example — **Quarry's Trail**._ At the start of a hand you name a suit. Tricks you take in it climb
> the bank faster; tricks you lose in it break the streak and cost extra health. You are reading your
> own thirteen against the decree and betting on a lane, and a hand where the Quarry holds the top of
> your named suit is a hand you chose to make harder.

**Run-permanent.** It lands once and keeps working until the run ends. This is the build. Everything
on this rung accumulates with everything else on it, so by the last fight the player is operating a
machine they assembled rather than the one they started with — the feeling that makes a run a run
rather than a series of matches. The decision it creates is _direction_: each pick narrows what the
rest of the run is about. **Spending something to reach this rung does not move it off the rung** —
what places a buff here is how long the change lasts, not how it was paid for. Forage is the
intended occupant and is the clearest case of exactly that: a budget spent down, buying edits that
persist to the end of the run.

> _Example — **Keen Eye**._ For the rest of the run, skulls show one more band of rank detail than
> they otherwise would. It never fires, never triggers, never asks anything — it quietly improves
> every read for the remainder of the run. Included because it is not a card edit: this rung is
> wider than deck-editing.

**Game-permanent.** It survives the run ending. Two entirely different shapes live here and choosing
between them is a design decision, not a detail:

- **Stacking** — every unlock applies at once and forever, so the game measurably eases the longer it
  is played. Dead Cells: starting health, flask charges, forge quality and runes all live
  simultaneously.
- **Pick-one** — unlocks enter a list the player chooses exactly one from at the start of a run, so
  the pool grows and the power does not. Balatro's decks: a two-hundred-hour player still starts with
  one modifier, same as a fresh one.

> _Example, stacking — **Trophies**._ Every tenth Quarry felled raises starting health by two,
> permanently and cumulatively, across all future runs.
>
> _Example, pick-one — **Hunting Grounds**._ One ground chosen per run: one starts you holding a
> Cheat, one starts you with Forage budget already banked, one keeps the decree face-down until
> trick three. Finishing runs unlocks more grounds; you still take exactly one, forever.

`hybrid-design.md` §7 rejects **stacking** for the growth-class reason and leaves **pick-one** open.
That distinction is the whole reason Balatro can hand out real starting power without dissolving its
own test — see the corrected reading in `balatro.md` §1.11.

#### Cutting across all four — number or rule?

A **number-buff** moves a value and hands you a dial you can turn in any increment. A **rule-buff**
suspends or rewrites something the game otherwise forces on you; it is binary, so its size cannot be
tuned, only its frequency.

> _Example of the pair._ Making a Keys 6 worth 8 is a number — too strong and it becomes 7, too weak
> and it becomes 9. Lifting follow-suit is a rule; there is no two-thirds of a follow-suit break, so
> the only adjustable quantity is how many the player gets. This is why the open question on Cheats
> is "one or two" and can never be finer.

Any idea can sit on any rung, but **rule-buffs should get scarcer as they climb** — a rule that can
be broken permanently and for free is not a rule any more.

#### The shape this replaced, and why

The first cut was three buckets: single-use, run-permanent, game-permanent. It breaks on the first
real object in the game. A Cheat is one use and then gone, and it also rides in its slot from fight
to fight for the whole run — both at once. The cause is two independent questions stacked into one
list: _is the token consumed when used_, and _how long does the change it makes last_. They come
apart in every direction — a Balatro Tarot is consumed instantly and its enhancement lasts the run; a
Joker is never consumed and also lasts the run. Only the second question makes a ladder; the first is
a property each rung can carry either way.

`hybrid-design.md` §4's two-layer table has the same conflation in miniature — its **Persists**
column reads "For the run" for Forage and "Spent on use" for Snare, which are answers to different
questions. That is a documentation fix to make if this scheme is adopted, not an argument against
either layer.

#### Where The Hunt sits, as an inventory

One-time use is occupied. Fight-long is **empty**. Run-permanent is designed and unbuilt. Game-
permanent is deliberately empty with the pick-one door open. Two of four rungs are unclaimed, and
fight-long is the one that costs nothing in the cross-run argument.

#### What would prove this wrong

1. **A buff that will not classify.** If a mechanic the design wants lands on no rung, or on two, the
   ladder is the wrong axis and the write-up should be corrected rather than the mechanic bent.
2. **The rungs not pricing differently.** If a fight-long buff and a run-permanent buff end up worth
   the same in coins, duration is not doing economic work and the scheme is decoration.
3. **Fight-long staying empty on contact.** If every candidate for that rung reads better as
   one-time-use or as run-permanent, the empty cell is empty for a reason and should be recorded as
   discarded rather than as an opportunity.

---

### The Feeder carry, and a High/Low vocabulary that stops describing the wrong axis

Decided in conversation 2026-08-26, out of a question about what happens when a Bell-Feeder fires on
a skull trick. Two changes that turned out to be one problem: the game's outcome words describe the
mechanical act, and the Feeder's reward is spent by the very loss it is meant to compensate.

**The confusion that started it.** The Quarry plays a skulled 5 Bells, the player plays a 2 Bells,
holding a bronze Bell-Feeder. What the game says today is *"you lost the trick, it was a dodge, your
Feeder — lose a trick with Bells — fired."* Three of those words point the wrong way: the player
lost, the card is a Feeder, it fired on a loss, and yet nothing bad happened and they gained a bank
point and a multiplier point. At roughly 30% skull density that is about two of six tricks a hand —
a third of the player's decisions sit in the quadrant where the words invert.

**The root cause is two axes wearing one vocabulary.** There is a mechanical axis — did you
physically take the cards — and an outcome axis — did you gain or get hurt. Every buff condition
reads the mechanical axis; the bank, the multiplier and the damage all read the outcome axis. Both
are currently called win and lose, so the words collide exactly where the skull decouples them.
This is the second instance of one root problem: `hybrid-design.md` §10 already records that the
band names Humble / Defeated / Victorious / Greedy came from Fox in the Forest and misdescribe the
mirrored path, and the 2026-08-11 decision was to note the mismatch and leave it. Both are base-game
outcome words imported into a game that inverts the outcome.

#### The vocabulary — Victory / Defeat, with High and Low naming the act

> **Shipped by DLR-165, 2026-09-03.** The vocabulary below is live in the code, on the resolution
> screen, in `the-hunt.md` and in `CLAUDE.md`. The Feeder carry described in the next subsection
> shipped separately on DLR-150.

Revised in conversation 2026-09-03, after the developer hit the collision live. The version of this
section written on 2026-08-26 kept Win and Loss as the outcome words and added High and Low
alongside them. That reuses the two words that caused the problem: "win" reads as *taking the cards*
whatever the ruleset declares it to mean, so a card printed "win a trick with Bells" still looks
like it should fire on a dodge. The outcome words change too.

**Victory and Defeat name the outcome, and nothing else.**

- **Victory** — the trick banks. You went high on a clean trick, or low on a skull.
- **Defeat** — the trick hurts. You went low on a clean trick, or high on a skull.

**High and Low name the mechanical act — whether you physically took the cards — and are the only
words a buff card uses.** They do not replace the outcome word, they qualify it, so every trick has
one unambiguous four-way name:

| | Clean trick | Skull trick |
|---|---|---|
| You went **high** (took the cards) | **High Victory** — banks | **High Defeat** — ate the skull |
| You went **low** | **Low Defeat** — the clean loss | **Low Victory** — the dodge |

A Victory adds the trick's damage to `total` and climbs `roll` by one. A Defeat costs 1 health and
zeroes both, and the Quarry is paid nothing — per DLR-156, which removed the two-thirds consolation
that the 2026-08-26 version of this table quoted.

**Why this fixes the card that started it.** The developer's live case: a skulled 5 taken by the
Quarry against a played 1, with a Bell-Taker armed. The screen said **Dodge**, told them it banks and
costs nothing, and then listed *"Bell-Taker — needed: win a trick with Bells"* as unmet. Both
statements are true and they contradict each other in plain English. Under this scheme the readout
says **Low Victory** and the card says **"Go high on a Bells trick"** — the player went low, so the
card plainly did not fire, and the trick was plainly still good for them. The two facts stop
competing for the same word.

**A buff condition never names Victory or Defeat**, because no buff condition reads that axis. This
is the rule that keeps the two vocabularies from re-merging: the moment a card's text can be read as
being about the outcome, the collision is back.

The family words fall out of the scheme, which also fixes "Feeder" meaning nothing: Bell-Taker
becomes **Bell High**, Bell-Feeder becomes **Bell Low**, Sidestep becomes **Skull Low**. The whole
live pool reads as three suits crossed with high/low, plus skull-low. Card text becomes *"go high on
a Bells trick"*, *"go low on a Bells trick"*, *"go low on a skull"* — and Sidestep's text is true for
the first time, since it never looked at which card was played.

**The resolution headline becomes the four-way name.** Where the screen says *Dodge* today it says
*Low Victory*, because the headline is the one place the player reliably reads both axes at once.
Dodge, ate the skull, and the clean pair survive as flavour in the sentence underneath — *"they took
it, and it carried a skull — so it banks, and costs you nothing"* — which is where a colour word
belongs and a load-bearing one does not.

**The one place it strains** is that "high" is not literally the higher rank — a trump 3 takes a
trick over an 11 Bells, and an off-suit 11 takes nothing. Either define it as the contest rather
than the number (*the card that takes the trick went high, trump included*), or let a pre-commit
hover string carry it: hovering an off-suit 11 reads `goes LOW`, and the player learns it in one
trick without being taught. The hover is preferred — the word only has to be right on the readout,
not in the player's head.

#### The Feeder carry

**What is actually wrong today, and it is not the two-thirds reduction.** Flat damage is added
outside the product, after the reduction, so a bronze Feeder pays its full +1 even on a catastrophic
loss. The real defect is that the reward is *consumed* by the same losing cash-out that triggered
it, paid into a pot that is near zero precisely because the player just lost. Three deliberate
losses in a bad hand pay three separate points into three tiny cash-outs and accumulate into nothing.

**The rule.** A Feeder that fires on a **Low Defeat** does not join this hand's pool. Its reward
goes into a carry pool which seeds the next hand's pool. A Feeder that fires on a **Low Victory** —
the dodge — pays into the current hand exactly as it does now, and stacks with everything else that fired,
including the Overlap Bonus. So the card pays now when you got away with it, and pays later when you
got hit.

```
HAND 1 (going badly, bronze Bell Low active)
  trick 2 · Low Defeat · fires → carry +1
  trick 4 · Low Defeat · fires → carry +2
  trick 5 · Low Defeat · fires → carry +3
  hand 1 pays out nothing from the Feeder

HAND 2
  opens with +3 already banked — spent when the player chooses,
  at full rate via Apply Damage or at hand end
```

**The carry evaporates at the fight boundary** — decided 2026-08-26. It compounds hand to hand
inside a fight, where there is deliberately no cap on hands, so three bad hands open the fourth at
+9. It does not survive the fight, whether the fight was won or lost. This keeps the carry the
first and only value crossing a hand boundary without also making it the first to cross a fight
boundary.

**Momentum Feeder returns** — decided 2026-08-26. Feeder is damage-only today for exactly one
reason: a multiplier bonus is wiped by the loss's own reset. The carry removes that on the loss half
(the bonus escapes the reset by leaving the hand) and the dodge half never had the problem (a dodge
is a Win, nothing resets). Restoring it is one row in `TEMPLATE_FAMILIES`.

**It is a much larger card than the damage version.** Carried damage is added on at the end; a
carried multiplier compounds against the next hand's whole bank. Opening a hand at +3 and reaching a
bank of 3 at a live multiplier of 3 pays 3 × 6 = **18** where the damage version pays 3 × 3 + 3 =
**12**, and the unbuffed hand pays **9**.

**The tanking risk is smaller than it first looks and needs no cap.** Every deliberate loss costs 1
health of 10, so farming six Feeder fires in one hand spends 60% of the health bar to bank +6. It is
self-limiting. The live risk is the opposite one — that the carry is too small to be felt — and that
is a tuning question and the developer's.

**Cost in new rules.** Four, none of them a subsystem. One carry pool that survives the hand
boundary and dies at the fight boundary. One branch in Feeder's fire, splitting Loss from dodge.
One restored template row for the Momentum Feeder. One vocabulary rename, which is copy but ripples
into `the-hunt.md`, the buff label strings and the `BuffKind` identifiers, so it is a ticket rather
than a copy edit.

**Build the readout first.** The whole feel of the carry is a promise made during a hand the player
is losing and redeemed at the start of the next one. If the carry is not on screen — accumulating
during the bad hand, and shown as a starting figure at the top of the next — the player experiences
a bad hand followed by a slightly better one and never connects them. No number is worth tuning
before that exists.

**What to measure.** How often a hand ends with a non-zero carry; the average carry size at the
point it is spent; and whether a carry ever exceeds what winning the hand outright would have paid,
which is the line at which throwing a hand beats playing it.

**Still open.** Whether the Momentum Feeder ships at the same tier ladder as the damage version, and
whether the carry is shown as a raw figure or as a preview of what the next hand opens with.

### Skull Helmet and Skull Tether — two cards that answer the forced skull

**Developer's idea, worked through 2026-09-02**, out of the first narrated play session
(`the-hunt-play-session-2026-09-02.md`), whose most-repeated complaint was being trapped by a skull
with no counterplay: _"I'm forced to lose this hand no matter what I play"_, _"there's nothing I can
do about that"_, _"I couldn't do anything about it — they played the thing and my whole streak is
gone."_

#### The problem these answer

The trap is specific and the ruleset already names it as unaddressed. When the Quarry is **void in
the suit you led**, every card it holds loses the trick, so `chooseCpuCard`'s first branch — the
lowest legal card that would lose _and_ carries a skull — always has a candidate. It will throw away
a trick it could have won to hand you a skull. You are leading, so their card comes second and
decides the outcome, and the skull rank curve does not help because rank is irrelevant to a card
that is losing anyway. `the-hunt.md` §3 records the void case as one of two the curve deliberately
does not protect against.

The situation is common. The simulator counts about **25 forced hurts a run**; a Cheat answers
roughly half of them, the ones an off-suit card would have banked. The other **~13 a run** have no
answer in the game at all.

Two things make it sting rather than merely cost: it is unavoidable, _and_ it wipes the whole streak.

#### The mechanic

Both cards are ordinary condition buffs, armed for a trick in the normal window, spent when used.
Their condition is **you took a trick that carried a skull** — the "eat a skull with this card" rule
that `the-hunt.md` §4 already defines, prices and enforces, and which has simply not been dealt since
2026-08-25. Turning it on is a row in `TEMPLATE_FAMILIES` plus a type widening; the rule is written.

What is new is the **reward axis**. Neither card pays damage or multiplier — they protect. That is a
third thing a card can be worth, and it is the first card in the pool that touches the resource runs
actually die to.

| | **Skull Helmet** | **Skull Tether** |
| --- | --- | --- |
| **Bronze** | you eat the skull, take the 1 health, and your **total** survives | as bronze, but your **roll** survives |
| **Silver** | as bronze, and it also covers a **clean loss**, not only a skull | as bronze, and also covers a clean loss |
| **Gold** | as silver, and the surviving total **gains 1** | as silver, and the surviving roll **climbs by 1** |

Two rules the pair inherits rather than invents:

- **Nothing insures the health.** You take the 1 either way, on every rung. This holds the line every
  other protective thing in the game holds — the Timebomb exception, the Swan's rungs and the Blast
  Guard all spare the streak and never the health.
- **They do not stack.** Protection is binary — a total either survives or it does not — so a second
  copy armed on the same trick does nothing.

#### The arithmetic

Carrying a **total of 8 on a roll of 2** when the skull lands, then banking one trick worth 1:

| Armed | After the skull | Next banked trick | Pot |
| --- | --- | --- | --- |
| nothing | 0, roll 0 | 1, roll 1 | **1** |
| Tether (bronze) | 0, roll 2 | 1, roll 3 | **3** |
| Helmet (bronze) | 8, roll 0 | 9, roll 1 | **9** |
| both (bronze) | 8, roll 2 | 9, roll 3 | **27** |
| both (gold) | 9, roll 3 | 10, roll 4 | **40** |

Three consequences fall out of that table and none of them had to be designed:

- **The Helmet is the stronger single card, and it should be.** The roll climbs by exactly 1 a trick;
  the total climbs by whatever the trick's cards paid. Once buffs are firing, the total is the larger
  number, so preserving it is worth more. On bare tricks with nothing fired the two are identical
  (both give 3), so the Helmet never loses — it only pulls ahead.
- **The golds are deliberately unequal.** The same "+1" buys the Helmet one point of damage and buys
  the Tether the entire total a second time — at a total of 10, one extra roll is worth 10. Accepted
  by the developer on the grounds that the Tether's situation is rarer.
- **Holding both is the point.** The pair recovers what a single both-axes card would have done, and
  the second card fired also earns the Overlap Bonus the game already pays. That gives the card pool
  its **first collectible pair** — the first thing in a run to build toward rather than accumulate.

#### Why it is a good card and not just a safety net

The trap is **readable before it springs**. The suit-shape panel already posts how many cards the
Quarry holds per suit and how many are skulled, and in the session the developer read it correctly
and out loud — _"he's free now"_ — a full trick before the skull landed. The panel currently tells
you that you are trapped and offers nothing to do about it. This is the thing to do about it.

That is the precise opposite of Timebomb, which the strategy guide measures as a tax on skill because
its window opens before either card is laid, so it can never be aimed. These can be.

#### Still open

- **The Quarry's skull play is deterministic**, so a player who has learned the rule is rarely wrong
  about the prediction. That makes these cards a reliable counter rather than a bet — which may be
  the better card, but it is not what the idea set out to be. Making the Quarry sometimes hold a
  skull back would restore the gamble, and is a change to `chooseCpuCard` rather than to these cards.
- **Whether either should also catch a Timebomb landing on you**, which is the one other thing that
  wipes a streak and is currently covered only by a Blast Guard that nothing sells.
- **Whether the golds' +1 is the right size**, given the game's own ladders run 1 / 3 / 5 for damage
  and 2 / 3 / 5 for multiplier, so +1 is below what a bronze card pays elsewhere.
- **What the machine's stocking weights should be**, and whether a protective card belongs on the
  same strip as the damage families at all.

#### The consequence worth noticing elsewhere

**These are the first cards for which combining is the correct play.** Because they do not stack, two
bronze Helmets on one trick are worth exactly one bronze Helmet, so merging them into a silver is a
strict gain. Every other family in the game rewards hoarding duplicates, because the Overlap Bonus
counts cards — which is why the Manage Buffs screen is currently a trap. This pair breaks that on
purpose, and is the first evidence that the screen can be worth using.

### The wildcard — a card you spend to take the suit off another card

**Developer's idea, worked through 2026-09-02.** A new card. On the Manage Buffs screen you spend it
on a buff card you own, and that card loses its suit condition: a **Bell-Taker (Blade)** becomes a
**wild Taker (Blade)** — same family, same reward, same tier, but it now pays on a trick of any suit.
The wildcard is consumed; the card it was spent on is not.

#### The problem it answers

The complaint it comes from is the developer's own, in the first narrated session, looking at a pile
of 21 cards: _"I have two Moon-Takers and I have one moon… the rest of them are not useful to me at
all."_ Three suits times two families means that on any given trick most of what you own cannot
legally pay, so the pile reads as clutter rather than as a build.

#### Why the arithmetic works

A trick pays `(BASE + flat damage) × (1 + multiplier + Overlap Bonus)`, and the Overlap Bonus is one
point per _extra_ card that paid — so card count enters the payoff twice and halving the pile is
normally a large loss. It is not a loss here, because usability climbs faster than count falls:

| | cards that can pay on one trick | trick pays |
| --- | --- | --- |
| 21 suit-locked cards, one suit's worth live | 7 | `(1 + 7) × (1 + 6)` = **56** |
| 10 wild cards, every one live | 10 | `(1 + 10) × (1 + 9)` = **110** |

Trading two cards for one that fires three times as often clears the Overlap Bonus comfortably.

#### Why it is the right fix and not merely a strong one

**It deletes the bookkeeping half of the aiming decision and keeps the judgement half.** The game
already states this principle for the skull readout — counting suits is bookkeeping and the panel
does it for you, reading ranks is judgement and it refuses to. A suit-locked buff puts bookkeeping
back: you match a card's suit to the trick's suit, which is clerical. A wild card still has to be
armed on the right **outcome** — take the trick, duck it, or dodge a skull — and that is the half the
strategy guide measures as worth taking the win rate from 0% to 20%.

**And it gives the Manage Buffs screen a reason to exist.** That screen currently offers only the
tier combine, which is dominated at every pile size measured, so there is nothing on it worth doing.

#### The variant that was tried and dropped

Combining a Blade card (flat damage) with a Momentum card (multiplier) of the **same suit and
family** to get one card that pays both. It does not work: the two components share a condition, so
if either fires both fire, and two cards firing pay `(1 + 1) × (1 + 2 + 1) = 8` against the hybrid's
`(1 + 1) × (1 + 2) = 6`. Cross-combining only pays when it changes **when** a card can fire, not what
it pays — which is exactly and only what the wildcard does.

#### Decided

- **Spent on the Manage Buffs screen, between fights** — not in the loadout mid-fight. That makes it
  a build decision taken before you know what you will need, rather than a rescue spent only once you
  already know it works. The mid-fight version is much the stronger card and was rejected for that
  reason.
- **The converted card keeps its family, its reward axis and its tier.** Only the suit condition goes.
- **It applies only to a suit-specific card**, so Sidestep — which already asks for no suit — is
  outside it entirely and needs nothing in return.
- **It comes from the slot machine**, like every other card.
- **Its appearance is low for now.** A rarity *system* is wanted and does not exist; until it does,
  the only dial is the machine's stocking weight, so set that low. See the note below on what that
  actually buys.

#### The combine rule this adds

**A wild card tier-combines with a suited card of the same family, and the result stays wild.** A
wild Taker merges with a Bell-Taker; a bronze pair makes a silver, a silver pair makes a gold, as
today. The existing rule — two cards combine only when identical in every respect — is widened by
exactly one clause: **the suits may differ when one of the two is wild.**

Two things it must never do:

- **Wildness is never lost.** A wild card cannot be absorbed into a suit, so there is no way to
  accidentally merge a wild Taker down into a Bell-Taker. If either input is wild, the output is wild.
- **The family and the reward axis still have to match.** A Taker never merges with a Feeder, and a
  Blade never merges with a Momentum. Only the suit is relaxed.

**The consequence worth costing before pricing the wildcard.** Because wildness is absorbing, one
wildcard seeds an entire wild line: convert a bronze, then feed it suited bronzes of the same family
and reward, and you climb the tiers without spending a second wildcard. A gold wild Taker costs one
wildcard and four suited Takers. That makes the wildcard's scarcity matter **less** than it looks —
what is actually being rationed is not the number of wild cards you can own, it is the number of
independent wild lines you can start. Worth checking against whatever rarity system replaces the
stocking weight.

#### Still open

- **The rarity system.** The machine has no per-card rarity: eight symbols are stocked onto a strip
  from weights, and once a card is on the strip every reel is equally likely to land on it. So a low
  stocking weight makes the wildcard rarely *appear*, but on a visit where it does appear it is as
  common as anything else on that strip. That is a coarse, near-binary rarity rather than a smooth
  one, and it is why a real system is wanted.
- **How much of a pile should end up wild.** If every suited card is eventually raw material for a
  wild line, the suit stops mattering to the buff layer entirely. Whether that is the intent or the
  failure mode is the thing to watch in play. **The developer's, after playing.**

### Rewriting the 3, the 5 and the 7 — making three named ranks worth playing

**Developer's design, 2026-09-03**, out of the first narrated play session, where two of the three
were explicitly thrown away and the third has never done anything.

#### What each one does today, and why it fails

| Rank | Today | Why it is not played |
| --- | --- | --- |
| **3 Fox** | On playing it, you may exchange the decree for a card from your hand; the exchanged card becomes the decree and its suit becomes trump | The cost is always a card you wanted. _"I feel like I always have to give up a good card… I usually just keep the decree, because it doesn't seem all that beneficial."_ |
| **5 Woodcutter** | On playing it, draw the top card, then bury any one card from hand at the bottom of the pile | Reads as a worse version of the Swap button. _"I can just swap cards out from the deck, so that power's pointless."_ |
| **7 Treasure** | Nothing at all | It has never had a rule |

Both the 3 and the 5 also open a choice prompt the headless simulator cannot answer, so it plays
around them — which is why the two strongest levers in the deck have never been measured.

#### The three replacements

**The 3 — choose the trump suit outright, giving up nothing.** On playing it you name any suit and
that becomes trump. **The decree stops being a card at that moment and becomes a placeholder showing
the suit** — a decree of the 5 of Bells, switched to Bells, simply reads "Bells". You may decline.
Timing is unchanged: it resolves the instant the card is played, before the winner is decided, so the
new trump decides the current trick.

**The 5 — raise the Swap pile and fill it.** Playing it adds **1 to your Swap cap and 1 to your
remaining Swaps**, for the rest of the fight, so 3 of 3 becomes 4 of 4 and 0 of 3 becomes 1 of 4. The
Swap pile must **highlight and then take the addition** so the player sees where it went. This is the
same grammar as the shop's max-health purchase, which raises the ceiling and leaves you full at the
new one — so the card's text can read the same way.

**The 7 — winning it raises base damage for the fight.** A trick you were **victorious** on that
carried a 7 adds **+1 base damage** for the rest of the fight. Base damage is the `1` a Whetstone
raises, so this is a Whetstone you win rather than buy, bounded to one fight.

**Victorious means the outcome axis, not the mechanical one.** The developer's own example: the
Quarry plays a skulled 7 of Bells, you answer with the 9 of Bells and take the trick — you ate the
skull, so **you get no +1**. Physically taking the cards is not enough; the trick has to have banked.

#### What the Quarry gets

Left alone, the new 5 and 7 would be inert in the Quarry's hand — it has no Swap pile and its damage
to you is a flat 1. So each gets a mirrored effect rather than none:

- **Its 3** picks a new trump or leaves it, choosing **the suit it holds most of**. This is very close
  to `chooseCpuFoxChoice`'s existing behaviour, which already picks its strongest suit and declines
  when that suit is already trump.
- **Its 7** deals **2 damage instead of 1** on a trick it was victorious on. It does **not** raise the
  Quarry's damage generally — this is a per-trick amount, not an accumulating base.
- **Its 5** swaps a card, with a **40% chance the drawn card is skulled**. The skull must be
  **animated** as it lands, and it obeys the same rank restriction the deal does — **rank 1 never
  carries a skull.**

#### Two rules currently marked settled that this breaks

Both are deliberate, and both need saying out loud before anything is built:

- **"Damage to the player, per event: 1, every time"** (`the-hunt.md` §8, `[settled]`). The Quarry's
  7 makes it 2. Every readout, every projection and every simulator figure that assumes a hurt trick
  costs exactly 1 has to stop assuming it.
- **"A drawn card is never skulled — skulls are a property of the deal"** (`the-hunt.md` §5,
  `[settled]`). The Quarry's 5 mints one mid-hand. This also removes the reasoning behind the current
  no-skull-on-a-drawn-card rule, so the rule has to be rewritten rather than excepted.

A third rule quietly simplifies rather than breaking: once the decree can become a placeholder, **no
card is ever moved onto the decree**, so the case where a skulled card ends up sitting on the decree
and has to keep its skull through the change of hands stops arising.

#### The finding worth costing before this is built

**This pass strengthens the Quarry on the axis that actually kills you, and strengthens the player on
the axis that is already in surplus.**

The player's three gains are a free trump change, an extra Swap, and more base damage — and damage is
the resource the run has two to six times more of than it needs by fight 2. The Quarry's three gains
are a free trump change, doubled damage on a 7, and a mid-hand skull generator running at 40% against
a deal density of about 30%. Both of the Quarry's are **health**, which is the only thing runs
actually die to.

That may be exactly right — the run is winnable about a quarter of the time and nobody has argued it
should be easier. But it is a real shift in difficulty arriving as a side effect of three cards being
made interesting, so it should be measured rather than discovered. **Whose decision:** the
developer's, after the simulator can see it — which it now can, because the new 3 and 5 have prompts
a policy can answer where the old ones did not.

#### Still open

- **Whose 7 counts.** The stated example fails on two grounds at once — it was the Quarry's card
  _and_ the trick was skulled — so it does not settle whether taking the Quarry's clean 7 pays you,
  or only your own 7 does.
- **Stacking.** Winning with three 7s in a fight — +3 base damage? Playing two 5s — a cap of 5?
  Presumably yes to both; nothing says so.
- **Where the replaced decree card goes** when a 3 turns it into a placeholder: to the resolved pile,
  or back into the draw pile.
- **Whether the Quarry's 5 can mint a skull onto a card the player will later draw**, or only onto its
  own hand.

## Promoted

### Health replaces the Demand — became `hybrid-design.md` §5 and the opening section, 2026-08-11

One line on what changed in the trip: the mechanism is adopted whole — a health bar depleted by
`card value × Standing` rather than a score checked against a threshold — but every number below is
superseded. The **108 and 36 figures**, the `ceil(H / damage per Hunt)` illustration's specific
counts, and the cap-range guess in this entry's own "fix" paragraph are all void; `hybrid-design.md`
§9 and `ideas.md`'s _Fight length_ entry above carry the current figures (540/765 ceiling, 3–4 vs.
18–23 Hunts, cap range 3–5). The `ceil(H / damage per Hunt)` **argument itself** — that session
length is performance-dependent and losing can take longer than winning — survives unchanged; only
its numbers moved.

**What it is.** The Quarry has a health bar. `Spoils × Standing` is damage dealt to it rather than a
score checked against a threshold. An encounter runs until the bar is empty.

**Problem it solves.** Two, both documented. §7's _"a run has no defeated opponent"_ — the Quarry
currently has no score, no health and no failure state, so clearing the final Demand wins the run
while nothing is beaten. And §12's smaller finding that surplus Spoils past the Demand is dead air:
against health, every point carries.

**Not a toll booth, and the reason is worth keeping.** §2 bans a _conversion_ — trick outcomes
becoming a number fed to a different system with its own play (the _Duet_ failure). Health is an
accumulator, not a system. It is the Demand with memory: same number, same source, checked
cumulatively rather than once.

**Cost in new rules.** One changed rule, no new currency. But the 108 ceiling (§3) is now damage per
_Hunt_, and the figure that matters is damage per _encounter_ — every number keyed to 108,
especially §5's Demand crossing point, needs restating in the new unit.

**The consequence that needs deciding with it — session length becomes performance-dependent.** An
encounter now lasts `ceil(H / damage per Hunt)` Hunts. At flat card values a Victorious round pays
108 and a Humble round pays 36 (§3), so the _same_ health bar is a 3-Hunt encounter for a strong
build and a 9-Hunt one for a weak build — 195 tricks against 585 across five encounters. **Losing
takes longer than winning**, which inverts Rosewater's inertia check and lengthens §12's Problem 2
(a run dead in substance several encounters before it is over on screen) even as health usefully
makes that death _visible_. `design-principles.md` §7's Culdcept entry is the warning: length is the
first symptom, and the disease is neither layer being allowed to be the point.

The fix that keeps both properties, at one rule: **cap the encounter at a fixed number of Hunts.**
Kill the Quarry inside the cap or the run ends. Accumulation survives (a round scoring 80 against
100 contributes 80 instead of nothing) and so does the clock. The Demand is not removed — it becomes
_deal H damage within R Hunts_. Both numbers are the developer's.

**What would prove it wrong.** Whether the player can still tell a good round from a bad one without
a per-round pass/fail. If every round reads as "some damage happened," the threshold was carrying
more feedback than it looked like. Separately: record Hunts-per-encounter for a strong build and a
deliberately weak one — if the weak build's run is materially longer in wall-clock time, the cap is
needed before health is called settled.

### The Quarry deals damage too — became `hybrid-design.md`'s opening section and §8, 2026-08-11

One line on what changed in the trip: the argument is validated rather than corrected. The "exactly
one side scores ×6" evidence becomes §8's rebuilt fourteen-row table under the two mirrored tables —
graded rather than binary, but the same restored tug this entry predicted.

**What it is.** Both sides score at the end of the 13 tricks and both apply damage — the player's
`Spoils × Standing` to the Quarry's health, the Quarry's to the player's. Raised 2026-08-11.

**Problem it solves.** §12's **Problem 1**, the design's own top-ranked issue, and it solves it at the
root rather than mitigating it. That problem's evidence is that _"the 'exactly one side scores ×6'
tension is a property of the symmetric contest, and it is gone once the Quarry doesn't score."_
Enumerating all fourteen splits of 13 tricks against the printed bands confirms exactly one side
lands in `{0–3, 7–9}` in every split, without exception. Restoring the Quarry's stake restores the
tug. This is a larger fix than the health bar itself.

**Cost in new rules.** Zero new vocabulary — it runs §1's existing equation on the other side of the
table. It does require the Quarry's Standing band to be tracked and shown, which the base game
already makes public (§4's visibility table: trick counts public, card faces hidden).

**What would prove it wrong.** Whether the player actually plays _against_ the Quarry's band rather
than just maximising their own. If the Quarry's number is never the reason a trick is contested, the
symmetry is decorative.

**Implementation consequence, flagged early.** This only pays off if the CPU plays for **band
position**, not for tricks. A CPU that simply tries to win tricks walks itself into Greedy and deals
zero. §11's slice is scoped to test whether a CPU opponent stays interesting; a CPU that knows when
to _dump_ a trick is a materially harder opponent to build than the one that slice assumed.

### Pending damage, shown on the health bar — became `hybrid-design.md`'s opening section, §6 and §11, 2026-08-11

One line on what changed in the trip: the mechanism and both of its payoffs (legible bands without a
table; a free comeback route because nothing is decided before trick 13) are adopted unchanged. The
worked band-crossing table below (216 → 48, 216 → 504, 648 → 0) is illustrative of the _old_ single
table and needs recomputing against the two mirrored tables if a worked illustration is wanted again
— not done here, since `hybrid-design.md` §1 and §6 already state the new tables directly.

**What it is.** Damage accumulates visibly through the Hunt as a transparent-red "potential damage"
chunk on each health bar, and both sides' damage is applied once, at the end of the 13 tricks.
Raised 2026-08-11.

**End-of-round is forced, not chosen.** Standing is read off the _final_ trick count, so the
multiplier is unknown until trick 13. Per-trick application would apply an undetermined number.

**What it buys 1 — the bands become legible without a table.** If the pending figure shows Spoils
_with the multiplier applied_, it lurches at every band crossing (Win path, avg rank 6):

| Trick count | Pending | On crossing                          |
| ----------- | ------- | ------------------------------------ |
| 3           | 216     | → 4 tricks: **48** (collapses to ×1) |
| 6           | 216     | → 7 tricks: **504** (jumps to ×6)    |
| 9           | 648     | → 10 tricks: **0** (Greedy ×0)       |

`balatro-play-notes.md` §3.1 argues the whole Standing band table needs to be permanently visible,
because _"the decision The Hunt asks every trick is which band to land in"_ and the curve is bimodal
so the player cannot infer it. A bar that craters on the fourth trick teaches that better than a
table does. Note 15's _"rising numbers are the payoff… the arithmetic performed rather than
reported"_ is the second half of the same win.

**What it buys 2 — a real comeback mechanic, at zero rule cost.** Because nothing is applied until
trick 13, **no round is decided until the last trick.** A Quarry sitting on 9 tricks with lethal
pending damage can be pushed to a 10th, collapsing its entire pending bar to zero. The endgame
objective becomes _"force them to take one more"_ — the player deliberately dumping tricks. §6 calls
catch-up _"the design's weakest claim"_ and rejected both branches it considered; this is a third
one, and it is free.

**Cost in new rules.** Zero. It is a presentation of a number the equation already produces.

**What to watch.** Four figures move every trick — both pending totals and both health bars. Whether
that reads as tension or as noise is a feel question and the developer's. Cheap fallback if it is
too busy: show only the **net**, one bar, one direction.

### Four characters and a boss — became `hybrid-design.md` §5 and §7, 2026-08-11

One line on what changed in the trip: nothing — unaffected by the two-table change, since it is
about roster shape and scheduling rather than the damage arithmetic.

**What it is.** A run is four Quarry encounters plus a boss with a Balatro-style cheat tool.

**What it solves for free.** Five encounters is exactly §4's roster, and it is the no-repeat length —
which closes §12's Problem 3 (past five, some character must repeat, and no section says how) by
construction. Fixing the boss and shuffling the other four gives **24 distinct run sequences**; also
drawing the boss gives **120**. §7's _"every run shows the same five characters"_ gap costs nothing
to close.

**The part that does not work as stated.** "A boss with a cheat tool" is redundant — §4 and §5 give
_every_ Quarry a round-long rule-break, so breaking a rule is the sixth instance of a thing that has
already happened five times.

**The available answer, at zero new vocabulary.** §5 lists five inputs the base game exposes —
follow-suit, decree and trump, hand size, the odd-rank abilities, and **which cards are in the deck
at all** — then works four examples covering four of the five. Deck contents is attacked by nothing.
The player's engine _is_ the Foraged deck (16 edits, roughly half of 33 cards, per §9), so a boss
that attacks it is the one escalation testing what the run actually built.

**Risk.** A deck attack can read as theft rather than a test. Balatro's debuffs survive because the
engine has redundancy; 33 cards with 16 edits may not.

### Poison as the declared Lose path's damage source — became `hybrid-design.md` §1's declaration subsection, 2026-08-11 — arithmetic superseded

One line on what changed in the trip: the **mechanism** — pay the player for the cards the Quarry
captures, at inverted value — is adopted outright and generalised (the pile-swap now runs both ways,
not just player-favouring). The **arithmetic below is void**: the 918 / 936 / 378 / 216 table and its
"the two paths become competitive" conclusion were computed against a fixed Demand of 220, where the
question was a total crossing a target; under two-sided damage the question is a net, and none of
these four numbers is a net. `hybrid-design.md` §1 replaces them with the enumeration keyed to the
two mirrored tables.

**Correction, 2026-08-11.** This entry originally read "lose path" as _how the player dies_ and
analysed poison as an incoming tax on player health. That was a misreading. The Lose path is the
**declared** path in `the-hunt.md` §3 — already built, already playable — and the proposal is that
cards the **Quarry** captures are poisoned and damage it. The entry below the next heading is kept
for the health-side analysis it contains; this section is the corrected reading.

**What it is.** On the declared Lose path, the cards you successfully dump onto the Quarry damage it,
at inverted value (`12 − r`). Replaces the Lose-credit mechanic rather than sitting alongside it.

**The problem it solves, quantified.** `the-hunt.md` lists _"whether declaring Lose dominates
declaring Win"_ as an open question. It resolves the other way, and not narrowly. The Lose path
scores off **6 cards** (3 credits × 2) against the Win path's **18** at `k=9`:

| Path                                                | Spoils | × Standing | Score   |
| --------------------------------------------------- | ------ | ---------- | ------- |
| Win, `k=9`, best 18 cards (Σrank 153)               | 153    | ×6         | **918** |
| Win, `k=9`, typical (avg rank 6)                    | 108    | ×6         | **648** |
| Lose, best 3 credits (three 1s → 11, three 2s → 10) | 63     | ×6         | **378** |
| Lose, typical 3 credits (avg inverted 6)            | 36     | ×6         | **216** |

Against the built Demand of **220**, a typical Lose round _misses_ and a typical Win round clears by
3×. The credit cap is what does it, and no play skill closes a 3:1 card-count gap.

**What poison changes.** At `k=0` the Quarry captures all 26 dealt cards. Σrank over 26 ≈ 156, so
Σ(12−r) = `26×12 − 156` = **156** — identical, because the inversion is its own mirror at mean rank 6. `156 × 6` = **936**, alongside the Win path's 918 ceiling. The two paths become competitive.

**Cost in new rules — negative.** It _removes_ the credit cap and its four guards (one credit per
trick, only the just-resolved trick, a won trick credits nothing, no credits left credits nothing).
Simpler than what ships today.

**The brake, and whether it is enough.** Losing all 13 tricks deliberately is hard — follow-suit
forces wins. Realistically a Lose player lands at `k=2–3`: at `k=3` the Quarry takes 20 cards,
inverted ≈ 120, `× 6` = **720**, still strong. At `k=4` Standing drops to ×1 and the same play yields
**108**. So the Lose path inherits the Win path's cliff structure — pick a lane, commit, don't slip.

**What would prove it wrong.** How often a player _trying_ to lose is forced to win a trick. If the
forced-win rate pushes `k` into 4–6 regularly, the Lose path is theoretically competitive and
practically a trap. This is the measurement that decides the idea.

### Finding 3 of the net-damage enumeration — became `hybrid-design.md` §6's one-failure-mode finding, 2026-08-11

Promoted separately from its parent entry (_The full net-damage enumeration_, Superseded in place,
above), because this one finding survives the table it was computed from. One line on what changed
in the trip: "there is finally an endgame" — the observation that trick 13 must not play identically
to trick 1, and that a player near a band edge should be able to dodge or force one more trick —
is exactly what pending damage (visible mid-Hunt) and §6's disaster/slow-leak framing deliver under
the new tables. The specific 816-point cliff and the self-correcting "high cards get spent early"
argument were computed against the old single table and are not carried forward; the finding's
shape is what was promoted, not its numbers.

### Passive buff stacking — became `hybrid-design.md` §5's stacking rule, 2026-08-23 — the ×count arithmetic rejected, the intent kept

One line on what changed in the trip: the **intent** survives whole and the **arithmetic** does not.
The entry is reproduced below exactly as it sat in Raw, per this file's own rule that an idea is
killed with its reason attached rather than deleted — everything from "What it is" to "Cost in new
rules" is the original text, including the growth table that turned out to be the defect. The
resolution follows it.

**What it is.** Raised 2026-08-23, during DLR-111's buff-card-list review. Not a per-card template —
a hand-wide resolution rule. Whenever more than one equipped buff's condition fires on the same play,
their individual rewards are summed, then the sum is multiplied by the number of buffs that fired.
Worked example given: three buffs co-trigger ("win with Bells," "win with a 9," "Apply Damage this
hand"), their rewards sum to 12, and ×3 (the count that fired) gives 36.

**Problem it reaches for.** It would replace two things already in §5's synergy-condition set rather
than sit beside them: template #12 ("for every other buff active this hand") is a weaker, single-card
version of the same idea, and the separately-discussed "combo" template (co-triggering suit/rank
conditions, e.g. Bells + a 9) is just this rule applied to the narrow two-card case. If overlap always
resolves this way, neither needs to exist as its own card — it becomes how the game resolves any
overlap, automatically.

**The blocking risk, computed in-thread.** The multiplier is (sum of rewards fired) × (count of buffs
fired), and both factors grow together as a run progresses — more buffs equipped *and* higher-tier
buffs (bigger individual rewards) both push the total up at once, which reads as quadratic rather than
linear growth:

| Buffs firing | Avg reward each | Sum | × count | Total |
| --- | --- | --- | --- | --- |
| 2 | 3 | 6 | ×2 | 12 |
| 3 | 4 | 12 | ×3 | 36 |
| 5 | 5 | 25 | ×5 | 125 |

This is the same shape of risk DLR-111's AC4 already flags for AP-refund stacked with "every other
buff active" — self-reinforcing — except this version would apply to *every* hand where buffs overlap,
not one specifically-costed card combo, so it is a bigger lever to get tuned wrong.

**Two open questions before this can be costed for real.** (1) Is the multiplier "number of buffs that
fired" (as worked above) or "number of co-triggering *pairs*" — the two scale very differently, linear
versus combinatorial. (2) Is the escalation a rare jackpot moment (intended, wants no cap) or a
steady-state expectation late-run (needs one)? Neither is answered yet.

**Cost in new rules.** One resolution rule, but it is a global one that touches every buff in the v1
list rather than a single new card, so it is not cheap to get wrong.

#### The resolution, 2026-08-23 (DLR-124)

**What was rejected, and why.** "Sum the rewards fired, then multiply by the count" has nothing to
sum. A fired buff pays on exactly one of four axes — Blade (flat damage), Purse (coins), Second Wind
(action points), Momentum (multiplier points) — and those are four different units with four
different consumers and no exchange rate between any pair of them. The "avg reward each" column in
the table above is therefore a quantity the game cannot produce, and the 2→12 / 3→36 / 5→125 figures
inherit the defect: **rejected on definition, before magnitude.** It fails on magnitude as well. Read
onto the multiplier — the most generous coherent reading, since the rule as written names no axis at
all — an ordinary eleven-AP, five-sevenths-bronze loadout pays **123 damage on trick three of hand
one** against a 34-health opponent. That figure also disposes of open question (2) for the original
shape: a rule paying 123 on trick three is not a rare jackpot anyone could choose to leave uncapped.

**What replaced it.** A per-axis, additive, ordered, capped resolution, argued as R1–R7. Each fired
buff pays into its own axis and nowhere else; within an axis, contributions add; a trick resolves in
the order Second Wind → Momentum → the cash-out product → Blade → Purse; a trick on which `k ≥ 2`
buffs fire adds an **Overlap Bonus** of `k − 1` to the Momentum axis; and four named per-hand caps
bound the four axes. Why addition rather than multiplication or take-the-highest, why the order is
forced rather than chosen, where each cap value comes from, and the worked hand that checks all of
it are in `hybrid-design.md` §5 → *Resolving several buffs on one trick — the stacking rule*, and
are deliberately not repeated here.

**Both open questions are answered, and the two templates this entry named are gone.** On (1) the
basis is the **count of buffs fired, linear** — pairs is `k(k−1)/2`, which at the AP-affordable
`k = 6` pays 15 Momentum from the bonus alone, two and a half times the whole natural multiplier
ceiling, and grows as the square of the very thing the shop sells. On (2) it is treated as a
**steady-state expectation and capped**, four times over, one cap per axis. And this entry's own
prediction that the rule would replace two synergy templates rather than sit beside them held:
`v1-buff-card-list.md` → *#13–16 resolved against the stacking rule (DLR-124)* supersedes both
permanently — the "for every other buff active this hand" template and the co-trigger combo
template, numbered #13 and #16 there — while #14 and #15 stay excluded for independent reasons that
have nothing to do with stacking.

**What is still the developer's.** The four cap values, the Overlap Bonus magnitude, and the
event / threshold / terminal firing cadence were all chosen by an agent under DLR-124's sprint-run
override of `CLAUDE.md`'s tuning-value pause, not by the developer. Each is listed again with what
it trades off in the register closing that subsection, *Every number here is the developer's to
move*; none is a `config.ts` key yet and none has been played.

<!-- ### <title> — became `hybrid-design.md` §N, <date>. One line on what changed in the trip. -->

---

## Rejected

### Money, a shop, and permanent cross-run upgrades — rejected 2026-08-11 (DLR-64) → `hybrid-design.md` §3's discarded branch, §7's banked-progress item

**Note on the trip.** Moved here from Raw, where it sat un-costed pending exactly this decision. The
reasons below are unchanged by the direction — none of them depended on the old single-table model.
One piece of it is worth flagging rather than silently dropping: its **"Planets, not Jokers"**
variant, permanently levelling a Standing band for a run, is **now closer to reachable** than it was
when this entry was written, because the multipliers are designed rather than transcribed and a
level-up is just another way of arriving at a number this design already owns choosing. It still
breaks §1's _Standing cannot be built_ invariant and moves the ceiling by a chosen amount rather than
a derived one — recorded as a candidate in `hybrid-design.md` §3, not adopted there either.

Random per-run upgrades plus permanent ones — more health, higher card damage — bought with money
earned in the run. Raised 2026-08-11.

Held at Raw rather than costed, because it collides with two stated invariants and the collision has
to be decided before the idea can be specified:

- §2 discards _by name_ the branch "each trick won becomes N resource, spent in the outer loop,"
  because it reproduces the _Duet_ toll booth. Money earned from encounter performance is that
  branch with a different noun.
- §1's component table: _"Any device that would add a third scoring channel — a resource, a bonus, or
  a track running alongside Spoils and Standing — is a design defect."_
- `+N per card` is specifically the additive-only build §3 engineers the Demand curve to kill at a
  predictable encounter. Selling it is selling the losing line as an upgrade.
- §7 on cross-run power: _"carrying power across runs dissolves the lesson §3 exists to teach."_ Both
  named examples — health and damage — are power, not options.

**The want behind it is real and should not be lost with the mechanism.** §7's sharpest
self-criticism is that this design runs **one** progression system against Balatro's four (Jokers,
Tarots, Planets, Vouchers), and Forage is Tarots alone — Balatro's _supporting_ system. Asking for a
second progression layer is a correct read of the design's thinnest spot. The constraint is only on
which layer.

Two unspent shapes, neither chosen:

- **Planets, not Jokers.** Planets permanently level a _category of play_, not a number. The
  analogue here is levelling a **Standing band** for the rest of a run — which would make §6's
  dominated Humble lane a genuine build choice and blunt §12's Problem 1 in the same stroke. Cost,
  stated plainly: it breaks §1's invariant that _Standing cannot be built_, and it moves the 108
  ceiling.
- **Unlock options, not power.** §7 already names Balatro's middle path — beating content adds
  Jokers and decks _to the pool_, so runs gain variety rather than a head start. A new Quarry or a
  new kind of Forage edit is the equivalent and costs nothing arithmetically. Hades' model is the
  other one worth weighing: banked progress is real, and difficulty is a separate dial the player
  opts into, so the test stays re-armable.

**Cheapest test, and it needs no shop.** Run one session with a fixed `+N per card` applied from the
start and check whether an additive-only build still dies at a predictable encounter. If it
survives, the upgrade has eaten the lesson.

### The combo bonus — rejected 2026-08-11, because the pending-damage bar already delivers what it was for

**Pointer, 2026-08-11 (DLR-64).** Gains a pointer to `hybrid-design.md` §1's discarded branch, where
the same rejection is now recorded in the live design document rather than only here. Its **×18 →
×30 break-even arithmetic below is void** — it was computed against the single ×6-family table this
design no longer uses — but the rejection itself does not rest on that number, and the entry's other
two costs (adds no decision; forces a recomputation of a value the developer owns) are unaffected.

**What it was.** Each trick captured is a "combo"; every card in the captured pile gains +1 per
combo, so with `k` tricks captured `Spoils = Σranks + 2k²`. Confirmed as a plain count of tricks won
— not a pattern in the two cards. Stated intent: _"a way to reward them for winning more and more."_

**Why it was dropped.** It is the only proposal in this round that fixes no documented problem — its
job was feel, specifically the _"rising numbers are the payoff"_ note from `balatro-play-notes.md`
note 15. **Pending damage on the health bar does that job better and for free**: the pending figure
lurches at every band crossing (216 → 48 on a fourth trick, 648 → 0 on a tenth), which is a larger
and more legible beat than a smoothly climbing bonus. Once pending damage is in, the combo bonus is
paying real costs for something already delivered.

**What it would have cost.**

- **Humble's break-even moves ×18 → ×30.** `k=3` yields 54 Spoils against `k=9`'s 270, so
  `54 × M = 1620 → M = 30`. The band ratio worsens from 3:1 to 5:1. §9 marks the Standing multipliers
  Undecided, so this is a recomputation of a value the developer owns — but the bonus makes it
  mandatory rather than optional.
- **The ceiling moves from 648 to ~1,620** (1,890 best case). Every figure keyed to it needs
  restating.
- **It adds no decision.** `2k²` depends on trick count alone — not on which cards, not on capture
  order — so it escalates the numbers without escalating the choices.

**One correction, recorded because the number was cited in conversation.** The boundary swing under
the combo bonus was stated as a **13.7× amplification**. That compared the combo figure (1,864)
against the _flat-card-value_ design (136), conflating two separate changes. Measured against the
rules actually built — card value = printed rank — the honest figure is **816 → 1,864, i.e. 2.3×**.
The swing-to-typical-round ratio is **2.8× either way**: the bonus scaled both numbers together and
did not make the game relatively swingier. The rejection does not rest on this number, and the three
costs above are unaffected.

**What would bring it back.** If the game plays flat — if landing a good round produces no felt
escalation once pending damage is on screen — this is the lever, and the gentler triangular variant
(`Σranks + k(k+1)`) is the version to try first.

### The pattern reading of "combo" — not rejected, parked

Distinct from the above and never proposed by the developer: a combo meaning **the two cards in the
trick form a pattern** (same suit, a pair, consecutive ranks). Unlike the count version this _would_
add a decision — "do I want to win this trick _with this card_" — and it is the poker-hand shape the
parent genre is built on. Raised, confirmed not to be what was meant, and kept here because it
remains the answer if the game ever needs a second trick-level decision.
