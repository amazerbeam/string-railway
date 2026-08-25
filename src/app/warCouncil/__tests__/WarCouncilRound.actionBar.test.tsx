/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ACTIVATED_BUFF_CONDITION,
  apCostOf,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  cheatBuff,
  type Buff,
} from '../../../hunt'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import type { WarCouncilMountProps } from '../../warCouncilMount'
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

const cheatBuffFixture = cheatBuff(BuffTier.Bronze, 1)

/** A Ward, minted by hand rather than through `mintFromTemplate` — Ward has no template
 *  (DLR-120 scope boundary), so `buffHandlers.test.ts`'s own `itemBuff` pattern is the way every
 *  spec in this codebase builds one. Used ONLY below, where the test's whole point is the
 *  ordinary between-tricks window — Cheat and Timebomb are DLR-132's one exception to it (see
 *  `roundUiState.ts`'s `buffActivationWindowOpen`), so they cannot stand in for "any buff" here. */
function wardBuffFixture(): Buff {
  return {
    id: 9,
    kind: BuffKind.Ward,
    tier: BuffTier.Bronze,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.None, value: 0 },
  }
}

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
      coins={overrides.coins ?? coinsFixture}
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

  it('the old felt-rail widgets are gone — DLR-132 folded Cheat and Timebomb into the row list', () => {
    renderRound()
    expect(screen.queryByRole('group', { name: 'Cheats' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Timebomb' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    // Still gone with the panel open — neither is its own group any more, just an ordinary row.
    expect(screen.queryByRole('group', { name: 'Cheats' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Timebomb' })).toBeNull()
  })

  it('clicking Apply Buff opens the "Your buffs" dialog, revealing the Cheat row in buffLine grammar', () => {
    renderRound()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    expect(within(dialog).getByRole('button', { name: /Cheat \(/ })).toBeTruthy()
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

  it('mid-trick: Apply Buff stays enabled and opens the panel, while an ordinary buff row inside greys with "Not between tricks." (DLR-114 door widening)', () => {
    // The player is following an already-committed lead — `currentTrick` is non-empty, so
    // `discardWindowOpen` is false, but `canAct` is true. `loadoutDoorOpen` reads either, so the
    // door widens while an ORDINARY row's activation window (`loadoutRefusalFor`, unchanged for
    // every condition/consumable card) stays shut. A Ward stands in here rather than the Cheat
    // fixture every other spec in this file uses, because Cheat is DLR-132's one exception to
    // this exact gate.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round, buffs: [wardBuffFixture()] })

    const applyBuff = screen.getByRole('button', { name: /apply buff/i })
    expect(applyBuff).toHaveProperty('disabled', false)

    fireEvent.click(applyBuff)
    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    const row = within(dialog).getByRole('button', { name: /Ward/i })
    expect(row).toHaveProperty('disabled', true)
    expect(within(dialog).getByText('Not between tricks.')).toBeTruthy()
  })

  it('mid-trick: a Cheat row stays live, following an already-committed lead — DLR-132, the one moment it has value', () => {
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round })

    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    const row = within(dialog).getByRole('button', { name: /Cheat \(/ })
    expect(row).toHaveProperty('disabled', false)
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
