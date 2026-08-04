import { AbilityChoiceKind, CardRank, currentTurn, legalMoves } from '../../warCouncil'
import type { AbilityChoice, Card } from '../../warCouncil'
import { BattlePhase } from '../battlePhase'
import { submitWarCouncilCard } from '../submitWarCouncilCard'
import type { BattleState } from '../battleState'
import {
  allBoardCoords,
  cellKey,
  connectedNetwork,
  EXPAND_RANGE,
  hexDistance,
  minDistanceToNetwork,
  OVERWRITE_COST,
  OVERWRITE_COST_REINFORCED,
  VanguardActionKind,
  VanguardCellKind,
} from '../../vanguard'
import type { HexCoord, VanguardAction, VanguardState } from '../../vanguard'
import { otherSide } from '../../warCouncil'
import type { PlayerSide } from '../../warCouncil'

// A fixed, non-adaptive script: always plays the first legal card, declines Fox,
// and discards the just-drawn card on Woodcutter. Used only to drive a War Council
// round to completion in tests — not CPU decision-making.
export function autoPlayWarCouncilRound(state: BattleState): BattleState {
  let current = state
  while (current.phase === BattlePhase.WarCouncilRound) {
    const side = currentTurn(current.warCouncil)
    const card = legalMoves(current.warCouncil, side)[0]
    const choice = abilityChoiceFor(card, current.warCouncil.drawPile[0])
    const result = submitWarCouncilCard(current, side, card, choice)
    if (!result.ok) throw new Error(`scripted war council move rejected: ${result.reason}`)
    current = result.state
  }
  return current
}

function abilityChoiceFor(card: Card, drawnCard: Card): AbilityChoice | undefined {
  if (card.rank === CardRank.Fox) return { kind: AbilityChoiceKind.FoxDecline }
  if (card.rank === CardRank.Woodcutter) {
    return { kind: AbilityChoiceKind.WoodcutterDiscard, discard: drawnCard }
  }
  return undefined
}

// Cost of overwriting a given enemy cell, mirroring applyOverwrite's own rule —
// duplicated here (rather than imported) because the engine only exposes this
// as a side effect of attempting the action; the script needs it up front to
// stay within the acting side's remaining Muster for this turn.
function overwriteCostFor(reinforced: number): number {
  return reinforced > 0 ? OVERWRITE_COST_REINFORCED : OVERWRITE_COST
}

// Empty cells that keep the network contiguous — adjacent to an already-owned
// cell — take priority over the rest of EXPAND_RANGE. EXPAND_RANGE permits
// jumping up to 2 hexes, but `connectedNetwork` only walks cells that are
// adjacent to one another, so a 2-hex jump lands outside the network it just
// left: the new cell won't count toward any later minDistanceToNetwork check
// until something else fills the gap behind it. Preferring distance-1
// candidates means every expand actually grows the reachable frontier
// instead of scattering disconnected islands across the board.
function expandCandidates(board: VanguardState, network: readonly HexCoord[]): HexCoord[] {
  const empty = allBoardCoords(board.size).filter((coord) => board.cells[cellKey(coord)] === undefined)
  const connected = empty.filter((coord) => minDistanceToNetwork(coord, network) === 1)
  if (connected.length > 0) return connected
  return empty.filter((coord) => minDistanceToNetwork(coord, network) <= EXPAND_RANGE)
}

// Enemy-owned cells adjacent to this side's network that this side can afford
// to overwrite this turn.
function affordableEnemyAdjacent(
  board: VanguardState,
  opponent: PlayerSide,
  network: readonly HexCoord[],
  musterAvailable: number,
): HexCoord[] {
  return allBoardCoords(board.size)
    .filter((coord) => {
      const cell = board.cells[cellKey(coord)]
      return (
        cell?.kind === VanguardCellKind.Token &&
        cell.owner === opponent &&
        overwriteCostFor(cell.reinforced) <= musterAvailable
      )
    })
    .filter((coord) => minDistanceToNetwork(coord, network) <= 1)
}

