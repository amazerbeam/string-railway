import { simulate, POLICIES, type HandReport, type RunReport } from '../src/sim'
const summary = simulate({ runs: 1000, baseSeed: 1 }, POLICIES.baseline)
function fightGroups(hands: readonly HandReport[]): HandReport[][] {
  const groups: HandReport[][] = []
  for (const hand of hands) {
    if (hand.handOfFight === 1) groups.push([])
    groups[groups.length - 1]?.push(hand)
  }
  return groups
}
const tally = new Map<string, { activated: number; fired: number }>()
for (const run of summary.runs as readonly RunReport[]) {
  const group = fightGroups(run.hands)[0]
  if (group === undefined) continue
  for (const hand of group) {
    for (const o of hand.buffFireOutcomes) {
      const t = tally.get(o.kind) ?? { activated: 0, fired: 0 }
      t.activated += 1
      if (o.fired) t.fired += 1
      tally.set(o.kind, t)
    }
  }
}
for (const [kind, t] of [...tally.entries()].sort((a, b) => a[1].fired / a[1].activated - b[1].fired / b[1].activated)) {
  process.stdout.write(`${kind.padEnd(16)} activated ${t.activated.toString().padStart(6)}  fired ${t.fired.toString().padStart(6)} (${((t.fired/t.activated)*100).toFixed(1)}%)\n`)
}
