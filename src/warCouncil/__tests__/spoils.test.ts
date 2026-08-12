import { describe, expect, it } from 'vitest'
import { cardValueFor, HuntDeclaration } from '../../hunt'
import { spoils } from '../spoils'
import {
  CardRank,
  PlayerSide,
  RoundPhase,
  type Card,
  type DeclarationState,
  type RoundState,
} from '../types'

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

describe('spoils — the flat-value identity survives (§3)', () => {
  it('equals 2 × tricksWon under a flat card value of 1', () => {
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

  it('returns 0 for a side with no captured cards', () => {
    const state = stateWithCaptured({ player: [], cpu: [] }, { player: 0, cpu: 0 })
    expect(spoils(state, 'player')).toBe(0)
    expect(spoils(state, 'cpu')).toBe(0)
  })
})

describe('spoils — no modifier of any kind is applied (§1, DLR-67)', () => {
  it('scores a Treasure and a Poison at their bare configured value, with no ±1', () => {
    const captured = {
      player: [
        { suit: 'keys' as const, rank: CardRank.Treasure },
        { suit: 'moons' as const, rank: CardRank.Poison },
      ],
      cpu: [],
    }
    const state = stateWithCaptured(captured, { player: 1, cpu: 0 })
    const value = cardValueFor(HuntDeclaration.Win)
    expect(spoils(state, 'player')).toBe(value(CardRank.Treasure) + value(CardRank.Poison))
  })
})

describe('spoils — the declaration governs the value scheme for BOTH sides (AC4)', () => {
  const captured = {
    player: [{ suit: 'bells' as const, rank: 1 }],
    cpu: [{ suit: 'keys' as const, rank: 11 }],
  }

  it.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
    'values each side’s own pile through cardValueFor(%s)',
    (path) => {
      const state = { ...stateWithCaptured(captured, { player: 1, cpu: 1 }), declaration: { path } }
      const value = cardValueFor(path)
      expect(spoils(state, 'player')).toBe(value(1))
      expect(spoils(state, 'cpu')).toBe(value(11))
    },
  )

  it('reads an undeclared round as Win, identically to a declared one', () => {
    const undeclared = stateWithCaptured(captured, { player: 1, cpu: 1 })
    const declared = { ...undeclared, declaration: { path: HuntDeclaration.Win } }
    expect(spoils(undeclared, 'player')).toBe(spoils(declared, 'player'))
    expect(spoils(undeclared, 'cpu')).toBe(spoils(declared, 'cpu'))
  })
})
