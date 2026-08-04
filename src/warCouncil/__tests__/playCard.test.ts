import { describe, expect, it } from 'vitest'
import { dealRound } from '../deal'
import { playCard } from '../playCard'
import {
  AbilityChoiceKind,
  IllegalMoveReason,
  PlayerSide,
  RoundPhase,
  type RoundState,
} from '../types'

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
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('playCard — rejections', () => {
  it('rejects a play on a completed round', () => {
    const state = stateWith({ phase: RoundPhase.Complete })
    const result = playCard(state, 'player', { suit: 'bells', rank: 2 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.RoundComplete })
  })

  it('rejects a play out of turn', () => {
    const state = stateWith({
      leader: PlayerSide.Cpu,
      hands: { player: [{ suit: 'bells', rank: 2 }], cpu: [] },
    })
    const result = playCard(state, 'player', { suit: 'bells', rank: 2 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.NotYourTurn })
  })

  it('rejects a card not held', () => {
    const state = stateWith({ hands: { player: [], cpu: [] } })
    const result = playCard(state, 'player', { suit: 'bells', rank: 2 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.CardNotInHand })
  })

  it('rejects a follow-up play that breaks suit when the lead suit is held', () => {
    const state = stateWith({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: 'cpu', card: { suit: 'keys', rank: 5 } }],
      hands: {
        player: [
          { suit: 'keys', rank: 9 },
          { suit: 'bells', rank: 2 },
        ],
        cpu: [],
      },
    })
    const result = playCard(state, 'player', { suit: 'bells', rank: 2 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MustFollowLeadSuit })
  })

  it('rejects Fox (rank 3) played with no ability choice', () => {
    const state = stateWith({ hands: { player: [{ suit: 'keys', rank: 3 }], cpu: [] } })
    const result = playCard(state, 'player', { suit: 'keys', rank: 3 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MissingAbilityChoice })
  })

  it('rejects Woodcutter (rank 5) played with no ability choice', () => {
    const state = stateWith({ hands: { player: [{ suit: 'keys', rank: 5 }], cpu: [] } })
    const result = playCard(state, 'player', { suit: 'keys', rank: 5 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MissingAbilityChoice })
  })

  it('rejects Woodcutter (rank 5) played with a mismatched-kind ability choice', () => {
    const state = stateWith({ hands: { player: [{ suit: 'keys', rank: 5 }], cpu: [] } })
    const result = playCard(
      state,
      'player',
      { suit: 'keys', rank: 5 },
      { kind: AbilityChoiceKind.FoxExchange, handCard: { suit: 'bells', rank: 4 } },
    )
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.UnexpectedAbilityChoice })
  })

  it('rejects Fox (rank 3) played with a mismatched-kind ability choice', () => {
    const state = stateWith({ hands: { player: [{ suit: 'keys', rank: 3 }], cpu: [] } })
    const result = playCard(
      state,
      'player',
      { suit: 'keys', rank: 3 },
      { kind: AbilityChoiceKind.WoodcutterDiscard, discard: { suit: 'bells', rank: 4 } },
    )
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.UnexpectedAbilityChoice })
  })
})

describe('playCard — the Fox (rank 3) mutates trump mid-trick, and it is illegal to ignore the new trump on the next play', () => {
  it('exchanging the decree updates trumpSuit and decree immediately', () => {
    const state = stateWith({
      hands: {
        player: [
          { suit: 'keys', rank: 3 },
          { suit: 'moons', rank: 7 },
        ],
        cpu: [],
      },
    })
    const result = playCard(
      state,
      'player',
      { suit: 'keys', rank: 3 },
      {
        kind: AbilityChoiceKind.FoxExchange,
        handCard: { suit: 'moons', rank: 7 },
      },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.state.trumpSuit).toBe('moons')
    expect(result.state.decree).toEqual({ suit: 'moons', rank: 7 })
  })

  it('a full trick resolves using the trump suit as of after the Fox exchange', () => {
    const state = stateWith({
      leader: PlayerSide.Player,
      trumpSuit: 'bells',
      hands: {
        player: [
          { suit: 'keys', rank: 3 },
          { suit: 'moons', rank: 2 },
        ],
        // rank 8 deliberately, not one of the five odd (ability-bearing) ranks — this
        // fixture is testing trump resolution, not an ability, so the follow card must
        // not itself require an ability choice (e.g. rank 5, the Woodcutter, would).
        cpu: [{ suit: 'moons', rank: 8 }],
      },
    })
    const afterLead = playCard(
      state,
      'player',
      { suit: 'keys', rank: 3 },
      {
        kind: AbilityChoiceKind.FoxExchange,
        handCard: { suit: 'moons', rank: 2 },
      },
    )
    expect(afterLead.ok).toBe(true)
    if (!afterLead.ok) throw new Error('expected ok')
    expect(afterLead.state.trumpSuit).toBe('moons')

    const afterFollow = playCard(afterLead.state, 'cpu', { suit: 'moons', rank: 8 })
    expect(afterFollow.ok).toBe(true)
    if (!afterFollow.ok) throw new Error('expected ok')
    // cpu's moons 8 is off the lead suit (keys) but IS the new trump (moons) -> cpu wins.
    // If playCard used the STALE pre-exchange trump (bells), cpu's card would be neither
    // trump nor lead-suit, so the lead card (player's Fox, keys 3) would win instead —
    // this fixture would catch that regression, unlike the previous one.
    expect(afterFollow.state.tricksWon.cpu).toBe(1)
  })
})

function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

describe('playCard — a full round plays out exactly 13 tricks', () => {
  it('deals and plays a full round to RoundPhase.Complete with 13 total tricks won', () => {
    let state = dealRound('player', lcg(2024))
    let guard = 0

    while (state.phase !== 'complete') {
      guard += 1
      if (guard > 500) throw new Error('runaway loop — round never completed')

      const turn =
        state.currentTrick.length === 0
          ? state.leader
          : state.currentTrick[0].side === 'player'
            ? 'cpu'
            : 'player'
      const options =
        state.currentTrick.length === 0
          ? state.hands[turn]
          : (() => {
              const led = state.currentTrick[0].card
              const followSuit = state.hands[turn].filter((c) => c.suit === led.suit)
              return followSuit.length > 0 ? followSuit : state.hands[turn]
            })()
      const chosen = options[0]

      const choice =
        chosen.rank === 3
          ? { kind: 'foxDecline' as const }
          : chosen.rank === 5
            ? { kind: 'woodcutterDiscard' as const, discard: state.drawPile[0] }
            : undefined

      const result = playCard(state, turn, chosen, choice)
      if (!result.ok) {
        throw new Error(`unexpected rejection: ${result.reason}`)
      }
      state = result.state
    }

    expect(state.tricksPlayed).toBe(13)
    expect(state.tricksWon.player + state.tricksWon.cpu).toBe(13)
    expect(state.phase).toBe('complete')
  })
})
