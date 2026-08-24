/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apCostOf, BuffTier, cheatBuff } from '../../../hunt'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
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

const cheatBuffFixture = cheatBuff(BuffTier.Bronze, 1)

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
      timebombCharges={overrides.timebombCharges ?? timebombChargesFixture}
      blastGuardHeld={overrides.blastGuardHeld ?? blastGuardHeldFixture}
      bankClimbBonus={overrides.bankClimbBonus ?? bankClimbBonusFixture}
      discardsRemaining={overrides.discardsRemaining ?? discardsRemainingFixture}
      buffs={overrides.buffs ?? [cheatBuffFixture]}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

describe('WarCouncilRound — the action bar (DLR-114)', () => {
  it('renders the Actions group with its four buttons on a freshly mounted hand', () => {
    renderRound()
    const bar = screen.getByRole('group', { name: 'Actions' })
    expect(within(bar).getAllByRole('button').length).toBe(4)
  })

  it('the old felt-rail rails are gone before the panel is opened', () => {
    renderRound()
    expect(screen.queryByRole('group', { name: 'Cheats' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Timebomb' })).toBeNull()
  })

  it('clicking Apply Buff opens the "Your buffs" dialog, revealing the Cheat and Timebomb groups', () => {
    renderRound()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    expect(screen.getByRole('dialog', { name: 'Your buffs' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Cheats' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Timebomb' })).toBeTruthy()
  })

  it("activating the held Cheat buff twice spends its AP cost off Apply Buff's own figure", () => {
    renderRound()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))

    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    const row = within(dialog).getByRole('button', { name: /Cheat/i, hidden: false })
    // Sanity: the row states its own AP cost.
    expect(row.getAttribute('aria-label')).toContain(`${apCostOf(cheatBuffFixture)} AP.`)

    fireEvent.click(row) // poise
    fireEvent.click(row) // commit

    expect(
      screen.getByRole('button', {
        name: new RegExp(`${6 - apCostOf(cheatBuffFixture)} action points left`),
      }),
    ).toBeTruthy()
  })

  it('mid-trick: Apply Buff stays enabled and opens the panel, while a buff row inside greys with "Not between tricks." (DLR-114 door widening)', () => {
    // The player is following an already-committed lead — `currentTrick` is non-empty, so
    // `discardWindowOpen` is false, but `canAct` is true. `loadoutDoorOpen` reads either, so the
    // door widens while the row-level activation window (`loadoutRefusalFor`, unchanged) stays shut.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round })

    const applyBuff = screen.getByRole('button', { name: /apply buff/i })
    expect(applyBuff).toHaveProperty('disabled', false)

    fireEvent.click(applyBuff)
    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    const row = within(dialog).getByRole('button', { name: /Cheat/i })
    expect(row).toHaveProperty('disabled', true)
    expect(within(dialog).getByText('Not between tricks.')).toBeTruthy()
  })

  it('tapping a hand card once enables Cards; clicking it plays the card', () => {
    renderRound({ initialState: makeRound() })
    fireEvent.click(screen.getByRole('button', { name: '7 of Bells' }))

    const cardsButton = screen.getByRole('button', { name: /play the 7 of bells/i })
    expect((cardsButton as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(cardsButton)

    // A two-card trick resolves the instant the player leads (the Quarry's follow is committed
    // in the same reducer transition), so the well shows the resolved trick rather than a lead.
    expect(screen.getByText(/take the trick/)).toBeTruthy()
  })
})
