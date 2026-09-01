/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import { BuffTier, timebombBuff } from '../../../hunt'
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

// DLR-154 FIX C — split out of `WarCouncilRound.timebomb.test.tsx`, which the FIX A2/FIX B work on
// this ticket pushed over its 400-line budget. This is the revocation/keyboard group: the
// Escape/AC13 pair, the FIX A Quarry-to-lead test, and the "row survives a trick sat out" test —
// mirroring the split `buffActivation.timebombLive.test.ts` and `buffActivation.deactivate.test.ts`
// already made from `buffActivation.test.ts` for the identical reason. Helpers are duplicated
// rather than imported from the sibling spec, matching that precedent's own choice.

afterEach(cleanup)

stubMatchMedia()

const bronzeTimebomb = timebombBuff(BuffTier.Bronze, 1)

/** Mirrors `WarCouncilRound.timebomb.test.tsx`'s own `renderRound` helper. */
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

describe('WarCouncilRound — Timebomb revocation and keyboard reach (DLR-90, DLR-132, DLR-154)', () => {
  it('takes the Timebomb back rather than stranding it when Escape is pressed while priming — AC13', () => {
    renderRound()
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row) // poise
    fireEvent.click(row) // spend
    expect(screen.getByText(TIMEBOMB_ARMED_HINT)).toBeTruthy()

    const hand = screen.getByRole('group', { name: /your hand/i })
    fireEvent.keyDown(hand, { key: 'Escape' })

    expect(screen.queryByText(TIMEBOMB_ARMED_HINT)).toBeNull()
    // The card returns to the pile: the loadout panel (still open) offers it again.
    expect(timebombRow()).toBeTruthy()
    // FIX 3/FIX 4 — `Escape` must announce the reversal through the hand's own `aria-live`
    // region, exactly as the riding row's own remove button does — not reverse the felt in
    // silence. FIX 4 — `timebombRemovedText`, not the generic `buffRemovedText`, so a screen
    // reader is told a card was taken back rather than "Bronze taken off the trick".
    expect(screen.getByText('Timebomb taken back.')).toBeTruthy()
  })

  it('takes a primed Timebomb back on Escape too, lifting the mark — AC5/AC13', () => {
    renderRound()
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    fireEvent.click(screen.getByRole('button', { name: '7 of Bells' }))
    expect(
      screen.getByRole('button', {
        name: '7 of Bells, primed, Timebomb — 2 tricks to play it before it goes off in your hand.',
      }),
    ).toBeTruthy()

    const hand = screen.getByRole('group', { name: /your hand/i })
    fireEvent.keyDown(hand, { key: 'Escape' })

    expect(screen.queryByRole('button', { name: /primed/i })).toBeNull()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toBeTruthy()
    // FIX 3/FIX 4 — names the card taken back, through `timebombRemovedText`, not the generic
    // "Bronze taken off the trick — nothing went dark" `buffRemovedText` would have said.
    expect(screen.getByText('Timebomb taken off the 7 of Bells.')).toBeTruthy()
  })

  it('keeps the hand tappable and focusable while a Timebomb is armed during the Quarry-to-lead gap — FIX 1', () => {
    // QA (live browser) — every hand card rendered the literal HTML `disabled` attribute and was
    // excluded from keyboard tab order in exactly this window, because `handInteractive` read
    // `interactive || discardSelecting(ui)` and never `timebombArmed(ui)`. `leader: PlayerSide.Cpu`
    // with an empty `currentTrick` IS the Quarry-to-lead gap: `interactive` (canAct) is false
    // because it is not the player's turn, but the felt is between tricks, so the panel — and the
    // arming this test does — is reachable exactly as `loadoutDoorOpen`'s own tests already pin.
    const round = makeRound({ leader: PlayerSide.Cpu, currentTrick: [] })
    renderRound({ initialState: round })
    openLoadout()
    const row = timebombRow()
    fireEvent.click(row) // poise
    fireEvent.click(row) // spend
    expect(screen.getByText(TIMEBOMB_ARMED_HINT)).toBeTruthy()

    // Scoped to the hand's own group: a felt-rail widget elsewhere on screen (e.g. a condensed
    // spent-pile card) can share the same "N of Suit" accessible-name shape and is legitimately
    // `disabled` (`variant="table"`/`"pile"` are always `condensed`) — unrelated to this fix.
    const hand = screen.getByRole('group', { name: /your hand/i })
    const handCards = within(hand).getAllByRole('button', { name: /^\d+ of /i })
    expect(handCards.length).toBeGreaterThan(0)
    for (const button of handCards) {
      // Asserting the `disabled` PROPERTY itself, not merely that a click "worked" — a `fireEvent`
      // on a `disabled` button fires no handler and passes vacuously, which is exactly how the
      // suite missed this the first time.
      expect(button).toHaveProperty('disabled', false)
    }
    // The roving tabindex's own tab stop — exactly one card is `tabIndex 0` and reachable by
    // keyboard, which a `disabled` button can never be regardless of its `tabIndex` attribute.
    expect(handCards.some((button) => button.tabIndex === 0)).toBe(true)

    // DLR-154 FIX A2 — named and scoped to the hand, not `/primed/i` against the whole document:
    // the riding row's own remove button is ALREADY labelled "Take the Timebomb back — nothing is
    // primed yet" (`timebombRemoveLabel(null)`) before this click, so an unscoped `/primed/i` query
    // matches once whether the prime succeeded or not and the assertion cannot fail against the
    // unfixed reducer. Naming the exact card, inside `hand`, fails honestly when the tap is
    // silently swallowed by `canAct`'s guard.
    fireEvent.click(handCards[0])
    expect(
      within(hand).getByRole('button', {
        name: '2 of Bells, primed, Timebomb — 2 tricks to play it before it goes off in your hand.',
      }),
    ).toBeTruthy()
  })

  it('keeps the riding row and its remove control alive across a trick the primed card sits out — FIX 2', () => {
    // The Defender's reproduction: arm, prime, then resolve a trick the marked card is NOT part
    // of. `openBuffWindow` clears `activatedThisTrick` at that resolution, which is what the
    // riding row used to be derived from — the row went entirely absent, taking its remove
    // control (and Escape's target) with it.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2), card(Suit.Bells, 4)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 6), card(Suit.Bells, 7)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })

    openLoadout()
    const row = timebombRow()
    fireEvent.click(row)
    fireEvent.click(row)
    fireEvent.click(screen.getByRole('button', { name: '2 of Bells' }))

    // Play the OTHER card — the marked 2 of Bells sits this trick out.
    const bells4 = screen.getByRole('button', { name: '4 of Bells' })
    fireEvent.click(bells4)
    fireEvent.click(bells4)
    // DLR-156 — hands off to the resolution screen rather than a held felt-side reveal.
    expect(screen.getAllByText(/took it|streak is broken/i).length).toBeGreaterThan(0)
    carryOnFromResolution()

    // AC13/FIX 2 — the row survives the trick boundary, still naming its target.
    expect(screen.getByRole('group', { name: 'Riding this trick' })).toBeTruthy()
    expect(screen.getByText(/Riding the 2 of Bells/)).toBeTruthy()

    const hand = screen.getByRole('group', { name: /your hand/i })
    fireEvent.keyDown(hand, { key: 'Escape' })

    expect(screen.queryByRole('group', { name: 'Riding this trick' })).toBeNull()
    expect(screen.getByRole('button', { name: '2 of Bells' })).toBeTruthy()
  })
})
