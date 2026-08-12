# The Hunt

A single-player trick-taking game — a Balatro × Forbidden Solitaire treatment of
_The Fox in the Forest_. This document is the **rules as they currently stand**: the procedure a
player follows, stated once, in playing order.

Last reviewed against the code and the design on **2026-08-12**. Everything below is reachable in
the app today except where a rule is marked **[not built]**.

> **A redesign is in progress, and this document straddles it.** The design has moved to a **duel**:
> both sides hold health, and each side's total is *damage* dealt to the other rather than a score
> checked against a target. Two pieces have landed. DLR-66 gave the two multiplier tables and every
> health, rounding, and depletion value as configuration. **DLR-67 then removed the old direction**:
> the Demand target and the capped Lose-credit mechanic are both gone from the game, and the Hunt now
> ends by stating each side's damage.
>
> **What that leaves is a Hunt with no ending condition.** Both sides' damage is computed and shown,
> and **nothing consumes it** — there is no health to deplete, so a Hunt can no longer be won or lost.
> Section 8 says so plainly rather than describing a victory rule that does not exist. This is a
> deliberate intermediate state, not an oversight: the deletion was taken in one pass so the code
> stopped carrying two directions at once, and the next ticket applies the damage.

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
> swap landing. So the Lose path currently has **no between-trick decision of its own**; the swap in
> section 7 is what gives it one back, and it is **[not built]**.

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

**Each side's Spoils is the sum of the cards in its own capture pile**, at whichever value scheme the
declaration put in force. Both sides are summed the same way; the declaration is the round's, not the
player's.

> **This own-pile reading is an interim, and the Lose path's pile swap is [not built].** The design
> replaces it with a two-way swap: you are paid for the cards **the Quarry** captured at inverted
> value, and it is paid for the cards **you** captured, also inverted — each pile counted once by the
> side that did not win it (§9, Decided 2026-08-11). Until that lands, both sides are simply paid for
> what they captured themselves, on either path. The credit pool that used to sit between these two
> states was removed on 2026-08-12 (section 3).

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

> **Half-multipliers mean half-point totals, and the rounding rule is [not built].** ×0.5 on an odd card
> sum produces a fractional result. The rule is decided as **round half away from zero** and exists in
> configuration, but nothing applies it yet — so the app can currently display a total ending in `.5`.
> §9 keeps this row Undecided and offers an alternative that deletes the question: double every entry in
> both tables and both health totals, and every product is an integer.

---

## 8. The end of a Hunt

**[settled]** — the equation. **A Hunt currently has no win or lose condition at all**; see below.

```
Damage = Spoils × Standing
```

Computed **once**, at the end of the thirteenth trick, **for each side** from that side's own trick
count and Spoils. The multiplier is read off the *final* trick count, so no total can be applied, or
even known, before the last trick resolves.

Both figures are stated when the Hunt ends, side by side.

### Nothing consumes the damage yet — **[not built]**

**A Hunt cannot currently be won or lost.** The two damage figures are computed and shown, and then
the Hunt simply ends and a new one is dealt.

This is a deliberate intermediate state. Until 2026-08-12 the player's total was checked against a
**Demand** — a score target, fixed at 220 — and the Hunt was cleared or missed on an inclusive
boundary. §1 replaces that comparison with the duel below, and §9 **deleted** its Demand base/growth
row rather than marking it Undecided, because there is no longer a question to ask. The Demand was
removed ahead of the health that replaces it, so the game would stop carrying two directions at once.

### The duel that replaces it — **[not built]**

Both sides hold **health**, and each side's damage depletes the other's rather than being checked
against a target. Damage is applied **once**, at the end of the thirteenth trick.

The values are decided and sit in configuration with no consumer:

| Value                             | Decided                                                         |
| --------------------------------- | --------------------------------------------------------------- |
| Player's starting health          | **1,350** (§9, 2026-08-11)                                      |
| First Quarry's health             | **1,350** — equal to the player's, deliberately                 |
| Second Quarry's health            | **1,600**                                                       |
| Health restored between encounters| **None**                                                        |
| Both bars emptying on one Hunt    | **The player loses** (§5, §9, 2026-08-11)                       |

The player's and first Quarry's health being **equal** is the load-bearing part, not the number: that
equality is what puts the win/lose boundary exactly on the **6/7 trick line** the declaration commits
to. §5 states the property survives any later rescaling, so moving both together keeps it.

**The player's health emptying ends the run.**

### Both sides are now scored — but neither can lose

Since 2026-08-12 the Quarry's Spoils, Standing and damage are all computed and shown alongside the
player's, on the same declaration's value scheme and table. That is a change from the old direction,
where only the player was scored because only the player had a target.

It does not yet make the Quarry a contestant: with no health, **neither side's damage does
anything**, so neither side can win or lose. §8 records what the old one-sided version cost — in the
base game every trick either side took pushed the other toward a mirrored losing band, and that was
the mid-round tension. Two-sided damage is meant to restore it; stating both totals is the first half
of that, and applying them is the second.

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
| Your running Spoils, Standing and Damage | Open — shown throughout the Hunt                                                                                                                                                                                      |
| Both sides' final Damage            | Open — stated side by side when the Hunt ends                                                                                                                                                                              |

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
- **A run** is a fixed sequence of Hunts against different Quarries, each with more health than the
  last. **Your health emptying ends the run.** Forage persists within a run; nothing persists across
  one — a new run starts on a bare deck.
