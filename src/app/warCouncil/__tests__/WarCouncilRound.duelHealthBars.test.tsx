/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dealRound, PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { DAMAGE_PER_HIT, DuelSide, HAND_SIZE, PLAYER_HAND_FLOOR } from '../../../hunt'
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

// DLR-80's full-hand, six-trick end-to-end pass — carved into its own file for the same reason
// DLR-71 first split it off `WarCouncilRound.test.tsx`: the driving-loop apparatus for a full
// hand pushes that file back over the 400-line budget if it lives beside every other spec.
//
// DLR-160 QA fix — the Quarry's at-risk-preview describe block that used to live here (DLR-86)
// moved out to its own sibling, `WarCouncilRound.quarryAtRiskPreview.test.tsx`, once this file's
// own Task 3 growth pushed it to 409 lines. Same precedent, same reason.

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
        coins={coinsFixture}
        baseDamageBonus={baseDamageBonusFixture}
        discardsRemaining={discardsRemainingFixture}
        buffs={[]}
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
     *  how two of six tricks went silently uncounted before this was written this way.
     *
     *  DLR-156 — a resolved trick now hands off to the resolution screen, which replaces the
     *  felt (and its meters) until dismissed. Apply is pressed whenever it is offered — the OLD
     *  automatic end-of-hand cash-out (AC8) is gone, and applying every winning trick immediately
     *  is what keeps this loop's damage-event count meaningful: `applyPot` zeroes the streak on
     *  each use, so the payout never compounds and stays small enough that a 10-health Quarry is
     *  not put at real risk of an early kill by this strategy, which is what keeps this SEED's own
     *  premise — the hand reaches its own sixth trick — true under the new rule too. */
    function resolveIfShown(action: () => void) {
      const before = {
        player: healthMeter('Your health').getAttribute('aria-valuenow'),
        quarry: healthMeter(quarryLabelFixture).getAttribute('aria-valuenow'),
      }
      action()
      // DLR-156 play-test fix 1 — a resolved trick no longer hands off to the resolution screen
      // instantly; `--wc-trick-dwell` holds the felt (showing the just-played card landed in the
      // well) for a beat first. Advancing past it here is what makes this check meaningful again —
      // without it, every commit would read as "nothing resolved" and the loop would never press
      // Apply/Onward at all.
      advanceTrickDwell()
      if (screen.queryAllByText(/took it|streak is broken/i).length === 0) return
      tricksResolved += 1
      withResolveHold(() => {
        const applyBtn = screen.queryByRole('button', { name: /apply damage/i })
        if (applyBtn) {
          fireEvent.click(applyBtn)
        } else {
          fireEvent.click(screen.getByRole('button', { name: /onward/i }))
        }
      })
      // The dismissal can itself end the encounter, in which case the felt returns still
      // holding THIS SAME reveal (`roundReducer.ts`'s Task 15 chaining) — the outer loop's own
      // `stillHeld` branch is what reports `onComplete` for that case, so meters are read only
      // once the felt is genuinely back and interactive. DLR-160 AC1 — the control is a real
      // button named "Carry on" now, not a hint advertising a tap on the table.
      if (screen.queryByRole('button', { name: /^carry on$/i })) return
      const after = {
        player: healthMeter('Your health').getAttribute('aria-valuenow'),
        quarry: healthMeter(quarryLabelFixture).getAttribute('aria-valuenow'),
      }
      if (after.player !== before.player || after.quarry !== before.quarry) {
        eventsObserved += 1
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
      // DLR-156 — an Apply that killed the Quarry mid-hand leaves the reveal held; this SAME tap
      // reports `onComplete` directly (`WarCouncilTable.tsx`'s own `handleCarryOn`), so the loop
      // stops here rather than continuing to drive a component whose hand is already reported.
      // DLR-160 AC1 — a real button named "Carry on" now.
      const stillHeld = screen.queryByRole('button', { name: /^carry on$/i })
      if (stillHeld) {
        fireEvent.click(stillHeld)
        break
      }
      // DLR-163 — the ability prompt is the 3's suit picker now, and its group is named for it.
      const prompt = screen.queryByRole('group', { name: 'Name the new trump suit' })
      if (prompt) {
        const choice = within(prompt).getAllByRole('button')[0]
        resolveIfShown(() => fireEvent.click(choice))
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

    // The "Deal the next Hunt" tap is only reachable when the hand genuinely reached its own
    // sixth trick — the `stillHeld` branch above already reported `onComplete` and broke the loop
    // for a mid-hand kill, in which case there is no hand-over panel to close.
    const dealNext = screen.queryByRole('button', { name: 'Deal the next Hunt' })
    if (dealNext) {
      fireEvent.click(dealNext)
    }
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
    // itself showed moving, rather than re-deriving the total arithmetic in the test.
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
    //
    // DLR-91/D7 — a single trick that both damages the player AND empties the Quarry is no longer
    // reachable as one event: the Quarry depletes FIRST, and a Quarry that goes down on an event
    // spares the player that event's damage. This is now driven as TWO tricks, the same split
    // `run.test.ts`'s `winEncounter` helper uses for the pure-function case: trick A is a clean
    // loss the player takes DAMAGE_PER_HIT for, non-lethal to the Quarry (total/roll are both
    // zero, so it cashes nothing); trick B is the killing blow ALONE, a clean win for the player
    // (so `damageToPlayer` is zero) whose forced end-of-hand cash-out (AC8) still empties the
    // Quarry's bar. The Quarry's starting health is set low (1) for this fixture specifically so
    // trick B's modest, organically-built total (1 × 1) is enough to finish it without needing an
    // implausible run of prior wins — the health total does not have to be the real encounter-0
    // figure to prove the point, since only the two damage DELTAS are asserted.
    const startingEncounter = {
      ...encounterFixture,
      health: { ...encounterFixture.health, [DuelSide.Quarry]: 1 },
    }
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      total: 0,
      roll: 0,
      tricksPlayed: HAND_SIZE - 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2), card(Suit.Moons, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9), card(Suit.Moons, 10)],
      },
      currentTrick: [],
    })
    const onComplete = vi.fn()
    render(
      <WarCouncilRound
        initialState={round}
        hunt={huntFixture}
        encounter={startingEncounter}
        maxHealth={maxHealthFixture}
        runLabel={runLabelFixture}
        quarryLabel={quarryLabelFixture}
        coins={coinsFixture}
        baseDamageBonus={baseDamageBonusFixture}
        discardsRemaining={discardsRemainingFixture}
        buffs={[]}
        onComplete={onComplete}
      />,
    )

    // Trick A — the player leads the 2, the Quarry follows the higher card of the lead suit and
    // takes it: a clean loss, costing the player DAMAGE_PER_HIT and wiping the streak for
    // nothing (AC7 — total and roll both start at zero anyway). The hurt branch offers no
    // choice; its single "Onward" IS `RollOver`, which `roundReducer.ts`'s Task 15 chaining runs
    // straight through `handleCarryOn` — clearing the reveal AND committing the Quarry's own lead
    // for trick B in the SAME dispatch, since it is now the Quarry's turn with an empty trick on
    // the table. No separate felt-side tap is needed between the two tricks any more.
    const bells2 = screen.getByRole('button', { name: '2 of Bells' })
    fireEvent.click(bells2)
    fireEvent.click(bells2)
    advanceTrickDwell()
    withResolveHold(() => fireEvent.click(screen.getByRole('button', { name: /onward/i })))
    // DLR-160 AC1b — `RollOver` no longer lays the Quarry's card in the same dispatch that closes
    // the panel (`roundReducer.ts`), so the between-tricks arming window is genuinely open here.
    // The felt's own "Let them lead" control is what commits it — a separate, explicit tap.
    fireEvent.click(screen.getByRole('button', { name: /let them lead/i }))

    // Trick B — the player follows the Quarry's led 10 with the Moons 11 and takes it cleanly, so
    // `damageToPlayer` is zero for this event. DLR-156 AC5 — pressing Apply Damage is what pays
    // the pot (total 1 × roll 1, from this single win) to the Quarry — the killing blow, alone;
    // there is no longer an automatic end-of-hand cash-out to rely on.
    const moons11 = screen.getByRole('button', { name: '11 of Moons (Monarch)' })
    fireEvent.click(moons11)
    fireEvent.click(moons11)
    advanceTrickDwell()
    withResolveHold(() => fireEvent.click(screen.getByRole('button', { name: /apply damage/i })))

    // Applying the pot killed the Quarry — the deciding trick's own reveal survives on the felt
    // (`roundReducer.ts`'s Task 15 chaining preserves it exactly then), and its "Carry on" button
    // is what reports `onComplete` (encounterOver widens this same control's click target, so the
    // tap that clears the reveal also reports upward). DLR-160 AC1 — a real button now, not a
    // hint advertising a tap on the table.
    const carryOn = screen.getByRole('button', { name: /^carry on$/i })
    fireEvent.click(carryOn)

    expect(onComplete).toHaveBeenCalledTimes(1)
    const { encounter, unplayedAtResolve } = onComplete.mock.calls[0][0]
    expect(startingEncounter.health[DuelSide.Quarry] - encounter.health[DuelSide.Quarry]).toBe(
      startingEncounter.health[DuelSide.Quarry],
    )
    expect(startingEncounter.health[DuelSide.Player] - encounter.health[DuelSide.Player]).toBe(
      DAMAGE_PER_HIT,
    )
    // DLR-95 AC2 — the killing blow is this hand's last trick (trick B), which never refills. But
    // trick A, the trick before it, is non-final, so `playCard`'s refill tops the player's hand
    // back up to PLAYER_HAND_FLOOR before trick B is even played (the deck here has plenty of
    // cards to draw). DLR-146 — this used to be a bare `0`, correct only when nothing ever
    // refills; re-derived so it collapses back to `0` at PLAYER_HAND_FLOOR = 0, where the `<` test
    // in `playCard`'s refill is unreachable and trick A's played-down hand of 1 stays 1.
    const playerHandAfterTrickA = round.hands[PlayerSide.Player].length - 1
    const handSizeBeforeTrickB = Math.max(playerHandAfterTrickA, PLAYER_HAND_FLOOR)
    expect(unplayedAtResolve).toBe(handSizeBeforeTrickB - 1)
  })
})
