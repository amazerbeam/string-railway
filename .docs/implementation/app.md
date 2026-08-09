# App shell — `src/app/`

**Status:** implemented
**Built by:** SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34

## Responsibility

Holds the **mount-prop contract** that each game UI is written against: what props a mount of each
game accepts on the way in, and what it reports on the way out. It belongs to neither game engine
because it is a consumer of both (`src/warCouncil/` and `src/vanguard/` types flow into it, never
the reverse), which is why it is a sibling module rather than an addition to either.

Its reason for existing early is a sequencing one: both game UIs must be mountable **two ways** —
inside the full Campaign loop (`src/battle/`), and standalone in a Test harness with no completed
War Council match behind it. Defining that contract _after_ the UI stories were built would mean
retrofitting a test harness onto UI that had assumed a single campaign flow. So this module shipped
the shapes first, plus one small validator and two throwaway stub components that proved the shapes
were genuinely callable before either real UI existed.

Both UIs now exist: **`src/app/warCouncil/` is the real War Council round screen**, built by
SCRUM-28 against `WarCouncilMountProps` and documented separately in
[war-council-ui.md](war-council-ui.md), and **`src/app/vanguard/` is the real Vanguard match
screen**, built by SCRUM-29 against `VanguardMountProps` and documented separately in
[vanguard-ui.md](vanguard-ui.md) — each is large enough to own its own file.

Outside that subfolder this module contains exactly one piece of runtime logic
(`isValidTricksWon`); everything else is either a pure type declaration or disposable scaffolding.
It has no pure-core ESLint boundary and does not need one — unlike `src/warCouncil/` and
`src/vanguard/`, this folder is _expected_ to import React, and both `warCouncil/` and `vanguard/`
do.

## Key types & exports

| Export                  | Purpose                                                                                           | File                 |
| ----------------------- | ------------------------------------------------------------------------------------------------- | -------------------- |
| `AppMode`               | `as const` map of the two top-level app modes (`Campaign` \| `Test`), plus its derived value type | `appMode.ts`         |
| `TRICKS_PER_ROUND`      | The fixed 13-trick round total a manual trick entry is validated against                          | `tricksWon.ts`       |
| `TricksWon`             | `Readonly<Record<PlayerSide, number>>` — a per-side trick count for one round                     | `tricksWon.ts`       |
| `isValidTricksWon`      | The sole gate deciding whether a trick split could have come from a real round                    | `tricksWon.ts`       |
| `WarCouncilMountProps`  | Props a War Council mount accepts: `initialState` in, `onComplete` out                            | `warCouncilMount.ts` |
| `WarCouncilRoundResult` | What a completed War Council **round** reports: `finalState` + derived `score`                    | `warCouncilMount.ts` |
| `RequestTricksWon`      | `(round: number) => Promise<TricksWon>` — the round-scoped trick-count request callback           | `vanguardMount.ts`   |
| `VanguardMountProps`    | Props a Vanguard mount accepts: `initialState`, `requestTricksWon`, `onComplete`                  | `vanguardMount.ts`   |
| `VanguardMatchResult`   | What a completed Vanguard **match** reports: `finalState` + `winner`                              | `vanguardMount.ts`   |

`src/app/warCouncil/`'s own exports — `WarCouncilRound`, `roundReducer`, `labels.ts`, `fanLayout.ts`,
`useRovingTabIndex`, and the zone components — are tabulated in
[war-council-ui.md](war-council-ui.md), not here. `src/app/vanguard/`'s own exports —
`VanguardMatch`, `matchReducer`, `hexLayout.ts`, `legalTargets.ts`, `useHexRovingFocus`,
`TrickEntryForm`, `TestModeVanguardHost`, and the board/palette/panel components — are tabulated in
[vanguard-ui.md](vanguard-ui.md), not here.

`AppMode`, `TRICKS_PER_ROUND`, and `isValidTricksWon` are re-exported from `index.ts` as values;
the six type-only exports go via `export type` (required by this project's `verbatimModuleSyntax`
tsconfig setting). `WarCouncilStub` and `VanguardStub` are both gone (see § _The two stubs, then
none_, below) — nothing under `stubs/` remains, and the folder itself was deleted with the second
stub. Neither `src/app/warCouncil/` nor `src/app/vanguard/` has a barrel: `App.tsx` and
`TestModeVanguardHost.tsx` import each mount directly by file path (`./app/warCouncil/WarCouncilRound`,
`./VanguardMatch`), because `index.ts` deliberately excludes components and a `.ts` barrel
re-exporting one is a needless brush with `react-refresh/only-export-components`.

## How it works

### The trick-request callback is the entire standalone-testing mechanism

