# Critique — the Fox × Hex army-general concept

Applies the lenses in [`design-principles.md`](./design-principles.md) to
[`hybrid-concept.md`](./hybrid-concept.md). Nothing here overrides a decision in that document;
where this disagrees with a settled choice it says so and gives the evidence.

Problem 1's three-stone claim is sourced from [HexWiki — Handicap](https://www.hexwiki.net/index.php/Handicap)
(the Demer scale page), checked directly against the live page on 2026-08-02.

**Resolution (2026-08-03):** Problems 1–3 below led to
[`skirmish-board-replacement.md`](./skirmish-board-replacement.md), which replaces Hex with **The
Vanguard** — a network-growth mechanic on a hex board, designed conversationally with the
developer after an earlier single-lane draft was scrapped for having only one front to fight over.
This critique is kept in full as the record of *why Hex specifically* needed replacing — do not
delete or soften Problems 1–3 to make the old design look better than it was.

---

## What is genuinely strong

**The coupling is real, and that is rare.** The most common failure in a two-game hybrid is that
the minigame is a toll booth — you play it to earn the right to play the real game. Here the card
phase is *the only source of moves for both sides*, so it isn't a tax on the war, it **is** the
war's action economy. That is the same structural move Arcs makes with trick-taking, and Puzzle
Quest with match-3: the subordinate system is not decoration, it is the resource layer.

**The theme is doing mechanical work.** Fox's "win, but not too much" curve reads as "commit enough
to win, don't overextend" with no strain. That is Rosewater's *resonance* and *piggybacking* — the
fiction teaches the rule for free, so the strangest thing about Fox becomes the most intuitive
thing about your game. It's the best idea in the document.

**Hex is the right substrate.** Permanent stones mean every decision echoes forward for the whole
battle — Sirlin's stated ideal. No draws means no tie-handling. Every stone is dual-purpose
(building necessarily blocks), which gives the board an *intrinsic* comeback pressure that most
war maps need bolted on. And the no-draw theorem makes a Monte-Carlo AI cheap, as the doc notes.

**The uncertainty is cleanly stratified.** All randomness lives in the card layer, and it is
*input* randomness (the deal, then hidden hands) — visible before you decide, planned around. The
board layer is perfect information with zero randomness. Players lose to their own decisions, not
to a die. Very few hybrids get that separation this clean, and it is worth protecting in every
later decision.

**The persistent board makes it a war rather than a series of duels.** Correct instinct, and it's
what earns the "one battle in phases" framing.

---

## Problem 1 — the ambush is very likely to end the battle outright, not colour it

This is the finding to act on first.

The competitive Hex world measures handicaps on the Demer scale, where *one extra move* is 0.5
handicap points and is worth roughly **250 Elo on an 11×11 board** — about quadrupled winning odds.
HexWiki notes that handicaps of two moves and above "probably do not make much sense on small board
sizes," because so few stones are needed to connect.

That page is more specific than "so few": its own reasoning for why is that **three stones are
enough to connect edge-to-edge on the full 11×11 board using nothing but bridges and edge
templates.** Your ambush hands out **six** unanswered placements on a board smaller than 11×11 —
that isn't a large handicap in Hex terms, it's roughly double the stones a guaranteed connection
needs on the *bigger* board. This isn't an inference from an Elo curve anymore; it's the same
category of claim the Hex community uses to say a two-move handicap is unplayable on small
boards, applied to a mechanic that hands out three times that. Treat "the ambush ends the battle
outright" as close to certain, not merely probable, until the segment-1 measurement says
otherwise.

Your ambush hands one side **six consecutive unanswered placements**, on a board the doc recommends
shrinking to 7×7 (49 cells, minimum connection length 7). Six free stones placed as a bridged
ladder is not an advantage, it is very probably a completed virtual connection — a path the
opponent cannot cut no matter what they do next. If that's right, a single 0–3 round wins the city,
and does so at whatever point in the battle it happens.

The doc's defence is a flavour argument: *thematically that is exactly what being ambushed should
feel like.* That's true, and it is not answering the structural question. Rosewater's lesson #5 is
precisely this trap — interesting is not fun, and a systems-minded designer is the person most
likely to fall for it. What the player experiences is: I played thirteen tricks, lost the card
round, and the game was over before I placed a stone.

There's a second-order consequence the doc doesn't currently connect:

> **Ambush lethality and pacing pull in opposite directions.** Shrinking the board fixes pacing and
> makes the ambush *more* decisive. Growing it dilutes the ambush and makes a city take ninety
> minutes. 7×7 is the correct fix for one problem and the worst case for the other.

That tension is the central tuning decision of the whole design, and it's yours to make. Options,
not prescriptions:

- **Keep 7×7, reshape the ambush.** Cap placements per segment at 3–4 and bank or burn the surplus,
  so a lopsided round is a strong tempo swing rather than a virtual connection.
