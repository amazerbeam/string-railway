# Critique: The Hunt, at the point it became winnable

**Written 2026-09-02, against `the-hunt.md` as it stands and `.docs/ai-play-tester/strategy-guide.md`'s
measurements (2,000 runs, four seeds).** The previous critique in `hybrid-design.md` §12 is about the
retired direction — declarations, trick bands, thirteen-trick rounds — and none of it applies to the
game on disk. This replaces it for the live design.

The genre is held in mind throughout: this is a **roguelike run-builder in the Balatro tradition**
(build an engine across a run, watch a requirement escalate to meet it) **crossed with a trick-taking
game**. Where a finding is about the game failing to be that thing, it says so.

---

## What is genuinely strong

**The skull inversion is the best thing in the design, and it works by giving an inherited rule a
second job.** A skull turns a trick you want to win into a trick you want to lose. On its own that is
a neat twist; what makes it structural is that the base game's "the winner leads next" rule suddenly
costs something. Taking a trick hands you the obligation to lead into an opponent whose skulls you
can count but not locate. The measurement bears this out — 2,695 hurt tricks while leading against
1,589 while following. The rule was not designed for this game and it is now load-bearing in it.
That is Mark Rosewater's lesson #17 (you rarely have to change much of a design to change everything
about how it plays) doing real work.

**The information split is exactly right, and it is the reason skill is measurable.** You are told,
per suit, how many cards the Quarry holds and how many carry a skull; you are never told a rank.
Counting suits is bookkeeping and the game does it for you; reading ranks is judgement and the game
refuses to. Everything the strategy guide's winning player does is derived from that one readout —
lead high into a clean suit, low into a skull-heavy one, and treat a void suit as skulled at the
whole-hand rate.

**Skill is worth 0% to 27%, with not one number retuned.** That is the strongest evidence in the
project that the core is sound. A game where four reading rules take the clear rate from nothing to
one run in four is a game where the decisions are real. It also retires DLR-82's ruling that the
answer was more shop and more starting health — there was no structural problem to answer.

**The slot machine posts its own odds and means them.** Eight symbols, three reels, and the stated
1.6 / 32.8 / 65.6 split falls out of the shape rather than out of anyone's dial. A machine that lied
about its strip would be worth nothing; this one can be planned against, which is the only reason a
paid re-spin is a decision.

**The pot is legible arithmetic.** Total times roll, both climbing, paying 1, 4, 9, 16, 25, 36 with
nothing bought. A player can hold that curve in their head after two tricks, which is what a
push-your-luck decision needs.

---

## Problem 1 — The engine-building half of the game has nothing to push against

**Ranked first. This is the genre failure, and every other economic complaint in the documents is
downstream of it.**

### Evidence

A run must remove **1,395 health** across 25 opponents. The guide measures the player, by fight 2,
dealing **two to six times what a fight needs and throwing the excess away** — overkill past a
depleted bar pays nothing (`the-hunt.md` §7, and `hybrid-design.md` §12 already flagged the residual).

The reason the surplus is so large is arithmetic rather than tuning. A trick pays

```
(BASE + whetstones + flat damage) × (1 + multiplier + Overlap Bonus)
```

and the Overlap Bonus is **one multiplier point per extra card that paid**. So with *n* bronze
flat-damage cards fired on one trick, the trick pays `(1 + n) × n`. At the measured stack of 12.2
cards that is about **161 damage on a single trick** — more than any opponent in the run's first
three stages holds, from one trick. At `skilledCardsFirst`'s 29.7 cards it is about **900**.

Meanwhile the thing that actually ends runs is health, and health is not on that axis at all. Every
hurt trick costs exactly **1**, always, and 39.2% of tricks are hurt tricks even under correct play.

### What the player experiences

The Balatro promise is that the requirement chases the engine — you build something absurd because
something absurd is being asked of you. Here the requirement is flat and was cleared in the first
stage. The player keeps winning cards from a machine, keeps firing bigger stacks, watches numbers
get larger, and none of it changes whether they survive. The excess is not banked, converted, or
even acknowledged; it is silently discarded at the moment the Quarry's bar empties.

