/**
 * DLR-130 — THE baseline simulated player. Every figure `npm run sim` prints is conditional on
 * this file, so its behaviour is written out here in full rather than left to be read off the
 * code. Swap it by passing `--policy <name>`; add a policy by registering it in `policies.ts`.
 *
 * CARDS — delegates to `chooseCpuMove(round, PlayerSide.Player)`, the engine's own shipped
 * heuristic, seated on the player's side: lead the lowest legal card; when following, the lowest
 * legal card that would LOSE the trick and carries a skull, else the lowest legal card that would
 * WIN, else the lowest legal card at all. Fox and Woodcutter choices come from the same call, so
 * the card and its ability choice can never disagree.
 *
 * BUFFS — at every between-tricks window, activates every offered buff whose refusal is `null`,
 * CHEAPEST AP FIRST. A policy that never activated a buff would report the game unwinnable and be
 * technically correct and completely useless, which is why activating is the default.
 *
 * APPLY OR ROLL — declines to answer (`wantsApplyPot` unset), so `playHand.ts`'s driver applies
 * its own documented modelling default: apply whenever a pot stands, never rolling the dice. That
 * default is what this policy's printed figures reflect, not a strategy this file states itself.
 * DLR-156 review fix — this replaces the earlier claim that there was nothing left to press; the
 * cash-or-roll choice moved onto the resolution screen and IS pressed now, by the driver's default.
 *
 * NEVER — discards, or arms a Cheat. Neither is on the shop's shelf
 * (`SHOP_ITEMS`), so a baseline that used them would be measuring cards a player cannot buy.
 *
 * SHOP — takes the free slot pulls first, then buys in the fixed order Heal (only below maximum
 * health) -> Swan tier -> Witch tier while each is affordable, then drinks the flask if below
 * maximum health with a charge in hand. `ApCapacity` dropped with DLR-145 (AP removed entirely).
 *
 * DLR-120 — the second policy: `baselinePolicy`'s cards and buffs, VERBATIM, plus the two levers a
 * run actually grants and the baseline never pulls. Card and buff play are deliberately identical
 * so a difference in the printed figures is attributable to the levers rather than to card play.
 *
 * MAXIMALIST DISCARD — once per hand, on the first open between-tricks window, the lowest-ranked
 * `MAX_CARDS_PER_DISCARD` cards, while `discardsRemaining > 0`. Discarding at EVERY window would
 * spend the fight's whole `DISCARDS_PER_FIGHT` budget inside hand one, which measures the budget
 * rather than exercising the swap. Every number in that sentence is an existing configuration
 * constant read by name; this policy introduces none.
 *
 * MAXIMALIST CHEAT — the run's starting Cheat (`RUN_STARTING_CHEATS = 1`), armed ONLY where lifting
 * follow-suit strictly widens the legal set, and then playing the highest-ranked card the widening
 * admits. The Fox is excluded: it opens an `AbilityChoice` prompt, and the driver answers a prompt
 * from `chooseCpuMove`'s choice for a different card. DLR-163 — the Woodcutter is NOT excluded any
 * more; it carries no prompt since its rule became a Swap-pile raise.
 */
import {
  CardRank,
  chooseCpuMove,
  containsCard,
  discardRefusalFor,
  legalMoves,
  PlayerSide,
  type Card,
  type RoundState,
} from '../warCouncil'
import {
  apCostFor,
  apCostOf,
  BuffKind,
  flaskRefusalFor,
  flaskStockFor,
  MAX_CARDS_PER_DISCARD,
  refusalFor,
  shopStockFor,
  ShopItem,
  SHOP_ITEMS,
  type ActionPoints,
  type Buff,
  SLOT_FREE_PULLS_PER_VISIT,
  SLOT_MACHINE_IDS,
  slotPullRefusalFor,
  slotVisitStockFor,
  type BuffId,
  type RunState,
} from '../hunt'
import { loadoutRefusalFor } from '../app/warCouncil/buffHandlers'
import { discardStock, offeredBuffs, type RoundUiState } from '../app/warCouncil/roundUiState'
import type { CardChoice, CheatPlay, ShopAction, SimPolicy } from './types'

