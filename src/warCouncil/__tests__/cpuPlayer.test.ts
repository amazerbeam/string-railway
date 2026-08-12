import { describe, expect, it } from 'vitest'
import { dealRound } from '../deal'
import { declareHunt } from '../declareHunt'
import { playCard } from '../playCard'
import { legalMoves } from '../legalMoves'
import { monarchFollowApplies } from '../quarryRuleBreak'
import {
  chooseCpuCard,
  chooseCpuFoxChoice,
  chooseCpuMove,
  chooseCpuWoodcutterChoice,
} from '../cpuPlayer'
import {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  PlayerSide,
  RoundPhase,
  type Card,
  type DeclarationState,
  type RoundState,
} from '../types'
import { HuntDeclaration, QuarryCharacter } from '../../hunt'

// DLR-63 AC1: playCard now rejects an undeclared round. The fixtures below that call
// playCard (directly or via a full simulated round) must declare first; the ones that
// only exercise chooseCpuCard / chooseCpuFoxChoice / chooseCpuWoodcutterChoice never
// reach playCard, so they are untouched.
const WIN_DECLARATION: DeclarationState = {
  path: HuntDeclaration.Win,
}

// Declares a Win on a freshly dealt round for the simulated full-round fixtures below.
function declaredDeal(...args: Parameters<typeof dealRound>): RoundState {
  const dealt = dealRound(...args)
  const declared = declareHunt(dealt, HuntDeclaration.Win)
  if (!declared.ok) throw new Error('expected declare ok')
  return declared.state
}

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
    capturedCards: { player: [], cpu: [] },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('chooseCpuCard — leading', () => {
  it('plays the lowest-ranked card in hand when leading', () => {
    const state = stateWith({
      hands: {
        player: [],
        cpu: [
          { suit: 'moons', rank: 7 },
          { suit: 'bells', rank: 2 },
          { suit: 'keys', rank: 2 },
        ],
      },
    })
    expect(chooseCpuCard(state, PlayerSide.Cpu)).toEqual({ suit: 'bells', rank: 2 })
  })
})

describe('chooseCpuCard — following', () => {
  it('wins as cheaply as possible when a winning legal card is available', () => {
    const state = stateWith({
      leader: PlayerSide.Player,
      trumpSuit: 'bells',
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 5 } }],
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 9 },
          { suit: 'keys', rank: 6 },
          { suit: 'bells', rank: 2 },
        ],
      },
    })
    expect(chooseCpuCard(state, PlayerSide.Cpu)).toEqual({ suit: 'keys', rank: 6 })
  })

  it('ducks with the lowest legal card when no legal card would win', () => {
    const state = stateWith({
      leader: PlayerSide.Player,
      trumpSuit: 'bells',
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 9 } }],
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 2 },
          { suit: 'keys', rank: 4 },
        ],
      },
    })
    expect(chooseCpuCard(state, PlayerSide.Cpu)).toEqual({ suit: 'keys', rank: 2 })
  })

  it('respects the Monarch-led legal set, ducking with the swan when neither legal card can win', () => {
    const state = stateWith({
      leader: PlayerSide.Player,
      trumpSuit: 'bells',
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 11 } }],
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 1 },
          { suit: 'keys', rank: 4 },
          { suit: 'keys', rank: 8 },
          { suit: 'moons', rank: 2 },
        ],
      },
    })
    // legalMoves restricts a Monarch follow to {swan-of-suit, highest-of-suit} = keys 1, keys 8.
    // Neither can beat a led keys 11 (11 is the maximum rank), so this ducks with the lower of
    // the two — keys 4 is illegal here even though it's the lowest card in hand overall.
    expect(chooseCpuCard(state, PlayerSide.Cpu)).toEqual({ suit: 'keys', rank: 1 })
  })
})

describe('chooseCpuFoxChoice', () => {
  it('exchanges, offering the lowest card of the most-held non-trump suit', () => {
    const handAfterFox: Card[] = [
      { suit: 'keys', rank: 7 },
      { suit: 'keys', rank: 2 },
      { suit: 'moons', rank: 10 },
    ]
    expect(chooseCpuFoxChoice(handAfterFox, 'bells')).toEqual({
      kind: AbilityChoiceKind.FoxExchange,
      handCard: { suit: 'keys', rank: 2 },
    })
  })

  it('declines when the most-held suit is already trump', () => {
    const handAfterFox: Card[] = [
      { suit: 'bells', rank: 7 },
      { suit: 'bells', rank: 2 },
      { suit: 'moons', rank: 10 },
    ]
    expect(chooseCpuFoxChoice(handAfterFox, 'bells')).toEqual({
      kind: AbilityChoiceKind.FoxDecline,
    })
  })

  it('declines when the Fox was the last card in hand', () => {
    expect(chooseCpuFoxChoice([], 'bells')).toEqual({ kind: AbilityChoiceKind.FoxDecline })
  })
})

describe('chooseCpuWoodcutterChoice', () => {
  it('discards the lowest-ranked card of the post-draw hand', () => {
    const handWithDrawn: Card[] = [
      { suit: 'keys', rank: 7 },
      { suit: 'moons', rank: 2 },
      { suit: 'bells', rank: 10 },
    ]
    expect(chooseCpuWoodcutterChoice(handWithDrawn)).toEqual({
      kind: AbilityChoiceKind.WoodcutterDiscard,
      discard: { suit: 'moons', rank: 2 },
    })
  })
})

