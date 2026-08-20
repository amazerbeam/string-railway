import { describe, expect, it } from 'vitest'
import { IllegalMoveReason, PlayerSide, Suit, TrickOutcome } from '../../../warCouncil'
import {
  cardAccessibleName,
  CHEAT_ARMED_HINT,
  CHEAT_POISED_HINT,
  ENVENOM_ARMED_HINT,
  ENVENOM_POISED_HINT,
  ILLEGAL_MOVE_MESSAGE,
} from '../labels'
import { deriveHint } from '../roundHint'
import {
  CheatStage,
  createRoundUiState,
  EnvenomStage,
  type ResolvedTrick,
  type RoundUiState,
} from '../roundUiState'
import { card, encounterFixture, envenomChargesFixture, makeRound } from './roundFixture'

// `deriveHint` reads only the fields overridden below plus the two positional flags — everything
// else in the base state is inert as far as this cascade is concerned, so one fixture serves
// every case.
function baseUi(overrides: Partial<RoundUiState> = {}): RoundUiState {
  return {
    ...createRoundUiState({
      round: makeRound(),
      encounter: encounterFixture,
      cheats: [],
      envenomCharges: envenomChargesFixture,
      poisonGuardHeld: false,
      bankClimbBonus: 0,
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
    bankAdded: 1,
    cashOut: 0,
    damageToPlayer: 0,
    bank: 1,
    multiplier: 1,
    cashedAtHandEnd: false,
    envenomTarget: null,
    poisonToQuarry: 0,
    poisonGuardSpent: false,
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
      cheatSelection: { id: 1, stage: CheatStage.Armed },
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

  it('an armed card names itself', () => {
    const armedCard = card(Suit.Bells, 7)
    const armedOnly = baseUi({ armed: armedCard })
    expect(deriveHint(armedOnly, true, false)).toContain(cardAccessibleName(armedCard))

    // …and beats a Cheat selection held at the same time.
    const armedAndCheatSelected = baseUi({
      armed: armedCard,
      cheatSelection: { id: 1, stage: CheatStage.Poised },
    })
    expect(deriveHint(armedAndCheatSelected, true, false)).toBe(deriveHint(armedOnly, true, false))
  })

  it('a Cheat selection reports its stage', () => {
    const poised = baseUi({ cheatSelection: { id: 1, stage: CheatStage.Poised } })
    const armed = baseUi({ cheatSelection: { id: 1, stage: CheatStage.Armed } })
    expect(deriveHint(poised, true, false)).toBe(CHEAT_POISED_HINT)
    expect(deriveHint(armed, true, false)).toBe(CHEAT_ARMED_HINT)
  })

  it('an Envenom selection reports its stage, and beats a Cheat selection held at the same time', () => {
    const poised = baseUi({ envenomStage: EnvenomStage.Poised })
    const armed = baseUi({ envenomStage: EnvenomStage.Armed })
    expect(deriveHint(poised, true, false)).toBe(ENVENOM_POISED_HINT)
    expect(deriveHint(armed, true, false)).toBe(ENVENOM_ARMED_HINT)

    // The reducer makes this pair unreachable, but the cascade's stated priority is pinned
    // regardless of whether the state that exercises it can occur today.
    const both = baseUi({
      envenomStage: EnvenomStage.Armed,
      cheatSelection: { id: 1, stage: CheatStage.Poised },
    })
    expect(deriveHint(both, true, false)).toBe(ENVENOM_ARMED_HINT)
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
})
