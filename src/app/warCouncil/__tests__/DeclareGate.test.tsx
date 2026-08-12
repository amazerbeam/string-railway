/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HuntDeclaration, invertedCardValue } from '../../../hunt'
import { CardRank } from '../../../warCouncil'
import DeclareGate from '../DeclareGate'

afterEach(cleanup)

describe('DeclareGate — AC1', () => {
  it('offers both paths as named controls', () => {
    render(<DeclareGate onDeclare={vi.fn()} />)
    expect(screen.getByRole('button', { name: /win/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /lose/i })).toBeDefined()
  })

  it('reports the chosen path', () => {
    const onDeclare = vi.fn()
    render(<DeclareGate onDeclare={onDeclare} />)
    fireEvent.click(screen.getByRole('button', { name: /lose/i }))
    expect(onDeclare).toHaveBeenCalledWith(HuntDeclaration.Lose)
  })

  it('reads the inverted example off invertedCardValue, not a hard-coded 11', () => {
    render(<DeclareGate onDeclare={vi.fn()} />)
    const lose = screen.getByRole('button', { name: /lose/i })
    expect(lose.textContent).toContain(String(invertedCardValue(CardRank.Swan)))
  })

  it('is a real focus target that a native button activates on click once focused', () => {
    // Despite the name, this does NOT re-simulate Enter/Space — `@testing-library/user-event`
    // is not a project dependency (grep confirms no other spec in src/ imports it, and it is
    // absent from package.json), a new dependency needs the developer's approval per
    // react-frontend's dependency rule, and jsdom does not implement a native `<button>`'s own
    // Enter/Space -> click translation, so a bare `fireEvent.keyDown(button, { key: 'Enter' })`
    // would not fire the handler here. What this asserts is real: the control is reachable by
    // Tab (focus lands on it, proven via `document.activeElement`) and a native `<button>`
    // activates on click once focused — the Enter/Space behaviour itself is the HTML platform's
    // own guarantee, documented as deliberately not re-simulated in
    // `.docs/implementation/war-council-ui/interaction-and-state.md` (the `RoundOverPanel`/
    // `TrickWell` double-dispatch note). `WarCouncilRound.test.tsx`'s own "reaches ... by
    // keyboard alone" specs use this identical substitution.
    const onDeclare = vi.fn()
    render(<DeclareGate onDeclare={onDeclare} />)
    const win = screen.getByRole('button', { name: /win/i })
    win.focus()
    expect(document.activeElement).toBe(win)
    fireEvent.click(win)
    expect(onDeclare).toHaveBeenCalledWith(HuntDeclaration.Win)
  })
})
