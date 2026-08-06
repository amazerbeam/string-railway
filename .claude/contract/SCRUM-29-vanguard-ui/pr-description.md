# PR: Vanguard UI — hex board renderer and action selection (SCRUM-29)

**Spec:** [`plan.md`](./plan.md) in this folder. [`mockup.html`](./mockup.html) in this folder is
the **approved visual and interaction specification** — where it and `plan.md` disagree, the
mockup wins.

## Summary

Adds the playable Vanguard board as a full-viewport, non-scrolling game screen:

- A new `src/app/vanguard/` module (pure logic, components, styles, tests), mirroring
  `src/app/warCouncil/`'s structure and conventions.
- The hex rhombus with both bases, every token in its owner's colour, permanent defense cells,
  and the reinforced (+1) state — rendered as native `<button>` cells, one accessible name per
  cell (`cellAccessibleName`), one tab stop across the whole 121-cell board via
  `useHexRovingFocus` with axial arrow-key movement.
- An action palette (Expand / Overwrite / Reinforce) that submits action-then-target to the
  existing `applyClashAction` engine. Legality and cost are decided by the engine alone —
  `legalTargets.ts` finds the legal+affordable set by dry-running the real engine over every
  board coordinate, never by re-deriving a rule.
- `VanguardMatch`, the mount implementing SCRUM-37's `VanguardMountProps`: one reducer
  (`matchReducer`) owning the whole match, one effect requesting each round's trick split via
  `requestTricksWon` and converting it to Muster through the unchanged
  `scoreRound` → `convertScoreToMuster` pipeline. The board stays on screen, unconditionally,
  while that request is outstanding (AC3).
- A Test-mode host (`TestModeVanguardHost`) and manual trick-entry form (`TrickEntryForm`) so the
  Vanguard can be played standalone without a real War Council match — structurally Test-mode
  only, since Campaign's host never renders it.
- A temporary Test-mode switch wired into `src/App.tsx` so the screen is reachable at all, and
  deletion of the now-superseded `src/app/stubs/VanguardStub.tsx` (and the emptied `stubs/`
  folder).

**No dependency was added — runtime or dev.** This contract adds none; two component specs
(`VanguardBoardView.test.tsx`, `VanguardMatch.test.tsx`) deliberately avoid
`@testing-library/jest-dom` and `@testing-library/user-event`, neither of which is installed,
by asserting DOM properties directly and using `fireEvent` instead.

## Verification results

Measured on this pass (fix-pass re-verification round), against the pre-change baseline of
`Test Files 40 passed (40)` / `Tests 314 passed (314)` (`node` 37/292, `dom` 3/22):

| Check | Result |
|---|---|
| `npm run typecheck` | exits 0 |
| `npm run lint` | exits 0, zero errors, zero warnings |
| `npx vitest run --project node` | `Test Files 41 passed (41)`, `Tests 321 passed (321)` |
| `npx vitest run --project dom` | `Test Files 6 passed (6)`, `Tests 34 passed (34)` |
| `npm test` (unfiltered, both projects together) | `Test Files 47 passed (47)`, `Tests 355 passed (355)` |
| `npm run build` | exits 0 — `dist/index.html` 0.48 kB, `dist/assets/index-*.css` 17.45 kB (gzip 4.33 kB), `dist/assets/index-*.js` 226.04 kB (gzip 70.96 kB) |
| `npx prettier --check` (repo-wide `format:check`) | fails on pre-existing out-of-scope files under `.docs/**`, `src/battle/**`, `src/vanguard/**` — not this contract's concern |
| `npx prettier --check` scoped to this contract's files | **fails** — `src/app/vanguard/__tests__/VanguardBoardView.test.tsx` needs one line rewrapped (a `legalTargetsFor(...)` call added by the post-review fix pass exceeds the print width). Everything else in scope passes. **Outstanding — run `npx prettier --write src/app/vanguard/__tests__/VanguardBoardView.test.tsx` before merge and re-check.** |

Two informational counts fall one below the number Task 18 projected when it was written
(`dom` 6 files/34 tests vs. a projected floor of "at least 7 files/33 tests"; combined 47 files
vs. a projected floor of 48) — both are a planner arithmetic slip in `tasks.md`, not a missing
test: every `.test.tsx` file this contract adds is present and collected, confirmed individually
above and by direct listing.

### Browser verification (QA, `chrome-devtools` MCP)

Reused the developer's own dev server on `localhost:5173` (Vite). No console errors or warnings
at any point below — only Vite's HMR connect messages and the React DevTools suggestion.

