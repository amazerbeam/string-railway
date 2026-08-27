/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Suit } from '../../../warCouncil'
import { CARD_DAMAGE_ESTIMATE_NOTE } from '../labels'
import HandFan from '../HandFan'
import { card } from './roundFixture'

afterEach(cleanup)

const HAND = [card(Suit.Bells, 7), card(Suit.Keys, 3), card(Suit.Moons, 11)]

const PREVIEW = {
  win: { toQuarry: 6, toPlayer: 0, shielded: 0 },
  lose: { toQuarry: 4, toPlayer: 1, shielded: 0 },
  exact: true,
}

function renderFan(overrides = {}) {
  const onTap = vi.fn()
  const onCancel = vi.fn()
  render(
    <HandFan
      hand={HAND}
      legal={[card(Suit.Moons, 11)]}
      armed={null}
      interactive
      hint="Follow their lead"
      rejected={false}
      promptOpen={false}
      primedCards={[]}
      timebombArmed={false}
      discardSelecting={false}
      discardSelection={[]}
      damageForCard={() => PREVIEW}
      onTap={onTap}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { onTap, onCancel }
}

describe('HandFan', () => {
  it('names every card by rank and suit', () => {
    renderFan()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toBeDefined()
    expect(screen.getByRole('button', { name: '3 of Keys (Fox)' })).toBeDefined()
    // 11 is CardRank.Monarch — one of the five ability-bearing ranks labels.ts
    // already decorates (RANK_NAME keys [1, 3, 5, 9, 11]), so its accessible
    // name carries the parenthetical too, same as the Fox above.
    expect(screen.getByRole('button', { name: '11 of Moons (Monarch)' })).toBeDefined()
  })

  it('disables the cards the engine excluded', () => {
    renderFan()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: '11 of Moons (Monarch)' })).toHaveProperty(
      'disabled',
      false,
    )
  })

  it('reports a tap on a legal card', () => {
    const { onTap } = renderFan()
    screen.getByRole('button', { name: '11 of Moons (Monarch)' }).click()
    expect(onTap).toHaveBeenCalledWith(card(Suit.Moons, 11))
  })

  it('keeps the whole hand to a single tab stop', () => {
    renderFan({ legal: HAND })
    const stops = screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0')
    expect(stops).toHaveLength(1)
  })

  it('cancels the selection on Escape', () => {
    const { onCancel } = renderFan({ armed: card(Suit.Moons, 11) })
    const group = screen.getByRole('group', { name: /hand/i })
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('marks the hint as rejected when a rejection is showing', () => {
    renderFan({ rejected: true, hint: 'You must follow the led suit.' })
    expect(screen.getByText('You must follow the led suit.').className).toContain('wc-is-reject')
  })

  it('marks the hint as live only for an armed card, matching the mockup’s own cascade', () => {
    renderFan({ armed: card(Suit.Moons, 11), hint: 'Tap 11 of Moons (Monarch) again to play it' })
    expect(screen.getByText(/again to play it/).className).toContain('wc-is-live')
  })

  it('does not mark the hint as live for a non-armed hint, e.g. a resolved trick', () => {
    renderFan({ hint: 'Trick resolved' })
    expect(screen.getByText('Trick resolved').className).not.toContain('wc-is-live')
  })

  it('hides the fan from the accessibility tree while a prompt is open', () => {
    renderFan({ promptOpen: true })
    // Testing Library's role queries exclude aria-hidden subtrees by default, so the
    // group itself becomes unreachable by role — the same effect a screen reader gets.
    expect(screen.queryByRole('group', { name: /hand/i })).toBeNull()
    expect(document.querySelector('.wc-fan')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('announces a card in primedCards as primed (DLR-90 AC2)', () => {
    renderFan({ primedCards: [card(Suit.Bells, 7)] })
    expect(screen.getByRole('button', { name: '7 of Bells, primed' })).toBeDefined()
  })

  it('disables an illegal card as today when timebombArmed is false', () => {
    renderFan({ timebombArmed: false })
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', true)
  })

  it('makes every card tappable while timebombArmed, including an illegal one (DLR-90 AC2)', () => {
    const { onTap } = renderFan({ timebombArmed: true })
    const illegal = screen.getByRole('button', { name: '7 of Bells' })
    expect(illegal).toHaveProperty('disabled', false)
    illegal.click()
    expect(onTap).toHaveBeenCalledWith(card(Suit.Bells, 7))
  })

  it('lets the roving tabindex reach an illegal card by arrow key while timebombArmed', () => {
    // Otherwise a keyboard-only player could never reach the very card the item exists to mark.
    // legal=[Moons 11] (the default fixture), so both Bells 7 and Keys 3 are illegal to PLAY —
    // arrow-key movement must still land on them while armed.
    renderFan({ timebombArmed: true })
    const group = screen.getByRole('group', { name: /hand/i })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    const fox = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    expect(fox.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(fox)
  })

  it('makes every card tappable while discardSelecting, including an illegal one (DLR-100)', () => {
    const { onTap } = renderFan({ discardSelecting: true })
    const illegal = screen.getByRole('button', { name: '7 of Bells' })
    expect(illegal).toHaveProperty('disabled', false)
    illegal.click()
    expect(onTap).toHaveBeenCalledWith(card(Suit.Bells, 7))
  })

  it('lets the roving tabindex reach an illegal card by arrow key while discardSelecting', () => {
    renderFan({ discardSelecting: true })
    const group = screen.getByRole('group', { name: /hand/i })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    const fox = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    expect(fox.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(fox)
  })

  it('marks a card present in discardSelection with the discard treatment', () => {
    renderFan({ discardSelecting: true, discardSelection: [card(Suit.Bells, 7)] })
    const marked = screen.getByRole('button', { name: '7 of Bells' })
    expect(marked.className).toContain('wc-is-discard-selected')
    expect(marked.querySelector('.wc-discard-mark')).not.toBeNull()
  })

  // DLR-149's tooltip joins its own rule-text id into `aria-describedby` alongside the fan's
  // damage-strip id (AC8), so `aria-describedby` is now always non-empty and its concatenated
  // text is no longer just the damage strip's own sentence — these assertions check the damage
  // strip's id individually rather than the full accessible description.
  it('describes every card with its own damage strip (DLR-117 AC4)', () => {
    renderFan()
    const button = screen.getByRole('button', { name: '7 of Bells' })
    const describedByIds = button.getAttribute('aria-describedby')?.split(' ') ?? []
    const damageText = describedByIds
      .map((id) => document.getElementById(id)?.textContent)
      .find((text) =>
        text?.includes(
          'If you win this trick: 6 damage to the Quarry. If you lose: 4 damage to the Quarry, 1 damage to you.',
        ),
      )
    expect(damageText).toBeTruthy()
  })

  it('puts the estimate note into the description for an inexact preview', () => {
    renderFan({ damageForCard: () => ({ ...PREVIEW, exact: false }) })
    const button = screen.getByRole('button', { name: '7 of Bells' })
    const describedByIds = button.getAttribute('aria-describedby')?.split(' ') ?? []
    expect(describedByIds.length).toBeGreaterThan(0)
    const estimateText = describedByIds
      .map((id) => document.getElementById(id)?.textContent)
      .find((text) => text?.includes(CARD_DAMAGE_ESTIMATE_NOTE))
    expect(estimateText).toBeTruthy()
  })

  it('renders no damage strip and no damage id in aria-describedby when damageForCard returns null', () => {
    renderFan({ damageForCard: () => null })
    const button = screen.getByRole('button', { name: '7 of Bells' })
    // aria-describedby is still non-empty — DLR-149's rule-text id is always present — but it
    // carries no id resolving to the damage strip's own text.
    const describedByIds = button.getAttribute('aria-describedby')?.split(' ') ?? []
    const damageText = describedByIds
      .map((id) => document.getElementById(id)?.textContent)
      .find((text) => text?.startsWith('If you win this trick'))
    expect(damageText).toBeUndefined()
    expect(document.querySelector('.wc-card-damage')).toBeNull()
  })

  it('still names every card by rank and suit with the damage strip in place', () => {
    renderFan()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toBeDefined()
    expect(screen.getByRole('button', { name: '3 of Keys (Fox)' })).toBeDefined()
    expect(screen.getByRole('button', { name: '11 of Moons (Monarch)' })).toBeDefined()
  })

  it('lets the roving tabindex move focus with the wrapper in place, in the ordinary non-armed case', () => {
    renderFan({ legal: HAND })
    const group = screen.getByRole('group', { name: /hand/i })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    const keys3 = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    expect(keys3.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(keys3)
  })
})
