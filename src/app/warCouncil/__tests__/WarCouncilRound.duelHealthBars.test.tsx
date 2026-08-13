/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dealRound, PlayerSide, RoundPhase } from '../../../warCouncil'
import { HAND_SIZE } from '../../../hunt'
import WarCouncilRound from '../WarCouncilRound'
import { encounterFixture, huntFixture, maxHealthFixture } from './roundFixture'

afterEach(cleanup)

// DLR-80's full-hand, six-trick end-to-end pass — carved into its own file for the same reason
// DLR-71 first split it off `WarCouncilRound.test.tsx`: the driving-loop apparatus for a full
// hand pushes that file back over the 400-line budget if it lives beside every other spec.

// A deterministic RNG — never `Math.random()` in anything that must be reproducible.
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function healthMeter(name: 'Your health' | 'The Quarry’s health') {
  return screen.getByRole('meter', { name })
}

describe('WarCouncilRound — a full hand, damage landing per trick as it happens (AC6/AC8)', () => {
  it('resolves every trick, and reports onComplete once with the encounter carrying every damage event the DOM itself showed land', () => {
    const onComplete = vi.fn()
    render(
      <WarCouncilRound
        initialState={dealRound(PlayerSide.Cpu, lcg(2026))}
        hunt={huntFixture}
        encounter={encounterFixture}
        maxHealth={maxHealthFixture}
        onComplete={onComplete}
      />,
    )

    let tricksResolved = 0
    let eventsObserved = 0
    let guard = 0

    /** Snapshots both meters, runs `action`, then counts a resolution iff the reveal appears —
     *  called after EITHER a completing hand tap or a completing ability choice, since a Fox or
     *  Woodcutter played as a trick's second card only resolves once its choice is made, one
     *  dispatch after the tap that opened the prompt. Missing the prompt path here is exactly
     *  how two of six tricks went silently uncounted before this was written this way. */
    function resolveIfShown(action: () => void) {
      const before = {
        player: healthMeter('Your health').getAttribute('aria-valuenow'),
        quarry: healthMeter('The Quarry’s health').getAttribute('aria-valuenow'),
      }
      action()
      if (screen.queryByText(/take the trick/i)) {
        tricksResolved += 1
        const after = {
          player: healthMeter('Your health').getAttribute('aria-valuenow'),
          quarry: healthMeter('The Quarry’s health').getAttribute('aria-valuenow'),
        }
        if (after.player !== before.player || after.quarry !== before.quarry) {
          eventsObserved += 1
        }
      }
    }

    // Stops the instant either the hand-over or the terminal panel appears — DLR-80's cash-out
    // can resolve the encounter before the sixth trick, so this never assumes six will be
    // reached; the assertion below checks which one actually happened.
    while (screen.queryByRole('heading', { name: /the hand is over|the hunt is over/i }) === null) {
      guard += 1
      if (guard > 200) {
        throw new Error('hand did not complete — infinite loop guard tripped')
      }
      const fault = screen.queryByRole('alert')
      if (fault) {
        throw new Error(`the engine rejected the Quarry's own move: ${fault.textContent}`)
      }
      const prompt = screen.queryByRole('group', { name: 'Choose what the card does' })
      if (prompt) {
        const choice = within(prompt).getAllByRole('button')[0]
        resolveIfShown(() => fireEvent.click(choice))
        continue
      }
      const tapToCarryOn = screen.queryByRole('button', { name: /tap the table to carry on/i })
      if (tapToCarryOn) {
        fireEvent.click(tapToCarryOn)
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
      resolveIfShown(() => {
        fireEvent.click(legalCard)
        fireEvent.click(legalCard)
      })
    }

    fireEvent.click(screen.getByRole('button', { name: 'Deal the next Hunt' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    const result = onComplete.mock.calls[0][0]

    // This seed's Quarry health (1000) and this player's (25) cannot be drained by one hand's
    // worth of cash-outs and hits — HAND_SIZE=6 tricks at DAMAGE_PER_HIT=1 caps the player's
    // own loss at 6, and typical card-rank sums never approach a thousand-point cash-out — so
    // the hand reaches its own sixth trick rather than an early terminal resolution.
    expect(tricksResolved).toBe(HAND_SIZE)
    expect(result.finalState.tricksPlayed).toBe(HAND_SIZE)
    expect(result.finalState.phase).toBe(RoundPhase.Complete)
    // AC8's forced end-of-hand cash-out fires even on a hand that took every trick clean, so
    // this is always at least 1 — but the exact count is cross-checked against what the DOM
    // itself showed moving, rather than re-deriving the bank arithmetic in the test.
    expect(result.encounter.damageEventsApplied).toBe(eventsObserved)
    expect(eventsObserved).toBeGreaterThanOrEqual(1)
  })
})
