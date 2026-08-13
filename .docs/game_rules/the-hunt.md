# The Hunt

A single-player trick-taking game — a Balatro × Forbidden Solitaire treatment of
_The Fox in the Forest_. This document is the **rules as they currently stand**: the procedure a
player follows, stated once, in playing order.

Last reviewed against the code and the design on **2026-08-12**. Everything below is reachable in
the app today except where a rule is marked **[not built]**.

> **A redesign is in progress, and this document straddles it.** The design has moved to a **duel**:
> both sides hold health, and each side's total is *damage* dealt to the other rather than a score
> checked against a target. Five pieces have landed. DLR-66 gave the two multiplier tables and every
> health, rounding, and depletion value as configuration. **DLR-67 then removed the old direction**:
> the Demand target and the capped Lose-credit mechanic are both gone from the game, and the Hunt now
> ends by stating each side's damage. **DLR-68 then gave that damage a direction and a rounding rule**
> — each side's total is now computed as damage *to the other side*, and the ×0.5 bands can no longer
> produce a fractional total. **DLR-69 then closed the last interim in the equation**: on the Lose
> path the two capture piles swap, so each side is paid for the pile it did *not* win (section 7).
> **DLR-70 then built the health those figures were always for** — both bars deplete, an encounter
> ends the moment one empties, and the game finally has a win and a lose condition (section 8).
> **DLR-71 then put the duel on screen**: both health bars are visible for the whole Hunt, each showing
> its side's pending damage as it accumulates, and the damage lands where a player can watch it.
>
> **The duel is now playable.** You can win an encounter and you can lose a run, by playing. That is the
> change to hold onto while reading section 8 — the previous revision of this document said the opposite,
> because until 2026-08-12 every rule of the duel was enforced in code and none of it was wired to a
> screen. What remains unreachable is narrower and named: the **sequence of encounters**. The app fights
> one Quarry; the second, the between-encounter restore, and the run around them are DLR-73's.

---

## What this document is, and is not

| Doc                            | Owns                                                     | Answers                    |
| ------------------------------ | -------------------------------------------------------- | -------------------------- |
| **`the-hunt.md`** (this file)  | The playable procedure as it currently stands            | "What are the rules?"      |
| `../design/…/hybrid-design.md` | Why each rule exists, the discarded branches, open forks | "Why this rule?"           |
| `../implementation/<module>/`  | What the code does, per module                           | "How does the code do it?" |

