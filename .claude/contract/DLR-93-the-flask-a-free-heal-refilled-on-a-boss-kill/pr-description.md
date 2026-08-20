# DLR-93 — The flask: a free heal that refills on a stage-boss kill

**Contract:** [`plan.md`](plan.md) · **Layout reference:** [`mockup.html`](mockup.html) (functional placeholder — the developer's UX design supersedes its visuals) · **Tasks:** [`tasks.md`](tasks.md)

Parent epic DLR-87 *Shop rebuild: persistence categories, flask, Apply Damage, quick-kill payout*.

---

## What this adds

A free, player-triggered emergency heal, separate from the shop's paid Heal.

- **One charge of run state.** `RunState.flaskCharges`, seeded from `FLASK_STARTING_CHARGES`.
- **Restores 60% of maximum health**, clamped, overheal discarded — 6 points at today's provisional maximum of 10.
- **Refused with a stated reason** at zero charges or at full health, following `shop.ts`'s existing `refusalFor` shape: reason codes in `src/hunt/`, sentences in `src/app/run/`, one predicate read by both the transition and the screen.
- **Refills to one charge on a stage-boss kill**, regardless of whether the player had 0 or 1 going in — and never on an ordinary kill.
- **Drunk from the shop screen**, the surface already reachable only between fights, via a potion-icon button placed away from the priced Heal.

### The pieces

| Area | Change |
|---|---|
| Config | `FLASK_STARTING_CHARGES` (1), `FLASK_HEAL_PERCENT` (0.6 — a proportion, not a percentage) |
| Rules | New pure module `src/hunt/flask.ts` — `FlaskRefusal`, `FlaskStock`, `flaskHealAmount`, `flaskRefusalFor` |
| State | `RunState.flaskCharges`, `flaskStockFor`, `drinkFlask` |
| Refill | `flaskAfter` inside `recordEncounter`, reading `OpponentKind.Boss` |
| Screen | `FlaskMark.tsx` (potion glyph), the `.shop-flask` block on `ShopPanel`, copy in `shopLabels.ts` |
| Driver | `handleDrinkFlask` in `App.tsx`, mirroring `handleBuy` |

Both config values are **transcribed**, not invented — from DLR-93's acceptance criteria and `.docs/design/Balatro-Forbidden-Solitaire/version-4-scope.md` §2. Nothing in this change is a number someone chose.

---

## The `healedBy` refactor — read this bit

AC2 required the flask to **reuse** the paid Heal's clamp rather than write a second one. `buyFromShop`'s Heal branch previously inlined `Math.min(maxPlayerHealth, health + HEAL_HEALTH_RESTORED)`, with a comment calling itself "THE clamp, and therefore also the single place overheal is discarded" — a sentence that stops being true the moment anything else heals.

So the expression moved into a private `healedBy(run, restored, maxPlayerHealth)`, now read by both the Heal branch and `drinkFlask`.

> **For future contributors: `healedBy` is the single writer that raises player health.** Any future healing mechanic goes through it, not beside it.

**The paid Heal's behaviour is unchanged.** The proof is that the pre-existing specs still pass, unedited:

- `src/hunt/__tests__/shop.test.ts` — the Heal purchase and its refusal at full health
- `src/hunt/__tests__/run.test.ts` — the heal clamp and overheal discard

Both were confirmed byte-identical by `git diff` (zero diff) and independently re-checked by the Defender.

---

## Structural changes bundled into this ticket

### `src/hunt/run.ts` was split

The flask work pushed `run.ts` to 406 lines, over the project's 400-line blocking budget. Rather than suppress it, the transitions moved out:

- **`src/hunt/run.ts`** (175 lines) — the run's *shape* and projections: `RunState`, `RunOutcome`, `startRun`, `canAdvanceRun`, `beatenCount`, `shopStockFor`, `flaskStockFor`, `bankClimbBonusFor`
- **`src/hunt/runTransitions.ts`** (259 lines) — the run's *transitions*: `recordEncounter`, `advanceRun`, `buyFromShop`, `drinkFlask`, plus private `outcomeFor`, `guardAfter`, `healedBy`, `flaskAfter`

`run.ts` re-exports the moved names, so **no importer changed**. There is a deliberate circular import between the two; it is inert — neither module reads a cross-module import at module-evaluation time, only inside function bodies. Both the Code-Evaluator and the Defender verified this independently. If a third mutual dependency ever appears, that is the point to reconsider the split rather than add another edge.

### Every 400+ line file in `src/` was brought under budget

| File | Before | After |
|---|---|---|
| `src/app/run/shop.css` | 521 | 237 (+ `shopItems.css` 140, `shopFlask.css` 154) |
| `src/__tests__/sim.test.ts` | 464 | **deleted** |
| `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` | 402 | 237 (+ `telegraph` 86, `readouts` 177) |
| `src/app/warCouncil/warCouncil.css` | 400 | 258 (+ `warCouncilTable.css` 151) |

CSS splits preserve cascade order and every declaration byte-for-byte. Spec splits moved every `it(...)` body verbatim — no assertion weakened, merged, or deleted.

**`src/__tests__/sim.test.ts` was deleted, not repaired.** Its first line read `/* TEMPORARY headless play harness - delete after use. */`; it wrote to a stale scratchpad path that no longer exists, and it was the sole cause of the repo's only 3 typecheck errors and therefore the sole reason `npm run build` failed. Recoverable with `git checkout af7de27 -- src/__tests__/sim.test.ts` if the harness is wanted again.

`src/hunt/config.ts` sits at 399 — under budget, deliberately left alone.

---

## Verification

All three reviewers approved in **round 1**; no fix pass was needed.

| Gate | Result |
|---|---|
| `npm run typecheck` | **0 errors** (was 3, all from the deleted harness) |
| `npm run lint` | exit 0, no rule disabled |
| `npm test` | **876 passed, 0 failed**, 65 files |
| `npm run build` | **exits 0** — 89 modules, `dist/` written. Previously blocked. |
| `npx prettier --check` | clean on every changed file |

Test count moved 880 → 876; the −4 is exactly `sim.test.ts`'s own tests. Every other count is unchanged.

### Greps (Tasks 9–11)

| Check | Expected | Actual |
|---|---|---|
| React imports / DOM globals under `src/hunt/**` | 0 | **0** |
| `ENCOUNTER_PLAYER_RESTORE` | 8 hits, no production read | **8, no production read** |
| `0.6` / `60%` outside config | 0 | **0** (not even in `flask.test.ts`, which derives it) |
| Quoted heal figure in `shopLabels.ts` | 0 | **0** — the blurb interpolates `flaskHealAmount` |
| `there is no flask` / `the flask stories own it` | 0 | **0** — both now-false comments corrected |
| `console.log` / `console.debug` | 0 | **0** |
| Any file ≥ 400 lines | 0 | **0** |

### Live browser verification

QA drove the running app and confirmed the flask end-to-end: drunk at 5/10 health → **10/10** (5 + 6 = 11, clamped, overheal discarded), charge readout 1 → 0, control disabled with `Your flask is empty. Beat a stage boss to refill it.` Console clean on load and after remount.

Shop screen fit, `scrollHeight` / `innerHeight`:

| Viewport | Measured | Scrolls? |
|---|---|---|
| 1920×1080 | 949 / 949 | no |
| 1366×768 | 768 / 768 | no |
| 390×844 (tool floored width to ~500) | 844 / 844 | no |

**`.shop-panel`'s `max-height: min(20vmin, 10rem)` therefore needs no retune** and is byte-for-byte unchanged. One caveat: the browser tool would not honour a viewport narrower than ~500px, so the 390px case was measured at 500×844.

---

## Notes for future contributors

- **`healedBy` is the single writer that raises player health.** Future healing mechanics go through it.
- **Nothing in this project is persisted** — 0 hits for `localStorage` / `sessionStorage` / `indexedDB` — so `RunState.flaskCharges` needed no migration. The first ticket that persists `RunState` closes that window, and every field added before then becomes a shape it has to version.
- **`ENCOUNTER_PLAYER_RESTORE` remains at `0` and read by nothing.** The flask is a separate, player-triggered mechanic, not that tunable finally being wired in. Its Status-register row no longer says "the flask stories own it" — landing this ticket made that a separate, still-open decision.

---

## Developer decides or observes

Verbatim from `tasks.md`'s File map, plus what verification left open:

- `src/app/run/shop.css` → `.shop-panel`'s `max-height: min(20vmin, 10rem)` — the flask row adds height to a screen already tuned hard for a short viewport. **QA measured no scroll at any tested size, so no change appears needed** — but the number remains the developer's.
- The potion glyph's `d` path, `.shop-flask`'s spacing, and the icon's `clamp()` size bounds — placeholders transcribed from `mockup.html`, superseded wholesale by the developer's UX design.
- **Whether the free-vs-paid separation actually reads at a glance** with both the flask block and the priced Heal on screen — judgement, not a functional check. QA confirmed the distinction is *structural* (own dashed zone, potion icon, `NO COIN` tag, versus a solid-bordered priced card under `ALSO FOR SALE`), but whether it lands visually is yours.
- All new copy, including whether "Flask" is the shipped name (`version-4-scope.md`'s open-names list).
- **Whether five charges of 6 health across 25 fights is the right answer to the run's health curve** — a measurement taken by playing. The epic defers re-tuning the charge count ("revisit only if it plays too thin").
