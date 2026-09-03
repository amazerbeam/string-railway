/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Suit, type AbilityChoice, type Card } from '../../../warCouncil'
import AbilityPrompt from '../AbilityPrompt'
import { MotionAnchorProvider } from '../MotionAnchors'
import { card } from './roundFixture'

afterEach(cleanup)

const FOX = card(Suit.Keys, 3)
const DECREE = card(Suit.Bells, 10)
const HAND = [card(Suit.Bells, 7), card(Suit.Keys, 8), card(Suit.Moons, 5)]

// DLR-157 — `AbilityPrompt` now registers its own row and drawn-slot anchors, which throw
// outside a `MotionAnchorProvider`. Every render in this file goes through this helper for that
// reason alone; nothing about any test's own assertions changed.
function renderPrompt(props: {
  card: Card
  decree: Card
  hand: readonly Card[]
  drawnCard: Card | null
  onChoose: (choice: AbilityChoice) => void
  onCancel: () => void
}) {
  return render(
    <MotionAnchorProvider>
      <AbilityPrompt {...props} />
    </MotionAnchorProvider>,
  )
}

function renderFoxPrompt(overrides = {}) {
  const onChoose = vi.fn()
  const onCancel = vi.fn()
  renderPrompt({
    card: FOX,
    decree: DECREE,
    hand: HAND,
    drawnCard: null,
    onChoose,
    onCancel,
    ...overrides,
  })
  return { onChoose, onCancel }
}

describe('AbilityPrompt', () => {
  it('keeps the whole choice row — every hand card plus decline — to a single tab stop', () => {
    // Confirms the fix for Defender Warning 3: an unwired prompt gave every offered card
    // (up to a dozen against a large hand) its own tab stop.
    renderFoxPrompt()
    const stops = screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0')
    expect(stops).toHaveLength(1)
  })

  it('moves real focus with the arrow keys, ending on "Keep the decree"', () => {
    // This must assert `document.activeElement`, not just the `tabindex` attribute — a
    // regression here previously kept `tabindex` bookkeeping correct while real focus stayed
    // stuck on the group container, an unbreakable keyboard trap the tabindex-only assertion
    // could not see. Confirmed against the pre-fix inline-callback ref: this assertion fails
    // there (`document.activeElement` stays the group `<div>`) and passes against the fix.
    renderFoxPrompt()
    const group = screen.getByRole('group', { name: 'Choose what the card does' })
    // Three hand cards, then the decline button — three ArrowRight presses reach it.
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    const decline = screen.getByRole('button', { name: /keep the decree/i })
    expect(decline.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(decline)
  })

  it('activates the focused choice on click, having reached it by arrow key alone', () => {
    // The second half of the live failure: with focus never actually landing on a card,
    // Enter/Space on the "focused" card did nothing. A native `<button>`'s own Enter/Space
    // activation is the platform's guarantee, not this component's to re-prove (per
    // `engineering-standards.md`'s testing posture) — what this component is responsible for,
    // and what this asserts, is that arrow-key navigation actually parks real focus on the
    // right control so that platform activation has something to act on.
    const { onChoose } = renderFoxPrompt()
    const group = screen.getByRole('group', { name: 'Choose what the card does' })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    const focused = document.activeElement
    expect(focused).toBe(screen.getByRole('button', { name: '8 of Keys' }))
    fireEvent.click(focused as HTMLElement)
    expect(onChoose).toHaveBeenCalledWith({ kind: 'foxExchange', handCard: card(Suit.Keys, 8) })
  })

  it('cancels on Escape', () => {
    const { onCancel } = renderFoxPrompt()
    const group = screen.getByRole('group', { name: 'Choose what the card does' })
    fireEvent.keyDown(group, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })

  it('reports a choice when a card in the row is activated', () => {
    const { onChoose } = renderFoxPrompt()
    fireEvent.click(screen.getByRole('button', { name: '7 of Bells' }))
    expect(onChoose).toHaveBeenCalledWith({ kind: 'foxExchange', handCard: card(Suit.Bells, 7) })
  })

  it('includes the drawn card as its own tab stop for a Woodcutter prompt', () => {
    const drawnCard = card(Suit.Moons, 2)
    const onChoose = vi.fn()
    renderPrompt({
      card: card(Suit.Bells, 5),
      decree: DECREE,
      hand: HAND,
      drawnCard,
      onChoose,
      onCancel: vi.fn(),
    })
    const stops = screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0')
    expect(stops).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '2 of Moons' }))
    expect(onChoose).toHaveBeenCalledWith({ kind: 'woodcutterDiscard', discard: drawnCard })
  })

})
