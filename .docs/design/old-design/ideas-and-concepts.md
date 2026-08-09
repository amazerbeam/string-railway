# Ideas and concepts — the developer's running scratchpad

**Renamed from `campaign-layer-concept.md`** (2026-08-07) to match what this file has always
actually been, per its own Status line below: a holding pen for ideas that don't have a permanent
home yet, not a document scoped to one topic. The campaign-layer and gym-city material below is
this file's first occupant, not its whole scope — later ideas that don't yet belong in `reskin.md`,
`skirmish-board-replacement.md`, or another owned document land here too.

**Status:** very early concept, gathered from conversation. Nothing here is settled — this is a
place to keep ideas from getting lost while they're still vague, per the developer's own framing.
Numbers are illustrative only, same convention as
[`skirmish-board-replacement.md`](./skirmish-board-replacement.md).

Relates to [`hybrid-concept.md`](./hybrid-concept.md) — idea #1 below is the first real answer to
that document's open question "the war above the battle: how many cities, how they connect, and
what winning the whole war means."

Source rules: [`../game_rules/fox-in-the-forest.md`](../game_rules/fox-in-the-forest.md)

---

## Campaign layer & gym-style cities — concept sketch

### The ideas, as given

1. **A war/territory layer above individual city fights.** The Vanguard is a battle for a single
   city; the larger game is taking over a country or large territory. Cities sit on a map.
2. **The War Council shouldn't look like a card game.** Same trick-taking mechanics underneath, but
   presented/framed as a turn-based tactical exchange rather than visibly "playing cards." A skin,
   not a rules change.
3. **Cities are gym leaders, but the hand reshuffles now, not the whole team.** (Revised
   2026-08-08 — see [`us-civil-war-game-framing.md`](./us-civil-war-game-framing.md).) A city's
   defending general no longer holds the identical 13 cards on every attempt — like the player,
   their hand is reshuffled fresh each time. What stays fixed and scoutable is a small number of
   **guaranteed cards** (Settled 2026-08-08: at least one *specific* card, e.g. "the 7 of Bells,"
   not just a rank) — the same guarantee-card mechanism above, now run for the CPU too. The Pokémon
   comparison being reached for isn't "a gym leader's team never changes" — it's that **a whole
   tier of trainers shares one trait**, the way every Elite Four trainer in Pokémon carries a Hyper
   Potion regardless of which Pokémon they lead with: Settled 2026-08-08, the guarantee is a
   **regional** trait (every general in an area carries it), discoverable the way any Pokémon gym's
   signature is. **Proposed, not yet decided:** whether the guaranteed rank *escalates* by region
   using the ability gradient already in the card list (illustrative ladder: 7 Treasure → 9 Witch →
   11 Monarch, mildest ability to nastiest) — this would set regional difficulty without inventing
   any new card, but it's a suggestion from critique conversation, not a developer call yet.
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

### The deck-construction mechanic (idea 5, detailed)

Illustrative first-fight example, as described:

- The player's starting **base deck**: 2, 4, 6, 8, 10 of Bells + 1, 2 of Keys (7 cards, all
  no-ability except the 1).
- Before a fight, the player chooses a small number of **guarantee cards** (illustrative: 2) that
  will always be in their starting hand, and chooses a number of additional cards (illustrative: 7)
  to be shuffled into the rest of their hand.
- **Settled 2026-08-08:** the player starts a campaign with **1** guarantee-card slot. That count
  (and the shuffle-in count) grows from there as the player levels up, per the progression hook
  below.
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

**Reopened by idea 3's 2026-08-08 revision.** That arithmetic, the "leftover pool is deliberately
weak for an easy city" lever above, the suit-diversity squeeze argument just below, and the trump
section's "entirely author-controlled" claim all assumed the city's *whole* 13-card hand was fixed.
Now only its guaranteed card(s) are — the rest reshuffles from the shared pool like the player's
does. None of those arguments are wrong, they're just unverified against the new mechanism; each
needs re-deriving once there's a concrete guarantee-card count to test against, not guessed here.

**Why "fixed hand vs. diverse hand" is a real difficulty lever, not just a flavour claim.** Per the
trick-resolution rule, a card that can't follow the lead suit can only win the trick if it happens
to be trump — otherwise the trick is decided by the highest card *in the lead suit* regardless of
what's dumped. A player holding mostly one suit will be forced off-suit constantly against a
suit-diverse city hand, and can only win those tricks by holding trump. A suit-diverse city, by
contrast, can almost always follow suit itself. That's a genuine, mechanically-grounded squeeze, not
a thematic one — it will play exactly as hard as the city's hand composition is designed to be.

