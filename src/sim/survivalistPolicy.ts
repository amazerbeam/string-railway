/**
 * play-tester (2026-09-02) — THE SURVIVALIST SHOP RULE.
 *
 * Every shop rule this simulator had was written before 2026-09-02 and before the action-point
 * budgeting fix, and each one answers a question the current numbers have made obsolete:
 * `baselinePolicy` takes only its free pull and pours the rest into the shelf; `rerollFocusedPolicy`
 * pours everything into cards. With the buff stack no longer self-capped at six, the reroll rule
 * measures a player who buys 166 cards, deals up to 63 damage in a hand against a Quarry holding
 * 10, and spends **0.4 coins a run on health** — then dies of attrition on a 10-point bar. That
 * says nothing about whether the game is beatable; it says the money went to the wrong shelf.
 *
 * This rule spends on the constraint instead. In order:
 *
 * 1. **The free pull**, always — it costs nothing, so declining it is never right.
 * 2. **Max health while it is affordable.** It raises the ceiling by `MAX_HEALTH_PER_PURCHASE`
 *    AND refills to that new top, so at the moment it lands it strictly beats a Heal; its price
 *    climbs by `MAX_HEALTH_PRICE_STEP` per copy, which is what stops this clause eating the whole
 *    purse and leaves the later coins for cards.
 * 3. **A Heal whenever one would do something** — the cheap top-up once the ceiling has moved out
 *    of reach for this visit.
 * 4. **Paid pulls with whatever is left**, because a card that never gets bought never fires.
 * 5. **The flask**, if still charged.
 *
 * The ORDER is the whole content of this policy and it is not a tuned value — it is the ordering
 * the current figures argue for, offered so the health-first and card-first extremes can be
 * measured against each other on the same income. Which split is right is the developer's.
 */
import {
  flaskRefusalFor,
  flaskStockFor,
  refusalFor,
  ShopItem,
  shopStockFor,
  SLOT_FREE_PULLS_PER_VISIT,
  slotPullRefusalFor,
  SLOT_MACHINE_IDS,
  slotVisitStockFor,
  type RunState,
} from '../hunt'
import { baselinePolicy } from './baselinePolicy'
import { cardAwarePolicy } from './cardAwarePolicy'
import type { ShopAction, SimPolicy } from './types'

function survivalistShopAction(run: RunState): ShopAction | null {
  if (run.slotPullsThisVisit < SLOT_FREE_PULLS_PER_VISIT) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }

  const stock = shopStockFor(run)
  if (refusalFor(stock, ShopItem.MaxHealth) === null) {
    return { kind: 'buy', item: ShopItem.MaxHealth }
  }
  if (refusalFor(stock, ShopItem.Heal) === null) {
    return { kind: 'buy', item: ShopItem.Heal }
  }
  if (slotPullRefusalFor(slotVisitStockFor(run)) === null) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }
  if (flaskRefusalFor(flaskStockFor(run)) === null) {
    return { kind: 'flask' }
  }
  return null
}

/** `cardAwarePolicy`'s card and buff play — the best this simulator has — on the survivalist shop
 *  rule. Card and buff methods are reference-identical to `cardAwarePolicy`'s, so any gap against
 *  it is attributable to where the coins went and to nothing else. */
export const survivalistPolicy: SimPolicy = {
  ...cardAwarePolicy,
  name: 'survivalist',
  nextShopAction: survivalistShopAction,
}

/** The same shop rule on `baselinePolicy`'s blind buff play, so "does the shop rule help a weak
 *  player too" is separable from "does it help the aimed one". */
export const survivalistBaselinePolicy: SimPolicy = {
  ...baselinePolicy,
  name: 'survivalistBaseline',
  nextShopAction: survivalistShopAction,
}

/**
 * play-tester (2026-09-02) — THE SHARPSHOOTER RULE, and the reason it exists.
 *
 * The sweep across every other rule says two things that no single existing policy does together.
 * Cards buy survival better than health does, because a bigger stack kills the fight sooner and a
 * fight that ends sooner costs fewer lost tricks — `rerollFocusedPolicy` reaches further on 0.4
 * coins of healing than `survivalist` does on 26 coins of max health. And yet the card-buying rule
 * still dies of attrition, because `HEAL_FLOOR_HEALTH` only heals BELOW 4, so it walks out of the
 * shop on 4 of 10 and the shop is unreachable again until the fight it is about to lose is over.
 *
 * So: top the bar all the way up first — a Heal is refused outright when it would do nothing, so
 * this clause self-terminates at full health — then put every remaining coin into pulls. Max health
 * is deliberately LAST: its ladder starts at 3 coins against a Heal's 1, and the measured
 * constraint is surviving the next fight rather than raising a ceiling for a later one.
 *
 * Buff play is `baselinePolicy`'s, not `cardAwarePolicy`'s, and that is measured rather than
 * assumed: with action points off, arming EVERYTHING beats aiming a subset, because the Overlap
 * Bonus pays `firedCount - 1` and an unaimed card still adds to the count.
 */
function sharpshooterShopAction(run: RunState): ShopAction | null {
  if (run.slotPullsThisVisit < SLOT_FREE_PULLS_PER_VISIT) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }
  if (flaskRefusalFor(flaskStockFor(run)) === null) {
    return { kind: 'flask' }
  }
  const stock = shopStockFor(run)
  if (refusalFor(stock, ShopItem.Heal) === null) {
    return { kind: 'buy', item: ShopItem.Heal }
  }
  if (slotPullRefusalFor(slotVisitStockFor(run)) === null) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }
  if (refusalFor(stock, ShopItem.MaxHealth) === null) {
    return { kind: 'buy', item: ShopItem.MaxHealth }
  }
  return null
}

export const sharpshooterPolicy: SimPolicy = {
  ...baselinePolicy,
  name: 'sharpshooter',
  nextShopAction: sharpshooterShopAction,
}
