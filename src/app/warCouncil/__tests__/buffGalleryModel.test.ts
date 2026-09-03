import { describe, expect, it } from 'vitest'
import {
  BUFF_TEMPLATES,
  BuffActivationRefusal,
  BuffTier,
  mintFromTemplate,
  type Buff,
  type BuffTemplate,
} from '../../../hunt'
import {
  BUFF_RUN_ORDER,
  BuffRunKind,
  buildBuffGallery,
  buffRunOf,
  buffStackKey,
} from '../buffGalleryModel'

function templateFor(predicate: (template: BuffTemplate) => boolean): BuffTemplate {
  const template = BUFF_TEMPLATES.find(predicate)
  if (template === undefined) throw new Error('fixture template not found — check the predicate')
  return template
}

const bellTakerBladeTemplate = templateFor(
  (t) =>
    t.form === 'condition' &&
    t.kind === 'taker' &&
    t.target?.suit === 'bells' &&
    t.axis === 'magnitude',
)
const bellTakerMomentumTemplate = templateFor(
  (t) =>
    t.form === 'condition' &&
    t.kind === 'taker' &&
    t.target?.suit === 'bells' &&
    t.axis === 'multiplier',
)
const sidestepTemplate = templateFor((t) => t.form === 'condition' && t.kind === 'sidestep')
const cheatTemplate = templateFor((t) => t.form === 'activated' && t.kind === 'cheat')

let nextId = 1
function mint(template: BuffTemplate, tier: BuffTier = BuffTier.Bronze): Buff {
  return mintFromTemplate(template, tier, nextId++)
}

const noRefusal = () => null

describe('buffRunOf — which run a card belongs to', () => {
  it('a Bells-targeting Taker lands in Bells', () => {
    expect(buffRunOf(mint(bellTakerBladeTemplate))).toBe(BuffRunKind.Bells)
  })

  it('a Sidestep lands in Suitless', () => {
    expect(buffRunOf(mint(sidestepTemplate))).toBe(BuffRunKind.Suitless)
  })

  it('Cheat lands in Press, not Suitless (AC4)', () => {
    expect(buffRunOf(mint(cheatTemplate))).toBe(BuffRunKind.Press)
  })
})

describe('buildBuffGallery — run order', () => {
  it('BUFF_RUN_ORDER is [Bells, Keys, Moons, Suitless, Press], runs come back in that order, empty runs omitted', () => {
    expect(BUFF_RUN_ORDER).toEqual([
      BuffRunKind.Bells,
      BuffRunKind.Keys,
      BuffRunKind.Moons,
      BuffRunKind.Suitless,
      BuffRunKind.Press,
    ])

    const pile = [mint(cheatTemplate), mint(bellTakerBladeTemplate), mint(sidestepTemplate)]
    const view = buildBuffGallery(pile, noRefusal)
    expect(view.runs.map((run) => run.kind)).toEqual([
      BuffRunKind.Bells,
      BuffRunKind.Suitless,
      BuffRunKind.Press,
    ])
  })
})

describe('buildBuffGallery — exact-identity collapse', () => {
  it('two identical Bell-Takers collapse to one stack with count 2 and both ids (AC7)', () => {
    const a = mint(bellTakerBladeTemplate)
    const b = mint(bellTakerBladeTemplate)
    const view = buildBuffGallery([a, b], noRefusal)
    expect(view.runs).toHaveLength(1)
    const [stack] = view.runs[0].stacks
    expect(stack.count).toBe(2)
    expect(stack.ids).toEqual([a.id, b.id])
  })

  it('a bronze and a gold Bell-Taker (Blade) do NOT collapse — tier is part of identity', () => {
    const bronze = mint(bellTakerBladeTemplate, BuffTier.Bronze)
    const gold = mint(bellTakerBladeTemplate, BuffTier.Gold)
    const view = buildBuffGallery([bronze, gold], noRefusal)
    expect(view.runs[0].stacks).toHaveLength(2)
  })

  it('a Bell-Taker (Blade) and a Bell-Taker (Momentum) do NOT collapse — reward axis is part of identity', () => {
    const blade = mint(bellTakerBladeTemplate)
    const momentum = mint(bellTakerMomentumTemplate)
    const view = buildBuffGallery([blade, momentum], noRefusal)
    expect(view.runs[0].stacks).toHaveLength(2)
  })
})