### The trump card is also fixed per city

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

### Overworld travel: the map and the car (idea 4, detailed)

Prompted by looking at how *Overcooked 2* handles its between-level overworld. Three things are
being taken from that reference, and nothing else:

- The travel layer is **an actual small navigable space** — not a menu of level nodes, not a
  cutscene, a place the player moves through.
- **One player physically drives** a vehicle through that space. (*Overcooked 2* has all players
  sharing control of one vehicle, since it's built for co-op; that doesn't apply here and isn't
  being carried over.)
- **The map has nodes, and reaching a node is what triggers a fight** — a city, a town, whatever
  the node represents.

Explicitly *not* being taken from the reference: the shared/co-op vehicle, the vehicle changing
form per terrain, hidden switches/secrets along the road, star-gated unlocking of new areas, and
the "no random encounters while traveling" rule. Those were Overcooked 2's answers to Overcooked
2's problems (four-player couch co-op, a cooking game with no combat layer) and don't carry an
argument for why they'd fit here — they're just not part of what's being borrowed.

This gives idea #4 ("between city fights, the player travels the map") an actual mechanism: the
travel map is the thing you drive across, and the towns/cities it already describes are the nodes
that trigger a fight on arrival.

**Metroidvania-style upgrade gating**, floated in conversation as a way to make that map more than
a road: the car itself gains attachments over the course of the campaign, and each attachment
permanently opens up terrain that was previously blocked —

- different **wheels** to cross terrain the base car can't (mud, sand, snow, whatever the map's
  regions turn out to be),
- a **bullbar** to push obstacles out of the road,
- a **forklift** to lift something blocking a node.

The traversal shape this produces is the standard Metroidvania one: the map isn't fully open from
the start, a region glimpsed early stays unreachable until the right attachment is found, and
finding that attachment makes a return trip to an already-visited area worthwhile. This gives the
travel map a second job beyond "get from fight to fight" — it becomes something the player
re-explores as their car grows capable of more of it.

---

### Open questions

- **Superseded by idea 3's 2026-08-08 revision.** This question assumed a fully fixed city hand —
  composition knowable, only order concealed. That's no longer the shape of the mechanism: the
  hand reshuffles, so composition isn't fixed either, only the guaranteed card(s) are. Live version
  of the same question now: is a city's guaranteed card(s) visible to the player before the fight
  (scouting means learning what a region's generals carry), or discovered only by fighting them?
  Parallels the still-open decree-visibility question in `us-civil-war-game-framing.md`.
- **Where do gathered items slot into deck construction?** Partly settled for **cards** specifically
  (2026-08-07, see [`us-civil-war-game-framing.md`](./us-civil-war-game-framing.md)): a found card
  can fill a guarantee-card slot, which is exactly how a city can gate a goal behind "go find this
  card first." Still open for **consumable buffs** (potions/items, idea 4) — those aren't cards at
  all, so this mechanism doesn't obviously apply to them.
- **Is the trump card visible to the player before the fight starts?** If a city's kit (hand +
  trump) is something the player scouts and prepares against, it matters whether the trump is
  knowable in advance (part of what you scout) or only revealed on engaging the fight. Partly
  settled for scripted story battles specifically — see `us-civil-war-game-framing.md` — still open
  for ordinary cities.
- **Does the leftover pool (33 minus the city's fixed 13) ever run short of playable cards**, or
  reveal information about the city's hand by elimination? Not analyzed yet — worth checking once a
  few example city kits exist.
- **How does this connect to the Vanguard?** Everything in `hybrid-concept.md` and
  `skirmish-board-replacement.md` has the War Council funding a Muster that's spent on a hex-board
  Vanguard fight. This conversation's gym-city framing describes the War Council as if it might
  decide the city fight on its own. Not yet decided whether a gym-style War Council win is the whole
  fight for some or all cities, or whether it still feeds a Vanguard afterward — this is a real fork,
  not a detail.
- **What does driving actually look like?** Top-down on a hand-drawn campaign map, a straight
  connect-the-nodes road, free-roam within a bounded region — not decided. This also determines
  whether "reaching a node" means driving onto it directly or something more like selecting/
  approaching it.
- **Does arriving at a node always mean a fight**, or can a node be something else (a shop, a
  story beat, a rest stop) with fight-nodes being one type among several? Idea #4's "smaller
  fights against towns along the way" implies more than one node type already (fights that yield
  items vs. the cities themselves), so this may already need two node kinds, not one.
