# PR: Buff activation flow and tiered AP costs (DLR-108)

Plan: [`plan.md`](./plan.md) in this folder. Jira: **DLR-108**, epic DLR-103.

## Summary

Gives a `Buff` a price and a way to be brought into a trick. Ships four new pure modules under
`src/hunt/`:

- `src/hunt/apConfig.ts` — the AP tunable block moved out of `config.ts` (which was at 385 of a
  400-line budget), plus the four new per-hand reward caps (`MAX_REFUND_PER_HAND`,
  `MAX_MULTIPLIER_BONUS_PER_HAND`, `MAX_FLAT_DAMAGE_BONUS_PER_HAND`, `MAX_COIN_BONUS_PER_HAND`).
  Re-exported from `config.ts` so no existing importer changed.
- `src/hunt/buffCosts.ts` — the AP cost model as a formula over two tables (`REWARD_BASE`,
  `CONDITION_MODIFIER`) for the 11 condition families, plus an off-curve `CONSUMABLE_AP_COST`
  table for Cheat, Timebomb and the five consumables. `buffApCost` / `apCostOf` are the two entry
  points; `apCostOf` throws `RangeError` on `BuffKind.Unassigned`.
- `src/hunt/buffAccrual.ts` — `BuffBonusAccrual`, the four per-hand caps, `accrueAxisBonus`
  (clip-not-bank), `overlapBonusFor` (DLR-124 R5), and `resolveFiredBuffs`. Deliberately ships
  no per-hit reset — `startHandAccrual()` is the only exported reset, enforcing DLR-124 R6's
  per-hand-not-on-a-hit asymmetry.
- `src/hunt/buffActivation.ts` — the activation flow: `BuffActivationRefusal`
  (`WindowClosed → AlreadyActive → InsufficientAp`), `BuffActivationState`, `activateBuff`,
  `openBuffWindow` (per-trick boundary, pool untouched), `refreshBuffsForNewHand` (the only
  per-hand pool reset).

Also widens `src/hunt/buffs.ts`'s `BuffKind` (+16), `BuffRewardAxis` (+8), and `BuffCondition`
(optional `target` payload), and adds `BuffCadence` / `BUFF_CADENCE` (DLR-124 R4).

The one app-layer change: `src/app/warCouncil/roundUiState.ts` gains `buffActivationStock`,
which feeds `windowOpen` from the existing `discardWindowOpen` — AC1's wiring point, built
exactly like the existing `discardStock`. No felt-rail button, no reducer action, no `.tsx`
surface; nothing in `src/` reads a buff yet.

## Acceptance criteria

1. **Apply Buff gated by the existing `discardWindowOpen`, no new timing gate.** MET —
   `buffActivationStock` reads only `discardWindowOpen(state)`; `buffActivationStockFor.test.ts`
   asserts the two functions agree on the same state in three scenarios (open, mid-trick,
   round complete).
2. **Tiered AP cost, named/retunable constants — DIVERGES FROM THE LITERAL AC, APPROVED SCOPE.**
   See "AC2 divergence" below.
3. **Stacking — multiple buffs activated for one trick if AP allows.** MET —
   `buffActivation.test.ts` spends a bronze Foresight then a bronze Ward against
   `STARTING_AP = 6`, drawing the pool to 3, then shows a gold Cheat (7 AP) refused
   `InsufficientAp` against that remainder.
4. **AP is one per-hand pool across up to six per-trick windows; no silent mid-hand refresh.**
   MET — `buffActivation.test.ts` spends across three `openBuffWindow` boundaries, asserts the
   pool never returns to `STARTING_AP` at any of them, and that only `refreshBuffsForNewHand`
   restores it.
5. **Insufficient AP refused with a reason, existing disabled-with-reason convention.** MET —
   `buffActivationRefusalFor` returns `BuffActivationRefusal.InsufficientAp`/`WindowClosed`/
   `AlreadyActive` or `null`, in the same shape as `applyDamageRefusalFor`/`flaskRefusalFor`.

