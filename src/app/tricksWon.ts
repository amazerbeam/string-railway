import type { PlayerSide } from '../warCouncil'

// Mirrors the fixed round length already asserted in src/warCouncil/playCard.ts:93
// (tricksPlayed === 13) and src/warCouncil/deal.ts:7-8 (13-card hands). Declared
// separately here rather than imported — see plan.md Part 1 -> Assumptions made
// and Risks for why, and the follow-up to consolidate this into one export.
export const TRICKS_PER_ROUND = 13

export type TricksWon = Readonly<Record<PlayerSide, number>>

export function isValidTricksWon(tricks: TricksWon): boolean {
  return (
    Number.isInteger(tricks.player) &&
    Number.isInteger(tricks.cpu) &&
    tricks.player >= 0 &&
    tricks.cpu >= 0 &&
    tricks.player + tricks.cpu === TRICKS_PER_ROUND
  )
}
