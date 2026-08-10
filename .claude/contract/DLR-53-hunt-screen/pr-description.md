# PR: The Hunt screen — play a full 13-trick Hunt against a telegraphing Quarry

**Ticket:** DLR-53 (parent epic DLR-46)
**Plan:** [`plan.md`](./plan.md)
**Layout/interaction reference (approved at the DLR-53 planning gate, 2026-08-10):** [`mockup.html`](./mockup.html)

## Summary

Turns the existing War Council round renderer into the Hunt screen described by
`hybrid-design.md` §4: the five persistent readouts (Demand, running Spoils, the player's
trick count and Standing band, the Quarry's trick count, the Quarry's character and its
round-long rule-break), the intent telegraph shown before every commit (both when the Quarry
leads and while the player has a card armed), and an end-of-Hunt panel that shows
`Spoils × Standing = Score` as arithmetic before the cleared/missed verdict.

Every number reaching the screen is read from `src/hunt/config.ts` through the engine
functions DLR-49–52 already shipped (`spoils`, `resolveStanding`, `scoreHunt`, `checkDemand`,
`quarryIntent`, `commitQuarryMove`, `quarryCharacterInfo`) — no layout constant, multiplier, or
Demand value is written into a component (AC7).

**Changed across all four implementation phases:**

- `src/hunt/config.ts`, `src/hunt/index.ts`, `src/hunt/__tests__/config.test.ts` — two new
  config keys, `FIXED_DEMAND` and `SLICE_QUARRY_CHARACTER`.
- `src/app/warCouncilMount.ts`, `src/App.tsx` — `hunt: Hunt` threaded through the mount.
- `src/app/warCouncil/intentPreview.ts` (new), its test — the pure module answering "what
  would the Quarry do if I led this card".
- `src/app/warCouncil/labels.ts`, its test — four new copy maps and the telegraph's
  accessible-name builder.
- `src/app/warCouncil/roundReducer.ts`, its test — the Quarry's lead is no longer
  auto-committed; it is telegraphed, then committed on the player's carry-on tap.
- `src/app/warCouncil/IntentTelegraph.tsx` (new), its test — the telegraph component.
- `src/app/warCouncil/TrickWell.tsx` — a fourth felt branch for the un-committed Quarry lead.
- `src/app/warCouncil/HuntLedger.tsx` (new), its test — Demand, Spoils, Standing, the live
  product.
- `src/app/warCouncil/QuarryDossier.tsx` (new), its test — the character and rule-break.
- `src/app/warCouncil/RoundStatusBand.tsx`, `src/app/warCouncil/RoundOverPanel.tsx` — the
  ledger mounted in the status band; the end panel rewritten around the equation.
- `src/app/warCouncil/WarCouncilRound.tsx`, its test — wiring for all of the above.
- `src/app/warCouncil/__tests__/roundFixture.ts` — a shared `Hunt` fixture for component tests.
- `src/app/warCouncil/warCouncil.css` (shell grid gains a `dossier` area),
  `src/app/warCouncil/warCouncilHunt.css` (new) — the third stylesheet: dossier zone, ledger,
  telegraph, equation panel.

## Developer decisions needed (from `tasks.md` → "Developer decides or observes")

1. **`FIXED_DEMAND` (`src/hunt/config.ts`) — 220 is a documented placeholder, not a chosen
   value.** At the printed multipliers and rank-valued cards a Hunt scores roughly
   `12k × f(k)` for `k` tricks won: ≈216 at 3 tricks, 48 at 4, 120 at 5, 216 at 6, ≈504 at 7,
   ≈648 at 9, and 0 at 10+. 220 puts the Humble-3 and Defeated-6 lines on a knife edge; ~500
   would make only Victorious clear. **This value sets what T8's kill-criterion playtest
   measures — needs the developer's number, not the placeholder shipped here.**
2. **The speculative follow telegraph — plan.md implements option (a)**, previewing the
   Quarry's response to the card the player has armed but not yet committed. Whether that is
   too much inference about a hand §4 marks hidden is a design call only playing settles;
   option (c) — gating it behind `TELEGRAPH_FIDELITY` — remains a small addition afterwards if
   wanted.
3. **The live in-play product (`Spoils × Standing`, shown during play, not only at the end) is
   an addition to AC2, not a requirement of it** — judge whether it earns its space on screen.