This is the load-bearing design idea in the module, and it is one function slot rather than a
"manual entry mode" type union. `VanguardMountProps.requestTricksWon` is an async callback,
`(round: number) => Promise<TricksWon>`, that a Vanguard mount calls whenever it needs a given
round's result. The host fills it in differently per mode, and **Vanguard itself never knows which
mode it is in**:

- **Campaign mode** — the host derives `TricksWon` straight from the just-completed War Council
  round's `tricksWon` field and resolves immediately.
- **Test mode** — the host resolves only once a developer has typed two trick counts into whatever
  debug form SCRUM-29 eventually builds.

The callback is **async specifically because manual entry has to wait on a human**, which cannot be
modelled as a synchronous return. Campaign mode pays nothing for this (`Promise.resolve(...)`), so
one async shape covers both cases without a second synchronous variant.

It takes a `round` number and carries no single-call restriction, which is what makes it reachable
at the start of a standalone session _and_ again at the start of every subsequent round — a
Vanguard mount spans one whole **match** (mounted once, playing rounds until a Breach), not one
round, so it re-requests a fresh trick split each round for the life of the match.

### Validation happens at the trick layer, because that is the only place it is possible

`isValidTricksWon` in `tricksWon.ts` accepts a split only if both counts are non-negative integers
that sum to exactly `TRICKS_PER_ROUND`:

```ts
Number.isInteger(tricks.player) &&
  Number.isInteger(tricks.cpu) &&
  tricks.player >= 0 &&
  tricks.cpu >= 0 &&
  tricks.player + tricks.cpu === TRICKS_PER_ROUND
```

The reason this check exists at all is that a manual-entry harness must not be able to construct a
score pair that no real round could produce. A War Council round is always exactly 13 tricks split
between the two sides — if the CPU won 10, the player won 3, never an independently chosen number.

The reason it lives at the **trick** layer rather than the score layer is a genuine constraint, not
a preference: `tricksToPoints`' curve (`src/warCouncil/scoring.ts`) is **not injective**. Several
different trick splits map to the same points value, and some points combinations cannot come from
any real 13-trick split at all — so validating after conversion cannot catch "the CPU won 10 tricks
and the player also won 10." Before `scoreRound` runs is the only point where that constraint is
checkable. An earlier draft of this contract accepted a raw points `score` directly and was
rejected for exactly this reason.

It **rejects** rather than clamping or coercing: a UI feeding an impossible split is a real bug in
that UI, and quietly clamping it to something plausible would hide the defect instead of surfacing
it. Being a plain integer-and-sum check, it also incidentally stops `NaN` and fractional values
from reaching `scoreRound`.

### The manual path reuses the real scoring pipeline — there is no parallel rule

A validated trick split goes through the same two existing functions a real completed match's
result goes through:

```
requestTricksWon(round) → isValidTricksWon → scoreRound        → convertScoreToMuster → Muster
                                             (src/warCouncil/    (src/vanguard/
                                              scoring.ts)         musterConversion.ts)
```

Points are what `convertScoreToMuster` consumes, so trick counts must be converted before they can
become a Muster budget. Nothing in this module re-implements or shortcuts either step —
`src/app/vanguard/matchReducer.ts`'s `handleMusterReady` runs the full chain unchanged (see
[vanguard-ui.md](vanguard-ui.md) → _The reducer decides no rule..._), which is the proof the
contract's pipeline actually composes now that a real mount, not just a stub, depends on it.

### `RequestTricksWon` carries a referential-stability requirement

Documented as a comment on the type in `vanguardMount.ts`, because it is a real constraint on any
future host and nothing enforces it at compile time. A consuming mount calls `requestTricksWon`
from an effect keyed on its identity, so a host passing an inline arrow —
`requestTricksWon={(r) => api.get(r)}` — creates a new function identity on every parent render,
re-firing that effect and issuing unbounded duplicate in-flight requests. Implementations must be
memoized with `useCallback` or held in a ref.

This is worth knowing precisely because it will bite silently: the failure mode is duplicate
requests with no error, in whichever of SCRUM-28/29 is built first, long after this file was last
in anyone's diff.

### The two stubs, then none — what they proved and how each was retired

`stubs/` originally held two **throwaway** components proving the mount-prop contract was genuinely
callable before either real UI existed. Both are now gone, each replaced wholesale by its ticket's
real mount rather than extended in place:

- **SCRUM-28** replaced `WarCouncilStub.tsx`: it is deleted, its only two call sites (`App.tsx`'s
  prior placeholder host and its own definition) are gone with it, and
  `src/app/warCouncil/WarCouncilRound.tsx` is the real mount, compiled against the same
  `WarCouncilMountProps` the stub once proved.
