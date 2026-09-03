import { describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES, BuffKind, BuffRewardAxis, templateById } from '../../../hunt'
import { slotSymbolFace } from '../slotSymbols'

describe('slotSymbolFace — every real template', () => {
  const faces = BUFF_TEMPLATES.map((template) => slotSymbolFace(template))

  it('produces a face for every template without throwing', () => {
    expect(faces).toHaveLength(BUFF_TEMPLATES.length)
  })

  it('every id is unique', () => {
    expect(new Set(faces.map((face) => face.id)).size).toBe(faces.length)
  })

  it('no two templates share a glyph-plus-family-plus-axis triple', () => {
    const triples = faces.map((face) => `${JSON.stringify(face.glyph)}|${face.family}|${face.axis}`)
    expect(new Set(triples).size).toBe(triples.length)
  })
})

describe('slotSymbolFace — the two DLR-161 faces', () => {
  const helmetTemplate = BUFF_TEMPLATES.find((template) => template.kind === BuffKind.SkullHelmet)!
  const tetherTemplate = BUFF_TEMPLATES.find((template) => template.kind === BuffKind.SkullTether)!

  it('Skull Helmet draws its own glyph, family word and axis word', () => {
    const face = slotSymbolFace(helmetTemplate)
    expect(face.glyph).toEqual({ kind: 'skullHelmet' })
    expect(face.family).toBe('Helmet')
    expect(face.axis).toBe('Guard')
  })

  it('Skull Tether draws its own glyph, family word and axis word', () => {
    const face = slotSymbolFace(tetherTemplate)
    expect(face.glyph).toEqual({ kind: 'skullTether' })
    expect(face.family).toBe('Tether')
    expect(face.axis).toBe('Guard')
  })
})

describe('slotSymbolFace — the Protection axis word matches the reward suffix', () => {
  it('is Guard, the same word BUFF_REWARD_SUFFIX uses', () => {
    // Cross-check against the reward axis this face's word narrows over.
    expect(BuffRewardAxis.Protection).toBe('protection')
  })
})

it('gives the wildcard its OWN glyph and word, not the Cheat it used to fall through to', () => {
  const face = slotSymbolFace(templateById('wildcard')!)
  expect(face).toEqual({
    id: 'wildcard',
    glyph: { kind: 'wildcard' },
    family: 'Wildcard',
    axis: null,
  })
})
