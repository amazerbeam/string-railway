/**
 * Disposable play-tester query. Answers: "which buffs get the player furthest" — mean fightReached
 * and win rate for runs where a buff KIND was ever activated at least once, vs. runs where it
 * never was, across the whole run (not just hand 1). A correlational read, not causal proof: a
 * kind correlated with going further may simply be one the pile hands out more often in runs that
 * were already going well.
 *
 * Run with: npx vite-node scripts/query-furthest.ts -- --runs 500 --seed 1 --policy baseline
 */
import { simulate, POLICIES, RunEnding } from '../src/sim'

function parseArgs(argv: readonly string[]) {
  let runs = 500
  let baseSeed = 1
  let policyName = 'baseline'
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--runs') runs = Number(argv[++i])
    else if (argv[i] === '--seed') baseSeed = Number(argv[++i])
    else if (argv[i] === '--policy') policyName = argv[++i]
  }
  return { runs, baseSeed, policyName }
}

const { runs, baseSeed, policyName } = parseArgs(process.argv.slice(2))
const policy = POLICIES[policyName]
if (policy === undefined) {
  process.stdout.write(`Unknown policy '${policyName}'. Known: ${Object.keys(POLICIES).join(', ')}\n`)
  process.exit(1)
}

const summary = simulate({ runs, baseSeed }, policy)

const withKind = new Map<string, { fightReached: number[]; wins: number; n: number }>()
const withoutKind = new Map<string, { fightReached: number[]; wins: number; n: number }>()
const allKinds = new Set<string>()

for (const run of summary.runs) {
  const activatedKinds = new Set(run.hands.flatMap((h) => h.buffFireOutcomes.map((o) => o.kind)))
  for (const k of activatedKinds) allKinds.add(k)
  for (const kind of allKinds) {
    const bucket = activatedKinds.has(kind) ? withKind : withoutKind
    const entry = bucket.get(kind) ?? { fightReached: [], wins: 0, n: 0 }
    entry.fightReached.push(run.fightReached)
    entry.wins += run.ending === RunEnding.Won ? 1 : 0
    entry.n += 1
    bucket.set(kind, entry)
  }
}

function mean(xs: number[]): string {
  return xs.length === 0 ? 'n/a' : (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)
}

process.stdout.write(
  `Buff-kind vs. run outcome — policy: ${policyName}, base seed: ${baseSeed}, runs: ${runs}\n\n`,
)
for (const kind of [...allKinds].sort()) {
  const w = withKind.get(kind) ?? { fightReached: [], wins: 0, n: 0 }
  const wo = withoutKind.get(kind) ?? { fightReached: [], wins: 0, n: 0 }
  process.stdout.write(
    `  ${kind.padEnd(16)} activated (n=${w.n.toString().padStart(3)}): mean fight ${mean(w.fightReached)}, win rate ${w.n ? ((w.wins / w.n) * 100).toFixed(1) : 'n/a'}%` +
      `   |  never activated (n=${wo.n.toString().padStart(3)}): mean fight ${mean(wo.fightReached)}, win rate ${wo.n ? ((wo.wins / wo.n) * 100).toFixed(1) : 'n/a'}%\n`,
  )
}
