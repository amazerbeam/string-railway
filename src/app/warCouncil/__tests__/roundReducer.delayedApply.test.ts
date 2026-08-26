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
  BuffTier,
  DuelSide,
  PLAYER_HAND_FLOOR,
  PLAYER_START_HEALTH,
  TIMEBOMB_PLAYER_DAMAGE,
  TIMEBOMB_DAMAGE,
  isEncounterResolved,
  queueTimebomb,
  startEncounter,
  type EncounterState,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { card, discardsRemainingFixture, makeRound } from './roundFixture'

// DLR-109 — the reducer-level integration tests for the delayed Apply Damage payout: how long it
// survives (AC2), what wipes it (AC3), what it freezes for the quick-kill payout (AC4), how it
// interleaves with a Timebomb due the same trick, and what happens if it is still owed when the
// hand itself ends. `roundReducer.applyDamage.test.ts` covers the press/poise/refusal mechanics
// this file assumes.

const tapApply = { kind: RoundUiActionKind.TapApplyDamage } as const
const tap = (c: ReturnType<typeof card>) => ({ kind: RoundUiActionKind.TapCard, card: c }) as const

function uiFrom(
  round: WarCouncilState,
  encounter: EncounterState = startEncounter(0),
): RoundUiState {
  return createRoundUiState({
    round,
    encounter,
    blastGuardHeld: false,
    bankClimbBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
  })
}

describe('AC2/AC3 — the queued payout survives the trick it was pressed in, then lands on the very next one', () => {
  it('lands on the first trick resolution after the press', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
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

    // The one trick after the press — a clean win: the payout comes due at THIS resolution.
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 9)
  })
})

describe('DLR-141 — a hit taken during the window reduces, rather than destroys, the queued payout', () => {
  it('a CleanLoss during the window cuts the payout to APPLY_DAMAGE_HIT_RETENTION floored, and it stays queued when a resolution beyond this one is still owed', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    const encounter: EncounterState = {
      ...startEncounter(0),
      // Two resolutions from due, constructed directly rather than through a press — this test is
      // about the REDUCE-but-not-yet-DUE case, which a fresh one-trick-settle press cannot reach
      // (its own single owed resolution comes due on the very trick that would reduce it).
      pendingApplyPayout: { cashOut: 9, unplayedAtPress: 1, resolutionsOwed: 2 },
    }
    let ui = uiFrom(round, encounter)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    // Reduced to floor(9 * 1/3) = 3 by the hit — STILL IN THE AIR, since a second resolution was
    // owed. Not wiped, and not the un-reduced 9 either.
    expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 3, resolutionsOwed: 1 })
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 1)
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'reduced', cashOut: 9, remaining: 3 })
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
        [PlayerSide.Player]: [card(Suit.Bells, 11), card(Suit.Keys, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 6)],
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

    // The one trick after the press — a clean win; the payout lands and kills on this same
    // resolution.
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    expect(isEncounterResolved(ui.encounter)).toBe(true)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(0)
    // DLR-146 — this trick is trick 1 of 6 (non-final), so `playCard`'s refill tops the live hand
    // back up to PLAYER_HAND_FLOOR once it drops below it (the deck here has plenty of cards to
    // draw). It used to shrink to a bare 1 and stay there; now it shrinks to 1 then refills. Either
    // way the live hand differs from the frozen press-time figure below, which is the point of this
    // spec — `Math.max` collapses to the old literal `1` at PLAYER_HAND_FLOOR = 0.
    expect(ui.round.hands[PlayerSide.Player].length).toBe(
      Math.max(handSizeAtPress - 1, PLAYER_HAND_FLOOR),
    )
    // The kill still reports the count from PRESS time, unaffected by the live hand's refill.
    expect(ui.unplayedAtResolve).toBe(handSizeAtPress)
  })
})

describe('Ordering — a payout due the same trick a Timebomb detonates against the player', () => {
  it('DLR-141 — reduces the payout to APPLY_DAMAGE_HIT_RETENTION floored first, then lands it at the reduced figure, while the Timebomb still lands in full', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze])
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
    // Reduced to floor(9 * 1/3) = 3 by the Timebomb's hit, then paid at 3 on the same resolution.
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 3)
    // The Timebomb's own damage lands normally, undiminished by the payout's presence.
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 3, remaining: null })
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

    // The one trick after the press — a clean win: the payout comes due at THIS resolution and
    // lands.
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 9, remaining: null })
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 9)
  })

  it('DLR-141 — a trick that damages the player while a payout is still owed a further resolution reports it reduced, and the Quarry does not fall yet', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    const encounter: EncounterState = {
      ...startEncounter(0),
      // Two resolutions from due, constructed directly — the reduce-but-not-yet-due case a fresh
      // one-trick-settle press cannot reach on its own single owed resolution.
      pendingApplyPayout: { cashOut: 9, unplayedAtPress: 1, resolutionsOwed: 2 },
    }
    let ui = uiFrom(round, encounter)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'reduced', cashOut: 9, remaining: 3 })
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

  it('DLR-141 — this trick reduces the payout, so it is the "Ordering" case again, plus the reporting field', () => {
    // Same seed, same trick as the "Ordering" block above. Restated here because the `payout`
    // field on `resolvedTrick` is the thing this describe block exists to check.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze])
    const encounter: EncounterState = {
      ...owed,
      pendingApplyPayout: { cashOut: 9, unplayedAtPress: 1, resolutionsOwed: 1 },
    }
    let ui = uiFrom(round, encounter)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 3)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 3, remaining: null })
  })
})
