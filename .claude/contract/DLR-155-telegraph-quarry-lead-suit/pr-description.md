# DLR-155 — Telegraph the Quarry's lead suit

Plan: [`plan.md`](./plan.md)
Approved layout reference: [`mockup.html`](./mockup.html)

## Summary

The "What the Quarry holds" panel now marks which suit the Quarry is about to lead — the
marked row's tiles grow and take an alarm-coloured glow, a hover/keyboard-focus tooltip repeats
the sentence in words, and a screen-reader-only span carries the same sentence for assistive
tech. This lets the player choose a suit-scoped buff against a known fact instead of a guess.

The underlying engine function, `quarryIntent()`, already existed — nothing new was computed.
This ticket is entirely the surface: a resolver that decides which suit (if any) to mark, a
sentence builder, the component prop and markup, the stylesheet treatment, and one flag to turn
the whole thing off.

## What changed

- `src/hunt/telegraphConfig.ts` (new) — `QUARRY_LEAD_TELEGRAPH_ENABLED` (ships `true`) plus the
  relocated `TelegraphFidelity` / `TELEGRAPH_FIDELITY`, moved out of `config.ts` because that file
  was at 388 of its 400-line budget. `config.ts` re-exports all three names, so no importer
  changed.
- `src/app/warCouncil/quarryTelegraph.ts` (new) — `telegraphedLeadSuit(state, quarryToLead)`, the
  single call to `quarryIntent()` for the whole panel (outside any per-row loop — `quarryIntent`
  runs `chooseCpuCard` on every poll, so it must not run once per tile).
- `src/app/warCouncil/labels.ts` — `quarryLeadTelegraphText(suit)`, the one sentence builder used
  by both the visible tooltip and the screen-reader span, so the two channels can't drift apart.
- `src/app/warCouncil/QuarryShape.tsx` — optional `leadSuit` prop; the marked row gets the
  `wc-shape-row-lead` class, a `tabIndex={0}` keyboard stop, the `.wc-sr-only` sentence, and the
  `aria-hidden` tooltip bubble. `leadSuit` is optional so every existing render site keeps
  compiling and rendering identically.
- `src/app/warCouncil/warCouncilHunt.css` — `.wc-shape-row-lead` (enlarged glowing tiles) and
  `.wc-shape-tip` (the hover/focus tooltip), transcribed from `mockup.html`.
- `src/app/warCouncil/WarCouncilRound.tsx` — resolves `leadSuit` once per render and passes it to
  `QuarryShape`.
- `src/app/warCouncil/roundHandSummary.ts` (new, unplanned) — see Deviations below.
- Test coverage added or extended in `src/hunt/__tests__/config.test.ts`,
  `src/app/warCouncil/__tests__/quarryTelegraph.test.ts` (new),
  `src/app/warCouncil/__tests__/labels.test.ts`, `src/app/warCouncil/__tests__/QuarryShape.test.tsx`,
  `src/app/warCouncil/__tests__/quarryShapeCss.test.ts` (new).

## For future contributors

`src/hunt/telegraphConfig.ts` is now where the telegraph tunables live, re-exported from
`config.ts` — the same split arrangement `apConfig.ts` already has for AP tunables.

## Deviations from the plan (for the reviewer)

1. **Phase 2 fixture override.** The plan's spec snippet aimed a Quarry-to-lead round with
   `dealer: PlayerSide.Player`, but `roundFixture.ts`'s turn logic reads `leader`, not `dealer`.
   `makeRound({ leader: PlayerSide.Cpu })` is what actually produces that state. All of the
   plan's contract assertions were preserved; only the fixture call changed.
2. **Phase 3 assertion method.** The plan's snippet used `screen.getByText(...)` for the
   telegraph sentence. That throws, because the sentence deliberately appears twice on a marked
   row — the `.wc-sr-only` span and the `aria-hidden` tooltip bubble both carry it, which is
   exactly what AC2 (visible tooltip) and AC3 (real text for assistive tech) together ask for.
   Changed to `screen.getAllByText(...)` with a length-of-2 assertion. No production markup was
   bent to make a test pass.
3. **Phase 4 unplanned extraction.** The two-line telegraph wiring in `WarCouncilRound.tsx` tipped
   the file to 402 of its 400-line budget. Phase 4 extracted the pre-existing, telegraph-unrelated
   hand-tally derivation into `src/app/warCouncil/roundHandSummary.ts` (`handSummaryFor(ui)`),
   bringing the round component back to 390 lines. The extraction dropped the file's now-unused
   `DuelSide` import; the pinned regression spec `WarCouncilRound.duelHealthBars.test.tsx` was
   re-run afterward (3 passed) to confirm the tally is unchanged.

