# SCRUM-37 — App shell: mode-select scaffold & game-mount contract

Plan: [`plan.md`](./plan.md) · Tasks: [`tasks.md`](./tasks.md) · Module doc:
[`.docs/implementation/app.md`](../../../.docs/implementation/app.md)

## Summary

Adds a new `src/app/` module holding the **mount-prop contract** that War Council UI (SCRUM-28) and
Vanguard UI (SCRUM-29) will be built against, so both get written for a standalone-testable
interface from the start instead of being retrofitted with a test harness later.

What ships:

- **`AppMode`** (`Campaign` | `Test`) as an `as const` map, plus a real `useState<AppMode>` slot in
  `src/App.tsx` rendering `Mode: campaign`.
- **`WarCouncilMountProps` / `WarCouncilRoundResult`** — initial state in, a round-completion
  callback out.
- **`VanguardMountProps` / `VanguardMatchResult`** — the same two members plus `requestTricksWon`,
  the round-scoped async callback that feeds a standalone Vanguard its Muster budget.
- **`TRICKS_PER_ROUND`, `TricksWon`, `isValidTricksWon`** — the one piece of real logic here: a
  validated trick-count entry path, per the developer's 2026-08-05 follow-up.
- **Two stub components** (`stubs/WarCouncilStub.tsx`, `stubs/VanguardStub.tsx`) that genuinely
  invoke every member of each contract — not just declare the prop types — proving the contract
  composes before either real UI exists.

The design idea worth reviewing: **the trick-request callback is the whole AC3/AC4 mechanism**, not a
"manual entry mode" type union. Vanguard never knows which mode it is in — it calls
`requestTricksWon(round)`, validates the result, and runs it through the existing
`scoreRound` → `convertScoreToMuster` pipeline. Campaign mode resolves immediately from a real
completed round; Test mode resolves when a developer submits two numbers.

Validation deliberately sits at the **trick** layer, not the score layer, because
`tricksToPoints` is not injective — verified in `src/warCouncil/scoring.ts`, where trick counts 0–3
*and* 7–9 all map to 6 points. Validating after conversion therefore cannot catch "the CPU won 10
tricks and the player also won 10," which is precisely the impossible-split defect the developer
flagged. Before `scoreRound` runs is the only point where the 13-trick constraint is checkable at
all.

## Verification

All green. Numbers from the final QA round:

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0, no suppressions (`eslint-disable` grep: zero hits) |
| `npm test` | **34 files / 268 tests passed**, 0 failed |
| `npm run build` | exit 0, `dist/` written, 19 modules transformed — this is AC5's actual proof point |
| Pure-core boundary grep | zero React imports in `src/warCouncil/` or `src/vanguard/` |
| Live browser check | `Mode: campaign` renders; console clean on load and after remount |

Reviewed by code-evaluator, defender, and QA in parallel over two rounds. Round 1 raised one
convention issue and two defensive warnings; all three were fixed and round 2 came back
**APPROVED / APPROVED / ALL PASSED** with 0 Critical and 0 Warning.

## Three plan defects found and fixed during implementation

Worth noting because each would have looked like a code bug to a later reader:

1. **`vanguardMount.ts` imported `PlayerSide` from `../vanguard`**, which does not export it
   (`TS2305`). It lives in `src/warCouncil`. Import split across both modules.
2. **`App.tsx`'s `import … from './app'` does not compile on this checkout** (`TS2614` / `TS1149`) —
   the case-insensitive filesystem resolves the bare specifier against the sibling `App.tsx` before
   the `app/` directory's `index.ts`. Shipped as `'./app/index'`. QA reproduced the original failure
   to confirm this is a real defect rather than unexplained drift. Any future `src/App.tsx` sibling
   of a same-named lowercase folder hits this.
3. **The planned `VanguardStub` effect fails lint.** Calling `setStatus({ kind: 'loading' })`
   synchronously in the effect body trips `react-hooks/set-state-in-effect`, and suppression is not
   permitted here. Rewritten to store a round-tagged `RequestOutcome` and derive `status` at render
   time, so `setOutcome` is only ever called inside the resolved `.then()`. Side benefit: a stale
   outcome can no longer render against a newer round.

## For SCRUM-28 / SCRUM-29

- **Build against `WarCouncilMountProps` / `VanguardMountProps` from `src/app`.** Both stubs are
  throwaway — replace them wholesale rather than extending them.
- **`requestTricksWon` must be referentially stable** — memoize with `useCallback` or hold it in a
  ref. The consuming mount calls it from an effect keyed on its identity, so an inline arrow
  re-fires that effect every parent render and issues unbounded duplicate in-flight requests. This
  is documented on the type but cannot be enforced by it, and the failure mode is silent.
- **`TRICKS_PER_ROUND = 13` duplicates the hard-coded `13`** in `src/warCouncil/deal.ts` (13-card
  hands) and `src/warCouncil/playCard.ts` (the `tricksPlayed === 13` completion branch). Deliberate
  debt — consolidating meant editing a completed, tested engine module for a contract-only ticket.
  Whoever consolidates should extract one shared export and update all three call sites plus this
  one.
- **A DOM test environment is still an open decision.** Vitest is scoped to `*.test.ts` only, with no
  `jsdom` or React Testing Library, so neither stub has a render test. Whichever of the two UI
  tickets lands first has to make that call for real.

## Developer decisions outstanding

None blocking, but each is this plan's choice rather than a stated requirement — worth a look before
SCRUM-28/29 treat any of them as fixed:

1. **`requestTricksWon` is async.** This commits SCRUM-29's debug form to *resolving a pending
   promise* on submit rather than reading a value synchronously off state.
2. **`isValidTricksWon` rejects outright** rather than clamping. The alternative: SCRUM-29's form
   makes an invalid split nearly unrepresentable (e.g. deriving one side's count from the other),
   with the validator as a pure backstop rather than the primary defence.
3. **The `onComplete` payload shapes** — `WarCouncilRoundResult` (`finalState` + `score`) and
   `VanguardMatchResult` (`finalState` + `winner`) — are invented by this plan.
4. **`TRICKS_PER_ROUND` duplication** left as debt (above).
5. **No `jsdom`/RTL**, so "the stubs compile" is proven by typecheck + build only (above).

One reviewer note carried forward rather than fixed: `WarCouncilStub` sets
`phase: RoundPhase.Complete` while spreading the rest of an unstarted round, so the fabricated state
satisfies the contract's documented invariant without being a plausible game state. Judged
proportionate for scaffolding with no downstream consumer; the real UI produces a genuinely
completed round.

## Out of scope

The Campaign/Test menu screen (separate ticket), the visual form of Vanguard's debug inputs
(SCRUM-29), battle-loop wiring (SCRUM-34), and any change to `src/warCouncil/`, `src/vanguard/`, or
`src/battle/` — confirmed untouched via `git status`. Neither stub is wired into `main.tsx`.
