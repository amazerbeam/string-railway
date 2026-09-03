/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  BuffKind,
  BuffTier,
  mintFromTemplate,
  templatesForFamily,
  type Buff,
  type MintableConditionKind,
} from '../../../hunt'
import { BeatKind, type ResolutionBeat } from '../resolutionBeats'
import { deadBuffReasonText } from '../resolutionDeadBuffs'
import ResolutionBreakdown from '../ResolutionBreakdown'

afterEach(cleanup)

function mint(kind: MintableConditionKind, id: number): Buff {
  const [template] = templatesForFamily(kind)
  return mintFromTemplate(template, BuffTier.Bronze, id)
}

const WITH_MULTIPLIER: readonly ResolutionBeat[] = [
  { kind: BeatKind.Base, label: 'Base damage +1', amount: 1, damage: 1, mult: 1, running: 1 },
  {
    kind: BeatKind.Blade,
    label: 'Sidestep (Blade)',
    amount: 1,
    damage: 2,
    mult: 1,
    running: 2,
  },
  {
    kind: BeatKind.Momentum,
    label: 'Key-Feeder (Momentum)',
    amount: 1,
    damage: 2,
    mult: 2,
    running: 4,
  },
  {
    kind: BeatKind.Banked,
    label: 'Banked — total 0→4, roll 0→1',
    amount: 0,
    damage: 2,
    mult: 2,
    running: 4,
  },
]

const NO_MULTIPLIER: readonly ResolutionBeat[] = [
  { kind: BeatKind.Base, label: 'Base damage +1', amount: 1, damage: 1, mult: 1, running: 1 },
  {
    kind: BeatKind.Blade,
    label: 'Moon-Taker (Blade)',
    amount: 2,
    damage: 3,
    mult: 1,
    running: 3,
  },
  {
    kind: BeatKind.Banked,
    label: 'Banked — total 0→3, roll 0→1',
    amount: 0,
    damage: 3,
    mult: 1,
    running: 3,
  },
]

const HURT_BEATS: readonly ResolutionBeat[] = [
  {
    kind: BeatKind.Hurt,
    label: 'Hurt — −1 health, 24 pot lost',
    amount: -1,
    damage: 0,
    mult: 0,
    running: 0,
  },
]

describe('ResolutionBreakdown', () => {
  it('shows a Damage subtotal rule only once a multiplier has fired', () => {
    const { container } = render(
      <ResolutionBreakdown
        beats={WITH_MULTIPLIER}
        landed={WITH_MULTIPLIER.length}
        deadBuffs={[]}
      />,
    )
    expect(screen.getByText('Damage')).toBeTruthy()
    expect(container.querySelector('.wc-resolve-rule-final')?.textContent).toContain('4')
  })

  it('skips the subtotal rule for a trick with no multiplier — one closing rule, not two', () => {
    render(
      <ResolutionBreakdown beats={NO_MULTIPLIER} landed={NO_MULTIPLIER.length} deadBuffs={[]} />,
    )
    expect(screen.queryByText('Damage')).toBeNull()
    expect(screen.getByText('Added')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('a hurt trick renders its own note, with no numeric "Added" cell', () => {
    render(<ResolutionBreakdown beats={HURT_BEATS} landed={HURT_BEATS.length} deadBuffs={[]} />)
    expect(screen.getByText(/hurt.*pot lost/i)).toBeTruthy()
    expect(screen.queryByText('Added')).toBeNull()
  })

  it('renders nothing for an armed-but-unfired list when it is empty', () => {
    const { container } = render(
      <ResolutionBreakdown beats={NO_MULTIPLIER} landed={NO_MULTIPLIER.length} deadBuffs={[]} />,
    )
    expect(container.querySelector('.wc-resolve-dead-list')).toBeNull()
  })

  it('DLR-160 AC3 — a dead buff renders its own condition text, with no value cell at all', () => {
    const feeder = mint(BuffKind.Feeder, 1)
    render(
      <ResolutionBreakdown
        beats={NO_MULTIPLIER}
        landed={NO_MULTIPLIER.length}
        deadBuffs={[feeder]}
      />,
    )
    const row = screen.getByText(deadBuffReasonText(feeder)).closest('.wc-resolve-dead-row')
    expect(row).toBeTruthy()
    expect(row?.querySelector('.wc-resolve-row-amt')).toBeNull()
  })

  it('only reveals beats up to `landed` — a progressive reveal, not the whole sequence at once', () => {
    render(<ResolutionBreakdown beats={WITH_MULTIPLIER} landed={1} deadBuffs={[]} />)
    expect(screen.getByText('Base damage +1')).toBeTruthy()
    expect(screen.queryByText('Sidestep (Blade)')).toBeNull()
    expect(screen.queryByText('Damage')).toBeNull()
  })
})
