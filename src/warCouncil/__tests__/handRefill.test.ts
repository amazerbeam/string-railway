import { describe, expect, it } from 'vitest'
import { createSeededRng, HAND_SIZE, PLAYER_HAND_FLOOR } from '../../hunt'
import { dealRound } from '../deal'
import { createDeck } from '../deck'
import { closeHand, FRESH_ENCOUNTER_DECK } from '../encounterDeck'
import { legalMoves } from '../legalMoves'
import { playCard } from '../playCard'
import {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  PlayerSide,
  RoundPhase,
  type AbilityChoice,
  type Card,
  type RoundState,
} from '../types'

/** The `AbilityChoice` a card needs, or `undefined` for a card that needs none. Both choices are
 *  the neutral one — see `deckCycle.test.ts`'s `choiceFor`, which this mirrors — so neither
 *  perturbs the hand widths being measured here. */
function choiceFor(state: RoundState, card: Card): AbilityChoice | undefined {
  if (card.rank === CardRank.Fox) return { kind: AbilityChoiceKind.FoxDecline }
  if (card.rank === CardRank.Woodcutter) {
    const discard = state.drawPile[0]
    // Fails cleanly with a named cause rather than letting `undefined` reach `playCard` and
    // crash somewhere downstream with an opaque TypeError — DLR-146 fix pass.
    if (!discard) throw new Error('choiceFor: drawPile is empty, nothing to bury as the discard')
    return { kind: AbilityChoiceKind.WoodcutterDiscard, discard }
  }
  return undefined
}

/** `handFloor` left undefined means "pass no options at all", which is what production does — that
 *  is how the default-is-the-constant test below stays honest rather than restating the default. */
function widthsAcrossHand(handFloor?: number, seed = 2026) {
  let state: RoundState = dealRound(PlayerSide.Cpu, createSeededRng(seed), FRESH_ENCOUNTER_DECK)
  const widths: number[] = []
  while (state.phase !== RoundPhase.Complete) {
    const side = currentTurn(state)
    if (side === PlayerSide.Player) widths.push(state.hands[PlayerSide.Player].length)
    const card = legalMoves(state, side)[0]
    const options = handFloor === undefined ? undefined : { handFloor }
    const result = playCard(state, side, card, choiceFor(state, card), options)
    if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
    state = result.state
  }
  return { widths, state }
}

describe('DLR-146 — the player hand floor', () => {
  it('AC4 — at a floor of 0 the widths are 6, 5, 4, 3, 2, 1: pre-ticket behaviour exactly', () => {
    expect(widthsAcrossHand(0).widths).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('AC4 — at a floor of 4 the widths are 6, 5, 4, 4, 4, 4', () => {
    expect(widthsAcrossHand(4).widths).toEqual([6, 5, 4, 4, 4, 4])
  })

  it('the shipped constant IS the default, so no production call site passes an option', () => {
    expect(widthsAcrossHand(undefined).widths).toEqual(widthsAcrossHand(PLAYER_HAND_FLOOR).widths)
  })

  it('AC3 — the Quarry never refills: it is dealt HAND_SIZE and ends the hand empty', () => {
    const { state } = widthsAcrossHand(PLAYER_HAND_FLOOR)
    expect(state.hands[PlayerSide.Cpu]).toEqual([])
  })

  it('AC6 — the hand ends on the HAND_SIZEth trick, holding whatever the final unrefilled play left', () => {
    // DLR-146 AC8 — derived from `widths`' own last entry rather than a bare `> 0`, so this holds
    // at a floor of 0 too, where the final trick legitimately empties the hand (pre-ticket
    // behaviour exactly) rather than leaving a leftover to sweep.
    const { widths, state } = widthsAcrossHand(PLAYER_HAND_FLOOR)
    expect(state.tricksPlayed).toBe(HAND_SIZE)
    expect(state.hands[PlayerSide.Player].length).toBe(widths[widths.length - 1] - 1)
  })

  it('AC6 — closeHand sweeps the unplayed cards, conserving all 33', () => {
    const { state } = widthsAcrossHand(PLAYER_HAND_FLOOR)
    const deck = closeHand(state)
    const census = [...deck.drawPile, ...deck.spentPile]
    expect(census).toHaveLength(createDeck().length)
    expect(new Set(census.map((c) => `${c.suit}-${c.rank}`)).size).toBe(createDeck().length)
  })

  it('AC5 — an exhausted deck makes the refill a no-op rather than a throw', () => {
    let state: RoundState = dealRound(PlayerSide.Cpu, createSeededRng(3), FRESH_ENCOUNTER_DECK)
    state = { ...state, drawPile: [], spentPile: [] }
    while (state.phase !== RoundPhase.Complete) {
      const side = currentTurn(state)
      const card = legalMoves(state, side)[0]
      const result = playCard(state, side, card, choiceFor(state, card), {
        handFloor: PLAYER_HAND_FLOOR,
      })
      if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
      state = result.state
    }
    expect(state.tricksPlayed).toBe(HAND_SIZE)
  })

  it('a refill that outruns the pile reshuffles the spent pile in, conserving all 33', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(11), FRESH_ENCOUNTER_DECK)
    const short = { ...dealt, drawPile: [], spentPile: dealt.drawPile }
    const side = currentTurn(short)
    const firstCard = legalMoves(short, side)[0]
    const first = playCard(short, side, firstCard, choiceFor(short, firstCard), { handFloor: 6 })
    if (!first.ok) throw new Error('illegal move')
    const follow = currentTurn(first.state)
    const followCard = legalMoves(first.state, follow)[0]
    const second = playCard(first.state, follow, followCard, choiceFor(first.state, followCard), {
      handFloor: 6,
    })
    if (!second.ok) throw new Error('illegal move')
    expect(second.state.hands[PlayerSide.Player].length).toBe(6)
  })

  it('Info 1 — a Woodcutter play that completes a trick still refills the player to the floor', () => {
    // Deliberately hand-built rather than dealt: the three seeded fixtures above never happen to
    // hand the player a Woodcutter to play through the refill path, which is exactly where the
    // reviewed bug lived. This constructs that interaction directly rather than seed-hunting.
    const drawPile: Card[] = [
      { suit: 'bells', rank: 6 },
      { suit: 'moons', rank: 7 },
      { suit: 'moons', rank: 8 },
      { suit: 'moons', rank: 9 },
      { suit: 'moons', rank: 10 },
    ]
    const woodcutter: Card = { suit: 'keys', rank: CardRank.Woodcutter }
    const state: RoundState = {
      dealer: PlayerSide.Player,
      hands: { player: [woodcutter], cpu: [] },
      drawPile,
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
      currentTrick: [{ side: PlayerSide.Cpu, card: { suit: 'keys', rank: 2 } }],
      leader: PlayerSide.Cpu,
      tricksPlayed: 0,
      phase: RoundPhase.AwaitingFollow,
    }
    const result = playCard(
      state,
      PlayerSide.Player,
      woodcutter,
      { kind: AbilityChoiceKind.WoodcutterDiscard, discard: drawPile[0] },
      { handFloor: PLAYER_HAND_FLOOR },
    )
    if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
    expect(result.state.hands[PlayerSide.Player]).toHaveLength(PLAYER_HAND_FLOOR)
  })
})
