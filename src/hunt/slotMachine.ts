import { BuffTier, type Buff, type BuffId } from './buffs'
import { BUFF_TEMPLATES, mintFromTemplate, type BuffTemplate } from './buffTemplates'
import {
  REEL_COUNT,
  REEL_POOL_SIZE,
  SLOT_FREE_PULLS_PER_VISIT,
  SLOT_MACHINE_IDS,
  SLOT_REROLL_PRICE,
  SlotMachineId,
} from './slotConfig'
import { templateWeightFor, weightedDrawWithoutReplacement } from './slotWeights'
import { mixSeed, type Rng } from './seededRng'
import type { Coins } from './types'

/**
 * DLR-112 — the slot machine itself: drawing a machine's reel strip, spinning it, resolving AC2's
 * match pattern into awards, and the pull-cost rule (AC5).
 *
 * The strip is ONE set of `REEL_POOL_SIZE` templates shared by all three reels — the only
 * construction under which a match can occur at all. It is drawn WITHOUT replacement (AC3 says
 * *distinct*), while a spin picks WITH replacement (a match is impossible otherwise). The spin is
 * FLAT UNIFORM over the strip — all weighting is spent choosing which `REEL_POOL_SIZE` templates
 * make the strip, so a player can read their own odds off the posted strip; a hidden per-symbol
 * weight cannot be read, and a slot machine whose posted strip lies about its odds is the one
 * thing the fantasy cannot survive. A paid reroll re-spins the SAME strip; it does not redraw the
 * `REEL_POOL_SIZE` symbols (`plan.md` → Assumptions).
 *
 * Nothing here calls `Math.random()` — every randomness consumer takes `rng: Rng` explicitly.
 */

/** One machine's reel strip — `REEL_POOL_SIZE` DISTINCT templates, shared by all three reels. */
export interface SlotMachine {
  readonly id: SlotMachineId
  readonly reel: readonly BuffTemplate[]
}

/** AC2's three match patterns. A CODE, not copy — `src/hunt/` holds no user-facing strings. */
export const SlotOutcome = {
  AllDifferent: 'allDifferent',
  TwoMatch: 'twoMatch',
  ThreeMatch: 'threeMatch',
} as const
export type SlotOutcome = (typeof SlotOutcome)[keyof typeof SlotOutcome]

/** One card won: which template, at which tier. */
export interface SlotAward {
  readonly template: BuffTemplate
  readonly tier: BuffTier
}

export interface SlotPull {
  readonly symbols: readonly BuffTemplate[] // length REEL_COUNT
  readonly outcome: SlotOutcome
  readonly awards: readonly SlotAward[]
}

/** Why a pull cannot be made. A reason CODE — `src/hunt/shop.ts`'s `PurchaseRefusal` discipline. */
export const SlotPullRefusal = { NotEnoughCoins: 'notEnoughCoins' } as const
export type SlotPullRefusal = (typeof SlotPullRefusal)[keyof typeof SlotPullRefusal]

/** Everything the pull-cost rule needs and nothing else — PLAIN VALUES, never `RunState`.
 *  The discipline `ShopStock` / `BuffActivationStock` already set. */
export interface SlotVisitStock {
  readonly coins: Coins
  readonly pullsThisVisit: number
}

/** A strip is a pure function of the seed — recomputed, never stored. Folds the machine's index
 *  in `SLOT_MACHINE_IDS` (not the id string itself) and the visit index through `mixSeed`, so two
 *  machines and two visits never collide. */
export function slotSeedFor(runSeed: number, machineId: SlotMachineId, visitIndex: number): number {
  const machineIndex = SLOT_MACHINE_IDS.indexOf(machineId)
  return mixSeed(runSeed, machineIndex, visitIndex)
}

/** DLR-116 — the seed for pull number `pullIndex` on an ALREADY-DRAWN strip. Folds the pull index
 *  into the strip's own seed, so a paid reroll re-spins the SAME strip rather than redrawing it —
 *  the rule `drawReelPool`'s own comment states. Pure; no `Math.random()`. */
export function spinSeedFor(stripSeed: number, pullIndex: number): number {
  return mixSeed(stripSeed, pullIndex)
}

/**
 * AC1/AC3 — draws `REEL_POOL_SIZE` distinct templates onto one machine's strip, weighted by that
 * machine's family and axis tables.
 *
 * THROWS `RangeError` on a short strip rather than returning one. `weightedDrawWithoutReplacement`
 * legitimately returns fewer than asked when the candidates or the positive weight run out, and
 * that contract is right for a draw — but a MACHINE with fewer than `REEL_POOL_SIZE` symbols is a
 * configuration bug, not a legal state, and it fails far from here: an empty strip would make
 * `spinReels` index `reel[-1]`, hand `resolvePull` three `undefined`s, and surface as an opaque
 * `TypeError` on `symbol.id` instead of naming the real cause. Unreachable with either shipped
 * weight table — every family and axis is weighted >= 1 — but `SLOT_FAMILY_WEIGHTS` is explicitly
 * a table the developer is invited to retune, and zeroing one out is a single edit away. This
 * guard is what makes that edit fail loudly at the machine it broke.
 *
 * `weightOf` is a DEFAULTED parameter rather than a value this function closes over, for the reason
 * `assignSkulls` already states about its own `density` and `weights`: a curve can then be tested
 * without mutating module state. It is also the injection point DLR-113's Vault-driven odds
 * adjustment needs — that ticket changes which templates are likely, not how a strip is drawn.
 */
