/**
 * Disposable play-tester query — NOT part of the shipped app, NOT meant to be kept once its
 * question is answered (skill: play-tester → "Data lifecycle"). Answers: "what buffs are
 * unusable in the first hand?" by reading `buffWindowObservations` off every hand-1 `HandReport`
 * in a batch and tallying offers/refusals per BuffKind.
 *
 * Run with: npx vite-node scripts/query-hand1-buffs.ts -- --runs 500 --seed 1 --policy baseline
 */
import { simulate, POLICIES, type BuffWindowObservation } from '../src/sim'

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

interface Tally {
  offered: number
  refused: number
  byReason: Record<string, number>
}

const byKind = new Map<string, Tally>()

for (const run of summary.runs) {
  const hand1 = run.hands.find((h) => h.handOfFight === 1)
  if (hand1 === undefined) continue
  for (const obs of hand1.buffWindowObservations as readonly BuffWindowObservation[]) {
    let tally = byKind.get(obs.kind)
    if (tally === undefined) {
      tally = { offered: 0, refused: 0, byReason: {} }
      byKind.set(obs.kind, tally)
    }
    tally.offered += 1
    if (obs.refusal !== null) {
      tally.refused += 1
      tally.byReason[obs.refusal] = (tally.byReason[obs.refusal] ?? 0) + 1
    }
  }
}

process.stdout.write(
  `Hand-1 buff offer/refusal tally — policy: ${policyName}, base seed: ${baseSeed}, runs: ${runs}\n\n`,
)
const rows = [...byKind.entries()].sort((a, b) => b[1].refused / b[1].offered - a[1].refused / a[1].offered)
for (const [kind, tally] of rows) {
  const pct = ((tally.refused / tally.offered) * 100).toFixed(1)
  const reasons = Object.entries(tally.byReason)
    .map(([reason, count]) => `${reason}:${count}`)
    .join(', ')
  process.stdout.write(
    `  ${kind.padEnd(16)} offered ${tally.offered.toString().padStart(5)}  refused ${tally.refused.toString().padStart(5)} (${pct}%)  [${reasons}]\n`,
  )
}
