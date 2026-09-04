import { createSeededRng, mixSeed, QUARRY_SWAP_SKULL_CHANCE } from '../hunt'
import { removeCard } from './cardUtils'
import { drawCards } from './encounterDeck'
import { skullableCards } from './skulls'
import {
  CardRank,
  QUARRY_SIDE,
  type Card,
  type PlayerSide,
  type RoundState,
  type Suit,
  type TrickCard,
} from './types'

/**
 * DLR-163 AC1/AC2/AC3 — replaces `applyFoxExchange`. NOTHING leaves the hand: the whole complaint
 * the ticket quotes is that the old rule always cost a card the player wanted.
 *
 * Naming the suit ALREADY IN FORCE returns the state unchanged, which is what makes AC1's "the
 * same as declining" true in code rather than asserted in a comment — and it is enforced here
 * rather than at the prompt so the felt and the engine cannot disagree about it.
 *
 * The replaced decree card joins `spentPile` HERE, at the instant it is replaced (AC2), which is
 * why `closeHand` must skip a `null` decree — see its own docblock. On an already-`null` decree
 * there is no card to spend and nothing is appended.
 */
export function applyNameTrump(state: RoundState, suit: Suit): RoundState {
  if (suit === state.trumpSuit) return state
  return {
    ...state,
    decree: null,
    trumpSuit: suit,
    spentPile: state.decree === null ? state.spentPile : [...state.spentPile, state.decree],
  }
}

/**
 * DLR-163 AC7 — which card the Quarry gives up: the lowest-ranked one it holds, which mirrors the
 * retired `chooseCpuWoodcutterChoice`'s stated "keep your best cards" default exactly, so the
 * Quarry's behaviour with the 5 does not change character. Returns `null` for a Quarry holding
 * nothing after playing the 5, which makes the swap a no-op rather than a throw.
 *
 * Lives HERE rather than in `cpuPlayer.ts`, where the plan first placed it: `cpuPlayer.ts` imports
 * `playCard`, so importing back from it would make `playCard` ↔ `cpuPlayer` a module cycle for one
 * three-line helper. `abilities.ts` is already `playCard`'s dependency and already owns the swap.
 */
export function chooseQuarrySwapCard(hand: readonly Card[]): Card | null {
  if (hand.length === 0) return null
  return [...hand].sort((a, b) => a.rank - b.rank)[0]
}

/**
 * DLR-163 AC7 — the QUARRY'S Woodcutter, and only the Quarry's. The player's 5 has no engine
 * effect at all: it raises a run figure this tree has never been allowed to see, and
 * `commitHandlers.ts` applies that.
 *
 * The swap itself is `applyWoodcutterDraw`'s shape for one card — through `drawCards`, the single
 * draw primitive, so a mid-hand reshuffle is inherited rather than restated, and the swapped card
 * goes to the BOTTOM of whatever pile the draw left.
 *
 * The skull is the first randomness this tree has ever needed inside `playCard`, which takes no
 * generator. Rather than thread one through every call site, the roll is drawn from
 * `state.drawSeed` — which exists precisely so mid-hand randomness is reproducible — mixed with
 * `state.tricksPlayed`, so each trick gets its own stable value and a seeded encounter reproduces
 * its minted skulls exactly as it reproduces its reshuffles. `drawSeed` is READ, never advanced,
 * so the existing reshuffle sequence for a given seed is bit-identical after this change.
 *
 * EXACTLY ONE `rng()` call, before the swap, so the roll cannot depend on how many times the
 * generator was consumed. `skullableCards` decides whether the drawn rank may carry a skull —
 * "never rank 1" is `SKULL_RANK_WEIGHTS[1] === 0` and lives in the curve, never restated here.
 *
 * An exhausted deck follows `applyWoodcutterDraw`'s documented posture: `drawCards` returns fewer
 * cards than asked, the hand shrinks by one, and nothing throws. That state is unreachable in real
 * play with 6+6 committed to the two hands, so it is documented rather than guarded.
 *
 * DLR-163 fix pass — this block sat above `chooseQuarrySwapCard`, a three-line `sort()[0]` helper it
 * describes nothing about, while this function carried none.
 *
 * NOTE (DLR-167 fix pass) — `swapped` goes to the bottom of `drawPile` WITHOUT its `skulledCards`
 * entry being lifted, so a skulled Quarry card is expressible in the shared draw pile. `skulls.ts`'s
 * `trickIsSkulled` docblock records why that is not reachable in practice.
 */
export function applyQuarrySwap(state: RoundState, swapped: Card): RoundState {
  const rng = createSeededRng(mixSeed(state.drawSeed, state.tricksPlayed))
  const skullHit = rng() < QUARRY_SWAP_SKULL_CHANCE
  const draw = drawCards(state, 1)
  const handWithDrawn = [...state.hands[QUARRY_SIDE], ...draw.drawn]
  const drawn = draw.drawn[0]
  const mintsSkull = skullHit && drawn !== undefined && skullableCards([drawn]).length > 0
  return {
    ...state,
    hands: { ...state.hands, [QUARRY_SIDE]: removeCard(handWithDrawn, swapped) },
    drawPile: [...draw.drawPile, swapped],
    spentPile: draw.spentPile,
    drawSeed: draw.drawSeed,
    skulledCards: mintsSkull ? [...state.skulledCards, drawn] : state.skulledCards,
  }
}

export function nextLeaderAfterTrick(
  trick: readonly [TrickCard, TrickCard],
  winner: PlayerSide,
): PlayerSide {
  const swanLoser = trick.find((t) => t.card.rank === CardRank.Swan && t.side !== winner)
  return swanLoser ? swanLoser.side : winner
}
