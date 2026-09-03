import { describe, expect, it } from 'vitest'
import { IllegalMoveReason, PlayerSide, Suit, TrickOutcome } from '../../../warCouncil'
import {
  cardAccessibleName,
  DISCARD_READY_HINT,
  DISCARD_SELECT_HINT,
  ILLEGAL_MOVE_MESSAGE,
} from '../labels'
import { deriveHint } from '../roundHint'
import { createRoundUiState, type ResolvedTrick, type RoundUiState } from '../roundUiState'
import { card, discardsRemainingFixture, encounterFixture, makeRound } from './roundFixture'

// `deriveHint` reads only the fields overridden below plus the two positional flags — everything
// else in the base state is inert as far as this cascade is concerned, so one fixture serves
// every case.
function baseUi(overrides: Partial<RoundUiState> = {}): RoundUiState {
  return {
    ...createRoundUiState({
      round: makeRound(),
      encounter: encounterFixture,
      baseDamageBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [],
    }),
    ...overrides,
  }
}

const someResolvedTrick: ResolvedTrick = {
  cards: [
    { side: PlayerSide.Player, card: card(Suit.Bells, 7) },
    { side: PlayerSide.Cpu, card: card(Suit.Bells, 4) },
  ],
  winner: PlayerSide.Player,
  resolution: {
    outcome: TrickOutcome.CleanWin,
    trickDamage: { base: 1, buffDamage: 0, buffMult: 1, overlapBonus: 0, dealt: 1 },
    cashOut: 0,
    damageToPlayer: 0,
    total: 1,
    roll: 1,
    buffAccrual: null,
    firedBuffIds: [],
  },
}

describe('deriveHint — the cascade’s own priority order', () => {
  it('a rejection beats everything else in the cascade', () => {
    const rejectionOnly = baseUi({ rejection: IllegalMoveReason.MustFollowLeadSuit })
    const rejectionAndEverythingElse = baseUi({
      rejection: IllegalMoveReason.MustFollowLeadSuit,
      prompt: card(Suit.Keys, 3),
      resolvedTrick: someResolvedTrick,
      armed: card(Suit.Moons, 5),
      cheatTricksRemaining: 2,
    })
    const expected = ILLEGAL_MOVE_MESSAGE[IllegalMoveReason.MustFollowLeadSuit]
    expect(deriveHint(rejectionOnly, true, true)).toBe(expected)
    expect(deriveHint(rejectionAndEverythingElse, true, true)).toBe(expected)
  })

  it('an open prompt beats a held trick', () => {
    const promptOnly = baseUi({ prompt: card(Suit.Keys, 3) })
    const promptAndTrick = baseUi({ prompt: card(Suit.Keys, 3), resolvedTrick: someResolvedTrick })
    expect(deriveHint(promptAndTrick, true, true)).toBe(deriveHint(promptOnly, true, true))
  })

  it('a held trick beats the Quarry’s pending lead', () => {
    const trickHeld = baseUi({ resolvedTrick: someResolvedTrick })
    expect(deriveHint(trickHeld, true, true)).toBe(deriveHint(trickHeld, true, false))
  })

  it('an armed card names itself, and beats a live Cheat held at the same time', () => {
    const armedCard = card(Suit.Bells, 7)
    const armedOnly = baseUi({ armed: armedCard })
    expect(deriveHint(armedOnly, true, false)).toContain(cardAccessibleName(armedCard))

    const armedAndCheatLive = baseUi({ armed: armedCard, cheatTricksRemaining: 2 })
    expect(deriveHint(armedAndCheatLive, true, false)).toBe(deriveHint(armedOnly, true, false))
  })

  it('DLR-132 — a live Cheat needs no hint of its own — it is visible in the fan’s widened legal set', () => {
    const cheatLive = baseUi({ cheatTricksRemaining: 2 })
    expect(deriveHint(cheatLive, true, false)).not.toBe('')
    expect(deriveHint(cheatLive, true, false)).toBe(deriveHint(baseUi(), true, false))
  })


  it('an interactive state names lead-vs-follow, distinctly', () => {
    const toLead = baseUi({ round: makeRound({ currentTrick: [] }) })
    const toFollow = baseUi({
      round: makeRound({
        currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 9) }],
      }),
    })
    const leadHint = deriveHint(toLead, true, false)
    const followHint = deriveHint(toFollow, true, false)
    expect(leadHint).not.toBe('')
    expect(followHint).not.toBe('')
    expect(leadHint).not.toBe(followHint)
  })

  it('a non-interactive state with nothing selected returns the empty string', () => {
    expect(deriveHint(baseUi(), false, false)).toBe('')
  })

  it('DLR-100 — an open discard selection reports select-vs-ready, and beats the Quarry’s pending lead', () => {
    const selecting = baseUi({ discardSelection: [] })
    const ready = baseUi({ discardSelection: [card(Suit.Bells, 7)] })
    expect(deriveHint(selecting, true, true)).toBe(DISCARD_SELECT_HINT)
    expect(deriveHint(ready, true, true)).toBe(DISCARD_READY_HINT)
  })
})
