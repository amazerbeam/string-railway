import { describe, expect, it } from 'vitest'
import { createSeededRng, MAX_CARDS_PER_DISCARD } from '../../hunt'
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
    return { kind: AbilityChoiceKind.WoodcutterDiscard, discard: state.drawPile[0] }
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
    // Stated as the arithmetic rather than as four magic numbers: a fresh 33 less one deal is
    // 20, less a second is 7, and 7 is below the 13 a deal costs — which is exactly why the
    // third hand reshuffles. Written this way so the cycle re-derives if `HAND_SIZE` ever moves.
    const afterOneDeal = DECK_SIZE - CARDS_PER_DEAL // 33 - 13 = 20
    const afterTwoDeals = afterOneDeal - CARDS_PER_DEAL // 20 - 13 = 7
    expect(afterTwoDeals).toBeLessThan(CARDS_PER_DEAL)
    expect(draws).toEqual([afterOneDeal, afterTwoDeals, afterOneDeal, afterTwoDeals])
    expect(draws).toEqual([20, 7, 20, 7])
    // Exactly ONE reshuffle per cycle of two hands, and never on a fight's first hand.
    expect(reshuffles).toEqual([false, false, true, false])
  })

  it('D5 — the draw pile’s length never changes for the life of a hand, so it cannot run out', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(2026), FRESH_ENCOUNTER_DECK)
    const opening = dealt.drawPile.length
    let state = dealt
    // Stepped card by card rather than through `playOutHand`, because the assertion is about
    // every INTERMEDIATE state, not the final one — including the turns either side of a
    // Woodcutter, which is the one ability that touches the draw pile at all.
    while (state.phase !== RoundPhase.Complete) {
      expect(state.drawPile).toHaveLength(opening)
      const side = currentTurn(state)
      const card = legalMoves(state, side)[0]
      const result = playCard(state, side, card, choiceFor(state, card))
      if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
      state = result.state
    }
    expect(state.drawPile).toHaveLength(opening)
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
