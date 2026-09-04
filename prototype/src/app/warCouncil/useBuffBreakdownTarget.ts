/**
 * DLR-153 AC13/AC14 — the breakdown panel's hover bridge. Hover-only, by developer decision on
 * DLR-153 Phase 8, REVERSING this ticket's original open-by-default reading: on a standalone
 * sheet nothing sat beneath the panel, but on the real felt it covers the played trick, and
 * open-by-default meant the trick stayed permanently occluded. The panel now opens only while a
 * lit card is entered (hover, keyboard focus, or a tap — `HandFan.tsx` and `WarCouncilRound.tsx`
 * are the two callers of `onEnterCard`) and holds open across the gap into the panel itself:
 * leaving either the card row or the panel schedules a close that entering the other cancels.
 * `Escape` closes.
 *
 * Blur schedules NOTHING — deliberately no `onBlur` field at all. Tabbing into the panel moves
 * focus off the card and would otherwise spring the same close-on-leave trap on a keyboard user
 * (AC18).
 *
 * One `useState` for the target, one `useRef` for the pending `setTimeout` id, and one
 * `useEffect` whose ONLY job is to clear that timer on unmount, so StrictMode's double mount
 * cannot leave an orphan that closes the panel under the next mount. No document-level listener:
 * `Escape` arrives through the hand's own `useRovingTabIndex` keydown handler and the panel's own
 * `onKeyDown`.
 */
import { useEffect, useRef, useState } from 'react'
import type { Card } from '../../warCouncil'

export interface BreakdownTarget {
  readonly target: Card | null
  readonly onEnterCard: (card: Card) => void
  readonly onLeaveCard: () => void
  readonly onEnterPanel: () => void
  readonly onLeavePanel: () => void
  readonly onEscape: () => void
}

/** PLACEHOLDER — transcribed from the mockup (160ms), the developer's to retune. The gap between
 *  a card and the panel it anchors to must stay crossable without the panel closing under the
 *  pointer, but how generous that window is is a feel choice, not this hook's to make. */
const CLOSE_DELAY_MS = 160

export function useBuffBreakdownTarget(): BreakdownTarget {
  const [target, setTarget] = useState<Card | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current)
    }
  }, [])

  function cancelScheduledClose() {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function scheduleClose() {
    cancelScheduledClose()
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      setTarget(null)
    }, CLOSE_DELAY_MS)
  }

  return {
    target,
    onEnterCard: (card) => {
      cancelScheduledClose()
      setTarget(card)
    },
    onLeaveCard: scheduleClose,
    onEnterPanel: cancelScheduledClose,
    onLeavePanel: scheduleClose,
    onEscape: () => {
      cancelScheduledClose()
      setTarget(null)
    },
  }
}
