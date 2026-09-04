import { describe, expect, it } from 'vitest'
import {
  BUFF_TEMPLATES,
  BuffTier,
  mintFromTemplate,
  type Buff,
  type BuffTemplate,
} from '../../../hunt'
import { buildBuffGallery, BuffRunKind, type BuffStack } from '../buffGalleryModel'
import { ALL_FILTERS, matchesFilter, runCountsFor } from '../buffSuitFilterModel'

function templateFor(predicate: (template: BuffTemplate) => boolean): BuffTemplate {
  const template = BUFF_TEMPLATES.find(predicate)
  if (template === undefined) throw new Error('fixture template not found — check the predicate')
  return template
}

const keyHighTemplate = templateFor(
  (t) =>
    t.form === 'condition' &&
    t.kind === 'suitHigh' &&
    t.target?.suit === 'keys' &&
    t.axis === 'magnitude',
)
const bellHighTemplate = templateFor(
  (t) =>
    t.form === 'condition' &&
    t.kind === 'suitHigh' &&
    t.target?.suit === 'bells' &&
    t.axis === 'magnitude',
)

let nextId = 1
function mint(template: BuffTemplate, tier: BuffTier): Buff {
  return mintFromTemplate(template, tier, nextId++)
}

const noRefusal = () => null

function stacksFor(buffs: readonly Buff[]): readonly BuffStack[] {
  return buildBuffGallery(buffs, noRefusal).runs.flatMap((run) => run.stacks)
}

describe('buffSuitFilter — matchesFilter', () => {
  it('ALL_FILTERS matches every stack', () => {
    const [stack] = stacksFor([mint(keyHighTemplate, BuffTier.Bronze)])
    expect(matchesFilter(stack, ALL_FILTERS)).toBe(true)
  })

  it('a tier-only filter matches on tier alone', () => {
    const [stack] = stacksFor([mint(keyHighTemplate, BuffTier.Silver)])
    expect(matchesFilter(stack, { tier: BuffTier.Silver, run: 'all' })).toBe(true)
    expect(matchesFilter(stack, { tier: BuffTier.Gold, run: 'all' })).toBe(false)
  })

  it('a run-only filter matches on run alone', () => {
    const [stack] = stacksFor([mint(keyHighTemplate, BuffTier.Bronze)])
    expect(matchesFilter(stack, { tier: 'all', run: BuffRunKind.Keys })).toBe(true)
    expect(matchesFilter(stack, { tier: 'all', run: BuffRunKind.Bells })).toBe(false)
  })

  it('both together are an intersection: a silver Keys card passes, a bronze Keys card does not', () => {
    const stacks = stacksFor([
      mint(keyHighTemplate, BuffTier.Silver),
      mint(keyHighTemplate, BuffTier.Bronze),
    ])
    const silverStack = stacks.find((s) => s.buff.tier === BuffTier.Silver)
    const bronzeStack = stacks.find((s) => s.buff.tier === BuffTier.Bronze)
    if (silverStack === undefined || bronzeStack === undefined) {
      throw new Error('fixture stacks not found')
    }
    const filter = { tier: BuffTier.Silver, run: BuffRunKind.Keys }
    expect(matchesFilter(silverStack, filter)).toBe(true)
    expect(matchesFilter(bronzeStack, filter)).toBe(false)
  })
})

describe('buffSuitFilter — runCountsFor', () => {
  it('counts over the stacks the TIER filter already allows, so the suit chips follow what a tier pick already hid', () => {
    const view = buildBuffGallery(
      [
        mint(keyHighTemplate, BuffTier.Bronze),
        mint(keyHighTemplate, BuffTier.Silver),
        mint(bellHighTemplate, BuffTier.Silver),
      ],
      noRefusal,
    )

    const allCounts = runCountsFor(view, 'all')
    expect(allCounts.all).toBe(3)
    expect(allCounts[BuffRunKind.Keys]).toBe(2)
    expect(allCounts[BuffRunKind.Bells]).toBe(1)

    const silverCounts = runCountsFor(view, BuffTier.Silver)
    expect(silverCounts.all).toBe(2)
    expect(silverCounts[BuffRunKind.Keys]).toBe(1)
    expect(silverCounts[BuffRunKind.Bells]).toBe(1)
  })
})
