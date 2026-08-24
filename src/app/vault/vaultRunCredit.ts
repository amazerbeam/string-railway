import { RunOutcome, type Coins } from '../../hunt'
import { EMPTY_VAULT, depositLeftoverCoin } from '../../vault'

/**
 * DLR-118 — what THIS run paid into the Vault, for display only.
 *
 * The rule DLR-113 settled: leftover coin converts at the single place a run's outcome is
 * decided, and ONLY on a loss — a win is its own reward. `App.tsx`'s `handleComplete` is the one
 * place that actually commits it; this function re-derives the same figure for the screen,
 * which is sound precisely because `run.coins` is deliberately NOT zeroed.
 *
 * It calls `depositLeftoverCoin` against `EMPTY_VAULT` rather than dividing by
 * `VAULT_EXCHANGE_RATE` itself. That is load-bearing: the rate, the floor, and the
 * finite/negative guards are stated ONCE, in `src/vault/`, and a second division here would be a
 * second source of truth free to drift from the number actually banked.
 */
export function creditedFromRun(outcome: RunOutcome, coins: Coins): number {
  if (outcome !== RunOutcome.Lost) return 0
  return depositLeftoverCoin(EMPTY_VAULT, coins).balance
}