- **SCRUM-29** replaced `VanguardStub.tsx`, the more substantial of the two: it is deleted, and
  `src/app/vanguard/VanguardMatch.tsx` is the real mount, compiled against the same
  `VanguardMountProps` the stub once proved. `VanguardStub` had exercised the async path by holding
  its own `round` counter and calling `requestTricksWon(round)` in an effect; `VanguardMatch`'s
  single effect (documented in full in [vanguard-ui.md](vanguard-ui.md) → _The single effect..._)
  is the real version of exactly that mechanism, now driving an actual playable match rather than a
  proof.

Deleting the second stub emptied `stubs/` entirely, so the subfolder itself is gone too — there is
nothing left under `src/app/` that exists solely to prove the contract rather than fulfil it.

Its underlying reason for existing survives it: `src/warCouncil/` and `src/vanguard/` are
pure-TypeScript-only under an ESLint override, so a `.tsx` mount could never live beside either
engine — `src/app/warCouncil/` and `src/app/vanguard/` are what that constraint produces.

### `App.tsx` is now a five-line mount, and `AppMode` has no consumer

**SCRUM-34 replaced the dev host wholesale.** `src/App.tsx` is now, in its entirety:

```tsx
import BattleHost from './app/battle/BattleHost'

function App() {
  return <BattleHost />
}

export default App
```

Everything SCRUM-28 and SCRUM-29 had put there is gone: the `useState<AppMode>` slot, the top-right
"Switch to Test mode" button, the inline `dealRound(WAR_COUNCIL_FIRST_DEALER, Math.random)`
initializer, the direct `WarCouncilRound` mount, and the round-complete view. Grep-verified — no
occurrence of `Switch to Test mode`, `AppMode`, `dealRound`, or `WAR_COUNCIL_FIRST_DEALER` survives
in `App.tsx`. The dev host's own doc comment had asked for exactly this ("SCRUM-34 owns real
battle-loop orchestration and should delete this host rather than extend it").

`appMode.ts` still exists and still exports `AppMode` as an `as const` object map with a derived type
of the same name — the convention used throughout this codebase (`PlayerSide`, `BattlePhase`,
`RoundPhase`), and a requirement rather than a taste since `erasableSyntaxOnly` in
`tsconfig.app.json` forbids a real TypeScript `enum`. But **nothing in the running app reads it any
more.** It is left on disk alongside `TestModeVanguardHost.tsx` and `TrickEntryForm.tsx`, all three
unreferenced from the entry point (see _Deferred_).

The case-collision detail that governed the old host's imports no longer applies to `App.tsx`, which
now imports only `./app/battle/BattleHost` by full path. It remains true for anyone importing the
`src/app/` barrel: **write `'./app/index'`, not `'./app'`** — the bare specifier fails to compile on
this case-insensitive Windows checkout (`TS2614` / `TS1149`) because it resolves against the sibling
`App.tsx`, which differs from the `app/` directory only by case, before trying the directory's
`index.ts`.

### The mount-prop contract now has a real campaign-mode host

`RequestTricksWon`'s Campaign-mode description above — "the host derives `TricksWon` straight from
the just-completed War Council round" — is no longer hypothetical. `BattleHost`
(`src/app/battle/BattleHost.tsx`, SCRUM-34) is that host: it fulfils `requestTricksWon` by mounting
a real `WarCouncilRound`, waiting for the player to finish it, and resolving with the round's actual
trick split. Both mount-prop contracts this module defined are now satisfied by production code
rather than by a stub or a dev harness — `VanguardMountProps` by `BattleHost`'s `VanguardMatch`
mount, `WarCouncilMountProps` by its `WarCouncilRound` mount.

The memoization requirement documented on `RequestTricksWon` is honoured in practice:
`BattleHost` wraps it in `useCallback` with deps `[rng]`, and defaults `rng` to the `Math.random`
*reference* (not an `() => Math.random()` wrapper) precisely so that identity stays stable. See
[battle-ui.md](battle-ui.md) for the full sequencing mechanism.

Note that `isValidTricksWon` is **not** on this path. It gates the Test-mode manual-entry harness,
where a human types a split; the campaign path takes `finalState.tricksWon` straight from a real
completed round, which is valid by construction. With `TestModeVanguardHost` now unreferenced, the
validator currently has no live caller (see _Deferred_).

### The two game screens live in their own docs

`src/app/warCouncil/` — the full-viewport shell, tap-twice, the reducer, the roving tabindex, the
two `cpuFault` cases, and the two-project Vitest layout — is documented in
[war-council-ui.md](war-council-ui.md). `src/app/vanguard/` — its own full-viewport shell, the
board's `hexPlacement` orientation, action-then-target selection, the CPU-advance loop, and the
Test-mode trick-entry path — is documented in [vanguard-ui.md](vanguard-ui.md). Each was (or
started as) its own file rather than a section here, because each is a module folder in its own
right under this folder's one-doc-per-`src/`-folder convention, and War Council's combined doc had
already passed this project's 400-line budget by the time it was split.

