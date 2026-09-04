/** @vitest-environment jsdom */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, Suit, type WarCouncilState } from '../../../warCouncil'
import { PlaceKind } from '../cardPlacement'
import { cardKey } from '../labels'
import { MotionAnchorProvider } from '../MotionAnchors'
import { useMotionAnchor, useMotionAnchors, type MotionAnchors } from '../motionAnchorContext'
import { useCardMotionDriver } from '../useCardMotionDriver'
import { card, makeRound } from './roundFixture'

afterEach(cleanup)

interface StubAnimation {
  onfinish: (() => void) | null
  readonly cancel: () => void
}

let animations: StubAnimation[]

/** Carried over from `useCardMotion.test.tsx` — jsdom implements no Web Animations API. */
function stubAnimate() {
  animations = []
  Element.prototype.animate = vi.fn(function animate() {
    const cancel = vi.fn()
    const anim: StubAnimation = { onfinish: null, cancel }
    animations.push(anim)
    return anim as unknown as Animation
  }) as unknown as typeof Element.prototype.animate
}

function Reader({ onReady }: { onReady: (anchors: MotionAnchors) => void }) {
  const anchors = useMotionAnchors()
  onReady(anchors)
  return null
}

function PlaceAnchor({ place }: { place: { kind: PlaceKind; slot?: string } }) {
  const ref = useMotionAnchor(place)
  return <button ref={ref} />
}

// Task 11 — mirrors the real pattern (`HandFan.tsx`): a hand slot reads `arriving` from the
// registry itself and carries `wc-is-in-flight` while its card is the one flying in.
function HandCardAnchor({ slot }: { slot: string }) {
  const ref = useMotionAnchor({ kind: PlaceKind.PlayerHand, slot })
  const { arriving } = useMotionAnchors()
  return (
    <button
      ref={ref}
      aria-label={`hand-${slot}`}
      className={arriving.has(slot) ? 'wc-is-in-flight' : ''}
    />
  )
}

// A minimal set of anchors covering every place `makeRound`'s fixture cards occupy, so a
// movement between any two of them can always resolve a real element.
function TestAnchors({ round }: { round: WarCouncilState }) {
  const playerRefs = round.hands[PlayerSide.Player].map((c) => cardKey(c))
  return (
    <div>
      {playerRefs.map((key) => (
        <HandCardAnchor key={key} slot={key} />
      ))}
      <PlaceAnchor place={{ kind: PlaceKind.QuarryHand }} />
      <PlaceAnchor place={{ kind: PlaceKind.TrickWell }} />
      <PlaceAnchor place={{ kind: PlaceKind.DrawPile }} />
      <PlaceAnchor place={{ kind: PlaceKind.SpentPile }} />
      <PlaceAnchor place={{ kind: PlaceKind.DecreePlate }} />
    </div>
  )
}

function Driven({
  round,
  onReady,
}: {
  round: WarCouncilState
  onReady: (anchors: MotionAnchors) => void
}) {
  useCardMotionDriver(round)
  return (
    <>
      <Reader onReady={onReady} />
      <TestAnchors round={round} />
    </>
  )
}

function renderDriven(round: WarCouncilState) {
  return render(
    <MotionAnchorProvider>
      <Driven round={round} onReady={() => {}} />
    </MotionAnchorProvider>,
  )
}

const PLAYED = card(Suit.Keys, 3)

