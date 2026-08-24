import { useState } from 'react'
import {
  advanceRun,
  apCapacityFor,
  bankClimbBonusFor,
  playerRankTiersFor,
  beatenCount,
  buyFromShop,
  canAdvanceRun,
  canBuyAnything,
  COINS_PER_ENCOUNTER_WIN,
  drinkFlask,
  DuelSide,
  flaskRefusalFor,
  flaskStockFor,
  isEncounterResolved,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  recordEncounter,
  refusalFor,
  RunOutcome,
  runEncounterAt,
  runPath,
  ShopItem,
  shopStockFor,
  SLICE_QUARRY_CHARACTER,
  startRun,
  type Hunt,
  type RunState,
} from './hunt'
import { useVault } from './app/vault/useVault'
import VaultScreen from './app/vault/VaultScreen'
import { clearStartingGrants, depositLeftoverCoin } from './vault'
import {
  FRESH_ENCOUNTER_DECK,
  closeHand,
  PlayerSide,
  type EncounterDeck,
  type WarCouncilState,
} from './warCouncil'
// Imported from `./app/warCouncilMount` directly, NOT from the `./app` barrel: `./app`
// extensionless collides case-insensitively with this very file (`App.tsx`) on Windows —
// the same NTFS trap `duelHealthBars.ts`/`DuelHealthBars.tsx` hit — and would resolve here
// instead of to the barrel, which does not export this type.
import type { WarCouncilRoundResult } from './app/warCouncilMount'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import { duelHealthBars } from './app/warCouncil/duelHealthBars'
import { quarryHealthLabel } from './app/warCouncil/labels'
import { dealHand } from './app/handDeal'
import RunOutcomePanel, { type TrickTally } from './app/run/RunOutcomePanel'
import ShopPanel from './app/run/ShopPanel'
import RunPathScreen from './app/run/RunPathScreen'
import { useShopSlot } from './app/run/useShopSlot'
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
  // DLR-118 — reachable ONLY from a terminal verdict's `Open the Vault` control.
  Vault: 'vault',
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
  // DLR-116/DLR-123 — `runSeed` is the ONLY `Math.random()` left in this app, and it sits here
  // because `src/hunt/` may not call it. The deal used to be handed `Math.random` straight from
  // this file, so no deal or reshuffle was reproducible; it goes through `dealHand` →
  // `dealSeedFor` → `createSeededRng` now, which is what makes AC12 hold.
  const [run, setRun] = useState(() =>
    startRun(PLAYER_START_HEALTH, [], Math.floor(Math.random() * 0x100000000)),
  )
  const [hand, setHand] = useState(1)
  const [dealt, setDealt] = useState<WarCouncilState>(() => dealHand(run, 1, FRESH_ENCOUNTER_DECK))
  // The deciding hand's trick split, captured when an encounter resolves so the verdict can show
  // it. Nothing accumulates tricks across the several hands a fight takes, so this is the last
  // hand's, which is the only figure that exists.
  const [tricks, setTricks] = useState<TrickTally>(NO_TRICKS)
  const [phase, setPhase] = useState<RunPhase>(RunPhase.Start)
  const vaultHandle = useVault()
  const { vault, commit } = vaultHandle

  // DLR-116 — called UNCONDITIONALLY at the top level, never inside the `RunPhase.Shop` branch: a
  // hook called conditionally is a hooks-order violation. Cheap when the shop is not showing —
  // one derivation of a strip, no state churn.
  const { view: slotView, selectMachine, pull } = useShopSlot(run, vault, setRun)

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

  /** DLR-123 — takes the run EXPLICITLY rather than closing over `run`: every caller has just
   *  computed a newer one, and the render's `run` is stale by the time this fires. `carried` is
   *  `FRESH_ENCOUNTER_DECK` whenever an ENCOUNTER is starting (AC10) and the finished hand's
   *  `closeHand` otherwise — which is the whole of the deck's lifetime rule, in one parameter. */
  function dealNextHand(nextRun: RunState, carried: EncounterDeck) {
    const next = hand + 1
    setHand(next)
    setDealt(dealHand(nextRun, next, carried))
  }

  function handleComplete(result: WarCouncilRoundResult) {
    const recorded = recordEncounter(
      run,
      result.encounter,
      result.cheats,
      result.timebombCharges,
      result.blastGuardHeld,
      result.discardsRemaining,
      result.unplayedAtResolve,
    )
    setRun(recorded)
    if (isEncounterResolved(recorded.encounter)) {
      setTricks({
        taken: result.finalState.tricksWon[PlayerSide.Player],
        lost: result.finalState.tricksWon[PlayerSide.Cpu],
      })
      // AC1 — the run's outcome is decided right here, so this is the one place leftover coin
      // converts to Vault currency. `run.coins` is deliberately NOT zeroed: the verdict panel
      // still reads it, and the Vault is never credited on a win (AC1 says "a run ending in
      // death" — a win is its own reward).
      if (recorded.outcome === RunOutcome.Lost) {
        commit((v) => depositLeftoverCoin(v, recorded.coins))
      }
      // The verdict is next, not another hand. D5 — any queued Timebomb is discarded, because
      // `advanceRun` and `startRun` both re-seed the encounter through `startEncounter`.
      return
    }
    // D1 — nothing is owed at a hand boundary any more. A Timebomb is paid by `applyResolution` at the
    // trick that resolves it, so an unresolved hand simply deals the next one. Any Timebomb booked by
    // this hand's last trick rides on `encounter.pendingTimebomb` into the next hand's first trick,
    // which is D5's carry half.
    // DLR-123 AC2/AC4 — the SAME deck, minus this hand's 13. `closeHand` spends the decree and
    // everything else not in the draw pile, so the next hand deals on from where this one stopped
    // instead of from a fresh shuffle.
    dealNextHand(recorded, closeHand(result.finalState))
  }

  // The ONE call to advanceRun. Reached from Continue on an unwarned verdict, Continue anyway on a
  // warned one, and Next fight in the shop — three controls, one transition.
  function leaveForNextFight() {
    const advanced = advanceRun(run)
    setRun(advanced)
    setPhase(RunPhase.Verdict)
    setTricks(NO_TRICKS)
    // AC10 — a new fight always begins on a fresh 33.
    dealNextHand(advanced, FRESH_ENCOUNTER_DECK)
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

  // AC2/AC3 — the FUNCTIONAL updater, mirroring `handleBuy` exactly and for the same reason: the
  // refusal is RE-DERIVED inside the updater against whichever run this call actually sees, not
  // read from the render's stale closure. `disabled` only takes effect on the render FOLLOWING a
  // drink, so a double-click or a fast repeated key-activation would otherwise reach `drinkFlask`
  // with the charge already spent and hit its deliberate throw. No-op instead, so `flaskRefusalFor`
  // stays the only source of truth and that throw stays reachable only from a genuine driver bug.
  // `drinkFlask` is pure, so StrictMode's development double-invocation recomputes an identical
  // value.
  function handleDrinkFlask() {
    setRun((r) => (flaskRefusalFor(flaskStockFor(r)) !== null ? r : drinkFlask(r)))
  }

  // The Start screen's action button is the single structural place a run begins: `App.tsx`
  // already routes both the initial mount and `handleNewRun` through `RunPhase.Start`, so
  // consuming grants here — rather than in a lazy `useState` initialiser — is what keeps the
  // consumption from double-firing under StrictMode. Being a callback rather than an effect,
  // there is nothing for StrictMode to double-fire in the first place.
  function handleBeginRun() {
    const begun = startRun(
      PLAYER_START_HEALTH,
      vault.startingGrants,
      Math.floor(Math.random() * 0x100000000),
    )
    setRun(begun)
    if (vault.startingGrants.length > 0) {
      commit(clearStartingGrants)
    }
    setHand(1)
    // DLR-123 D12 — RE-DEAL. This mints a run with a new `runSeed`, and now that the deal is
    // seeded off that value, leaving the mount-time hand in place would mean the opening hand of
    // a run was dealt from a seed the run does not have.
    setDealt(dealHand(begun, 1, FRESH_ENCOUNTER_DECK))
    setPhase(RunPhase.Verdict)
  }

  function handleNewRun() {
    const fresh = startRun(PLAYER_START_HEALTH, [], Math.floor(Math.random() * 0x100000000))
    setRun(fresh)
    setPhase(RunPhase.Start)
    setTricks(NO_TRICKS)
    setHand(1)
    setDealt(dealHand(fresh, 1, FRESH_ENCOUNTER_DECK))
  }

  if (phase === RunPhase.Start) {
    return (
      <RunPathScreen
        title={START_TITLE}
        stages={stages}
        goalText={goalText}
        actionLabel={fightLabel(currentName)}
        onAction={handleBeginRun}
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
        apCapacity={apCapacityFor(run.apCapacityBonus)}
        playerHealth={run.encounter.health[DuelSide.Player]}
        maxPlayerHealth={PLAYER_START_HEALTH}
        playerHearts={playerBar.hearts}
        flaskCharges={run.flaskCharges}
        flaskRefusal={flaskRefusalFor(flaskStockFor(run))}
        onDrinkFlask={handleDrinkFlask}
        nextOpponentName={nextName}
        progressText={runProgressText(run.encounterIndex + 1, run.encounterCount)}
        refusals={{
          [ShopItem.Cheat]: refusalFor(stock, ShopItem.Cheat),
          [ShopItem.Timebomb]: refusalFor(stock, ShopItem.Timebomb),
          [ShopItem.BlastGuard]: refusalFor(stock, ShopItem.BlastGuard),
          [ShopItem.Whetstone]: refusalFor(stock, ShopItem.Whetstone),
          [ShopItem.Heal]: refusalFor(stock, ShopItem.Heal),
          [ShopItem.ApCapacity]: refusalFor(stock, ShopItem.ApCapacity),
          [ShopItem.SwanTier]: refusalFor(stock, ShopItem.SwanTier),
          [ShopItem.WitchTier]: refusalFor(stock, ShopItem.WitchTier),
        }}
        onBuy={handleBuy}
        onLeave={leaveForNextFight}
        slot={{ ...slotView, onSelectMachine: selectMachine, onPull: pull }}
      />
    )
  }

  if (encounterOver && phase === RunPhase.Vault) {
    // `run.coins` is NOT zeroed by the deposit — `handleComplete` leaves it for the verdict
    // panel — so the screen re-derives what was banked rather than needing state for it.
    return (
      <VaultScreen
        handle={vaultHandle}
        outcome={run.outcome}
        leftoverCoins={run.coins}
        onLeave={handleNewRun}
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
        quickKillPayout={run.lastQuickKillPayout}
        winCoins={COINS_PER_ENCOUNTER_WIN}
        warning={phase === RunPhase.Warned}
        onShop={() => setPhase(RunPhase.Shop)}
        onContinue={handleContinue}
        onDismissWarning={() => setPhase(RunPhase.Verdict)}
        onNewRun={handleNewRun}
        onVault={() => setPhase(RunPhase.Vault)}
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
      timebombCharges={run.timebombCharges}
      blastGuardHeld={run.blastGuardHeld}
      discardsRemaining={run.discardsRemaining}
      buffs={run.buffs}
      bankClimbBonus={bankClimbBonusFor(run)}
      rankTiers={playerRankTiersFor(run)}
      apCapacity={apCapacityFor(run.apCapacityBonus)}
      quarryLabel={quarryHealthLabel(currentName)}
      onComplete={handleComplete}
    />
  )
}

export default App
