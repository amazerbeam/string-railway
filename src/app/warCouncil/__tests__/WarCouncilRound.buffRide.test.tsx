/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BuffTier, mintFromTemplate, templateById } from '../../../hunt'
import { Suit } from '../../../warCouncil'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import { BreakdownTopContext } from '../breakdownRectContext'
import PlayingCard from '../PlayingCard'
import WarCouncilRound from '../WarCouncilRound'
import {
  baseDamageBonusFixture,
  coinsFixture,
  discardsRemainingFixture,
  encounterFixture,
  huntFixture,
  makeRound,
  maxHealthFixture,
  blastGuardHeldFixture,
  quarryLabelFixture,
  runLabelFixture,
} from './roundFixture'

afterEach(cleanup)

const bellsTaker = mintFromTemplate(templateById('taker:bells:magnitude')!, BuffTier.Bronze, 1)

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
      blastGuardHeld={overrides.blastGuardHeld ?? blastGuardHeldFixture}
      baseDamageBonus={overrides.baseDamageBonus ?? baseDamageBonusFixture}
      discardsRemaining={overrides.discardsRemaining ?? discardsRemainingFixture}
      buffs={overrides.buffs ?? [bellsTaker]}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

function openLoadout() {
  fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
}

function activateBellsTaker() {
  openLoadout()
  const button = screen.getByRole('button', { name: /Taker/i })
  fireEvent.click(button)
  fireEvent.click(button)
}

