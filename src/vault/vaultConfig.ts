import { BuffTier } from '../hunt/buffs'

/**
 * DLR-113 — every tunable number the Vault owns. Named and documented in the
 * `UNIT:` / register style `src/hunt/slotConfig.ts` and `src/hunt/config.ts` already use,
 * so no rate, price, cap, or step ever appears as a bare literal in `src/vault/` logic.
 */

/** UNIT: leftover coin per 1 Vault currency. TRANSCRIBED from DLR-113 AC1, not chosen. */
export const VAULT_EXCHANGE_RATE = 10

/** UNIT: Vault currency per odds-boost stack. AGENT-CHOSEN. */
export const VAULT_ODDS_BOOST_PRICE = 1

/** UNIT: stacks. AGENT-CHOSEN cap — the anti-determinism guard on the reel: without a cap, a
 *  boosted template's weight could be driven arbitrarily high and the fantasy of a posted strip
 *  whose odds are actually readable (`slotMachine.ts`) would collapse into a near-certainty. */
export const VAULT_ODDS_BOOST_MAX_STACKS = 3

/** UNIT: additive multiplier per stack; weight x (1 + STEP * stacks). AGENT-CHOSEN. */
export const VAULT_ODDS_BOOST_STEP = 1

/** UNIT: Vault currency per starting-tier grant, per tier. AGENT-CHOSEN — DERIVED from
 *  `REWARD_TIER_VALUE[BuffRewardAxis.Coins]`'s 2/5/10 ladder (`src/hunt/buffTemplates.ts`), so the
 *  Vault charges the same bronze:silver:gold ratio the game already states a tier is worth,
 *  rather than an independently invented price. */
export const VAULT_STARTING_TIER_PRICE: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 2,
  [BuffTier.Silver]: 5,
  [BuffTier.Gold]: 10,
}
