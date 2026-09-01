import { AbilityTier, TieredRank, tierAtLeast, type RankTierTable } from '../hunt'
import { CardRank, PlayerSide, type TrickCard } from './types'

/**
 * DLR-122 AC3 — THE statement of the deck's first asymmetry, and the only route by which any rule
 * in this tree may READ a tier.
 *
 * The Quarry plays the same 33-card deck under the same rules; a bought ladder applies to the
 * PLAYER's copies alone (`version-5-developer-idea.md` §7b). AC3 requires that to be enforced
 * explicitly rather than left to fall out of shared resolution code, which is why the table lookup
 * is a named module with one gate rather than an indexing expression repeated at each effect.
 *
 * A grep for `rankTiers[` or `playerRankTiers[` anywhere under `src/warCouncil/` must find
 * nothing: every read of the table comes through `tierForSide` below.
 *
 * BE PRECISE ABOUT WHAT THAT DOES AND DOES NOT COVER. This gate answers "what tier is in force for
 * this side"; it does NOT answer "which card in this trick does that tier apply to", because that
 * question needs the trick, which this module has no general access to. `swanTierFactsFor` below
 * answers it for the Swan and is therefore the whole of that rule. `resolveTrick.ts` answers it
 * for the Witch itself, in `isPlayersWitch`, because the tier arrives there already resolved to a
 * scalar and only the card's owner is left to test — that is the ONE ownership test outside this
 * file, it is pinned by `rankTiers.playCard.test.ts`'s "never lifts a QUARRY Witch above a
 * player's trump", and a third one appearing anywhere is the thing to push back on.
 */

/**
 * AC3's gate. Returns `AbilityTier.Bronze` — the printed ability, today's game — for any side that
 * is not the player, BEFORE the table is consulted at all, and for an absent table.
 *
 * An absent table is the same answer as an all-bronze one on purpose: `PlayCardOptions` makes
 * `playerRankTiers` optional so the Quarry's own call sites need no edit, and a caller that
 * forgets to thread it degrades to the printed ability rather than to `undefined`.
 */
export function tierForSide(
  tiers: RankTierTable | undefined,
  side: PlayerSide,
  rank: TieredRank,
): AbilityTier {
  if (side !== PlayerSide.Player) {
    return AbilityTier.Bronze
  }
  return tiers === undefined ? AbilityTier.Bronze : tiers[rank]
}

/**
 * DLR-122 AC4/AC5 — the two plain facts `bank.ts` consumes about the Swan ladder for one trick.
 *
 * Derived HERE rather than in `bank.ts` because it needs to know which SIDE played the Swan, and
 * `bank.ts` deliberately knows nothing about cards or sides — it is handed facts, exactly as it is
 * handed `blastGuarded` and `baseDamageBonus`. The outcome half of AC4 ("not an eaten skull") is
 * `bank.ts`'s, because outcomes are its subject; the ownership half is this module's.
 *
 * `swanKeepsBank` implies `swanKeepsMultiplier` — gold is above silver on the ladder, so
 * `tierAtLeast` reports both true at gold. `bank.ts` folds the implication in again rather than
 * trusting it, so a hand-built fact object in a spec cannot produce the nonsense state "the bank
 * survives but the streak that valued it does not".
 */
export interface SwanTierFacts {
  readonly swanKeepsMultiplier: boolean
  readonly swanKeepsBank: boolean
}

export function swanTierFactsFor(
  trick: readonly TrickCard[],
  tiers: RankTierTable | undefined,
): SwanTierFacts {
  // AC3 — the SIDE test is here, in the same expression that finds the card. A Swan the Quarry
  // played can never satisfy it, whatever the player has bought.
  const playerPlayedSwan = trick.some(
    (t) => t.side === PlayerSide.Player && t.card.rank === CardRank.Swan,
  )
  if (!playerPlayedSwan) {
    return { swanKeepsMultiplier: false, swanKeepsBank: false }
  }
  const tier = tierForSide(tiers, PlayerSide.Player, TieredRank.Swan)
  return {
    swanKeepsMultiplier: tierAtLeast(tier, AbilityTier.Silver),
    swanKeepsBank: tierAtLeast(tier, AbilityTier.Gold),
  }
}
