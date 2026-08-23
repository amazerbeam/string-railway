import { BuffKind, BuffRewardAxis } from './buffs'
import type { BuffConditionKind, BuffCostAxis } from './buffCosts'
import { BUFF_TEMPLATES, type BuffTemplate } from './buffTemplates'
import { SlotMachineId } from './slotConfig'
import type { Rng } from './seededRng'

/**
 * DLR-112 — the per-machine weight model, and `src/warCouncil/skulls.ts`'s `weightedDraw`
 * re-stated generically. `src/hunt/` cannot import `src/warCouncil/` without a cycle —
 * `warCouncil` already imports `hunt`, and the reverse edge is the cycle both modules' comments
 * call out — so `weightedDrawWithoutReplacement` below is a deliberate re-statement, the same
 * reason `BuffTargetSuit` already duplicates `Suit`.
 *
 * `SLOT_FAMILY_WEIGHTS` and `SLOT_AXIS_WEIGHTS` are AGENT-CHOSEN under the 2026-08-23 sprint-run
 * tuning-value override, never played against a real hand — the same register `buffCosts.ts`
 * already carries for DLR-111's figures. Only RATIOS matter within one machine's table, so a
 * curve can be reshaped without renormalising it.
 */

/** Relative weight per condition family, per machine. Only RATIOS matter. AGENT-CHOSEN.
 *  UNIT: relative weight, >= 0, unitless. */
export type SlotFamilyWeights = Readonly<Record<BuffConditionKind, number>>
/** Relative weight per reward axis, per machine. AGENT-CHOSEN. */
export type SlotAxisWeights = Readonly<Record<BuffCostAxis, number>>

/** Trick/fight lean — weight on the Event-cadence families that pay inside a hand — and
 *  permanent-upgrade lean — weight on the hand-shaped Threshold goals and, via the axis table, on
 *  the coin axis, which DLR-111 names as the one run-permanent reward. AGENT-CHOSEN, unplayed;
 *  see `plan.md` → Risks and `tasks.md` → Developer decides or observes. */
export const SLOT_FAMILY_WEIGHTS: Readonly<Record<SlotMachineId, SlotFamilyWeights>> = {
  [SlotMachineId.Skirmisher]: {
    [BuffKind.Taker]: 5,
    [BuffKind.Feeder]: 4,
    [BuffKind.MarkOfRank]: 3,
    [BuffKind.Sidestep]: 2,
    [BuffKind.Glutton]: 4,
    [BuffKind.Hoarder]: 1,
    [BuffKind.Unbloodied]: 1,
    [BuffKind.DebtCollector]: 3,
    [BuffKind.Keepsake]: 1,
    [BuffKind.Miser]: 1,
    [BuffKind.Cornered]: 1,
  },
  [SlotMachineId.Strongbox]: {
    [BuffKind.Taker]: 2,
    [BuffKind.Feeder]: 2,
    [BuffKind.MarkOfRank]: 1,
    [BuffKind.Sidestep]: 1,
    [BuffKind.Glutton]: 2,
    [BuffKind.Hoarder]: 5,
    [BuffKind.Unbloodied]: 4,
    [BuffKind.DebtCollector]: 2,
    [BuffKind.Keepsake]: 1,
    [BuffKind.Miser]: 2,
    [BuffKind.Cornered]: 2,
  },
}

export const SLOT_AXIS_WEIGHTS: Readonly<Record<SlotMachineId, SlotAxisWeights>> = {
  [SlotMachineId.Skirmisher]: {
    [BuffRewardAxis.Magnitude]: 3,
    [BuffRewardAxis.Multiplier]: 3,
    [BuffRewardAxis.ApRefund]: 2,
    [BuffRewardAxis.Coins]: 1,
  },
  [SlotMachineId.Strongbox]: {
    [BuffRewardAxis.Coins]: 4,
    [BuffRewardAxis.ApRefund]: 3,
    [BuffRewardAxis.Magnitude]: 1,
    [BuffRewardAxis.Multiplier]: 1,
  },
}

/** For one machine, one family: the sum of `axisWeight` across every template that family
 *  contains. Derived ONCE at module load into an immutable lookup — the way
 *  `SHOP_ITEMS_BY_CATEGORY` already derives from `SHOP_ITEMS` — so `templateWeightFor` never
 *  rescans the pool per call. */
const FAMILY_AXIS_TOTAL: Readonly<Record<SlotMachineId, Readonly<Record<string, number>>>> = {
  [SlotMachineId.Skirmisher]: familyAxisTotalsFor(SlotMachineId.Skirmisher),
  [SlotMachineId.Strongbox]: familyAxisTotalsFor(SlotMachineId.Strongbox),
}

function familyAxisTotalsFor(machineId: SlotMachineId): Readonly<Record<string, number>> {
  const totals: Record<string, number> = {}
  for (const template of BUFF_TEMPLATES) {
    const axisWeight = SLOT_AXIS_WEIGHTS[machineId][template.axis] ?? 0
    totals[template.kind] = (totals[template.kind] ?? 0) + axisWeight
  }
  return totals
}

/** `familyWeight × axisWeight`, normalised by the family's own axis-weighted total, so a family's
 *  share of a strip equals its family weight regardless of its template count. Returns 0 for a
 *  family weighted 0, and 0 rather than dividing when the family's axis-weighted total is 0 —
 *  no `NaN` can reach a running weight total. */
export function templateWeightFor(machineId: SlotMachineId, template: BuffTemplate): number {
  const familyWeight = SLOT_FAMILY_WEIGHTS[machineId][template.kind] ?? 0
  const axisWeight = SLOT_AXIS_WEIGHTS[machineId][template.axis] ?? 0
  const familyAxisTotal = FAMILY_AXIS_TOTAL[machineId][template.kind] ?? 0
  if (familyAxisTotal <= 0) return 0
  return (familyWeight * axisWeight) / familyAxisTotal
}

/** `src/warCouncil/skulls.ts`'s `weightedDraw`, generic and re-stated in `src/hunt/` because
 *  `hunt` cannot import `warCouncil` without a cycle. EXACTLY ONE `rng()` call per item drawn,
 *  with the same last-candidate fallback that catches float drift. Returns fewer than `count`
 *  when candidates or positive weight run out — legal, not an error. Copies its candidate array
 *  before splicing, so the caller's array (e.g. `BUFF_TEMPLATES`) is never mutated. */
export function weightedDrawWithoutReplacement<T>(
  candidates: readonly T[],
  weightOf: (item: T) => number,
  rng: Rng,
  count: number,
): readonly T[] {
  const pool = [...candidates]
  const drawn: T[] = []

  while (drawn.length < count && pool.length > 0) {
    const total = pool.reduce((sum, item) => sum + (weightOf(item) ?? 0), 0)
    if (total <= 0) {
      break
    }
    let threshold = rng() * total
    let index = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      threshold -= weightOf(pool[i]) ?? 0
      if (threshold < 0) {
        index = i
        break
      }
    }
    drawn.push(pool[index])
    pool.splice(index, 1)
  }

  return drawn
}