## AC2 divergence (developer decision, not a defect)

AC2 as written names `BUFF_ACTIVATION_COST = { bronze: 3, silver: 5, gold: 8 }`. **This is not
shipped.** AC2 predates DLR-111's authored 78-card v1 pool, which prices cost by family and
reward axis as well as tier — a single flat tier table cannot express that. This contract ships
DLR-111's model instead:

```
apCost = clamp(REWARD_BASE[axis][tier] + CONDITION_MODIFIER[family], 1, 6)
```

plus an off-curve `CONSUMABLE_AP_COST` table for the seven consumable/activated cards. Concretely,
this changes the one number AC2 names: **gold Cheat is priced 7 AP, not 8** — deliberately above
`STARTING_AP` per DLR-111. Confirmed unshipped by a repo-wide grep for `BUFF_ACTIVATION_COST`
(zero hits outside `buffCosts.ts`'s docblock explaining the divergence).

## Developer decisions carried forward from the File map

- **Every AP figure** in `REWARD_BASE`, `CONDITION_MODIFIER`, `CONSUMABLE_AP_COST` — agent-chosen
  on DLR-111, never played. Retune by editing those two tables (plus `CONSUMABLE_AP_COST` for the
  off-curve seven).
- **All four per-hand caps** — `MAX_REFUND_PER_HAND = 6`, `MAX_MULTIPLIER_BONUS_PER_HAND = 6`,
  `MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12`, `MAX_COIN_BONUS_PER_HAND = 10` — agent-chosen on
  DLR-111/DLR-124, never played.
- **`apCost` as a derived lookup rather than a field on `Buff`** — confirm before DLR-112 mints
  buffs from a reel, since a per-card discounted price would need a field instead.
- **`BuffTargetSuit` duplicates `warCouncil`'s `Suit` values**, forced by the module boundary
  (`src/hunt/` cannot import `src/warCouncil/`). A test pins the two unions together
  member-for-member so drift fails loudly.
- **Two carried-forward defects, deliberately not fixed here:** `Keepsake` may be unfireable in a
  full six-trick hand; `Ward` silver/gold buy nothing while `DAMAGE_PER_HIT = 1`.

## Verification numbers (QA, 2026-08-23)

- `npm run typecheck` — exit 0, zero errors.
- `npm run lint` — exit 0, zero errors/warnings.
- `npm test` — **1192 passed, 0 failed, 91 test files** (baseline was 1089 passed / 86 files;
  this contract added 103 tests across 5 new spec files plus widened `buffs.test.ts`).
- `npx prettier --check` on the 14 files this contract created or modified — exit 0.
- `npm run build` — exit 0, `dist/` written (108 modules transformed, ~261 kB JS / 38 kB CSS).
- Boundary grep (`src/hunt` for React/DOM/storage/`Math.random()`) — zero real hits; the three
  matches are docblock prose naming `Math.random()` as the thing NOT used.
- `BUFF_ACTIVATION_COST` repo-wide grep — one hit, in `buffCosts.ts`'s docblock stating the
  divergence; zero hits as a live identifier.
- Cap-name grep — hits confined to `buffAccrual.ts` (the cap map), `config.ts` (the re-export),
  and `index.ts` (the barrel re-export) — no bare numeric literal stands in for a cap anywhere else.
- File sizes — every file in `src/hunt/*.ts` and `roundUiState.ts` is under 400 lines; largest is
  `config.ts` at 372 (down from 385 pre-split) and `runTransitions.ts` at 306.

## Note for future contributors

A buff's AP cost is **a lookup over two tables** (`REWARD_BASE` + `CONDITION_MODIFIER` for
condition families, `CONSUMABLE_AP_COST` for consumables), read through `apCostOf(buff)` — not a
field stored on `Buff`. Retuning the whole 78-card v1 pool is a two-table edit, not 78
construction-site edits.
