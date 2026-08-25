/**
 * Disposable play-tester query. Answers: "which buffs are functionally useless in hand 1" —
 * activated fine (no BuffActivationRefusal), but their CONDITION never comes true that early,
 * so activating them spends AP for nothing (e.g. Cornered needs prior health loss; Miser needs
 * prior coins). Reads `buffFireOutcomes` off every hand-1 `HandReport`.
 *
 * Run with: npx vite-node scripts/query-hand1-fires.ts -- --runs 500 --seed 1 --policy baseline
 */
import { simulate, POLICIES } from '../src/sim'

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

const byKind = new Map<string, { activations: number; fires: number }>()
for (const run of summary.runs) {
  const hand1 = run.hands.find((h) => h.handOfFight === 1)
  if (hand1 === undefined) continue
  for (const o of hand1.buffFireOutcomes) {
    const tally = byKind.get(o.kind) ?? { activations: 0, fires: 0 }
    tally.activations += 1
    if (o.fired) tally.fires += 1
    byKind.set(o.kind, tally)
  }
}

process.stdout.write(
  `Hand-1 activation fire-rate — policy: ${policyName}, base seed: ${baseSeed}, runs: ${runs}\n\n`,
)
const rows = [...byKind.entries()].sort((a, b) => a[1].fires / a[1].activations - b[1].fires / b[1].activations)
for (const [kind, t] of rows) {
  const pct = ((t.fires / t.activations) * 100).toFixed(1)
  process.stdout.write(
    `  ${kind.padEnd(16)} activated ${t.activations.toString().padStart(5)} times, FIRED ${t.fires.toString().padStart(5)} (${pct}%)\n`,
  )
}
