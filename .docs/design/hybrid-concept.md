# Untitled army-general game — concept sketch

**Status:** early concept. This records what has been decided and what is still open. Nothing here
is committed to code, and the open questions are genuinely open — don't treat a default in this
document as a settled rule.

**Board substrate update (2026-08-03):** The "one persistent Hex board" description below is
superseded by [`skirmish-board-replacement.md`](./skirmish-board-replacement.md) — **The
Vanguard**, a network-growth mechanic designed conversationally, not the lane-advance draft that
preceded it. Hex's structural problems are catalogued in
[`concept-critique.md`](./concept-critique.md) Problems 1–3. Everything else on this page (the
Fox in the Forest card layer — now called the **War Council**, see `CLAUDE.md` → "Game naming" —
and its underlying mechanics) still applies — only the board itself changes.

Source rules for the two parent games:
[`../game_rules/fox-in-the-forest.md`](../game_rules/fox-in-the-forest.md) ·
[`../game_rules/hex.md`](../game_rules/hex.md)

---

## The idea

You play an army general. A map presents territories — click a square representing a city to fight
for it. Taking a city is a battle fought as **the War Council** (a Fox in the Forest round) feeding
**The Vanguard** (see [`skirmish-board-replacement.md`](./skirmish-board-replacement.md)) — two
bases on a hex grid, each side growing a network of tokens outward until one connects base to
base. Whether every city gets the full Vanguard treatment or only some escalate to it (the old
two-tier split) hasn't been re-decided for this mechanic — see that document's "Open, not yet
decided" section.

The War Council is where you set your strategy and earn the right to act. The Vanguard is the
ground itself — see `skirmish-board-replacement.md` for what it is now.

---

## The battle loop

A battle is not "one card round then one board game." It is a loop, and the board carries over
untouched between iterations (see `skirmish-board-replacement.md` for what the board now is):

```
  ┌─────────────────────────────────────────┐
  │  1. WAR COUNCIL                         │
  │     Full Fox in the Forest round        │
  │     (13 tricks). Both sides score.      │
  │                 ↓                       │
  │  2. MUSTER                              │
  │     Baseline moves for both sides, plus │
  │     bonus moves for the Council winner. │
  │                 ↓                       │
  │  3. THE CLASH                           │
  │     Alternate one action (Expand /      │
  │     Overwrite / Reinforce) at a time;   │
  │     leftover bonus actions are spent    │
  │     consecutively once one side is out. │
  │                 ↓                       │
  │  4. The Breach reached? ──── yes ──────▶│
  │           │                    that side│
  │           no                     wins   │
  │           │                             │
  └───────────┘                             │
```

- The Vanguard is never reset between rounds. Tokens placed in round 1 persist through round 6.
- Win conditions (how a side takes the city) are specified in `skirmish-board-replacement.md`, not
  by the bottom-to-top / left-to-right Hex connection this section previously described.

---

## Why the move economy is sound

Every Vanguard action was paid for with War Council points. Moves are not a bonus layered on top of
the board game — they are the _only_ way to act, for both sides.

Historically, when the board was Hex, a 6–0 ambush handed one side six consecutive unopposed
placements while the other got none at all — genuinely devastating in Hex terms, since bridges and
ladders both assume strict alternation. Under the current design
(`skirmish-board-replacement.md`), that can no longer happen: both sides always get their baseline
Muster regardless of the War Council's result — the losing side is never reduced to zero moves.
A lopsided War Council is still a feature: the winning side gets bonus moves on top of the
baseline, but the losing side always has something to spend in The Clash, whether that's expanding
into open ground or reinforcing a token to blunt the follow-up.

---

## The scenario table

Tricks always sum to 13, so both sides' bands are locked together. Every possible split collapses
into just **two scenario types**:

| Trick split | Points → moves | Scenario                                                          | Move gap |
| ----------- | -------------- | ----------------------------------------------------------------- | -------- |
| 0–3 / 10–13 | 6 / 0          | **Ambush** — one side springs it, the other cannot respond at all | 6        |
| 4 / 9       | 1 / 6          | **Pitched battle**                                                | 5        |
| 5 / 8       | 2 / 6          | **Pitched battle**                                                | 4        |
| 6 / 7       | 3 / 6          | **Pitched battle**                                                | 3        |

Seven distinct outcomes — four ambush intensities, three battle margins.

Note the inversion that gives the card phase its bite: taking _very few_ tricks (0–3) is the
ambusher's result and scores maximum, while taking a _moderate_ number (4–6) is the loser's result.
Fox's native "win tricks, but not too many" tension reads directly as "commit enough force to win
the engagement, but don't overextend."

---

## Pacing — the dominant open problem

Historically, when the board was Hex, the only lever for pacing was board size — each card round
placed roughly 6–9 stones, and an 11×11 board took eighty-plus tricks of a full trick-taking game to
resolve one city. That board-sizing analysis is stale; it doesn't apply to the current design.

