# The Vanguard — network growth on a hex board

**Status:** proposed design, still being built out conversationally. Supersedes both Hex
(`hybrid-concept.md`'s original "Battle loop" section) and this document's own first draft, a
single-lane advance-with-entrenchment mechanic — see "Why the lane version didn't work" below for
why that draft was scrapped rather than tuned.

**Naming:** the Fox in the Forest card layer is the **War Council**; this board mechanic is
**The Vanguard**. See `CLAUDE.md` → "Game naming" for the full glossary (Muster, The Clash, The
Breach).

Source rules for the two parent games:
[`../game_rules/fox-in-the-forest.md`](../game_rules/fox-in-the-forest.md) ·
[`../game_rules/hex.md`](../game_rules/hex.md)

Originally written against [SCRUM-17](https://amazerbeam.atlassian.net/browse/SCRUM-17); this
revision was designed live with the developer, mechanic by mechanic, rather than through that
ticket's contract pipeline. Critiqued against Hex in
[`concept-critique.md`](./concept-critique.md) — Problems 1–3 there are still the reasons Hex
itself is being replaced.

---

## Why Hex is being replaced

Unchanged from the first draft: `concept-critique.md`'s Problem 1 shows a War Council ambush is
very likely to end the battle outright (roughly double the stones a guaranteed Hex connection
needs, handed out as an unanswered run). Problem 2 shows the coupling runs one way only — points
flow War Council → board, nothing flows board → War Council. Problem 3 shows Fox's 13 tricks
always split so exactly one side scores 6, collapsing every round to a single boundary question.
None of that argues for reskinning Hex; it argues for a board that survives a lopsided round and
gives the board something to say back to the cards.

## Why the lane version didn't work

The first draft replaced Hex with a single 1D track and two actions (Advance, Entrench), sized to
pass a narrow test: prove that spending the same allowance offensively vs. defensively produces
different states. It passed that test on paper but failed as a game, for a structural reason the
developer caught directly: **a single lane has exactly one front.** Real attack/defend tension
comes from not being able to defend everywhere at once — with only one axis of contest, there is
no "everywhere" to be spread thin over, so the choice collapses into "push this number up or tax
it later." That's arithmetic wearing a board-game costume. Scrapped rather than re-tuned, because
no cost formula fixes a board with only one place to fight over.

## The replacement: The Vanguard

Two fixed bases sit on a full hex-grid board — purple (Player) in one corner, green (CPU) in the
opposite corner — each pre-seeded with a small cluster of connected tokens. Each round, the War
Council (a Fox in the Forest card round) funds a **Muster** for both sides, which they spend
extending, contesting, and fortifying territory outward from their base in **The Clash**. Whoever
completes an unbroken chain of their own tokens from their base into the opponent's base achieves
**The Breach** and wins the Vanguard. Because the board is a real 2D grid, there are many possible
routes between the two bases, not one — committing moves to push on one route can leave another
exposed, which is the genuine offense/defense allocation problem the lane version never had.

### Board

- A hex-grid rhombus (same shape Hex used), with two fixed **base cells** instead of two edges —
  purple and green, in roughly opposite corners.
- Each base starts with a small pre-seeded cluster of that side's own connected tokens (size not
  yet decided — illustrative only).
- Certain cells are permanent **defenses** (grey): no one may ever place a token there. Fixed per
  map, not a per-turn action.

### Actions, spent during The Clash

| Action        | What it does                          | Legal when                                                                       | Cost                                                                             |
| ------------- | ------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Expand**    | Place a token on an empty cell        | Within 2 hex-spaces of your existing connected network — a 1-cell gap is allowed | 1 move                                                                           |
| **Overwrite** | Replace an enemy token with your own  | Only on a cell **adjacent** (touching) to your existing network — no gap allowed | 2 moves (3 if the target is reinforced)                                          |
| **Reinforce** | Add defense to one of your own tokens | Any token you already hold                                                       | 1 move, and a token can only ever hold **+1** defense — it doesn't stack further |

Expansion is allowed to leapfrog with a gap, so a side can scout ground quickly; combat is
adjacency-only, so it only happens where two networks actually meet. That split is deliberate —
it's what makes "push here" and "hold there" different, concrete decisions instead of one dial.

### Muster and turn order

Each side's Muster is a move budget for the round: a baseline number of moves (illustrative
example: 7), plus bonus moves for winning that round's War Council. This is the same non-zero-floor
idea the lane version's conversion function was chasing — a side that loses the War Council still
gets its full baseline Muster, it just doesn't get the bonus.

