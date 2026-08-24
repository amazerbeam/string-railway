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
  huntFixture,
  makeRound,
  maxHealthFixture,
  blastGuardHeldFixture,
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
      coins={overrides.coins ?? coinsFixture}
      blastGuardHeld={overrides.blastGuardHeld ?? blastGuardHeldFixture}
      bankClimbBonus={overrides.bankClimbBonus ?? bankClimbBonusFixture}
      discardsRemaining={overrides.discardsRemaining ?? discardsRemainingFixture}
      buffs={overrides.buffs ?? []}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

describe('WarCouncilRound', () => {
  it('telegraphs the Quarry’s lead before it lands, and commits it on "Let them lead" (AC3)', () => {
    renderRound({ initialState: makeRound({ leader: PlayerSide.Cpu }) })
    // Nothing has been committed yet — the trick row is still empty (no `wc-played` card).
    expect(screen.queryByText(/^They led/i)).toBeNull()
    // DLR-123 — `role="status"` is no longer unique to the telegraph: the felt's new spent
    // plate (`DiscardPile`) carries the same role for its own live announcement. Disambiguated
    // by accessible name, which is still an accessible-role-and-label query.
    const status = screen.getByRole('status', { name: /will lead/i })
    expect(status.getAttribute('aria-label')).toMatch(/will lead/i)

    const letThemLead = screen.getByRole('button', { name: /let them lead/i })
    fireEvent.click(letThemLead)
    expect(screen.getByText(/^They led/i)).toBeDefined()
  })

  it('previews the Quarry’s answer to an armed card before it is played (AC3)', () => {
    renderRound()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    // DLR-123 — disambiguated from the felt's new spent-plate `role="status"` by accessible name.
    const status = screen.getByRole('status', { name: /^If you lead that card/ })
    expect(status.getAttribute('aria-label')).toMatch(/^If you lead that card/)
    // Arming is a selection, not a commitment — the card has not been played.
    expect(screen.queryByText(/^You led/i)).toBeNull()
  })

  it('clears the speculative reading back to the live one on Escape', () => {
    renderRound()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    // DLR-123 — disambiguated from the felt's new spent-plate `role="status"` by accessible name:
    // the telegraph's own name always starts with "The Quarry" (live) or "If you lead" (speculative).
    const telegraph = () => screen.getByRole('status', { name: /^(The Quarry|If you lead)/ })
    expect(telegraph().getAttribute('aria-label')).toMatch(/^If you lead that card/)
    const hand = screen.getByRole('group', { name: /hand/i })
    fireEvent.keyDown(hand, { key: 'Escape' })
    expect(telegraph().getAttribute('aria-label')).not.toMatch(/^If you lead/)
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
