import type { Coins, Health } from './types'

/**
 * DLR-158 — the max-health purchase's three figures and the two rules that read them.
 *
 * A sibling module rather than three keys in `config.ts`, following `rankTiers.ts`'s precedent
 * with `RANK_TIER_STEP_PRICE`: the shop's other stacking price lives beside the rule it prices,
 * not in `config.ts`, and `config.ts` is close enough to the 400-line blocking budget that a
 * documented formula would breach it. AC4's substance is met either way — ONE formula, in ONE
 * place, with the base and the step both configuration rather than literals at a call site.
 */

// UNIT: health points added to the run's ceiling by one purchase.
// VALUE UNCHOSEN — a documented placeholder, NEVER PLAYED. The developer's to move: DLR-158 puts
// "choosing the final base price, growth curve and health-per-purchase values" out of scope and
// says to ship rough defaults and tune by feel. AC2's own worked example uses +2 on a 6 ceiling.
export const MAX_HEALTH_PER_PURCHASE: Health = 2

// UNIT: coins. What the FIRST max-health purchase of a run costs.
// VALUE UNCHOSEN — see above. Placed between HEAL_PRICE (1) and WHETSTONE_PRICE (4) because this
// item restores to full as well as raising the ceiling, so at Heal's price it would displace Heal
// outright — which the ticket names as the risk the growth curve exists to manage.
export const MAX_HEALTH_PRICE_BASE: Coins = 3

// UNIT: coins added to the price per purchase ALREADY MADE.
// VALUE UNCHOSEN — see above. At 2 the ladder is 3 / 5 / 7 / 9 against a 10-coin encounter win.
// This key is the only limiter there is: AC6 rules out a purchase cap.
export const MAX_HEALTH_PRICE_STEP: Coins = 2

/**
 * AC4 — THE single statement of the escalating price, so the screen, the refusal and the coin
 * deduction cannot disagree about what the next copy costs. Linear in the count already bought,
 * which is the simplest rule satisfying "the Nth costs more than the (N-1)th"; swapping it for a
 * multiplier is an edit to this one expression.
 *
 * Throws on a non-finite or negative count rather than returning `NaN`. A `NaN` price would fail
 * `stock.coins < price` — `NaN` comparisons are always false — and so would read as AFFORDABLE,
 * charging the player an unknowable amount and rendering as nothing on the tile.
 */
export function maxHealthPriceFor(purchases: number): Coins {
  if (!Number.isInteger(purchases) || purchases < 0) {
    throw new RangeError(
      `Cannot price a max-health purchase against a count of ${purchases}: it must be a non-negative integer`,
    )
  }
  return MAX_HEALTH_PRICE_BASE + MAX_HEALTH_PRICE_STEP * purchases
}

/**
 * AC1 — THE single statement of how far one purchase raises the ceiling, so the step size is read
 * from configuration in exactly one place and `buyFromShop` holds no arithmetic of its own.
 *
 * Guards the incoming ceiling for `flaskHealAmount`'s stated reason: a `NaN` maximum would corrupt
 * `Math.min` inside `healedBy`, land in `encounter.health`, and vanish from the health bar with
 * nothing logged anywhere.
 */
export function raisedMaxHealthFor(maxPlayerHealth: Health): Health {
  if (!Number.isFinite(maxPlayerHealth) || maxPlayerHealth <= 0) {
    throw new RangeError(
      `Cannot raise a maximum health of ${maxPlayerHealth}: it must be a positive finite number`,
    )
  }
  return maxPlayerHealth + MAX_HEALTH_PER_PURCHASE
}
