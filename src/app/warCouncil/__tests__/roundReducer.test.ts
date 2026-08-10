import { describe, expect, it } from 'vitest'
import {
  AbilityChoiceKind,
  CardRank,
  IllegalMoveReason,
  PlayerSide,
  RoundPhase,
  Suit,
  TRICKS_PER_ROUND,
  currentTurn,
  dealRound,
  legalMoves,
  quarryIntent,
  type AbilityChoice,
} from '../../../warCouncil'
import {
  createRoundUiState,
  roundReducer,
  RoundUiActionKind,
  type ResolvedTrick,
  type RoundUiState,
} from '../roundReducer'
import { card, makeRound } from './roundFixture'

const tap = (c: Parameters<typeof card>[0] extends never ? never : ReturnType<typeof card>) =>
  ({ kind: RoundUiActionKind.TapCard, card: c }) as const
const carryOn = { kind: RoundUiActionKind.CarryOn } as const

// A deterministic RNG, duplicated here to match the same local pattern the engine's own
// `playCard.test.ts`, `deal.test.ts`, and `cpuPlayer.test.ts` each already use — never
// `Math.random()` in anything that must be reproducible.
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

describe('createRoundUiState', () => {
  it('does not play the Quarry’s opening lead — it is a pure restructuring of its argument', () => {
    const initialState = makeRound({ leader: PlayerSide.Cpu })
    const ui = createRoundUiState(initialState)
    expect(ui.round).toBe(initialState)
    expect(ui.resolvedTrick).toBeNull()
    expect(ui.cpuFault).toBeNull()
    expect(ui.armed).toBeNull()
    expect(ui.prompt).toBeNull()
  })

  it('leaves a Quarry lead readable by quarryIntent before anything is played', () => {
    const ui = createRoundUiState(makeRound({ leader: PlayerSide.Cpu }))
    expect(quarryIntent(ui.round)).not.toBeNull()
  })

  it('leaves the table empty when the player leads', () => {
    const ui = createRoundUiState(makeRound({ leader: PlayerSide.Player }))
    expect(ui.round.currentTrick).toHaveLength(0)
    expect(ui.armed).toBeNull()
  })
})

describe('CarryOn commits a pending Quarry lead', () => {
  it('puts exactly one Quarry card on the table and leaves cpuFault null', () => {
    let ui = createRoundUiState(makeRound({ leader: PlayerSide.Cpu }))
    ui = roundReducer(ui, carryOn)
    expect(ui.round.currentTrick).toHaveLength(1)
    expect(ui.round.currentTrick[0].side).toBe(PlayerSide.Cpu)
    expect(ui.cpuFault).toBeNull()
  })

  it('is a no-op when the player is to lead', () => {
    const ui = createRoundUiState(makeRound({ leader: PlayerSide.Player }))
    const next = roundReducer(ui, carryOn)
    expect(next).toBe(ui)
  })

  it('clears a held reveal and commits the next Quarry lead in one transition', () => {
    // Built directly rather than driven, so the scenario — a reveal held, and the Quarry to
    // lead next — is deterministic rather than depending on who happens to win a trick.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      tricksWon: { [PlayerSide.Player]: 1, [PlayerSide.Cpu]: 1 },
    })
    const heldReveal: ResolvedTrick = {
      cards: [
        { side: PlayerSide.Player, card: card(Suit.Bells, 7) },
        { side: PlayerSide.Cpu, card: card(Suit.Bells, 4) },
      ],
      winner: PlayerSide.Player,
    }
    let ui: RoundUiState = { ...createRoundUiState(round), resolvedTrick: heldReveal }
    ui = roundReducer(ui, carryOn)
    expect(ui.resolvedTrick).toBeNull()
    expect(ui.round.currentTrick).toHaveLength(1)
    expect(ui.round.currentTrick[0].side).toBe(PlayerSide.Cpu)
  })
})

describe('a full round driven purely by CarryOn and taps', () => {
  it('reaches RoundPhase.Complete with all thirteen tricks played (AC1)', () => {
    // Unlike `makeRound()`'s deliberately asymmetric fixture hands (sized for the smaller
    // scenarios above), a full round needs both hands dealt the real 13 cards each —
    // `dealRound` is what actually produces that shape.
    let ui = createRoundUiState(dealRound(PlayerSide.Cpu, lcg(2026)))
    let guard = 0
    while (ui.round.phase !== RoundPhase.Complete) {
      guard += 1
      if (guard > 200) {
        throw new Error('round did not complete — infinite loop guard tripped')
      }
      if (ui.cpuFault !== null) {
        throw new Error(`the engine rejected the Quarry's own move — reason: ${ui.cpuFault}`)
      }
      if (ui.resolvedTrick !== null) {
        ui = roundReducer(ui, carryOn)
        continue
      }
      if (currentTurn(ui.round) === PlayerSide.Cpu && ui.round.currentTrick.length === 0) {
        ui = roundReducer(ui, carryOn)
        continue
      }
      const legal = legalMoves(ui.round, PlayerSide.Player)
      const next = legal[0]
      ui = roundReducer(ui, tap(next))
      ui = roundReducer(ui, tap(next))
      // A Fox or a Woodcutter opens the ability prompt on the second tap instead of
      // committing — answer it with the simplest always-legal choice so the loop
      // doesn't stall on `canAct`'s `prompt === null` guard.
      if (ui.prompt !== null) {
        const promptCard = ui.prompt
        const choice: AbilityChoice =
          promptCard.rank === CardRank.Fox
            ? { kind: AbilityChoiceKind.FoxDecline }
            : { kind: AbilityChoiceKind.WoodcutterDiscard, discard: ui.round.drawPile[0] }
        ui = roundReducer(ui, { kind: RoundUiActionKind.ChooseAbility, choice })
      }
    }
    expect(ui.round.phase).toBe(RoundPhase.Complete)
    expect(ui.round.tricksPlayed).toBe(TRICKS_PER_ROUND)
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
  it('reports a fault instead of throwing when the Quarry has no legal lead', () => {
    // chooseCpuMove throws on an empty legal set — lowestCard([]) is undefined and
    // card.rank then throws — so advanceQuarryLead must guard before calling it. The lead
    // is no longer committed by createRoundUiState (Task 5), so this now surfaces on the
    // CarryOn that commits it, not at creation.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      hands: { [PlayerSide.Player]: [card(Suit.Bells, 7)], [PlayerSide.Cpu]: [] },
      tricksPlayed: 5,
    })
    let ui = createRoundUiState(round)
    expect(ui.cpuFault).toBeNull()
    ui = roundReducer(ui, carryOn)
    expect(ui.cpuFault).toBe('noLegalMove')
    expect(ui.round.currentTrick).toHaveLength(0)
  })
})
