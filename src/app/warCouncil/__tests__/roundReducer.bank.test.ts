import { describe, expect, it } from 'vitest'
import {
  currentTurn,
  PlayerSide,
  RoundPhase,
  Suit,
  TrickOutcome,
  type WarCouncilState,
} from '../../../warCouncil'
import {
  DAMAGE_PER_HIT,
  DuelSide,
  PLAYER_START_HEALTH,
  isEncounterResolved,
  quarryHealthForEncounter,
  startEncounter,
  type EncounterState,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { card, discardsRemainingFixture, makeRound } from './roundFixture'

// The total cash-out specs (AC6/AC8) — carved into their own file for the same reason DLR-71's
// own splits exist in this codebase: `roundReducer.test.ts` crossed the 400-line budget once
// Task 12 added the encounter to its state, and this describe block was the largest single
// piece. Duplicated rather than imported, matching the established local pattern
// (`WarCouncilRound.duelHealthBars.test.tsx`, `playCard.test.ts`, `deal.test.ts`).

const tap = (c: Parameters<typeof card>[0] extends never ? never : ReturnType<typeof card>) =>
  ({ kind: RoundUiActionKind.TapCard, card: c }) as const
const carryOn = { kind: RoundUiActionKind.CarryOn } as const

function uiFrom(
  round: WarCouncilState,
  encounter: EncounterState = startEncounter(0),
): RoundUiState {
  return createRoundUiState({
    round,
    encounter,
    blastGuardHeld: false,
    baseDamageBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
  })
}

describe('DLR-156 AC7 — a hit pays the Quarry NOTHING, replacing the old forced two-thirds cash-out', () => {
  it('a clean loss deals no damage to the Quarry and resets total/roll, only the player is hit', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      total: 2,
      roll: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    // AC7 — no two-thirds consolation any more: a hit pays the Quarry nothing at all.
    expect(ui.resolvedTrick?.resolution.cashOut).toBe(0)
    expect(ui.round.total).toBe(0)
    expect(ui.round.roll).toBe(0)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - DAMAGE_PER_HIT)
  })

  it('leaves both bars alone on a trick that neither cashed nor hit', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      total: 0,
      roll: 0,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const encounter = startEncounter(0)
    let ui = uiFrom(round, encounter)
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.resolvedTrick?.resolution.cashOut).toBe(0)
    // Same reference, not just equal values — `applyResolution` skips `applyDamage` entirely
    // when nothing moved, so an all-zero event never bumps `damageEventsApplied`.
    expect(ui.encounter).toBe(encounter)
  })

  it('stops accepting taps once the player APPLIES a pot that empties the Quarry’s bar mid-hand', () => {
    // DLR-156 — the old fixture relied on a LOSS forcing a two-thirds cash-out that no longer
    // exists (AC7). The equivalent guard now lives behind the resolution screen's Apply choice:
    // a WIN opens the screen with a huge pot on offer, and it is the player's own ApplyPot that
    // can end the fight mid-hand.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      total: 500,
      roll: 2,
      tricksPlayed: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9), card(Suit.Keys, 4)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 5)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.resolution).not.toBeNull()

    // The pot on offer (potValue(501, 3) = 1503) comfortably exceeds this encounter's 10-health
    // Quarry, so applying it empties the bar and resolves the encounter mid-hand.
    ui = roundReducer(ui, { kind: RoundUiActionKind.ApplyPot })
    expect(isEncounterResolved(ui.encounter)).toBe(true)
    expect(ui.round.phase).not.toBe(RoundPhase.Complete)
    expect(ui.resolution).toBeNull()

    ui = roundReducer(ui, carryOn)
    expect(ui.resolvedTrick).toBeNull()
    expect(currentTurn(ui.round)).toBe(PlayerSide.Player)

    const stuck = ui
    const after = roundReducer(ui, tap(card(Suit.Keys, 4)))
    expect(after).toBe(stuck)
  })

  it('carries the streak across tricks and resets it on damage', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      total: 0,
      roll: 0,
      tricksPlayed: 0,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11), card(Suit.Keys, 11), card(Suit.Moons, 4)],
        // Keys 6, not Keys 3 — rank 3 is the Fox (CardRank.Fox), and the Quarry is forced to
        // play its only Keys card here. A Fox forced into play always resolves its ability
        // (chooseCpuMove never leaves it unanswered), which would exchange trump away from
        // Bells and hand the Quarry the decree instead of its Moons 6 — breaking trick 3's
        // matchup below. Keys 6 carries no ability, so trick 2 stays a plain clean win.
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 6), card(Suit.Moons, 6)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)

    // Trick 1 — the Player's Bells 11 beats the Quarry's only Bells card: a clean win.
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    expect(ui.round.roll).toBe(1)
    ui = roundReducer(ui, carryOn)

    // Trick 2 — likewise with Keys: the streak climbs.
    ui = roundReducer(ui, tap(card(Suit.Keys, 11)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 11)))
    expect(ui.round.roll).toBe(2)
    ui = roundReducer(ui, carryOn)

    // Trick 3 — the Player leads low, the Quarry's only Moons card beats it: damage resets
    // both the total and the streak to zero.
    ui = roundReducer(ui, tap(card(Suit.Moons, 4)))
    ui = roundReducer(ui, tap(card(Suit.Moons, 4)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    expect(ui.round.roll).toBe(0)
    expect(ui.round.total).toBe(0)
  })
})
