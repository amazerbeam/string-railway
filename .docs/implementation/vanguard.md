# Vanguard — `src/vanguard/`

**Status:** partial
**Built by:** SCRUM-19, SCRUM-21, SCRUM-22, SCRUM-23, SCRUM-24, SCRUM-27, SCRUM-40, SCRUM-42

## Responsibility

Owns the hex-board network-growth layer of the hybrid (the mechanic that replaces Hex), including
everything the root `CLAUDE.md` → _Game naming_ places "within a round of the Vanguard": **Muster**
(the move budget), **The Clash** (the action exchange), and **The Breach** (a solid base-to-base
connection — the win condition). Per `plan.md`'s Assumptions, these three concepts are deliberately
_not_ split into separate folders (`src/muster/`, `src/clash/`) — they all belong here, inside
`src/vanguard/`, once implemented. Design rationale for the mechanic itself lives in
`.docs/game_rules/vanguard.md` — this file documents only what is actually built. (The fuller
design-rationale document was retired with the old direction on DLR-45.)

As of SCRUM-21, this module is the **board engine**: hex-grid coordinate math, board construction,
a connected-network query, and the three Clash actions (Expand, Overwrite, Reinforce) with their
legality and cost rules. As of SCRUM-22, it also converts a finished War Council round's score into
that round's Muster (the move budget both sides start The Clash with). As of SCRUM-23, it also
detects the Breach itself — whether a side's network reaches all the way to the opponent's base. As
of SCRUM-24, it also spends a round's Muster: a turn-engine reducer that processes one submitted
action at a time, enforcing whose turn it is, delegating legality/cost to `applyVanguardAction`,
checking the Breach after every action, and alternating turns until one side is exhausted (then
letting the other spend the rest uncontested) — plus a pure function for which side opens a given
round. As of SCRUM-27, it also chooses a Clash action *for* either side via a pure heuristic
(`chooseCpuClashAction`) — the module's first mover-selection logic, side-generic rather than
CPU-only despite the name, matching `src/warCouncil/cpuPlayer.ts`'s precedent. It is pure, headless
logic — nothing here acts on a detected Breach beyond ending the in-memory exchange (ending the
battle at the `BattleState` level, declaring a winner there, or surfacing anything in UI), handles a
stalemate where a side has Muster left but no legal/affordable action (the heuristic throws on that
dead end rather than resolving it — see How it works), or accepts input from an actual human via UI
(no UI exists anywhere in this repository). Acting on a Breach remains a future Clash-orchestrator
ticket's job (see Deferred) — though `src/battle/`'s `submitClashAction` already covers the
battle-level half of that, see `battle.md`.

## Key types & exports

