import { describe, expect, it } from 'vitest'
import {
  currentTurn,
  DiscardRefusal,
  discardRefusalFor,
  legalMoves,
  PlayerSide,
  RoundPhase,
  Suit,
  type Card,
  type WarCouncilState,
} from '../../../warCouncil'
import { MAX_CARDS_PER_DISCARD, startEncounter, type EncounterState } from '../../../hunt'
import { roundReducer } from '../roundReducer'
import {
  createRoundUiState,
  discardStock,
  RoundUiActionKind,
  type RoundUiState,
} from '../roundUiState'
import { card, discardsRemainingFixture, makeRound } from './roundFixture'

// The discard's own reducer-level coverage (AC10) — chaining, refusals (including the AC1
// pre-Quarry-lead availability and the AC1 "never mid-trick" refusal), and the void-in-suit
// widening a discard leaves for the rest of the hand.

const tapDiscard = { kind: RoundUiActionKind.TapDiscard } as const
const cancelDiscard = { kind: RoundUiActionKind.CancelDiscard } as const
const tap = (c: ReturnType<typeof card>) => ({ kind: RoundUiActionKind.TapCard, card: c }) as const
const ofSuit = (hand: readonly Card[], suit: Suit) => hand.filter((c) => c.suit === suit)

function uiFrom(
  round: WarCouncilState,
  discardsRemaining: number = discardsRemainingFixture,
  encounter: EncounterState = startEncounter(0),
): RoundUiState {
  return createRoundUiState({
    round,
    encounter,
    baseDamageBonus: 0,
    discardsRemaining,
    buffs: [],
  })
}

describe('opening the selection (AC1/AC9)', () => {
  it('TapDiscard from a closed state with discards remaining and the window open opens selection mode', () => {
    let ui = uiFrom(makeRound())
    ui = roundReducer(ui, tapDiscard)
    expect(ui.discardSelection).toEqual([])
  })

  it('opening clears any armed card, so the next hand-card tap is never ambiguous', () => {
    const seeded: RoundUiState = {
      ...uiFrom(makeRound()),
      armed: card(Suit.Bells, 2),
    }
    const ui = roundReducer(seeded, tapDiscard)
    expect(ui.armed).toBeNull()
    expect(ui.discardSelection).toEqual([])
  })

  it('opening does NOT clear a live Cheat — DLR-132, it is not a transient selection', () => {
    const seeded: RoundUiState = {
      ...uiFrom(makeRound()),
      cheatTricksRemaining: 2,
    }
    const ui = roundReducer(seeded, tapDiscard)
    expect(ui.cheatTricksRemaining).toBe(2)
  })
})

describe('toggling cards into the selection', () => {
  it('a TapCard while selecting toggles the tapped card in, and a second tap on it removes it', () => {
    let ui = uiFrom(makeRound())
    ui = roundReducer(ui, tapDiscard)
    const target = card(Suit.Bells, 2)
    ui = roundReducer(ui, tap(target))
    expect(ui.discardSelection).toEqual([target])
    ui = roundReducer(ui, tap(target))
    expect(ui.discardSelection).toEqual([])
  })

  it('a TapCard while selecting on a card already at the MAX_CARDS_PER_DISCARD cap is a no-op', () => {
    let ui = uiFrom(makeRound())
    ui = roundReducer(ui, tapDiscard)
    const [first, second, third, fourth] = ui.round.hands[PlayerSide.Player]
    ui = roundReducer(ui, tap(first))
    ui = roundReducer(ui, tap(second))
    ui = roundReducer(ui, tap(third))
    expect(ui.discardSelection).toHaveLength(MAX_CARDS_PER_DISCARD)
    const before = ui
    ui = roundReducer(ui, tap(fourth))
    expect(ui).toBe(before)
    expect(ui.discardSelection).toEqual(before.discardSelection)
  })
})

