/** @vitest-environment jsdom */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlaceKind, type PlaceId } from '../cardPlacement'
import type { CardMoveRequest } from '../cardMotionPlan'
import { MotionAnchorProvider } from '../MotionAnchors'
import { useMotionAnchor } from '../motionAnchorContext'
import { useBuffCardMotion, type BuffCardMotion } from '../useBuffCardMotion'
import { useCardMotion, type CardMotion } from '../useCardMotion'

afterEach(cleanup)

interface StubAnimation {
  onfinish: (() => void) | null
  readonly cancel: () => void
}

let animations: StubAnimation[]

/** jsdom implements no Web Animations API at all, so every test supplies its own controllable
 *  stub, carried over unchanged from this hook's pre-DLR-157 spec. Each `.animate()` call — the
 *  wrap's own travel, or the clone's flip — produces exactly one stub, pushed here in call order. */
function stubAnimate() {
  animations = []
  Element.prototype.animate = vi.fn(function animate() {
    const cancel = vi.fn()
    const anim: StubAnimation = { onfinish: null, cancel }
    animations.push(anim)
    return anim as unknown as Animation
  }) as unknown as typeof Element.prototype.animate
}

function setVisible() {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
}

const SOURCE: PlaceId = { kind: PlaceKind.PlayerHand, slot: 'a' }
const DEST: PlaceId = { kind: PlaceKind.TrickWell }

function baseRequest(overrides: Partial<CardMoveRequest> = {}): CardMoveRequest {
  return { from: SOURCE, to: DEST, hide: 'to', flip: false, delayMs: 0, ...overrides }
}

function SourceEl() {
  const ref = useMotionAnchor(SOURCE)
  return <button ref={ref} aria-label="Source" />
}

function DestEl() {
  const ref = useMotionAnchor(DEST)
  return <button ref={ref} aria-label="Destination" />
}

function Host({ onReady }: { onReady: (motion: CardMotion) => void }) {
  const motion = useCardMotion()
  onReady(motion)
  return (
    <div>
      <SourceEl />
      <DestEl />
    </div>
  )
}

function renderHost(onReady: (motion: CardMotion) => void) {
  return render(
    <MotionAnchorProvider>
      <Host onReady={onReady} />
    </MotionAnchorProvider>,
  )
}

