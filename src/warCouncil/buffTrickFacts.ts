import type { Buff, BuffBonusAccrual, BuffId } from '../hunt'
import { BuffTargetSuit } from '../hunt'
import type { TrickFacts } from './streak'
import { PlayerSide, Suit, type Card, type TrickCard } from './types'

/**
 * DLR-125 — the per-trick half of the buff evaluation context, derived from the trick itself.
 * THE single producer, read by `playCard` and by `cardDamage`'s preview, exactly as
 * `swanTierFactsFor` is: two readings of "what did the player play" is how a preview and a
 * commit drift apart.
 *
 * `src/hunt/` cannot see `TrickCard`, so this crossing lives on the `warCouncil` side and hands
 * `hunt` plain `BuffTargetSuit` values. The two suit unions are pinned member-for-member by a
 * test in `buffs.test.ts`; `TARGET_SUIT` below is the total map between them, so a member added
 * to `Suit` fails to compile here rather than silently mapping to `undefined`.
 */
const TARGET_SUIT: Readonly<Record<Suit, BuffTargetSuit>> = {
  [Suit.Bells]: BuffTargetSuit.Bells,
  [Suit.Keys]: BuffTargetSuit.Keys,
  [Suit.Moons]: BuffTargetSuit.Moons,
}

/** The `Suit → BuffTargetSuit` crossing, as a function so a second module can reuse the ONE
 *  statement of it rather than making a second map. `TARGET_SUIT` stays private and stays
 *  total, so a member added to `Suit` still fails to compile here rather than mapping to
 *  `undefined`. */
export function targetSuitOf(suit: Suit): BuffTargetSuit {
  return TARGET_SUIT[suit]
}

/** What the app layer supplies — everything the trick itself cannot say. */
export interface BuffHandInput {
  readonly active: readonly Buff[]
  readonly accrual: BuffBonusAccrual
  readonly firedThisHand: readonly BuffId[]
  readonly tricksWithoutHit: number
  readonly coins: number
  readonly playerHealth: number
  readonly applyDamagePressed: boolean
}

/** `null` in, `{ buffs: null }` out — a caller that evaluates no buffs says so once, here, and
 *  `bank.ts` needs no second guard. `remainingHand` is the player's hand AFTER the played card
 *  left it, which is what "at hand's end" means for Keepsake. */
export function buffTrickFactsFor(
  trick: readonly TrickCard[],
  remainingHand: readonly Card[],
  input: BuffHandInput | null,
): Pick<TrickFacts, 'buffs'> {
  if (input === null) return { buffs: null }
  const played = trick.filter((t) => t.side === PlayerSide.Player)
  return {
    buffs: {
      active: input.active,
      accrual: input.accrual,
      firedThisHand: input.firedThisHand,
      hand: {
        playerSuits: played.map((t) => targetSuitOf(t.card.suit)),
        playerRanks: played.map((t) => t.card.rank),
        remainingSuits: remainingHand.map((c) => targetSuitOf(c.suit)),
        tricksWithoutHit: input.tricksWithoutHit,
        coins: input.coins,
        playerHealth: input.playerHealth,
        applyDamagePressed: input.applyDamagePressed,
      },
    },
  }
}
