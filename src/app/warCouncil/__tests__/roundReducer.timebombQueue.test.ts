import { describe, expect, it } from 'vitest'
import { PlayerSide, Suit, TrickOutcome } from '../../../warCouncil'
import {
  BuffTier,
  DuelSide,
  TIMEBOMB_PLAYER_DAMAGE,
  TIMEBOMB_QUARRY_DAMAGE,
  TIMEBOMB_DAMAGE,
  NO_PENDING_TIMEBOMB,
  queueTimebomb,
  startEncounter,
  timebombBuff,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { card, discardsRemainingFixture, makeRound } from './roundFixture'

// The Timebomb queue's own behaviour — booking a mark against the winner of a marked trick, and
// (DLR-91 D1/D3/D5) paying it at the NEXT trick's resolution rather than at the next hand's deal.
// Split out of `roundReducer.timebomb.test.ts`, which stayed with the mark/arm control mechanics,
// to keep both files under the 400-line budget.

const bronzeTimebomb = timebombBuff(BuffTier.Bronze, 1)

/** Spend the bronze Timebomb through the ordinary two-tap `TapBuff` flow — DLR-132 replaced the
 *  retired `TapTimebomb` action with this. */
function armTimebomb(ui: RoundUiState): RoundUiState {
  const opened = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
  const poised = roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: bronzeTimebomb.id })
  return roundReducer(poised, { kind: RoundUiActionKind.TapBuff, id: bronzeTimebomb.id })
}

describe('the queue write (AC3/AC6)', () => {
  it('queues TIMEBOMB_QUARRY_DAMAGE for the Quarry, replacing the normal cash-out, when a marked trick is lost cleanly', () => {
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
    const encounter = startEncounter(0)
    let ui = createRoundUiState({
      round,
      encounter,
      blastGuardHeld: false,
      baseDamageBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [bronzeTimebomb],
    })
    ui = armTimebomb(ui)
    const target = card(Suit.Bells, 2)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // marks it
    expect(ui.round.primedCards).toEqual([target])

    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // arms to play
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // commits

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    expect(ui.resolvedTrick?.resolution.timebombTarget).toBe(DuelSide.Quarry)
    expect(ui.encounter.pendingTimebomb[DuelSide.Quarry]).toBe(TIMEBOMB_QUARRY_DAMAGE)
    expect(ui.encounter.health[DuelSide.Player]).toBe(encounter.health[DuelSide.Player])
    expect(ui.round.total).toBe(2)
    expect(ui.round.roll).toBe(2)
  })

  it('books against the player, mirrored, when a marked trick is won', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      total: 0,
      roll: 0,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)], // the Witch — wins regardless of trump
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    let ui = createRoundUiState({
      round,
      encounter: startEncounter(0),
      blastGuardHeld: false,
      baseDamageBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [bronzeTimebomb],
    })
    ui = armTimebomb(ui)
    const target = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // marks it
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // arms to play
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // commits

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.resolvedTrick?.resolution.timebombTarget).toBe(DuelSide.Player)
    expect(ui.encounter.pendingTimebomb[DuelSide.Player]).toBe(TIMEBOMB_PLAYER_DAMAGE)
    // The ordinary total climb is untouched by the mark.
    expect(ui.round.total).toBe(1)
    expect(ui.round.roll).toBe(1)
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
      blastGuardHeld: false,
      baseDamageBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [],
    })
    const target = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(ui.encounter.pendingTimebomb).toEqual(NO_PENDING_TIMEBOMB)
  })

  // DLR-156 B3 — DELETED, not rewritten: this case's whole premise was "a marked trick's OWN
  // cash-out empties the Quarry in the SAME transition that books/clears pendingTimebomb", built
  // on a SkullWin (eating a skull), which is a HURT outcome. AC7 pays the Quarry nothing on ANY
  // hurt outcome now — a hit cannot kill the Quarry any more, full stop; only the player's own
  // explicit `ApplyPot` on a BANKED trick can, and that is a separate dispatch from the trick's
  // own resolution. There is no reconstruction of "one trick's resolution both books a Timebomb
  // target AND kills the Quarry" left to test — the rule this case pinned no longer exists. What
  // DOES still matter — pendingTimebomb clearing correctly on an ordinary kill — is covered by
  // `roundReducer.quickKill.test.ts`'s own DLR-156 rewrite (a win banks, then `ApplyPot` kills).
})

