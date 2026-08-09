# PR: Muster / Clash HUD — move budget, turn indicator, action feedback

**Ticket:** SCRUM-30 — https://amazerbeam.atlassian.net/browse/SCRUM-30
**Plan:** [`plan.md`](./plan.md) in this folder
**Tasks:** [`tasks.md`](./tasks.md) in this folder

## Summary

`VanguardMatch.tsx` used to render a literal placeholder — `"Muster counts and turn indicator are
SCRUM-30"` — in the `.vg-band` status row. This PR replaces it with a real, persistent HUD:

- Both sides' remaining Muster, always visible, updating after every accepted action.
- A turn/lifecycle indicator (`Awaiting Muster` / `Your move` / `Their move` / `Exchange resolved`)
  that reads unambiguously without relying on colour alone.
- An explicit "Uncontested" badge plus a named-reason hint sentence (e.g. "CPU is out of moves —
  you're spending your remaining 3 moves") when one side is spending leftover Muster with no
  opposition.
- The HUD keeps rendering the frozen final Muster tallies behind `ClashOverPanel`'s overlay once a
  round ends, so an unspent-moves finish reads as a resolved, intentional outcome rather than a
  stuck screen (AC4) — satisfied structurally, with zero change to `ClashOverPanel` itself, which
  stays out of scope per the ticket.

The HUD's numbers and states are all pure reads off the already-shipped `ClashState` — no rule,
cost, or turn-order logic changed. `src/vanguard/`, `src/battle/`, and `src/app/warCouncil/` are
untouched.

### New/changed files

- `src/app/vanguard/clashHud.ts` (new) — pure derivation: `TurnIndicator`, `ClashHudState`,
  `deriveClashHud`, `deriveHint`.
- `src/app/vanguard/__tests__/clashHud.test.ts` (new) — 13 tests (7 `deriveClashHud` + 6
  `deriveHint`).
- `src/app/vanguard/MusterBand.tsx` (new) — presentational status-band HUD, `role="group"`,
  no state, no handler.
- `src/app/vanguard/__tests__/MusterBand.test.tsx` (new) — 5 component tests, queried by role/label.
- `src/app/vanguard/VanguardMatch.tsx` (modified) — placeholder note removed, `MusterBand` wired
  into `.vg-band`, inline `playerTurn`/`musterAvailable`/`deriveHint` de-duplicated against
  `clashHud.ts`.
- `src/app/vanguard/vanguard.css` (modified) — `.vg-band` becomes a two-row header; new
  `.vg-muster*`/`.vg-turn-*` rules, reusing existing `--vg-brass`/`--vg-chalk-dim`/`--vg-alarm`
  tokens.
- `src/app/vanguard/__tests__/VanguardMatch.test.tsx` (modified) — 2 new end-to-end tests (AC5):
  Muster count changing after a real tap, and the awaiting-Muster → player's-own-turn switch.
- `.docs/implementation/vanguard-ui.md` (modified) — refreshed via `implementation-doc-writer` to
  document the new exports and close out its own "Muster counts and a turn indicator are not shown"
  Deferred bullet.

## Note for future contributors

`deriveHint` used to be a module-local function defined at the bottom of `VanguardMatch.tsx`. It
now lives in `clashHud.ts`, taking `(ui: MatchUiState, hud: ClashHudState)`, so it's unit-tested
without a renderer — if you're looking for it in `VanguardMatch.tsx`, it's imported, not defined,
there now.

## Developer decisions (from the plan's File map)

These were confirmed at the plan/mockup gate, not invented mid-implementation:

- **Copy.** Exact strings for every HUD label ("Your move" / "Their move" / "Awaiting Muster" /
  "Exchange resolved" / "Uncontested" and the uncontested hint sentence) were proposed in
  `mockup.html` and confirmed at the plan gate; implementation transcribes them verbatim.
- **Visual treatment.** The turn-active and uncontested states' colour and badge shape reuse the
  existing `--vg-brass` / `--vg-chalk-dim` / `--vg-alarm` tokens per the mockup — no new CSS custom
  property was introduced, and the mockup's look is the confirmed default.
- **Phone-viewport check.** Whether `.vg-band` growing to two rows still fits comfortably at a
  phone-sized viewport was QA's functional check (does it render, does it stay non-scrolling); how
  it *feels* is the developer's own call when playing it, and is not claimed as verified here.
- **The unreachable-`CpuTurn` finding.** `plan.md` → Assumptions traces that `matchReducer.ts`'s
  `advanceCpu` synchronously drains every CPU turn before a state is ever stored, so
  `TurnIndicator.CpuTurn` and the CPU-side uncontested case are typed and defensively tested via a
  direct fixture but not reachable through this mount's real render output today. Confirmed correct
  at the plan gate; nothing further to decide unless a later engine change proves it wrong.

## Verification results (Phases 1–5)

- **Phase 1 — `clashHud.ts`:** `npx vitest run src/app/vanguard/__tests__/clashHud.test.ts` — 13/13
  pass. `npm run typecheck` clean.
- **Phase 2 — `MusterBand.tsx`:** `npx vitest run src/app/vanguard/__tests__/MusterBand.test.tsx` —
  5/5 pass. `npm run typecheck` clean. `vanguard.css` stayed well under the 400-line budget.
- **Phase 3 — wiring into `VanguardMatch.tsx`:**
  `npx vitest run src/app/vanguard/__tests__/VanguardMatch.test.tsx` — 7/7 pass (5 existing + 2
  new). `npm run typecheck` clean. `VanguardMatch.tsx` stayed well under the 400-line budget.
- **Phase 4 — docs:** `.docs/implementation/vanguard-ui.md` refreshed;
  `Select-String -Pattern "deriveClashHud|MusterBand"` against the doc returned hits for both.
- **Phase 5 — final verification (this phase):**
  - Placeholder-note grep (`Select-String -Path src\app\vanguard\*.tsx -Pattern "Muster counts and
    turn indicator are SCRUM-30"`) — zero hits.
  - Hard-coded-hex-colour grep (`Select-String -Path
    src\app\vanguard\MusterBand.tsx,src\app\vanguard\VanguardMatch.tsx -Pattern
    "#[0-9a-fA-F]{3,6}"`) — zero hits; every colour is a `--vg-*` custom property read from CSS.
  - `npm run typecheck` — exit 0.
  - `npm run lint` — exit 0, no errors.
  - `npm test` (unfiltered) — **49 test files, 391 tests passed**, exit 0. The three
    contract-touched spec files scoped together: **25 tests passed** (13 `clashHud.test.ts` + 5
    `MusterBand.test.tsx` + 7 `VanguardMatch.test.tsx`). The plan's own "12 new tests" estimate
    undercounted — the real net-new count is 13 + 5 + 2 = 20 (`clashHud.test.ts` is an entirely new
    file at 13 tests; `VanguardMatch.test.tsx` added 2 to its existing 5).
  - `npm run build` — exit 0. `dist/index.html`, `dist/assets/index-*.css` (18.23 kB),
    `dist/assets/index-*.js` (227.31 kB) written, no bundler errors.

No unfiltered-suite or production-build failure was hit in this phase — no fix pass was required.

## Unverified

Nothing about how the HUD *feels* to play against — timing, whether the two-row header reads as
cramped on a real phone viewport, whether the uncontested badge is noticeable enough in the corner
of the eye during a live Clash — was observed by this phase. That is explicitly the developer's own
call, per `plan.md` → Risks and judgement calls and the File map's "Developer decides or observes"
list.