/** The fixed order the baseline shops in, tried while each is affordable. `ShopItem.ApCapacity`
 *  dropped with DLR-145 (AP removed entirely) — see that ticket's Phase 2. */
/**
 * play-tester (2026-09-02) — DERIVED from `SHOP_ITEMS`, the shelf itself, rather than hand-listed.
 *
 * It was hand-listed as `[Heal, SwanTier, WitchTier]` and went stale twice without anything
 * failing: the two rank rungs left the shelf on 2026-09-01 and the max-health purchase arrived on
 * 2026-09-02. `refusalFor` stays TOTAL over `ShopItem` — an unshelved item is still priced and
 * still buyable by a caller — so the baseline went on spending most of its purse on two things no
 * player could buy while never once buying the one thing they could. Deriving it means the next
 * shelf change reaches this policy for free.
 *
 * Heal leads, which is the baseline's own conservative character (`rerollFocusedPolicy` is the one
 * that spends on cards); everything else on the shelf follows in shelf order.
 */
const SHOP_PURCHASE_ORDER: readonly ShopItem[] = [
  ShopItem.Heal,
  ...SHOP_ITEMS.filter((item) => item !== ShopItem.Heal),
]

function chooseCard(round: RoundState): CardChoice {
  return chooseCpuMove(round, PlayerSide.Player)
}

/**
 * play-tester (2026-09-02) — what activating `buff` ACTUALLY costs this policy, through the same
 * `apCostFor` the engine charges through rather than through `apCostOf`'s raw price table.
 *
 * This was `apCostOf` in both policies, and it silently capped every buff figure this simulator has
 * ever printed. Action points were switched off on 2026-08-25 (`AP_ENABLED = false`), so the engine
 * charges nothing and refuses nothing — but the policies kept budgeting against `STARTING_AP`'s
 * pool of 6 at raw prices of 1 to 3, and so stopped arming after three to six cards no matter how
 * large the pile had grown. Measured on seed 1 the player reached 196 activatable cards, every one
 * of them reporting `refusal: null`, and still fired six on a trick. The Overlap Bonus pays
 * `firedCount - 1`, so a self-imposed cap on `firedCount` understates the whole stacking mechanic.
 *
 * Reading through `apCostFor` means flipping `AP_ENABLED` back on restores the old rationing with
 * no edit here — the toggle governs the policy exactly as it governs the engine.
 */
function apBudgetCostOf(buff: Buff): ActionPoints {
  return apCostFor(apCostOf(buff))
}

function chooseBuffs(ui: RoundUiState): readonly BuffId[] {
  const candidates = offeredBuffs(ui).filter((buff) => loadoutRefusalFor(ui, buff) === null)
  const ordered = [...candidates].sort((a, b) => {
    const costDiff = apBudgetCostOf(a) - apBudgetCostOf(b)
    return costDiff !== 0 ? costDiff : a.id - b.id
  })

  const chosen: BuffId[] = []
  let pool = ui.buffActivation.apPool
  for (const buff of ordered) {
    const cost = apBudgetCostOf(buff)
    if (pool - cost < 0) continue
    pool -= cost
    chosen.push(buff.id)
  }
  return chosen
}

function nextShopAction(run: RunState): ShopAction | null {
  if (run.slotPullsThisVisit < SLOT_FREE_PULLS_PER_VISIT) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }

  const stock = shopStockFor(run)
  for (const item of SHOP_PURCHASE_ORDER) {
    if (refusalFor(stock, item) === null) {
      return { kind: 'buy', item }
    }
  }

  if (flaskRefusalFor(flaskStockFor(run)) === null) {
    return { kind: 'flask' }
  }

  return null
}

export const baselinePolicy: SimPolicy = {
  name: 'baseline',
  chooseCard,
  chooseBuffs,
  nextShopAction,
}

