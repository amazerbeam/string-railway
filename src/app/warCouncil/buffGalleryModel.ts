/**
 * DLR-148 Phase 1 — the buff gallery's pure view-model. Groups the owned pile into runs, collapses
 * exact duplicates into counted stacks, and fences whatever cannot be activated right now behind a
 * shared reason. No React, no DOM — tested without a renderer under the `node` Vitest project.
 *
 * Named `buffGalleryModel.ts` rather than `buffGallery.ts` (Phase 1's original name) as of Phase 3:
 * this file and the new `BuffGallery.tsx` component differ only by case, and this dev environment's
 * Vite/vitest module resolution folds two source files that differ only by case into ONE cached
 * module id even though the underlying filesystem itself is case-sensitive here — `import BuffGallery
 * from './BuffGallery'` silently resolved to THIS file's exports (no default export, so `undefined`)
 * the moment both were imported into the same module graph. Renamed rather than worked around, since
 * the same collision would recur in the real app bundle the instant `WarCouncilRound.tsx` imports
 * both. No behaviour changed by the rename — every export below is unchanged.
 */
import {
  buffCombineKey,
  BuffCadence,
  BUFF_CADENCE,
  buffTargetSuitOf,
  BuffTargetSuit,
  BuffTier,
  type Buff,
  type BuffActivationRefusal,
  type BuffId,
} from '../../hunt'

/** Which run a card sits in. `suit ?? (PRESS ? 'press' : 'suitless')` — the ticket's own key. */
export const BuffRunKind = {
  Bells: 'bells',
  Keys: 'keys',
  Moons: 'moons',
  Suitless: 'suitless',
  Press: 'press',
} as const
export type BuffRunKind = (typeof BuffRunKind)[keyof typeof BuffRunKind]

/** Run order in the grid. Suitless last of the passives, Press last of all. */
export const BUFF_RUN_ORDER: readonly BuffRunKind[] = [
  BuffRunKind.Bells,
  BuffRunKind.Keys,
  BuffRunKind.Moons,
  BuffRunKind.Suitless,
  BuffRunKind.Press,
]

/** One grid cell: every held copy of one exact card. */
export interface BuffStack {
  /** The copy a tap acts on — the first in pile order, so repeated taps spend a stable copy. */
  readonly buff: Buff
  /** Every held copy's id, pile order. `ids.length` is AC7's exact `×N`. */
  readonly ids: readonly BuffId[]
  readonly count: number
  readonly run: BuffRunKind
  /** `null` when usable right now. Non-null puts this stack in the fence. */
  readonly refusal: BuffActivationRefusal | null
}

export interface BuffRun {
  readonly kind: BuffRunKind
  /** Tier descending, then template id ascending so the order is total and stable. */
  readonly stacks: readonly BuffStack[]
  /** Sum of `count` — the figure the run tab prints. */
  readonly held: number
}

export interface BuffFence {
  readonly stacks: readonly BuffStack[]
  readonly held: number
  /** The single shared reason, or `null` when the fenced stacks do not agree on one. */
  readonly reason: BuffActivationRefusal | null
}

export interface BuffGalleryView {
  /** Only runs with at least one usable stack. Empty runs render no tab. */
  readonly runs: readonly BuffRun[]
  readonly fence: BuffFence
  readonly held: number
  readonly usable: number
}

const RUN_FOR_SUIT: Readonly<Record<BuffTargetSuit, BuffRunKind>> = {
  [BuffTargetSuit.Bells]: BuffRunKind.Bells,
  [BuffTargetSuit.Keys]: BuffRunKind.Keys,
  [BuffTargetSuit.Moons]: BuffRunKind.Moons,
}

/** The ticket's own key: `suit ?? (cadence === PRESS ? 'press' : 'suitless')`. PRESS is the display
 *  word for `BuffCadence.Activated`, so the cadence is read from `BUFF_CADENCE` and never from a
 *  hard-coded list of the two activated kinds — restoring a consumable must not need an edit here. */
export function buffRunOf(buff: Buff): BuffRunKind {
  const suit = buffTargetSuitOf(buff)
  if (suit !== null) return RUN_FOR_SUIT[suit]
  return BUFF_CADENCE[buff.kind] === BuffCadence.Activated
    ? BuffRunKind.Press
    : BuffRunKind.Suitless
}

/** AC7's "exact ×N" is only true if the collapse key is exact: two cards merge only when they are
 *  the same card in EVERY respect a player could tell apart. DLR-159 moved that composition into
 *  `src/hunt/buffCombine.ts` — the shop combines on exactly this rule, and two answers to "is this
 *  the same card" is the drift this delegation exists to prevent. */
export function buffStackKey(buff: Buff): string {
  return buffCombineKey(buff)
}

const TIER_RANK: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}

interface StackAccumulator {
  readonly buff: Buff
  readonly ids: BuffId[]
}

/** Walks `buffs` once into stacks keyed by `buffStackKey`, calls `refusalFor` once per STACK
 *  (never once per copy), then partitions into runs and fence and sorts each run by tier descending
 *  then `buffStackKey` ascending — a total order, so two identical piles in different input order
 *  always produce an identical grid. No `Math.random()`, no date, no mutation of the input. */
export function buildBuffGallery(
  buffs: readonly Buff[],
  refusalFor: (buff: Buff) => BuffActivationRefusal | null,
): BuffGalleryView {
  const accByKey = new Map<string, StackAccumulator>()
  for (const buff of buffs) {
    const key = buffStackKey(buff)
    const existing = accByKey.get(key)
    if (existing === undefined) {
      accByKey.set(key, { buff, ids: [buff.id] })
    } else {
      existing.ids.push(buff.id)
    }
  }

  const stacks: BuffStack[] = Array.from(accByKey.values())
    .map((acc) => ({
      buff: acc.buff,
      ids: acc.ids,
      count: acc.ids.length,
      run: buffRunOf(acc.buff),
      refusal: refusalFor(acc.buff),
    }))
    .sort((a, b) => {
      const tierDiff = TIER_RANK[b.buff.tier] - TIER_RANK[a.buff.tier]
      if (tierDiff !== 0) return tierDiff
      const keyA = buffStackKey(a.buff)
      const keyB = buffStackKey(b.buff)
      return keyA < keyB ? -1 : keyA > keyB ? 1 : 0
    })

  const runs: BuffRun[] = []
  for (const kind of BUFF_RUN_ORDER) {
    const runStacks = stacks.filter((stack) => stack.run === kind && stack.refusal === null)
    if (runStacks.length === 0) continue
    runs.push({
      kind,
      stacks: runStacks,
      held: runStacks.reduce((sum, stack) => sum + stack.count, 0),
    })
  }

  const fenceStacks = stacks.filter((stack) => stack.refusal !== null)
  const fenceHeld = fenceStacks.reduce((sum, stack) => sum + stack.count, 0)
  const fenceReasons = new Set(fenceStacks.map((stack) => stack.refusal))
  const reason = fenceReasons.size === 1 ? (fenceStacks[0].refusal ?? null) : null

  const held = stacks.reduce((sum, stack) => sum + stack.count, 0)

  return {
    runs,
    fence: { stacks: fenceStacks, held: fenceHeld, reason },
    held,
    usable: held - fenceHeld,
  }
}
