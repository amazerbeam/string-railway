// DLR-163 AC8/AC11 — the fight's earned base damage: what a banked Treasure trick adds, when it
// starts applying, and how it sums with the Whetstone figure.
//
// The ordering is the load-bearing part: `playOptions` is read with the figure as it stood BEFORE
// the trick, so a 7 never pays its own trick. That is AC8's "for the rest of the fight".
import { describe, expect, it } from 'vitest'
import {
  BASE_DAMAGE,
  DISCARDS_PER_FIGHT,
  startEncounter,
  TREASURE_BASE_DAMAGE_STEP,
} from '../../../hunt'
import { PlayerSide, Suit, type WarCouncilState } from '../../../warCouncil'
import { playOptions } from '../commitHandlers'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { card, makeRound } from './roundFixture'

/**
 * A round the player leads and keeps leading, holding three Treasures. The Quarry holds only Keys,
 * so it can neither follow a Moons lead nor trump one (trump is Bells) and the player takes every
 * trick — which is what makes each Treasure trick a BANKED one.
 */
function treasureLeads(): WarCouncilState {
  return makeRound({
    hands: {
      [PlayerSide.Player]: [
        card(Suit.Moons, 7),
        card(Suit.Moons, 6),
        card(Suit.Moons, 4),
        card(Suit.Bells, 7),
        card(Suit.Keys, 7),
      ],
      // Deliberately no Witch (9) and no Monarch (11): both carry rank rules that would decide
      // the trick, and this fixture is measuring the Treasure, not the ladder. Every card here
      // loses to every card the player leads.
      [PlayerSide.Cpu]: [card(Suit.Keys, 2), card(Suit.Keys, 4), card(Suit.Keys, 6)],
    },
  })
}

function uiFrom(round: WarCouncilState, baseDamageBonus = 0): RoundUiState {
  return createRoundUiState({
    round,
    encounter: startEncounter(0),
    baseDamageBonus,
    discardsRemaining: DISCARDS_PER_FIGHT,
    buffs: [],
  })
}

/** Lead the card, let the Quarry answer, and dismiss the resolution. */
function playTrick(ui: RoundUiState, c: ReturnType<typeof card>): RoundUiState {
  const armed = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: c })
  const committed = roundReducer(armed, { kind: RoundUiActionKind.TapCard, card: c })
  return roundReducer(committed, { kind: RoundUiActionKind.CarryOn })
}

describe('the fight base-damage figure (DLR-163 AC8/AC11)', () => {
  it('AC8 — banking a Treasure trick climbs it by TREASURE_BASE_DAMAGE_STEP', () => {
    const after = playTrick(uiFrom(treasureLeads()), card(Suit.Moons, 7))
    expect(after.treasureDamageBonus).toBe(TREASURE_BASE_DAMAGE_STEP)
  })

  it("AC8 — the climb applies to the NEXT trick's damage, not to the trick that earned it", () => {
    const ui = uiFrom(treasureLeads())
    // The trick that EARNS the bonus is resolved against the figure as it stood before it.
    expect(playOptions(ui).baseDamageBonus).toBe(0)
    const earned = playTrick(ui, card(Suit.Moons, 7))
    // Its own banked damage is the bare rule — no bonus applied to itself.
    expect(earned.round.total).toBe(BASE_DAMAGE)
    // The NEXT trick sees it.
    expect(playOptions(earned).baseDamageBonus).toBe(TREASURE_BASE_DAMAGE_STEP)
  })

  it('AC11 — three banked Treasure tricks give +3', () => {
    let ui = uiFrom(treasureLeads())
    ui = playTrick(ui, card(Suit.Moons, 7))
    ui = playTrick(ui, card(Suit.Bells, 7))
    ui = playTrick(ui, card(Suit.Keys, 7))
    expect(ui.treasureDamageBonus).toBe(3 * TREASURE_BASE_DAMAGE_STEP)
    expect(ui.round.tricksWon[PlayerSide.Player]).toBe(3)
  })

  it('AC8 — it SUMS with the Whetstone figure rather than replacing it', () => {
    const withWhetstone = uiFrom(treasureLeads(), 2)
    expect(playOptions(withWhetstone).baseDamageBonus).toBe(2)
    const after = playTrick(withWhetstone, card(Suit.Moons, 7))
    expect(after.baseDamageBonus).toBe(2)
    expect(playOptions(after).baseDamageBonus).toBe(2 + TREASURE_BASE_DAMAGE_STEP)
  })

  it('a trick with no Treasure in it leaves the figure alone', () => {
    const after = playTrick(uiFrom(treasureLeads()), card(Suit.Moons, 6))
    expect(after.treasureDamageBonus).toBe(0)
  })
})
