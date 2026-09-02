import { describe, expect, it } from 'vitest'
import { BuffTier, CombineRefusal, mintFromTemplate, templateById, type Buff } from '../../../hunt'
import { manageBuffsView } from '../manageBuffs'

const MOON_FEEDER = templateById('feeder:moons:magnitude')!
const BELL_TAKER = templateById('taker:bells:multiplier')!

function card(template = MOON_FEEDER, tier: BuffTier = BuffTier.Bronze, id = 1): Buff {
  return mintFromTemplate(template, tier, id)
}

describe('manageBuffsView', () => {
  it('counts identical copies into one pile', () => {
    const view = manageBuffsView([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(MOON_FEEDER, BuffTier.Bronze, 2),
    ])
    expect(view.groups).toHaveLength(1)
    expect(view.groups[0].count).toBe(2)
    expect(view.groups[0].ids).toEqual([1, 2])
    expect(view.held).toBe(2)
    expect(view.readyCount).toBe(1)
  })

  it('keeps two different cards apart even at the same tier', () => {
    const view = manageBuffsView([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(BELL_TAKER, BuffTier.Bronze, 2),
    ])
    expect(view.groups).toHaveLength(2)
    expect(view.readyCount).toBe(0)
  })

  it('names the produced card on a ready pile and nothing on a refused one', () => {
    const view = manageBuffsView([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(MOON_FEEDER, BuffTier.Bronze, 2),
    ])
    expect(view.groups[0].refusal).toBeNull()
    expect(view.groups[0].produces?.tier).toBe(BuffTier.Silver)
  })

  it('refuses a lone copy and a gold pile, each with its own reason', () => {
    const view = manageBuffsView([
      card(MOON_FEEDER, BuffTier.Bronze, 1),
      card(BELL_TAKER, BuffTier.Gold, 2),
      card(BELL_TAKER, BuffTier.Gold, 3),
    ])
    const lone = view.groups.find((g) => g.buff.tier === BuffTier.Bronze)!
    const gold = view.groups.find((g) => g.buff.tier === BuffTier.Gold)!
    expect(lone.refusal).toBe(CombineRefusal.NoPair)
    expect(lone.produces).toBeNull()
    expect(gold.refusal).toBe(CombineRefusal.AtMaxTier)
    expect(gold.produces).toBeNull()
  })

  it('puts every ready pile before every refused one', () => {
    const view = manageBuffsView([
      card(BELL_TAKER, BuffTier.Gold, 1),
      card(BELL_TAKER, BuffTier.Gold, 2),
      card(MOON_FEEDER, BuffTier.Bronze, 3),
      card(MOON_FEEDER, BuffTier.Bronze, 4),
    ])
    expect(view.groups.map((g) => g.refusal)).toEqual([null, CombineRefusal.AtMaxTier])
  })

  it('draws the same screen however the pile was ordered', () => {
    const pile = [
      card(MOON_FEEDER, BuffTier.Silver, 1),
      card(BELL_TAKER, BuffTier.Bronze, 2),
      card(BELL_TAKER, BuffTier.Bronze, 3),
    ]
    const forwards = manageBuffsView(pile).groups.map((g) => g.key)
    const backwards = manageBuffsView([...pile].reverse()).groups.map((g) => g.key)
    expect(forwards).toEqual(backwards)
  })

  it('reports an empty pile without inventing a group', () => {
    expect(manageBuffsView([])).toEqual({ groups: [], held: 0, readyCount: 0 })
  })
})
