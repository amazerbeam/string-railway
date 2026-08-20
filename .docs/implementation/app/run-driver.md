Part of [App shell](README.md).

# `App.tsx` as the run driver, and `dealerForRound`

Since DLR-82 `src/App.tsx` is a **run driver**: a state machine that owns a `RunState`, deals hands
within a fight exactly as it did before, and switches to a full-screen verdict when a fight
resolves. It performs no health arithmetic and no index arithmetic of its own — every transition is
a call into `src/hunt/run.ts`, and every number is read from configuration.

**Since DLR-85 it also owns the run's shape on screen**: it opens on a start screen rather than on fight
one, mounts a map between fights, is the **only** file that reads the opponent roster, and returns to the
start screen when a run is lost. It is **286 lines** at DLR-92 (from 208 at DLR-82, 262 at DLR-85) and holds five `useState` calls — still inside
the 400-line budget, but the next surface added here should probably convert it to a reducer. The three
DLR-90/91/92 item tickets each cost it two or three prop lines and no new state.

## The state

```tsx
const [run, setRun] = useState(startRun)
const [hand, setHand] = useState(1)
const [dealt, setDealt] = useState<WarCouncilState>(() => dealRound(dealerForRound(1), Math.random))
const [tricks, setTricks] = useState<TrickTally>(NO_TRICKS)
const [phase, setPhase] = useState<RunPhase>(RunPhase.Start) // DLR-84, widened DLR-85
```

**DLR-85 renamed `between`/`setBetween` to `phase`/`setPhase` and opened it on `RunPhase.Start`.** The
app therefore no longer opens on fight one — it opens on the start screen. Five `useState` calls, the
same as before: the start screen and the map cost **no new state variable**, which is the whole
argument for widening the union rather than adding a boolean beside it.

`run` replaced the separate `encounter` state DLR-71 introduced — the encounter now lives *inside*
`RunState`, so there is one owner rather than two things to keep in step.

**`hand` is monotonic across the whole run and is never reset per fight.** It is React's remount
`key`, so every hand needs a distinct one, and it feeds `dealerForRound`'s parity — counting on
across a fight boundary is what keeps the dealer alternating naturally rather than restarting the
alternation at every new Quarry. `handleNewRun` is the only thing that sets it back to 1, because
that genuinely is a new run.

`tricks` is the **deciding hand's** trick split, captured when an encounter resolves so the verdict
can draw its bar row. Nothing in the engine accumulates tricks across the several hands a fight
takes, so the last hand's figures are the only ones that exist — see
[../run-ui/README.md](../run-ui/README.md).

## What replaced `SLICE_ENCOUNTER_INDEX` and `MAX_HEALTH`

Both module-level constants are **gone**. `SLICE_ENCOUNTER_INDEX = 0` was a placeholder for the
sequence that now exists; the live index is `run.encounterIndex`.

`MAX_HEALTH` stopped being a module constant for a substantive reason rather than a stylistic one:
**the Quarry's maximum now changes with every fight of the run**, so a module-scope value computed
once would have been correct only for fight 1 and would have silently mis-drawn every later bar. It
is derived per render instead:

```tsx
const maxHealth = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(run.encounterIndex),
}
```

The player's half stays `PLAYER_START_HEALTH` — that is the bar's **denominator**, not its current
value, and it does not change as health is carried down. The Quarry's is read from the same index
the encounter was started from, so a bar's maximum cannot disagree with its opening value. This is
the one place a stale maximum would be invisible, which is why it is derived from `run` rather than
tracked separately.

`HUNT` survives at module scope, correctly: it is built purely from `SLICE_QUARRY_CHARACTER` and
holds no per-run state. **DLR-85 left it there deliberately.** The roster it added names opponents on
every *run-level* surface, but the fight screen's dossier is out of that ticket's scope, so every
fight still faces the same character on the felt while the map, the verdict, the shop and the status
band all name the real opponent.

## The roster reads, derived once per render (DLR-85)

`App.tsx` is **the only file that reads the roster**, and it hands names down as plain strings — no
component looks an opponent up for itself.

```tsx
const beaten = beatenCount(run)
const stages = runPath(beaten)
const goalText = runGoalText(run.encounterCount)
const currentName = runEncounterAt(run.encounterIndex).name
const nextName =
  run.encounterIndex + 1 < run.encounterCount ? runEncounterAt(run.encounterIndex + 1).name : undefined
```

Three things about this are load-bearing:

