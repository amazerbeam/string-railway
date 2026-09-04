import { describe, expect, it } from 'vitest'
import { PlayerSide, Suit, TrickOutcome, type WarCouncilState } from '../../../warCouncil'
import {
  applyDamage,
  BASE_DAMAGE,
  BuffKind,
  BuffTier,
  DuelSide,
  isEncounterResolved,
  mintFromTemplate,
  quarryHealthForEncounter,
  startEncounter,
  templatesForFamily,
  type EncounterState,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { BeatKind } from '../resolutionBeats'
import {
  createRoundUiState,
  RoundUiActionKind,
  type ResolutionView,
  type RoundUiState,
} from '../roundUiState'
import { card, discardsRemainingFixture, makeRound } from './roundFixture'
import { discardWindowOpen } from '../roundUiState'

// DLR-156 AC3/AC5/AC6/AC7/AC14 — the resolution screen's reducer-side state, and the two new
// player choices. The screen ITSELF does not exist yet (Task 15) — nothing renders `ui.resolution`
// and nothing dispatches `ApplyPot`/`RollOver` from a component. This file is the proof that the
// reducer's own half of the contract holds; wiring the switch is a later task.

const tap = (c: ReturnType<typeof card>) => ({ kind: RoundUiActionKind.TapCard, card: c }) as const
const applyPot = { kind: RoundUiActionKind.ApplyPot } as const
const rollOver = { kind: RoundUiActionKind.RollOver } as const

function uiFrom(
  round: WarCouncilState,
  encounter: EncounterState = startEncounter(0),
  buffs: RoundUiState['buffs'] = [],
): RoundUiState {
  return createRoundUiState({
    round,
    encounter,
    baseDamageBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs,
  })
}

/** A single High Victory, Bells 9 over Bells 2 — no buffs, so the beats are just Base and Banked. */
function winningRound(total: number, roll: number): WarCouncilState {
  return makeRound({
    leader: PlayerSide.Player,
    trumpSuit: Suit.Keys,
    total,
    roll,
    hands: {
      [PlayerSide.Player]: [card(Suit.Bells, 9)],
      [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
    },
    currentTrick: [],
  })
}

/** A single Low Defeat, Bells 2 under Bells 9 — the hurt branch, one Hurt beat. */
function losingRound(total: number, roll: number): WarCouncilState {
  return makeRound({
    leader: PlayerSide.Player,
    trumpSuit: Suit.Keys,
    total,
    roll,
    hands: {
      [PlayerSide.Player]: [card(Suit.Bells, 2)],
      [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
    },
    currentTrick: [],
  })
}

describe('AC14 — a banked trick sets ui.resolution to a non-null view', () => {
  it('carries both played cards, the winner, the trick number and its beats', () => {
    let ui = uiFrom(winningRound(0, 0))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.HighVictory)
    const view = ui.resolution as ResolutionView
    expect(view).not.toBeNull()
    expect(view.cards.map((tc) => tc.card)).toEqual([card(Suit.Bells, 9), card(Suit.Bells, 2)])
    expect(view.winner).toBe(PlayerSide.Player)
    expect(view.trickNumber).toBe(1)
    // No buffs fired: exactly Base then Banked (`resolutionBeats.test.ts` pins the derivation
    // itself — this only proves the reducer actually calls it).
    expect(view.beats.map((beat) => beat.kind)).toEqual([BeatKind.Base, BeatKind.Banked])
    // AC2 — the bare-rule floor: potValue(1 + BASE_DAMAGE, 1 + 1) = 2 x 2 = 4.
    expect(view.nextPotFloor).toBe((1 + BASE_DAMAGE) * 2)
  })
})

describe('DLR-160 AC2/AC3/AC6/AC7 — the widened resolution view', () => {
  it('carries the skulled cards in this trick, the decree, and a dead buff', () => {
    // A Suit Low card pays only on a trick the player goes LOW on — `!playerWentHigh && suit
    // matches`, with no skull term in its condition at all (`CLAUDE.md`'s two-axis note). Playing
    // the skulled card here TAKES the trick (Bells 9 beats Bells 2), so the card is armed and dies
    // — it is not "corrected" into firing on the High Defeat.
    const [suitLowTemplate] = templatesForFamily(BuffKind.SuitLow)
    const suitLow = mintFromTemplate(suitLowTemplate, BuffTier.Bronze, 101)
    const skulledCard = card(Suit.Bells, 9)
    const round = winningRound(0, 0)

    let ui = uiFrom({ ...round, skulledCards: [skulledCard] }, startEncounter(0), [suitLow])
    ui = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: suitLow.id })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: suitLow.id })
    ui = roundReducer(ui, tap(skulledCard))
    ui = roundReducer(ui, tap(skulledCard))

    const view = ui.resolution as ResolutionView
    expect(view).not.toBeNull()
    expect(view.skulledInTrick).toEqual([skulledCard])
    expect(view.decree).toEqual(ui.round.decree)
    expect(view.deadBuffs.map((buff) => buff.id)).toContain(suitLow.id)
  })

  it('marks the pot lethal when applying it would end the fight, through applyDamage/isEncounterResolved', () => {
    // The Quarry is left at 1 health — anything this trick's pot pays is lethal.
    const nearDeadEncounter = applyDamage(startEncounter(0), {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: quarryHealthForEncounter(0) - 1,
    })
    let ui = uiFrom(winningRound(0, 0), nearDeadEncounter)
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))

    const view = ui.resolution as ResolutionView
    expect(view.potIsLethal).toBe(true)
  })

  it('does not mark the pot lethal when the Quarry has plenty of health left', () => {
    let ui = uiFrom(winningRound(0, 0), startEncounter(0))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))

    const view = ui.resolution as ResolutionView
    expect(view.potIsLethal).toBe(false)
  })
})

