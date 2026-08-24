import { describe, expect, it } from 'vitest'
import { DAMAGE_PER_HIT, HAND_SIZE } from '../../hunt'
import { TrickOutcome } from '../bank'
import { dealRound } from '../deal'
import { playCard } from '../playCard'
import {
  AbilityChoiceKind,
  IllegalMoveReason,
  PlayerSide,
  RoundPhase,
  Suit,
  type Card,
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
    skulledCards: [],
    primedCards: [],
    spentPile: [],
    reshuffled: false,
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

  it('names the Monarch when a led rank 11 narrowed the follow', () => {
    // The only source of this reason since DLR-81 deleted the round-long rule-break: the led
    // card is itself a Monarch. The same position under an ordinary lead is legal — see
    // legalMovesQuarry.test.ts.
    const state = stateWith({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: 'cpu', card: { suit: 'keys', rank: 11 } }],
      hands: {
        player: [
          { suit: 'keys', rank: 1 },
          { suit: 'keys', rank: 6 },
          { suit: 'keys', rank: 9 },
        ],
        cpu: [],
      },
    })
    const result = playCard(state, 'player', { suit: 'keys', rank: 6 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MustFollowMonarch })
  })

  it('does NOT name the Monarch on an ordinary Quarry lead — the rule-break is gone', () => {
    const state = stateWith({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: 'cpu', card: { suit: 'keys', rank: 4 } }],
      hands: {
        player: [
          { suit: 'keys', rank: 1 },
          { suit: 'keys', rank: 6 },
          { suit: 'keys', rank: 9 },
        ],
        cpu: [],
      },
    })
    // The middle card is legal now, so this is not a rejection at all.
    const result = playCard(state, 'player', { suit: 'keys', rank: 6 })
    expect(result.ok).toBe(true)
  })

  it('rejects Fox (rank 3) played with no ability choice', () => {
    const state = stateWith({
      hands: { player: [{ suit: 'keys', rank: 3 }], cpu: [] },
    })
    const result = playCard(state, 'player', { suit: 'keys', rank: 3 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MissingAbilityChoice })
  })

  it('rejects Woodcutter (rank 5) played with no ability choice', () => {
    const state = stateWith({
      hands: { player: [{ suit: 'keys', rank: 5 }], cpu: [] },
    })
    const result = playCard(state, 'player', { suit: 'keys', rank: 5 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MissingAbilityChoice })
  })

  it('rejects Woodcutter (rank 5) played with a mismatched-kind ability choice', () => {
    const state = stateWith({
      hands: { player: [{ suit: 'keys', rank: 5 }], cpu: [] },
    })
    const result = playCard(
      state,
      'player',
      { suit: 'keys', rank: 5 },
      { kind: AbilityChoiceKind.FoxExchange, handCard: { suit: 'bells', rank: 4 } },
    )
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.UnexpectedAbilityChoice })
  })

  it('rejects Fox (rank 3) played with a mismatched-kind ability choice', () => {
    const state = stateWith({
      hands: { player: [{ suit: 'keys', rank: 3 }], cpu: [] },
    })
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

// Naive strategy: always plays the first legal card. Good enough to drive a hand to
// completion deterministically; not a claim about good play.
function playOutHand(dealt: RoundState): { state: RoundState; allPlayed: Card[] } {
  let state = dealt
  let guard = 0
  const allPlayed: Card[] = []

  while (state.phase !== RoundPhase.Complete) {
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
    allPlayed.push(chosen)

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

  return { state, allPlayed }
}

describe('the Cheat bypass (DLR-83)', () => {
  it('commits an off-suit card that would otherwise be rejected (AC5)', () => {
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
    const offSuitCard: Card = { suit: 'bells', rank: 2 }

    const without = playCard(state, 'player', offSuitCard)
    expect(without).toEqual({ ok: false, reason: IllegalMoveReason.MustFollowLeadSuit })

    const withCheat = playCard(state, 'player', offSuitCard, undefined, {
      ignoreFollowSuit: true,
    })
    expect(withCheat.ok).toBe(true)
  })

  it('still rejects a card that is not in hand', () => {
    const state = stateWith({ hands: { player: [], cpu: [] } })
    const cardNotHeld: Card = { suit: 'bells', rank: 2 }

    const result = playCard(state, 'player', cardNotHeld, undefined, { ignoreFollowSuit: true })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.CardNotInHand })
  })

  it('still enforces the led-Monarch narrowing (AC8)', () => {
    const monarchLedState = stateWith({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: 'cpu', card: { suit: 'keys', rank: 11 } }],
      hands: {
        player: [
          { suit: 'keys', rank: 1 },
          { suit: 'keys', rank: 6 },
          { suit: 'keys', rank: 9 },
        ],
        cpu: [],
      },
    })
    // the Monarch follow set here is the Swan (rank 1, CardRank.Swan) and the highest keys
    // card (rank 9) — rank 6 is a legal keys card generally, but neither of those two, so the
    // Monarch narrowing still forbids it even with the follow-suit bypass armed.
    const wrongCard: Card = { suit: 'keys', rank: 6 }

    const result = playCard(monarchLedState, 'player', wrongCard, undefined, {
      ignoreFollowSuit: true,
    })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MustFollowMonarch })
  })
})

describe('playCard — a full hand plays out exactly HAND_SIZE tricks', () => {
  it('ends the hand on the sixth trick, not the thirteenth', () => {
    const dealt = dealRound('player', lcg(2024))
    const { state } = playOutHand(dealt)

    expect(state.phase).toBe(RoundPhase.Complete)
    expect(state.tricksPlayed).toBe(HAND_SIZE)
  })

  it('plays every dealt card exactly once', () => {
    const dealt = dealRound('player', lcg(2024))
    const { allPlayed } = playOutHand(dealt)

    expect(allPlayed).toHaveLength(HAND_SIZE * 2)
    const cardKey = (c: Card): string => `${c.suit}-${c.rank}`
    const dealtKeys = [...dealt.hands.player, ...dealt.hands.cpu].map(cardKey).sort()
    const playedKeys = allPlayed.map(cardKey).sort()
    expect(playedKeys).toEqual(dealtKeys)
  })
})

describe('playCard — banking and skulls', () => {
  it('banks a clean win and clears the resolution on the next lead', () => {
    const state = stateWith({
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

    const done = playCard(state, PlayerSide.Cpu, follow)
    expect(done.ok).toBe(true)
    if (!done.ok) return
    expect(done.state.spentPile).toEqual([lead, follow])
  })
})
