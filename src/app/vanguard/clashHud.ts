// src/app/vanguard/clashHud.ts
import { ClashStatus, type ClashState } from '../../vanguard'
import { PlayerSide, otherSide } from '../../warCouncil'
import type { MatchUiState } from './matchReducer'
import { REJECTION_MESSAGE } from './labels'

export const TurnIndicator = {
  AwaitingMuster: 'awaitingMuster',
  PlayerTurn: 'playerTurn',
  // Unreachable through VanguardMatch's matchReducer today: advanceCpu drains
  // every CPU turn synchronously before a state is ever stored, so
  // ui.clash.turn is always Player whenever status is InProgress (see
  // plan.md -> Part 1 -> Assumptions). Kept for completeness and tested via
  // a direct fixture, matching this module's existing precedent for
  // cpuRejected in matchReducer.ts.
  CpuTurn: 'cpuTurn',
  Resolved: 'resolved',
} as const
export type TurnIndicator = (typeof TurnIndicator)[keyof typeof TurnIndicator]

export interface ClashHudState {
  readonly playerMuster: number | null
  readonly cpuMuster: number | null
  readonly indicator: TurnIndicator
  readonly uncontested: boolean
}

/**
 * Reads the HUD's entire state off `ClashState` — no legality, cost, or
 * turn-order rule is computed here, only display values already decided by
 * applyClashAction. `uncontested` mirrors that function's own step-7 rule:
 * the mover has Muster left and the other side has none.
 */
export function deriveClashHud(clash: ClashState | null): ClashHudState {
  if (clash === null) {
    return {
      playerMuster: null,
      cpuMuster: null,
      indicator: TurnIndicator.AwaitingMuster,
      uncontested: false,
    }
  }

  const playerMuster = clash.muster[PlayerSide.Player]
  const cpuMuster = clash.muster[PlayerSide.Cpu]

  if (clash.status !== ClashStatus.InProgress) {
    return { playerMuster, cpuMuster, indicator: TurnIndicator.Resolved, uncontested: false }
  }

  const mover = clash.turn
  const other = otherSide(mover)
  const uncontested = clash.muster[mover] > 0 && clash.muster[other] === 0
  const indicator = mover === PlayerSide.Player ? TurnIndicator.PlayerTurn : TurnIndicator.CpuTurn

  return { playerMuster, cpuMuster, indicator, uncontested }
}

/** Priority mirrors the mockup's hint cascade: a rejection always wins;
 * otherwise the hint names the HUD's current lifecycle state. Moved here
 * from VanguardMatch.tsx so it's unit-tested without a renderer. */
export function deriveHint(ui: MatchUiState, hud: ClashHudState): string {
  if (ui.rejection !== null) return REJECTION_MESSAGE[ui.rejection]

  switch (hud.indicator) {
    case TurnIndicator.AwaitingMuster:
      return 'The War Council is deciding this round’s Muster'
    case TurnIndicator.Resolved:
      return ''
    case TurnIndicator.PlayerTurn:
      return hud.uncontested
        ? `CPU is out of moves — you’re spending your remaining ${hud.playerMuster} moves`
        : 'Tap a cell to act'
    case TurnIndicator.CpuTurn:
      return hud.uncontested
        ? `You’re out of moves — CPU is spending its remaining ${hud.cpuMuster} moves`
        : 'They are spending their Muster'
  }
}
