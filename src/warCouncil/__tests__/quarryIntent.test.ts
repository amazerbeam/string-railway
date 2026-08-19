import { describe, expect, it } from 'vitest'
import { HAND_SIZE, TelegraphFidelity } from '../../hunt'
import { chooseCpuMove, commitQuarryMove, quarryIntent, QuarryIntentStance } from '../cpuPlayer'
import { dealRound } from '../deal'
import { playCard } from '../playCard'
import {
  currentTurn,
  IllegalMoveReason,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  type RoundState,
} from '../types'
import { resolveTrickWinner } from '../resolveTrick'

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
    envenomedCards: [],
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

describe('quarryIntent — leading (AC3)', () => {
  it('reports Leading with the suit of the lowest card in hand', () => {
    const state = stateWith({
      leader: QUARRY_SIDE,
      hands: {
        player: [],
        cpu: [
          { suit: 'moons', rank: 7 },
          { suit: 'bells', rank: 2 },
        ],
      },
    })
    expect(quarryIntent(state)).toEqual({ suit: 'bells', stance: QuarryIntentStance.Leading })
  })
})

describe('quarryIntent — following (AC3)', () => {
  it('reports Pressing when the Quarry would win the trick', () => {
    const state = stateWith({
      trumpSuit: 'bells',
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 5 } }],
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 9 },
          { suit: 'keys', rank: 6 },
        ],
      },
    })
    expect(quarryIntent(state)).toEqual({ suit: 'keys', stance: QuarryIntentStance.Pressing })
  })

  it('reports Ducking when no legal card would win', () => {
    const state = stateWith({
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
    expect(quarryIntent(state)).toEqual({ suit: 'keys', stance: QuarryIntentStance.Ducking })
  })
})

describe('quarryIntent — stability (AC2)', () => {
  it('returns a deeply equal result computed twice on the same state', () => {
    const state = stateWith({
      leader: QUARRY_SIDE,
      hands: {
        player: [],
        cpu: [
          { suit: 'moons', rank: 7 },
          { suit: 'bells', rank: 2 },
        ],
      },
    })
    expect(quarryIntent(state)).toEqual(quarryIntent(state))
  })
})

describe('quarryIntent — fidelity (AC4)', () => {
  const state = stateWith({
    leader: QUARRY_SIDE,
    hands: {
      player: [],
      cpu: [
        { suit: 'moons', rank: 7 },
        { suit: 'bells', rank: 2 },
      ],
    },
  })

  it('includes stance under the default SuitAndStance fidelity', () => {
    const intent = quarryIntent(state)
    expect(intent).not.toBeNull()
    expect(intent?.stance).toBe(QuarryIntentStance.Leading)
  })

  it('omits stance under the narrower Suit fidelity, with no other code change', () => {
    const wide = quarryIntent(state)
    const narrow = quarryIntent(state, TelegraphFidelity.Suit)
    expect(wide).not.toBeNull()
    expect(narrow).not.toBeNull()
    expect(wide?.stance).toBeDefined()
    // Proves `stance` is omitted, not present-with-value-undefined — `toBeUndefined()` alone
    // cannot tell those two shapes apart.
    expect('stance' in (narrow as object)).toBe(false)
    expect(narrow).toEqual({ suit: wide?.suit })
  })
})

describe('quarryIntent — guarded states (Defender Critical 1, Critical 2)', () => {
  it('returns null when the round is already complete (the Quarry hand is empty)', () => {
    const state = stateWith({
      leader: QUARRY_SIDE,
      hands: { player: [], cpu: [] },
      tricksPlayed: HAND_SIZE,
      phase: RoundPhase.Complete,
    })
    expect(quarryIntent(state)).toBeNull()
  })

  it("returns null when currentTrick is empty but the Player is the leader (not the Quarry's turn)", () => {
    const state = stateWith({
      leader: PlayerSide.Player,
      hands: {
        player: [],
        cpu: [
          { suit: 'moons', rank: 7 },
          { suit: 'bells', rank: 2 },
        ],
      },
    })
    expect(quarryIntent(state)).toBeNull()
  })

  it("returns null when the Quarry already led one card in currentTrick (it's the Player's turn)", () => {
    const state = stateWith({
      currentTrick: [{ side: QUARRY_SIDE, card: { suit: 'keys', rank: 4 } }],
      hands: {
        player: [{ suit: 'keys', rank: 6 }],
        cpu: [{ suit: 'moons', rank: 7 }],
      },
    })
    expect(quarryIntent(state)).toBeNull()
  })
})