## Decisions and playtest judgement the developer must make

None of the following can be settled from static analysis — they need eyes and a running app:

- **The glow's size and colour.** `warCouncilHunt.css`'s `.wc-shape-row-lead` block ships the
  mockup's values (tile size, ring width, glow radius, `--wc-alarm` colour) as a starting point,
  not a final tuning. All four are one-word edits in that file.
- **Whether the telegraph's glow fights DLR-153's hand lighting.** Look at the felt with a buff
  activation window open and the Quarry about to lead — judge whether the screen now has one
  focal point too many. The stylesheet deliberately keys the telegraph to growth + alarm-red and
  the hand to lift + brass/Timebomb-green so the two are visually distinct, but only playing it
  proves whether that's enough.
- **Whether the marked row reads "at a glance without hunting" (AC1's own wording).** Tests prove
  the class lands and the sentence is in the accessibility tree; they cannot prove the glance.
- **Whether the tooltip sentence should be permanently on screen** rather than hover/focus-only.
  That would be a fourth line in a three-line panel — a layout change, not a tweak — so it's left
  as a design call rather than built speculatively.
- **The flag's default.** `QUARRY_LEAD_TELEGRAPH_ENABLED` ships `true` in
  `src/hunt/telegraphConfig.ts`. Flip to `false` there if you want the readout dark by default;
  it is read in exactly one place (see the boundary grep below), so flipping it removes the
  highlight, the tooltip, and the screen-reader sentence together with no bypass anywhere else.

## Verification

**Implementer-run, per phase** (from the phase reports, batched per the project's verification
policy):

- Phase 1 (Tasks 1–2): `npm run typecheck` exit 0; `npx vitest run src/hunt/__tests__/config.test.ts`
  exit 0, 0 failed; `config.ts` back under budget, `telegraphConfig.ts` well under 40 lines.
- Phase 2 (Tasks 3–4): `npx vitest run src/app/warCouncil/__tests__/quarryTelegraph.test.ts` and
  `.../labels.test.ts` both exit 0, 0 failed; `npm run typecheck` exit 0 in both cases.
- Phase 3 (Tasks 5–6): `npx vitest run src/app/warCouncil/__tests__/QuarryShape.test.tsx` and
  `.../quarryShapeCss.test.ts` both exit 0, 0 failed; `npm run typecheck` exit 0;
  `QuarryShape.tsx` and `warCouncilHunt.css` confirmed under their line budgets.
- Phase 4 (Task 7): `npm run typecheck` exit 0; the round-rendering specs
  (`QuarryShape.test.tsx`, `quarryTelegraph.test.ts`) exit 0, 0 failed; the pinned regression spec
  `WarCouncilRound.duelHealthBars.test.tsx` re-run after the extraction, 3 passed;
  `WarCouncilRound.tsx` confirmed at 390 lines, under budget.

**This phase (Task 8), run directly:**

- `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
  — zero hits. The new hunt config file stays inside the pure-core boundary.
- `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "will lead with"`
  — 6 lines across exactly three files: `labels.ts:207` (the one builder), plus
  `labels.test.ts` and `QuarryShape.test.tsx` (the specs asserting its output). No hand-typed
  second copy in `QuarryShape.tsx`.
- `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "QUARRY_LEAD_TELEGRAPH_ENABLED"`
  — hits in exactly the five expected files: the definition (`telegraphConfig.ts`), the re-export
  (`config.ts`), the barrel entry (`index.ts`), the one read (`quarryTelegraph.ts`), and its
  assertions (`config.test.ts`). No consuming component (`QuarryShape.tsx`, `WarCouncilRound.tsx`)
  names the flag directly.
- `Get-ChildItem src\app\warCouncil -Include QuarryShape.tsx,quarryTelegraph.ts | Select-String -Pattern "rank|RANK_NAME|CardRank"`
  — zero hits. No rank reaches the panel.

**Not run by the Implementer — delegated to QA per this contract's Task 9:**

- The unfiltered `npm test` full suite, `npm run lint`, `npm run format:check` (scoped to the
  files this contract touched), and `npm run build`. Task 9 in `tasks.md` specifies the exact
  commands and expected outcomes; none of those numbers are quoted here because the Implementer
  did not run them.

## Unverified — needs the developer's eyes

Everything under "Decisions and playtest judgement" above, plus: whether the tooltip's hover
delay and position feel right at the panel's actual on-screen size, and whether the keyboard tab
stop on the marked row lands in a sensible place in the panel's existing tab order. None of this
was observed running — only through static analysis, greps, and Vitest's jsdom rendering.
