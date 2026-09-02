# DLR-159 — Manage Buffs: combine two identical cards into one of the next tier

Plan: [`plan.md`](./plan.md)
Mockup (layout, gesture and copy reference): [`mockup.html`](./mockup.html)

## What shipped

- **The combine rule, in the pure engine tree** — `src/hunt/buffCombine.ts`. Two cards that are
  the same card at the same tier ("identical in every respect": kind, tier, target suit/rank,
  reward axis, reward value) can be destroyed to mint one card of the next tier up, through
  `mintFromTemplate` — so a combined card is indistinguishable from one the slot machine could
  have dealt. Refuses with a named reason (`CombineRefusal.AtMaxTier` on a gold pile,
  `CombineRefusal.NoPair` on anything that isn't an exact pair) rather than silently no-opping;
  `combineBuffs` throws a `RangeError` naming the refusal if a driver bug ever calls it on a
  refused pile.
- **The identity key moved down a level.** `buffCombineKey` in `src/hunt/buffCombine.ts` is now
  the one place in the codebase that answers "are these the same card." The felt's existing
  stacking rule, `buffStackKey` in `src/app/warCouncil/buffGalleryModel.ts`, now delegates to it
  instead of composing its own key — so what stacks on the felt and what combines in the shop
  cannot drift apart into two different answers to the same question.
- **The Manage Buffs screen**, reached from a new "Manage Buffs" control in the shop's held-cards
  tray (`ShopPanel.tsx` / `ShopHeld.tsx`). A three-zone full-viewport screen
  (`ManageBuffsPanel.tsx`, `CombineGroupCard.tsx`, `manageBuffs.css`) that groups the held pile
  into piles, puts combinable piles first, and uses a two-tap gesture on the tile itself — arm,
  then confirm — showing what will be destroyed and what will be produced before anything is
  spent. A "Just made" badge and a `role="status"` announcement mark the result. Reachable only
  from the shop (`RunPhase.ManageBuffs`) and returns only to the shop.

## Developer decides or observes

(Reproduced verbatim from `tasks.md`'s File map — none of this is settled by the code alone.)

- Whether two taps on the tile (arm, then Combine) is the right gesture, versus select-then-confirm
  elsewhere. Only playing settles it.
- The screen's copy: the confirmation's wording, the two refusal sentences ("Already gold —
  nothing above it" / "Only one — nothing to pair it with"), and the "Just made" badge's word.
- The pile-tile size bounds. The tasks reuse the loadout grid's existing `clamp()` bounds rather
  than choosing new numbers; if a dozen tiles reads cramped or sparse at your viewport, the new
  bounds are yours.
- Whether the "Just made" badge plus the status line is enough to answer "where did my card go" in
  a grid of a dozen tiles — AC10's hand pass.
- The accepted risk the ticket names: with today's reward ladder most combines measure as a
  downgrade. Nothing here compensates for it, by design.

**No browser pass ran on this contract.** Nothing about how the screen actually looks, whether the
two-tap gesture feels right, whether the grid is cramped or sparse, or whether the "Just made"
badge is noticeable has been seen by anyone — human or agent. All five items above are genuinely
open until you play it.

## Phase 4 verification results

### Task 13 — pure-core boundary

- **Step 1** — `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
  → 12 hits, all docblock prose *stating* the module never calls `Math.random()` (e.g.
  `buffCombine.ts:11`), not a real call. Zero real hits — pass.
- **Step 2** — storage-access grep across all of `src` → one hit, `src\persistence\saveStore.ts:162`,
  a docblock explaining why `removeItem` never calls `localStorage.clear()` — the same pre-existing
  hit `.claude/rules/save-data-versioning.md` already documents. This contract added no storage
  access — pass.

### Task 14 — no second identity key, no stray tier ladder

- **Step 1** — `buff.reward.axis,` (with the trailing comma, matching the identity-key array-join
  literally) → exactly one hit, `src\hunt\buffCombine.ts:43`, inside `buffCombineKey` — pass. (A
  looser grep without the trailing comma turns up five more hits across `buffAccrual.ts`,
  `buffCosts.ts`, `buffTemplates.ts`, `sim/playHand.ts`, `sim/playHandWindows.ts`; each read and
  confirmed to be an unrelated function argument or `switch` scrutinee, not a second identity-key
  composition.)
- **Step 2** — `'silver'|'gold'|'bronze'` under `src\app\run` → three hits, all
  `src\app\run\manageBuffsLabels.ts:5-7`, the keys of the `TIER_WORD` lookup map. No hand-stepped
  tier expression anywhere in `src\app\run` — pass.

### Line counts (Task 15 Step 3's measurement, run ahead of QA's full gate)

| File | Lines |
|---|---|
| `src\hunt\buffCombine.ts` | 110 |
| `src\hunt\buffTemplates.ts` | 313 |
| `src\app\run\manageBuffs.ts` | 76 |
| `src\app\run\manageBuffsLabels.ts` | 78 |
| `src\app\run\useManageBuffs.ts` | 38 |
| `src\app\run\ManageBuffsPanel.tsx` | 177 |
| `src\app\run\CombineGroupCard.tsx` | 176 |
| `src\app\run\manageBuffs.css` | 359 |
| `src\app\run\ShopPanel.tsx` | 329 |
| `src\App.tsx` | 399 |

All under the 400-line blocking budget. `App.tsx` has only one line of margin — worth watching on
the next ticket that touches it.

### Delegated to QA — not run by the Implementer

The unfiltered suite, lint, and the production build are QA's alone in this pipeline (per
`CLAUDE.md`'s pipeline section) and were **not** run for this report. Placeholder — to be filled in
from QA's report:

- `npx vitest run --project node` / `--project dom` — **[QA to fill in: pass/fail, `Tests N passed`]**
- `npm run typecheck` — **[QA to fill in]**
- `npm run lint` — **[QA to fill in, including warning count]**
- `npm test` — **[QA to fill in, the full `Tests N passed` line]**
- `npx prettier --check` on this contract's file list — **[QA to fill in]**
- `npm run build` — **[QA to fill in, exit code and any bundler errors]**

## Note for future contributors

`buffCombineKey` in `src/hunt/buffCombine.ts` is now the single answer to "are these the same
card" — `buffStackKey` in `src/app/warCouncil/buffGalleryModel.ts` delegates to it rather than
keeping its own copy. If you ever need to change what counts as "the same card," change it there
and nowhere else.
