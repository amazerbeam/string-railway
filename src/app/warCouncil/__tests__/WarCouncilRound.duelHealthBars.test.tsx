/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dealRound, PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { DAMAGE_PER_HIT, HAND_SIZE, quarryHealthForEncounter } from '../../../hunt'
import WarCouncilRound from '../WarCouncilRound'
import { card, encounterFixture, huntFixture, makeRound, maxHealthFixture } from './roundFixture'

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

    // This seed's hand reaches its own sixth trick rather than an early terminal resolution.
    // NOTE: that is now a property of THIS SEED, not of the arithmetic. The comment here used to
    // argue it from the health totals (1,000 and 25) against rank-sum cash-outs that "never
    // approach a thousand" — both halves died with PT-002, which put both bars at 10 while a
    // six-trick streak pays 36. An unbroken run under a different seed WOULD empty the Quarry
    // early, and this assertion would then fail. The `while` loop above already stops on either
    // panel; it is this line that pins the seed's behaviour.
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

describe('WarCouncilRound — the hand tally survives the parent re-sending the live encounter', () => {
  it('keeps its figures after onComplete, on the hand that ends the encounter', () => {
    // Observed in play: the terminal panel's "Health lost" and "Dealt to the Quarry" both read 0
    // on a hand that plainly did damage. The tally was a delta against the `encounter` PROP, and
    // on the encounter-ending hand `App` sets its own encounter from `onComplete` and then returns
    // early WITHOUT changing the `key` that would remount this component — so the prop became the
    // live value underneath a panel still on screen, and both deltas collapsed to zero. The
    // baseline now lives in the reducer, frozen at mount; this pins that.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 4,
      multiplier: 4,
      tricksPlayed: HAND_SIZE - 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    const onComplete = vi.fn()
    const props = {
      initialState: round,
      hunt: huntFixture,
      encounter: encounterFixture,
      maxHealth: maxHealthFixture,
      onComplete,
    }
    const { container, rerender } = render(<WarCouncilRound {...props} />)

    // The player leads the 2, the Quarry follows the higher card of the lead suit and takes it —
    // a clean loss, cashing 4 × 4 = 16 into a 10-health Quarry, which empties the bar outright.
    const bells2 = screen.getByRole('button', { name: '2 of Bells' })
    fireEvent.click(bells2)
    fireEvent.click(bells2)

    expect(screen.getByRole('heading', { name: /the hunt is over/i })).toBeTruthy()
    const tally = (label: RegExp) =>
      within(screen.getByRole('row', { name: label })).getAllByRole('cell')[1].textContent

    // Surplus is discarded, so the Quarry's delta is its whole bar, not the 16 that was cashed.
    expect(tally(/health lost/i)).toBe(String(DAMAGE_PER_HIT))
    expect(tally(/dealt to the quarry/i)).toBe(String(quarryHealthForEncounter(0)))

    // The terminal panel carries no button, so the carry-on fires from the table — which is what
    // the player clicks next, and what used to zero the figures behind them.
    fireEvent.click(container.querySelector('.wc-table') as HTMLElement)
    expect(onComplete).toHaveBeenCalledTimes(1)

    // Exactly what `App` does with that result: adopt the encounter, leave `key` alone.
    rerender(<WarCouncilRound {...props} encounter={onComplete.mock.calls[0][0].encounter} />)

    expect(screen.getByRole('heading', { name: /the hunt is over/i })).toBeTruthy()
    expect(tally(/health lost/i)).toBe(String(DAMAGE_PER_HIT))
    expect(tally(/dealt to the quarry/i)).toBe(String(quarryHealthForEncounter(0)))
  })
})
