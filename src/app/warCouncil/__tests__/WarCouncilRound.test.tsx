/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { HAND_SIZE, quarryHealthForEncounter } from '../../../hunt'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import WarCouncilRound from '../WarCouncilRound'
import {
  bankClimbBonusFixture,
  card,
  coinsFixture,
  discardsRemainingFixture,
  encounterFixture,
  timebombChargesFixture,
  huntFixture,
  makeRound,
  maxHealthFixture,
  blastGuardHeldFixture,
  quarryLabelFixture,
  runLabelFixture,
} from './roundFixture'

afterEach(cleanup)

function healthMeter(name: 'Your health' | typeof quarryLabelFixture) {
  return screen.getByRole('meter', { name })
}

/**
 * Renders `WarCouncilRound` with the shared fixtures, letting any prop be overridden per test.
 * Collapses this file's many near-identical five-prop render calls back to one line each
 * (DLR-71 Round 2) — a mechanical `prettier --write` reflowing all seventeen into
 * one-prop-per-line blocks was what pushed the file over the 400-line budget in the first place.
 *
 * Split further at the same budget (DLR-93): this is the core render/trick-play/hand-completion
 * slice — the intent-telegraph and Let-them-lead flow lives in `WarCouncilRound.telegraph.test.tsx`,
 * and the health-bar/purse/shape/cheats readouts live in `WarCouncilRound.readouts.test.tsx`. Each
 * mirrors this same `renderRound` helper rather than importing it, following this file's own
 * pre-existing split precedent (`WarCouncilRound.timebomb.test.tsx`).
 */
