import { cardsOfSuit } from './cardUtils'
import { monarchFollowApplies, monarchFollowSet } from './quarryRuleBreak'
import { CardRank, type Card, type PlayerSide, type RoundState } from './types'

export function legalMoves(state: RoundState, side: PlayerSide): readonly Card[] {
  const hand = state.hands[side]

  if (state.currentTrick.length === 0) {
    return hand
  }

  const led = state.currentTrick[0].card

  // Two independent conditions produce the same narrowing: the single-card ability, which
  // fires on the led card's rank, and the encounter's round-long rule-break (§4). The
  // round-long version is an additional condition, not a replacement (DLR-51 AC2) — the
  // ability in abilities.ts is untouched.
  if (led.rank === CardRank.Monarch || monarchFollowApplies(state, side)) {
    const options = monarchFollowSet(hand, led.suit)
    return options.length > 0 ? options : hand
  }

  const followSuit = cardsOfSuit(hand, led.suit)
  return followSuit.length > 0 ? followSuit : hand
}
