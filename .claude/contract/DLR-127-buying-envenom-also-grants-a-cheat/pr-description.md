# DLR-127 — Buying Envenom also grants a Cheat

Plan: [`plan.md`](./plan.md) in this folder. Contract: `.claude/contract/DLR-127-buying-envenom-also-grants-a-cheat/`.

## The finding, first: there is no production defect

DLR-127 reports that purchasing an Envenom charge also adds a Cheat — two things for one price. **It does not.** `buyFromShop`'s Envenom branch (`src/hunt/runTransitions.ts:205-206`) is:

```ts
case ShopItem.Envenom:
  return { ...paid, envenomCharges: run.envenomCharges + 1 }
```

It spreads the paid run and writes one field. It never touches `cheats`.

What was actually red: the assertion read `expect(buyFromShop(funded(3), ShopItem.Envenom).cheats).toEqual([])`, and its fixture helper `funded` is built on `startRun()`, which seeds `grantCheats(RUN_STARTING_CHEATS, 1)`. **`RUN_STARTING_CHEATS` moved `0 → 1` in commit `ccc07ec` ("Version 4").** From that commit onwards the assertion has been failing on the run's *opening Cheat grant*, not on anything the purchase did — hence `expected [ { id: 1 } ] to deeply equal []`. The sibling spec `run.shop.test.ts` never went red because its fixtures are written `{ ...startRun(), coins: 5, cheats: [] }`, explicitly zeroing the list; `envenom.test.ts`'s helper does not.

No production file was changed. `git status` was checked as a gate to prove it.

## Sibling purchases: none shares the defect

The ticket asks for Poison Guard, Whetstone and the Flask to be checked. All were — along with the Cheat and the Heal — and the answer is a test rather than a reading of the switch statement. `src/hunt/__tests__/run.purchaseIsolation.test.ts` asserts the **exact** set of `RunState` fields each transition writes:

| Transition | Fields written, and no others |
|---|---|
| `buyFromShop` Cheat | `cheats`, `coins`, `nextCheatId` |
| `buyFromShop` Envenom | `coins`, `envenomCharges` |
| `buyFromShop` Poison Guard | `coins`, `poisonGuardHeld` |
| `buyFromShop` Whetstone | `coins`, `whetstones` |
| `buyFromShop` Heal | `coins`, `encounter` |
| `drinkFlask` | `encounter`, `flaskCharges` |

An exact set rather than a spot-check is what makes this catch the *next* one: a branch that starts writing a field nobody thought to name fails here, and so does a `RunState` field added later and written by accident.

The flask is covered as a transition rather than skipped on a technicality — it is not in `SHOP_ITEMS` and cannot be bought, but it is the same class of question.

## Why the replacement assertion is stronger, not weaker

The contract's bar was "make it pass without weakening it". The original `toEqual([])` asserted an *absolute* Cheat list, which conflated two separate facts — what the run opened holding, and what the purchase did. Only the second is Envenom's business. The replacement:

```ts
const before = funded(3)
expect(before.cheats).toHaveLength(RUN_STARTING_CHEATS)
const after = buyFromShop(before, ShopItem.Envenom)
expect(after.cheats).toEqual(before.cheats)
expect(after.cheats).toBe(before.cheats)
```

It is a strict superset of the original on three counts:

1. It still catches a Cheat **added** — the original's only catch.
2. It catches a Cheat **removed**, which `toEqual([])` could never distinguish from correct behaviour once the opening grant was zero.
3. It catches the list being **needlessly rebuilt** — the Envenom branch spreads `run`, so an untouched `cheats` must be the very same array.

And `toHaveLength(RUN_STARTING_CHEATS)` — imported from config, never written as `1` — is a non-vacuity guard: if that key is ever retuned back to `0`, the check fails loudly instead of degenerating into `expect([]).toEqual([])`.

## Decisions the developer owns

1. **Whether the ticket's root cause is accepted as refuted.** This contract changes specs, not the shop. If a purchase really is meant to bundle a Cheat, then this fixed the wrong file and `buyFromShop` is what needs changing. Nothing in any design document, ticket, or acceptance criterion describes a bundled purchase, and `ENVENOM_PRICE` is `2` against `CHEAT_PRICE` of `1` with no note of one — but this is a game-design reading made without you available.
2. **`RUN_STARTING_CHEATS` — should a run open holding a Cheat?** Currently `1` (`src/hunt/config.ts:201`), set deliberately in `ccc07ec`. The alternative diagnosis is that this value is the bug and the original absolute assertion was right all along. A tuning value and a gameplay change, so this contract left it alone.

Nothing here can be judged only by playing: no rendered surface changed and no tuning value moved.

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0, clean |
| `npm run lint` | exit 0, clean |
| `npm test` | exit 0 — **`Test Files  85 passed (85)`, `Tests  1072 passed (1072)`**, 0 failed |
| `npm run build` | exit 0, `dist/` written, no bundler errors |
| `npx prettier --check` (the two changed files) | exit 0 — scoped deliberately; repo-wide `format:check` fails on pre-existing `.docs/**` files |
| Pure-core boundary grep over `src/hunt` | 0 hits |
| `git status --porcelain src` | exactly two entries — the modified spec and the new one; no production file touched |
| File sizes | `envenom.test.ts` 206 lines, `run.purchaseIsolation.test.ts` 138 lines — both well under 400 |

The run's baseline before this ticket was 1061 passed / 1 failed of 1062, that single failure being this bug. It is now 1072 passed / 0 failed.

Reviewers: Code-Evaluator **APPROVED**, Defender **APPROVED** (Critical 0 / Warning 0 / Info 0), QA found one mechanical Prettier violation in the new spec, fixed by `prettier --write` and re-verified.

## Note for future contributors

**A spec that asserts an absolute run field is asserting the opening loadout as well as the transition.** Assert against the pre-transition value instead. This assertion sat red for two commits' worth of sprint work and cost a ticket, because `toEqual([])` reads like a statement about the purchase and was actually a statement about `startRun`.
