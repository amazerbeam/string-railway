/** @vitest-environment jsdom */
import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Suit } from '../../../warCouncil'
import { RANK_RULE_TEXT } from '../cardRuleText'
import PlayingCard from '../PlayingCard'

afterEach(cleanup)

const CARD = { suit: Suit.Bells, rank: 5 } as const

describe('CardAbilityTip', () => {
  it('opens the bubble on a tap and closes it on a second tap', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    const button = screen.getByRole('button', { name: /5 of Bells/i })

    expect(screen.queryByRole('tooltip')).toBeNull()

    fireEvent.click(button)
    expect(screen.getByRole('tooltip')).toBeTruthy()

    fireEvent.click(button)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('closes on Escape', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    fireEvent.click(screen.getByRole('button', { name: /5 of Bells/i }))
    expect(screen.getByRole('tooltip')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('closes on a pointerdown outside the card', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    fireEvent.click(screen.getByRole('button', { name: /5 of Bells/i }))
    expect(screen.getByRole('tooltip')).toBeTruthy()

    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('puts the rule text in the accessible tree before any interaction', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    const button = screen.getByRole('button', { name: /5 of Bells/i })
    expect(screen.queryByRole('tooltip')).toBeNull()

    const describedByIds = button.getAttribute('aria-describedby')?.split(' ') ?? []
    expect(describedByIds.length).toBeGreaterThan(0)

    const ruleNode = describedByIds
      .map((id) => document.getElementById(id))
      .find((node) => node?.textContent === RANK_RULE_TEXT[CARD.rank])
    expect(ruleNode).toBeTruthy()
  })

  it('mounts exactly one bubble under StrictMode', () => {
    render(
      <StrictMode>
        <PlayingCard card={CARD} variant="hand" />
      </StrictMode>,
    )
    fireEvent.click(screen.getByRole('button', { name: /5 of Bells/i }))
    expect(screen.getAllByRole('tooltip')).toHaveLength(1)
  })

  it('releases the document and window listeners on unmount while the tooltip is open', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const addWindowSpy = vi.spyOn(window, 'addEventListener')
    const removeWindowSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = render(<PlayingCard card={CARD} variant="hand" />)
    fireEvent.click(screen.getByRole('button', { name: /5 of Bells/i }))
    expect(screen.getByRole('tooltip')).toBeTruthy()

    const addedKinds = addSpy.mock.calls.map((call) => call[0])
    expect(addedKinds).toContain('pointerdown')
    expect(addedKinds).toContain('keydown')
    // D-I2 (defender fix-loop) — `useCardTip` also registers `resize` (on `window`, closing
    // rather than re-measuring); the source already released it correctly, this test just
    // didn't check it.
    const addedWindowKinds = addWindowSpy.mock.calls.map((call) => call[0])
    expect(addedWindowKinds).toContain('resize')

    unmount()

    const removedKinds = removeSpy.mock.calls.map((call) => call[0])
    expect(removedKinds).toContain('pointerdown')
    expect(removedKinds).toContain('keydown')
    const removedWindowKinds = removeWindowSpy.mock.calls.map((call) => call[0])
    expect(removedWindowKinds).toContain('resize')

    addSpy.mockRestore()
    removeSpy.mockRestore()
    addWindowSpy.mockRestore()
    removeWindowSpy.mockRestore()
  })

  // Ruling (defender fix-loop) — Code-Evaluator flagged that a tap on an enabled hand card both
  // arms it AND opens its tooltip as a correctness bug. `plan.md`'s "Assumptions made" and
  // "Risks" sections show this was explicitly designed and accepted, so it stays. What was
  // missing is coverage: every other case here renders `PlayingCard` with no `onTap`, the one
  // prop shape under which the dual effect is invisible. This pins the documented behaviour so a
  // future change to it is loud rather than silent.
  it('arms the card AND opens its tooltip on the same tap, with a real onTap handler wired', () => {
    const onTap = vi.fn()
    render(<PlayingCard card={CARD} variant="hand" onTap={onTap} />)
    const button = screen.getByRole('button', { name: /5 of Bells/i })

    fireEvent.click(button)

    expect(onTap).toHaveBeenCalledTimes(1)
    expect(onTap).toHaveBeenCalledWith(CARD)
    expect(screen.getByRole('tooltip')).toBeTruthy()
  })

  // DLR-149 round-3 fix — the bubble used to exist in the DOM only while tapped-open, so hover
  // and focus revealed nothing: there was no element for a `:hover`/`:focus-within` rule to
  // match. These three cases pin that a real mouse hover, a focus, and a disabled card's hover
  // all now open the bubble, and that the open state lands as a class ON THE BUBBLE ITSELF
  // rather than on an ancestor — the only thing a portalled node's CSS can actually key off.
  it('opens the bubble on a real-mouse hover and closes it on pointer leave', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    const host = screen.getByRole('button', { name: /5 of Bells/i }).closest('.wc-card-tip-host')
    if (host === null) throw new Error('host span not found')

    expect(screen.queryByRole('tooltip')).toBeNull()

    fireEvent.pointerEnter(host, { pointerType: 'mouse' })
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('wc-is-open')

    fireEvent.pointerLeave(host, { pointerType: 'mouse' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('does not open on a touch pointer enter', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    const host = screen.getByRole('button', { name: /5 of Bells/i }).closest('.wc-card-tip-host')
    if (host === null) throw new Error('host span not found')

    fireEvent.pointerEnter(host, { pointerType: 'touch' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('opens the bubble on focus and closes it on blur', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    const button = screen.getByRole('button', { name: /5 of Bells/i })

    fireEvent.focus(button)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('wc-is-open')

    fireEvent.blur(button)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('opens on hover for a disabled (illegal) hand card, where the button itself has pointer-events: none', () => {
    render(<PlayingCard card={CARD} variant="hand" illegal />)
    const button = screen.getByRole('button', { name: /5 of Bells/i })
    expect(button.hasAttribute('disabled')).toBe(true)

    const host = button.closest('.wc-card-tip-host')
    if (host === null) throw new Error('host span not found')

    fireEvent.pointerEnter(host, { pointerType: 'mouse' })
    expect(screen.getByRole('tooltip')).toBeTruthy()
  })
  // DLR-149 follow-up — the bubble used to be anchored to the host `<span>`, which carries no
  // transform, so it stayed at the card's RESTING position while the card lifted out from under
  // it (hover -9%, press -5%, armed -20% plus scale). These two pin that the card element itself
  // is what gets measured, and that a lift which animates is picked up when it settles.
  //
  // DLR-160 AC4 — `top` moved to the `--wc-tip-anchor-y` custom property (mirroring
  // `--wc-tip-anchor-x`'s existing pattern) so `warCouncilCardTip.css`'s vertical floor can
  // actually apply; an inline `top` would out-rank a CSS floor with no `!important`. These two
  // cases now read the custom property instead of `style.top`.
  it('anchors the bubble to the card, not to the untransformed host wrapper', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    const button = screen.getByRole('button', { name: /5 of Bells/i })
    const host = button.closest('.wc-card-tip-host')
    if (host === null) throw new Error('host span not found')

    host.getBoundingClientRect = () => new DOMRect(100, 500, 60, 90)
    button.getBoundingClientRect = () => new DOMRect(100, 462, 60, 90)

    fireEvent.pointerEnter(host, { pointerType: 'mouse' })

    const tooltip = screen.getByRole('tooltip')
    expect((tooltip as HTMLElement).style.getPropertyValue('--wc-tip-anchor-y')).toBe('462px')
  })

  it("re-measures on the card's transitionend, so the bubble follows a lift that animates", () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    const button = screen.getByRole('button', { name: /5 of Bells/i })
    const host = button.closest('.wc-card-tip-host')
    if (host === null) throw new Error('host span not found')

    // Measured at pointer-enter, before the 130ms lift transition has run.
    button.getBoundingClientRect = () => new DOMRect(100, 500, 60, 90)
    fireEvent.pointerEnter(host, { pointerType: 'mouse' })
    expect(
      (screen.getByRole('tooltip') as HTMLElement).style.getPropertyValue('--wc-tip-anchor-y'),
    ).toBe('500px')

    // The card settles into its lifted position and says so.
    button.getBoundingClientRect = () => new DOMRect(100, 492, 60, 90)
    fireEvent.transitionEnd(button)
    expect(
      (screen.getByRole('tooltip') as HTMLElement).style.getPropertyValue('--wc-tip-anchor-y'),
    ).toBe('492px')
  })
  // DLR-149 follow-up — a tap both arms the card and opens its tooltip (deliberate, pinned
  // above). Nothing dropped that tap channel until the next pointerdown, so the armed card's
  // bubble stayed up while the player hovered a different card: two bubbles on screen, and the
  // stale one is the one that got read. A pointer moving anywhere outside the host now yields it.
  it('drops a tapped-open bubble when the mouse moves onto something else', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    fireEvent.click(screen.getByRole('button', { name: /5 of Bells/i }))
    expect(screen.getByRole('tooltip')).toBeTruthy()

    fireEvent.pointerOver(document.body, { pointerType: 'mouse' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  // A tap focuses the button as well as opening the bubble, so the focus channel has to yield
  // too — otherwise the armed card's bubble survives every mouse move and is exactly the stale
  // second bubble this exists to remove.
  it('drops a focus-opened bubble when the mouse moves onto something else', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    fireEvent.focus(screen.getByRole('button', { name: /5 of Bells/i }))
    expect(screen.getByRole('tooltip')).toBeTruthy()

    fireEvent.pointerOver(document.body, { pointerType: 'mouse' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('leaves a focus-opened bubble up when a non-mouse pointer moves elsewhere', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    fireEvent.focus(screen.getByRole('button', { name: /5 of Bells/i }))

    fireEvent.pointerOver(document.body, { pointerType: 'touch' })
    expect(screen.getByRole('tooltip')).toBeTruthy()
  })

  it('leaves the bubble up while the mouse moves within the card', () => {
    render(<PlayingCard card={CARD} variant="hand" />)
    const button = screen.getByRole('button', { name: /5 of Bells/i })
    fireEvent.click(button)

    fireEvent.pointerOver(button, { pointerType: 'mouse' })
    expect(screen.getByRole('tooltip')).toBeTruthy()
  })
})
