import { useEffect, useRef, useState } from 'react'

interface OpenReasons {
  readonly hover: boolean
  readonly focus: boolean
  readonly tap: boolean
}

const CLOSED: OpenReasons = { hover: false, focus: false, tap: false }

export interface CardTipState {
  readonly open: boolean
  /** Viewport coordinates of the CARD — not of the host wrapper. `null` until the first open;
   *  stale (unused) rather than nulled while closed after that, since `open` alone gates render. */
  readonly anchor: DOMRect | null
  readonly hostRef: React.RefObject<HTMLSpanElement | null>
  readonly onClick: () => void
  readonly onPointerEnter: (event: React.PointerEvent) => void
  readonly onPointerLeave: (event: React.PointerEvent) => void
  readonly onFocus: () => void
  readonly onBlur: () => void
}

/**
 * The tooltip's open state, driven by three independent channels — hover, focus and tap — plus
 * the listeners that close it and the one that keeps it stuck to a moving card.
 *
 * `open` is true whenever ANY channel is active; each channel is tracked separately so, e.g.,
 * releasing hover while the card is still focused leaves the bubble up. Hover is gated to a real
 * mouse (`event.pointerType === 'mouse'`) so a touch tap does not also register as a stuck hover
 * that a touch device can never "leave".
 *
 * WHAT IS MEASURED, and why it is not the host. A hand card LIFTS — `translateY(-9%)` on hover,
 * `-5%` while pressed, `-20%` plus `scale(1.05)` while armed (`warCouncilCards.css`). Those
 * transforms live on `button.wc-card`; the host `<span>` carries none of them, so measuring the
 * host anchors the bubble to where the card would be if it were never lifted — which is what put
 * a growing gap between an armed card and its own tooltip. `getBoundingClientRect()` reflects
 * transforms, so measuring the card element itself gets the lifted position for free.
 *
 * WHEN IT IS MEASURED. On each opening, and then on the card's own `transitionend` — a DISCRETE
 * event, not a poll. That one listener covers every lift state there is, because every one of
 * them is reached by transitioning `transform` on the same element: hovering in or out, pressing,
 * and arming or disarming all end in a `transitionend` that re-measures. There is deliberately no
 * `ResizeObserver`, no `requestAnimationFrame` loop, and no re-measure on pointer move.
 *
 * All the listeners are registered ONLY while open and removed in the same effect's cleanup, so a
 * card that unmounts with its tooltip up — a played card leaving the hand, which is the ordinary
 * case — leaves nothing behind. Add-and-remove is idempotent, so StrictMode's double invocation
 * is a no-op rather than a doubled handler.
 *
 * EXCLUSIVITY, with no shared state between cards. A tap on a second card fires `pointerdown`
 * before its `click`, and a MOUSE moving anywhere outside this host fires `pointerover` — either
 * one closes this card's bubble, so at most one is ever up. The `pointerover` half is what a
 * tapped-open bubble needs: arming a card opens its tooltip AND focuses the button (both
 * deliberate, both pinned by tests), so neither the tap nor the focus channel had any reason to
 * drop while the player moved on to hover a different card, and two bubbles stayed on screen
 * with the armed card's rule over the hovered card's.
 *
 * `resize` CLOSES rather than re-measures. The felt is a no-scroll shell so there is no scroll to
 * track, and a bubble left pointing at where the card used to be is worse than one dismissed.
 */
export function useCardTip(): CardTipState {
  const hostRef = useRef<HTMLSpanElement | null>(null)
  const [reasons, setReasons] = useState<OpenReasons>(CLOSED)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const open = reasons.hover || reasons.focus || reasons.tap

  useEffect(() => {
    if (!open) return
    const card = cardElement(hostRef.current)
    const remeasure = () => {
      setAnchor((current) => nextAnchor(current, measure(hostRef.current)))
    }
    // The opening render measured the card BEFORE its lift transition had run; this catches the
    // settled position, and every later lift change lands here too.
    remeasure()
    const closeAll = () => setReasons(CLOSED)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAll()
    }
    const outside = (target: EventTarget | null) => !hostRef.current?.contains(target as Node)
    const onPointerDown = (event: PointerEvent) => {
      if (outside(event.target)) closeAll()
    }
    // A MOUSE moving onto anything else yields the bubble outright, every channel included.
    // Without this a bubble latched: tapping a card both arms it and opens its tooltip, and the
    // tap also focuses the button, so neither the tap nor the focus channel had any reason to
    // drop while the player moved on to hover a different card. The result was two bubbles up at
    // once, with the armed card's rule sitting over the hovered card's — which is how a hand
    // holding no 6 came to be showing a tooltip for a 6. Pointing somewhere else is a clear
    // statement about what the player is now looking at, so it outranks a stale focus.
    //
    // Gated on a real mouse for the same reason `onPointerEnter` is: a keyboard user is not
    // moving a pointer, so their focus bubble is never dismissed out from under them, and a
    // touch pointer has no "moving over things" state to read this from.
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && outside(event.target)) closeAll()
    }
    card?.addEventListener('transitionend', remeasure)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointerover', onPointerOver)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', closeAll)
    return () => {
      card?.removeEventListener('transitionend', remeasure)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', closeAll)
    }
  }, [open])

  function openReason(key: keyof OpenReasons) {
    // A visible no-op rather than a bubble rendered at the origin: if the host is not mounted
    // there is nothing to anchor to, and guessing a position would be worse than doing nothing.
    if (!open) setAnchor(measure(hostRef.current))
    setReasons((current) => ({ ...current, [key]: true }))
  }

  function closeReason(key: keyof OpenReasons) {
    setReasons((current) => ({ ...current, [key]: false }))
  }

  return {
    open,
    anchor,
    hostRef,
    onClick: () => (reasons.tap ? closeReason('tap') : openReason('tap')),
    onPointerEnter: (event) => {
      if (event.pointerType === 'mouse') openReason('hover')
    },
    onPointerLeave: (event) => {
      if (event.pointerType === 'mouse') closeReason('hover')
    },
    onFocus: () => openReason('focus'),
    onBlur: () => closeReason('focus'),
  }
}

/** The host wraps exactly one control — the card's own `<button>` — and that button is what
 *  carries the lift transform. Falling back to the host keeps a host with no control rendered
 *  (there is none today) anchoring to something real rather than to nothing. */
function cardElement(host: HTMLSpanElement | null): Element | null {
  if (host === null) return null
  return host.firstElementChild ?? host
}

function measure(host: HTMLSpanElement | null): DOMRect | null {
  return cardElement(host)?.getBoundingClientRect() ?? null
}

/** Keeps the previous rect when the card has not actually moved, so a `transitionend` for a
 *  property that changed nothing about the card's box costs no render. */
function nextAnchor(current: DOMRect | null, measured: DOMRect | null): DOMRect | null {
  if (current === null || measured === null) return measured
  const same =
    current.top === measured.top &&
    current.left === measured.left &&
    current.width === measured.width &&
    current.height === measured.height
  return same ? current : measured
}
