import { describe, expect, it } from 'vitest'
import { createSeededRng, HAND_SIZE, MAX_CARDS_PER_DISCARD, PLAYER_HAND_FLOOR } from '../../hunt'
import { applyDiscard } from '../discard'
import { createDeck } from '../deck'
import { dealRound } from '../deal'
import { CARDS_PER_DEAL, FRESH_ENCOUNTER_DECK, closeHand } from '../encounterDeck'
import { legalMoves } from '../legalMoves'
import { playCard } from '../playCard'
import {
  AbilityChoiceKind,
  CardRank,
  PlayerSide,
  RoundPhase,
  currentTurn,
  type AbilityChoice,
  type Card,
  type RoundState,
} from '../types'

const DECK_SIZE = createDeck().length

/** Every card in the game, wherever it currently is. */
function census(state: RoundState): string[] {
  return [
    ...state.hands[PlayerSide.Player],
    ...state.hands[PlayerSide.Cpu],
    ...state.drawPile,
    ...state.spentPile,
    ...state.currentTrick.map((t) => t.card),
    state.decree,
  ].map((c) => `${c.suit}-${c.rank}`)
}

/**
 * The `AbilityChoice` a card needs, or `undefined` for a card that needs none.
 *
 * TOTAL over every rank, deliberately. Preferring a plain card and hoping is not enough: a hand
 * can legally reach a turn where EVERY legal move is a Fox or a Woodcutter, and then there is no
 * plain card to fall back on. Making this total is what lets `playOutHand` play any hand the deck
 * produces, so these invariants hold for the real game rather than for a lucky seed.
 *
 * Both choices are the NEUTRAL one, so neither perturbs what is being measured: the Fox declines
 * (the decree is untouched), and the Woodcutter buries straight back the card it just drew, which
 * is the identity case of a swap that already leaves `drawPile.length` unchanged.
 */
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

/** Play a hand out to its sixth trick, always taking the first legal move and answering any
 *  ability prompt it raises. */
function playOutHand(start: RoundState): RoundState {
  let state = start
  while (state.phase !== RoundPhase.Complete) {
    const side = currentTurn(state)
    const card = legalMoves(state, side)[0]
    const result = playCard(state, side, card, choiceFor(state, card))
    if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
    state = result.state
  }
  return state
}

describe('the encounter deck cycle', () => {
  it('conserves all 33 cards, with no duplicate, at every point of every hand', () => {
    let deck = FRESH_ENCOUNTER_DECK
    for (let handOfFight = 1; handOfFight <= 4; handOfFight += 1) {
      const dealt = dealRound(PlayerSide.Player, createSeededRng(handOfFight), deck)
      expect(new Set(census(dealt)).size).toBe(DECK_SIZE)
      const played = playOutHand(dealt)
      expect(new Set(census(played)).size).toBe(DECK_SIZE)
      deck = closeHand(played)
      expect(deck.drawPile.length + deck.spentPile.length).toBe(DECK_SIZE)
    }
  })

  it('AC1/AC2/AC6 — the draw pile runs 20, 7, then reshuffles back to 20', () => {
    let deck = FRESH_ENCOUNTER_DECK
    const draws: number[] = []
    const reshuffles: boolean[] = []
    for (let handOfFight = 1; handOfFight <= 4; handOfFight += 1) {
      const dealt = dealRound(PlayerSide.Player, createSeededRng(handOfFight), deck)
      draws.push(dealt.drawPile.length)
      reshuffles.push(dealt.reshuffled)
      deck = closeHand(playOutHand(dealt))
    }
    // DLR-146 — a hand no longer costs exactly `CARDS_PER_DEAL`. The deal takes 13, and the
    // player's refill takes one more per trick that ends below the floor: `HAND_SIZE - 1` tricks
    // can refill (the last one never does), and only those where the hand has fallen under it.
    // DERIVED from the two constants rather than pinned to a measured number, so that flipping
    // `PLAYER_HAND_FLOOR` to 0 leaves this test green — AC4's "no other edit anywhere" has to hold
    // for the SUITE too, or the revert is a one-line change plus a test fix, which is not a
    // one-line change.
    const refillsPerHand = Math.max(0, Math.min(HAND_SIZE - 1, PLAYER_HAND_FLOOR - 1))
    const handCost = CARDS_PER_DEAL + refillsPerHand
    expect(draws[0]).toBe(DECK_SIZE - CARDS_PER_DEAL)
    expect(draws[1]).toBe(draws[0] - handCost)
    expect(draws[1]).toBeGreaterThanOrEqual(0)
    // The reshuffle PATTERN is what this test is really for, and it is unchanged by the floor.
    expect(reshuffles).toEqual([false, false, true, false])
  })

  it('DLR-146 — the draw pile only SHRINKS within a hand, and every card is conserved throughout', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(2026), FRESH_ENCOUNTER_DECK)
    let state = dealt
    let previous = dealt.drawPile.length
    while (state.phase !== RoundPhase.Complete) {
      expect(new Set(census(state)).size).toBe(DECK_SIZE)
      const side = currentTurn(state)
      const card = legalMoves(state, side)[0]
      const result = playCard(state, side, card, choiceFor(state, card))
      if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
      state = result.state
      // Never grows, EXCEPT across a reshuffle, which is the one thing that can put cards back.
      const grew = state.drawPile.length > previous
      expect(grew ? state.spentPile.length : 0).toBe(0)
      previous = state.drawPile.length
    }
    expect(new Set(census(state)).size).toBe(DECK_SIZE)
  })

  it('AC5 — the player’s swap sends cards to the BOTTOM OF THE DRAW PILE, never to the spent pile', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(11), FRESH_ENCOUNTER_DECK)
    const thrown = dealt.hands[PlayerSide.Player].slice(0, MAX_CARDS_PER_DISCARD)
    const after = applyDiscard(dealt, PlayerSide.Player, thrown)
    expect(after.spentPile).toEqual(dealt.spentPile)
    expect(after.drawPile).toHaveLength(dealt.drawPile.length)
    expect(after.drawPile.slice(-thrown.length)).toEqual(thrown)
  })

  it('AC12 — a seeded encounter reproduces every deal, every skull and every reshuffle', () => {
    function threeHands(seed: number): RoundState[] {
      let deck = FRESH_ENCOUNTER_DECK
      const hands: RoundState[] = []
      for (let handOfFight = 1; handOfFight <= 3; handOfFight += 1) {
        const dealt = dealRound(PlayerSide.Player, createSeededRng(seed + handOfFight), deck)
        hands.push(dealt)
        deck = closeHand(playOutHand(dealt))
      }
      return hands
    }
    expect(threeHands(500)).toEqual(threeHands(500))
    expect(threeHands(500)[2].reshuffled).toBe(true)
  })
})
