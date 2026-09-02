# App shell — `src/app/`

**Status:** implemented
**Built by:** SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47, DLR-53, DLR-63, DLR-67, DLR-71, DLR-80, DLR-81, DLR-82, DLR-83, DLR-84, DLR-85, DLR-90, DLR-91, DLR-92, DLR-93, DLR-95, DLR-100, DLR-114, DLR-116, DLR-118, DLR-125, DLR-131, DLR-132, DLR-145, DLR-150, DLR-156, DLR-158, DLR-159

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

**`src/app/run/` is the run layer's own screens**, added by DLR-82, DLR-84 and DLR-85 and documented
separately in [../run-ui/README.md](../run-ui/README.md) — the full-viewport surface shown whenever
a fight or the run resolves, the shop the player may enter from it, and (DLR-85) the path screen that
serves both as the start screen before fight one and as the map reached between fights.

Outside those two subfolders this module held no runtime logic at all — only the two type
declarations in `warCouncilMount.ts` — until DLR-131 added `ErrorBoundary.tsx`, `errorLabels.ts` and
`errorBoundary.css` directly under `src/app/`: the app's one root-mounted recovery surface, documented
at [error-boundary.md](error-boundary.md). `src/App.tsx` and `src/app/dealerForRound.ts` do the actual
mount wiring (see _How it works_ below) — `src/App.tsx` lives at the project root, not inside this
folder. This module has no pure-core ESLint boundary and does not need one — it is expected to
import React, and `src/app/warCouncil/` does.

## Key types & exports

| Export                  | Purpose                                                                                                                                                                                                                                                                                                                                                                                 | File                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `WarCouncilMountProps`  | Props a War Council mount accepts: `initialState`, a required `hunt: Hunt` (DLR-53), a required `encounter: EncounterState` and `maxHealth` (DLR-71), a required `runLabel: string` (DLR-82), a required `cheats` (DLR-83), a required `coins: Coins` (DLR-84), a required `discardsRemaining: number` (DLR-100) and a required `buffs: readonly Buff[]` (DLR-114) in; `onComplete` out | `warCouncilMount.ts` |
| `WarCouncilRoundResult` | What a completed War Council round reports: `finalState` + `encounter`, the `EncounterState` **after** this Hunt's damage was applied (DLR-71); also carries the survivors of every hand-owned run resource, including `discardsRemaining` since DLR-100 and, since DLR-125, `coinsEarned: Coins` — the Purse coins this hand's fired buffs earned, already clipped at `MAX_COIN_BONUS_PER_HAND` by the accrual, required, with both construction sites in `WarCouncilRound.tsx`                                                                                                                                | `warCouncilMount.ts` |
| `ErrorBoundary` (default) | DLR-131 — the only class in `src/`. Catches a render/lifecycle throw beneath it, `getDerivedStateFromError` normalises whatever was thrown into an `Error`, `render` returns `children` untouched while `state.error` is `null` and a full-viewport fallback panel otherwise. No `componentDidCatch` — React already logs the error and its component stack, and `console.log`/`console.debug` are forbidden in shipped code. | `ErrorBoundary.tsx` |
| `ERROR_FALLBACK_*` (six constants) | Every string the fallback renders — title, the two body sentences (run lost / Vault should still be there), the detail label, and the two control labels — following `runLabels.ts`/`vaultLabels.ts`'s named-constant pattern. | `errorLabels.ts` |

DLR-53 added `hunt: Hunt` as a **required** field — `src/hunt`'s own pairing, widened by DLR-63 to
`{ quarry, demand, loseCredits }` and then **narrowed by DLR-67 to `{ quarry }`** when the Demand and
the Lose-credit pool were both retired. `warCouncilMount.ts` needed no edit for any of that: it merely
declares the prop, and `Hunt` changes underneath it.

Required rather than optional keeps earning its place — a required-field change breaks every
construction site at compile time rather than rendering `undefined`. DLR-67's narrowing is the case
that proved it in the deletion direction: the compiler found both construction sites.

DLR-71 added `encounter` and `maxHealth`, both required for the same reason `hunt` is. `maxHealth` is
**not derivable from `EncounterState`**, which carries current health only — the bars need the
denominator separately.

**DLR-82 added `runLabel: string`, and its type is the point.** The card layer renders which fight
of the run the player is on, and must not be able to read or change the run — so it receives a
string the run layer has **already worded**, never a `RunState`. A `string` prop renders and cannot
grow into a second run-state consumer; a `RunState` prop would invite one. It is required rather
than optional for the usual reason, and that earned its place immediately: the compiler enumerated
all four construction sites (`App.tsx` plus three in the component specs) rather than letting one
silently render an empty band.