- **`beatenCount` is called, never re-derived.** `run.encounterIndex` alone is wrong on a
  won-but-not-yet-advanced run, and getting it wrong would mark the opponent just beaten as the one
  about to be fought. That correction lives once, in `src/hunt/run.ts` — see
  [../hunt/run-path-and-the-roster.md](../hunt/run-path-and-the-roster.md).
- **`nextName` is `undefined` exactly when there is no next fight** — the final encounter of a won run.
  That is the case `fightLabel`'s callers fall back on rather than throw on, which is why
  `runEncounterAt(run.encounterIndex + 1)` is guarded here rather than allowed to raise its own
  `RangeError`.
- **`stages` is not memoised.** `runPath` is one O(n) pass over twenty-five entries on a click-driven
  render, and `react-frontend` forbids `useMemo` without profiling evidence — there is none.

`currentName` does double duty: it names the felt's status band during the fight (the opponent being
fought) and the verdict's headline after it (the opponent just beaten). Those are **the same
encounter** — `recordEncounter` does not advance `encounterIndex` — so one derivation serves both
without an off-by-one.

## The transitions, all click handlers

**Four since DLR-93** — `handleComplete`, `handleContinue`, `handleBuy` and `handleDrinkFlask`. There
is still no effect anywhere in the file.

```tsx
function handleComplete(result: WarCouncilRoundResult) {
  const recorded = recordEncounter(
    run, result.encounter, result.cheats, result.envenomCharges, result.poisonGuardHeld,
  )
  setRun(recorded)
  if (isEncounterResolved(recorded.encounter)) {
    setTricks({ taken: …[Player], lost: …[Cpu] })
    return // The verdict is next, not another hand. D5 — any queued poison is discarded, because
           // advanceRun and startRun both re-seed the encounter through startEncounter.
  }
  // D1 — nothing is owed at a hand boundary any more. Poison is paid by the reducer's
  // applyResolution at the trick that resolves it, so an unresolved hand simply deals the next one.
  dealNextHand()
}
```

**DLR-90 restructured this handler and DLR-91 simplified it back**, and the pair is worth reading
together because the second change is a deletion.

DLR-90 moved the `setRun` call *inside* the branches, because the run being committed differed between
them: a resolved encounter committed `recorded`, and a live one committed whatever a `beginNextHand`
transition produced — the one place a queued Envenom hit was paid, at the deal of the next hand. A
delayed hit can be a killing blow, so the handler then had to **re-check resolution afterwards**,
against the run that transition produced rather than the one recorded above, or it would deal a hand
into an encounter that was already over.

**DLR-91 deleted all of that.** Poison now lands at the resolution of the next trick, folded into that
trick's own damage by `roundReducer.ts` — so by the time a hand reports upward there is nothing left
owing, `beginNextHand` was deleted from `src/hunt/run.ts`, and the driver's call and its downstream
re-check went with it. One `setRun` serves both branches again. The comment marking the *absence* stays,
because "we deliberately do nothing at a hand boundary now" is invisible otherwise — and because a
poison booked by the finished hand's last trick rides on `encounter.pendingEnvenom` into the next hand's
first trick, which is D5's carry half and is easy to mistake for a leak.

**The already-resolved branch still pays nothing and still needs no clear step.** `advanceRun` and
`startRun` both re-seed the encounter through `startEncounter`, which zeroes the queue, so a booking
cannot survive a fight or a run boundary.

`handleNewRun` calls `startRun`, clears the tally, resets `hand` to 1, and deals fresh. Advancing to the
next fight is `leaveForNextFight`, below.

**DLR-85 changed one line of it, and that line is the whole of AC10.** It now sets `RunPhase.Start`
rather than `RunPhase.Verdict`, so **losing a run returns to the start screen** instead of dropping
straight into fight one. "Starting again resets the path" then follows **by construction** rather than by
a second reset step: `startRun()` returns `encounterIndex: 0` with a fresh encounter, so `beatenCount` is
0 and every node on the map is `Upcoming` again. Nothing clears the path, because nothing owns it.

**DLR-92 added two props and NO argument, which is the notable part.** The Whetstone count is a run figure
the card layer needs and **cannot change**, so it goes down and never comes back: the shop gains
`whetstones={run.whetstones}` plus a fifth `refusals` entry, and the mount gains

```tsx
bankClimbBonus={bankClimbBonusFor(run)}
```

