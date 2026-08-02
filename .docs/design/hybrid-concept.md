# Untitled army-general game — concept sketch

**Status:** early concept. This records what has been decided and what is still open. Nothing here
is committed to code, and the open questions are genuinely open — don't treat a default in this
document as a settled rule.

Source rules for the two parent games:
[`../game_rules/fox-in-the-forest.md`](../game_rules/fox-in-the-forest.md) ·
[`../game_rules/hex.md`](../game_rules/hex.md)

---

## The idea

You play an army general. A map presents territories — click a square representing a city to fight
for it. Taking that city is a **single battle fought in two alternating phases over one persistent
Hex board**.

The card game is where you set your strategy and earn the right to act. Hex is the ground itself.

---

## The battle loop

A battle is not "one card round then one Hex game." It is a loop, and the Hex board carries over
untouched between iterations:

```
  ┌─────────────────────────────────────────┐
  │  1. CARD PHASE                          │
  │     Full Fox in the Forest round        │
  │     (13 tricks). Both sides score.      │
  │                 ↓                       │
  │  2. ALLOWANCE                           │
  │     Each side's score = the number of   │
  │     Hex moves they may make this        │
  │     segment. No points, no moves.       │
  │                 ↓                       │
  │  3. BATTLE PHASE                        │
  │     Place stones on the persistent Hex  │
  │     board, CPU / Player / CPU / Player, │
  │     until both allowances are spent.    │
  │                 ↓                       │
  │  4. Board connected?  ── yes ──▶ that   │
  │           │                     side    │
  │           no                    takes   │
  │           │                     the     │
  └───────────┘                     city    │
```

- **Player** connects **bottom → top**.
- **CPU** connects **left → right**.
- The board is never reset mid-battle. Stones placed in segment 1 are still there in segment 5.
- The battle ends only when someone connects. There is no draw — a full Hex board always contains
  exactly one winning chain.

---

## Why the move economy is sound

Every stone on the board was paid for with card points. Moves are not a bonus layered on top of a
normal Hex game — they are the *only* way to act, for both sides.

This means a lopsided card round is a feature, not a balance failure. A 6–0 ambush hands one side
six consecutive unopposed placements while the other can only watch; thematically that is exactly
what being ambushed should feel like, and in Hex terms a run of unanswered moves is genuinely
devastating because bridges and ladders both assume strict alternation.

---

## The scenario table

Tricks always sum to 13, so both sides' bands are locked together. Every possible split collapses
into just **two scenario types**:

| Trick split | Points → moves | Scenario | Move gap |
|---|---|---|---|
| 0–3 / 10–13 | 6 / 0 | **Ambush** — one side springs it, the other cannot respond at all | 6 |
| 4 / 9 | 1 / 6 | **Pitched battle** | 5 |
| 5 / 8 | 2 / 6 | **Pitched battle** | 4 |
| 6 / 7 | 3 / 6 | **Pitched battle** | 3 |

Seven distinct outcomes — four ambush intensities, three battle margins.

Note the inversion that gives the card phase its bite: taking *very few* tricks (0–3) is the
ambusher's result and scores maximum, while taking a *moderate* number (4–6) is the loser's result.
Fox's native "win tricks, but not too many" tension reads directly as "commit enough force to win
the engagement, but don't overextend."

---

## Pacing — the dominant open problem

Each card round yields 6 points to one side and 0–3 to the other, so a battle phase places roughly
**6–9 stones**. Against board size (stone counts are estimates, not measured):

| Board | Cells | Stones to resolve | Card rounds per city | Tricks per city |
|---|---|---|---|---|
| 11×11 | 121 | ~45–60 | 6–8 | 80–105 |
| 9×9 | 81 | ~30–40 | 4–6 | 55–80 |
| 7×7 | 49 | ~18–25 | 3–4 | 40–50 |

At Arcadia's 11×11 that is eighty-plus tricks of a full trick-taking game to take one city — well
over an hour per map square.

**Do not fix this by shortening the card round.** The 0–3 / 4–6 / 7–9 / 10–13 band table exists
only because a round is exactly 13 tricks, and that table is the heart of the concept. Shrink the
Hex board instead. **Recommend 7×7 for the prototype**; revisit once a battle has actually been
played end to end.

---

## Settled

- Map of territories; clicking a city starts a battle.
- A battle is the two-phase loop above, over one persistent Hex board.
- Card phase is a full 13-trick Fox in the Forest round.
- Card points are spent as Hex moves and are the only source of moves.
- Hex turn order within a segment is CPU first, then Player, alternating.
- Player runs bottom→top; CPU runs left→right.
- Winning the Hex board wins the city.
- Single-player against a CPU.

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
- **Surplus moves.** At 6–2, does the side with more take its four extra placements consecutively
  at the end of the segment, or are they distributed through it? A trailing burst is far more
  lethal in Hex than the same moves spread out. Materially different games.
- **Who opens each segment?** CPU first is settled for the first one. Whether that repeats every
  segment or alternates is not — repeating is a small permanent edge.
- **Win-check timing.** Assumed to fire after every single placement, so a segment can end
  mid-allowance with moves unspent. Confirm that unspent moves are simply lost.
- **Do the Treasure 7s feed the allowance?** Fox awards points mid-round from the three 7s on top
  of the end-of-round band, so a round could yield 0–9 rather than 0–6. Undecided whether those
  become extra moves, buy something else, or are dropped.
- **Placement zones.** An unused idea worth keeping: let the scenario decide *where* stones may go,
  not just how many. Ambush allows placement anywhere, including deep behind enemy lines; a won
  pitched battle restricts you to cells touching your own edge or adjacent to your existing stones.
  Points decide how many, scenario decides where.
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
- **Hex AI is the easy half.** Monte Carlo rollouts are unreasonably effective: because a filled
  board always contains exactly one winning chain, a random fill can be scored instantly with no
  evaluation function. The variable-allowance turn order is the only unusual part.
- **Fox AI is the hard half.** Hidden hands, 13 tricks of lookahead, odd-card abilities that mutate
  the trump suit mid-trick, and a scoring curve where winning too much loses. Start with a
  heuristic player before reaching for determinized search.
- **The CPU needs to play both games well *and* connect them** — it should be willing to throw a
  card round it cannot win cheaply, and its Fox play should be informed by how badly it needs moves
  on the current board. That link is where the game's difficulty will actually live.
- Two phases with different input models — card selection and board placement — means two distinct
  UI surfaces, plus a persistent board view that survives across card rounds.
