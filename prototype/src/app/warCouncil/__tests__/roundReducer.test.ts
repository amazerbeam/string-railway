import { describe, expect, it } from 'vitest'
import {
  AbilityChoiceKind,
  IllegalMoveReason,
  PlayerSide,
  RoundPhase,
  Suit,
  TrickOutcome,
  currentTurn,
  dealRound,
  legalMoves,
  quarryIntent,
  type AbilityChoice,
  type WarCouncilState,
} from '../../../warCouncil'
import {
  BuffTier,
  cheatBuff,
  HAND_SIZE,
  startEncounter,
  type Buff,
  type EncounterState,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import {
  cheatArmed,
  createRoundUiState,
  RoundUiActionKind,
  type ResolvedTrick,
  type RoundUiState,
} from '../roundUiState'
import { card, discardsRemainingFixture, makeRound } from './roundFixture'

const tap = (c: Parameters<typeof card>[0] extends never ? never : ReturnType<typeof card>) =>
  ({ kind: RoundUiActionKind.TapCard, card: c }) as const
const carryOn = { kind: RoundUiActionKind.CarryOn } as const

// Every call site wants a fresh encounter and an empty pile unless a scenario is specifically
// testing one of those — this is `createRoundUiState`'s seed object, spelled once.
function uiFrom(
  round: WarCouncilState,
  encounter: EncounterState = startEncounter(0),
  buffs: readonly Buff[] = [],
): RoundUiState {
  return createRoundUiState({
    round,
    encounter,
    baseDamageBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs,
  })
}

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
  it('does not play the Quarry’s opening lead — it is a pure restructuring of its seed', () => {
    const initialState = makeRound({ leader: PlayerSide.Cpu })
    const ui = uiFrom(initialState)
    expect(ui.round).toBe(initialState)
    expect(ui.resolvedTrick).toBeNull()
    expect(ui.cpuFault).toBeNull()
    expect(ui.armed).toBeNull()
    expect(ui.prompt).toBeNull()
  })

  it('leaves a Quarry lead readable by quarryIntent before anything is played', () => {
    const ui = uiFrom(makeRound({ leader: PlayerSide.Cpu }))
    expect(quarryIntent(ui.round)).not.toBeNull()
  })

  it('leaves the table empty when the player leads', () => {
    const ui = uiFrom(makeRound({ leader: PlayerSide.Player }))
    expect(ui.round.currentTrick).toHaveLength(0)
    expect(ui.armed).toBeNull()
  })

  it('seeds the encounter from the given seed, unchanged', () => {
    const encounter = startEncounter(0)
    const ui = uiFrom(makeRound(), encounter)
    expect(ui.encounter).toBe(encounter)
  })
})

describe('CarryOn commits a pending Quarry lead', () => {
  it('puts exactly one Quarry card on the table and leaves cpuFault null', () => {
    let ui = uiFrom(makeRound({ leader: PlayerSide.Cpu }))
    ui = roundReducer(ui, carryOn)
    expect(ui.round.currentTrick).toHaveLength(1)
    expect(ui.round.currentTrick[0].side).toBe(PlayerSide.Cpu)
    expect(ui.cpuFault).toBeNull()
  })

  it('is a no-op when the player is to lead', () => {
    const ui = uiFrom(makeRound({ leader: PlayerSide.Player }))
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
      resolution: {
        outcome: TrickOutcome.HighVictory,
        trickDamage: { base: 1, buffDamage: 0, buffMult: 1, overlapBonus: 0, dealt: 1 },
        cashOut: 0,
        damageToPlayer: 0,
        total: 1,
        roll: 1,
        buffAccrual: null,
        firedBuffIds: [],
        treasureBonusEarned: false,
      },
      skulledInTrick: [],
    }
    let ui: RoundUiState = { ...uiFrom(round), resolvedTrick: heldReveal }
    ui = roundReducer(ui, carryOn)
    expect(ui.resolvedTrick).toBeNull()
    expect(ui.round.currentTrick).toHaveLength(1)
    expect(ui.round.currentTrick[0].side).toBe(PlayerSide.Cpu)
  })
})

