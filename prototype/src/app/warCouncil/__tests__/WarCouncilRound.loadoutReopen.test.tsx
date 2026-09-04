/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  quarryLabelFixture,
  runLabelFixture,
} from './roundFixture'
import { advanceTrickDwell, carryOnFromResolution, stubMatchMedia } from './resolutionTestHelpers'

afterEach(cleanup)

stubMatchMedia()

// DLR-156 play-test fix 1 — see `WarCouncilRound.test.tsx`'s own comment on this pair.
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

/** Mirrors `WarCouncilRound.test.tsx`'s own `renderRound` helper. */
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
  // DLR-174 Task 6 Step 2 — SUPERSEDES this test's original expectation. `commit` now clears
  // `ui.loadout` on every successful play, precisely so the gallery cannot pop back onto the
  // stage behind the next trick — a card raised while the gallery is open now also claims the
  // shared poise holder (`ui.loadout`), which is what the arming surface reads, so DLR-148's
  // "remembers it was open" behaviour is deliberately narrowed to hold only up to the moment a
  // card is actually played.
  it('does not pop back open behind the next trick once a card has been played', () => {
    // The fixture hand's one Bells card completes a trick. The panel is opened BEFORE the trick
    // resolves.
    renderRound()
    openLoadout()
    expect(gallery()).toBeTruthy()

    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7) // raises the card — the arming surface takes the stage, gallery closes
    fireEvent.click(bells7) // commits it
    advanceTrickDwell()
    // DLR-160 AC11 — the table (and the gallery it can open) stays MOUNTED behind the resolution
    // panel now, so the gallery being gone is `loadoutDoorOpen`'s own `canAct` gate going false
    // while a trick is held, not the felt being torn down. Both the well's own outcome line
    // and the panel's now say the same thing, so this reads `getAllByText` rather than
    // `getByText` — the wording exists on both surfaces at once by design (`resolutionOutcome.ts`
    // is read by both), not a duplicate rendering bug.
    expect(screen.getAllByText(/took it|streak is broken/i).length).toBeGreaterThan(0)
    expect(gallery()).toBeNull()

    // Dismiss the resolution screen. `commit` already cleared `ui.loadout` on the play above
    // (DLR-174 Task 6 Step 2), so the gallery stays shut with no further tap on the bar —
    // deliberately, so a played card cannot leave the gallery popping open behind the next trick.
    carryOnFromResolution()

    expect(gallery()).toBeNull()
  })
})
