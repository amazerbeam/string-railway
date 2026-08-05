# Battle — `src/battle/`

**Status:** implemented
**Built by:** SCRUM-19, SCRUM-25, SCRUM-26, SCRUM-27

## Responsibility

Sequences a full battle end to end: a single `BattleState` moves through a War Council round →
Muster conversion → The Clash → (Breach, or loop back to the next round with the same persistent
Vanguard board and an alternated dealer). This is the top-level orchestrator that wires together
the four independently-built engines — War Council (`src/warCouncil/`), the Vanguard board and
Clash (`src/vanguard/`) — without re-implementing any of their rules. It holds no CPU logic and no
UI: every function here takes a card or an action as *input* from whatever calls it (a test script
today; a future UI or CPU ticket later) and never chooses one itself. Like `src/warCouncil/` and
`src/vanguard/`, this module has no pure-core ESLint boundary — SCRUM-19 explicitly declined one for
the orchestrator and SCRUM-25 didn't revisit that call — but the code is pure logic anyway (no
React import, no DOM access, no I/O).

## Key types & exports

| Export                     | Purpose                                                                                     | File                |
| --------------------------- | --------------------------------------------------------------------------------------------- | -------------------- |
| `BattlePhase`               | `as const` map of the four battle-loop stages, plus its derived value type                    | `battlePhase.ts`     |
| `BattleState`               | 4-variant discriminated union keyed on `phase`, one shape per stage                            | `battleState.ts`     |
| `WAR_COUNCIL_FIRST_DEALER`  | Configuration constant: which side deals round 1 of a battle                                  | `config.ts`          |
| `BattleRejectionReason`     | `as const` map of the four orchestration-level rejection reasons (wrong-phase calls, plus `NotCpuTurn` since SCRUM-26) | `battleAction.ts`    |
| `BattleActionResult`        | Discriminated union: `{ ok: true, state }` or `{ ok: false, reason }`, unioning orchestration-level and bubbled engine-level rejection reasons | `battleAction.ts`    |
| `startBattle`               | Builds round 1: creates the Vanguard board (once, ever) and deals the first War Council round | `startBattle.ts`     |
| `submitWarCouncilCard`      | Submits one card; transitions to `MusterConversion` when the round's 13th trick resolves      | `submitWarCouncilCard.ts` |
| `beginClash`                | Converts the completed round's score to Muster and opens the Clash                            | `beginClash.ts`      |
| `submitClashAction`         | Submits one Clash action; resolves on Breach, or deals the next round on a natural Clash end   | `submitClashAction.ts` |
| `playCpuWarCouncilTurn`     | Plugs `src/warCouncil/`'s `chooseCpuMove` heuristic into `submitWarCouncilCard` for the CPU's War Council turn (SCRUM-26) | `playCpuWarCouncilTurn.ts` |
| `playCpuClashTurn`          | Plugs `src/vanguard/`'s `chooseCpuClashAction` heuristic into `submitClashAction` for the CPU's Clash turn (SCRUM-27) | `playCpuClashTurn.ts` |

