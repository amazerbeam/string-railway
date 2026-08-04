import { scoreRound } from '../warCouncil'
import { convertScoreToMuster, openingSideForRound, startClash } from '../vanguard'
import { BattlePhase } from './battlePhase'
import { BattleRejectionReason } from './battleAction'
import type { BattleActionResult } from './battleAction'
import type { BattleState } from './battleState'

export function beginClash(state: BattleState): BattleActionResult {
  if (state.phase !== BattlePhase.MusterConversion) {
    return { ok: false, reason: BattleRejectionReason.NotMusterConversionPhase }
  }

  const score = scoreRound(state.warCouncil.tricksWon)
  const muster = convertScoreToMuster(score)
  const openingSide = openingSideForRound(state.round)
  const clash = startClash(state.vanguard, muster, openingSide)

  return {
    ok: true,
    state: { phase: BattlePhase.Clash, round: state.round, dealer: state.dealer, clash },
  }
}
