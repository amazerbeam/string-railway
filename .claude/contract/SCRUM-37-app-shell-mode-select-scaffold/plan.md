# Plan: App shell — mode-select scaffold & game-mount contract

Plan folder: `.claude/contract/SCRUM-37-app-shell-mode-select-scaffold/`
Execution status: see `tasks.md` in this folder.

---

## Part 1 — Alignment

### Task reference

**SCRUM-37** — "App shell — mode-select scaffold & game-mount contract"

> **Problem Statement:** War Council UI (SCRUM-28) and Vanguard UI (SCRUM-29) both need to be mountable two ways: inside the full Campaign loop, and standalone in a Test mode. Vanguard's Test mode specifically needs to run without a completed War Council match, since its Muster budget normally comes from the War Council score band (SCRUM-22). Deciding this contract after the UI stories are built risks retrofitting a test harness onto UI that assumed a single campaign flow.
>
> **User Story:** As a developer, I want a top-level app-shell mode-select scaffold and a defined mount-prop contract for each game, so that War Council UI and Vanguard UI get built directly against a standalone-testable interface instead of being reworked later to support one.
>
> **Acceptance Criteria:**
> 1. App-level mode state distinguishes Campaign from Test (state/types only — the menu screen itself is a separate ticket).
> 2. A typed mount-prop contract exists for each game component (War Council, Vanguard) covering: initial game state in, a result/completion callback out.
> 3. Vanguard's contract additionally includes a manual score-entry input path that feeds the SCRUM-22 conversion function directly, as an alternative to receiving a score from a completed War Council match.
> 4. The manual score-entry path is reachable at the start of a standalone Vanguard session, and the contract supports invoking it again at the start of each subsequent round (Vanguard is normally re-fed a score every round it plays).
> 5. Stub implementations of both games compile against the contract, proving it is usable before either real UI exists.
>
> **Scope Boundaries — In scope:** app-shell mode state/types, per-game mount-prop contract, the typed shape of Vanguard's manual score-entry path. **Out of scope:** the Campaign/Test menu UI (separate ticket), the visual form of Vanguard's debug score inputs (SCRUM-29's job), the actual battle-loop wiring (SCRUM-34).
>
> **Dependencies & Risks:** Depends on SCRUM-19 (shared game-state types) and SCRUM-22 (Muster conversion — the manual score-entry path calls this function, so its signature needs to exist). Blocks SCRUM-28 and SCRUM-29 — both should build against this contract from the start rather than being retrofitted. When this ticket closes, update SCRUM-28 and SCRUM-29 to confirm the contract is available and unblock them.

Both dependencies are already implemented and merged: `src/vanguard/musterConversion.ts` exports `convertScoreToMuster(score: Readonly<Record<PlayerSide, number>>): Muster`, and the shared `BattleState`/`BattlePhase` scaffold from SCRUM-19 lives in `src/battle/`.

**Developer follow-up (2026-08-05, confirmed during Part 1 review):**
1. Manual entry must not let the harness construct a score pair that couldn't happen from a real round. A War Council round is always exactly 13 tricks split between both sides (`src/warCouncil/playCard.ts:93`, `src/warCouncil/deal.ts:7-8`) — e.g. if the CPU won 10 tricks the player can only have won 3, never an independently-chosen number. **The manual-entry path takes trick counts, not a points score**, and the trick counts must be validated against that fixed total before anything is converted. Points are still what `convertScoreToMuster` consumes, so the pipeline is trick counts in → `scoreRound` (existing, `src/warCouncil/scoring.ts`) → `convertScoreToMuster` (SCRUM-22).
2. Vanguard's mount contract spanning one whole match (mounted once, playing many rounds until the match ends) is confirmed correct — Vanguard needs to keep playing rounds until it actually finishes the game.

### Restated goal

Add a new `src/app/` module that gives the not-yet-built War Council and Vanguard UI components (SCRUM-28, SCRUM-29) a typed contract to build against: what props a mount of each game accepts on the way in, and what it reports on the way out. The contract must work whether a game is mounted inside the existing full battle loop (`src/battle/`, already built) or mounted alone in a standalone Test harness with no completed match behind it. Vanguard's contract gets one extra piece — a callback the host fills in differently per mode (derived from a real War Council result in Campaign mode, typed in by hand in Test mode) that supplies **that round's trick counts**, validated against the fixed 13-trick round total before it is run through the existing `scoreRound` → `convertScoreToMuster` pipeline, and that the same Vanguard mount calls again at the start of every subsequent round it plays until the match ends. Two minimal stub components prove the contract is actually usable — accepted, read, and called — before either real UI exists. No menu screen, no real UI, and no battle-loop orchestration change; this ticket only ships the shapes, one small validator, and a mode-state slot in `App.tsx`.

### In scope

- An `AppMode` const/type (`Campaign` | `Test`) and a `useState` slot for it in `App.tsx`.
- `WarCouncilMountProps` — initial `WarCouncilState` in, a completion callback out.
- `VanguardMountProps` — initial `VanguardState` in, a completion callback out, plus the round-scoped trick-count-request callback described in AC3/AC4.
- A `TricksWon` type, a `TRICKS_PER_ROUND` constant, and a pure `isValidTricksWon` validator — the typed (and validated) shape of Vanguard's manual entry path, per the developer's 2026-08-05 follow-up.
- Two stub components (`WarCouncilStub`, `VanguardStub`) that accept the two mount-prop contracts and genuinely invoke every member of each (not just declare the prop types), including running a resolved trick count through `isValidTricksWon` → `scoreRound` → `convertScoreToMuster`, proving the whole pipeline compiles and is exercised.

### Explicitly out of scope

- The Campaign/Test menu screen — any UI to view or change `AppMode` (ticket says this is separate).
- The visual form of Vanguard's manual score-entry inputs — real number fields, validation UX, a submit button (SCRUM-29's job). The stub's "submit" affordance is a single hard-coded button, not a form.
- The actual battle-loop wiring — looping `BattleState` through rounds, deciding when a Vanguard mount unmounts/remounts, wiring the real War Council UI's completion callback into a real Vanguard mount (SCRUM-34).
- **Any change to `src/warCouncil/`, `src/vanguard/`, or `src/battle/`.** `TRICKS_PER_ROUND` is declared fresh inside the new `src/app/` module rather than by refactoring the existing hard-coded `13`s in `src/warCouncil/deal.ts` and `playCard.ts` into a shared export — that refactor is real, worthwhile, and explicitly flagged as follow-up debt in Risks, but touching a completed, tested game-logic module (SCRUM-20) is not this contract ticket's job.
- Adding `jsdom`/React Testing Library or a Vitest environment split for `.tsx` component rendering tests (see Assumptions).

