# Forbidden Solitaire — rules, gameplay and what is load-bearing

Research reference, compiled 2026-08-09. Sources at the bottom; every mechanical claim here is
attributable to one of them, and claims that rest on a single review rather than the developers are
marked **[single-source]**.

**Status: research, not a design.** This document describes a *shipped, published game*. It does not
propose a game for this repository. Section 10 separates the mechanisms that are genuinely
transferable from the ones that only work inside this game's two-to-three-hour horror narrative, and
section 12 lists the questions that are the developer's to answer before any of it becomes a design.

The framework vocabulary used in section 10 — Meier's interesting decisions, Knizia's scoring-first
method, Koster's depth budget, Cook's loops, Puzzle Quest's two-way coupling — is owned by
[`../design-principles.md`](../design-principles.md). That file already carries
a short §8 entry on this game and on Balatro. This document is the detail underneath it; it does not
restate the frameworks.

---

## 1. The game at a glance

| | |
|---|---|
| Developers | Night Signal Entertainment + Grey Alien Games (Jake Birkett), with Callum Birkett |
| Released | April 2026 (Steam, itch.io) |
| Framing | A found, allegedly cursed 1995 CD-ROM, played through a simulated 1990s desktop |
| Stated length | "2–3 hour playtime" with "a satisfactory ending" (developers) |
| Stated intent | "Primarily intended to be a linear narrative experience rather than an infinitely replayable one" (developers) |
| Achievements | 30 |
| Post-launch | New Game+ added in v1.03; NG+ difficulty balancing in v1.04–1.06 |

It is the fourth game in one continuous line of development: *Regency Solitaire* → *Shadowhand* →
*Ancient Enemy* → *Forbidden Solitaire*. The card-combat system is not new here; it was introduced in
*Shadowhand* and refined in *Ancient Enemy*. That lineage matters for reading the design — the
substrate has had roughly twenty years of iteration, and only the horror framing and the
joker/gem economy are fresh.

The four main dungeons are named for the suits: **Spade, Heart, Club, Diamond**.

---

## 2. The substrate — Tri Peaks solitaire

Forbidden Solitaire is built on **Tri Peaks** (also written TriPeaks), a Golf-family solitaire. The
canonical tabletop rules, which the game inherits and then modifies:

- **Layout.** 28 cards dealt as three overlapping pyramids — three rows of face-down cards above a
  face-up base row of ten. A card is *available* only when nothing overlaps it.
- **Stock.** The remaining 23 cards. One card is turned up to start the waste pile. **No redeals.**
- **The one rule that matters.** You may take any available tableau card whose rank is **exactly one
  higher or one lower** than the current top card of the waste pile, regardless of suit. That card
  becomes the new top of the waste pile.
- **Ace wraps.** An Ace may be played on a King and a King on an Ace, so rank is a **cycle of 13**,
  not a line. This single detail is what makes long chains possible at all.
- **When stuck**, turn a card from the stock to the waste and continue. When the stock is exhausted
  and no move exists, the game is lost.
- **Scoring** in the traditional game rewards *chains*: consecutive removals without touching the
  stock score progressively more, and leftover stock cards are a bonus.

The important structural property: **the tableau is a partial order and the waste pile is a pointer
into a 13-cycle.** Every move both consumes a card and moves the pointer, so each removal changes
which of the remaining cards are legal next. Planning is about ordering, not about selection.

---

## 3. What Forbidden Solitaire changes about the substrate

- **Layouts are authored and procedurally varied, not literal three-peak pyramids.** Reviews describe
  "randomly placed cards, some face up and some face down" and note that card positions are
  procedurally generated while boss encounters remain structured. Treat "Tri Peaks" as naming the
  *selection rule and the stock*, not the shape on screen. **[single-source]**
- **The stock is reframed as "your hand"** — a visible, finite resource. Reviews consistently describe
  the loss condition as running out of hand before the tableau is cleared, which is the classic
  stock-exhaustion loss with a friendlier name.
