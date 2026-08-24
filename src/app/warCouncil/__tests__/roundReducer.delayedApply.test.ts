import { describe, expect, it } from 'vitest'
import {
  PlayerSide,
  RoundPhase,
  Suit,
  TrickOutcome,
  type WarCouncilState,
} from '../../../warCouncil'
import {
  APPLY_DAMAGE_DELAY_TRICKS,
  DuelSide,
  PLAYER_START_HEALTH,
  TIMEBOMB_PLAYER_DAMAGE,
  isEncounterResolved,
  queueTimebomb,
  startEncounter,
  type EncounterState,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { card, discardsRemainingFixture, timebombChargesFixture, makeRound } from './roundFixture'

// DLR-109 — the reducer-level integration tests for the delayed Apply Damage payout: how long it
// survives (AC2), what wipes it (AC3), what it freezes for the quick-kill payout (AC4), how it
// interleaves with a Timebomb due the same trick, and what happens if it is still owed when the
// hand itself ends. `roundReducer.applyDamage.test.ts` covers the press/poise/refusal mechanics
// this file assumes.

const tapApply = { kind: RoundUiActionKind.TapApplyDamage } as const
const tap = (c: ReturnType<typeof card>) => ({ kind: RoundUiActionKind.TapCard, card: c }) as const
const carryOn = { kind: RoundUiActionKind.CarryOn } as const

function uiFrom(
  round: WarCouncilState,
  encounter: EncounterState = startEncounter(0),
): RoundUiState {
  return createRoundUiState({
    round,
    encounter,
    cheats: [],
    timebombCharges: timebombChargesFixture,
    blastGuardHeld: false,
    bankClimbBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
  })
}

describe('AC2 — the queued payout survives the current trick plus the next, then lands', () => {
  it('ticks down on a clean-win trick, then lands on the next one', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11), card(Suit.Keys, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 6)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({
      cashOut: 9,
      resolutionsOwed: APPLY_DAMAGE_DELAY_TRICKS + 1,
    })

    // Trick 1 — a clean win: nothing is lost, so the payout survives, ticked down by one.
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({
      resolutionsOwed: APPLY_DAMAGE_DELAY_TRICKS,
    })

    ui = roundReducer(ui, carryOn)

    // Trick 2 — another clean win: the payout comes due at THIS resolution and lands.
    ui = roundReducer(ui, tap(card(Suit.Keys, 11)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 11)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 9)
  })
})

describe('AC3 — a hit taken during the window wipes the queued payout', () => {
  it('a CleanLoss during the window destroys the payout; the Quarry never falls', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 9 })

    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 1)
  })
})

describe('AC4 — a delayed kill freezes the PRESS-TIME hand size', () => {
  it('a card played during the window shrinks the live hand, but the kill still reports the press-time count', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      bank: 5,
      multiplier: 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11), card(Suit.Keys, 11), card(Suit.Moons, 5)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 6), card(Suit.Moons, 9)],
      },
      currentTrick: [],
    })
    const encounter: EncounterState = {
      ...startEncounter(0),
      health: { ...startEncounter(0).health, [DuelSide.Quarry]: 5 },
    }
    let ui = uiFrom(round, encounter)
    const handSizeAtPress = ui.round.hands[PlayerSide.Player].length

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({
      cashOut: 5,
      unplayedAtPress: handSizeAtPress,
    })

    // Trick 1 — a clean win; the hand shrinks to 2 cards, and the payout is still just held.
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, carryOn)

    // Trick 2 — another clean win; the hand shrinks to 1 card, and the payout lands and kills.
    ui = roundReducer(ui, tap(card(Suit.Keys, 11)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 11)))

    expect(isEncounterResolved(ui.encounter)).toBe(true)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(0)
    // The live hand really did shrink — the frozen figure must NOT equal this.
    expect(ui.round.hands[PlayerSide.Player].length).toBe(1)
    expect(ui.unplayedAtResolve).toBe(handSizeAtPress)
  })
})

describe('Ordering — a payout due the same trick a Timebomb detonates against the player', () => {
  it('destroys the payout (the Quarry gets nothing from it) while the Timebomb still lands in full', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player)
    const encounter: EncounterState = {
      ...owed,
      // A payout one resolution from due, constructed directly rather than through a press —
      // this test is about the ORDER inside `applyResolution`, not about queuing.
      pendingApplyPayout: { cashOut: 9, unplayedAtPress: 1, resolutionsOwed: 1 },
    }
    let ui = uiFrom(round, encounter)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    // The payout is destroyed — the Quarry takes nothing from it.
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth)
    // The Timebomb's own damage lands normally, undiminished by the payout's presence.
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
  })
})

describe('Hand end — a payout still owed when the final trick resolves', () => {
  it('lands on that resolution rather than being lost', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      tricksPlayed: 5,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const encounter: EncounterState = {
      ...startEncounter(0),
      // Deliberately far from naturally due — only the hand ending should pay this out.
      pendingApplyPayout: { cashOut: 9, unplayedAtPress: 0, resolutionsOwed: 10 },
    }
    let ui = uiFrom(round, encounter)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    expect(ui.round.phase).toBe(RoundPhase.Complete)
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    // AC5 (bank.ts) already cashes THIS trick's own 1x1 streak in full at the sixth trick,
    // independent of the payout — so the Quarry takes both that ordinary hand-end cash-out AND
    // the payout's 9 in the same resolution. The payout landing at all, rather than being lost,
    // is what this test is proving.
    const ownHandEndCash = ui.resolvedTrick?.resolution.cashOut ?? 0
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(
      Math.max(0, startQuarryHealth - ownHandEndCash - 9),
    )
  })
})

describe('DLR-119 — the resolved trick reports what happened to the queued payout', () => {
  it('a trick that settles a due payout reports it paid, for the frozen cashOut', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11), card(Suit.Keys, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 6)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)

    // Trick 1 — a clean win: nothing settles or dies, so this trick reports no payout event.
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    expect(ui.resolvedTrick?.payout).toBeNull()

    ui = roundReducer(ui, carryOn)

    // Trick 2 — the payout comes due at THIS resolution and lands.
    ui = roundReducer(ui, tap(card(Suit.Keys, 11)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 11)))
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 9 })
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 9)
  })

  it('a trick that damages the player while a payout is queued reports it destroyed, and the Quarry never falls', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)

    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'destroyed', cashOut: 9 })
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth)
  })

  it('a trick with nothing queued reports payout: null', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)

    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.resolvedTrick?.payout).toBeNull()
  })

  it('reports the payout outcome without changing a single figure the fold already produced', () => {
    // Same seed, same trick, before and after DLR-119: `encounter.health` on both sides,
    // `pendingApplyPayout`, `pendingTimebomb` and `unplayedAtPress` must all be byte-identical to
    // the values this file already asserts. `payout` is REPORTING — nothing branches on it.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player)
    const encounter: EncounterState = {
      ...owed,
      pendingApplyPayout: { cashOut: 9, unplayedAtPress: 1, resolutionsOwed: 1 },
    }
    let ui = uiFrom(round, encounter)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    // Every figure the AC3 ordering test already asserts, unchanged.
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
    // AND the new reporting field, additive on top.
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'destroyed', cashOut: 9 })
  })
})
