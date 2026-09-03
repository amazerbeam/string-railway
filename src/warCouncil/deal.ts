import { HAND_SIZE, type Rng } from '../hunt'
import { createDeck } from './deck'
import { FRESH_ENCOUNTER_DECK, dealPileFor, isFreshDeck, type EncounterDeck } from './encounterDeck'
import { shuffle } from './shuffle'
import { assignSkulls } from './skulls'
import { otherSide, PlayerSide, RoundPhase, type RoundState } from './types'

/**
 * One hand: `HAND_SIZE` cards each, one decree, the rest a draw pile. With the 33-card deck that
 * is 6 + 6 dealt, 1 decree and 20 left. Since DLR-146 that remainder also feeds the player's
 * per-trick refill, so it SHRINKS during a hand rather than only being swapped against —
 * `drawCards` folds the spent pile back in if it runs short.
 *
 * Skulls are assigned to the Quarry's dealt hand only (AC2) and drawn through the SAME injected
 * `rng` the shuffle uses, so a seeded deal reproduces its skulls as well as its cards. A card the
 * Woodcutter later draws arrives unskulled: §3.4's density is a property of the deal.
 */
export function dealRound(
  dealer: PlayerSide,
  rng: Rng,
  /**
   * DLR-123 AC2 — the encounter's carried deck. ABSENT or empty IS a new encounter, so a fresh 33
   * is built and shuffled (AC1/AC10). Trailing and optional following `apCapacity`'s precedent
   * rather than `baseDamageBonus`': every existing two-argument call still means exactly what it
   * meant — a fresh deal — so no existing spec has to be rewritten to say what it already said.
   */
  deck: EncounterDeck = FRESH_ENCOUNTER_DECK,
): RoundState {
  const fresh = isFreshDeck(deck)
  const opening = fresh
    ? { drawPile: shuffle(createDeck(), rng), reshuffled: false }
    : dealPileFor(deck, rng)
  const playerHand = opening.drawPile.slice(0, HAND_SIZE)
  const cpuHand = opening.drawPile.slice(HAND_SIZE, HAND_SIZE * 2)
  const remaining = opening.drawPile.slice(HAND_SIZE * 2)
  const decree = remaining[0]
  const drawPile = remaining.slice(1)

  return {
    dealer,
    hands: { [PlayerSide.Player]: playerHand, [PlayerSide.Cpu]: cpuHand },
    drawPile,
    decree,
    trumpSuit: decree.suit,
    tricksWon: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    skulledCards: assignSkulls(cpuHand, rng),
    // DLR-167 AC7 — a fresh deal carries no curse. The mark is written mid-hand by `curseCard`
    // and lapses at every trick's resolution, so nothing survives into a new hand.
    cursedCards: [],
    // DLR-123 AC3/AC8 — the spent pile CLIMBS ACROSS the hands of a fight and empties only when a
    // reshuffle folds it back into the draw pile. `FRESH_ENCOUNTER_DECK.spentPile` is `[]`, so the
    // new-encounter case needs no branch of its own.
    spentPile: opening.reshuffled ? [] : deck.spentPile,
    reshuffled: opening.reshuffled,
    // DLR-146 — drawn from the deal's OWN generator, so the mid-hand reshuffle inherits
    // `dealSeedFor`'s run/encounter/hand uniqueness with no second seed source to keep in step.
    drawSeed: Math.floor(rng() * 0x100000000),
    total: 0,
    roll: 0,
    lastResolution: null,
    currentTrick: [],
    leader: otherSide(dealer),
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
  }
}
