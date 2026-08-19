import { describe, expect, it } from 'vitest'
import { PlayerSide, RoundPhase, Suit, TrickOutcome } from '../../../warCouncil'
import { roundReducer } from '../roundReducer'
import {
  createRoundUiState,
  EnvenomStage,
  RoundUiActionKind,
  type ResolvedTrick,
} from '../roundUiState'
import { card, encounterFixture, envenomChargesFixture, makeRound } from './roundFixture'

// The mark/arm mechanics of the Envenom control itself — the stage cycle, the mutual-exclusion
// with a Cheat selection, and marking a card. The queue's booking and next-trick payment moved to
// `roundReducer.poison.test.ts` on DLR-91, splitting the file below the 400-line budget.

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
    envenomTarget: null,
    poisonToQuarry: 0,
    poisonGuardSpent: false,
  },
}

const tapEnvenom = { kind: RoundUiActionKind.TapEnvenom } as const
const cancelEnvenom = { kind: RoundUiActionKind.CancelEnvenom } as const

function seededUi(charges = envenomChargesFixture) {
  return createRoundUiState({
    round: makeRound(),
    encounter: encounterFixture,
    cheats: [{ id: 1 }],
    envenomCharges: charges,
    poisonGuardHeld: false,
  })
}

describe('the stage cycle (AC2)', () => {
  it('cycles null -> poised -> armed -> null on three taps, the charge unspent throughout', () => {
    let ui = seededUi(1)
    ui = roundReducer(ui, tapEnvenom)
    expect(ui.envenomStage).toBe(EnvenomStage.Poised)
    expect(ui.envenomCharges).toBe(1)

    ui = roundReducer(ui, tapEnvenom)
    expect(ui.envenomStage).toBe(EnvenomStage.Armed)
    expect(ui.envenomCharges).toBe(1)

    ui = roundReducer(ui, tapEnvenom)
    expect(ui.envenomStage).toBeNull()
    expect(ui.envenomCharges).toBe(1)
  })
})

describe('no charges held', () => {
  it('returns the identical state on TapEnvenom', () => {
    const ui = seededUi(0)
    expect(roundReducer(ui, tapEnvenom)).toBe(ui)
  })
})

describe('TapEnvenom respects the same canAct gate the Cheat uses', () => {
  it('no-ops while a trick reveal is held', () => {
    const ui = { ...seededUi(), resolvedTrick: heldReveal }
    expect(roundReducer(ui, tapEnvenom)).toBe(ui)
  })

  it('no-ops while a prompt is open', () => {
    const ui = { ...seededUi(), prompt: card(Suit.Keys, 3) }
    expect(roundReducer(ui, tapEnvenom)).toBe(ui)
  })

  it('no-ops on a CPU fault', () => {
    const ui = { ...seededUi(), cpuFault: 'noLegalMove' as const }
    expect(roundReducer(ui, tapEnvenom)).toBe(ui)
  })

  it('no-ops on the Quarry’s turn', () => {
    const ui = createRoundUiState({
      round: makeRound({ leader: PlayerSide.Cpu }),
      encounter: encounterFixture,
      cheats: [],
      envenomCharges: 1,
      poisonGuardHeld: false,
    })
    expect(roundReducer(ui, tapEnvenom)).toBe(ui)
  })
})

describe('marking (AC2)', () => {
  it('marks a hand card instead of playing it while armed', () => {
    let ui = seededUi(1)
    ui = roundReducer(ui, tapEnvenom)
    ui = roundReducer(ui, tapEnvenom)
    expect(ui.envenomStage).toBe(EnvenomStage.Armed)

    const target = card(Suit.Bells, 7)
    const before = ui.round
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(ui.round.envenomedCards).toEqual([target])
    expect(ui.envenomCharges).toBe(0)
    expect(ui.envenomStage).toBeNull()
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
    let ui = createRoundUiState({
      round,
      encounter: encounterFixture,
      cheats: [],
      envenomCharges: 1,
      poisonGuardHeld: false,
    })
    ui = roundReducer(ui, tapEnvenom)
    ui = roundReducer(ui, tapEnvenom)
    const offSuit = card(Suit.Bells, 7)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuit })
    expect(ui.round.envenomedCards).toEqual([offSuit])
    expect(ui.rejection).toBeNull()
  })

  it('clears the stage and spends nothing on a second tap of an already-marked card, rather than throwing', () => {
    let ui = seededUi(2)
    ui = roundReducer(ui, tapEnvenom)
    ui = roundReducer(ui, tapEnvenom)
    const target = card(Suit.Bells, 7)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(ui.envenomCharges).toBe(1)

    ui = roundReducer(ui, tapEnvenom)
    ui = roundReducer(ui, tapEnvenom)
    expect(() => roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })).not.toThrow()
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(ui.envenomStage).toBeNull()
    expect(ui.envenomCharges).toBe(1)
    expect(ui.round.envenomedCards).toEqual([target])
  })
})

