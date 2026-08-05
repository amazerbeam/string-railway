/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import WarCouncilRound from '../WarCouncilRound'
import { card, makeRound } from './roundFixture'

afterEach(cleanup)

describe('WarCouncilRound', () => {
  it('renders the hand as buttons named by rank and suit', () => {
    render(<WarCouncilRound initialState={makeRound()} onComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: '7 of Bells' })).toBeDefined()
    expect(screen.getByRole('button', { name: '3 of Keys (Fox)' })).toBeDefined()
  })

  it('plays a legal card on the second tap of the same card', () => {
    render(<WarCouncilRound initialState={makeRound()} onComplete={vi.fn()} />)
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    // Correction: a raw `element.click()` dispatches a real event, but under
    // React 19 + jsdom the resulting state update is not guaranteed to flush
    // synchronously outside an `act()` scope — confirmed empirically (the
    // DOM still showed the pre-click aria-pressed value immediately after a
    // raw `.click()`). `fireEvent.click` wraps the dispatch in `act()`, so
    // every click in this file uses it rather than the bare DOM method.
    fireEvent.click(bells7)
    expect(bells7.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(bells7)
    // Correction: the committed card completes the trick (both fixture hands hold
    // exactly one Bells card each, and Bells is trump), so the played 7 of Bells is
    // now visible — condensed, disabled — in TrickWell's held reveal (AC2). A bare
    // `queryByRole` would find that card instead of correctly reporting "gone from
    // the hand". Scope the query to the hand's own labelled region.
    const hand = screen.getByRole('group', { name: /hand/i })
    expect(within(hand).queryByRole('button', { name: '7 of Bells' })).toBeNull()
  })

  it('shows the live trick counts and updates them once a trick resolves (AC4)', () => {
    // roundReducer.test.ts already asserts the reducer's internal `tricksWon`; this proves
    // the scoreboard itself is wired to it, not merely that the value exists somewhere in
    // state. Bells is trump, and both fixture hands hold exactly one Bells card each, so the
    // committed 7 of Bells resolves the trick in the same commit (AC2) and the player's card
    // (7) beats the CPU's forced follow (4) under trump.
    render(<WarCouncilRound initialState={makeRound()} onComplete={vi.fn()} />)
    // No `@testing-library/jest-dom` is installed in this project (see devDependencies),
    // so the assertion reads the element's own `textContent` rather than reaching for its
    // `toHaveTextContent` matcher.
    const scoreboard = screen.getByRole('group', { name: /tricks won/i })
    expect(scoreboard.textContent).toMatch(/You0/)
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    expect(scoreboard.textContent).toMatch(/You1/)
  })

  it('disables a card the engine says is illegal', () => {
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    render(<WarCouncilRound initialState={round} onComplete={vi.fn()} />)
    // The player holds Moons, so following suit is forced and Bells is out.
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', true)
    // Correction (see Task 18 Step 2): 11 of Moons is CardRank.Monarch, one of the
    // five ability-bearing ranks labels.ts decorates, so its accessible name carries
    // the parenthetical.
    expect(screen.getByRole('button', { name: '11 of Moons (Monarch)' })).toHaveProperty(
      'disabled',
      false,
    )
  })

  it('shows the trump suit and updates it when a Fox exchange lands', () => {
    render(<WarCouncilRound initialState={makeRound()} onComplete={vi.fn()} />)
    expect(screen.getByText(/Bells is trump/i)).toBeDefined()
    const fox = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    fireEvent.click(fox)
    fireEvent.click(fox)
    // Once the prompt opens, AbilityPrompt renders a PlayingCard for every remaining
    // hand card alongside the now-non-interactive HandFan, so "5 of Moons
    // (Woodcutter)" — the corrected accessible name for CardRank.Woodcutter — exists
    // twice in the document. Scope the query to the prompt's own labelled region
    // (see AbilityPrompt.tsx's added role="group" aria-label) rather than weakening
    // the assertion.
    const prompt = screen.getByRole('group', { name: 'Choose what the card does' })
    fireEvent.click(within(prompt).getByRole('button', { name: '5 of Moons (Woodcutter)' }))
    expect(screen.getByText(/Moons is trump/i)).toBeDefined()
  })

  it('holds the deciding thirteenth trick before the round-over panel, then reports onComplete once', () => {
    const onComplete = vi.fn()
    const round = makeRound({
      tricksPlayed: 12,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 7)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 4)],
      },
    })
    render(<WarCouncilRound initialState={round} onComplete={onComplete} />)
    const last = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(last)
    fireEvent.click(last)
    // The deciding trick resolves and completes the round in the same commit, but its
    // cards and winner must be visible before the round-over panel replaces them.
    expect(screen.getByText(/take the trick/i)).toBeDefined()
    expect(screen.queryByRole('button', { name: /finish/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /tap the table to carry on/i }))
    fireEvent.click(screen.getByRole('button', { name: /finish/i }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].finalState.phase).toBe(RoundPhase.Complete)
  })

  it('reaches the resolved trick’s carry-on control by keyboard alone', () => {
    // Every trick but the last resolves mid-round and holds the felt open — exactly the
    // state a keyboard-only player was previously unable to escape, since every hand card
    // is disabled the instant a trick resolves and nothing else in the tree is focusable.
    // The control is now a native <button> (Fix 4): confirming it is reachable by keyboard
    // (real focus lands on it with no explicit tabIndex needed) is this component's own
    // contract to prove. Activating it via `fireEvent.click` rather than
    // `fireEvent.keyDown(..., { key: 'Enter' })` — a native button's own Enter/Space
    // activation is the HTML platform's guarantee, not this component's to re-prove.
    render(<WarCouncilRound initialState={makeRound()} onComplete={vi.fn()} />)
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    const carryOn = screen.getByRole('button', { name: /tap the table to carry on/i })
    carryOn.focus()
    expect(document.activeElement).toBe(carryOn)
    fireEvent.click(carryOn)
    expect(screen.queryByRole('button', { name: /tap the table to carry on/i })).toBeNull()
  })
})
