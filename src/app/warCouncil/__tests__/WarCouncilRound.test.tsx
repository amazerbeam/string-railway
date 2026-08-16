/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import {
  DAMAGE_PER_HIT,
  HAND_SIZE,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
} from '../../../hunt'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import { cardAccessibleName, cheatAccessibleName } from '../labels'
import { CheatStage } from '../roundReducer'
import WarCouncilRound from '../WarCouncilRound'
import {
  card,
  encounterFixture,
  huntFixture,
  makeRound,
  maxHealthFixture,
  runLabelFixture,
} from './roundFixture'

afterEach(cleanup)

/**
 * Renders `WarCouncilRound` with the shared fixtures, letting any prop be overridden per test.
 * Collapses this file's many near-identical five-prop render calls back to one line each
 * (DLR-71 Round 2) — a mechanical `prettier --write` reflowing all seventeen into
 * one-prop-per-line blocks was what pushed the file over the 400-line budget in the first place.
 */
function renderRound(overrides: Partial<WarCouncilMountProps> = {}) {
  return render(
    <WarCouncilRound
      initialState={overrides.initialState ?? makeRound()}
      hunt={overrides.hunt ?? huntFixture}
      encounter={overrides.encounter ?? encounterFixture}
      maxHealth={overrides.maxHealth ?? maxHealthFixture}
      runLabel={overrides.runLabel ?? runLabelFixture}
      cheats={overrides.cheats ?? []}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

function healthMeter(name: 'Your health' | 'The Quarry’s health') {
  return screen.getByRole('meter', { name })
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

  it('telegraphs the Quarry’s lead before it lands, and commits it on "Let them lead" (AC3)', () => {
    renderRound({ initialState: makeRound({ leader: PlayerSide.Cpu }) })
    // Nothing has been committed yet — the trick row is still empty (no `wc-played` card).
    expect(screen.queryByText(/^They led/i)).toBeNull()
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-label')).toMatch(/will lead/i)

    const letThemLead = screen.getByRole('button', { name: /let them lead/i })
    fireEvent.click(letThemLead)
    expect(screen.getByText(/^They led/i)).toBeDefined()
  })

  it('previews the Quarry’s answer to an armed card before it is played (AC3)', () => {
    renderRound()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-label')).toMatch(/^If you lead that card/)
    // Arming is a selection, not a commitment — the card has not been played.
    expect(screen.queryByText(/^You led/i)).toBeNull()
  })

  it('clears the speculative reading back to the live one on Escape', () => {
    renderRound()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    expect(screen.getByRole('status').getAttribute('aria-label')).toMatch(/^If you lead that card/)
    const hand = screen.getByRole('group', { name: /hand/i })
    fireEvent.keyDown(hand, { key: 'Escape' })
    expect(screen.getByRole('status').getAttribute('aria-label')).not.toMatch(/^If you lead/)
  })

  it('shows both health bars from the first render', () => {
    renderRound()
    expect(healthMeter('Your health')).toBeTruthy()
    expect(healthMeter('The Quarry’s health')).toBeTruthy()
  })

  it('reaches "Let them lead" by keyboard alone', () => {
    renderRound({ initialState: makeRound({ leader: PlayerSide.Cpu }) })
    const letThemLead = screen.getByRole('button', { name: /let them lead/i })
    letThemLead.focus()
    expect(document.activeElement).toBe(letThemLead)
    fireEvent.click(letThemLead)
    expect(screen.queryByRole('button', { name: /let them lead/i })).toBeNull()
  })

  it('leaves both bars untouched on a clean take — the bank climbs, not health', () => {
    // Bells 9 is the Witch: a single Witch acts as an effective trump, so this trick's
    // outcome is deterministic regardless of the fixture's own trump suit (Keys, here) —
    // the same construction `roundReducer.test.ts`'s own bank specs use.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })
    const playerBefore = healthMeter('Your health').getAttribute('aria-valuenow')
    const quarryBefore = healthMeter('The Quarry’s health').getAttribute('aria-valuenow')
    const bells9 = screen.getByRole('button', { name: '9 of Bells (Witch)' })
    fireEvent.click(bells9)
    fireEvent.click(bells9)
    expect(screen.getByText(/take the trick/i)).toBeDefined()
    expect(healthMeter('Your health').getAttribute('aria-valuenow')).toBe(playerBefore)
    expect(healthMeter('The Quarry’s health').getAttribute('aria-valuenow')).toBe(quarryBefore)
  })

  it('moves the player’s bar by exactly one hit on a lost clean trick, and cashes the bank into the Quarry (AC6)', () => {
    // The deciding sixth trick: each hand holds exactly its last card, so after it resolves
    // neither side has a next lead to read — `quarryIntent` would otherwise be asked for the
    // Quarry's empty-handed "next" lead and throw, exactly the empty-legal-set crash
    // `chooseCpuCard`'s own docblock warns `lowestCard([])` produces.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 2,
      multiplier: 2,
      tricksPlayed: HAND_SIZE - 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })
    const bells2 = screen.getByRole('button', { name: '2 of Bells' })
    fireEvent.click(bells2)
    fireEvent.click(bells2)
    expect(screen.getByText(/take the trick/i)).toBeDefined()
    expect(Number(healthMeter('Your health').getAttribute('aria-valuenow'))).toBe(
      PLAYER_START_HEALTH - DAMAGE_PER_HIT,
    )
    expect(Number(healthMeter('The Quarry’s health').getAttribute('aria-valuenow'))).toBe(
      quarryHealthForEncounter(0) - 4,
    )
  })

  it('renders the shape readout for the dealt hand, and the bank readout climbs on a taken trick (DLR-80 Task 20)', () => {
    // Same Witch-beats-anything construction as the clean-take spec above: deterministic
    // regardless of the fixture's own trump suit, so this only exercises the two new readouts.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })

    // AC11 — the shape readout is on screen before any card is played, and never shows a rank.
    expect(screen.getByText(/Bells: 1 held, none skulled/i)).toBeTruthy()

    // The bank readout's cash figure (bank × multiplier) starts at zero, before any trick.
    expect(screen.getByLabelText(/cashes for 0/i)).toBeTruthy()

    const bells9 = screen.getByRole('button', { name: '9 of Bells (Witch)' })
    fireEvent.click(bells9)
    fireEvent.click(bells9)
    expect(screen.getByText(/take the trick/i)).toBeDefined()

    // …and climbs the instant the trick is taken: PT-002 banks 1 per trick taken, so one trick
    // into the streak reads bank 1 × multiplier 1 = 1, not a rank sum.
    expect(screen.getByLabelText(/cashes for 1\b/i)).toBeTruthy()
  })

  it('makes a forbidden card playable once a Cheat is armed (AC5)', () => {
    // Same construction as "disables a card the engine says is illegal" above: the player is
    // forced to follow Moons, so their sole Bells card is genuinely forbidden without a Cheat.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round, cheats: [{ id: 1 }] })

    const offSuitName = cardAccessibleName(card(Suit.Bells, 7))
    const offSuit = screen.getByRole('button', { name: offSuitName })
    expect(offSuit).toHaveProperty('disabled', true)

    const slot = screen.getByRole('button', { name: cheatAccessibleName(null) })
    fireEvent.click(slot)
    fireEvent.click(screen.getByRole('button', { name: cheatAccessibleName(CheatStage.Poised) }))

    expect(screen.getByRole('button', { name: offSuitName })).toHaveProperty('disabled', false)
  })
})

// The full-hand, six-trick end-to-end pass (AC6/AC8) lives in
// `WarCouncilRound.duelHealthBars.test.tsx` — carved out for the same reason DLR-71 first split
// that file off this one: keeping the driving-loop apparatus for a full hand beside the fixture
// it exists to drive would push this file back over the 400-line budget.
