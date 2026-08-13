# DLR-71 — Two health bars with live pending damage, every trick

Plan: [`plan.md`](./plan.md)
Mockup (approved at the gate, 2026-08-12): [`mockup.html`](./mockup.html)

## Summary

Replaces the Hunt screen's player-only scoring readout with two mirrored health bars — one per
side, opposed left/right, each depleting toward the centre — that carry their own **pending**
damage as a lighter segment carved out of current health, visible and updating on every trick.

**The guarantee this whole ticket turns on (AC2): one function produces both the number the player
watches climb and the number that actually lands.** `pendingHuntDamage` (read every trick, before a
declaration exists) and `huntDamage` (read once, to apply) both delegate to the same private
`outcomeFor`. `duelSideDamage` is the one place a `PlayerSide`-keyed outcome crosses into the
`DuelSide`-keyed shape the bars and the reducer use — the single `PlayerSide → DuelSide` crossing
in this feature, so it cannot happen twice with two different results. `applyHunt` is DLR-70's
single clamp point: it is the only place health is ever subtracted or floored at zero. Nothing in
this feature computes a second copy of any of these numbers — the bars, the end-panel equations,
and the reducer's committed state all read the same arithmetic.

### AC8's fallback, recorded rather than built

If the mirrored two-bar pair ever needs to become a single net bar, it is a one-line change: return
a single `HealthBarView` from `src/app/warCouncil/duelHealthBars.ts`'s `duelHealthBars` function
whose `pending` is the net damage across both sides, rather than the current array of two. Nothing
in `src/app/warCouncil/DuelHealthBars.tsx`'s `DuelHealthBars` component needs to change — it renders
whatever length of `bars` it is handed. This is what AC8 asked to have *recorded*; this file is
that record. No code changes were made to exercise this path — it is deliberately not built, only
kept one line away.

## Resolves DLR-67's blocking defect

DLR-67 was `BLOCKED` on a measured overflow: at 680×520 and 700×544, the declare gate's "Play to
Win" heading was unreachable because a centred `overflow-y: auto` container clips symmetrically and
`scrollTop` cannot go negative. This contract's Task 12 changed that container's
`justify-content` from `center` to `flex-start`, so an overflowing felt reaches its own top instead
of clipping it.

QA measured both sizes live, driving a full Hunt:

- **680×520** — the "Play to Win" heading is fully visible at `scrollTop: 0` (measured top
  **362.6** in a 520px viewport); the click succeeded on the **first** attempt.
- **700×544** — visible at `scrollTop: 0` (measured top **365.3**); again first-attempt.

DLR-67 can be moved off `BLOCKED` on the strength of these two measurements.

## Developer decisions needed (verbatim from `tasks.md`'s File map)

- `warCouncil.css` → `--wc-hp-track`, `--wc-hp-secure-fill`, `--wc-hp-pending-fill`,
  `--wc-hp-lethal-edge`, `--wc-hp-height`, `--wc-hp-move-ms` — six visual values. Tasks ship the
  mockup's placeholders drawn from the existing palette; **no task invents one.**
- **Whether the mirrored pair in the status row reads as tension or as clutter** (§6's named pause
  condition). Measurement: can a playtester say who is ahead, and tell a fast Hunt from a stalling
  one, from the bars alone? First yes and second no means the net-bar fallback above is free to
  take.
- **Whether the Standing track reads cramped in the `minmax(10rem, 17vw)` dossier column.**
  Alternatives: a new `auto` grid row for the bars (costs vertical space) or the compact cell at
  all widths.
- **Whether the one extra press per Hunt earns its beat**, on top of the declare gate and "Let them
  lead" the module doc already flags as unjudged.
- **The `align-items: flex-start` felt fix top-aligns the felt's content** at 680×520 and 700×544
  instead of centring it (Task 12). Accept the visual change, or take the module doc's other
  candidate — scoping the stretch/scroll to the end-panel state alone.
