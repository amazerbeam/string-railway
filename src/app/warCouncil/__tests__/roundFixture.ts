import { PlayerSide, RoundPhase, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import {
  DISCARDS_PER_FIGHT,
  DuelSide,
  PLAYER_START_HEALTH,
  QuarryCharacter,
  quarryHealthForEncounter,
  startEncounter,
  type Hunt,
} from '../../../hunt'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })

/** An unstarted round the player leads. Override any field a spec needs to aim. */
export function makeRound(overrides: Partial<WarCouncilState> = {}): WarCouncilState {
  return {
    dealer: PlayerSide.Cpu,
    hands: {
      [PlayerSide.Player]: [
        card(Suit.Bells, 2),
        card(Suit.Bells, 7),
        card(Suit.Keys, 3),
        card(Suit.Keys, 8),
        card(Suit.Moons, 5),
        card(Suit.Moons, 11),
      ],
      [PlayerSide.Cpu]: [
        card(Suit.Bells, 4),
        card(Suit.Keys, 6),
        card(Suit.Moons, 9),
        card(Suit.Moons, 10),
      ],
    },
    drawPile: [
      card(Suit.Bells, 1),
      card(Suit.Bells, 5),
      card(Suit.Keys, 9),
      card(Suit.Keys, 11),
      card(Suit.Moons, 2),
      card(Suit.Moons, 6),
    ],
    decree: card(Suit.Bells, 10),
    trumpSuit: Suit.Bells,
    tricksWon: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    skulledCards: [],
    cursedCards: [],
    spentPile: [],
    reshuffled: false,
    drawSeed: 0,
    total: 0,
    roll: 0,
    lastResolution: null,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

/** A state mid-streak, for the bank readout. */
export function bankedRound(total: number, roll: number): WarCouncilState {
  return makeRound({ total, roll })
}

/** A state whose Quarry holds a known shape with known skulls, for the shape readout. */
export function skulledRound(skulls: readonly Card[]): WarCouncilState {
  return makeRound({ skulledCards: skulls })
}

export { card }

/** A fixed Hunt for component tests. */
export const huntFixture: Hunt = { quarry: { character: QuarryCharacter.Monarch } }

/** A fresh encounter for component specs — both bars full, nothing applied. */
export const encounterFixture = startEncounter(0)

/** The configured maxima, read from config rather than written as numbers (AC5). */
export const maxHealthFixture = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(0),
}

/** A fixed run readout for component specs (AC6). */
export const runLabelFixture = 'Fight 1 of 3'

/** A fixed purse for component specs (DLR-84 AC2). */
export const coinsFixture = 2

/** A fixed base-damage bonus for component specs (DLR-92 AC4) — zero, so a spec that does not
 *  exercise the buff is not accidentally exercising it. */
export const baseDamageBonusFixture = 0

/** A fixed discard budget for component specs (DLR-100 AC5) — the full per-fight allotment, so a
 *  spec that does not exercise the discard is not accidentally starting mid-budget. */
export const discardsRemainingFixture = DISCARDS_PER_FIGHT

/** A fixed, NAMED Quarry bar label for component specs. Deliberately not the generic
 *  `HEALTH_BAR_LABEL[Quarry]` wording, so a spec querying the bar by name proves the threaded
 *  label is what reaches the meter rather than the fallback. */
export const quarryLabelFixture = 'Aoife’s health'
