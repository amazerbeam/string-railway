import { describe, expect, it } from 'vitest'
import {
  SLOT_AXIS_WEIGHTS,
  SLOT_FAMILY_WEIGHTS,
  templateWeightFor,
  weightedDrawWithoutReplacement,
} from '../slotWeights'
import { BUFF_TEMPLATES, templatesForFamily } from '../buffTemplates'
import { SLOT_MACHINE_IDS, SlotMachineId } from '../slotConfig'
import { createSeededRng } from '../seededRng'
import { BuffKind } from '../buffs'

describe('templateWeightFor', () => {
  it.each(SLOT_MACHINE_IDS)('gives each family its stated share on %s', (machineId) => {
    for (const [kind, weight] of Object.entries(SLOT_FAMILY_WEIGHTS[machineId])) {
      const total = templatesForFamily(kind as never).reduce(
        (sum, t) => sum + templateWeightFor(machineId, t),
        0,
      )
      expect(total).toBeCloseTo(weight, 10)
    }
  })

  it.each(SLOT_MACHINE_IDS)('never produces a NaN or negative weight on %s', (machineId) => {
    for (const template of BUFF_TEMPLATES) {
      const weight = templateWeightFor(machineId, template)
      expect(Number.isFinite(weight)).toBe(true)
      expect(weight).toBeGreaterThanOrEqual(0)
    }
  })

  it.each(SLOT_MACHINE_IDS)(
    'keeps every axis weight finite and non-negative on %s',
    (machineId) => {
      for (const weight of Object.values(SLOT_AXIS_WEIGHTS[machineId])) {
        expect(Number.isFinite(weight)).toBe(true)
        expect(weight).toBeGreaterThanOrEqual(0)
      }
    },
  )

  it('leans the two machines in opposite directions', () => {
    const eventFamilies = [BuffKind.Taker, BuffKind.Feeder, BuffKind.Glutton]
    const thresholdFamilies = [BuffKind.Hoarder, BuffKind.Unbloodied]
    const share = (machineId: SlotMachineId, families: readonly string[]) => {
      const all = Object.values(SLOT_FAMILY_WEIGHTS[machineId]).reduce((a, b) => a + b, 0)
      return families.reduce((sum, f) => sum + SLOT_FAMILY_WEIGHTS[machineId][f as never], 0) / all
    }
    expect(share(SlotMachineId.Skirmisher, eventFamilies)).toBeGreaterThan(
      share(SlotMachineId.Strongbox, eventFamilies),
    )
    expect(share(SlotMachineId.Strongbox, thresholdFamilies)).toBeGreaterThan(
      share(SlotMachineId.Skirmisher, thresholdFamilies),
    )
  })
})

describe('weightedDrawWithoutReplacement', () => {
  it('draws distinct items and consumes exactly one rng call per item', () => {
    let calls = 0
    const rng = createSeededRng(5)
    const counted = () => {
      calls++
      return rng()
    }
    const drawn = weightedDrawWithoutReplacement([1, 2, 3, 4, 5], () => 1, counted, 3)
    expect(drawn).toHaveLength(3)
    expect(new Set(drawn).size).toBe(3)
    expect(calls).toBe(3)
  })

  it('returns fewer than count when the candidates run out', () => {
    expect(weightedDrawWithoutReplacement([1, 2], () => 1, createSeededRng(1), 5)).toHaveLength(2)
  })

  it('returns nothing when every weight is zero rather than dividing by zero', () => {
    expect(weightedDrawWithoutReplacement([1, 2, 3], () => 0, createSeededRng(1), 2)).toEqual([])
  })

  it('never picks a zero-weighted candidate', () => {
    const drawn = weightedDrawWithoutReplacement(
      [1, 2, 3, 4],
      (n) => (n === 3 ? 0 : 1),
      createSeededRng(11),
      3,
    )
    expect(drawn).not.toContain(3)
  })

  it('does not mutate the caller candidate array', () => {
    const candidates = [1, 2, 3, 4]
    weightedDrawWithoutReplacement(candidates, () => 1, createSeededRng(2), 3)
    expect(candidates).toEqual([1, 2, 3, 4])
  })

  it('reproduces the same draw from the same seed', () => {
    const draw = () =>
      weightedDrawWithoutReplacement(BUFF_TEMPLATES, () => 1, createSeededRng(808), 8)
    expect(draw()).toEqual(draw())
  })
})
