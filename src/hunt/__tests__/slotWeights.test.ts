import { describe, expect, it } from 'vitest'
import {
  SLOT_AXIS_WEIGHTS,
  SLOT_FAMILY_WEIGHTS,
  templateWeightFor,
  weightedDrawWithoutReplacement,
  weightedDrawWithReplacement,
} from '../slotWeights'
import { BUFF_TEMPLATES, templateById, templatesForFamily } from '../buffTemplates'
import { SLOT_MACHINE_IDS, SlotMachineId } from '../slotConfig'
import { createSeededRng, type Rng } from '../seededRng'
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

  it.each(SLOT_MACHINE_IDS)(
    'DLR-161 — every template in BUFF_TEMPLATES weighs a finite positive amount on %s',
    (machineId) => {
      for (const template of BUFF_TEMPLATES) {
        expect(templateWeightFor(machineId, template)).toBeGreaterThan(0)
      }
    },
  )

  it("DLR-161 — the two new templates' weight on Skirmisher equals their family weight exactly", () => {
    const helmet = templateById('skullHelmet:protection')!
    const tether = templateById('skullTether:protection')!
    expect(templateWeightFor(SlotMachineId.Skirmisher, helmet)).toBeCloseTo(
      SLOT_FAMILY_WEIGHTS[SlotMachineId.Skirmisher][BuffKind.SkullHelmet],
      10,
    )
    expect(templateWeightFor(SlotMachineId.Skirmisher, tether)).toBeCloseTo(
      SLOT_FAMILY_WEIGHTS[SlotMachineId.Skirmisher][BuffKind.SkullTether],
      10,
    )
  })

  // DLR-145 — the "leans the two machines in opposite directions" case this file used to carry is
  // GONE, not broken: it compared `Glutton`'s event-family share against `Hoarder`/`Unbloodied`'s
  // threshold-family share, and all three families were cut from `SLOT_FAMILY_WEIGHTS` along with
  // the coins/apRefund axis lean Strongbox rode on. Every surviving weight (Suit High, Suit Low,
  // Skull Low, Cheat; Magnitude, Multiplier) is unchanged from before the pruning — see
  // `slotWeights.ts`'s own comments on both tables — so there is no new lean to assert; a
  // replacement lean is a developer decision this ticket does not make.
})

describe('activated templates', () => {
  it.each([SlotMachineId.Skirmisher, SlotMachineId.Strongbox])(
    'gives %s a positive weight to every activated template',
    (machineId) => {
      for (const id of ['cheat']) {
        expect(templateWeightFor(machineId, templateById(id)!)).toBeGreaterThan(0)
      }
    },
  )

  it.each([SlotMachineId.Skirmisher, SlotMachineId.Strongbox])(
    "makes an activated family's strip share equal its family weight on %s",
    (machineId) => {
      for (const kind of [BuffKind.Cheat]) {
        const total = templatesForFamily(kind).reduce(
          (sum, t) => sum + templateWeightFor(machineId, t),
          0,
        )
        expect(total).toBeCloseTo(SLOT_FAMILY_WEIGHTS[machineId][kind], 10)
      }
    },
  )
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

describe('weightedDrawWithReplacement (DLR-145)', () => {
  const scripted = (values: number[]): Rng => {
    let i = 0
    return () => values[i++ % values.length]
  }

  it('draws MORE items than there are candidates', () => {
    expect(
      weightedDrawWithReplacement(['a', 'b'], () => 1, scripted([0.1, 0.9, 0.1]), 5),
    ).toHaveLength(5)
  })

  it('can return the same candidate twice', () => {
    expect(weightedDrawWithReplacement(['a', 'b'], () => 1, scripted([0.1]), 3)).toEqual([
      'a',
      'a',
      'a',
    ])
  })

  it('never draws a zero-weighted candidate', () => {
    const drawn = weightedDrawWithReplacement(
      ['a', 'b'],
      (x) => (x === 'a' ? 0 : 1),
      scripted([0.1, 0.5, 0.9]),
      3,
    )
    expect(drawn).toEqual(['b', 'b', 'b'])
  })

  it('returns empty rather than dividing when the total weight is zero', () => {
    expect(weightedDrawWithReplacement(['a', 'b'], () => 0, scripted([0.5]), 3)).toEqual([])
  })

  it('does not mutate the candidate array', () => {
    const candidates = ['a', 'b']
    weightedDrawWithReplacement(candidates, () => 1, scripted([0.5]), 4)
    expect(candidates).toEqual(['a', 'b'])
  })

  it('consumes exactly one rng call per item drawn', () => {
    let calls = 0
    const rng = createSeededRng(5)
    const counted = () => {
      calls++
      return rng()
    }
    const drawn = weightedDrawWithReplacement(['a', 'b', 'c'], () => 1, counted, 7)
    expect(drawn).toHaveLength(7)
    expect(calls).toBe(7)
  })
})

describe('the wildcard on the strip (DLR-162 AC1/AC10)', () => {
  it('carries positive weight, so the machine can stock it', () => {
    expect(templateWeightFor(SlotMachineId.Skirmisher, templateById('wildcard')!)).toBeGreaterThan(
      0,
    )
  })

  it('leaves every CONDITION template weight untouched - no condition template was added', () => {
    // The wildcard is an ACTIVATED template, so it never enters `FAMILY_AXIS_TOTAL`. A Bell High
    // (Blade) on the Skirmisher is family 5, axis 3, family-axis total 6 templates x 3 = 18
    // -> 5 * 3 / 18 = 0.8333, exactly as before. (The plan quoted 2.5 off a two-template Suit High
    // family; the family has held six templates since DLR-150.)
    expect(
      templateWeightFor(SlotMachineId.Skirmisher, templateById('suitHigh:bells:magnitude')!),
    ).toBeCloseTo(5 / 6)
  })

  it('shares its family weight across nothing - one template in the family', () => {
    expect(templateWeightFor(SlotMachineId.Skirmisher, templateById('wildcard')!)).toBeCloseTo(1)
  })
})
