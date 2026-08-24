import { describe, expect, it } from 'vitest'
import { startRun } from '../../hunt'
import { FRESH_ENCOUNTER_DECK, closeHand, PlayerSide } from '../../warCouncil'
import { dealHand } from '../handDeal'

const runWith = (seed: number) => ({ ...startRun(undefined, [], seed) })

describe('dealHand', () => {
  it('AC12 — the same run, fight and hand deal exactly the same cards and skulls', () => {
    expect(dealHand(runWith(2026), 1, FRESH_ENCOUNTER_DECK)).toEqual(
      dealHand(runWith(2026), 1, FRESH_ENCOUNTER_DECK),
    )
  })

  it('AC12 — a different run seed deals a different hand', () => {
    const a = dealHand(runWith(2026), 1, FRESH_ENCOUNTER_DECK)
    const b = dealHand(runWith(2027), 1, FRESH_ENCOUNTER_DECK)
    expect(a.hands[PlayerSide.Player]).not.toEqual(b.hands[PlayerSide.Player])
  })

  it('AC1 — a fresh deck opens on 20 in the draw pile and nothing spent', () => {
    const state = dealHand(runWith(2026), 1, FRESH_ENCOUNTER_DECK)
    expect(state.drawPile).toHaveLength(20)
    expect(state.spentPile).toEqual([])
    expect(state.reshuffled).toBe(false)
  })

  it('AC2 — a carried deck continues the encounter rather than restarting it', () => {
    const run = runWith(2026)
    const first = dealHand(run, 1, FRESH_ENCOUNTER_DECK)
    const second = dealHand({ ...run, handOfFight: 2 }, 2, closeHand(first))
    expect(second.drawPile).toHaveLength(7)
    expect(second.spentPile).toHaveLength(13)
  })

  it('alternates the dealer on the monotonic hand number, not the per-fight one', () => {
    const run = runWith(2026)
    expect(dealHand(run, 1, FRESH_ENCOUNTER_DECK).dealer).not.toBe(
      dealHand(run, 2, FRESH_ENCOUNTER_DECK).dealer,
    )
  })
})
