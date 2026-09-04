import { FLASK_HEAL_PERCENT } from './config'
import type { Health } from './types'

/**
 * DLR-93 AC3 — why the flask cannot be drunk. A reason CODE, not a sentence: `src/hunt/` holds no
 * user-facing copy, and `src/app/run/shopLabels.ts` maps these to words. `shop.ts`'s
 * `PurchaseRefusal` exactly.
 *
 * A SEPARATE union from `PurchaseRefusal`, deliberately. The flask is not a purchase — it is free
 * and charge-limited — and widening that union would force every shop item's exhaustive handling
 * (`PURCHASE_REFUSAL_MESSAGE`, `refusalFor`'s branches, 49 sites across `src/`) to grow a case
 * that can never occur for a purchase, and would let a flask reason reach a shop card's label.
 * `AlreadyFullHealth` duplicates the NAME of its `PurchaseRefusal` twin because it is the same
 * player-facing fact reached by a different rule.
 */
export const FlaskRefusal = {
  NoCharges: 'noCharges',
  AlreadyFullHealth: 'alreadyFullHealth',
} as const
export type FlaskRefusal = (typeof FlaskRefusal)[keyof typeof FlaskRefusal]

/** Everything the flask's rules need, and nothing else. Deliberately NOT `RunState` — the sibling
 *  of `ShopStock`, for the reason that interface states: this module holds the flask's rules and
 *  must not learn the run's shape. `run.ts`'s `flaskStockFor` builds it. */
export interface FlaskStock {
  readonly charges: number
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
}

/**
 * AC2 — how much one flask restores, BEFORE the clamp. THE only reader of `FLASK_HEAL_PERCENT`.
 *
 * `Math.round` for the reason `config.ts`'s boss-health projection rounds: a fractional figure
 * cannot reach a heart row that renders whole hearts.
 *
 * Throws on a non-positive or non-finite maximum rather than returning `NaN`. A `NaN` heal would
 * corrupt `Math.min` in the clamp, land in `encounter.health`, and vanish from the health bar with
 * nothing logged anywhere — the exact failure `web-project.md`'s numeric-safety trap names.
 */
export function flaskHealAmount(maxPlayerHealth: Health): Health {
  if (!Number.isFinite(maxPlayerHealth) || maxPlayerHealth <= 0) {
    throw new RangeError(
      `Cannot size a flask against a maximum health of ${maxPlayerHealth}: it must be a positive finite number`,
    )
  }
  return Math.round(maxPlayerHealth * FLASK_HEAL_PERCENT)
}

/**
 * AC3 — THE single statement of whether the flask can be drunk, read by `drinkFlask` (which throws
 * on a non-null result) and by the screen (which disables the control and prints the reason). Two
 * readings of one rule, never two rules — `shop.ts`'s `refusalFor` exactly.
 *
 * `NoCharges` comes FIRST deliberately, mirroring `refusalFor`'s item-before-coins order: with an
 * empty flask at full health, the empty flask is the reason that will still be true after the next
 * hit.
 *
 * A non-finite charge count refuses rather than passing the comparison. `NaN <= 0` is `false`,
 * which would otherwise read as "a charge in hand" and present a corrupted figure as a drinkable
 * flask — the same guard `refusalFor` puts on `stock.coins`.
 */
export function flaskRefusalFor(stock: FlaskStock): FlaskRefusal | null {
  if (!Number.isFinite(stock.charges) || stock.charges <= 0) {
    return FlaskRefusal.NoCharges
  }
  if (stock.playerHealth >= stock.maxPlayerHealth) {
    return FlaskRefusal.AlreadyFullHealth
  }
  return null
}