/** play-tester (2026-08-25) — "would more/better buff access help" modeled through the ONE
 *  mechanic that already grants it: a paid slot reroll (`SLOT_REROLL_PRICE`) can turn up a
 *  `TwoMatch` (silver) or `ThreeMatch` (gold) award, where the baseline's single free pull almost
 *  never does. `baselinePolicy`'s cards and buffs, VERBATIM — only `nextShopAction` differs, so a
 *  gap against the baseline's own figures is attributable to the reroll spend, not to different
 *  card or buff play.
 *
 *  SHOP — free pull first, same as baseline. Below `HEAL_FLOOR_HEALTH` (survival risk), heals
 *  first exactly as the baseline does — a dead player can't spend a buff. At or above the floor,
 *  spends every coin it can on further rerolls before falling back to the baseline's own
 *  Heal -> AP capacity -> Swan tier -> Witch tier order and the flask. This is a REDISTRIBUTION of
 *  the SAME income the baseline earns, not a "more money" run — see this policy's own report
 *  question for that half. */
export const HEAL_FLOOR_HEALTH = 4

function rerollFocusedShopAction(run: RunState): ShopAction | null {
  if (run.slotPullsThisVisit < SLOT_FREE_PULLS_PER_VISIT) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }

  const stock = shopStockFor(run)
  const belowFloor = stock.playerHealth < HEAL_FLOOR_HEALTH
  if (belowFloor && refusalFor(stock, ShopItem.Heal) === null) {
    return { kind: 'buy', item: ShopItem.Heal }
  }
  if (!belowFloor && slotPullRefusalFor(slotVisitStockFor(run)) === null) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }

  for (const item of SHOP_PURCHASE_ORDER) {
    if (refusalFor(stock, item) === null) {
      return { kind: 'buy', item }
    }
  }

  if (flaskRefusalFor(flaskStockFor(run)) === null) {
    return { kind: 'flask' }
  }

  return null
}

export const rerollFocusedPolicy: SimPolicy = {
  name: 'rerollFocused',
  chooseCard,
  chooseBuffs,
  nextShopAction: rerollFocusedShopAction,
}

function chooseDiscard(ui: RoundUiState): readonly Card[] {
  if (discardRefusalFor(discardStock(ui)) !== null) return []
  const hand = ui.round.hands[PlayerSide.Player]
  return [...hand]
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.suit.localeCompare(b.suit)))
    .slice(0, MAX_CARDS_PER_DISCARD)
}

function wantsCheatPlay(ui: RoundUiState): CheatPlay | null {
  const cheat = offeredBuffs(ui).find((buff) => buff.kind === BuffKind.Cheat)
  if (cheat === undefined) return null

  const legal = legalMoves(ui.round, PlayerSide.Player)
  const widened = legalMoves(ui.round, PlayerSide.Player, { ignoreFollowSuit: true })
  if (widened.length <= legal.length) return null

  // DLR-163 — only the Fox is excluded now: the Woodcutter carries no choice since the 5's rule
  // became a Swap-pile raise, so a Cheat may legitimately unlock one.
  const gained = widened.filter((card) => !containsCard(legal, card) && card.rank !== CardRank.Fox)
  if (gained.length === 0) return null

  const best = gained.reduce((highest, card) => (card.rank > highest.rank ? card : highest))
  return { cheatId: cheat.id, card: best }
}

export const maximalistPolicy: SimPolicy = {
  name: 'maximalist',
  chooseCard,
  chooseBuffs,
  nextShopAction,
  chooseDiscard,
  wantsCheatPlay,
}

/** play-tester — the "how far with no buffs at all" floor. `baselinePolicy` verbatim except it
 *  never activates a single buff, ever (`chooseBuffs` always `[]`): card play and shop order are
 *  all identical, so any gap against `baselinePolicy`'s own figures is attributable to buff
 *  activation alone, not to a different strategy elsewhere. */
export const noBuffsPolicy: SimPolicy = {
  ...baselinePolicy,
  name: 'noBuffs',
  chooseBuffs: () => [],
}
