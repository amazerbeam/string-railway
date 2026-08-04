import { describe, expect, it } from 'vitest'
import { beginClash } from '../beginClash'
import { startBattle } from '../startBattle'
import { BattlePhase } from '../battlePhase'
import { BattleRejectionReason } from '../battleAction'
import { autoPlayWarCouncilRound } from './battleTestHelpers'
import { ClashStatus, MUSTER_BASELINE, openingSideForRound } from '../../vanguard'

describe('beginClash', () => {
  it('rejects a call outside the MusterConversion phase', () => {
    const state = startBattle(() => 0.5)
    const result = beginClash(state)
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotMusterConversionPhase })
  })

  it('converts the completed round score into Muster and opens the Clash', () => {
    const started = startBattle(() => 0.42)
    const afterRound = autoPlayWarCouncilRound(started)
    if (afterRound.phase !== BattlePhase.MusterConversion) throw new Error('expected MusterConversion')

    const result = beginClash(afterRound)
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.state.phase).toBe(BattlePhase.Clash)
    if (result.state.phase !== BattlePhase.Clash) throw new Error('expected Clash')
    expect(result.state.clash.status).toBe(ClashStatus.InProgress)
    if (result.state.clash.status !== ClashStatus.InProgress) throw new Error('expected InProgress')
    expect(result.state.clash.muster.player).toBeGreaterThanOrEqual(MUSTER_BASELINE)
    expect(result.state.clash.muster.cpu).toBeGreaterThanOrEqual(MUSTER_BASELINE)
    expect(result.state.clash.turn).toBe(openingSideForRound(afterRound.round))
    expect(result.state.clash.board).toBe(afterRound.vanguard)
  })
})
