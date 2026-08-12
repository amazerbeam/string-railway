# App shell — `src/app/`

**Status:** implemented
**Built by:** SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47, DLR-53, DLR-63, DLR-67

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
| `WarCouncilMountProps`  | Props a War Council mount accepts: `initialState` and (since DLR-53) a required `hunt: Hunt` in, `onComplete` out | `warCouncilMount.ts` |
| `WarCouncilRoundResult` | What a completed War Council round reports: `finalState` + `damage`, a `Record<PlayerSide, number>` | `warCouncilMount.ts` |

DLR-53 added `hunt: Hunt` as a **required** field — `src/hunt`'s own pairing, widened by DLR-63 to
`{ quarry, demand, loseCredits }` and then **narrowed by DLR-67 to `{ quarry }`** when the Demand and
the Lose-credit pool were both retired. `warCouncilMount.ts` needed no edit for any of that: it merely
declares the prop, and `Hunt` changes underneath it.

Required rather than optional keeps earning its place — a required-field change breaks every
construction site at compile time rather than rendering `undefined`. DLR-67's narrowing is the case
that proved it in the deletion direction: the compiler found both construction sites.

**`WarCouncilRoundResult.score` became `damage` on DLR-67**, keeping its `Record<PlayerSide, number>`
shape but now built from `scoreHunt` per side rather than from the deleted `scoreRound`. DLR-53 had
deliberately left this payload alone as speculative shape for a run loop nobody had written; DLR-67
changed it because DLR-68's acceptance criteria already named the field `damage`, so the epic's
vocabulary was adopted one ticket early rather than a second one invented — and DLR-68 duly shipped
with `damage`, so no second rename followed. **Nothing consumes it** — `App.tsx`'s `handleComplete`
still takes no parameter.

Both are type-only exports, re-exported via `export type` from `index.ts` (required by this
project's `verbatimModuleSyntax` tsconfig setting). `src/app/warCouncil/`'s own exports —
`WarCouncilRound`, `roundReducer`, `labels.ts`, `fanLayout.ts`, `useRovingTabIndex`, and the zone
components — are tabulated in [../war-council-ui/README.md](../war-council-ui/README.md), not here.

## How it works

### `App.tsx` deals directly and restarts on completion

`src/App.tsx` holds exactly two pieces of state — the current round number and the currently dealt
`RoundState` — plus one module-scope constant, and mounts `WarCouncilRound`
(`src/app/warCouncil/WarCouncilRound.tsx`) against them directly, with no orchestrator in between:

```tsx
// The slice's single encounter (§11): one Quarry. Narrowed by DLR-67 — the Demand and the
// Lose-credit pool were both retired.
const HUNT: Hunt = { quarry: { character: SLICE_QUARRY_CHARACTER } }

const [round, setRound] = useState(1)
const [dealt, setDealt] = useState<WarCouncilState>(() =>
  dealRound(dealerForRound(1), Math.random, SLICE_QUARRY_CHARACTER),
)

function handleComplete() {
  const next = round + 1
  setRound(next)
  setDealt(dealRound(dealerForRound(next), Math.random, SLICE_QUARRY_CHARACTER))
}

return <WarCouncilRound key={round} initialState={dealt} hunt={HUNT} onComplete={handleComplete} />
```

`HUNT` lives at module scope because its one half is a configuration constant — it holds no
per-round state, so it cannot go stale across the `key={round}` remounts below, and it is read-only
rather than the kind of module-level mutable state this project's conventions bar. DLR-53 also
started passing `SLICE_QUARRY_CHARACTER` as `dealRound`'s third argument, which is what makes the
Quarry's round-long rule-break active in the shipped app for the first time.

`onComplete`'s declared type is `(result: WarCouncilRoundResult) => void`, but `handleComplete`
takes no parameter at all rather than an unread `_result` — this project's ESLint config has no
`argsIgnorePattern` exemption for underscore-prefixed unused parameters, so a zero-argument function
(structurally assignable to that callback type) is what actually lints clean. The completed round's
result is deliberately not read either way. There is no score display, no Muster-equivalent
conversion, and no match-level state left to feed once `src/battle/` and `src/vanguard/` are gone
(both retired by DLR-47); this restart is a placeholder ahead of the real multi-round run loop a
later ticket in the DLR-46 epic builds. The `key={round}` remount is what makes each restart a
genuinely fresh `WarCouncilRound` instance rather than one instance being fed new props.

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

- **No multi-round run loop.** `App.tsx`'s "deal again on completion" restart tracks no score, no
  win condition, and no state across rounds beyond dealer alternation — a later ticket in the
  DLR-46 epic replaces this with the real Hunt run loop. DLR-53 narrowed the gap without closing it:
  a single Hunt is playable end to end and reaches a real end panel. But every restart re-deals the
  *same* encounter, because `HUNT` is a constant rather than run state — and since DLR-67 there is no
  target and no verdict either, only two damage figures nothing consumes. Health, damage
  application, encounter progression, and a victory/defeat screen are all still absent. DLR-68 closed
  the arithmetic and the direction — both figures are now rounded and labelled with the side each
  depletes — but it deliberately applied nothing, so **DLR-70/DLR-71** are where the damage this app
  computes first does something.
- **No way to reach a standalone/manual-entry test harness.** DLR-47 deleted
  `TestModeVanguardHost.tsx`, `TrickEntryForm.tsx`, `appMode.ts`, and `isValidTricksWon` along with
  the rest of the Vanguard UI — there is currently no manual-entry mechanism at all, campaign or
  otherwise. A future ticket should decide whether a Hunt-era equivalent is worth building.
- **`src/app/warCouncil/` carries its own deferred list** — the untested no-scroll layout, the
  defensive `cpuFault`/`cpuRejected` branch, and the single dark theme are recorded in
  [../war-council-ui/README.md](../war-council-ui/README.md).
