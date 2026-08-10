import { QuarryCharacter } from '../hunt'
import { cardsOfSuit, highestOfSuit, sameCard } from './cardUtils'
import { CardRank, PlayerSide, type Card, type RoundState, type Suit } from './types'

// The seat the Quarry plays — `src/hunt/types.ts` defines the Quarry as "The CPU opponent
// for one encounter" (§4). Named so a later ticket has a single place to change if a
// future mode ever seats the Quarry as the player.
export const QUARRY_SIDE: PlayerSide = PlayerSide.Cpu

/**
 * The base Monarch follow set (`fox-in-the-forest.md` → Suit card reference, rank 11): the
 * Swan of `suit` then the highest card of `suit`, deduplicated when they are the same card.
 * Empty when `hand` holds none of `suit` — a caller reads empty as "unconstrained in that
 * suit", never as "no legal move". "Highest" is recomputed from `hand` at the moment of the
 * follow, matching the printed rule.
 */
export function monarchFollowSet(hand: readonly Card[], suit: Suit): readonly Card[] {
  const suitCards = cardsOfSuit(hand, suit)
  if (suitCards.length === 0) {
    return []
  }
  const swan = suitCards.find((c) => c.rank === CardRank.Swan)
  const highest = highestOfSuit(hand, suit)
  const options = [swan, highest].filter((c): c is Card => c !== undefined)
  return options.filter((c, i) => options.findIndex((o) => sameCard(o, c)) === i)
}

/**
 * True when the encounter's round-long rule-break narrows `side`'s follow options on the
 * current trick (§4's Monarch): the Monarch is the active character, `side` is not the
 * Quarry, and the Quarry led this trick. Consulted by both `legalMoves` and `playCard`'s
 * rejection-reason branch so the legal set and the reason code cannot disagree.
 */
export function monarchFollowApplies(state: RoundState, side: PlayerSide): boolean {
  if (state.quarryCharacter !== QuarryCharacter.Monarch) {
    return false
  }
  if (side === QUARRY_SIDE) {
    return false
  }
  const lead = state.currentTrick[0]
  return lead !== undefined && lead.side === QUARRY_SIDE
}
