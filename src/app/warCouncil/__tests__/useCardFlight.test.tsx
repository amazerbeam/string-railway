/** @vitest-environment jsdom */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCardFlight, type CardFlight } from '../useCardFlight'

afterEach(cleanup)

interface StubAnimation {
  onfinish: (() => void) | null
  readonly cancel: () => void
}

let animations: StubAnimation[]

/** jsdom implements no Web Animations API at all, so every test supplies its own controllable
 *  stub — exactly the "Web Animations stubbed" premise Task 17's regression case names. Each
 *  `fly()` call in these tests produces exactly one stub, pushed here in call order. */
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

function makeEl() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function Host({ onReady }: { onReady: (flight: CardFlight) => void }) {
  const flight = useCardFlight()
  onReady(flight)
  return <div />
}

describe('useCardFlight', () => {
  beforeEach(() => {
    stubAnimate()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls onLanded exactly once when the animation onfinish runs', () => {
    let flight!: CardFlight
    render(<Host onReady={(f) => (flight = f)} />)
    const onLanded = vi.fn()
    act(() => flight.fly(makeEl(), makeEl(), onLanded))
    act(() => animations[0]?.onfinish?.())
    expect(onLanded).toHaveBeenCalledTimes(1)
  })

  it('still calls onLanded exactly once when onfinish never fires and only the timer elapses (the hidden-tab case, ui-notes.md §2)', () => {
    let flight!: CardFlight
    render(<Host onReady={(f) => (flight = f)} />)
    const onLanded = vi.fn()
    act(() => flight.fly(makeEl(), makeEl(), onLanded))
    // `animations[0].onfinish` is deliberately never invoked — a background tab freezes WAAPI at
    // time 0, exactly as ui-notes.md §2 records.
    act(() => vi.advanceTimersByTime(1000))
    expect(onLanded).toHaveBeenCalledTimes(1)
  })

  it('still calls onLanded exactly once when a visibilitychange to visible arrives before the timer', () => {
    let flight!: CardFlight
    render(<Host onReady={(f) => (flight = f)} />)
    const onLanded = vi.fn()
    act(() => flight.fly(makeEl(), makeEl(), onLanded))
    setVisible()
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(onLanded).toHaveBeenCalledTimes(1)
    // The timer backstop firing afterward must not land a second time.
    act(() => vi.advanceTimersByTime(1000))
    expect(onLanded).toHaveBeenCalledTimes(1)
  })

  it('calls onLanded once, not three times, when onfinish, the timer and visibilitychange all fire', () => {
    let flight!: CardFlight
    render(<Host onReady={(f) => (flight = f)} />)
    const onLanded = vi.fn()
    act(() => flight.fly(makeEl(), makeEl(), onLanded))
    act(() => animations[0]?.onfinish?.())
    setVisible()
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => vi.advanceTimersByTime(1000))
    expect(onLanded).toHaveBeenCalledTimes(1)
  })

  it('unmounting mid-flight cancels the animation, clears the timer and removes the listener, and none of the three lands anything afterward', () => {
    let flight!: CardFlight
    const { unmount } = render(<Host onReady={(f) => (flight = f)} />)
    const onLanded = vi.fn()
    act(() => flight.fly(makeEl(), makeEl(), onLanded))
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
    expect(onLanded).not.toHaveBeenCalled()
  })
})
