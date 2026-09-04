/**
 * DLR-153 — the source-level contract for `warCouncilBuffRide.css` (the card's halo/cell/badge
 * carriers) and its sibling `warCouncilBuffRidePanel.css` (the riding list and the breakdown
 * panel — split out once the panel's grid-layout fix pushed the combined file past 400 lines).
 * jsdom has no layout engine and never loads either file, so this spec parses the stylesheet
 * text the same way `handRowCss.test.ts` and `contrast.test.ts` do, rather than rendering
 * anything.
 */
/// <reference types="node" />
// `src/**` is typed for the browser only (`tsconfig.app.json`'s `types` excludes Node's ambient
// types) — this directive pulls in Node's ambient types for THIS file alone, which is a
// `node`-project Vitest spec and genuinely runs under Node to call `readFileSync`.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rideCss = readFileSync(new URL('../warCouncilBuffRide.css', import.meta.url), 'utf8')
const panelCss = readFileSync(new URL('../warCouncilBuffRidePanel.css', import.meta.url), 'utf8')
const rootCss = readFileSync(new URL('../warCouncil.css', import.meta.url), 'utf8')

/** The body of one rule, by exact selector text — mirrors `handRowCss.test.ts`'s `ruleBody`. */
function ruleBody(css: string, selector: string): string {
  const at = css.search(
    new RegExp(`\\n[ \\t]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*\\{`),
  )
  if (at === -1) throw new Error(`no rule for \`${selector}\``)
  const open = css.indexOf('{', at)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

describe('warCouncilBuffRide.css — the halo, cell and badge', () => {
  it('AC7 — the cell lap time is floored by an un-defeatable max(), and the floor is 0.9s', () => {
    const cell = ruleBody(rideCss, '.wc-card-buff-cell')
    expect(cell).toContain('max(')
    expect(cell).toContain('var(--wc-buff-lap-floor)')
    const root = ruleBody(rootCss, ':root')
    expect(root).toMatch(/--wc-buff-lap-floor:\s*0\.9s/)
  })

  it('AC6 — reduced motion stops the cell and touches neither the halo nor the badge', () => {
    const match = rideCss.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)
    expect(match, 'expected a prefers-reduced-motion block').not.toBeNull()
    const block = match![1]
    expect(block).toContain('.wc-card-buff-cell')
    expect(block).toMatch(/animation:\s*none/)
    expect(block).not.toContain('.wc-card-buff-halo')
    expect(block).not.toContain('.wc-card-buff-badge')
  })

  it('AC5 — the badge rule exists and sets no color through the halo token', () => {
    const badge = ruleBody(rideCss, '.wc-card-buff-badge')
    expect(badge).toMatch(/color:/)
    expect(badge).not.toContain('--wc-buff-halo')
  })

  it('every stroke width and opacity reads --energy, a float, never the raw count', () => {
    for (const ring of [
      '.wc-card-buff-halo-far',
      '.wc-card-buff-halo-mid',
      '.wc-card-buff-halo-near',
    ]) {
      const body = ruleBody(rideCss, ring)
      expect(body).toMatch(/var\(--energy\)/)
      expect(body).not.toMatch(/var\(--wc-buff-count\)/)
    }
  })

  it('the halo bleeds outside the card rather than clipping to it as a hard outline', () => {
    const halo = ruleBody(rideCss, '.wc-card-buff-halo')
    expect(halo).toMatch(/inset:\s*-9%/)
    expect(halo).toMatch(/width:\s*118%/)
    expect(halo).toMatch(/overflow:\s*visible/)
  })

  it('the travelling cell is white, not parchment-coloured', () => {
    expect(ruleBody(rideCss, '.wc-card-buff-cell')).toMatch(/stroke:\s*#fff/)
  })

  it('the box-shadow glow is present on the lit card face ALONGSIDE the base shadow layers — a lit card never ends up with less shadow than an unlit one', () => {
    const glow = ruleBody(rideCss, '.wc-card.wc-card-buff')
    expect(glow).toMatch(/box-shadow:/)
    // The base drop-shadow and inset-highlight layers, present so the lit rule never REPLACES
    // the unlit card's own shadow with a bare glow — that scope bug is what DLR-153 Fix 1 found.
    expect(glow).toMatch(/0 2px 6px/)
    expect(glow).toMatch(/inset 0 0 0 1px/)
    expect(glow).toMatch(/var\(--energy\)/)
  })

  it('never uses filter: blur() or mix-blend-mode — both stalled Chrome\u2019s rasteriser here', () => {
    expect(rideCss).not.toMatch(/filter:\s*blur\(/)
    expect(rideCss).not.toMatch(/mix-blend-mode\s*:/)
  })
})

describe('warCouncilBuffRidePanel.css — the riding list and the breakdown', () => {
  it('never uses filter: blur() or mix-blend-mode', () => {
    expect(panelCss).not.toMatch(/filter:\s*blur\(/)
    expect(panelCss).not.toMatch(/mix-blend-mode\s*:/)
  })

  it('gives every row selector carrying an interactive control a 44px floor', () => {
    expect(ruleBody(panelCss, '.wc-buff-riding-row')).toMatch(/min-height:\s*44px/)
    expect(ruleBody(panelCss, '.wc-buff-breakdown-row')).toMatch(/min-height:\s*44px/)
  })

  it('distinguishes the two branch groups by border FORM, not only by colour', () => {
    const took = ruleBody(panelCss, '.wc-buff-breakdown-row.wc-is-took')
    const didNotTake = ruleBody(panelCss, '.wc-buff-breakdown-row.wc-is-did-not-take')
    expect(took).toMatch(/border-left:\s*3px solid/)
    expect(didNotTake).toMatch(/border-left:\s*3px dotted/)
  })

  it('removes a border between groups with a style-only declaration, never the shorthand', () => {
    expect(ruleBody(panelCss, '.wc-buff-breakdown-group + .wc-buff-breakdown-row')).toMatch(
      /border-top-style:\s*none/,
    )
    expect(panelCss).not.toMatch(/border-bottom:\s*none/)
    expect(panelCss).not.toMatch(/border-top:\s*none/)
  })

  it('gives the zone a real positioned ancestor for the panel to anchor against', () => {
    expect(ruleBody(panelCss, '.wc-buff-ride-zone')).toMatch(/position:\s*relative/)
  })

  it('gives the zone grid-area: hand so it spans the shell\u2019s hand row', () => {
    expect(ruleBody(panelCss, '.wc-buff-ride-zone')).toMatch(/grid-area:\s*hand/)
  })

  it('caps the SCROLLABLE ROWS region height rather than the whole panel, so the header and totals bar stay put', () => {
    const rows = ruleBody(panelCss, '.wc-buff-breakdown-rows')
    expect(rows).toMatch(/max-height:/)
    expect(rows).toMatch(/overflow-y:\s*auto/)
  })

  it('caps the panel width against the zone minus the rail, never the bare min(30rem, 100%) that resolves under the rail', () => {
    const panel = ruleBody(panelCss, '.wc-buff-breakdown')
    expect(panel).toMatch(/max-width:/)
    expect(panel).not.toMatch(/max-width:\s*min\(30rem,\s*100%\)/)
    expect(panel).toContain('--wc-rail-w')
  })

  it('anchors the panel to the hovered card via --point and a JS-set left, never a bare percentage', () => {
    const after = ruleBody(panelCss, '.wc-buff-breakdown::after')
    expect(after).toMatch(/left:\s*var\(--point,\s*50%\)/)
    const panel = ruleBody(panelCss, '.wc-buff-breakdown')
    expect(panel).toMatch(/left:\s*0/)
    expect(panel).not.toMatch(/right:\s*0/)
  })

  it('sets bottom from a plain default, not a --wc-lift-armed token \u2014 useBuffBreakdownAnchor sets the real value from a measured card rect', () => {
    // A token-derived offset resolves against the ZONE's own padded box, not the hovered card,
    // which is what let the panel's bottom edge land below the card it describes (DLR-153 Fix
    // 2). `useBuffBreakdownAnchor.ts` corrects `bottom` on every anchor change via
    // `panel.style.bottom`, so this stylesheet only needs a safe, inert default.
    const panel = ruleBody(panelCss, '.wc-buff-breakdown')
    expect(panel).not.toMatch(/--wc-lift-armed/)
    expect(panel).toMatch(/bottom:\s*0/)
  })

  it('gives every condition row a THREE-COLUMN grid, with min-width: 0 on the cell so a long condition sentence cannot blow the row out', () => {
    const row = ruleBody(panelCss, '.wc-buff-breakdown-row')
    expect(row).toMatch(/display:\s*grid/)
    expect(row).toMatch(/grid-template-columns:\s*auto 1fr auto/)
    const cell = ruleBody(panelCss, '.wc-buff-breakdown-cell')
    expect(cell).toMatch(/min-width:\s*0/)
  })

  it('keeps the payoff column from wrapping', () => {
    expect(ruleBody(panelCss, '.wc-buff-breakdown-payoff')).toMatch(/white-space:\s*nowrap/)
  })

  it('renders the totals bar as parchment on ink, a plain block rather than a button', () => {
    const totals = ruleBody(panelCss, '.wc-buff-breakdown-totals')
    expect(totals).toMatch(/background:\s*var\(--wc-parchment\)/)
    expect(totals).toMatch(/color:\s*var\(--wc-ink\)/)
    expect(panelCss).not.toMatch(/\.wc-buff-breakdown-totals[^{]*\{[^}]*cursor:\s*pointer/)
  })

  it('keeps the zone itself in normal flow — only the panel is positioned absolutely', () => {
    const zone = ruleBody(panelCss, '.wc-buff-ride-zone')
    expect(zone).toMatch(/position:\s*relative/)
    expect(zone).not.toMatch(/position:\s*absolute/)
  })

  it('AC15 — the breakdown remove control gets a 44px hit-area expander, not a grown disc', () => {
    const remove = ruleBody(panelCss, '.wc-buff-breakdown-remove')
    expect(remove).toMatch(/position:\s*relative/)
    // the disc itself stays small on purpose — a bigger disc would shout louder than the
    // condition beside it (mockup-buff-gallery.html's comment on the same pattern)
    expect(remove).toMatch(/width:\s*1\.15rem/)
    expect(remove).toMatch(/height:\s*1\.15rem/)
    const after = ruleBody(panelCss, '.wc-buff-breakdown-remove::after')
    expect(after).toMatch(/position:\s*absolute/)
    expect(after).toMatch(/width:\s*44px/)
    expect(after).toMatch(/height:\s*44px/)
  })
})
