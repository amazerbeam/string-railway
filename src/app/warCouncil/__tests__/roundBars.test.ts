import { describe, expect, it } from 'vitest'
import { DuelSide, queueTimebomb } from '../../../hunt'
import {
  bankClimbBonusFixture,
  discardsRemainingFixture,
  encounterFixture,
  timebombChargesFixture,
  maxHealthFixture,
  makeRound,
  poisonGuardHeldFixture,
} from './roundFixture'
import { createRoundUiState } from '../roundUiState'
import { barsForRound } from '../roundBars'

function seededUi(encounter = encounterFixture) {
  return createRoundUiState({
    round: makeRound(),
    encounter,
    cheats: [],
    timebombCharges: timebombChargesFixture,
    poisonGuardHeld: poisonGuardHeldFixture,
    bankClimbBonus: bankClimbBonusFixture,
    discardsRemaining: discardsRemainingFixture,
  })
}

describe('barsForRound — the round screen’s assembly, split out of WarCouncilRound.tsx on DLR-101', () => {
  it('reproduces the pre-DLR-101 row when no poison is booked', () => {
    const ui = seededUi()
    const bars = barsForRound(ui, maxHealthFixture)
    const player = bars.find((v) => v.side === DuelSide.Player)!
    const quarry = bars.find((v) => v.side === DuelSide.Quarry)!
    expect(player.doomed).toBe(0)
    expect(quarry.doomed).toBe(0)
    expect(player.pending).toBe(0)
    expect(quarry.pending).toBe(0)
  })

  it('shows the booked hit on the Quarry’s bar when poison is queued against it, leaving the player untouched', () => {
    const encounter = queueTimebomb(encounterFixture, DuelSide.Quarry)
    const ui = seededUi(encounter)
    const bars = barsForRound(ui, maxHealthFixture)
    const player = bars.find((v) => v.side === DuelSide.Player)!
    const quarry = bars.find((v) => v.side === DuelSide.Quarry)!
    expect(quarry.doomed).toBeGreaterThan(0)
    expect(quarry.doomed).toBe(encounter.pendingTimebomb[DuelSide.Quarry])
    expect(player.doomed).toBe(0)
  })

  it('mirrors onto the player’s bar when poison is queued against them, leaving the Quarry untouched', () => {
    const encounter = queueTimebomb(encounterFixture, DuelSide.Player)
    const ui = seededUi(encounter)
    const bars = barsForRound(ui, maxHealthFixture)
    const player = bars.find((v) => v.side === DuelSide.Player)!
    const quarry = bars.find((v) => v.side === DuelSide.Quarry)!
    expect(player.doomed).toBeGreaterThan(0)
    expect(player.doomed).toBe(encounter.pendingTimebomb[DuelSide.Player])
    expect(quarry.doomed).toBe(0)
  })
})
