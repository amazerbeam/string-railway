/**
 * DLR-130 — formats a `SimSummary` into the plain-text report `npm run sim` prints. Returns the
 * whole string and PRINTS NOTHING — that is what makes it testable and what keeps `console.log`
 * out of shipped code; the CLI is the only writer, through `process.stdout.write`.
 *
 * Every division guards its divisor and reports `n/a` on an empty sample rather than emitting
 * `NaN`. Percentiles read a SORTED array by index — no interpolation.
 */
import type { ShopItem } from '../hunt'
import { RunEnding, type HandReport, type RunReport, type SimSummary } from './types'

function mean(values: readonly number[]): string {
  if (values.length === 0) return 'n/a'
  const total = values.reduce((sum, value) => sum + value, 0)
  return (total / values.length).toFixed(2)
}

function maxOf(values: readonly number[]): string {
  return values.length === 0 ? 'n/a' : Math.max(...values).toString()
}

/** Reads a SORTED array by index — no interpolation. `p` in `[0, 1]`. */
function percentile(sorted: readonly number[], p: number): string {
  if (sorted.length === 0) return 'n/a'
  const index = Math.min(sorted.length - 1, Math.floor(p * sorted.length))
  return sorted[index].toString()
}

function percent(numerator: number, denominator: number): string {
  return denominator === 0 ? 'n/a' : `${((numerator / denominator) * 100).toFixed(1)}%`
}

function allHands(runs: readonly RunReport[]): readonly HandReport[] {
  return runs.flatMap((run) => run.hands)
}

/** play-tester (2026-09-02) — `"heal 12.4, maxHealth 8.1"`, mean coins per run per item, biggest
 *  first. Only items actually bought appear, so an unshelved item reads as absent rather than as a
 *  zero somebody has to interpret. */
function coinsByItemLine(runs: readonly RunReport[]): string {
  const totals = new Map<ShopItem, number>()
  for (const run of runs) {
    for (const [item, coins] of Object.entries(run.coinsSpentByItem)) {
      const key = item as ShopItem
      totals.set(key, (totals.get(key) ?? 0) + coins)
    }
  }
  if (totals.size === 0 || runs.length === 0) return 'nothing bought'
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([item, coins]) => `${item} ${(coins / runs.length).toFixed(1)}`)
    .join(', ')
}

