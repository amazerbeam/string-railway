/**
 * THE policy registry — what `--policy <name>` selects.
 *
 * A module of its own, and not a `const` at the bottom of `baselinePolicy.ts`, because a registry
 * must import every policy while `cardAwarePolicy` imports `baselinePolicy` back (it reuses that
 * policy's shop method BY REFERENCE, so its figures stay attributable to card and buff play
 * alone). With the registry living in `baselinePolicy.ts` those two files formed an import cycle,
 * and the loser of the cycle read `undefined` at module-init time — which surfaced as
 * `Cannot read properties of undefined (reading 'nextShopAction')` in five test files at once,
 * not as a type error. One leaf module importing both breaks it permanently.
 *
 * Keys and `policy.name` must agree; `policies.test.ts` pins that.
 */
import {
  baselinePolicy,
  maximalistPolicy,
  noBuffsPolicy,
  rerollFocusedPolicy,
} from './baselinePolicy'
import { cardAwarePolicy } from './cardAwarePolicy'
import type { SimPolicy } from './types'

export const POLICIES: Readonly<Record<string, SimPolicy>> = {
  baseline: baselinePolicy,
  maximalist: maximalistPolicy,
  noBuffs: noBuffsPolicy,
  rerollFocused: rerollFocusedPolicy,
  cardAware: cardAwarePolicy,
}
