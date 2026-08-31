import { describe, expect, it } from 'vitest'
import { isPrimed, PlayerSide, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import {
  BuffTier,
  DuelSide,
  TIMEBOMB_DAMAGE,
  TIMEBOMB_FUSE_TRICKS,
  timebombBuff,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import {
  createRoundUiState,
  RoundUiActionKind,
  timebombFuseLive,
  type RoundUiState,
} from '../roundUiState'
import { discardsRemainingFixture, encounterFixture, makeRound } from './roundFixture'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })

// `deriveHint`'s sibling spec follows the same shape (`roundHint.test.ts:19`) — one seeded base
// state, overridden per case.
function baseUi(
  overrides: Partial<RoundUiState> = {},
  round: Partial<WarCouncilState> = {},
): RoundUiState {
  return {
    ...createRoundUiState({
      round: makeRound(round),
      encounter: encounterFixture,
      blastGuardHeld: false,
      bankClimbBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [],
    }),
    ...overrides,
  }
}

const held = card(Suit.Bells, 2)

describe('the Timebomb fuse — DLR-154 R3', () => {
  it('starts unlit on a fresh felt', () => {
    const ui = baseUi({})
    expect(ui.timebombFuseRemaining).toBe(0)
    expect(timebombFuseLive(ui)).toBe(false)
  })

  it('seeds the fuse when a card takes the mark', () => {
    const armed = baseUi({ timebombArmedDamage: TIMEBOMB_DAMAGE[BuffTier.Bronze] })
    const next = roundReducer(armed, { kind: RoundUiActionKind.TapCard, card: held })
    expect(next.timebombFuseRemaining).toBe(TIMEBOMB_FUSE_TRICKS)
    expect(isPrimed(next.round.primedCards, held)).toBe(true)
  })

  it('keeps priming mode open when an already-primed card is tapped — Assumption 5', () => {
    const armed = baseUi({ timebombArmedDamage: TIMEBOMB_DAMAGE[BuffTier.Bronze] })
    const primed = roundReducer(armed, { kind: RoundUiActionKind.TapCard, card: held })
    const again = roundReducer(primed, { kind: RoundUiActionKind.TapCard, card: held })
    expect(again.timebombArmedDamage).toBe(primed.timebombArmedDamage)
    expect(again.round.primedCards).toHaveLength(1)
  })
})

describe('the Timebomb fuse — DLR-154 R3, the two-trick countdown', () => {
  const bronzeTimebomb = timebombBuff(BuffTier.Bronze, 1)
  // Plain ranks throughout (not Fox=3 or Woodcutter=5), so every commit resolves the trick
  // directly rather than stopping for an AbilityChoice prompt.
  const primedTarget = card(Suit.Bells, 6)
  const first = card(Suit.Bells, 2)
  const second = card(Suit.Bells, 4)

  /** Three hand cards, two of which are played into two ordinary tricks while `primedTarget`
   *  stays held throughout. `drawPile: []` so no hand refill complicates the count. */
  function fuseRound(): WarCouncilState {
    return makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      drawPile: [],
      hands: {
        [PlayerSide.Player]: [first, second, primedTarget],
        [PlayerSide.Cpu]: [card(Suit.Bells, 10), card(Suit.Keys, 2)],
      },
      currentTrick: [],
    })
  }

  function fuseSeed() {
    return createRoundUiState({
      round: fuseRound(),
      encounter: encounterFixture,
      blastGuardHeld: false,
      bankClimbBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [bronzeTimebomb],
    })
  }

  /** Open the panel, poise, then commit the bronze Timebomb — the two-tap flow every row takes. */
  function armTimebomb(ui: RoundUiState): RoundUiState {
    const opened = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
    const poised = roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: bronzeTimebomb.id })
    return roundReducer(poised, { kind: RoundUiActionKind.TapBuff, id: bronzeTimebomb.id })
  }

  /** Arms and commits ONE card (a plain lead or a plain follow — the reducer works out which from
   *  `currentTrick`), then clears the reveal so the felt is ready for the next card. */
  function playOrdinary(ui: RoundUiState, played: Card): RoundUiState {
    const armed = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: played })
    const committed = roundReducer(armed, { kind: RoundUiActionKind.TapCard, card: played })
    return roundReducer(committed, { kind: RoundUiActionKind.CarryOn })
  }

  function primedUi(): RoundUiState {
    const armed = armTimebomb(fuseSeed())
    return roundReducer(armed, { kind: RoundUiActionKind.TapCard, card: primedTarget })
  }

  it('counts down only while the primed card is still held', () => {
    const primed = primedUi()
    expect(primed.timebombFuseRemaining).toBe(TIMEBOMB_FUSE_TRICKS)

    const afterOneTrick = playOrdinary(primed, first)
    expect(afterOneTrick.timebombFuseRemaining).toBe(TIMEBOMB_FUSE_TRICKS - 1)
    expect(isPrimed(afterOneTrick.round.primedCards, primedTarget)).toBe(true)
  })

  it('books player-side damage when the fuse reaches zero, and clears the fuse', () => {
    const primed = primedUi()
    const afterOneTrick = playOrdinary(primed, first)
    const afterTwoTricks = playOrdinary(afterOneTrick, second)

    expect(afterTwoTricks.timebombFuseRemaining).toBe(0)
    expect(afterTwoTricks.encounter.pendingTimebomb[DuelSide.Player]).toBe(
      TIMEBOMB_DAMAGE[BuffTier.Bronze][DuelSide.Player],
    )
  })

  it('lifts the mark when the bomb goes off in hand, so nothing detonates twice', () => {
    const primed = primedUi()
    const afterOneTrick = playOrdinary(primed, first)
    const afterTwoTricks = playOrdinary(afterOneTrick, second)

    expect(isPrimed(afterTwoTricks.round.primedCards, primedTarget)).toBe(false)
  })

  it('stops counting once the primed card has been played', () => {
    const primed = primedUi()
    const afterPlayingThePrimedCard = playOrdinary(primed, primedTarget)
    expect(afterPlayingThePrimedCard.timebombFuseRemaining).toBe(0)
  })
})