| Export                                                                              | Purpose                                                                          | File                     |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------ |
| `VanguardState` (alias of `VanguardBoard`)                                          | The engine's real state shape — replaces SCRUM-19's `unknown` placeholder        | `types.ts` via `index.ts`|
| `HexCoord { q, r }`                                                                  | Axial hex coordinate                                                             | `types.ts`                |
| `CellKey`                                                                           | `"q,r"` string key into the sparse cell map                                      | `types.ts`                |
| `VanguardCellKind` (`Token` \| `Defense`), `TokenCell`, `DefenseCell`, `VanguardCell`| A board cell: an owned token (with a reinforcement level) or a permanent defense cell | `types.ts`            |
| `VanguardBoard { size, bases, cells }`                                              | The whole board — sparse cell map, `bases: Record<PlayerSide, HexCoord>`         | `types.ts`                |
| `VanguardActionKind` (`Expand` \| `Overwrite` \| `Reinforce`), `VanguardAction`      | The three action kinds and their discriminated-union shape                       | `types.ts`                |
| `IllegalActionReason`                                                               | 8 named rejection reasons (`cellOutOfBounds`, `cellIsDefense`, `cellOccupied`, `outOfExpandRange`, `targetNotEnemyToken`, `notAdjacentToNetwork`, `targetNotOwnToken`, `reinforcementCapReached`) | `types.ts` |
| `VanguardActionResult`                                                              | `{ ok: true, board, cost }` or `{ ok: false, reason }` — every action's return shape | `types.ts`             |
| `cellKey`, `isWithinBoard`, `hexNeighbors`, `hexDistance`, `allBoardCoords`, `hexBfs`| Axial coordinate math and a generic reusable BFS                                 | `hexGrid.ts`               |
| `BOARD_SIZE`, `DEFENSE_CELLS`                                                       | Configuration — placeholder values, developer retunes after first playtest       | `config.ts`                |
| `EXPAND_RANGE`, `EXPAND_COST`, `OVERWRITE_COST`, `OVERWRITE_COST_REINFORCED`, `REINFORCE_COST`, `REINFORCE_MAX_STACK` | Fixed rule constants from the ticket's acceptance criteria       | `config.ts`                |
| `connectedNetwork`, `minDistanceToNetwork`                                          | A side's connected token network (BFS from base) and distance-to-network query   | `network.ts`               |
| `ownedCells`                                                                        | Every cell a side owns, chain-connected or not — SCRUM-40's reference set for Expand/Overwrite legality | `network.ts` |
| `createVanguardBoard`                                                               | Builds a fresh board: bases, starting clusters, defense cells                    | `createBoard.ts`           |
| `applyExpand`, `applyOverwrite`, `applyReinforce`                                   | Legality + cost + immutable board update for each Clash action                   | `expand.ts`, `overwrite.ts`, `reinforce.ts` |
| `applyVanguardAction`                                                               | Single reducer-shaped dispatch entry, routes by `action.kind`                    | `applyVanguardAction.ts`   |
| `Muster`                                                                             | `Readonly<Record<PlayerSide, number>>` — each side's move budget for the round   | `types.ts`                 |
| `MUSTER_BASELINE`, `MUSTER_BONUS`                                                    | Configuration — baseline Muster for both sides, bonus added for the round's winner only | `config.ts`          |
| `convertScoreToMuster`                                                               | Pure War-Council-score-band → `Muster` conversion                                | `musterConversion.ts`      |
| `hasReachedBreach`                                                                   | Read-only query: has `side` built a gap-free chain from its base to the opponent's base | `breach.ts`           |
| `ClashStatus` (`InProgress` \| `Breached` \| `Complete`), `ClashState`               | Discriminated union on `status`: an in-progress exchange (`board`, `muster`, `turn`), a Breached one (`board`, `muster`, `winner`, no `turn`), or a naturally Complete one (`board`, `muster` only — no field to hold a banked value) | `types.ts` |
| `ClashRejectionReason` (`NotYourTurn` \| `InsufficientMuster` \| `ClashAlreadyResolved`), `ClashActionResult` | Turn-engine-specific rejection reasons; `ClashActionResult` is `{ ok: true, state }` or `{ ok: false, reason }` where `reason` is `IllegalActionReason \| ClashRejectionReason` | `types.ts` |
| `CLASH_FIRST_ROUND_OPENER`                                                          | Configuration — which side opens round 1 (`PlayerSide.Cpu`), transcribed from the ticket's own AC, not a placeholder | `config.ts` |
| `startClash`, `applyClashAction`                                                     | The turn-engine reducer: builds the initial `ClashState`, then processes one submitted action at a time | `clash.ts` |
| `openingSideForRound`                                                               | Pure function: which side opens a given 1-indexed round number, alternating off `CLASH_FIRST_ROUND_OPENER` | `clashOpener.ts` |
| `chooseCpuClashAction`                                                              | Pure, side-generic heuristic: picks a legal `VanguardAction` for `side`, dry-run-validated via `applyVanguardAction` before being returned | `cpuPlayer.ts` |
| `overwriteCostFor`                                                                  | The Overwrite Muster cost for a given `reinforced` stack level — single source of truth shared between `applyOverwrite` and the CPU heuristic | `overwrite.ts` |

## How it works

### Coordinates and the shared BFS

`HexCoord { q, r }` uses axial coordinates. `hexGrid.ts` provides `cellKey` (formats a coordinate as
`"q,r"` for use as a map key), `isWithinBoard` (`0 <= q,r < size`), `hexNeighbors` (the fixed
six-direction neighbour list, unfiltered by bounds), and `hexDistance` (the standard axial-distance
formula, `(|dq| + |dq+dr| + |dr|) / 2`).

