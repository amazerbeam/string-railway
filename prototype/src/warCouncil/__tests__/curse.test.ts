import { describe, expect, it } from 'vitest'
import { curseCard, isCursed, skullsOn, uncurseCard } from '../curse'
import { legalMoves } from '../legalMoves'
import { PlayerSide, RoundPhase, Suit, type Card, type RoundState } from '../types'

const bells2: Card = { suit: Suit.Bells, rank: 2 }
const bells4: Card = { suit: Suit.Bells, rank: 4 }
const keys3: Card = { suit: Suit.Keys, rank: 3 }
const moons7: Card = { suit: Suit.Moons, rank: 7 }

function stateWith(overrides: Partial<RoundState> = {}): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [bells2, moons7], cpu: [bells4] },
    drawPile: [],
    decree: { suit: Suit.Bells, rank: 9 },
    trumpSuit: Suit.Bells,
    tricksWon: { player: 0, cpu: 0 },
    skulledCards: [],
    cursedCards: [],
    spentPile: [],
    reshuffled: false,
    drawSeed: 0,
    total: 0,
    roll: 0,
    lastResolution: null,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('curseCard', () => {
  it('marks a card held by that side', () => {
    const next = curseCard(stateWith(), PlayerSide.Player, bells2)
    expect(isCursed(next.cursedCards, bells2)).toBe(true)
  })

  it('leaves every other card unmarked', () => {
    const next = curseCard(stateWith(), PlayerSide.Player, bells2)
    expect(isCursed(next.cursedCards, moons7)).toBe(false)
  })

  it('marks a card that is ILLEGAL to play — marking is not a move (AC3)', () => {
    // The Quarry has led Bells, so follow-suit makes the Moons 7 unplayable this trick.
    const base = stateWith({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: bells4 }],
      phase: RoundPhase.AwaitingFollow,
    })
    const legal = legalMoves(base, PlayerSide.Player)
    expect(legal.some((c) => c.suit === moons7.suit && c.rank === moons7.rank)).toBe(false)

    const next = curseCard(base, PlayerSide.Player, moons7)
    expect(isCursed(next.cursedCards, moons7)).toBe(true)
  })

  it("throws when the card is not in that side's hand", () => {
    expect(() => curseCard(stateWith(), PlayerSide.Player, keys3)).toThrow(RangeError)
  })

  it('throws when the card is already cursed', () => {
    const once = curseCard(stateWith(), PlayerSide.Player, bells2)
    expect(() => curseCard(once, PlayerSide.Player, bells2)).toThrow(RangeError)
  })

  it('never mutates the state it was handed', () => {
    const base = stateWith()
    curseCard(base, PlayerSide.Player, bells2)
    expect(base.cursedCards).toEqual([])
  })
})

describe('uncurseCard', () => {
  it('lifts a mark it finds', () => {
    const marked = curseCard(stateWith(), PlayerSide.Player, bells2)
    expect(uncurseCard(marked, bells2).cursedCards).toEqual([])
  })

  it('throws when the card carries no curse', () => {
    expect(() => uncurseCard(stateWith(), bells2)).toThrow(RangeError)
  })
})

describe('skullsOn', () => {
  it('returns dealt skulls and curses as one list', () => {
    const state = stateWith({ skulledCards: [keys3], cursedCards: [bells2] })
    expect(skullsOn(state)).toEqual(expect.arrayContaining([keys3, bells2]))
    expect(skullsOn(state)).toHaveLength(2)
  })

  it('returns the dealt skulls unchanged when nothing is cursed', () => {
    const state = stateWith({ skulledCards: [keys3] })
    expect(skullsOn(state)).toBe(state.skulledCards)
  })

  it('returns the curses alone when nothing was dealt a skull', () => {
    const state = stateWith({ cursedCards: [bells2] })
    expect(skullsOn(state)).toEqual([bells2])
  })
})
