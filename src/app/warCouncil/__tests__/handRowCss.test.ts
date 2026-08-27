import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The hand's layout contract, replacing `fanLayout.test.ts`.
 *
 * That spec asserted the fan: a rotation symmetric about the centre, a lift arc, an overlap that
 * tightened as the hand grew, and an armed slot stacked above its siblings. The first three are
 * gone by design — the fan's negative margins made a slice of every card's visible face
 * hit-test to the WRONG card, which is what "I can't select cards" turned out to be — so the
 * module they lived in is gone with them and `HandFan` now carries no inline placement at all.
 *
 * The claims survive; they just moved into CSS, so the spec follows them there rather than
 * disappearing. Reading the stylesheet from disk is the established pattern here
 * (`cardFaceCss.test.ts` does the same for the card face's geometry), and it is the only
 * available one: jsdom has no layout engine and never loads these files.
 */
const handCss = readFileSync(new URL('../warCouncilHand.css', import.meta.url), 'utf8')
const cardsCss = readFileSync(new URL('../warCouncilCards.css', import.meta.url), 'utf8')

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

describe('the hand row', () => {
  it('separates the cards with a real gap rather than pulling them together', () => {
    const fan = ruleBody(handCss, '.wc-fan')
    const gap = fan.match(/gap:\s*calc\(var\(--wc-card-w\)\s*\*\s*([0-9.]+)\)/)
    expect(gap, '.wc-fan must declare a gap sized off --wc-card-w').not.toBeNull()
    expect(Number(gap?.[1])).toBeGreaterThan(0)
  })

  it('leaves the gap wider than the armed card grows, so no card overlaps its neighbour', () => {
    // `scale(1.05)` on a card of width `w` adds `0.05w`, i.e. `0.025w` on each side. A gap at or
    // below that would let an armed card's box reach into its neighbour's — which is exactly the
    // overlap this change exists to remove.
    const gap = Number(
      ruleBody(handCss, '.wc-fan').match(/gap:\s*calc\(var\(--wc-card-w\)\s*\*\s*([0-9.]+)\)/)?.[1],
    )
    const scale = Number(
      ruleBody(cardsCss, '.wc-fan .wc-card.wc-is-armed,\n.wc-fan .wc-card.wc-is-armed:hover').match(
        /scale\(([0-9.]+)\)/,
      )?.[1],
    )
    expect(scale).toBeGreaterThan(1)
    expect(gap).toBeGreaterThan((scale - 1) / 2)
  })

  it('reserves enough headroom above the row for the armed lift and scale', () => {
    const padTop = Number(
      ruleBody(handCss, '.wc-fan').match(
        /padding:\s*calc\(var\(--wc-card-w\)\s*\*\s*([0-9.]+)\)/,
      )?.[1],
    )
    // The card is `aspect-ratio: 2 / 3`, so its height is `1.5w`. The armed state lifts by 20% of
    // that height and scales by 1.05, whose overflow above the resting box is half the added
    // height. Both are read from the rule that declares them rather than restated.
    const armed = ruleBody(
      cardsCss,
      '.wc-fan .wc-card.wc-is-armed,\n.wc-fan .wc-card.wc-is-armed:hover',
    )
    const liftPct = Number(armed.match(/translateY\(-([0-9.]+)%\)/)?.[1])
    const scale = Number(armed.match(/scale\(([0-9.]+)\)/)?.[1])
    const needed = 1.5 * (liftPct / 100) + (1.5 * (scale - 1)) / 2
    expect(padTop).toBeGreaterThanOrEqual(needed)
  })

  it('rests every card upright, with no rotation and no arc', () => {
    expect(ruleBody(cardsCss, '.wc-fan .wc-card')).toContain('translateY(0%)')
    expect(cardsCss).not.toContain('--wc-fan-rot')
    expect(cardsCss).not.toContain('--wc-fan-lift')
    expect(cardsCss.match(/\.wc-fan .wc-card[^{]*\{[^}]*rotate\(/)).toBeNull()
  })

  it('keeps the hover, press and armed lifts, which are what make a card feel selectable', () => {
    expect(ruleBody(cardsCss, '.wc-fan .wc-card:not(.wc-is-illegal):hover')).toMatch(
      /translateY\(-[0-9.]+%\)/,
    )
    expect(ruleBody(cardsCss, '.wc-fan .wc-card:not(.wc-is-illegal):active')).toMatch(
      /translateY\(-[0-9.]+%\)/,
    )
    expect(
      ruleBody(cardsCss, '.wc-fan .wc-card.wc-is-armed,\n.wc-fan .wc-card.wc-is-armed:hover'),
    ).toMatch(/translateY\(-[0-9.]+%\)/)
  })

  it('stacks the armed card above its siblings — the one thing the fan slots used to do', () => {
    const armed = ruleBody(
      cardsCss,
      '.wc-fan .wc-card.wc-is-armed,\n.wc-fan .wc-card.wc-is-armed:hover',
    )
    const armedZ = Number(armed.match(/z-index:\s*([0-9]+)/)?.[1])
    expect(armedZ).toBeGreaterThan(0)
    // And nothing gives a slot a competing stacking context any more; if one came back, the
    // armed card's `z-index` would be trapped inside its own slot and stop meaning anything.
    expect(ruleBody(handCss, '.wc-fan-slot')).not.toContain('z-index')
    expect(handCss).not.toContain('margin-left')
  })
})