- **No scroll at any tested viewport.** `document.scrollingElement.scrollWidth/scrollHeight`
  matched `window.innerWidth/innerHeight` exactly at all three sizes:
  - 1280×720 (laptop): 1280×720 measured, no scroll.
  - 390×844 (phone portrait) — **this machine's tooling floors window width at 500px**, so the
    size actually achieved and measured was 500×844, no scroll.
  - 844×390 (phone landscape, the tightest case for the 16:8.65 rhombus): 844×390 measured, no
    scroll.
- **Board orientation confirmed**: the purple player base sits at the bottom-left (lowest and
  leftmost cell), the green CPU base at the top-right, rows leaning right as they climb — as
  instructed at the approval gate.
- **A full Clash turn played through the Test-mode path**: entered a trick count in the
  trick-entry form (opponent's count derived, not enterable, board visible behind the form);
  submitted it and the Clash opened with the CPU having already moved (round 1's opener is the
  CPU, confirmed by a new CPU token appearing before the player's first move); armed Expand,
  confirmed only legal cells were enabled and every other cell inert; armed Reinforce and
  confirmed the same over the player's own tokens; a reinforced token's parchment waist-bar is
  distinguishable from an unreinforced token with no colour cue needed.
- **Keyboard navigation, the specific regression this pass fixes**: with Expand armed and focus
  moved off the board/palette (a real click on a neutral area, not a scripted focus call),
  `Tab` now lands on a board cell (`Cell 3, 0`, an enabled Expand target) rather than skipping
  the entire 121-cell board — reproduced live and confirmed fixed. Repeated for Reinforce
  (lands on `Cell 0, 0`, the player's base). Exactly one `tabIndex={0}` button existed among the
  121 rendered in both armed states, and it was never disabled. `ArrowRight`/`Home`/`End` moved
  focus correctly among legal cells (`(0,0)` → `(1,0)` → `End` to `(0,1)` → `Home` back to
  `(0,0)`), `ArrowUp` climbed the screen (`r` increased) as the flipped-axis contract requires,
  and `Escape` cleared the armed selection and returned every cell to disabled/inert.
  **Overwrite specifically was not reproduced live**: no adjacent enemy token exists yet this
  early in a fresh 11×11 match (the bases start at opposite corners), so Overwrite stays
  disabled and cannot be armed to test against. `useHexRovingFocus.ts` has no branch on action
  kind — the derivation that was fixed for Expand and Reinforce is the identical code path
  Overwrite would use — and the fix-pass unit test in `VanguardBoardView.test.tsx` exercises the
  same mechanism generically (Reinforce → Expand mid-render), so this is coverage by
  code-path equivalence, not a literal Overwrite repro.

## Developer decisions and judgement calls

Copied verbatim from `tasks.md`'s File map → *Developer decides or observes*. None of these
block a merge; they are retunes and feel questions for whoever plays this next:

- Every token value in `vanguard.css` is transcribed from the approved mockup and is a one-line
  retune: `--vg-player` / `--vg-player-deep` and `--vg-cpu` / `--vg-cpu-deep` (purple Player /
  green CPU are fixed by `skirmish-board-replacement.md`; these values are not), `--vg-defense`,
  `--vg-empty`, `--vg-empty-edge`, `--vg-selectable`, `--vg-reinforce-mark`, `--vg-board-max`'s
  `clamp()` bounds, and `--vg-radius`.
- Whether the reinforced marker reads clearly as "+1" in its mockup form (a parchment bar across
  the token's waist) rather than a ring, pip, or numeral.
- Whether keeping the palette armed after a successful submission is right — it makes a run of
  Expands cost one tap each after the first, but it also means a mis-tap places a token instead
  of doing nothing. Only playing settles it.
- Whether two taps per Clash action (palette, then cell) drags across a full Muster of 7–10
  moves per round.
- Whether an 11×11 rhombus is legible and pleasant at a phone viewport, and whether 121 cells is
  the right density. `BOARD_SIZE` stays SCRUM-21's placeholder `11`; retune it in one line in
  `src/vanguard/config.ts` — not this contract's change.
- Whether a screen-reader user can genuinely navigate a 2D hex board by axial arrow keys. QA can
  confirm focus moves; whether the mental model works is real assistive-technology use.
- Accepting this module's single `try`/`catch` (around `chooseCpuClashAction`'s documented
  dead-end throw), where `src/app/warCouncil/` has none.
- Accepting that `src/App.tsx`'s mode control is throwaway scaffolding SCRUM-34 deletes.

### MANUAL VERIFICATION NEEDED — visual layering at the narrowest tested viewport

At 844×390 (phone landscape, the tightest tested case), the Test-mode trick-entry sidebar panel
visually overlaps and partially obscures the **Reinforce** action button underneath it (Expand
and Overwrite remain legible; Reinforce's label is cut off behind the panel's right edge). The
board itself stays fully visible and nothing is unreachable — the trick-entry form is a fixed
overlay and the panel's own z-order was not part of this contract's layout budget — but a human
should look at this specific viewport and judge whether the overlap is acceptable for a
Test-mode-only development affordance or worth a follow-up. Reproduce: start the dev server,
switch to Test mode, resize the browser to 844×390, and look at the palette's right edge while
the trick-entry panel is open.

## New conventions introduced

- The `vg-` CSS custom-property and class-name prefix (confirmed free of collisions with the
  existing `wc-` namespace at plan time).
- `hexPlacement` (`src/app/vanguard/hexLayout.ts`) is the **single point** where axial board
  space becomes screen space — it flips the `r` axis so increasing `r` climbs the screen, which
  is also why `ArrowUp` increases `r` in `useHexRovingFocus`. Re-orienting the board later is a
  one-line change there, not a sweep of every consumer.
- `legalTargets.ts` asks the engine rather than deciding: it dry-runs `applyVanguardAction` over
  every board coordinate and keeps what the engine accepts and the player can afford. It
  contains no legality rule of its own — no distance check, no adjacency test, no cost
  arithmetic — so it cannot drift out of sync with the engine.
- The `data-cell="<q>,<r>"` attribute is a string-bound contract shared between `HexCell.tsx`
  (which sets it) and `useHexRovingFocus.ts` (which reads it to move real DOM focus). Neither
  side is typed against the other; a rename on one side silently stops arrow-key navigation with
  no error and no failing test.

## Known debt carried deliberately

- The module's single `try`/`catch`, around `chooseCpuClashAction`'s documented dead-end throw,
  papers over a real stalemate gap in the underlying engine rather than fixing it — there is no
  legal-move enumerator to guard the call the way `roundReducer` guards `chooseCpuMove`, and
  building one here would be exactly the client-side re-implementation of legality AC2 forbids.
- The reducer's `cpuRejected` fault branch is defensive and untested, because it is unreachable
  through today's engine — `advanceCpu` only calls actions `chooseCpuClashAction` already
  validated.
- `useHexRovingFocus` near-duplicates `src/app/warCouncil/useRovingTabIndex` — a 1D vs. 2D roving
  tab-index pair that could plausibly share more, left unmerged rather than force a shared
  abstraction neither module asked for.
- Two match loops now exist — this mount's `matchReducer`-driven loop and `src/battle/`'s — for
  SCRUM-34 to reconcile when it wires the real battle loop.
- A cold Vitest cache can produce a `[vitest-pool-runner]: Timeout waiting for worker to
  respond` on the first combined `npm test` run against the `dom` project; it is a worker-*start*
  timeout, not a test failure (see `plan.md` → Risks). Warm the cache by running
  `npx vitest run --project node; npx vitest run --project dom` first.
- No automated test covers the no-scroll, full-viewport layout — jsdom has no layout engine.
  That is exactly what this PR's browser verification (above) exists to cover instead, but it is
  manual/QA-driven, not part of CI.
- **New this pass**: `src/app/vanguard/__tests__/VanguardBoardView.test.tsx` needs a
  `prettier --write` pass before merge (see Verification results, above) — a one-line print-width
  fix introduced by the keyboard-focus fix pass, not caught by the Implementer's scoped
  typecheck+lint verification for that pass.

## The keyboard-focus fix in this pass

`useHexRovingFocus.ts` previously stored its tab-stop cell directly, seeded once to the player's
base and only updated from inside the keydown handler — so it never resynced when the armed
action (and therefore the legal-target set) changed elsewhere, leaving zero focusable cells
reachable by `Tab` whenever Expand or Overwrite was armed (the player's own base is never a
legal target for either). Fixed by deriving the returned `tabStopKey` fresh on every render:
the last cell the player explicitly chose, if it is still focusable, else the first focusable
cell in row-major order — with no `useEffect` involved. Reproduced live in the browser for both
Expand and Reinforce after the fix (see Verification results, above); `VanguardBoardView.test.tsx`
gained a matching unit test that arms Reinforce, rerenders with Expand's legal-target set, and
asserts exactly one non-disabled tab stop survives.