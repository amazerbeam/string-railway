import { describe, expect, it } from 'vitest'
import { PlayerSide, quarryIntent } from '../../../warCouncil'
import { telegraphedLeadSuit } from '../quarryTelegraph'
import { makeRound } from './roundFixture'

describe('telegraphedLeadSuit', () => {
  it('marks the suit quarryIntent reports when the Quarry is to lead', () => {
    // A round aimed so the Quarry is on turn with an empty trick — `leader: PlayerSide.Cpu`,
    // not `dealer`: `currentTurn` reads `state.leader`, never `state.dealer` (see `types.ts`).
    const state = makeRound({ leader: PlayerSide.Cpu })
    const intent = quarryIntent(state)
    expect(intent).not.toBeNull()
    expect(telegraphedLeadSuit(state, true)).toBe(intent!.suit)
  })

  it('marks nothing when the caller says the Quarry is not to lead', () => {
    const state = makeRound({ leader: PlayerSide.Cpu })
    expect(telegraphedLeadSuit(state, false)).toBeNull()
  })

  it('marks nothing when quarryIntent has no move to describe', () => {
    // The player is on turn, so the intent function itself returns null.
    const state = makeRound()
    expect(quarryIntent(state)).toBeNull()
    expect(telegraphedLeadSuit(state, true)).toBeNull()
  })

  it('is stable under repeated calls, as StrictMode double-invoke requires', () => {
    const state = makeRound({ leader: PlayerSide.Cpu })
    expect(telegraphedLeadSuit(state, true)).toBe(telegraphedLeadSuit(state, true))
  })

  it('never returns anything but a suit — no rank can reach the caller (AC5)', () => {
    const state = makeRound({ leader: PlayerSide.Cpu })
    const suit = telegraphedLeadSuit(state, true)
    expect(typeof suit).toBe('string')
  })
})
