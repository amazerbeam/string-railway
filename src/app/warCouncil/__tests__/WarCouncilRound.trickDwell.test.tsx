/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import WarCouncilRound from '../WarCouncilRound'
import {
  baseDamageBonusFixture,
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
import { stubMatchMedia } from './resolutionTestHelpers'

afterEach(cleanup)

stubMatchMedia()

// jsdom computes no custom properties, so every case here runs the documented
// FALLBACK_DWELL_MS (800ms) `useTrickDwell.ts` falls back to — the same value
// `--wc-trick-dwell` transcribes.
const FALLBACK_DWELL_MS = 800

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

describe('WarCouncilRound — the trick dwell (DLR-156 play-test fix 1)', () => {
  it('keeps the felt showing the played card in the well for the dwell, not interactive, before handing off to the resolution screen', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderRound()
      const bells7 = screen.getByRole('button', { name: '7 of Bells' })
      fireEvent.click(bells7)
      fireEvent.click(bells7)

      // Still the felt, immediately after the commit — the pot card has not grown its body/foot
      // yet (`WarCouncilRound.tsx`'s table is now always mounted, so absence of the body — not
      // absence of the felt — is what this checks). `.wc-resolve-body` is the pot card's own
      // class, rendered only once a resolution is showing, so this cannot collide with the felt's
      // own outcome wording (`TrickWell.tsx`, which can share a word like "Clean win").
      expect(container.querySelector('.wc-resolve-body')).toBeNull()
      // The played card landed in the well (`ui.resolvedTrick`), condensed rather than gone.
      expect(
        within(screen.getByRole('group', { name: /hand/i })).queryByRole('button', {
          name: '7 of Bells',
        }),
      ).toBeNull()
      // The felt is not interactive while the reveal is held — every other hand card is disabled.
      const anotherCard = screen.getByRole('button', { name: '2 of Bells' })
      expect(anotherCard).toHaveProperty('disabled', true)

      act(() => vi.advanceTimersByTime(FALLBACK_DWELL_MS - 1))
      expect(container.querySelector('.wc-resolve-body')).toBeNull()

      act(() => vi.advanceTimersByTime(1))
      expect(container.querySelector('.wc-resolve-body')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('unmounting mid-dwell clears the timer and renders nothing further', () => {
    vi.useFakeTimers()
    try {
      const { container, unmount } = renderRound()
      const bells7 = screen.getByRole('button', { name: '7 of Bells' })
      fireEvent.click(bells7)
      fireEvent.click(bells7)
      expect(container.querySelector('.wc-resolve-body')).toBeNull()

      unmount()

      expect(() => act(() => vi.advanceTimersByTime(FALLBACK_DWELL_MS * 5))).not.toThrow()
      expect(screen.queryByText(/clean win/i)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('an encounter-ending choice still reports onComplete exactly once with the dwell in effect', () => {
    // Mirrors `WarCouncilRound.test.tsx`'s own "reports onComplete with a finalState still short
    // of RoundPhase.Complete" pin — a total of 500 at roll 2 comfortably kills the 10-health
    // Quarry the instant Apply is pressed, mid-hand — but drives every commit through the trick
    // dwell explicitly, rather than the shared helper, so the exception `roundReducer.ts`'s own
    // `handleCarryOn` chaining relies on (the held reveal surviving an encounter-ending choice) is
    // pinned under the dwell too, not just under the ordinary case.
    vi.useFakeTimers()
    try {
      const onComplete = vi.fn()
      const round = makeRound({
        leader: PlayerSide.Player,
        trumpSuit: Suit.Keys,
        total: 500,
        roll: 2,
        tricksPlayed: 2,
        hands: {
          [PlayerSide.Player]: [card(Suit.Keys, 9), card(Suit.Bells, 1)],
          [PlayerSide.Cpu]: [card(Suit.Bells, 8), card(Suit.Keys, 5)],
        },
        currentTrick: [],
      })
      renderRound({ initialState: round, onComplete })
      const keys9 = screen.getByRole('button', { name: '9 of Keys (Witch)' })
      fireEvent.click(keys9)
      fireEvent.click(keys9)
      act(() => vi.advanceTimersByTime(FALLBACK_DWELL_MS))
      expect(screen.getByRole('button', { name: /apply damage/i })).toBeDefined()

      fireEvent.click(screen.getByRole('button', { name: /apply damage/i }))
      act(() => vi.advanceTimersByTime(700)) // --wc-resolve-hold's own fallback
      expect(onComplete).not.toHaveBeenCalled()

      // Applying the pot killed the Quarry mid-hand — the deciding trick's own reveal survives on
      // the felt (`roundReducer.ts`'s Task 15 chaining), and THIS tap reports `onComplete`.
      // DLR-160 AC1 — a real button named "Carry on" now.
      fireEvent.click(screen.getByRole('button', { name: /^carry on$/i }))

      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(onComplete.mock.calls[0][0].finalState.phase).not.toBe(RoundPhase.Complete)
    } finally {
      vi.useRealTimers()
    }
  })
})
