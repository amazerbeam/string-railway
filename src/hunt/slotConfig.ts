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
 *  exactly as `SHOP_ITEMS` already does for the shop catalogue. */
export const SLOT_MACHINE_IDS: readonly SlotMachineId[] = [
  SlotMachineId.Skirmisher,
  SlotMachineId.Strongbox,
]

/** UNIT: reels per pull. AC2's match rules are stated over exactly three. Implied by AC2, not
 *  chosen here. */
export const REEL_COUNT = 3

/** AC3, transcribed. UNIT: distinct buff templates on one machine's reel strip. */
export const REEL_POOL_SIZE = 8

/** AC5, transcribed. UNIT: pulls per shop visit that cost nothing. */
export const SLOT_FREE_PULLS_PER_VISIT = 1

/** AC5, transcribed. UNIT: coins per pull beyond the free one. */
export const SLOT_REROLL_PRICE: Coins = 1
