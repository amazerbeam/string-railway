import type { BuffTemplate } from '../hunt/buffTemplates'
import { drawReelPool, type SlotMachine } from '../hunt/slotMachine'
import type { SlotMachineId } from '../hunt/slotConfig'
import { templateWeightFor } from '../hunt/slotWeights'
import type { Rng } from '../hunt/seededRng'
import { VAULT_ODDS_BOOST_MAX_STACKS, VAULT_ODDS_BOOST_STEP } from './vaultConfig'
import type { VaultState } from './vaultState'

/**
 * DLR-113 — AC2's odds boost, composed into `slotMachine.ts` → `drawReelPool`'s defaulted
 * `weightOf` parameter, which DLR-112 built expressly for this seam. Calls no random source of
 * its own — `rng` is passed straight through to `drawReelPool`, so `src/vault/` stays as
 * `Math.random()`-free as `src/hunt/`.
 */

/** `1 + VAULT_ODDS_BOOST_STEP * stacks`, clamped at `VAULT_ODDS_BOOST_MAX_STACKS`. `1` — no
 *  change — for an unboosted OR unknown template id, so a stale boost cannot poison a draw. */
export function boostMultiplierFor(vault: VaultState, templateId: string): number {
  const stacks = Math.min(vault.oddsBoosts[templateId] ?? 0, VAULT_ODDS_BOOST_MAX_STACKS)
  return 1 + VAULT_ODDS_BOOST_STEP * stacks
}

/**
 * AC2 — the weight function `drawReelPool` already accepts as its defaulted third parameter.
 * MULTIPLIES `templateWeightFor`'s result rather than replacing it, because replacement would
 * erase the per-family normalisation `slotWeights.ts` documents — a family's share of a strip
 * stays its stated weight, not its template count.
 */
export function vaultReelWeightFor(
  vault: VaultState,
  machineId: SlotMachineId,
): (template: BuffTemplate) => number {
  return (template) =>
    templateWeightFor(machineId, template) * boostMultiplierFor(vault, template.id)
}

/** The one call a future slot screen makes. Takes `rng` explicitly — no `Math.random()`. */
export function drawVaultReelPool(
  vault: VaultState,
  machineId: SlotMachineId,
  rng: Rng,
): SlotMachine {
  return drawReelPool(machineId, rng, vaultReelWeightFor(vault, machineId))
}
