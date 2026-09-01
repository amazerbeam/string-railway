import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * DLR-155 — the telegraphed lead row's stylesheet contract.
 *
 * jsdom has no layout engine, so the rules are asserted by reading the file from disk rather than
 * rendering it — the pattern `handRowCss.test.ts` and `cardFaceCss.test.ts` already set. `ruleBody`
 * below is copied from `handRowCss.test.ts` rather than re-invented.
 */
const huntCss = readFileSync(new URL('../warCouncilHunt.css', import.meta.url), 'utf8')

/** The body of one rule, by exact selector text. Tolerates the indentation a rule picks up
 *  inside an `@media` block, so the hover rule can be read the same way as the rest. */
function ruleBody(css: string, selector: string): string {
  const at = css.search(
    new RegExp(`\\n[ \\t]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*\\{`),
  )
  if (at === -1) throw new Error(`no rule for \`${selector}\``)
  const open = css.indexOf('{', at)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

describe('the telegraphed lead row (DLR-155)', () => {
  it('grows the tile as well as colouring it, so the mark survives greyscale', () => {
    const body = ruleBody(huntCss, '.wc-shape-row-lead .wc-shape-card')
    expect(body).toMatch(/width:/)
    expect(body).toMatch(/height:/)
    expect(body).toMatch(/box-shadow:/)
  })

  it('anchors the tooltip to the row', () => {
    expect(ruleBody(huntCss, '.wc-shape-row')).toMatch(/position:\s*relative/)
    expect(ruleBody(huntCss, '.wc-shape-tip')).toMatch(/position:\s*absolute/)
  })

  it('hides the tooltip until hover or keyboard focus', () => {
    expect(ruleBody(huntCss, '.wc-shape-tip')).toMatch(/visibility:\s*hidden/)
    expect(huntCss).toMatch(/@media \(hover: hover\)/)
    expect(huntCss).toMatch(/\.wc-shape-row-lead:focus-visible \.wc-shape-tip/)
  })

  it('uses :focus-visible rather than bare :focus for the keyboard outline', () => {
    expect(huntCss).not.toMatch(/\.wc-shape-row-lead:focus\s*[,{]/)
  })

  it("flips the last row's tooltip above the row, so it cannot be clipped by the dossier's overflow: hidden", () => {
    // .wc-dossier's own overflow: hidden is load-bearing for a different reason (stops a long
    // rule-break sentence widening the grid) and must survive this fix untouched.
    expect(ruleBody(huntCss, '.wc-dossier')).toMatch(/overflow:\s*hidden/)

    const flipped = ruleBody(huntCss, '.wc-shape-row-lead:last-child .wc-shape-tip')
    expect(flipped).toMatch(/bottom:\s*calc\(100% \+ 0\.3rem\)/)
    expect(flipped).toMatch(/top:\s*auto/)
  })
})
