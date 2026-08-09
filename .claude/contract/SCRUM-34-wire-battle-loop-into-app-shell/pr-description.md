# PR: Wire the end-to-end battle loop into the app shell

Plan: [plan.md](plan.md)
Jira: [SCRUM-34](https://amazerbeam.atlassian.net/browse/SCRUM-34) — Wire the end-to-end battle loop into the app shell

## Summary

Replaces `App.tsx`'s temporary dev host (the "Switch to Test mode" toggle, the
inline round-dealing, the direct `WarCouncilRound` mount) with a real
orchestrator component, `BattleHost` (`src/app/battle/BattleHost.tsx`), that
mounts `VanguardMatch` for the life of the whole battle and overlays a
freshly-dealt `WarCouncilRound`, then `RoundTransitionPanel`, each time
`VanguardMatch` needs a round's trick split fulfilled. `App.tsx` is now a
one-line mount of `BattleHost` — no manual setup is required to start a
battle.

Two small pure/orchestration modules back the component:

- `dealerForRound.ts` — computes the alternating War Council dealer for a
  given round, reusing `WAR_COUNCIL_FIRST_DEALER` from `src/battle` so the
  "first dealer" fact stays stated once.
- `battleHostReducer.ts` — a four-variant discriminated union
  (`vanguard` / `warCouncilRound` / `roundTransition` / `battleOver`) modelling
  which screen `BattleHost` currently shows, per `react-frontend`'s
  single-reducer-for-non-trivial-state rule.

One new CSS rule (`.battle-overlay`) makes the War Council round / round-
transition screens take over the full viewport above the persistently-
mounted Vanguard board.

## Biggest judgement call — flagged for review

**`src/battle`'s state machine (`BattleState`, `submitWarCouncilCard`,
`beginClash`, `submitClashAction`, `playCpuWarCouncilTurn`,
`playCpuClashTurn`, etc.) is not wired into the running app.** `WarCouncilRound`
and `VanguardMatch` each own a private reducer and only ever report back once
(per round, per whole match) via a callback — neither accepts an externally
dispatched per-action update, while `src/battle`'s functions are push-based
(one call per player action). Reconciling the two would mean rewriting either
component's internals, which sits outside this ticket's "every piece it wires
already exists" scope boundary. This plan therefore composes `WarCouncilRound`
and `VanguardMatch` directly via their existing mount-prop contracts, and
imports only `WAR_COUNCIL_FIRST_DEALER` from `src/battle` — none of its
reducer functions are called anywhere in the running app. This was raised to
the developer during planning and is the single largest structural decision
in this contract; please confirm it's the right call before merging.

## Other decisions worth noting

- `TestModeVanguardHost.tsx`, `TrickEntryForm.tsx`, and `appMode.ts` are left
  on disk, unreferenced from `App.tsx`, rather than deleted outright —
  deleting a standalone dev sandbox wasn't asked for and is easily reversible
  either way (`plan.md` Part 1 → Assumptions made #4). Say if you'd rather
  they were removed.
- `RoundTransitionPanel` is placed between a War Council round's completion
  and the next Clash, and dismissing it resolves `VanguardMatch`'s pending
  `requestTricksWon` promise — `battle-ui.md`'s own previously-flagged
  assumption, resolved this way here. Worth a sanity-check once playable.
- The overlay is a `position: fixed` full-viewport layer above a still-
  mounted, visually-frozen `VanguardMatch` (rather than unmounting/remounting
  it, since `VanguardMatch` exposes no way to extract live board state for a
  later remount). Functionally sound; a real visual-layering call worth a
  look, even ahead of SCRUM-33 polish.

## Verification obtained in this dispatch (Implementer-owned subset of Phase 3)

- `npx vitest run --project node` — `Test Files 44 passed (44)`, `Tests 357 passed (357)`.
- `npx vitest run --project dom` — `Test Files 10 passed (10)`, `Tests 51 passed (51)`.
- `npm run typecheck` (`tsc -b`) — exited 0, no output.
- `npm run lint` (`eslint .`) — exited 0, no output.
- `npx prettier --check` scoped to every file this contract created or
  modified — one file (`BattleHost.tsx`) initially failed on a print-width
  wrap; fixed with a whitespace-only `prettier --write` (no logic change),
  re-verified clean, and typecheck + the `BattleHost` component test were
  re-run afterward to confirm nothing broke.
- Both grep audits (Task M.1: no dev-host markers remain in `App.tsx`; Task
  M.2: `WAR_COUNCIL_FIRST_DEALER` is never redefined under `src/app/**`) —
  zero hits, both confirmed.

## Pending QA (final review round)

- Task M.3 Steps 3–4 — the unfiltered `npm test` suite and `npm run build` —
  are QA-exclusive per this project's workflow and were not run in this
  dispatch.
- Task M.4 — driving a full battle through the running app via the
  `chrome-devtools` MCP (AC1–AC3: lands directly in a playable round, a full
  round → transition → Clash → Breach sequence with both CPUs moving
  themselves and no console errors, no illegal action ever exposed as
  clickable) — is QA-exclusive and was not run in this dispatch.

## Sequencing note

SCRUM-33 (UI polish) is the deliberately deferred next step, per the
developer's sequencing decision recorded in `plan.md` Part 1: this contract
wires the loop against the current, unstyled UI so SCRUM-33 can polish
against a playable loop instead of guessing blind.
