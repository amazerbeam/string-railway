import { describe, expect, it } from 'vitest'
import {
  CardRank,
  legalMoves,
  PlayerSide,
  Suit,
  FRESH_ENCOUNTER_DECK,
  type RoundState,
} from '../../warCouncil'
import {
  APPLY_DAMAGE_AP_COST,
  apCostOf,
  apCapacityFor,
  bankClimbBonusFor,
  BUFF_TEMPLATES,
  BuffRewardAxis,
  BuffTier,
  MAX_CARDS_PER_DISCARD,
  mintFromTemplate,
  PLAYER_START_HEALTH,
  playerRankTiersFor,
  SLOT_FREE_PULLS_PER_VISIT,
  SLOT_MACHINE_IDS,
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
import { baselinePolicy, maximalistPolicy, POLICIES } from '../baselinePolicy'

/** Assembles a `RoundUiSeed` from a real run and a real deal, exactly the fields `App.tsx`'s mount
 *  passes — mirrors `playHand.ts`'s (Phase 3) `seedFor` helper in spirit, ahead of its existence. */
function uiFor(run: RunState, handNumber = 1): RoundUiState {
  const round: RoundState = dealHand(run, handNumber, FRESH_ENCOUNTER_DECK)
  const seed: RoundUiSeed = {
    round,
    encounter: run.encounter,
    cheats: run.cheats,
    timebombCharges: run.timebombCharges,
    blastGuardHeld: run.blastGuardHeld,
    discardsRemaining: run.discardsRemaining,
    buffs: run.buffs,
    bankClimbBonus: bankClimbBonusFor(run),
    rankTiers: playerRankTiersFor(run),
    apCapacity: apCapacityFor(run.apCapacityBonus),
    coins: run.coins,
  }
  return createRoundUiState(seed)
}

describe('baselinePolicy.chooseCard', () => {
  it('returns a card that is a legal move for the player', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 21)
    const ui = uiFor(run)
    const choice = baselinePolicy.chooseCard(ui.round)
    const legal = legalMoves(ui.round, PlayerSide.Player)
    expect(
      legal.some((card) => card.rank === choice.card.rank && card.suit === choice.card.suit),
    ).toBe(true)
  })
})

describe('baselinePolicy.chooseBuffs', () => {
  it('activates at least one buff, leaving APPLY_DAMAGE_AP_COST in the pool', () => {
    // A freshly started run's pile is STARTING_BUFF_COUNT `BuffKind.Unassigned` placeholders,
    // which `activatableBuffs` filters out — mint a real, cheaply-priced buff so the pile has
    // something the baseline can actually activate.
    const magnitudeTemplate = BUFF_TEMPLATES.find(
      (template) => template.axis === BuffRewardAxis.Magnitude,
    )
    if (magnitudeTemplate === undefined) {
      throw new Error('expected at least one BUFF_TEMPLATES entry on the Magnitude axis')
    }
    const minted: Buff = mintFromTemplate(magnitudeTemplate, BuffTier.Bronze, 9001)
    const run: RunState = { ...startRun(PLAYER_START_HEALTH, [], 22), buffs: [minted] }
    const ui = uiFor(run)

    const chosen = baselinePolicy.chooseBuffs(ui)
    expect(chosen.length).toBeGreaterThan(0)

    const spent = chosen.reduce((total, id) => {
      const buff = ui.buffs.find((candidate) => candidate.id === id)
      if (buff === undefined) throw new Error(`chooseBuffs returned an id ${id} not in ui.buffs`)
      return total + apCostOf(buff)
    }, 0)
    expect(ui.buffActivation.apPool - spent).toBeGreaterThanOrEqual(APPLY_DAMAGE_AP_COST)
  })
})

describe('baselinePolicy.wantsApplyDamage', () => {
  it('is false on a freshly dealt hand — bank 0, multiplier 0, refusal non-null', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 23)
    const ui = uiFor(run)
    expect(ui.round.bank).toBe(0)
    expect(ui.round.multiplier).toBe(0)
    expect(baselinePolicy.wantsApplyDamage(ui)).toBe(false)
  })
})