describe('useCardMotionDriver', () => {
  beforeEach(() => {
    stubAnimate()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits no movements on the first render — the previous placement is seeded, not diffed against empty', () => {
    const round = makeRound()
    renderDriven(round)
    // No clone was appended for any of the round's cards.
    expect(document.querySelectorAll('.wc-card-flyer').length).toBe(0)
  })

  it('a RoundState change emits exactly the movements diffPlacements reports', () => {
    const round = makeRound({ currentTrick: [{ side: PlayerSide.Player, card: PLAYED }] })
    const { rerender } = renderDriven(round)

    const spent = makeRound({ currentTrick: [], spentPile: [PLAYED] })
    act(() => {
      rerender(
        <MotionAnchorProvider>
          <Driven round={spent} onReady={() => {}} />
        </MotionAnchorProvider>,
      )
    })

    // The trick-well card flew toward the spent pile — a clone was appended.
    expect(document.querySelectorAll('.wc-card-flyer').length).toBeGreaterThan(0)
  })

  it('a re-render with an unchanged round emits nothing', () => {
    const round = makeRound()
    const { rerender } = renderDriven(round)
    act(() => {
      rerender(
        <MotionAnchorProvider>
          <Driven round={round} onReady={() => {}} />
        </MotionAnchorProvider>,
      )
    })
    expect(document.querySelectorAll('.wc-card-flyer').length).toBe(0)
  })

  it('the previous placement lives in a ref and survives a re-render', () => {
    const round = makeRound({ currentTrick: [{ side: PlayerSide.Player, card: PLAYED }] })
    const { rerender } = renderDriven(round)
    // Re-render with the SAME round first — must emit nothing, proving the ref, not a fresh
    // closure, is what's compared against.
    act(() => {
      rerender(
        <MotionAnchorProvider>
          <Driven round={round} onReady={() => {}} />
        </MotionAnchorProvider>,
      )
    })
    expect(document.querySelectorAll('.wc-card-flyer').length).toBe(0)

    const spent = makeRound({ currentTrick: [], spentPile: [PLAYED] })
    act(() => {
      rerender(
        <MotionAnchorProvider>
          <Driven round={spent} onReady={() => {}} />
        </MotionAnchorProvider>,
      )
    })
    expect(document.querySelectorAll('.wc-card-flyer').length).toBeGreaterThan(0)
  })

  it('unmounting mid-flight leaves no clone attached to document.body', () => {
    const round = makeRound({ currentTrick: [{ side: PlayerSide.Player, card: PLAYED }] })
    const { rerender, unmount } = renderDriven(round)
    const spent = makeRound({ currentTrick: [], spentPile: [PLAYED] })
    act(() => {
      rerender(
        <MotionAnchorProvider>
          <Driven round={spent} onReady={() => {}} />
        </MotionAnchorProvider>,
      )
    })
    expect(document.querySelectorAll('.wc-card-flyer').length).toBeGreaterThan(0)
    unmount()
    expect(document.querySelectorAll('.wc-card-flyer').length).toBe(0)
  })

  // Task 11 — AC7's class, on the arriving slot itself. `refill` starts in the draw pile and
  // moves to the hand — matching M4/M10's own shape (`from` down, `to` up, so `hide: 'to'` and
  // the card key joins `arriving`).
  const REFILL = card(Suit.Keys, 1)

  function refillRounds() {
    const round = makeRound({ drawPile: [...makeRound().drawPile, REFILL] })
    const withRefill = makeRound({
      drawPile: round.drawPile.filter((c) => cardKey(c) !== cardKey(REFILL)),
      hands: { ...round.hands, [PlayerSide.Player]: [...round.hands[PlayerSide.Player], REFILL] },
    })
    return { round, withRefill }
  }

  it('a card arriving into the hand carries wc-is-in-flight while airborne, and does not after it lands', () => {
    const { round, withRefill } = refillRounds()
    const { rerender, container } = renderDriven(round)

    act(() => {
      rerender(
        <MotionAnchorProvider>
          <Driven round={withRefill} onReady={() => {}} />
        </MotionAnchorProvider>,
      )
    })

    const handEl = container.querySelector(`[aria-label="hand-${cardKey(REFILL)}"]`) as HTMLElement
    expect(handEl.classList.contains('wc-is-in-flight')).toBe(true)

    // Land the flight (the one animation this single-request movement started).
    act(() => animations[0]?.onfinish?.())
    expect(handEl.classList.contains('wc-is-in-flight')).toBe(false)
  })

  it('under prefers-reduced-motion, an arriving card never carries wc-is-in-flight', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    try {
      const { round, withRefill } = refillRounds()
      const { rerender, container } = renderDriven(round)

      act(() => {
        rerender(
          <MotionAnchorProvider>
            <Driven round={withRefill} onReady={() => {}} />
          </MotionAnchorProvider>,
        )
      })

      const handEl = container.querySelector(
        `[aria-label="hand-${cardKey(REFILL)}"]`,
      ) as HTMLElement
      expect(handEl.classList.contains('wc-is-in-flight')).toBe(false)
      expect(document.querySelectorAll('.wc-card-flyer').length).toBe(0)
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })
})