### Pattern Reference

No file or component reference was supplied on the ticket. Chosen from the existing codebase:

- Module shape (`types.ts`-per-concern + barrel `index.ts`) follows the established pattern in `src/warCouncil/index.ts`, `src/vanguard/index.ts`, and `src/battle/index.ts`.
- The `as const` object-map form for `AppMode` follows `PlayerSide` (`src/warCouncil/types.ts`), `BattlePhase` (`src/battle/battlePhase.ts`), and `RoundPhase` — required by `erasableSyntaxOnly` in `tsconfig.app.json`, which forbids a real TypeScript `enum`.
- The 13-trick round total is asserted twice in the existing engine: `src/warCouncil/playCard.ts:93` (`tricksPlayed === 13 ? RoundPhase.Complete : ...`) and `src/warCouncil/deal.ts:7-8` (13-card hands). `src/warCouncil/__tests__/playCard.test.ts:217` and `cpuPlayer.test.ts:222` both assert `tricksWon.player + tricksWon.cpu === 13` as an existing invariant — this plan's `TRICKS_PER_ROUND` constant and `isValidTricksWon` validator make that same invariant checkable outside the engine, for the manual-entry path.
- `scoreRound(tricksWon): Record<PlayerSide, number>` and `tricksToPoints` (`src/warCouncil/scoring.ts`) are the existing, real functions that turn a validated trick count into the points `convertScoreToMuster` (`src/vanguard/musterConversion.ts:8`) accepts — cited so the contract's pipeline reuses real functions rather than inventing a parallel scoring path.

