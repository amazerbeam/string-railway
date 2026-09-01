import { describe, expect, it } from 'vitest'
import { DAMAGE_PER_HIT, DuelSide } from '../../hunt'
import { primeCard } from '../timebomb'
import { playCard } from '../playCard'
import { PlayerSide, RoundPhase, Suit, type Card, type RoundState } from '../types'

/**
 * A SIBLING of `playCard.test.ts`, holding only DLR-90's marked-trick specs — split out here
 * rather than appended to that file, which the split would have pushed past the 400-line budget.
 * A local, minimal fixture rather than importing `playCard.test.ts`'s `stateWith`: importing one
 * `.test.ts` module from another re-executes its top-level `describe` calls in the importer's
 * suite, silently duplicating every test in that file.
 */
function stateWith(overrides: Partial<RoundState>): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [
      { suit: Suit.Moons, rank: 2 },
      { suit: Suit.Keys, rank: 6 },
    ],
    decree: { suit: Suit.Bells, rank: 4 },
    trumpSuit: Suit.Bells,
    tricksWon: { player: 0, cpu: 0 },
    skulledCards: [],
    primedCards: [],
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

describe('playCard — a marked trick reaches the total rule (DLR-90 AC3)', () => {
  // A Quarry lead already on the table, and a player card of the led suit that loses to it
  // cleanly — neither card is trump, so the trick resolves as an ordinary CleanLoss unless the
  // mark replaces it. `stateWith`'s own base (`skulledCards: []`, no trump on `bells`) already
  // expresses this; the only thing added here is the non-zero total/roll streak.
  const losingFollowCard: Card = { suit: Suit.Bells, rank: 2 }
  const baseWithBank = stateWith({
    hands: { player: [losingFollowCard], cpu: [] },
    trumpSuit: Suit.Keys,
    total: 2,
    roll: 2,
    currentTrick: [{ side: PlayerSide.Cpu, card: { suit: Suit.Bells, rank: 9 } }],
    leader: PlayerSide.Cpu,
    phase: RoundPhase.AwaitingFollow,
  })

  it('reports the target on the resolution, and replaces a clean loss', () => {
    // The player follows with a card that loses cleanly, having marked it first.
    const marked = primeCard(baseWithBank, PlayerSide.Player, losingFollowCard)
    const result = playCard(marked, PlayerSide.Player, losingFollowCard)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const resolution = result.state.lastResolution
    expect(resolution?.timebombTarget).toBe(DuelSide.Quarry)
    expect(resolution?.damageToPlayer).toBe(0)
    expect(result.state.total).toBe(marked.total)
    expect(result.state.roll).toBe(marked.roll)
  })

  it('reports no target for an unmarked trick, leaving every existing rule alone', () => {
    const result = playCard(baseWithBank, PlayerSide.Player, losingFollowCard)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.lastResolution?.timebombTarget).toBeNull()
    expect(result.state.lastResolution?.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('carries the mark through the state spread, so it survives the trick', () => {
    const marked = primeCard(baseWithBank, PlayerSide.Player, losingFollowCard)
    const result = playCard(marked, PlayerSide.Player, losingFollowCard)
    if (!result.ok) return
    expect(result.state.primedCards).toEqual(marked.primedCards)
  })
})
