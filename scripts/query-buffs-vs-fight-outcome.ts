/**
 * Disposable play-tester query. Controls for the run-length confound the earlier "furthest" query
 * could not: compares buff kinds WITHIN one fixed fight index (default 0 = Aoife, every run
 * attempts it exactly once), won vs lost, rather than across runs of different lengths. Uses
 * `fired` (buffFireOutcomes, fired: true) — a buff that actually paid off, not merely activated —
 * as "this buff contributed something in this fight."
 *
 * Run with: npx vite-node scripts/query-buffs-vs-fight-outcome.ts -- --runs 1000 --seed 1 --policy baseline --fight 0
 */
import { simulate, POLICIES, RunEnding, type RunReport, type HandReport } from '../src/sim'

function parseArgs(argv: readonly string[]) {
  let runs = 1000
  let baseSeed = 1
  let policyName = 'baseline'
  let fightIndex = 0
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--runs') runs = Number(argv[++i])
    else if (argv[i] === '--seed') baseSeed = Number(argv[++i])
    else if (argv[i] === '--policy') policyName = argv[++i]
    else if (argv[i] === '--fight') fightIndex = Number(argv[++i])
  }
  return { runs, baseSeed, policyName, fightIndex }
}

const { runs, baseSeed, policyName, fightIndex } = parseArgs(process.argv.slice(2))
const policy = POLICIES[policyName]
if (policy === undefined) {
  process.stdout.write(`Unknown policy '${policyName}'. Known: ${Object.keys(POLICIES).join(', ')}\n`)
  process.exit(1)
}

const summary = simulate({ runs, baseSeed }, policy)

function fightGroups(hands: readonly HandReport[]): HandReport[][] {
  const groups: HandReport[][] = []
  for (const hand of hands) {
    if (hand.handOfFight === 1) groups.push([])
    groups[groups.length - 1]?.push(hand)
  }
  return groups
}

let won = 0
let lost = 0
const firedWhenWon = new Map<string, number>()
const firedWhenLost = new Map<string, number>()

for (const run of summary.runs as readonly RunReport[]) {
  const groups = fightGroups(run.hands)
  const group = groups[fightIndex]
  if (group === undefined) continue // this run never reached that fight

  const isLastGroup = fightIndex === groups.length - 1
  const outcome: 'won' | 'lost' | 'exclude' =
    fightIndex < run.fightsWon
      ? 'won'
      : isLastGroup && run.ending === RunEnding.Lost
        ? 'lost'
        : 'exclude'
  if (outcome === 'exclude') continue

  const kindsFired = new Set(
    group.flatMap((hand) => hand.buffFireOutcomes.filter((o) => o.fired).map((o) => o.kind)),
  )
  if (outcome === 'won') won += 1
  else lost += 1
  for (const kind of kindsFired) {
    const bucket = outcome === 'won' ? firedWhenWon : firedWhenLost
    bucket.set(kind, (bucket.get(kind) ?? 0) + 1)
  }
}

process.stdout.write(
  `Fight index ${fightIndex} — policy: ${policyName}, base seed: ${baseSeed}, runs: ${runs}\n`,
)
process.stdout.write(`Sample: ${won} won this fight, ${lost} lost this fight\n\n`)

const allKinds = new Set([...firedWhenWon.keys(), ...firedWhenLost.keys()])
const rows = [...allKinds].map((kind) => {
  const wonRate = won === 0 ? 0 : (firedWhenWon.get(kind) ?? 0) / won
  const lostRate = lost === 0 ? 0 : (firedWhenLost.get(kind) ?? 0) / lost
  return { kind, wonRate, lostRate, diff: wonRate - lostRate }
})
rows.sort((a, b) => b.diff - a.diff)

for (const r of rows) {
  process.stdout.write(
    `  ${r.kind.padEnd(16)} fired-when-won: ${(r.wonRate * 100).toFixed(1).padStart(5)}%   fired-when-lost: ${(r.lostRate * 100).toFixed(1).padStart(5)}%   diff: ${(r.diff * 100).toFixed(1).padStart(5)}pp\n`,
  )
}
