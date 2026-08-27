/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, RoundPhase, Suit } from '../../../warCouncil'
import {
  BuffTier,
  cheatBuff,
  DAMAGE_PER_HIT,
  HAND_SIZE,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
} from '../../../hunt'
import type { WarCouncilMountProps } from '../../warCouncilMount'
import { cardAccessibleName } from '../labels'
import WarCouncilRound from '../WarCouncilRound'
import {
  bankClimbBonusFixture,
  bankedRound,
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

afterEach(cleanup)

/**
 * Mirrors `WarCouncilRound.test.tsx`'s own `renderRound` helper (DLR-93 400-line split) — the
 * health-bar, purse, and shape/bank-readout, carved out on their own concern.
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

function healthMeter(name: 'Your health' | typeof quarryLabelFixture) {
  return screen.getByRole('meter', { name })
}

/** DLR-114 — the Cheat rail relocated from the felt rail into the Apply Buff loadout panel. */
function openLoadout() {
  fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
}

describe('WarCouncilRound', () => {
  it('shows both health bars from the first render', () => {
    renderRound()
    expect(healthMeter('Your health')).toBeTruthy()
    expect(healthMeter(quarryLabelFixture)).toBeTruthy()
  })

  it('renders the purse plate showing the coins prop it was mounted with (DLR-84 AC2)', () => {
    renderRound({ coins: 7 })
    // Scoped to the plate labelled "Coins" rather than a bare `getByText('7')`, which also
    // matches the "7 of Bells" card in the dealt hand.
    const coinsPlate = screen.getByText('Coins').closest('.wc-coins')
    expect(coinsPlate?.textContent).toMatch(/7/)
  })

  it('leaves both bars untouched on a clean take — the bank climbs, not health', () => {
    // Bells 9 is the Witch: a single Witch acts as an effective trump, so this trick's
    // outcome is deterministic regardless of the fixture's own trump suit (Keys, here) —
    // the same construction `roundReducer.test.ts`'s own bank specs use.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })
    const playerBefore = healthMeter('Your health').getAttribute('aria-valuenow')
    const quarryBefore = healthMeter(quarryLabelFixture).getAttribute('aria-valuenow')
    const bells9 = screen.getByRole('button', { name: '9 of Bells (Witch)' })
    fireEvent.click(bells9)
    fireEvent.click(bells9)
    expect(screen.getByText(/take the trick/i)).toBeDefined()
    expect(healthMeter('Your health').getAttribute('aria-valuenow')).toBe(playerBefore)
    expect(healthMeter(quarryLabelFixture).getAttribute('aria-valuenow')).toBe(quarryBefore)
  })

  it('moves the player’s bar by exactly one hit on a lost clean trick, and cashes the bank into the Quarry (AC6)', () => {
    // The deciding sixth trick: each hand holds exactly its last card, so after it resolves
    // neither side has a next lead to read — `quarryIntent` would otherwise be asked for the
    // Quarry's empty-handed "next" lead and throw, exactly the empty-legal-set crash
    // `chooseCpuCard`'s own docblock warns `lowestCard([])` produces.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 2,
      multiplier: 2,
      tricksPlayed: HAND_SIZE - 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })
    const bells2 = screen.getByRole('button', { name: '2 of Bells' })
    fireEvent.click(bells2)
    fireEvent.click(bells2)
    expect(screen.getByText(/take the trick/i)).toBeDefined()
    expect(Number(healthMeter('Your health').getAttribute('aria-valuenow'))).toBe(
      PLAYER_START_HEALTH - DAMAGE_PER_HIT,
    )
    // DLR-94 AC4 — a forced hit pays two-thirds of 2 x 2, floored: 2.
    expect(Number(healthMeter(quarryLabelFixture).getAttribute('aria-valuenow'))).toBe(
      quarryHealthForEncounter(0) - 2,
    )
  })

  it('renders the shape readout for the dealt hand, and the bank readout climbs on a taken trick (DLR-80 Task 20)', () => {
    // Same Witch-beats-anything construction as the clean-take spec above: deterministic
    // regardless of the fixture's own trump suit, so this only exercises the two new readouts.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    renderRound({ initialState: round })

    // AC11 — the shape readout is on screen before any card is played, and never shows a rank.
    expect(screen.getByText(/Bells: 1 held, none skulled/i)).toBeTruthy()

    // The bank readout's cash figure (bank × multiplier) starts at zero, before any trick.
    expect(screen.getByLabelText(/cashes for 0/i)).toBeTruthy()

    const bells9 = screen.getByRole('button', { name: '9 of Bells (Witch)' })
    fireEvent.click(bells9)
    fireEvent.click(bells9)
    expect(screen.getByText(/take the trick/i)).toBeDefined()

    // …and climbs the instant the trick is taken: PT-002 banks 1 per trick taken, so one trick
    // into the streak reads bank 1 × multiplier 1 = 1, not a rank sum.
    expect(screen.getByLabelText(/cashes for 1\b/i)).toBeTruthy()
  })

  it('makes a forbidden card playable once a Cheat is spent (AC5, DLR-132)', () => {
    // Same construction as "disables a card the engine says is illegal" above: the player is
    // forced to follow Moons, so their sole Bells card is genuinely forbidden without a Cheat.
    // The loadout panel opens through `loadoutDoorOpen` — canAct alone, since currentTrick is
    // non-empty here — restoring the pre-DLR-114 reach: a Cheat is spent FOLLOWING a forced
    // off-suit lead, the only moment breaking follow-suit has value.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    const cheat = cheatBuff(BuffTier.Bronze, 1)
    renderRound({ initialState: round, buffs: [cheat] })

    const offSuitName = cardAccessibleName(card(Suit.Bells, 7))
    const offSuit = screen.getByRole('button', { name: offSuitName })
    expect(offSuit).toHaveProperty('disabled', true)

    openLoadout()
    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    const row = screen.getByRole('button', { name: /Cheat \(/ })
    expect(row.closest('[role="dialog"]')).toBe(dialog)
    fireEvent.click(row) // poise
    fireEvent.click(row) // spend

    expect(screen.getByRole('button', { name: offSuitName })).toHaveProperty('disabled', false)
  })

  // DLR-149 joins its own rule-text id into `aria-describedby` alongside the damage-strip id
  // (AC8), so `aria-describedby` now names more than one id — `describedByText` resolves and
  // concatenates every one of them, the same way the accessible-description computation would.
  it('describes a hand card with its win/lose damage readout (DLR-117 AC2)', () => {
    renderRound({ initialState: bankedRound(3, 2) })
    const bells7 = screen.getByRole('button', { name: '7 of Bells' })
    const description = describedByText(bells7)
    expect(description).toBeTruthy()
    expect(description).toMatch(/If you win this trick:/)
    expect(description).toMatch(/If you lose:/)
  })

  it('changes the readout live when the seeded bank changes, with no effect or memoisation (DLR-117 AC2)', () => {
    renderRound({ initialState: bankedRound(0, 0) })
    const emptyBankDescription = describedByText(screen.getByRole('button', { name: '7 of Bells' }))
    cleanup()

    renderRound({ initialState: bankedRound(3, 2) })
    const seededBankDescription = describedByText(
      screen.getByRole('button', { name: '7 of Bells' }),
    )

    expect(seededBankDescription).not.toBe(emptyBankDescription)
  })
})

function describedByText(element: HTMLElement): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
}
