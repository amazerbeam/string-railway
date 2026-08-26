import { BuffKind, BuffRewardAxis } from './buffs'
import {
  BUFF_TEMPLATES,
  type BuffActivatedTemplateKind,
  type BuffTemplate,
  type MintableConditionKind,
  type MintableRewardAxis,
} from './buffTemplates'
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

/** Every kind a template can carry — DLR-145's 3 surviving condition families plus DLR-132's 2
 *  activated cards. `SLOT_AXIS_WEIGHTS` is deliberately NOT widened: an activated template has no
 *  axis. */
export type SlotTemplateKind = MintableConditionKind | BuffActivatedTemplateKind

/** Relative weight per family, per machine. Only RATIOS matter. AGENT-CHOSEN.
 *  UNIT: relative weight, >= 0, unitless. */
export type SlotFamilyWeights = Readonly<Record<SlotTemplateKind, number>>
/** Relative weight per reward axis, per machine. AGENT-CHOSEN. */
export type SlotAxisWeights = Readonly<Record<MintableRewardAxis, number>>

/** Trick/fight lean — weight on the Event-cadence families that pay inside a hand — and
 *  permanent-upgrade lean — weight on the hand-shaped Threshold goals and, via the axis table, on
 *  the coin axis, which DLR-111 names as the one run-permanent reward. AGENT-CHOSEN, unplayed;
 *  see `plan.md` → Risks and `tasks.md` → Developer decides or observes. */
// DLR-145 — pruned to the 3 surviving condition families plus Cheat and Timebomb. EVERY SURVIVING
// NUMBER IS UNCHANGED from the pre-pruning table; MarkOfRank, Glutton, Hoarder, Unbloodied,
// DebtCollector, Keepsake, Miser and Cornered simply have no row here any more — their
// `CONDITION_MODIFIER` price, `buffFires` case and `BUFF_CADENCE` row are untouched. Nobody chose a
// replacement lean for the weight their removal frees up; that is a developer decision, not this
// ticket's to make (`tasks.md` → Developer decides or observes).
export const SLOT_FAMILY_WEIGHTS: Readonly<Record<SlotMachineId, SlotFamilyWeights>> = {
  [SlotMachineId.Skirmisher]: {
    [BuffKind.Taker]: 5,
    [BuffKind.Feeder]: 4,
    [BuffKind.Sidestep]: 2,
    // DLR-132 — NOBODY CHOSE THESE TWO NUMBERS. Both cards are in-hand tactical plays. Only RATIOS
    // matter within one machine's table. UNIT: relative weight, >= 0, unitless.
    [BuffKind.Cheat]: 3,
    [BuffKind.Timebomb]: 3,
  },
  [SlotMachineId.Strongbox]: {
    [BuffKind.Taker]: 2,
    [BuffKind.Feeder]: 2,
    [BuffKind.Sidestep]: 1,
    // DLR-132 — see the Skirmisher table's comment above; same nobody-approved status.
    [BuffKind.Cheat]: 1,
    [BuffKind.Timebomb]: 1,
  },
}

// DLR-145 — pruned to Blade (Magnitude) and Momentum (Multiplier), the only two axes a template can
// still pay on. EVERY SURVIVING NUMBER IS UNCHANGED. Coins and ApRefund's removal is what
// Strongbox's original coin/refund lean (4/3) rode on; no replacement lean for the freed weight has
// been chosen — a developer decision, not this ticket's to make.
export const SLOT_AXIS_WEIGHTS: Readonly<Record<SlotMachineId, SlotAxisWeights>> = {
  [SlotMachineId.Skirmisher]: {
    [BuffRewardAxis.Magnitude]: 3,
    [BuffRewardAxis.Multiplier]: 3,
  },
  [SlotMachineId.Strongbox]: {
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
    // DLR-132 — an ACTIVATED template has no axis. Skipped here rather than defaulting its axis
    // weight to 0: without this, `?? 0` would still add a zero-valued entry for `template.kind`,
    // which is harmless for the total but is the wrong reason for a condition family's total to
    // ever be right — this loop must not touch a family it isn't a condition template of.
    if (template.form !== 'condition') continue
    const axisWeight = SLOT_AXIS_WEIGHTS[machineId][template.axis] ?? 0
    totals[template.kind] = (totals[template.kind] ?? 0) + axisWeight
  }
  return totals
}

/** Templates per activated family, derived ONCE at module load beside `FAMILY_AXIS_TOTAL`, so an
 *  activated family's share of a strip equals its family weight regardless of how many templates
 *  it grows to hold — the same invariant the condition branch's normalisation gives. */
const ACTIVATED_FAMILY_SIZE: Readonly<Record<string, number>> = (() => {
  const sizes: Record<string, number> = {}
  for (const template of BUFF_TEMPLATES) {
    if (template.form !== 'activated') continue
    sizes[template.kind] = (sizes[template.kind] ?? 0) + 1
  }
  return sizes
})()

/** `familyWeight × axisWeight`, normalised by the family's own axis-weighted total, for a
 *  CONDITION template — so a family's share of a strip equals its family weight regardless of its
 *  template count. `familyWeight / (templates in the family)` for an ACTIVATED template, which
 *  gives the same invariant with no axis to weight. Returns 0 for a family weighted 0, and 0
 *  rather than dividing when the relevant total is 0 — no `NaN` can reach a running weight total,
 *  on either branch. */
export function templateWeightFor(machineId: SlotMachineId, template: BuffTemplate): number {
  const familyWeight = SLOT_FAMILY_WEIGHTS[machineId][template.kind] ?? 0
  if (template.form === 'activated') {
    const size = ACTIVATED_FAMILY_SIZE[template.kind] ?? 0
    // Guarded for `familyAxisTotal`'s stated reason: no NaN may reach a running weight total.
    return size <= 0 ? 0 : familyWeight / size
  }
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

/**
 * DLR-145 — `weightedDrawWithoutReplacement`'s sibling, for a draw where a REPEAT IS THE POINT
 * rather than a bug: an opening pile of 20 from a 13-template pool, where three Bell-Takers is the
 * intended shape (design §3.4). EXACTLY ONE `rng()` call per item drawn, with the same
 * last-candidate fallback that catches float drift, and the total computed once because — unlike
 * the without-replacement version — the pool never changes.
 *
 * Returns EMPTY, not a short draw, when the candidates or the total positive weight are zero: a
 * caller asking for 20 from an all-zero table must not receive 19. Never mutates `candidates` and
 * never divides, so no `NaN` can reach a running weight total.
 */
export function weightedDrawWithReplacement<T>(
  candidates: readonly T[],
  weightOf: (item: T) => number,
  rng: Rng,
  count: number,
): readonly T[] {
  const total = candidates.reduce((sum, item) => sum + (weightOf(item) ?? 0), 0)
  if (candidates.length === 0 || total <= 0) return []

  const drawn: T[] = []
  while (drawn.length < count) {
    let threshold = rng() * total
    let index = candidates.length - 1
    for (let i = 0; i < candidates.length; i++) {
      threshold -= weightOf(candidates[i]) ?? 0
      if (threshold < 0) {
        index = i
        break
      }
    }
    drawn.push(candidates[index])
  }
  return drawn
}
