/**
 * DLR-160 Phase 5 (AC8) — the buff gallery's two independent filters, composed into ONE value.
 * Two independent `useState` calls would admit a pair — say, a stale tier paired with a suit the
 * counts were never recomputed over — that this single object makes unexpressible. No React, no
 * DOM: pure over `BuffGalleryView` and `BuffStack`, the view-model `buffGalleryModel.ts` already
 * builds.
 *
 * Named `buffSuitFilterModel.ts` rather than the plan's original `buffSuitFilter.ts` — this file
 * and the sibling `BuffSuitFilter.tsx` component would otherwise differ only by case, exactly the
 * collision `buffGalleryModel.ts`'s own docblock already documents for `BuffGallery.tsx`: this
 * dev environment's Vite/Vitest/tsc module resolution folds two source files that differ only by
 * case into ONE cached module id on Windows even though the underlying filesystem is
 * case-sensitive. Confirmed here as `tsc -b`'s TS1149/TS1192 the moment both files existed side
 * by side. No behaviour differs from what the plan specified — only the filename.
 */
import type { BuffTier } from '../../hunt'
import { BuffRunKind, type BuffGalleryView, type BuffStack } from './buffGalleryModel'

export interface BuffGalleryFilter {
  readonly tier: BuffTier | 'all'
  readonly run: BuffRunKind | 'all'
}

export const ALL_FILTERS: BuffGalleryFilter = { tier: 'all', run: 'all' }

/** Both axes must agree — the intersection, not either filter alone. */
export function matchesFilter(stack: BuffStack, filter: BuffGalleryFilter): boolean {
  const tierMatches = filter.tier === 'all' || stack.buff.tier === filter.tier
  const runMatches = filter.run === 'all' || stack.run === filter.run
  return tierMatches && runMatches
}

const ZERO_RUN_COUNTS: Readonly<Record<BuffRunKind | 'all', number>> = {
  all: 0,
  [BuffRunKind.Bells]: 0,
  [BuffRunKind.Keys]: 0,
  [BuffRunKind.Moons]: 0,
  [BuffRunKind.Wild]: 0,
  [BuffRunKind.Suitless]: 0,
  [BuffRunKind.Press]: 0,
}

/** Per-run held counts for the suit chip row, summed over the stacks the TIER filter already
 *  allows — so picking "Gold" narrows what the suit chips' own numbers say before a suit is even
 *  picked, rather than the suit row reporting figures for cards a tier pick already hid. */
export function runCountsFor(
  view: BuffGalleryView,
  tier: BuffTier | 'all',
): Readonly<Record<BuffRunKind | 'all', number>> {
  const counts: Record<BuffRunKind | 'all', number> = { ...ZERO_RUN_COUNTS }
  const allStacks = [...view.runs.flatMap((run) => run.stacks), ...view.fence.stacks]
  for (const stack of allStacks) {
    if (tier !== 'all' && stack.buff.tier !== tier) continue
    counts[stack.run] += stack.count
    counts.all += stack.count
  }
  return counts
}
