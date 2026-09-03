import { describe, expect, it } from 'vitest'
import { advanceRun, recordEncounter, startRun } from '../run'
import { startEncounter } from '../encounter'
import { DuelSide } from '../types'
import { COINS_PER_ENCOUNTER_WIN } from '../config'

describe('DLR-96 AC2 — every epic-added RunState field survives advanceRun correctly, together', () => {
  it('run-scoped fields carry through advanceRun; encounter-scoped fields reset', () => {
    const populated = {
      ...startRun(),
      coins: 7,
      whetstones: 3,
      flaskCharges: 2,
      handOfFight: 4,
      lastQuickKillPayout: 5,
    }

    // A winning, resolved encounter to record — the Quarry's bar emptied, the player's did not.
    const wonEncounter = {
      ...startEncounter(populated.encounterIndex, populated.encounter.health[DuelSide.Player]),
      health: { [DuelSide.Player]: 6, [DuelSide.Quarry]: 0 },
      winner: DuelSide.Player,
    }

    const recorded = recordEncounter(
      populated,
      wonEncounter,
      populated.discardsRemaining,
      null,
    )

    // Run-scoped: carried by recordEncounter's spread, untouched by the transition itself.
    expect(recorded.buffs).toBe(populated.buffs)
    expect(recorded.whetstones).toBe(3)

    // lastQuickKillPayout is NOT carried — it is overwritten by every recordEncounter call to the
    // computed payout for that call. unplayedCards is null here, so quick-kill pays 0: this is the
    // reset, not a survival, and is asserted explicitly so the fixture's 5 doesn't mislead a reader.
    expect(recorded.lastQuickKillPayout).toBe(0)

    const advanced = advanceRun(recorded)

    // Run-permanent: survives the fight boundary untouched.
    expect(advanced.whetstones).toBe(3)
    expect(advanced.coins).toBe(populated.coins + COINS_PER_ENCOUNTER_WIN)
    expect(advanced.buffs).toBe(recorded.buffs)
    expect(advanced.flaskCharges).toBe(recorded.flaskCharges)

    // Encounter-scoped: reset at the new fight's start.
    expect(advanced.handOfFight).toBe(1)
    expect(advanced.encounter.winner).toBeNull()
  })
})
