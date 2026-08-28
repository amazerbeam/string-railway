import type { CSSProperties } from 'react'

interface CardBuffHaloProps {
  /** ≥1 — how many riding buffs could fire on this card, the higher of its two branches. Drives
   *  the halo's stroke widths and opacities AND the travelling cell's lap time, both through CSS
   *  custom properties set here rather than through inline geometry, so retuning is a stylesheet
   *  edit. Saturates at five, above which the halo stops gaining. */
  readonly count: number
}

/** The halo — and the lap-time `calc()` in `warCouncilBuffRide.css` — stop gaining past this many
 *  riding buffs, matching the mockup's own `Math.min(1, n / 5)` saturation point. Exported so
 *  `PlayingCard.tsx` can compute the SAME `--energy` conversion at the CARD element — see that
 *  file's docblock for why the conversion moved there. */
export const HALO_SATURATION_CEILING = 5

/**
 * DLR-153 — the card's two motion/glow carriers: six stacked SVG strokes (three widening halo
 * rings, a steady rail, and a travelling cell with its own glow) plus a `box-shadow` on the card
 * face itself (`warCouncilBuffRide.css`'s `.wc-card.wc-card-buff`). The numeral badge
 * (`PlayingCard.tsx`'s `.wc-card-buff-badge`) is the accessible carrier for the same fact, so
 * this subtree is `aria-hidden` rather than doubly announced.
 *
 * Every `<rect>` shares one geometry, follows the card's real border radius via `rx`, and holds
 * a constant stroke weight at every card size via `vector-effect: non-scaling-stroke` — a plain
 * `stroke-width` would otherwise scale with the SVG's own coordinate system as the card resizes
 * across breakpoints. `pathLength="1000"` gives `warCouncilBuffRide.css` a fixed 0–1000 unit
 * space for the cell's `stroke-dasharray`/`stroke-dashoffset`, independent of the rect's actual
 * perimeter in user units.
 *
 * NOT a rotating `conic-gradient` — that needs `@property` to animate and repaints the whole box
 * every frame, which is exactly the per-card cost this ticket's constraints forbid.
 *
 * `count` reaches CSS as ONE custom property on the `<svg>`'s own `style`, visible to every
 * descendant `<rect>` through custom-property inheritance:
 *   - `--wc-buff-count` — the raw, ceiling-clamped count, read only by the lap-time `calc()`/
 *     `max()` in `warCouncilBuffRide.css`. Keeping the 0.9s flash-safety floor's arithmetic
 *     entirely in CSS (a token, not a literal) is what keeps it un-defeatable from this file.
 *
 * `--energy` — the SAME `Math.min(1, n / 5)` conversion the mockup's own `paintOne` makes, a 0…1
 * FLOAT rather than the raw count — is set by `PlayingCard.tsx` on the CARD element itself
 * (`.wc-card-buff`), not here. The card's own `box-shadow` glow (`warCouncilBuffRide.css`) needs
 * `--energy` too, and a custom property set on this `<svg>` — a CHILD of the card — is invisible
 * to the card's own `box-shadow` rule (inheritance flows from ancestor to descendant, never the
 * reverse), which is exactly DLR-153's bug: the whole `box-shadow` declaration was discarded for
 * referencing an undefined variable. Setting `--energy` once, on the card, lets both the
 * box-shadow AND these descendant `<rect>` strokes read the same inherited value — one owner.
 */
export default function CardBuffHalo({ count }: CardBuffHaloProps) {
  const clampedCount = Math.min(count, HALO_SATURATION_CEILING)
  const style = {
    '--wc-buff-count': clampedCount,
  } as CSSProperties

  return (
    <svg className="wc-card-buff-halo" aria-hidden="true" style={style} viewBox="0 0 200 300">
      <rect
        className="wc-card-buff-halo-far"
        x="6"
        y="6"
        width="188"
        height="288"
        rx="15"
        pathLength="1000"
      />
      <rect
        className="wc-card-buff-halo-mid"
        x="6"
        y="6"
        width="188"
        height="288"
        rx="15"
        pathLength="1000"
      />
      <rect
        className="wc-card-buff-halo-near"
        x="6"
        y="6"
        width="188"
        height="288"
        rx="15"
        pathLength="1000"
      />
      <rect
        className="wc-card-buff-rail"
        x="6"
        y="6"
        width="188"
        height="288"
        rx="15"
        pathLength="1000"
      />
      <rect
        className="wc-card-buff-cell-glow"
        x="6"
        y="6"
        width="188"
        height="288"
        rx="15"
        pathLength="1000"
      />
      <rect
        className="wc-card-buff-cell"
        x="6"
        y="6"
        width="188"
        height="288"
        rx="15"
        pathLength="1000"
      />
    </svg>
  )
}