`src/app/battle/` — the two Battle-level panels and, since SCRUM-34, the `BattleHost` orchestrator
that sequences the whole playable loop — is documented in [battle-ui.md](battle-ui.md).

The things about each that belong here, because they are facts about `src/app/` as a whole:
`WarCouncilRound.tsx` and `VanguardMatch.tsx` are the real mounts satisfying `WarCouncilMountProps`
and `VanguardMountProps` respectively, each replacing the stub that once proved its contract; and
`src/App.tsx` no longer hosts either directly — it mounts `BattleHost`, which hosts both (see
§ _`App.tsx` is now a five-line mount_).

## Rules & invariants enforced

- **A trick split must be a possible one.** `isValidTricksWon` is the single gate, and nothing
  re-implements the check inline — both counts non-negative integers summing to exactly
  `TRICKS_PER_ROUND`. TypeScript cannot express "these two numbers sum to 13", so a value-level
  validator is the enforcement point rather than a type.
- **No parallel scoring rule for the manual path** — a manually entered trick split reaches
  `convertScoreToMuster` only via `scoreRound`, the same route a real match's result takes.
- Every field on every contract interface is `readonly`.
- No pure-core ESLint boundary applies to this folder (deliberate — it is expected to import
  React), and none was added to it.
- No lint rule is suppressed anywhere in the module, and there is no `any` and no module-level
  mutable state.
- `src/app/warCouncil/`'s and `src/app/vanguard/`'s own invariants — that each re-implements no
  rule, that War Council contains no effect at all while Vanguard contains exactly one (its
  request effect releases nothing but its own cancellation flag, holding no listener, timer, or
  observer), and that each keeps its pure modules free of React and DOM globals — are listed in
  [war-council-ui.md](war-council-ui.md) and [vanguard-ui.md](vanguard-ui.md) respectively.

## Deferred / not yet implemented

- **No Campaign/Test menu screen, and no way to reach Test mode at all.** SCRUM-34 deleted the
  unstyled mode-switch button along with the rest of the dev host, so `AppMode`, `appMode.ts`,
  `TestModeVanguardHost.tsx`, and `TrickEntryForm.tsx` are all still on disk but unreachable from
  the running app. Nothing reads `AppMode` and nothing calls `isValidTricksWon` any more. They were
  left rather than deleted because removing a standalone dev sandbox wasn't asked for and is easily
  reversible either way — but a future ticket should decide deliberately: build a real menu that
  makes Test mode reachable again, or delete the four files. Leaving them indefinitely unreferenced
  is the worst of the three.
- **Battle-loop wiring now exists** — `BattleHost` (`src/app/battle/`, SCRUM-34) is the orchestrator
  this section previously said was missing. What it does *not* do is route through `src/battle/`'s
  `BattleState` machine: that module's reducer functions remain built, tested, and uncalled by the
  running app. See [battle-ui.md](battle-ui.md) → _The loop is driven by fulfilling `VanguardMatch`'s
  promise_ for why, and what reconciling the two would cost.
- **`src/app/warCouncil/` and `src/app/vanguard/` each carry their own deferred list** — the
  untested no-scroll layout, the defensive `cpuFault`/`cpuRejected` branch, and the single dark
  theme are recorded per module in [war-council-ui.md](war-council-ui.md) and
  [vanguard-ui.md](vanguard-ui.md). The open question this file previously posed for SCRUM-29 —
  "whether the [trick-entry] form should make an invalid split nearly unrepresentable... rather
  than relying on `isValidTricksWon` as the primary defence" — is answered: `TrickEntryForm`
  renders one input for the player's count and derives the opponent's by subtraction, so an
  impossible split cannot be typed; `isValidTricksWon` remains the reducer's backstop.
- **`TRICKS_PER_ROUND` duplicates rather than consolidates.** The same `13` is hard-coded in
  `src/warCouncil/deal.ts` (13-card hands) and `src/warCouncil/playCard.ts` (the
  `tricksPlayed === 13` round-completion branch). Consolidating all of them into one shared export
  is acknowledged debt, deliberately not done here because it would mean editing a completed,
  tested engine module for a contract-only ticket. A future ticket should extract one constant and
  update all three call sites plus this one.
- **`onComplete`'s payload shapes are this contract's invention.** `WarCouncilRoundResult`
  (`finalState` + `score`) and `VanguardMatchResult` (`finalState` + `winner`) are built from real
  existing types but were not specified by the brief — worth a second look before SCRUM-28/29 treat
  them as fixed.
- **`requestTricksWon`'s referential-stability requirement is documentation only**, unenforceable on
  a plain function type. `BattleHost` honours it correctly (`useCallback` with deps `[rng]`, and a
  stable `Math.random` reference as the default), but nothing would have caught it if it hadn't —
  the failure mode is silent duplicate in-flight requests, not an error.