describe('useCardMotion', () => {
  beforeEach(() => {
    stubAnimate()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Carried over unchanged from this hook's pre-DLR-157 spec, as a one-request `move` call.
  it('calls onAllLanded exactly once when the animation onfinish runs', () => {
    let motion!: CardMotion
    renderHost((m) => (motion = m))
    const onAllLanded = vi.fn()
    act(() => motion.move([baseRequest()], onAllLanded))
    act(() => animations[0]?.onfinish?.())
    expect(onAllLanded).toHaveBeenCalledTimes(1)
  })

  it('still calls onAllLanded exactly once when onfinish never fires and only the timer elapses (the hidden-tab case, ui-notes.md §2)', () => {
    let motion!: CardMotion
    renderHost((m) => (motion = m))
    const onAllLanded = vi.fn()
    act(() => motion.move([baseRequest()], onAllLanded))
    // `animations[0].onfinish` is deliberately never invoked — a background tab freezes WAAPI at
    // time 0, exactly as ui-notes.md §2 records.
    act(() => vi.advanceTimersByTime(1000))
    expect(onAllLanded).toHaveBeenCalledTimes(1)
  })

  it('still calls onAllLanded exactly once when a visibilitychange to visible arrives before the timer', () => {
    let motion!: CardMotion
    renderHost((m) => (motion = m))
    const onAllLanded = vi.fn()
    act(() => motion.move([baseRequest()], onAllLanded))
    setVisible()
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(onAllLanded).toHaveBeenCalledTimes(1)
    // The timer backstop firing afterward must not land a second time.
    act(() => vi.advanceTimersByTime(1000))
    expect(onAllLanded).toHaveBeenCalledTimes(1)
  })

  it('calls onAllLanded once, not three times, when onfinish, the timer and visibilitychange all fire', () => {
    let motion!: CardMotion
    renderHost((m) => (motion = m))
    const onAllLanded = vi.fn()
    act(() => motion.move([baseRequest()], onAllLanded))
    act(() => animations[0]?.onfinish?.())
    setVisible()
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => vi.advanceTimersByTime(1000))
    expect(onAllLanded).toHaveBeenCalledTimes(1)
  })

  it('unmounting mid-flight cancels the animation, clears the timer and removes the listener, and none of the three lands anything afterward', () => {
    let motion!: CardMotion
    const { unmount } = renderHost((m) => (motion = m))
    const onAllLanded = vi.fn()
    act(() => motion.move([baseRequest()], onAllLanded))
    const anim = animations[0]
    unmount()
    expect(anim?.cancel).toHaveBeenCalledTimes(1)

    // The animation's own onfinish reference is still assigned on the stub object (a real
    // Animation instance would behave the same way — cancelling it does not clear the handler) —
    // so this is a genuine test of the hook's own idempotence guard, not of the stub's shape.
    act(() => anim?.onfinish?.())
    setVisible()
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => vi.advanceTimersByTime(1000))
    expect(onAllLanded).not.toHaveBeenCalled()
  })

  // New DLR-157 cases.
  it('calls onAllLanded exactly once after a three-request group all land', () => {
    let motion!: CardMotion
    renderHost((m) => (motion = m))
    const onAllLanded = vi.fn()
    act(() =>
      motion.move(
        [baseRequest({ delayMs: 0 }), baseRequest({ delayMs: 70 }), baseRequest({ delayMs: 140 })],
        onAllLanded,
      ),
    )
    act(() => vi.advanceTimersByTime(1000))
    expect(onAllLanded).toHaveBeenCalledTimes(1)
  })

  it('starts requests at 0, s, 2s under fake timers (AC5)', () => {
    let motion!: CardMotion
    renderHost((m) => (motion = m))
    act(() =>
      motion.move(
        [baseRequest({ delayMs: 0 }), baseRequest({ delayMs: 70 }), baseRequest({ delayMs: 140 })],
        vi.fn(),
      ),
    )
    expect(animations.length).toBe(1)
    act(() => vi.advanceTimersByTime(69))
    expect(animations.length).toBe(1)
    act(() => vi.advanceTimersByTime(1))
    expect(animations.length).toBe(2)
    act(() => vi.advanceTimersByTime(69))
    expect(animations.length).toBe(2)
    act(() => vi.advanceTimersByTime(1))
    expect(animations.length).toBe(3)
  })

  it('under prefers-reduced-motion, appends no clone, sets no timer, and calls onAllLanded synchronously (AC8)', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    try {
      let motion!: CardMotion
      renderHost((m) => (motion = m))
      const onAllLanded = vi.fn()
      act(() => motion.move([baseRequest()], onAllLanded))
      expect(onAllLanded).toHaveBeenCalledTimes(1)
      expect(document.querySelectorAll('.wc-card-flyer').length).toBe(0)
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })

  it('a request whose place cannot be resolved still lands and still counts toward onAllLanded', () => {
    let motion!: CardMotion
    renderHost((m) => (motion = m))
    const onAllLanded = vi.fn()
    const unresolvable: PlaceId = { kind: PlaceKind.SpentPile }
    act(() => motion.move([baseRequest({ to: unresolvable })], onAllLanded))
    expect(onAllLanded).toHaveBeenCalledTimes(1)
  })

  it('a request with flip: true runs a second animation on the clone; flip: false does not', () => {
    let motion!: CardMotion
    renderHost((m) => (motion = m))
    act(() => motion.move([baseRequest({ flip: true })], vi.fn()))
    expect(animations.length).toBe(2)

    stubAnimate()
    act(() => motion.move([baseRequest({ flip: false })], vi.fn()))
    expect(animations.length).toBe(1)
  })

  it('a group superseded before it lands still has its own onAllLanded flushed exactly once (QA fix — DLR-157 review)', () => {
    let motion!: CardMotion
    renderHost((m) => (motion = m))
    const firstLanded = vi.fn()
    const secondLanded = vi.fn()
    act(() => motion.move([baseRequest()], firstLanded))
    // The first group's animation never finishes — it is superseded mid-flight, exactly the
    // shape a second remove tap or a second buy click produces. `animations` accumulates across
    // both calls (the stub is not reset between them), so the second group's own animation is
    // the SECOND entry.
    act(() => motion.move([baseRequest()], secondLanded))
    expect(firstLanded).toHaveBeenCalledTimes(1) // flushed, not dropped
    expect(secondLanded).not.toHaveBeenCalled() // still airborne
    act(() => animations[1]?.onfinish?.())
    expect(secondLanded).toHaveBeenCalledTimes(1)
    expect(firstLanded).toHaveBeenCalledTimes(1) // never called a second time
  })

  it('unmount mid-flight still calls no landing callback at all, even the flush path', () => {
    let motion!: CardMotion
    const { unmount } = renderHost((m) => (motion = m))
    const onAllLanded = vi.fn()
    act(() => motion.move([baseRequest()], onAllLanded))
    unmount()
    expect(onAllLanded).not.toHaveBeenCalled()
  })

  it('with hide: "to", the destination carries visibility:hidden during the flight and has it cleared on landing; with hide: "from", the source does (AC7)', () => {
    let motion!: CardMotion
    const { container } = renderHost((m) => (motion = m))
    const dest = container.querySelector('[aria-label="Destination"]') as HTMLElement
    act(() => motion.move([baseRequest({ hide: 'to' })], vi.fn()))
    expect(dest.style.visibility).toBe('hidden')
    act(() => animations[0]?.onfinish?.())
    expect(dest.style.visibility).toBe('')

    stubAnimate()
    const source = container.querySelector('[aria-label="Source"]') as HTMLElement
    act(() => motion.move([baseRequest({ hide: 'from' })], vi.fn()))
    expect(source.style.visibility).toBe('hidden')
    act(() => animations[0]?.onfinish?.())
    expect(source.style.visibility).toBe('')
  })
})

