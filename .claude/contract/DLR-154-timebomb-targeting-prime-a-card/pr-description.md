# PR: Timebomb targeting — prime a card in hand, mark it, and give it a fuse

Plan: [`plan.md`](./plan.md) (Jira **DLR-154**, parent epic DLR-147)

## Summary

Timebomb already worked mechanically — arming a damage pair on spend, reinterpreting the next
hand-card tap as a prime, and detonating at the next trick's resolution. What was missing was
everything the player could *see, undo, and be held to*. This ticket gives the hand a visible
priming mode with a prompt that says why, replaces the `⚗` glyph with a real inline-SVG bomb
mark on the card's wrapper carrying a live countdown, makes a riding Timebomb revocable with a
riding-row control and an `Escape` route, refuses a second Timebomb outright instead of letting it
silently overwrite the first, and books an un-played primed card's detonation through the same
`queueTimebomb` path a played bomb already uses.

## The seven closed gaps

1. **The priming prompt was unreachable.** It sat below `quarryToLead` in `deriveHint`'s cascade,
   which is true throughout exactly the window Timebomb is activatable in, so it never showed.
   `deriveHint` now checks the Timebomb branch first.
2. **`.wc-fan.wc-is-marking` had no stylesheet rule.** The hand set the class but nothing styled
   it, so priming mode was invisible. `warCouncilHand.css` now carries a real rule (tint + inset
   edge, placeholder values).
3. **The mark was a `⚗` glyph in a green disc, not the approved bomb.** Replaced by `TimebombMark`,
   an inline-SVG component reproducing the DLR-147-approved cartoon bomb shapes.
4. **The riding row called a Timebomb "already spent" with no way back.** It now states the
   card it targets (or that nothing is primed yet) and carries its own remove control.
5. **`Escape` silently ate a paid-for card while priming.** It now routes to the same
   `RemoveBuff` reversal the riding row's control uses (AC13), returning the card and lifting the
   mark instead of discarding the spend.
6. **A second Timebomb could silently overwrite the first's tier** so a gold-marked card
   detonated for bronze — corrected as **R2** below.
7. **A marked card the player never played evaporated at hand end for free**, with no warning and
   no readout — corrected as **R3** below.

## The two corrected rules

- **R2 — a second Timebomb is refused outright**, not allowed and then blocked at the prime (which
  would strand the just-spent card). A new `BuffActivationRefusal.TimebombLive` member fires while
  one is armed or primed; the Timebomb row goes visibly unavailable with its own reason.
- **R3 — a primed card carries a two-trick fuse.** `timebombFuseRemaining` seeds at
  `TIMEBOMB_FUSE_TRICKS` (2) on prime, decrements at each trick resolution while the card is still
  in hand, and books the player-side hit through `queueTimebomb` at zero — inheriting the bank
  reset, the Blast Guard's absorption, the zero floor and the forced cash-out with nothing
  restated.

## Developer decisions still open (placeholders shipped, not chosen)

All carried forward unretuned from the DLR-147 mockup / this contract's own design calls — none of
these numbers, colours, or wordings were picked by an agent:

- **`warCouncilTimebombMark.css`'s every number and colour** — `top: -11%`, `right: -9%`,
  `width: 46%`, the `620ms steps(2, end)` fizz, and the `--wc-timebomb` ring hue.
- **The priming mode's tint and inset edge** (`.wc-fan.wc-is-marking`) — no approved reference
  exists for the hand *while waiting*; this is a fresh call needing sign-off.
- **The countdown's legibility at real scale.** The bomb is 46% of a card whose width is
  `clamp(2.9rem, 6.2vmin, 4.3rem)` — at the small end the numeral shares a roughly 21px disc with
  the fuse and spark. It may need to move beside the bomb rather than onto it.
- **AC11 — a card that is both skulled and primed, now with a numeral too.** Whether all three
  marks stay legible together is a judgement call, not a check.
- **All five new/retuned strings are PLACEHOLDER copy** — the priming prompt, the riding row's
  target and not-yet-primed sentences, the remove label, and the fuse clause.
- **The in-hand-pop timing.** Booking through `queueTimebomb` means the fuse expires at trick
  N+1's resolution but the hit lands at N+2's — a deliberate beat of delay traded for reusing the
  bank/Blast Guard/cash-out machinery rather than restating it. If the developer wants the hit
  immediate instead, that only touches the booking task, but it means restating those three rules.
- **Whether the Blast Guard should absorb an in-hand pop.** It does today — inherited via the
  shared booking path, not a decision anyone has explicitly taken.

## Verification

Run this phase (final-verification gates and the scoped formatting pass only):

- **Typecheck** — `npm run typecheck` — PASS, `tsc -b` exits 0, no output.
- **Lint** — `npm run lint` — PASS, `eslint .` exits 0, no warnings.
- **Prettier (scoped)** — `npx prettier --write <contract files>; npx prettier --check src\app\warCouncil\*.ts src\app\warCouncil\*.tsx src\app\warCouncil\*.css` — PASS, "All matched files use Prettier code style!" (one file, `labels.ts`, needed a line-wrap; it is now clean).
- **Pure-core boundary grep** — `Select-String -Path src\hunt\*.ts,src\warCouncil\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"` — zero hits, boundary holds.
- **`eslint-disable` audit** — `git diff --unified=0 -- src | Select-String -Pattern "eslint-disable"` — zero hits, no lint rule was suppressed to land this work.
- **Retired-name audit** — grep for `REVOCABLE_CONDITION_KINDS|wc-face-primed|wc-primed-mark|primedMark` across `src/**/*.ts(x)` and `*.css` — zero hits, all four retired cleanly.
- **Inlined-tunable audit** — grep for `timebombFuseRemaining\s*[:=]\s*2\b` — zero hits, the fuse length is read only from `TIMEBOMB_FUSE_TRICKS`.
- **New CSS class audit** — every class the TSX renders has a rule behind it: `.wc-timebomb-mark`, `.wc-timebomb-mark-fuse`, `.wc-timebomb-mark-glow` (in `warCouncilTimebombMark.css`), `.wc-fan.wc-is-marking` (in `warCouncilHand.css`), `.wc-card-tip-fuse` (in `warCouncilTimebombMark.css`) — all present, no orphaned class.

**The unfiltered test suite (`npm test`) and the production build (`npm run build`) were NOT run
by the Implementer this phase — both are delegated to and owned by QA for this contract.** No
result for either is claimed here; do not read their absence as a failure.

## Convention note

`TimebombMark` establishes the **inline-SVG-with-`useId`** convention for any future card
overlay, deliberately opposite `#wc-skull`'s `<symbol>` + `<use>` pattern — AC8's reason is that
`<use>` clones into a shadow tree the fizz class cannot reach from the light DOM, leaving the
spark dead and unreachable by `prefers-reduced-motion`.

## Known follow-up (not fixed here — out of this phase's file map)

Phase 6 exported `timebombRemovedText` in `buffRideLabels.ts` but left it **unwired**:
`buffRideProps.ts`'s `useBuffRide.handleRemoveBuff` still calls the generic
`buffRemovedText(row.buff, row.reach)` when a Timebomb is removed, so the announcement names a
reach-based sentence rather than naming the card taken back. `buffRideProps.ts` was not in any
phase's `**Files:**` block, so it was correctly left untouched this contract. Flagging for the
reviewers and the developer to pick up as a small follow-up.