describe('baselinePolicy.nextShopAction', () => {
  it('takes the free pull first, on a fresh run at a shop visit', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 24)
    expect(baselinePolicy.nextShopAction(run)).toEqual({
      kind: 'pull',
      machineId: SLOT_MACHINE_IDS[0],
    })
  })

  it('returns null once every branch is exhausted — no coins, no free pull left, full health', () => {
    const run: RunState = {
      ...startRun(PLAYER_START_HEALTH, [], 25),
      coins: 0,
      slotPullsThisVisit: SLOT_FREE_PULLS_PER_VISIT,
    }
    expect(baselinePolicy.nextShopAction(run)).toBeNull()
  })
})

describe('maximalistPolicy', () => {
  it('POLICIES holds exactly baseline and maximalist, each named after its key', () => {
    expect(Object.keys(POLICIES).sort()).toEqual(['baseline', 'maximalist'])
    expect(POLICIES.baseline.name).toBe('baseline')
    expect(POLICIES.maximalist.name).toBe('maximalist')
  })

  it('differs from baselinePolicy only in the two levers — the shared methods are reference-identical', () => {
    expect(maximalistPolicy.chooseCard).toBe(baselinePolicy.chooseCard)
    expect(maximalistPolicy.wantsApplyDamage).toBe(baselinePolicy.wantsApplyDamage)
    expect(maximalistPolicy.chooseBuffs).toBe(baselinePolicy.chooseBuffs)
    expect(maximalistPolicy.nextShopAction).toBe(baselinePolicy.nextShopAction)
  })

  it('chooseDiscard returns MAX_CARDS_PER_DISCARD hand cards sorted ascending by rank, or none with no budget', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 26)
    const ui = uiFor(run)
    const chosen = maximalistPolicy.chooseDiscard?.(ui) ?? []
    expect(chosen.length).toBe(MAX_CARDS_PER_DISCARD)
    for (const card of chosen) {
      expect(ui.round.hands[PlayerSide.Player]).toContainEqual(card)
    }
    for (let i = 1; i < chosen.length; i += 1) {
      expect(chosen[i].rank).toBeGreaterThanOrEqual(chosen[i - 1].rank)
    }

    const spentRun: RunState = { ...run, discardsRemaining: 0 }
    const spentUi = uiFor(spentRun)
    expect(maximalistPolicy.chooseDiscard?.(spentUi)).toEqual([])
  })

  it('wantsCheatPlay returns null while leading, and otherwise names a card only the widened set admits', () => {
    const run = startRun(PLAYER_START_HEALTH, [], 27)
    const leadingUi = uiFor(run)
    expect(maximalistPolicy.wantsCheatPlay?.(leadingUi) ?? null).toBeNull()

    const led = { suit: Suit.Bells, rank: 4 }
    const followerHand = [
      { suit: Suit.Bells, rank: 2 },
      { suit: Suit.Keys, rank: 9 },
      { suit: Suit.Moons, rank: 6 },
    ]
    const following: RoundState = {
      ...leadingUi.round,
      currentTrick: [{ side: PlayerSide.Cpu, card: led }],
      hands: { ...leadingUi.round.hands, [PlayerSide.Player]: followerHand },
    }
    const followingUi: RoundUiState = { ...leadingUi, round: following }

    const legal = legalMoves(following, PlayerSide.Player)
    const widened = legalMoves(following, PlayerSide.Player, { ignoreFollowSuit: true })
    const play = maximalistPolicy.wantsCheatPlay?.(followingUi) ?? null

    expect(play).not.toBeNull()
    if (play !== null) {
      expect(widened).toContainEqual(play.card)
      expect(legal).not.toContainEqual(play.card)
      expect(play.card.rank).not.toBe(CardRank.Fox)
      expect(play.card.rank).not.toBe(CardRank.Woodcutter)
    }
  })
})
