/* TEMPORARY headless play harness - delete after use. Drives the real engine + real reducer. */
import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
const OUT = process.env.SIM_OUT ?? 'C:/Users/jossd/AppData/Local/Temp/claude/E--Game-Dev-StringsAndStations/10d71bc3-3f3f-4ad6-aa8b-70fc82a6a947/scratchpad/'
import {
  dealRound,
  legalMoves,
  isSkulled,
  resolveTrickWinner,
  trickOutcomeFor,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  currentTurn,
  CardRank,
  type Card,
  type RoundState,
  type AbilityChoice,
} from '../warCouncil'
import { chooseCpuFoxChoice, chooseCpuWoodcutterChoice } from '../warCouncil/cpuPlayer'
import { removeCard } from '../warCouncil/cardUtils'
import {
  startRun,
  recordEncounter,
  canAdvanceRun,
  advanceRun,
  buyFromShop,
  shopStockFor,
  refusalFor,
  isEncounterResolved,
  applyDamage,
  DuelSide,
  ShopItem,
  RunOutcome,
  RUN_ENCOUNTERS,
  PLAYER_START_HEALTH,
  type RunState,
} from '../hunt'
import {
  createRoundUiState,
  RoundUiActionKind,
  cheatArmed,
  type RoundUiState,
} from '../app/warCouncil/roundUiState'
import { roundReducer } from '../app/warCouncil/roundReducer'
import { dealerForRound } from '../app/dealerForRound'

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Policy = (ui: RoundUiState, legal: readonly Card[], rng: () => number) => Card

const byRank = (a: Card, b: Card) => a.rank - b.rank
const lowest = (cs: readonly Card[]) => [...cs].sort(byRank)[0]
const highest = (cs: readonly Card[]) => [...cs].sort(byRank)[cs.length - 1]

function wouldWinAs(state: RoundState, card: Card): boolean {
  const lead = state.currentTrick[0]
  return (
    resolveTrickWinner([lead, { side: PlayerSide.Player, card }], state.trumpSuit) ===
    PlayerSide.Player
  )
}

function follow(ui: RoundUiState, legal: readonly Card[]): Card {
  const s = ui.round
  const skulled = isSkulled(s.skulledCards, s.currentTrick[0].card)
  const want = legal.filter((c) => wouldWinAs(s, c) !== skulled)
  if (want.length) return skulled ? highest(want) : lowest(want)
  return skulled ? lowest(legal) : highest(legal)
}

const policies: Record<string, Policy> = {
  random: (_ui, legal, rng) => legal[Math.floor(rng() * legal.length)],
  greedyLeadLow: (ui, legal) =>
    ui.round.currentTrick.length === 0 ? lowest(legal) : follow(ui, legal),
  greedyLeadHigh: (ui, legal) =>
    ui.round.currentTrick.length === 0 ? highest(legal) : follow(ui, legal),
  duck: (ui, legal) => {
    const s = ui.round
    if (s.currentTrick.length === 0) return lowest(legal)
    const losers = legal.filter((c) => !wouldWinAs(s, c))
    return losers.length ? highest(losers) : lowest(legal)
  },
  hog: (ui, legal) => {
    const s = ui.round
    if (s.currentTrick.length === 0) return highest(legal)
    const winners = legal.filter((c) => wouldWinAs(s, c))
    return winners.length ? lowest(winners) : lowest(legal)
  },
}

type ShopPolicy = (run: RunState) => RunState

function buy(run: RunState, order: readonly ShopItem[]): RunState {
  let r = run
  let progress = true
  while (progress) {
    progress = false
    for (const item of order) {
      if (refusalFor(shopStockFor(r), item) === null) {
        r = buyFromShop(r, item)
        progress = true
      }
    }
  }
  return r
}

const shopPolicies: Record<string, ShopPolicy> = {
  none: (run) => run,
  alwaysHeal: (run) => buy(run, [ShopItem.Heal]),
  healThenCheat: (run) => buy(run, [ShopItem.Heal, ShopItem.Cheat]),
  cheatThenHeal: (run) => buy(run, [ShopItem.Cheat, ShopItem.Heal]),
  envenomFirst: (run) => buy(run, [ShopItem.Envenom, ShopItem.Heal]),
  guardAndHeal: (run) => buy(run, [ShopItem.PoisonGuard, ShopItem.Heal]),
}

interface Stats {
  runs: number
  reached: number[]
  won: number
  handsPerEncounter: number[]
  tricks: number
  cashOuts: number[]
  streakLengths: number[]
  outcomeCounts: Record<string, number>
  playerDamageEvents: number
  handEndCashes: number
  healthAtFightStart: number[]
  followDecisions: number
  singleLegal: number
  forcedOutcome: number
  forcedHit: number
  forcedHitStreak: number[]
  forcedSkullEat: number
  applyEvents: number
  applyDamageTotal: number
  skulledLeadRank: number[]
  forcedEatLeadRank: number[]
  quarryLeads: number
  quarrySkulledLeads: number
}

