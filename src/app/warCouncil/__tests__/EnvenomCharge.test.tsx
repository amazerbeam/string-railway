/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EnvenomCharge from '../EnvenomCharge'
import { ENVENOM_EMPTY_LABEL, envenomAccessibleName } from '../labels'
import { EnvenomStage } from '../roundUiState'

afterEach(cleanup)

describe('EnvenomCharge', () => {
  it('renders disabled with the empty name when no charges are held', () => {
    render(
      <EnvenomCharge charges={0} stage={null} interactive onTap={vi.fn()} onCancel={vi.fn()} />,
    )
    const button = screen.getByRole('button', { name: ENVENOM_EMPTY_LABEL })
    expect(button).toHaveProperty('disabled', true)
  })

  it('carries the held name and aria-pressed false with charges and no stage', () => {
    render(
      <EnvenomCharge charges={1} stage={null} interactive onTap={vi.fn()} onCancel={vi.fn()} />,
    )
    const button = screen.getByRole('button', { name: envenomAccessibleName(null, 1) })
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('gives the "selected" name when poised', () => {
    render(
      <EnvenomCharge
        charges={1}
        stage={EnvenomStage.Poised}
        interactive
        onTap={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: envenomAccessibleName(EnvenomStage.Poised, 1) }),
    ).toBeTruthy()
  })

  it('gives the "armed" name and aria-pressed true when armed', () => {
    render(
      <EnvenomCharge
        charges={1}
        stage={EnvenomStage.Armed}
        interactive
        onTap={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const button = screen.getByRole('button', {
      name: envenomAccessibleName(EnvenomStage.Armed, 1),
    })
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('calls onTap exactly once on click', () => {
    const onTap = vi.fn()
    render(<EnvenomCharge charges={1} stage={null} interactive onTap={onTap} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: envenomAccessibleName(null, 1) }))
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('renders disabled and calls nothing when not interactive', () => {
    const onTap = vi.fn()
    render(
      <EnvenomCharge
        charges={1}
        stage={null}
        interactive={false}
        onTap={onTap}
        onCancel={vi.fn()}
      />,
    )
    const button = screen.getByRole('button', { name: envenomAccessibleName(null, 1) })
    expect(button).toHaveProperty('disabled', true)
    fireEvent.click(button)
    expect(onTap).not.toHaveBeenCalled()
  })

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <EnvenomCharge charges={1} stage={null} interactive onTap={vi.fn()} onCancel={onCancel} />,
    )
    const group = container.querySelector('[role="group"]') as Element
    fireEvent.keyDown(group, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not bubble its click to an enclosing handler (the .wc-table guard)', () => {
    const outerClick = vi.fn()
    const { container } = render(
      <div onClick={outerClick}>
        <EnvenomCharge charges={1} stage={null} interactive onTap={vi.fn()} onCancel={vi.fn()} />
      </div>,
    )
    fireEvent.click(container.querySelector('button') as Element)
    expect(outerClick).not.toHaveBeenCalled()
  })
})