describe('D1 — a Timebomb is paid at the trick that resolves it, not at the next hand', () => {
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
    // The queue already owes the player Timebomb BEFORE this trick is played — as if booked by an
    // earlier trick this hand — so this spec exercises payment, not booking.
    const owedEncounter = queueTimebomb(
      startEncounter(0),
      DuelSide.Player,
      TIMEBOMB_DAMAGE[BuffTier.Bronze],
    )
    let ui = createRoundUiState({
      round,
      encounter: owedEncounter,
      blastGuardHeld: false,
      baseDamageBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [],
    })
    const target = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // arms to play
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // commits

    // A clean win: the trick itself costs nothing, so the whole drop is the Timebomb paid HERE.
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
    const owedEncounter = queueTimebomb(
      startEncounter(0),
      DuelSide.Player,
      TIMEBOMB_DAMAGE[BuffTier.Bronze],
    )
    let ui = createRoundUiState({
      round,
      encounter: owedEncounter,
      blastGuardHeld: false,
      baseDamageBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [],
    })

    // Trick 1 — pays the queued Timebomb and clears it.
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

describe('DLR-91 AC4 — the Blast Guard through the reducer', () => {
  it('a held Guard survives the Timebomb hit and is spent, leaving the streak standing', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      total: 2,
      roll: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)], // the Witch — wins cleanly regardless of trump
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    // Timebomb already owed to the player, as if booked by an earlier trick this hand.
    const owedEncounter = queueTimebomb(
      startEncounter(0),
      DuelSide.Player,
      TIMEBOMB_DAMAGE[BuffTier.Bronze],
    )
    let ui = createRoundUiState({
      round,
      encounter: owedEncounter,
      blastGuardHeld: true,
      baseDamageBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [],
    })

    const target = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // arms to play
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target }) // commits

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.resolvedTrick?.resolution.blastGuardSpent).toBe(true)
    // The health is still lost — the Guard buys back the streak, never the health.
    expect(ui.encounter.health[DuelSide.Player]).toBe(
      owedEncounter.health[DuelSide.Player] - TIMEBOMB_PLAYER_DAMAGE,
    )
    // The streak survives: an ordinary clean win still banks the trick, and no cash-out fired.
    expect(ui.round.total).toBe(3)
    expect(ui.round.roll).toBe(3)
    expect(ui.blastGuardHeld).toBe(false)
  })

  it('the Guard fires only once; a second Timebomb hit in the same fight lands in full', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      total: 2,
      roll: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9), card(Suit.Keys, 9)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 2)],
      },
      currentTrick: [],
    })
    const owedEncounter = queueTimebomb(
      startEncounter(0),
      DuelSide.Player,
      TIMEBOMB_DAMAGE[BuffTier.Bronze],
    )
    let ui = createRoundUiState({
      round,
      encounter: owedEncounter,
      blastGuardHeld: true,
      baseDamageBonus: 0,
      discardsRemaining: discardsRemainingFixture,
      buffs: [],
    })

    // Trick 1 — the Guard suppresses the reset and is spent.
    const first = card(Suit.Bells, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: first })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: first })
    expect(ui.blastGuardHeld).toBe(false)
    expect(ui.round.total).toBe(3)
    expect(ui.round.roll).toBe(3)

    // A second Timebomb hit lands this fight, with the Guard already spent — simulating a mark an
    // earlier trick this hand booked, the same way `owedEncounter` above simulates the first.
    ui = {
      ...ui,
      encounter: queueTimebomb(ui.encounter, DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze]),
    }
    ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })

    const second = card(Suit.Keys, 9)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: second })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: second })

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.resolvedTrick?.resolution.blastGuardSpent).toBe(false)
    // No Guard held this time — the streak cashes out and resets.
    expect(ui.round.total).toBe(0)
    expect(ui.round.roll).toBe(0)
    expect(ui.blastGuardHeld).toBe(false)
  })
})