### Constraints flagged on the brief

- The manual entry path must only ever be able to produce a trick split that could occur from a real round: both counts non-negative integers, summing to exactly `TRICKS_PER_ROUND` (13) — per the developer's 2026-08-05 follow-up.
- Whatever the manual entry path produces must reach `convertScoreToMuster` through the same conversion (`scoreRound`) a real completed match's result would go through — no separate, parallel scoring rule for the manual path.
- The path must be reachable both at the start of a standalone session (round 1, no prior match) and again at the start of every subsequent round, for the life of the match.
- Nothing in this ticket may assume a completed War Council match exists — that is precisely the case standalone Vanguard testing must not require.

### Assumptions made

- **`src/app/` is a new top-level module**, sibling to `src/warCouncil/`, `src/vanguard/`, `src/battle/`, rather than folding these types into an existing module. Rationale: the contract is a consumer of both games' types and belongs to neither; a new module keeps `warCouncil`/`vanguard`/`battle` untouched, matching the out-of-scope line above.
- **The trick-request callback is asynchronous** (`(round: number) => Promise<TricksWon>`), not synchronous. Rationale: manual entry (Test mode) requires waiting on a human to type two numbers and submit, which cannot be modelled as a synchronous return; Campaign mode can trivially resolve immediately (`Promise.resolve(...)`), so one async shape covers both without a second sync variant. Flagged in Risks as a judgement call worth a second look.
- **Vanguard's mount contract spans one whole match** (mounted once, persists across rounds, calls the trick-request callback again each round it needs a fresh result) rather than being remounted every round. **Confirmed by the developer** on 2026-08-05: Vanguard has to keep playing rounds until the match actually finishes. `onComplete` fires once, on reaching a Breach — the game's actual win condition per `CLAUDE.md`'s naming section.
- **War Council's mount contract spans one round** (`WarCouncilMountProps`/`WarCouncilRoundResult`), matching how `src/warCouncil/` and `src/battle/` already scope a "round" — one deal, one trick sequence, one score. Not spanning multiple rounds, unlike Vanguard, because nothing in the brief or the existing engine treats a War Council session as multi-round from the UI's perspective; each round's result already feeds Muster once and the next round is a fresh deal.
- **`TRICKS_PER_ROUND` is declared locally in `src/app/`, duplicating (not importing) the existing hard-coded `13` in `src/warCouncil/`.** Rationale: consolidating the three existing hard-coded `13`s into one shared export is real debt worth fixing, but it means touching `playCard.ts`'s round-completion branch and `deal.ts`'s hand-dealing logic — both inside a completed, tested module (SCRUM-20) — which is out of proportion for a contract-only ticket. Flagged as follow-up debt in Risks, not silently left unmentioned.
- **App-level mode state is wired into `App.tsx` as a real `useState<AppMode>`** (defaulting to `Campaign`, displayed as plain text), not just a type left unused anywhere. Rationale: AC1 says "state/types only" — read as *both* a state slot and its types are in scope, only the menu screen is not — so leaving the type entirely unreferenced would under-deliver the AC. The setter is deliberately **not** destructured (`const [mode] = useState(...)`, not `const [mode, setMode] = ...`) since nothing calls it until the menu ticket exists — destructuring an unused `setMode` fails both `noUnusedLocals` (confirmed against this project's `tsc`) and `@typescript-eslint/no-unused-vars` (confirmed against this project's `eslint.config.js`, which sets no underscore-ignore pattern), so omitting it outright is the only clean fix rather than a suppression.
- **No `jsdom`/React Testing Library added.** Rationale: `vite.config.ts` currently scopes Vitest to `environment: 'node'` and `include: ['src/**/__tests__/**/*.test.ts']` (no `.tsx`); the react-frontend skill explicitly calls introducing a DOM environment split "the first test that needs a DOM," implying it is its own decision, not a side effect of an unrelated contract ticket. Stub "compiles against the contract" is verified by `npm run typecheck` and `npm run build`, not a render test. Flagged in Risks — SCRUM-28/29 will need to make this call for real.
- **Stub components live under `src/app/stubs/`**, not inside `src/warCouncil/`/`src/vanguard/`. Rationale: those two modules are pure-TypeScript-only under the ESLint override (`eslint.config.js:24`) — a `.tsx` file there would trip `no-restricted-imports` on `react`. A dedicated `stubs/` subfolder under the new `app` module also signals clearly that SCRUM-28/29 replace these files wholesale rather than extend them.
- **`isValidTricksWon` rejects on invalid input rather than clamping or silently coercing it.** Rationale: matches the "never swallow an error into a success shape" rule — a manual-entry UI feeding an impossible split (e.g. 10 + 10) is a real bug in that UI, and clamping it to something plausible would hide the defect rather than surface it.