- **`ENCOUNTER_OUTCOME`'s two strings are placeholder copy** for the terminal state.
- **`SLICE_ENCOUNTER_INDEX = 0` in `App.tsx` is a placeholder, not a config key** — DLR-73 replaces
  it with the encounter loop.

## Verification results

- **`npm test`** → `Tests 634 passed (634)`, `Test Files 41 passed (41)`. Split:
  `npx vitest run --project node` → `Tests 570 passed (570)` / 29 files;
  `npx vitest run --project dom` → `Tests 64 passed (64)` / 12 files.
- **`npm run typecheck`, `npm run lint`, `npm run build`** — all exit 0. Build wrote
  `dist/index.html`, `dist/assets/index-*.css` (19.54 kB), `dist/assets/index-*.js` (225.31 kB),
  "built in 476ms".
- **Scoped `npx prettier --check src\app\warCouncil src\app\warCouncilMount.ts src\App.tsx`** —
  exit 0 **after the fix pass**. It initially failed on four files whose lines exceeded the
  project's 100-char `printWidth` after prop/attribute additions (`WarCouncilRound.tsx`,
  `WarCouncilRound.test.tsx`, `DuelHealthBars.test.tsx`, `warCouncilHealthBars.css`); `--write` was
  run on those four and the reflow was confirmed to change nothing semantic (typecheck, lint and
  the affected specs re-run and still green). Repo-wide `npm run format:check` still fails on **28
  pre-existing `.docs/**` / `.github/**` files** no current contract has touched — not this
  ticket's work.
- **All four AC9 viewport measurements**, from QA driving a full Hunt at each:
  - **1920×1080** — both bars in bounds, rightmost bar edge 1899.1, `.wc-shell`
    `scrollWidth === clientWidth` and `scrollHeight === clientHeight`.
  - **1366×768** — in bounds, no scroll.
  - **1024×640** — in bounds, no scroll, Standing compact cell visible.
  - **500×844 phone portrait** — bars wrap to two rows but stay within 0–500 (rightmost edge
    489.0), `.wc-shell` still does not scroll (the visible scrollbar is the felt's own scoped
    `.wc-table-inner` region, the documented exception).
- **AC2 confirmed live, not just in the spec**: playing a full 13-trick round into the Greedy band,
  the player's bar read *"59 at risk"* and the panel stated `Opponent Damage: 59`; the Quarry's bar
  read *"30 at risk"* and the panel stated `You Damage: 30`. After "Apply the damage":
  `YOUR HEALTH 1350→1291` (Δ59) and `QUARRY'S HEALTH 1350→1320` (Δ30) — exact, no drift. "Deal the
  next Hunt" then carried `1291/1350` and `1320/1350` into the following Hunt.
- **AC3 confirmed by computed style**: secure `rgb(201,154,78)` gold vs. pending
  `rgb(139,154,148)` grey-green, with the pending segment's computed width matching its
  `pendingPct`.
- **Console clean** on load, after a Hunt-to-Hunt remount, and after a hard reload at 700×544 — no
  error, no warning, no `NaN`.

## A note for future contributors

The `@media (max-width: 44rem), (max-height: 34rem)` breakpoint value now lives in **three**
stylesheets (`warCouncil.css`'s `.wc-shell`-adjacent rules, `warCouncilHunt.css`, and
`warCouncilHealthBars.css`; a fourth, `warCouncilStandingTrack.css`, already made the same
duplication before this contract). Consolidating it into one source is its own ticket.

## Three further notes the reviewers asked be recorded

1. **The plan's own AC2 test sketch had the side pairing backwards.** It read `Opponent Damage`
   against the Quarry's bar, where `duelSideDamage`'s `DuelSide.Quarry` entry actually reads
   `outcome.incoming[PlayerSide.Cpu].damage` — i.e. what the *Player* dealt. The shipped test
   (Task 10, carved into `WarCouncilRound.duelHealthBars.test.tsx`) pins the correct pairing,
   confirmed live by QA. Worth a `/fb-issue` against the planner: this is exactly the
   `PlayerSide`/`DuelSide` crossing typo DLR-70's own `duelSideDamage` docblock warns produces
   plausible numbers forever.
