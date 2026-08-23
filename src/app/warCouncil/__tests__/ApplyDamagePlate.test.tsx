/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApplyDamageRefusal } from '../../../warCouncil'
import ApplyDamagePlate from '../ApplyDamagePlate'
import { APPLY_DAMAGE_REFUSAL_MESSAGE } from '../labels'

afterEach(cleanup)

const plate = () => screen.getByRole('button', { name: /apply damage/i })

function renderPlate(over: Partial<Parameters<typeof ApplyDamagePlate>[0]> = {}) {
  const onTap = vi.fn()
  const onCancel = vi.fn()
  render(
    <ApplyDamagePlate
      cashValue={9}
      poised={false}
      refusal={null}
      onTap={onTap}
      onCancel={onCancel}
      {...over}
    />,
  )
  return { onTap, onCancel }
}

describe('ApplyDamagePlate', () => {
  it('is live and tappable while nothing refuses it', () => {
    const { onTap } = renderPlate()
    expect((plate() as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(plate())
    expect(onTap).toHaveBeenCalledOnce()
  })

  it('AC1 — a refusal disables the control AND states the reason on its face', () => {
    renderPlate({ refusal: ApplyDamageRefusal.EmptyBank, cashValue: 0 })
    expect((plate() as HTMLButtonElement).disabled).toBe(true)
    expect(
      screen.getByText(APPLY_DAMAGE_REFUSAL_MESSAGE[ApplyDamageRefusal.EmptyBank]),
    ).toBeTruthy()
  })

  it('D6 — states the pending-Timebomb reason rather than going quiet', () => {
    renderPlate({ refusal: ApplyDamageRefusal.TimebombPending })
    expect(
      screen.getByText(APPLY_DAMAGE_REFUSAL_MESSAGE[ApplyDamageRefusal.TimebombPending]),
    ).toBeTruthy()
  })

  it('marks the poised state to assistive tech as well as in the class', () => {
    renderPlate({ poised: true })
    expect(plate().getAttribute('aria-pressed')).toBe('true')
    expect(plate().className).toContain('is-poised')
  })

  it('never reads as poised while refused', () => {
    renderPlate({ poised: true, refusal: ApplyDamageRefusal.NotYourMove })
    expect(plate().getAttribute('aria-pressed')).toBe('false')
    expect(plate().className).not.toContain('is-poised')
  })

  it('Escape cancels a poise from the keyboard', () => {
    const { onCancel } = renderPlate({ poised: true })
    fireEvent.keyDown(screen.getByRole('group', { name: /apply/i }), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  // Load-bearing: this mounts inside `.wc-table`, whose own onClick commits the Quarry's lead
  // whenever the felt is waiting. Without the stop, poising would clear a held reveal too.
  it('does not let its click reach the felt behind it', () => {
    const onFelt = vi.fn()
    render(
      <div onClick={onFelt}>
        <ApplyDamagePlate
          cashValue={9}
          poised={false}
          refusal={null}
          onTap={vi.fn()}
          onCancel={vi.fn()}
        />
      </div>,
    )
    fireEvent.click(screen.getAllByRole('button', { name: /apply damage/i })[0])
    expect(onFelt).not.toHaveBeenCalled()
  })
})
