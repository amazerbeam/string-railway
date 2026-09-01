/**
 * DLR-130 — formats a `SimSummary` into the plain-text report `npm run sim` prints. Returns the
 * whole string and PRINTS NOTHING — that is what makes it testable and what keeps `console.log`
 * out of shipped code; the CLI is the only writer, through `process.stdout.write`.
 *
 * Every division guards its divisor and reports `n/a` on an empty sample rather than emitting
 * `NaN`. Percentiles read a SORTED array by index — no interpolation.
 */
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
