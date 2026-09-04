/** @vitest-environment jsdom */
/**
 * DLR-174 review fix (Defender Critical 1) — AC5's whole promise is "the surface is reachable in
 * the Quarry-to-lead gap, where arming is already legal today." The reducer's own widened raise
 * window was already proven correct at the unit level (`roundReducer.arming.test.ts`), by
 * dispatching `TapCard` directly — which never exercised whether a REAL hand-card button in that
 * gap is even clickable. It was not: `handInteractive` (`WarCouncilTable.tsx`) never read
 * `cardRaiseWindowOpen`, so every hand card rendered `disabled` there. This mounts the real
 * component tree and clicks a real button.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import { ARMING_SURFACE_LABEL } from '../armingLabels'
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
import { stubMatchMedia } from './resolutionTestHelpers'

afterEach(cleanup)

stubMatchMedia()

/** Mirrors `WarCouncilRound.loadoutReopen.test.tsx`'s own `renderRound` helper. */
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

describe('WarCouncilRound — the arming surface is reachable in the Quarry-to-lead gap (AC5, review fix)', () => {
  it('opens on a real click of a hand-card button while canAct is false', () => {
    // `leader: PlayerSide.Cpu` with an empty `currentTrick` is the Quarry-to-lead gap:
    // `currentTurn` is the Quarry's, so `canAct` is false, but nothing has been played yet.
    renderRound({ initialState: makeRound({ leader: PlayerSide.Cpu }) })

    expect(screen.queryByRole('dialog', { name: ARMING_SURFACE_LABEL })).toBeNull()

    const bells2 = screen.getByRole('button', { name: '2 of Bells' })
    expect(bells2).toHaveProperty('disabled', false)
    fireEvent.click(bells2)

    expect(screen.getByRole('dialog', { name: ARMING_SURFACE_LABEL })).toBeTruthy()
  })
})
