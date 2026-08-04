import type { PlayerSide } from './types'

export function tricksToPoints(tricks: number): number {
  if (tricks <= 3) return 6
  if (tricks === 4) return 1
  if (tricks === 5) return 2
  if (tricks === 6) return 3
  if (tricks <= 9) return 6
  return 0
}

export function scoreRound(
  tricksWon: Readonly<Record<PlayerSide, number>>,
): Record<PlayerSide, number> {
  return { player: tricksToPoints(tricksWon.player), cpu: tricksToPoints(tricksWon.cpu) }
}