### Config and persisted-shape audit

- **New type/identifier names checked for existing use** — `AppMode`, `WarCouncilMountProps`, `VanguardMountProps`, `WarCouncilRoundResult`, `TricksWon`, `TRICKS_PER_ROUND`, `isValidTricksWon`, `RequestTricksWon`, `VanguardMatchResult` grepped across `src/**`: **0 hits**. All names are genuinely new. (`RoundState.tricksWon` is an existing lowercase *field* name of the same underlying shape — noted as the pattern reference above, not a naming collision with the new `TricksWon` type.)
- **Persisted-shape check**: grepped `src/**` for `localStorage`/`sessionStorage`: **0 hits**. Nothing is persisted anywhere in this codebase yet — this ticket does not change that, and there is no stored-shape migration concern.
- **No configuration key, `data-testid`, CSS class, or `aria-*` id is renamed or introduced as a load-bearing string** — the stub components use plain semantic elements and native `<button>` text, not a string contract another file binds to.
- **No architectural boundary is crossed**: `src/app/` is not inside the pure-core-boundary-enforced trees (`src/warCouncil/**`, `src/vanguard/**` per `eslint.config.js:24`), so its `.tsx` stub files importing `react` trips nothing. `src/app/tricksWon.ts` (pure validator, no React import) could theoretically live inside that boundary in spirit, but is not covered by the ESLint override since it isn't under `src/warCouncil/` or `src/vanguard/` — noted, not a defect, since the override is scoped by folder and this ticket isn't extending it.

---

## Part 2 — Technical design

### Approach

`src/app/` becomes a new module holding contract types, one small pure validator, and two throwaway stub components — no persisted state, no orchestration. Four files carry the actual contract: `appMode.ts` (the `AppMode` const/type), `warCouncilMount.ts` (`WarCouncilMountProps`, `WarCouncilRoundResult`), `tricksWon.ts` (`TRICKS_PER_ROUND`, `TricksWon`, `isValidTricksWon`), and `vanguardMount.ts` (`RequestTricksWon`, `VanguardMountProps`, `VanguardMatchResult`). A barrel `index.ts` re-exports all of them, matching the existing `warCouncil`/`vanguard`/`battle` barrel pattern so a future SCRUM-28/29 import reads `import type { WarCouncilMountProps } from '../app'`.

The design idea worth calling out by name: **the trick-request callback is the entire mechanism for AC3/AC4**, not a separate "manual entry" type union. `VanguardMountProps.requestTricksWon: RequestTricksWon` is a single async function slot — `(round: number) => Promise<TricksWon>` — called once when a standalone or embedded Vanguard mount needs that round's result. In Campaign mode, the host's implementation derives `TricksWon` straight from the just-completed War Council round's `tricksWon` field and resolves immediately. In Test mode, the host's implementation resolves only once a developer has entered two trick counts into whatever debug form SCRUM-29 builds — and that form is expected to call `isValidTricksWon` before ever resolving the promise, since **the contract's job is to make an invalid split unrepresentable at the type level where possible, and cheaply rejectable at the value level where it isn't** (TypeScript can't express "these two numbers sum to 13" in the type system, so the validator is the enforcement point). Vanguard itself never knows which mode it's in — it calls `requestTricksWon(round)`, validates what comes back defensively, then runs it through the existing `scoreRound` → `convertScoreToMuster` pipeline exactly as a real completed match's result would. This is the alternative considered and rejected: accepting a raw points `score` directly (this plan's first draft). It was rejected because `tricksToPoints`'s curve is not injective — several different trick splits map to the same points value and some points combinations can't come from any real 13-trick split at all — so validating at the score layer can't actually catch "the CPU supposedly won 10 tricks and the player also won 10," which is exactly the defect the developer flagged. Validating at the trick layer, before `scoreRound` ever runs, is the only point where that constraint is checkable at all.

