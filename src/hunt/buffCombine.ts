import { BuffTier, buffIsWild, buffTargetRankOf, buffTargetSuitOf, type Buff, type BuffId } from './buffs'
import { mintFromTemplate, templateForBuff } from './buffTemplates'
import { isWildcardCard, mintWildAtTier } from './buffWild'
import { nextTierAfter } from './rankTiers'
import type { RunState } from './run'

/**
 * DLR-159 — combining two identical cards into one of the next tier. Lives in its own module
 * rather than in `runTransitions.ts`: that file stands at 396 lines against the 400-line blocking
 * budget, and one more transition would breach it in the same commit.
 *
 * Pure, like everything in `src/hunt/` — no React, no DOM, no `Math.random()`. The produced card's
 * id comes from `run.nextBuffId`, exactly as `withMintedBuff` mints a bought one.
 *
 * DLR-162 WIDENS the rule by exactly one clause: the suits may differ when one of the two cards is
 * WILD. Rather than replace DLR-159's pile model — which would take the Manage Buffs screen, the
 * felt's stacking and `buffStackKey`'s delegation with it — the rule gains a second, looser key
 * (`buffCombineFamilyKey`) beside the exact one, and one function, `combinePairFor`, that says
 * which two cards a combine actually consumes. `combineRefusalFor` and `combineBuffs` are both
 * written over it, so the answer a tile shows and the cards a commit destroys cannot disagree.
 *
 * AC7 — WILDNESS IS ABSORBING — is the single conditional at the head of `combineProductFor`: the
 * product is wild exactly when an input was, and no other branch here can produce a suited card
 * from a wild one. A WILDCARD (the card you spend, not a card made wild by one) is refused
 * outright with `CombineRefusal.Untiered`: every tier converts one card, so merging two would
 * halve the player's supply for nothing.
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
  /** DLR-162 — a wildcard has nothing that scales: every tier converts exactly one card, so
   *  combining two would halve the player's supply for no gain. Refused rather than allowed and
   *  then regretted — AC7's concern (a player cannot accidentally merge a wildcard's value away)
   *  applied to the wildcard itself rather than to a card made wild by one. */
  Untiered: 'untiered',
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
    // DLR-162 — no suitless Taker or Feeder exists today except a wild one, so nothing collides
    // right now. Included anyway: a key that cannot tell a wild card from a suitless one is a key
    // that stacks them together the moment something else changes.
    buffIsWild(buff) ? 'wild' : '',
    buff.reward.axis,
    buff.reward.value,
  ].join('|')
}

/** DLR-162 — AC6/AC8's "same family and reward axis, suits may differ". The LOOSER sibling of
 *  `buffCombineKey`: kind, tier, rank, reward axis and reward value, with the suit and the wild
 *  flag dropped. ONLY a wild pile is allowed to pair on it — AC8 keeps family and axis mandatory,
 *  and it is only the suit that is relaxed. */
export function buffCombineFamilyKey(buff: Buff): string {
  return [
    buff.kind,
    buff.tier,
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

/**
 * DLR-162 — THE one statement of what pairs with what. `combineRefusalFor` and `combineBuffs` both
 * read it, so what a tile offers and what a commit destroys cannot disagree.
 *
 * For a WILD pile a suited partner sharing `buffCombineFamilyKey` is preferred over a second wild
 * copy: both produce the same card, and pairing wild-with-suited leaves the player holding MORE
 * wild cards. A SUITED pile takes only the two-exact-copies branch — the wild pile owns the wild
 * combine, so one action is listed once on the screen rather than twice. Lowest ids throughout, so
 * repeated combines on one pile are deterministic.
 */
export function combinePairFor(
  buffs: readonly Buff[],
  key: string,
): readonly [Buff, Buff] | null {
  const copies = copiesOf(buffs, key)
  if (copies.length === 0) return null
  const head = copies[0]
  if (buffIsWild(head)) {
    const familyKey = buffCombineFamilyKey(head)
    const partner = buffs
      .filter((buff) => !buffIsWild(buff) && buffCombineFamilyKey(buff) === familyKey)
      .sort((a, b) => a.id - b.id)[0]
    if (partner !== undefined) return [head, partner]
  }
  return copies.length >= COPIES_PER_COMBINE ? [copies[0], copies[1]] : null
}

/** DLR-162 — the card a pair produces at `tier`, or `null` when neither input is wild and the
 *  pair's template is gone from this build. WILD IF EITHER INPUT IS WILD — this ONE conditional is
 *  AC7, and no other branch in this module can produce a suited card from a wild one. */
export function combineProductFor(
  a: Buff,
  b: Buff,
  tier: BuffTier,
  id: BuffId,
): Buff | null {
  if (buffIsWild(a) || buffIsWild(b)) return mintWildAtTier(a.kind, a.reward.axis, tier, id)
  const template = templateForBuff(a)
  return template === undefined ? null : mintFromTemplate(template, tier, id)
}

/** `null` when the pile named by `key` can be combined right now. */
export function combineRefusalFor(buffs: readonly Buff[], key: string): CombineRefusal | null {
  const copies = copiesOf(buffs, key)
  if (copies.length === 0) return CombineRefusal.NoPair
  // DLR-162 — read FIRST, because it is true of the CARD rather than of the pile's shape.
  if (isWildcardCard(copies[0])) return CombineRefusal.Untiered
  // Deliberate ordering: a lone gold copy is both `AtMaxTier` and, on its own, `NoPair` — gold
  // trumps count, since "already at the top" is the more informative of the two true reasons.
  const tier = nextBuffTierAfter(copies[0].tier)
  if (tier === null) return CombineRefusal.AtMaxTier
  const pair = combinePairFor(buffs, key)
  if (pair === null) return CombineRefusal.NoPair
  // A card this build has no template for cannot be re-minted. Impossible from a live pile today;
  // the guard is what stops a future pruning turning the screen into a crash. A WILD pair is
  // exempt: it never goes through a template at all (`combineProductFor`).
  if (combineProductFor(pair[0], pair[1], tier, 0) === null) return CombineRefusal.NoPair
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
  const spent = combinePairFor(run.buffs, key)
  const tier = spent === null ? null : nextBuffTierAfter(spent[0].tier)
  const product =
    spent === null || tier === null
      ? null
      : combineProductFor(spent[0], spent[1], tier, run.nextBuffId)
  if (spent === null || product === null) {
    // Unreachable: `combineRefusalFor` above has already refused both cases. Stated rather than
    // asserted away, so a future edit to the refusal cannot silently mint a wrong card.
    throw new RangeError(`Cannot combine ${key} — the refusal check and the mint disagree`)
  }
  const destroyed = new Set(spent.map((buff) => buff.id))
  return {
    ...run,
    buffs: [...run.buffs.filter((buff) => !destroyed.has(buff.id)), product],
    nextBuffId: run.nextBuffId + 1,
  }
}
