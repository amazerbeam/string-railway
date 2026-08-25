/**
 * Disposable play-tester query. "Aoife" = fight index 0, the first opponent every run faces
 * (`.docs/implementation/run-winnability-simulation.md`). Answers: what fraction of runs beat that
 * fight at least once (fightsWon >= 1), and the full fights-won distribution.
 *
 * Run with: npx vite-node scripts/query-beats-aoife.ts -- --runs 500 --seed 1 --policy baseline
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
const beatAoife = summary.runs.filter((r) => r.fightsWon >= 1).length
const dist = new Map<number, number>()
for (const r of summary.runs) {
  dist.set(r.fightsWon, (dist.get(r.fightsWon) ?? 0) + 1)
}

process.stdout.write(`policy: ${policyName}, base seed: ${baseSeed}, runs: ${runs}\n\n`)
process.stdout.write(
  `Beat fight 1 (Aoife) at least once: ${beatAoife}/${runs} (${((beatAoife / runs) * 100).toFixed(1)}%)\n\n`,
)
process.stdout.write('Fights-won distribution:\n')
for (const won of [...dist.keys()].sort((a, b) => a - b)) {
  process.stdout.write(`  ${won.toString().padStart(2)} fights won: ${dist.get(won)} runs\n`)
}