function newStats(): Stats {
  return {
    runs: 0,
    reached: [],
    won: 0,
    handsPerEncounter: [],
    tricks: 0,
    cashOuts: [],
    streakLengths: [],
    outcomeCounts: {},
    playerDamageEvents: 0,
    handEndCashes: 0,
    healthAtFightStart: [],
    followDecisions: 0,
    singleLegal: 0,
    forcedOutcome: 0,
    forcedHit: 0,
    forcedHitStreak: [],
    forcedSkullEat: 0,
    applyEvents: 0,
    applyDamageTotal: 0,
    skulledLeadRank: [],
    forcedEatLeadRank: [],
    quarryLeads: 0,
    quarrySkulledLeads: 0,
  }
}

type ApplyMode = 'never' | 'always' | 'mult3' | 'onForcedHit'

function playHand(
  seed: RoundUiState,
  policy: Policy,
  rng: () => number,
  st: Stats,
  applyMode: ApplyMode = 'never',
): RoundUiState {
  let ui = seed
  let streak = 0
  for (let guard = 0; guard < 500; guard += 1) {
    if (ui.cpuFault) throw new Error('cpu fault: ' + ui.cpuFault)

    if (ui.resolvedTrick) {
      const r = ui.resolvedTrick.resolution
      const playerLed = ui.resolvedTrick.cards[0].side === PlayerSide.Player
      const key = (playerLed ? 'LED:' : 'FOL:') + r.outcome
      st.outcomeCounts[key] = (st.outcomeCounts[key] ?? 0) + 1
      st.tricks += 1
      st.outcomeCounts[r.outcome] = (st.outcomeCounts[r.outcome] ?? 0) + 1
      if (r.bankAdded > 0) streak += 1
      if (r.cashOut > 0) {
        st.cashOuts.push(r.cashOut)
        st.streakLengths.push(streak)
        streak = 0
      } else if (r.damageToPlayer > 0) {
        st.streakLengths.push(streak)
        streak = 0
      }
      if (r.damageToPlayer > 0) st.playerDamageEvents += 1
      if (r.cashedAtHandEnd) st.handEndCashes += 1
      ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
      continue
    }
    if (isEncounterResolved(ui.encounter)) return ui
    if (ui.round.phase === RoundPhase.Complete) return ui

    if (ui.prompt) {
      const card = ui.prompt
      const handAfter = removeCard(ui.round.hands[PlayerSide.Player], card)
      const choice: AbilityChoice =
        card.rank === CardRank.Fox
          ? chooseCpuFoxChoice(handAfter, ui.round.trumpSuit)
          : chooseCpuWoodcutterChoice([...handAfter, ui.round.drawPile[0]])
      ui = roundReducer(ui, { kind: RoundUiActionKind.ChooseAbility, choice })
      continue
    }

    if (currentTurn(ui.round) === QUARRY_SIDE && ui.round.currentTrick.length === 0) {
      ui = roundReducer(ui, { kind: RoundUiActionKind.CarryOn })
      continue
    }

    const legal = legalMoves(ui.round, PlayerSide.Player, { ignoreFollowSuit: cheatArmed(ui) })

    let forcedHitNow = false
    if (ui.round.currentTrick.length === 1) {
      const s0 = ui.round
      const leadCard = s0.currentTrick[0].card
      const leadSkulled = isSkulled(s0.skulledCards, leadCard)
      const outs = new Set(
        legal.map((c) =>
          trickOutcomeFor(wouldWinAs(s0, c), leadSkulled || isSkulled(s0.skulledCards, c)),
        ),
      )
      st.followDecisions += 1
      st.quarryLeads += 1
      if (leadSkulled) {
        st.quarrySkulledLeads += 1
        st.skulledLeadRank.push(leadCard.rank)
      }
      if (legal.length === 1) st.singleLegal += 1
      if (outs.size === 1) {
        st.forcedOutcome += 1
        const only = [...outs][0]
        if (only === 'cleanLoss' || only === 'skullWin') {
          st.forcedHit = st.forcedHit + 1
          forcedHitNow = true
          st.forcedHitStreak.push(streak)
          if (only === 'skullWin') {
            st.forcedSkullEat += 1
            if (leadSkulled) st.forcedEatLeadRank.push(leadCard.rank)
          }
        }
      }
    }

    // DLR-94 AC2/AC3 simulation — voluntary cash-out, no health cost, trick then proceeds.
    if (applyMode !== 'never' && !isEncounterResolved(ui.encounter)) {
      const cash = ui.round.bank * ui.round.multiplier
      const wants =
        applyMode === 'always'
          ? cash > 0
          : applyMode === 'mult3'
            ? ui.round.multiplier >= 3
            : forcedHitNow && cash > 0
      if (wants && cash > 0) {
        st.applyEvents += 1
        st.applyDamageTotal += cash
        ui = {
          ...ui,
          round: { ...ui.round, bank: 0, multiplier: 0 },
          encounter: applyDamage(ui.encounter, { [DuelSide.Player]: 0, [DuelSide.Quarry]: cash }),
        }
        streak = 0
        if (isEncounterResolved(ui.encounter)) return ui
      }
    }

    const card = policy(ui, legal, rng)
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card })
  }
  throw new Error('hand did not terminate')
}

