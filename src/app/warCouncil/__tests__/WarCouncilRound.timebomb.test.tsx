/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import { BuffTier, HAND_SIZE, timebombBuff } from '../../../hunt'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import { TIMEBOMB_ARMED_HINT } from '../labels'
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
import { carryOnFromResolution, stubMatchMedia } from './resolutionTestHelpers'

afterEach(cleanup)

stubMatchMedia()

const bronzeTimebomb = timebombBuff(BuffTier.Bronze, 1)

/** Mirrors `WarCouncilRound.test.tsx`'s own `renderRound` helper. DLR-132 — a Timebomb is an
 *  ordinary pile member now, so every test below seeds one through `buffs` rather than a
 *  dedicated `timebombCharges` prop. */
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
      buffs={overrides.buffs ?? [bronzeTimebomb]}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

/** The Timebomb row, in `buffLine` grammar — its name stays matchable across poise/refusal
 *  states because only the trailing clause changes. */
function timebombRow() {
  return screen.getByRole('button', { name: /Timebomb \(/ })
}

/** DLR-114 — Timebomb relocated from the felt rail into the Apply Buff loadout panel. Every
 *  test below must open the panel before it can reach the row. */
function openLoadout() {
  fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
}

describe('WarCouncilRound — the Timebomb row (DLR-90, DLR-132)', () => {
  it('renders the Timebomb row inside the opened loadout panel', () => {
    renderRound()
    openLoadout()
    expect(timebombRow()).toBeTruthy()
  })

  it('is absent from the panel when the pile holds none', () => {
    renderRound({ buffs: [] })
    openLoadout()
    expect(screen.queryByRole('button', { name: /Timebomb \(/ })).toBeNull()
  })

  it('arms on the second click, reporting the armed hint', () => {
    renderRound()
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row) // poise
    fireEvent.click(row) // spend
    expect(screen.getByText(TIMEBOMB_ARMED_HINT)).toBeTruthy()
  })

  it('marks the tapped hand card and leaves the trick unplayed once armed', () => {
    renderRound()
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    const scoreboard = screen.getByRole('group', { name: /tricks won/i })
    expect(scoreboard.textContent).toMatch(/You0/)
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    // DLR-154 R4 — the hand's own render now carries the real fuse count (`HandFan` threads
    // `timebombFuseRemaining`), so the name gains the fuse clause the moment it is set.
    expect(
      screen.getByRole('button', {
        name: '7 of Bells, primed, Timebomb — 2 tricks to play it before it goes off in your hand.',
      }),
    ).toBeTruthy()
    // The trick did not move — marking is not a move.
    expect(scoreboard.textContent).toMatch(/You0/)
  })

  it('is refused once the Quarry has led — 2026-08-26, Cheat is the only mid-trick card', () => {
    // The panel still OPENS mid-trick through `loadoutDoorOpen` (`canAct` alone, since
    // `currentTrick` is non-empty here) — reading what you hold is free. The Timebomb ROW,
    // however, now takes the ordinary between-tricks window: arming it after seeing the lead
    // bought a read the card was never meant to sell.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round })
    openLoadout()
    const row = timebombRow()
    expect(row).toHaveProperty('disabled', true)
    expect(row.getAttribute('aria-label')).toMatch(/Not between tricks\./)
    fireEvent.click(row)
    fireEvent.click(row)
    expect(screen.queryByText(TIMEBOMB_ARMED_HINT)).toBeNull()
  })

  it('cancels the poise on Escape, leaving the panel open — AC18 unwinds ONE level at a time', () => {
    // DLR-148 AC18 — a poised Escape now drops only the poise, not the whole panel: the SECOND
    // Escape (nothing poised) is what closes it. Superseding the pre-DLR-148 behaviour this test
    // used to pin, where Escape closed the panel outright on the first press.
    renderRound()
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row) // poise
    fireEvent.keyDown(row.closest('[role="dialog"]') as Element, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'Your buffs' })).toBeTruthy()
    expect(timebombRow().getAttribute('aria-pressed')).toBe('false')
  })

  // DLR-154 FIX C — the revocation/keyboard group (the Escape/AC13 pair, the FIX A Quarry-to-lead
  // test, and the "row survives a trick sat out" test) moved to
  // `WarCouncilRound.timebombRevoke.test.tsx`, splitting this file back under its 400-line budget
  // — the same reason `buffActivation.timebombLive.test.ts` and
  // `buffActivation.deactivate.test.ts` were split from `buffActivation.test.ts`.

  it('is not rendered at all once a trick reveal is held — AC1, the gallery and the felt stage never contend', () => {
    // Same construction as the base spec's own "plays a legal card" case: the fixture hand's one
    // Bells card completes a trick against the fixture Cpu hand. The panel is opened BEFORE the
    // trick resolves. Pre-DLR-148, a held reveal only narrowed `discardWindowOpen` (and so
    // `loadoutRefusalFor`), greying the Timebomb row while the panel stayed open beside the
    // resolved-trick text. DLR-148 replaces that: `loadoutDoorOpen` is `discardWindowOpen ||
    // canAct`, and a held reveal makes BOTH false, so the gallery is not rendered at all — the
    // felt stage (and its reveal) is the only thing on screen.
    renderRound()
    openLoadout()
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    fireEvent.click(bells7)
    // DLR-156 — the resolution screen replaces the WHOLE felt the instant the trick resolves,
    // taking the gallery with it (rather than the gallery merely narrowing its own door).
    expect(screen.getAllByText(/took it|streak is broken/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('dialog', { name: 'Your buffs' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Timebomb \(/ })).toBeNull()
  })

  it('stops a click inside the open gallery from bubbling to the felt and firing carry-on (stopPropagation)', () => {
    // Quarry-to-lead is the one window where `.wc-table` itself carries an onClick
    // (`handleCarryOn`, armed by `quarryToLead`) AND the gallery can legitimately be open at the
    // same time — `loadoutDoorOpen` is `discardWindowOpen || canAct`, and both hold here, since
    // `discardWindowOpen` doesn't care whose turn it is. Every other open-gallery state has no
    // handler on `.wc-table` to bubble to at all, so this is the only state that can prove the
    // gallery's own `onClick={(e) => e.stopPropagation()}` is doing anything.
    const round = makeRound({ leader: PlayerSide.Cpu, currentTrick: [] })
    renderRound({ initialState: round })
    openLoadout()
    expect(screen.getByRole('dialog', { name: 'Your buffs' })).toBeTruthy()
    expect(screen.getByText('4 held')).toBeTruthy() // the Cpu's opening hand size

    fireEvent.click(screen.getByRole('heading', { name: /your buffs/i }))

    // If the click had bubbled, `.wc-table`'s handleCarryOn would have committed the Quarry's
    // pending lead, moving one card out of its hand and closing the quarry-to-lead window.
    expect(screen.getByText('4 held')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Your buffs' })).toBeTruthy()
  })

  it('AC5 — a marked card the Quarry wins cleanly costs nothing: no damage, total and roll stand', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      total: 3,
      roll: 2,
      tricksPlayed: 0,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2), card(Suit.Bells, 4)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 6), card(Suit.Bells, 7)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })

    const playerHealthBefore = screen
      .getByRole('meter', { name: 'Your health' })
      .getAttribute('aria-valuenow')
    // total(3) x roll(2) = 6.
    expect(screen.getByLabelText(/pot stands at 6\b/i)).toBeTruthy()

    // Mark the 2 of Bells, then play it.
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    const bells2 = screen.getByRole('button', { name: '2 of Bells' })
    fireEvent.click(bells2)
    // DLR-154 R4 — the real fuse count is threaded through the hand as soon as the card is primed.
    const markedBells2 = screen.getByRole('button', {
      name: '2 of Bells, primed, Timebomb — 2 tricks to play it before it goes off in your hand.',
    })
    fireEvent.click(markedBells2)
    fireEvent.click(markedBells2)

    // DLR-156 B2 — AC5's replaced clean loss has no `trickDamage` (it is not a TAKEN outcome),
    // but `resolveTrickBank`'s `replaced` branch skips the streak reset entirely — nothing was
    // actually lost. The screen must say so rather than narrating a break that never happened.
    expect(screen.getAllByText(/nothing changed/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/streak is broken/i)).toBeNull()
    carryOnFromResolution()

    // Neither the player's health nor the total moved: AC5's replaced clean loss.
    expect(screen.getByRole('meter', { name: 'Your health' }).getAttribute('aria-valuenow')).toBe(
      playerHealthBefore,
    )
    expect(screen.getByLabelText(/pot stands at 6\b/i)).toBeTruthy()
  })

  it('threads a marked card into the decree when the Fox exchanges it in (regression — DecreePile wiring)', () => {
    // The reachable path the DecreePile-wiring defect actually hides behind: mark a card, then
    // give it away via the Fox so it BECOMES the decree. A prop-only test on `DecreePile` cannot
    // catch this — the bug was in `WarCouncilRound` never passing `primed` at its mount, not in
    // `DecreePile` itself.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2), card(Suit.Keys, 3)], // Keys 3 is the Fox.
        [PlayerSide.Cpu]: [card(Suit.Moons, 9), card(Suit.Moons, 10)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })

    // Mark the 2 of Bells with Timebomb.
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    fireEvent.click(screen.getByRole('button', { name: '2 of Bells' }))
    // DLR-154 R4 — the hand's own render carries the real fuse count as soon as the card is
    // primed. The Fox's exchange prompt below (`AbilityPrompt`) and `DecreePile` do not pass
    // `fuseRemaining` (Task 18 threads it through `HandFan` only), so both stay unfused.
    expect(
      screen.getByRole('button', {
        name: '2 of Bells, primed, Timebomb — 2 tricks to play it before it goes off in your hand.',
      }),
    ).toBeTruthy()

    // Lead the Fox, then exchange the marked card into the decree.
    const fox = screen.getByRole('button', { name: '3 of Keys (Fox)' })
    fireEvent.click(fox)
    fireEvent.click(fox)
    fireEvent.click(screen.getByRole('button', { name: '2 of Bells, primed' }))

    // DLR-156 — the Fox's own commit resolves the trick in the same transition (the player led,
    // so the Quarry's forced follow completes it), handing off to the resolution screen; the
    // decree pile lives on the felt, so dismiss it before reading the felt again.
    carryOnFromResolution()

    // The decree pile — not the hand fan, which no longer holds this card — must still announce
    // the mark. Exactly one match: the marked card left the hand when it became the decree.
    expect(screen.getByRole('button', { name: '2 of Bells, primed' })).toBeTruthy()
  })

  it("names the card on the riding row's own remove button too, not just on Escape — FIX 4", () => {
    renderRound()
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    fireEvent.click(screen.getByRole('button', { name: '7 of Bells' }))

    fireEvent.click(
      screen.getByRole('button', { name: 'Take the Timebomb back off the 7 of Bells' }),
    )

    expect(screen.getByText('Timebomb taken off the 7 of Bells.')).toBeTruthy()
  })

  it('reports onComplete with the Timebomb spent from the pile — DLR-142, single-use by default', () => {
    const onComplete = vi.fn()
    const round = makeRound({
      tricksPlayed: HAND_SIZE - 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 7)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 4)],
      },
    })
    renderRound({ initialState: round, onComplete })

    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    fireEvent.click(bells7)
    // DLR-154 R4 — the real fuse count is threaded through the hand as soon as the card is primed.
    const marked = screen.getByRole('button', {
      name: '7 of Bells, primed, Timebomb — 2 tricks to play it before it goes off in your hand.',
    })
    fireEvent.click(marked)
    fireEvent.click(marked)

    // DLR-156 — the deciding trick hands off to the resolution screen; dismissing it clears the
    // held reveal AND finds the hand already complete (`roundReducer.ts`'s Task 15 chaining), so
    // the hand-over panel appears directly with no second felt-side tap.
    carryOnFromResolution()
    fireEvent.click(screen.getByRole('button', { name: 'Deal the next Hunt' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].buffs).toEqual([])
  })
})