`hexBfs(start, size, canEnter)` is the one traversal primitive both board construction and the
network query build on. It gates `start` itself through `canEnter` (not just its neighbours) — so a
BFS that starts on a cell the predicate rejects returns `[]` with no special-cased caller logic.
Every prefix of its returned visiting order is itself connected back to `start`, which
`createVanguardBoard` relies on when it slices the result to a target cluster size.

### The board is a sparse cell map

`VanguardBoard.cells` is `Record<CellKey, VanguardCell | undefined>` — only non-empty cells (a
token or a permanent defense marker) are stored; any in-bounds coordinate absent from the map is
empty by construction. The `| undefined` is explicit in the type because this project's
`tsconfig.json` does not set `noUncheckedIndexedAccess` — without the explicit union, an unguarded
`.kind` read on a genuinely empty cell would compile cleanly and crash at runtime (see the comment
on `VanguardBoard.cells` in `types.ts`).

### Board construction

`createVanguardBoard()` in `createBoard.ts` (SCRUM-42) places both bases at the horizontal center of
their own home row — `centerColumn = Math.floor(BOARD_SIZE / 2)`, giving the Player `{centerColumn,
0}` and the Cpu `{centerColumn, BOARD_SIZE - 1}` — replacing the original opposite-corners placement
(`{0,0}` / `{BOARD_SIZE-1,BOARD_SIZE-1}`). Every `DEFENSE_CELLS` coordinate is marked a `DefenseCell`
first, then for each side the starting cluster is built as `[base, ...hexNeighbors(base)]` filtered
to in-bounds and not-yet-occupied — no traversal, since "the base plus everything touching it" is a
one-hop neighbour lookup, not a search. This replaces the original `hexBfs`-grown, `STARTING_CLUSTER_SIZE`-capped
cluster (now-removed configuration key, see Deferred); the cluster's size is a derived fact of hex
geometry and the base's own position — at a center-of-edge base that's 4 neighbours, 5 cells total —
never a chosen number. The occupied-cell filter mirrors the guard the removed `hexBfs`'s own
`canEnter` predicate provided, so a cluster still can never overlap a defense cell or the other
side's cluster.

### Connected network

