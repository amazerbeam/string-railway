/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DiscardRefusal } from '../../../warCouncil'
import DiscardPlate from '../DiscardPlate'
import { DISCARD_REFUSAL_MESSAGE } from '../labels'

afterEach(cleanup)

const plate = () => screen.getByRole('button', { name: /discard/i })

function renderPlate(over: Partial<Parameters<typeof DiscardPlate>[0]> = {}) {
  const onTap = vi.fn()
  const onCancel = vi.fn()
  render(
    <DiscardPlate
      discardsRemaining={3}
      selecting={false}
      selectionSize={0}
      refusal={null}
      onTap={onTap}
      onCancel={onCancel}
      {...over}
    />,
  )
  return { onTap, onCancel }
}

describe('DiscardPlate', () => {
  it('is live and tappable while nothing refuses it, naming the count', () => {
    const { onTap } = renderPlate()
    const el = plate() as HTMLButtonElement
    expect(el.disabled).toBe(false)
    expect(el.getAttribute('aria-label')).toContain('3')
    fireEvent.click(el)
    expect(onTap).toHaveBeenCalledOnce()
  })

  it('AC9 — a refusal disables the control AND states the reason on its face', () => {
    renderPlate({ refusal: DiscardRefusal.NoDiscardsRemaining, discardsRemaining: 0 })
    expect((plate() as HTMLButtonElement).disabled).toBe(true)
    expect(
      screen.getByText(DISCARD_REFUSAL_MESSAGE[DiscardRefusal.NoDiscardsRemaining]),
    ).toBeTruthy()
  })

  it('a not-focusable disabled control still reads its reason as visible text, never only an attribute', () => {
    renderPlate({ refusal: DiscardRefusal.EmptySelection, selecting: true })
    const el = plate() as HTMLButtonElement
    expect(el.disabled).toBe(true)
    const refusalText = screen.getByText(DISCARD_REFUSAL_MESSAGE[DiscardRefusal.EmptySelection])
    expect(refusalText.tagName).toBe('P')
  })

  it('marks the selecting state to assistive tech as well as in the class', () => {
    renderPlate({ selecting: true, selectionSize: 0 })
    expect(plate().getAttribute('aria-pressed')).toBe('true')
    expect(plate().className).toContain('is-selecting')
  })

  it('Escape cancels a selection from the keyboard', () => {
    const { onCancel } = renderPlate({ selecting: true })
    fireEvent.keyDown(screen.getByRole('group', { name: /discard/i }), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  // Load-bearing: this mounts inside `.wc-table`, whose own onClick commits the Quarry's lead
  // whenever the felt is waiting. Without the stop, opening the selection would clear a held
  // reveal too.
  it('does not let its click reach the felt behind it', () => {
    const onFelt = vi.fn()
    render(
      <div onClick={onFelt}>
        <DiscardPlate
          discardsRemaining={3}
          selecting={false}
          selectionSize={0}
          refusal={null}
          onTap={vi.fn()}
          onCancel={vi.fn()}
        />
      </div>,
    )
    fireEvent.click(screen.getAllByRole('button', { name: /discard/i })[0])
    expect(onFelt).not.toHaveBeenCalled()
  })

  it('the accessible name differs across all four readings, so getByRole can tell them apart', () => {
    renderPlate({ discardsRemaining: 3, selecting: false })
    const held = plate().getAttribute('aria-label')
    cleanup()

    renderPlate({ selecting: true, selectionSize: 0 })
    const selecting = plate().getAttribute('aria-label')
    cleanup()

    renderPlate({ selecting: true, selectionSize: 2 })
    const ready = plate().getAttribute('aria-label')
    cleanup()

    renderPlate({ refusal: DiscardRefusal.NoDiscardsRemaining })
    const refused = plate().getAttribute('aria-label')
    cleanup()

    const names = [held, selecting, ready, refused]
    expect(new Set(names).size).toBe(names.length)
  })
})
