import { describe, expect, it } from 'vitest'
import { DAMAGE_PER_HIT } from '../../hunt'
import { TrickOutcome } from '../bank'
import { playCard } from '../playCard'
import { PlayerSide, RoundPhase, Suit, type Card, type RoundState } from '../types'

/** Split off `playCard.test.ts` on DLR-146 to keep that file under the 400-line budget.
 *  Deliberately its own small copy of `stateWith` rather than an import from the sibling spec —
 *  matches how `deckCycle.test.ts` and others keep their own local fixtures, and keeps the two
 *  files independent of each other's internals. */
function stateWith(overrides: Partial<RoundState>): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [
      { suit: 'moons', rank: 2 },
      { suit: 'keys', rank: 6 },
    ],
    decree: { suit: 'bells', rank: 4 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    skulledCards: [],
    primedCards: [],
    spentPile: [],
    reshuffled: false,
    drawSeed: 0,
    bank: 0,
    multiplier: 0,
    lastResolution: null,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('playCard — banking and skulls', () => {
  it('banks a clean win and clears the resolution on the next lead', () => {
    const state: RoundState = stateWith({
      hands: {
        player: [{ suit: 'moons', rank: 4 }],
        cpu: [{ suit: 'bells', rank: 2 }],
      },
      trumpSuit: 'keys',
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'bells', rank: 9 } }],
      leader: PlayerSide.Player,
      phase: RoundPhase.AwaitingFollow,
    })

    const won = playCard(state, PlayerSide.Cpu, { suit: 'bells', rank: 2 })
    expect(won.ok && won.state.lastResolution?.outcome).toBe(TrickOutcome.CleanWin)

    const led = playCard(won.ok ? won.state : state, PlayerSide.Player, {
      suit: 'moons',
      rank: 4,
    })
    expect(led.ok && led.state.lastResolution).toBeNull()
  })

  it('treats a trick containing a skulled card as a skull trick', () => {
    const skulled: Card = { suit: Suit.Bells, rank: 6 }
    const state = stateWith({
      hands: {
        player: [{ suit: Suit.Bells, rank: 9 }],
        cpu: [],
      },
      trumpSuit: 'keys',
      skulledCards: [skulled],
      currentTrick: [{ side: PlayerSide.Cpu, card: skulled }],
      leader: PlayerSide.Cpu,
      phase: RoundPhase.AwaitingFollow,
    })

    const result = playCard(state, PlayerSide.Player, { suit: Suit.Bells, rank: 9 })
    expect(result.ok && result.state.lastResolution?.outcome).toBe(TrickOutcome.SkullWin)
    expect(result.ok && result.state.lastResolution?.damageToPlayer).toBe(DAMAGE_PER_HIT)
  })

  it('DLR-123 AC3 — a resolved trick sends both its cards to the spent pile, in trick order', () => {
    const lead: Card = { suit: 'bells', rank: 9 }
    const follow: Card = { suit: 'bells', rank: 2 }
    const state = stateWith({
      hands: {
        player: [],
        cpu: [follow],
      },
      trumpSuit: 'keys',
      currentTrick: [{ side: PlayerSide.Player, card: lead }],
      leader: PlayerSide.Player,
      phase: RoundPhase.AwaitingFollow,
    })

    // DLR-146 — handFloor: 0 because this test is about spent-pile ORDER on trick resolution, not
    // about the refill. The fixture's drawPile is too small to cover a floor-4 refill without
    // itself reshuffling the spent pile this test is asserting on.
    const done = playCard(state, PlayerSide.Cpu, follow, undefined, { handFloor: 0 })
    expect(done.ok).toBe(true)
    if (!done.ok) return
    expect(done.state.spentPile).toEqual([lead, follow])
  })
})
