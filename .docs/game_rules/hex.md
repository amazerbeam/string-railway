# Hex — The Connection Game

A two-player abstract connection game. Rules reference taken from the Arcadia Games free
implementation at <https://arcadiagames.io/free/hex?play=1> (single-player, human vs. AI).

---

## Overview

Two players alternately place stones on a hexagonal grid, each trying to build an unbroken chain
of their own colour linking their two opposite edges of the board. Stones are permanent: they
**never move and are never captured**.

Invented independently twice — by **Piet Hein in 1942** and **John Nash in 1948**.

---

## Board

- An **11×11 rhombus of hexagonal cells** (121 cells total, as rendered by the Arcadia board).
- The four sides of the rhombus are the players' targets: **two red edges** (left and right) and
  **two blue edges** (top and bottom).
- Each cell has up to six neighbours — the two horizontal neighbours and four diagonal ones. Cells
  are adjacent if they share a hex side.

---

## Setup

- The board starts **empty**.
- In the Arcadia implementation: the **human plays red**, the **AI plays blue**. Red moves first
  ("Your move. Red connects left to right.").

---

## Objective

| Player        | Connects                   |
| ------------- | -------------------------- |
| **Red** (you) | **Left edge → right edge** |
| **Blue** (AI) | **Top edge → bottom edge** |

Win by forming an **unbroken chain of your own stones** joining your two designated sides. A
chain is unbroken when every consecutive pair of stones in it occupies adjacent cells.

---

## Turn structure

1. Players **alternate turns**.
2. On your turn, **place one stone of your colour on any empty cell**.
3. Placed stones are permanent — never moved, never captured, never removed.
4. Play continues until one player's chain connects their two edges. That player **immediately
   wins**.

There is no passing and no capture mechanic; the only action in the game is placing a stone.

---

## Why Hex never draws

**A full Hex board always contains exactly one winning chain.** It is mathematically impossible
to fill the board without one player having connected their sides, so **draws cannot occur**. The
game is described as "easy to learn and impossible to exhaust."

---

## Strategy notes (from the in-game tips)

- **The centre is the most valuable territory — contest it early.**
- **Diagonal "bridge" pairs of stones are almost as strong as solid connections.** A bridge is two
  stones a knight's-step apart with two mutually-adjacent empty cells between them; if the
  opponent takes one of those cells, you take the other, so the link cannot be severed.
- **Every move is dual-purpose:** it advances your own chain _and_ blocks your opponent's. Because
  the two goals are perpendicular, any stone that helps you necessarily obstructs them.

---

## Interface (Arcadia implementation)

- **New game** — resets the board.
- **Undo** — takes back a move.
- Running **Wins / Losses / Games** counters are tracked across sessions.
- Edge markers on the board are colour-coded to each player's target sides.

---

## Notes for implementation

These are properties of the Arcadia version specifically, worth flagging if you're building
against this as a reference:

- **No swap (pie) rule.** Standard competitive Hex usually offers the second player the option to
  swap colours after the first move, because Hex is a proven first-player win with perfect play.
  The Arcadia page makes no mention of a swap rule, and the interface offers no swap action — red
  simply moves first every game.
- **Board size is fixed at 11×11** here; the page exposes no size selector. Hex is playable on any
  n×n rhombus, and 11×11, 13×13, and 19×19 are all common elsewhere.
- **No draw handling is needed.** The no-draw property is a theorem, not a rule to enforce — a
  correct win-detection pass over a filled board will always find exactly one winner.

---

_Source: <https://arcadiagames.io/free/hex?play=1> ("HOW TO PLAY" panel), © 2026 Arcadia. Board
dimensions verified from the rendered board markup._
