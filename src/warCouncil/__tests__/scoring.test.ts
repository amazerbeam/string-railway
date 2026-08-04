import { describe, expect, it } from 'vitest'
import { scoreRound, tricksToPoints } from '../scoring'

describe('tricksToPoints', () => {
  it.each([
    [0, 6],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 1],
    [5, 2],
    [6, 3],
    [7, 6],
    [8, 6],
    [9, 6],
    [10, 0],
    [11, 0],
    [12, 0],
    [13, 0],
  ])('tricks=%i -> %i points', (tricks, points) => {
    expect(tricksToPoints(tricks)).toBe(points)
  })
})

describe('scoreRound', () => {
  it('scores both sides from their tricksWon, summing to a locked pair for every split', () => {
    for (let playerTricks = 0; playerTricks <= 13; playerTricks++) {
      const cpuTricks = 13 - playerTricks
      const result = scoreRound({ player: playerTricks, cpu: cpuTricks })
      expect(result.player).toBe(tricksToPoints(playerTricks))
      expect(result.cpu).toBe(tricksToPoints(cpuTricks))
    }
  })
})
