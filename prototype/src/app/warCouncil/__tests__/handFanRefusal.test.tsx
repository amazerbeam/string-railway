/** @vitest-environment jsdom */
/**
 * DLR-174 AC9 — an illegal hand card stops being a `disabled` button: it must be clickable (so
 * it can refuse and shake) and focusable (so the keyboard can reach it), and only a `disabled`
 * fan (the whole fan non-interactive) skips a card in the roving tabindex.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Suit } from '../../../warCouncil'
import HandFan from '../HandFan'
import { MotionAnchorProvider } from '../MotionAnchors'
import { card } from './roundFixture'

afterEach(cleanup)

const HAND = [card(Suit.Bells, 7), card(Suit.Keys, 3), card(Suit.Moons, 11)]

function renderFan(overrides = {}) {
  const onTap = vi.fn()
  const onCancel = vi.fn()
  render(
    <MotionAnchorProvider>
      <HandFan
        hand={HAND}
        // Only Moons 11 is a legal play — Bells 7 and Keys 3 are illegal.
        legal={[card(Suit.Moons, 11)]}
        armed={null}
        interactive
        hint="Follow their lead"
        rejected={false}
        promptOpen={false}
        discardSelecting={false}
        discardSelection={[]}
        skulledCards={[]}
        curseArmed={false}
        damageForCard={() => null}
        buffLightForCard={() => null}
        onCardEnter={() => {}}
        onCardLeave={() => {}}
        onTap={onTap}
        onCancel={onCancel}
        {...overrides}
      />
    </MotionAnchorProvider>,
  )
  return { onTap, onCancel }
}

describe('an illegal hand card, enabled but refusing (DLR-174 AC9)', () => {
  it('renders as an enabled button', () => {
    renderFan()
    const illegal = screen.getByRole('button', { name: '7 of Bells' })
    expect(illegal).toHaveProperty('disabled', false)
  })

  it('can receive focus via the fan’s arrow keys', () => {
    renderFan()
    const group = screen.getByRole('group', { name: /hand/i })
    // Bells 7 (index 0, illegal) is the initial tab stop now that every card is focusable —
    // arrow right and back left round-trips onto it, proving the roving tabindex actually
    // reaches it rather than skipping it as a dead stop.
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    const bells = screen.getByRole('button', { name: '7 of Bells' })
    expect(bells.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(bells)
  })

  it('calls onTap when clicked', () => {
    const { onTap } = renderFan()
    screen.getByRole('button', { name: '7 of Bells' }).click()
    expect(onTap).toHaveBeenCalledWith(card(Suit.Bells, 7))
  })

  it('stays disabled once the fan itself is non-interactive', () => {
    renderFan({ interactive: false })
    const illegal = screen.getByRole('button', { name: '7 of Bells' })
    expect(illegal).toHaveProperty('disabled', true)
    const legal = screen.getByRole('button', { name: '11 of Moons (Monarch)' })
    expect(legal).toHaveProperty('disabled', true)
  })
})
