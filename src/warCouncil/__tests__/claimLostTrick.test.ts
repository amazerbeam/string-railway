import { describe, expect, it } from 'vitest'
import { HuntDeclaration } from '../../hunt'
import { canClaimLostTrick, ClaimRejection, claimLostTrick } from '../claimLostTrick'
import { QUARRY_SIDE } from '../quarryRuleBreak'
import {
  PlayerSide,
  RoundPhase,
  type Card,
  type DeclarationState,
  type RoundState,
  type TrickCard,
} from '../types'

const lead: TrickCard = { side: PlayerSide.Player, card: { suit: 'keys', rank: 1 } }
const follow: TrickCard = { side: QUARRY_SIDE, card: { suit: 'keys', rank: 6 } }
const lostTrick: readonly [TrickCard, TrickCard] = [lead, follow]

// `playCard` appends [lead, follow] to the WINNER's pile, so a trick the Quarry took
// sits at the tail of capturedCards[QUARRY_SIDE].
function afterLostTrick(
  declaration: DeclarationState | undefined,
  quarryPileHead: readonly Card[] = [],
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 1 },
    capturedCards: {
      player: [],
      cpu: [...quarryPileHead, lead.card, follow.card],
    },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 1,
    phase: RoundPhase.AwaitingLead,
    declaration,
  }
}

const losing: DeclarationState = {
  path: HuntDeclaration.Lose,
  creditsRemaining: 2,
  creditedCards: [],
  creditedThrough: 0,
}

describe('claimLostTrick — AC3 success path', () => {
  it('spends one credit and credits both cards', () => {
    const result = claimLostTrick(afterLostTrick(losing), lostTrick)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.declaration?.creditsRemaining).toBe(1)
    expect(result.state.declaration?.creditedCards).toEqual([lead.card, follow.card])
    expect(result.state.declaration?.creditedThrough).toBe(1)
  })

  it('leaves capturedCards untouched — the Quarry still took the trick', () => {
    const before = afterLostTrick(losing)
    const result = claimLostTrick(before, lostTrick)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.capturedCards).toEqual(before.capturedCards)
    expect(result.state.tricksWon).toEqual(before.tricksWon)
  })

  it('does not mutate the input state', () => {
    const before = afterLostTrick(losing)
    claimLostTrick(before, lostTrick)
    expect(before.declaration?.creditsRemaining).toBe(2)
    expect(before.declaration?.creditedCards).toEqual([])
  })

  it('matches the tail even when earlier tricks are already in the pile', () => {
    const withHistory = afterLostTrick(losing, [
      { suit: 'moons', rank: 4 },
      { suit: 'moons', rank: 9 },
    ])
    expect(claimLostTrick(withHistory, lostTrick).ok).toBe(true)
  })
})

describe('claimLostTrick — AC3 rejections', () => {
  it('rejects when the Hunt was never declared', () => {
    expect(claimLostTrick(afterLostTrick(undefined), lostTrick)).toEqual({
      ok: false,
      reason: ClaimRejection.NotDeclaredLose,
    })
  })

  it('rejects when Win was declared', () => {
    const winning: DeclarationState = {
      path: HuntDeclaration.Win,
      creditsRemaining: 0,
      creditedCards: [],
      creditedThrough: 0,
    }
    expect(claimLostTrick(afterLostTrick(winning), lostTrick)).toEqual({
      ok: false,
      reason: ClaimRejection.NotDeclaredLose,
    })
  })

  it('rejects when the pool is empty — AC3’s "no credit left credits nothing"', () => {
    const spent: DeclarationState = { ...losing, creditsRemaining: 0 }
    expect(claimLostTrick(afterLostTrick(spent), lostTrick)).toEqual({
      ok: false,
      reason: ClaimRejection.NoCreditsRemaining,
    })
  })

  it('rejects a second claim on the same trick rather than double-crediting', () => {
    const first = claimLostTrick(afterLostTrick(losing), lostTrick)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(claimLostTrick(first.state, lostTrick)).toEqual({
      ok: false,
      reason: ClaimRejection.TrickAlreadyCredited,
    })
  })

  it('rejects a trick the player won — its cards are in the player’s pile, not the Quarry’s', () => {
    const wonInstead: RoundState = {
      ...afterLostTrick(losing),
      tricksWon: { player: 1, cpu: 0 },
      capturedCards: { player: [lead.card, follow.card], cpu: [] },
    }
    expect(claimLostTrick(wonInstead, lostTrick)).toEqual({
      ok: false,
      reason: ClaimRejection.TrickNotLost,
    })
  })

  it('rejects a trick whose cards are not the pile tail, in order', () => {
    const reversed: readonly [TrickCard, TrickCard] = [follow, lead]
    expect(claimLostTrick(afterLostTrick(losing), reversed)).toEqual({
      ok: false,
      reason: ClaimRejection.TrickNotLost,
    })
  })
})

describe('canClaimLostTrick — the UI derives its control from the same guards', () => {
  it('agrees with claimLostTrick on every case above', () => {
    expect(canClaimLostTrick(afterLostTrick(losing), lostTrick)).toBe(true)
    expect(canClaimLostTrick(afterLostTrick(undefined), lostTrick)).toBe(false)
    expect(canClaimLostTrick(afterLostTrick({ ...losing, creditsRemaining: 0 }), lostTrick)).toBe(
      false,
    )
  })
})
