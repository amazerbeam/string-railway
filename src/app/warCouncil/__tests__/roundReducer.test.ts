import { describe, expect, it } from 'vitest'
import {
  AbilityChoiceKind,
  IllegalMoveReason,
  PlayerSide,
  RoundPhase,
  Suit,
  currentTurn,
} from '../../../warCouncil'
import { createRoundUiState, roundReducer, RoundUiActionKind } from '../roundReducer'
import { card, makeRound } from './roundFixture'

const tap = (c: Parameters<typeof card>[0] extends never ? never : ReturnType<typeof card>) =>
  ({ kind: RoundUiActionKind.TapCard, card: c }) as const

describe('createRoundUiState', () => {
  it('plays the opponent’s lead when they lead the first trick', () => {
    const ui = createRoundUiState(makeRound({ leader: PlayerSide.Cpu }))
    expect(ui.round.currentTrick).toHaveLength(1)
    expect(ui.round.currentTrick[0].side).toBe(PlayerSide.Cpu)
    expect(currentTurn(ui.round)).toBe(PlayerSide.Player)
  })

  it('leaves the table empty when the player leads', () => {
    const ui = createRoundUiState(makeRound({ leader: PlayerSide.Player }))
    expect(ui.round.currentTrick).toHaveLength(0)
    expect(ui.armed).toBeNull()
  })
})

describe('tap-twice', () => {
  it('arms on the first tap without playing', () => {
    const ui = createRoundUiState(makeRound())
    const next = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(next.armed).toEqual(card(Suit.Bells, 7))
    expect(next.round.currentTrick).toHaveLength(0)
    expect(next.round.hands[PlayerSide.Player]).toHaveLength(6)
  })

  it('moves the arm when a different card is tapped', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 8)))
    expect(ui.armed).toEqual(card(Suit.Keys, 8))
    expect(ui.round.currentTrick).toHaveLength(0)
  })

  it('commits on the second tap of the same card', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(ui.armed).toBeNull()
    expect(ui.round.hands[PlayerSide.Player]).toHaveLength(5)
    // The player led, so the opponent answered in the same commit and the trick resolved.
    expect(ui.resolvedTrick).not.toBeNull()
    expect(ui.resolvedTrick?.cards).toHaveLength(2)
  })

  it('clears the arm on CancelSelection', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, { kind: RoundUiActionKind.CancelSelection })
    expect(ui.armed).toBeNull()
    expect(ui.prompt).toBeNull()
  })
})

describe('rejection', () => {
  it('names the engine’s own reason and leaves the round untouched', () => {
    // The opponent led Moons and the player holds Moons, so Bells is illegal.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    let ui = { ...createRoundUiState(round), round }
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    const before = ui.round
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(ui.rejection).toBe(IllegalMoveReason.MustFollowLeadSuit)
    expect(ui.round).toBe(before)
  })
})

describe('abilities', () => {
  it('opens the prompt instead of playing a Fox', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    expect(ui.prompt).toEqual(card(Suit.Keys, 3))
    expect(ui.armed).toBeNull()
    expect(ui.round.currentTrick).toHaveLength(0)
  })

  it('changes the trump suit when the exchange is chosen', () => {
    let ui = createRoundUiState(makeRound())
    expect(ui.round.trumpSuit).toBe(Suit.Bells)
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    ui = roundReducer(ui, {
      kind: RoundUiActionKind.ChooseAbility,
      choice: { kind: AbilityChoiceKind.FoxExchange, handCard: card(Suit.Moons, 5) },
    })
    expect(ui.round.trumpSuit).toBe(Suit.Moons)
    expect(ui.round.decree).toEqual(card(Suit.Moons, 5))
    expect(ui.prompt).toBeNull()
  })
})

describe('the trick beat', () => {
  it('derives the winner from the tricks-won delta', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Moons, 11)))
    ui = roundReducer(ui, tap(card(Suit.Moons, 11)))
    const winner = ui.resolvedTrick?.winner
    expect(winner).toBeDefined()
    expect(ui.round.tricksWon[winner!]).toBe(1)
  })

  it('clears the reveal on CarryOn', () => {
    let ui = createRoundUiState(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
    expect(ui.resolvedTrick).toBeNull()
  })

  it('completes the round on the thirteenth trick, holding it for the same CarryOn beat', () => {
    const round = makeRound({
      tricksPlayed: 12,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 7)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 4)],
      },
    })
    let ui = { ...createRoundUiState(round), round }
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(ui.round.phase).toBe(RoundPhase.Complete)
    expect(ui.resolvedTrick).not.toBeNull()

    // The deciding trick is held exactly like every other — CarryOn clears it even though
    // the round is already complete, which is what lets the mount show it before the
    // round-over panel rather than jumping straight there.
    ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
    expect(ui.resolvedTrick).toBeNull()
    expect(ui.round.phase).toBe(RoundPhase.Complete)
  })
})

describe('a corrupt opponent turn', () => {
  it('reports a fault instead of throwing when the opponent has no legal move', () => {
    // chooseCpuMove throws on an empty legal set — lowestCard([]) is undefined and
    // card.rank then throws — so the reducer must guard before calling it.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      hands: { [PlayerSide.Player]: [card(Suit.Bells, 7)], [PlayerSide.Cpu]: [] },
      tricksPlayed: 5,
    })
    const ui = createRoundUiState(round)
    expect(ui.cpuFault).toBe('noLegalMove')
    expect(ui.round.currentTrick).toHaveLength(0)
  })
})