describe('committing (AC2/AC3)', () => {
  it('TapDiscard with a non-empty selection commits the swap', () => {
    let ui = uiFrom(makeRound())
    const before = ui.round
    ui = roundReducer(ui, tapDiscard)
    const [first, second] = before.hands[PlayerSide.Player]
    ui = roundReducer(ui, tap(first))
    ui = roundReducer(ui, tap(second))
    ui = roundReducer(ui, tapDiscard)

    expect(ui.discardsRemaining).toBe(discardsRemainingFixture - 1)
    expect(ui.discardSelection).toBeNull()
    expect(ui.round.hands[PlayerSide.Player]).toHaveLength(before.hands[PlayerSide.Player].length)
    expect(ui.round.hands[PlayerSide.Player]).not.toContainEqual(first)
    expect(ui.round.hands[PlayerSide.Player]).not.toContainEqual(second)
  })
})

describe('chaining (AC6/AC10)', () => {
  it('two consecutive commit cycles in the same gap drop discardsRemaining by 2, with the window staying open throughout and no turn advanced', () => {
    let ui = uiFrom(makeRound())
    const startingTurn = ui.round.currentTrick.length

    // First cycle.
    ui = roundReducer(ui, tapDiscard)
    const [firstA] = ui.round.hands[PlayerSide.Player]
    ui = roundReducer(ui, tap(firstA))
    ui = roundReducer(ui, tapDiscard)
    expect(ui.discardsRemaining).toBe(discardsRemainingFixture - 1)
    // The window is still open, with a discard still to spend — no card played, no CarryOn
    // tapped in between, so the gap the player is in never closed.
    expect(discardRefusalFor(discardStock(ui))).toBeNull()

    // Second cycle, immediately after.
    ui = roundReducer(ui, tapDiscard)
    const [secondA] = ui.round.hands[PlayerSide.Player]
    ui = roundReducer(ui, tap(secondA))
    ui = roundReducer(ui, tapDiscard)

    expect(ui.discardsRemaining).toBe(discardsRemainingFixture - 2)
    expect(ui.round.currentTrick).toHaveLength(startingTurn)
  })
})

describe('AC1 — availability independent of whose turn it is', () => {
  it('TapDiscard succeeds before the Quarry’s own lead, when canAct would refuse', () => {
    const round = makeRound({ leader: PlayerSide.Cpu, currentTrick: [] })
    const ui = uiFrom(round)
    expect(discardRefusalFor(discardStock(ui))).toBeNull()
    const next = roundReducer(ui, tapDiscard)
    expect(next.discardSelection).toEqual([])
  })

  it('a TapCard toggles a held card into an already-open selection before the Quarry’s own lead, and TapDiscard commits it — the full pre-lead flow, not just the open step', () => {
    const round = makeRound({ leader: PlayerSide.Cpu, currentTrick: [] })
    let ui = uiFrom(round)
    // Selection already open, mirroring the bug this reordering fixes: `handleTapCard`'s
    // `discardSelecting` branch must run before its `canAct` guard, or a `TapCard` here is
    // silently swallowed and the pre-lead flow can never get past "open".
    ui = { ...ui, discardSelection: [] }
    const [target] = ui.round.hands[PlayerSide.Player]

    ui = roundReducer(ui, tap(target))
    expect(ui.discardSelection).toEqual([target])

    ui = roundReducer(ui, tapDiscard)
    expect(ui.discardSelection).toBeNull()
    expect(ui.discardsRemaining).toBe(discardsRemainingFixture - 1)
    expect(ui.round.hands[PlayerSide.Player]).not.toContainEqual(target)
  })

  it('TapDiscard refuses mid-trick', () => {
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
      phase: RoundPhase.AwaitingFollow,
    })
    const ui = uiFrom(round)
    expect(discardRefusalFor(discardStock(ui))).toBe(DiscardRefusal.NotAvailable)
    expect(roundReducer(ui, tapDiscard)).toBe(ui)
  })
})