Pacing is genuinely **open again** under The Vanguard (`skirmish-board-replacement.md`) — it hasn't
been re-derived yet. The old two-tier split (ordinary cities decided by War Council score alone,
only strongholds/the goal escalate to a full Vanguard) is a plausible carry-over candidate, but it
was sized against the lane mechanic's round-cap arithmetic, not this one, and hasn't been
re-checked. Treat pacing as unmeasured until there's a playable loop to measure.

**Do not fix pacing by shortening the War Council.** The 0–3 / 4–6 / 7–9 / 10–13 band table exists
only because a round is exactly 13 tricks, and that table is the heart of the concept — this
principle still holds regardless of what fixes The Vanguard's pacing.

---

## Settled

- Map of territories; clicking a city starts a battle.
- The War Council is a full 13-trick Fox in the Forest round.
- War Council points determine bonus moves on top of a baseline Muster, per
  `skirmish-board-replacement.md` — both sides always get the baseline regardless of who wins.
- Reaching the Breach in The Vanguard wins the city; see `skirmish-board-replacement.md` for the
  current win condition (a solid base-to-base chain).
- Single-player against a CPU.

**Not yet settled, re-opened by The Vanguard:** whether every city gets the full Vanguard or only
some escalate to it (the old two-tier split); who opens The Clash each round.

---

## Open questions

- **The two 6-point routes are not equivalent here — watch this in playtest.** In stock Fox, 0–3
  and 7–9 both pay 6 and that is balanced, because the game is a cumulative race to 21. In this
  design points are moves in a zero-sum fight for one board, so denial counts as much as gain: the
  ambush route pays you 6 and gives your opponent **0**, while the 7–9 route pays you 6 and still
  hands them **1–3**. Aiming low is therefore the better outcome whenever it lands. It is not
  strictly dominant, because both sides cannot go low at once — if both duck, one ends at 10+ with
  nothing — so the card phase becomes a game of chicken. That may be the most interesting thing
  here, or it may mean the 7–9 branch is never played for. Do not pre-emptively rebalance; measure
  first, and only then consider paying 7–9 more, or giving 10–13 a floor above zero.
- **Surplus moves.** Settled for The Vanguard already: leftover moves are spent consecutively at
  the end of The Clash, uncontested (see `skirmish-board-replacement.md`).
- **Who opens The Clash each round?** CPU first is settled for the first one. Whether that repeats
  every round or alternates is not — repeating is a small permanent edge.
- **Win-check timing.** Assumed to fire after every single action, so a round can end with moves
  unspent. Confirm that unspent moves are simply lost.
- **Do the Treasure 7s feed the Muster?** Fox awards points mid-round from the three 7s on top
  of the end-of-round band, so a round could yield 0–9 rather than 0–6. Undecided whether those
  become extra moves, buy something else, or are dropped.
- **Placement zones.** Partly settled by The Vanguard already — Expand is restricted to within 2 of
  your existing network, Overwrite to adjacency only (see `skirmish-board-replacement.md`). Whether
  the War Council's scenario (ambush vs. pitched battle) should further loosen or tighten those
  zones is still open.
- **Does Fox's 21-point race survive?** Assumed gone — points are spent as moves each round, not
  accumulated toward a card-game victory.
- **The war above the battle.** How many cities, how they connect, and what winning the whole war
  means. Whether anything carries between cities.
- **Dealer alternation across a long battle.** Fox alternates dealer each round; over 4–8 rounds in
  one battle that stays even, but worth confirming it isn't reset per battle in a way that favours
  one side.

---

## Scope notes

- **Prototype on the base 33-card Fox deck only.** The special, goal, and poison modules triple the
  state space and the AI's difficulty for no early design learning. Add them once the loop is
  proven.
- **Board AI difficulty is an open question again.** The lane draft's argument (a cheap linear
  evaluation function, unlike Hex) doesn't automatically transfer to the network-growth board —
  evaluating a partial network's chance of reaching a solid base-to-base connection is close to the
  same class of problem that made Hex need Monte Carlo rollouts in the first place. See
  `skirmish-board-replacement.md`'s "Open, not yet decided" section.
- **The War Council AI is the hard half.** Hidden hands, 13 tricks of lookahead, odd-card abilities
  that mutate the trump suit mid-trick, and a scoring curve where winning too much loses. Start
  with a heuristic player before reaching for determinized search.
- **The CPU needs to play both games well _and_ connect them** — it should be willing to throw a
  War Council it cannot win cheaply, and its card play should be informed by how badly it needs
  Muster on the current Vanguard. That link is where the game's difficulty will actually live.
- Two phases with different input models — War Council card selection and Vanguard actions — means
  two distinct UI surfaces, plus a persistent Vanguard view that survives across War Council
  rounds.