// DLR-157 Task 13 — M15/M16, through `useBuffCardMotion`'s own two directions.
describe('useBuffCardMotion', () => {
  beforeEach(() => {
    stubAnimate()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const GALLERY: PlaceId = { kind: PlaceKind.BuffGallery, slot: 'buff-1' }
  const STRIP: PlaceId = { kind: PlaceKind.RidingStrip, slot: 'buff-1' }

  function GalleryEl() {
    const ref = useMotionAnchor(GALLERY)
    return <button ref={ref} aria-label="Gallery" />
  }

  function StripEl() {
    const ref = useMotionAnchor(STRIP)
    return <button ref={ref} aria-label="Strip" />
  }

  function BuffHost({ onReady }: { onReady: (motion: BuffCardMotion) => void }) {
    const motion = useBuffCardMotion()
    onReady(motion)
    return (
      <div>
        <GalleryEl />
        <StripEl />
      </div>
    )
  }

  function renderBuffHost(onReady: (motion: BuffCardMotion) => void) {
    return render(
      <MotionAnchorProvider>
        <BuffHost onReady={onReady} />
      </MotionAnchorProvider>,
    )
  }

  it('flyToStrip lands and calls onLanded, with no flip (neither end changes face)', () => {
    let motion!: BuffCardMotion
    renderBuffHost((m) => (motion = m))
    const onLanded = vi.fn()
    act(() => motion.flyToStrip('buff-1', onLanded))
    expect(animations.length).toBe(1) // the wrap's own travel only — no second, flip animation
    act(() => animations[0]?.onfinish?.())
    expect(onLanded).toHaveBeenCalledTimes(1)
  })

  it('flyToGallery lands and calls onLanded, the exact reverse', () => {
    let motion!: BuffCardMotion
    renderBuffHost((m) => (motion = m))
    const onLanded = vi.fn()
    act(() => motion.flyToGallery('buff-1', onLanded))
    expect(animations.length).toBe(1)
    act(() => animations[0]?.onfinish?.())
    expect(onLanded).toHaveBeenCalledTimes(1)
  })

  it('a buff removed while the gallery is closed has no destination anchor: it lands instantly and onLanded still fires', () => {
    function StripOnlyHost({ onReady }: { onReady: (motion: BuffCardMotion) => void }) {
      const motion = useBuffCardMotion()
      onReady(motion)
      return <StripEl />
    }
    let motion!: BuffCardMotion
    render(
      <MotionAnchorProvider>
        <StripOnlyHost onReady={(m) => (motion = m)} />
      </MotionAnchorProvider>,
    )
    const onLanded = vi.fn()
    act(() => motion.flyToGallery('buff-1', onLanded))
    // No clone was ever appended — the unresolvable `to` lands the request synchronously
    // (`useCardMotion.ts`'s own unresolvable-anchor path), the same instant landing an unreachable
    // destination gets everywhere else in this primitive.
    expect(document.querySelectorAll('.wc-card-flyer').length).toBe(0)
    expect(onLanded).toHaveBeenCalledTimes(1)
  })

  it('a second removal tap mid-flight still commits the first removal (QA fix — DLR-157 review, Defender CRITICAL)', () => {
    let motion!: BuffCardMotion
    renderBuffHost((m) => (motion = m))
    const firstRemoved = vi.fn()
    const secondRemoved = vi.fn()
    // `flyToStrip` and `flyToGallery` share ONE `useCardMotion()` instance — a second tap firing
    // either direction mid-flight used to tear the first flight down without ever calling back,
    // silently dropping the buff's actual removal.
    act(() => motion.flyToGallery('buff-1', firstRemoved))
    act(() => motion.flyToGallery('buff-1', secondRemoved))
    expect(firstRemoved).toHaveBeenCalledTimes(1) // flushed — the removal still commits
    expect(secondRemoved).not.toHaveBeenCalled()
    // `animations` accumulates across both calls — the second group's own animation is entry 1.
    act(() => animations[1]?.onfinish?.())
    expect(secondRemoved).toHaveBeenCalledTimes(1)
  })

  it('inFlight is true while a flight is airborne and false once it lands', () => {
    let motion!: BuffCardMotion
    renderBuffHost((m) => (motion = m))
    expect(motion.inFlight).toBe(false)
    act(() => motion.flyToStrip('buff-1', vi.fn()))
    expect(motion.inFlight).toBe(true)
    act(() => animations[0]?.onfinish?.())
    expect(motion.inFlight).toBe(false)
  })
})
