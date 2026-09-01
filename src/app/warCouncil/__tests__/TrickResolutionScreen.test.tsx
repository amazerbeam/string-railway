/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PlayerSide,
  Suit,
  TrickOutcome,
  type TrickCard,
  type TrickResolution,
} from '../../../warCouncil'
import { cardAccessibleName } from '../labels'
import { BeatKind, type ResolutionBeat } from '../resolutionBeats'
import { RoundUiActionKind } from '../roundUiState'
import type { ResolutionView } from '../roundUiState'
import TrickResolutionScreen from '../TrickResolutionScreen'

afterEach(cleanup)

// `useBeatSequence` reads `window.matchMedia` on mount — jsdom does not implement it at all,
// mirroring `useBeatSequence.test.tsx`'s own stub.
function stubMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
stubMatchMedia(false)

const led: TrickCard = { side: PlayerSide.Cpu, card: { suit: Suit.Bells, rank: 4 } }
const followed: TrickCard = { side: PlayerSide.Player, card: { suit: Suit.Bells, rank: 10 } }

const bankedBeats: readonly ResolutionBeat[] = [
  { kind: BeatKind.Base, label: 'Base damage +1', amount: 1, damage: 1, mult: 1, running: 1 },
  {
    kind: BeatKind.Blade,
    label: 'Bell-Taker (Blade) bronze +1 DMG',
    amount: 1,
    damage: 2,
    mult: 1,
    running: 2,
  },
  {
    kind: BeatKind.Banked,
    label: 'Banked — total 12→14, roll 2→3',
    amount: 0,
    damage: 2,
    mult: 1,
    running: 2,
  },
]

const bankedResolution: TrickResolution = {
  outcome: TrickOutcome.CleanWin,
  trickDamage: { base: 1, buffDamage: 1, buffMult: 1, overlapBonus: 0, dealt: 2 },
  cashOut: 0,
  damageToPlayer: 0,
  total: 14,
  roll: 3,
  timebombTarget: null,
  timebombToQuarry: 0,
  blastGuardSpent: false,
  buffAccrual: null,
  firedBuffIds: [],
}

const bankedView: ResolutionView = {
  cards: [led, followed],
  winner: PlayerSide.Player,
  resolution: bankedResolution,
  beats: bankedBeats,
  trickNumber: 3,
  nextPotFloor: 60,
}

const hurtBeats: readonly ResolutionBeat[] = [
  {
    kind: BeatKind.Hurt,
    label: 'Hurt — −1 health, 24 pot lost',
    amount: -1,
    damage: 0,
    mult: 0,
    running: 0,
  },
]

const hurtResolution: TrickResolution = {
  outcome: TrickOutcome.CleanLoss,
  trickDamage: null,
  cashOut: 0,
  damageToPlayer: 1,
  total: 0,
  roll: 0,
  timebombTarget: null,
  timebombToQuarry: 0,
  blastGuardSpent: false,
  buffAccrual: null,
  firedBuffIds: [],
}

const hurtView: ResolutionView = {
  cards: [led, followed],
  winner: PlayerSide.Cpu,
  resolution: hurtResolution,
  beats: hurtBeats,
  trickNumber: 4,
  nextPotFloor: 0,
}

