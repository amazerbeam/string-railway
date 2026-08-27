/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import WarCouncilRound from '../WarCouncilRound'
import {
  bankClimbBonusFixture,
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

/** Mirrors `WarCouncilRound.timebomb.test.tsx`'s own `renderRound` helper. */
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
      buffs={overrides.buffs ?? []}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

function openLoadout() {
  fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
}

function gallery() {
  return screen.queryByRole('dialog', { name: 'Your buffs' })
}

describe('WarCouncilRound — the loadout drawer deliberately remembers it was open (Defender, DLR-148 fix pass)', () => {
  it('reopens on its own once a held reveal is dismissed, with no new tap on the bar', () => {
    // Same construction as `WarCouncilRound.timebomb.test.tsx`'s "is not rendered at all once a
    // trick reveal is held" spec: the fixture hand's one Bells card completes a trick. The panel
    // is opened BEFORE the trick resolves, exactly as that spec does.
    renderRound()
    openLoadout()
    expect(gallery()).toBeTruthy()

    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    expect(screen.getByText(/take the trick/i)).toBeDefined()

    // `loadoutDoorOpen` is false while the reveal is held, so the gallery does not render — this
    // half is already pinned by the timebomb spec; restated here so the sequence reads whole.
    expect(gallery()).toBeNull()

    // Dismiss the held reveal. `handleCarryOn` does not clear `ui.loadout` — the panel's own
    // toggle state — so the gallery is expected to render again with no further tap on the
    // "Apply buff" bar.
    fireEvent.click(screen.getByRole('button', { name: /tap the table to carry on/i }))

    expect(gallery()).toBeTruthy()
  })
})