export function drawReelPool(
  machineId: SlotMachineId,
  rng: Rng,
  weightOf: (template: BuffTemplate) => number = (template) =>
    templateWeightFor(machineId, template),
): SlotMachine {
  const reel = weightedDrawWithoutReplacement(BUFF_TEMPLATES, weightOf, rng, REEL_POOL_SIZE)
  if (reel.length !== REEL_POOL_SIZE) {
    throw new RangeError(
      `Machine ${machineId} drew ${reel.length} of ${REEL_POOL_SIZE} reel symbols — check its SLOT_FAMILY_WEIGHTS and SLOT_AXIS_WEIGHTS rows for an all-zero table`,
    )
  }
  return { id: machineId, reel }
}

/** `REEL_COUNT` uniform picks WITH replacement — matches are impossible without replacement. The
 *  strip is guaranteed non-empty by `drawReelPool`'s short-strip throw, which is why this indexes
 *  without a length guard of its own. */
export function spinReels(machine: SlotMachine, rng: Rng): readonly BuffTemplate[] {
  return Array.from({ length: REEL_COUNT }, () => {
    const index = Math.min(Math.floor(rng() * machine.reel.length), machine.reel.length - 1)
    return machine.reel[index]
  })
}

/** AC2, the whole rule, stated once: three different reels pay three bronze; two matched reels
 *  pay one silver (on the matched template) plus one bronze (on the odd one); three matched reels
 *  pay one gold. Throws `RangeError` on a symbol array whose length is not `REEL_COUNT` rather
 *  than inventing a fourth outcome — a two-reel or four-reel array has no defined match rule. */
export function resolvePull(symbols: readonly BuffTemplate[]): SlotPull {
  if (symbols.length !== REEL_COUNT) {
    throw new RangeError(
      `resolvePull expects exactly REEL_COUNT (${REEL_COUNT}) symbols, got ${symbols.length}`,
    )
  }

  const byId = new Map<string, { readonly template: BuffTemplate; count: number }>()
  for (const symbol of symbols) {
    const existing = byId.get(symbol.id)
    if (existing) {
      existing.count += 1
    } else {
      byId.set(symbol.id, { template: symbol, count: 1 })
    }
  }

  if (byId.size === 1) {
    return {
      symbols,
      outcome: SlotOutcome.ThreeMatch,
      awards: [{ template: symbols[0], tier: BuffTier.Gold }],
    }
  }

  if (byId.size === 2) {
    const entries = [...byId.values()]
    const matched = entries.find((entry) => entry.count === 2)!
    const odd = entries.find((entry) => entry.count === 1)!
    return {
      symbols,
      outcome: SlotOutcome.TwoMatch,
      awards: [
        { template: matched.template, tier: BuffTier.Silver },
        { template: odd.template, tier: BuffTier.Bronze },
      ],
    }
  }

  return {
    symbols,
    outcome: SlotOutcome.AllDifferent,
    awards: symbols.map((template) => ({ template, tier: BuffTier.Bronze })),
  }
}

/** One spin over one machine, resolved. */
export function pullMachine(machine: SlotMachine, rng: Rng): SlotPull {
  return resolvePull(spinReels(machine, rng))
}

/** Ordinary `Buff` objects with consecutive ids from `firstId`, the `grantCheats` shape. */
export function mintPullAwards(pull: SlotPull, firstId: BuffId): readonly Buff[] {
  return pull.awards.map((award, index) =>
    mintFromTemplate(award.template, award.tier, firstId + index),
  )
}

/** AC5: free while `pullsThisVisit < SLOT_FREE_PULLS_PER_VISIT`, else `SLOT_REROLL_PRICE`. */
export function pullPriceFor(pullsThisVisit: number): Coins {
  return pullsThisVisit < SLOT_FREE_PULLS_PER_VISIT ? 0 : SLOT_REROLL_PRICE
}

/** THE single statement of whether a pull is available — read by a guard and by a screen. A
 *  non-finite balance refuses rather than passing the comparison, the `refusalFor` discipline. */
export function slotPullRefusalFor(stock: SlotVisitStock): SlotPullRefusal | null {
  const price = pullPriceFor(stock.pullsThisVisit)
  if (price > 0 && (!Number.isFinite(stock.coins) || stock.coins < price)) {
    return SlotPullRefusal.NotEnoughCoins
  }
  return null
}
