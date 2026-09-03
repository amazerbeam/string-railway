/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACTIVATED_BUFF_CONDITION,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  cheatBuff,
  type Buff,
} from '../../../hunt'
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
  quarryLabelFixture,
  runLabelFixture,
} from './roundFixture'
import { advanceTrickDwell, stubMatchMedia } from './resolutionTestHelpers'

afterEach(cleanup)

stubMatchMedia()

// DLR-156 play-test fix 1 — see `WarCouncilRound.test.tsx`'s own comment on this pair.
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const cheatBuffFixture = cheatBuff(BuffTier.Bronze, 1)

/** A Ward, minted by hand rather than through `mintFromTemplate` — Ward has no template
 *  (DLR-120 scope boundary), so `buffHandlers.test.ts`'s own `itemBuff` pattern is the way every
 *  spec in this codebase builds one. Used ONLY below, where the test's whole point is the
 *  ordinary between-tricks window — Cheat is DLR-132's one exception to it (see
 *  `roundUiState.ts`'s `buffActivationWindowOpen`), so they cannot stand in for "any buff" here. */
function wardBuffFixture(): Buff {
  return {
    id: 9,
    kind: BuffKind.Ward,
    tier: BuffTier.Bronze,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.None, value: 0 },
  }
}

/** Mirrors `WarCouncilRound.test.tsx`'s own `renderRound` helper, adding the one prop this
 *  spec file exists to exercise. */
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
      buffs={overrides.buffs ?? [cheatBuffFixture]}
      onComplete={overrides.onComplete ?? vi.fn()}
    />,
  )
}

describe('WarCouncilRound — the action bar (DLR-114)', () => {
  it('renders the Actions group with its three buttons on a freshly mounted hand', () => {
    renderRound()
    const bar = screen.getByRole('group', { name: 'Actions' })
    expect(within(bar).getAllByRole('button').length).toBe(3)
  })

  it('the old felt-rail widgets are gone — DLR-132 folded Cheat into the row list', () => {
    renderRound()
    expect(screen.queryByRole('group', { name: 'Cheats' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    // Still gone with the panel open — it is not its own group any more, just an ordinary row.
    expect(screen.queryByRole('group', { name: 'Cheats' })).toBeNull()
  })

  it('clicking Apply Buff opens the "Your buffs" dialog, revealing the Cheat row in buffLine grammar', () => {
    renderRound()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    expect(within(dialog).getByRole('button', { name: /Cheat \(/ })).toBeTruthy()
  })

  it('the loadout dialog text contains neither "AP" nor "action point" (DLR-145 AC2)', () => {
    renderRound()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    expect(dialog.textContent).not.toContain('AP')
    expect(dialog.textContent).not.toContain('action point')
  })

  it("activating the held Cheat buff twice SPENDS the card — DLR-145 AC2/AC10, no AP cost any more, and Apply Buff's held figure drops", () => {
    renderRound()
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))

    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    const row = within(dialog).getByRole('button', { name: /Cheat/i, hidden: false })
    // Sanity: the row states no AP cost — DLR-145 removed it from buffLine's grammar.
    expect(row.getAttribute('aria-label')).not.toContain('AP')
    expect(row.getAttribute('aria-label')).not.toContain('action point')

    fireEvent.click(row) // poise
    fireEvent.click(row) // commit — the card leaves the pile for the rest of the run

    expect(
      screen.getByRole('button', { name: /apply buff/i }).getAttribute('aria-label'),
    ).toContain('0 buffs held')
  })

  it('mid-trick: Apply Buff stays enabled and opens the panel, while an ordinary buff card is fenced with "not between tricks" (DLR-114 door widening)', () => {
    // The player is following an already-committed lead — `currentTrick` is non-empty, so
    // `discardWindowOpen` is false, but `canAct` is true. `loadoutDoorOpen` reads either, so the
    // door widens while an ORDINARY card's activation window (`loadoutRefusalFor`, unchanged for
    // every condition/consumable card) stays shut. A Ward stands in here rather than the Cheat
    // fixture every other spec in this file uses, because Cheat is DLR-132's one exception to
    // this exact gate.
    //
    // DLR-148 — the refused row's own `<p>` is gone: a fenced card carries no per-card reason any
    // more, only the fence's ONE shared-reason line, which also states the count (AC8).
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round, buffs: [wardBuffFixture()] })

    const applyBuff = screen.getByRole('button', { name: /apply buff/i })
    expect(applyBuff).toHaveProperty('disabled', false)

    fireEvent.click(applyBuff)
    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    const row = within(dialog).getByRole('button', { name: /Ward/i })
    expect(row).toHaveProperty('disabled', true)
    expect(within(dialog).getByText(/1 card — not between tricks/i)).toBeTruthy()
  })

  it('mid-trick: a Cheat row stays live, following an already-committed lead — DLR-132, the one moment it has value', () => {
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    renderRound({ initialState: round })

    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    const dialog = screen.getByRole('dialog', { name: 'Your buffs' })
    const row = within(dialog).getByRole('button', { name: /Cheat \(/ })
    expect(row).toHaveProperty('disabled', false)
  })

  it('tapping a hand card once enables Cards; clicking it plays the card', () => {
    renderRound({ initialState: makeRound() })
    fireEvent.click(screen.getByRole('button', { name: '7 of Bells' }))

    const cardsButton = screen.getByRole('button', { name: /play the 7 of bells/i })
    expect((cardsButton as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(cardsButton)
    advanceTrickDwell()

    // DLR-156 — a two-card trick resolves the instant the player leads (the Quarry's follow is
    // committed in the same reducer transition). DLR-160 AC11 — the felt's own well and the
    // resolution panel now say the same outcome word at once (both read `resolutionOutcome.ts`),
    // so this reads `getAllByText` rather than `getByText`.
    expect(screen.getAllByText(/took it|streak is broken/i).length).toBeGreaterThan(0)
  })
})
