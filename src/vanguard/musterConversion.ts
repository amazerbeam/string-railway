import { PlayerSide } from '../warCouncil'
import { MUSTER_BASELINE, MUSTER_BONUS } from './config'
import type { Muster } from './types'

// Both sides always receive MUSTER_BASELINE; only the round's winner adds
// MUSTER_BONUS on top, so the losing side's Muster can never fall below the
// floor no matter how lopsided the round was (concept-critique.md Problem 1).
export function convertScoreToMuster(score: Readonly<Record<PlayerSide, number>>): Muster {
  const winner =
    score[PlayerSide.Player] > score[PlayerSide.Cpu]
      ? PlayerSide.Player
      : score[PlayerSide.Cpu] > score[PlayerSide.Player]
        ? PlayerSide.Cpu
        : undefined

  return {
    [PlayerSide.Player]: MUSTER_BASELINE + (winner === PlayerSide.Player ? MUSTER_BONUS : 0),
    [PlayerSide.Cpu]: MUSTER_BASELINE + (winner === PlayerSide.Cpu ? MUSTER_BONUS : 0),
  }
}
