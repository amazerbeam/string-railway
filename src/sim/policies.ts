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
import { rollTargetPolicies } from './rollOverPolicy'
import {
  survivalistPolicy,
  survivalistBaselinePolicy,
  sharpshooterPolicy,
} from './survivalistPolicy'
import {
  skilledPolicy,
  skilledNoSwapPolicy,
  skilledNoCheatPolicy,
  skilledNaiveCardsPolicy,
  skilledWithTimebombPolicy,
  sharpshooterNoTimebombPolicy,
  skilledCardsFirstPolicy,
  skilledCombinePolicy,
  skilledCardsCombinePolicy,
  skilledUnaimedPolicy,
  skilledCeilingPacedPolicy,
} from './skilledPolicy'
import type { SimPolicy } from './types'

export const POLICIES: Readonly<Record<string, SimPolicy>> = {
  baseline: baselinePolicy,
  maximalist: maximalistPolicy,
  noBuffs: noBuffsPolicy,
  rerollFocused: rerollFocusedPolicy,
  cardAware: cardAwarePolicy,
  // play-tester (2026-09-02) — `cardAwareRoll1` .. `cardAwareRoll8`, one per `ROLL_TARGET_SWEEP`
  // entry. `cardAwarePolicy` verbatim except for `wantsApplyPot`, so the sweep isolates the
  // roll-over bet — the mechanic no policy had ever exercised before this. `cardAwareRoll1` is
  // `cardAware`'s own never-push behaviour restated as a policy, so it sits on the same axis.
  ...rollTargetPolicies(cardAwarePolicy, 'cardAware'),
  // The same sweep over the reroll-focused shop rule, so "does the push need a bigger card supply"
  // is answerable without confounding it with the baseline's near-empty pile.
  ...rollTargetPolicies(rerollFocusedPolicy, 'reroll'),
  survivalist: survivalistPolicy,
  survivalistBaseline: survivalistBaselinePolicy,
  // The sweep again over the shop rule that spends on the actual constraint — see
  // `survivalistPolicy.ts` for why neither pre-existing rule could answer the balance question.
  ...rollTargetPolicies(survivalistPolicy, 'survivalist'),
  sharpshooter: sharpshooterPolicy,
  // The best-measured combination: buy cards with everything left after topping the bar to full.
  ...rollTargetPolicies(sharpshooterPolicy, 'sharpshooter'),
  // The strategy assembled from the rules rather than from one lever — see
  // `.docs/ai-play-tester/strategy-guide.md`. It brings its own stopping rule, so it is NOT in the
  // roll sweep: a fixed target would overwrite the arithmetic that is half the point of it.
  skilled: skilledPolicy,
  // The same card, cheat, swap and buff play under a FIXED stopping rule, so the push can be
  // isolated from the play: `skilledRoll1` never pushes, and the sweep climbs from there.
  ...rollTargetPolicies(skilledPolicy, 'skilled'),
  skilledNoSwap: skilledNoSwapPolicy,
  skilledNoCheat: skilledNoCheatPolicy,
  skilledNaiveCards: skilledNaiveCardsPolicy,
  skilledWithTimebomb: skilledWithTimebombPolicy,
  sharpshooterNoTimebomb: sharpshooterNoTimebombPolicy,
  skilledCardsFirst: skilledCardsFirstPolicy,
  skilledCombine: skilledCombinePolicy,
  skilledCardsCombine: skilledCardsCombinePolicy,
  skilledUnaimed: skilledUnaimedPolicy,
  skilledCeilingPaced: skilledCeilingPacedPolicy,
}
