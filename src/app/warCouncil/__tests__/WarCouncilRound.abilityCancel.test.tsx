/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
import { stubMatchMedia } from './resolutionTestHelpers'

afterEach(cleanup)

stubMatchMedia()

// DLR-156 play-test fix 1 — see `WarCouncilRound.test.tsx`'s own comment on this pair.
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

/**
 * DLR-160 AC12's own slice, split off `WarCouncilRound.test.tsx` (which mirrors its
 * `renderRound` helper below) for the same 400-line-budget reason every prior split in this
 * file's history cites — adding these cases there would have pushed it to 414 lines.
 *
 * DLR-163 — the prompt these two cancel is the 3's SUIT PICKER now; the Fox exchange is gone.
 * Cancelling is unchanged and is still the one exit that plays nothing.
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
      baseDamageBonus={overrides.baseDamageBonus ?? baseDamageBonusFixture}
      discardsRemaining={overrides.discardsRemaining ?? discardsRemainingFixture}
      buffs={overrides.buffs ?? []}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

describe("WarCouncilRound — AC12, cancelling the 3's suit prompt before it commits", () => {
  it('cancels via the visible control — the Fox returns to hand unarmed and nothing is played', () => {
    renderRound()
    const fox = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    fireEvent.click(fox) // arm
    fireEvent.click(fox) // commit — opens the prompt
    const prompt = screen.getByRole('group', { name: 'Name the new trump suit' })
    fireEvent.click(within(prompt).getByRole('button', { name: /don.t play the 3/i }))
    // The prompt is gone, no card was played — the trick count reads the same "You0" the
    // un-played state reads throughout `WarCouncilRound.test.tsx` — and the Fox is back in the
    // hand, unarmed: `aria-pressed` is the same signal `WarCouncilRound.test.tsx`'s "plays a
    // legal card on the second tap" reads for the armed state.
    expect(screen.queryByRole('group', { name: 'Name the new trump suit' })).toBeNull()
    expect(screen.getByRole('group', { name: /tricks won/i }).textContent).toMatch(/You0/)
    const hand = screen.getByRole('group', { name: /hand/i })
    const foxAgain = within(hand).getByRole('button', { name: '3 of Keys (Fox)' })
    expect(foxAgain.getAttribute('aria-pressed')).not.toBe('true')
  })

  it('cancels via Escape too, with the same outcome', () => {
    renderRound()
    const fox = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    fireEvent.click(fox)
    fireEvent.click(fox)
    const prompt = screen.getByRole('group', { name: 'Name the new trump suit' })
    fireEvent.keyDown(prompt, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Name the new trump suit' })).toBeNull()
    expect(screen.getByRole('group', { name: /tricks won/i }).textContent).toMatch(/You0/)
    const hand = screen.getByRole('group', { name: /hand/i })
    const foxAgain = within(hand).getByRole('button', { name: '3 of Keys (Fox)' })
    expect(foxAgain.getAttribute('aria-pressed')).not.toBe('true')
  })
})
