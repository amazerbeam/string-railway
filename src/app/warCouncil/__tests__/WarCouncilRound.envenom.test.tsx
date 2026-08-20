/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { HAND_SIZE } from '../../../hunt'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import { ENVENOM_ARMED_HINT, ENVENOM_EMPTY_LABEL, envenomAccessibleName } from '../labels'
import { EnvenomStage } from '../roundUiState'
import WarCouncilRound from '../WarCouncilRound'
import {
  bankClimbBonusFixture,
  card,
  coinsFixture,
  encounterFixture,
  envenomChargesFixture,
  huntFixture,
  makeRound,
  maxHealthFixture,
  poisonGuardHeldFixture,
  quarryLabelFixture,
  runLabelFixture,
} from './roundFixture'

afterEach(cleanup)

/** Mirrors `WarCouncilRound.test.tsx`'s own `renderRound` helper, adding the one prop this
 *  spec file exists to exercise. */
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
      envenomCharges={overrides.envenomCharges ?? envenomChargesFixture}
      poisonGuardHeld={overrides.poisonGuardHeld ?? poisonGuardHeldFixture}
      bankClimbBonus={overrides.bankClimbBonus ?? bankClimbBonusFixture}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

function envenomPlate(stage: EnvenomStage | null, charges = envenomChargesFixture) {
  return screen.getByRole('button', { name: envenomAccessibleName(stage, charges) })
}

describe('WarCouncilRound — the Envenom rail (DLR-90)', () => {
  it('renders the charge plate in the felt rail with its held name', () => {
    renderRound()
    expect(envenomPlate(null)).toBeTruthy()
  })

  it('renders inert rather than vanishing at zero charges', () => {
    renderRound({ envenomCharges: 0 })
    const empty = screen.getByRole('button', { name: ENVENOM_EMPTY_LABEL })
    expect(empty).toHaveProperty('disabled', true)
  })

  it('arms on the second click, reporting the armed hint and aria-pressed true', () => {
    renderRound()
    const plate = envenomPlate(null)
    fireEvent.click(plate)
    fireEvent.click(envenomPlate(EnvenomStage.Poised))
    const armed = envenomPlate(EnvenomStage.Armed)
    expect(armed.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(ENVENOM_ARMED_HINT)).toBeTruthy()
  })

  it('marks the tapped hand card and leaves the trick unplayed once armed', () => {
    renderRound()
    fireEvent.click(envenomPlate(null))
    fireEvent.click(envenomPlate(EnvenomStage.Poised))
    const scoreboard = screen.getByRole('group', { name: /tricks won/i })
    expect(scoreboard.textContent).toMatch(/You0/)
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    expect(screen.getByRole('button', { name: '7 of Bells, poisoned' })).toBeTruthy()
    // The trick did not move — marking is not a move.
    expect(scoreboard.textContent).toMatch(/You0/)
  })

  it('lets an illegal card be marked while armed', () => {
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round })
    const offSuit = screen.getByRole('button', { name: '7 of Bells' })
    expect(offSuit).toHaveProperty('disabled', true)

    fireEvent.click(envenomPlate(null))
    fireEvent.click(envenomPlate(EnvenomStage.Poised))
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', false)
    fireEvent.click(screen.getByRole('button', { name: '7 of Bells' }))
    expect(screen.getByRole('button', { name: '7 of Bells, poisoned' })).toBeTruthy()
  })

  it('gives the charge back unspent on a third click', () => {
    renderRound()
    fireEvent.click(envenomPlate(null))
    fireEvent.click(envenomPlate(EnvenomStage.Poised))
    fireEvent.click(envenomPlate(EnvenomStage.Armed))
    expect(screen.queryByText(ENVENOM_ARMED_HINT)).toBeNull()
    expect(envenomPlate(null)).toBeTruthy()
  })

  it('cancels the selection on Escape', () => {
    renderRound()
    fireEvent.click(envenomPlate(null))
    const poised = envenomPlate(EnvenomStage.Poised)
    fireEvent.keyDown(poised.closest('[role="group"]') as Element, { key: 'Escape' })
    expect(envenomPlate(null)).toBeTruthy()
  })

  it('is disabled while a trick reveal is held, and does not clear the reveal on click (stopPropagation)', () => {
    // Same construction as the base spec's own "plays a legal card" case: the fixture hand's
    // one Bells card completes a trick against the fixture Cpu hand.
    renderRound()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    expect(screen.getByText(/take the trick/i)).toBeDefined()

    const plate = envenomPlate(null)
    expect(plate).toHaveProperty('disabled', true)
    fireEvent.click(plate)
    // The reveal is still on screen — a click on the disabled plate must not have bubbled to
    // `.wc-table`'s own onClick, which would otherwise have called handleCarryOn and cleared it.
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
    fireEvent.click(envenomPlate(null))
    fireEvent.click(envenomPlate(EnvenomStage.Poised))
    const bells2 = screen.getByRole('button', { name: '2 of Bells' })
    fireEvent.click(bells2)
    const markedBells2 = screen.getByRole('button', { name: '2 of Bells, poisoned' })
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
    // catch this — the bug was in `WarCouncilRound` never passing `envenomed` at its mount, not in
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

    // Mark the 2 of Bells with Envenom.
    fireEvent.click(envenomPlate(null))
    fireEvent.click(envenomPlate(EnvenomStage.Poised))
    fireEvent.click(screen.getByRole('button', { name: '2 of Bells' }))
    expect(screen.getByRole('button', { name: '2 of Bells, poisoned' })).toBeTruthy()

    // Lead the Fox, then exchange the marked card into the decree.
    const fox = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    fireEvent.click(fox)
    fireEvent.click(fox)
    fireEvent.click(screen.getByRole('button', { name: '2 of Bells, poisoned' }))

    // The decree pile — not the hand fan, which no longer holds this card — must still announce
    // the mark. Exactly one match: the marked card left the hand when it became the decree.
    expect(screen.getByRole('button', { name: '2 of Bells, poisoned' })).toBeTruthy()
  })

  it('reports onComplete with envenomCharges reflecting what was spent', () => {
    const onComplete = vi.fn()
    const round = makeRound({
      tricksPlayed: HAND_SIZE - 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 7)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 4)],
      },
    })
    renderRound({ initialState: round, onComplete })

    fireEvent.click(envenomPlate(null))
    fireEvent.click(envenomPlate(EnvenomStage.Poised))
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    const marked = screen.getByRole('button', { name: '7 of Bells, poisoned' })
    fireEvent.click(marked)
    fireEvent.click(marked)

    fireEvent.click(screen.getByRole('button', { name: /tap the table to carry on/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Deal the next Hunt' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].envenomCharges).toBe(envenomChargesFixture - 1)
  })
})