- **Cards carry state.** A tableau card can be cursed, infested with maggots, held by vines, frozen,
  or have its rank altered. State is applied by enemies and by level gimmicks, and is the primary
  vector by which the RPG layer talks back to the puzzle (section 5).
- **Rank can be shifted mid-play.** The "Nudge" joker raises a playable card's value by one rank,
  which means the ±1 adjacency rule is not fixed — it is a resource you can bend. **[single-source]**
- **Lives / healthstones.** "Bloodstones" (healthstones) act as a life and healing currency. NG+ lets
  you set them manually and lets you cap lives from 0–9; standard play is effectively unlimited
  retries.

---

## 4. The combat layer — the clear *is* the damage

This is the design's central mechanism and it is stated plainly by every source:

> "Each card removed from the playing area acts as attack damage, so long chains are immediately
> rewarded."

> "For every card you send to your deck pile, you will add one point of damage to your total."

There is **no conversion number and no intermediate currency.** A ten-card chain is simultaneously
the best solitaire play available and ten damage. The puzzle skill and the combat outcome are the
same event observed twice.

The consequences worth naming:

- **The player never chooses between "playing well" and "winning the fight."** In a hybrid that
  converts — trick points become movement, matches become mana becomes damage — those two can diverge,
  and the minigame becomes a toll booth you pay to reach the real game. Here they cannot diverge.
- **Chain length is the whole skill expression.** Because damage is linear in cards removed and the
  chain is the only thing you control, all planning collapses onto one legible question: *what order
  clears the most cards before I have to touch the stock?*
- **The ceiling is very high.** The developers' own NG+ challenge suggestions include "high combo runs
  exceeding 290 hits," and achievements track combos at 10+ and 25+ and cumulative "200 cards
  blasted." So the distribution of chain lengths runs from single digits to hundreds.

Alongside the base damage there is a **mana** track that fills as you clear cards and build combos.
Spending it triggers a **Mana Storm** that destroys cards directly. Achievement thresholds imply the
shape: "3+ cards" in one storm and "8+ damage" from one, plus an "8+ mana chain." Mana is therefore a
*stored* version of the same currency — it converts accumulated clearing into clearing you can aim,
which is what makes it useful against blocked or state-afflicted cards rather than merely faster.

Additional card effects reported: cards that deal direct damage, cards that grant armour, and cards
that raise the mana pool.

---

## 5. The enemy layer — intents that attack the board

Enemies act on **pre-programmed, telegraphed loops** — the player can see what the enemy will do at
end of turn and is expected to react. This is the *Slay the Spire* intent system: the enemy's next
action is displayed as an icon before you commit, so the information is input, not surprise.

The load-bearing choice is **what the enemy attacks**. Almost every enemy action targets the *tableau*
rather than a health bar:

| Enemy action | Effect on the puzzle |
|---|---|
| Curse a card | Makes a card unsafe or unplayable |
| Maggots / infestation | Cards deal damage *to you* when picked up; achievement tracks "10 maggots" |
| Vines | Capture and hold cards, removing them from availability |
| Hazard placement | Blocks specific cards from selection |
| Alter a card's value or state | Changes the ±1 adjacency graph directly |
| Mana drain | Removes stored clearing power |
| Steal a Joker | Removes an active tool |
| "Glitched" Jokers | A joker that benefits the enemy instead **[single-source]** |
| Heal / shields | Shield values of ×2, ×4, ×6 appear in achievements — raising the chain length needed to break through |

Direct weapon strikes on the player exist too, but they are the minority case.

**Both arrows carry.** The puzzle's performance is the RPG layer's damage output; the RPG layer's
enemies rewrite the puzzle's rules. Neither direction is a scalar — the enemy does not send you "-5
damage," it sends you *this specific card is now poisoned*, which you must route around. That is the
same shared-object coupling as Faeria's terrain-is-the-card-requirement and Friedrich's
suit-marked map sectors, and it is the property most hybrid designs fail to achieve.

---

## 6. Player tools — two tracks, deliberately separated

