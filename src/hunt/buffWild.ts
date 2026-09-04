import {
  buffIsWild,
  buffTargetSuitOf,
  BuffKind,
  type Buff,
  type BuffId,
  type BuffRewardAxis,
  type BuffTier,
} from './buffs'
import { narrowToMintedAxis } from './buffCosts'
import { REWARD_TIER_VALUE } from './buffTemplates'
import type { RunState } from './run'

/**
 * DLR-162 — the wild transition: what a wildcard refuses, what a card BECOMES when one is spent on
 * it, and the pile-level spend itself.
 *
 * PURE, like the rest of `src/hunt/`: no React, no DOM, no `Math.random()`. Every id is the
 * CALLER's — and the converted card deliberately keeps the id it already had, because it is the
 * same card, so `RunState.nextBuffId` does not advance on a spend and two runs on one seed stay
 * identical.
 *
 * A wild card is mintable ONLY here and NEVER from a template. That is deliberate rather than an
 * omission: `BUFF_TEMPLATES` is the candidate pool for both the reel strip and the run's opening
 * pile, and it is what `familyAxisTotalsFor` normalises family weights over, so a wild template
 * would dilute every existing suited template's weight and put an undealable card in two draws.
 * The consequence — `templateForBuff` returns `undefined` for a wild card — is handled in
 * `buffCombine.ts`'s `combineProductFor`, which mints through `mintWildAtTier` for the wild case.
 */

/** Why a wildcard cannot be spent on this card (AC5). A reason CODE, not a sentence —
 *  `src/app/run/manageBuffsLabels.ts` words it, as `COMBINE_REFUSAL_MESSAGE` words the other. */
export const WildRefusal = {
  /** The target names no suit at all — Skull Low, the two protective families, an activated card,
   *  or another wildcard. AC5: Skull Low already asks for no suit and needs nothing in return. */
  NoSuit: 'noSuit',
  /** The target is already wild; there is no second suit to take off. */
  AlreadyWild: 'alreadyWild',
} as const
export type WildRefusal = (typeof WildRefusal)[keyof typeof WildRefusal]

/** Whether `buff` is the spendable wildcard itself (rather than a card made wild by one). */
export function isWildcardCard(buff: Buff): boolean {
  return buff.kind === BuffKind.Wildcard
}

/** `null` when a wildcard may be spent on `target` right now. Order: AlreadyWild before NoSuit,
 *  because a wild card reports no suit and "already wild" is the more informative of the two
 *  true reasons — the same ordering argument `combineRefusalFor` makes for gold over NoPair. */
export function wildRefusalFor(target: Buff): WildRefusal | null {
  if (buffIsWild(target)) return WildRefusal.AlreadyWild
  if (buffTargetSuitOf(target) === null) return WildRefusal.NoSuit
  return null
}

/** A wild card at `tier`, minted from the SAME `REWARD_TIER_VALUE` ladder `mintFromTemplate`
 *  reads, so a wild silver Suit High card pays exactly what a suited silver one pays. THROWS a
 *  `RangeError` on an axis with no ladder rather than minting a zero-value card —
 *  `mintFromTemplate`'s own discipline, and a plausible-looking zero is the bug that type-checks.
 *  `id` is the CALLER's. */
export function mintWildAtTier(
  kind: BuffKind,
  axis: BuffRewardAxis,
  tier: BuffTier,
  id: BuffId,
): Buff {
  const ladder = REWARD_TIER_VALUE[narrowToMintedAxis(axis, `A wild card's reward axis`)]
  if (ladder === undefined) {
    throw new RangeError(
      `A wild ${kind} pays on axis ${axis}, which has no REWARD_TIER_VALUE ladder`,
    )
  }
  return { id, kind, tier, condition: { kind, wild: true }, reward: { axis, value: ladder[tier] } }
}

/** AC2/AC4 — `target` with its suit condition removed, KEEPING its own id, kind, tier and reward
 *  axis: it is the same card, so `RunState.nextBuffId` must not advance for it and two runs on one
 *  seed stay identical. */
export function wildenedBuff(target: Buff): Buff {
  return mintWildAtTier(target.kind, target.reward.axis, target.tier, target.id)
}

/** The pile with `wildcardId` removed and `targetId` replaced by its wild self, in place.
 *  THROWS a `RangeError` naming the reason rather than returning `run` unchanged, exactly as
 *  `combineBuffs` and `buyFromShop` do: a silent no-op on a destructive action is the failure this
 *  tree refuses to allow. Reaching a throw is a driver bug — no control is armable while
 *  `wildRefusalFor` is non-null. */
export function spendWildcard(run: RunState, wildcardId: BuffId, targetId: BuffId): RunState {
  const wildcard = run.buffs.find((buff) => buff.id === wildcardId)
  if (wildcard === undefined) {
    throw new RangeError(`Cannot spend wildcard ${wildcardId} — it is not in the pile`)
  }
  if (!isWildcardCard(wildcard)) {
    throw new RangeError(`Cannot spend buff ${wildcardId} — a ${wildcard.kind} is not a wildcard`)
  }
  const target = run.buffs.find((buff) => buff.id === targetId)
  if (target === undefined) {
    throw new RangeError(`Cannot make buff ${targetId} wild — it is not in the pile`)
  }
  const refusal = wildRefusalFor(target)
  if (refusal !== null) {
    throw new RangeError(`Cannot make buff ${targetId} wild — ${refusal}`)
  }
  return {
    ...run,
    // Pile ORDER is preserved: the pile's order is the player's mental order.
    buffs: run.buffs
      .filter((buff) => buff.id !== wildcardId)
      .map((buff) => (buff.id === targetId ? wildenedBuff(buff) : buff)),
  }
}