`connectedNetwork(board, side)` in `network.ts` runs `hexBfs` from `board.bases[side]`, with
`canEnter = "this cell currently holds a TokenCell owned by side"`. It is recomputed fresh on every
call (no incremental/cached network state) — this is a discrete, turn-based action, not a hot path,
so recompute-from-scratch is the simplest correct design per the performance order in
`references/engineering-standards.md`. If the side no longer owns its own base cell,
`connectedNetwork` returns `[]` (the BFS start itself fails `canEnter`) — this is the module's
degenerate-case contract for a lost base; it is deliberately *not* a Breach/loss-condition decision
(that's out of scope for this ticket). `minDistanceToNetwork(target, network)` returns `Infinity`
for an empty network, otherwise the minimum `hexDistance` from `target` to any network cell.

### Every owned cell, not just the connected chain

`ownedCells(board, side)`, also in `network.ts` (SCRUM-40), is a deliberately separate, broader
query sitting beside `connectedNetwork`: a flat `allBoardCoords(board.size)` filter to cells `side`
owns, with no BFS and no dependency on the base cell at all — the same filter idiom
`chooseCpuClashAction`'s own candidate generation already used, so it introduces no new traversal
primitive. This is Expand and Overwrite's reference set as of SCRUM-40: a target is legal within
range of *any* cell the side currently owns, chain-connected to the base or not, so a scouted gap
cell actually extends both actions' reach. `connectedNetwork` remains the Breach's own, narrower
reference set — `breach.ts` is unchanged by SCRUM-40, so a gapped owned island that newly extends
Expand/Overwrite's reach still does not count toward a Breach until something fills the gap.

### The three Clash actions

Each of `applyExpand`, `applyOverwrite`, `applyReinforce` follows the same shape: bounds check →
cell-state check → (Expand/Overwrite only) an `ownedCells` + distance check against the action's own
threshold → on success, an immutable spread-based board update plus the action's cost; on any
rejection, a named `IllegalActionReason` and the input board is returned untouched (never mutated,
never thrown). As of SCRUM-40, Expand and Overwrite key their distance/adjacency check off
`ownedCells` (every cell the side owns), not `connectedNetwork` (the base-connected chain alone) —
only the reference set changed, each action's own range is untouched.

- **`applyExpand`** (`expand.ts`) — legal onto an empty, non-defense cell within `EXPAND_RANGE` (2)
  hex-spaces of any cell the acting side owns — a 1-cell gap is legal, exactly 3 away is not.
  Rejects `CellOutOfBounds`, `CellIsDefense`, `CellOccupied`, or `OutOfExpandRange`. On success,
  costs `EXPAND_COST` and places a fresh `TokenCell{ owner: side, reinforced: 0 }`.
- **`applyOverwrite`** (`overwrite.ts`) — legal only against an enemy `TokenCell` at hex-distance
  ≤ 1 from any cell the acting side owns (no gap allowed — a distance-2 target is
  `NotAdjacentToNetwork`). Rejects `CellOutOfBounds` or `TargetNotEnemyToken` (empty, defense, or
  the acting side's own token). Cost is `OVERWRITE_COST` (2) normally, `OVERWRITE_COST_REINFORCED`
  (3) if the captured token's `reinforced > 0`. Capturing always resets the new owner's cell to
  `reinforced: 0` — the plan's documented (developer-flagged, not yet confirmed) reading that
  fortification does not carry over to the capturing side.
- **`applyReinforce`** (`reinforce.ts`) — legal only on a `TokenCell` the acting side already owns,
  below the `REINFORCE_MAX_STACK` (1) cap. Rejects `CellOutOfBounds`, `TargetNotOwnToken` (empty,
  defense, or enemy-owned), or `ReinforcementCapReached`. On success, costs `REINFORCE_COST` and
  increments `reinforced` by 1. No network/adjacency check — the acceptance criteria place no range
  requirement on Reinforce.

`reinforced` is modeled as a numeric stack level (capped by the named `REINFORCE_MAX_STACK`
constant) rather than a boolean — a developer-flagged judgement call, made so the cap is a
retunable constant rather than baked into the type shape. See Deferred/developer decisions.

### Dispatch

`applyVanguardAction(board, side, action)` in `applyVanguardAction.ts` is a pure `switch` on
`action.kind` that routes to the matching `apply*` function with `action.target`. It contains no
legality logic of its own — every rejection reason originates in one of the three action modules.
It takes `side` as an explicit parameter on every call, exactly as `dealRound` takes `dealer` as a
parameter in `src/warCouncil/` — there is no "whose turn is it" check anywhere in this module (see
Deferred).

### Muster conversion

`convertScoreToMuster(score)` in `musterConversion.ts` turns a finished War Council round's score
(the same `Record<PlayerSide, number>` `scoreRound` in `src/warCouncil/` produces) into that round's
`Muster`. Both sides always receive `MUSTER_BASELINE` unconditionally; the function then adds
`MUSTER_BONUS` on top for whichever side's score is strictly higher. This makes the floor structural
rather than a runtime clamp — there is no code path in which a side's Muster can compute to less
than `MUSTER_BASELINE`, since the baseline term is never subtracted from or conditioned, only added
to. This is the concrete fix for the old Hex board's zero-Muster ambush problem
(named "Problem 1" in a design critique retired on DLR-45): the losing side always keeps its full baseline move
budget, it just doesn't get the bonus.

Winner detection is a plain three-way comparison of the two supplied numbers (`>` / `<` / neither)
— the function does not call into `src/warCouncil/` to determine a winner, it only consumes the
score `scoreRound` already produced. A tied score is handled by giving neither side the bonus; this
branch is unreachable through `scoreRound`'s actual output today (verified by exhaustive check
across all fourteen possible trick splits during planning — tricks always split to 13 and no split
yields equal points on both sides), but exists so the function is total over its declared parameter
type rather than throwing or guessing on an input a future caller could technically construct.

### The Breach

`hasReachedBreach(board, side)` in `breach.ts` answers the win-condition question: has `side` built
an unbroken, gap-free chain of its own tokens from its own base to the opponent's base? It computes
`otherSide(side)` (imported from `../warCouncil`), looks up that side's base coordinate via
`board.bases[otherSide(side)]`, and checks whether that coordinate's `cellKey` is a member of
`connectedNetwork(board, side)`. It is deliberately *not* a second BFS or flood-fill — `hexBfs` (via
`connectedNetwork`) only ever steps to a coordinate's physical `hexNeighbors`, never Expand's
2-range leapfrog, so a chain with the Expand-style 1-cell gap that is legal for scouting is
structurally excluded from the Breach, by construction rather than by a second implementation
independently re-deriving the same property. If the checked side no longer owns its own base cell,
`connectedNetwork` already returns `[]` for that degenerate case, and `hasReachedBreach` inherits
"no Breach" for free, with no special-cased branch. The function decides nothing beyond the
boolean — it does not end the battle, declare a winner, or touch any UI/HUD surface (see Deferred).

### The Clash turn engine

`startClash(board, muster, openingSide)` in `clash.ts` is a one-line constructor: it builds the
initial `ClashState` (`status: InProgress`, the given `board`, `muster`, and `turn: openingSide`) so
nothing outside this module has to know `ClashState`'s exact field names to build the first one.

`applyClashAction(state, side, action)` is the actual turn engine — a reducer that processes one
submitted `VanguardAction` at a time against the current `ClashState`, in a fixed check order:

1. **Already resolved?** If `state.status !== InProgress`, reject `ClashAlreadyResolved` — no
   further checks run. This is a defensive rejection for a caller that keeps calling after
   `Breached`/`Complete`, not required by any acceptance criterion.
2. **Whose turn?** If `side !== state.turn`, reject `NotYourTurn`.
3. **Legal on the board?** Delegate to `applyVanguardAction(state.board, side, action)` — any
   rejection bubbles through unchanged as the existing `IllegalActionReason`. The turn engine adds
   no board-legality logic of its own.
4. **Affordable?** If `state.muster[side]` is non-finite (`Number.isFinite` check, added after
   review to close a silent-`NaN`-propagation gap — a malformed Muster value would otherwise
   compare as "affordable" against any cost) or the action's reported `cost` exceeds
   `state.muster[side]`, reject `InsufficientMuster` — the board is not touched, since the pure
   `applyVanguardAction` call already ran without side effects and its result is simply discarded.
5. **Commit.** Decrement `muster[side]` by `cost`, replace `board` with the result's board — a
   fresh object via spread, matching every `apply*` function's never-mutate contract.
6. **Breach check.** Call `hasReachedBreach(newBoard, side)` unconditionally after every accepted
   action (not just some) — only the mover's own connectivity can have changed, since every action
   either extends or reinforces the mover's own network or converts an enemy cell to the mover's
   own token; it can never increase the *opponent's* connectivity. If true, the new state is
   `{ status: Breached, winner: side, board, muster }` and no further turn computation happens — the
   exchange ends immediately, mid-exchange, with whatever moves either side had left simply
   unspent.
7. **Next turn / natural end.** With no Breach: if both sides still have `muster > 0`, alternate
   (`turn = otherSide(side)`) — strict alternation. If exactly one side still has `muster > 0`, that
   side keeps `turn` locked to itself (uncontested leftover spend) — whether that's the mover
   continuing because the opponent just ran out, or the opponent taking over because the mover just
   ran out. If both sides are now at `0`, the state becomes `{ status: Complete, board, muster }`
   with no `turn` field at all — the `Complete` variant of `ClashState` structurally has no field to
   hold a banked value, so "unspent moves are lost, not banked" is a compile-time guarantee, not a
   runtime convention.

"Exhausted" means a side's remaining Muster reaches exactly `0` — not "no legal or affordable action
remains." A side with Muster left that submits an action it can't afford or that's illegal on the
board gets that single action rejected; the exchange does not advance the turn and does not treat
that side as exhausted. A caller that keeps resubmitting the same unaffordable/illegal action has no
built-in escape from this reducer — that's the caller's problem, not this module's (see Deferred).

`openingSideForRound(roundNumber)` in `clashOpener.ts` is a standalone, trivial pure function, kept
separate from the turn-engine reducer because it answers a different question — "who starts round
N" is a per-round scheduling decision with no dependency on a board, a Muster balance, or an
in-progress exchange. Odd rounds return `CLASH_FIRST_ROUND_OPENER`; even rounds return
`otherSide(CLASH_FIRST_ROUND_OPENER)`. It takes an explicit `roundNumber` parameter (1-indexed)
rather than reading a round counter from anywhere, because `BattleState` has no round field yet —
supplying and tracking `roundNumber` is left to whatever future orchestrator ticket adds that field.

### The Clash CPU heuristic

`chooseCpuClashAction(board, side, musterAvailable)` in `cpuPlayer.ts` (SCRUM-27) picks one legal
`VanguardAction` for `side` to spend Muster on. Despite the name, it is side-generic — it takes
`side` as an explicit parameter like `chooseCpuCard` does in `src/warCouncil/`, so it can drive
either side's turn, not just the CPU's; `src/battle/playCpuClashTurn.ts` is what pins it to
`PlayerSide.Cpu` specifically (see `battle.md`).

Because Vanguard has no single `legalMoves()`-style enumerator (each `apply*` function only reports
legality as a side effect of attempting the action), the heuristic composes two passes instead of
filtering one:

1. **Candidate generation**, built from the engine's own exported building blocks
   (`ownedCells`, `minDistanceToNetwork`, `hexDistance`, `overwriteCostFor`, and the config
   constants) rather than a re-derived legality predicate. As of SCRUM-40, every candidate function
   below ranges from `ownedCells` (every cell `side` owns), not `connectedNetwork` (the
   base-connected chain alone) — the identical reference-set broadening `applyExpand`/`applyOverwrite`
   made, so the CPU's own heuristic never generates a candidate the engine it dry-run-validates
   against would reject for a reason the heuristic didn't model:
   - `expandCandidates` — empty cells within `EXPAND_RANGE` of any cell `side` owns.
   - `overwriteCandidates` — enemy-token cells at distance ≤ 1 from any cell `side` owns, priced via
     `overwriteCostFor(cell.reinforced)` and filtered to what `musterAvailable` can afford.
   - `reinforceCandidates` — `side`'s own unreinforced tokens, short-circuited to `[]` up front if
     `REINFORCE_COST > musterAvailable` (a flat, non-tiered cost, unlike Overwrite's).
2. **Ranking**, via `candidateTier` + `rankedAdvanceCandidates`: Expand and Overwrite candidates are
   combined and sorted by a two-tier rule — distance-1-from-any-owned-cell (tier 1: every Overwrite
   candidate qualifies by construction, since Overwrite itself requires adjacency; an Expand target
   may or may not) beats a distance-2 Expand gap-jump (tier 2) unconditionally, then within a tier,
   ascending `hexDistance` to the opponent's base wins, with `cellKey` as a final deterministic
   tie-break. Note that as of SCRUM-40, "tier 1" no longer implies the candidate is reachable only
   through the base-connected chain — a gapped, disconnected owned island can also produce a
   distance-1 tier-1 candidate; the tier name describes adjacency-to-*an*-owned-cell, not
   contiguity-with-the-base. This tiering is load-bearing, not decorative: a flat distance-only
   ranking would instead favor an Expand gap-jump past an adjacent blocking enemy token every time (since
   `EXPAND_RANGE` (2) always reaches one hex closer to a distant base than overwriting an adjacent
   blocker does), which would never reproduce "prefer Overwrite when it's blocking the shortest
   path" — grounded in the design rule that a Breach-qualifying connection
   must be gap-free, so an unfilled gap is worth less than clearing a blocker even when it lands
   nominally closer.
3. **Dry-run validation** (`firstValidated`): walks the ranked list, calling
   `applyVanguardAction(board, side, candidate).ok` on each, returning the first one confirmed
   legal. This is the structural guarantee behind "never returns an illegal action" — the function
   never trusts candidate generation alone, so even a latent drift between a candidate filter and
   the real engine rule it's modeling would surface as "skip to the next candidate," not as a
   returned illegal action.

If no Expand/Overwrite candidate validates, the same dry-run-validate pattern falls back over
`reinforceCandidates` (sorted by `cellKey`). If nothing validates at all — an unmodeled dead end
where `side` still has Muster but no legal Expand, Overwrite, or Reinforce exists (e.g. a boxed-in
frontier with no reachable empty cell, no unreinforced own token, and only over-budget enemy
targets) — the function throws a plain `Error`. This is reachable well before the board is anywhere
near saturated; it is not gated on board fullness. It mirrors the existing, accepted
`scriptedClashAction`/`scriptedLocalAction` precedent in `src/battle/__tests__/battleTestHelpers.ts`
for the identical unmodeled situation, and is a documented, deliberate non-handling — not a bug —
pending the stalemate-handling ticket noted in Deferred below.

## Rules & invariants enforced

- **Pure-core boundary** (SCRUM-19, re-confirmed by SCRUM-21's Final verification grep):
  `eslint.config.js` scopes a `no-restricted-imports` / `no-restricted-globals` block to
  `src/warCouncil/**/*.{ts,tsx}` and `src/vanguard/**/*.{ts,tsx}`. This module may not import
  `react`/`react-dom` and may not reference DOM/network globals (`window`, `document`, `fetch`,
  `localStorage`, `requestAnimationFrame`, etc.). Enforced by ESLint (`npm run lint`), not just by
  convention.
- **No tunable is hard-coded outside `config.ts`** — every one of `BOARD_SIZE`,
  `DEFENSE_CELLS`, `EXPAND_RANGE`, `EXPAND_COST`, `OVERWRITE_COST`,
  `OVERWRITE_COST_REINFORCED`, `REINFORCE_COST`, `REINFORCE_MAX_STACK`, `MUSTER_BASELINE`,
  `MUSTER_BONUS` is assigned exactly once, in `config.ts`; every other file only imports it.
  Verified by a grep audit in Final verification (SCRUM-19, SCRUM-21, SCRUM-22, SCRUM-42).
  `STARTING_CLUSTER_SIZE` was deleted outright by SCRUM-42, not retyped or deprecated — the
  starting cluster size is now a derived fact of hex geometry and the base's own position, not a
  configured number; a repo-wide grep for the name at SCRUM-42's Final verification returned zero
  hits outside archived contract records.
- **No board mutation** — every `apply*` function returns a full replacement `VanguardBoard` via an
  immutable spread; the input board is never written to. Covered by an explicit "never mutates the
  input board" test on `applyExpand`.
- **`PlayerSide` is imported from `../warCouncil`, not redefined** — a deliberate cross-import
  between the two pure-core trees (permitted; the ESLint boundary restricts React/DOM imports, not
  cross-imports between `src/warCouncil/` and `src/vanguard/`), keeping the two-side identity a
  single source of truth per `CLAUDE.md`'s single-source-of-truth rule.
- **`VanguardState` is now `VanguardBoard`, not `unknown`** — `src/battle/battleState.ts`'s
  `readonly vanguard: VanguardState` field required no edit; it references the type by name only
  and was confirmed still compiling by a whole-project `npm run typecheck` run.

## Deferred / not yet implemented

- **Acting on a detected Breach beyond ending the in-memory exchange** — `applyClashAction`
  (SCRUM-24) transitions `ClashState` to `Breached` with a `winner`, but nothing ends the battle at
  the `BattleState` level, declares a winner there, or surfaces a Breach in any UI/HUD. A future
  Clash-orchestrator ticket owns that.
- **UI action selection** — nothing here accepts input from an actual human; no UI exists anywhere
  in this repository. `chooseCpuClashAction` (SCRUM-27) covers move selection for either side
  programmatically, but that's heuristic play, not a human choosing via UI.
- **Any lookahead, multi-step search, or Breach-probability evaluation in the CPU heuristic** —
  `chooseCpuClashAction` ranks by immediate resulting distance to the opponent's base only; it does
  not evaluate whether a candidate keeps every *future* cell reachable without eventually leaving a
  gap. Explicitly out of scope per SCRUM-27's brief (flagged as a possibly Monte-Carlo-class future
  problem).
- **Stalemate / no-legal-or-affordable-action handling** — a side with Muster left but no action it
  can currently afford or legally play is not detected or resolved by `applyClashAction`; it only
  defines what happens when a *submitted* action is rejected (the caller tries again). A caller that
  keeps submitting the same unaffordable/illegal action has no built-in escape — that's a future
  ticket's concern, not this reducer's. `chooseCpuClashAction` (SCRUM-27) hits the identical
  unmodeled dead end from the selection side and throws rather than resolving it — the two gaps are
  the same open question seen from opposite ends of the module, still unresolved by either.
- **Wiring `ClashState` into `BattleState` or any orchestrator** — `src/battle/battleState.ts` is
  untouched by SCRUM-24; no `round` counter, no `activeSide`, no `winner` field lives there yet. A
  future orchestrator ticket owns supplying `roundNumber` to `openingSideForRound` and reading
  `ClashState.status === Breached` to end a battle.
- **Treasure 7s feeding the Muster** — named an open question in the hybrid concept document retired on DLR-45;
  `convertScoreToMuster` implements the end-of-round score band only, not resolved by SCRUM-22.
- **Any multi-round or `BattleState`-level orchestration** — this module's surface is a single,
  already-constructed board, the three actions applicable to it, and one in-memory exchange over a
  supplied Muster budget.
- **Persisting or serialising `VanguardBoard` or `ClashState`** — nothing here writes to storage;
  `ClashState` is transient, in-memory only, constructed fresh by `startClash`.
- **Any stalemate/tiebreak rule** — explicitly out of scope for the whole epic.
- **Rendering, components, or hooks** — nothing under `src/vanguard/` touches React; nothing in the
  app currently renders a `VanguardBoard`.
- **Developer decisions still outstanding** (implemented per the plan's provisional reading, not
  yet confirmed): `BOARD_SIZE = 11` and `DEFENSE_CELLS`'s 5-cell layout in `config.ts` are
  placeholders to retune after first playtest (`STARTING_CLUSTER_SIZE` is no longer one of these —
  SCRUM-42 removed it as dead configuration; the starting cluster's size is now derived from hex
  geometry and the base's position, not a chosen number). `DEFENSE_CELLS` repositioning relative to
  the new row-center base placement is explicitly a separate, later play-feel decision, not decided
  by SCRUM-42. Reinforcement-as-numeric-stack (vs. a simpler boolean) and Overwrite resetting
  captured fortification to 0 (vs. inheriting
  it) are both judgement calls flagged for sign-off in `plan.md`'s Risks section. `MUSTER_BASELINE
  = 7` (SCRUM-22, transcribed from an illustrative figure in the design document retired on DLR-45) and
  `MUSTER_BONUS = 3` (SCRUM-22, an invented placeholder with no design-document figure — the
  least-grounded number in the module) both await first-playtest retuning; whether the bonus should
  scale with score margin instead of staying flat, and whether a tied score band should really
  grant neither side the bonus, are both flagged for developer sign-off in SCRUM-22's `plan.md`.
  `CLASH_FIRST_ROUND_OPENER = PlayerSide.Cpu` (SCRUM-24) is **not** an unconfirmed placeholder like
  the values above — it is transcribed directly from the ticket's own AC3 text, which states the
  default outright. It is still exposed as a single named `config.ts` constant so a later retune
  after playtest is one line, not a re-touch of the turn engine.
- **Base capture / base loss consequences** — `connectedNetwork` returns `[]` when a side no longer
  owns its base cell (a well-defined degenerate case), but nothing in this module or any other
  decides what happens when that occurs; that's a future Breach/loss-condition ticket's question to
  answer.
