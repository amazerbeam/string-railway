/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dealRound, PlayerSide } from '../../../warCouncil'
import WarCouncilRound from '../WarCouncilRound'
import {
  baseDamageBonusFixture,
  coinsFixture,
  discardsRemainingFixture,
  encounterFixture,
  huntFixture,
  maxHealthFixture,
  blastGuardHeldFixture,
  quarryLabelFixture,
  runLabelFixture,
} from './roundFixture'
import { advanceTrickDwell, stubMatchMedia, withResolveHold } from './resolutionTestHelpers'

afterEach(cleanup)

stubMatchMedia()

// DLR-156 play-test fix 1 — see `WarCouncilRound.test.tsx`'s own comment on this pair: the trick
// dwell's `setTimeout` is created inside the commit tap itself, so fake timers must already be
// active at every commit, file-wide.
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

// DLR-160 QA fix — carved out of `WarCouncilRound.duelHealthBars.test.tsx`, which the same
// contract's Task 3 pushed to 409 lines. This describe block, and the helpers it alone used
// (`quarryHearts`, `currentRoll`, `playUntilStreak`), move here rather than being split
// arbitrarily — the same precedent `WarCouncilRound.timebomb.test.tsx` and
// `WarCouncilRound.abilityCancel.test.tsx` already set for this directory.

// A deterministic RNG — never `Math.random()` in anything that must be reproducible.
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

describe('WarCouncilRound — the Quarry’s at-risk preview (DLR-86)', () => {
  function renderRound() {
    return render(
      <WarCouncilRound
        initialState={dealRound(PlayerSide.Cpu, lcg(2026))}
        hunt={huntFixture}
        encounter={encounterFixture}
        maxHealth={maxHealthFixture}
        runLabel={runLabelFixture}
        quarryLabel={quarryLabelFixture}
        coins={coinsFixture}
        blastGuardHeld={blastGuardHeldFixture}
        baseDamageBonus={baseDamageBonusFixture}
        discardsRemaining={discardsRemainingFixture}
        buffs={[]}
        onComplete={vi.fn()}
      />,
    )
  }

  function quarryHearts(container: HTMLElement, state: string) {
    return container.querySelectorAll(`.wc-hp[data-side="quarry"] [data-state="${state}"]`)
  }

  /** `BankMeter`'s own accessible name carries `Roll N` (DLR-156 Task 15 Step 7 retitled it from
   *  `Multiplier N`) — read it rather than restating the arithmetic here. */
  function currentRoll(container: HTMLElement): number {
    const label = container.querySelector('.wc-bank-figures')?.getAttribute('aria-label') ?? ''
    const match = label.match(/Roll (\d+)/)
    return match ? Number(match[1]) : 0
  }

  /** Drives real play — tap a legal card twice to take a trick, roll over its resolution screen
   *  (never Apply, which would deal the pot and zero the very streak this loop exists to build),
   *  let the Quarry's own lead through — until the roll reads above zero. Fails loudly, rather
   *  than looping, if the hand ends first or a bounded attempt count is exhausted. */
  function playUntilStreak(container: HTMLElement) {
    let guard = 0
    while (currentRoll(container) === 0) {
      guard += 1
      if (guard > 200) {
        throw new Error('roll never rose above zero within the attempt budget')
      }
      if (screen.queryByRole('heading', { name: /the hand is over|the hunt is over/i })) {
        throw new Error('the hand ended before the streak ever banked a roll')
      }
      const fault = screen.queryByRole('alert')
      if (fault) {
        throw new Error(`the engine rejected the Quarry's own move: ${fault.textContent}`)
      }
      const prompt = screen.queryByRole('group', { name: 'Choose what the card does' })
      if (prompt) {
        fireEvent.click(within(prompt).getAllByRole('button')[0])
        advanceTrickDwell()
        continue
      }
      const rollOver = screen.queryByRole('button', { name: /roll over/i })
      if (rollOver) {
        withResolveHold(() => fireEvent.click(rollOver))
        continue
      }
      const onward = screen.queryByRole('button', { name: /onward/i })
      if (onward) {
        withResolveHold(() => fireEvent.click(onward))
        continue
      }
      const letThemLead = screen.queryByRole('button', { name: /let them lead/i })
      if (letThemLead) {
        fireEvent.click(letThemLead)
        continue
      }
      const hand = screen.getByRole('group', { name: /hand/i })
      const legalCard = within(hand)
        .getAllByRole('button')
        .find((button) => !(button as HTMLButtonElement).disabled)
      if (!legalCard) {
        throw new Error('no legal card found in hand, and no other branch applied')
      }
      fireEvent.click(legalCard)
      fireEvent.click(legalCard)
      // DLR-156 play-test fix 1 — a commit here may have resolved a trick, and the resolution
      // screen's own Roll over/Onward controls (checked at the top of the next pass) do not exist
      // until `--wc-trick-dwell` has elapsed.
      advanceTrickDwell()
    }
  }

  it('AC3/AC5 — the Quarry’s at-risk hearts track the live streak and clear when it resets', () => {
    const { container } = renderRound()
    // Nothing banked at the deal: no preview at all.
    expect(quarryHearts(container, 'atRisk')).toHaveLength(0)

    // Drive real play until the reducer has banked a streak, then assert the preview equals
    // total × roll clamped by the Quarry's own row length — derived from the rendered
    // meter, never a restated literal, so a config retune cannot make this test lie.
    playUntilStreak(container)
    const meter = screen.getByRole('meter', { name: quarryLabelFixture })
    const atRisk = quarryHearts(container, 'atRisk').length
    expect(atRisk).toBeGreaterThan(0)
    expect(meter.getAttribute('aria-valuetext')).toContain(`${atRisk} at risk.`)
    // The rendered figure never exceeds what the Quarry actually has left.
    expect(atRisk).toBeLessThanOrEqual(Number(meter.getAttribute('aria-valuenow')))
  })
})