- **Is the travel map one continuous space for the whole campaign, or one small space per
  region/chapter** that resets or is replaced as the player advances? Affects whether the car and
  map are a persistent world object or a per-chapter transition scene. (A single continuous map is
  the version the Metroidvania upgrade-gating idea assumes — backtracking to an earlier region only
  means something if that region still exists to return to.)
- **Where do car attachments come from** — are they what a town/city fight yields (folding into
  idea #4's existing "smaller fights yield items and cards"), a story-beat reward, or something
  else? Not decided, and it determines whether upgrade-gating and the deck-construction item system
  (idea 5's open question "where do gathered items slot into deck construction?") are the same
  reward pool or two separate ones.
- **How many attachments, and how much of the map does each one gate?** Unset — needs at least a
  rough attachment list and a rough map shape before this stops being purely notional.

---

## Supply-line mini-games (idea 8)

### The idea, as given

A category of short, focused mini-games built around **physically moving something to where it's
needed** — supplies, troops, guns — sitting alongside the War Council and the Vanguard rather than
inside either of them. First sketch, given with a rough drawing (top-down ocean, a boat near the
bottom, hand-drawn wave marks scattered across the water):

- **A supply ship, steered top-down.** The ship is big, so it **turns slowly** — the core feel is
  momentum and commitment to a turn, not snappy directional control. The player steers it across
  open water, presumably toward a destination that matters to the supply line (a port, a convoy
  route, a blockade to avoid).
- **The mini-game is a vehicle for a supply line**, not just steering for its own sake — the fiction
  given is delivering something (soldiers, guns, "or something") rather than travel with no cargo.
- **More of these, not just the one.** Explicitly framed as a pattern to repeat with different
  vehicles: e.g. **driving troops to the front line in a car**. Short, quick, low-friction — not a
  full driving game, a brief interlude.

### Why this is its own category, not the overworld car

[Overworld travel](#overworld-travel-the-map-and-the-car-idea-4-detailed) is already a
"player drives a vehicle" idea, but it's a persistent, continuous space the player free-roams
between every fight — the spine that connects nodes on the campaign map. This idea reads
differently: **short, self-contained, one-off vehicle-control challenges**, each with its own feel
(a slow-turning ship is a different control problem than a car), triggered around specific supply
or reinforcement moments rather than being the connective tissue between all fights. Whether these
end up as *flavors of node* on the same overworld map, or fully separate mini-game screens the
overworld can trigger, is open — see below.

### Open questions

- **What does steering the ship actually do?** Reach a destination without running aground/into a
  hazard, evade a patrol, arrive within a time or fuel budget — not decided. "Big ship, turns
  slowly" is a feel, not yet a win/lose condition.
- **What's the stake if a supply mini-game is failed?** Does it gate the following fight (arrive
  late/light on supply and the next city fight is harder — e.g. fewer guarantee-card slots or a
  weaker leftover pool per [idea 5](#the-deck-construction-mechanic-idea-5-detailed)), or is it
  lower-stakes texture between fights? Not decided, and it determines whether this is a real
  progression lever or a pacing beat.
- **How does a supply mini-game get triggered** — a node type on the overworld map (see the open
  question in the section above, "does arriving at a node always mean a fight"), a scripted beat
  tied to specific story fights, or both? Not decided.
- **What's the actual roster of these mini-games?** Only two examples exist so far (ship, car-to-
  front-line). Needs a running list once more get proposed, each with its own vehicle-appropriate
  control feel (a ship's slow turn vs. a car's steering vs. whatever comes next) rather than one
  generic "drive a vehicle" control scheme reused everywhere.
- **Shared mechanical skeleton or bespoke per vehicle?** Not decided whether these mini-games share
  one underlying system (a generic "steer toward a goal, avoid hazards" loop reskinned per vehicle)
  or are each built bespoke. Affects how cheap it is to add the next one.

---

## Historical framing & battle goals

**Moved to [`us-civil-war-game-framing.md`](./us-civil-war-game-framing.md)** (2026-08-08) — the
fictionalized Civil War setting, the fixed war outcome, the bronze/silver/gold battle-goal system,
and the scripted-battle mechanism that answers "what does losing mean" all live there now. That
document supersedes idea 6 and idea 7 as they were first sketched here.
