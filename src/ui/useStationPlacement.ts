import { useEffect, useRef, useState } from 'react'
import { MOVE_KIND } from '../constants/game'
import { cardRectAt } from '../rules/staging'
import { validateStationPlacement } from '../rules/validate'
import { useSvgPoint } from './useSvgPoint'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { RulesConfig } from '../rules/config'
import type { GameState, Move, Rect, StationId, StationRejectionReason } from '../rules/types'

export interface UseStationPlacementResult {
  readonly ghostRef: RefObject<SVGGElement | null>
  readonly dragging: boolean
  /** null while the current position is legal, while no drag is active, or
   *  while the pending card has never been positioned yet — see hasPosition. */
  readonly reason: StationRejectionReason | null
  readonly blockingStationId: StationId | null
  /** Whether the pending card has been positioned at least once since it
   *  became pending. Both "no verdict yet" and "the current position is
   *  legal" present as reason === null; a caller that must tell them apart
   *  (e.g. before rendering "Legal position.") gates on this instead. */
  readonly hasPosition: boolean
  readonly handlers: {
    onPointerDown(event: ReactPointerEvent<SVGSVGElement>): void
    onPointerMove(event: ReactPointerEvent<SVGSVGElement>): void
    onPointerUp(event: ReactPointerEvent<SVGSVGElement>): void
    onPointerCancel(event: ReactPointerEvent<SVGSVGElement>): void
  }
}

interface Verdict {
  readonly reason: StationRejectionReason | null
  readonly blockingStationId: StationId | null
}

const LEGAL: Verdict = { reason: null, blockingStationId: null }

/**
 * The M6-adjacent hot path, one story early. Two rules carry the design:
 *
 *  - The ghost's position is written straight to the DOM through ghostRef on
 *    every pointermove and never through React (architecture rule 4).
 *  - Legality is recomputed every move — validateStationPlacement is O(paths +
 *    stations), roughly 3 terrain paths and at most ~35 cards — but setState
 *    fires ONLY when the reason code changes, so a drag costs a render per
 *    legality transition rather than one per frame.
 *
 * Adjudicates nothing: it asks validateStationPlacement and renders the answer.
 * The reducer re-validates on dispatch, so AC4 has two independent guards.
 *
 * Handlers are JSX props rather than addEventListener registrations — React owns
 * their lifecycle, they close over the current render's state (so no stale
 * closure can validate against an old board), and there is no listener to leak.
 */
