# App shell — `src/app/`

**Status:** implemented
**Built by:** SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47, DLR-53, DLR-63, DLR-67, DLR-71

## Responsibility

Holds the mount-prop contract the War Council screen is written against: what props a mount
accepts on the way in (`WarCouncilMountProps`), and what it reports on the way out
(`WarCouncilRoundResult`). It belongs to `src/warCouncil/` neither more nor less than to
`src/App.tsx` — a thin sibling module holding the contract both sides compile against.

DLR-47 retired the module's second half: the Vanguard board UI, the battle-loop orchestrator, and
the App-mode/manual-trick-entry scaffolding that once bridged War Council into that loop
(`AppMode`, `isValidTricksWon`/`TricksWon`/`TRICKS_PER_ROUND`'s former home in `tricksWon.ts`, and
`vanguardMount.ts`'s types) are all gone. `src/App.tsx` now mounts the War Council round directly.

**`src/app/warCouncil/` is the real War Council round screen**, built by SCRUM-28 against
`WarCouncilMountProps` and documented separately in
[../war-council-ui/README.md](../war-council-ui/README.md).

Outside that subfolder this module now contains no runtime logic at all — only the two type
declarations in `warCouncilMount.ts`. `src/App.tsx` and `src/app/dealerForRound.ts` do the actual
mount wiring (see _How it works_ below) — `src/App.tsx` lives at the project root, not inside this
folder. This module has no pure-core ESLint boundary and does not need one — it is expected to
import React, and `src/app/warCouncil/` does.

## Key types & exports

| Export                  | Purpose                                                                    | File                 |
| ------------------------ | ---------------------------------------------------------------------------- | --------------------- |
| `WarCouncilMountProps`  | Props a War Council mount accepts: `initialState`, a required `hunt: Hunt` (DLR-53), and — since DLR-71 — a required `encounter: EncounterState` and `maxHealth: Readonly<Record<DuelSide, Health>>` in; `onComplete` out | `warCouncilMount.ts` |
| `WarCouncilRoundResult` | What a completed War Council round reports: `finalState` + `encounter`, the `EncounterState` **after** this Hunt's damage was applied (DLR-71) | `warCouncilMount.ts` |

DLR-53 added `hunt: Hunt` as a **required** field — `src/hunt`'s own pairing, widened by DLR-63 to
`{ quarry, demand, loseCredits }` and then **narrowed by DLR-67 to `{ quarry }`** when the Demand and
the Lose-credit pool were both retired. `warCouncilMount.ts` needed no edit for any of that: it merely
declares the prop, and `Hunt` changes underneath it.

Required rather than optional keeps earning its place — a required-field change breaks every
construction site at compile time rather than rendering `undefined`. DLR-67's narrowing is the case
that proved it in the deletion direction: the compiler found both construction sites.

DLR-71 added `encounter` and `maxHealth`, both required for the same reason `hunt` is. `maxHealth` is
**not derivable from `EncounterState`**, which carries current health only — the bars need the
denominator separately. `encounter` is constant for the whole round, because health only changes at
trick 13.

**`WarCouncilRoundResult.score` became `damage` on DLR-67, and `damage` became `encounter` on
DLR-71.** The first kept a `Record<PlayerSide, number>` shape, now built from `scoreHunt` per side
rather than from the deleted `scoreRound`; DLR-67 made that change because DLR-68's acceptance
criteria already named the field `damage`, so the epic's vocabulary was adopted a ticket early rather
than a second one invented, and DLR-68 duly shipped with `damage`.

The second change is the substantive one. An audit before it found **1 producer and 0 consumers** — the
field had never been read, and `App.tsx`'s `handleComplete` took no parameter at all — so replacing the
shape outright was free, and the type widened from two numbers to a state object rather than narrowing.
What it buys is not brevity: the mount now hands up **the encounter the player just watched the damage
land on**, already applied by the reducer through `applyHunt`. `App` *sets* it rather than re-applying
it, which makes applying one Hunt twice **unexpressible** rather than merely unlikely. **The result is
read now**, for the first time since SCRUM-37 declared it.

> The trade worth recording: a future caller wanting the raw per-side damage figure would read it off
> `pendingHuntDamage` rather than off the result. That is a narrowing of what the mount reports, taken
> deliberately.

Both are type-only exports, re-exported via `export type` from `index.ts` (required by this
project's `verbatimModuleSyntax` tsconfig setting). `src/app/warCouncil/`'s own exports —
`WarCouncilRound`, `roundReducer`, `labels.ts`, `fanLayout.ts`, `useRovingTabIndex`, and the zone
components — are tabulated in [../war-council-ui/README.md](../war-council-ui/README.md), not here.

## How it works

### `App.tsx` deals directly, and since DLR-71 carries an encounter across Hunts

`src/App.tsx` holds **three** pieces of state — the current round number, the currently dealt
`RoundState`, and (DLR-71) the live `EncounterState` — plus three module-scope constants, and mounts
`WarCouncilRound` (`src/app/warCouncil/WarCouncilRound.tsx`) against them directly, with no
orchestrator in between:

```tsx
// The slice's single encounter (§11): one Quarry, one health bar each. `0` indexes
// `QUARRY_ENCOUNTER_HEALTH`. DLR-73 replaces it with the encounter loop.
const SLICE_ENCOUNTER_INDEX = 0

const HUNT: Hunt = { quarry: { character: SLICE_QUARRY_CHARACTER } }

// Read from config, never written as numbers. `startEncounter` resolves the Quarry's bar from the
// same function, so the maximum and the opening value cannot disagree.
const MAX_HEALTH = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(SLICE_ENCOUNTER_INDEX),
}

const [round, setRound] = useState(1)
const [dealt, setDealt] = useState<WarCouncilState>(() =>
  dealRound(dealerForRound(1), Math.random, SLICE_QUARRY_CHARACTER),
)
const [encounter, setEncounter] = useState(() => startEncounter(SLICE_ENCOUNTER_INDEX))

function handleComplete(result: WarCouncilRoundResult) {
  setEncounter(result.encounter)
  if (isEncounterResolved(result.encounter)) {
    return // No next Hunt. The transition and outcome screens are DLR-73's.
  }
  const next = round + 1
  setRound(next)
  setDealt(dealRound(dealerForRound(next), Math.random, SLICE_QUARRY_CHARACTER))
}
```

`HUNT` and `MAX_HEALTH` live at module scope because both are built purely from configuration
constants — neither holds per-round state, so neither can go stale across the `key={round}` remounts,
and both are read-only rather than the kind of module-level mutable state this project's conventions
bar. DLR-53 started passing `SLICE_QUARRY_CHARACTER` as `dealRound`'s third argument, which is what
makes the Quarry's round-long rule-break active in the shipped app.

`MAX_HEALTH` reads `PLAYER_START_HEALTH` and `quarryHealthForEncounter` rather than stating either
number, and it reads the Quarry's from **the same function `startEncounter` uses**, so the bar's
denominator and its opening value cannot disagree.

**`SLICE_ENCOUNTER_INDEX = 0` is a placeholder, not a configuration key.** It is an array index into
`QUARRY_ENCOUNTER_HEALTH` — not a multiplier, a band boundary, a health total or a rounding rule — so
the module's no-numeric-literals invariant does not reach it, and promoting it to `src/hunt/config.ts`
would pre-empt DLR-73, which owns the loop that replaces it.

**`handleComplete` now takes its parameter**, which is the change DLR-71 made here. Through DLR-67 it
took none at all rather than an unread `_result` — this project's ESLint config has no
`argsIgnorePattern` exemption for underscore-prefixed unused parameters, so a zero-argument function
(structurally assignable to the callback type) was what actually linted clean, and the result was
deliberately unread because there was nothing to feed. There is now: the result carries the
`EncounterState` the player just watched the damage land on, already applied by the reducer through
`applyHunt`. Setting it here rather than re-applying it is what keeps **one Hunt to one application**.

Two consequences follow. The `key={round}` remount, unchanged since DLR-47, is now doing real work
beyond freshness: it resets the mount's `ui.applied` for the next Hunt **while `encounter` persists in
App**, which is the whole of the Hunt-to-Hunt health continuity. And an encounter can now **end** —
once `isEncounterResolved`, App stops dealing, so `applyHunt` is never reached in a state it would
refuse and the end panel's terminal line is the last thing on screen. That is a terminal state on a
panel that already exists, not a new screen; the real transition and outcome screens are DLR-73's.

### `dealerForRound` alternates the dealer by round parity

`src/app/dealerForRound.ts` is a small pure function: round 1 deals to a placeholder
`FIRST_DEALER` constant (`PlayerSide.Player`, carried forward from the equivalent placeholder the
now-deleted `src/battle/config.ts` shipped), and every later round alternates by parity alone —
`(round - 1) % 2 === 0` picks `FIRST_DEALER`, otherwise the other side. It has no dependency on any
deleted module and is unit-tested directly (`src/app/__tests__/dealerForRound.test.ts`).

## Rules & invariants enforced

- Every field on `WarCouncilMountProps` and `WarCouncilRoundResult` is `readonly`.
- No pure-core ESLint boundary applies to this folder (deliberate — it is expected to import
  React), and none was added to it.
- No lint rule is suppressed anywhere in the module, and there is no `any` and no module-level
  mutable state.
- `src/app/warCouncil/`'s own invariants — no effect at all in `WarCouncilRound`, the reducer, the
  roving tabindex, the two `cpuFault` cases — are listed in
  [../war-council-ui/README.md](../war-council-ui/README.md).

## Deferred / not yet implemented

- **No run loop across *encounters*** — but a single encounter now runs, ends, and can be won or lost.
  This entry has narrowed three times and DLR-71 narrowed it furthest. DLR-53 made one Hunt playable end
  to end; DLR-68 closed the arithmetic and the direction; DLR-70 built the health, the depletion and
  both end conditions **and none of it reached this module** — no file under `src/app/` imported a single
  symbol from `src/hunt/encounter.ts`, so the duel resolved under Vitest while the app could not end.
  **DLR-71 closed that gap.** `App.tsx` now imports `startEncounter` and `isEncounterResolved`, holds a
  real `EncounterState`, carries it Hunt to Hunt, and stops dealing once a bar empties; the reducer
  imports `applyHunt`, and `WarCouncilRound` imports `pendingHuntDamage` and `duelSideDamage`. A player
  can now win or lose by playing.
  What remains absent is the **sequence**: `App.tsx` holds one `SLICE_ENCOUNTER_INDEX = 0` and nothing
  advances it, so the second Quarry at 1,600 health is unreachable, `ENCOUNTER_PLAYER_RESTORE` still has
  no consumer, and there is no victory/defeat screen — when the encounter resolves the existing end
  panel states the outcome in place and stops offering a next Hunt. All of that is **DLR-73's**, as is
  the Forage step between Hunts.
- **No way to reach a standalone/manual-entry test harness.** DLR-47 deleted
  `TestModeVanguardHost.tsx`, `TrickEntryForm.tsx`, `appMode.ts`, and `isValidTricksWon` along with
  the rest of the Vanguard UI — there is currently no manual-entry mechanism at all, campaign or
  otherwise. A future ticket should decide whether a Hunt-era equivalent is worth building.
- **`src/app/warCouncil/` carries its own deferred list** — the untested no-scroll layout, the
  defensive `cpuFault`/`cpuRejected` branch, and the single dark theme are recorded in
  [../war-council-ui/README.md](../war-council-ui/README.md).