// A fixed, distance-minimizing script: always closes the gap to the opponent's
// base by the shortest available legal move it can afford this turn. No
// lookahead, no evaluation of alternatives, no hidden-information reasoning —
// not CPU decision-making. `musterAvailable` keeps it from picking an
// Overwrite (the only variable-cost action) it cannot pay for, which would
// otherwise be rejected by `submitClashAction` as `insufficientMuster`.
//
// Expand and Overwrite candidates are ranked together by their resulting
// distance to the opponent's base, not tried as separate all-or-nothing
// tiers: once the advance reaches the opponent's defended perimeter, the
// nearest empty cell is often a sideways detour while an adjacent enemy
// token is the one cell that actually closes the gap, and a strict
// Expand-before-Overwrite order would keep sidestepping instead of
// breaking through.
export function scriptedClashAction(
  board: VanguardState,
  side: PlayerSide,
  musterAvailable: number,
): VanguardAction {
  const opponent = otherSide(side)
  const opponentBase = board.bases[opponent]
  const network = connectedNetwork(board, side)

  if (minDistanceToNetwork(opponentBase, network) <= 1) {
    const baseCell = board.cells[cellKey(opponentBase)]
    if (
      baseCell?.kind === VanguardCellKind.Token &&
      baseCell.owner === opponent &&
      overwriteCostFor(baseCell.reinforced) <= musterAvailable
    ) {
      return { kind: VanguardActionKind.Overwrite, target: opponentBase }
    }
  }

  const byDistanceToOpponentBase = (a: { q: number; r: number }, b: { q: number; r: number }) =>
    hexDistance(a, opponentBase) - hexDistance(b, opponentBase) ||
    cellKey(a).localeCompare(cellKey(b))

  const advances: VanguardAction[] = [
    ...expandCandidates(board, network).map(
      (target): VanguardAction => ({ kind: VanguardActionKind.Expand, target }),
    ),
    ...affordableEnemyAdjacent(board, opponent, network, musterAvailable).map(
      (target): VanguardAction => ({ kind: VanguardActionKind.Overwrite, target }),
    ),
  ].sort((a, b) => byDistanceToOpponentBase(a.target, b.target))
  if (advances.length > 0) {
    return advances[0]
  }

  const ownUnreinforced = allBoardCoords(board.size)
    .filter((coord) => {
      const cell = board.cells[cellKey(coord)]
      return cell?.kind === VanguardCellKind.Token && cell.owner === side && cell.reinforced === 0
    })
    .sort((a, b) => cellKey(a).localeCompare(cellKey(b)))
  if (ownUnreinforced.length > 0) {
    return { kind: VanguardActionKind.Reinforce, target: ownUnreinforced[0] }
  }

  throw new Error('scriptedClashAction: no legal action available for this side')
}

// A fixed, non-seeking script: reinforces or expands from the side's own
// network first, and only reaches for the opponent — overwriting the nearest
// adjacent enemy token it can afford — once the local cluster is fully
// reinforced and no empty cell remains in range. That third tier is a
// deterministic, fixed fallback (identical shape to scriptedClashAction's own
// last tier), not CPU decision-making: without it, a long-running battle
// eventually saturates the board and this side is left with zero legal
// moves, which is a dead end for the *script*, not a rule the engine itself
// enforces. `musterAvailable` keeps the fallback from picking an Overwrite it
// cannot pay for this turn.
export function scriptedLocalAction(
  board: VanguardState,
  side: PlayerSide,
  musterAvailable: number,
): VanguardAction {
  const opponent = otherSide(side)
  const network = connectedNetwork(board, side)

  const ownUnreinforced = allBoardCoords(board.size)
    .filter((coord) => {
      const cell = board.cells[cellKey(coord)]
      return cell?.kind === VanguardCellKind.Token && cell.owner === side && cell.reinforced === 0
    })
    .sort((a, b) => cellKey(a).localeCompare(cellKey(b)))
  if (ownUnreinforced.length > 0) {
    return { kind: VanguardActionKind.Reinforce, target: ownUnreinforced[0] }
  }

  const empty = expandCandidates(board, network).sort((a, b) => cellKey(a).localeCompare(cellKey(b)))
  if (empty.length > 0) {
    return { kind: VanguardActionKind.Expand, target: empty[0] }
  }

  const enemyAdjacent = affordableEnemyAdjacent(board, opponent, network, musterAvailable).sort(
    (a, b) => cellKey(a).localeCompare(cellKey(b)),
  )
  if (enemyAdjacent.length > 0) {
    return { kind: VanguardActionKind.Overwrite, target: enemyAdjacent[0] }
  }

  throw new Error('scriptedLocalAction: no legal action available for this side')
}
