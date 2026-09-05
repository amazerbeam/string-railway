# The Fox in the Forest (Deluxe Edition)

A trick-taking game for 2 players by Joshua Buergel. Rules reference transcribed from the
_FitF Deluxe_ rulebook (Renegade Game Studios, 2025) for development reference.

---

## Overview

Two players play cards to win **tricks** against each other over multiple rounds. Points come
from two sources:

- **During a round** — winning tricks that contain specific cards (Treasure, Poison, goals).
- **At the end of a round** — how many tricks you won in total (too few _or_ too many is bad).

Most points at the end of the game wins.

---

## Components

| Component       | Count | Notes                                                           |
| --------------- | ----- | --------------------------------------------------------------- |
| Game cards      | 33    | Three suits — **Bells**, **Keys**, **Moons** — ranked 1–11 each |
| Special cards   | 9     | Expansion module                                                |
| Poison cards    | 3     | Expansion module (Poison 8s)                                    |
| Goal cards      | 16    | Expansion module                                                |
| Scoring tokens  | 17    | ×8, ×4, ×5 denominations                                        |
| Reference cards | 2     |                                                                 |

The **base deck is the 33 suited cards** (3 suits × ranks 1–11). Expansion cards are added only
when their module is in play.

---

## Setup (per round)

A game is several rounds. Each round has a **dealer** — randomly chosen for the first round,
then alternating each round after. The dealer:

1. Shuffles the 33 game cards.
2. Deals each player a hand of **13 cards** (hidden from the opponent).
3. Sets the remaining **7 cards** face down as a **draw deck**.
4. Turns the top card of the draw deck face up beside it — the **decree card**. Its suit is the
   **trump suit** for the round.

---

## Gameplay

Each round is **13 tricks**. In every trick both players play one card face up: one player
**leads**, the other **follows**.

### Leading

- The **non-dealer** leads the first trick of a round.
- Afterwards, the **winner of a trick leads the next trick**, unless a card says otherwise.
- The leader may play **any card** from hand, with no restriction. That card's suit is the
  **lead suit**.

### Following

- The follower **must match the lead suit if they can** — any rank of that suit is legal,
  unless a card says otherwise.
- If they hold no card of the lead suit, they may play **any card**.

### Determining the trick winner

After both cards are played and any abilities have resolved:

1. If **either** card is in the **trump suit**, the higher-ranked trump card wins.
2. If **neither** card is in the trump suit, the higher-ranked card **in the lead suit** wins.

The winner takes both cards and keeps them face down on their side. The **count** of tricks each
player has won is public, but **nobody may look at the faces** of cards in won tricks.

Play continues until all 13 tricks are resolved.

---

## Abilities

**Every odd-ranked card (1, 3, 5, 7, 9, 11) has an ability** printed on it, which activates when
the card is played. Abilities may:

- change what the opponent is allowed to play,
- change how the trick winner is determined,
- change who leads the next trick,
- grant a special action on play,
- award points to the trick's winner.

Exact timing is printed on each card. Even-ranked cards (2, 4, 6, 8, 10) have no ability in the
base game.

### Suit card reference

| Rank | Name           | Ability                                                                                                                                                              |
| ---- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11   | **Monarch**    | When you **lead** this: if your opponent has a card of this suit, they must play either the **Swan (1)** of this suit or their **highest-ranked** card of this suit. |
| 9    | **Witch**      | When determining the winner of a trick containing **a single Witch**, treat the Witch as if it were in the **trump suit**.                                           |
| 8    | **Poison**     | _(Poison module only.)_ The winner of the trick **loses 1 point** for each Poison in the trick.                                                                      |
| 7    | **Treasure**   | The winner of the trick **gains 1 point** for each Treasure in the trick.                                                                                            |
| 5    | **Woodcutter** | When you play this, **draw 1 card**, then discard any 1 card to the **bottom of the deck**, face down.                                                               |
| 3    | **Fox**        | When you play this, you may **exchange the decree card** with a card from your hand.                                                                                 |
| 1    | **Swan**       | If you play this and **lose** the trick, **you lead** the next trick.                                                                                                |

---

## End-of-round scoring

After all 13 tricks, count tricks won. You want **more tricks than your opponent — but not too
many**.

| Tricks won | Points | Description |
| ---------- | ------ | ----------- |
| 0–3        | 6      | Humble      |
| 4          | 1      | Defeated    |
| 5          | 2      | Defeated    |
| 6          | 3      | Defeated    |
| 7–9        | 6      | Victorious  |
| 10–13      | 0      | Greedy      |

If either player has **at least 21 points** after scoring, the game ends. Otherwise deal another
round, with the dealer alternating.

---

## End of game

Play complete rounds until a player reaches **21+ points**. Highest score wins. **Tiebreaker:**
the player who gained the most points during the **last round**.

### Variable game length

By agreement:

- **Shorter game** — play to **16 points**.
- **Longer game** — play to **35 points** (needs pen and paper; the tokens won't cover it).

---

## Expansion Modules

Three independent modules — **special cards**, **goal cards**, and **poison cards** — usable
individually or together.

### Special cards (9)

Before the game, select **2 special cards at random** and shuffle them into the main deck
**without looking**. Return the rest to the box. By mutual agreement you can use more or fewer,
or pick specific ones instead of randomising.

Special cards are played into a trick like any other card unless stated otherwise. When an
ability refers to "special cards," it means **only the other cards from this module**.

**Unsuited cards.** Some special cards are _unsuited_: they count as **the same suit as the
other card in the trick**. If an unsuited card is **led**, the follower may play **any suit**.

**Identical cards.** If both cards in a trick are considered identical (via a special card's
ability), **the player who led wins**.

**No trump suit.** If a special card is the **decree card**, there is **no trump suit** for the
round. A single **9 (Witch)** is still treated as a trump card when determining the winner.

#### Special card reference

| Rank | Name       | Ability                                                                                                                                                                                                                                                             |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ?    | **Bow**    | Always **beats** any trump card or special card; always **loses** to any other card.                                                                                                                                                                                |
| ?    | **Hammer** | If you **follow** with this, name a suit. Your opponent discards their card to the **bottom of the deck** face down, draws 1 card, then plays 1 card of the named suit to the trick if possible. Always **beats any odd card**; always **loses** to any other card. |
| ?    | **Potion** | When played, discard it **and another card** from your hand to the bottom of the deck face down. Draw 2 cards, keep 1 in hand and play 1 to the trick, **ignoring suit requirements**.                                                                              |
| ?    | **Shovel** | When played, you may take **1 random card from the last trick you won** and play it to the trick instead. If you do not or cannot, **you lose the trick**.                                                                                                          |
| 8    | **Axe**    | If you follow a **Woodcutter (5)** with this, use the Woodcutter's ability and **win the trick**. Otherwise it is an **unsuited 8**.                                                                                                                                |
| 6    | **Tree**   | If you **lead** this, your opponent must play **1 random card** from their hand to the trick, ignoring suit requirements. This is an **unsuited 6**.                                                                                                                |
| 4    | **Fairy**  | When played, look at up to **2 random cards** from your opponent's hand. You may **take 1** of them; if you do, give your opponent 1 card from your hand. This is an **unsuited 4**.                                                                                |
| 2    | **Crown**  | You may **add this to any legal play of a non-special card**. If you do, draw 1 card, ignore the other card's ability, and treat it as a **Monarch of its suit** when determining the winner. You may instead play the Crown alone as an **unsuited 2**.            |
| M    | **Mirror** | Always treated as **identical to the current decree card** in rank, suit, and ability.                                                                                                                                                                              |

### Goal cards (16)

Before the game, shuffle all 16 goal cards into a face-down deck. At the start of each hand,
reveal the **top two** goal cards.

- A player may **claim an available goal card at any time** they meet its scoring condition:
  gain the listed points and move the card to the discard pile.
- Each goal card can be claimed **once**.
- Unclaimed goal cards go to the discard pile when the hand ends.
- If the goal deck runs out, **reshuffle the discard pile**.
- Some goal cards **remain in play for the hand** with ongoing effects that can trigger multiple
  times, gaining or losing points. **Triggering these is not optional.**
- **If your score is at zero, ignore any further loss of points.**

### Poison cards (3)

Before the game, **swap the three base 8s** out of the main deck for the three **Poison 8s**.
When you take a Poison 8 in a trick, you **immediately lose 1 point**. If your score is at zero,
ignore any further loss of points.

---

## Appendix: Common Questions

**When do the abilities on the 3 (Fox) and 5 (Woodcutter) occur?**
Immediately when the card is played — before the other card is played or the winner is
determined. If a 3 changes the decree card, the **trump suit may change**, and the **new** trump
suit is used to determine the winner of the **current** trick.

**If my opponent leads a 9 (Witch), do I follow the 9's suit or the trump suit?**
You must follow the **9's printed suit** if you can. A non-trump 9 is not treated as trump until
**after** both cards are played following the normal rules.

**If my opponent leads a trump card and I hold a trump card, can I play a non-trump 9 (Witch)?**
No. Same reason — the 9 only becomes trump after both cards are played. If you can follow suit
with a trump card, you must.

**Who wins a trick with two 9 (Witch) cards in it?**
The Witch ability only applies when the trick contains **exactly one** Witch — two witches
neutralise each other. The 9 of the **trump suit** wins if present; otherwise the 9 of the
**lead suit** wins.

**Who leads the next trick after a trick with two 1 (Swan) cards in it?**
The player who **loses** the trick leads the next one.

---

## Credits

Game Designer: Joshua Buergel · Game Developer: Randy Hoyt · Senior Producer, Board & Card
Games: Dan Bojanowski · Art Director: Anita Osburn · Illustrator: Guiseppe De Iure · Graphic
Designers: Keith Pishnery & Anita Osburn · Editor: Dustin Schwartz · Production Artist: Noelle
Lopez

© 2025 Renegade Game Studios. All Rights Reserved.
The original fairy tale by Alana Joli Abbott: <https://FoxtrotGames.com/Forest>