- **Keep 7×7, restrict *where*.** Your own placement-zone idea does this — see Fill 2 below. Six
  stones confined to cells adjacent to your existing stones or your own edge are strong but
  answerable; six stones placed anywhere are not.
- **Move to 9×9** and accept 4–6 card rounds per city, treating pacing as the price of survivable
  ambushes.
- **Interleave the surplus.** Your open question about consecutive vs distributed surplus is not a
  detail — it is this problem's main dial. Distributed placement (alternating, with the poorer side
  passing) is dramatically less lethal than a trailing burst, because bridges and ladders assume
  alternation.

**Measure before choosing.** One number settles it: *what fraction of battles are decided in the
first segment?*

---

## Problem 2 — the two systems are coupled in one direction only

Points flow **card → board**. Nothing flows **board → card**. The consequence is that the card
phase is mechanically identical in round 1 and round 6 of the same battle; the board state changes
only *how much you want* moves, never *how you should play tricks*. That is a scalar link, not a
shared vocabulary.

This is the Puzzle Quest test, and the concept currently fails it. It's also why the pacing problem
is worse than the raw trick count suggests: by Koster's measure, forty tricks per city is
tolerable if each round teaches something new, and grinding if round five is round one repeated.
**Pacing and decoupling are the same problem**, and fixing the coupling partly fixes the pacing.

The document actually spots this, but as an AI note — *"its Fox play should be informed by how badly
it needs moves on the current board … that link is where the game's difficulty will actually
live."* That link is real for the CPU because the CPU can read the board. It is real for the human
only if a rule makes it so. Right now no rule does.

Two fills below.

---

## Problem 3 — the round's outcome is a single threshold, and it may lock early

Worth stating more sharply than the scenario table does. Because tricks always sum to 13:

> **Every card round, exactly one side scores 6. The only questions are which side, and whether the
> other side gets 0, 1, 2 or 3.**

Check it against every split — there is no split where both sides score 6, and none where neither
does. So the "seven outcomes, two scenario types" table is really a one-dimensional dial, and the
entire round is a tug-of-war over **one boundary**: does the low side end at 3 or at 4?

That's an elegant thing to have discovered, and it's Knizia-shaped — one scoring principle
reshaping every decision. Three consequences:

1. **The 4th trick is the most valuable card in the game.** For the low side it's the difference
   between 6 moves and 1; for the high side, forcing it is the whole round. Real skill lives there,
   and Fox is exactly the trick-taker where forcing an opponent to win a trick is a genuine craft.
2. **Winning better isn't rewarded — only denying is.** 6–0 and 6–3 pay the winner identically.
   Denial is the only gradient. The doc reaches this conclusion about the two 6-point routes; this
   is the general form of it.
3. **The round can lock long before trick 13.** Once *both* players hold 4 tricks the boundary
   question is settled, and much of what remains is filler. Combined with 40+ tricks per city, this
   is the pacing problem's real mechanism. Measure *at which trick the round outcome becomes
   determined* — if the median is trick 8 or 9, that's five dead tricks per round, six rounds per
   city.

Your open question about the two 6-point routes is correctly posed and correctly answered
("measure first"). Note only that the doc's "chicken" reading is slightly off: both players
*cannot* duck, because the split is forced. The real contest is a race to shed the 4th trick, with
the loser of that race getting nothing. That's a cleaner and better game than chicken — but it does
mean the loser's 0 is common, not exceptional, which feeds straight back into Problem 1.

---

## Fill 1 — give the two systems a shared vocabulary (the Friedrich move)

Richard Sivél's *Friedrich* couples cards to a map with almost no machinery: **the map's sectors are
marked with card suits**, so where you're fighting determines which cards are strong. It's the
cheapest known two-way link between a card system and a board.

Applied here: **divide the Hex board into three regions, one per suit — Bells, Keys, Moons.** Each
round, the decree card (which sets trump, and is face up before a card is played) also designates
which region is *the theatre* this segment — say, the only region where placement is unrestricted,
or where a placement counts double, or where the surplus may be spent.

What that buys, in one stroke:

- The board becomes **legible during the card phase**. You are no longer playing for "moves," you're
  playing for moves *in the region that matters to your connection right now*, which changes with
  the position — so round 5 is not round 1.
- **The Fox (3) becomes a strategic weapon.** Its printed ability is *exchange the decree card* —
  which now means *redirect the theatre of war*. An existing card in the base deck suddenly carries
  the whole coupling. That's Rosewater's "you don't have to change much to change everything."
- It costs one rule and no new components, and it survives the base-deck-only scope note.

Risks to watch: it can make one region matter far more than others late in a battle (when your
connection is nearly complete, only one region is live), and it interacts with Problem 1 — a
region-restricted ambush is much less lethal, which is a feature. It also needs a clean visual
mapping on a rhombus, which is a look-and-feel judgement and therefore yours.

---

## Fill 2 — Treasures buy *where*, tricks buy *how many*