function playRun(
  policy: Policy,
  shop: ShopPolicy,
  rng: () => number,
  st: Stats,
  applyMode: ApplyMode = 'never',
): void {
  let run = startRun()
  st.runs += 1
  let furthest = 0
  for (let fight = 0; fight < 200; fight += 1) {
    furthest = run.encounterIndex
    st.healthAtFightStart.push(run.encounter.health.player)
    let hands = 0
    let ui: RoundUiState | null = null
    while (!isEncounterResolved(run.encounter)) {
      hands += 1
      const seed = createRoundUiState({
        round: dealRound(dealerForRound(hands), rng),
        encounter: run.encounter,
        cheats: run.cheats,
        envenomCharges: run.envenomCharges,
        poisonGuardHeld: run.poisonGuardHeld,
      })
      ui = playHand(seed, policy, rng, st, applyMode)
      run = {
        ...run,
        encounter: ui.encounter,
        cheats: ui.cheats,
        envenomCharges: ui.envenomCharges,
        poisonGuardHeld: ui.poisonGuardHeld,
      }
      if (hands > 80) break
    }
    st.handsPerEncounter.push(hands)
    run = recordEncounter(run, ui!.encounter, ui!.cheats, ui!.envenomCharges, ui!.poisonGuardHeld)
    if (run.outcome === RunOutcome.Lost) break
    if (run.outcome === RunOutcome.Won) {
      st.won += 1
      furthest = run.encounterIndex
      break
    }
    if (!canAdvanceRun(run)) break
    run = shop(run)
    run = advanceRun(run)
  }
  st.reached.push(furthest)
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
function hist(xs: number[]) {
  const m = new Map<number, number>()
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => a[0] - b[0])
}

it('simulates runs', () => {
  const N = 300
  const out: string[] = []
  out.push(
    'opponents: ' +
      RUN_ENCOUNTERS.map(
        (e, i) => `${i + 1}:${e.name}(${e.health}${e.kind === 'boss' ? 'B' : ''})`,
      ).join(' '),
  )
  out.push('player start health: ' + PLAYER_START_HEALTH)
  for (const [pname, policy] of Object.entries(policies)) {
    for (const [sname, shop] of Object.entries(shopPolicies)) {
      const st = newStats()
      for (let i = 0; i < N; i += 1) playRun(policy, shop, mulberry32(i * 7919 + 13), st)
      const h = hist(st.reached)
        .map(([k, v]) => `${k + 1}:${v}`)
        .join(' ')
      out.push(
        `${pname.padEnd(14)} ${sname.padEnd(13)} ` +
          `meanFight=${(mean(st.reached) + 1).toFixed(2)} best=${Math.max(...st.reached) + 1} ` +
          `hands/fight=${mean(st.handsPerEncounter).toFixed(2)} ` +
          `meanCash=${mean(st.cashOuts).toFixed(2)} maxCash=${Math.max(...st.cashOuts, 0)} ` +
          `meanStreak=${mean(st.streakLengths).toFixed(2)} ` +
          `hits=${st.playerDamageEvents} tricks=${st.tricks} ` +
          `outcomes=${JSON.stringify(st.outcomeCounts)}` +
          `\n     reachHist ${h}`,
      )
    }
  }
  writeFileSync(OUT + 'sim-out.txt', out.join('\n'))
}, 600000)