`WarCouncilMountProps` and `VanguardMountProps` both carry the same two-member shape the ticket asks for — `initialState` in, `onComplete` out — with `VanguardMountProps` carrying the one extra `requestTricksWon` member layered on top. Nothing here decides *when* a real orchestrator swaps one game mount for the other, or how `App.tsx`'s new `mode` state ever changes — those are exactly the "battle-loop wiring" and "menu screen" the ticket marks out of scope.

The two stub components (`src/app/stubs/WarCouncilStub.tsx`, `src/app/stubs/VanguardStub.tsx`) are the only `.tsx` this ticket adds. Each is deliberately small: `WarCouncilStub` renders the mounted round's dealer and a "Simulate completion" button that calls `onComplete` with a real `scoreRound` result over the initial state's `tricksWon`. `VanguardStub` tracks its own `round` number starting at 1, calls `requestTricksWon(round)` in an effect guarded against a race on unmount, runs the resolved value through `isValidTricksWon` (rendering a plain error state if it fails, matching the four-async-states discipline: loading while the promise is pending, an error state on an invalid split, success once `scoreRound` → `convertScoreToMuster` has run and Muster is on screen, and there's no "empty" state here since a trick request always resolves to something), and exposes two buttons — "Next round" (increments `round`, demonstrating AC4's repeat-invocation) and "Simulate breach" (calls `onComplete`). Neither stub is wired into `App.tsx` or `main.tsx` — they exist purely to prove the contract compiles and is genuinely callable, per AC5.

### Skills to invoke during execution

- `react-frontend` — governs every file this ticket touches; all of it is new TypeScript/TSX under `src/`. Owns: the `as const` object-map convention for `AppMode`, the module/barrel layout, the one-file-order rule, the async-effect cancellation-guard pattern for `VanguardStub`, the four-async-states discipline for its trick-request flow, and the Vitest scoping decision (no `.tsx` render tests without a deliberate environment-split decision).
- No other skill matches this ticket's scope — it is not a Jira-only or design-only task, and it does not touch `.docs/design/`.

