import {
  allBoardCoords,
  applyVanguardAction,
  cellKey,
  type CellKey,
  type VanguardActionKind,
  type VanguardBoard,
} from '../../vanguard'
import type { PlayerSide } from '../../warCouncil'

/**
 * Every coordinate where `kind` is both legal and affordable for `side`, found by
 * dry-running the real engine rather than re-deriving its rules — AC2's "no
 * client-side re-implementation of legality". Mirrors `chooseCpuClashAction`'s
 * own dry-run-validate pattern.
 *
 * Bounded by board.size^2 (121 calls at BOARD_SIZE 11), recomputed per render
 * while an action is armed. This is a discrete turn-based board, not a pointer
 * hot path, so recompute-from-scratch is the simplest correct design — the same
 * stance `network.ts` documents for `connectedNetwork`.
 */
export function legalTargetsFor(
  board: VanguardBoard,
  side: PlayerSide,
  kind: VanguardActionKind,
  musterAvailable: number,
): ReadonlySet<CellKey> {
  const targets = new Set<CellKey>()

  // Mirrors applyClashAction's own Number.isFinite guard: without it a malformed
  // Muster would compare as affordable against every cost.
  if (!Number.isFinite(musterAvailable)) return targets

  for (const target of allBoardCoords(board.size)) {
    const result = applyVanguardAction(board, side, { kind, target })
    if (result.ok && result.cost <= musterAvailable) targets.add(cellKey(target))
  }

  return targets
}