Your open questions include "do the Treasure 7s feed the allowance?" and, separately, an unused
placement-zone idea. Answer both with one rule:

> Tricks determine **how many** stones you place. Treasures determine **where** you may place them.

The counterweight this creates is doing exactly the work your hardest open question asks for. The
ambush route means winning almost no tricks — so **an ambusher structurally forgoes Treasures**.
The 7–9 route means winning most tricks, and Treasures ride along.

- **Ambush** = maximum stones, minimum control — must place adjacent to your own edge or your
  existing stones.
- **Pitched-battle win** = same 6 stones, but Treasures earn free placement, including behind enemy
  lines.

That differentiates the two 6-point routes without adding a single point of scoring, which is what
you asked for when you wrote "only then consider paying 7–9 more." It also keeps late tricks live —
if Treasures are still out at trick 10, the round hasn't gone dead (Problem 3.3), and it does that
without shortening the round, which the doc rightly forbids.

If you'd rather not tie the routes together this tightly, the weaker version — Treasures simply buy
one unrestricted placement each — still solves the dead-tricks half.

---

## Smaller findings

**Who opens each segment.** Alternate it. Hex's first-move advantage is a proven theorem, not a
folk belief, and the competitive answer to it is the swap rule, which you have no room for here.
A permanent CPU-first edge compounds across six segments in a single battle. Alternating costs
nothing and closes the question; if you want something better, let the side that *lost* the card
round choose who opens — a pie-rule-shaped consolation that also softens Problem 1.

**Dealer alternation is the same open question as "who opens each segment," one level up.** The
doc flags it and the first pass of this critique missed it. Fox alternates dealer each round, and
being non-dealer carries a small edge (you lead the first trick). Within one battle that averages
out over 4–8 rounds. What isn't settled is what happens at the *next* city: if dealer resets to a
fixed starting side every battle rather than continuing the alternation across the war, that small
per-round edge compounds across every city the same way a permanently CPU-first segment opener
would. Same fix as the segment-opener finding: carry the alternation across battle boundaries
rather than resetting it, and it costs nothing to specify.

**Unspent moves are lost.** Fine as documented, and the right default — banking moves would create
a second currency and a second source of burst. Make it visible in the UI, though: Meier's rule is
to err on the side of too much information, and a segment that ends with three moves unspent needs
to *look* like a resolved battle, not a bug.

**There is no war layer yet, and it decides everything below it.** "How many cities, what winning
the war means, whether anything carries between cities" is listed as an open question alongside
small ones. It isn't small. Knizia's rule — the scoring drives the gameplay — means the war's
victory condition determines whether battles should be quick and lossy or long and decisive, which
in turn determines board size, which is Problem 1's main dial. Deciding the war layer would
collapse several open questions at once. And be deliberate about carry-over: anything that makes
winning a city help you win the next one is a slippery slope at the campaign level, on top of a
battle layer that already has one.

**Can you lose a battle any way other than the opponent connecting?** There's no retreat, no
attrition, no cost to a war of attrition over a worthless city. A general who cannot choose not to
fight is missing the decision the fantasy promises. Worth a line in the war layer.

**Keep the board on screen during the card phase.** Currently it's the only channel through which
board state can inform card play at all (until Fill 1). Two UI surfaces, one persistent board — the
doc already says this; the point is that it's carrying mechanical load, not just convenience.

**The 21-point race is correctly deleted** — points are spent, not accumulated. Just note what went
with it: in stock Fox, the race is what forces players to eventually commit. Here nothing does,
which is why the shed-the-4th-trick race has to carry the round on its own. It probably can, but
it's the assumption most worth watching in the first full playtest.

---

## What to measure in the first end-to-end battle

Cheap instrumentation, and it answers most of the open questions empirically rather than by
argument. Rosewater's #19 applies to you as much as to testers — you'll spot the problems well and
mis-diagnose the fixes, so collect numbers before choosing a lever.

1. **% of battles decided in segment 1** — settles Problem 1 and the board-size question.
2. **Distribution of trick splits** — how often does 0–3/10–13 actually land? If ambushes are rare,
   Problem 1 is a tail risk; if they're a third of rounds, it's the design.
3. **Trick number at which the round outcome locks** — the dead-tricks measure behind pacing.
4. **Stones on the board at resolution vs board size** — validates the 18–25 estimate for 7×7.
5. **Moves lost to mid-allowance win checks.**
6. **Win rate by who opened the segment** — quantifies the first-move edge you're currently
   granting permanently.
7. **Wall-clock per city, and tricks per city.** The doc's estimate is unmeasured; get the real one
   before redesigning around it.

---

## The one-line summary

The coupling, the theme fit and the choice of Hex are strong enough that this is worth building.
The two things standing between it and a good game are that **a lost card round probably ends the
battle instantly**, and that **the board never talks back to the cards** — and both have cheap fixes
that use pieces already in the base deck.
