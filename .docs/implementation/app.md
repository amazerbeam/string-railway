# App shell — `src/app/`

**Status:** partial
**Built by:** SCRUM-37, SCRUM-28

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

One of those UIs now exists: **`src/app/warCouncil/` is the real War Council round screen**, built
by SCRUM-28 against `WarCouncilMountProps` and documented separately in
[war-council-ui.md](war-council-ui.md) — it is large enough to own its own file. The Vanguard half
is still `stubs/VanguardStub.tsx` awaiting SCRUM-29.

Outside that subfolder this module contains exactly one piece of runtime logic
(`isValidTricksWon`); everything else is either a pure type declaration or disposable scaffolding.
It has no pure-core ESLint boundary and does not need one — unlike `src/warCouncil/` and
`src/vanguard/`, this folder is _expected_ to import React, and both `stubs/` and `warCouncil/` do.

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
[war-council-ui.md](war-council-ui.md), not here.

`AppMode`, `TRICKS_PER_ROUND`, and `isValidTricksWon` are re-exported from `index.ts` as values;
the six type-only exports go via `export type` (required by this project's `verbatimModuleSyntax`
tsconfig setting). `WarCouncilStub` is gone (see § _The two stubs_, below); `VanguardStub.tsx` under
`stubs/` remains and is **deliberately not exported from the barrel** — it is not part of the
contract, only proof of it. `src/app/warCouncil/` has no barrel at all: `App.tsx` imports the mount
directly by file path (`./app/warCouncil/WarCouncilRound`), because `index.ts` deliberately excludes
components and a `.ts` barrel re-exporting one is a needless brush with
`react-refresh/only-export-components`.

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
`VanguardStub` demonstrates the full chain, and that demonstration is the proof the contract's
pipeline actually composes.

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

### The two stubs, then one — what remains and what it proved

`stubs/` originally held two **throwaway** components proving the mount-prop contract was
genuinely callable before either real UI existed. SCRUM-28 replaced `WarCouncilStub.tsx` wholesale,
exactly as planned: it is deleted, its only two call sites (`App.tsx`'s prior placeholder host and
its own definition) are gone with it, and `src/app/warCouncil/WarCouncilRound.tsx` is now the real
mount, compiled against the same `WarCouncilMountProps` the stub once proved. `VanguardStub.tsx`
remains — SCRUM-29 has not yet replaced it — and is still neither wired into `main.tsx` nor
`App.tsx`, so it is still unreachable in the running app; its job is still to make the Vanguard half
of the contract's usability a compile-time fact. The `stubs/` subfolder placement is still
deliberate for the same reason: `src/warCouncil/` and `src/vanguard/` are pure-TypeScript-only under
an ESLint override, so a `.tsx` file in either would trip `no-restricted-imports` on `react`.

- **`VanguardStub.tsx`** — the more substantial of the two originally, and now the only one. It
  exercises the async path: holds its own `round` counter starting at 1, calls
  `requestTricksWon(round)` in an effect, validates the resolved value, and on success renders the
  Muster from the full `scoreRound` → `convertScoreToMuster` chain. Its "Next round" button
  increments `round`, which is what demonstrates the repeat-invocation requirement rather than
  merely asserting it. "Simulate breach" calls `onComplete` with `winner: PlayerSide.Player`.

### `VanguardStub`'s effect: status is derived, not assigned

Worth recording because the shape looks indirect until you know why. The effect stores a
`RequestOutcome` **tagged with the round it resolved for**, and the UI-facing `RequestStatus` is
computed at render time:

```ts
const status: RequestStatus = outcome && outcome.round === round ? outcome : { kind: 'loading' }
```

The direct alternative — calling `setStatus({ kind: 'loading' })` synchronously at the top of the
effect body — fails this project's `react-hooks/set-state-in-effect` lint rule, and suppressing a
lint rule to land a change is not permitted here. Deriving instead means `setOutcome` is only ever
called inside the resolved `.then()` callback, and a stale outcome from a previous round can never
render against the current one, since its `round` tag will not match.

The effect is guarded with a `cancelled` flag set in its cleanup, so a promise resolving after
unmount — or after React StrictMode's development double-invocation triggers a second run — never
calls `setState` on a dead instance. Its dependency array is `[round, requestTricksWon]`, exhaustive
rather than suppressed.

### `AppMode` and the `App.tsx` mode slot

`appMode.ts` declares `AppMode` as an `as const` object map with a derived type of the same name —
the convention used throughout this codebase (`PlayerSide`, `BattlePhase`, `RoundPhase`) and a
requirement rather than a taste, since `erasableSyntaxOnly` in `tsconfig.app.json` forbids a real
TypeScript `enum`.