### Jokers — active, spell-like, ~30 of them

Held 3–4 at a time, found during play, cast to change the board directly. Reported effects:

- **Nudge** — raise a playable card's value by one rank
- **Tri Peaks joker**, **straight joker**, flush/suit combo enablers — chain-shaping tools
- **Fireball** — direct damage
- **Remove Row** — clears a row (achievement: "6+ row removal")
- **Ice Shards** — freezing effect (achievement: "5+ ice shards")
- **Shuffle all cards**
- **Double damage**
- **Refresh cards** / raven card removal
- **Cloning joker** — copies another joker, which is the standard "stack the multiplier" enabler
- **Mana-to-health conversion**

The store description notes jokers are "some helpful, some malignant" — i.e. the pool includes
liabilities, not only upgrades. Achievements reference "bad jokers" as a category and "Wild Jokers" as
a separate unlockable set. Jokers are also filtered by level type: v1.04 explicitly "prevented
combat-only jokers in puzzle mode."

### Gems — passive, purchased, permanent

Bought from a merchant (an eye in the wall) that appears **before every battle**, and embedded into
the protagonist's hand and fingernails — the body-horror framing is doing double duty as the
progression UI. Effects are passive multipliers on the existing systems: draw chance, damage
multipliers, mana rate, maximum health. Named examples: the **Crionite Ring** and a **synergy gem**.

There is **no deckbuilding**. As one preview put it: *"the deck you start with is the deck you get."*
The build is entirely gems + jokers; the 52 cards never change.

**The separation is the design.** Gems are the economy — slow, purchased, always-on, and they set the
*rate* at which the run scales. Jokers are the tactics — situational, cast, and they change *this
board*. Compare Balatro, which merges the two roles into one Joker slot and therefore has to make
every Joker a permanent passive; Forbidden Solitaire pays two slots' worth of UI to keep "what my run
is" and "what I do right now" as different objects. Community advice to "buy out the shop" suggests
the gem economy is generous enough that the interesting decision lives in the jokers, not the
purchases — which, if true, is a real cost of the split. **[single-source, inference]**

---

## 7. Level types

Two families, alternating:

**Combat levels.** A tableau plus an enemy with a telegraphed loop, as sections 4–5.

**Puzzle levels.** No enemy. Clear the tableau before the stock runs out. These carry the gimmicks:

- **Spotlight / stealth levels** — a vision-cone and alert system where picking up too many cards too
  conspicuously raises alarm. Card selection acquires a *cost in attention*, so the optimal chain and
  the safe chain diverge.
- **Exploding maggots** on cards.
- **Vines**, **ice**, and the other card states, used as static layout constraints rather than as
  enemy actions.

Boss encounters are hand-authored rather than procedurally laid out. NG+ lets the player filter to
puzzle-only or combat-only, which is a useful admission that the two are separable experiences.

---

## 8. Run structure and economy

```
Desktop / narrative frame (Emily's messages, audio logs)
  └─ Dungeon (Spade → Heart → Club → Diamond)
       └─ Merchant (buy gems with gold earned from play)
            └─ Level: combat or puzzle
                 └─ Turn: clear a chain, spend jokers/mana, take the enemy's telegraphed action
```

Gold comes from solitaire performance and is spent on gems. Reviews report that ordinary play earns
enough to buy what is on offer, so the economy is a pacing device more than a constraint. Difficulty
scales through the dungeons; one review describes lategame combat as "quite hectic … matched by your
absurd level of passives and power," which is the standard both-sides-escalate curve.

---

## 9. What the reviews actually split on

The critical reception is unusually informative because it divides on a single design decision, and
both sides describe the same fact.

- Shacknews: the game *"has the good sense to get out while the going is good."*
- Others: *"the gameplay runs out of steam quickly due to how shallow and straightforward it is."*

Two-to-three hours of a system with one core skill (chain ordering) and one scaling axis (gems) is
either exactly the right length or evidence that there was never much there. **The developers chose
this deliberately** and said so. NG+ arriving three weeks post-launch is the concession to the other
half of the audience.

