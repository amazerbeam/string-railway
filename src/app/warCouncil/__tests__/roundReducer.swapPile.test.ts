// DLR-163 AC5/AC6 — the Swap pile grows when the PLAYER commits a Woodcutter. The rule itself is
// `swapPileAfterWoodcutter` in `src/hunt/`; what this file pins is that `commit` applies it, once,
// on the right card, and marks where the addition went.
import { describe, expect, it } from 'vitest'
import { DISCARDS_PER_FIGHT, startEncounter, swapCapFor } from '../../../hunt'
import { PlayerSide, Suit, type WarCouncilState } from '../../../warCouncil'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { card, makeRound } from './roundFixture'

const WOODCUTTER = card(Suit.Moons, 5)
const PLAIN = card(Suit.Keys, 8)

function uiFrom(round: WarCouncilState, discardsRemaining = DISCARDS_PER_FIGHT): RoundUiState {
  return createRoundUiState({
    round,
    encounter: startEncounter(0),
    baseDamageBonus: 0,
    discardsRemaining,
    buffs: [],
  })
}

/** Two taps: the first arms, the second commits. DLR-163 removed the 5's prompt, so a Woodcutter
 *  commits on the second tap like any plain card. */
function playTwice(ui: RoundUiState, c: ReturnType<typeof card>): RoundUiState {
  return roundReducer(roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: c }), {
    kind: RoundUiActionKind.TapCard,
    card: c,
  })
}

/** The player leads, the Quarry answers automatically, and the resolved trick is dismissed — the
 *  felt's `canAct` guard refuses a tap while a resolution is on screen. */
function playTrick(ui: RoundUiState, c: ReturnType<typeof card>): RoundUiState {
  return roundReducer(playTwice(ui, c), { kind: RoundUiActionKind.CarryOn })
}

/**
 * A round the player leads and keeps leading: the Quarry holds only Keys, so it can neither follow
 * a Moons lead nor trump one (trump is Bells), and the player takes trick 1 and leads trick 2.
 * Needed because `commit` refuses a tap when it is not the player's turn — without this the second
 * commit in a stacking test silently no-ops and the assertion measures nothing.
 */
function twoLeadsForThePlayer(): WarCouncilState {
  return makeRound({
    hands: {
      [PlayerSide.Player]: [card(Suit.Moons, 5), card(Suit.Bells, 5), card(Suit.Keys, 8)],
      [PlayerSide.Cpu]: [card(Suit.Keys, 2), card(Suit.Keys, 6)],
    },
  })
}

describe('the Swap pile on a committed Woodcutter (DLR-163 AC5)', () => {
  it('raises both figures by one', () => {
    const after = playTwice(uiFrom(makeRound()), WOODCUTTER)
    expect(after.discardsRemaining).toBe(DISCARDS_PER_FIGHT + 1)
    expect(after.discardCapBonus).toBe(1)
    expect(swapCapFor(after.discardCapBonus)).toBe(DISCARDS_PER_FIGHT + 1)
  })

  it('at 0 remaining it gives 1 of 4 — the pile is filled by exactly the step', () => {
    const after = playTwice(uiFrom(makeRound(), 0), WOODCUTTER)
    expect(after.discardsRemaining).toBe(1)
    expect(swapCapFor(after.discardCapBonus)).toBe(DISCARDS_PER_FIGHT + 1)
  })

  it('at full it gives 4 of 4 — never refused for a full pile', () => {
    const after = playTwice(uiFrom(makeRound()), WOODCUTTER)
    expect(after.discardsRemaining).toBe(4)
    expect(swapCapFor(after.discardCapBonus)).toBe(4)
  })

  it('AC6 — swapJustRaised is true after that commit and false after the next', () => {
    // The Quarry holds only Keys, so the player's Moons lead takes trick 1 and leads trick 2 —
    // otherwise the second tap below would be refused as not the player's turn.
    const raised = playTwice(uiFrom(twoLeadsForThePlayer()), WOODCUTTER)
    expect(raised.swapJustRaised).toBe(true)
    // The resolution has to be dismissed before the next lead is accepted.
    const next = playTwice(roundReducer(raised, { kind: RoundUiActionKind.CarryOn }), PLAIN)
    expect(next.swapJustRaised).toBe(false)
  })

  it('committing any other rank changes neither figure', () => {
    const after = playTwice(uiFrom(makeRound()), PLAIN)
    expect(after.discardsRemaining).toBe(DISCARDS_PER_FIGHT)
    expect(after.discardCapBonus).toBe(0)
  })

  it('AC11 — two Woodcutters stack to a cap of 5', () => {
    let ui = uiFrom(twoLeadsForThePlayer())
    ui = playTrick(ui, WOODCUTTER)
    ui = playTrick(ui, card(Suit.Bells, 5))
    expect(ui.discardCapBonus).toBe(2)
    expect(swapCapFor(ui.discardCapBonus)).toBe(DISCARDS_PER_FIGHT + 2)
  })
})
