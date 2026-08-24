/**
 * DLR-130 — THE baseline simulated player. Every figure `npm run sim` prints is conditional on
 * this file, so its behaviour is written out here in full rather than left to be read off the
 * code. Swap it by passing `--policy <name>`; add a policy by putting it in `POLICIES` below.
 *
 * CARDS — delegates to `chooseCpuMove(round, PlayerSide.Player)`, the engine's own shipped
 * heuristic, seated on the player's side: lead the lowest legal card; when following, the lowest
 * legal card that would LOSE the trick and carries a skull, else the lowest legal card that would
 * WIN, else the lowest legal card at all. Fox and Woodcutter choices come from the same call, so
 * the card and its ability choice can never disagree.
 *
 * BUFFS — at every between-tricks window, activates every offered buff whose refusal is `null`,
 * CHEAPEST AP FIRST, while the pool would still cover `APPLY_DAMAGE_AP_COST` afterwards. A policy
 * that never activated a buff would report the game unwinnable and be technically correct and
 * completely useless, which is why the reserve is the only thing that stops it.
 *
 * APPLY DAMAGE — presses when `applyDamageRefusalFor` returns `null` AND either the multiplier has
 * reached `BASELINE_CASH_AT_MULTIPLIER` or this is the hand's last window with a non-empty bank
 * (an unbanked bank is lost at the deal, so the last window is use-it-or-lose-it).
 *
 * NEVER — discards, marks a Timebomb, or arms a Cheat. None is on the shop's shelf
 * (`SHOP_ITEMS`), so a baseline that used them would be measuring cards a player cannot buy.
 *
 * SHOP — takes the free slot pulls first, then buys in the fixed order Heal (only below maximum
 * health) -> AP capacity -> Swan tier -> Witch tier while each is affordable, then drinks the
 * flask if below maximum health with a charge in hand.
 */
import { applyDamageRefusalFor, chooseCpuMove, PlayerSide, type RoundState } from '../warCouncil'
import {
  apCostOf,
  APPLY_DAMAGE_AP_COST,
  flaskRefusalFor,
  flaskStockFor,
  refusalFor,
  shopStockFor,
  ShopItem,
  SLOT_FREE_PULLS_PER_VISIT,
  SLOT_MACHINE_IDS,
  type BuffId,
  type RunState,
} from '../hunt'
import { loadoutRefusalFor } from '../app/warCouncil/buffHandlers'
import { applyDamageStock, offeredBuffs, type RoundUiState } from '../app/warCouncil/roundUiState'
import type { CardChoice, ShopAction, SimPolicy } from './types'

/** A policy parameter, NOT a game tunable — see this module's docblock, "APPLY DAMAGE". The
 *  multiplier the baseline waits for before voluntarily cashing out. */
export const BASELINE_CASH_AT_MULTIPLIER = 3

/** The fixed order the baseline shops in, tried while each is affordable. */
const SHOP_PURCHASE_ORDER: readonly ShopItem[] = [
  ShopItem.Heal,
  ShopItem.ApCapacity,
  ShopItem.SwanTier,
  ShopItem.WitchTier,
]

function chooseCard(round: RoundState): CardChoice {
  return chooseCpuMove(round, PlayerSide.Player)
}

function chooseBuffs(ui: RoundUiState): readonly BuffId[] {
  const candidates = offeredBuffs(ui).filter((buff) => loadoutRefusalFor(ui, buff) === null)
  const ordered = [...candidates].sort((a, b) => {
    const costDiff = apCostOf(a) - apCostOf(b)
    return costDiff !== 0 ? costDiff : a.id - b.id
  })

  const chosen: BuffId[] = []
  let pool = ui.buffActivation.apPool
  for (const buff of ordered) {
    const cost = apCostOf(buff)
    if (pool - cost < APPLY_DAMAGE_AP_COST) continue
    pool -= cost
    chosen.push(buff.id)
  }
  return chosen
}

function wantsApplyDamage(ui: RoundUiState): boolean {
  if (applyDamageRefusalFor(applyDamageStock(ui)) !== null) return false
  const isLastWindow = ui.round.hands[PlayerSide.Player].length <= 1
  return ui.round.multiplier >= BASELINE_CASH_AT_MULTIPLIER || (isLastWindow && ui.round.bank > 0)
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
  wantsApplyDamage,
  chooseBuffs,
  nextShopAction,
}

export const POLICIES: Readonly<Record<string, SimPolicy>> = { baseline: baselinePolicy }
