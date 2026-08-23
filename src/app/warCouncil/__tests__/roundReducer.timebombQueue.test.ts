import { describe, expect, it } from 'vitest'
import { PlayerSide, Suit, TrickOutcome } from '../../../warCouncil'
import {
  DuelSide,
  TIMEBOMB_PLAYER_DAMAGE,
  TIMEBOMB_QUARRY_DAMAGE,
  NO_PENDING_TIMEBOMB,
  isEncounterResolved,
  queueTimebomb,
  startEncounter,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind } from '../roundUiState'
import { card, discardsRemainingFixture, makeRound } from './roundFixture'

// The Timebomb queue's own behaviour — booking a mark against the winner of a marked trick, and
// (DLR-91 D1/D3/D5) paying it at the NEXT trick's resolution rather than at the next hand's deal.
// Split out of `roundReducer.timebomb.test.ts`, which stayed with the mark/arm control mechanics,
// to keep both files under the 400-line budget.

const tapTimebomb = { kind: RoundUiActionKind.TapTimebomb } as const

describe('the queue write (AC3/AC6)', () => {
  it('queues TIMEBOMB_QUARRY_DAMAGE for the Quarry, replacing the normal cash-out, when a marked trick is lost cleanly', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 2,
      multiplier: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    const encounter = startEncounter(0)
    let ui = createRoundUiState({
      round,
      encounter,
      cheats: [],
      timebombCharges: 1,
      poisonGuardHeld: false,
      bankClimbBonus: 0,
      discardsRemaining: discardsRemainingFixture,
    })
    ui = roundReducer(ui, tapTimebomb)
    ui = roundReducer(ui, tapTimebomb)
    const target = card(Suit.Bells, 2)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // marks it
    expect(ui.round.primedCards).toEqual([target])

    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // arms to play
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // commits

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    expect(ui.resolvedTrick?.resolution.timebombTarget).toBe(DuelSide.Quarry)
    expect(ui.encounter.pendingTimebomb[DuelSide.Quarry]).toBe(TIMEBOMB_QUARRY_DAMAGE)
    expect(ui.encounter.health[DuelSide.Player]).toBe(encounter.health[DuelSide.Player])
    expect(ui.round.bank).toBe(2)
    expect(ui.round.multiplier).toBe(2)
  })

  it('books against the player, mirrored, when a marked trick is won', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 0,
      multiplier: 0,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)], // the Witch — wins regardless of trump
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    let ui = createRoundUiState({
      round,
      encounter: startEncounter(0),
      cheats: [],
      timebombCharges: 1,
      poisonGuardHeld: false,
      bankClimbBonus: 0,
      discardsRemaining: discardsRemainingFixture,
    })
    ui = roundReducer(ui, tapTimebomb)
    ui = roundReducer(ui, tapTimebomb)
    const target = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // marks it
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // arms to play
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // commits

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.resolvedTrick?.resolution.timebombTarget).toBe(DuelSide.Player)
    expect(ui.encounter.pendingTimebomb[DuelSide.Player]).toBe(TIMEBOMB_PLAYER_DAMAGE)
    // The ordinary bank climb is untouched by the mark.
    expect(ui.round.bank).toBe(1)
    expect(ui.round.multiplier).toBe(1)
  })

  it('leaves pendingTimebomb at zero for an unmarked trick', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    let ui = createRoundUiState({
      round,
      encounter: startEncounter(0),
      cheats: [],
      timebombCharges: 1,
      poisonGuardHeld: false,
      bankClimbBonus: 0,
      discardsRemaining: discardsRemainingFixture,
    })
    const target = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(ui.encounter.pendingTimebomb).toEqual(NO_PENDING_TIMEBOMB)
  })

  it('AC7 — a marked trick whose own cash-out empties the Quarry’s bar leaves pendingTimebomb at zero', () => {
    // A SkullWin: the player wins a trick carrying a skull, which is a loss by the item's own
    // rule and is NOT eligible for AC5's replacement (that only covers a CleanLoss), so its own
    // cash-out fires normally — sized here to empty the Quarry outright, exactly the construction
    // `roundReducer.bank.test.ts`'s "stops accepting taps" spec uses.
    const target = card(Suit.Bells, 9) // the Witch — wins regardless of trump
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 500,
      multiplier: 2,
      skulledCards: [target],
      hands: {
        [PlayerSide.Player]: [target],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    let ui = createRoundUiState({
      round,
      encounter: startEncounter(0),
      cheats: [],
      timebombCharges: 1,
      poisonGuardHeld: false,
      bankClimbBonus: 0,
      discardsRemaining: discardsRemainingFixture,
    })
    ui = roundReducer(ui, tapTimebomb)
    ui = roundReducer(ui, tapTimebomb)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // marks it
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // arms to play
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // commits

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.SkullWin)
    expect(isEncounterResolved(ui.encounter)).toBe(true)
    expect(ui.encounter.pendingTimebomb).toEqual(NO_PENDING_TIMEBOMB)
  })
})

