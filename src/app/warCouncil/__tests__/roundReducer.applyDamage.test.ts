import { describe, expect, it } from 'vitest'
import {
  PlayerSide,
  RoundPhase,
  Suit,
  TrickOutcome,
  type WarCouncilState,
} from '../../../warCouncil'
import {
  APPLY_DAMAGE_AP_COST,
  APPLY_DAMAGE_HIT_RETENTION,
  applyDamage,
  BuffTier,
  DuelSide,
  PLAYER_START_HEALTH,
  STARTING_AP,
  isEncounterResolved,
  queueTimebomb,
  quarryHealthForEncounter,
  startEncounter,
  TIMEBOMB_DAMAGE,
  TIMEBOMB_PLAYER_DAMAGE,
  type EncounterState,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { card, discardsRemainingFixture, makeRound } from './roundFixture'

const tapApply = { kind: RoundUiActionKind.TapApplyDamage } as const
const cancelApply = { kind: RoundUiActionKind.CancelApplyDamage } as const

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

/** The player is to lead, holding a streak of 3 x 3 = 9. */
function streakRound(over: Partial<WarCouncilState> = {}): WarCouncilState {
  return makeRound({
    leader: PlayerSide.Player,
    trumpSuit: Suit.Keys,
    bank: 3,
    multiplier: 3,
    currentTrick: [],
    ...over,
  })
}

const apply = (ui: RoundUiState) => roundReducer(roundReducer(ui, tapApply), tapApply)

describe('Apply Damage — the poise, and the refusals (AC1)', () => {
  it('one tap poises and changes nothing else', () => {
    const ui = roundReducer(uiFrom(streakRound()), tapApply)
    expect(ui.applyPoised).toBe(true)
    expect(ui.round.bank).toBe(3)
    expect(ui.round.multiplier).toBe(3)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
  })

  it('AC1 — an empty bank cannot even be poised', () => {
    const ui = roundReducer(uiFrom(makeRound({ leader: PlayerSide.Player })), tapApply)
    expect(ui.applyPoised).toBe(false)
  })

  it('DLR-143 — a pending Timebomb hit no longer blocks the poise (reverses D6)', () => {
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze])
    const ui = roundReducer(uiFrom(streakRound(), owed), tapApply)
    expect(ui.applyPoised).toBe(true)
    expect(ui.round.bank).toBe(3)
  })

  it('DLR-143 — a Timebomb booked AFTER the poise does not stop the commit', () => {
    let ui = roundReducer(uiFrom(streakRound()), tapApply)
    expect(ui.applyPoised).toBe(true)
    ui = {
      ...ui,
      encounter: queueTimebomb(ui.encounter, DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze]),
    }
    ui = roundReducer(ui, tapApply)
    expect(ui.applyPoised).toBe(false)
    expect(ui.round.bank).toBe(0)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 9 })
  })

  it('DLR-143 AC1 — a trick already in flight cannot even be poised', () => {
    const ui = roundReducer(
      uiFrom(
        streakRound({
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 9) }],
        }),
      ),
      tapApply,
    )
    expect(ui.applyPoised).toBe(false)
    expect(ui.round.bank).toBe(3)
  })

  it('cancels a poise without spending anything', () => {
    let ui = roundReducer(uiFrom(streakRound()), tapApply)
    ui = roundReducer(ui, cancelApply)
    expect(ui.applyPoised).toBe(false)
    expect(ui.round.bank).toBe(3)
    expect(ui.round.multiplier).toBe(3)
  })
})

describe('DLR-143 AC2 — a pressed Apply Damage stacks with a pending Timebomb through the real press flow', () => {
  it('both the Timebomb and the queued payout settle in the same trick fold', () => {
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
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze])
    let ui = uiFrom(round, owed)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 9 })

    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Bells, 11) })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Bells, 11) })

    // The Timebomb detonates against the player this same resolution, reducing the payout to
    // floor(9 * 1/3) = 3 rather than destroying it, and — since APPLY_DAMAGE_DELAY_TRICKS is now
    // 0 — that reduced figure settles on this very resolution too.
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 3)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
  })
})

