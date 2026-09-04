/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BuffCarry } from '../../../hunt'
import WarCouncilRound from '../WarCouncilRound'
import {
  baseDamageBonusFixture,
  coinsFixture,
  discardsRemainingFixture,
  encounterFixture,
  huntFixture,
  makeRound,
  maxHealthFixture,
  quarryLabelFixture,
  runLabelFixture,
} from './roundFixture'

afterEach(cleanup)

// DLR-150 — the regression the Code-Evaluator and Defender both raised: `lowCarry` reaches
// `WarCouncilMountProps` and `RoundUiSeed` correctly, but `WarCouncilRound` itself dropped it on
// the floor between its prop destructure and the `useReducer` seed, so every hand mounted through
// the real app opened on an empty carry regardless of what `RunState.lowCarry` held. A
// pure-logic test below the mount (`buffCarry.test.ts`, `run.lowCarry.test.ts`) or a
// hand-built `BankMeter` prop test cannot see this: both sit on one side of the exact seam that
// dropped the value. This test crosses it — it renders `WarCouncilRound` itself with a non-empty
// `lowCarry` prop and asserts the carried-in figures reach the screen.
describe('WarCouncilRound — a carried-in accrual seeds the hand it opens on (DLR-150 AC3)', () => {
  it('renders "Carried in from last hand" with the carried figures when lowCarry is non-empty', () => {
    const lowCarry: BuffCarry = { multiplierBonus: 2, flatDamageBonus: 3 }
    render(
      <WarCouncilRound
        initialState={makeRound()}
        hunt={huntFixture}
        encounter={encounterFixture}
        maxHealth={maxHealthFixture}
        runLabel={runLabelFixture}
        quarryLabel={quarryLabelFixture}
        coins={coinsFixture}
        baseDamageBonus={baseDamageBonusFixture}
        discardsRemaining={discardsRemainingFixture}
        buffs={[]}
        lowCarry={lowCarry}
        onComplete={vi.fn()}
      />,
    )

    const figures = screen.getByLabelText(/carried in from last hand/i)
    expect(figures.getAttribute('aria-label')).toContain(
      `of which ${lowCarry.multiplierBonus} multiplier and ${lowCarry.flatDamageBonus} damage carried in from last hand`,
    )
  })
})
