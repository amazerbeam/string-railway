import { otherSide, PlayerSide } from '../warCouncil'

// Configuration: no stated default in the brief or design docs for who deals round 1 —
// placeholder pending developer confirmation (see plan.md Part 1 -> Risks and judgement calls).
// Carries forward the exact value the deleted src/battle/config.ts shipped.
const FIRST_DEALER: PlayerSide = PlayerSide.Player

/** Round 1 uses FIRST_DEALER; every later round alternates by parity alone. App.tsx's restart
 * is a placeholder ahead of the real run loop (T9/T10) and tracks no state across rounds beyond
 * this alternation. */
export function dealerForRound(round: number): PlayerSide {
  const usesFirstDealer = (round - 1) % 2 === 0
  return usesFirstDealer ? FIRST_DEALER : otherSide(FIRST_DEALER)
}