- **The run length** is **[open]** (a placeholder 5 exists in config). Since there are five
  characters, any run longer than five must repeat one, and no rule says how.
- **Snare** — an in-Hunt edit layer, on cards in your hand — is **[open]** and explicitly blocked:
  "raise the value of the card I am about to win with" is a dominant strategy until it has a cost.

The app today plays **one Hunt**, re-dealing on completion against the same Quarry — with no health,
no target, and so no way to end.

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
| Spoils = own capture pile, one branch | settled — but an **interim**, see §7 | `src/warCouncil/spoils.ts`                | —                               |
| Card base value = rank             | settled (§9, 2026-08-11)      | `src/hunt/config.ts` — `cardBaseValue`, `cardValueFor` | —                             |
| Treasure/Poison have no rule       | settled (§9, 2026-08-11)      | `src/hunt/config.ts` — `cardValueFor` applies no modifier | —                           |
| Standing band boundaries           | settled                       | `src/hunt/config.ts` — `HUNT_MULTIPLIER_TABLES`      | —                               |
| Standing multipliers, both tables  | settled (§9, 2026-08-11)      | `src/hunt/config.ts` — `HUNT_MULTIPLIER_TABLES`      | —                               |
| One table per declaration          | settled                       | `src/hunt/config.ts` — `standingTableFor`            | —                               |
| Rounding of the ×0.5 bands         | **not built** — default set   | `src/hunt/config.ts` — `DAMAGE_ROUNDING`, `roundDamage` (no consumer) | Developer, per §9 |
| Health totals, both sides          | **not built**                 | `src/hunt/config.ts` — `PLAYER_START_HEALTH`, `QUARRY_ENCOUNTER_HEALTH` (no consumer) | — |
| Between-encounter restore (none)   | **not built**                 | `src/hunt/config.ts` — `ENCOUNTER_PLAYER_RESTORE` (no consumer) | Developer — most likely to change |
| Simultaneous depletion             | **not built** — ruling set    | `src/hunt/config.ts` — `SIMULTANEOUS_DEPLETION_WINNER` (no consumer) | —          |
| Damage **applied** to health       | **not built**                 | —                                                    | —                               |
| Any way to win or lose a Hunt      | **not built** — none exists   | —                                                    | —                               |
| The Lose path's pile swap          | **not built**                 | —                                                    | —                               |
| `Damage = Spoils × Standing`       | settled                       | `src/warCouncil/scoring.ts` — `scoreHunt`            | —                               |
| Both sides' Damage computed        | settled                       | `src/app/warCouncil/WarCouncilRound.tsx`             | —                               |
| Monarch Quarry                     | settled                       | `src/warCouncil/quarryRuleBreak.ts`                  | —                               |
| Four other Quarry characters       | **not built**                 | —                                                    | —                               |
| Telegraph fidelity                 | provisional                   | `src/hunt/config.ts` — `TELEGRAPH_FIDELITY`          | Developer, after playtest       |
| Forage, the run, encounter health  | **not built**                 | —                                                    | —                               |
| Snare (in-Hunt edits)              | **open**, blocked             | —                                                    | Needs a cost before it's viable |

### The old direction is now gone — DLR-67 closed 2026-08-12

**What changed for a player:** the **Demand is gone** — no target, no cleared/missed verdict — and the
Lose path's **credit pool is gone** with it, so declaring Lose no longer offers a decision on each
lost trick. A resolved trick now always offers the same single "carry on" control on either path.
The Treasure's `+1` and the Poison's `−1` are gone, so a card is worth its printed rank and nothing
else. At the end of a Hunt, **both sides'** `Spoils × Standing = Damage` is stated side by side.

**What a player cannot reach:** any way to win or lose. Health does not exist in the code, so the two
damage figures are shown and then discarded. The rounding rule, both health totals, the
between-encounter restore, and the simultaneous-depletion ruling all exist as configuration with **no
consumer anywhere**, and the Lose path's pile swap has not been written at all.

**What is deliberately interim:** §7's Spoils reading. Each side is currently paid for its own capture
pile on both paths; the design's two-way swap replaces that, and it is the next ticket's.

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
- **Whether declaring Lose dominates declaring Win** is unanswered, and **harder to answer than it
  was**. DLR-63 carried this with the credit cap as the thing stopping an in-Hunt runaway; that cap
  is now gone and the pile swap that replaces it is not built, so what is currently measurable is an
  interim neither direction intends. Re-ask once the swap lands.
- **The Lose path has no decision of its own between tricks** (2026-08-12). Removing the credit spend
  took thirteen forks per round out of the Hunt and gave the path nothing back yet, so declaring Lose
  is currently a scoring reading with no play consequence. Expected and temporary — the pile swap is
  what restores a reason to care mid-round — but worth playing before assuming it is fine.
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
- **Whether either declaration is a live read is still unmeasured, and the built CPU cannot measure it.**
  §9 records that the Quarry which plays today maximises tricks, landing it in 10–13 on either
  declaration — the band that now pays ×0.5 on Win and ×1 on Lose. A Quarry that plays for **band
  position** is named as the redesign's largest engineering item, and until it exists the question
  "is the declaration a hard read" is being asked of an opponent that cannot make it one.
