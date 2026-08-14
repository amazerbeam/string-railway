# PT-001 — Skull rank weighting: a curve per opponent

Plan: [`plan.md`](./plan.md) (this folder)

## Summary

The uniform skull draw — "filter to rank ≥ 2, shuffle, take N" — is now a **weight-per-rank
table**. Four named curves ship (`SKULL_WEIGHTS_UNIFORM`, `_RAMP`, `_HUMP`, `_AMBUSH`), each a
`SkullRankWeights` map from rank to relative weight, drawn without replacement through a single
`weightedDraw` helper that consumes exactly one `rng` call per skull.

**`SKULL_WEIGHTS_HUMP` is the active curve** (`SKULL_RANK_WEIGHTS = SKULL_WEIGHTS_HUMP`), so **the
game plays differently the moment this lands** — skulls now cluster on ranks 5–6 instead of being
spread evenly across ranks 2–11.

`SKULL_MIN_RANK` is gone. "Never rank 1" is absorbed into every curve as `1: 0`, so the rule is
stated once instead of twice.

## The one thing the developer must judge by playing

Whether hump is the right active curve is not something a test can answer — only playing it can.
Watch for:

- **Does a hand feel more decision-heavy under hump than it did under uniform?** The design bet is
  that weighting the middle ranks (2/3/4-ish) leaves the trick outcome to the card the player
  chooses, where the old uniform draw and the extreme curves don't.
- **Do the ~60% skull rates on ranks 5–6 read as tense, or as noisy?** That's the simulated rate
  under hump for a held 5 or 6 — high enough that it could go either way at the table.

**The one-line revert**, in `src/hunt/config.ts`:

```ts
export const SKULL_RANK_WEIGHTS: SkullRankWeights = SKULL_WEIGHTS_UNIFORM // was SKULL_WEIGHTS_HUMP
```

## Do not delete the inactive curves as dead code

`SKULL_WEIGHTS_UNIFORM`, `SKULL_WEIGHTS_RAMP`, and `SKULL_WEIGHTS_AMBUSH` are **exported with no
reader in the codebase today** — only their own tests touch them. That is intentional, not an
oversight: they are the **difficulty and variety lever** for later opponents (a boss can be handed
`SKULL_WEIGHTS_AMBUSH` instead of a rule-break). A reviewer or a future contributor pruning
"unused" exports is the most likely way this work gets undone by accident — see `plan.md`'s risk
register and `ideas.md` → "Worth costing" → "Skull rank weighting — a curve per opponent" for the
full rationale.

## Verification results

Recorded cumulatively across Phases 1–5 of this contract.

| Check | Result |
|---|---|
| `npm run typecheck` (Phase 5) | PASS — `tsc -b` exit 0 |
| `npm run lint` (Phase 5) | PASS — `eslint .` exit 0 |
| Pure-core boundary grep — `src\warCouncil`, `src\hunt` for React/DOM references | PASS — zero hits |
| `SKULL_MIN_RANK` grep across `src/` | PASS — zero hits |
| `Math.random` grep across `src/` | PASS — real call sites only in `src/App.tsx` (2, feeding `dealRound`); other hits are comment prose in test docblocks, not calls; none in `src/warCouncil/skulls.ts` |
| Inlined rank-floor grep (`rank >= 2` / `rank > 1`) in `src\warCouncil` | PASS — zero hits |
| `npx prettier --check` on the 6 changed `src/` files | **FAIL** — see note below |
| `npx prettier --check` on `ideas.md` alone | FAIL — pre-existing, confirmed unrelated to this contract's diff (Phase 4 note) |
| Scoped Vitest — `config.test.ts` (Phase 1) | PASS — 30 passed |
| Scoped Vitest — `skulls.test.ts` + `deal.test.ts` (Phase 2) | PASS — 30 passed |
| Scoped Vitest — `config.test.ts` + `deal.test.ts` (Phase 3) | PASS — 38 passed |
| `npm test` (unfiltered) | pending QA — see the `/fb-apply` run report |
| `npm run build` | pending QA — see the `/fb-apply` run report |

### Prettier finding worth a look before merge

`npx prettier --check` fails on two of this contract's own files — **`src/hunt/config.ts`** and
**`src/warCouncil/__tests__/skulls.test.ts`** — not just on the pre-existing `ideas.md` drift Phase
4 already flagged. Diffing against Prettier's own output shows why:

- In `config.ts`, the four curve object literals (`SKULL_WEIGHTS_UNIFORM/RAMP/HUMP/AMBUSH`) were
  written with a line break right after the opening `{` and every `rank: weight` pair packed onto
  one line inside. Prettier preserves "already broken" object literals by putting **one property
  per line** rather than collapsing them back — so it wants each curve expanded to 11 lines
  instead of the current 1.
- In `skulls.test.ts`, one assertion (`only ever skulls cards drawn…`) is currently wrapped across
  three lines; at this repo's `printWidth: 100` it fits on one, so Prettier wants it collapsed.

Both files type-check, lint clean, and their tests pass — this is a **formatting-only** deviation,
not a behavioural one. Per this phase's scope ("no production change"), it was reported rather than
fixed with `prettier --write` here. Worth a `npm run format` pass (or accepting the curves' compact
layout as an intentional exception) before merge.

## Convention for future contributors

A tunable *shape* — a curve, a table, a named set of values — lives the same way a tunable
*value* does: a named, exported constant in `src/hunt/config.ts`, with exactly one place in the
codebase (`SKULL_RANK_WEIGHTS` here) naming which one is active. Don't inline a shape at its point
of use, and don't delete an unreferenced named shape without checking whether it's a deliberately
banked alternative first.
