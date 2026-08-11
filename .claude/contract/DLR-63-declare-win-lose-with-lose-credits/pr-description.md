# DLR-63 — Declare Win/Lose, with Lose credits

Plan: [`plan.md`](./plan.md)
Mockup (developer-approved layout reference): [`mockup.html`](./mockup.html)

## Summary

Adds a declare step to the top of a Hunt round: before the first trick, the player commits to
playing for **Win** or **Lose**.

- **Win** plays the existing rules unchanged — Standing is scored off tricks won, same as before.
- **Lose** inverts each played card's value for scoring purposes (`invertedCardValue`, pivoted at
  `RANK_INVERSION_PIVOT`) and grants a small, capped pool of "lose credits"
  (`LOSE_CREDITS_PER_HUNT`). Each lost trick can be claimed against the pool — once per trick, only
  on a trick the player actually lost, capped at the pool size — to count that trick's cards
  toward Spoils under the Lose scoring instead of forfeiting them.
- The hand now renders longest-suit-first, ascending rank within each suit
  (`sortHandForDisplay` in `src/app/warCouncil/handOrder.ts`), and re-derives every time the hand
  shrinks — it is not a one-time sort.
- Cards carry a new face: a border in the card's own suit hue, with the suit mark moved to the
  bottom-left corner.

None of this touches the multiplicative Standing term. `resolveStanding`, `tricksToPoints`,
`scoreHunt`, and `checkDemand` in `src/hunt/config.ts` / `src/warCouncil/scoring.ts` are unchanged
by this ticket — `scoreHunt` only ever reaches the declaration indirectly, through `spoils`. This
is verified structurally in Phase 4 (see below), not just asserted.

## Decisions still the developer's

- **`LOSE_CREDITS_PER_HUNT`'s value.** Ships as `3`, a documented placeholder derived from
  `220 / (6 × 12) ≈ 3` against `FIXED_DEMAND` and the Humble ×6 band. Watch whether a Hunt ever
  ends with an unspent credit, or a spend gets regretted — if neither happens in playtesting, 3 is
  too many.
- **Rank direction within a suit.** Ascending is the chosen default (valuable cards under Lose end
  up leftmost). Descending would put high cards leftmost, which reads better under Win. One line
  in `sortHandForDisplay` (`src/app/warCouncil/handOrder.ts`) if this needs to flip.
- **Whether the mid-round re-order feels right** — as the hand tidying itself, or as cards moving
  under your finger while you're mid-decision. Fallback, if it reads badly, is a fixed `ALL_SUITS`
  order — same one line.
- **The card-face visual call** — border width, the suit mark's corner offset, and whether a
  suit-coloured border reads as information or as decoration at `--wc-card-w`'s
  `clamp(2.9rem, 6.2vmin, 4.3rem)`.
- **Whether the declare gate's tap** — on top of trick 1's existing "Let them lead" tap — opens
  the Hunt as a real decision, or reads as a speed bump before play can start.

## Caveat worth stating up front

The Lose path lands the player in the Humble Standing band, which `hybrid-design.md` §6 already
shows is dominated at ×6. AC4 forbids touching a multiplier as part of this ticket, so a
Lose-path Hunt that scores low in the first playtest is **expected under this ticket's scope, not
a defect of it.** Whether Humble needs its own multiplier work is a separate ticket.

## Verification — Phase 4

Phase 4 makes no production change; it is a set of boundary and tunable-hygiene greps plus this
hand-off document. The unfiltered suite, the production build, the formatting check, and the
four-viewport browser measurement are QA's — pending at the time of writing, not fabricated here.

### Scoped results already in hand (from Phases 1–3, re-affirmed by the Implementer at Phase 4)

- `npm run typecheck` — exits 0.
- `npm run lint` — exits 0, no warnings.
- `npx vitest run src/app/warCouncil` — **106 passed / 12 files**.
- `npx vitest run src/app` — **108 passed / 13 files**.
- `npx vitest run src/warCouncil src/hunt` — **383 passed / 19 files**.
- Scoped `npx prettier --check` over every file Phase 3 touched — clean.

### Task 20 — pure-core boundary greps (all zero hits, as required)

- `Select-String -Path src\warCouncil\*.ts,src\hunt\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"` — zero hits.
- `Select-String -Path src\app\warCouncil\handOrder.ts -Pattern "from 'react'|\bwindow\.|\bdocument\."` — zero hits.
- `Select-String -Path src\app\warCouncil\*.ts,src\app\warCouncil\*.tsx -Pattern "useEffect|useLayoutEffect"` — zero hits.
- `Select-String -Path src\warCouncil\*.ts,src\hunt\*.ts -Pattern "Math\.random"` — zero hits.

### Task 21 — tunable-hygiene and AC4 greps

- Step 1 (`220|12 -|12-` in `src\app\warCouncil\*.tsx`) — zero hits. No component hard-codes the
  Demand or the credit pool.
- Step 2 (`minTricks|maxTricks|multiplier:` across `src\`) — hits confirmed in the allowed set:
  `src\hunt\config.ts` (the one `STANDING_BANDS` table and `StandingBand` interface),
  `src\hunt\__tests__\config.test.ts`, and `src\warCouncil\__tests__\scoring.test.ts` (deliberate
  mutated copies). **Finding, not silently fixed:** the same grep also hits
  `src\app\warCouncil\RoundOverPanel.tsx:52` and two lines in
  `src\app\warCouncil\__tests__\WarCouncilRound.test.tsx` (317, 337). On inspection these are the
  literal word "multiplier:" inside an `aria-label` string (`` `Standing multiplier: times
  ${huntScore.standing}` ``) and its test assertion — display copy that reads the already-computed
  `huntScore.standing`, not a second numeric table. `RoundOverPanel.tsx` predates this contract and
  is outside DLR-63's file list; nothing in it was touched by this contract's phases. Flagging for
  the record rather than adjusting the grep or editing an out-of-scope file.
- Step 3 (`declaration|HuntDeclaration|creditedCards` in `src\hunt\config.ts`,
  `src\warCouncil\scoring.ts`) — zero hits. Structural proof of AC4/AC5.
- Step 4 (`eslint-disable|@ts-ignore|@ts-expect-error` across `src\`) — zero hits.

### Pending — QA's, not fabricated here

- `npm test` unfiltered — **pending QA** (placeholder: `Tests N passed / N files`).
- `npm run build` — **pending QA** (placeholder: exit code, `dist/` written).
- Four-viewport browser measurement (1920×1080, 1366×768, 1024×640, 500×844) of the credits cell
  against `window.innerWidth`, plus the no-scroll and hand-order checks — **pending QA**
  (placeholder: pass/fail per size, per `.claude/agents/qa.md` → Task 23).

## Note for future contributors

`claimLostTrick` establishes trick ownership from the ordered tail of the winner's capture pile
(`isQuarryPileTail` in `src/warCouncil/claimLostTrick.ts`), so **any change to `playCard`'s capture
accounting invalidates it.** The comment lives at both ends: above `isQuarryPileTail` in
`claimLostTrick.ts`, and above the `capturedCards` rebuild in `playCard.ts`.