**That line is the whole crossing between the run and the card layer, and the shape of it is deliberate.**
It hands over a **number**, not a `RunState` and not an item count, so `src/warCouncil/` never learns what a
Whetstone is — a contract-phase grep enforces that the card layer names neither `Whetstone` nor `RunState` in
code. And it calls `bankClimbBonusFor` rather than passing `run.whetstones` straight through, so the rule
"+1 per copy" lives in `src/hunt/run.ts` where a reviewer looks for it rather than in a JSX prop where nobody
would.

`recordEncounter`'s signature was **left alone**, and that is the point: `whetstones` rides its `...run`
spread exactly as `coins` does, because unlike the Cheats, the charges and the Guard, a hand has no way to
spend one. So the five-parameter call below did **not** become a six-parameter call, and the `HandOutcome`
refactor it predicts is still owed at the next *spendable* run figure rather than at the next figure of any
kind.

**DLR-91 added the fifth argument and two more props, exactly as DLR-90 predicted.**
`recordEncounter` takes the Poison Guard the hand finished holding — `result.poisonGuardHeld`, through
the same `WarCouncilRoundResult` round trip — and both the mount and the shop gain it on the way down
(`poisonGuardHeld={run.poisonGuardHeld}`), plus a fourth `refusals` entry for the new item.
**The fifth argument is the one that is not adopted verbatim**: `recordEncounter` passes it through a
private `guardAfter`, so a Guard dies with the fight it was bought for. See
[../hunt/poison-guard.md](../hunt/poison-guard.md).

So DLR-90's note now reads as a warning met rather than a prediction: this is a **five-parameter call
carrying four hand-returned run figures**, and the right answer at the sixth is a single `HandOutcome`
object rather than a seventh parameter.

**DLR-90 added the fourth argument and two props.** `recordEncounter` takes the Envenom charges a hand
finished with — `result.envenomCharges`, through the same `WarCouncilRoundResult` round trip `encounter`
and `cheats` already used — and both the mount and the shop gain a count on the way down
(`envenomCharges={run.envenomCharges}`). Required for the same reason the third is, below.

**DLR-83 added the third argument and one prop, and nothing else.** `recordEncounter` now takes the
Cheats a hand finished with — `result.cheats`, arriving through the same `WarCouncilRoundResult`
round trip `encounter` already used — and the mount gains `cheats={run.cheats}` on the way down. The
parameter is **required**, deliberately: an optional one would let this function silently drop a
spend, and the run would quietly refill the slot on the next hand.

Neither of the other two handlers needed a line. `handleNextFight` carries the slots into the next
fight because `advanceRun`'s existing `...run` spread already does it, and `handleNewRun` re-grants
from configuration because `startRun` does. No new state, no new effect — this driver still holds
none. See [../hunt/cheats-and-slots.md](../hunt/cheats-and-slots.md).

## The phase union (DLR-84, widened DLR-85)

```ts
const RunPhase = {
  Start: 'start', // DLR-85
  Verdict: 'verdict',
  Warned: 'warned',
  Shop: 'shop',
  Map: 'map', // DLR-85
} as const
```

**A union rather than booleans beside each other, because "in the shop AND warned" is a state that must
not exist.** It is declared at module scope beside `HUNT` and `NO_TRICKS`, and held in one `useState`.

**DLR-85 widened it from `BetweenPhase` and the argument extends unchanged**: folding the start screen in
here makes **"in the shop before the run began" unrepresentable for free**, where a sixth `useState` would
have made it merely unlikely. The rename was safe to do wholesale — `BetweenPhase` had **eleven
references, every one of them inside this file**, so no external reader could break, and a grep confirms
zero remain.

The union's two new members are gated differently, and the asymmetry is deliberate:

- **`Start` is checked before everything**, including before `encounterOver`, because it precedes the run
  rather than sitting between fights.
- **`Map` is checked as `encounterOver && phase === RunPhase.Map`**, exactly like `Shop`, because it is a
  between-fights surface. Neither can be reached with `encounterOver` false: the only thing that sets
  them is `RunOutcomePanel`'s `onMap` / `onShop`, and that panel only renders when the encounter is over.

The driver owns it rather than the panel, for the same reason the driver owns `canContinue`:
`RunOutcomePanel` derives nothing, and a second state owner for the same moment is the copy that
drifts.

### One call to `advanceRun`, reached from three controls

```ts
function leaveForNextFight() {
  setRun(advanceRun(run))
  setPhase(RunPhase.Verdict)
  setTricks(NO_TRICKS)
  dealNextHand()
}
```