describe('a full hand driven purely by CarryOn and taps', () => {
  it('reaches RoundPhase.Complete with all HAND_SIZE tricks played (AC1)', () => {
    let ui = uiFrom(dealRound(PlayerSide.Cpu, lcg(2026)))
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
      // DLR-163 — only a Fox opens the ability prompt on the second tap now; a Woodcutter
      // commits like any plain card. Answer it with the neutral choice so the loop doesn't stall
      // on `canAct`'s `prompt === null` guard.
      if (ui.prompt !== null) {
        const choice: AbilityChoice = { kind: AbilityChoiceKind.DeclineTrump }
        ui = roundReducer(ui, { kind: RoundUiActionKind.ChooseAbility, choice })
      }
    }
    expect(ui.round.phase).toBe(RoundPhase.Complete)
    expect(ui.round.tricksPlayed).toBe(HAND_SIZE)
  })
})

describe('tap-twice', () => {
  it('arms on the first tap without playing', () => {
    const ui = uiFrom(makeRound())
    const next = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(next.armed).toEqual(card(Suit.Bells, 7))
    expect(next.round.currentTrick).toHaveLength(0)
    expect(next.round.hands[PlayerSide.Player]).toHaveLength(6)
  })

  it('moves the arm when a different card is tapped', () => {
    let ui = uiFrom(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 8)))
    expect(ui.armed).toEqual(card(Suit.Keys, 8))
    expect(ui.round.currentTrick).toHaveLength(0)
  })

  it('commits on the second tap of the same card', () => {
    let ui = uiFrom(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(ui.armed).toBeNull()
    expect(ui.round.hands[PlayerSide.Player]).toHaveLength(5)
    // The player led, so the opponent answered in the same commit and the trick resolved.
    expect(ui.resolvedTrick).not.toBeNull()
    expect(ui.resolvedTrick?.cards).toHaveLength(2)
  })

  it('clears the arm on CancelSelection', () => {
    let ui = uiFrom(makeRound())
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
    let ui = { ...uiFrom(round), round }
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    const before = ui.round
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    expect(ui.rejection).toBe(IllegalMoveReason.MustFollowLeadSuit)
    expect(ui.round).toBe(before)
  })
})

describe('abilities', () => {
  it('opens the prompt instead of playing a Fox', () => {
    let ui = uiFrom(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    expect(ui.prompt).toEqual(card(Suit.Keys, 3))
    expect(ui.armed).toBeNull()
    expect(ui.round.currentTrick).toHaveLength(0)
  })

  it('DLR-163 AC1/AC2 — changes the trump suit when a suit is named, and nulls the decree', () => {
    let ui = uiFrom(makeRound())
    expect(ui.round.trumpSuit).toBe(Suit.Bells)
    const handBefore = ui.round.hands[PlayerSide.Player]
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 3)))
    ui = roundReducer(ui, {
      kind: RoundUiActionKind.ChooseAbility,
      choice: { kind: AbilityChoiceKind.NameTrump, suit: Suit.Moons },
    })
    expect(ui.round.trumpSuit).toBe(Suit.Moons)
    expect(ui.round.decree).toBeNull()
    expect(ui.prompt).toBeNull()
    // AC1 — nothing left the hand but the 3 itself.
    expect(ui.round.hands[PlayerSide.Player]).toEqual(
      handBefore.filter((c) => !(c.suit === Suit.Keys && c.rank === 3)),
    )
  })

  it('DLR-163 AC5 — a Woodcutter commits on its second tap with no prompt', () => {
    let ui = uiFrom(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Moons, 5)))
    ui = roundReducer(ui, tap(card(Suit.Moons, 5)))
    expect(ui.prompt).toBeNull()
    expect(ui.round.currentTrick.length + ui.round.tricksPlayed).toBeGreaterThan(0)
  })
})

describe('the trick beat', () => {
  it('agrees with the tricks-won delta on which side actually won', () => {
    let ui = uiFrom(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Moons, 11)))
    ui = roundReducer(ui, tap(card(Suit.Moons, 11)))
    const winner = ui.resolvedTrick?.winner
    expect(winner).toBeDefined()
    expect(ui.round.tricksWon[winner!]).toBe(1)
  })

  it('clears the reveal on CarryOn', () => {
    let ui = uiFrom(makeRound())
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 7)))
    ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
    expect(ui.resolvedTrick).toBeNull()
  })

  it('completes the hand on the sixth trick, holding it for the same CarryOn beat', () => {
    const round = makeRound({
      tricksPlayed: HAND_SIZE - 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 7)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 4)],
      },
    })
    let ui = { ...uiFrom(round), round }
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
    // is not committed by createRoundUiState, so this surfaces on the CarryOn that commits
    // it, not at creation.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      hands: { [PlayerSide.Player]: [card(Suit.Bells, 7)], [PlayerSide.Cpu]: [] },
      tricksPlayed: 5,
    })
    let ui = uiFrom(round)
    expect(ui.cpuFault).toBeNull()
    ui = roundReducer(ui, carryOn)
    expect(ui.cpuFault).toBe('noLegalMove')
    expect(ui.round.currentTrick).toHaveLength(0)
  })
})

