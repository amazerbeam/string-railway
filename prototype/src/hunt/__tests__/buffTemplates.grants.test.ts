import { describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES, mintGrants, templateById } from '../buffTemplates'
import { BuffTier } from '../buffs'

describe('templateById', () => {
  it('returns the template whose id matches, for every id in BUFF_TEMPLATES', () => {
    for (const template of BUFF_TEMPLATES) {
      expect(templateById(template.id)).toBe(template)
    }
  })

  it('returns undefined for an id this build has no template for', () => {
    expect(templateById('nope:nope')).toBeUndefined()
  })
})

describe('mintGrants', () => {
  it('mints nothing from an empty grant list', () => {
    expect(mintGrants([], 7)).toEqual([])
  })

  it('mints one Buff per grant with consecutive ids from firstId and the requested tier', () => {
    const [first, second] = BUFF_TEMPLATES
    const grants = [
      { templateId: first.id, tier: BuffTier.Silver },
      { templateId: second.id, tier: BuffTier.Gold },
    ]
    const minted = mintGrants(grants, 10)
    expect(minted).toHaveLength(2)
    expect(minted[0].id).toBe(10)
    expect(minted[0].tier).toBe(BuffTier.Silver)
    expect(minted[0].kind).toBe(first.kind)
    expect(minted[1].id).toBe(11)
    expect(minted[1].tier).toBe(BuffTier.Gold)
    expect(minted[1].kind).toBe(second.kind)
  })

  it('skips an unknown templateId and keeps ids consecutive over what was actually minted', () => {
    const known = BUFF_TEMPLATES[0]
    const grants = [
      { templateId: 'nope:nope', tier: BuffTier.Bronze },
      { templateId: known.id, tier: BuffTier.Bronze },
    ]
    const minted = mintGrants(grants, 5)
    expect(minted).toHaveLength(1)
    expect(minted[0].id).toBe(5)
    expect(minted[0].kind).toBe(known.kind)
  })
})