So: **no argument, no rationale, no code.** Where a rule needs justifying, this file cites
`hybrid-design.md §N` and stops. Where a reader needs to know what enforces a rule, the
[Status register](#status-register) at the foot carries the pointer — once, in one table.

`fox-in-the-forest.md` in this folder is the **base game**, transcribed. This game is not a variant
of it that you play with the rulebook open: everything you need is below. The base game is cited
where a rule is carried over unchanged, so a reader can see what was inherited rather than designed.

### Status markers

Every rule below carries one. A rules document for a game still being designed is only useful if it
distinguishes what is decided from what is being played to find out.

| Marker            | Means                                                                             |
| ----------------- | --------------------------------------------------------------------------------- |
| **[settled]**     | Decided and playable. Changing it is a design change, not a tuning pass.          |
| **[provisional]** | Playable, but the value or the reading is expected to move after a playtest.      |
| **[open]**        | Not decided. The procedure stated is a placeholder, and may not survive.          |
| **[not built]**   | Decided in design, but nothing enforces it — you cannot do this in the app today. |

---

## 1. Components

**[settled]**

One deck of **33 cards**: three suits — **Bells**, **Keys**, **Moons** — each ranked **1–11**.

Seven ranks carry a name, and the name is what the rules refer to:

| Rank | Name           |
| ---- | -------------- |
| 1    | **Swan**       |
| 3    | **Fox**        |
| 5    | **Woodcutter** |
| 7    | **Treasure**   |
| 8    | **Poison**     |
| 9    | **Witch**      |
| 11   | **Monarch**    |

There are no other cards. The base game's three expansion modules — special cards, goal cards, and
the Poison-8 swap — are not in this game (§8; see [What this game does not have](#11-what-this-game-does-not-have)).
The **Poison** name sits on the ordinary rank 8 of all three suits, not on a separate module card.

---

## 2. The shape of a Hunt

**[settled]**

A **Hunt** is one round of **13 tricks**, scored once at the end. It is the whole of the game you
can currently play.

### Setup

1. Shuffle the 33 cards.
2. Deal **13** to the player and **13** to the Quarry, each hidden from the other.
3. The **27th card** is turned face up as the **decree**. Its suit is the **trump suit** for the
   Hunt.
4. The remaining **6 cards** form the **draw pile**, face down.

This is the base game's setup unchanged: it deals 13 and 13, sets the remaining 7 face down, and
turns the top one face up **beside** the deck as the decree — leaving 6 in the deck, which is the
count here. The Fox exchanges with the decree; the Woodcutter draws from the pile and discards back
to it, so the pile stays at 6 for the whole Hunt.

### Who deals, who leads

**[provisional]** — the Hunt 1 dealer is a placeholder, not a decision.

The **player deals Hunt 1**, and the deal alternates every Hunt after. The **non-dealer leads the
first trick**.

---

## 3. The declaration

**[settled]**

Before the first card is played, the player sees their full 13-card hand and **declares Win or
Lose** for this Hunt. The declaration is made **once** and cannot be changed, and **no card may be
played until it is made**.

It is the player's alone — **the Quarry never declares** — and it governs **both sides**: whichever
path is declared sets the card values and the Standing table that the player and the Quarry are both
scored on.

### Declaring Win

Card capture and card value work as sections 5–7 describe with no modification. This is the plain
game.

### Declaring Lose

Two things change, and nothing else does.

**Card value inverts**, for both sides. A card of rank `r` is worth **`12 − r`** instead of `r`. The
Swan (1) becomes the fattest card at 11; the Monarch (11) becomes the thinnest at 1. The pivot is 12
because that is one above the deck's top rank, which makes the inversion its own mirror — rank 1 and
rank 11 swap places.

**A different Standing table bands the trick count** — see section 7. Its peak sits at 4–6 tricks
where the Win table's sits at 7–9.

That is the whole of it. **Declaring Lose adds no decision during play**: every trick plays and
resolves identically on both paths, and the declaration's entire effect is on how the Hunt is scored
at the end.

> **This is a reduction from what the Lose path used to be.** Until 2026-08-12 declaring Lose also
> handed you a capped pool of three **Lose-credits**, each spendable on a trick you had just lost to
> credit its two cards to your Spoils — a decision offered on every lost trick as it resolved. §1
> replaces that mechanic outright with a **pile swap**, and the credit pool was removed ahead of the
> swap landing. The swap landed on 2026-08-12 (section 7), so the Lose path's reward for a lost trick
> is now structural rather than a decision: a trick you lose fattens your own total automatically,
> with nothing to spend and nothing to choose. The Lose path therefore still has **no between-trick
> decision of its own**, and by design no longer needs one.

### What the declaration changes, and what it does not

**[settled]**

**Standing depends on the declaration.** Each path reads **its own multiplier table**, and the two
tables differ in both their multipliers and their band boundaries — see section 7. This replaced a
single shared table, and it is the declaration's whole consequence on the multiplicative term.

**Card value depends on the declaration** — base rank on Win, inverted on Lose — and applies to both
sides' cards alike.

The **damage equation** (section 8) is identical on both paths.

> **This reverses an earlier rule.** Until 2026-08-12 there was one Standing table read on both
> declared paths, and this document said so. There are now two (§1, §9 "The multipliers", Decided
> 2026-08-11).

---

## 4. Playing a trick

**[settled]**

Both sides play one card face up per trick: one **leads**, the other **follows**.

**Leading.** The leader may play any card in hand. That card's suit is the **lead suit**.

**Following.** The follower **must play a card of the lead suit if they hold one** — any rank of it.
Holding none of the lead suit, they may play any card.

**Two exceptions narrow the follow further**, and both come from the Monarch:

- **A led Monarch.** If the lead card is a Monarch and the follower holds any card of that suit,
  they may play **only** their Swan of that suit (if held) or their **highest** card of that suit —
  nothing else. Holding none of that suit, the normal freedom applies.
- **The Monarch Quarry.** See section 9 — the same narrowing, but on every lead the Quarry makes.

"Highest" is read from the hand **at the moment you follow**, not fixed at the deal. Shedding your
Swan and your top card of a suit leaves you narrowed to your new highest; you are only free of the
constraint in a suit once you hold none of that suit at all.

---

## 5. Abilities

**[settled]**

Each named rank does one thing — except two. The odd ranks act during play; the **Treasure (7) and
the Poison (8) now do nothing at all**, and are named cards with no rule attached. Every other even
rank does nothing either.

| Rank | Name           | Effect                                                                                                                                                                              |
| ---- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Swan**       | If a Swan is in a trick and belongs to the side that **lost** it, that side **leads the next trick**. Two Swans: the loser leads either way.                                        |
| 3    | **Fox**        | On playing it, you **may** exchange the decree card for a card from your hand. The exchanged card becomes the new decree, and its suit becomes the new trump suit. You may decline. |
| 5    | **Woodcutter** | On playing it, **draw the top card of the draw pile**, then put **one card** from your hand — the drawn card or one you already held — on the **bottom** of the pile.               |
| 7    | **Treasure**   | **No effect at all.** A named card that scores its printed rank like any other. Its `+1` was removed on 2026-08-12.                                                                 |
| 8    | **Poison**     | **No effect at all.** A named card that scores its printed rank like any other. Its `−1` was removed on 2026-08-12.                                                                 |
| 9    | **Witch**      | If a trick contains **exactly one** Witch, that Witch counts as trump when the winner is decided. **Two Witches cancel** — neither is treated as trump.                             |
| 11   | **Monarch**    | Narrows the follower's legal play — see section 4.                                                                                                                                  |

**Timing.** The Fox and the Woodcutter resolve **the instant the card is played**, before the other
card is played and before the winner is decided. So if the Fox changes the decree, the **new** trump
suit decides the **current** trick — as the base game's own appendix specifies.

> **Deviation from the base game — the Treasure and the Poison, and it is total.** In the base game
> the Treasure awards a point to the trick's winner, and the Poison is an **expansion module** (swap
> the three ordinary 8s for three Poison 8s; taking one costs a point, floored at zero). Play the base
> game without that module and rank 8 has no rule on it whatsoever.
>
> **Here neither card has any rule.** Both scored a `±1` on their Spoils value until 2026-08-12, when
> §1 removed every modifier from the additive term: at ×5 a ±1 moves a Hunt by under 1%, so both were
> paying rules budget for a rounding error. A card's value is now its printed rank and nothing else.
>
> The two names are **kept** — §1 keeps rank 7's identity as a named card — so Treasure and Poison
> still exist to be referred to, and a later ticket may give them something to do. Today they are
> ordinary cards with memorable names.
>
> One consequence is worth stating because the design leaned on it: **no card is worth declining**,
> and now permanently so. There is no negative card value anywhere in this game, so no card a player
> would rather leave behind. That is recorded under
> [Known tensions](#known-tensions-recorded-not-resolved).

---

## 6. Deciding the trick, and capture

**[settled]**

A card is **effectively trump** if its suit is the trump suit **or** it is the sole Witch in the
trick. Then, in order:

1. If **either** card is effectively trump, the **higher-ranked effectively-trump card wins**.
2. Otherwise, if **both** cards are of the lead suit, the **higher rank wins**.
3. Otherwise the follower is off-suit and cannot win: the **lead card wins**.

The trump suit used is the one in force **at that moment** — after any Fox exchange made in this
same trick.

**Capture.** The winner takes both cards into their capture pile and their trick total goes up by
one. Trick totals are public; the faces in a capture pile are not re-read during play.

**The next lead** is the trick's winner, unless the Swan's rule (section 5) hands it to the loser.

After 13 tricks the Hunt is over.

---

## 7. Spoils and Standing

The Hunt is scored on two terms, and they are different kinds of number: **Spoils adds**,
**Standing multiplies** (§1).

### Spoils — the additive term

**[settled]** — a card's value is its printed rank, and **no modifier of any kind touches it**. This
was §9's highest-leverage open fork and is now closed (Decided 2026-08-11): the Lose path's `12 − r`
inversion has no meaning at a flat value of 1.

**A card's value is its printed rank**, or `12 − r` if Lose was declared. A Bells 11 is worth 11 on
the Win path and 1 on the Lose path. Nothing is added or subtracted on top — no Treasure `+1`, no
Poison `−1` (see section 5).

**[settled]** — whose pile a side is paid for. Closed 2026-08-12; this was the last piece of §1's
equation left unbuilt.

**Each side is paid for exactly one capture pile, and the declaration decides which.** On the Win
path a side is paid for **its own** pile, at printed rank. On the Lose path a side is paid for **the
other side's** pile, at `12 − r`. So **each pile is counted exactly once, by the side that did not
win it** (§1). Both sides are read the same way; the declaration is the round's, not the player's.

The consequence is the whole point of the Lose path: **every trick you take fattens the Quarry's
total, and every trick it takes fattens yours.** That is what makes declaring Lose a plan you can
execute well rather than badly — a player who declares Lose and wins zero tricks is paid for the
Quarry's entire thirteen-trick sweep, and finishes ahead rather than behind.

> **This reverses the own-pile reading this document carried until 2026-08-12.** Both sides used to
> be paid for what they had captured themselves, on either path — a deliberate interim held while the
> Lose-credit pool it replaced was removed (section 3). The swap is now what the code does, so the
> interim is gone rather than pending.

### Standing — the multiplicative term

**[settled]**

Standing is read off the band your **final trick count** lands in, on **the table for the declaration
in force**. There are two.

The declaration is the player's alone — **the Quarry never declares for itself** — and **both sides
read whichever table that single declaration selected**. Since 2026-08-12 both sides' Standing is
read and both sides' damage is stated (section 8).

| Tricks won | Band           | Declared Win | Declared Lose |
| ---------- | -------------- | ------------ | ------------- |
| 0–3        | **Humble**     | ×1           | ×0.5          |
| 4          | **Defeated**   | ×2           | ×5            |
| 5          | **Defeated**   | ×3           | ×5            |
| 6          | **Defeated**   | ×4           | ×5            |
| 7          | **Victorious** | ×5           | ×4            |
| 8          | **Victorious** | ×5           | ×3            |
| 9          | **Victorious** | ×5           | ×2            |
| 10–13      | **Greedy**     | ×0.5         | ×1            |

**Each path has exactly one peak**: 7–9 on Win, 4–6 on Lose. Winning too many tricks is punished on
either path, which is the property the whole equation exists to carry (§1).

**The two tables are exact complements** — the Lose multiplier at `k` tricks always equals the Win
multiplier at `13 − k`. That is load-bearing rather than a curiosity: it is why a Quarry allowed to
declare the opposite path would cancel the two tables to zero damage in every split, which is why it
does not get to declare (§1, and the design's direction section).

The **band boundaries** are still the base game's own end-of-round groupings — Humble 0–3, Defeated
4/5/6, Victorious 7–9, Greedy 10–13 — but **the two tables group their rows differently within them**:
Win pays one rate across all of 7–9, while Lose pays one rate across all of 4–6. The **multipliers are
no longer a transcription**; they are designed, capped at ×5 on either path, and recorded as Decided
2026-08-11 (§9 "The multipliers").

> **This replaced the base game's printed column, and two long-standing problems went with it.** The old
> single table paid ×6 at both 0–3 and 7–9, and ×0 at 10–13. §6 retires the proof that made the first a
> problem: it depended on two bands *sharing* a top multiplier, and neither new table does that, so the
> dominance is dissolved by construction rather than argued away. The ×0 row is gone as well — the
> lowest multiplier anywhere is now ×0.5, so no Hunt is zeroed outright.

> **Changing either table is a design change, not a tuning pass.** The alternative pair the design
> records moves both peaks to the extremes, which reverses the property §1 is built on. The tables are
> configuration and a whole-pair swap is a one-file edit — but cheap is not the same as neutral.

> **Half-multipliers mean half-point totals, and the rounding rule is now [settled] and applied.**
> ×0.5 on an odd card sum produces a fractional product. The rule is **round half away from zero**,
> and since 2026-08-12 it is applied at the single point where a product becomes damage — so **every
> damage total is a whole number**. §9's alternative that would have deleted the question (double every
> entry in both tables and both health totals) was therefore not taken.
>
> One consequence is visible and is a copy problem rather than a rules problem: the Hunt's closing
> readout states the two terms and the product side by side, so a card sum of 123 in a ×0.5 band reads
> as `123 × 0.5 = 62`. The damage is correct; the equation as written looks wrong. How that is
> presented is the developer's, and **it is still open**: the health-bar ticket was expected to own it
> and did not — it changed nothing about how the equation is written, so the discrepancy shipped intact.

---

## 8. The end of a Hunt, and the duel

**[settled]** — the equation, and since 2026-08-12 the duel it feeds, which is now **playable**; see the
note at the foot of this section for what is still out of reach.

```
Damage = Spoils × Standing
```

Computed **once**, at the end of the thirteenth trick, **for each side** from that side's own trick
count and Spoils. Every total is **rounded to a whole number** (section 7).

The multiplier is read off the *final* trick count, so **no total is settled before the last trick
resolves** — the same equation run mid-Hunt gives you the figure as it stands, not the figure you will
end on, and one more trick can move it to a different band entirely. Nothing is applied until the Hunt
ends — see **Damage is knowable before it lands**, below.

Both figures are stated when the Hunt ends, side by side.

**Each side's damage is dealt to the other side.** Your thirteen tricks produce the figure that would
deplete the *Quarry*, and its tricks produce the figure that would deplete *you*. Since 2026-08-12
that direction is part of the result itself rather than something a later reader has to apply — the
two totals arrive already labelled with the side each one hurts.

Note that the *pile* each figure sums is a separate question from the *side* it hurts, and on the Lose
path the two cross in opposite directions: your figure is built from the Quarry's captured cards
(section 7) and is dealt to the Quarry.

> **The base game has no equivalent, because it had no direction to state.** There, one table scored
> each player against the same 21-point match. Here the two figures point at each other.

**A Hunt that has not finished, or was never declared, is not scored at all.** There is no partial
answer and no zero: a total is only meaningful once all thirteen tricks have resolved, and the value
scheme both sides are paid on comes from the declaration, so an undeclared Hunt has no scheme to
score under. Neither state is reachable in normal play — the declaration gates the first trick
(section 3) — and both are refused outright rather than guessed at.

### The old direction is gone

Until 2026-08-12 the player's total was checked against a **Demand** — a score target, fixed at 220 —
and the Hunt was cleared or missed on an inclusive boundary. §1 replaces that comparison with the duel
below, and §9 **deleted** its Demand base/growth row rather than marking it Undecided, because there is
no longer a question to ask. There is no target of any kind in this game.

### The duel — **[settled]**

Both sides hold **health**, and each side's damage depletes the other's. Damage is applied **once**, at
the end of the thirteenth trick — **never per trick**.

| Value                              | Decided                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| Player's starting health           | **1,350** (§9, 2026-08-11)                                 |
| First Quarry's health              | **1,350** — equal to the player's, deliberately            |
| Second Quarry's health             | **1,600**                                                  |
| Health restored between encounters | **None** — **[not built]**, and nothing reads it yet       |
| Both bars emptying on one Hunt     | **The player loses** (§5, §9, 2026-08-11)                  |

The player's and first Quarry's health being **equal** is the load-bearing part, not the number: that
equality is what puts the win/lose boundary exactly on the **6/7 trick line** the declaration commits
to. §5 states the property survives any later rescaling, so moving both together keeps it.

### An encounter, and how it ends — **[settled]**

An **encounter** is a sequence of Hunts against one Quarry, fought until a bar empties. A Hunt does not
end anything by itself; it deals damage, and the encounter ends when that damage runs a bar out.

**Both bars deplete together**, from the one Hunt, before either is checked. Then:

| After the damage lands            | Outcome                                    |
| --------------------------------- | ------------------------------------------ |
| Only the Quarry's bar is empty    | **You win the encounter.**                 |
| Only your bar is empty            | **The run ends.**                          |
| **Both, on the same Hunt**        | **You lose** (§5, §9, 2026-08-11).         |
| Neither                           | The encounter continues; deal another Hunt. |

That both bars are settled simultaneously is what makes the third row reachable at all — checking one
bar before applying the other side's damage would end the encounter early and the tie could never
happen.

**Surplus damage is discarded.** Damage past a depleted bar is not carried into the next Hunt, not
banked, and not converted into anything. Dealing 5,000 into a bar with 1,350 left is exactly the same
as dealing 1,350. §9 records the question of paying overkill out as **Deferred**, so this is a chosen
rule rather than an accident of the arithmetic. **Health is never negative** — a bar stops at zero.

### Closing a Hunt takes one confirmation — **[provisional]**

When the thirteenth trick resolves, the Hunt's closing readout appears with both sides' equations stated
and **the damage not yet applied**. Both bars still stand where they did, each still showing its pending
segment. You then **confirm, once**, and the damage lands: both bars move together to their new totals.

Only then does the Hunt actually end. If neither bar emptied you confirm a second time to be dealt the
next Hunt; if one did, the encounter's outcome is stated in its place and no further Hunt is offered.

The confirmation exists so the damage is seen to land rather than having already landed by the time the
next screen appears — the bars are the whole point of watching pending damage accumulate for thirteen
tricks, and they would otherwise move off-screen. **It is not a decision**: nothing is chosen, nothing
can be declined, and the damage is identical either way.

It is marked provisional for that reason. An encounter resolved in the fast band costs 3–4 of these
presses and a Greedy-band encounter costs up to 23, on top of the two the Hunt already opens with (the
declaration, then the Quarry's first lead). Whether it reads as a beat or as a speed bump is the
developer's, and removing it is a presentation change rather than a rules one.

### There is no limit on the number of Hunts — **[settled]**

An encounter runs **as many Hunts as it takes**. There is deliberately no cap, and this is a decision
rather than an omission: §11 records that the stall is the evidence a cap is needed, so the game is
played uncapped first and a limit is added only if playing proves one necessary.

It matters because the spread is wide. Playing for the peak band resolves an encounter in **3–4
Hunts**; playing for the Greedy band at ×0.5 stretches it to **18–23**. The long tail is the thing to
watch for.

### Damage is knowable before it lands — **[settled]**, and now shown

Because a total is `Spoils × Standing` over the tricks captured so far, the **pending** figure for both
sides can be read at any point mid-Hunt: the same equation, evaluated early. It is a **readout, never
an application** — nothing touches a health bar until the thirteenth trick resolves, so a pending
figure large enough to kill does not kill.

That is what keeps a Hunt live to the end. A Quarry sitting on nine tricks with lethal pending damage
can still be pushed to a tenth, where its multiplier collapses — §6 names this the catch-up route the
equation already pays for at no new rules.

**Since 2026-08-12 both pending figures are on screen for the whole Hunt**, drawn on the health bars
themselves rather than printed beside them: each bar shows the health that would survive this Hunt as
solid, and the health at risk as a lighter segment carved out of it. So the two are distinguishable
without reading a number, and **the segment shrinks** when a trick moves you into a worse band — the
540-to-60 collapse a tenth trick causes on the Win path is visible as the lighter part receding rather
than as a figure changing.

The pending figure and the applied damage are **the same figure**: what a bar shows at the thirteenth
trick is what it loses when the damage lands. That is not a promise about care taken; it is a property of
there being one equation and one place it is applied.

A bar also states when this Hunt's pending damage would empty it. That is a state of the bar rather than
a warning, and it is drawn as a change of form as well as of shade, so it survives a greyscale display.

### Both sides are scored, and now both can lose

Since 2026-08-12 the Quarry's Spoils, Standing and damage are all computed and shown alongside the
player's, on the same declaration's value scheme and table — a change from the old direction, where
only the player was scored because only the player had a target. §8 records what the one-sided version
cost: in the base game every trick either side took pushed the other toward a mirrored losing band, and
that was the mid-round tension. Two-sided damage into two health bars is what restores it.

> ### What a player can actually reach today — **as of 2026-08-12**
>
> **Everything in section 8 above is now playable.** Both health bars are on screen for the whole Hunt
> against their configured maxima, each carrying its own pending damage, updated after every trick. The
> damage lands when you confirm it, both bars move, health carries into the next Hunt, and the encounter
> ends the moment a bar empties — so **you can win an encounter, and you can lose the run.**
>
> What is **not** reachable is the sequence around it. You fight one Quarry: nothing advances to the
> second at 1,600 health, the **between-encounter restore** is still read by nothing (the one value in the
> table above with no consumer), and there is no victory or defeat screen — when a bar empties, the Hunt's
> closing readout states the outcome in place and stops offering another Hunt. **Forage** (section 10) does
> not exist either, so the deck never changes between Hunts.
>
> So a session can now end. What it cannot yet do is continue past the encounter it ends.

---

## 9. The Quarry

**[provisional]** — one of five characters is built.

The Quarry is the CPU opponent for one Hunt. It **plays by the player's rules** — it follows suit,
holds 13 cards, and plays one card per trick — with exactly **one printed exception**: its
character's ability, normally attached to the single card that prints it, applies for the **whole
Hunt**.

Five characters are designed, cast from the deck's own odd ranks (§4). **Only the Monarch is
built**, and every Hunt in the app today runs against it.

### The Monarch — **[settled]**

**Every time the Quarry leads a suit the player holds**, the player must play their **Swan of that
suit** or their **highest card of that suit** — not merely when the Monarch card itself is led.

**Its liability:** the constraint only bites while you still hold those two cards. Shedding your
Swan and your top card of a suit early neutralises the Monarch in that suit before it is ever led.

### The other four — **[not built]**

Designed in §4/§5, with no enforcement and no display copy. Facing them is not possible today.

| Character          | Its round-long rule-break, as designed                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Swan** (1)       | Holding none of the lead suit, you must play your **lowest** card rather than any card.                                                |
| **Fox** (3)        | At the start of every trick the Quarry may swap the decree, so trump can shift between tricks. The new decree is always shown at once. |
| **Woodcutter** (5) | A card is removed from your hand before the Hunt starts and never returned — all 13 tricks are played a card short.                    |
| **Witch** (9)      | A trick holding exactly **one odd-ranked card** resolves as if that card were trump, all Hunt.                                         |

### What you can see

| What                                | Visible?                                                                                                                                                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Quarry's hand                   | **Hidden**                                                                                                                                                                                                                 |
| The Quarry's next-trick intent      | **Telegraphed** before you commit — the suit it is about to play, plus its stance: **leading**, or, when it is following you, **pressing** (this card takes the trick) or **ducking** (it does not). Never the exact card. |
| The Quarry's trick count            | Public                                                                                                                                                                                                                     |
| The Quarry's character and its rule | Always on screen                                                                                                                                                                                                           |
| Your running Spoils                 | **No longer shown on its own.** Retired 2026-08-12 — the health bars carry the running figure now, as pending damage. The term is still stated in the Hunt's closing equation.                                              |
| Your Standing                       | Open — shown throughout the Hunt                                                                                                                                                                                           |
| **The whole Standing table**        | **Open — on screen throughout.** Every band, its trick range and its multiplier is shown as a profile, with your current trick count marked on it, so what the next trick is worth is readable without recalling the table. Moved out of the top bar on 2026-08-12 to make room for the health bars; it sits beside the Quarry's card now. |
| Both sides' final Damage            | Open — stated side by side when the Hunt ends                                                                                                                                                                              |
| Both sides' **pending** Damage      | **Open — on both health bars, for the whole Hunt.** Drawn as the at-risk segment of each bar rather than as a number beside it, and updated after every trick (section 8).                                                   |
| **Both sides' health**              | **Open — two bars, on screen for the whole Hunt**, each against its own configured maximum, arranged as an opposed pair depleting toward the centre. Both move when the damage lands.                                        |

The telegraph's fidelity — suit only, or suit and stance — is **[provisional]**; it currently shows
both.

---

## 10. Between Hunts, and the run

**[not built]** — none of this section is playable. It is recorded so the rules read as one game
rather than as one round.

- **Forage** is the only thing you do between Hunts: edit the 33-card deck the next Hunt is dealt
  from. It may edit exactly four things — a card's **value**, its **ability**, its **suit**, and the
  **decree**. There is no shop and no flat score bonus. The budget is **4 edits per encounter**
  (**[provisional]**).
- **A run** is a fixed sequence of encounters against different Quarries, each with more health than
  the last. **Your health emptying ends the run** — and since 2026-08-12 that is not only enforced but
  reachable: you can play until your bar empties and the run stops there. What is still not built is the
  *sequence*: nothing runs one encounter after another, and the between-encounter restore is read by
  nothing. Forage persists within a run; nothing persists across one — a new run starts on a bare deck.
- **The run length** is **[open]** (a placeholder 5 exists in config). Since there are five
  characters, any run longer than five must repeat one, and no rule says how.
- **Snare** — an in-Hunt edit layer, on cards in your hand — is **[open]** and explicitly blocked:
  "raise the value of the card I am about to win with" is a dominant strategy until it has a cost.

The app today plays **one encounter** against one Quarry: Hunt after Hunt, with both health bars visible
throughout, until a bar empties and the encounter resolves. A session can therefore end, in victory or in
defeat. What it cannot do is carry on afterwards — nothing sequences a second encounter, no Forage step
exists between Hunts, and the run around the encounter is unbuilt.

---

## 11. What this game does not have

Carried over from §8's kept/modified/dropped table, so a reader coming from the base game knows what
to stop looking for.

| Base-game rule                    | Here                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The 21-point match**            | **Dropped.** It ends a symmetric two-player contest. The run, and the health both sides hold, replace it.                                                                                   |
| **Goal cards (16)**               | **Dropped.** A second scoring channel alongside `Spoils × Standing`, which §1 rules out by construction.                                                                                    |
| **Special cards (9)**             | **Dropped as cards.** The _unsuited_ concept is kept as the grammar for a Forage suit edit; Bow, Hammer, Potion, Shovel, Axe, Tree, Fairy, Crown and Mirror are not in the deck.            |
| **The Poison-8 swap**             | **Dropped entirely.** There is no module, no swapped card, and since 2026-08-12 no −1 either — rank 8 is an ordinary card that happens to be named. See section 5.                          |
| **The Poison zero floor**         | **Absent**, and unreachable — no card has a negative value, so no total can go below zero for a floor to catch.                                                                             |
| **The Treasure's point**          | **Dropped.** It awarded a point to the trick's winner; here rank 7 scores its printed rank like any other card.                                                                             |
| **The end-of-round points table** | **Its bands repurposed, its values replaced.** The four band groupings became the Standing multiplier's boundaries (section 7); the printed multipliers themselves were designed anew as two per-declaration tables, so nothing of the original column survives. |

---

## Status register

One row per rule area. `Where enforced` is a pointer for checking this document has not gone stale —
the mechanics themselves are documented in `../implementation/`.

| Rule area                          | Status                        | Where enforced                                       | Who decides what's open         |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------- | ------------------------------- |
| Deck, deal, decree, draw pile      | settled                       | `src/warCouncil/deck.ts`, `deal.ts`                  | —                               |
| Hunt-1 dealer, alternation         | provisional                   | `src/app/dealerForRound.ts`                          | Developer                       |
| Declaration, Win/Lose              | settled                       | `src/warCouncil/declareHunt.ts`                      | —                               |
| Undeclared reads as Win            | settled                       | `src/warCouncil/types.ts` — `declaredPath`           | —                               |
| Value inversion (`12 − r`)         | settled                       | `src/hunt/config.ts` — `invertedCardValue`           | —                               |
| Declaration governs both sides     | settled                       | `src/warCouncil/spoils.ts`, `scoring.ts`             | —                               |
| Follow-suit, Monarch narrowing     | settled                       | `src/warCouncil/legalMoves.ts`, `quarryRuleBreak.ts` | —                               |
| Odd-rank abilities                 | settled                       | `src/warCouncil/abilities.ts`, `resolveTrick.ts`     | —                               |
| Trick resolution, Witch-as-trump   | settled                       | `src/warCouncil/resolveTrick.ts`                     | —                               |
| Capture pile accumulation          | settled                       | `src/warCouncil/playCard.ts`                         | —                               |
| Spoils sums exactly one pile per side | settled                       | `src/warCouncil/spoils.ts`                           | —                               |
| Card base value = rank             | settled (§9, 2026-08-11)      | `src/hunt/config.ts` — `cardBaseValue`, `cardValueFor` | —                             |
| Treasure/Poison have no rule       | settled (§9, 2026-08-11)      | `src/hunt/config.ts` — `cardValueFor` applies no modifier | —                           |
| Standing band boundaries           | settled                       | `src/hunt/config.ts` — `HUNT_MULTIPLIER_TABLES`      | —                               |
| Standing multipliers, both tables  | settled (§9, 2026-08-11)      | `src/hunt/config.ts` — `HUNT_MULTIPLIER_TABLES`      | —                               |
| One table per declaration          | settled                       | `src/hunt/config.ts` — `standingTableFor`            | —                               |
| Rounding of the ×0.5 bands         | settled (applied 2026-08-12)  | `src/hunt/config.ts` — `DAMAGE_ROUNDING`, `roundDamage`; applied in `src/warCouncil/scoring.ts` — `scoreHunt` | — |
| Health totals, both sides          | settled (2026-08-12)          | `src/hunt/config.ts` — `PLAYER_START_HEALTH`, `QUARRY_ENCOUNTER_HEALTH`; read by `src/hunt/encounter.ts` — `startEncounter` | — |
| Between-encounter restore (none)   | **not built**                 | `src/hunt/config.ts` — `ENCOUNTER_PLAYER_RESTORE` (still no consumer) | Developer — most likely to change |
| Simultaneous depletion             | settled (§5, §9, 2026-08-11)  | `src/hunt/config.ts` — `SIMULTANEOUS_DEPLETION_WINNER`; read by `src/hunt/encounter.ts` — `resolveWinner` | —          |
| Damage **applied** to health, once | settled (2026-08-12) — **playable** | `src/hunt/encounter.ts` — `applyHunt`; crossed from the seat vocabulary by `src/warCouncil/scoring.ts` — `duelSideDamage`; called from `src/app/warCouncil/roundReducer.ts` — `CommitDamage` | — |
| Health never negative; surplus discarded | settled (2026-08-12)    | `src/hunt/encounter.ts` — `deplete`, the single clamp | — (overkill payout is §9 Deferred) |
| Confirming the damage to close a Hunt | **provisional** — one press, not a decision | `src/app/warCouncil/RoundOverPanel.tsx`; `roundReducer.ts` — `RoundUiState.applied` | Developer — whether the beat earns its press |
| Winning or losing an encounter     | settled (2026-08-12) — **playable** | `src/hunt/encounter.ts` — `resolveWinner`, `isEncounterResolved`; read by `src/App.tsx` and `RoundOverPanel.tsx` | — |
| Health carried Hunt to Hunt within one encounter | settled (2026-08-12) | `src/App.tsx` — holds the `EncounterState`, seeded by `startEncounter`, replaced from `WarCouncilRoundResult.encounter` | — |
| No cap on Hunts per encounter      | settled (§11, 2026-08-12) — deliberately none | `src/hunt/encounter.ts` — no cap key exists to read | Developer, if the tail stalls |
| Pending damage, shown mid-Hunt     | settled (shown 2026-08-12)    | `src/warCouncil/scoring.ts` — `pendingHuntDamage`, sharing `outcomeFor` with `huntDamage`; drawn by `src/app/warCouncil/DuelHealthBars.tsx` off `duelHealthBars.ts` | — |
| The pending figure equals the applied damage | settled — structural, not asserted | one arithmetic path (`outcomeFor`) and one clamp point (`applyHunt`), which the bars project against a copy of the encounter | — |
| Both sides' health on screen, whole Hunt | settled (2026-08-12)     | `src/app/warCouncil/DuelHealthBars.tsx`, `duelHealthBars.ts`; maxima read in `src/App.tsx` from `PLAYER_START_HEALTH` / `quarryHealthForEncounter` | Developer — the six `--wc-hp-*` visual values |
| Any way to win or lose **by playing** | **settled** (2026-08-12) — one encounter deep | `src/App.tsx` stops dealing once `isEncounterResolved`; the outcome is stated on the Hunt's closing panel | — |
| The Lose path's pile swap          | settled (2026-08-12)          | `src/hunt/config.ts` — `cardValueSchemeFor`; resolved in `src/warCouncil/spoils.ts` via `otherSide` | —          |
| `Damage = Spoils × Standing`       | settled                       | `src/warCouncil/scoring.ts` — `scoreHunt`            | —                               |
| Both sides' Damage computed        | settled                       | `src/warCouncil/scoring.ts` — `huntDamage`; also derived per render in `src/app/warCouncil/WarCouncilRound.tsx` | — |
| Damage is dealt to the **other** side | settled (2026-08-12) — **applied** | `src/warCouncil/scoring.ts` — `huntDamage`'s `incoming`, crossed once by `duelSideDamage` | — |
| An unfinished or undeclared Hunt is refused, never scored 0 | settled (2026-08-12) | `src/warCouncil/scoring.ts` — `huntDamage`'s two guards | — |
| The whole Standing table is on screen during play | settled (2026-08-12) | `src/app/warCouncil/StandingTrack.tsx`, `standingSegments.ts` | — |
| Monarch Quarry                     | settled                       | `src/warCouncil/quarryRuleBreak.ts`                  | —                               |
| Four other Quarry characters       | **not built**                 | —                                                    | —                               |
| Telegraph fidelity                 | provisional                   | `src/hunt/config.ts` — `TELEGRAPH_FIDELITY`          | Developer, after playtest       |
| Forage                             | **not built**                 | `src/hunt/config.ts` — `FORAGE_BUDGET_PER_ENCOUNTER` (no consumer) | Developer — budget is provisional |
| The run — a sequence of encounters | **not built**                 | `src/hunt/encounter.ts` takes an encounter index but sequences nothing | —            |
| Run length                         | **open** — placeholder 5      | `src/hunt/config.ts` — `ENCOUNTERS_PER_RUN` (no consumer) | Developer                   |
| Snare (in-Hunt edits)              | **open**, blocked             | —                                                    | Needs a cost before it's viable |

### The old direction is now gone — DLR-67 closed 2026-08-12

**What changed for a player:** the **Demand is gone** — no target, no cleared/missed verdict — and the
Lose path's **credit pool is gone** with it, so declaring Lose no longer offers a decision on each
lost trick. A resolved trick now always offers the same single "carry on" control on either path.
The Treasure's `+1` and the Poison's `−1` are gone, so a card is worth its printed rank and nothing
else. At the end of a Hunt, **both sides'** `Spoils × Standing = Damage` is stated side by side.

**What a player cannot reach:** any way to win or lose. **As of DLR-67 that was because health did not
exist in the code at all** — the two damage figures were shown and then discarded, and both health
totals, the between-encounter restore and the simultaneous-depletion ruling sat in configuration with
no consumer anywhere. DLR-70 has since changed the reason: health, its depletion and both end
conditions are now real, and what is missing is the screen (see below).

**What was deliberately interim, and is no longer:** §7's Spoils reading. Each side was paid for its
own capture pile on both paths; DLR-69 replaced that with the design's two-way swap on 2026-08-12.

### The pile swap landed — DLR-69 closed 2026-08-12

**What changed for a player:** on a Lose-declared Hunt the two capture piles swap. You are paid for
the cards **the Quarry** captured, at `12 − r`, and it is paid for the cards **you** captured, also
inverted — each pile counted once, by the side that did not win it (section 7). The Win path is
unchanged. This is what makes a declared Lose executable as a plan: winning zero tricks now finishes
you ahead rather than behind.

**What a player will see, and one thing they will be told wrongly.** The change is engine-only, but
its numbers surface immediately — the in-play "Running Spoils" readout and the end panel both showed
the Quarry's pile value under your own heading on a Lose Hunt. (DLR-71 has since retired the in-play
readout, so only the closing equation states the term now.) Two consequences, both the developer's to
settle and neither a defect:

- **The declare gate's Lose copy now states the opposite of the rule.** It reads that every trick you
  take still adds both its cards to *your* Spoils at inverted values, which the swap reverses. Every
  UI file was out of DLR-69's scope, so it could not be fixed there. It is the first thing a player
  reads at the moment they choose the path.
- **Whether the readouts read honestly** under their current labels — a figure built from the Quarry's
  cards sitting under a heading that says "your" — is a judgement answerable only by playing.

### Health, and a way to lose — DLR-70 closed 2026-08-12

**What changed in the rules:** the duel is no longer a description of an intended mechanic. Both sides
hold health that depletes, damage lands **once** at the end of the thirteenth trick, an **encounter**
runs Hunt after Hunt until a bar empties, and all three end conditions resolve — including the
both-bars-empty tie, which the player loses. **Surplus damage past a depleted bar is discarded**, and
health never goes below zero. There is **deliberately no cap** on Hunts per encounter. The **pending**
damage figure for both sides is derivable at any point mid-Hunt from the same equation, shown rather
than applied. Section 8 states all of it.

**What a player could reach when it landed: none of it.** Nothing in the app called the encounter module
— no health bar was drawn, no pending figure displayed, no encounter ended. That was the widest gap this
document has ever carried between what the rules are and what can be played, and it was deliberate: the
arithmetic was built and proved on its own before any surface was attached to it. **DLR-71 closed it the
same day** (below), so this paragraph is a record of the interval rather than of the present.

**Two things the developer owns**, neither blocking:

- **§9's "wins on Hunt 4 with 486 left"** needed a reading. 486 is the player's health *entering* Hunt
  4; because both bars deplete together, the player is on **198** at the moment the Quarry's bar
  empties on that Hunt. Both figures are correct about different instants and both are asserted, so
  nothing was blocked — but if 486 was meant as the *post-victory* figure, it is `hybrid-design.md`
  §9's wording that wants amending, not the game.
- **Whether fighting on after an encounter has resolved should be refused or ignored.** It is currently
  refused outright. No design section rules on it, because nothing should do it; the health-bar ticket
  may prefer it to be harmless instead.

**One number now measurable that was not before:** how long an encounter runs. Playing for the peak
band resolves one in **3–4 Hunts**; playing for the Greedy band stretches it to **18–23**. §11's stall
is no longer a prediction.

### The duel is playable — DLR-71 closed 2026-08-12

**What changed for a player:** everything about the duel that DLR-70 had made true and left unreachable.
**Both health bars are on screen for the whole Hunt**, one per side, arranged as an opposed pair
depleting toward the centre, each showing its side's current health against its own configured maximum.
Each bar carries **its own pending damage** as a lighter segment carved out of its own health, updated
after every trick — so *health lost* and *health at risk* are distinguishable within one bar rather than
by comparing two numbers, and a bad band change shows as the at-risk part **receding** rather than as a
figure dropping. Closing a Hunt now takes **one confirmation**, after which both bars visibly move; the
new health carries into the next Hunt, and when a bar empties the encounter's outcome is stated and no
further Hunt is offered. A player can win an encounter and lose a run.

**The one property worth stating as a rule rather than as a feature:** the pending figure a bar shows at
the thirteenth trick **is** the damage that lands. Not because it was checked, but because the game
computes damage in one place and applies it in one place, and the bar's projection is that same
application run against a copy. There is no second total that could drift from the first.

**Retired from the screen, not from the rules:** the running Spoils readout and the player-only Damage
readout. The bars carry those figures now, and both terms are still stated in the Hunt's closing
equation. The Standing table moved out of the top bar to make room, and sits beside the Quarry's card.

**What a player still cannot reach:** the sequence. One Quarry, one encounter. Nothing advances to the
second Quarry at 1,600 health, the between-encounter restore is still read by nothing, and there is no
victory or defeat screen — the outcome is stated on the Hunt's own closing panel. Forage does not exist.
All of that is DLR-73's, and it is a much narrower gap than the one this document carried a day earlier.

**Three things the developer owns**, none blocking:

- **The confirmation press.** It is what makes the damage visible landing rather than already landed, and
  it costs 3–4 presses in a fast encounter or up to 23 in a Greedy one, on top of the two the Hunt
  already opens with. Marked provisional in section 8 for exactly that reason.
- **Six visual values** for the bars — the two fills, the track, the lethal edge, the bar height and the
  movement duration — are transcribed from the approved mockup and are not final. The two fills were
  measured as genuinely distinguishable as shipped, so the rule they carry holds; the palette is still a
  polish decision.
- **Whether the two bars read as tension or as clutter.** The measurement §6 asks for: can a playtester
  say who is ahead, and tell a fast Hunt from a stalling one, from the bars alone? If the first yes comes
  without the second, §6's single net-bar fallback is a cheap change.

**One consequence for an earlier note:** the fix this ticket needed for its own taller closing panel also
resolved a defect that had made the declare gate's "Play to Win" heading unreachable at two short
viewport sizes. The cost is that the play area top-aligns rather than centring at those sizes.

### The declaration is reachable — DLR-63 closed 2026-08-11

Section 3 is playable end to end: the declare step gates the first trick and the full 13-card hand is
visible while choosing, so every declaration rule above can be exercised by hand rather than only
asserted in a test. The claim control that shipped alongside it was removed a day later — see above.

### Known tensions, recorded not resolved

- **~~Victorious dominates Humble~~ — dissolved 2026-08-12, not resolved by tuning.** The proof
  depended on two bands *sharing* a top multiplier (0–3 and 7–9 both paying ×6 in the single printed
  table), so the band reachable with fewer cards was strictly worse than the one that could reach the
  same multiplier *and* capture more. The two tables DLR-66 shipped have **one peak each** — 7–9 on Win,
  4–6 on Lose — so there is no second band sharing either path's top multiplier for the superset
  argument to compare against. §6 keeps the proof as a historical note recording why the multipliers
  stopped being a transcription. The ×18 break-even is moot, and exit (b) is retired with it.
- **Whether declaring Lose dominates declaring Win** is still unanswered, but as of 2026-08-12 it is
  **finally measurable**. DLR-63 carried this with the credit cap as the thing stopping an in-Hunt
  runaway; that cap is gone and the pile swap that replaces it has now landed, so what the code scores
  is the direction's intended reading rather than an interim neither direction wanted. The
  fourteen-split enumeration says the two paths are exact mirrors at average card values — the Lose
  column is the negative of the Win column at every trick count (§8) — which answers the *symmetry*
  question but not the *dominance* one, since a real Hunt is not played at average card values and the
  two paths differ in how easily their peak band is reached. Worth measuring by playing now that there
  is something honest to measure.
- **The Lose path has no decision of its own between tricks, and the swap did not give it one**
  (restated 2026-08-12). Removing the credit spend took thirteen forks per round out of the Hunt, and
  the pile swap — which was expected to restore a reason to care mid-round — turns out to do it
  *structurally* rather than as a decision: a trick you lose fattens your total automatically, with
  nothing to spend and nothing to choose. What it does add is a reason to care **which** cards the
  Quarry captures, since those are the cards you are paid for, but that is a consideration inside the
  existing follow-suit choice, not a fork of its own. So the tension stands rather than being resolved,
  and the thing to watch when playing is whether that consideration is legible enough to feel like a
  decision.
- **Aiming for Victorious every Hunt** may not be a decision at all, with nobody contesting the
  band (§8, §12 Problem 1). The Quarry's rule-break is what is meant to displace it. Unproven.
- **No card is worth declining — and as of 2026-08-12 that is permanent rather than incidental.** Exit
  (b) proposed letting Forage set a card's value below zero, on the grounds that the base game "already
  ships them — the Poison 8s" and that three of thirty-three is merely too thin. Under rank-weighted
  values that understated it: a Poison 8 scored 7 on the Win path and 3 on the Lose path, so the count
  was never the problem — **the sign was.** §6 retires exit (b) outright, because the direction removes
  the Poison modifier entirely: card value is the printed rank alone, so every captured card is a gain
  and there are **zero** cards worth declining by construction. **The removal shipped on 2026-08-12**,
  so this is now the literal state of the game rather than a pending decision. It stays on the list
  because a future Forage ticket that wants "cards you would rather leave behind" must create that
  property deliberately — nothing in the deck supplies it any more.
- **The closing equation now reads as arithmetically wrong on a ×0.5 band** (2026-08-12). Rounding is
  applied to the product but the two terms are stated unrounded beside it, so a card sum of 123 in a
  ×0.5 band shows as `123 × 0.5 = 62`. Every figure is correct and the rule is settled; what is
  unresolved is how to present it — round the displayed product, state the unrounded one and the
  rounded one, or say nothing and accept that a player checking the multiplication finds a half-point
  discrepancy. A presentation call, not a rules one, and it only becomes visible now that rounding
  actually applies.
- **The Greedy tail makes an encounter six times longer than the peak line, and there is no cap to
  stop it** (new 2026-08-12). Now that health depletes, the length of an encounter is arithmetic rather
  than speculation: playing into the peak band resolves one in **3–4 Hunts**, while playing for 10–13
  tricks at ×0.5 takes **18–23**. §11 chose to ship uncapped deliberately — the stall is the evidence a
  cap is needed — so this is the tension being deliberately courted rather than an oversight. Whether 23
  Hunts against one Quarry reads as attrition or as tedium **is now answerable by playing** (DLR-71), and
  it is the first thing to measure: the bars make the rate of an encounter legible, which is exactly what
  the long tail is a complaint about. Note the interaction with the point above: **the Quarry the code
  ships maximises tricks**, so it lands in 10–13 on either declaration — meaning the built opponent is
  the one most likely to produce the long tail. The confirmation press added at the close of every Hunt
  (section 8) rides on the same count, so a 23-Hunt encounter carries 23 of them.
- **Overkill is thrown away, and that is a placeholder rather than a preference** (new 2026-08-12).
  Damage past a depleted bar vanishes. §9 records paying it out — as cash, or carried into the next
  encounter — as **Deferred**, so the discard is what ships and is asserted as a chosen rule, not what
  was argued for. The consequence worth watching is that a hugely overpowered final Hunt is worth
  exactly as much as a barely sufficient one, which removes any reason to push a winning encounter
  harder than it needs.
- **Whether either declaration is a live read is still unmeasured, and the built CPU cannot measure it.**
  §9 records that the Quarry which plays today maximises tricks, landing it in 10–13 on either
  declaration — the band that now pays ×0.5 on Win and ×1 on Lose. A Quarry that plays for **band
  position** is named as the redesign's largest engineering item, and until it exists the question
  "is the declaration a hard read" is being asked of an opponent that cannot make it one.
