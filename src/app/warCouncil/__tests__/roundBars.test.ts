import { describe, expect, it } from 'vitest'
import { DuelSide } from '../../../hunt'
import {
  baseDamageBonusFixture,
  discardsRemainingFixture,
  encounterFixture,
  maxHealthFixture,
  makeRound,
} from './roundFixture'
import { createRoundUiState } from '../roundUiState'
import { barsForRound } from '../roundBars'

function seededUi(encounter = encounterFixture) {
  return createRoundUiState({
    round: makeRound(),
    encounter,
    baseDamageBonus: baseDamageBonusFixture,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
  })
}

describe('barsForRound — the round screen’s assembly, split out of WarCouncilRound.tsx on DLR-101', () => {
  it('previews nothing on either bar with no streak standing', () => {
    const ui = seededUi()
    const bars = barsForRound(ui, maxHealthFixture)
    const player = bars.find((v) => v.side === DuelSide.Player)!
    const quarry = bars.find((v) => v.side === DuelSide.Quarry)!
    expect(player.pending).toBe(0)
    expect(quarry.pending).toBe(0)
  })

  it('previews a standing streak on the Quarry’s bar only — the player is never at risk from it', () => {
    const ui = seededUi()
    const withStreak = { ...ui, round: { ...ui.round, total: 2, roll: 2 } }
    const bars = barsForRound(withStreak, maxHealthFixture)
    const player = bars.find((v) => v.side === DuelSide.Player)!
    const quarry = bars.find((v) => v.side === DuelSide.Quarry)!
    expect(quarry.pending).toBe(4)
    expect(player.pending).toBe(0)
  })
})
