/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHEAT_SLOT_COUNT } from '../../../hunt'
import CheatSlots from '../CheatSlots'
import { CHEAT_EMPTY_SLOT_LABEL, CHEAT_RAIL_LABEL, cheatAccessibleName } from '../labels'
import { CheatStage } from '../roundUiState'

afterEach(cleanup)

const noop = () => {}

describe('CheatSlots', () => {
  it('shows exactly two slots whether they are filled or empty (AC1)', () => {
    render(<CheatSlots cheats={[]} selection={null} interactive onTap={noop} onCancel={noop} />)
    expect(screen.getAllByLabelText(CHEAT_EMPTY_SLOT_LABEL)).toHaveLength(CHEAT_SLOT_COUNT)
  })

  it('fills slots from the head and leaves the rest empty', () => {
    render(
      <CheatSlots cheats={[{ id: 1 }]} selection={null} interactive onTap={noop} onCancel={noop} />,
    )
    expect(screen.getByRole('button', { name: cheatAccessibleName(null) })).toBeTruthy()
    expect(screen.getAllByLabelText(CHEAT_EMPTY_SLOT_LABEL)).toHaveLength(CHEAT_SLOT_COUNT - 1)
  })

  it('reports a tap with the card id it belongs to', () => {
    const onTap = vi.fn()
    render(
      <CheatSlots
        cheats={[{ id: 7 }]}
        selection={null}
        interactive
        onTap={onTap}
        onCancel={noop}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: cheatAccessibleName(null) }))
    expect(onTap).toHaveBeenCalledWith(7)
  })

  it('names and presses the armed slot distinctly (AC5)', () => {
    render(
      <CheatSlots
        cheats={[{ id: 1 }]}
        selection={{ id: 1, stage: CheatStage.Armed }}
        interactive
        onTap={noop}
        onCancel={noop}
      />,
    )
    const slot = screen.getByRole('button', { name: cheatAccessibleName(CheatStage.Armed) })
    expect(slot.getAttribute('aria-pressed')).toBe('true')
  })

  it('cancels on Escape (AC6)', () => {
    const onCancel = vi.fn()
    render(
      <CheatSlots
        cheats={[{ id: 1 }]}
        selection={{ id: 1, stage: CheatStage.Armed }}
        interactive
        onTap={noop}
        onCancel={onCancel}
      />,
    )
    fireEvent.keyDown(screen.getByRole('group', { name: CHEAT_RAIL_LABEL }), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })

  it('disables its slots when the felt is not interactive', () => {
    render(
      <CheatSlots
        cheats={[{ id: 1 }]}
        selection={null}
        interactive={false}
        onTap={noop}
        onCancel={noop}
      />,
    )
    expect(screen.getByRole('button', { name: cheatAccessibleName(null) })).toHaveProperty(
      'disabled',
      true,
    )
  })
})
