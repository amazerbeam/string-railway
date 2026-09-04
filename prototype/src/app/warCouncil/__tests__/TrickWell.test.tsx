/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, Suit, TrickOutcome } from '../../../warCouncil'
import { BuffTier, mintFromTemplate, templateById, type Buff } from '../../../hunt'
import { MotionAnchorProvider } from '../MotionAnchors'
import type { ResolvedTrick } from '../roundUiState'
import TrickWell from '../TrickWell'

// Same construction idiom as `buffRoundState.test.ts`'s own `buff` helper.
const buff = (id: string, tier: BuffTier, buffId: number): Buff =>
  mintFromTemplate(templateById(id)!, tier, buffId)

const bellHigh = buff('suitHigh:bells:multiplier', BuffTier.Bronze, 1)

afterEach(cleanup)

const resolvedTrick: ResolvedTrick = {
  cards: [
    { side: PlayerSide.Player, card: { suit: Suit.Bells, rank: 7 } },
    { side: PlayerSide.Cpu, card: { suit: Suit.Keys, rank: 2 } },
  ],
  winner: PlayerSide.Cpu,
  resolution: {
    outcome: TrickOutcome.LowDefeat,
    trickDamage: null,
    cashOut: 0,
    damageToPlayer: 1,
    total: 0,
    roll: 0,
    buffAccrual: null,
    firedBuffIds: [],

    treasureBonusEarned: false,
  },
  skulledInTrick: [],
}

// DLR-157 — `TrickWell` now registers the well's own anchor, which throws outside a
// `MotionAnchorProvider`. Every render in this file goes through this helper for that reason
// alone; nothing about any test's own assertions changed.
function renderWell(props: ComponentProps<typeof TrickWell>) {
  return render(
    <MotionAnchorProvider>
      <TrickWell {...props} />
    </MotionAnchorProvider>,
  )
}

describe('TrickWell — a resolved trick', () => {
  it('offers exactly one control, and it carries on (DLR-67: the claim fork is gone)', () => {
    // `PlayingCard` renders every table-variant card as its own (disabled, tab-index -1)
    // <button> for the played cards, so `getAllByRole('button')` alone would also pick
    // those up — filtering to the enabled buttons isolates the actual interactive controls.
    const onCarryOn = vi.fn()
    renderWell({
      currentTrick: [],
      resolvedTrick,
      quarryToLead: false,
      onCarryOn,
    })
    const buttons = screen
      .getAllByRole('button')
      .filter((button) => !button.hasAttribute('disabled'))
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0])
    expect(onCarryOn).toHaveBeenCalledTimes(1)
  })

  it('renders no claim control and no claim-worth preview', () => {
    renderWell({
      currentTrick: [],
      resolvedTrick,
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(screen.queryByRole('button', { name: /claim/i })).toBeNull()
    expect(screen.queryByText(/Claiming credits/)).toBeNull()
  })

  it('DLR-160 AC2 — names the four-outcome word and reports the damage figure — DLR-156 AC7 pays the Quarry nothing', () => {
    renderWell({
      currentTrick: [],
      resolvedTrick,
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    // `resolvedTrick` fixture: the Cpu (Quarry) took it, no skull in the trick — a Low Defeat.
    expect(screen.getByText('Low Defeat')).toBeDefined()
    expect(
      screen.getByText(/they took it, and it carried no skull — your streak resets/),
    ).toBeDefined()
    expect(screen.queryByText(/They take \d+\./)).toBeNull()
    expect(screen.getByText(/You take 1\./)).toBeDefined()
  })
})

describe('TrickWell — DLR-119 clauses', () => {
  it('names a fired buff when its id resolves against the offered pile', () => {
    const fired: ResolvedTrick = {
      ...resolvedTrick,
      resolution: { ...resolvedTrick.resolution, firedBuffIds: [bellHigh.id] },
    }
    renderWell({
      currentTrick: [],
      resolvedTrick: fired,
      offeredBuffs: [bellHigh],
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(screen.getByText('Bell High (Momentum): +2 multiplier.')).toBeDefined()
  })

  it('narrates nothing when the fired id cannot be resolved against an empty offered pile', () => {
    const fired: ResolvedTrick = {
      ...resolvedTrick,
      resolution: { ...resolvedTrick.resolution, firedBuffIds: [bellHigh.id] },
    }
    renderWell({
      currentTrick: [],
      resolvedTrick: fired,
      offeredBuffs: [],
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(screen.queryByText(/Bell High/)).toBeNull()
  })

  it('renders no fired-buff clause when nothing fired', () => {
    renderWell({
      currentTrick: [],
      resolvedTrick,
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(screen.queryByText(/Momentum\)/)).toBeNull()
  })
})

describe('TrickWell — the Quarry is about to lead', () => {
  it('DLR-148 — names the wait without pointing at the deleted intent telegraph', () => {
    renderWell({ currentTrick: [], resolvedTrick: null, quarryToLead: true, onCarryOn: vi.fn() })
    // The old copy said "Read their intent first" — there is no such panel any more.
    expect(screen.queryByText(/intent/i)).toBeNull()
    expect(screen.getByText('They are about to lead.')).toBeDefined()
    expect(screen.getByRole('button', { name: /let them lead/i })).toBeDefined()
  })
})