describe('commitQuarryMove', () => {
  it('plays a legal move for the Quarry, matching what quarryIntent described', () => {
    const state = stateWith({
      leader: QUARRY_SIDE,
      hands: {
        player: [],
        cpu: [
          { suit: 'moons', rank: 7 },
          { suit: 'bells', rank: 2 },
        ],
      },
    })
    const intent = quarryIntent(state)
    expect(intent).not.toBeNull()
    const result = commitQuarryMove(state)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.currentTrick).toHaveLength(1)
      expect(result.state.currentTrick[0].card.suit).toBe(intent?.suit)
      expect(result.state.currentTrick[0].side).toBe(QUARRY_SIDE)
    }
  })

  it('returns { ok: false, reason: RoundComplete } rather than throwing when the round is already complete', () => {
    const state = stateWith({
      leader: QUARRY_SIDE,
      hands: { player: [], cpu: [] },
      tricksPlayed: HAND_SIZE,
      phase: RoundPhase.Complete,
    })
    const result = commitQuarryMove(state)
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.RoundComplete })
  })

  it("returns { ok: false, reason: NotYourTurn } rather than throwing when it isn't the Quarry's turn", () => {
    const state = stateWith({
      leader: PlayerSide.Player,
      hands: {
        player: [],
        cpu: [
          { suit: 'moons', rank: 7 },
          { suit: 'bells', rank: 2 },
        ],
      },
    })
    const result = commitQuarryMove(state)
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.NotYourTurn })
  })
})

function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

describe('quarryIntent and commitQuarryMove — simulated full hands (AC5, AC6)', () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1)

  it.each(seeds)(
    'intent and the committed move agree on suit and stance every Quarry turn (seed %i)',
    (seed) => {
      let state = dealRound(seed % 2 === 0 ? PlayerSide.Player : PlayerSide.Cpu, lcg(seed))
      let guard = 0
      let quarryTurns = 0

      while (state.phase !== RoundPhase.Complete) {
        guard += 1
        if (guard > 100) throw new Error('runaway loop — round never completed')
        const turn = currentTurn(state)

        if (turn === QUARRY_SIDE) {
          quarryTurns += 1
          const intent = quarryIntent(state)
          if (intent === null) {
            throw new Error(`quarryIntent returned null on the Quarry's own turn at seed ${seed}`)
          }
          const move = chooseCpuMove(state, QUARRY_SIDE)
          expect(move.card.suit).toBe(intent.suit)
          if (intent.stance !== QuarryIntentStance.Leading) {
            const lead = state.currentTrick[0]
            const wouldWin =
              resolveTrickWinner(
                [lead, { side: QUARRY_SIDE, card: move.card }],
                state.trumpSuit,
              ) === QUARRY_SIDE
            expect(intent.stance === QuarryIntentStance.Pressing).toBe(wouldWin)
          }
          const result = commitQuarryMove(state)
          if (!result.ok) throw new Error(`illegal commit at seed ${seed}: ${result.reason}`)
          state = result.state
        } else {
          const move = chooseCpuMove(state, turn)
          const result = playCard(state, turn, move.card, move.choice)
          if (!result.ok) throw new Error(`illegal play at seed ${seed}: ${result.reason}`)
          state = result.state
        }
      }

      expect(quarryTurns).toBeGreaterThan(0)
      expect(state.tricksPlayed).toBe(HAND_SIZE)
    },
  )
})