export function useStationPlacement(
  state: GameState,
  config: RulesConfig,
  svgRef: RefObject<SVGSVGElement | null>,
  dispatchMove: (move: Move) => void,
): UseStationPlacementResult {
  const ghostRef = useRef<SVGGElement | null>(null)
  const rectRef = useRef<Rect | null>(null)
  const reasonRef = useRef<StationRejectionReason | null>(null)
  // Holds one { element, pointerId } pair. A second concurrent pointerdown
  // with a different pointerId would overwrite it and leak the first
  // capture — unreachable today since touch/stylus multi-touch is out of
  // scope for this prototype and a mouse produces exactly one pointerId.
  const captureRef = useRef<{ element: SVGSVGElement; pointerId: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [verdict, setVerdict] = useState<Verdict>(LEGAL)
  // The id of the pending card that track() last positioned, so hasPosition
  // below can tell "never positioned for this card" apart from "positioned
  // and legal" even though both present as reason === null. State, not a ref:
  // hasPosition reads it at render time, and a ref may not be read there.
  const [positionedCardId, setPositionedCardId] = useState<StationId | null>(null)
  const toWorld = useSvgPoint(svgRef)

  const releaseCapture = (): void => {
    const capture = captureRef.current
    if (capture !== null && capture.element.hasPointerCapture(capture.pointerId)) {
      capture.element.releasePointerCapture(capture.pointerId)
    }
    captureRef.current = null
  }

  /** Position the ghost and refresh the verdict for one pointer position. */
  const track = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const point = toWorld(event)
    if (point === null) {
      return
    }
    const rect = cardRectAt(point, config.cardSize)
    rectRef.current = rect
    if (state.pendingCard !== null && positionedCardId !== state.pendingCard.id) {
      setPositionedCardId(state.pendingCard.id)
    }
    ghostRef.current?.setAttribute('transform', `translate(${rect.x} ${rect.y})`)

    const result = validateStationPlacement(state, rect, config)
    const reason = result.ok ? null : result.reason
    if (reason !== reasonRef.current) {
      reasonRef.current = reason
      setVerdict(
        result.ok ? LEGAL : { reason: result.reason, blockingStationId: result.stationId ?? null },
      )
    }
  }

  const handlers = {
    onPointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
      if (state.pendingCard === null) {
        return
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      captureRef.current = { element: event.currentTarget, pointerId: event.pointerId }
      setDragging(true)
      track(event)
    },
    onPointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
      if (!dragging || state.pendingCard === null) {
        return
      }
      track(event)
    },
    onPointerUp(event: ReactPointerEvent<SVGSVGElement>): void {
      const card = state.pendingCard
      // Presence check only — a drag was tracked at some point. The value
      // actually dispatched is read fresh from rectRef AFTER track() below,
      // never from this snapshot.
      const hadTrackedPosition = rectRef.current !== null
      releaseCapture()
      setDragging(false)
      if (card === null || !hadTrackedPosition) {
        return
      }
      track(event)
      const rect = rectRef.current
      // AC4 — commit only on the verdict the player was just shown, evaluated
      // against the SAME final position track() just recomputed. Reading both
      // reasonRef and rect only after this track() call (rather than binding
      // rect before it, as validateStationPlacement's earlier snippet did)
      // keeps the gate and the dispatched payload from disagreeing about which
      // candidate rect they mean when the up-event's coordinates differ from
      // the last sampled pointermove. An illegal release dispatches nothing,
      // so the card stays in hand rather than being placed or lost.
      if (reasonRef.current === null && rect !== null) {
        dispatchMove({ kind: MOVE_KIND.PLACE_STATION, cardId: card.id, rect })
      }
    },
    onPointerCancel(): void {
      releaseCapture()
      setDragging(false)
    },
  }

  // Cleanup-only: a drag interrupted by unmount must not leave the pointer
  // captured on a detached element.
  useEffect(() => releaseCapture, [])

  // The card left the hand (committed, or a new game replaced the state):
  // derived directly at render time, never via a setState-in-effect, so the
  // panel cannot keep showing a stale verdict for a card that is no longer
  // pending. reasonRef/rectRef need no matching reset — track() overwrites
  // both unconditionally the moment a new drag begins, and neither handler
  // reads them while state.pendingCard is null. dragging is masked the same
  // way: a route other than onPointerUp/onPointerCancel clearing
  // state.pendingCard mid-drag (e.g. a DebugPanel regenerate) would otherwise
  // leave dragging true until the next pointer event, so it is masked here
  // rather than left entirely to PlayArea's separate ghost gate on
  // state.pendingCard !== null.
  const hasCard = state.pendingCard !== null
  // True once track() has positioned THIS card at least once. Distinguishes
  // "no verdict yet" from "positioned and legal" — both present identically
  // as reason === null otherwise, which is exactly what let the panel render
  // "Legal position." before the player had touched the board even once, and
  // again for one render after a Rural's extra draw swaps in a new
  // pendingCard while the previous card's verdict is still in state.
  const hasPosition = hasCard && positionedCardId === state.pendingCard.id

  return {
    ghostRef,
    dragging: hasCard && dragging,
    reason: hasPosition ? verdict.reason : null,
    blockingStationId: hasPosition ? verdict.blockingStationId : null,
    hasPosition,
    handlers,
  }
}
