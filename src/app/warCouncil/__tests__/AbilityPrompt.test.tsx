/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AbilityChoiceKind, Suit, type AbilityChoice, type Card } from '../../../warCouncil'
import AbilityPrompt from '../AbilityPrompt'
import { MotionAnchorProvider } from '../MotionAnchors'
import { card } from './roundFixture'

afterEach(cleanup)

const FOX = card(Suit.Keys, 3)
const GROUP_NAME = 'Name the new trump suit'

// DLR-157 — `AbilityPrompt` registers its own row anchor, which throws outside a
// `MotionAnchorProvider`. Every render in this file goes through this helper for that reason.
function renderPrompt(props: {
  card: Card
  trumpSuit: Suit
  onChoose: (choice: AbilityChoice) => void
  onCancel: () => void
}) {
  return render(
    <MotionAnchorProvider>
      <AbilityPrompt {...props} />
    </MotionAnchorProvider>,
  )
}

function renderFoxPrompt(overrides: { trumpSuit?: Suit } = {}) {
  const onChoose = vi.fn()
  const onCancel = vi.fn()
  renderPrompt({
    card: FOX,
    trumpSuit: Suit.Bells,
    onChoose,
    onCancel,
    ...overrides,
  })
  return { onChoose, onCancel }
}

describe('AbilityPrompt (DLR-163 — the 3 names a suit)', () => {
  it('AC1 — offers the three suits plus a decline, and nothing from hand', () => {
    renderFoxPrompt()
    const group = screen.getByRole('group', { name: GROUP_NAME })
    expect(screen.getByRole('button', { name: /bells/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /keys/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /moons/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /leave it as it is/i })).toBeDefined()
    // Three suits, the decline, and the back-out exit — and no hand card among them.
    expect(group.querySelectorAll('button')).toHaveLength(5)
  })

  it('keeps the whole choice row to a single tab stop', () => {
    // Confirms the fix for Defender Warning 3: an unwired prompt gave every offered control its
    // own tab stop.
    renderFoxPrompt()
    const stops = screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0')
    expect(stops).toHaveLength(1)
  })

  it('moves real focus with the arrow keys, ending on the decline button', () => {
    // This must assert `document.activeElement`, not just the `tabindex` attribute — a
    // regression here previously kept `tabindex` bookkeeping correct while real focus stayed
    // stuck on the group container, an unbreakable keyboard trap the tabindex-only assertion
    // could not see.
    renderFoxPrompt()
    const group = screen.getByRole('group', { name: GROUP_NAME })
    // Three suits, then the decline button — three ArrowRight presses reach it.
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    const decline = screen.getByRole('button', { name: /leave it as it is/i })
    expect(decline.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(decline)
  })

  it('AC1 — activates the focused suit, having reached it by arrow key alone', () => {
    const { onChoose } = renderFoxPrompt()
    const group = screen.getByRole('group', { name: GROUP_NAME })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    const focused = document.activeElement
    expect(focused).toBe(screen.getByRole('button', { name: /keys/i }))
    fireEvent.click(focused as HTMLElement)
    expect(onChoose).toHaveBeenCalledWith({
      kind: AbilityChoiceKind.NameTrump,
      suit: Suit.Keys,
    })
  })

  it('cancels on Escape', () => {
    const { onCancel } = renderFoxPrompt()
    const group = screen.getByRole('group', { name: GROUP_NAME })
    fireEvent.keyDown(group, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })

  it('AC1 — declining reports DeclineTrump', () => {
    const { onChoose } = renderFoxPrompt()
    fireEvent.click(screen.getByRole('button', { name: /leave it as it is/i }))
    expect(onChoose).toHaveBeenCalledWith({ kind: AbilityChoiceKind.DeclineTrump })
  })

  it('AC1 — the suit already in force says so, in words rather than by colour alone', () => {
    renderFoxPrompt({ trumpSuit: Suit.Moons })
    const inForce = screen.getByRole('button', { name: /moons.*already trump/i })
    expect(inForce.getAttribute('data-inforce')).toBe('true')
    // It is still OFFERED — hiding it would change the control count between hands, and
    // `applyNameTrump` is what makes naming it identical to declining.
    fireEvent.click(inForce)
  })
})
