import { describe, expect, it } from 'vitest'
import {
  BuffTier,
  WildRefusal,
  buffIsWild,
  mintFromTemplate,
  templateById,
  wildcardBuff,
  wildenedBuff,
  type Buff,
  type BuffId,
} from '../../../hunt'
import { manageBuffsView } from '../manageBuffs'

function fromTemplate(id: string, tier: BuffTier, buffId: BuffId): Buff {
  const template = templateById(id)
  if (template === undefined) throw new Error(`No template for id '${id}'`)
  return mintFromTemplate(template, tier, buffId)
}

const bellTaker = (tier: BuffTier, id: BuffId) => fromTemplate('taker:bells:magnitude', tier, id)
const sidestep = (tier: BuffTier, id: BuffId) => fromTemplate('sidestep:magnitude', tier, id)
const wildBronzeTaker = (id: BuffId) => wildenedBuff(bellTaker(BuffTier.Bronze, id))

describe('the wildcard band (DLR-162)', () => {
  it('lists every held wildcard id, ascending, and is empty when none are held', () => {
    expect(manageBuffsView([bellTaker(BuffTier.Bronze, 1)]).wildcards).toEqual([])
    expect(
      manageBuffsView([wildcardBuff(BuffTier.Bronze, 5), wildcardBuff(BuffTier.Silver, 2)])
        .wildcards,
    ).toEqual([2, 5])
  })
})

describe('the target grid (DLR-162 AC5)', () => {
  const pile = [
    wildcardBuff(BuffTier.Bronze, 1),
    bellTaker(BuffTier.Bronze, 2),
    sidestep(BuffTier.Bronze, 3),
    wildBronzeTaker(4),
  ]

  it('includes every held card, refused ones with their reason', () => {
    const tiles = manageBuffsView(pile).wildTargets
    const byId = new Map(tiles.map((t) => [t.ids[0], t]))
    expect(byId.get(2)?.refusal).toBeNull()
    expect(byId.get(3)?.refusal).toBe(WildRefusal.NoSuit)
    expect(byId.get(4)?.refusal).toBe(WildRefusal.AlreadyWild)
    expect(byId.get(1)?.refusal).toBe(WildRefusal.NoSuit)
  })

  it('previews exactly what a selectable target becomes, and nothing for a refused one', () => {
    const tiles = manageBuffsView(pile).wildTargets
    const ready = tiles.find((t) => t.refusal === null)!
    expect(ready.produces).not.toBeNull()
    expect(buffIsWild(ready.produces!)).toBe(true)
    expect(ready.produces!.tier).toBe(ready.buff.tier)
    expect(tiles.filter((t) => t.refusal !== null).every((t) => t.produces === null)).toBe(true)
  })

  it('puts selectable targets first, refused ones after', () => {
    const tiles = manageBuffsView(pile).wildTargets
    const firstRefused = tiles.findIndex((t) => t.refusal !== null)
    expect(firstRefused).toBeGreaterThan(-1)
    expect(tiles.slice(0, firstRefused).every((t) => t.refusal === null)).toBe(true)
    expect(tiles.slice(firstRefused).every((t) => t.refusal !== null)).toBe(true)
  })
})

describe('a wild pile names the card it eats (DLR-162)', () => {
  it('reports the suited partner on the group, and null for an ordinary combine', () => {
    const wildPile = manageBuffsView([wildBronzeTaker(1), bellTaker(BuffTier.Bronze, 2)]).groups
    const wildGroup = wildPile.find((g) => g.refusal === null)!
    expect(wildGroup.partner?.id).toBe(2)

    const plain = manageBuffsView([bellTaker(BuffTier.Bronze, 1), bellTaker(BuffTier.Bronze, 2)])
      .groups
    expect(plain.find((g) => g.refusal === null)!.partner).toBeNull()
  })

  it('previews the wild product a wild pile makes, not a suited one', () => {
    const groups = manageBuffsView([wildBronzeTaker(1), bellTaker(BuffTier.Bronze, 2)]).groups
    const ready = groups.find((g) => g.refusal === null)!
    expect(buffIsWild(ready.produces!)).toBe(true)
    expect(ready.produces!.tier).toBe(BuffTier.Silver)
  })
})
