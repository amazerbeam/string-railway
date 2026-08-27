# DLR-148 — Rebuild the buff gallery, re-home the felt's game state, add the trick consequence readout

Plan: [`plan.md`](./plan.md)
Mockup (approved, scoped view): [`mockup.html`](./mockup.html)

## Summary

Replaces the buff loadout list (`BuffLoadoutPanel`) with a dense, scannable **buff gallery**: cards
with a metallic tier frame, a neutral face, the target suit as a coloured glyph, duplicates collapsed
into a counted `×N` pile, ordered into runs (Bells / Keys / Moons / Suitless / Press) each opened by a
tab, and the buffs that cannot be activated right now fenced into one tarnished group carrying the
count and their shared reason.

Re-homes the felt's own layout so the gallery can never occlude game state: `.wc-table` splits into a
permanent left **game rail** (`FeltRail.tsx` — decree, the trick slot, the new consequence readout, the
spent pile) and a **stage** (`FeltStage.tsx`) that renders either the gallery or the felt's narrative
states (fault, resolved-trick reveal, round-over, ability prompt, in-progress trick). The two never
render at once: `loadoutDoorOpen` is `discardWindowOpen(state) || canAct(state)`, and every one of the
four states the rail must never contend with (a held reveal, an open prompt, an engine fault, a
complete round) makes both terms false — the structural guarantee behind AC1.

Adds a **trick consequence readout** (`TrickConsequence.tsx`, driven by the pure `trickConsequence.ts`
view-model) that states, in the rank's own terms, what the Quarry's led card does to the player on an
`IF YOU WIN` / `IF YOU LOSE` branch, or a `RULE` row for a led Monarch or a lone Witch. It renders
nothing before the Quarry has played and nothing when the led card has no consequence beyond the
ordinary — no placeholder, no empty panel.

Gives a skulled card a skull face (one `<symbol>`, referenced by `<use>`) instead of a corner glyph,
identical for every rank and suit, with rank and suit still legible in the corner.

Deletes the intent telegraph outright, both halves — `IntentTelegraph.tsx`, `intentPreview.ts`,
`STANCE_PHRASE`, `intentAccessibleName`, and the copy in `TrickWell.tsx` that told the player to read
it. The consequence readout is now the one surface that says what a trick will do; the lead state
deliberately says nothing.

Adds `RoundUiActionKind.CancelBuffPoise` so `Escape` unwinds the gallery one level at a time (drop an
unspent poise, then close the panel on the second press) instead of closing outright on the first.

## Developer decisions carried forward from the plan (none decided unilaterally)

From `plan.md` Part 1 → *Developer decides or observes*:

- **The cadence-word copy call.** This contract built `TAKE / MISS / DODGE / WHEN / HAND END /
  PRESS`, not the mockup's `WIN / LOSE`. Reasoning: every buff condition reads the *mechanical* axis
  (`playerWon` — did the player physically take the cards), never the outcome axis the bank and
  readout speak — putting `WIN`/`LOSE` on a mechanical test is the exact vocabulary collision
  `CLAUDE.md` names as the single most common source of wrong statements about this game. Changing
  the words back is one map in `buffLabels.ts` (`BUFF_EVENT_WORD` / `BUFF_CADENCE_WORD`).
- **Every colour token added for the gallery** — three tier metals and their edges, three face
  tints and their edges, the card ink pair, the skull wash. None was chosen by anyone; all are
  transcribed placeholders from the mockups. **The 4.5:1 WCAG contrast floor is NOT a placeholder**
  and `contrast.test.ts` enforces it against whatever the tokens say.
- **Every size bound added for the gallery** — `--wc-buffcard-w`, `--wc-rail-w`, `--wc-buff-frame`,
  the duplicate-pile offsets, the hover sheen's duration/angle/width, the fenced card's drop.
- **The trick's cards moving between the stage and the rail when the gallery opens.** The played
  card changes size and position when the gallery is toggled. Only the running app settles whether
  that reads as a move or a loss.
- **Whether fenced buffs re-sorting live mid-trick feels right.** The view is re-derived every
  render, so fenced buffs can visibly re-order under the player's finger mid-trick. If it reads
  wrong, the fix is freezing the order for the trick's duration — small, but a design call.
- **Whether to open a follow-up ticket for `quarryIntent` / `TelegraphFidelity` /
  `TELEGRAPH_FIDELITY`**, which the telegraph's deletion strands in `src/warCouncil/cpuPlayer.ts`
  and `src/hunt/config.ts` with no production consumer. Left in place, not removed — that is a
  bigger cut than this ticket's scope.
- **The 44-card deep pile's internal scroll.** `mockup.html`'s `Pile → deep` state shows the gallery
  scrolling inside its own panel once the pile is large between tricks (measured 68px over at full
  pile, five tabs). AC11 only promises the mid-trick fit (0px overflow, verified), so this is not a
  regression — but a narrower card is the fix if the deep-pile scroll is unwanted.

