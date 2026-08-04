import { otherSide } from '../warCouncil'
import type { PlayerSide } from '../warCouncil'
import { CLASH_FIRST_ROUND_OPENER } from './config'

export function openingSideForRound(roundNumber: number): PlayerSide {
  const isOddRound = roundNumber % 2 === 1
  return isOddRound ? CLASH_FIRST_ROUND_OPENER : otherSide(CLASH_FIRST_ROUND_OPENER)
}