Also read during execution: `.claude/workflow/web-project.md` (paths, runners, correctness traps — the effect-cleanup and StrictMode-double-invocation traps apply directly to `VanguardStub`'s effect). `.claude/rules/` was scanned in Step 1.6 above and is empty — no rule file to read.

### Diagram

```mermaid
classDiagram
    class AppMode {
        <<const>>
        Campaign
        Test
    }

    class WarCouncilMountProps {
        +initialState: WarCouncilState
        +onComplete(result: WarCouncilRoundResult) void
    }
    class WarCouncilRoundResult {
        +finalState: WarCouncilState
        +score: Record~PlayerSide, number~
    }

    class VanguardMountProps {
        +initialState: VanguardState
        +requestTricksWon: RequestTricksWon
        +onComplete(result: VanguardMatchResult) void
    }
    class VanguardMatchResult {
        +finalState: VanguardState
        +winner: PlayerSide
    }
    class RequestTricksWon {
        <<function type>>
        (round: number) Promise~TricksWon~
    }
    class TricksWon {
        <<type>>
        player: number
        cpu: number
    }
    class isValidTricksWon {
        <<pure function, new>>
        (tricks: TricksWon) boolean
    }
    class TRICKS_PER_ROUND {
        <<const, new>>
        13
    }

    class scoreRound {
        <<existing, warCouncil>>
        (tricksWon) Record~PlayerSide, number~
    }
    class convertScoreToMuster {
        <<existing, SCRUM-22>>
        (score) Muster
    }

    WarCouncilMountProps --> WarCouncilRoundResult : onComplete emits
    VanguardMountProps --> VanguardMatchResult : onComplete emits
    VanguardMountProps --> RequestTricksWon : requestTricksWon
    RequestTricksWon ..> TricksWon : resolves to
    TricksWon ..> isValidTricksWon : checked against
    isValidTricksWon ..> TRICKS_PER_ROUND : enforces sum ==
    TricksWon ..> scoreRound : validated value feeds
    scoreRound ..> convertScoreToMuster : points feed directly

    class WarCouncilStub {
        <<stub component>>
    }
    class VanguardStub {
        <<stub component>>
    }
    WarCouncilStub ..|> WarCouncilMountProps : implements
    VanguardStub ..|> VanguardMountProps : implements
```

### Data shapes

```ts
// src/app/appMode.ts
export const AppMode = {
  Campaign: 'campaign',
  Test: 'test',
} as const
export type AppMode = (typeof AppMode)[keyof typeof AppMode]
```

```ts
// src/app/warCouncilMount.ts
import type { PlayerSide, WarCouncilState } from '../warCouncil'

export interface WarCouncilMountProps {
  readonly initialState: WarCouncilState
  readonly onComplete: (result: WarCouncilRoundResult) => void
}

export interface WarCouncilRoundResult {
  readonly finalState: WarCouncilState // finalState.phase === RoundPhase.Complete
  readonly score: Readonly<Record<PlayerSide, number>>
}
```

```ts
// src/app/tricksWon.ts
import type { PlayerSide } from '../warCouncil'

// Mirrors the fixed round length already asserted in src/warCouncil/playCard.ts:93
// (tricksPlayed === 13) and src/warCouncil/deal.ts:7-8 (13-card hands). Declared
// separately here rather than imported — see plan.md Part 1 -> Assumptions made
// and Risks for why, and the follow-up to consolidate this into one export.
export const TRICKS_PER_ROUND = 13

export type TricksWon = Readonly<Record<PlayerSide, number>>

export function isValidTricksWon(tricks: TricksWon): boolean {
  return (
    Number.isInteger(tricks.player) &&
    Number.isInteger(tricks.cpu) &&
    tricks.player >= 0 &&
    tricks.cpu >= 0 &&
    tricks.player + tricks.cpu === TRICKS_PER_ROUND
  )
}
```

```ts
// src/app/vanguardMount.ts
import type { PlayerSide, VanguardState } from '../vanguard'
import type { TricksWon } from './tricksWon'

// Return type feeds scoreRound (src/warCouncil/scoring.ts), then
// convertScoreToMuster (src/vanguard/musterConversion.ts) — the same pipeline
// a real completed match's tricksWon goes through. No parallel scoring rule
// for the manual-entry path.
export type RequestTricksWon = (round: number) => Promise<TricksWon>

export interface VanguardMountProps {
  readonly initialState: VanguardState
  readonly requestTricksWon: RequestTricksWon
  readonly onComplete: (result: VanguardMatchResult) => void
}

export interface VanguardMatchResult {
  readonly finalState: VanguardState
  readonly winner: PlayerSide
}
```

```ts
// src/app/index.ts — barrel, re-exports the above plus:
export { AppMode } from './appMode'
export type { WarCouncilMountProps, WarCouncilRoundResult } from './warCouncilMount'
export { TRICKS_PER_ROUND, isValidTricksWon } from './tricksWon'
export type { TricksWon } from './tricksWon'
export type { VanguardMountProps, VanguardMatchResult, RequestTricksWon } from './vanguardMount'
```

```tsx
// src/app/stubs/WarCouncilStub.tsx (shape, not full body)
import type { WarCouncilMountProps } from '../warCouncilMount'
function WarCouncilStub({ initialState, onComplete }: WarCouncilMountProps): React.JSX.Element
```

```tsx
// src/app/stubs/VanguardStub.tsx (shape, not full body)
import type { VanguardMountProps } from '../vanguardMount'
function VanguardStub({ initialState, requestTricksWon, onComplete }: VanguardMountProps): React.JSX.Element
```

```tsx
// src/App.tsx — modified
const [mode] = useState<AppMode>(AppMode.Campaign) // setter omitted until the menu ticket needs it
```

No configuration key, persisted shape, or `package.json` change. No new dependency.

### Runtime quality notes

- **Purity and adjudication:** `isValidTricksWon` is a pure, DOM-free function with a real invariant — this is the one piece of genuine logic this ticket adds, and it is the sole gate deciding whether a trick split is legal, so no stub or future consumer re-implements the check inline. All other contract types are pure data shapes with no logic. The two stub components hold only local UI state (a round counter, a fetched/validated result) and never decide game logic themselves.
- **Effects, mount and teardown:** `VanguardStub`'s single effect calls `requestTricksWon(round)` and is guarded with a `cancelled` flag set in its cleanup, so a resolved promise after unmount (or after StrictMode's dev double-invocation triggers a second effect run) never calls `setState` on an unmounted instance. The effect's dependency array is `[round, requestTricksWon]` — exhaustive, not suppressed. `WarCouncilStub` has no effect. Neither stub holds a listener, timer, or observer requiring release. No module-level mutable state is introduced anywhere in this ticket.
- **Hot-path cost:** Nothing in this ticket runs on a pointer or high-frequency event; both stubs render once per button click or once per resolved trick request. No memoisation is added or needed.
- **Determinism and numeric safety:** No `Math.random()`, no division, no epsilon. `isValidTricksWon`'s integer and non-negative checks guard against `NaN`/fractional input reaching `scoreRound`, which itself has no guarded divisor of its own to worry about (`tricksToPoints` is a lookup, not a division). `WarCouncilStub`'s fabricated result calls the existing pure `scoreRound` rather than inventing a score value.
- **Error paths:** `VanguardStub` treats an `isValidTricksWon` failure as its error state — a plain rendered message, not a thrown exception or a silently-substituted default Muster — satisfying all four async states (loading while `requestTricksWon` is pending, error on an invalid split, success once Muster is computed and shown, no distinct empty state since a request always resolves to *something*). `requestTricksWon`'s Promise has no `.catch` in the stub — a rejection is deliberately left unhandled and surfaces as an unhandled-rejection console error, which is correct for a throwaway stub proving the happy/validated-invalid paths compile; a real implementation (SCRUM-28/29) owns deciding what a rejected request means to a user. No `catch` returns a fallback score or a fallback Muster.