describe('buildBuffGallery — total order within a run', () => {
  it('stacks are tier-descending then buffStackKey ascending, regardless of input order', () => {
    const gold = mint(bellTakerBladeTemplate, BuffTier.Gold)
    const silverBlade = mint(bellTakerBladeTemplate, BuffTier.Silver)
    const silverMomentum = mint(bellTakerMomentumTemplate, BuffTier.Silver)

    const viewA = buildBuffGallery([gold, silverBlade, silverMomentum], noRefusal)
    const viewB = buildBuffGallery([silverMomentum, gold, silverBlade], noRefusal)

    const keysA = viewA.runs[0].stacks.map((stack) => buffStackKey(stack.buff))
    const keysB = viewB.runs[0].stacks.map((stack) => buffStackKey(stack.buff))
    expect(keysA).toEqual(keysB)
    expect(keysA[0]).toBe(buffStackKey(gold))

    const silverKeys = keysA.slice(1)
    expect(silverKeys).toEqual([...silverKeys].sort())
  })
})

describe('buildBuffGallery — the fence', () => {
  it('a stack whose refusalFor returns non-null is absent from runs and present in fence, whatever its run (AC8)', () => {
    const buff = mint(bellTakerBladeTemplate)
    const view = buildBuffGallery([buff], () => BuffActivationRefusal.WindowClosed)
    expect(view.runs).toHaveLength(0)
    expect(view.fence.stacks).toHaveLength(1)
    expect(view.fence.stacks[0].refusal).toBe(BuffActivationRefusal.WindowClosed)
  })

  it('fence.reason is the shared refusal when every fenced stack agrees, and null when they do not', () => {
    const a = mint(bellTakerBladeTemplate)
    const b = mint(bellTakerMomentumTemplate)
    const c = mint(sidestepTemplate)

    const agreeing = buildBuffGallery([a, b], () => BuffActivationRefusal.WindowClosed)
    expect(agreeing.fence.reason).toBe(BuffActivationRefusal.WindowClosed)

    let call = 0
    const disagreeing = buildBuffGallery([a, c], () => {
      call += 1
      return call === 1 ? BuffActivationRefusal.WindowClosed : BuffActivationRefusal.AlreadyActive
    })
    expect(disagreeing.fence.reason).toBeNull()
  })
})

describe('buildBuffGallery — totals', () => {
  it('held is the sum of every count, usable is the sum over unfenced stacks only', () => {
    const a = mint(bellTakerBladeTemplate)
    const b = mint(bellTakerBladeTemplate)
    const c = mint(sidestepTemplate)
    const view = buildBuffGallery([a, b, c], (buff) =>
      buff.kind === 'sidestep' ? BuffActivationRefusal.WindowClosed : null,
    )
    expect(view.held).toBe(3)
    expect(view.usable).toBe(2)
  })

  it('an empty pile returns empty runs and fence, zero totals, and does not throw', () => {
    expect(() => buildBuffGallery([], noRefusal)).not.toThrow()
    const view = buildBuffGallery([], noRefusal)
    expect(view.runs).toEqual([])
    expect(view.fence.stacks).toEqual([])
    expect(view.held).toBe(0)
    expect(view.usable).toBe(0)
  })
})

describe('buildBuffGallery — refusalFor call count', () => {
  it('calls refusalFor once per stack, not once per held copy', () => {
    const a = mint(bellTakerBladeTemplate)
    const b = mint(bellTakerBladeTemplate)
    let calls = 0
    buildBuffGallery([a, b], () => {
      calls += 1
      return null
    })
    expect(calls).toBe(1)
  })
})
