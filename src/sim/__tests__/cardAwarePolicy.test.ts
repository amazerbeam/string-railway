import { describe, expect, it } from 'vitest'
import {
  CardRank,
  FRESH_ENCOUNTER_DECK,
  legalMoves,
  PlayerSide,
  Suit,
  type RoundState,
} from '../../warCouncil'
import {
  apCapacityFor,
  baseDamageBonusFor,
  buffTargetRankOf,
  buffTargetSuitOf,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  PLAYER_START_HEALTH,
  playerRankTiersFor,
  startRun,
  type Buff,
  type RunState,
} from '../../hunt'
import { dealHand } from '../../app/handDeal'
import {
  createRoundUiState,
  type RoundUiSeed,
  type RoundUiState,
} from '../../app/warCouncil/roundUiState'
import { baselinePolicy } from '../baselinePolicy'
import { cardAwarePolicy } from '../cardAwarePolicy'

function uiFor(run: RunState, handNumber = 1): RoundUiState {
  const round: RoundState = dealHand(run, handNumber, FRESH_ENCOUNTER_DECK)
  const seed: RoundUiSeed = {
    round,
    encounter: run.encounter,
    discardsRemaining: run.discardsRemaining,
    buffs: run.buffs,
    baseDamageBonus: baseDamageBonusFor(run),
    rankTiers: playerRankTiersFor(run),
    apCapacity: apCapacityFor(run.apCapacityBonus),
    coins: run.coins,
  }
  return createRoundUiState(seed)
}

/** A `markOfRank` card for a rank the player's hand does NOT hold — the exact waste this policy
 *  exists to stop, and the case the seed-1 replay caught the baseline committing.
 *
 *  DLR-145 pruned Mark of Rank out of `BUFF_TEMPLATES` (it is still DECLARED on `BuffKind`, priced,
 *  and read by `buffFires` — simply not mintable), so this constructs the `Buff` directly rather
 *  than through `mintFromTemplate`. `cardAwarePolicy` reads a `Buff`'s `condition.target`, not its
 *  template, so this is an equally real fixture for the behaviour under test. */
function markOfRankFor(rank: number, id: number): Buff {
  return {
    id,
    kind: BuffKind.MarkOfRank,
    tier: BuffTier.Bronze,
    condition: { kind: BuffKind.MarkOfRank, target: { rank } },
    reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
  }
}

