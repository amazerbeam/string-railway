/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import WarCouncilRound from '../WarCouncilRound'
import {
  baseDamageBonusFixture,
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
import { carryOnFromResolution, stubMatchMedia } from './resolutionTestHelpers'

afterEach(cleanup)

stubMatchMedia()

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
      baseDamageBonus={overrides.baseDamageBonus ?? baseDamageBonusFixture}
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
    // DLR-156 — the resolution screen REPLACES the felt the instant the trick resolves, so the
    // gallery is gone along with the rest of the felt, not merely hidden behind
    // `loadoutDoorOpen`'s own gate — this half is already pinned by the timebomb spec; restated
    // here so the sequence reads whole.
    expect(screen.getByText(/took it|streak is broken/i)).toBeDefined()
    expect(gallery()).toBeNull()

    // Dismiss the resolution screen. Neither `applyPotAction`/`rollOverAction` nor the
    // `handleCarryOn` they chain through (`roundReducer.ts`) ever touches `ui.loadout` — the
    // panel's own toggle state — so the gallery is expected to render again with no further tap
    // on the "Apply buff" bar.
    carryOnFromResolution()

    expect(gallery()).toBeTruthy()
  })
})