function renderRound(overrides: Partial<WarCouncilMountProps> = {}) {
  return render(
    <WarCouncilRound
      initialState={overrides.initialState ?? makeRound()}
      hunt={overrides.hunt ?? huntFixture}
      encounter={overrides.encounter ?? encounterFixture}
      maxHealth={overrides.maxHealth ?? maxHealthFixture}
      runLabel={overrides.runLabel ?? runLabelFixture}
      quarryLabel={quarryLabelFixture}
      cheats={overrides.cheats ?? []}
      coins={overrides.coins ?? coinsFixture}
      timebombCharges={overrides.timebombCharges ?? timebombChargesFixture}
      blastGuardHeld={overrides.blastGuardHeld ?? blastGuardHeldFixture}
      bankClimbBonus={overrides.bankClimbBonus ?? bankClimbBonusFixture}
      discardsRemaining={overrides.discardsRemaining ?? discardsRemainingFixture}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

describe('WarCouncilRound', () => {
  it('renders the hand as buttons named by rank and suit', () => {
    renderRound()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toBeDefined()
    expect(screen.getByRole('button', { name: '3 of Keys (Fox)' })).toBeDefined()
  })

  it('renders the hand longest-suit-first, not in dealt order (AC6)', () => {
    renderRound()
    const hand = screen.getByRole('group', { name: /hand/i })
    const names = within(hand)
      .getAllByRole('button', { name: /of (Bells|Keys|Moons)/ })
      .map((b) => b.getAttribute('aria-label') ?? '')
    // makeRound's hand holds 2 of each suit, so ALL_SUITS order applies throughout:
    // Bells 2, Bells 7, Keys 3, Keys 8, Moons 5, Moons 11.
    expect(names).toEqual([
      '2 of Bells',
      '7 of Bells',
      '3 of Keys (Fox)',
      '8 of Keys',
      '5 of Moons (Woodcutter)',
      '11 of Moons (Monarch)',
    ])
  })

  it('is interactive from the first render — there is no declaration to wait on (DLR-80)', () => {
    renderRound()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', false)
  })

  it('plays a legal card on the second tap of the same card', () => {
    renderRound()
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
    renderRound()
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
    // Built already mid-trick.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round })
    // The player holds Moons, so following suit is forced and Bells is out.
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: '11 of Moons (Monarch)' })).toHaveProperty(
      'disabled',
      false,
    )
  })

  it('shows the trump suit and updates it when a Fox exchange lands', () => {
    renderRound()
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

  it('holds the deciding sixth trick before the hand-over panel, then reports onComplete once', () => {
    const onComplete = vi.fn()
    const round = makeRound({
      tricksPlayed: HAND_SIZE - 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 7)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 4)],
      },
    })
    renderRound({ initialState: round, onComplete })
    const last = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(last)
    fireEvent.click(last)
    // The deciding trick resolves and completes the hand in the same commit, but its cards
    // and winner must be visible before the hand-over panel replaces them.
    expect(screen.getByText(/take the trick/i)).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'The hand is over' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /tap the table to carry on/i }))
    expect(screen.getByRole('heading', { name: 'The hand is over' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Deal the next Hunt' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].finalState.phase).toBe(RoundPhase.Complete)
  })

  it('reports onComplete with a finalState still short of RoundPhase.Complete when a cash-out resolves the encounter mid-hand (Defender Warning 1)', () => {
    // Same construction as `roundReducer.bank.test.ts`'s "stops accepting taps" spec: trick 3 of
    // 6, a bank of 500 at streak 2 cashes for 500 x 2 = 1000, which comfortably exceeds this
    // encounter's 10-health Quarry — so the Quarry's bar empties on this trick rather than the
    // hand's sixth. DLR-82 deleted the terminal panel: the deciding trick now gets its own reveal
    // beat like any other, and `handleCarryOn` reports the finished encounter upward on the next
    // tap regardless — so `onComplete`'s `finalState` never reaches `RoundPhase.Complete` down
    // this path.
    const onComplete = vi.fn()
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 500,
      multiplier: 2,
      tricksPlayed: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 1), card(Suit.Keys, 4)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 8), card(Suit.Keys, 5)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round, onComplete })
    const swan = screen.getByRole('button', { name: '1 of Bells (Swan)' })
    fireEvent.click(swan)
    fireEvent.click(swan)
    // The deciding trick's own reveal, same as any other trick — no terminal panel any more.
    const carryOn = screen.getByRole('button', { name: /tap the table to carry on/i })
    fireEvent.click(carryOn)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].finalState.phase).not.toBe(RoundPhase.Complete)
  })

  it('reaches the resolved trick’s carry-on control by keyboard alone', () => {
    // Every trick but the last resolves mid-hand and holds the felt open — exactly the
    // state a keyboard-only player was previously unable to escape, since every hand card
    // is disabled the instant a trick resolves and nothing else in the tree is focusable.
    // The control is a native <button> (Fix 4): confirming it is reachable by keyboard
    // (real focus lands on it with no explicit tabIndex needed) is this component's own
    // contract to prove. Activating it via `fireEvent.click` rather than
    // `fireEvent.keyDown(..., { key: 'Enter' })` — a native button's own Enter/Space
    // activation is the HTML platform's guarantee, not this component's to re-prove.
    renderRound()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    const carryOn = screen.getByRole('button', { name: /tap the table to carry on/i })
    carryOn.focus()
    expect(document.activeElement).toBe(carryOn)
    fireEvent.click(carryOn)
    expect(screen.queryByRole('button', { name: /tap the table to carry on/i })).toBeNull()
  })

  it('DLR-109 — applying QUEUES the streak at no cost rather than cashing it instantly, and the hand plays on', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })

    const plate = () => screen.getByRole('button', { name: /apply damage/i })
    const playerBefore = healthMeter('Your health').getAttribute('aria-valuenow')

    fireEvent.click(plate()) // poise
    fireEvent.click(plate()) // commit

    // DLR-109 — the commit no longer lands in this transition: it is queued and lands at a
    // later trick resolution (see `roundReducer.delayedApply.test.ts` for the landing itself).
    expect(Number(healthMeter(quarryLabelFixture).getAttribute('aria-valuenow'))).toBe(
      quarryHealthForEncounter(0),
    )
    expect(healthMeter('Your health').getAttribute('aria-valuenow')).toBe(playerBefore)
    // AC2 — the bank and multiplier are still spent in this transition, even though the
    // payout itself has not landed yet.
    expect(screen.getByLabelText(/cashes for 0\b/i)).toBeTruthy()

    // AC3 — the card is still there to play, and the plate is now refused because the queued
    // payout is still in the air, not because the bank is empty.
    expect(plate()).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: /still in the air/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: '2 of Bells' })).toBeTruthy()
  })
})

// The full-hand, six-trick end-to-end pass (AC6/AC8) lives in
// `WarCouncilRound.duelHealthBars.test.tsx` — carved out for the same reason DLR-71 first split
// that file off this one: keeping the driving-loop apparatus for a full hand beside the fixture
// it exists to drive would push this file back over the 400-line budget.
