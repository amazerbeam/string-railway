/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PlayerSide, RoundPhase, Suit, TrickOutcome, type Card } from '../../../warCouncil'
import { BuffTier, curseBuff } from '../../../hunt'
import { MotionAnchorProvider } from '../MotionAnchors'
import { feltStageProps } from '../roundControlsProps'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { encounterFixture, makeRound } from './roundFixture'

/**
 * DLR-167 fix pass — the trick well used to word a curse-made dodge as its exact opposite.
 *
 * `feltStageProps` recomputed `skulledInTrick` from `skullsOn(ui.round)`, which is the state AFTER
 * `playCard` cleared `cursedCards`. For a trick made skulled ONLY by a Curse that always yielded
 * `[]`, so the well printed "Low Defeat" — a lost streak — over a trick that actually banked and
 * cost no health, and held it there for the whole dwell before the resolution screen contradicted
 * it. The cursed card also drew with no skull on it.
 *
 * Driven through the real reducer rather than assembled by hand, because the defect lived in the
 * gap between two states of it.
 */
const card = (suit: Suit, rank: number): Card => ({ suit, rank })

const CURSED = card(Suit.Bells, 2)
const QUARRY_LEAD = card(Suit.Bells, 4)

afterEach(cleanup)

/** Curse the player's Bells 2, put the Quarry's higher Bells 4 on the table, and follow with the
 *  cursed card — a trick the Quarry physically takes, carrying a skull only because of the Curse. */
function curseMadeDodge(): RoundUiState {
  const curse = curseBuff(BuffTier.Silver, 1)
  // Armed in the between-tricks window, which is the only window a Curse has.
  let ui = createRoundUiState({
    round: makeRound(),
    encounter: encounterFixture,
    baseDamageBonus: 0,
    discardsRemaining: 2,
    buffs: [curse],
  })
  ui = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: curse.id })
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: curse.id })
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: CURSED })
  expect(ui.round.cursedCards).toEqual([CURSED])

  // The Quarry leads. Placed on the state directly so the scenario is deterministic rather than
  // dependent on which card `chooseCpuMove` happens to pick.
  ui = {
    ...ui,
    round: {
      ...ui.round,
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: QUARRY_LEAD }],
      phase: RoundPhase.AwaitingFollow,
    },
  }

  // Arm, then commit, the cursed card.
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: CURSED })
  return roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: CURSED })
}

function renderFelt(ui: RoundUiState) {
  const props = feltStageProps({
    ui,
    dispatch: () => {},
    offered: [],
    quarryToLead: false,
    handSummary: { healthLost: 0, dealtToQuarry: 0 },
    onCarryOn: () => {},
    onCancel: () => {},
  })
  return render(<MotionAnchorProvider>{props.children}</MotionAnchorProvider>)
}

describe('a curse-made dodge', () => {
  it('the engine resolves it as a Low Victory — it banks, and costs no health', () => {
    const ui = curseMadeDodge()
    expect(ui.resolvedTrick).not.toBeNull()
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.LowVictory)
    expect(ui.resolvedTrick?.resolution.damageToPlayer).toBe(0)
  })

  it('`playCard` has already lifted the mark by the time the well renders', () => {
    // The precondition of the whole defect, pinned so a future change to when the mark lifts
    // cannot quietly make this spec pass for the wrong reason.
    expect(curseMadeDodge().round.cursedCards).toEqual([])
  })

  it('the well and the resolution panel read ONE `skulledInTrick`, captured pre-play', () => {
    const ui = curseMadeDodge()
    expect(ui.resolvedTrick?.skulledInTrick).toEqual([CURSED])
    expect(ui.resolution?.skulledInTrick).toEqual(ui.resolvedTrick?.skulledInTrick)
  })

  it('the well prints Low Victory, not Low Defeat', () => {
    renderFelt(curseMadeDodge())
    expect(screen.getByText('Low Victory')).toBeDefined()
    expect(screen.queryByText('Low Defeat')).toBeNull()
  })

  it('the cursed card still draws its skull in the well', () => {
    renderFelt(curseMadeDodge())
    // `PlayingCard` names a skulled card in its own accessible name, so the badge and the
    // announcement are one assertion.
    expect(screen.getByRole('button', { name: /skulled/i })).toBeDefined()
  })
})
