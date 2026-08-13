/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import {
  applyHunt,
  DuelSide,
  HuntDeclaration,
  resolveStanding,
  standingTableFor,
  type IncomingDamage,
} from '../../../hunt'
import RoundOverPanel from '../RoundOverPanel'
import { encounterFixture } from './roundFixture'

afterEach(cleanup)

const winTable = standingTableFor(HuntDeclaration.Win)

// Hand-built HuntDamage fixtures — this spec is about the two-stage control and the terminal
// state, not the arithmetic, which WarCouncilRound.test.tsx pins end to end (AC2).
const huntDamage = {
  [PlayerSide.Player]: {
    spoils: 48,
    tricks: 7,
    band: resolveStanding(7, winTable),
    standing: resolveStanding(7, winTable).multiplier,
    damage: 240,
  },
  [PlayerSide.Cpu]: {
    spoils: 24,
    tricks: 4,
    band: resolveStanding(4, winTable),
    standing: resolveStanding(4, winTable).multiplier,
    damage: 48,
  },
}

const baseProps = {
  tricksWon: { [PlayerSide.Player]: 7, [PlayerSide.Cpu]: 4 },
  huntDamage,
  onFinish: vi.fn(),
  onApply: vi.fn(),
}

// `IncomingDamage` fixtures fed through the real `applyHunt` — never a hand-written health
// record — so `applied` is exactly what the reducer's `CommitDamage` would have produced.
const LIGHT: IncomingDamage = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 }
const LETHAL_TO_QUARRY: IncomingDamage = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 99_999 }

describe('RoundOverPanel — arithmetic first, then the bars move (AC4)', () => {
  it('offers only the apply control while nothing is committed', () => {
    render(<RoundOverPanel {...baseProps} applied={null} />)
    expect(screen.getByRole('button', { name: 'Apply the damage' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Deal the next Hunt' })).toBeNull()
  })

  it('shows both sides’ Spoils × Standing = Damage before anything is applied', () => {
    render(<RoundOverPanel {...baseProps} applied={null} />)
    expect(screen.getByLabelText('You: Spoils times Standing equals Damage')).toBeTruthy()
    expect(screen.getByLabelText('Opponent: Spoils times Standing equals Damage')).toBeTruthy()
  })

  it('calls onApply once, so one Hunt is committed once', () => {
    const onApply = vi.fn()
    render(<RoundOverPanel {...baseProps} applied={null} onApply={onApply} />)
    fireEvent.click(screen.getByRole('button', { name: 'Apply the damage' }))
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('swaps to the finish control once the damage has landed', () => {
    render(<RoundOverPanel {...baseProps} applied={applyHunt(encounterFixture, LIGHT)} />)
    expect(screen.getByRole('button', { name: 'Deal the next Hunt' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Apply the damage' })).toBeNull()
  })

  it('states the outcome and offers no next Hunt once a bar empties', () => {
    render(
      <RoundOverPanel {...baseProps} applied={applyHunt(encounterFixture, LETHAL_TO_QUARRY)} />,
    )
    expect(screen.getByRole('status').textContent).toContain('The Quarry is down')
    expect(screen.queryByRole('button', { name: 'Deal the next Hunt' })).toBeNull()
  })
})