describe('CarryOn while a discard selection is open (fix pass — Quarry-to-lead gap)', () => {
  it('CarryOn is a no-op while a discard selection is open: the selection survives and the lead does not advance', () => {
    const round = makeRound({ leader: PlayerSide.Cpu, currentTrick: [] })
    let ui = uiFrom(round)
    const startingTurn = currentTurn(ui.round)
    const startingTrick = ui.round.currentTrick

    ui = roundReducer(ui, tapDiscard)
    const [target] = ui.round.hands[PlayerSide.Player]
    ui = roundReducer(ui, tap(target))
    expect(ui.discardSelection).toEqual([target])

    const carryOn = { kind: RoundUiActionKind.CarryOn } as const
    ui = roundReducer(ui, carryOn)

    expect(ui.discardSelection).toEqual([target])
    expect(currentTurn(ui.round)).toBe(startingTurn)
    expect(ui.round.currentTrick).toEqual(startingTrick)
  })
})

describe('refusals (AC9)', () => {
  it('no discards remaining — TapDiscard is a no-op and never opens selection mode', () => {
    const ui = uiFrom(makeRound(), 0)
    expect(roundReducer(ui, tapDiscard)).toBe(ui)
  })

  it('empty selection — a second TapDiscard with nothing toggled in is refused, not a close-on-empty', () => {
    let ui = uiFrom(makeRound())
    ui = roundReducer(ui, tapDiscard)
    expect(ui.discardSelection).toEqual([])
    const before = ui
    ui = roundReducer(ui, tapDiscard)
    expect(ui).toBe(before)
    expect(ui.discardSelection).toEqual([])
  })
})

describe('CancelDiscard (AC9)', () => {
  it('closes the mode without spending a discard or changing the hand', () => {
    let ui = uiFrom(makeRound())
    const before = ui.round
    ui = roundReducer(ui, tapDiscard)
    const [first] = ui.round.hands[PlayerSide.Player]
    ui = roundReducer(ui, tap(first))
    ui = roundReducer(ui, cancelDiscard)

    expect(ui.discardSelection).toBeNull()
    expect(ui.discardsRemaining).toBe(discardsRemainingFixture)
    expect(ui.round).toBe(before)
  })
})

describe('void-in-suit widening a later trick (AC10)', () => {
  it('discarding every card of one suit frees the player of that suit’s follow-suit binding for the rest of the hand', () => {
    // The default fixture's `drawPile` leads with Bells — drawing straight off the front would
    // hand the discarded suit straight back. Reordered here so the drawn replacements are Keys,
    // leaving the hand genuinely void in Bells after the swap.
    let ui = uiFrom(
      makeRound({
        drawPile: [
          card(Suit.Keys, 9),
          card(Suit.Keys, 11),
          card(Suit.Moons, 2),
          card(Suit.Moons, 6),
          card(Suit.Bells, 1),
          card(Suit.Bells, 5),
        ],
      }),
    )
    const bellsCards = ofSuit(ui.round.hands[PlayerSide.Player], Suit.Bells)
    expect(bellsCards.length).toBeGreaterThan(0)
    expect(bellsCards.length).toBeLessThanOrEqual(MAX_CARDS_PER_DISCARD)

    ui = roundReducer(ui, tapDiscard)
    for (const c of bellsCards) {
      ui = roundReducer(ui, tap(c))
    }
    ui = roundReducer(ui, tapDiscard)

    const resultHand = ui.round.hands[PlayerSide.Player]
    expect(ofSuit(resultHand, Suit.Bells)).toHaveLength(0)

    // A later trick in the same hand, led by the now-void suit.
    const followRound: WarCouncilState = {
      ...ui.round,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 4) }],
      phase: RoundPhase.AwaitingFollow,
    }
    expect(legalMoves(followRound, PlayerSide.Player)).toEqual(resultHand)
  })
})