2. **A Windows NTFS case-collision trap, in two shapes.** `duelHealthBars.ts` / `DuelHealthBars.tsx`
   differ only by leading-letter case, and `src/app/` collides with `src/App.tsx`; NTFS lookups are
   case-insensitive and Vite tries `.ts` before `.tsx`, so an extensionless specifier resolves to
   the wrong file and fails with `Element type is invalid … got: undefined`. Resolved with explicit
   `.ts`/`.tsx` extensions on those imports, and by importing `./app/warCouncilMount` directly
   rather than the `./app` barrel. Also worth a `/fb-issue` — a plan that names two files differing
   only by case is a trap for any Windows contributor.
3. **`WarCouncilRound.test.tsx` reached 397 lines**, so the AC2 end-to-end assertion was carved into
   `WarCouncilRound.duelHealthBars.test.tsx` per `plan.md`'s own Risks section, duplicating small
   `lcg`/`declareWin`/`playFullRoundToCompletion` helpers rather than exporting them (the `lcg`
   duplication is already this codebase's convention across six spec files). If the main file's
   round-driving loop grows a new branch, the sibling's copy can go stale. A subsequent
   `prettier --write`, run to fix the scoped Prettier gate, then reflowed all 17
   `<WarCouncilRound …/>` render calls from one line into one-prop-per-line blocks and pushed the
   file to 502 lines — over budget again, unflagged by typecheck, lint, or either Vitest project,
   none of which measure line counts. Fixed by extracting a local `renderRound(overrides)` helper
   that collapses each call site back to one line, bringing the file to 387. Lesson: a mechanical
   `prettier --write` can push a file over the line budget on its own, and none of typecheck, lint,
   or the test suite will catch it — re-measure line counts after any reflow, not just after
   hand-written edits.

## Dependency note

**`@testing-library/user-event` is not a dependency.** The component specs use `fireEvent`,
matching every existing spec in this codebase. Recorded so nobody reads it as an omission.

## One open defensive item for the developer

`WarCouncilRound.tsx`'s `handleCarryOn` fires `onComplete` behind `roundComplete && ui.applied !==
null`, but with no reducer-level idempotence guard, unlike `CommitDamage`. No reachable failure was
demonstrated — React's synchronous per-discrete-event flush plus `App.tsx`'s `key={round}` remount
protect it today — so no guard was added. Whether it's worth one anyway is the developer's call.

## Review pass fixes folded into this PR

- **Dead CSS removed**: `.wc-hp-risk` (3 rules) and `.wc-hp-sr` (1 rule) in
  `warCouncilHealthBars.css` had no markup rendering them anywhere in `src/` — both came from
  transcribing the mockup's full `.wc-hp*` block while the shipped markup renders neither element.
  Deleted.
- **Unreachable duplicate removed**: `warCouncilHunt.css` carried its own copy of
  `.wc-hp { flex: 1 1 40% }` inside the same `@media` breakpoint as `warCouncilHealthBars.css`,
  at identical specificity; since `WarCouncilRound.tsx` imports `warCouncilHealthBars.css` *after*
  `warCouncilHunt.css`, the later sheet's rule always won and the earlier copy never painted
  anything. Deleted, with a one-line comment left in its place naming `warCouncilHealthBars.css`
  as the rule's one home.
- **`duelHealthBars`'s docblock now states its one un-asserted precondition**:
  `projected[side] <= current[side]` is the caller's responsibility. The module performs no
  clamping by design (`applyHunt` is DLR-70's single clamp point), so a caller that violates this
  renders a negative `pending` rather than being rejected. It currently holds because every caller
  derives `projected` either as `current` itself or via `applyHunt`, whose `deplete` never
  increases health and whose `assertApplicable` rejects negative damage.