describe('mutual exclusion — marking and arming a Cheat reinterpret the same tap', () => {
  it('poising Envenom clears a held Cheat selection', () => {
    let ui = seededUi(1)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: 1 })
    expect(ui.cheatSelection).not.toBeNull()
    ui = roundReducer(ui, tapEnvenom)
    expect(ui.envenomStage).toBe(EnvenomStage.Poised)
    expect(ui.cheatSelection).toBeNull()
  })

  it('arming a Cheat clears a held Envenom selection', () => {
    let ui = seededUi(1)
    ui = roundReducer(ui, tapEnvenom)
    expect(ui.envenomStage).toBe(EnvenomStage.Poised)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCheat, id: 1 })
    expect(ui.cheatSelection).not.toBeNull()
    expect(ui.envenomStage).toBeNull()
  })

  it('poising Envenom drops a card armed-to-play, so the next tap is never ambiguous', () => {
    let ui = seededUi(1)
    const target = card(Suit.Bells, 7)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    expect(ui.armed).toEqual(target)
    ui = roundReducer(ui, tapEnvenom)
    expect(ui.armed).toBeNull()
    expect(ui.envenomStage).toBe(EnvenomStage.Poised)
  })
})

describe('CancelEnvenom', () => {
  it('clears the stage and spends nothing', () => {
    let ui = seededUi(1)
    ui = roundReducer(ui, tapEnvenom)
    ui = roundReducer(ui, cancelEnvenom)
    expect(ui.envenomStage).toBeNull()
    expect(ui.envenomCharges).toBe(1)
  })
})

describe('commit() clears a poised-but-unarmed selection (regression)', () => {
  it('poising Envenom, then playing an unrelated card, leaves nothing armed', () => {
    let ui = seededUi(1)
    ui = roundReducer(ui, tapEnvenom)
    expect(ui.envenomStage).toBe(EnvenomStage.Poised)

    // An ordinary, unrelated card — two taps: arm to play, then commit. Neither tap names
    // Envenom at all. Rank 8 carries no ability choice, unlike the Fox (3) or Woodcutter (5),
    // so this reaches `commit()` directly rather than opening a prompt. Keys 8 beats the CPU
    // fixture's Keys 6 follow (led-suit, non-trump), so the player wins and leads the next trick —
    // keeping the scenario reachable by a real tap sequence rather than needing the round rigged.
    const target = card(Suit.Keys, 8)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })

    expect(ui.envenomStage).toBeNull()
    expect(ui.envenomCharges).toBe(1) // an ordinary play never spends a charge

    // Clear the held reveal so it is genuinely the player's turn again, then confirm the very
    // next tap starts over at Poised rather than skipping straight to Armed — the misclick guard
    // AC2 requires before an irreversible mark.
    ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
    const next = roundReducer(ui, tapEnvenom)
    expect(next.envenomStage).toBe(EnvenomStage.Poised)
  })
})

describe('the reducer never throws', () => {
  it('returns a state, not a RangeError, when TapCard names a card not in hand while armed', () => {
    let ui = seededUi(1)
    ui = roundReducer(ui, tapEnvenom)
    ui = roundReducer(ui, tapEnvenom)
    // Not among makeRound()'s dealt player hand — it lives in the draw pile instead.
    const notInHand = card(Suit.Moons, 2)
    expect(() =>
      roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: notInHand }),
    ).not.toThrow()
    const next = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: notInHand })
    expect(next.envenomStage).toBeNull()
    expect(next.envenomCharges).toBe(1)
    expect(next.round.envenomedCards).toEqual([])
  })
})