### Risks and judgement calls

- **`TRICKS_PER_ROUND` duplicates, rather than consolidates, the existing hard-coded `13` in `src/warCouncil/deal.ts` and `playCard.ts`.** This is real, acknowledged debt (see Assumptions) — a future ticket should extract one shared constant and update all three call sites plus this one. Not done here because it touches a completed, tested game-logic module for a contract-only ticket.
- **`requestTricksWon` is async (`Promise`-returning), not sync.** This commits SCRUM-29 to building the manual-entry debug UI as something that *resolves* a pending promise (e.g. on a submit click) rather than reading a value synchronously off state. Flagging for developer sign-off before SCRUM-28/29 build against it.
- **`isValidTricksWon` rejects invalid input rather than clamping it** — worth confirming this is the behaviour wanted once SCRUM-29 builds a real form around it (e.g., should the form itself pre-empt invalid states by deriving one side's count from the other, making an invalid split nearly unrepresentable in the UI, with the validator as a pure backstop rather than the primary defence?).
- **`onComplete`'s payload shape (`finalState` + derived `score`/`winner`) is invented**, not stated anywhere in the brief or an existing type. It is built from real existing types (`WarCouncilState`, `VanguardState`, `PlayerSide`, `TricksWon`) but the shape itself is this plan's choice — worth a look before SCRUM-28/29 treat it as fixed.
- **No `jsdom` / React Testing Library added, so stub "compiles against the contract" is proven by `npm run typecheck` + `npm run build`, not a rendered/interaction test.** SCRUM-28/29 will need to make the DOM-testing-environment call for real UI; deferring it here is a scope choice worth confirming.
- **No dependency is added.** Confirmed — this ticket stays inside the existing two runtime dependencies (`react`, `react-dom`).
