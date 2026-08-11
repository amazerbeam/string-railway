import { HuntDeclaration } from '../hunt'
import { sameCard } from './cardUtils'
import { QUARRY_SIDE } from './quarryRuleBreak'
import type { RoundState, TrickCard } from './types'

export const ClaimRejection = {
  NotDeclaredLose: 'notDeclaredLose',
  NoCreditsRemaining: 'noCreditsRemaining',
  TrickAlreadyCredited: 'trickAlreadyCredited',
  TrickNotLost: 'trickNotLost',
} as const
export type ClaimRejection = (typeof ClaimRejection)[keyof typeof ClaimRejection]

export type ClaimResult =
  | { readonly ok: true; readonly state: RoundState }
  | { readonly ok: false; readonly reason: ClaimRejection }

/**
 * Whether `trick` is the ordered tail of the Quarry's capture pile.
 *
 * This is how the Quarry's win is established, and the choice is load-bearing:
 * `playCard` appends exactly `[lead, follow]` to the WINNER's `capturedCards` on every
 * resolved trick (`playCard.ts` — the `capturedCards` rebuild), so that tail IS the
 * just-lost trick, read off the engine's own recorded outcome.
 *
 * Deliberately NOT a re-run of `resolveTrickWinner`: the Fox can exchange the decree
 * mid-trick and mutate `trumpSuit`, so the trump suit recorded after the fact is not
 * necessarily the one that decided the trick. Re-resolving would be unsound.
 *
 * A change to `playCard`'s capture accounting invalidates this — see the matching note
 * in `playCard.ts`.
 */
function isQuarryPileTail(state: RoundState, trick: readonly [TrickCard, TrickCard]): boolean {
  const pile = state.capturedCards[QUARRY_SIDE]
  if (pile.length < 2) {
    return false
  }
  const tail = pile.slice(-2)
  return sameCard(tail[0], trick[0].card) && sameCard(tail[1], trick[1].card)
}

function rejectionFor(
  state: RoundState,
  trick: readonly [TrickCard, TrickCard],
): ClaimRejection | null {
  const declaration = state.declaration
  if (declaration === undefined || declaration.path !== HuntDeclaration.Lose) {
    return ClaimRejection.NotDeclaredLose
  }
  if (declaration.creditsRemaining <= 0) {
    return ClaimRejection.NoCreditsRemaining
  }
  if (state.tricksPlayed <= declaration.creditedThrough) {
    return ClaimRejection.TrickAlreadyCredited
  }
  if (!isQuarryPileTail(state, trick)) {
    return ClaimRejection.TrickNotLost
  }
  return null
}

/**
 * AC3: spends one Lose-credit on a trick the player lost, crediting its two cards to
 * `declaration.creditedCards` so `spoils` can sum them at their inverted values.
 *
 * `capturedCards` and `tricksWon` are untouched — the Quarry genuinely took the trick;
 * only the player's Spoils changes.
 */
export function claimLostTrick(
  state: RoundState,
  trick: readonly [TrickCard, TrickCard],
): ClaimResult {
  const reason = rejectionFor(state, trick)
  if (reason !== null) {
    return { ok: false, reason }
  }

  // Non-null by construction: `rejectionFor` returns NotDeclaredLose otherwise.
  const declaration = state.declaration!

  return {
    ok: true,
    state: {
      ...state,
      declaration: {
        ...declaration,
        creditsRemaining: declaration.creditsRemaining - 1,
        creditedCards: [...declaration.creditedCards, trick[0].card, trick[1].card],
        creditedThrough: state.tricksPlayed,
      },
    },
  }
}

/**
 * The predicate the UI derives its claim control from. Shares `rejectionFor` with
 * `claimLostTrick`, so the offer and the guard cannot disagree.
 */
export function canClaimLostTrick(
  state: RoundState,
  trick: readonly [TrickCard, TrickCard],
): boolean {
  return rejectionFor(state, trick) === null
}
