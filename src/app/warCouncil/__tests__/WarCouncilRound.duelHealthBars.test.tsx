/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dealRound, PlayerSide } from '../../../warCouncil'
import { DuelSide } from '../../../hunt'
import WarCouncilRound from '../WarCouncilRound'
import { encounterFixture, huntFixture, maxHealthFixture } from './roundFixture'

afterEach(cleanup)

// DLR-71's AC2 needs a full 13-trick round driven to completion, which is enough apparatus
// (a deterministic RNG, a driving loop, the declare click) to carve into its own file rather
// than pushing `WarCouncilRound.test.tsx` past the 400-line budget — the same resolution
// `plan.md`'s own Risks section names for this exact file. Duplicated rather than imported,
// matching the established local pattern (`roundReducer.test.ts`, `playCard.test.ts`).

// A deterministic RNG — never `Math.random()` in anything that must be reproducible.
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/**
 * Drives a full 13-trick round to completion through the rendered DOM alone — no reach into
 * reducer state. Mirrors `WarCouncilRound.test.tsx`'s own driving loop.
 */
function playFullRoundToCompletion() {
  let guard = 0
  while (screen.queryByRole('heading', { name: /the hunt is over/i }) === null) {
    guard += 1
    if (guard > 400) {
      throw new Error('round did not complete — infinite loop guard tripped')
    }
    const fault = screen.queryByRole('alert')
    if (fault) {
      throw new Error(`the engine rejected the Quarry's own move: ${fault.textContent}`)
    }
    const prompt = screen.queryByRole('group', { name: 'Choose what the card does' })
    if (prompt) {
      fireEvent.click(within(prompt).getAllByRole('button')[0])
      continue
    }
    const tapToCarryOn = screen.queryByRole('button', { name: /tap the table to carry on/i })
    if (tapToCarryOn) {
      fireEvent.click(tapToCarryOn)
      continue
    }
    const letThemLead = screen.queryByRole('button', { name: /let them lead/i })
    if (letThemLead) {
      fireEvent.click(letThemLead)
      continue
    }
    const hand = screen.getByRole('group', { name: /hand/i })
    const legalCard = within(hand)
      .getAllByRole('button')
      .find((button) => !(button as HTMLButtonElement).disabled)
    if (!legalCard) {
      throw new Error('no legal card found in hand, and no other branch applied')
    }
    fireEvent.click(legalCard)
    fireEvent.click(legalCard)
  }
}

function declareWin() {
  fireEvent.click(screen.getByRole('button', { name: /play to win/i }))
}

/** Pulls the pending figure out of a bar's `aria-valuetext` (AC7's one sentence). */
function readRiskFrom(meter: HTMLElement): number {
  const text = meter.getAttribute('aria-valuetext') ?? ''
  const match = text.match(/(\d+(?:\.\d+)?) at risk this Hunt\./)
  if (!match) throw new Error(`no pending figure found in aria-valuetext: ${text}`)
  return Number(match[1])
}

describe('WarCouncilRound — the pending figure IS the applied figure (AC2)', () => {
  it('reports the same figure as pending, as arithmetic, and as applied damage', () => {
    render(
      <WarCouncilRound
        initialState={dealRound(PlayerSide.Cpu, lcg(2026), huntFixture.quarry.character)}
        hunt={huntFixture}
        encounter={encounterFixture}
        maxHealth={maxHealthFixture}
        onComplete={vi.fn()}
      />,
    )
    declareWin()
    playFullRoundToCompletion()

    // The Quarry's bar depletes by what the PLAYER dealt — `duelSideDamage` crosses
    // `dealt[PlayerSide.Player]` onto `DuelSide.Quarry` — so that is the figure this pins
    // against the panel's own "You Damage" cell, not "Opponent Damage" (which depletes the
    // PLAYER's own bar instead). Getting this crossing backwards is exactly the typo DLR-70's
    // `duelSideDamage` docblock warns would type-check and produce plausible numbers forever.
    const quarryMeter = screen.getByRole('meter', { name: 'The Quarry’s health' })
    const pendingOnQuarry = readRiskFrom(quarryMeter)
    const stated = Number(screen.getByLabelText(/^You Damage: /).textContent)
    expect(pendingOnQuarry).toBe(stated)

    fireEvent.click(screen.getByRole('button', { name: 'Apply the damage' }))
    const after = screen.getByRole('meter', { name: 'The Quarry’s health' })
    expect(Number(after.getAttribute('aria-valuenow'))).toBe(
      maxHealthFixture[DuelSide.Quarry] - stated,
    )
  })
})