---

## 10. Design analysis — what is load-bearing, ranked

Ranked by how much of the design would collapse if the mechanism were removed.

### 10.1 The identity of clearing and damage — the whole design

Remove it and you have a solitaire game with an RPG scoreboard attached. Everything else is
commentary on this one identity.

Worked example of why it is not merely elegant but *cheap*: consider the alternative most hybrids
reach for — "cards cleared × 2 = damage, but a flush chain gives ×3." That version needs a rule for
the exchange rate, a rule for the bonus, a UI element showing the running conversion, and a balance
pass on the multiplier every time the tableau size changes. Forbidden Solitaire needs *none* of those
because there is no exchange rate to balance. **Rules added: zero.** This is the single most reusable
idea in the game and it costs nothing.

The caveat worth stating: identity coupling makes the two layers **inseparable for tuning**. If chains
run too long, damage inflates and enemy health has to rise, which raises required chain length,
which is the same dial. There is exactly one difficulty knob and it is shared. That is a virtue while
the game is short and a real constraint on a longer one.

### 10.2 Enemies attack the board, not the player — the return arrow

Without this, the enemy is a health bar and the solitaire is a slot machine you pull at it. With it,
the enemy is a *level editor running during the level*.

Worked example: an enemy that poisons the 7♦ on turn three does not reduce your damage by a number —
it deletes an edge from your adjacency graph. If your planned chain was `6→7→8→9→10`, the poison
doesn't cost you one card, it costs you *four*, because the chain breaks at the 7 and you must touch
the stock. The damage is emergent from the board state, which means the same enemy action is
devastating in one layout and free in another. That is Meier's *situational value* — the enemy's
choice matters differently every time, with no per-instance authoring.

### 10.3 The 13-cycle (Ace wraps to King) — the enabler nobody credits

Without wrap, rank is a line with two dead ends, and every chain that reaches A or K terminates.
With wrap, the adjacency graph is a **cycle**, so a sufficiently full tableau supports arbitrarily
long chains — which is why 290-hit combos are even expressible. The entire high end of the skill
curve rests on one line of the parent game's rules.

This is the clearest example in the game of Rosewater's *piggybacking* — reusing a familiar
substrate so the complexity budget goes to the new layer. A 52-card deck plus "one higher or one
lower" buys the whole adjacency system, the ranking, the suits, and the player's existing intuition
for all of it, for free.

### 10.4 Active tools vs passive economy, kept in separate slots

