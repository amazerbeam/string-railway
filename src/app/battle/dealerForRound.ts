import { otherSide, type PlayerSide } from '../../warCouncil'
import { WAR_COUNCIL_FIRST_DEALER } from '../../battle'

/** Round 1 uses WAR_COUNCIL_FIRST_DEALER; every later round alternates by
 * parity alone — matches battle.md's rule that the dealer flips exactly
 * once per completed round, with no other trigger. */
export function dealerForRound(round: number): PlayerSide {
  const usesFirstDealer = (round - 1) % 2 === 0
  return usesFirstDealer ? WAR_COUNCIL_FIRST_DEALER : otherSide(WAR_COUNCIL_FIRST_DEALER)
}
