// DLR-163 AC7 — the Quarry's Woodcutter: one card swapped, and a seeded 40% chance the drawn card
// carries a skull. The roll is drawn from `drawSeed` mixed with `tricksPlayed`, so a spec can
// reproduce it exactly with the same two primitives rather than by stubbing a generator.
import { describe, expect, it } from 'vitest'
import { createSeededRng, mixSeed, QUARRY_SWAP_SKULL_CHANCE } from '../../hunt'
import { applyQuarrySwap } from '../abilities'
import { PlayerSide, RoundPhase, type Card, type RoundState } from '../types'

/** The exact roll `applyQuarrySwap` will take for this state. */
function rollFor(state: RoundState): number {
  return createSeededRng(mixSeed(state.drawSeed, state.tricksPlayed))()
}

function baseState(overrides: Partial<RoundState> = {}): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: {
      player: [{ suit: 'moons', rank: 6 }],
      cpu: [{ suit: 'bells', rank: 8 }],
    },
    drawPile: [
      { suit: 'moons', rank: 2 },
      { suit: 'keys', rank: 5 },
    ],
    decree: { suit: 'bells', rank: 4 },
    trumpSuit: 'bells',
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

/** The first `drawSeed` in 0..999 whose roll lands on the wanted side of the chance. */
function seedWhere(hit: boolean, top: Card): number {
  for (let seed = 0; seed < 1000; seed += 1) {
    const state = baseState({ drawSeed: seed, drawPile: [top, { suit: 'keys', rank: 5 }] })
    if (rollFor(state) < QUARRY_SWAP_SKULL_CHANCE === hit) return seed
  }
  throw new Error(`no seed found for hit=${hit}`)
}

const SWAPPED: Card = { suit: 'bells', rank: 8 }

describe('applyQuarrySwap', () => {
  it('AC7 — swaps one card: the named card leaves the Quarry hand and one drawn card arrives', () => {
    const state = baseState()
    const next = applyQuarrySwap(state, SWAPPED)
    expect(next.hands[PlayerSide.Cpu]).toEqual([{ suit: 'moons', rank: 2 }])
    expect(next.hands[PlayerSide.Player]).toEqual(state.hands[PlayerSide.Player])
  })

  it('AC7 — the swapped card goes to the BOTTOM of the draw pile, as applyDiscard does', () => {
    const next = applyQuarrySwap(baseState(), SWAPPED)
    expect(next.drawPile.at(-1)).toEqual(SWAPPED)
    expect(next.drawPile).toHaveLength(2)
  })

  it('AC7 — on a hit, the DRAWN card joins skulledCards', () => {
    const top: Card = { suit: 'moons', rank: 2 }
    const state = baseState({
      drawSeed: seedWhere(true, top),
      drawPile: [top, { suit: 'keys', rank: 5 }],
    })
    expect(applyQuarrySwap(state, SWAPPED).skulledCards).toEqual([top])
  })

  it('AC7 — on a miss, nothing is skulled', () => {
    const top: Card = { suit: 'moons', rank: 2 }
    const state = baseState({
      drawSeed: seedWhere(false, top),
      drawPile: [top, { suit: 'keys', rank: 5 }],
    })
    expect(applyQuarrySwap(state, SWAPPED).skulledCards).toEqual([])
  })

  it('AC7 — a drawn rank 1 is never skulled even on a hit, because its weight is 0', () => {
    const top: Card = { suit: 'moons', rank: 1 }
    const state = baseState({
      drawSeed: seedWhere(true, top),
      drawPile: [top, { suit: 'keys', rank: 5 }],
    })
    expect(rollFor(state)).toBeLessThan(QUARRY_SWAP_SKULL_CHANCE)
    expect(applyQuarrySwap(state, SWAPPED).skulledCards).toEqual([])
  })

  it('is reproducible: the same drawSeed and tricksPlayed give the same roll every call', () => {
    const state = baseState({ drawSeed: 7, tricksPlayed: 2 })
    expect(applyQuarrySwap(state, SWAPPED)).toEqual(applyQuarrySwap(state, SWAPPED))
  })

  it('does not advance drawSeed by rolling: the reshuffle sequence is untouched', () => {
    const state = baseState({ drawSeed: 7, tricksPlayed: 2 })
    // The draw itself may move `drawSeed` (only a reshuffle does); the ROLL never does, so two
    // states differing only in `tricksPlayed` still draw the same card.
    const a = applyQuarrySwap(state, SWAPPED)
    const b = applyQuarrySwap({ ...state, tricksPlayed: 3 }, SWAPPED)
    expect(a.hands[PlayerSide.Cpu]).toEqual(b.hands[PlayerSide.Cpu])
  })
})
