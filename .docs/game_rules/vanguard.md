# The Vanguard

An original design, not adapted from an external source — the board-layer half of a hybrid with
Fox in the Forest (**the War Council**), replacing Hex. Two players grow a network of tokens
outward from their own base across a shared hex-grid board.

Design rationale and open questions:
[`../design/skirmish-board-replacement.md`](../design/skirmish-board-replacement.md).

---

## Overview

Two players each grow a network of tokens outward from their own base, across a shared hex-grid
board, until one player's network forms an unbroken chain connecting their base to their
opponent's base. Unlike Hex, a token can be reclaimed from the opponent (Overwrite) and fortified
(Reinforce); unlike Hex, growth isn't "place anywhere" — a new token must extend outward from a
player's own existing network.

## Board

- A hex-grid rhombus, the same shape Hex uses.
- Two fixed **base cells**, one per player, in roughly opposite corners.
- Certain cells are permanent **defenses**: fixed per map, no player may ever place a token there.

## Setup

- Each base starts with a small pre-seeded cluster of that player's own connected tokens. Cluster
  size not yet finalized.

## Actions

Every action is paid for out of a player's move budget for the round (see "The Muster" below).

| Action        | Effect                                    | Legal when                                                                       | Cost                                                                     |
| ------------- | ----------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Expand**    | Place a token on an empty cell            | Within 2 hex-spaces of your existing connected network — a 1-cell gap is allowed | 1 move                                                                   |
| **Overwrite** | Replace an opponent's token with your own | Only on a cell adjacent (touching) to your existing network — no gap allowed     | 2 moves (3 if the target token is reinforced)                            |
| **Reinforce** | Add defense to a token you already hold   | Any of your own tokens                                                           | 1 move; a token holds at most **+1** defense — it does not stack further |

Expansion can leapfrog a 1-cell gap, so a player can scout ground quickly. Combat (Overwrite) is
adjacency-only, so it only happens where two networks actually meet.

## The Muster (move budget)

Each round, both players receive a baseline number of moves, plus bonus moves for whichever side
won that round's War Council. **Both sides always receive the baseline**, regardless of the War
Council's result — only the bonus depends on winning. Baseline count not yet finalized; used
illustratively as 7 moves in design discussion.

## The Clash (spending the Muster)

Players alternate spending one action at a time — Expand, Overwrite, or Reinforce — until one
side's move budget is exhausted. Whichever side has moves remaining at that point (typically the
round's War Council winner, from their bonus) spends the rest **consecutively and uncontested**.

Who opens The Clash each round is not yet decided.

## Winning (proposed name: "the Breach" — not yet confirmed)

A player wins when they hold an **unbroken chain of adjacent tokens** connecting their own base to
the opponent's base. The 1-cell gap allowed during Expand does **not** count toward this — the
winning chain must be solid, no gaps. A gap left unfilled can be claimed by the opponent (forcing a
detour) or reclaimed later by paying the Overwrite cost.

---

## Not yet finalized

- **No rule yet for a stalemate.** Unlike Hex, which connects opposite edges and is mathematically
  guaranteed never to draw, this game connects two specific base points — it's possible for the
  board to fill, or many rounds to pass, with neither side ever completing a connection. No
  fallback rule exists yet.
- **Numbers above are illustrative, not chosen:** board size, base distance, starting cluster
  size, the baseline move count, and the 2/3 overwrite cost and +1 reinforce cap.
- Whether every city in a campaign gets a full game of The Vanguard, or only some escalate to it.
- Whether there's any cost to holding ground, or a way to withdraw and redeploy a token later.
- The win-condition name itself ("the Breach") is proposed, not confirmed.

Full rationale for all of the above:
[`../design/skirmish-board-replacement.md`](../design/skirmish-board-replacement.md) → "Open, not
yet decided".