export function formatSummary(summary: SimSummary): string {
  const { runs } = summary
  const won = runs.filter((run) => run.ending === RunEnding.Won).length
  const lost = runs.filter((run) => run.ending === RunEnding.Lost).length
  const stalled = runs.filter((run) => run.ending === RunEnding.Stalled).length

  const fightsReached = runs.map((run) => run.fightReached)
  const fightsWon = runs.map((run) => run.fightsWon)
  const handsPerRun = runs.map((run) => run.hands.length)

  const hands = allHands(runs)
  const toQuarry = hands.map((hand) => hand.damageToQuarry).sort((a, b) => a - b)
  const toPlayer = hands.map((hand) => hand.damageToPlayer).sort((a, b) => a - b)
  const faults = hands.filter((hand) => hand.fault !== null)
  const totalDeadCardRefusals = runs.reduce((sum, run) => sum + run.deadCardRefusals, 0)

  const buffStarvedHands = hands.filter((hand) => hand.activatableBuffsHeld === 0).length
  const discardsPerRun = runs.map((run) =>
    run.hands.reduce((sum, hand) => sum + hand.discardsUsed, 0),
  )
  const cheatsPerRun = runs.map((run) => run.hands.reduce((sum, hand) => sum + hand.cheatsArmed, 0))

  const oc = hands.reduce(
    (sum, hand) => ({
      cleanWin: sum.cleanWin + hand.trickOutcomes.cleanWin,
      dodge: sum.dodge + hand.trickOutcomes.dodge,
      cleanLoss: sum.cleanLoss + hand.trickOutcomes.cleanLoss,
      skullWin: sum.skullWin + hand.trickOutcomes.skullWin,
      hurtLeading: sum.hurtLeading + hand.trickOutcomes.hurtLeading,
      hurtFollowing: sum.hurtFollowing + hand.trickOutcomes.hurtFollowing,
    }),
    { cleanWin: 0, dodge: 0, cleanLoss: 0, skullWin: 0, hurtLeading: 0, hurtFollowing: 0 },
  )
  const allTricks = oc.cleanWin + oc.dodge + oc.cleanLoss + oc.skullWin
  // A card is ACTIVATED for a trick and then its condition is checked when that trick resolves, so
  // "fired" and "paid" are different questions. Cheat and Timebomb carry no condition, so they can
  // never read as paid — they are excluded rather than counted as permanent failures.
  const conditionFires = hands.flatMap((hand) =>
    hand.buffFireOutcomes.filter(
      (outcome) => outcome.kind !== 'cheat' && outcome.kind !== 'timebomb',
    ),
  )
  const paidFires = conditionFires.filter((outcome) => outcome.fired).length
  const paidByKind = new Map<string, { fired: number; paid: number }>()
  for (const outcome of conditionFires) {
    const row = paidByKind.get(outcome.kind) ?? { fired: 0, paid: 0 }
    row.fired += 1
    if (outcome.fired) row.paid += 1
    paidByKind.set(outcome.kind, row)
  }
  const pots = hands.flatMap((hand) => hand.potsApplied).sort((a, b) => a - b)
  const potsPerHand = hands.map((hand) => hand.potsApplied.length)
  const finalRolls = hands.map((hand) => hand.streakOut.roll)
  // The Overlap Bonus pays `firedCount - 1`, so how many cards land on ONE trick is a different
  // and separately rewarded question from how many land in a hand. Grouped by (hand, trick).
  const stackSizes: number[] = []
  for (const hand of hands) {
    const perTrick = new Map<number, number>()
    for (const outcome of hand.buffFireOutcomes) {
      perTrick.set(outcome.trickOfHand, (perTrick.get(outcome.trickOfHand) ?? 0) + 1)
    }
    stackSizes.push(...perTrick.values())
  }
  stackSizes.sort((a, b) => a - b)

  const lines: string[] = [
    `Headless run simulator — policy: ${summary.policyName}, base seed: ${summary.baseSeed}, runs: ${runs.length}`,
    '',
    'Outcomes',
    `  won: ${won}  lost: ${lost}  stalled: ${stalled}  win rate: ${percent(won, runs.length)}`,
    '',
    'Fights',
    `  mean fight reached: ${mean(fightsReached)}  max fight reached: ${maxOf(fightsReached)}  mean fights won: ${mean(fightsWon)}`,
    '',
    'Hands',
    `  mean hands per encounter: ${mean(handsPerRun)}  max hands in one encounter: ${maxOf(handsPerRun)}`,
    '',
    'Damage per hand',
    `  to Quarry — mean: ${mean(toQuarry)}  median: ${percentile(toQuarry, 0.5)}  p90: ${percentile(toQuarry, 0.9)}  max: ${maxOf(toQuarry)}`,
    `  to player — mean: ${mean(toPlayer)}  median: ${percentile(toPlayer, 0.5)}  p90: ${percentile(toPlayer, 0.9)}  max: ${maxOf(toPlayer)}`,
    '',
    'Economy',
    `  mean coins earned: ${mean(runs.map((run) => run.coinsEarned))}  mean coins spent: ${mean(runs.map((run) => run.coinsSpent))}  mean slot pulls: ${mean(runs.map((run) => run.slotPulls))}  mean buffs owned at end: ${mean(runs.map((run) => run.buffsOwnedAtEnd))}`,
    '',
    `  mean coins on pulls: ${mean(runs.map((run) => run.coinsSpentOnPulls))}  mean coins per shelf item: ${coinsByItemLine(runs)}`,
    '',
    'Tricks',
    `  mean tricks per hand: ${mean(hands.map((hand) => hand.tricksPlayed))}  counted here: ${(allTricks / Math.max(1, hands.length)).toFixed(2)}`,
    `  banked ${percent(oc.cleanWin + oc.dodge, allTricks)} — clean wins ${oc.cleanWin}, dodges ${oc.dodge}`,
    `  hurt   ${percent(oc.cleanLoss + oc.skullWin, allTricks)} — clean losses ${oc.cleanLoss}, ate a skull ${oc.skullWin}`,
    `  hurt while leading: ${oc.hurtLeading}   while following: ${oc.hurtFollowing}`,
    '',
    'The Cheat',
    `  forced hurts (every legal card loses the outcome): ${hands.reduce((n, h) => n + h.cheatMoments.forced, 0)}`,
    `  …an off-suit card would have banked: ${hands.reduce((n, h) => n + h.cheatMoments.escapable, 0)}`,
    `  …and a Cheat was actually held: ${hands.reduce((n, h) => n + h.cheatMoments.held, 0)}`,
    `  …and it was spent: ${hands.reduce((n, h) => n + h.cheatMoments.taken, 0)}`,
    '',
    'Card supply',
    `  mean cards won from the machine: ${mean(runs.map((run) => run.buffsAcquired))}  mean cards left unspent at the end: ${mean(runs.map((run) => run.buffsOwnedAtEnd))}  mean combines: ${mean(runs.map((run) => run.combines))}`,
    `  condition cards fired that actually PAID: ${percent(paidFires, conditionFires.length)} of ${conditionFires.length}`,
    `  by card: ${[...paidByKind.entries()]
      .sort((a, b) => b[1].fired - a[1].fired)
      .map(([kind, row]) => `${kind} ${percent(row.paid, row.fired)}`)
      .join(', ')}`,
    `  cards fired on ONE trick — mean: ${mean(stackSizes)}  median: ${percentile(stackSizes, 0.5)}  p90: ${percentile(stackSizes, 0.9)}  max: ${maxOf(stackSizes)}`,
    '',
    'The pot',
    `  pots cashed per hand — mean: ${mean(potsPerHand)}`,
    `  pot size — mean: ${mean(pots)}  median: ${percentile(pots, 0.5)}  p90: ${percentile(pots, 0.9)}  max: ${maxOf(pots)}`,
    `  roll standing at the hand's end — mean: ${mean(finalRolls)}  max: ${maxOf(finalRolls)}`,
    '',
    'Buffs and AP',
    `  mean buff activations per hand: ${mean(hands.map((hand) => hand.buffsActivated))}  mean AP spent per hand: ${mean(hands.map((hand) => hand.apSpent))}  NoEffectYet refusals: ${totalDeadCardRefusals}`,
    `  hands played holding NO activatable buff: ${percent(buffStarvedHands, hands.length)}`,
    '',
    'Levers',
    `  mean discards per run: ${mean(discardsPerRun)}  mean Cheats armed per run: ${mean(cheatsPerRun)}`,
    '',
    'Faults',
  ]

  if (faults.length === 0) {
    lines.push('  none')
  } else {
    for (const hand of faults) {
      lines.push(`  hand of fight ${hand.handOfFight}: ${hand.fault}`)
    }
  }
  lines.push(`  stalled runs: ${stalled}`)

  return lines.join('\n')
}
