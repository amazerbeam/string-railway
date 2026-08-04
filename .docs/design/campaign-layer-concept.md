# Campaign layer & gym-style cities — concept sketch

**Status:** very early concept, gathered from conversation. Nothing here is settled — this is a
place to keep ideas from getting lost while they're still vague, per the developer's own framing.
Numbers are illustrative only, same convention as
[`skirmish-board-replacement.md`](./skirmish-board-replacement.md).

Relates to [`hybrid-concept.md`](./hybrid-concept.md) — idea #1 below is the first real answer to
that document's open question "the war above the battle: how many cities, how they connect, and
what winning the whole war means."

Source rules: [`../game_rules/fox-in-the-forest.md`](../game_rules/fox-in-the-forest.md)

---

## The ideas, as given

1. **A war/territory layer above individual city fights.** The Vanguard is a battle for a single
   city; the larger game is taking over a country or large territory. Cities sit on a map.
2. **The War Council shouldn't look like a card game.** Same trick-taking mechanics underneath, but
   presented/framed as a turn-based tactical exchange rather than visibly "playing cards." A skin,
   not a rules change.
3. **Cities are gym leaders, not shuffled opponents.** A city's defending side always has the same
   hand and the same items — fixed, memorizable, discoverable, the way a Pokémon gym leader always
   fields the same team. The player has to scout and prepare for a specific known opponent rather
   than beat a random deal.
4. **Between city fights, the player travels the map.** Smaller fights against towns along the way
   yield items and cards. Gathered special cards and consumable buffs (e.g. a potion that lets the
   player ignore the follow-suit requirement once, or one that lets them look at the next 3 cards
   and choose which to swap in) are things the player finds through exploration — settled as
   discovery, not a shop/currency purchase. Closest comparisons: Slay the Spire's Potions (single-use,
   held outside the deck, break a rule for a moment rather than being a stronger card) and Pokémon's
   items (X Items, held items — bend a battle's rules in your favour without being part of your
   team/deck itself).
5. **Player deck construction, built for progression.** Worked out in detail below.

---

## The deck-construction mechanic (idea 5, detailed)

Illustrative first-fight example, as described:

- The player's starting **base deck**: 2, 4, 6, 8, 10 of Bells + 1, 2 of Keys (7 cards, all
  no-ability except the 1).
- Before a fight, the player chooses a small number of **guarantee cards** (illustrative: 2) that
  will always be in their starting hand, and chooses a number of additional cards (illustrative: 7)
  to be shuffled into the rest of their hand.
- The **city's side is a fixed 13-card hand** — its "team," curated by whoever designs that city, to
  make the fight as easy or hard as intended (see idea 3).
- Whatever is left in the 33-card pool after the city's fixed 13 are set aside is what fills out the
  rest of the player's hand and the draw pile. For an early, easy-mode city, that leftover pool is
  deliberately weak — low, no-ability cards from all three suits — so an unprepared player is stuck
  playing mostly filler until they've gathered better cards of their own.
- **Guarantee-card count and shuffle-in count both increase as the player levels up**, and the
  player's base deck itself grows as they find more cards while exploring (idea 4). This is the
  progression hook: a tougher gym is beaten by having gathered the right counters, not by grinding
  numbers.

**The arithmetic closes cleanly against the existing game.** City hand (13) + player hand (13) +
draw pile (7) = 33 — the same deck size Fox already uses, just with the 33 cards partitioned
differently: the city's fixed team is carved out first, and the player's hand plus draw pile are
built from what's left. No new deck size, no second card pool.

**Why "fixed hand vs. diverse hand" is a real difficulty lever, not just a flavour claim.** Per the
trick-resolution rule, a card that can't follow the lead suit can only win the trick if it happens
to be trump — otherwise the trick is decided by the highest card *in the lead suit* regardless of
what's dumped. A player holding mostly one suit will be forced off-suit constantly against a
suit-diverse city hand, and can only win those tricks by holding trump. A suit-diverse city, by
contrast, can almost always follow suit itself. That's a genuine, mechanically-grounded squeeze, not
a thematic one — it will play exactly as hard as the city's hand composition is designed to be.

## The trump card is also fixed per city

Stated directly in conversation, and worth recording as its own point because of what it fixes: the
decree card (which sets trump) is **static per city, not drawn from the leftover pile at the table**.
Combined with a fixed city hand, this means a city's difficulty is now **entirely author-controlled**
— nothing about how hard a given fight is depends on what the shared draw pile happens to reveal that
session. This directly closes a risk raised earlier in conversation: a monosuit-heavy player facing a
random trump draw could win or lose a fight based on whether the decree happened to land on their one
suit, which would read as luck rather than preparation. With both the city's hand and its trump fixed,
a hard fight is hard because it was built that way, and a player who studies and counter-builds
against it is solving a designed problem, not gambling on a card reveal.

---

## Open questions

- **Visible or hidden order?** Still the open question from earlier conversation: is a city's fixed
  hand fully known to the player ahead of time (a solvable, chess-problem-style puzzle), or is its
  *composition* fixed and consistent but the *order* it's played in still concealed each attempt
  (same team, but you still don't know the exact sequence of moves)? These are meaningfully
  different games to design the city's AI play-logic against.
- **Where do gathered items slot into deck construction?** A guarantee-card slot, a shuffle-in slot,
  or a permanent addition to the player's base deck? Not yet decided.
- **Is the trump card visible to the player before the fight starts?** If a city's kit (hand +
  trump) is something the player scouts and prepares against, it matters whether the trump is
  knowable in advance (part of what you scout) or only revealed on engaging the fight.
- **Does the leftover pool (33 minus the city's fixed 13) ever run short of playable cards**, or
  reveal information about the city's hand by elimination? Not analyzed yet — worth checking once a
  few example city kits exist.
- **How does this connect to the Vanguard?** Everything in `hybrid-concept.md` and
  `skirmish-board-replacement.md` has the War Council funding a Muster that's spent on a hex-board
  Vanguard fight. This conversation's gym-city framing describes the War Council as if it might
  decide the city fight on its own. Not yet decided whether a gym-style War Council win is the whole
  fight for some or all cities, or whether it still feeds a Vanguard afterward — this is a real fork,
  not a detail.
