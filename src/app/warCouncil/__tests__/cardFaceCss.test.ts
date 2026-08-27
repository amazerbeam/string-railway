import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CARD_FACE_GEOMETRY, CARD_FACE_TYPE } from '../cardFace'

const css = readFileSync(new URL('../warCouncilCards.css', import.meta.url), 'utf8')
// CRIT-2 (round-2 defender review) — the skull-face rules live in the sibling
// `warCouncilCardFace.css`, not this file; `--wc-face-*` properties are declared here but the
// rules that consume them are declared there.
const faceCss = readFileSync(new URL('../warCouncilCardFace.css', import.meta.url), 'utf8')

function declared(property: string): number {
  const match = css.match(new RegExp(`--${property}:\\s*([0-9.]+)\\s*;`))
  if (match === null) throw new Error(`warCouncilCards.css declares no --${property}`)
  return Number(match[1])
}

// The stylesheet's property, and the expression that reconstructs it from the module. Adding a
// geometry number to one side and not the other is what this table exists to catch.
const MIRRORED: ReadonlyArray<readonly [string, number]> = [
  ['wc-face-corner-x', CARD_FACE_GEOMETRY.cornerTopLeftPlain.x0],
  ['wc-face-corner-y', CARD_FACE_GEOMETRY.cornerTopLeftPlain.y0],
  [
    'wc-face-corner-w',
    CARD_FACE_GEOMETRY.cornerTopLeftPlain.x1 - CARD_FACE_GEOMETRY.cornerTopLeftPlain.x0,
  ],
  [
    'wc-face-corner-h-named',
    CARD_FACE_GEOMETRY.cornerTopLeftNamed.y1 - CARD_FACE_GEOMETRY.cornerTopLeftNamed.y0,
  ],
  [
    'wc-face-corner-h-plain',
    CARD_FACE_GEOMETRY.cornerTopLeftPlain.y1 - CARD_FACE_GEOMETRY.cornerTopLeftPlain.y0,
  ],
  ['wc-face-rank-size', CARD_FACE_TYPE.rankSize],
  ['wc-face-name-size', CARD_FACE_TYPE.nameSize],
  ['wc-face-corner-glyph', CARD_FACE_TYPE.cornerGlyph],
  ['wc-face-art-x', CARD_FACE_GEOMETRY.artWindow.x0],
  ['wc-face-art-top', CARD_FACE_GEOMETRY.artWindow.y0],
  ['wc-face-art-bottom', 1 - CARD_FACE_GEOMETRY.artWindow.y1],
  ['wc-face-pip-x', CARD_FACE_GEOMETRY.pipField.x0],
  ['wc-face-pip-top', CARD_FACE_GEOMETRY.pipField.y0],
  ['wc-face-pip-bottom', 1 - CARD_FACE_GEOMETRY.pipField.y1],
  ['wc-face-mark-x', CARD_FACE_GEOMETRY.noRuleMark.x0],
  ['wc-face-mark-top', CARD_FACE_GEOMETRY.noRuleMark.y0],
  ['wc-face-mark-bottom', 1 - CARD_FACE_GEOMETRY.noRuleMark.y1],
  // QA-1 (DLR-149 fix loop) — `primedMark` and `discardMark` are declared, styled and rendered
  // (`.wc-primed-mark` / `.wc-discard-mark`, `warCouncilCardFace.css`) but had no `--wc-face-*`
  // twin at all until this fix, so nothing here proved them honest. `primedMark`'s two y-axis
  // properties are the width-to-height conversion `cardFace.ts` now performs, not the raw
  // shipped numbers (0.07/0.24) — see that module's comment.
  ['wc-face-primed-x', CARD_FACE_GEOMETRY.primedMark.x0],
  ['wc-face-primed-w', CARD_FACE_GEOMETRY.primedMark.x1 - CARD_FACE_GEOMETRY.primedMark.x0],
  ['wc-face-primed-bottom', 1 - CARD_FACE_GEOMETRY.primedMark.y1],
  ['wc-face-primed-h', CARD_FACE_GEOMETRY.primedMark.y1 - CARD_FACE_GEOMETRY.primedMark.y0],
  ['wc-face-discard-x', CARD_FACE_GEOMETRY.discardMark.x0],
  ['wc-face-discard-y', CARD_FACE_GEOMETRY.discardMark.y0],
]

describe('warCouncilCards.css mirrors cardFace.ts', () => {
  it.each(MIRRORED)('declares --%s as %d', (property, expected) => {
    expect(declared(property)).toBeCloseTo(expected, 5)
  })

  // The mirrored corner box is the geometry the stylesheet derives rather than declares, so
  // assert the derivation instead: it is the top-left plain box, reflected.
  it('keeps the mirrored corner a reflection of the plain one', () => {
    const tl = CARD_FACE_GEOMETRY.cornerTopLeftPlain
    const br = CARD_FACE_GEOMETRY.cornerBottomRight
    expect(1 - br.x1).toBeCloseTo(tl.x0, 5)
    expect(1 - br.y1).toBeCloseTo(tl.y0, 5)
    expect(br.x1 - br.x0).toBeCloseTo(tl.x1 - tl.x0, 5)
    expect(br.y1 - br.y0).toBeCloseTo(tl.y1 - tl.y0, 5)
  })

  it('holds the corner index to its declared box, so the AC5 assertion means something', () => {
    expect(css).toMatch(/\.wc-card-corner\b[^}]*overflow:\s*hidden/s)
    expect(css).toMatch(
      /\.wc-card-corner\b[^}]*height:\s*calc\(100% \* var\(--wc-face-corner-h-plain\)\)/s,
    )
  })

  it('carries the reference sheet’s two measured performance findings', () => {
    expect(css).not.toMatch(/mix-blend-mode/)
    expect(css).not.toMatch(/filter:\s*url\(/)
  })

  // CRIT-2 (round-2 defender review) — pins the skull footprint's two branches to the
  // stylesheet the same way the rectangles above are pinned: the base rule paints the
  // art-window box for every rank, and a SEPARATE `.wc-face-plain` override must exist and be
  // routed through the same `--wc-face-pip-*` properties `.wc-card-pips` uses — not a new
  // property — or a skulled Plain rank paints back over its own corner index.
  it('routes a skulled Plain rank through the pip-field properties, not the art window', () => {
    expect(faceCss).toMatch(
      /\.wc-card \.wc-card-skull-face\s*\{[^}]*var\(--wc-face-art-x\)[^}]*\}/s,
    )
    expect(faceCss).toMatch(
      /\.wc-card\.wc-face-plain \.wc-card-skull-face\s*\{[^}]*var\(--wc-face-pip-x\)[^}]*var\(--wc-face-pip-top\)[^}]*var\(--wc-face-pip-bottom\)[^}]*\}/s,
    )
  })
})
