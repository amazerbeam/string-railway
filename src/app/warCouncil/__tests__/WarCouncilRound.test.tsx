/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { HAND_SIZE } from '../../../hunt'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import WarCouncilRound from '../WarCouncilRound'
import {
  baseDamageBonusFixture,
  card,
  coinsFixture,
  discardsRemainingFixture,
  encounterFixture,
  huntFixture,
  makeRound,
  maxHealthFixture,
  quarryLabelFixture,
  runLabelFixture,
} from './roundFixture'
import {
  advanceTrickDwell,
  applyFromResolution,
  carryOnFromResolution,
  stubMatchMedia,
} from './resolutionTestHelpers'

afterEach(cleanup)

stubMatchMedia()

// DLR-156 play-test fix 1 — `useTrickDwell`'s `setTimeout` is created the instant a commit tap
// resolves a trick (inside that tap's own `fireEvent.click`), which is BEFORE any of this file's
// helpers get a chance to switch timer modes. A `setTimeout` created under real timers cannot be
// driven by `vi.advanceTimersByTime` at all (`resolutionTestHelpers.ts`'s own docblock on
// `withResolveHold`) — so fake timers must already be active at the moment of every commit tap,
// which means for the whole file, not switched on after the fact.
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

/**
 * Renders `WarCouncilRound` with the shared fixtures, letting any prop be overridden per test.
 * Collapses this file's many near-identical five-prop render calls back to one line each
 * (DLR-71 Round 2) — a mechanical `prettier --write` reflowing all seventeen into
 * one-prop-per-line blocks was what pushed the file over the 400-line budget in the first place.
 *
 * Split further at the same budget (DLR-93): this is the core render/trick-play/hand-completion
 * slice, and the health-bar/purse/shape readouts live in `WarCouncilRound.readouts.test.tsx`. Each
 * mirrors this same `renderRound` helper rather than importing it, following this file's own
 * pre-existing split precedent (`WarCouncilRound.actionBar.test.tsx`).
 *
 * DLR-148 deleted `WarCouncilRound.telegraph.test.tsx` along with the intent telegraph itself —
 * `TrickWell.test.tsx` covers the "Let them lead" copy and control that file used to exercise
 * through this component; the dossier's own panel count and the felt re-home are asserted below.
 */
