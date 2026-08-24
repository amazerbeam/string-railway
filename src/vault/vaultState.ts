import { templateById, type TemplateGrant } from '../hunt/buffTemplates'
import { BuffTier } from '../hunt/buffs'
import { VAULT_ODDS_BOOST_MAX_STACKS } from './vaultConfig'

/** One bought starting card. NOT a `Buff`: the minimal pair `mintFromTemplate` needs, so no
 *  domain type is ever on disk and `Buff` stays free to widen. Declared in `src/hunt/`, since hunt
 *  owns how a template becomes a card — re-exported here for `src/vault/`'s consumers. */
export type { TemplateGrant } from '../hunt/buffTemplates'

/**
 * DLR-113 — THE persisted shape AND the in-memory shape, deliberately one type rather than a DTO
 * pair. Every field this ticket adds is a persisted field from the moment it exists; see
 * `plan.md` → Assumptions for why that cost is accepted.
 */
export interface VaultState {
  /** UNIT: Vault currency. Non-negative safe integer. */
  readonly balance: number
  /** `BuffTemplate.id` -> stacks bought, 1..VAULT_ODDS_BOOST_MAX_STACKS. Permanent. */
  readonly oddsBoosts: Readonly<Record<string, number>>
  /** Bought-but-unclaimed starting cards. CONSUMED at the next run start. */
  readonly startingGrants: readonly TemplateGrant[]
}

export const EMPTY_VAULT: VaultState = {
  balance: 0,
  oddsBoosts: {},
  startingGrants: [],
}

const BUFF_TIER_VALUES: ReadonlySet<string> = new Set(Object.values(BuffTier))

/** Keys that could reach an object's prototype through a boost lookup. Skipped rather than
 *  rejected outright, so a hand-edited save with a stray `__proto__` key still loads the rest of
 *  its (otherwise valid) boosts instead of failing the whole payload over one poisoned key. */
const UNSAFE_RECORD_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype'])

function isPositiveSafeInteger(candidate: unknown): candidate is number {
  return typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate >= 1
}

function isNonNegativeSafeInteger(candidate: unknown): candidate is number {
  return typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate >= 0
}

/** Reads a boost record's OWN enumerable string keys only, via `Object.entries` — never a
 *  `for...in` or a direct property read — so a poisoned `__proto__`/`constructor`/`prototype` key
 *  cannot reach an object's prototype through this lookup. */
function isValidOddsBoosts(candidate: unknown): candidate is Readonly<Record<string, number>> {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return false
  for (const [key, stack] of Object.entries(candidate)) {
    if (UNSAFE_RECORD_KEYS.has(key)) continue
    if (!isPositiveSafeInteger(stack)) return false
  }
  return true
}

function isValidTemplateGrant(candidate: unknown): candidate is TemplateGrant {
  if (typeof candidate !== 'object' || candidate === null) return false
  const grant = candidate as { templateId?: unknown; tier?: unknown }
  return typeof grant.templateId === 'string' && BUFF_TIER_VALUES.has(grant.tier as string)
}

function isValidStartingGrants(candidate: unknown): candidate is readonly TemplateGrant[] {
  return Array.isArray(candidate) && candidate.every(isValidTemplateGrant)
}

/**
 * SHAPE guard — mandatory per `.claude/rules/save-data-versioning.md` reject condition 5. Accepts
 * or rejects the WHOLE payload; never partially. Uses local `as { … }` property probes only, the
 * same discipline `saveStore.ts`'s own `isSaveEnvelope` uses — no `as VaultState` cast anywhere.
 */
export function isValidVaultState(candidate: unknown): candidate is VaultState {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return false
  const vault = candidate as { balance?: unknown; oddsBoosts?: unknown; startingGrants?: unknown }
  return (
    isNonNegativeSafeInteger(vault.balance) &&
    isValidOddsBoosts(vault.oddsBoosts) &&
    isValidStartingGrants(vault.startingGrants)
  )
}

export interface VaultReconciliation {
  readonly vault: VaultState
  /** Boost + grant entries dropped because their templateId is gone from BUFF_TEMPLATES. Does NOT
   *  count a stack clamped down to the cap — that entry survives, just smaller. */
  readonly droppedCount: number
}

/**
 * DOMAIN pass over an already shape-valid payload: resolves each `templateId` through
 * `templateById`, drops what does not resolve, clamps stacks to `VAULT_ODDS_BOOST_MAX_STACKS`.
 * Never throws — a stale save is not a programming error.
 */
export function reconcileVault(candidate: VaultState): VaultReconciliation {
  let dropped = 0

  const oddsBoosts: Record<string, number> = {}
  for (const [templateId, stack] of Object.entries(candidate.oddsBoosts)) {
    if (templateById(templateId) === undefined) {
      dropped += 1
      continue
    }
    oddsBoosts[templateId] = Math.min(stack, VAULT_ODDS_BOOST_MAX_STACKS)
  }

  const startingGrants: TemplateGrant[] = []
  for (const grant of candidate.startingGrants) {
    if (templateById(grant.templateId) === undefined) {
      dropped += 1
      continue
    }
    startingGrants.push(grant)
  }

  return {
    vault: { balance: candidate.balance, oddsBoosts, startingGrants },
    droppedCount: dropped,
  }
}
