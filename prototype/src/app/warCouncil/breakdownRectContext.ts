/**
 * DLR-160 AC4 — the card-breakdown panel's measured top edge in VIEWPORT coordinates, or `null`
 * when no panel is open. ONE number crossing ONE boundary, so `CardAbilityTip` can place its
 * bubble above whichever of the card and the panel is higher.
 *
 * Both surfaces anchor to the top edge of the same hovered card — `useBuffBreakdownAnchor` sets
 * the panel's `bottom` from the card's measured rect, `useCardTip` sets the bubble's `top` from the
 * same rect — so they land on the same line EVERY time, not occasionally. That collision is the
 * ticket's fourth screenshot: the Witch's rule bubble sitting on top of the Key Low line that
 * explained the number, which cost a trick and produced a false bug report.
 */
import { createContext, useContext } from 'react'

export const BreakdownTopContext = createContext<number | null>(null)

export function useBreakdownTop(): number | null {
  return useContext(BreakdownTopContext)
}
