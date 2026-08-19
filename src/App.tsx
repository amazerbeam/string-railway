import { useState } from 'react'
import {
  advanceRun,
  beatenCount,
  buyFromShop,
  canAdvanceRun,
  canBuyAnything,
  DuelSide,
  isEncounterResolved,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  recordEncounter,
  refusalFor,
  runEncounterAt,
  runPath,
  ShopItem,
  shopStockFor,
  SLICE_QUARRY_CHARACTER,
  startRun,
  CHEAT_SLOT_COUNT,
  type Hunt,
} from './hunt'
import { dealRound, PlayerSide, type WarCouncilState } from './warCouncil'
// Imported from `./app/warCouncilMount` directly, NOT from the `./app` barrel: `./app`
// extensionless collides case-insensitively with this very file (`App.tsx`) on Windows —
// the same NTFS trap `duelHealthBars.ts`/`DuelHealthBars.tsx` hit — and would resolve here
// instead of to the barrel, which does not export this type.
import type { WarCouncilRoundResult } from './app/warCouncilMount'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import { duelHealthBars } from './app/warCouncil/duelHealthBars'
import { quarryHealthLabel } from './app/warCouncil/labels'
import { dealerForRound } from './app/dealerForRound'
import RunOutcomePanel, { type TrickTally } from './app/run/RunOutcomePanel'
import ShopPanel from './app/run/ShopPanel'
import RunPathScreen from './app/run/RunPathScreen'
import {
  fightLabel,
  runGoalText,
  runPositionLabel,
  runProgressText,
  MAP_BACK_LABEL,
  MAP_TITLE,
  START_TITLE,
} from './app/run/runLabels'

// Built once at module scope because its only half is a configuration constant — it holds no
// per-run state, so it cannot go stale across the remounts below. Every fight of the run faces
// the same character: DLR-82 changes only each Quarry's health, and the roster is DLR-85's.
const HUNT: Hunt = { quarry: { character: SLICE_QUARRY_CHARACTER } }

const NO_TRICKS: TrickTally = { taken: 0, lost: 0 }

/** Which surface is showing. A union rather than a phase boolean beside it, because
 *  "in the shop AND warned" and "in the shop before the run began" are both states that
 *  must not exist. Widened on DLR-85 with Start and Map — folding the start screen in here
 *  costs no new state variable. */
const RunPhase = {
  Start: 'start',
  Verdict: 'verdict',
  Warned: 'warned',
  Shop: 'shop',
  Map: 'map',
} as const
type RunPhase = (typeof RunPhase)[keyof typeof RunPhase]

/**
 * The run driver (DLR-82). Owns `RunState` and switches on it: while the encounter is live it
 * mounts the felt exactly as before, and once an encounter resolves it mounts the run verdict
 * instead.
 *
 * Holds NO effect. Every transition below is a callback fired from a control, so there is no
 * listener, timer or subscription to clean up, and StrictMode's development double-mount only
 * re-runs the pure lazy initialisers.
 *
 * `hand` is monotonic across the WHOLE run, never reset per fight: it is React's remount `key`,
 * so every hand must have a distinct one, and it feeds `dealerForRound`'s parity, so counting on
 * across a fight boundary keeps the dealer alternating naturally.
 */
