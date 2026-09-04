import { REEL_COUNT, REEL_POOL_SIZE } from './slotConfig'
import { SlotOutcome } from './slotMachine'

/**
 * DLR-116 — the posted odds for a pull, DERIVED from `REEL_COUNT` / `REEL_POOL_SIZE` rather than
 * transcribed. Every figure a screen shows is computed here, at read time, so a retuned
 * `REEL_POOL_SIZE` (DLR-112's own module comment invites exactly that) cannot leave a screen
 * quoting a stale percentage — the same failure `shopLabels.ts` already guards against for prices.
 *
 * `resolvePull`'s match rule is stated over exactly `REEL_COUNT === 3` reels; no other reel count
 * has a defined outcome set, so every function here throws a `RangeError` naming `REEL_COUNT`
 * rather than guessing a distribution, mirroring `resolvePull`'s own guard in `slotMachine.ts`.
 */

function assertThreeReels(): void {
  if (REEL_COUNT !== 3) {
    throw new RangeError(
      `slotOdds is derived for REEL_COUNT === 3 only — resolvePull has no match rule for REEL_COUNT ${REEL_COUNT}`,
    )
  }
}

/**
 * The probability of each `SlotOutcome` on one pull. With `n = REEL_POOL_SIZE` distinct symbols on
 * the strip and `k = REEL_COUNT` uniform picks WITH replacement, over `n**k` equally likely
 * outcomes: all three reels the same symbol (`n` ways), exactly two reels matching (`3 * n *
 * (n - 1)` ways — choose the matched symbol, the odd one, and which of the three reels is odd), or
 * all three different (`n * (n - 1) * (n - 2)` ways). The three sum to 1 by construction.
 */
export function slotOutcomeOdds(): Readonly<Record<SlotOutcome, number>> {
  assertThreeReels()
  const n = REEL_POOL_SIZE
  const totalOutcomes = n ** REEL_COUNT
  return {
    [SlotOutcome.ThreeMatch]: n / totalOutcomes,
    [SlotOutcome.TwoMatch]: (3 * n * (n - 1)) / totalOutcomes,
    [SlotOutcome.AllDifferent]: (n * (n - 1) * (n - 2)) / totalOutcomes,
  }
}

/** How many cards each outcome pays — `resolvePull`'s `awards.length` for that shape, stated once
 *  so the odds line and the resolver can never quote different counts. */
export function awardCountFor(outcome: SlotOutcome): number {
  switch (outcome) {
    case SlotOutcome.ThreeMatch:
      return 1
    case SlotOutcome.TwoMatch:
      return 2
    case SlotOutcome.AllDifferent:
      return 3
  }
}

/** Cards won per pull on average — the sum, over outcomes, of `P(outcome) * awardCountFor(outcome)`. */
export function expectedCardsPerPull(): number {
  const odds = slotOutcomeOdds()
  return (Object.keys(odds) as SlotOutcome[]).reduce(
    (total, outcome) => total + odds[outcome] * awardCountFor(outcome),
    0,
  )
}