it('deep dive on the best policy', () => {
  const N = 2000
  const st = newStats()
  for (let i = 0; i < N; i += 1)
    playRun(policies.greedyLeadLow, shopPolicies.alwaysHeal, mulberry32(i * 104729 + 7), st)

  const lines: string[] = []
  lines.push(`runs=${N} greedyLeadLow + alwaysHeal`)
  lines.push('reached fight: ' + hist(st.reached.map((r) => r + 1)).map(([k, v]) => `${k}:${v}`).join(' '))
  lines.push('cashOut sizes: ' + hist(st.cashOuts).map(([k, v]) => `${k}:${v}`).join(' '))
  lines.push('streak at cash/hit: ' + hist(st.streakLengths).map(([k, v]) => `${k}:${v}`).join(' '))
  lines.push('hands per fight: ' + hist(st.handsPerEncounter).map(([k, v]) => `${k}:${v}`).join(' '))
  lines.push('health at fight start: ' + hist(st.healthAtFightStart).map(([k, v]) => `${k}:${v}`).join(' '))
  lines.push(
    `tricks=${st.tricks} playerHits=${st.playerDamageEvents} (${((100 * st.playerDamageEvents) / st.tricks).toFixed(1)}% of tricks) ` +
      `handEndCashes=${st.handEndCashes} totalCashOuts=${st.cashOuts.length} ` +
      `damageDealtTotal=${st.cashOuts.reduce((a, b) => a + b, 0)}`,
  )
  lines.push('outcomes: ' + JSON.stringify(st.outcomeCounts))
  const t = st.tricks
  lines.push(
    'outcome %: ' +
      Object.entries(st.outcomeCounts)
        .map(([k, v]) => `${k}=${((100 * v) / t).toFixed(1)}%`)
        .join(' '),
  )
  writeFileSync(OUT + 'sim-deep.txt', lines.join('\n'))
}, 600000)


it('forced choices and DLR-94 apply-damage', () => {
  const N = 1500
  const lines: string[] = []
  for (const mode of ['never', 'always', 'mult3', 'onForcedHit'] as const) {
    const st = newStats()
    for (let i = 0; i < N; i += 1)
      playRun(policies.greedyLeadLow, shopPolicies.alwaysHeal, mulberry32(i * 104729 + 7), st, mode)
    const fd = st.followDecisions
    lines.push(
      `apply=${mode.padEnd(12)} meanFight=${(mean(st.reached) + 1).toFixed(2)} best=${Math.max(...st.reached) + 1} ` +
        `hands/fight=${mean(st.handsPerEncounter).toFixed(2)} ` +
        `applyEvents=${st.applyEvents} applyDmg=${st.applyDamageTotal} ` +
        `cashOutDmg=${st.cashOuts.reduce((a, b) => a + b, 0)}`,
    )
    lines.push(
      `   followDecisions=${fd} singleLegalCard=${st.singleLegal} (${((100 * st.singleLegal) / fd).toFixed(1)}%) ` +
        `sameOutcomeWhatever=${st.forcedOutcome} (${((100 * st.forcedOutcome) / fd).toFixed(1)}%) ` +
        `forcedHit=${st.forcedHit} (${((100 * st.forcedHit) / fd).toFixed(1)}%) ` +
        `ofWhichSkullEat=${st.forcedSkullEat}`,
    )
    lines.push(
      '   streak destroyed by a forced hit: ' +
        hist(st.forcedHitStreak).map(([k, v]) => `${k}:${v}`).join(' '),
    )
    lines.push('   reached: ' + hist(st.reached.map((r) => r + 1)).map(([k, v]) => `${k}:${v}`).join(' '))
  }
  writeFileSync(OUT + 'sim-forced.txt', lines.join(String.fromCharCode(10)))
}, 900000)


it('why the forced skull-eat happens', () => {
  const N = 1500
  const st = newStats()
  for (let i = 0; i < N; i += 1)
    playRun(policies.greedyLeadLow, shopPolicies.alwaysHeal, mulberry32(i * 104729 + 7), st)
  const L: string[] = []
  L.push(`quarry leads=${st.quarryLeads} of which skulled=${st.quarrySkulledLeads} (${((100 * st.quarrySkulledLeads) / st.quarryLeads).toFixed(1)}%)`)
  L.push('rank of every skulled lead:      ' + hist(st.skulledLeadRank).map(([k, v]) => `${k}:${v}`).join(' '))
  L.push('rank of skulled leads that FORCE an eat: ' + hist(st.forcedEatLeadRank).map(([k, v]) => `${k}:${v}`).join(' '))
  const tot = st.skulledLeadRank.length
  const f = new Map(hist(st.forcedEatLeadRank))
  const a = new Map(hist(st.skulledLeadRank))
  L.push('P(forced eat | skulled lead of rank r):')
  for (const [r, n] of [...a.entries()].sort((x, y) => x[0] - y[0]))
    L.push(`   rank ${String(r).padStart(2)}  ${(((f.get(r) ?? 0) / n) * 100).toFixed(0)}%  (n=${n})`)
  L.push(`overall P(forced eat | skulled lead) = ${((st.forcedEatLeadRank.length / tot) * 100).toFixed(1)}%`)
  writeFileSync(OUT + 'sim-why.txt', L.join(String.fromCharCode(10)))
}, 900000)
