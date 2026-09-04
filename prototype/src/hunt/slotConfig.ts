import type { Coins } from './types'

/**
 * DLR-112 — machine identities and the four slot tunables. Deliberately NOT `src/hunt/config.ts`,
 * which stands at 374 of its 400-line blocking budget; this is the split `apConfig.ts` and
 * `skullWeights.ts` already made for the same reason. No existing importer of `config.ts` changes.
 */

export const SlotMachineId = {
  Skirmisher: 'skirmisher',
  Strongbox: 'strongbox',
} as const
export type SlotMachineId = (typeof SlotMachineId)[keyof typeof SlotMachineId]

/** THE statement of the machine roster — a screen maps this, it never lists machines itself,
 *  exactly as `SHOP_ITEMS` already does for the shop catalogue.
 *
 *  STRONGBOX IS CUT (developer decision, 2026-09-01). It was the run-permanent machine: its lean
 *  was toward the Purse (coins) and Second Wind (action-point refund) reward axes, against
 *  Skirmisher's in-fight lean. DLR-145 cut both of those axes from the game, which removed the only
 *  thing that made it a different machine — `slotWeights.ts` says so in its own comment and leaves
 *  the replacement lean as a developer decision. Measured on the surviving tables the two machines
 *  landed within a point of each other on every family (Suit High 29.4% vs 28.6%, and an identical
 *  50/50 Blade–Momentum split), so choosing between them was a decision with no consequence.
 *
 *  Cut, NOT deleted, exactly as `buffTemplates.ts` treats its eight cut condition families:
 *  `SlotMachineId.Strongbox` keeps its member, and `SLOT_FAMILY_WEIGHTS` / `SLOT_AXIS_WEIGHTS` keep
 *  their Strongbox rows. Removing it from THIS list is what makes it unreachable, because
 *  everything downstream maps this array — which also means the Vault's per-machine storage keys
 *  and `slotSeedFor`'s machine index are untouched (Skirmisher stays index 0, so every existing
 *  seed still resolves to the same strip). Restoring it is a row here plus a chosen lean. */
export const SLOT_MACHINE_IDS: readonly SlotMachineId[] = [SlotMachineId.Skirmisher]

/** UNIT: reels per pull. AC2's match rules are stated over exactly three. Implied by AC2, not
 *  chosen here. */
export const REEL_COUNT = 3

/** AC3, transcribed. UNIT: distinct buff templates on one machine's reel strip. */
export const REEL_POOL_SIZE = 8

/** AC5, transcribed. UNIT: pulls per shop visit that cost nothing. */
export const SLOT_FREE_PULLS_PER_VISIT = 1

/** AC5, transcribed. UNIT: coins per pull beyond the free one. */
export const SLOT_REROLL_PRICE: Coins = 1