### The one place damage *does* convert, and why it comes too late

Damage buys survival only through **fight length**, and only in whole hands. Model the run this way:
a bar of *M* health buys roughly `M / 0.392 ≈ 2.55 × M` tricks of play before it empties, and a shop
visit refills you to *M* for a coin. So the whole run is the question **"can each fight be finished
inside about 2.5M tricks?"** — 25 tricks at the starting bar of 10, about 51 at a bought-up bar of 20.

Against Aoife at 10 health, a fight already ends in one or two tricks, so extra damage removes
nothing — there is no shorter fight to buy. Against Diarmuid at 135, at the measured 18.24 damage a
hand, a fight is about seven hands, which is roughly forty tricks and about seventeen hurt tricks
against a bar of twenty. **Damage output is worthless for the first ten fights and decisive for the
last five, and nothing carries the first half's surplus into the second half.** That is the whole
problem in one sentence.

### What it connects to

This is the same problem as **"the shop poses no choice"** and **"buying the ceiling is worth 41%
more of the run"**, and the connection is worth stating because the documents record them as three
separate observations.

A heal is 1 coin for 4 health, income is about 17 coins a fight, and healing **clamps to your
maximum**. So coins are not scarce — the *ceiling* is the only scarce thing in the shop, because it
is the only purchase that raises the amount of health a coin can buy back. That is why the ceiling
ladder measures as the biggest lever available, and it is why the rest of the shelf is decoration.
**The Hunt is currently a one-item shop with a climbing price and twenty-four items of scenery.**

By Dan Cook's loop test — every outer loop should change the conditions of the inner loop — the
run's economy is a one-way arrow. Cards flow in; nothing about how a trick plays comes back out.

### Options, not a prescription

- **Let the surplus buy the late game.** The quick-kill payout is already the design's own
  surplus-to-coins bridge and it is broken (it counts unplayed cards, and the hand now refills to
  four, so it measures nothing). Repairing it to count *tricks remaining* restores the intent and
  adds no rule. Overkill damage paying coins is the same idea one step further.
- **Make the requirement chase the engine.** Raise the health curve so damage output is actually
  pursued rather than exceeded. This is the genre-native answer and it is a curve, not a rule.
- **Put health on the reward axes.** No card in the pool interacts with the binding resource. One
  reward kind that converts pot into health — or the planned health-stake counterweight run in
  reverse — would make the damage engine and the survival problem the same problem.

All three are tuning or curve decisions and none of them is mine.

---

## Problem 2 — There is no build, only a stack

**Ranked second, and it is the other half of the genre promise.**

### Evidence

The mintable pool is **16 templates**: three condition families (win-with-a-suit, lose-with-a-suit,
dodge-a-skull) across three suits and two reward axes, plus Cheat and Timebomb. Every one of them
pays either flat damage or multiplier points. There is no card that changes a rule, alters what a
trick does, or interacts with another card.

So two runs differ in *how many* cards you hold and in *which suits*, never in what your deck does.
There is no archetype to find and nothing to build toward — Ralph Koster's mastery test (what is
hour five teaching that hour one wasn't?) has no answer past "arm the ones that match the plan",
which is finding 3 of the strategy guide and is learned once.

### The Overlap Bonus makes count the only variable that matters

Card count enters the payoff **twice** — once in the damage sum and once through the Overlap Bonus's
multiplier — while tier enters **once**. That single asymmetry produces both of the dominated
decisions already recorded as separate Known Tensions:

- **Combining is always a downgrade.** Ten bronze flat cards pay `(1 + 10) × 10 = 110`; the five
  silver they merge into pay `(1 + 15) × 5 = 80`. The Manage Buffs screen is dominated at every pile
  size measured, and the pile has no cap, so there is not even a storage reason to use it.
- **Hoard everything, dump it on one trick, cash immediately.** Timing is value-neutral but exposure
  is not, so the strictly-better line is to roll bare tricks to build the roll and fire the whole
  pile on the trick you cash on.

