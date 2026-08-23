# DLR-105 — Buff pile: data model, tiers, and per-run ownership

Plan: `.claude/contract/DLR-105-buff-pile-data-model/plan.md`

## Summary

Adds one shared `Buff` data type (`src/hunt/buffs.ts`) — identity, tier (`bronze`/`silver`/`gold`),
a `BuffCondition` descriptor, and a `BuffReward` descriptor whose *axis* varies per card
(`magnitude` / `durationTricks` / `heartCount` — the three known cases the ticket names: Bells'
damage bonus, Cheat's duration, and Shield's heart count). `RunState` gains an owned per-run buff
pile (`buffs: readonly Buff[]`) and a monotonic id minter (`nextBuffId`), seeded with
`STARTING_BUFF_COUNT` (4) bronze buffs at `startRun` and carried across every fight boundary
through the existing `{ ...run, ... }` spreads in `advanceRun`/`recordEncounter` — no explicit
parameter needed, mirroring how `whetstones` already persists.

No activation logic, no UI, and no slot-machine draw logic — this ticket ships the type and the
owned-pile persistence only, per its own AC4. The seeded buffs carry deliberately inert placeholder
content (`condition: { kind: 'unassigned' }`, `reward: { axis: magnitude, value: 0 }`), since the
real card catalog is explicitly deferred to a separate, not-yet-authored design ticket (DLR-103
T7a) and nothing in this ticket reads those values yet.

Later tickets (Cheat/Timebomb migration, Shield's redesign, the slot machine) draw, activate, and
persist against this one shared shape instead of three bespoke mechanics.

## Verification results

- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `npm test` — 1 pre-existing, unrelated failure (see below); every test this contract added or
  touched passes (7 new tests across `buffs.test.ts` and `run-buffs.test.ts`).
- `npm run build` — clean, `dist/` written.
- All 3 reviewers (Code-Evaluator, Defender, QA) approved on the first pass — no fix round needed.

### A pre-existing, unrelated test failure

`src/hunt/__tests__/envenom.test.ts` → `buyFromShop — Envenom (AC1, AC2) > does NOT add a Cheat`
fails on `npm test`. Confirmed via `git stash` to already fail on `e37dd68`, the commit immediately
before this contract started — caused by an earlier, unrelated commit that raised
`RUN_STARTING_CHEATS` from 0 to 1 without updating this test's expectation (`funded(3)` now starts
with 1 Cheat already granted, not 0). This contract touches none of `envenom.ts`, `shop.ts`,
`runTransitions.ts`, or `run.test.ts`, and does not fix it — that's a separate, small ticket.

## New convention for future contributors

The buff pile has **no capacity cap**, unlike Cheat's 2-slot cap (`CHEAT_SLOT_COUNT`). This is a
deliberate scope decision recorded in `plan.md`'s Risks section, not an oversight — nothing in the
ticket or the design doc states a cap, and the closest precedent (`whetstones`) is also uncapped.
If a cap is wanted later, it's a config key plus a throw in whatever function first lets the pile
grow past `seedStartingBuffPile` — a T5/T8 concern, not this ticket's.

## Files changed

**Created:**
- `src/hunt/buffs.ts`
- `src/hunt/__tests__/buffs.test.ts`
- `src/hunt/__tests__/run-buffs.test.ts` (split out of `run.test.ts` to stay under the 400-line
  budget — same test content as originally specified, different file)

**Modified:**
- `src/hunt/config.ts` — added `STARTING_BUFF_COUNT`
- `src/hunt/run.ts` — added `buffs`/`nextBuffId` to `RunState`, seeded in `startRun`
- `src/hunt/index.ts` — barrel exports for the above