Within The Clash, both sides **alternate one action at a time** — you place/overwrite/reinforce,
then the opponent does, back and forth — until one side's Muster is exhausted. Whichever side has
moves left over at that point (typically the round's War Council winner, from their bonus) spends
the remainder **consecutively, uncontested**. That's the tangible payoff for winning the War
Council: free, unanswered actions at the end of the exchange, not just a bigger number to spend.

### The Breach — win condition

A side achieves the Breach when it holds an **unbroken chain of adjacent tokens** connecting its
own base all the way to the opponent's base. The gap-of-1 rule that's legal for expansion does
**not** count toward this — a winning connection must be solid, no gaps. Gaps are a scouting tool
for reaching ground fast; they have to be filled in before they count as a completed path, and a
gap left unfilled is exploitable — the opponent can plant a token in it (since it's just an open
cell) and force a detour, or you can pay the 2-move overwrite cost later to reclaim it if they do.

---

## Open, not yet decided

Flagging these honestly rather than quietly resolving them:

- **No stalemate/tiebreak rule yet.** Classic Hex can't draw, because it connects opposite _edges_
  of the board — a full board is mathematically guaranteed to contain exactly one connecting
  chain. Base-to-base is two specific _points_, not edges, so that guarantee does not carry over:
  it's entirely possible for the board to fill up, or many rounds to pass, with neither base ever
  reaching the Breach. Deliberately deferred — the developer wants the core loop settled first.
- **A "cost of holding ground" idea, parked.** Raised in passing: maybe there's a penalty for
  squares that just sit there doing nothing, or a pull-back/redeploy action (withdraw a token now,
  it returns to hand next round). Not designed yet, just noted so it isn't lost.
- **AI tractability is an open question again, not a settled one.** The lane version's AI argument
  (a cheap linear evaluation function, unlike Hex) doesn't automatically transfer — a partial
  network's chance of eventually reaching the Breach is a similar class of problem to evaluating a
  partial Hex board, which is exactly the thing that made Hex need Monte Carlo rollouts in the
  first place. Worth being honest that this design may have re-imported that difficulty rather
  than avoided it. Not analyzed yet.
- **Campaign pacing (how this fits inside a multi-node campaign) hasn't been re-derived** for this
  mechanic. The two-tier idea from the lane draft (ordinary nodes decided by card score alone,
  only strongholds/goal escalate to a full board) is a plausible fit but hasn't been re-checked
  against this mechanic's actual round count.
- **Who opens The Clash each round** hasn't been decided.
- **Numbers used above are illustrative, not chosen:** starting cluster size, board size, base
  distance, the 7-move baseline Muster, the 2/3 overwrite cost, and the +1 reinforce cap are all
  the developer's to set once there's something playable to test them against.

---

## What this fixes, relative to the lane version

The lane's core failure was having only one front. This board has many possible routes between
the two bases, so "where do I commit this round's Muster" is a real decision with a real
trade-off — reinforcing here costs you tempo elsewhere, and overwriting requires you to have
already fought your way to adjacency, so combat is local and readable rather than a single scalar
race. It still keeps what actually worked in the lane draft: all randomness stays in the War
Council, the board itself resolves deterministically, and a War Council win pays off as a
tangible, structural advantage (the bonus-move endgame in The Clash) rather than just a bigger
number.
