/**
 * The Quarry's half of a commit — deriving a resolved trick's reveal, committing its follow, and
 * committing its lead — separated from the reducer that calls them.
 *
 * Split out of `roundReducer.ts` on DLR-94 for the reason `roundUiState.ts` was split out on
 * DLR-90: that file stood at 390 of its 400-line budget before the Apply Damage handler was
 * written. The seam is the same kind of seam — this is the block that talks to `cpuPlayer` and
 * `playCard` and decides nothing about the player's own state, so nothing here needs to know what
 * a `RoundUiState` is. PURE MOVE: no behaviour changed, and every docblock came with its function.
 */
import {
  chooseCpuMove,
  commitQuarryMove,
  legalMoves,
  playCard,
  PlayerSide,
  QUARRY_SIDE,
  TrickOutcome,
  type PlayCardOptions,
  type TrickCard,
  type WarCouncilState,
} from '../../warCouncil'
import type { CpuFault, ResolvedTrick } from './roundUiState'

export interface CpuAdvanceResult {
  readonly round: WarCouncilState
  readonly resolvedTrick: ResolvedTrick | null
  readonly cpuFault: CpuFault | null
}

/** A trick resolved iff the engine wrote a `lastResolution` on `after` — the definitive signal
 *  now that the bank, not `tricksWon`, is what changed. The physical winner is recovered from
 *  the outcome itself (`CleanWin`/`SkullWin` favour the player, `Dodge`/`CleanLoss` favour the
 *  Quarry) rather than by diffing `tricksWon`, which `resolveTrickBank` already consulted once. */
export function deriveResolvedTrick(
  before: WarCouncilState,
  after: WarCouncilState,
  playedCard: TrickCard,
): ResolvedTrick | null {
  const resolution = after.lastResolution
  if (resolution === null) {
    return null
  }
  const winner =
    resolution.outcome === TrickOutcome.CleanWin || resolution.outcome === TrickOutcome.SkullWin
      ? PlayerSide.Player
      : PlayerSide.Cpu
  return {
    cards: [before.currentTrick[0], playedCard],
    winner,
    resolution,
    payout: null,
    // DLR-132 — `deriveResolvedTrick` runs BEFORE `commit`'s fold, the same reason `payout` above
    // always writes `null` here: only `commit` knows which Timebomb tier (if any) is spent.
    timebombDamage: null,
  }
}

/**
 * Commits the Quarry's *follow* — the answer to a lead already on the table — needing
 * `chooseCpuMove`'s chosen card to derive the resolved trick's reveal. Guards `legalMoves`
 * before calling `chooseCpuMove`, which throws on an empty legal set.
 */
export function advanceQuarryFollow(
  round: WarCouncilState,
  options: PlayCardOptions,
): CpuAdvanceResult {
  const legal = legalMoves(round, QUARRY_SIDE)
  if (legal.length === 0) {
    return { round, resolvedTrick: null, cpuFault: 'noLegalMove' }
  }

  const move = chooseCpuMove(round, QUARRY_SIDE)
  const result = playCard(round, QUARRY_SIDE, move.card, move.choice, options)
  if (!result.ok) {
    return { round, resolvedTrick: null, cpuFault: result.reason }
  }

  const playedCard: TrickCard = { side: QUARRY_SIDE, card: move.card }
  return {
    round: result.state,
    resolvedTrick: deriveResolvedTrick(round, result.state, playedCard),
    cpuFault: null,
  }
}

/**
 * Commits a Quarry *lead* through the engine's own `commitQuarryMove` — the commit half of
 * the split DLR-52 introduced for exactly this. A lead never completes a trick, so there is
 * no resolved reveal to derive and no need to know which card was chosen.
 *
 * Keeps `advanceQuarryFollow`'s empty-legal-set guard: `commitQuarryMove` reaches
 * `chooseCpuCard`, whose `lowestCard([])` would throw rather than return a rejection.
 */
export function advanceQuarryLead(round: WarCouncilState): CpuAdvanceResult {
  if (legalMoves(round, QUARRY_SIDE).length === 0) {
    return { round, resolvedTrick: null, cpuFault: 'noLegalMove' }
  }
  const result = commitQuarryMove(round)
  if (!result.ok) {
    return { round, resolvedTrick: null, cpuFault: result.reason }
  }
  return { round: result.state, resolvedTrick: null, cpuFault: null }
}