describe('D1 — poison is paid at the trick that resolves it, not at the next hand', () => {
  it('a mark booked at one trick is paid at the very next trick, not at the next hand', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)], // the Witch — wins cleanly regardless of trump
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    // The queue already owes the player poison BEFORE this trick is played — as if booked by an
    // earlier trick this hand — so this spec exercises payment, not booking.
    const owedEncounter = queueTimebomb(startEncounter(0), DuelSide.Player)
    let ui = createRoundUiState({
      round,
      encounter: owedEncounter,
      cheats: [],
      timebombCharges: 1,
      poisonGuardHeld: false,
      bankClimbBonus: 0,
      discardsRemaining: discardsRemainingFixture,
    })
    const target = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // arms to play
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // commits

    // A clean win: the trick itself costs nothing, so the whole drop is the poison paid HERE.
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.health[DuelSide.Player]).toBe(
      owedEncounter.health[DuelSide.Player] - TIMEBOMB_PLAYER_DAMAGE,
    )
    expect(ui.encounter.pendingTimebomb).toEqual(NO_PENDING_TIMEBOMB)
  })

  it('the queue is cleared by the trick that pays it, so it is never paid twice', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9), card(Suit.Keys, 9)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 2)],
      },
      currentTrick: [],
    })
    const owedEncounter = queueTimebomb(startEncounter(0), DuelSide.Player)
    let ui = createRoundUiState({
      round,
      encounter: owedEncounter,
      cheats: [],
      timebombCharges: 1,
      poisonGuardHeld: false,
      bankClimbBonus: 0,
      discardsRemaining: discardsRemainingFixture,
    })

    // Trick 1 — pays the queued poison and clears it.
    const first = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: first })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: first })
    const healthAfterFirst = ui.encounter.health[DuelSide.Player]
    expect(healthAfterFirst).toBe(owedEncounter.health[DuelSide.Player] - TIMEBOMB_PLAYER_DAMAGE)
    expect(ui.encounter.pendingTimebomb).toEqual(NO_PENDING_TIMEBOMB)

    // Trick 2 — the queue is empty, so this clean win costs the player nothing more.
    ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
    const second = card(Suit.Keys, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: second })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: second })

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.health[DuelSide.Player]).toBe(healthAfterFirst)
  })
})

describe('DLR-91 AC4 — the Poison Guard through the reducer', () => {
  it('a held Guard survives the poison hit and is spent, leaving the streak standing', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 2,
      multiplier: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)], // the Witch — wins cleanly regardless of trump
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    // Poison already owed to the player, as if booked by an earlier trick this hand.
    const owedEncounter = queueTimebomb(startEncounter(0), DuelSide.Player)
    let ui = createRoundUiState({
      round,
      encounter: owedEncounter,
      cheats: [],
      timebombCharges: 0,
      poisonGuardHeld: true,
      bankClimbBonus: 0,
      discardsRemaining: discardsRemainingFixture,
    })

    const target = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // arms to play
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // commits

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.resolvedTrick?.resolution.poisonGuardSpent).toBe(true)
    // The health is still lost — the Guard buys back the streak, never the health.
    expect(ui.encounter.health[DuelSide.Player]).toBe(
      owedEncounter.health[DuelSide.Player] - TIMEBOMB_PLAYER_DAMAGE,
    )
    // The streak survives: an ordinary clean win still banks the trick, and no cash-out fired.
    expect(ui.round.bank).toBe(3)
    expect(ui.round.multiplier).toBe(3)
    expect(ui.poisonGuardHeld).toBe(false)
  })

  it('the Guard fires only once; a second poison hit in the same fight lands in full', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 2,
      multiplier: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9), card(Suit.Keys, 9)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 2)],
      },
      currentTrick: [],
    })
    const owedEncounter = queueTimebomb(startEncounter(0), DuelSide.Player)
    let ui = createRoundUiState({
      round,
      encounter: owedEncounter,
      cheats: [],
      timebombCharges: 0,
      poisonGuardHeld: true,
      bankClimbBonus: 0,
      discardsRemaining: discardsRemainingFixture,
    })

    // Trick 1 — the Guard suppresses the reset and is spent.
    const first = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: first })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: first })
    expect(ui.poisonGuardHeld).toBe(false)
    expect(ui.round.bank).toBe(3)
    expect(ui.round.multiplier).toBe(3)

    // A second poison hit lands this fight, with the Guard already spent — simulating a mark an
    // earlier trick this hand booked, the same way `owedEncounter` above simulates the first.
    ui = { ...ui, encounter: queueTimebomb(ui.encounter, DuelSide.Player) }
    ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })

    const second = card(Suit.Keys, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: second })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: second })

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.resolvedTrick?.resolution.poisonGuardSpent).toBe(false)
    // No Guard held this time — the streak cashes out and resets.
    expect(ui.round.bank).toBe(0)
    expect(ui.round.multiplier).toBe(0)
    expect(ui.poisonGuardHeld).toBe(false)
  })
})
