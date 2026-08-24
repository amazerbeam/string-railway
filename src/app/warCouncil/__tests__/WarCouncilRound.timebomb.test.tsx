/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { BuffTier, HAND_SIZE, timebombBuff } from '../../../hunt'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import { TIMEBOMB_ARMED_HINT } from '../labels'
import WarCouncilRound from '../WarCouncilRound'
import {
  bankClimbBonusFixture,
  card,
  coinsFixture,
  discardsRemainingFixture,
  encounterFixture,
  huntFixture,
  makeRound,
  maxHealthFixture,
  blastGuardHeldFixture,
  quarryLabelFixture,
  runLabelFixture,
} from './roundFixture'

afterEach(cleanup)

const bronzeTimebomb = timebombBuff(BuffTier.Bronze, 1)

/** Mirrors `WarCouncilRound.test.tsx`'s own `renderRound` helper. DLR-132 — a Timebomb is an
 *  ordinary pile member now, so every test below seeds one through `buffs` rather than a
 *  dedicated `timebombCharges` prop. */
function renderRound(overrides: Partial<WarCouncilMountProps> = {}) {
  return render(
    <WarCouncilRound
      initialState={overrides.initialState ?? makeRound()}
      hunt={overrides.hunt ?? huntFixture}
      encounter={overrides.encounter ?? encounterFixture}
      maxHealth={overrides.maxHealth ?? maxHealthFixture}
      runLabel={overrides.runLabel ?? runLabelFixture}
      quarryLabel={quarryLabelFixture}
      coins={overrides.coins ?? coinsFixture}
      blastGuardHeld={overrides.blastGuardHeld ?? blastGuardHeldFixture}
      bankClimbBonus={overrides.bankClimbBonus ?? bankClimbBonusFixture}
      discardsRemaining={overrides.discardsRemaining ?? discardsRemainingFixture}
      buffs={overrides.buffs ?? [bronzeTimebomb]}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

/** The Timebomb row, in `buffLine` grammar — its name stays matchable across poise/refusal
 *  states because only the trailing clause changes. */
function timebombRow() {
  return screen.getByRole('button', { name: /^Timebomb \(/ })
}

/** DLR-114 — Timebomb relocated from the felt rail into the Apply Buff loadout panel. Every
 *  test below must open the panel before it can reach the row. */
function openLoadout() {
  fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
}

describe('WarCouncilRound — the Timebomb row (DLR-90, DLR-132)', () => {
  it('renders the Timebomb row inside the opened loadout panel', () => {
    renderRound()
    openLoadout()
    expect(timebombRow()).toBeTruthy()
  })

  it('is absent from the panel when the pile holds none', () => {
    renderRound({ buffs: [] })
    openLoadout()
    expect(screen.queryByRole('button', { name: /^Timebomb \(/ })).toBeNull()
  })

  it('arms on the second click, reporting the armed hint', () => {
    renderRound()
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row) // poise
    fireEvent.click(row) // spend
    expect(screen.getByText(TIMEBOMB_ARMED_HINT)).toBeTruthy()
  })

  it('marks the tapped hand card and leaves the trick unplayed once armed', () => {
    renderRound()
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    const scoreboard = screen.getByRole('group', { name: /tricks won/i })
    expect(scoreboard.textContent).toMatch(/You0/)
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    expect(screen.getByRole('button', { name: '7 of Bells, primed' })).toBeTruthy()
    // The trick did not move — marking is not a move.
    expect(scoreboard.textContent).toMatch(/You0/)
  })

  it('lets an illegal card be marked while armed', () => {
    // The player is forced to follow Moons, so their sole Bells card is genuinely forbidden.
    // The panel opens through `loadoutDoorOpen` — `canAct` alone, since `currentTrick` is
    // non-empty here — restoring the pre-DLR-114 reach: Timebomb is armed FOLLOWING a forced
    // off-suit lead, and marking is never itself a legality check either way.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round })
    const offSuit = screen.getByRole('button', { name: '7 of Bells' })
    expect(offSuit).toHaveProperty('disabled', true)

    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', false)
    fireEvent.click(screen.getByRole('button', { name: '7 of Bells' }))
    expect(screen.getByRole('button', { name: '7 of Bells, primed' })).toBeTruthy()
  })

  it('cancels the poise on Escape, spending nothing', () => {
    renderRound()
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row) // poise
    fireEvent.keyDown(row.closest('[role="dialog"]') as Element, { key: 'Escape' })
    // The dialog itself closes on Escape (DLR-132 — the roving collection is now the whole
    // panel, and Escape is handled once, on the container). Reopening finds the row unspent.
    openLoadout()
    expect(timebombRow().getAttribute('aria-pressed')).toBe('false')
  })

  it('is disabled while a trick reveal is held, and does not clear the reveal on click (stopPropagation)', () => {
    // Same construction as the base spec's own "plays a legal card" case: the fixture hand's
    // one Bells card completes a trick against the fixture Cpu hand. The panel is opened BEFORE
    // the trick resolves — `discardWindowOpen` (and so `loadoutRefusalFor`) narrows once a reveal
    // is held, same as Swap's own gate, so the row itself greys rather than the panel closing.
    renderRound()
    openLoadout()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    expect(screen.getByText(/take the trick/i)).toBeDefined()

    const row = timebombRow()
    expect(row).toHaveProperty('disabled', true)
    fireEvent.click(row)
    // A click on the disabled row must not have bubbled to `.wc-table`'s own onClick, which
    // would otherwise have called handleCarryOn and cleared the reveal.
    expect(screen.getByText(/take the trick/i)).toBeDefined()
  })

  it('AC5 — a marked card the Quarry wins cleanly costs nothing: no damage, bank and multiplier stand', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 3,
      multiplier: 2,
      tricksPlayed: 0,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2), card(Suit.Bells, 4)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 6), card(Suit.Bells, 7)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })

    const playerHealthBefore = screen
      .getByRole('meter', { name: 'Your health' })
      .getAttribute('aria-valuenow')
    // bank(3) x multiplier(2) = 6.
    expect(screen.getByLabelText(/cashes for 6\b/i)).toBeTruthy()

    // Mark the 2 of Bells, then play it.
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    const bells2 = screen.getByRole('button', { name: '2 of Bells' })
    fireEvent.click(bells2)
    const markedBells2 = screen.getByRole('button', { name: '2 of Bells, primed' })
    fireEvent.click(markedBells2)
    fireEvent.click(markedBells2)

    expect(screen.getByText(/take the trick/i)).toBeDefined()
    // Neither the player's health nor the bank moved: AC5's replaced clean loss.
    expect(screen.getByRole('meter', { name: 'Your health' }).getAttribute('aria-valuenow')).toBe(
      playerHealthBefore,
    )
    expect(screen.getByLabelText(/cashes for 6\b/i)).toBeTruthy()
  })

  it('threads a marked card into the decree when the Fox exchanges it in (regression — DecreePile wiring)', () => {
    // The reachable path the DecreePile-wiring defect actually hides behind: mark a card, then
    // give it away via the Fox so it BECOMES the decree. A prop-only test on `DecreePile` cannot
    // catch this — the bug was in `WarCouncilRound` never passing `primed` at its mount, not in
    // `DecreePile` itself.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2), card(Suit.Keys, 3)], // Keys 3 is the Fox.
        [PlayerSide.Cpu]: [card(Suit.Moons, 9), card(Suit.Moons, 10)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })

    // Mark the 2 of Bells with Timebomb.
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    fireEvent.click(screen.getByRole('button', { name: '2 of Bells' }))
    expect(screen.getByRole('button', { name: '2 of Bells, primed' })).toBeTruthy()

    // Lead the Fox, then exchange the marked card into the decree.
    const fox = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    fireEvent.click(fox)
    fireEvent.click(fox)
    fireEvent.click(screen.getByRole('button', { name: '2 of Bells, primed' }))

    // The decree pile — not the hand fan, which no longer holds this card — must still announce
    // the mark. Exactly one match: the marked card left the hand when it became the decree.
    expect(screen.getByRole('button', { name: '2 of Bells, primed' })).toBeTruthy()
  })

  it('reports onComplete with the pile still holding the Timebomb — DLR-132, not a one-shot item', () => {
    const onComplete = vi.fn()
    const round = makeRound({
      tricksPlayed: HAND_SIZE - 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 7)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 4)],
      },
    })
    renderRound({ initialState: round, onComplete })

    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    const marked = screen.getByRole('button', { name: '7 of Bells, primed' })
    fireEvent.click(marked)
    fireEvent.click(marked)

    fireEvent.click(screen.getByRole('button', { name: /tap the table to carry on/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Deal the next Hunt' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].buffs).toEqual([bronzeTimebomb])
  })
})
