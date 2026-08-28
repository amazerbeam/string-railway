/**
 * DLR-153 — positions the breakdown panel's `left`, `--point` (the arrow's offset within the
 * panel) and `bottom` against the hovered card's own MEASURED box. Replaces the panel's former
 * zone-wide `right: 0` positioning, which pinned it to the whole hand row regardless of which
 * card it was describing and is what let it land on top of the gallery.
 *
 * `left`/`--point` are PIXEL offsets, never a percentage, because a percentage cannot track a
 * card that stops being centred under the panel once clamping moves the panel to stay on stage,
 * and it would drift the moment the hand resizes.
 *
 * `bottom` is ALSO measured, not token-derived. `warCouncilBuffRide.css` used to read
 * `--wc-lift-armed` directly (`bottom: calc(-1 * var(--wc-lift-armed) + 0.6rem)`), which happened
 * to work only because that panel was positioned INSIDE the card slot in the mockup this was
 * transcribed from — here the panel's offsetParent is `.wc-buff-ride-zone`, a padded container
 * the card sits inside, so a lift-token offset resolves against the wrong box entirely and let
 * the panel's bottom edge land BELOW the card's own bottom edge, hiding the very cards it
 * describes (DLR-153 Fix 2). Measuring `zoneRect.bottom - cardRect.top` places the panel's
 * bottom edge exactly `BOTTOM_GAP_PX` above the card's own measured top, regardless of what sits
 * between them.
 *
 * Measures against the panel's own `offsetParent` — the nearest positioned ancestor, which is
 * `.wc-buff-ride-zone` (`position: relative`) by construction — rather than taking a second ref
 * prop for it, so this hook's only required input beyond the panel itself is which card to find.
 *
 * Re-measures on every anchor change and on window resize; the resize listener is released in
 * this effect's own cleanup, so no orphan survives a card losing its target between renders.
 */
import { useLayoutEffect, type RefObject } from 'react'
import type { Card } from '../../warCouncil'
import { cardKey } from './labels'

/** PLACEHOLDER — the gap between the panel's bottom edge and the card's top edge, transcribed
 *  from the mockup's own 9px reading. The developer's to retune. */
const BOTTOM_GAP_PX = 9

/** PLACEHOLDER — the minimum gap kept between the panel's top edge and the viewport's top edge,
 *  so a panel rising well above the hand row still can't run off-screen. The developer's to
 *  retune. */
const TOP_MARGIN_PX = 16

export function useBuffBreakdownAnchor(
  panelRef: RefObject<HTMLDivElement | null>,
  target: Card | null,
): void {
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (panel === null || target === null) return
    const zone = panel.offsetParent as HTMLElement | null
    if (zone === null) return

    function measure() {
      if (panel === null || zone === null || target === null) return
      const cardEl = zone.querySelector<HTMLElement>(`[data-buff-anchor="${cardKey(target)}"]`)
      if (cardEl === null) return
      const zoneRect = zone.getBoundingClientRect()
      const cardRect = cardEl.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const want = cardRect.left + cardRect.width / 2 - zoneRect.left
      const left = Math.max(
        0,
        Math.min(zoneRect.width - panelRect.width, want - panelRect.width / 2),
      )
      panel.style.left = `${left}px`
      panel.style.setProperty('--point', `${want - left}px`)

      // The panel's bottom edge lands BOTTOM_GAP_PX above the card's own measured top — never
      // below it — and is free to rise above the zone entirely (that's the design: the panel
      // overlays the felt, not just the hand row). The only real ceiling is the viewport itself,
      // so the clamp bounds the panel's TOP edge to TOP_MARGIN_PX below the viewport's top rather
      // than bounding it to the zone's own height.
      const bottomWanted = zoneRect.bottom - cardRect.top + BOTTOM_GAP_PX
      const maxBottom = Math.max(0, zoneRect.bottom - panelRect.height - TOP_MARGIN_PX)
      const bottom = Math.max(0, Math.min(maxBottom, bottomWanted))
      panel.style.bottom = `${bottom}px`
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [panelRef, target])
}
