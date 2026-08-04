import { describe, expect, it } from 'vitest'
import { startBattle } from '../startBattle'
import { BattlePhase } from '../battlePhase'
import { WAR_COUNCIL_FIRST_DEALER } from '../config'
import { RoundPhase } from '../../warCouncil'

describe('startBattle', () => {
  it('starts round 1 in the WarCouncilRound phase, dealt by the configured first dealer', () => {
    const state = startBattle(() => 0.5)
    expect(state.phase).toBe(BattlePhase.WarCouncilRound)
    expect(state.round).toBe(1)
    expect(state.dealer).toBe(WAR_COUNCIL_FIRST_DEALER)
    if (state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
    expect(state.warCouncil.dealer).toBe(WAR_COUNCIL_FIRST_DEALER)
    expect(state.warCouncil.phase).toBe(RoundPhase.AwaitingLead)
    expect(state.warCouncil.hands.player).toHaveLength(13)
    expect(state.warCouncil.hands.cpu).toHaveLength(13)
  })

  it('creates a fresh Vanguard board on every call, not a shared reference', () => {
    const a = startBattle(() => 0.1)
    const b = startBattle(() => 0.1)
    expect(a.vanguard).not.toBe(b.vanguard)
  })
})
