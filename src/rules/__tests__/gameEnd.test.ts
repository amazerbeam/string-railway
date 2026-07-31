import { describe, expect, it } from 'vitest'
import { asColourId, asPlayerId } from '../types'
import { finalStandings } from '../gameEnd'
import { makeSeat, makeState } from './fixtures'

describe('finalStandings (§5.5, §9)', () => {
  it('returns a score per colour', () => {
    const seats = [makeSeat('PINK', 'P1', { score: 5 }), makeSeat('BLUE', 'P2', { score: 3 })]
    const state = makeState({ seats })

    const standings = finalStandings(state)

    expect(standings.byColour).toEqual([
      { colour: asColourId('PINK'), score: 5 },
      { colour: asColourId('BLUE'), score: 3 },
    ])
  })

  it('sums an owner’s two colour scores into one owner total (§9)', () => {
    const seats = [
      makeSeat('A1', 'P1', { score: 5 }),
      makeSeat('A2', 'P1', { score: 3 }),
      makeSeat('B1', 'P2', { score: 2 }),
    ]
    const state = makeState({ seats })

    const standings = finalStandings(state)

    const p1 = standings.byOwner.find((owner) => owner.owner === asPlayerId('P1'))
    expect(p1?.total).toBe(8)
    expect(p1?.colours).toHaveLength(2)
  })

  it('reports a single winner when one owner total is highest', () => {
    const seats = [makeSeat('PINK', 'P1', { score: 10 }), makeSeat('BLUE', 'P2', { score: 5 })]
    const state = makeState({ seats })

    const standings = finalStandings(state)

    expect(standings.winners).toEqual([asPlayerId('P1')])
  })

  it('reports every tied owner as a winner — ties share the victory (§5.5)', () => {
    const seats = [makeSeat('PINK', 'P1', { score: 7 }), makeSeat('BLUE', 'P2', { score: 7 })]
    const state = makeState({ seats })

    const standings = finalStandings(state)

    expect(standings.winners).toEqual([asPlayerId('P1'), asPlayerId('P2')])
  })

  it('handles negative totals without flooring (M14)', () => {
    const seats = [makeSeat('PINK', 'P1', { score: -5 }), makeSeat('BLUE', 'P2', { score: -10 })]
    const state = makeState({ seats })

    const standings = finalStandings(state)

    expect(standings.byColour).toEqual([
      { colour: asColourId('PINK'), score: -5 },
      { colour: asColourId('BLUE'), score: -10 },
    ])
    expect(standings.winners).toEqual([asPlayerId('P1')])
  })
})