## Verification (Phase 6, real numbers)

- **Full suite (warm):** `npm test` → `Test Files 149 passed (149)`, `Tests 1939 passed (1939)`.
  Cache warmed first per the known cold-start jsdom timeout: `--project node` → `Test Files 122
  passed (122)`, `Tests 1668 passed (1668)`; `--project dom` → `Test Files 27 passed (27)`, `Tests
  271 passed (271)`.
- **Typecheck:** `npm run typecheck` — exit 0 (`tsc -b`, no output).
- **Lint:** `npm run lint` — exit 0 (`eslint .`, no output).
- **Scoped format:** `npx prettier --check src/app/warCouncil` — failed on first run
  (`SuitMark.tsx`, `__tests__/PlayingCard.test.tsx`, both modified by this contract); fixed
  in-scope with `npx prettier --write` on exactly those two files, re-verified clean, re-ran
  typecheck/lint (still 0) and that spec file (`Tests 12 passed`).
- **`format:check` (reported, not gated per the standing rule against a repo-wide rewrite):** exit
  1, 79 files — all pre-existing `.docs/**`, two `.github/**` instruction files, and one
  contract-untouched file (`src/warCouncil/__tests__/discard.test.ts`). None are in this
  contract's file map.
- **Production build:** `npm run build` — exit 0. `dist/index.html` 0.48 kB,
  `dist/assets/index-CtRppG3e.css` 52.20 kB, `dist/assets/index-BxDVh_42.js` 314.80 kB, built in
  1.00s, no bundler errors.
- **Pure-core boundary (Task 16):** `Get-ChildItem src\warCouncil,src\hunt -Recurse … | Select-String
  "from 'react'|window\.|document\.|localStorage"` → zero hits.
- **Deleted-name sweep (Task 17):** the recursive grep for `IntentTelegraph`, `previewQuarryIntent`,
  `intentAccessibleName`, `STANCE_PHRASE`, `BuffLoadoutPanel`, `wc-telegraph`, `wc-loadout`,
  `wc-skull-mark`, `warCouncilCheats` returned 4 hits, all prose in docblocks/CSS comments
  explaining what a file replaced or when a sibling file was deleted — no import, selector, or
  identifier use of any deleted name. Storage-key grep (`'strings-and-stations'`) hit only in
  `src/persistence/config.ts`, as expected — nothing in this ticket persists a value, so
  `SAVE_SCHEMA_VERSION` is unchanged.
- **400-line budget (Task 18):** first pass found one row — `roundReducer.test.ts` at 423 lines,
  grown +39 by this contract's own `CancelBuffPoise` describe block landing on an already-carved
  384-line file. Fixed in-ticket, following the file's own established convention: extracted the
  block into `roundReducer.cancelBuffPoise.test.ts`. Re-measured: `roundReducer.test.ts` 387 lines,
  the new file 60 lines. Full sweep after the split: zero rows over 400.
- One targeted test fix, done ahead of Phase 6: `WarCouncilRound.timebomb.test.tsx`'s
  "is disabled while a trick reveal is held…" test pinned the pre-DLR-148 behaviour this contract
  deletes (the gallery and a resolved-trick reveal rendering at once). Replaced with two tests —
  one asserting the gallery is not rendered at all once a reveal is held (AC1), one asserting the
  gallery's own `stopPropagation` guard against `.wc-table`'s `handleCarryOn`, using the
  quarry-to-lead window as the one state where both a gallery-open state and an armed
  `.wc-table` `onClick` legitimately coexist.

Delegated to QA (not run by the Implementer): the browser pass (AC1, AC10, AC11, AC17, AC19 — no
jsdom answer), documented as Task 20 in `tasks.md`.

## Conventions this contract introduces — read before touching `src/app/warCouncil/**` again

1. **A card component in a grid must be its own stacking context and clip itself.** A grid card
   that layers content with `z-index` (a sheen under a face, a duplicate-pile stack behind a
   `position: relative` card) does not get a stacking context for free — without `isolation:
   isolate` (plus `overflow: hidden` on the card itself), the layered contest resolves in the
   *grid's* context instead of the card's, and the failure does not look like a z-index bug: it
   looks like a broken card (a stacked buff painting over its own face) or a runaway hover effect
   (a sheen sweeping across neighbouring cards instead of its own rim). Found building this
   contract's `mockup.html`, not on the ticket — see `BuffCard`/`warCouncilBuffGallery.css` for the
   worked fix.
2. **A `.ts` view-model and a `.tsx` component must not share a name up to case on this toolchain.**
   `buffGallery.ts`/`BuffGallery.tsx` and `trickConsequence.ts`/`TrickConsequence.tsx` fold to one
   cached module id under Vite/Vitest on Windows, and the component import silently resolves to
   the model's exports instead of erroring. Both models ship as `buffGalleryModel.ts` and
   `trickConsequenceModel.ts` for exactly this reason — keep the `*Model.ts` suffix on any future
   pure view-model that sits beside a same-named component.