describe('Apply Damage — the commit (AC1, AC2, AC3)', () => {
  // DLR-109 — the second tap no longer pays anything in this transition. It QUEUES the frozen
  // cash-out on the encounter instead; `commitHandlers.ts`'s `applyResolution` settles it a trick
  // or more later. `roundReducer.delayedApply.test.ts` covers the settlement itself.
  it('AC2 — the second tap QUEUES the FULL bank × multiplier rather than paying it', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
    expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 9 })
  })

  it('AC2 — and costs the player nothing', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
  })

  it('AC2 — resets the bank and the multiplier, and un-poises', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.round.bank).toBe(0)
    expect(ui.round.multiplier).toBe(0)
    expect(ui.applyPoised).toBe(false)
  })

  it('AC1 — the committing tap spends APPLY_DAMAGE_AP_COST; the poising tap spends nothing', () => {
    const poised = roundReducer(uiFrom(streakRound()), tapApply)
    expect(poised.buffActivation.apPool).toBe(STARTING_AP)

    const committed = roundReducer(poised, tapApply)
    expect(committed.buffActivation.apPool).toBe(STARTING_AP - APPLY_DAMAGE_AP_COST)
  })

  it('AC3 — no trick is resolved, so no reveal is held and the hand stays live', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.resolvedTrick).toBeNull()
    expect(ui.round.lastResolution).toBeNull()
    expect(ui.round.phase).toBe(RoundPhase.AwaitingLead)
    expect(ui.round.currentTrick).toEqual([])
  })

  it('AC3 / DLR-141 — the player then plays their card by the ordinary rules, against a zeroed bank, and taking the hit reduces the queued payout to APPLY_DAMAGE_HIT_RETENTION floored, landing at that reduced figure on this same trick', () => {
    let ui = apply(
      uiFrom(
        makeRound({
          leader: PlayerSide.Player,
          trumpSuit: Suit.Keys,
          bank: 3,
          multiplier: 3,
          hands: {
            [PlayerSide.Player]: [card(Suit.Bells, 2)],
            [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
          },
          currentTrick: [],
        }),
      ),
    )
    expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 9 })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Bells, 2) })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Bells, 2) })

    // The trick is lost, but the bank was already spent — so the forced cash-out pays nothing.
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    expect(ui.resolvedTrick?.resolution.cashOut).toBe(0)
    // DLR-141 — the player lost health on this trick, reducing the queued payout to
    // APPLY_DAMAGE_HIT_RETENTION of its value, floored. Under DLR-143's 1-trick settle
    // (APPLY_DAMAGE_DELAY_TRICKS = 0), a fresh press's single owed resolution comes due on this
    // very trick too, so the reduced figure lands here rather than staying queued.
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(
      quarryHealthForEncounter(0) - Math.floor(9 * APPLY_DAMAGE_HIT_RETENTION),
    )
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 1)
  })

  it('queuing a lethal streak does not end the fight — the payout is queued, not paid', () => {
    const ui = apply(uiFrom(makeRound({ leader: PlayerSide.Player, bank: 500, multiplier: 2 })))
    expect(isEncounterResolved(ui.encounter)).toBe(false)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
    // AC2 holds on the eventual killing blow too: the player took nothing for pressing.
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 1000 })
  })

  it('a further tap on a resolved fight is inert rather than throwing', () => {
    const resolved = applyDamage(startEncounter(0), {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: quarryHealthForEncounter(0),
    })
    // Already frozen, as it would be by the transition that actually resolved the fight —
    // `captureUnplayed` writes this field once, and this fixture skips straight to "after that",
    // so it must not still read `null` or `captureUnplayed` would fire a second time here and the
    // identity check below would fail for a reason unrelated to what this test is proving.
    const settled = {
      ...uiFrom(makeRound({ leader: PlayerSide.Player }), resolved),
      unplayedAtResolve: 0,
    }
    expect(roundReducer(settled, tapApply)).toBe(settled)
  })
})