describe('chooseCpuMove', () => {
  it('returns no ability choice for a plain card', () => {
    const state = stateWith({ hands: { player: [], cpu: [{ suit: 'bells', rank: 6 }] } })
    expect(chooseCpuMove(state, PlayerSide.Cpu)).toEqual({ card: { suit: 'bells', rank: 6 } })
  })

  it('produces a Fox move accepted by playCard', () => {
    const state = stateWith({
      declaration: WIN_DECLARATION,
      leader: PlayerSide.Cpu,
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 3 },
          { suit: 'keys', rank: 7 },
          { suit: 'moons', rank: 8 },
        ],
      },
    })
    const move = chooseCpuMove(state, PlayerSide.Cpu)
    expect(move.card).toEqual({ suit: 'keys', rank: 3 })
    const result = playCard(state, PlayerSide.Cpu, move.card, move.choice)
    expect(result.ok).toBe(true)
  })

  it('produces a Woodcutter move accepted by playCard', () => {
    const state = stateWith({
      declaration: WIN_DECLARATION,
      leader: PlayerSide.Cpu,
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 5 },
          { suit: 'keys', rank: 7 },
        ],
      },
    })
    const move = chooseCpuMove(state, PlayerSide.Cpu)
    expect(move.card).toEqual({ suit: 'keys', rank: 5 })
    const result = playCard(state, PlayerSide.Cpu, move.card, move.choice)
    expect(result.ok).toBe(true)
  })
})

function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

describe('chooseCpuMove — simulated full rounds (AC4)', () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1)

  it.each(seeds)('plays a full 13-trick round with zero illegal plays (seed %i)', (seed) => {
    let state = declaredDeal(seed % 2 === 0 ? PlayerSide.Player : PlayerSide.Cpu, lcg(seed))
    let guard = 0

    while (state.phase !== RoundPhase.Complete) {
      guard += 1
      if (guard > 100) throw new Error('runaway loop — round never completed')
      const turn = currentTurn(state)
      const move = chooseCpuMove(state, turn)
      const result = playCard(state, turn, move.card, move.choice)
      if (!result.ok) throw new Error(`illegal play at seed ${seed}: ${result.reason}`)
      state = result.state
    }

    expect(state.tricksPlayed).toBe(13)
    expect(state.tricksWon.player + state.tricksWon.cpu).toBe(13)
  })

  it('exercises both the Fox exchange and the Woodcutter discard across the seeded sample', () => {
    let foxPlays = 0
    let woodcutterPlays = 0

    for (const seed of seeds) {
      let state = declaredDeal(seed % 2 === 0 ? PlayerSide.Player : PlayerSide.Cpu, lcg(seed))
      let guard = 0
      while (state.phase !== RoundPhase.Complete) {
        guard += 1
        if (guard > 100) throw new Error('runaway loop — round never completed')
        const turn = currentTurn(state)
        const move = chooseCpuMove(state, turn)
        if (move.card.rank === CardRank.Fox) foxPlays += 1
        if (move.card.rank === CardRank.Woodcutter) woodcutterPlays += 1
        const result = playCard(state, turn, move.card, move.choice)
        if (!result.ok) throw new Error(`illegal play at seed ${seed}: ${result.reason}`)
        state = result.state
      }
    }

    expect(foxPlays).toBeGreaterThan(0)
    expect(woodcutterPlays).toBeGreaterThan(0)
  })
})

describe('the Monarch rule-break — simulated full rounds (DLR-51 AC6)', () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1)

  it.each(seeds)(
    'completes 13 tricks with the Monarch active, never stalling or playing illegally (seed %i)',
    (seed) => {
      let state = declaredDeal(
        seed % 2 === 0 ? PlayerSide.Player : PlayerSide.Cpu,
        lcg(seed),
        QuarryCharacter.Monarch,
      )
      let guard = 0

      while (state.phase !== RoundPhase.Complete) {
        guard += 1
        if (guard > 100) throw new Error('runaway loop — round never completed')
        const turn = currentTurn(state)
        const legal = legalMoves(state, turn)
        if (legal.length === 0) {
          throw new Error(
            `empty legal-move set for ${turn} at seed ${seed}, trick ${state.tricksPlayed}`,
          )
        }
        const move = chooseCpuMove(state, turn)
        const result = playCard(state, turn, move.card, move.choice)
        if (!result.ok) throw new Error(`illegal play at seed ${seed}: ${result.reason}`)
        // AC1 — the character never toggles mid-round.
        expect(result.state.quarryCharacter).toBe(QuarryCharacter.Monarch)
        state = result.state
      }

      expect(state.tricksPlayed).toBe(13)
      expect(state.tricksWon.player + state.tricksWon.cpu).toBe(13)
    },
  )

  it('actually fires the constraint, and only ever against the player, across the sample', () => {
    let constrainedTurns = 0
    let narrowedTurns = 0

    for (const seed of seeds) {
      let state = declaredDeal(PlayerSide.Cpu, lcg(seed), QuarryCharacter.Monarch)
      let guard = 0
      while (state.phase !== RoundPhase.Complete) {
        guard += 1
        if (guard > 100) throw new Error('runaway loop — round never completed')
        const turn = currentTurn(state)
        if (monarchFollowApplies(state, turn)) {
          constrainedTurns += 1
          expect(turn).toBe(PlayerSide.Player)
          if (legalMoves(state, turn).length < state.hands[turn].length) narrowedTurns += 1
        }
        const move = chooseCpuMove(state, turn)
        const result = playCard(state, turn, move.card, move.choice)
        if (!result.ok) throw new Error(`illegal play at seed ${seed}: ${result.reason}`)
        state = result.state
      }
    }

    expect(constrainedTurns).toBeGreaterThan(0)
    expect(narrowedTurns).toBeGreaterThan(0)
  })
})