describe('Cheat poise, spend and consume (DLR-83, DLR-132)', () => {
  // Same shape as the `rejection` describe block above: the Quarry led Moons and the player
  // holds Moons, so a Bells card is illegal without a Cheat live — verified directly by that
  // block's own assertion (`MustFollowLeadSuit`) before this block leans on the same fixture.
  const followState = makeRound({
    leader: PlayerSide.Cpu,
    currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
    phase: RoundPhase.AwaitingFollow,
  })
  const offSuitCard = card(Suit.Bells, 7)
  const cheatA = cheatBuff(BuffTier.Bronze, 1)
  const cheatB = cheatBuff(BuffTier.Bronze, 2)
  const seeded = () => uiFrom(followState, startEncounter(0), [cheatA, cheatB])
  const opened = () => roundReducer(seeded(), { kind: RoundUiActionKind.ToggleLoadout })
  const tapBuff = (id: number) => ({ kind: RoundUiActionKind.TapBuff, id }) as const

  it('needs two taps to poise then spend, so one tap alone does not lift follow-suit (AC4)', () => {
    const once = roundReducer(opened(), tapBuff(cheatA.id))
    expect(once.loadout?.poised).toBe(cheatA.id)
    expect(cheatArmed(once)).toBe(false)

    const twice = roundReducer(once, tapBuff(cheatA.id))
    expect(cheatArmed(twice)).toBe(true)
    expect(twice.buffs).toHaveLength(1) // DLR-142 — cheatA is spent and removed; cheatB remains
  })

  it('moves the poise when a different row is tapped, spending neither', () => {
    let ui = roundReducer(opened(), tapBuff(cheatA.id))
    ui = roundReducer(ui, tapBuff(cheatB.id))
    expect(ui.loadout?.poised).toBe(cheatB.id)
    expect(cheatArmed(ui)).toBe(false)
  })

  it('consumes one trick of the live Cheat when a forbidden card is committed (AC7)', () => {
    let ui = roundReducer(opened(), tapBuff(cheatA.id))
    ui = roundReducer(ui, tapBuff(cheatA.id))
    expect(ui.cheatTricksRemaining).toBe(1)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuitCard })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuitCard })
    expect(ui.rejection).toBeNull()
    expect(ui.cheatTricksRemaining).toBe(0)
    expect(ui.buffs).toHaveLength(1) // DLR-142 — cheatA left the pile at the spend; cheatB remains
  })

  // Review fix (Defender Critical) — this scenario is AC7's LOCK, not a refusal: cheatA/cheatB
  // are both held but neither is ARMED (`cheatArmed` reads `cheatTricksRemaining`, still 0
  // here), so `unlockingCheat` finds a held Cheat and the second tap must re-raise the card as
  // a lock, exactly like the first. The previous assertion here (`rejection` set to
  // `MustFollowLeadSuit`) encoded the same bug the Defender found: the second tap used to fall
  // straight into `commit`, which cleared `armed` to `null` on its way to computing that
  // "real" refusal reason — unmounting the whole arming surface instead of leaving the card
  // raised and locked. `roundReducer.arming.test.ts`'s own "held but not yet ARMED" case covers
  // this same shape directly.
  it('stays raised as a LOCK on a second tap while the held Cheat is not yet armed, and touches nothing in the pile (AC7/AC9)', () => {
    let ui = seeded()
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuitCard })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: offSuitCard })
    expect(ui.armed).toEqual(offSuitCard)
    expect(ui.rejection).toBeNull()
    expect(ui.buffs).toHaveLength(2)
  })
})

// The total cash-out specs (AC6/AC8) live in `roundReducer.total.test.ts` — carved out once this
// file crossed the 400-line budget with Task 12's own additions (the encounter, its seed, and
// the four cash-out scenarios together were the largest single piece).
//
// `CancelBuffPoise`'s own specs (AC18, DLR-148) live in `roundReducer.cancelBuffPoise.test.ts` —
// carved out for the same reason, once that describe block crossed the budget again.
