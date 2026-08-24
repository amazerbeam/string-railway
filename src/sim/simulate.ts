/**
 * DLR-130 — the OUTER loop: N seeded runs, folded into one `SimSummary`. Every run's seed comes
 * from the existing `mixSeed(baseSeed, runIndex)` helper — no new seed arithmetic — so two runs of
 * one batch can never collide.
 */
import { mixSeed } from '../hunt'
import { playRun } from './playRun'
import type { RunReport, SimOptions, SimPolicy, SimSummary } from './types'

export function simulate(options: SimOptions, policy: SimPolicy): SimSummary {
  const runs: RunReport[] = []
  for (let runIndex = 0; runIndex < options.runs; runIndex += 1) {
    runs.push(playRun(mixSeed(options.baseSeed, runIndex), policy))
  }
  return { policyName: policy.name, baseSeed: options.baseSeed, runs }
}