describe('WarCouncilRound — buff ride wiring (DLR-153 Task 15)', () => {
  it('activates with no card-selection step and no refusal about choosing a card (AC1)', () => {
    renderRound()
    activateBellsTaker()
    expect(screen.queryByText(/choose a card/i)).toBeNull()
  })

  it('lights exactly the legal cards of the activated suit with a badge (AC2)', () => {
    renderRound()
    activateBellsTaker()
    // Close the gallery so the hand fan (which carries the badges) is on screen again.
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    expect(screen.getByRole('button', { name: /2 of Bells$/ }).textContent).toMatch(/1/)
    expect(screen.getByRole('button', { name: /7 of Bells$/ }).textContent).toMatch(/1/)
  })

  // DLR-153 hand-gate fix — the invariant the original defect broke: `ridingRowsFor`'s reach
  // figure and the number of cards that actually render a badge must agree, in EVERY phase,
  // including right here — between tricks, activation just closed the gallery, and it is NOT
  // the player's move (`canAct` is false). The riding list previously reported "lights up 2 of
  // your cards" while `document.querySelectorAll('.wc-card-buff-badge')` returned zero, because
  // the badge was gated on `interactive` rather than on rules-legality alone.
  it('renders exactly as many badges as the riding list reports reaching, between tricks (hand-gate fix)', () => {
    renderRound()
    activateBellsTaker()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    expect(screen.getByText(/lights up 2 of your cards/i)).toBeTruthy()
    const hand = screen.getByRole('group', { name: 'Your hand' })
    expect(hand.querySelectorAll('.wc-card-buff-badge')).toHaveLength(2)
  })

  it('clears the removal announcement on the next dispatch even when it is neither a hand tap nor a cancel (Fix 4)', () => {
    renderRound()
    activateBellsTaker()
    const removeButton = screen.getByRole('button', { name: /off the trick/i })
    fireEvent.click(removeButton)
    expect(screen.getByText(/taken off the trick/i)).toBeTruthy()

    // ToggleLoadout — not TapCard, not CancelSelection — is exactly the dispatch the review
    // finding named: opening the loadout again used to leave the removal's confirmation stranded
    // in the hand's aria-live hint region indefinitely.
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    expect(screen.queryByText(/taken off the trick/i)).toBeNull()
  })

  it('anchors the hand+riding+breakdown zone with a real positioned class (Fix 2a)', () => {
    renderRound()
    const hand = screen.getByRole('group', { name: 'Your hand' })
    expect(hand.parentElement?.className).toContain('wc-buff-ride-zone')
  })

  it('shows the riding list with the reach sentence immediately, and the breakdown only on hovering a lit card (AC9/AC13, Phase 8 Correction 1)', () => {
    renderRound()
    activateBellsTaker()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    expect(screen.getByRole('group', { name: 'Riding this trick' })).toBeTruthy()
    expect(screen.getByText(/lights up 2 of your cards/i)).toBeTruthy()
    // Hover-only default (AC13 reversed): the breakdown is absent until a lit card is entered.
    expect(screen.queryByRole('group', { name: 'What this card is worth' })).toBeNull()

    const lit = screen.getByRole('button', { name: /2 of Bells$/ })
    fireEvent.pointerEnter(lit.closest('.wc-fan-slot')!, { pointerType: 'mouse' })
    expect(screen.getByRole('group', { name: 'What this card is worth' })).toBeTruthy()
  })

  it('removing a buff returns the card to the gallery, clears every badge, and announces what went dark (AC10)', () => {
    renderRound()
    activateBellsTaker()
    const removeButton = screen.getByRole('button', { name: /off the trick/i })
    fireEvent.click(removeButton)
    expect(screen.queryByRole('group', { name: 'Riding this trick' })).toBeNull()
    // HandFan renders unconditionally (outside `.wc-table`, Assumption 6) — no need to close the
    // gallery to see its badges clear, and doing so would itself be a dispatch (`ToggleLoadout`)
    // that Fix 4 deliberately clears the removal announcement on, which is asserted separately.
    const hand = screen.getByRole('group', { name: 'Your hand' })
    expect(within(hand).queryAllByText(/could fire on this card/i)).toHaveLength(0)
    expect(screen.getByText(/taken off the trick/i)).toBeTruthy()
  })

  it('the breakdown, once opened by hover, survives a mouseLeave fired on the hand group itself (AC13)', () => {
    renderRound()
    activateBellsTaker()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    const lit = screen.getByRole('button', { name: /2 of Bells$/ })
    fireEvent.pointerEnter(lit.closest('.wc-fan-slot')!, { pointerType: 'mouse' })
    expect(screen.getByRole('group', { name: 'What this card is worth' })).toBeTruthy()
    // `mouseLeave` fired on the GROUP itself (not the per-card `.wc-fan-slot` the leave handler
    // is actually wired to) is a no-op — this pins that the panel does not close on it.
    const hand = screen.getByRole('group', { name: 'Your hand' })
    fireEvent.mouseLeave(hand)
    expect(screen.getByRole('group', { name: 'What this card is worth' })).toBeTruthy()
  })

  // Regression for the Fix 1 review finding: `onEnterCard` was exported by the hook and tested
  // in isolation, but no production card ever called it — `WarCouncilRound.tsx` wired
  // `onLeaveCard`/`onEnterPanel`/`onLeavePanel` but never `onEnterCard`, so the panel permanently
  // showed `bestLitCard` and never switched under the pointer.
  it('switches the breakdown to a second, differently-lit legal card on hover (AC13/AC14)', () => {
    renderRound()
    activateBellsTaker()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    // Hover-only default (Phase 8 Correction 1): opens on the FIRST card entered, `2 of Bells`.
    const first = screen.getByRole('button', { name: /2 of Bells$/ })
    fireEvent.pointerEnter(first.closest('.wc-fan-slot')!, { pointerType: 'mouse' })
    expect(
      within(screen.getByRole('group', { name: 'What this card is worth' })).getByText(
        '2 of Bells',
      ),
    ).toBeTruthy()

    const other = screen.getByRole('button', { name: /7 of Bells$/ })
    fireEvent.pointerEnter(other.closest('.wc-fan-slot')!, { pointerType: 'mouse' })

    expect(
      within(screen.getByRole('group', { name: 'What this card is worth' })).getByText(
        '7 of Bells',
      ),
    ).toBeTruthy()
  })

  it('holds the hover bridge across the gap from a card into the panel (AC14)', () => {
    vi.useFakeTimers()
    try {
      renderRound()
      activateBellsTaker()
      fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))

      const other = screen.getByRole('button', { name: /7 of Bells$/ })
      fireEvent.pointerEnter(other.closest('.wc-fan-slot')!, { pointerType: 'mouse' })
      expect(
        within(screen.getByRole('group', { name: 'What this card is worth' })).getByText(
          '7 of Bells',
        ),
      ).toBeTruthy()

      fireEvent.pointerLeave(other.closest('.wc-fan-slot')!, { pointerType: 'mouse' })
      const panel = screen.getByRole('group', { name: 'What this card is worth' })
      fireEvent.mouseEnter(panel)
      vi.advanceTimersByTime(1000)

      // The panel is still showing the card that was hovered, NOT reverted to the default target,
      // because entering the panel cancelled the scheduled close.
      expect(
        within(screen.getByRole('group', { name: 'What this card is worth' })).getByText(
          '7 of Bells',
        ),
      ).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})

// DLR-160 AC4 — the tooltip stops covering the breakdown panel it is describing. jsdom has no
// layout engine, so `useBuffBreakdownAnchor`'s real measurement (through `.wc-buff-ride-zone`'s
// `offsetParent`) cannot be exercised end to end here — the round-level tests above cover that the
// context is wired at all (`buffRide.breakdownTop` reaches `BreakdownTopContext.Provider`). This
// pins `CardAbilityTip`'s own contract directly, the same way `CardAbilityTip.test.tsx` pins its
// other placement rules: given a published top, the bubble anchors to whichever of the card and
// the panel is higher.
describe('CardAbilityTip anchors above the breakdown panel when one is open (DLR-160 AC4)', () => {
  const card = { suit: Suit.Bells, rank: 5 } as const

  function openTooltip(breakdownTop: number | null, cardTop: number) {
    render(
      <BreakdownTopContext.Provider value={breakdownTop}>
        <PlayingCard card={card} variant="hand" />
      </BreakdownTopContext.Provider>,
    )
    const button = screen.getByRole('button', { name: /5 of Bells/i })
    button.getBoundingClientRect = () => new DOMRect(100, cardTop, 60, 90)
    const host = button.closest('.wc-card-tip-host')
    if (host === null) throw new Error('host span not found')
    fireEvent.pointerEnter(host, { pointerType: 'mouse' })
    return screen.getByRole('tooltip') as HTMLElement
  }

  it('anchors to the card itself when no breakdown is published', () => {
    const tooltip = openTooltip(null, 400)
    expect(tooltip.style.getPropertyValue('--wc-tip-anchor-y')).toBe('400px')
  })

  it('anchors to the breakdown panel when its published top is higher (a smaller number) than the card', () => {
    const tooltip = openTooltip(150, 400)
    expect(tooltip.style.getPropertyValue('--wc-tip-anchor-y')).toBe('150px')
  })

  it('anchors to the card when the published breakdown top is lower (further down) than the card', () => {
    const tooltip = openTooltip(500, 400)
    expect(tooltip.style.getPropertyValue('--wc-tip-anchor-y')).toBe('400px')
  })
})