`Continue` on an unwarned verdict, `Continue anyway` on a warned one, and `Next fight` in the shop
all reach it — so three controls cannot each grow their own copy of "start the next fight".

### The guard on `Continue`

```ts
function handleContinue() {
  if (phase === RunPhase.Verdict && canBuyAnything(stock)) {
    setPhase(RunPhase.Warned)
    return
  }
  leaveForNextFight()
}
```

`stock` is `shopStockFor(run)`, derived once per render and used for both this predicate and the
`refusals` record the shop is handed. So the warning reads **the same rule** the shop's buttons grey
on, and cannot claim there is something to buy while every purchase card is disabled.

`Shop` is unguarded — `setPhase(RunPhase.Shop)` — because a player is always allowed to go and
look.

### The purchase handler, and the race it closes

```ts
function handleBuy(item: ShopItem) {
  setRun((r) => (refusalFor(shopStockFor(r), item) !== null ? r : buyFromShop(r, item)))
}
```

Two things are going on here and both are deliberate.

**The functional updater** means two clicks batched into one render cannot both compute from the
same stale `run` and lose a purchase — React applies queued updaters in sequence, each seeing the
previous one's result.

**The inner refusal re-check** is what stops that same sequence *throwing*. `buyFromShop` throws a
`RangeError` on a refused purchase, and the disabled state that would normally prevent one only
lands on the render *after* the first click. A rapid double-click on the last affordable purchase —
the second free Cheat slot, or an only-just-affordable Heal — would otherwise reach the throw, and
**there is no error boundary in this app**, so it would white-screen rather than reject the
purchase. Re-deriving against whichever run the updater actually sees turns that second click into a
no-op. This was found by the DLR-84 defender review and verified live afterwards: two rapid clicks
on Heal deduct one coin and heal once.

Note that it is a **third reading of the exported `refusalFor`**, not a re-derivation from raw
fields — which is what keeps the single-predicate discipline intact. The whole expression stays pure
and idempotent, so StrictMode's development double-invocation of the updater recomputes an identical
value.

### The drink handler is the same shape, for the same reason (DLR-93)

```ts
function handleDrinkFlask() {
  setRun((r) => (flaskRefusalFor(flaskStockFor(r)) !== null ? r : drinkFlask(r)))
}
```

`handleBuy` with a different predicate and a different transition — deliberately identical in shape,
because the race is identical. `disabled` only lands on the render *after* a drink, so a double-click
or a fast repeated key-activation would otherwise reach `drinkFlask` with the charge already spent and
hit its deliberate throw, white-screening an app with no error boundary. Re-deriving `flaskRefusalFor`
against whichever run the updater actually sees turns the second activation into a no-op.

It is a **second reading of the exported `flaskRefusalFor`**, not a re-derivation from raw fields — the
same single-predicate discipline, and the reason the disabled button and the throw cannot disagree.
`ShopPanel` receives the refusal as a prop from the same expression evaluated during render.

The unresolved-encounter guard inside `drinkFlask` is unreachable from here by construction:
`ShopPanel` is mounted only under `RunPhase.Shop`, which is only reachable once `encounterOver`.

**There is no `useEffect` anywhere in this file, and that is load-bearing rather than incidental.**
Every transition above is a callback fired from a control, so there is no listener, timer,
observer, `requestAnimationFrame` or `AbortController` introduced and nothing to release. React
StrictMode's development double-mount only re-runs the two pure lazy initialisers; `dealRound` takes
`Math.random` and will produce a different deal on the second invocation, but React discards the
second initialiser's result — which is exactly the behaviour that shipped before DLR-82, unchanged.

The alternative — reporting a resolved encounter upward from an effect — was available and was
deliberately not taken, precisely because StrictMode would fire it twice.

## The render switch