**DLR-84 added `coins: Coins`, and it follows `runLabel`'s precedent exactly.** The card layer
renders the run's purse on its status band and must not be able to read or change the run, so it
receives **a number** — not a `RunState`, and not a projection it could grow into a second
run-state consumer. Required rather than optional for the usual reason, and it earned that
immediately: the compiler enumerated all four mount sites (`App.tsx` plus one render helper and
three JSX mounts in the component specs) rather than letting one silently render a blank plate.

**DLR-100 added `discardsRemaining: number`, following `timebombCharges`'s precedent rather than a
new pattern.** `App.tsx`'s `<WarCouncilRound>` JSX gained `discardsRemaining={run.discardsRemaining}`
and `handleComplete`'s `recordEncounter` call gained `result.discardsRemaining` as its sixth
argument, between `result.blastGuardHeld` and `result.unplayedAtResolve`. Widening
`recordEncounter`'s signature surfaced a wider set of call sites than the contract's own audit
predicted — six pre-existing `src/hunt/__tests__/` files still on the old six-argument form, beyond
`App.tsx` — all fixed inline in the same task. See
[../hunt/the-discard-budget.md](../hunt/the-discard-budget.md).

**DLR-114 added `buffs: readonly Buff[]`, and it is the first prop of this family that does NOT come
back on `WarCouncilRoundResult`.** `App.tsx`'s `<WarCouncilRound>` JSX gained `buffs={run.buffs}`, and
that is the whole of the wiring — `handleComplete` and `recordEncounter` were untouched. The reason is
a rule rather than an omission: **a hand spends action points, not cards**, so a hand cannot add to,
remove from, or reorder the run's owned pile, and handing it back would invite a future writer to
think it could. That makes it `baseDamageBonus`'s contract (mirrored in, never returned) rather than
`cheats`' or `timebombCharges`' (mirrored in, spent, returned).

It is **required** rather than optional for the usual reason, and that earned its place immediately:
the compiler enumerated the one production mount site plus the round fixture and three
`WarCouncilRound.*.test.tsx` files, rather than letting one silently render an empty loadout. The
card layer receives the pile itself here rather than a pre-worded projection — unlike `runLabel` and
`coins` — because the loadout panel must render one row per buff with its own price, which no single
string or number can carry; the felt still cannot read or change `RunState`, and the pile it is handed
is `readonly`. See
[../war-council-ui/action-bar-and-loadout.md](../war-council-ui/action-bar-and-loadout.md).

**`encounter` is no longer constant for the hand.** Until DLR-80 health changed only at trick 13, so
the prop was a fixed input for the whole round. Since DLR-80 the prop **seeds** the reducer, which
owns the live state and applies each trick's damage as it lands; `onComplete` hands the final state
back. Both docblocks on `warCouncilMount.ts` were corrected in that ticket, because both asserted the
trick-13 behaviour outright.

> **`WarCouncilRoundResult.finalState.phase` is not guaranteed to be `Complete`.** `handleCarryOn`
> calls `onComplete` the moment the encounter resolves, with no phase check — and since damage lands
> per trick, that can happen on trick 3 of 6. A reader wanting to know whether the fight is over
> should check `encounter`, not `finalState.phase`. The docblock says so since DLR-80, and a
> regression test drives that exact path.

**`WarCouncilRoundResult.score` became `damage` on DLR-67, and `damage` became `encounter` on
DLR-71.** An audit before the second change found **1 producer and 0 consumers** — the field had never
been read, and `App.tsx`'s `handleComplete` took no parameter at all — so replacing the shape outright
was free, and the type widened from two numbers to a state object rather than narrowing. What it buys
is not brevity: the mount hands up **the encounter the player just watched the damage land on**,
already applied by the reducer. `App` _sets_ it rather than re-applying it, which makes applying a
hand's damage twice **unexpressible** rather than merely unlikely.

**DLR-150 added `screenFor.ts`, and moved `RunPhase` into it.** `screenFor(phase, encounterOver)` is
`App.tsx`'s seven-branch screen ternary as a pure, unit-testable function returning
`AppScreen` (`'start' | 'map' | 'shop' | 'manageBuffs' | 'vault' | 'verdict' | 'warCouncil'` since
DLR-159), so the render and
`debugState`'s mirror cannot disagree about which screen is up — the property the inline chain's own
comment already claimed. `RunPhase` moved with it because `screenFor` is the only reader that needs
the union outside the component; it is deliberately **not** re-exported through `../hunt`, since
`RunState` carries no notion of "which screen". The extraction was forced by the 400-line budget:
`App.tsx` stood at 399 and this ticket adds to it.

