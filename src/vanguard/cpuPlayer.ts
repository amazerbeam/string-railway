import { applyVanguardAction } from './applyVanguardAction'
import { EXPAND_RANGE, REINFORCE_COST, REINFORCE_MAX_STACK } from './config'
import { allBoardCoords, cellKey, hexDistance } from './hexGrid'
import { minDistanceToNetwork, ownedCells } from './network'
import { overwriteCostFor } from './overwrite'
import { VanguardActionKind, VanguardCellKind } from './types'
import type { HexCoord, VanguardAction, VanguardBoard } from './types'
import { otherSide } from '../warCouncil'
import type { PlayerSide } from '../warCouncil'

function byCellKey(a: HexCoord, b: HexCoord): number {
  return cellKey(a).localeCompare(cellKey(b))
}

// Empty cells within reach of any cell the acting side currently owns — the
// engine's own applyExpand check (SCRUM-40: every owned cell, not just the
// base-connected chain), reused rather than re-derived.
function expandCandidates(board: VanguardBoard, owned: readonly HexCoord[]): HexCoord[] {
  return allBoardCoords(board.size).filter(
    (coord) =>
      board.cells[cellKey(coord)] === undefined &&
      minDistanceToNetwork(coord, owned) <= EXPAND_RANGE,
  )
}

// Enemy-token cells adjacent to any cell the acting side currently owns that
// it can afford to overwrite with the Muster it has left this turn — the
// engine's own applyOverwrite adjacency check (SCRUM-40: every owned cell),
// reused rather than re-derived; the cost itself comes from overwrite.ts's
// own overwriteCostFor so the two never drift.
function overwriteCandidates(
  board: VanguardBoard,
  opponent: PlayerSide,
  owned: readonly HexCoord[],
  musterAvailable: number,
): HexCoord[] {
  return allBoardCoords(board.size).filter((coord) => {
    const cell = board.cells[cellKey(coord)]
    if (cell?.kind !== VanguardCellKind.Token || cell.owner !== opponent) return false
    if (minDistanceToNetwork(coord, owned) > 1) return false
    return overwriteCostFor(cell.reinforced) <= musterAvailable
  })
}

// The acting side's own unreinforced tokens that this side can afford to
// reinforce with the Muster it has left this turn.
function reinforceCandidates(
  board: VanguardBoard,
  side: PlayerSide,
  musterAvailable: number,
): HexCoord[] {
  if (REINFORCE_COST > musterAvailable) return []
  return allBoardCoords(board.size).filter((coord) => {
    const cell = board.cells[cellKey(coord)]
    return cell?.kind === VanguardCellKind.Token && cell.owner === side && cell.reinforced < REINFORCE_MAX_STACK
  })
}

// Tier 1 = distance-1-from-any-owned-cell (contiguous; every Overwrite
// candidate qualifies by construction, since Overwrite itself requires
// adjacency). Tier 2 = distance-2 (an Expand gap-jump only). A gap doesn't
// count toward the Breach until it's filled in
// (skirmish-board-replacement.md -> "The Breach"), so a gap-jump is worth
// less than clearing an adjacent blocker even when it lands nominally closer
// to the opponent's base.
function candidateTier(target: HexCoord, owned: readonly HexCoord[]): number {
  return minDistanceToNetwork(target, owned) <= 1 ? 1 : 2
}

// Ranks Expand + Overwrite candidates by tier first (contiguous beats a
// gap-jump), then by resulting distance to the opponent's base within a
// tier — closest wins, cellKey breaks remaining ties. This is what makes
// "prefer Overwrite when it's blocking the shortest path" actually hold: a
// flat distance-only ranking would instead favor an Expand gap-jump past the
// blocker, since EXPAND_RANGE (2) always reaches one hex closer to a distant
// base than overwriting an adjacent blocker does (see plan.md Part 1 ->
// Assumptions made).
function rankedAdvanceCandidates(
  board: VanguardBoard,
  opponent: PlayerSide,
  owned: readonly HexCoord[],
  musterAvailable: number,
): VanguardAction[] {
  const opponentBase = board.bases[opponent]
  const expand = expandCandidates(board, owned).map(
    (target): VanguardAction => ({ kind: VanguardActionKind.Expand, target }),
  )
  const overwrite = overwriteCandidates(board, opponent, owned, musterAvailable).map(
    (target): VanguardAction => ({ kind: VanguardActionKind.Overwrite, target }),
  )
  return [...expand, ...overwrite].sort(
    (a, b) =>
      candidateTier(a.target, owned) - candidateTier(b.target, owned) ||
      hexDistance(a.target, opponentBase) - hexDistance(b.target, opponentBase) ||
      byCellKey(a.target, b.target),
  )
}

// Walks a ranked candidate list, dry-run-validating each through the engine's
// own applyVanguardAction, and returns the first one it confirms legal. Never
// trusts candidate generation alone — see plan.md Part 2 -> Approach.
function firstValidated(
  board: VanguardBoard,
  side: PlayerSide,
  candidates: readonly VanguardAction[],
): VanguardAction | undefined {
  for (const candidate of candidates) {
    if (applyVanguardAction(board, side, candidate).ok) return candidate
  }
  return undefined
}

export function chooseCpuClashAction(
  board: VanguardBoard,
  side: PlayerSide,
  musterAvailable: number,
): VanguardAction {
  const opponent = otherSide(side)
  const owned = ownedCells(board, side)

  const advance = firstValidated(
    board,
    side,
    rankedAdvanceCandidates(board, opponent, owned, musterAvailable),
  )
  if (advance) return advance

  const reinforce = firstValidated(
    board,
    side,
    reinforceCandidates(board, side, musterAvailable)
      .sort(byCellKey)
      .map((target): VanguardAction => ({ kind: VanguardActionKind.Reinforce, target })),
  )
  if (reinforce) return reinforce

  // Reachable whenever the acting side still has Muster but no candidate
  // validates — e.g. a locally boxed-in frontier with no empty cell within
  // EXPAND_RANGE, no unreinforced own token, and only enemy tokens priced
  // above the remaining Muster. A documented, accepted, unmodeled dead end
  // (see .docs/implementation/vanguard.md and
  // .docs/design/skirmish-board-replacement.md) — not board saturation only,
  // and not something this function handles; the caller has no recovery path.
  throw new Error(`chooseCpuClashAction: no legal action available for ${side}`)
}
