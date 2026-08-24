export {
  VAULT_EXCHANGE_RATE,
  VAULT_ODDS_BOOST_PRICE,
  VAULT_ODDS_BOOST_MAX_STACKS,
  VAULT_ODDS_BOOST_STEP,
  VAULT_STARTING_TIER_PRICE,
} from './vaultConfig'

export type { VaultState, VaultReconciliation, TemplateGrant } from './vaultState'
export { EMPTY_VAULT, isValidVaultState, reconcileVault } from './vaultState'

export {
  VaultSpendRefusal,
  depositLeftoverCoin,
  oddsBoostRefusalFor,
  startingTierRefusalFor,
  buyOddsBoost,
  buyStartingTier,
  clearStartingGrants,
} from './vaultEconomy'

export { boostMultiplierFor, vaultReelWeightFor, drawVaultReelPool } from './vaultOdds'

export type { VaultLoad } from './vaultStore'
export { VAULT_SAVE_SECTION, createVaultStore, loadVault, saveVault } from './vaultStore'
