import { createDeck } from './deck'
import { shuffle } from './shuffle'
import { otherSide, PlayerSide, RoundPhase, TRICKS_PER_ROUND, type RoundState } from './types'
import type { QuarryCharacter } from '../hunt'

// `quarryCharacter` is the encounter's round-long rule-break (§4), set here and nowhere
// else. Optional: which character an encounter draws is a later ticket's run scheduling,
// so every caller today deals a characterless round with the base rules.
export function dealRound(
  dealer: PlayerSide,
  rng: () => number,
  quarryCharacter?: QuarryCharacter,
): RoundState {
  const shuffled = shuffle(createDeck(), rng)
  const playerHand = shuffled.slice(0, TRICKS_PER_ROUND)
  const cpuHand = shuffled.slice(TRICKS_PER_ROUND, TRICKS_PER_ROUND * 2)
  const remaining = shuffled.slice(TRICKS_PER_ROUND * 2)
  const decree = remaining[0]
  const drawPile = remaining.slice(1)

  return {
    dealer,
    hands: { [PlayerSide.Player]: playerHand, [PlayerSide.Cpu]: cpuHand },
    drawPile,
    decree,
    trumpSuit: decree.suit,
    tricksWon: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    capturedCards: { [PlayerSide.Player]: [], [PlayerSide.Cpu]: [] },
    currentTrick: [],
    leader: otherSide(dealer),
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    quarryCharacter,
  }
}
