import { describe, expect, it } from 'vitest'
import {
  BuffTier,
  cheatBuff,
  mintFromTemplate,
  startEncounter,
  templateById,
  type Buff,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind } from '../roundUiState'
import { discardsRemainingFixture, makeRound } from './roundFixture'

// DLR-153 AC10 — "Removing a buff returns it to the pile, re-lights the hand, and says what went
// dark." This file covers the reducer half only: the pile/pool transition. What re-lights and what
// text is said is Phase 5/6's, not this file's. Mirrors `roundReducer.cancelBuffPoise.test.ts`'s
// shape and fixture pattern.
function uiFrom(buffs: readonly Buff[]) {
  return createRoundUiState({
    round: makeRound(),
    encounter: startEncounter(0),
    baseDamageBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs,
  })
}

const bellsHigh = mintFromTemplate(templateById('suitHigh:bells:magnitude')!, BuffTier.Bronze, 1)
const cheat = cheatBuff(BuffTier.Bronze, 2)

/** Opens the loadout and taps `id` twice — poise then commit — landing the buff `activatedThisTrick`. */
function activated(buffs: readonly Buff[], id: number) {
  const opened = roundReducer(uiFrom(buffs), { kind: RoundUiActionKind.ToggleLoadout })
  const poised = roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id })
  return roundReducer(poised, { kind: RoundUiActionKind.TapBuff, id })
}

const removeBuff = (id: number) => ({ kind: RoundUiActionKind.RemoveBuff, id }) as const

describe('RemoveBuff (AC10, DLR-153)', () => {
  it('puts a revocable Suit High card back in the pile, clears its activation, and restores the AP it cost', () => {
    // AP_ENABLED is `false` (DLR-145) so `spendAp`/`refundAp` are both no-ops today and the pool
    // never moves off `capacity` — asserted below so this spec would catch the pool drifting the
    // moment `AP_ENABLED` flips, without hard-coding a nonzero cost that is currently unspent.
    const startPool = uiFrom([bellsHigh]).buffActivation.apPool
    const ridden = activated([bellsHigh], bellsHigh.id)
    expect(ridden.buffActivation.activatedThisTrick).toContain(bellsHigh.id)
    expect(ridden.buffs.some((b) => b.id === bellsHigh.id)).toBe(false)
    expect(ridden.buffActivation.apPool).toBeLessThanOrEqual(startPool)

    const removed = roundReducer(ridden, removeBuff(bellsHigh.id))
    expect(removed.buffActivation.activatedThisTrick).not.toContain(bellsHigh.id)
    expect(removed.buffActivation.spentThisTrick.some((b) => b.id === bellsHigh.id)).toBe(false)
    expect(removed.buffs.some((b) => b.id === bellsHigh.id)).toBe(true)
    expect(removed.buffActivation.apPool).toBe(startPool)
  })

  it('is a no-op — the state object itself — for a riding Cheat, which is not revocable', () => {
    const ridden = activated([cheat], cheat.id)
    expect(ridden.buffActivation.activatedThisTrick).toContain(cheat.id)
    expect(ridden.cheatTricksRemaining).toBeGreaterThan(0)

    const result = roundReducer(ridden, removeBuff(cheat.id))
    expect(result).toBe(ridden)
    expect(result.cheatTricksRemaining).toBe(ridden.cheatTricksRemaining)
  })

  it('is a no-op — the state object itself — for an id that is not riding this trick', () => {
    const ui = uiFrom([bellsHigh])
    const result = roundReducer(ui, removeBuff(bellsHigh.id))
    expect(result).toBe(ui)
  })

  it('never throws on either refused path', () => {
    const ridden = activated([cheat], cheat.id)
    expect(() => roundReducer(ridden, removeBuff(cheat.id))).not.toThrow()
    expect(() => roundReducer(uiFrom([bellsHigh]), removeBuff(bellsHigh.id))).not.toThrow()
  })

  it('is distinct from CancelBuffPoise — removing a riding buff leaves an unrelated open poise intact', () => {
    const ridden = activated([bellsHigh, cheat], bellsHigh.id)
    // `handleTapBuff`'s commit leaves the panel OPEN (poised: null) — poise the Cheat (still in
    // the pile) without committing it.
    expect(ridden.loadout).not.toBeNull()
    const poised = roundReducer(ridden, { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    expect(poised.loadout?.poised).toBe(cheat.id)

    const removed = roundReducer(poised, removeBuff(bellsHigh.id))
    expect(removed.loadout?.poised).toBe(cheat.id)
    expect(removed.buffActivation.activatedThisTrick).not.toContain(bellsHigh.id)
  })
})