These are the same finding. Both are Sid Meier's dominant-option failure (a choice whose right answer
never changes is not a choice), and both are moved by the same lever.

### Options

Capping how many cards may fire on one trick, or making the Overlap Bonus sublinear in count,
addresses both at once — and would make combining a real decision rather than a trap, without
touching the tier ladder. Alternatively, retuning the tier ladder so a silver beats two bronze fixes
the combine screen alone and leaves the hoard line untouched. Any card in the pool that changed a
rule rather than a number would do more for the genre than either.

---

## Problem 3 — The buff window closes before the trick is knowable

**Ranked third: it is narrower than the two above, but it is the one that makes correct play punish
you.**

The core read of this game is *is this a trick to take or to duck?* — and on most tricks that read is
only available **after** the buff window has shut. Once a card is on the table nothing can be armed.
The guide measures **36% of tricks with no read taken at all**, and flags that whether this is the
game's rule or the simulator's ordering has never been settled. It should be settled first; if it is
the rule, it is a large and invisible constraint on when the card layer may be used.

The sharpest consequence is Timebomb. It marks the next card played and pays its damage to whichever
side loses the primed trick — 4 to the Quarry, 2 to you, plus your whole streak. For a player who
tries to win every trick it is 58% of all damage dealt. For a player who *correctly* ducks skulled
tricks it is 44% of all damage taken, and it alone is what makes a full-bar hand possible: withhold
Timebombs and the worst hand in the sample drops from 10 health to 6. **The card is a tax on playing
well**, and the cause is exactly the ordering above — you must commit it before you can know whether
this is a trick you want to lose.

The strategy guide's answer is to never play it, which is blunt, and tells you the card is currently
negative-value in a correct hand. The sharp answer — prime only on a trick you intend to take — is
untested and unreachable while the window opens first.

Whether the window should move is the developer's. Worth noting that a Cheat already has an exception
letting it be used mid-trick, precisely because mid-trick is when it is worth something; the same
argument applies to Timebomb, and was explicitly rejected on 2026-08-26 on the grounds that
committing blind is its cost. That reasoning is now measured to cost more than the card is worth.

---

## Problem 4 — There is no catch-up of any kind

Ranked fourth because it is a known and partly deliberate cost, but it belongs stated in one place.

A hurt trick takes 1 health, wipes the total, wipes the roll, and **pays the Quarry nothing**. The
two-thirds consolation was removed on 2026-09-01 and nothing replaced it. Nothing restores health
during a fight. Nothing about being behind makes anything easier. David Sirlin's slippery slope
(positive feedback letting one early event decide a match well before it ends) is fully present in
the health bar and there is no rubber band anywhere against it.

Rosewater's list of ten things every game needs puts catch-up on it for a reason: the loser needs
something to hope for. Here the answer is "the shop", and the shop refills you to *M* and cannot go
further, so a run that has fallen behind on ceiling purchases cannot buy its way back — it can only
buy back to the same bar it already had.

**This is partly working as intended** and the design says so: a total wipe is what makes rolling
over a real bet. The undecided lever is already named in the ruleset — halving the roll on a hit
rather than wiping it — and it is the cheapest catch-up available without adding a rule anywhere.
The document is right to have it open. What it does not say is that this is currently the *only*
catch-up lever the design has any candidate for.

---

## Fill — the surplus-to-progress bridge the design already half-built

The missing connection is that **Problem 1 and Problem 4 want the same fix, and the game already
contains its first draft.**

The quick-kill payout pays coins for ending a fight fast. That is precisely a converter from
"damage I have in surplus" into "progress I can spend on the resource that binds me". It is broken
for a documented reason (it counts unplayed cards; the hand now refills to four, so a fifth-trick
first-hand kill pays 8 where it used to pay 2) and repairing it costs one line.

Restore it to count tricks remaining, and the early run's enormous damage surplus starts buying
ceiling steps, which is exactly the resource the late run runs out of. One repair, and the run's two
halves start talking to each other — the outer loop begins changing the inner loop's conditions,
which is the property Problem 1 says is missing.

