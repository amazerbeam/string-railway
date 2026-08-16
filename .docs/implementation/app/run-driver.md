Part of [App shell](README.md).

# `App.tsx` as the run driver, and `dealerForRound`

Since DLR-82 `src/App.tsx` is a **run driver**: a state machine that owns a `RunState`, deals hands
within a fight exactly as it did before, and switches to a full-screen verdict when a fight
resolves. It performs no health arithmetic and no index arithmetic of its own — every transition is
a call into `src/hunt/run.ts`, and every number is read from configuration.

## The four pieces of state

```tsx
const [run, setRun] = useState(startRun)
const [hand, setHand] = useState(1)
const [dealt, setDealt] = useState<WarCouncilState>(() => dealRound(dealerForRound(1), Math.random))
const [tricks, setTricks] = useState<TrickTally>(NO_TRICKS)
```

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
holds no per-run state. Every fight of the run faces the same character — DLR-82 varies only each
Quarry's health, and the roster is DLR-85's.

## The three transitions, all click handlers

```tsx
function handleComplete(result: WarCouncilRoundResult) {
  const next = recordEncounter(run, result.encounter, result.cheats)
  setRun(next)
  if (isEncounterResolved(next.encounter)) {
    setTricks({
      taken: result.finalState.tricksWon[PlayerSide.Player],
      lost: result.finalState.tricksWon[PlayerSide.Cpu],
    })
    return // The verdict is next, not another hand.
  }
  dealNextHand()
}
```

`handleNextFight` calls `advanceRun`, clears the tally and deals; `handleNewRun` calls `startRun`,
clears the tally, resets `hand` to 1 and deals fresh.

**DLR-83 added the third argument and one prop, and nothing else.** `recordEncounter` now takes the
Cheats a hand finished with — `result.cheats`, arriving through the same `WarCouncilRoundResult`
round trip `encounter` already used — and the mount gains `cheats={run.cheats}` on the way down. The
parameter is **required**, deliberately: an optional one would let this function silently drop a
spend, and the run would quietly refill the slot on the next hand.

Neither of the other two handlers needed a line. `handleNextFight` carries the slots into the next
fight because `advanceRun`'s existing `...run` spread already does it, and `handleNewRun` re-grants
from configuration because `startRun` does. No new state, no new effect — this driver still holds
none. See [../hunt/cheats-and-slots.md](../hunt/cheats-and-slots.md).

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
if (encounterOver) {
  return <RunOutcomePanel outcome={run.outcome} canContinue={canAdvanceRun(run)} … />
}
return <WarCouncilRound key={hand} … runLabel={runProgressText(…)} onComplete={handleComplete} />
```

`canContinue` is computed by `canAdvanceRun` **here and handed down**, so the panel cannot disagree
with the run module about whether the run is over. The verdict is a separate full surface owned by
`App` rather than a branch inside `WarCouncilRound`: the card layer implements a card-layer
contract and knows nothing about runs, and threading run state through it for one screen would make
it depend on the run layer. Keeping the split is what makes "existing encounter behaviour is
unchanged" true by construction rather than by intention.

The card layer learns the run's position as a **pre-formatted `runLabel: string`**, never as a
`RunState` — a string prop renders and cannot grow into a second run-state consumer.

## `dealerForRound` alternates the dealer by round parity

`src/app/dealerForRound.ts` is a small pure function, unchanged by DLR-82: round 1 deals to a
placeholder `FIRST_DEALER` constant (`PlayerSide.Player`), and every later round alternates by
parity alone — `(round - 1) % 2 === 0` picks `FIRST_DEALER`, otherwise the other side. It is
unit-tested directly (`src/app/__tests__/dealerForRound.test.ts`). Because `hand` keeps counting
across fight boundaries, the alternation continues unbroken into each new Quarry.