```tsx
if (phase === RunPhase.Start) {                       // DLR-85 — precedes the run, so it is first
  return <RunPathScreen title={START_TITLE} stages={stages} goalText={goalText}
    actionLabel={fightLabel(currentName)} onAction={() => setPhase(RunPhase.Verdict)} />
}
if (encounterOver && phase === RunPhase.Map) {        // DLR-85 — same component, different two strings
  return <RunPathScreen title={MAP_TITLE} stages={stages} goalText={goalText}
    actionLabel={MAP_BACK_LABEL} onAction={() => setPhase(RunPhase.Verdict)} />
}
if (encounterOver && phase === RunPhase.Shop) {
  return <ShopPanel coins={run.coins} nextOpponentName={nextName} refusals={{ … refusalFor(stock, item) … }} onBuy={handleBuy} onLeave={leaveForNextFight}
    flaskCharges={run.flaskCharges} flaskRefusal={flaskRefusalFor(flaskStockFor(run))} onDrinkFlask={handleDrinkFlask} … />   // DLR-93
}
if (encounterOver) {
  return <RunOutcomePanel outcome={run.outcome} canContinue={canAdvanceRun(run)} coins={run.coins}
    warning={phase === RunPhase.Warned} onShop={…} onContinue={handleContinue}
    beatenName={currentName} nextName={nextName} onMap={() => setPhase(RunPhase.Map)} … />
}
return <WarCouncilRound key={hand} … runLabel={runPositionLabel(run.encounterIndex, run.encounterCount, currentName)} coins={run.coins} bankClimbBonus={bankClimbBonusFor(run)} onComplete={handleComplete} />
```

The shop branch sits **before** the verdict branch, so the two cannot both match, and the map branch sits
before the shop for the same reason. **The `Start` branch sits ahead of all of them and is the only one
not gated on `encounterOver`** — it is the surface shown before any fight exists, so an
`encounterOver` test would be meaningless there.

**Both `RunPathScreen` mounts are the same component with two strings different** — a title and an action
label. That is the entire difference between the start screen and the between-fights map, and it is why
one component serves both rather than two near-identical siblings. `Start`'s action begins the run by
moving to `Verdict`; `Map`'s action goes back to `Verdict`. See
[../run-ui/run-map-and-the-path-screen.md](../run-ui/run-map-and-the-path-screen.md).

**`ShopPanel`'s `nextOpponentName` was a real defect until DLR-85.** It read
`quarryCharacterInfo(SLICE_QUARRY_CHARACTER)?.name`, so the shop announced **"The Monarch"** as the next
opponent on every fight of the run. It now reads `nextName` from the roster. `quarryCharacterInfo`'s
import was dropped from this file with the change; `SLICE_QUARRY_CHARACTER` stays, because it still feeds
the module-scope `HUNT`.

`ShopPanel`'s `progressText` is `runProgressText(run.encounterIndex + 1, run.encounterCount)`, and
the `+ 1` is correct rather than an off-by-one: `recordEncounter` does not advance
`encounterIndex`, so at shop time it still holds the **just-won** fight's 0-based index, and the
coming fight's is one higher. `runLabels.ts`'s own `runVerdictDetail` uses the identical expression
for the identical reason. All three DLR-84 reviewers checked this independently and QA confirmed it
live — the shop reads "Fight 2 of 3" after winning fight 1. (Since DLR-85 that same expression reads
"Fight 2 of 25", because the run's length grew; the arithmetic is unchanged.)

`canContinue` is computed by `canAdvanceRun` **here and handed down**, so the panel cannot disagree
with the run module about whether the run is over. The verdict is a separate full surface owned by
`App` rather than a branch inside `WarCouncilRound`: the card layer implements a card-layer
contract and knows nothing about runs, and threading run state through it for one screen would make
it depend on the run layer. Keeping the split is what makes "existing encounter behaviour is
unchanged" true by construction rather than by intention.

The card layer learns the run's position as a **pre-formatted `runLabel: string`**, never as a
`RunState` — a string prop renders and cannot grow into a second run-state consumer. **DLR-85 changed
what that string says and nothing about how it travels**: `runProgressText(index, count)` became
`runPositionLabel(index, count, currentName)`, so the band reads `Fight 1 of 25 — Aoife`. The prop's type
is still `string`, so `WarCouncilMountProps` needed no edit at all — which is the payoff of having made
it a worded string in the first place.

**DLR-85 added no effect either**, so the no-`useEffect` property above still holds for the whole file.
Every new transition is a `setPhase` call fired from a control, and `RunPathScreen`'s `Escape` handling is
a container `onKeyDown` inside that component rather than a document listener here. On StrictMode's
development double-mount the app returns to `RunPhase.Start`, which is the correct initial state.

## `dealerForRound` alternates the dealer by round parity

`src/app/dealerForRound.ts` is a small pure function, unchanged by DLR-82: round 1 deals to a
placeholder `FIRST_DEALER` constant (`PlayerSide.Player`), and every later round alternates by
parity alone — `(round - 1) % 2 === 0` picks `FIRST_DEALER`, otherwise the other side. It is
unit-tested directly (`src/app/__tests__/dealerForRound.test.ts`). Because `hand` keeps counting
across fight boundaries, the alternation continues unbroken into each new Quarry.