Load-bearing but the most negotiable of the four — the game would still work if gems and jokers were
one pool, it would just be a different game (and, roughly, Balatro's). See section 6.

### 10.5 The telegraphed intent loop

Standard, borrowed, and correct. It converts enemy behaviour from output randomness (a die roll after
you commit) into input randomness (information you plan around), which is what makes the
board-attacking enemies *interesting* rather than merely punishing. If the poison landed on a random
card after you committed to a chain, the same mechanic would read as the system beating you rather
than you misplanning.

### 10.6 What is *not* load-bearing

- The horror framing and the 1995 desktop. Excellent, and entirely separable from the systems.
- The specific joker list. Thirty jokers of which a handful (clone, double damage, nudge) carry the
  build; the rest are texture.
- The gold economy, if "buy out the shop" is accurate advice.

---

## 11. Where the research is thin

Stated rather than papered over:

- **No exact numbers survive into public sources** for: tableau size per level, stock/hand size, mana
  costs, gem values, enemy health, or gold prices. Everything numeric above comes from achievement
  thresholds, which give lower bounds on what is *achievable*, not the tuning.
- **The layout question is unresolved.** Whether levels use literal three-peak pyramids or free-form
  authored layouts rests on review description, not developer statement.
- **The "Making Of" book exists** — shipped in v1.07 as a desktop icon unlocked after finishing the
  game — and is very likely the best design source available. It was not retrievable from the web.
  If this line of research continues, that book is the next thing to obtain.
- **No developer postmortem** on the combat system's design. Birkett's only substantive quote on its
  origin, from the *Shadowhand* era, is that *"the idea sprung pretty much fully-formed into my head
  and when I coded it and tried it out, it worked very well"* — which is honest and analytically
  useless.
- Steam's store page, itch's page and two review sites were blocked or returned only marketing copy;
  the mechanical detail here is assembled from four reviews, one developer interview, two devlogs and
  an achievement guide.

---

## 12. Open questions — these are the developer's to answer

The folder this document sits in is named for a pairing that this document does not attempt to
resolve. Before any of the above becomes a design, four things need deciding, and none of them is
mine to decide:

1. **What is actually being built here?** A Forbidden-Solitaire-like with Balatro's economy? A
   Balatro-like on a Tri Peaks substrate instead of poker hands? Or is this folder a research space
   with no committed direction yet? Everything downstream changes with the answer.
2. **Does the design want a run structure or a narrative arc?** These two games answer oppositely and
   both were right. Balatro's ×2-per-ante requirement curve exists to make *growth class* the lesson;
   Forbidden Solitaire's flat-ish 2–3 hours exists so a small depth budget is never stretched. Picking
   one determines whether tools must be permanent-and-scaling or situational-and-spent.
3. **Is there an opponent?** Forbidden Solitaire's return arrow — enemies editing the tableau — is the
   half of the coupling that Balatro entirely lacks; Balatro's Boss Blinds break a rule but do not act
   *during* the hand. An adversary that mutates the board mid-solve is the most interesting unclaimed
   space between the two, and also the most expensive.
4. **One currency or two?** Gems + jokers, or Balatro's single joker slot doing both jobs.

Two of these interact: a run structure (Q2) with no opponent (Q3) is Balatro with different cards, and
the design would need a different source of escalation than a health bar.

---

## Sources

Developers and official:
- [Six One Indie — interview with the developers of Forbidden Solitaire](https://www.sixoneindie.com/post/interview-with-the-developer-of-forbidden-solitaire)
- [itch.io — v1.03 devlog, New Game+](https://nightsignalentertainment.itch.io/forbidden-solitaire/devlog/1554447/v103-update-inc-new-game)
- [itch.io — v1.07 devlog, "Making Of" book](https://nightsignalentertainment.itch.io/forbidden-solitaire/devlog/1595470/v107-update-inc-free-making-of-book)
- [Steam store page](https://store.steampowered.com/app/3414580/Forbidden_Solitaire/) · [itch.io page](https://nightsignalentertainment.itch.io/forbidden-solitaire)
- [Grey Alien Games — about (the Regency → Shadowhand → Ancient Enemy lineage)](https://greyaliengames.com/blog/about-grey-alien-games/)

Reviews and guides (mechanical detail):
- [Higher Plain Games — review](https://higherplaingames.com/pc/forbidden-solitaire-review/)
- [So Many Games — review](https://somanygames.co.uk/review/forbidden-solitaire-review/)
- [Hardcore Gaming 101](https://www.hardcoregaming101.net/forbidden-solitaire/)
- [Adventure Gamers — Forbidden Solitaire explained](https://adventuregamers.com/article/forbidden-solitaire-explained)
- [Shacknews — review](https://www.shacknews.com/article/149240/forbidden-solitaire-review-score)
- [TreyEx Gaming — achievement guide](https://www.treyexgaming.com/forbidden-solitaire-achievement-guide/)
- [Wikipedia — Forbidden Solitaire](https://en.wikipedia.org/wiki/Forbidden_Solitaire)

Substrate:
- [Solitaire Network — Tri-Peaks rules (28-card layout, 23-card stock, Ace-on-King wrap)](https://www.solitairenetwork.com/solitaire/tri-peaks-solitaire-game.html)
- [Anytime Games — TriPeaks rules](https://anytime.games/tri-peaks-solitaire-rules/)

Frameworks referenced in §10 are sourced in
[`../design-principles.md`](../design-principles.md) §1–§8.
