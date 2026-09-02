import { BuffTier, type Buff, type BuffId } from '../../hunt'
import { buffStackKey } from '../warCouncil/buffGalleryModel'

/**
 * 2026-09-01 — what the player is holding, grouped for the shop's "What you hold" tray.
 *
 * Deliberately NOT `buildBuffGallery`: that model exists to answer an in-fight question — which
 * stacks can be activated right now, and which are fenced off — and it demands a
 * `refusalFor` predicate to answer it. Between fights nothing can be activated at all, so every
 * stack would come back with the same fabricated answer, and the runs/fence split it produces has
 * nothing to say here. This is the read-only half: group, count, order.
 *
 * `buffStackKey` is IMPORTED rather than restated, so two cards that stack on the felt stack in the
 * shop and there is one rule for what "the same card" means.
 */

/** One pile of identical cards, as the shop reads it. */
export interface HeldBuffStack {
  /** The copy whose wording and tier the pile is drawn from. */
  readonly buff: Buff
  readonly count: number
  /** DLR-159 — every held copy's id, ascending. The shop's combine consumes the two lowest, and
   *  the tray itself ignores this. `count` stays rather than becoming `ids.length`: the tray reads
   *  a count and should not have to know it is reading a list. */
  readonly ids: readonly BuffId[]
}

const TIER_RANK: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}

/**
 * Walks `buffs` once into piles keyed by `buffStackKey`, then orders them tier DESCENDING and
 * `buffStackKey` ascending — a total order, so the same holdings always draw the same tray
 * regardless of the order they were won in. Best cards first, because the tray is scanned rather
 * than read.
 *
 * Pure: no `Math.random()`, no date, and the input array is never mutated.
 */
export function heldBuffStacks(buffs: readonly Buff[]): readonly HeldBuffStack[] {
  const byKey = new Map<string, { buff: Buff; ids: BuffId[] }>()
  for (const buff of buffs) {
    const key = buffStackKey(buff)
    const existing = byKey.get(key)
    if (existing === undefined) byKey.set(key, { buff, ids: [buff.id] })
    else existing.ids.push(buff.id)
  }
  return [...byKey.entries()]
    .sort(([keyA, a], [keyB, b]) => {
      const byTier = TIER_RANK[b.buff.tier] - TIER_RANK[a.buff.tier]
      return byTier !== 0 ? byTier : keyA.localeCompare(keyB)
    })
    .map(([, stack]) => ({
      buff: stack.buff,
      count: stack.ids.length,
      ids: [...stack.ids].sort((a, b) => a - b),
    }))
}

/** Total copies held — the figure the tray's heading prints. Counts COPIES, not piles, so two
 *  Bell-Takers read as two cards and not as one. */
export function heldBuffCount(buffs: readonly Buff[]): number {
  return buffs.length
}
