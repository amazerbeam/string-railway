import { BuffTier, buffTargetRankOf, buffTargetSuitOf, type Buff } from './buffs'
import { mintFromTemplate, templateForBuff } from './buffTemplates'
import { nextTierAfter } from './rankTiers'
import type { RunState } from './run'

/**
 * DLR-159 — combining two identical cards into one of the next tier. Lives in its own module
 * rather than in `runTransitions.ts`: that file stands at 396 lines against the 400-line blocking
 * budget, and one more transition would breach it in the same commit.
 *
 * Pure, like everything in `src/hunt/` — no React, no DOM, no `Math.random()`. The produced card's
 * id comes from `run.nextBuffId`, exactly as `withMintedBuff` mints a bought one.
 */

/** Why a pile cannot be combined. A reason CODE, not a sentence — `src/hunt/` holds no
 *  user-facing copy; `src/app/run/manageBuffsLabels.ts` maps these to words, exactly as
 *  `PURCHASE_REFUSAL_MESSAGE` maps `PurchaseRefusal`. */
export const CombineRefusal = {
  /** AC3 — the pile is gold and there is no rung above it. */
  AtMaxTier: 'atMaxTier',
  /** AC6 — fewer than two copies of this exact card at this exact tier, or a card whose template
   *  this build no longer has. Both read to the player as "nothing to pair it with". */
  NoPair: 'noPair',
} as const
export type CombineRefusal = (typeof CombineRefusal)[keyof typeof CombineRefusal]

/** How many copies one combine consumes. Not a tunable — AC2 is about a PAIR; the name exists so
 *  the two places that read it cannot disagree. */
const COPIES_PER_COMBINE = 2

/**
 * AC2's "identical in every respect" — two cards share this string exactly when they are the same
 * card at the same tier. THE statement of that rule: `buffStackKey` in
 * `src/app/warCouncil/buffGalleryModel.ts` delegates here rather than composing its own, so what
 * stacks on the felt and what combines in the shop cannot drift apart.
 */
export function buffCombineKey(buff: Buff): string {
  return [
    buff.kind,
    buff.tier,
    buffTargetSuitOf(buff) ?? '',
    buffTargetRankOf(buff) ?? '',
    buff.reward.axis,
    buff.reward.value,
  ].join('|')
}

/**
 * The next rung up, or `null` at gold. Delegates to `rankTiers.ts`'s `nextTierAfter` so
 * `TIER_LADDER` stays the codebase's ONE statement of tier order. `AbilityTier` and `BuffTier` are
 * the same three-member string union structurally, which is what makes the delegation type-check;
 * `buffCombine.test.ts` pins the two unions member-for-member, exactly as `buffs.test.ts` pins
 * `BuffTargetSuit` against the card layer's `Suit`.
 */
export function nextBuffTierAfter(tier: BuffTier): BuffTier | null {
  return nextTierAfter(tier)
}

/** Every held copy of the card named by `key`, in ascending id order — the order a combine
 *  consumes from, so repeated combines on one pile are deterministic. */
function copiesOf(buffs: readonly Buff[], key: string): readonly Buff[] {
  return buffs.filter((buff) => buffCombineKey(buff) === key).sort((a, b) => a.id - b.id)
}

/** `null` when the pile named by `key` can be combined right now. */
export function combineRefusalFor(buffs: readonly Buff[], key: string): CombineRefusal | null {
  const copies = copiesOf(buffs, key)
  if (copies.length === 0) return CombineRefusal.NoPair
  // Deliberate ordering: a lone gold copy is both `AtMaxTier` and, on its own, `NoPair` — gold
  // trumps count, since "already at the top" is the more informative of the two true reasons.
  if (nextBuffTierAfter(copies[0].tier) === null) return CombineRefusal.AtMaxTier
  if (copies.length < COPIES_PER_COMBINE) return CombineRefusal.NoPair
  // A card this build has no template for cannot be re-minted. Impossible from a live pile today;
  // the guard is what stops a future pruning turning the screen into a crash.
  if (templateForBuff(copies[0]) === undefined) return CombineRefusal.NoPair
  return null
}

/**
 * Two copies destroyed, one card of the next tier minted in their place, `nextBuffId` advanced by
 * one. The produced card goes through `mintFromTemplate`, so it is indistinguishable from one the
 * slot machine could have dealt — which is what makes it stack with one, and what gives Cheat
 * (AC5) its own tier ladder with no branch here that knows it is special.
 *
 * THROWS a `RangeError` naming the refusal rather than returning `run` unchanged, exactly as
 * `buyFromShop` and `pullSlotMachine` do: a silent no-op on a destructive action is the failure
 * this module refuses to allow. Reaching the throw is a driver bug — the tile is not armable while
 * `combineRefusalFor` is non-null.
 */
export function combineBuffs(run: RunState, key: string): RunState {
  const refusal = combineRefusalFor(run.buffs, key)
  if (refusal !== null) {
    throw new RangeError(
      `Cannot combine ${key} — ${refusal} (holding ${run.buffs.length} cards, ${copiesOf(run.buffs, key).length} of this card)`,
    )
  }
  const copies = copiesOf(run.buffs, key)
  const spent = copies.slice(0, COPIES_PER_COMBINE)
  const tier = nextBuffTierAfter(spent[0].tier)
  const template = templateForBuff(spent[0])
  if (tier === null || template === undefined) {
    // Unreachable: `combineRefusalFor` above has already refused both cases. Stated rather than
    // asserted away, so a future edit to the refusal cannot silently mint a wrong card.
    throw new RangeError(`Cannot combine ${key} — the refusal check and the mint disagree`)
  }
  const destroyed = new Set(spent.map((buff) => buff.id))
  return {
    ...run,
    buffs: [
      ...run.buffs.filter((buff) => !destroyed.has(buff.id)),
      mintFromTemplate(template, tier, run.nextBuffId),
    ],
    nextBuffId: run.nextBuffId + 1,
  }
}