All eleven are re-exported from `index.ts` — `BattlePhase`, `WAR_COUNCIL_FIRST_DEALER`,
`BattleRejectionReason`, and the six functions as values; `BattleState` and `BattleActionResult`
via `export type` (required by this project's `verbatimModuleSyntax` tsconfig setting).

## How it works

### `BattleState` is a phase-keyed discriminated union, not a flat interface

`battleState.ts` replaced SCRUM-19's flat three-field placeholder with a 4-variant union, one
variant per `BattlePhase` value:

```ts
export type BattleState =
  | { phase: WarCouncilRound; round: number; dealer: PlayerSide; vanguard: VanguardState; warCouncil: WarCouncilState }
  | { phase: MusterConversion; round: number; dealer: PlayerSide; vanguard: VanguardState; warCouncil: WarCouncilState }
  | { phase: Clash; round: number; dealer: PlayerSide; clash: ClashState }
  | { phase: Resolved; round: number; vanguard: VanguardState; winner: PlayerSide }
```

This makes an illegal read a compile error rather than a runtime `undefined` — code cannot read
`.clash` while `phase === 'warCouncilRound'`, because that field doesn't exist on that variant.
Every field is `readonly`. Note the `Clash` variant carries no `vanguard` field of its own — the
board lives inside `clash.board` for the duration of a Clash; it re-surfaces as `state.vanguard`
only once the Clash ends (either `Resolved` or the next `WarCouncilRound`).

### Board persistence is structural, not conventional

`createVanguardBoard()` is called **exactly once** in the entire module — inside `startBattle`.
Every other transition threads the board it was handed forward: `submitClashAction` reads
`result.state.board` off the engine's own result and carries that same reference into the next
`BattleState`, whether that's `Resolved` or the next round's `WarCouncilRound`. This is what makes
"the board never resets between rounds" (the design doc's stated invariant) a guarantee of the
code's shape rather than a rule someone has to remember to follow — no function in this module has
a second code path that could call `createVanguardBoard()` again.

### The lifecycle functions — one per arrow in the battle-loop diagram, plus one CPU composition

Each function takes the current `BattleState` plus whatever external input that step needs (a
card, a Clash action, an `rng` function), and returns a `BattleActionResult` — either
`{ ok: true, state }` with the next `BattleState`, or `{ ok: false, reason }` naming exactly why.
Every one starts with a **phase guard**: reject with the matching `BattleRejectionReason`
(`NotWarCouncilPhase`, `NotMusterConversionPhase`, `NotClashPhase`) unless `state.phase` is the one
this function operates on. This is the only kind of rejection this module invents itself — every
other failure is bubbled unchanged from the delegated engine call (`IllegalMoveReason` from
`playCard`, `IllegalActionReason`/`ClashRejectionReason` from `applyClashAction`), so a caller
inspecting a rejection always gets the real underlying reason, never a laundered "something went
wrong." `playCpuWarCouncilTurn` (SCRUM-26, below) adds a second kind of guard, `NotCpuTurn`, since
it is the one function in this module that also cares *whose* turn it is, not just which phase the
battle is in.

- **`startBattle(rng)`** (`startBattle.ts`) — the only function with no rejection path. Calls
  `createVanguardBoard()` and `dealRound(WAR_COUNCIL_FIRST_DEALER, rng)`, returns a
  `WarCouncilRound`-phase state at `round: 1`. Its declared return type is narrowed to
  `Extract<BattleState, { phase: WarCouncilRound }>` rather than the full `BattleState` union — a
  deliberate, harmless deviation from the plan's literal signature, since `startBattle` can only
  ever produce that one variant and every caller reads `dealer`/`vanguard` off the result without a
  narrowing check first.

- **`submitWarCouncilCard(state, side, card, choice?)`** (`submitWarCouncilCard.ts`) — delegates
  every legality question to `playCard`, bubbling its `IllegalMoveReason` unchanged on rejection.
  On success, if the returned round's `phase === RoundPhase.Complete` (the 13th trick just
  resolved), transitions to `MusterConversion`, carrying the completed round state forward so the
  next function can read `tricksWon` off it. Otherwise stays in `WarCouncilRound` with the updated
  round.

- **`beginClash(state)`** (`beginClash.ts`) — the one function with no possible *engine-level*
  rejection (only the orchestration-level phase check). Runs `scoreRound(tricksWon)` →
  `convertScoreToMuster(score)` → `openingSideForRound(round)` → `startClash(board, muster,
  openingSide)` in sequence — all pure functions already fully specified by the War Council and
  Vanguard engines — and returns a `Clash`-phase state.

- **`submitClashAction(state, side, action, rng)`** (`submitClashAction.ts`) — delegates to
  `applyClashAction` exactly as `submitWarCouncilCard` delegates to `playCard`, then branches on the
  returned `ClashState.status`:
  - **`Breached`** → `Resolved`-phase state naming the winner directly from `ClashState.winner`
    and carrying the final board (`result.state.board`) — no further actions are accepted, since no
    function in this module accepts a `Resolved`-phase state as valid input.
  - **`Complete`** (both sides' Muster exhausted, no Breach) → deals straight into the next round
    **inside the same function call**: increments `round`, flips `dealer` via
    `otherSide(state.dealer)`, deals a fresh War Council round with the caller-supplied `rng`. A
    caller can never observe a stuck "Clash finished but nobody dealt the next round" state,
    because there is no intermediate state to observe — this is why `rng` is threaded into every
    `submitClashAction` call even though the overwhelming majority never consume it (only the rare
    call that ends a Clash naturally does).
  - **`InProgress`** → carries the updated `ClashState` forward, phase unchanged.

- **`playCpuWarCouncilTurn(state)`** (`playCpuWarCouncilTurn.ts`, SCRUM-26) — a thin composition,
  not a fifth independent engine action: phase-guards `WarCouncilRound` (`NotWarCouncilPhase`),
  then turn-guards that `currentTurn(state.warCouncil) === PlayerSide.Cpu` (`NotCpuTurn` if not),
  then calls `src/warCouncil/`'s `chooseCpuMove(state.warCouncil, PlayerSide.Cpu)` and hands the
  result straight to `submitWarCouncilCard`. It introduces no new state-mutation path of its own —
  every value it can produce is drawn from a set `submitWarCouncilCard`/`playCard` already accept,
  so its own failure surface is exactly the two guards above.

- **`playCpuClashTurn(state, rng)`** (`playCpuClashTurn.ts`, SCRUM-27) — the exact same shape as
  `playCpuWarCouncilTurn`, one phase down: phase-guards `Clash` (`NotClashPhase`), then turn-guards
  that `state.clash.status === InProgress && state.clash.turn === PlayerSide.Cpu` (`NotCpuTurn` if
  not — reusing the same rejection reason SCRUM-26 added, no new enum member), then calls
  `src/vanguard/`'s `chooseCpuClashAction(state.clash.board, PlayerSide.Cpu,
  state.clash.muster[PlayerSide.Cpu])` and hands the result straight to `submitClashAction`,
  threading through the `rng` that function needs for its own Clash-Complete → next-round
  transition. Like its War Council sibling, it introduces no new state-mutation path of its own —
  its failure surface is exactly the two guards above, plus whatever `submitClashAction` can already
  reject. It does not catch `chooseCpuClashAction`'s dead-end throw (see `vanguard.md` → *The Clash
  CPU heuristic*) — an unhandled throw from that call propagates straight out of this function too.

### Dealer alternation is one named field, flipped in exactly one place

`dealer: PlayerSide` lives on three of the four `BattleState` variants (not `Resolved`, which has
no next round to deal). It is set once by `startBattle` (to `WAR_COUNCIL_FIRST_DEALER`) and flipped
exactly once — `otherSide(state.dealer)` inside `submitClashAction`'s `Complete` branch, the single
point where a Clash ends without a Breach. No other code in this module re-derives or reassigns
`dealer`.

### `WAR_COUNCIL_FIRST_DEALER` — a documented placeholder tunable

`config.ts` exports one configuration constant:

```ts
export const WAR_COUNCIL_FIRST_DEALER: PlayerSide = PlayerSide.Player
```

Nothing in the brief or linked design docs states which side deals round 1 of a battle (unlike
`CLASH_FIRST_ROUND_OPENER` in `src/vanguard/config.ts`, whose default was stated outright by a
prior ticket's AC). This value is a documented placeholder — `startBattle.ts` is its only consumer.

## Rules & invariants enforced

- No pure-core ESLint boundary on this folder (deliberate — see Responsibility above), but the
  code contains no React import, no DOM access, and no `Math.random()` — `rng` is threaded
  explicitly into `startBattle` and `submitClashAction` exactly as `dealRound` requires.
- Every field on every `BattleState` variant is `readonly`; every transition function returns a
  new object rather than mutating its input, matching this project's reducer-driven state-update
  convention.
- Every rejection is a typed, specific reason (`BattleRejectionReason` or a bubbled engine reason)
  — no generic `WrongPhase` catch-all, no `try`/`catch` laundering a failure into a success shape
  (there is nothing in this module capable of throwing under normal operation).
- `round` is a plain incrementing number with no upper-bound check anywhere in this module —
  deliberately no round cap (an explicit non-requirement, not an oversight).

## Deferred / not yet implemented

- No UI, component, or rendering code touches this module. `playCpuWarCouncilTurn` (SCRUM-26) and
  `playCpuClashTurn` (SCRUM-27) between them now cover CPU decision-making for both phases of a
  battle, but nothing here accepts input from an actual human via UI — no UI exists anywhere in this
  repository.
- **`battleTestHelpers.ts`'s scripted Clash/War-Council helpers duplicate a simplified version of
  the real heuristics** now that both `chooseCpuMove` and `chooseCpuClashAction` exist for real.
  Left untouched by both SCRUM-26 and SCRUM-27 (their own scope boundaries exclude it, to avoid
  coupling `battleLoop.integration.test.ts` to CPU behaviour it wasn't written to test) — a future
  ticket could swap the integration test over to the real heuristics and remove the duplication.
- No campaign or multi-battle layer — `round` counts War Council rounds within one battle only;
  nothing here persists across a battle boundary or exposes a "next battle" concept, though
  `dealer`'s single-named-field design was deliberately chosen so a later ticket could extend it
  across a hypothetical multi-battle boundary without rewriting this orchestrator.
- `WAR_COUNCIL_FIRST_DEALER`'s value (`PlayerSide.Player`) is a placeholder pending developer
  confirmation — flip it in one line in `config.ts` if the other side is wanted.
