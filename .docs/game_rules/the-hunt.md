# The Hunt

A single-player trick-taking game — a Balatro × Forbidden Solitaire treatment of
_The Fox in the Forest_. This document is the **rules as they currently stand**: the procedure a
player follows, stated once, in playing order.

Last reviewed against the code and the design on **2026-08-11**. Everything below is reachable in
the app today except where a rule is marked **[not built]**.

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

**[provisional]** — the rule is settled; the credit count is the developer's to set.

Before the first card is played, the player sees their full 13-card hand and **declares Win or
Lose** for this Hunt. The declaration is made **once** and cannot be changed, and **no card may be
played until it is made**.

### Declaring Win

Card capture and card value work as sections 5–6 describe with no modification. This is the plain
game.

### Declaring Lose

Two things change, and nothing else does.

**Card value inverts.** A card of rank `r` is worth **`12 − r`** instead of `r`. The Swan (1)
becomes the fattest card at 11; the Monarch (11) becomes the thinnest at 1. The pivot is 12 because
that is one above the deck's top rank, which makes the inversion its own mirror — rank 1 and rank 11
swap places.

**You hold a capped pool of Lose-credits: `3`.** **[provisional — the value most likely to move.]**
Each credit may be spent on **one trick you lose**, which credits that trick's two cards to your
Spoils at their inverted values.

A credit may only be spent on **the trick that has just resolved**, and only if you lost it:

- One credit per trick — a trick already credited cannot be credited again.
- A trick you **won** while declared Lose credits **nothing**, and no credit is spent.
- A trick you **lost** with **no credits left** credits **nothing**.
- Spending a credit does not change who won the trick. The Quarry keeps the cards and the trick
  still counts toward its trick total; only your Spoils changes.

**Spending a credit is your choice, made on the trick as it resolves** — nothing is spent
automatically.

### What the declaration does not change

Standing (section 7), the score equation, and the Demand check (section 8) are **identical on both
paths**. There is no second multiplier table for the Lose path.

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

Each named rank does one thing. The odd ranks act during play; the Treasure (7) and the Poison (8)
do nothing during play and act only at scoring. Every other even rank does nothing at all.

| Rank | Name           | Effect                                                                                                                                                                              |
| ---- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Swan**       | If a Swan is in a trick and belongs to the side that **lost** it, that side **leads the next trick**. Two Swans: the loser leads either way.                                        |
| 3    | **Fox**        | On playing it, you **may** exchange the decree card for a card from your hand. The exchanged card becomes the new decree, and its suit becomes the new trump suit. You may decline. |
| 5    | **Woodcutter** | On playing it, **draw the top card of the draw pile**, then put **one card** from your hand — the drawn card or one you already held — on the **bottom** of the pile.               |
| 7    | **Treasure**   | No effect during play. **+1** to whoever's Spoils the card scores for (section 6).                                                                                                  |
| 8    | **Poison**     | No effect during play. **−1** to whoever's Spoils the card scores for (section 6). Note this is a discount, not a penalty — see below.                                              |
| 9    | **Witch**      | If a trick contains **exactly one** Witch, that Witch counts as trump when the winner is decided. **Two Witches cancel** — neither is treated as trump.                             |
| 11   | **Monarch**    | Narrows the follower's legal play — see section 4.                                                                                                                                  |

**Timing.** The Fox and the Woodcutter resolve **the instant the card is played**, before the other
card is played and before the winner is decided. So if the Fox changes the decree, the **new** trump
suit decides the **current** trick — as the base game's own appendix specifies.

> **Deviation from the base game — the Treasure.** There, the Treasure awards its point to the
> trick's winner. Here it is a +1 on the card's Spoils value, applied wherever that card scores. On
> the Win path the arithmetic is the same, because the winner captures the card. On the Lose path a
> Treasure only counts if the trick it landed in is credited.