describe('AC5 — ApplyPot deals the pot, zeroes the streak, and closes the screen', () => {
  it('deals potValue(total, roll) to the Quarry and zeroes total/roll', () => {
    let ui = uiFrom(winningRound(0, 0))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    expect(ui.round.total).toBe(1)
    expect(ui.round.roll).toBe(1)

    ui = roundReducer(ui, applyPot)

    expect(ui.round.total).toBe(0)
    expect(ui.round.roll).toBe(0)
    expect(ui.resolution).toBeNull()
    // potValue(1, 1) = 1.
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 1)
  })
})

describe('AC6 — RollOver leaves the streak standing and closes the screen', () => {
  it('leaves total/roll untouched and the Quarry unpaid', () => {
    let ui = uiFrom(winningRound(0, 0))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))

    ui = roundReducer(ui, rollOver)

    expect(ui.round.total).toBe(1)
    expect(ui.round.roll).toBe(1)
    expect(ui.resolution).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
  })
})

describe('AC7 — the hurt branch has nothing to decide', () => {
  it('sets a view with exactly one Hurt beat, and RollOver is a no-op on the already-zero figures', () => {
    let ui = uiFrom(losingRound(12, 2))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.LowDefeat)
    const view = ui.resolution as ResolutionView
    expect(view.beats.map((beat) => beat.kind)).toEqual([BeatKind.Hurt])
    expect(ui.round.total).toBe(0)
    expect(ui.round.roll).toBe(0)

    ui = roundReducer(ui, rollOver)

    expect(ui.resolution).toBeNull()
    expect(ui.round.total).toBe(0)
    expect(ui.round.roll).toBe(0)
  })
})

describe('DLR-160 AC1b — ApplyPot/RollOver close the panel but lay no card', () => {
  // `losingRound` is the fixture that puts the QUARRY next to lead after the trick resolves: the
  // player leads Bells 2 under trump Keys, the Cpu's Bells 9 wins it, so the Cpu — not the player —
  // leads next. That is the exact shape `handleCarryOn` used to advance in the SAME dispatch that
  // dismissed the resolution screen, closing the between-tricks arming window before the player
  // ever saw the felt (`the-hunt.md` §4 already grants that window).
  it('RollOver leaves the Quarry’s lead uncommitted — the arming window stays open', () => {
    let ui = uiFrom(losingRound(0, 0))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    ui = roundReducer(ui, rollOver)

    expect(ui.resolution).toBeNull()
    expect(ui.round.currentTrick).toEqual([])
    expect(discardWindowOpen(ui)).toBe(true)
  })

  it('ApplyPot leaves the Quarry’s lead uncommitted — the arming window stays open', () => {
    let ui = uiFrom(losingRound(0, 0))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    ui = roundReducer(ui, applyPot)

    expect(ui.resolution).toBeNull()
    expect(ui.round.currentTrick).toEqual([])
    expect(discardWindowOpen(ui)).toBe(true)
  })
})

describe('the two actions are TOTAL and GUARDED — never a throw', () => {
  it('ApplyPot/RollOver on a null resolution are no-ops returning the SAME state', () => {
    const state = uiFrom(winningRound(0, 0))
    expect(state.resolution).toBeNull()

    expect(roundReducer(state, applyPot)).toBe(state)
    expect(roundReducer(state, rollOver)).toBe(state)
  })

  it('applying into an already-resolved encounter is inert rather than a RangeError', () => {
    const resolvedEncounter = applyDamage(startEncounter(0), {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: quarryHealthForEncounter(0) + 100,
    })
    expect(isEncounterResolved(resolvedEncounter)).toBe(true)

    // A contrived state — the resolution view was built before the encounter resolved by some
    // other route, which the reducer must treat as inert rather than trust never to happen.
    const base = uiFrom(winningRound(5, 1), resolvedEncounter)
    const fakeView: ResolutionView = {
      cards: [],
      winner: PlayerSide.Player,
      resolution: {
        outcome: TrickOutcome.HighVictory,
        trickDamage: { base: 1, buffDamage: 0, buffMult: 1, overlapBonus: 0, dealt: 1 },
        cashOut: 0,
        damageToPlayer: 0,
        total: 5,
        roll: 1,
        buffAccrual: null,
        firedBuffIds: [],

        treasureBonusEarned: false,
      },
      beats: [],
      trickNumber: 1,
      nextPotFloor: 0,
      skulledInTrick: [],
      decree: card(Suit.Bells, 1),
      deadBuffs: [],
      potIsLethal: false,
    }
    const state: RoundUiState = { ...base, resolution: fakeView }

    expect(() => roundReducer(state, applyPot)).not.toThrow()
    const after = roundReducer(state, applyPot)
    expect(after.resolution).toBeNull()
    expect(after.encounter).toBe(resolvedEncounter)
    expect(after.round.total).toBe(5)
    expect(after.round.roll).toBe(1)
  })
})
