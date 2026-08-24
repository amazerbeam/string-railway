import { describe, expect, it } from 'vitest'
import { DuelSide, queueTimebomb } from '../../../hunt'
import {
  bankClimbBonusFixture,
  discardsRemainingFixture,
  encounterFixture,
  timebombChargesFixture,
  maxHealthFixture,
  makeRound,
  blastGuardHeldFixture,
} from './roundFixture'
import { createRoundUiState } from '../roundUiState'
import { barsForRound } from '../roundBars'

function seededUi(encounter = encounterFixture) {
  return createRoundUiState({
    round: makeRound(),
    encounter,
    cheats: [],
    timebombCharges: timebombChargesFixture,
    blastGuardHeld: blastGuardHeldFixture,
    bankClimbBonus: bankClimbBonusFixture,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
  })
}

describe('barsForRound — the round screen’s assembly, split out of WarCouncilRound.tsx on DLR-101', () => {
  it('reproduces the pre-DLR-101 row when no Timebomb is booked', () => {
    const ui = seededUi()
    const bars = barsForRound(ui, maxHealthFixture)
    const player = bars.find((v) => v.side === DuelSide.Player)!
    const quarry = bars.find((v) => v.side === DuelSide.Quarry)!
    expect(player.ticking).toBe(0)
    expect(quarry.ticking).toBe(0)
    expect(player.pending).toBe(0)
    expect(quarry.pending).toBe(0)
  })

  it('shows the booked hit on the Quarry’s bar when a Timebomb is queued against it, leaving the player untouched', () => {
    const encounter = queueTimebomb(encounterFixture, DuelSide.Quarry)
    const ui = seededUi(encounter)
    const bars = barsForRound(ui, maxHealthFixture)
    const player = bars.find((v) => v.side === DuelSide.Player)!
    const quarry = bars.find((v) => v.side === DuelSide.Quarry)!
    expect(quarry.ticking).toBeGreaterThan(0)
    expect(quarry.ticking).toBe(encounter.pendingTimebomb[DuelSide.Quarry])
    expect(player.ticking).toBe(0)
  })

  it('mirrors onto the player’s bar when a Timebomb is queued against them, leaving the Quarry untouched', () => {
    const encounter = queueTimebomb(encounterFixture, DuelSide.Player)
    const ui = seededUi(encounter)
    const bars = barsForRound(ui, maxHealthFixture)
    const player = bars.find((v) => v.side === DuelSide.Player)!
    const quarry = bars.find((v) => v.side === DuelSide.Quarry)!
    expect(player.ticking).toBeGreaterThan(0)
    expect(player.ticking).toBe(encounter.pendingTimebomb[DuelSide.Player])
    expect(quarry.ticking).toBe(0)
  })
})