> **Deviation from the base game — the Poison, and it is a bigger one.** In the base game the Poison
> is an **expansion module**, not part of the base deck: you swap the three ordinary 8s out for three
> Poison 8s before the game, and taking one costs you a point off your running total, floored at
> zero. **Play the base game without that module and rank 8 has no rule on it whatsoever.**
>
> This game has no modules. The Poison rule is **always on** and sits on the three ordinary 8s — the
> same three cards the module would have replaced, so the count (3 of 33) matches §8's "Poison 8s:
> kept". Two things did not carry over, and both matter:
>
> - **It is not a penalty here.** A card's base value is its rank, so an 8 scores `8 − 1 = 7` — still
>   one of the fattest cards in its suit. On the Lose path it scores `(12 − 8) − 1 = 3`. There is no
>   value of a captured card in this game that is negative, so **no card is ever worth dodging.**
> - **The zero floor is absent**, and cannot bite: nothing in the scoring can drive a total below
>   zero for it to catch.
>
> The consequence is a design one and is recorded under [Known tensions](#known-tensions-recorded-not-resolved):
> §6's exit (b) wants cards a player would rather leave behind and points at the Poison 8s as the
> existing example. They are not that here.

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

**[provisional]** — a card's base value is `rank`, and that is §9's highest-leverage open fork.

**A card's base value is its printed rank.** A Bells 11 is worth 11; a Moons 2 is worth 2. Then
**+1 for each Treasure** and **−1 for each Poison**.

Your Spoils is the sum of:

- **Declared Win** — every card in your **capture pile**, at base value.
- **Declared Lose** — every card **credited** from a lost trick, at **inverted** value (`12 − r`).
  Your capture pile is not counted at all: the Quarry took those tricks.

> §9 leaves open whether a card's base value should be its rank or a flat 1. The code uses rank.
> Under a flat 1, Spoils would be fully determined by trick count and the equation would lose its
> second axis — which is why rank is the reading in play. Nothing about this is settled.

### Standing — the multiplicative term

**Boundaries [settled]. Multipliers [open].**

Standing is read off the band your **final trick count** lands in. It is the same table on both
declared paths.

| Tricks won | Band           | Standing |
| ---------- | -------------- | -------- |
| 0–3        | **Humble**     | ×6       |
| 4          | **Defeated**   | ×1       |
| 5          | **Defeated**   | ×2       |
| 6          | **Defeated**   | ×3       |
| 7–9        | **Victorious** | ×6       |
| 10–13      | **Greedy**     | ×0       |

The **band boundaries are carried over unchanged** from the base game's end-of-round table and are
fixed by §1. The **multiplier column is not settled**, and two rows are known problems:

- **Humble ×6 is wrong as transcribed.** §6 shows a 9-trick capture pile is a superset of a 3-trick
  one, so Victorious dominates Humble by construction at these values. The break-even is **×18**.
- **Greedy ×0** zeroes a whole Hunt's Spoils — harsher than the base game, where a 0-point round
  still leaves your running total intact. Flagged in §9, not re-tuned.

Both are the developer's to decide. The table above is what the game currently pays.

> **Note on the Lose path.** Declaring Lose steers you toward a low trick count, which lands in
> Humble — the band §6 proves is dominated at ×6. This tension is known and deliberately left
> visible rather than papered over.

---

## 8. Winning and losing a Hunt

**[provisional]** — the equation is settled; the target is a placeholder.

```
Score = Spoils × Standing
```

Computed **once**, at the end of the Hunt, from the player's own trick count and Spoils. It is then
checked against the Hunt's **Demand** — its score target:

- **Score ≥ Demand → cleared.** The boundary is inclusive: a score exactly equal to the Demand
  clears it.
- **Score < Demand → missed.**

The Demand is currently a single fixed number: **220**. **[provisional — a placeholder recorded at a
planning gate, not a chosen value.]** A Demand that **rises** across a sequence of encounters is
§5's design and is **[not built]**.

### The Quarry does not score

Only the player's Score is checked. The Quarry has **no Demand and no failure state** — clearing
your own Demand ends the Hunt successfully; nothing is beaten (§8, §12). The Quarry's trick count is
public and its captured cards do have a Spoils value, but neither is compared against anything, so
neither is a way to win or lose.

§8 records what this costs: in the base game, every trick either side took pushed the other toward a
mirrored losing band, and that was the mid-round tension. With one scorer, the Standing table is a
self-limit on the player alone.

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
| The Demand, and your running Spoils | Open                                                                                                                                                                                                                       |

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
- **A run** is a fixed sequence of Hunts against different Quarries, each with a higher Demand than
  the last. **Missing a Demand ends the run.** Forage persists within a run; nothing persists across
  one — a new run starts on a bare deck.
- **The run length** is **[open]** (a placeholder 5 exists in config). Since there are five
  characters, any run longer than five must repeat one, and no rule says how.
- **Snare** — an in-Hunt edit layer, on cards in your hand — is **[open]** and explicitly blocked:
  "raise the value of the card I am about to win with" is a dominant strategy until it has a cost.

The app today plays **one Hunt**, re-dealing on completion with the same Quarry and the same Demand.

---

## 11. What this game does not have

Carried over from §8's kept/modified/dropped table, so a reader coming from the base game knows what
to stop looking for.

| Base-game rule                    | Here                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The 21-point match**            | **Dropped.** It ends a symmetric two-player contest, and the Quarry does not score. The run replaces it.                                                                                    |
| **Goal cards (16)**               | **Dropped.** A second scoring channel alongside `Spoils × Standing`, which §1 rules out by construction.                                                                                    |
| **Special cards (9)**             | **Dropped as cards.** The _unsuited_ concept is kept as the grammar for a Forage suit edit; Bow, Hammer, Potion, Shovel, Axe, Tree, Fairy, Crown and Mirror are not in the deck.            |
| **The Poison-8 swap**             | **Folded in, always on.** There is no module and no swapped card — the ordinary rank 8 of each suit carries the −1 permanently. It is a discount rather than a penalty here; see section 5. |
| **The Poison zero floor**         | **Absent**, and unreachable — no captured card has a negative value, so no total can go below zero for a floor to catch.                                                                    |
| **The end-of-round points table** | **Repurposed**, not dropped. Its bands became the Standing multiplier (section 7).                                                                                                          |

---

## Status register

One row per rule area. `Where enforced` is a pointer for checking this document has not gone stale —
the mechanics themselves are documented in `../implementation/`.

| Rule area                          | Status                        | Where enforced                                       | Who decides what's open         |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------- | ------------------------------- |
| Deck, deal, decree, draw pile      | settled                       | `src/warCouncil/deck.ts`, `deal.ts`                  | —                               |
| Hunt-1 dealer, alternation         | provisional                   | `src/app/dealerForRound.ts`                          | Developer                       |
| Declaration, Win/Lose              | settled                       | `src/warCouncil/declareHunt.ts`                      | —                               |
| Value inversion (`12 − r`)         | settled                       | `src/hunt/config.ts` — `invertedCardValue`           | —                               |
| Lose-credit count (`3`)            | **provisional**               | `src/hunt/config.ts` — `LOSE_CREDITS_PER_HUNT`       | Developer, once playable        |
| Credit spend and its four guards   | settled                       | `src/warCouncil/claimLostTrick.ts`                   | —                               |
| Follow-suit, Monarch narrowing     | settled                       | `src/warCouncil/legalMoves.ts`, `quarryRuleBreak.ts` | —                               |
| Odd-rank abilities                 | settled                       | `src/warCouncil/abilities.ts`, `resolveTrick.ts`     | —                               |
| Trick resolution, Witch-as-trump   | settled                       | `src/warCouncil/resolveTrick.ts`                     | —                               |
| Capture pile accumulation          | settled                       | `src/warCouncil/playCard.ts`                         | —                               |
| Spoils, both branches              | settled                       | `src/warCouncil/spoils.ts`                           | —                               |
| Card base value = rank             | **provisional** (§9 fork)     | `src/hunt/config.ts` — `cardBaseValue`               | Developer — §9's biggest lever  |
| Standing band boundaries           | settled                       | `src/hunt/config.ts` — `STANDING_BANDS`              | —                               |
| Standing multipliers               | **open** — Humble ×6 is wrong | `src/hunt/config.ts` — `STANDING_BANDS`              | Developer, per §6/§9            |
| `Score = Spoils × Standing`        | settled                       | `src/warCouncil/scoring.ts` — `scoreHunt`            | —                               |
| Demand check, inclusive boundary   | settled                       | `src/warCouncil/scoring.ts` — `checkDemand`          | —                               |
| Demand value (`220`, fixed)        | **provisional**               | `src/hunt/config.ts` — `FIXED_DEMAND`                | Developer, after playtest       |
| Monarch Quarry                     | settled                       | `src/warCouncil/quarryRuleBreak.ts`                  | —                               |
| Four other Quarry characters       | **not built**                 | —                                                    | —                               |
| Telegraph fidelity                 | provisional                   | `src/hunt/config.ts` — `TELEGRAPH_FIDELITY`          | Developer, after playtest       |
| Forage, the run, escalating Demand | **not built**                 | —                                                    | —                               |
| Snare (in-Hunt edits)              | **open**, blocked             | —                                                    | Needs a cost before it's viable |

### The declaration is now reachable — DLR-63 closed 2026-08-11

Section 3 is playable end to end. The declare step gates the first trick, the claim control is
offered on each lost trick as it resolves, and the remaining credit count is on screen throughout —
so every declaration rule above can be exercised by hand, not just asserted in a test. The one thing
still outstanding is the **credit count itself (`3`)**, which stays **provisional** until a playtest
moves it.

### Known tensions, recorded not resolved

- **Victorious dominates Humble** at the printed multipliers (§6), which the Lose path walks
  straight into. Either the Humble multiplier rises to ×18 or Forage gains the ability to set a
  card's value **below zero** — §9 carries both, and they compose rather than compete.
- **Whether declaring Lose dominates declaring Win** is unanswered. The credit cap stops the
  in-Hunt runaway; it does not prove the two paths are balanced. Carried on DLR-63 as an open
  question to check once real numbers exist.
- **Aiming for Victorious every Hunt** may not be a decision at all, with nobody contesting the
  band (§8, §12 Problem 1). The Quarry's rule-break is what is meant to displace it. Unproven.
- **No card is worth declining, so §6's exit (b) has no foothold.** Exit (b) proposes letting Forage
  set a card's value below zero, on the grounds that the base game "already ships them — the Poison
  8s" and that three of thirty-three is merely too thin. Under this game's rank-weighted values that
  understates it: a Poison 8 scores 7 on the Win path and 3 on the Lose path, so the count is not the
  problem — **the sign is.** There are currently **zero** cards a player would rather leave behind,
  which is what the superset argument behind Humble's dominance depends on. Whoever takes up exit (b)
  should read §6's Poison sentence as needing correction, not just extending. Noted 2026-08-11 while
  checking the base-game transcription; nothing changed in code or design.
