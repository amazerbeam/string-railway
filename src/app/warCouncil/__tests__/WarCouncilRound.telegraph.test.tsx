/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import WarCouncilRound from '../WarCouncilRound'
import {
  bankClimbBonusFixture,
  coinsFixture,
  discardsRemainingFixture,
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

/**
 * Mirrors `WarCouncilRound.test.tsx`'s own `renderRound` helper (DLR-93 400-line split) — the
 * intent-telegraph and Let-them-lead flow, carved out on its own concern.
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
      envenomCharges={overrides.envenomCharges ?? envenomChargesFixture}
      poisonGuardHeld={overrides.poisonGuardHeld ?? poisonGuardHeldFixture}
      bankClimbBonus={overrides.bankClimbBonus ?? bankClimbBonusFixture}
      discardsRemaining={overrides.discardsRemaining ?? discardsRemainingFixture}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

describe('WarCouncilRound', () => {
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

  it('reaches "Let them lead" by keyboard alone', () => {
    renderRound({ initialState: makeRound({ leader: PlayerSide.Cpu }) })
    const letThemLead = screen.getByRole('button', { name: /let them lead/i })
    letThemLead.focus()
    expect(document.activeElement).toBe(letThemLead)
    fireEvent.click(letThemLead)
    expect(screen.queryByRole('button', { name: /let them lead/i })).toBeNull()
  })
})
