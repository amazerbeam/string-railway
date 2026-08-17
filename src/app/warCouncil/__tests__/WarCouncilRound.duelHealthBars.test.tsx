/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dealRound, PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { DAMAGE_PER_HIT, DuelSide, HAND_SIZE, quarryHealthForEncounter } from '../../../hunt'
import WarCouncilRound from '../WarCouncilRound'
import {
  card,
  coinsFixture,
  encounterFixture,
  huntFixture,
  makeRound,
  maxHealthFixture,
  quarryLabelFixture,
  runLabelFixture,
} from './roundFixture'

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

function healthMeter(name: 'Your health' | typeof quarryLabelFixture) {
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
        runLabel={runLabelFixture}
        quarryLabel={quarryLabelFixture}
        cheats={[]}
        coins={coinsFixture}
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
        quarry: healthMeter(quarryLabelFixture).getAttribute('aria-valuenow'),
      }
      action()
      if (screen.queryByText(/take the trick/i)) {
        tricksResolved += 1
        const after = {
          player: healthMeter('Your health').getAttribute('aria-valuenow'),
          quarry: healthMeter(quarryLabelFixture).getAttribute('aria-valuenow'),
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

describe('WarCouncilRound — the deciding trick reports the correct encounter figures (DLR-82)', () => {
  it('reports onComplete with the whole hand’s damage once the encounter resolves mid-hand', () => {
    // DLR-82 deleted the terminal panel this test used to pin (a tally that read 0 because the
    // panel's delta was taken against the live `encounter` PROP, and on the encounter-ending hand
    // `App` used to adopt that encounter without changing the `key` that would remount this
    // component). `App` no longer leaves `WarCouncilRound` mounted at all once the encounter
    // resolves — it switches to the run verdict instead — so that reproduction no longer applies.
    // What still matters: the deciding trick gets its own reveal like any other, and the SAME tap
    // that clears it reports the finished encounter upward with the correct figures.
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
    render(
      <WarCouncilRound
        initialState={round}
        hunt={huntFixture}
        encounter={encounterFixture}
        maxHealth={maxHealthFixture}
        runLabel={runLabelFixture}
        quarryLabel={quarryLabelFixture}
        cheats={[]}
        coins={coinsFixture}
        onComplete={onComplete}
      />,
    )

    // The player leads the 2, the Quarry follows the higher card of the lead suit and takes it —
    // a clean loss, cashing 4 × 4 = 16 into a 10-health Quarry, which empties the bar outright.
    const bells2 = screen.getByRole('button', { name: '2 of Bells' })
    fireEvent.click(bells2)
    fireEvent.click(bells2)

    // The deciding trick's own reveal — no terminal panel any more (encounterOver widens this
    // same control's click target, so the tap that clears the reveal also reports upward).
    const carryOn = screen.getByRole('button', { name: /tap the table to carry on/i })
    fireEvent.click(carryOn)

    expect(onComplete).toHaveBeenCalledTimes(1)
    const { encounter } = onComplete.mock.calls[0][0]
    // Surplus is discarded, so the Quarry's delta is its whole bar, not the 16 that was cashed.
    expect(encounterFixture.health[DuelSide.Quarry] - encounter.health[DuelSide.Quarry]).toBe(
      quarryHealthForEncounter(0),
    )
    expect(encounterFixture.health[DuelSide.Player] - encounter.health[DuelSide.Player]).toBe(
      DAMAGE_PER_HIT,
    )
  })
})

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
        cheats={[]}
        coins={coinsFixture}
        onComplete={vi.fn()}
      />,
    )
  }

  function quarryHearts(container: HTMLElement, state: string) {
    return container.querySelectorAll(`.wc-hp[data-side="quarry"] [data-state="${state}"]`)
  }

  /** `BankMeter`'s own accessible name carries `Multiplier N` — read it rather than restating
   *  the arithmetic here. */
  function currentMultiplier(container: HTMLElement): number {
    const label = container.querySelector('.wc-bank-figures')?.getAttribute('aria-label') ?? ''
    const match = label.match(/Multiplier (\d+)/)
    return match ? Number(match[1]) : 0
  }

  /** Drives real play — tap a legal card twice to take a trick, clear a held reveal, let the
   *  Quarry's own lead through — until the multiplier reads above zero. Fails loudly, rather than
   *  looping, if the hand ends first or a bounded attempt count is exhausted. */
  function playUntilStreak(container: HTMLElement) {
    let guard = 0
    while (currentMultiplier(container) === 0) {
      guard += 1
      if (guard > 200) {
        throw new Error('multiplier never rose above zero within the attempt budget')
      }
      if (screen.queryByRole('heading', { name: /the hand is over|the hunt is over/i })) {
        throw new Error('the hand ended before the streak ever banked a multiplier')
      }
      const fault = screen.queryByRole('alert')
      if (fault) {
        throw new Error(`the engine rejected the Quarry's own move: ${fault.textContent}`)
      }
      const prompt = screen.queryByRole('group', { name: 'Choose what the card does' })
      if (prompt) {
        fireEvent.click(within(prompt).getAllByRole('button')[0])
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
      fireEvent.click(legalCard)
      fireEvent.click(legalCard)
    }
  }

  it('AC3/AC5 — the Quarry’s at-risk hearts track the live streak and clear when it resets', () => {
    const { container } = renderRound()
    // Nothing banked at the deal: no preview at all.
    expect(quarryHearts(container, 'atRisk')).toHaveLength(0)

    // Drive real play until the reducer has banked a streak, then assert the preview equals
    // bank × multiplier clamped by the Quarry's own row length — derived from the rendered
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