describe('TrickResolutionScreen', () => {
  it('AC14 — both played cards are on screen', () => {
    render(<TrickResolutionScreen resolution={bankedView} dispatch={vi.fn()} />)
    expect(screen.getByRole('button', { name: cardAccessibleName(led.card) })).toBeTruthy()
    expect(screen.getByRole('button', { name: cardAccessibleName(followed.card) })).toBeTruthy()
  })

  it('names the trick and its outcome in the header', () => {
    render(<TrickResolutionScreen resolution={bankedView} dispatch={vi.fn()} />)
    expect(screen.getByText(/trick 3 of 6/i)).toBeTruthy()
    expect(screen.getByText(/banked/i)).toBeTruthy()
  })

  it('AC2 — the pot and its parts (total, roll, product) are all legible', () => {
    render(<TrickResolutionScreen resolution={bankedView} dispatch={vi.fn()} />)
    expect(screen.getByRole('group', { name: /total 14.*roll 3.*pot 42/i })).toBeTruthy()
  })

  it('AC3 — the banked branch offers exactly two controls, told apart by shape and words', () => {
    render(<TrickResolutionScreen resolution={bankedView} dispatch={vi.fn()} />)
    const prompt = screen.getByRole('group', { name: /apply the pot, or roll it over/i })
    const buttons = prompt.querySelectorAll('button')
    expect(buttons.length).toBe(2)

    const apply = screen.getByRole('button', { name: /apply.*42/i })
    const roll = screen.getByRole('button', { name: /roll over.*60/i })
    expect(apply.className).toContain('wc-is-solid')
    expect(roll.className).toContain('wc-is-dashed')
    expect(apply.className).not.toBe(roll.className)
  })

  // DLR-156 — a choice no longer dispatches on the click itself: `useResolveHold` holds it for
  // `--wc-resolve-hold` (700ms in jsdom, since no custom property computes there) before the real
  // dispatch fires. FALLBACK_HOLD_MS mirrors `useResolveHold.test.tsx`'s own constant.
  const FALLBACK_HOLD_MS = 700

  it('AC5/AC6 — pressing Apply dispatches ApplyPot after the hold, pressing Roll over dispatches RollOver after the hold', () => {
    vi.useFakeTimers()
    const dispatch = vi.fn()
    render(<TrickResolutionScreen resolution={bankedView} dispatch={dispatch} />)

    fireEvent.click(screen.getByRole('button', { name: /apply.*42/i }))
    expect(dispatch).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(FALLBACK_HOLD_MS))
    expect(dispatch).toHaveBeenCalledWith({ kind: RoundUiActionKind.ApplyPot })
    vi.useRealTimers()
  })

  it('rolling over dispatches RollOver after the hold', () => {
    vi.useFakeTimers()
    const dispatch = vi.fn()
    render(<TrickResolutionScreen resolution={bankedView} dispatch={dispatch} />)

    fireEvent.click(screen.getByRole('button', { name: /roll over.*60/i }))
    expect(dispatch).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(FALLBACK_HOLD_MS))
    expect(dispatch).toHaveBeenCalledWith({ kind: RoundUiActionKind.RollOver })
    vi.useRealTimers()
  })

  it('AC7 — the hurt branch offers exactly one control, Onward, which dispatches RollOver after the hold', () => {
    vi.useFakeTimers()
    const dispatch = vi.fn()
    render(<TrickResolutionScreen resolution={hurtView} dispatch={dispatch} />)

    expect(screen.queryByRole('button', { name: /apply/i })).toBeNull()
    const onward = screen.getByRole('button', { name: /onward/i })
    fireEvent.click(onward)
    expect(dispatch).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(FALLBACK_HOLD_MS))
    expect(dispatch).toHaveBeenCalledWith({ kind: RoundUiActionKind.RollOver })
    expect(dispatch).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('the screen stays mounted through the hold and the wording names what happened, for both exits', () => {
    vi.useFakeTimers()
    const { unmount } = render(<TrickResolutionScreen resolution={bankedView} dispatch={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /apply.*42/i }))
    // Still mounted, still showing the trick — this is the component's own responsibility; the
    // actual return-to-felt swap is `WarCouncilRound.tsx`'s, driven by the deferred dispatch.
    expect(screen.getByText(/dealt to the quarry/i)).toBeTruthy()
    act(() => vi.advanceTimersByTime(FALLBACK_HOLD_MS))
    unmount()
    vi.useRealTimers()

    vi.useFakeTimers()
    render(<TrickResolutionScreen resolution={bankedView} dispatch={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /roll over.*60/i }))
    expect(screen.getByText(/rolled over/i)).toBeTruthy()
    vi.useRealTimers()
  })

  it('a second press during the hold does not dispatch a second time', () => {
    vi.useFakeTimers()
    const dispatch = vi.fn()
    render(<TrickResolutionScreen resolution={bankedView} dispatch={dispatch} />)

    const apply = screen.getByRole('button', { name: /apply.*42/i })
    fireEvent.click(apply)
    // No `@testing-library/jest-dom` in this project — read the DOM property directly, matching
    // this file's own sibling specs' convention (`WarCouncilRound.test.tsx`'s `disabled` checks).
    expect(apply).toHaveProperty('disabled', true)
    // A disabled button does not fire `click` in a real browser, but this proves the handler
    // itself refuses a second press too — belt-and-suspenders, matching `WarCouncilTable.tsx`'s
    // own DLR-156 review-fix discipline for the card flight's `inFlight` guard.
    fireEvent.click(apply)
    act(() => vi.advanceTimersByTime(FALLBACK_HOLD_MS))
    expect(dispatch).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('unmounting mid-hold clears the timer and dispatches nothing further', () => {
    vi.useFakeTimers()
    const dispatch = vi.fn()
    const { unmount } = render(
      <TrickResolutionScreen resolution={bankedView} dispatch={dispatch} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /apply.*42/i }))
    unmount()
    expect(() => act(() => vi.advanceTimersByTime(FALLBACK_HOLD_MS * 5))).not.toThrow()
    expect(dispatch).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('names the hurt header distinctly from a banked one', () => {
    render(<TrickResolutionScreen resolution={hurtView} dispatch={vi.fn()} />)
    expect(screen.getByText(/trick 4 of 6/i)).toBeTruthy()
    expect(screen.getByText(/streak is broken/i)).toBeTruthy()
  })
})
