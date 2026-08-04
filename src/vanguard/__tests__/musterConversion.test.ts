import { describe, expect, it } from 'vitest'
import { PlayerSide, scoreRound } from '../../warCouncil'
import { MUSTER_BASELINE, MUSTER_BONUS } from '../config'
import { convertScoreToMuster } from '../musterConversion'

const WINNER_MUSTER = MUSTER_BASELINE + MUSTER_BONUS

describe('convertScoreToMuster', () => {
  it.each([
    [0, 13, PlayerSide.Player],
    [1, 12, PlayerSide.Player],
    [2, 11, PlayerSide.Player],
    [3, 10, PlayerSide.Player],
    [4, 9, PlayerSide.Cpu],
    [5, 8, PlayerSide.Cpu],
    [6, 7, PlayerSide.Cpu],
  ] as const)(
    'trick split %i/%i: winner gets baseline + bonus, loser gets baseline only',
    (playerTricks, cpuTricks, winner) => {
      const score = scoreRound({ player: playerTricks, cpu: cpuTricks })
      const muster = convertScoreToMuster(score)
      const loser = winner === PlayerSide.Player ? PlayerSide.Cpu : PlayerSide.Player

      expect(muster[winner]).toBe(WINNER_MUSTER)
      expect(muster[loser]).toBe(MUSTER_BASELINE)
    },
  )

  it('never lets the losing side fall to zero moves, even at the most extreme ambush', () => {
    // Constructed directly against a score band, not derived via scoreRound(tricks):
    // scoreRound's own sweep-penalty curve (tricksToPoints, out of scope here) means
    // a 0/13 trick split does not produce a lopsided *score* in the naive direction —
    // 13 tricks scores 0 points and 0 tricks scores 6, so the loser by score is the
    // side with more tricks, not fewer, once the sweep-penalty curve is applied. The
    // floor this test is checking belongs to convertScoreToMuster's score input, so
    // the fixture is an extreme score gap rather than an extreme trick count.
    const muster = convertScoreToMuster({ player: 0, cpu: 999 })
    expect(muster.player).toBe(MUSTER_BASELINE)
    expect(muster.player).toBeGreaterThan(0)
  })

  it('grants the bonus to neither side on a tied score band', () => {
    const muster = convertScoreToMuster({ player: 3, cpu: 3 })
    expect(muster).toEqual({ player: MUSTER_BASELINE, cpu: MUSTER_BASELINE })
  })

  it('is pure: the same score band always produces the same Muster', () => {
    const score = { player: 2, cpu: 6 }
    expect(convertScoreToMuster(score)).toEqual(convertScoreToMuster(score))
  })
})
