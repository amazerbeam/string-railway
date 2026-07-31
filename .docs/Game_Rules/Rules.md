# String Railway — Rules (extracted, with prototype decisions)

Source: `.docs/Game_Rules/Rules.pdf` (12 pages), extracted 2026-07-30.

- Game Design: Hisashi Hayashi
- Art and Graphic Design: Archie Edwards
- Game Development: Anthony Howgego
- Project Management: Paul Spencer
- 3D Modelling: Kris Ned
- Game Designer Agency: Forgenext

**Players:** 2–5 · **Length:** exactly 5 turns per player.

---

## How to read this document

This document is **complete and buildable** — there are no open questions left.
Where the rulebook was silent, a decision has been made so the prototype can
run, and every such decision is flagged:

| Flag | Meaning |
|------|---------|
| *(unflagged text)* | Taken directly from the rulebook. Trust it. |
| **[MADE UP — M#]** | **Not in the rulebook.** Invented so the prototype can run. See the [Made-up decisions index](#14-made-up-decisions-index) — each has an ID you can find and change. |
| **[DERIVED]** | Not printed as a rule, but forced by the printed component counts or by another rule. Safe, but not literally stated. |

Everything **[MADE UP]** is a guess at the designer's intent. After you've
played a few games, revisit §14 — that's the tuning list.

The rulebook is for **String Railway** specifically. Page 3 lists components
"not used in this game" (cargo cubes, engine cards, delivery contracts,
wildflower depots, and a second 25-card station deck with pointy-tree art), so
there is very likely a second game in the box with its own ruleset. This
document covers String Railway only.

---

## 1. Overview

String Railway is a dexterity/spatial game played on an open table rather than a
board. The playing area is defined by a loop of string. Players draw station
cards, place them inside the area, then lay fixed lengths of string ("railway
strings") between stations, scoring for each new station their network reaches
and losing points for crossing other strings.

The core tension: stations are placed by the player who usually wants to connect
to them, but every station is available to everyone, and each station has a hard
cap on how many *different* players may connect to it.

---

## 2. Components

Used in String Railway:

| Qty | Component |
|-----|-----------|
| 20 | Short Railway Strings |
| 5 | Long Railway Strings |
| 1 | Mountain String (green, closed loop) |
| 1 | River String (blue, open) |
| 1 | Border String (black, long loop) |
| 35 | Station Cards (**rounded trees** art) |
| 5 | Starting Stations |
| 60 | Victory Point Tokens |
| 10 | Player Markers |

Victory point token denominations shown in the components art: **1, 3, 5, 10,
20** (60 tokens total across those denominations).

**Not used in this game** (belongs to the other game in the box): Cloth Bag,
94 Cargo Cubes, 20 Engine Cards, 12 Delivery Contracts, 25 Station Cards
(pointy trees), 4 Goods Markers, 5 Wildflower Depots.

### 2.1 Per-player component split **[DERIVED]**

There are 5 player colours. Dividing the coloured components evenly:

- **4 short railway strings + 1 long railway string** per player = 5 strings,
  exactly one per turn over the 5-turn game.
- **2 player markers** per player — matches the rules' repeated phrase "you have
  already placed **both** of your player markers".
- **1 starting station** per player.

The rulebook says only that you take "the starting station, player markers, and
railway strings of that colour". The split above is the only one consistent with
the totals and with a 5-turn game.

**You choose which of your 5 strings to place each turn**, so the single long
string is a resource you spend on the turn of your choosing. **[MADE UP — M1]**

---

## 3. Prototype geometry constants **[MADE UP — M2]**

The rulebook gives no measurements. These are the numbers the prototype runs on.
All in abstract units, with the **border string 4000 units long** as the anchor —
one physical string of fixed length, formed into different shapes per player
count.

| Value | Units | Notes |
|-------|------:|-------|
| Border string length | 4000 | Fixed. Perimeter is preserved across shapes. |
| → 3-player triangle edge | 1333 | Equilateral. |
| → 4-player square edge | 1000 | Also used for 2-player. |
| → 5-player pentagon edge | 800 | Regular pentagon. |
| Station card | 120 × 120 | Square footprint. ~12% of the square's edge, matching the setup illustration. |
| Short railway string | 350 | ~3 card widths. |
| Long railway string | 700 | Exactly 2× short. |
| Mountain string length | 1400 | Closed loop. As a circle, radius ≈ 223. |
| River string length | 700 | Open; one end must touch the border. |
| Geometry tolerance | ±2% | For arc-length and touch tests (§4.3.1). |

Tune the string lengths first if the game feels too easy or too cramped — they
are the single biggest lever on difficulty.

---

## 4. Setup

### 4.1 Standard setup (3, 4 or 5 players)

1. Each player chooses a colour and takes the starting station, player markers,
   and railway strings of that colour.
2. Randomly choose the first player. That player places the **border string** so
   that **it does not cross itself**.
   - **3 players** — a **triangle**, with a white marker on each corner.
   - **4 players** — a **square**, with a white marker on each corner.
   - **5 players** — a **regular pentagon**.
3. The player to their left places the **river string** anywhere inside the
   border, so that it does not cross itself, and **exactly one of its ends
   touches the border string**.
4. The next player to the left places the **mountain string** anywhere inside the
   border string, so that it does not cross itself **and does not touch the
   border or river string**.
5. Shuffle the station cards into a facedown **station deck**.
6. The first player chooses a corner of the border string and places their
   **starting station** in that corner. The station must be both **contained
   within** and **touching** the border string.
7. In clockwise order, the remaining players choose a **different** corner and
   place their starting station in the same manner.
8. Place the victory point tokens in a general supply next to the border string.

From the example four-player setup illustration: the border forms a square with a
starting station in each corner; the river enters from one border edge and trails
inward; the mountain string is a closed loop near the centre; the deck and VP
supply sit outside the border.

### 4.2 Irregular borders (variant)

The border string may be positioned in **whatever shape you like** if the table
won't accommodate the recommended shape, or to create a unique map. With an
irregular shape, position starting stations so they are all **about the same
distance from the centre** of the playing area.

> "Beware – strange shapes can lead to strange games!"

### 4.3 Prototype setup automation **[MADE UP — M3]**

Setup is player-directed in the physical game (each player freely places a
terrain string). For a first prototype, generate it and skip the placement
interaction:

- Border: regular polygon per player count, centred on the play area.
- Mountain: circle of circumference 1400, centre offset from the play-area centre
  by a random 0–15% of the border's inradius.
- River: a smooth arc of length 700 starting at a random point on one border
  edge, curving inward, rejected and regenerated if it self-intersects or comes
  within one card width of the mountain.
- Starting stations: one per corner, inset so the card is inside the border and
  touching it, assigned in clockwise turn order.

Add interactive terrain placement later — it's a real part of the game's texture
(the river and mountain are placed by *specific* players, which is a small
opening tactical decision), but it isn't needed to evaluate the core loop.

---

## 5. How to play

Starting with the first player and proceeding **clockwise**, each player takes a
turn. Once **all players have taken five turns**, the game ends, and the player
with the most points wins.

### 5.1 Turn structure

1. **Draw and place a station**
2. **Place a railway string**
3. **Score points**

### 5.2 Step 1 — Draw and place a station

Draw a station from the **top of the station deck**. Place it so that:

- It **does not touch any string** (including the border, river and mountain).
- It **does not touch any other station**.
- It is **fully within the border string**.

Some stations resolve effects **immediately after being placed** — Rural's extra
draw, and Landmark/Depot's player marker (§8).

*Advice from the rulebook:* it is generally beneficial to place a station so you
can connect to it with a string this turn.

**If no legal placement exists** for the drawn station: return it to the bottom
of the deck and draw again. After **3 consecutive** undrawable/unplaceable cards,
skip step 1 for this turn and continue to step 2. **[MADE UP — M4]**

**If the deck is empty**, skip step 1. There is no discard pile, so nothing is
ever reshuffled. **[MADE UP — M5]** (A 5-player game draws 25 cards plus Rural
extras from a 35-card deck, so this is reachable but rare.)

### 5.3 Step 2 — Place a railway string

Choose a railway string **in your supply** and place it so that:

- **Each end of the string is connected to a station.** A string is connected to
  a station if it **touches any part of the station card**.
- **One end is connected to your starting station, or to a station that is
  connected to at least one of your previously placed strings.** Your network
  must remain one connected component rooted at your starting station.
- The string **does not enter the same station more than once**.
- The string **is not beneath an already placed station or railway string** — a
  newly placed string always goes *over* what is already there.
- The string **does not cross itself**.
- The string **does not cause any station to exceed its player limit** (§7.1).

A string may also connect to **additional stations by running through them**
(pass-through), not just at its two ends — every station it touches counts as
connected.

**Terminus stations are the exception:** railway strings cannot *pass through* a
Terminus; a string connected to one must **start or end** on it.

Because both ends must be on stations and no station may be entered twice, a
string always connects **at least two different** stations. **[DERIVED]**

#### 5.3.1 String length is fixed **[MADE UP — M6]**

This is the most important modelling decision in the prototype. A physical
string cannot stretch, and you cannot use only part of it — you lay the whole
thing, and coiling the slack would make it cross itself, which is illegal.

**Therefore: the path you draw must have an arc length equal to the string's
length, within ±2%.** A short string always lays exactly ~350 units of track,
however curved. This is what makes the game a spatial puzzle rather than a
free-draw — you can wiggle a string to reach a nearer station, but the wiggling
is what drags you across other people's lines.

#### 5.3.2 Additional placement rulings **[MADE UP]**

- **Railway strings must stay entirely within the border string. [MADE UP — M7]**
  Stations must be fully inside, and a string leaving and re-entering would cross
  the border twice anyway.
- **Touching is not crossing. [MADE UP — M8]** A crossing is a *transversal*
  intersection — the new string passes from one side of the other line to the
  other. Tangency that doesn't change sides is not a crossing. The prototype
  should reject degenerate tangency at placement time rather than adjudicate it.
- **If you have no legal string placement**, you forfeit steps 2 and 3 (place
  nothing, score nothing) but keep the string. The turn still counts toward your
  five. **[MADE UP — M9]**

### 5.4 Step 3 — Score points

Score based on the placement of your string **this turn**:

- **+ Connection bonus for each new station you connected to.** Do **not** score
  for stations already connected to one of your other strings.
  - The **black (top)** value applies if **you were the first player to connect
    to that station**.
  - Otherwise the **grey (bottom)** value applies.
  - Exception — **Railyard**: scores **every time** a string connects to it.
- **−1 point for each time you crossed a previously placed string.** Do **not**
  lose points for strings crossed **on top of a station card**.
- Station side effects trigger here too (Starting Station, Landmark, Depot — §8).

Track your score with victory point tokens. **Keep them face down** to hide your
exact score from other players.

#### Worked example from the rulebook (page 7)

The pink player places a railway string and:

- gains **+3** for a **Scenic** station lying **within the mountain string**
  (base 1, +2 Mountain Bonus),
- gains **+2** for another station connected for the first time,
- loses **−1 −1** for crossing the **mountain string twice**,
- loses **nothing** for crossing the yellow player's string, because that
  crossing was **on top of a station card**.

Net **+5 gained, −2 lost = +3**.

This example settles two things: **the mountain string counts as a "previously
placed string"** for the penalty, and **each crossing point is counted
separately** (twice across one string = −2).

#### 5.4.1 Scoring rulings **[MADE UP]**

- **The river and border strings also count as "previously placed strings"** —
  crossing either costs −1, exactly like the mountain. The rule says "each time
  you crossed a previously placed string", and the mountain precedent covers
  terrain. In practice M7 means the border is unreachable, so this mainly prices
  the river. **[MADE UP — M10]**
- **"Within the mountain string" means the whole card is inside the mountain
  loop.** Since a station may not touch any string, a card can never straddle the
  loop, so whole-card and centre-point tests agree — whole-card is stated for
  determinism. **[MADE UP — M11]**
- **Railyard repeat scoring uses the grey value.** Your first connection uses
  black-if-you-were-first / grey-otherwise as normal; every later connection of
  yours scores **grey**. **[MADE UP — M12]**
- **Landmark and Depot trigger on every scoring event at that station**, not only
  on first connections — the wording is "each time another player **scores the
  connection bonus**". This matters when a Railyard-style repeat or a second
  string re-scores. **[MADE UP — M13]**
- **Scores may go negative.** Nothing floors them at zero; a player deep in
  crossing penalties can sit below 0. **[MADE UP — M14]**

### 5.5 Game end

The game ends after all players have taken **five turns**. The player with the
most points wins. **Tied players share the victory.**

---

## 6. Turn-order and player-count summary

| Players | Border shape | Turn order | Total turns |
|---------|--------------|------------|-------------|
| 2 | Square (as 4p) | See §9 — each player controls 2 colours | 5 per **colour**, 20 total |
| 3 | Triangle | Clockwise from first player | 15 |
| 4 | Square | Clockwise from first player | 20 |
| 5 | Regular pentagon | Clockwise from first player | 25 |

---

## 7. Station anatomy

**All stations have a player limit and a connection bonus.**

### 7.1 Player Limit

The **maximum number of players** that can have strings connected to the station.
You cannot place a string in such a way that the player limit would be exceeded.

- Shown as a row of **white pawn figures** along the card's bottom edge — count
  them.
- **There is no limit to the number of strings a single player can have connected
  to a station.** The limit counts **distinct players**.
- **Pass-through consumes a slot. [MADE UP — M15]** "Connected" is defined as
  touching any part of the card, so merely running over a station counts you
  against its limit. The limit check therefore applies to *every* station the new
  string touches, not just its endpoints.
- **You can always add more of your own strings** to a station you're already on,
  even one that is otherwise full. **[DERIVED]** from "no limit to the number of
  strings a player can have connected".

### 7.2 Connection Bonus

Points for placing a railway string that connects to the station **for the first
time**.

- Shown as a **vertical pill with two numbers**: **black on top**, **grey below**.
- **Black (top)** — you were the **first player** to connect to this station.
- **Grey (bottom)** — otherwise (you are the 2nd+ player to connect).

### 7.3 Icon glossary

| Icon | Name | Rule |
|------|------|------|
| Pawn figure(s) | **Player Limit** | Max distinct players with strings connected. |
| Black/grey number pill | **Connection Bonus** | Black = first player to connect; grey = subsequent. |
| `+` in a square | **Draw Station** | On placement, immediately draw and place a **second** station. If the icon appears on that second station, **disregard it** — never a third. |
| Green mountain glyph under a `+2/+2` pill | **Mountain Bonus** | Connection bonus is worth **+2 more** if the station is within the mountain string. |
| Red-and-white barrier | **Terminus** | Strings **cannot pass through**; strings connected to it must **start or end** on it. |
| Circular arrow | **Multiplier** | **Each time** a string is placed connecting to this station, the placer scores the connection bonus (all other stations score only the first time). |
| Empty white disc | **Player Marker** | On placement, immediately add **one of your player markers**. If you draw such a station and have **already placed both** markers, **return it to the bottom of the deck and draw again**. |
| `-1` over a red figure | **Marker/owner penalty** | Each time **another player** scores the connection bonus here, the marker's owner — **or the player whose starting station it is** — **loses 1 point**. |
| `+1` over a red figure | **Marker bonus** | Each time **another player** scores the connection bonus here, the marker's owner **scores 1 point**. |

Placing a marker is **mandatory** when you place a Landmark or Depot and have one
available — the rules give no option to decline. **[MADE UP — M16]**

---

## 8. Station glossary (with card values)

Values read from the card art in the rulebook glossary (pages 11–12).
"First / Later" = black (first player to connect) / grey (subsequent players).

| Station | First | Later | Player limit | Special rules |
|---------|:-----:|:-----:|:------------:|---------------|
| **Starting Station** | 3 | 2 | 5 | Each time **another** player scores the connection bonus here, the player whose starting station it is **loses 1 point**. |
| **Hamlet Station** | 2 | 2 | 2 | None. |
| **Village Station** | 2 | 2 | 3 | None. |
| **Town Station** | 3 | 3 | 5 | None. |
| **Scenic Station** | 1 | 1 | 3 | Connection bonus **+2** if the station is within the mountain string (so 3/3 inside the mountain). |
| **Rural Station** | 1 | 1 | 1 | On placement, **immediately draw and place a second station**. If that second station is also Rural, do **not** draw a third. |
| **Terminus** | 3 | 3 | 5 | Strings **cannot pass through**; must **start or end** on it. |
| **Railyard** | 1 | 1 | 3 | **Each time** a string connects to it, the placer scores the connection bonus (not only the first time). |
| **Landmark Station** | 3 | 2 | 5 | On placement, **add a player marker**. Each time **another** player scores here, the marker's owner **loses 1**. If both your markers are placed, return the card to the bottom of the deck and draw again. |
| **Depot** | 0 | 2 | 5 | On placement, **add a player marker**. Each time **another** player scores here, the marker's owner **gains 1**. If both your markers are placed, return the card to the bottom of the deck and draw again. |

Notes for implementers:

- **Depot's values are deliberately inverted** (0 first, 2 later). The first
  player to connect scores nothing; later players score 2, and each of those
  gives the marker owner +1. It's a bait station.
- **Rural has player limit 1** — the first player to connect locks everyone else
  out permanently.
- **Starting Station** is a separate component (5 of them, one per colour), not
  part of the 35-card deck. Its printed limit is 5, so treat it as a normal
  station for limit purposes.
- **Landmark and Depot** are the only deck cards with the Player Marker icon,
  which is why drawing them is conditional on having a marker left.

### 8.1 Deck composition **[MADE UP — M17]**

The rulebook never states the distribution of the 35 station cards. The
components illustration shows five faces but no counts. This is the prototype's
deck — weighted toward plain stations, effect stations scarce:

| Station | Count |
|---------|:-----:|
| Hamlet | 6 |
| Village | 6 |
| Town | 5 |
| Scenic | 4 |
| Rural | 4 |
| Terminus | 3 |
| Railyard | 3 |
| Landmark | 2 |
| Depot | 2 |
| **Total** | **35** |

Keep this in a config file, not in code — it's the second-biggest tuning lever
after string lengths. **If you have the physical cards, count them and replace
this table**; it's the one made-up value that has a definitive real answer.

---

## 9. Two-player variant

Read before setting up.

**Setup** — as for a **four-player** game, except:

- Each player takes **two colours** of strings, player markers, and starting
  stations.
- The **first player also acts as third** in turn order.
- The other player acts **second and fourth**.

Turn order by colour: `P1-a, P2-a, P1-b, P2-b`, repeating for 5 rounds.

**Gameplay**

- **Each colour counts as a separate player for all purposes.** If one player
  connects to a station with both of their colours, they count as **two** toward
  that station's player limit.
- Consequently, the "another player" wording on Starting Station, Landmark and
  Depot triggers **between a single player's own two colours** — your blue
  network scoring at your own red Landmark costs you a point. **[DERIVED]**
- At game end, each player totals the scores of their two colours. Most points
  overall wins. **Tied players share the victory.**

---

## 10. Data model **[MADE UP — implementation]**

```
GameState
  seats: ColourSeat[]        # 2..5 players; 2p => 4 colour-seats
  turnOrder: ColourId[]      # clockwise; 2p variant = [A1, B1, A2, B2]
  round: int                 # 1..5; game ends after round 5
  activeSeatIndex: int
  border:   ClosedPolyline   # non-self-intersecting loop, length 4000
  river:    OpenPolyline     # non-self-intersecting; exactly one end on border
  mountain: ClosedPolyline   # non-self-intersecting; touches nothing at setup
  deck: StationCard[]        # 35, shuffled
  stations: PlacedStation[]
  paths: PlacedPath[]        # railway strings + the 3 terrain strings

ColourSeat
  colour: ColourId
  owner: PlayerId            # two seats share an owner in the 2p variant
  shortStringsLeft: int      # 4
  longStringsLeft:  int      # 1
  markersLeft: int           # 2
  startingStationId: StationId
  score: int                 # hidden from others; may go negative (M14)

StationCard
  type: enum{Hamlet,Village,Town,Scenic,Rural,Terminus,Railyard,Landmark,Depot,Starting}
  bonusFirst: int            # black
  bonusLater: int            # grey
  playerLimit: int
  flags: {drawStation, mountainBonus, terminus, multiplier, needsMarker,
          markerPenalty, markerBonus}

PlacedStation
  card: StationCard
  rect: OrientedRect                # 120x120 footprint
  markerOwner: ColourId?            # Landmark/Depot/Starting
  connections: Map<ColourId, int>   # colour -> count of that colour's strings touching
  firstConnector: ColourId?         # who claimed the black value
  insideMountain: bool              # computed once at placement (M11)

PlacedPath
  kind: enum{ShortRail, LongRail, Mountain, River, Border}
  owner: ColourId?                  # null for terrain
  path: Polyline                    # arc length == nominal length +/-2% (M6)
  placedOnTurn: int                 # z-order; higher = on top
```

### 10.1 Geometry predicates

- `selfIntersects(polyline)` — border, river, mountain, and every railway string.
- `arcLength(polyline)` — the M6 fixed-length check.
- `touchesRect(polyline, rect)` — string↔station connection, and the
  station-placement "does not touch any string" test.
- `rectsOverlapOrTouch(a, b)` — "does not touch any other station".
- `rectFullyInside(rect, closedPolyline)` — "fully within the border string", and
  the mountain-containment test.
- `crossings(newPath, existingPath) -> Point[]` — **transversal** intersections
  only (M8). Drives the −1 penalty and its count.
- `pointInAnyRect(point, rects)` — exempts crossings that occur **on top of a
  station card**.
- `entryCount(path, rect)` — "does not enter the same station more than once":
  count **contiguous runs** of the path inside the rect, not raw intersections.
- `passesThrough(path, rect)` vs `endsOn(path, rect)` — the Terminus test. A path
  passes through if it is inside the rect at any point that is not one of its two
  endpoints' contiguous runs.

### 10.2 String placement validation order

Reject on the first failure so the error message is useful:

1. The chosen string type is still in the player's supply.
2. `abs(arcLength(path) - nominalLength) <= 2%` (M6).
3. `!selfIntersects(path)`.
4. Both endpoints touch some station.
5. Network rule: at least one endpoint touches the player's starting station, or
   a station already touched by one of that player's earlier strings.
6. No station is entered more than once.
7. Every Terminus the path touches is touched **only at an endpoint**.
8. For every station the path newly touches,
   `distinctPlayers(after placement) <= playerLimit` (M15 — includes
   pass-throughs).
9. `pathFullyInside(path, border)` (M7).
10. No degenerate tangency with an existing path or card edge (M8).

The "not beneath an existing string or station" rule needs no check: the new
string is appended last in z-order, so it is on top by construction.

### 10.3 Scoring resolution

```
gained = 0
for station in stationsTouchedByNewString:          # includes pass-throughs
    alreadyMine = owner in station.connections
    scores = (not alreadyMine) or station.flags.multiplier   # Railyard (M12)
    if not scores:
        continue

    if station.firstConnector is None:
        base = station.card.bonusFirst              # black
        station.firstConnector = owner
    else:
        base = station.card.bonusLater              # grey

    if station.flags.mountainBonus and station.insideMountain:
        base += 2

    gained += base

    # side effects: only when the scorer is not the marker/station owner.
    # In the 2p variant these compare COLOURS, not players (§9).
    if station.markerOwner is not None and station.markerOwner != owner:
        if station.flags.markerBonus:   scoreOf(station.markerOwner) += 1
        if station.flags.markerPenalty: scoreOf(station.markerOwner) -= 1

lost = 0
for other in paths placed before this one:          # incl. mountain, river, border (M10)
    for p in crossings(newPath, other.path):
        if not pointInAnyRect(p, allStationRects):  # on-card crossings are free
            lost += 1

scoreOf(owner) += gained - lost                     # may go negative (M14)
```

### 10.4 Turn loop

```
for round in 1..5:
    for seat in turnOrder:
        # --- Step 1: draw and place a station ---
        extraDraws = 0
        drewRuralAlready = false
        failures = 0
        placementsThisTurn = 0

        while (placementsThisTurn == 0 or extraDraws > 0) and deck.notEmpty():
            if extraDraws > 0: extraDraws -= 1

            card = deck.draw()
            while card.flags.needsMarker and seat.markersLeft == 0:
                deck.putOnBottom(card)
                card = deck.draw()

            if not hasLegalPlacement(card):         # M4
                deck.putOnBottom(card)
                failures += 1
                if failures >= 3: break
                continue

            placeStation(card)
            placementsThisTurn += 1
            if card.flags.needsMarker:
                attachMarker(seat)                  # mandatory (M16)
            if card.flags.drawStation and not drewRuralAlready:
                extraDraws += 1
                drewRuralAlready = true             # never a third station

        # --- Step 2: place a railway string ---
        if hasAnyLegalStringPlacement(seat):
            placeString(seat)                       # validation: §10.2
            # --- Step 3: score ---
            resolveScoring(seat)
        # else: forfeit steps 2 and 3, keep the string (M9)

# --- Game end ---
# 2p variant: sum each player's two colour-seat scores first.
winner = argmax(score); ties share the victory
```

The `drewRuralAlready` guard caps the chain at one extra station per turn — the
Draw Station icon on a second-generation station is explicitly disregarded.

### 10.5 Hidden information

Victory point tokens are kept **face down** — exact scores are hidden during
play. Hide opponents' totals in the UI and reveal at game end. Everything else
(stations, strings, deck size, marker ownership) is public.

For a first prototype it's worth adding a debug toggle that reveals all scores —
you'll want it while checking the scoring code against §5.4's worked example.

---

## 11. Suggested build order for a playable prototype

1. **Geometry core** — the predicates in §10.1, tested standalone. Everything
   else depends on them and they're where the bugs will be.
2. **Static setup** (M3) for 4 players, no interaction. Render border, river,
   mountain, four starting stations.
3. **Station placement** — draw, drag, legality highlighting for the three
   constraints in §5.2.
4. **String placement** — the fixed-arc-length drag (M6) is the interaction to
   get right; everything about how the game *feels* lives here. Consider a
   control-point curve whose length is normalised to the string's nominal length.
5. **Scoring** — implement §10.3 and verify against the page 7 worked example
   (+3 Scenic-in-mountain, +2, −1 −1 for two mountain crossings, on-card crossing
   free → net +3).
6. **Turn loop and game end** (§10.4), then the special stations in this order:
   Rural (extra draw) → Terminus (pass-through ban) → Railyard (repeat scoring) →
   Landmark/Depot (markers and side-effect scoring).
7. **2-player variant** last — it's pure turn-order and scoring bookkeeping over
   a working 4-player game.

---

## 12. What to watch for in your first play

Since these are made-up values, here's what would tell you a specific one is
wrong:

| Symptom | Likely culprit |
|---------|----------------|
| Strings can't reach anything; turns feel forced | Short string length too small (M2) — raise to ~450 |
| Every station is trivially reachable; no tension | String lengths too generous (M2) — lower, or shrink the border |
| Crossing penalties never matter | Board too sparse — more stations per turn, or a shorter border |
| Games decided by one lucky Town/Terminus draw | Deck composition (M17) — flatten the high-value counts |
| Depot and Landmark never appear | Only 2 each in a 35-card deck (M17); raise to 3 each |
| Everyone ignores the mountain entirely | Mountain too small or badly placed (M2/M3) — enlarge it so Scenic stations land inside |
| Scores are wildly negative | River crossing penalty (M10) may be too harsh — try terrain-crossing = −1 only for the mountain |

---

## 13. Rulebook page map

For checking any extraction against the source:

| Page | Contents |
|------|----------|
| 1 | Cover (designer credits) |
| 2 | Components |
| 3 | Components not used in this game; Setup steps 1–2 + border shape diagrams |
| 4 | Two-player pointer; Setup steps 3–8; Irregular borders |
| 5 | Example four-player setup diagram; How to play; Turn structure |
| 6 | Draw and Place a Station; Place a Railway String |
| 7 | String placement (cont.); Score Points; worked scoring example diagram |
| 8 | Game End; Stations — Player Limit, Connection Bonus, Draw Station, Mountain Bonus |
| 9 | Terminus, Multiplier, Player Marker, marker penalty/bonus icons |
| 10 | Two-player variant; Credits |
| 11 | Station glossary — Starting, Hamlet, Village, Town, Scenic |
| 12 | Station glossary — Rural, Terminus, Railyard, Landmark, Depot |

Card stat values (§8) are not in the PDF's text layer — they are readable only in
the card artwork on pages 11–12.

---

## 14. Made-up decisions index

Every invention in this document, in one place. **None of these are printed
rules.** Change them freely.

| ID | Decision | Where | Confidence |
|----|----------|-------|-----------|
| **M1** | You freely choose which of your 5 strings to place each turn (so the long string is spent when you like) | §2.1 | High — nothing suggests a fixed order |
| **M2** | All geometry constants: border 4000, card 120², short 350, long 700, mountain 1400, river 700, ±2% tolerance | §3 | Low — pure invention, scaled off the illustrations. **Primary tuning lever.** |
| **M3** | Setup is auto-generated rather than player-placed | §4.3 | N/A — a prototype scope cut, not a rule change |
| **M4** | Unplaceable station → bottom of deck, redraw; skip step 1 after 3 failures | §5.2 | Medium |
| **M5** | Empty deck → skip step 1; nothing is ever reshuffled | §5.2 | High — there is no discard pile |
| **M6** | **A placed string's arc length must equal its nominal length (±2%)** | §5.3.1 | High as physics, but it's the decision that most defines how the game plays |
| **M7** | Railway strings must stay entirely inside the border | §5.3.2 | High |
| **M8** | Crossing = transversal intersection; tangency is not a crossing | §5.3.2 | High |
| **M9** | No legal string placement → forfeit steps 2–3, keep the string, turn still counts | §5.3.2 | Medium |
| **M10** | River and border count as "previously placed strings" for the −1 penalty | §5.4.1 | Medium — the mountain is confirmed by the rulebook example; terrain generalisation is the guess |
| **M11** | "Within the mountain string" = whole card inside the loop | §5.4.1 | High — cannot differ from a centre-point test, given stations can't touch strings |
| **M12** | Railyard's repeat connections score the grey value | §5.4.1 | Medium |
| **M13** | Landmark/Depot trigger on every scoring event, not just first connections | §5.4.1 | Medium-high — follows the "each time … scores" wording |
| **M14** | Scores may go negative | §5.4.1 | Medium |
| **M15** | Pass-through consumes a player-limit slot | §7.1 | High — follows from "connected = touches any part of the card" |
| **M16** | Placing a marker on Landmark/Depot is mandatory | §7.3 | High — no option to decline is offered |
| **M17** | Deck composition: 6 Hamlet, 6 Village, 5 Town, 4 Scenic, 4 Rural, 3 Terminus, 3 Railyard, 2 Landmark, 2 Depot = 35 | §8.1 | Low — **the one made-up value with a definitive real answer: count the physical cards** |