function App() {
  const [run, setRun] = useState(startRun)
  const [hand, setHand] = useState(1)
  const [dealt, setDealt] = useState<WarCouncilState>(() =>
    dealRound(dealerForRound(1), Math.random),
  )
  // The deciding hand's trick split, captured when an encounter resolves so the verdict can show
  // it. Nothing accumulates tricks across the several hands a fight takes, so this is the last
  // hand's, which is the only figure that exists.
  const [tricks, setTricks] = useState<TrickTally>(NO_TRICKS)
  const [phase, setPhase] = useState<RunPhase>(RunPhase.Start)

  const encounterOver = isEncounterResolved(run.encounter)

  // AC7 — the same predicate the shop's buttons read, so the warning cannot claim there is
  // something to buy while every purchase card is greyed out.
  const stock = shopStockFor(run)

  // Read from config, never written as numbers, and derived from the SAME index the encounter was
  // started from — so a bar's denominator cannot disagree with its opening value. Not a module
  // constant any more: the Quarry's maximum changes with every fight of the run.
  const maxHealth = {
    [DuelSide.Player]: PLAYER_START_HEALTH,
    [DuelSide.Quarry]: quarryHealthForEncounter(run.encounterIndex),
  }

  // The roster reads, in ONE place. Every named surface below takes a string from here, so
  // no component looks an opponent up for itself.
  const beaten = beatenCount(run)
  const stages = runPath(beaten)
  const goalText = runGoalText(run.encounterCount)
  const currentName = runEncounterAt(run.encounterIndex).name
  // `undefined` exactly when there is no next fight — the final encounter of a won run.
  const nextName =
    run.encounterIndex + 1 < run.encounterCount
      ? runEncounterAt(run.encounterIndex + 1).name
      : undefined

  function dealNextHand() {
    const next = hand + 1
    setHand(next)
    setDealt(dealRound(dealerForRound(next), Math.random))
  }

  function handleComplete(result: WarCouncilRoundResult) {
    const recorded = recordEncounter(
      run,
      result.encounter,
      result.cheats,
      result.envenomCharges,
      result.poisonGuardHeld,
    )
    setRun(recorded)
    if (isEncounterResolved(recorded.encounter)) {
      setTricks({
        taken: result.finalState.tricksWon[PlayerSide.Player],
        lost: result.finalState.tricksWon[PlayerSide.Cpu],
      })
      // The verdict is next, not another hand. D5 — any queued poison is discarded, because
      // `advanceRun` and `startRun` both re-seed the encounter through `startEncounter`.
      return
    }
    // D1 — nothing is owed at a hand boundary any more. Poison is paid by `applyResolution` at the
    // trick that resolves it, so an unresolved hand simply deals the next one. Any poison booked by
    // this hand's last trick rides on `encounter.pendingEnvenom` into the next hand's first trick,
    // which is D5's carry half.
    dealNextHand()
  }

  // The ONE call to advanceRun. Reached from Continue on an unwarned verdict, Continue anyway on a
  // warned one, and Next fight in the shop — three controls, one transition.
  function leaveForNextFight() {
    setRun(advanceRun(run))
    setPhase(RunPhase.Verdict)
    setTricks(NO_TRICKS)
    dealNextHand()
  }

  function handleContinue() {
    if (phase === RunPhase.Verdict && canBuyAnything(stock)) {
      setPhase(RunPhase.Warned)
      return
    }
    leaveForNextFight()
  }

  // AC8 — the FUNCTIONAL updater, so two clicks batched into one render cannot both compute from
  // the same stale run and lose a purchase. `buyFromShop` is pure, so StrictMode's development
  // double-invocation recomputes an identical value.
  //
  // The refusal is RE-DERIVED here, inside the updater, against whichever run this call actually
  // sees — not read from the render's stale `stock`/`refusalFor` closure. `disabled` only takes
  // effect on the render FOLLOWING a purchase, so a second click landing before that commit (a
  // double-click, or a fast repeated key-activation) would otherwise reach `buyFromShop` with the
  // item already refused and hit its deliberate throw. No-op instead of calling `buyFromShop` when
  // the item is already refused, so the single `refusalFor` predicate stays the only source of
  // truth and the throw stays reachable only from a genuine driver bug.
  function handleBuy(item: ShopItem) {
    setRun((r) => (refusalFor(shopStockFor(r), item) !== null ? r : buyFromShop(r, item)))
  }

  function handleNewRun() {
    const fresh = startRun()
    setRun(fresh)
    setPhase(RunPhase.Start)
    setTricks(NO_TRICKS)
    setHand(1)
    setDealt(dealRound(dealerForRound(1), Math.random))
  }

  if (phase === RunPhase.Start) {
    return (
      <RunPathScreen
        title={START_TITLE}
        stages={stages}
        goalText={goalText}
        actionLabel={fightLabel(currentName)}
        onAction={() => setPhase(RunPhase.Verdict)}
      />
    )
  }

  if (encounterOver && phase === RunPhase.Map) {
    return (
      <RunPathScreen
        title={MAP_TITLE}
        stages={stages}
        goalText={goalText}
        actionLabel={MAP_BACK_LABEL}
        onAction={() => setPhase(RunPhase.Verdict)}
      />
    )
  }

  if (encounterOver && phase === RunPhase.Shop) {
    // The same heart-state derivation the felt uses, so the shop's row and the fight's row can
    // never disagree about what the player is holding. `projected` is `current`: nothing is
    // pending between fights, so no heart is ever at risk or breaking here.
    const [playerBar] = duelHealthBars(run.encounter.health, run.encounter.health, maxHealth)
    return (
      <ShopPanel
        coins={run.coins}
        playerHealth={run.encounter.health[DuelSide.Player]}
        maxPlayerHealth={PLAYER_START_HEALTH}
        playerHearts={playerBar.hearts}
        cheatCount={run.cheats.length}
        cheatSlotCount={CHEAT_SLOT_COUNT}
        envenomCharges={run.envenomCharges}
        poisonGuardHeld={run.poisonGuardHeld}
        nextOpponentName={nextName}
        progressText={runProgressText(run.encounterIndex + 1, run.encounterCount)}
        refusals={{
          [ShopItem.Cheat]: refusalFor(stock, ShopItem.Cheat),
          [ShopItem.Envenom]: refusalFor(stock, ShopItem.Envenom),
          [ShopItem.PoisonGuard]: refusalFor(stock, ShopItem.PoisonGuard),
          [ShopItem.Heal]: refusalFor(stock, ShopItem.Heal),
        }}
        onBuy={handleBuy}
        onLeave={leaveForNextFight}
      />
    )
  }

  if (encounterOver) {
    return (
      <RunOutcomePanel
        outcome={run.outcome}
        encounterIndex={run.encounterIndex}
        encounterCount={run.encounterCount}
        carriedHealth={run.encounter.health[DuelSide.Player]}
        tricks={tricks}
        canContinue={canAdvanceRun(run)}
        coins={run.coins}
        warning={phase === RunPhase.Warned}
        onShop={() => setPhase(RunPhase.Shop)}
        onContinue={handleContinue}
        onDismissWarning={() => setPhase(RunPhase.Verdict)}
        onNewRun={handleNewRun}
        beatenName={currentName}
        nextName={nextName}
        onMap={() => setPhase(RunPhase.Map)}
      />
    )
  }

  return (
    <WarCouncilRound
      key={hand}
      initialState={dealt}
      hunt={HUNT}
      encounter={run.encounter}
      maxHealth={maxHealth}
      runLabel={runPositionLabel(run.encounterIndex, run.encounterCount, currentName)}
      cheats={run.cheats}
      coins={run.coins}
      envenomCharges={run.envenomCharges}
      poisonGuardHeld={run.poisonGuardHeld}
      quarryLabel={quarryHealthLabel(currentName)}
      onComplete={handleComplete}
    />
  )
}

export default App