4. **Card and dossier size bounds** — the `clamp()` min/max in `warCouncilHunt.css` follow the
   established `--wc-card-w` shape, but the specific bounds are tuning values, not derived.
5. **Whether reading the telegraph actually changes the card the player plays** — the epic's
   headline question and T8's kill criterion. QA can confirm the telegraph renders and names
   the right suit and stance; it cannot answer whether it changes a decision.
6. **Whether the opening tap** ("Let them lead" on trick 1, the one trick with no prior reveal
   to fold the commit onto) **reads as a stall** to a player.
7. **All visual and copy judgement is deferred to T15 per AC8** — do not block this ticket on
   it.

## Verification results

| Check | Command | Result |
|---|---|---|
| Pure-core boundary — engine trees | `Select-String -Path src\warCouncil\*.ts,src\hunt\*.ts -Pattern "from 'react'\|\bwindow\.\|\bdocument\.\|localStorage"` | **PASS** — zero hits |
| Pure-core boundary — `intentPreview.ts` (review-enforced, outside the lint tree) | `Select-String -Path src\app\warCouncil\intentPreview.ts -Pattern "from 'react'\|\bwindow\.\|\bdocument\."` | **PASS** — zero hits |
| No hard-coded Demand/multiplier (AC7) | `Select-String -Path src\app\warCouncil\*.tsx -Pattern "\b(220\|\bx?6\b\|\bx?3\b)\s*\)"` / `-Pattern "demand\s*[:=]\s*[0-9]"` | **PASS** — zero hits |
| `DEMAND_CURVE` not quietly started | `Select-String -Path src\hunt\config.ts -Pattern "base: null"` | **PASS** — one hit (`src\hunt\config.ts:66`) |
| No debug logging shipped | `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "console\.(log\|debug)"` | **PASS** — zero hits |
| File sizes (`src/app/warCouncil/*`) | `Get-ChildItem … Measure-Object -Line` and re-measured with `.Count` | **PASS** — every file under 400 by both measures; largest is `warCouncil.css` at 317 (Measure-Object) / 367 (`.Count`) lines, then `roundReducer.ts` (211/237) and `WarCouncilRound.tsx` (212/225). No split required. |
| Vitest, node project (cache warm-up) | `npx vitest run --project node` | **PASS** — 23 test files, 396 tests passed |
| Vitest, dom project (cache warm-up) | `npx vitest run --project dom` | **PASS** — 6 test files, 37 tests passed; no worker-start timeout |
| Typecheck | `npm run typecheck` | **PASS** — exit 0, no output |
| Lint | `npm run lint` | **PASS** — exit 0, no output |
| Unfiltered Vitest suite | `npm test` | **PENDING QA** — the Implementer runs only scoped Vitest projects; the unfiltered suite belongs to QA per this contract's division of labour |
| Production build | `npm run build` | **PENDING QA** — not run by the Implementer |
| Browser-driven check — AC5 (no scroll at 1920×1080, 1366×768, 1024×640, 390×844) | dev server + `chrome-devtools` MCP | **PENDING QA** |
| Browser-driven check — AC1 (full 13-trick round, mouse then keyboard-only) | dev server + `chrome-devtools` MCP | **PENDING QA** |
| Browser-driven check — AC3 (telegraph present before every commit, both cases) | dev server + `chrome-devtools` MCP | **PENDING QA** |
| Browser-driven check — AC9 (`list_console_messages` reports no error) | dev server + `chrome-devtools` MCP | **PENDING QA** |

No number above was invented — every PASS row is a command the Implementer actually ran in
this phase and the numbers quoted are its real output; every PENDING QA row names the command
QA will run rather than guessing at its result.

## Note for future contributors

The intent telegraph (`IntentTelegraph.tsx`, fed by `quarryIntent` for a live turn and by
`previewQuarryIntent` for an armed-but-uncommitted card) is derived fresh on every render, not
stored in `RoundUiState`. Both source functions are pure, cheap (bounded by a hand of at most
13 cards), and self-guarding — `quarryIntent` returns `null` unless it is genuinely the
Quarry's turn — so a stored copy could only go stale against `ui.round`; deriving it is both
simpler and more obviously correct, including under StrictMode's double-invoke.