function renderRound(overrides: Partial<WarCouncilMountProps> = {}) {
  return render(
    <WarCouncilRound
      initialState={overrides.initialState ?? makeRound()}
      hunt={overrides.hunt ?? huntFixture}
      encounter={overrides.encounter ?? encounterFixture}
      maxHealth={overrides.maxHealth ?? maxHealthFixture}
      runLabel={overrides.runLabel ?? runLabelFixture}
      quarryLabel={quarryLabelFixture}
      coins={overrides.coins ?? coinsFixture}
      baseDamageBonus={overrides.baseDamageBonus ?? baseDamageBonusFixture}
      discardsRemaining={overrides.discardsRemaining ?? discardsRemainingFixture}
      buffs={overrides.buffs ?? []}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

describe('WarCouncilRound', () => {
  it('renders the hand as buttons named by rank and suit', () => {
    renderRound()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toBeDefined()
    expect(screen.getByRole('button', { name: '3 of Keys (Fox)' })).toBeDefined()
  })

  it('renders the hand longest-suit-first, not in dealt order (AC6)', () => {
    renderRound()
    const hand = screen.getByRole('group', { name: /hand/i })
    const names = within(hand)
      .getAllByRole('button', { name: /of (Bells|Keys|Moons)/ })
      .map((b) => b.getAttribute('aria-label') ?? '')
    // makeRound's hand holds 2 of each suit, so ALL_SUITS order applies throughout:
    // Bells 2, Bells 7, Keys 3, Keys 8, Moons 5, Moons 11.
    expect(names).toEqual([
      '2 of Bells',
      '7 of Bells',
      '3 of Keys (Fox)',
      '8 of Keys',
      '5 of Moons (Woodcutter)',
      '11 of Moons (Monarch)',
    ])
  })

  it('is interactive from the first render — there is no declaration to wait on (DLR-80)', () => {
    renderRound()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', false)
  })

  it('plays a legal card on the second tap of the same card', () => {
    renderRound()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    // Correction: a raw `element.click()` dispatches a real event, but under
    // React 19 + jsdom the resulting state update is not guaranteed to flush
    // synchronously outside an `act()` scope — confirmed empirically (the
    // DOM still showed the pre-click aria-pressed value immediately after a
    // raw `.click()`). `fireEvent.click` wraps the dispatch in `act()`, so
    // every click in this file uses it rather than the bare DOM method.
    fireEvent.click(bells7)
    expect(bells7.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(bells7)
    // DLR-156 — the committed card completes the trick (both fixture hands hold exactly one
    // Bells card each, and Bells is trump), so the felt hands off to the resolution screen
    // (AC2/AC14) rather than showing the played card in a held reveal of its own. Dismissing it
    // returns the felt already advanced — the played 7 of Bells does not reappear in the hand.
    carryOnFromResolution()
    const hand = screen.getByRole('group', { name: /hand/i })
    expect(within(hand).queryByRole('button', { name: '7 of Bells' })).toBeNull()
  })

  it('resolves the trick and keeps the hand interactive even when the flight’s onfinish never fires (AC15, ui-notes.md §2 — the hidden-tab case)', () => {
    // Web Animations stubbed so the play COULD start a real flight, but its `onfinish` is
    // deliberately never invoked — exactly the defect a background tab causes: `currentTime`
    // freezes at 0, `onfinish` never fires, and without the timer backstop `useCardMotion.ts`
    // exists to provide, the trick would never resolve and the hand would stop responding for
    // the rest of the session.
    const originalAnimate = Element.prototype.animate
    Element.prototype.animate = vi.fn(
      () => ({ onfinish: null, cancel: vi.fn() }) as unknown as Animation,
    )
    vi.useFakeTimers()
    try {
      renderRound()
      const bells7 = screen.getByRole('button', { name: '7 of Bells' })
      fireEvent.click(bells7)
      fireEvent.click(bells7)
      // Nobody ever calls the stubbed animation's `onfinish` — only the timer backstop can land
      // this. `--wc-flight` is unreadable in jsdom, so `useCardMotion.ts` falls back to its
      // documented 380ms; advancing well past it is what proves the timer path alone is enough.
      // DLR-156 play-test fix 1 — the resolution screen itself is now held behind
      // `--wc-trick-dwell` (`useTrickDwell.ts`'s fallback 800ms) on TOP of the flight, but the
      // TWO timers are chained, not simultaneous: the dwell's own `setTimeout` is not created
      // until the flight's landing dispatch has committed and re-rendered, so it must be advanced
      // in its OWN `act()` call, after the flight's — a single combined advance does not
      // reliably observe a timer that a still-in-flight effect has not scheduled yet.
      act(() => vi.advanceTimersByTime(1000))
      advanceTrickDwell()
      // DLR-160 AC11 — the felt's own well and the resolution panel now both say the outcome word
      // at once (both read `resolutionOutcome.ts`), so this reads `getAllByText`.
      expect(screen.getAllByText(/high victory/i).length).toBeGreaterThan(0)
      carryOnFromResolution()
      // The hand is back, interactive, and the played card is gone — not a permanently locked
      // felt, which is the actual failure this defect causes when the landing depends on
      // `onfinish` alone.
      const hand = screen.getByRole('group', { name: /hand/i })
      expect(within(hand).queryByRole('button', { name: '7 of Bells' })).toBeNull()
      const anotherCard = screen.getByRole('button', { name: '2 of Bells' })
      expect(anotherCard).toHaveProperty('disabled', false)
    } finally {
      Element.prototype.animate = originalAnimate
      vi.useRealTimers()
    }
  })

  it('rejects a tap on a DIFFERENT card while the first is still in flight, rather than silently reinterpreting it as a fresh arm (Defender Critical — WarCouncilTable.tsx/useCardMotion.ts)', () => {
    // Reproduces the exact A-B-land race: arm 7 of Bells, commit it (starts the ~380ms flight —
    // the dispatch that actually plays it is DEFERRED to landing, so `ui.armed` still names 7 of
    // Bells while it is airborne), then tap 2 of Bells before it lands. Before this fix, `ui.armed`
    // still pointing at 7 of Bells made that second tap read as a fresh arm rather than a commit; it
    // reached the reducer just as 7 of Bells' own deferred dispatch landed, which then re-armed 7 of
    // Bells instead of ever playing it — the card visually flew to the table but nothing committed,
    // and the player's tap on 2 of Bells was silently discarded.
    const originalAnimate = Element.prototype.animate
    Element.prototype.animate = vi.fn(
      () => ({ onfinish: null, cancel: vi.fn() }) as unknown as Animation,
    )
    vi.useFakeTimers()
    try {
      renderRound()
      const bells7 = screen.getByRole('button', { name: '7 of Bells' })
      const bells2 = screen.getByRole('button', { name: '2 of Bells' })
      fireEvent.click(bells7) // arm
      fireEvent.click(bells7) // commit — starts the flight, dispatch deferred to landing
      // Airborne: the whole hand rejects a tap — 2 of Bells is disabled, not a live re-arm target.
      expect(bells2).toHaveProperty('disabled', true)
      fireEvent.click(bells2) // a disabled button fires no onClick — this must be a no-op
      // Land the flight, then clear the resolution screen's own `--wc-trick-dwell` hold on top of
      // it (DLR-156 play-test fix 1) — a SEPARATE `act()` advance for each: the dwell's own
      // `setTimeout` is not created until the flight's landing dispatch has already re-rendered.
      act(() => vi.advanceTimersByTime(1000))
      advanceTrickDwell()
      expect(screen.getAllByText(/high victory/i).length).toBeGreaterThan(0)
      carryOnFromResolution()
      // 7 of Bells committed as the player's original intent — gone from the hand; 2 of Bells,
      // never touched, is still held.
      const hand = screen.getByRole('group', { name: /hand/i })
      expect(within(hand).queryByRole('button', { name: '7 of Bells' })).toBeNull()
      expect(within(hand).getByRole('button', { name: '2 of Bells' })).toBeDefined()
    } finally {
      Element.prototype.animate = originalAnimate
      vi.useRealTimers()
    }
  })

  it('shows the live trick counts and updates them once a trick resolves (AC4)', () => {
    // roundReducer.test.ts already asserts the reducer's internal `tricksWon`; this proves
    // the scoreboard itself is wired to it, not merely that the value exists somewhere in
    // state. Bells is trump, and both fixture hands hold exactly one Bells card each, so the
    // committed 7 of Bells resolves the trick in the same commit (AC2) and the player's card
    // (7) beats the CPU's forced follow (4) under trump.
    renderRound()
    // No `@testing-library/jest-dom` is installed in this project (see devDependencies),
    // so the assertion reads the element's own `textContent` rather than reaching for its
    // `toHaveTextContent` matcher.
    expect(screen.getByRole('group', { name: /tricks won/i }).textContent).toMatch(/You0/)
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    // DLR-156 — the scoreboard lives on the felt, which the resolution screen replaces the
    // instant the trick resolves; dismiss it, then RE-QUERY — the felt unmounted and remounted,
    // so the element captured before the trick resolved is a stale, now-detached node.
    carryOnFromResolution()
    expect(screen.getByRole('group', { name: /tricks won/i }).textContent).toMatch(/You1/)
  })

  it('disables a card the engine says is illegal', () => {
    // Built already mid-trick.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round })
    // The player holds Moons, so following suit is forced and Bells is out.
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: '11 of Moons (Monarch)' })).toHaveProperty(
      'disabled',
      false,
    )
  })

  it('DLR-163 AC1/AC2 — shows the trump suit, and naming a new one changes it and empties the plate', () => {
    renderRound()
    expect(screen.getByText(/Bells is trump/i)).toBeDefined()
    const fox = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    fireEvent.click(fox)
    fireEvent.click(fox)
    // The prompt offers SUITS now, not hand cards. Scoped to its own labelled region because
    // the suit names also appear on the felt's trump chip and the Quarry's shape rows.
    const prompt = screen.getByRole('group', { name: 'Name the new trump suit' })
    fireEvent.click(within(prompt).getByRole('button', { name: /moons/i }))
    // DLR-156 — the Fox's own commit resolves the trick in the same transition (the player led,
    // so the Quarry's forced follow completes it immediately), handing off to the resolution
    // screen; the trump readout lives on the felt, so dismiss it before reading the felt again.
    carryOnFromResolution()
    expect(screen.getByText(/Moons is trump/i)).toBeDefined()
    // AC2 — the decree plate is a bare suit marker now, with no card behind it.
    expect(screen.getByRole('img', { name: /decree replaced — moons is trump/i })).toBeDefined()
  })

  it('holds the deciding sixth trick on the resolution screen before the hand-over panel, then reports onComplete once', () => {
    const onComplete = vi.fn()
    const round = makeRound({
      tricksPlayed: HAND_SIZE - 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 7)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 4)],
      },
    })
    renderRound({ initialState: round, onComplete })
    const last = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(last)
    fireEvent.click(last)
    advanceTrickDwell()
    // DLR-156 — the deciding trick resolves and completes the hand in the same commit, but its
    // cards and winner must be visible — on the resolution panel now, overlaid on the felt
    // (DLR-160 AC11) — before the hand-over panel replaces the whole tree.
    expect(screen.getAllByText(/high victory/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'The hand is over' })).toBeNull()
    carryOnFromResolution()
    // `roundReducer.ts`'s Task 15 chaining clears the held reveal and finds the hand already
    // complete, so the panel appears directly — there is no second felt-side tap to make.
    expect(screen.getByRole('heading', { name: 'The hand is over' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Deal the next Hunt' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].finalState.phase).toBe(RoundPhase.Complete)
  })

  it('reports onComplete with a finalState still short of RoundPhase.Complete when applying a pot resolves the encounter mid-hand (Defender Warning 1)', () => {
    // DLR-156 — a cash-out is no longer automatic on a winning trick; it happens only when the
    // player presses Apply Damage on the resolution screen (AC5). A total of 500 at roll 2 pays
    // 500 x 2 = 1000, which comfortably exceeds this encounter's 10-health Quarry — so the
    // Quarry's bar empties on THIS trick, trick 3 of 6, rather than the hand's sixth. The player
    // leads the trump 9, which beats the Quarry's forced trump follow (5), so the trick BANKS
    // and offers the choice at all — a losing trick wipes the streak for nothing (AC7) and never
    // reaches Apply.
    const onComplete = vi.fn()
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      total: 500,
      roll: 2,
      tricksPlayed: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Keys, 9), card(Suit.Bells, 1)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 8), card(Suit.Keys, 5)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round, onComplete })
    const keys9 = screen.getByRole('button', { name: '9 of Keys (Witch)' })
    fireEvent.click(keys9)
    fireEvent.click(keys9)
    // DLR-156 (hold) — the Apply dispatch is deferred behind `--wc-resolve-hold`; `onComplete`
    // must not fire early, fire from a lost update, or fire twice once the hold has run its
    // course. `applyFromResolution` presses AND flushes the hold in one call.
    applyFromResolution()
    expect(onComplete).not.toHaveBeenCalled()
    // Applying the pot killed the Quarry mid-hand — the deciding trick's own reveal survives on
    // the felt (the SAME held-reveal affordance the hand's actual sixth trick uses below), since
    // the felt's own `handleCarryOn` reports `onComplete` on that tap without ever reaching a
    // sixth trick.
    // DLR-160 AC1 — a real button named "Carry on" now (the "tap the table" copy is gone).
    const carryOn = screen.getByRole('button', { name: /^carry on$/i })
    fireEvent.click(carryOn)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].finalState.phase).not.toBe(RoundPhase.Complete)
  })

  it('reaches the resolution screen’s own exit control by keyboard alone', () => {
    // DLR-156 — every trick now hands off to the resolution screen rather than holding the felt
    // open, so the escape hatch a keyboard-only player needs is one of ITS controls, not the
    // felt's own "tap the table" button. Activating it via `fireEvent.click` rather than
    // `fireEvent.keyDown(..., { key: 'Enter' })` — a native button's own Enter/Space activation
    // is the HTML platform's guarantee, not this component's to re-prove.
    renderRound()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    advanceTrickDwell()
    const rollOver = screen.getByRole('button', { name: /roll over/i })
    rollOver.focus()
    expect(document.activeElement).toBe(rollOver)
    carryOnFromResolution()
    expect(screen.queryByRole('button', { name: /roll over/i })).toBeNull()
  })

  it('the dossier holds two panels now the Quarry identity card is gone', () => {
    const { container } = renderRound()
    const dossier = container.querySelector('.wc-dossier')
    expect(dossier?.children.length).toBe(2)
  })

  it('DLR-148 — opening the buff gallery leaves the decree, the spent pile and the Quarry’s played card in the document (AC1, jsdom half)', () => {
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 6) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round })
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    expect(screen.getByRole('dialog', { name: 'Your buffs' })).toBeDefined()
    // The decree, still in the rail — not occluded by the now-open gallery.
    expect(screen.getByRole('button', { name: '10 of Bells' })).toBeDefined()
    // The spent pile, still in the rail.
    expect(screen.getByRole('group', { name: 'Spent' })).toBeDefined()
    // The Quarry's played card, condensed into the rail's own trick strip.
    expect(screen.getByRole('button', { name: '6 of Moons' })).toBeDefined()
  })
})

// The full-hand, six-trick end-to-end pass (AC6/AC8) lives in
// `WarCouncilRound.duelHealthBars.test.tsx` — carved out for the same reason DLR-71 first split
// that file off this one: keeping the driving-loop apparatus for a full hand beside the fixture
// it exists to drive would push this file back over the 400-line budget.
