import {
  allBoardCoords,
  applyVanguardAction,
  cellKey,
  VanguardActionKind,
  VanguardCellKind,
  type CellKey,
  type VanguardBoard,
  type VanguardCell,
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

/**
 * Which action kind a tap on this cell means, inferred from its occupancy —
 * SCRUM-41's click-to-act model. Total over every occupancy state so a tap
 * never has "no inferred action": an own token infers Reinforce even when
 * already at the reinforcement cap, and a defense cell infers Expand so the
 * engine's own CellIsDefense rejection — not a client-side guess — is what
 * the player sees. This function decides no legality; applyVanguardAction /
 * applyClashAction still adjudicate every attempt.
 */
export function inferActionKind(
  cell: VanguardCell | undefined,
  side: PlayerSide,
): VanguardActionKind {
  if (cell === undefined || cell.kind === VanguardCellKind.Defense) {
    return VanguardActionKind.Expand
  }
  return cell.owner === side ? VanguardActionKind.Reinforce : VanguardActionKind.Overwrite
}

/**
 * The union of every action kind's legal targets — SCRUM-41's continuous
 * board highlight, since a click-to-act board must show every cell some
 * action can currently land on, not just one armed kind's cells. Takes the
 * already-computed per-kind sets rather than re-dry-running the engine, so a
 * caller building both the palette's per-kind `enabled` map and the board's
 * highlight set pays for the size^2 engine pass once per kind, not a fourth
 * time for the union.
 */
export function allLegalTargets(
  byAction: Readonly<Record<VanguardActionKind, ReadonlySet<CellKey>>>,
): ReadonlySet<CellKey> {
  const all = new Set<CellKey>()
  for (const targets of Object.values(byAction)) {
    for (const key of targets) all.add(key)
  }
  return all
}
