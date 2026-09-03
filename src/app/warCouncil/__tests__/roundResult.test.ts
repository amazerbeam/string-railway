import { describe, expect, it } from 'vitest'
import { startEncounter } from '../../../hunt'
import { createRoundUiState } from '../roundUiState'
import { roundResultFor } from '../roundResult'
import { discardsRemainingFixture, makeRound } from './roundFixture'

// The seed pattern `roundReducer.test.ts`'s `uiFrom` already uses — spelled once here since this
// spec needs only one state, not a family of them.
function seededUi() {
  const round = makeRound()
  const encounter = startEncounter(0)
  return createRoundUiState({
    round,
    encounter,
    baseDamageBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
  })
}

describe('roundResultFor', () => {
  it('reports every field straight off the state it was given', () => {
    const ui = seededUi()
    const result = roundResultFor(ui)

    expect(result.finalState).toBe(ui.round)
    expect(result.encounter).toBe(ui.encounter)
    expect(result.discardsRemaining).toBe(ui.discardsRemaining)
    expect(result.buffs).toBe(ui.buffs)
    expect(result.unplayedAtResolve).toBe(ui.unplayedAtResolve)
    expect(result.coinsEarned).toBe(ui.buffHand.coinsEarned)
  })

  it('reads coinsEarned through buffHand rather than a constant', () => {
    const ui = seededUi()
    const uiWithCoins = { ...ui, buffHand: { ...ui.buffHand, coinsEarned: 7 } }

    expect(roundResultFor(uiWithCoins).coinsEarned).toBe(7)
  })

  // DLR-156 AC8 — the regression `WarCouncilRound.feederCarry.test.tsx` was written to prevent, for
  // the streak: a carry can reach `WarCouncilMountProps` and `RoundUiSeed` correctly and still be
  // dropped between the seed and the reducer's own opening state, or between the reducer's state
  // and what `roundResultFor` reads back. This crosses BOTH seams — `createRoundUiState`'s seeding
  // of `round.total`/`round.roll` from `seed.streak`, and `roundResultFor`'s read of them back out —
  // and asserts the tricks played land ON TOP of the opening figures rather than from zero.
  it('opens the hand on the seeded streak and hands back a result built on top of it, not from zero', () => {
    const round = makeRound()
    const encounter = startEncounter(0)
    const ui = createRoundUiState({
      round,
      encounter,
      baseDamageBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [],
      streak: { total: 12, roll: 2 },
    })

    // The deal's hard `total: 0, roll: 0` are overwritten by the seeded streak, not left standing.
    expect(ui.round.total).toBe(12)
    expect(ui.round.roll).toBe(2)
    expect(roundResultFor(ui).streak).toEqual({ total: 12, roll: 2 })

    // A trick landing on top of that opening — simulating what `resolveTrickBank` would have
    // written into `ui.round` — must be reported as 12 + this trick's damage, never as though the
    // hand had opened at zero.
    const afterATrick = { ...ui, round: { ...ui.round, total: 21, roll: 3 } }
    expect(roundResultFor(afterATrick).streak).toEqual({ total: 21, roll: 3 })
  })
})