`WarCouncilMountProps` gained an optional `feederCarry?: BuffCarry` (defaulted to
`EMPTY_BUFF_CARRY`, `apCapacity`'s precedent) and `WarCouncilRoundResult` a **required**
`feederCarry: BuffCarry` (`coinsEarned`'s precedent, so the compiler enumerates every construction
site). `App.tsx` passes `run.feederCarry` down and `result.feederCarry` back into `recordEncounter`.
See [hunt/the-feeder-carry.md](../hunt/the-feeder-carry.md).

Both are type-only exports, re-exported via `export type` from `index.ts` (required by this
project's `verbatimModuleSyntax` tsconfig setting). `src/app/warCouncil/`'s own exports —
`WarCouncilRound`, `roundReducer`, `labels.ts`, `cardFace.ts`, `useRovingTabIndex`, and the zone
components — are tabulated in [../war-council-ui/README.md](../war-council-ui/README.md), not here.

## How it works

- [`App.tsx` as the run driver, and `dealerForRound`](run-driver.md) — the four pieces of state and
  why the hand counter never resets, what replaced `SLICE_ENCOUNTER_INDEX` and `MAX_HEALTH` and why
  the Quarry's denominator had to become per-render, the three click-handler transitions, why there
  is no effect in the file at all, the felt-versus-verdict render switch, and — since DLR-85 — the
  widened `RunPhase` union, the roster reads that make this the only file naming an opponent, the two
  `RunPathScreen` mounts, and the one line of `handleNewRun` that is the whole of AC10 (DLR-71,
  DLR-80, DLR-82, DLR-84, DLR-85), and — since DLR-150 — the screen switch living in `screenFor.ts`
  as a pure function, `RunPhase` moving there with it, and the Feeder carry threaded down and back.

- [The `ErrorBoundary`](error-boundary.md) — where it is mounted and why root-only, why it is the
  only class in `src/`, what it does not catch, and what the fallback promises and refuses to
  promise about the run and the Vault.

**DLR-125 added one argument to a call the driver already makes.** `App.tsx` now passes
`result.coinsEarned` as `recordEncounter`'s **optional eighth** parameter, `buffCoinsEarned` — the
Purse coins a hand's fired buffs earned. The driver performs no arithmetic on it and applies no
condition to it: the figure was clipped at `MAX_COIN_BONUS_PER_HAND` by the accrual, and
`recordEncounter` adds it **outside** its own won-this-encounter branch, so a Purse contribution
lands on a lost fight too. That keeps the "the driver calls the rules and does no arithmetic of its
own" property DLR-82 established intact.

**The historical shape, for orientation:** through DLR-71 this file held a round number, the dealt
`RoundState` and a single live `EncounterState`, with a module-scope `SLICE_ENCOUNTER_INDEX = 0`
standing in for a sequence that did not exist. DLR-82 replaced all of that with a `RunState`; both
that constant and the module-scope `MAX_HEALTH` beside it are **deleted**, not renamed.

## Rules & invariants enforced

- Every field on `WarCouncilMountProps` and `WarCouncilRoundResult` is `readonly`.
- No pure-core ESLint boundary applies to this folder (deliberate — it is expected to import
  React), and none was added to it.
- No lint rule is suppressed anywhere in the module, and there is no `any` and no module-level
  mutable state.
- **`ErrorBoundary` is the only class in `src/`, and must stay one** (DLR-131) —
  `getDerivedStateFromError`/`componentDidCatch` have no hook equivalent in React 19, so converting
  the file to a function component would silently delete the mechanism while still type-checking,
  linting, and rendering. See [error-boundary.md](error-boundary.md).
- `src/app/warCouncil/`'s own invariants — no effect at all in `WarCouncilRound`, the reducer, the
  roving tabindex, the two `cpuFault` cases — are listed in
  [../war-council-ui/README.md](../war-council-ui/README.md).

## Deferred / not yet implemented

- **The run loop across encounters is BUILT** (DLR-82) — this entry has narrowed four times and is
  now closed. DLR-53 made one Hunt playable end to end; DLR-68 closed the arithmetic; DLR-70 built
  the health and both end conditions **and none of it reached this module**; DLR-71 wired the
  encounter in; DLR-80 moved where damage is applied. **DLR-82 built the sequence.** `App.tsx` holds
  a `RunState`, three fights run in order on one health bar that is never restored, winning advances
  and losing ends the run, and a full-screen verdict states which of the three happened. What
  remains deliberately absent here is narrower than "the loop":
  - **No _automatic_ between-encounter restore.** `ENCOUNTER_PLAYER_RESTORE` still has **no
    consumer**. DLR-82 forbade wiring it in until the flask was designed; **DLR-93 designed and built
    the flask and still did not wire it**, because a restore the game performs for you and a charge
    you choose to spend are different mechanics. A final-verification grep guards the absence, re-run
    by all three contracts. The driver _does_ now hold a player-triggered heal — `handleDrinkFlask`,
    reached only from `RunPhase.Shop`.
  - **No Forage step between Hunts.** A currency and a shop **do** exist since DLR-84 — the driver
    holds a three-state `between` phase (verdict / warned / shop) and mounts `ShopPanel` from it —
    but Forage is untouched and `FORAGE_BUDGET_PER_ENCOUNTER` still has no consumer.
  - **Stages and bosses exist as SHAPE, not as behaviour** (DLR-85). The run is twenty-five fights
    grouped into **five stages of four ordinary opponents and a boss**, and the driver draws that shape
    on a start screen and a between-fights map. But **every opponent still plays identically** and
    differs only in health and name: a "boss" is a filled block on the map and a bigger health figure,
    with no power, no gimmick and no rule-break. Diarmuid is intended to ignore follow-suit; that is a
    later ticket's, and nothing about it is built.
  - **No persistence.** A page reload starts a new run; nothing is saved. That is also why DLR-159's
    combined cards need no persistence work of their own: `RunState.buffs` and `nextBuffId` are never
    written to storage, so a produced card survives exactly what the rest of the run survives.
- **DLR-159 added a seventh screen, and it is the shop's only child** (`RunPhase.ManageBuffs`). It is
  guarded `encounterOver && phase === RunPhase.ManageBuffs`, exactly like `Shop`, `Map` and `Vault`;
  it is set only by `ShopPanel`'s `onManageBuffs` and returns only to `RunPhase.Shop`. Making it a
  phase rather than a flag inside `ShopPanel` is what keeps it visible to `screenFor` — and therefore
  to `debugState`'s mirror, whose `screen` union was widened in the same pass. Its state lives in
  `useManageBuffs(run, setRun)`, called unconditionally at the top level as `useShopSlot` is, and
  returning the panel's whole props object so the new branch costs about eight lines. **`App.tsx`
  finished this contract at 399 lines against the 400-line budget** — see the reducer note below,
  which is now overdue rather than approaching.
- **The driver opens on a start screen and returns to one on a loss** (DLR-85). `App.tsx`'s phase union
  widened from DLR-84's `BetweenPhase` (verdict / warned / shop) to `RunPhase` carrying `Start` and
  `Map` as well, and `handleNewRun` now sets `RunPhase.Start` rather than dropping straight into fight
  one. Folding the start screen into the same union cost **no new state variable** and made "in the shop
  before the run began" unrepresentable for free. See [the run driver](run-driver.md).
- **`App.tsx` is approaching reducer territory, and was deliberately not converted** (DLR-85,
  **still true and closer after DLR-93**). It is **304** lines — 262 at DLR-85, 208 before that — and
  holds five `useState` calls plus the widened `RunPhase`. That is still inside the 400-line budget and
  `react-frontend`'s reducer guidance is not yet breached, but **the next ticket that adds a surface
  here should probably convert the driver to a reducer.**
  > **It went over, 2026-08-25.** `App.tsx` measured **410 lines** at DLR-145's start — the budget is
  > blocking, not advisory — and that ticket fixed the breach in-ticket rather than reporting it:
  > extracting the hand-maintained shop-`refusals` literal to `src/app/run/shopRefusals.ts` and
  > dropping the now-dead `apCapacity` prop from two mounts took it to **399**. It is still not a
  > reducer, and the advice above still stands with less room than it had. DLR-93 added a fourth click-handler
  transition (`handleDrinkFlask`) and three props to the `ShopPanel` mount without adding state, which
  is why it did not force the question; the ticket after it may not be so cheap.
- **No way to reach a standalone/manual-entry test harness.** DLR-47 deleted
  `TestModeVanguardHost.tsx`, `TrickEntryForm.tsx`, `appMode.ts`, and `isValidTricksWon` along with
  the rest of the Vanguard UI — there is currently no manual-entry mechanism at all, campaign or
  otherwise. A future ticket should decide whether a Hunt-era equivalent is worth building.
- **`src/app/warCouncil/` carries its own deferred list** — the untested no-scroll layout, the
  defensive `cpuFault`/`cpuRejected` branch, and the single dark theme are recorded in
  [../war-council-ui/README.md](../war-council-ui/README.md).