**Risks to watch:** it makes an already-uncontested early game pay even more, so the ceiling ladder's
climbing price becomes the only brake in the run and would need looking at alongside it. And it does
nothing for a player who is already behind, so it sharpens Problem 4 rather than softening it.

---

## Smaller findings

**The deck's two most interesting cards are inert.** The Fox changes the trump suit outright and the
Woodcutter draws and buries — between them the strongest levers in the deck, and the strategy guide
plays around both because they open a prompt it cannot answer. A card the best-measured player
refuses to touch is a card that is not yet in the game. Worth measuring before anything is added.

**Two unfair skulls survive the rank curve and are unaddressed.** A skull in the **trump suit** is
near-harmless at any rank, and a Quarry **void in the led suit** can dump a skull of any rank with no
counterplay. The curve concentrates skulls on ranks 4–7 to keep the outcome in the player's hands;
these two cases leak straight through it. Both are recorded and neither is designed.

**The resolution prompt fires up to six times a hand and cannot be refused.** Roughly three seconds a
trick, blocking, full viewport, on a decision that finding 5 shows has a near-fixed correct answer
(cash at a roll of one or two). A mandatory screen for a decision that is usually already made is the
shape of a thing that wears out. Skipping it on a bare trick where nothing is at stake is named in
the tensions and not built.

**The pot's squaring is largely decorative.** Pushing from a roll of *r* pays only while the chance
of banking the next trick beats `r / (r+1)` — 0.5 at the first, 0.75 at the third. The measured bank
rate is 60.8%, so the correct play is to cash at one or two and essentially never push. The 1, 4, 9,
16, 25, 36 curve that reads as the game's signature is a curve the card game cannot supply the events
for. That is structural, not tuning: a trick-taking game against a symmetric opponent gives you about
half the tricks. If a long streak is meant to be the fantasy, something has to raise the bank rate,
not raise the payout.

**Diarmuid is a block with 135 health.** The final boss is designed to break follow-suit and does not.
Twenty-five opponents currently differ by name and health only, so the run escalates in size and never
in kind. For a genre whose late run is supposed to feel different, that is a real gap, and it is
already marked `[not built]`.

**The fight screen still names opponents after deck ranks.** Swan, Fox, Woodcutter, Witch and Monarch
name both card ranks and, in the dossier panel, the opponent. Two vocabularies on one screen.

---

## What to measure

Ranked by what would most change the picture, cheapest first:

1. **Settle whether the 36% of tricks with no buff window is the rule or the simulator's ordering.**
   This is a yes/no read of the engine and it decides whether Problem 3 is a design question or a
   defect. Nothing else should be built on the card layer until it is answered.
2. **Sweep the opponent health curve upward and re-measure the clear rate.** If the run stays winnable
   at a substantially steeper curve, Problem 1's simplest answer is free — the requirement was just
   too low. If it collapses, the surplus really does need converting rather than consuming.
3. **Measure a policy that pushes the roll rather than cashing at one.** Every damage figure on record
   is a lower bound, because the simulated player always cashes. If a pushing policy cannot beat it,
   finding 5's verdict on the squaring is confirmed and the curve should be redesigned rather than
   retuned.
4. **Give the simulator the Fox and the Woodcutter.** Two of the deck's named ranks are unmeasured,
   and they are the two that change the board rather than the score.
5. **Play three fights with the Overlap Bonus capped at, say, three cards, and see whether the pile
   still dominates.** This is the one lever that touches Problem 2's two dominated screens at once,
   and the cheapest way to find out is one constant and one session.
6. **Play a run to fight 20 and record what you actually did with the damage surplus.** The claim that
   the excess feels like nothing is measured but not *felt*, and it is the developer's eyes that
   decide whether it reads as power fantasy or as waste.

---

## The one-line summary

The trick-taking half of this game is genuinely good and is now proven to reward skill; the
run-building half has no problem to solve, because damage is in enormous surplus for two-thirds of a
run and the only scarce thing in the game — the health ceiling — sits on an axis no card in the pool
can touch.
