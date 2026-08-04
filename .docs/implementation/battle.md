# Battle — `src/battle/`

**Status:** scaffold
**Built by:** SCRUM-19

## Responsibility

Owns battle-orchestration — the top-level state that will eventually hold a round in progress,
referencing (not duplicating) each engine's own state. This is the module a future orchestrator
ticket (plan.md's "A6") holds as its single source of truth. Unlike `src/warCouncil/` and
`src/vanguard/`, this module has no pure-core ESLint boundary — no ticket has yet stated the
orchestrator must be React/DOM-free.

## Key types & exports

| Export                                     | Purpose                                                                    | File             |
| ------------------------------------------ | -------------------------------------------------------------------------- | ---------------- |
| `BattlePhase`                              | `as const` map of the four battle-loop stages, plus its derived value type | `battlePhase.ts` |
| `BattleState`                              | Interface composing `phase`, `warCouncil`, and `vanguard`                  | `battleState.ts` |
| `BattlePhase`, `BattleState` (re-exported) | Barrel                                                                     | `index.ts`       |

## How it works

### `BattlePhase`'s four stages

`battlePhase.ts` defines a fixed set of four named phases using the `as const` object-map pattern
(this project's `erasableSyntaxOnly` tsconfig setting forbids `enum`):

```ts
export const BattlePhase = {
  WarCouncilRound: 'warCouncilRound',
  MusterConversion: 'musterConversion',
  Clash: 'clash',
  Resolved: 'resolved',
} as const

export type BattlePhase = (typeof BattlePhase)[keyof typeof BattlePhase]
```

The four keys map 1:1 to a battle round's stages: a War Council round in progress, Muster
conversion, The Clash in progress, and Breach reached / battle resolved (the same terminal phase
covers both descriptions). This value set is locked down by a regression test —
`src/battle/__tests__/battlePhase.test.ts` asserts `Object.values(BattlePhase)` equals exactly
`['warCouncilRound', 'musterConversion', 'clash', 'resolved']` and that there are no duplicate
values — so an accidental rename or deletion of one of these four strings fails a test instead of
silently breaking whichever future code switches on it.

### `BattleState` composes, it does not duplicate

`battleState.ts` holds three `readonly` fields — `phase: BattlePhase`, `warCouncil: WarCouncilState`,
`vanguard: VanguardState` — importing the two engine types via `import type`. It intentionally does
**not** inline any War Council or Vanguard fields, and does not yet carry a round counter, dealer,
active-side, or winner field — see _Deferred_ below. `index.ts` re-exports `BattlePhase` as a value
(because later code will read `BattlePhase.Clash` etc.) and `BattleState` via `export type`
(required by this project's `verbatimModuleSyntax` tsconfig setting, since it's type-only).

## Rules & invariants enforced

- No pure-core ESLint boundary on this folder (deliberate — see Responsibility above).
- `readonly` on all three `BattleState` fields, matching this project's reducer-driven,
  produce-a-new-object state-update convention (`.claude/skills/react-frontend/SKILL.md`).

## Deferred / not yet implemented

- `BattleState` has no `round`, `dealer`, `activeSide`, or `winner` field — deliberately minimal per
  `plan.md`'s stated risk ("over-designing the shared state shape before the engines it wraps
  exist"). A future orchestrator ticket (A6) is expected to extend it.
- No actual battle-loop transition logic exists — nothing currently reads or writes `BattlePhase`
  outside its own test. There is no reducer, no orchestrator component, and no code that advances a
  battle from one phase to the next.
- No React component, hook, or rendering code touches this module yet.
