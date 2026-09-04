import { templateById } from '../hunt/buffTemplates'
import type { BuffTier } from '../hunt/buffs'
import {
  VAULT_EXCHANGE_RATE,
  VAULT_ODDS_BOOST_MAX_STACKS,
  VAULT_ODDS_BOOST_PRICE,
  VAULT_STARTING_TIER_PRICE,
} from './vaultConfig'
import type { VaultState } from './vaultState'

/**
 * DLR-113 — deposit-on-death and both spends. Follows `src/hunt/shop.ts`'s `refusalFor` /
 * `PurchaseRefusal` idiom throughout: a refusal predicate is the single statement of
 * affordability, and the `buy*` functions throw only when called past their own refusal — a
 * driver bug, never a state a caller need catch.
 */

/** Why a spend cannot happen. A reason CODE, not a sentence — `src/hunt/` holds no user-facing
 *  copy, and neither does `src/vault/`. */
export const VaultSpendRefusal = {
  NotEnoughCurrency: 'notEnoughCurrency',
  UnknownTemplate: 'unknownTemplate',
  BoostMaxed: 'boostMaxed',
} as const
export type VaultSpendRefusal = (typeof VaultSpendRefusal)[keyof typeof VaultSpendRefusal]

/** AC1 — `floor(leftoverCoin / VAULT_EXCHANGE_RATE)` added to the balance, remainder discarded.
 *  Guards `Number.isFinite` before dividing and floors a negative to 0, so no `NaN` and no
 *  negative balance is ever constructible from this function. Returns a fresh vault. */
export function depositLeftoverCoin(vault: VaultState, leftoverCoin: number): VaultState {
  const safeCoin = Number.isFinite(leftoverCoin) && leftoverCoin > 0 ? leftoverCoin : 0
  const credited = Math.floor(safeCoin / VAULT_EXCHANGE_RATE)
  return { ...vault, balance: vault.balance + credited }
}

/** THE single statement of what one odds boost costs and whether it is affordable. Item-specific
 *  reasons come before the currency check, the `refusalFor` discipline: an unknown template or a
 *  maxed stack stays the reason once currency arrives. */
export function oddsBoostRefusalFor(
  vault: VaultState,
  templateId: string,
): VaultSpendRefusal | null {
  if (templateById(templateId) === undefined) {
    return VaultSpendRefusal.UnknownTemplate
  }
  const stacks = vault.oddsBoosts[templateId] ?? 0
  if (stacks >= VAULT_ODDS_BOOST_MAX_STACKS) {
    return VaultSpendRefusal.BoostMaxed
  }
  if (vault.balance < VAULT_ODDS_BOOST_PRICE) {
    return VaultSpendRefusal.NotEnoughCurrency
  }
  return null
}

/** THE single statement of what one starting-tier grant costs and whether it is affordable. */
export function startingTierRefusalFor(
  vault: VaultState,
  templateId: string,
  tier: BuffTier,
): VaultSpendRefusal | null {
  if (templateById(templateId) === undefined) {
    return VaultSpendRefusal.UnknownTemplate
  }
  if (vault.balance < VAULT_STARTING_TIER_PRICE[tier]) {
    return VaultSpendRefusal.NotEnoughCurrency
  }
  return null
}

/** AC2 — one permanent stack on `templateId`. THROWS `RangeError` on a refused purchase, the
 *  `buyFromShop` discipline: `oddsBoostRefusalFor` is the caller's guard. */
export function buyOddsBoost(vault: VaultState, templateId: string): VaultState {
  const refusal = oddsBoostRefusalFor(vault, templateId)
  if (refusal !== null) {
    throw new RangeError(`Cannot buy an odds boost on ${templateId} — ${refusal}`)
  }
  const stacks = vault.oddsBoosts[templateId] ?? 0
  return {
    ...vault,
    balance: vault.balance - VAULT_ODDS_BOOST_PRICE,
    oddsBoosts: { ...vault.oddsBoosts, [templateId]: stacks + 1 },
  }
}

/** AC3 — one one-shot grant queued at `tier`. Throws on a refused purchase, as above. */
export function buyStartingTier(vault: VaultState, templateId: string, tier: BuffTier): VaultState {
  const refusal = startingTierRefusalFor(vault, templateId, tier)
  if (refusal !== null) {
    throw new RangeError(`Cannot buy a ${tier} starting card of ${templateId} — ${refusal}`)
  }
  return {
    ...vault,
    balance: vault.balance - VAULT_STARTING_TIER_PRICE[tier],
    startingGrants: [...vault.startingGrants, { templateId, tier }],
  }
}

/** Consumed at run start — the returned vault has an empty `startingGrants`, balance and
 *  `oddsBoosts` untouched. */
export function clearStartingGrants(vault: VaultState): VaultState {
  return { ...vault, startingGrants: [] }
}
