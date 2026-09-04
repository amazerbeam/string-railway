import { AbilityTier, tierAtLeast } from '../hunt'
import { CardRank, PlayerSide, type TrickCard, type Suit } from './types'

// trick is [leadCard, followCard] — order is load-bearing; swapping it silently changes
// the result via the lead-suit-wins-ties-off-suit branch
export function resolveTrickWinner(
  trick: readonly [TrickCard, TrickCard],
  trumpSuit: Suit,
  /**
   * DLR-122 — the PLAYER's Witch ladder. DEFAULTED to bronze, which is today's printed rule
   * exactly, so every existing caller and every existing spec is unchanged and a caller that
   * forgets to thread it degrades to the printed ability rather than to `undefined`.
   *
   * AC3's asymmetry is in the two predicates below, each of which tests
   * `t.side === PlayerSide.Player` before this value is consulted at all: the Quarry's Witch
   * resolves at bronze whatever the player has bought.
   */
  playerWitchTier: AbilityTier = AbilityTier.Bronze,
): PlayerSide {
  const [lead, follow] = trick
  const witchCount = [lead, follow].filter((t) => t.card.rank === CardRank.Witch).length

  // The tier arrives already resolved to a scalar by `rankTierRules.ts`'s `tierForSide`, which is
  // the only route to the table (AC3). What is left here is WHOSE Witch a card is, which needs the
  // trick and therefore cannot live in that module — see its docblock, which names this as the one
  // ownership test outside it. Both predicates below start from this one, so the side is compared
  // exactly once in this file.
  const isPlayersWitch = (t: TrickCard): boolean =>
    t.card.rank === CardRank.Witch && t.side === PlayerSide.Player

  // Silver — "two Witches no longer cancel: yours still counts". The player's Witch stays
  // effective trump even in the mirror the printed rule cancels. The Quarry's does not.
  const uncancellableWitch = (t: TrickCard): boolean =>
    isPlayersWitch(t) && tierAtLeast(playerWitchTier, AbilityTier.Silver)

  // Gold — "counts as trump AND as the highest card of the trump suit". Expressed as a
  // comparison override rather than as a fictional rank, so nothing anywhere has to invent a
  // number above the Monarch's 11 and no other rule sees a rank the deck cannot contain.
  const outranksEveryTrump = (t: TrickCard): boolean =>
    isPlayersWitch(t) && tierAtLeast(playerWitchTier, AbilityTier.Gold)

  const isEffectiveTrump = (t: TrickCard): boolean =>
    t.card.suit === trumpSuit ||
    (t.card.rank === CardRank.Witch && (witchCount === 1 || uncancellableWitch(t)))

  const leadIsTrump = isEffectiveTrump(lead)
  const followIsTrump = isEffectiveTrump(follow)

  if (leadIsTrump || followIsTrump) {
    if (leadIsTrump && followIsTrump) {
      if (outranksEveryTrump(lead)) return lead.side
      if (outranksEveryTrump(follow)) return follow.side
      return lead.card.rank > follow.card.rank ? lead.side : follow.side
    }
    return leadIsTrump ? lead.side : follow.side
  }

  if (follow.card.suit === lead.card.suit) {
    return lead.card.rank > follow.card.rank ? lead.side : follow.side
  }
  return lead.side
}