describe('cardAwarePolicy — it aims, the baseline does not', () => {
  it('does not arm a rank-targeted buff whose rank is absent from the hand', () => {
    const base = startRun(PLAYER_START_HEALTH, [], 1)
    const hand = dealHand(base, 1, FRESH_ENCOUNTER_DECK).hands[PlayerSide.Player]
    const heldRanks = new Set(hand.map((card) => card.rank))
    const absentRank = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].find((r) => !heldRanks.has(r))
    if (absentRank === undefined) throw new Error('expected some rank to be absent from a hand')

    const run: RunState = { ...base, buffs: [markOfRankFor(absentRank, 9001)] }
    const ui = uiFor(run)

    // The baseline arms it regardless — that is the behaviour being corrected.
    expect(baselinePolicy.chooseBuffs(ui).length).toBeGreaterThan(0)
    expect(cardAwarePolicy.chooseBuffs(ui)).toEqual([])
  })

  it('arms a rank-targeted buff whose rank IS in the hand', () => {
    const base = startRun(PLAYER_START_HEALTH, [], 1)
    const hand = dealHand(base, 1, FRESH_ENCOUNTER_DECK).hands[PlayerSide.Player]
    const presentRank = hand[0].rank

    const run: RunState = { ...base, buffs: [markOfRankFor(presentRank, 9001)] }
    const ui = uiFor(run)
    expect(cardAwarePolicy.chooseBuffs(ui)).toEqual([9001])
  })

  it('every buff it arms is one some legal card is actually keyed to', () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const run = startRun(PLAYER_START_HEALTH, [], seed)
      const ui = uiFor(run)
      const legal = legalMoves(ui.round, PlayerSide.Player)

      for (const id of cardAwarePolicy.chooseBuffs(ui)) {
        const buff = ui.buffs.find((candidate) => candidate.id === id)
        if (buff === undefined) throw new Error(`armed an id ${id} not in the pile`)
        const suit = buffTargetSuitOf(buff)
        const rank = buffTargetRankOf(buff)
        if (suit === null && rank === null) continue // untargeted — not steered by card choice
        const aimable = legal.some((card) =>
          suit !== null ? String(card.suit) === String(suit) : card.rank === rank,
        )
        expect(aimable).toBe(true)
      }
    }
  })

  it('plays a legal card, and never one that would open an unanswered ability prompt', () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const ui = uiFor(startRun(PLAYER_START_HEALTH, [], seed))
      const choice = cardAwarePolicy.chooseCard(ui.round, ui)
      expect(legalMoves(ui.round, PlayerSide.Player)).toContainEqual(choice.card)
    }
  })

  // DLR-163 — the 5 carries no prompt any more, so a policy may play one freely. Before this
  // change the Woodcutter was filtered out of every measured game.
  it('DLR-163 — a hand whose only card is a Woodcutter is played, with no choice attached', () => {
    const base = uiFor(startRun(PLAYER_START_HEALTH, [], 5))
    const woodcutter = { suit: Suit.Bells, rank: CardRank.Woodcutter }
    const round = {
      ...base.round,
      hands: { ...base.round.hands, [PlayerSide.Player]: [woodcutter] },
    }
    const choice = cardAwarePolicy.chooseCard(round, { ...base, round })
    expect(choice.card).toEqual(woodcutter)
    expect(choice.choice).toBeUndefined()
  })

  it('falls back to the engine heuristic when called without ui, matching the baseline', () => {
    const ui = uiFor(startRun(PLAYER_START_HEALTH, [], 5))
    expect(cardAwarePolicy.chooseCard(ui.round)).toEqual(baselinePolicy.chooseCard(ui.round))
  })

  it('shares the baseline shop method by reference, so only card/buff play differs', () => {
    expect(cardAwarePolicy.nextShopAction).toBe(baselinePolicy.nextShopAction)
    expect(cardAwarePolicy.chooseBuffs).not.toBe(baselinePolicy.chooseBuffs)
    expect(cardAwarePolicy.chooseCard).not.toBe(baselinePolicy.chooseCard)
  })
})

describe('cardAwarePolicy.chooseDiscard', () => {
  it('discards only when NO hand card is keyed to a held buff, and never with no budget', () => {
    const base = startRun(PLAYER_START_HEALTH, [], 1)
    const hand = dealHand(base, 1, FRESH_ENCOUNTER_DECK).hands[PlayerSide.Player]
    const heldRanks = new Set(hand.map((card) => card.rank))
    const absentRank = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].find((r) => !heldRanks.has(r))
    if (absentRank === undefined) throw new Error('expected some rank to be absent from a hand')

    // Nothing in hand can aim this buff -> swap.
    const deadRun: RunState = { ...base, buffs: [markOfRankFor(absentRank, 9001)] }
    expect(cardAwarePolicy.chooseDiscard?.(uiFor(deadRun)).length).toBeGreaterThan(0)

    // A card in hand CAN aim this one -> keep the hand.
    const liveRun: RunState = { ...base, buffs: [markOfRankFor(hand[0].rank, 9002)] }
    expect(cardAwarePolicy.chooseDiscard?.(uiFor(liveRun))).toEqual([])

    // No budget -> never.
    const spent: RunState = { ...deadRun, discardsRemaining: 0 }
    expect(cardAwarePolicy.chooseDiscard?.(uiFor(spent))).toEqual([])
  })
})
