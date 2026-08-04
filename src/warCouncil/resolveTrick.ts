import { CardRank, type PlayerSide, type Suit, type TrickCard } from './types'

// trick is [leadCard, followCard] — order is load-bearing; swapping it silently changes
// the result via the lead-suit-wins-ties-off-suit branch
export function resolveTrickWinner(
  trick: readonly [TrickCard, TrickCard],
  trumpSuit: Suit,
): PlayerSide {
  const [lead, follow] = trick
  const witchCount = [lead, follow].filter((t) => t.card.rank === CardRank.Witch).length

  const isEffectiveTrump = (t: TrickCard): boolean =>
    t.card.suit === trumpSuit || (witchCount === 1 && t.card.rank === CardRank.Witch)

  const leadIsTrump = isEffectiveTrump(lead)
  const followIsTrump = isEffectiveTrump(follow)

  if (leadIsTrump || followIsTrump) {
    if (leadIsTrump && followIsTrump) {
      return lead.card.rank > follow.card.rank ? lead.side : follow.side
    }
    return leadIsTrump ? lead.side : follow.side
  }

  if (follow.card.suit === lead.card.suit) {
    return lead.card.rank > follow.card.rank ? lead.side : follow.side
  }
  return lead.side
}
