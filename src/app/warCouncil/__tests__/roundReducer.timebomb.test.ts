import { describe, expect, it } from 'vitest'
import { isPrimed, PlayerSide, RoundPhase, Suit, TrickOutcome } from '../../../warCouncil'
import { BuffTier, TIMEBOMB_DAMAGE, timebombBuff } from '../../../hunt'
import { roundReducer } from '../roundReducer'
import {
  createRoundUiState,
  RoundUiActionKind,
  type ResolvedTrick,
  type RoundUiSeed,
} from '../roundUiState'
import { card, discardsRemainingFixture, encounterFixture, makeRound } from './roundFixture'

// DLR-132 — the mark/arm mechanics of a Timebomb, now driven through the ordinary two-tap
// `TapBuff` flow rather than the retired `TapTimebomb`/`CancelTimebomb` actions. The queue's
// booking and next-trick payment moved to `roundReducer.timebombQueue.test.ts` on DLR-91.

// A held reveal, built directly rather than driven, for the `canAct` gate specs below — the same
// construction `roundReducer.test.ts`'s own "clears a held reveal…" spec uses.
const heldReveal: ResolvedTrick = {
  cards: [
    { side: PlayerSide.Player, card: card(Suit.Bells, 7) },
    { side: PlayerSide.Cpu, card: card(Suit.Bells, 4) },
  ],
  winner: PlayerSide.Player,
  resolution: {
    outcome: TrickOutcome.CleanWin,
    bankAdded: 1,
    cashOut: 0,
    damageToPlayer: 0,
    bank: 1,
    multiplier: 1,
    cashedAtHandEnd: false,
    timebombTarget: null,
    timebombToQuarry: 0,
    blastGuardSpent: false,
    buffAccrual: null,
    firedBuffIds: [],
  },
  payout: null,
  timebombDamage: null,
}

const timebomb = timebombBuff(BuffTier.Bronze, 1)

function seed(overrides: Partial<RoundUiSeed> = {}): RoundUiSeed {
  return {
    round: makeRound(),
    encounter: encounterFixture,
    blastGuardHeld: false,
    bankClimbBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs: [timebomb],
    ...overrides,
  }
}

/** Open the panel, poise the given buff, then commit it — the two taps every row's activation
 *  takes. */
function spend(state: ReturnType<typeof createRoundUiState>, id: number) {
  const opened = roundReducer(state, { kind: RoundUiActionKind.ToggleLoadout })
  const poised = roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id })
  return roundReducer(poised, { kind: RoundUiActionKind.TapBuff, id })
}

describe('spending a Timebomb row arms the next hand-card tap', () => {
  it('carries that tier of damage from the spend to the prime', () => {
    const gold = timebombBuff(BuffTier.Gold, 5)
    const afterSpend = spend(createRoundUiState(seed({ buffs: [gold] })), gold.id)
    expect(afterSpend.timebombArmedDamage).toEqual(TIMEBOMB_DAMAGE[BuffTier.Gold])

    const target = afterSpend.round.hands[PlayerSide.Player][0]
    const primed = roundReducer(afterSpend, { kind: RoundUiActionKind.TapCard, card: target })
    expect(isPrimed(primed.round.primedCards, target)).toBe(true)
    expect(primed.timebombArmedDamage).toBeNull()
    expect(primed.primedTimebombDamage).toEqual(TIMEBOMB_DAMAGE[BuffTier.Gold])
  })

  it('removes the Timebomb from the pile once spent — DLR-142, single-use by default', () => {
    const before = createRoundUiState(seed())
    const after = spend(before, timebomb.id)
    expect(after.buffs).toHaveLength(before.buffs.length - 1)
  })
})

describe('marking (AC2)', () => {
  it('marks a hand card instead of playing it while armed', () => {
    let ui = spend(createRoundUiState(seed()), timebomb.id)
    expect(ui.timebombArmedDamage).not.toBeNull()

    const target = card(Suit.Bells, 7)
    const before = ui.round
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(ui.round.primedCards).toEqual([target])
    expect(ui.timebombArmedDamage).toBeNull()
    // Not a move: the trick and the tally are exactly as they were.
    expect(ui.round.currentTrick).toEqual(before.currentTrick)
    expect(ui.round.tricksPlayed).toBe(before.tricksPlayed)
  })

  it('marks a card illegal to play — HandFan must not block this', () => {
    // The Quarry led Moons and the player holds Moons, so a Bells card is illegal to PLAY —
    // exactly the fixture `roundReducer.test.ts`'s own rejection spec uses.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    let ui = spend(createRoundUiState(seed({ round })), timebomb.id)
    const offSuit = card(Suit.Bells, 7)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuit })
    expect(ui.round.primedCards).toEqual([offSuit])
    expect(ui.rejection).toBeNull()
  })
})

/** Poise then commit a second buff, WITHOUT re-toggling the panel — it is already open and stays
 *  open after a spend (AC2 allows more than one activation per trick). */
function tapTwice(state: ReturnType<typeof createRoundUiState>, id: number) {
  const poised = roundReducer(state, { kind: RoundUiActionKind.TapBuff, id })
  return roundReducer(poised, { kind: RoundUiActionKind.TapBuff, id })
}

describe('a refused re-tap while armed clears the armed state rather than half-applying', () => {
  it('re-priming an already-primed card is not a throw and marks nothing further', () => {
    const second = timebombBuff(BuffTier.Bronze, 2)
    let ui = spend(createRoundUiState(seed({ buffs: [timebomb, second] })), timebomb.id)
    const target = card(Suit.Bells, 7)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(ui.timebombArmedDamage).toBeNull()
    expect(ui.round.primedCards).toEqual([target])

    ui = tapTwice(ui, second.id)
    expect(() => roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })).not.toThrow()
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(ui.timebombArmedDamage).toBeNull()
    expect(ui.round.primedCards).toEqual([target])
  })
})

describe('the reducer never throws', () => {
  it('returns a state, not a RangeError, when TapCard names a card not in hand while armed', () => {
    const ui = spend(createRoundUiState(seed()), timebomb.id)
    // Not among makeRound()'s dealt player hand — it lives in the draw pile instead.
    const notInHand = card(Suit.Moons, 2)
    expect(() =>
      roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: notInHand }),
    ).not.toThrow()
    const next = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: notInHand })
    expect(next.timebombArmedDamage).toBeNull()
    expect(next.round.primedCards).toEqual([])
  })

  it('the loadout door will not open while a trick reveal is held, so a Timebomb cannot be armed then', () => {
    const ui = { ...createRoundUiState(seed()), resolvedTrick: heldReveal }
    const opened = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
    expect(opened.loadout).toBeNull()
  })
})