`src/App.tsx` holds it in a real state slot, `useState<AppMode>(AppMode.Campaign)`. SCRUM-28's dev
host renders it as plain text (`Mode: campaign`) only in the round-complete view — while a round is
in progress, `App` renders `WarCouncilRound` alone with no sibling markup, so its full-viewport
`.wc-shell` (see _How it works_, below) fills the viewport undisturbed. Two details are
deliberate:

- **The setter is not destructured** — `const [mode] = useState(...)`, not
  `const [mode, setMode] = ...` — because nothing changes the mode until the Campaign/Test menu
  ticket exists, and a destructured-but-unused `setMode` fails both `noUnusedLocals` and
  `@typescript-eslint/no-unused-vars`. Omitting the element is the correct fix, not a suppression;
  the menu ticket re-destructures both when it needs the setter.
- **The import is `'./app/index'`, not `'./app'`.** The bare specifier fails to compile on this
  case-insensitive Windows checkout (`TS2614` / `TS1149`) because it resolves against the sibling
  `App.tsx` — which differs from the `app/` directory only by case — before trying the directory's
  `index.ts`. This is the one import site in the repo with that collision; every other barrel is
  imported bare.

### The War Council round screen lives in its own doc

`src/app/warCouncil/` — the full-viewport shell, tap-twice, the reducer, the roving tabindex, the
two `cpuFault` cases, and the two-project Vitest layout — is documented in
[war-council-ui.md](war-council-ui.md). It was split out of this file when the combined doc passed
this project's 400-line budget, and because `src/app/warCouncil/` is a module folder in its own
right under this folder's one-doc-per-`src/`-folder convention.

The two things about it that belong here, because they are facts about `src/app/` as a whole:
`WarCouncilRound.tsx` is the real mount satisfying `WarCouncilMountProps`, replacing the stub that
once proved that contract; and `src/App.tsx` hosts it directly (see § _`AppMode` and the `App.tsx`
mode slot_, and _Deferred_).

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
  mutable state. `VanguardStub`'s effect releases nothing but its own cancellation flag, since it
  holds no listener, timer, or observer.
- `src/app/warCouncil/`'s own invariants — that it re-implements no rule, contains no effect, and
  keeps three of its modules free of React and DOM globals — are listed in
  [war-council-ui.md](war-council-ui.md).

## Deferred / not yet implemented

- **The Vanguard half of the contract still has no real UI.** SCRUM-28 replaced `WarCouncilStub`
  wholesale with the real War Council mount; SCRUM-29 (Vanguard UI) still builds against this
  module's contract and still has `VanguardStub.tsx` standing in for it.
- **No Campaign/Test menu screen.** `AppMode` has a state slot but nothing that changes it — no UI
  to view or select a mode. That is a separate ticket, and until it lands `App.tsx`'s `mode` is
  permanently `Campaign` and its setter is intentionally absent.
- **No battle-loop wiring.** Nothing here decides when a real orchestrator swaps one game mount for
  another — that is SCRUM-34's job. `src/battle/` does not import this module and this module does
  not import `src/battle/`. SCRUM-28's `App.tsx` host (see below) is a stand-in, not this.
- **`App.tsx`'s dev host is temporary, by design.** It deals one round with
  `useState(() => dealRound(WAR_COUNCIL_FIRST_DEALER, Math.random))` and mounts
  `WarCouncilRound` directly so the round is playable and QA can drive it, but it is not battle-loop
  wiring — SCRUM-34 replaces this host rather than extending it. The deal initializer is not
  idempotent, so React StrictMode's development double-invocation deals a hand this render then
  discards it; that wastes randomness in development only and can never produce two live rounds,
  since only the round dealt on the render that actually commits is ever mounted.
- **No visual form for manual trick entry.** `VanguardStub`'s affordances are hard-coded buttons,
  not number fields with validation UX; SCRUM-29 owns the real form. An open question for that
  ticket: whether the form should make an invalid split nearly unrepresentable in the first place
  (e.g. deriving one side's count from the other) with `isValidTricksWon` as a pure backstop,
  rather than relying on it as the primary defence.
- **`src/app/warCouncil/` carries its own deferred list** — the untested no-scroll layout, the
  defensive `cpuFault` branch, single-round-only scope, the single dark theme, and the absent card
  art are all in [war-council-ui.md](war-council-ui.md).
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
- **A rejected `requestTricksWon` promise is unhandled.** `VanguardStub` has no `.catch`, so a
  rejection surfaces as an unhandled-rejection console error and the UI stays on "Requesting..."
  indefinitely. Deliberate for a throwaway stub proving the happy and validated-invalid paths; what
  a rejected request should mean to a user is a real implementation's decision.
