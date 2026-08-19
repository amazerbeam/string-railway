import { HAND_SIZE } from '../hunt'
import { createDeck } from './deck'
import { shuffle } from './shuffle'
import { assignSkulls } from './skulls'
import { otherSide, PlayerSide, RoundPhase, type RoundState } from './types'

/**
 * One hand: `HAND_SIZE` cards each, one decree, the rest a draw pile. With the 33-card deck that
 * is 6 + 6 dealt, 1 decree and 20 left for the Woodcutter.
 *
 * Skulls are assigned to the Quarry's dealt hand only (AC2) and drawn through the SAME injected
 * `rng` the shuffle uses, so a seeded deal reproduces its skulls as well as its cards. A card the
 * Woodcutter later draws arrives unskulled: §3.4's density is a property of the deal.
 */
export function dealRound(dealer: PlayerSide, rng: () => number): RoundState {
  const shuffled = shuffle(createDeck(), rng)
  const playerHand = shuffled.slice(0, HAND_SIZE)
  const cpuHand = shuffled.slice(HAND_SIZE, HAND_SIZE * 2)
  const remaining = shuffled.slice(HAND_SIZE * 2)
  const decree = remaining[0]
  const drawPile = remaining.slice(1)

  return {
    dealer,
    hands: { [PlayerSide.Player]: playerHand, [PlayerSide.Cpu]: cpuHand },
    drawPile,
    decree,
    trumpSuit: decree.suit,
    tricksWon: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    skulledCards: assignSkulls(cpuHand, rng),
    // DLR-90 — a fresh deal carries no marks. Written here rather than defaulted on the type, so
    // `RoundState` stays a total shape with no optional field for a reader to forget about.
    envenomedCards: [],
    bank: 0,
    multiplier: 0,
    lastResolution: null,
    currentTrick: [],
    leader: otherSide(dealer),
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
  }
}
