/**
 * DLR-130 — the headless simulator's command line. `npm run sim -- --runs 200 --seed 7`.
 *
 * Lives OUTSIDE `src/` deliberately: `src/` is typed with `types: ["vite/client"]` and no
 * `@types/node`, and adding node's globals there would change typings for the whole app tree.
 * `tsconfig.scripts.json` covers this file instead. Everything below the argument parse is a call
 * into `src/sim/`, which is pure and node-free.
 *
 * Writes through `process.stdout.write`, never `console.log`: a CLI's stdout IS its output, and
 * `console.log` is banned in shipped code (`CLAUDE.md` → Code conventions).
 */
import { formatSummary, POLICIES, simulate } from '../src/sim'

const DEFAULT_RUNS = 200
const DEFAULT_SEED = 1
const DEFAULT_POLICY = 'baseline'

interface CliArgs {
  readonly runs: number
  readonly baseSeed: number
  readonly policyName: string
}

/** Parses `--runs`, `--seed` and `--policy`. Returns a message instead of args when anything is
 *  wrong, so `main` can exit 1 naming the bad argument rather than guessing a default. */
function parseArgs(argv: readonly string[]): CliArgs | string {
  let runs = DEFAULT_RUNS
  let baseSeed = DEFAULT_SEED
  let policyName = DEFAULT_POLICY

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--runs' || flag === '--seed') {
      const value = argv[i + 1]
      if (value === undefined) {
        return `Missing value for ${flag}.`
      }
      const parsed = Number(value)
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        return `${flag} must be a finite integer, got '${value}'.`
      }
      if (flag === '--runs') {
        if (parsed < 1) {
          return `--runs must be at least 1, got '${value}'.`
        }
        runs = parsed
      } else {
        baseSeed = parsed
      }
      i += 1
    } else if (flag === '--policy') {
      const value = argv[i + 1]
      if (value === undefined) {
        return `Missing value for --policy.`
      }
      policyName = value
      i += 1
    } else {
      return `Unknown flag '${flag}'.`
    }
  }

  return { runs, baseSeed, policyName }
}

function main(): number {
  const parsed = parseArgs(process.argv.slice(2))
  if (typeof parsed === 'string') {
    process.stdout.write(`${parsed}\n`)
    return 1
  }
  const policy = POLICIES[parsed.policyName]
  if (policy === undefined) {
    process.stdout.write(
      `Unknown policy '${parsed.policyName}'. Known policies: ${Object.keys(POLICIES).join(', ')}\n`,
    )
    return 1
  }
  process.stdout.write(
    formatSummary(simulate({ runs: parsed.runs, baseSeed: parsed.baseSeed }, policy)),
  )
  return 0
}

process.exitCode = main()
