import { describe, expect, it } from 'vitest'
import { HuntDeclaration } from '../../hunt'
import { declareHunt, DeclareRejection } from '../declareHunt'
import { PlayerSide, RoundPhase, type RoundState } from '../types'

function undeclaredRound(overrides: Partial<RoundState> = {}): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    capturedCards: { player: [], cpu: [] },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('declareHunt — AC1', () => {
  it('writes a Win declaration with no credits and no credited cards', () => {
    const result = declareHunt(undeclaredRound(), HuntDeclaration.Win, 3)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.declaration).toEqual({
      path: HuntDeclaration.Win,
      creditsRemaining: 0,
      creditedCards: [],
      creditedThrough: 0,
    })
  })

  it('writes a Lose declaration carrying the supplied credit pool', () => {
    const result = declareHunt(undeclaredRound(), HuntDeclaration.Lose, 3)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.declaration?.path).toBe(HuntDeclaration.Lose)
    expect(result.state.declaration?.creditsRemaining).toBe(3)
  })

  it('does not mutate the input state', () => {
    const before = undeclaredRound()
    declareHunt(before, HuntDeclaration.Lose, 3)
    expect(before.declaration).toBeUndefined()
  })

  it('rejects a second declaration', () => {
    const first = declareHunt(undeclaredRound(), HuntDeclaration.Win, 3)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const second = declareHunt(first.state, HuntDeclaration.Lose, 3)
    expect(second).toEqual({ ok: false, reason: DeclareRejection.AlreadyDeclared })
  })

  it('rejects a declaration once a trick has been played', () => {
    const result = declareHunt(undeclaredRound({ tricksPlayed: 1 }), HuntDeclaration.Win, 3)
    expect(result).toEqual({ ok: false, reason: DeclareRejection.HuntUnderway })
  })

  it('rejects a declaration once a card is on the table', () => {
    const underway = undeclaredRound({
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'bells', rank: 4 } }],
      phase: RoundPhase.AwaitingFollow,
    })
    expect(declareHunt(underway, HuntDeclaration.Win, 3)).toEqual({
      ok: false,
      reason: DeclareRejection.HuntUnderway,
    })
  })
})
