# App shell — `src/app/`

**Status:** partial
**Built by:** SCRUM-37, SCRUM-28, SCRUM-29

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

### `AppMode` and the `App.tsx` mode slot

`appMode.ts` declares `AppMode` as an `as const` object map with a derived type of the same name —
the convention used throughout this codebase (`PlayerSide`, `BattlePhase`, `RoundPhase`) and a
requirement rather than a taste, since `erasableSyntaxOnly` in `tsconfig.app.json` forbids a real
TypeScript `enum`.

`src/App.tsx` holds it in a real state slot, `useState<AppMode>(AppMode.Campaign)`. SCRUM-28's dev
host renders it as plain text (`Mode: campaign`) only in the round-complete view — while a round is
in progress, `App` renders `WarCouncilRound` alone with no sibling markup, so its full-viewport
`.wc-shell` (see _How it works_, below) fills the viewport undisturbed.

**SCRUM-29 re-destructured the setter** — `const [mode, setMode] = useState(...)`, no longer
`const [mode] = useState(...)`. A fixed top-right `<button>` (unstyled, deliberately not a designed
screen — see _Deferred_) calls `setMode(AppMode.Test)`; `App` checks `mode === AppMode.Test` before
anything else and, if true, returns `<TestModeVanguardHost />` alone, short-circuiting the whole
Campaign render path (the dealt round, the button, the round-complete view). This is the only place
in the running app `mode` currently changes to — there is still no path back to `AppMode.Campaign`
once switched, and no menu screen to choose either mode deliberately (see _Deferred_).

One detail from before SCRUM-29 remains true and still deliberate: **the import is
`'./app/index'`, not `'./app'`.** The bare specifier fails to compile on this case-insensitive
Windows checkout (`TS2614` / `TS1149`) because it resolves against the sibling `App.tsx` — which
differs from the `app/` directory only by case — before trying the directory's `index.ts`. This is
the one import site in the repo with that collision; every other barrel is imported bare.

### The two game screens live in their own docs

`src/app/warCouncil/` — the full-viewport shell, tap-twice, the reducer, the roving tabindex, the
two `cpuFault` cases, and the two-project Vitest layout — is documented in
[war-council-ui.md](war-council-ui.md). `src/app/vanguard/` — its own full-viewport shell, the
board's `hexPlacement` orientation, action-then-target selection, the CPU-advance loop, and the
Test-mode trick-entry path — is documented in [vanguard-ui.md](vanguard-ui.md). Each was (or
started as) its own file rather than a section here, because each is a module folder in its own
right under this folder's one-doc-per-`src/`-folder convention, and War Council's combined doc had
already passed this project's 400-line budget by the time it was split.

The things about each that belong here, because they are facts about `src/app/` as a whole:
`WarCouncilRound.tsx` and `VanguardMatch.tsx` are the real mounts satisfying `WarCouncilMountProps`
and `VanguardMountProps` respectively, each replacing the stub that once proved its contract; and
`src/App.tsx` hosts both, directly for War Council and via `TestModeVanguardHost` for Vanguard (see
§ _`AppMode` and the `App.tsx` mode slot_, and _Deferred_).

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

- **No Campaign/Test menu screen.** `App.tsx` now has a real, unstyled `<button>` that switches
  `mode` to `AppMode.Test` (see § _`AppMode` and the `App.tsx` mode slot_), but there is still no
  designed menu to view or choose a mode, and no path back from `Test` to `Campaign` — a genuine
  menu screen is still a separate ticket.
- **No battle-loop wiring.** Nothing here decides when a real orchestrator swaps one game mount for
  another — that is SCRUM-34's job. `src/battle/` does not import this module and this module does
  not import `src/battle/`. SCRUM-28's `App.tsx` host (see below) is a stand-in, not this.
- **`App.tsx`'s dev host is temporary, by design.** It deals one round with
  `useState(() => dealRound(WAR_COUNCIL_FIRST_DEALER, Math.random))` and mounts
  `WarCouncilRound` directly so the round is playable and QA can drive it, but it is not battle-loop
  wiring — SCRUM-34 replaces this host rather than extending it. The deal initializer is not
  idempotent, so React StrictMode's development double-invocation deals a hand this render then
  discards it; that wastes randomness in development only and can never produce two live rounds,
  since only the round dealt on the render that actually commits is ever mounted. SCRUM-29's
  top-right mode-switch button is the same kind of scaffolding, added to the same temporary host
  rather than to a real menu — it is unstyled on purpose, and SCRUM-34 is expected to delete it
  along with the rest of this host.
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
  a plain function type. Whoever implements a real host must remember to memoize it; nothing will
  catch them if they don't.
