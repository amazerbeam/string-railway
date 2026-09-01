import { describe, expect, it } from 'vitest'
import { BuffTier, cheatBuff, startEncounter, type Buff } from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind } from '../roundUiState'
import { discardsRemainingFixture, makeRound } from './roundFixture'

// AC18 (DLR-148) — `CancelBuffPoise` unwinds ONE level (drops an unspent poise, panel stays
// open); `CancelLoadout` remains the separate action that closes the panel outright. Carved into
// its own file for the same reason `roundReducer.total.test.ts` was: `roundReducer.test.ts`
// crossed the 400-line budget once this describe block landed. Duplicated rather than imported,
// matching the established local pattern those sibling files already document.
function uiFrom(buffs: readonly Buff[]) {
  return createRoundUiState({
    round: makeRound(),
    encounter: startEncounter(0),
    blastGuardHeld: false,
    baseDamageBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs,
  })
}

describe('CancelBuffPoise unwinds one level (AC18, DLR-148)', () => {
  const cheatA = cheatBuff(BuffTier.Bronze, 1)
  const seeded = () => uiFrom([cheatA])
  const opened = () => roundReducer(seeded(), { kind: RoundUiActionKind.ToggleLoadout })
  const cancelPoise = { kind: RoundUiActionKind.CancelBuffPoise } as const

  it('drops an unspent poise and leaves the panel open', () => {
    const poised = roundReducer(opened(), { kind: RoundUiActionKind.TapBuff, id: cheatA.id })
    expect(poised.loadout?.poised).toBe(cheatA.id)

    const next = roundReducer(poised, cancelPoise)
    expect(next.loadout).not.toBeNull()
    expect(next.loadout?.poised).toBeNull()
  })

  it('is a no-op when the panel is open but nothing is poised', () => {
    const ui = opened()
    expect(ui.loadout?.poised).toBeNull()
    const next = roundReducer(ui, cancelPoise)
    expect(next).toBe(ui)
  })

  it('is a no-op when the panel is closed', () => {
    const ui = seeded()
    expect(ui.loadout).toBeNull()
    const next = roundReducer(ui, cancelPoise)
    expect(next).toBe(ui)
  })

  it('leaves CancelLoadout closing the panel outright from both poised and unpoised', () => {
    const cancelLoadout = { kind: RoundUiActionKind.CancelLoadout } as const

    const poised = roundReducer(opened(), { kind: RoundUiActionKind.TapBuff, id: cheatA.id })
    expect(roundReducer(poised, cancelLoadout).loadout).toBeNull()

    expect(roundReducer(opened(), cancelLoadout).loadout).toBeNull()
  })
})
