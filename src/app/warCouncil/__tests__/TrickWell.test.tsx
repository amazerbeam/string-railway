/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, Suit, TrickOutcome } from '../../../warCouncil'
import {
  BuffTier,
  DuelSide,
  mintFromTemplate,
  TIMEBOMB_DAMAGE,
  TIMEBOMB_QUARRY_DAMAGE,
  templateById,
  type Buff,
} from '../../../hunt'
import { MotionAnchorProvider } from '../MotionAnchors'
import type { ResolvedTrick } from '../roundUiState'
import TrickWell from '../TrickWell'

// Same construction idiom as `buffRoundState.test.ts`'s own `buff` helper.
const buff = (id: string, tier: BuffTier, buffId: number): Buff =>
  mintFromTemplate(templateById(id)!, tier, buffId)

const taker = buff('taker:bells:multiplier', BuffTier.Bronze, 1)

afterEach(cleanup)

const resolvedTrick: ResolvedTrick = {
  cards: [
    { side: PlayerSide.Player, card: { suit: Suit.Bells, rank: 7 } },
    { side: PlayerSide.Cpu, card: { suit: Suit.Keys, rank: 2 } },
  ],
  winner: PlayerSide.Cpu,
  resolution: {
    outcome: TrickOutcome.CleanLoss,
    trickDamage: null,
    cashOut: 0,
    damageToPlayer: 1,
    total: 0,
    roll: 0,
    timebombTarget: null,
    timebombToQuarry: 0,
    blastGuardSpent: false,
    buffAccrual: null,
    firedBuffIds: [],
  },
  timebombDamage: null,
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

  it('names the winning side and reports the damage figure — DLR-156 AC7 pays the Quarry nothing', () => {
    renderWell({
      currentTrick: [],
      resolvedTrick,
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(screen.getByText(/They take the trick/)).toBeDefined()
    expect(screen.queryByText(/They take \d+\./)).toBeNull()
    expect(screen.getByText(/You take 1\./)).toBeDefined()
  })

  it('announces the marked card as primed (DLR-90 AC2)', () => {
    renderWell({
      currentTrick: [],
      resolvedTrick,
      primedCards: [{ suit: Suit.Bells, rank: 7 }],
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(screen.getByRole('button', { name: /7 of Bells, primed/i })).toBeDefined()
  })

  it('announces a card carrying both a skull and the mark, both wordings present', () => {
    renderWell({
      currentTrick: [],
      resolvedTrick,
      skulledCards: [{ suit: Suit.Bells, rank: 7 }],
      primedCards: [{ suit: Suit.Bells, rank: 7 }],
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(screen.getByRole('button', { name: /7 of Bells, skulled, primed/i })).toBeDefined()
  })

  it('names a booked hit and its target when the trick just booked a Timebomb (DLR-101)', () => {
    const primed: ResolvedTrick = {
      ...resolvedTrick,
      resolution: { ...resolvedTrick.resolution, timebombTarget: DuelSide.Quarry },
    }
    renderWell({
      currentTrick: [],
      resolvedTrick: primed,
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === 'P' &&
          Boolean(
            node.textContent?.includes(`they take ${TIMEBOMB_QUARRY_DAMAGE} at the next trick`),
          ),
      ),
    ).toBeDefined()
  })

  it('narrates a GOLD Timebomb at its own figure, not the bronze one (DLR-132 Task 10a)', () => {
    // Before this task the reveal always read `TIMEBOMB_DAMAGE[BuffTier.Bronze]` regardless of
    // the spent card's tier — this is the assertion that would have caught that bug.
    const goldPrimed: ResolvedTrick = {
      ...resolvedTrick,
      resolution: { ...resolvedTrick.resolution, timebombTarget: DuelSide.Quarry },
      timebombDamage: TIMEBOMB_DAMAGE[BuffTier.Gold],
    }
    renderWell({
      currentTrick: [],
      resolvedTrick: goldPrimed,
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    const goldFigure = TIMEBOMB_DAMAGE[BuffTier.Gold][DuelSide.Quarry]
    expect(goldFigure).not.toBe(TIMEBOMB_QUARRY_DAMAGE)
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === 'P' &&
          Boolean(node.textContent?.includes(`they take ${goldFigure} at the next trick`)),
      ),
    ).toBeDefined()
  })

  it('renders no Timebomb clause when nothing was booked this trick', () => {
    renderWell({
      currentTrick: [],
      resolvedTrick,
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(screen.queryByText(/Timebomb ticking/)).toBeNull()
  })
})

describe('TrickWell — DLR-119 clauses', () => {
  it('names a fired buff when its id resolves against the offered pile', () => {
    const fired: ResolvedTrick = {
      ...resolvedTrick,
      resolution: { ...resolvedTrick.resolution, firedBuffIds: [taker.id] },
    }
    renderWell({
      currentTrick: [],
      resolvedTrick: fired,
      offeredBuffs: [taker],
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(screen.getByText('Bell-Taker (Momentum): +2 multiplier.')).toBeDefined()
  })

  it('narrates nothing when the fired id cannot be resolved against an empty offered pile', () => {
    const fired: ResolvedTrick = {
      ...resolvedTrick,
      resolution: { ...resolvedTrick.resolution, firedBuffIds: [taker.id] },
    }
    renderWell({
      currentTrick: [],
      resolvedTrick: fired,
      offeredBuffs: [],
      quarryToLead: false,
      onCarryOn: vi.fn(),
    })
    expect(screen.queryByText(/Bell-Taker/)).toBeNull()
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
