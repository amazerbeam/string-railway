import { describe, expect, it } from 'vitest'
import { HuntDeclaration } from '../../hunt'
import { spoils } from '../spoils'
import { PlayerSide, RoundPhase, type Card, type DeclarationState, type RoundState } from '../types'

function stateWithCaptured(
  capturedCards: Record<'player' | 'cpu', Card[]>,
  tricksWon: Record<'player' | 'cpu', number>,
  declaration?: DeclarationState,
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon,
    capturedCards,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: tricksWon.player + tricksWon.cpu,
    phase: RoundPhase.AwaitingLead,
    declaration,
  }
}

describe('spoils — §3 flat-value identity (AC6)', () => {
  it('equals 2 × tricksWon under a flat card value of 1, with no Poison/Treasure in the capture set', () => {
    const captured = {
      player: [
        { suit: 'bells' as const, rank: 2 },
        { suit: 'keys' as const, rank: 3 },
        { suit: 'moons' as const, rank: 4 },
        { suit: 'bells' as const, rank: 5 },
      ],
      cpu: [],
    }
    const state = stateWithCaptured(captured, { player: 2, cpu: 0 })
    expect(spoils(state, 'player', () => 1)).toBe(2 * state.tricksWon.player)
  })
})

describe('spoils — rank-weighted default with Poison/Treasure (AC7)', () => {
  it('sums printed rank and folds in Poison(-1)/Treasure(+1) per capture', () => {
    const captured = {
      player: [
        { suit: 'bells' as const, rank: 4 }, // 4
        { suit: 'keys' as const, rank: 7 }, // Treasure: 7 + 1 = 8
        { suit: 'moons' as const, rank: 8 }, // Poison: 8 - 1 = 7
        { suit: 'bells' as const, rank: 11 }, // 11
      ],
      cpu: [],
    }
    const state = stateWithCaptured(captured, { player: 2, cpu: 0 })
    // hand-computed: 4 + (7+1) + (8-1) + 11 = 30
    expect(spoils(state, 'player')).toBe(30)
  })

  it('returns 0 for a side with no captured cards', () => {
    const state = stateWithCaptured({ player: [], cpu: [] }, { player: 0, cpu: 0 })
    expect(spoils(state, 'player')).toBe(0)
    expect(spoils(state, 'cpu')).toBe(0)
  })
})

describe('spoils — DLR-63 AC3, the Lose branch', () => {
  const credited = [
    { suit: 'keys' as const, rank: 1 }, // inverts to 11
    { suit: 'keys' as const, rank: 6 }, // inverts to 6
  ]

  const losing: DeclarationState = {
    path: HuntDeclaration.Lose,
    creditsRemaining: 2,
    creditedCards: credited,
    creditedThrough: 1,
  }

  it('sums credited cards at their inverted values, ignoring the capture pile', () => {
    const state = {
      ...stateWithCaptured({ player: [], cpu: [...credited] }, { player: 0, cpu: 1 }),
      declaration: losing,
    }
    // 11 + 6 = 17
    expect(spoils(state, 'player')).toBe(17)
  })

  it('returns 0 for a Lose declaration with nothing credited yet', () => {
    const state = {
      ...stateWithCaptured({ player: [], cpu: [...credited] }, { player: 0, cpu: 1 }),
      declaration: { ...losing, creditedCards: [] },
    }
    expect(spoils(state, 'player')).toBe(0)
  })

  it('folds Treasure(+1) and Poison(-1) into credited cards, as on the Win path', () => {
    const state = {
      ...stateWithCaptured({ player: [], cpu: [] }, { player: 0, cpu: 1 }),
      declaration: {
        ...losing,
        creditedCards: [
          { suit: 'keys' as const, rank: 7 }, // Treasure: (12-7) + 1 = 6
          { suit: 'moons' as const, rank: 8 }, // Poison:   (12-8) - 1 = 3
        ],
      },
    }
    expect(spoils(state, 'player')).toBe(9)
  })

  it('leaves the Quarry on its own capture pile at base value — nothing scores the Quarry', () => {
    const state = {
      ...stateWithCaptured(
        { player: [], cpu: [{ suit: 'bells' as const, rank: 4 }] },
        { player: 0, cpu: 1 },
      ),
      declaration: losing,
    }
    expect(spoils(state, 'cpu')).toBe(4)
  })
})

describe('spoils — DLR-63 AC2, the Win and undeclared branches are identical', () => {
  const captured = {
    player: [
      { suit: 'bells' as const, rank: 4 },
      { suit: 'keys' as const, rank: 11 },
    ],
    cpu: [],
  }

  it('scores a Win declaration exactly as an undeclared round', () => {
    const undeclared = stateWithCaptured(captured, { player: 1, cpu: 0 })
    const declared = {
      ...undeclared,
      declaration: {
        path: HuntDeclaration.Win,
        creditsRemaining: 0,
        creditedCards: [],
        creditedThrough: 0,
      } satisfies DeclarationState,
    }
    expect(spoils(declared, 'player')).toBe(spoils(undeclared, 'player'))
    expect(spoils(declared, 'player')).toBe(15)
  })
})
