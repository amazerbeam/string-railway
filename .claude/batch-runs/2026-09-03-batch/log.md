# Batch run — 2026-09-03

Branch: `Version-7` · base commit `73d7415` · tree clean at preflight.

**Progress:** batches 5/5 · plans 5/5 — 5 committed, 0 blocked · central review running

## Resolved plans

| Order | Slug | Title |
|---|---|---|
| 1 | `DLR-166-remove-timebomb-and-blast-guard` | Remove Timebomb and the Blast Guard, and all the delayed-damage machinery behind both |
| 2 | `DLR-162-the-wildcard` | The wildcard — spend it on a buff card to take its suit off |
| 3 | `DLR-167-curse-skull-your-own-card` | Curse — an activated buff card that puts a skull on one of your own cards |
| 4 | `DLR-163-rewrite-the-3-5-and-7` | Rewrite the 3, the 5 and the 7 so all three are worth playing — for both sides |
| 5 | `DLR-165-vocabulary-rename-victory-defeat-high-low` | Vocabulary rename — Victory/Defeat name the outcome, High/Low name the act |

## Batch grouping

Every pair of plans intersects, so there is no parallel batch: five batches of one, run
sequentially. Measured intersections (files declared by both):

| Pair | Shared files | Example conflicts |
|---|---|---|
| 162 × 163 | 2 | `src/hunt/index.ts`, `src/app/warCouncil/roundUiState.ts` |
| 162 × 165 | 20 | `src/app/warCouncil/buffLabels.ts`, `src/app/run/slotSymbols.ts` |
| 162 × 166 | 20 | `src/app/warCouncil/buffLabels.ts`, `src/app/warCouncil/roundUiState.ts` |
| 162 × 167 | 10 | `src/hunt/buffs.ts`, `src/hunt/buffTemplates.ts`, `src/hunt/buffCatalog.ts` |
| 163 × 165 | 27 | `src/app/warCouncil/cardDamage.ts`, `src/app/warCouncil/roundResult.ts` |
| 163 × 166 | 25 | `src/app/warCouncil/roundReducer.ts`, `src/app/warCouncil/commitHandlers.ts` |
| 163 × 167 | 22 | `src/app/warCouncil/roundReducer.ts`, `src/app/warCouncil/cardDamage.ts` |
| 165 × 166 | 44 | `src/sim/playHand.ts`, `src/app/warCouncil/cardDamage.ts` |
| 165 × 167 | 22 | `src/hunt/buffAccrual.ts`, `src/hunt/buffActivation.ts` |
| 166 × 167 | 25 | `src/app/warCouncil/buffHandlers.ts`, `src/app/warCouncil/commitHandlers.ts` |

Ordering rationale: the removal ticket runs first so the later plans extend tables that have
already shrunk; the sweeping vocabulary rename runs last so it also renames the code the four
earlier plans add.

**Nothing is reviewed until Phase 5.** A defect in an early plan sits under every later plan's
work until the single review pass at the end of the run.

## Per-plan record

### DLR-166 — remove Timebomb and the Blast Guard · committed `3d10c26`

Phases 1–4 and 6 complete. Typecheck clean at the batch boundary (`tsc -b`, exit 0).
Scoped Vitest: 198 files / 2283 tests, all passing. The acceptance grep for the removed
mechanics fell from 1629 hits across 182 files to 2, both deliberate regression guards that
assert the deletion itself.

**Phase 5 (documentation) deliberately deferred to the end of the run.** `.docs/` holds 1436
occurrences across 87 files, 340 of them in `.docs/game_rules/the-hunt.md` — the same file
DLR-165 rewrites later in this run. Two passes over that document would collide, so it is
handled once, after DLR-165 lands. `.docs/` is stale on these mechanics until then.

**Files the plan failed to declare** (all compelled by the deletion): `src/warCouncil/deal.ts`,
`src/app/warCouncil/FeltRail.tsx`, `src/app/warCouncil/DecreePile.tsx`,
`src/app/warCouncil/roundControlsProps.ts`, and `src/hunt/__tests__/blastGuard.test.ts`
(deleted — a dedicated spec for the removed Guard that the plan's delete list missed).

**Assumptions taken (developer's to confirm):**
- Two reward-axis suffix words that read "Blast Guard" were renamed to **"Bulwark"**. Player-facing copy.
- The colour token was named `--wc-gain` / `--wc-gain-edge` per the plan's proposal; the hex is unchanged.
- `PurchaseRefusal.GuardAlreadyActive` and its message row were deleted — nothing could produce it.
- `BuffPayoff.risk` kept as a field, now always `null`, so the split damage bar stays a shape.
- `isRevocableBuff` narrowed to Taker/Feeder/Sidestep.

**Left alone, for a follow-up:** `src/hunt/runCarry.ts` still exports `guardAfter`, now unused.
`src/warCouncil/__tests__/cpuPlayer.test.ts` is 416 lines — a pre-existing breach of the
400-line rule, outside this contract's file map.

**What a browser would have checked:**
1. The felt rail with the Timebomb plate gone — is there a visible gap where it sat?
2. The health bar with three heart states instead of four — does the at-risk band still read, and are the blue shield pips legible now they only draw solid?
3. The won-verdict headline, the feeder carry-out row and the buff card's payoff chip — all three borrowed the renamed colour token and should be pixel-identical.
4. The buff gallery with one fewer activated card — does the Press run read sensibly with only Cheat in it?
5. The shop screen — two fewer items; the shelf tabs are worth a glance.
6. A full hand end to end, watching the loadout panel's two-tap flow and Escape, which no longer has a Timebomb-removal branch to intercept it.


### DLR-162 — the wildcard · committed `e900cff`

All seven phases complete. Typecheck clean at the batch boundary. Scoped Vitest: 27 files /
471 tests, all passing. Nothing over 400 lines; ten new files, largest 113.

**Steps skipped because DLR-166 had already deleted the subject:** the Timebomb's activation
spec, `BuffActivationStock.timebombLive` / `BuffActivationRefusal.TimebombLive`, and the
Timebomb rows in the activated mint and glyph lookups. Both lookups are now Cheat + Wildcard.

**Plan figures that were stale and were corrected rather than worked around:** the mintable
pool is 18, not the plan's 19 (DLR-166 had already cut it); the Skirmisher's Taker weight is
5/6, not 2.5 — the plan's arithmetic assumed a two-template family that has held six since
DLR-150. Four specs the plan lists as "Modify" do not exist; the assertions went into the
specs that actually render the code, plus one new `manageBuffsLabels.test.ts`.

**Files the plan failed to declare:** `src/App.tsx` (one line — the panel gained a required
prop), `src/app/warCouncil/BuffRunTab.tsx` (one row, compile-forced by the new run kind — the
plan's audit enumerated three tables keyed by that union and missed this fourth),
`src/app/warCouncil/__tests__/BuffGallery.test.tsx`.

**Deliberate deviation:** `isShopOnlyBuff` was placed in `src/hunt/buffs.ts`, not the planned
`consumables.ts`, which stood at 396 of the 400-line blocking budget and would have gone to
404. Recorded in the function's docblock.

**Open question for the developer:** whether a silver or gold wildcard should do more than a
bronze one. Today all three convert exactly one card and the tier is purely cosmetic.
The wild tab also borrows the suitless tab's colour — a fourth tab colour is a visual call.

**What a browser would have checked:**
1. Does the wildcard band fit above the two combine bands without the shell scrolling — at 1440x900, at ~1280x720, and at phone height?
2. Does the target grid fit when the pile is large and most tiles are refused?
3. Is the six-armed asterisk distinguishable from the three suit marks at card size, and in greyscale?
4. Does the wild card's brass payoff chip clear 4.5:1 against the parchment face it sits on?
5. The two-tap spend — band, target tile, "Make wild". Is confirming on the tile as quick as it reads?
6. Arrow keys across the target grid, Escape twice, and whether focus visibly returns to the band's spend button.
7. The wildcard's glyph on the reel windows and strip chips — legible while the reel moves, and clearly not the Cheat?
8. A wild pile's ready strip reading "Combine to II - eats a Bronze Bell-Taker (Blade)" — does it fit the strip, or clip?

### DLR-167 — Curse · committed `d1feabf`

All five phases complete. Typecheck clean at the batch boundary. Scoped Vitest across the
engine, hunt, sim and war-council UI: 170 files / 2047 tests, all passing. Nothing over 400
lines.

**Rebuilt rather than reused:** the plan told the agent to follow the Timebomb's priming flow
for targeting. DLR-166 deleted it, so Curse's targeting was built fresh on the live
`discardSelecting` hand-tap path. The wildcard's target grid was read and rejected as a model —
it is a two-tap-with-confirm gesture on a different screen. Nothing of the Timebomb was
resurrected. The plan's "21 RoundState literals" turned out to be 13.

**Files the plan failed to declare** — all compile-forced by DLR-162's total `Record`s or by a
missing render site: `src/hunt/slotWeights.ts` (without a Curse row the card is unreachable at
run start, so AC1 is unimplementable), `src/app/run/slotSymbols.ts`, `src/app/run/SlotGlyph.tsx`,
`src/app/warCouncil/BuffRideZone.tsx` (the plan named `roundControlsProps.ts`, which does not
render `HandFan`), `src/app/warCouncil/roundUiSeed.ts`, `src/app/warCouncil/WarCouncilTable.tsx`,
`src/sim/types.ts`, plus ten spec files.

**Repaired DLR-162 breakage:** `buffTemplates.activated.test.ts` asserted exactly one activated
template and a non-zero AP price; the wildcard made both false. Fixed here rather than left red.

**Assumptions taken (developer's to confirm):**
- **Curse's slot weights, 3 and 1** — a genuinely new tuning value nobody chose, forced by a total `Record`. Copied from Cheat.
- Curse's AP prices 2/3/4 — the plan's default. `AP_ENABLED` is `false`, so nothing is spent today.
- Sidestep's replacement copy — the plan's default, `'a skull trick you do not take'` / `SKULL LOSS`.
- **The mockup's dashed red edge on a cursed card was not built** — Task 13 forbade new CSS and no CSS file was declared. Open question.
- An armed-but-unused Curse persists across the trick boundary; only the mark lapses. AC7 is about the mark, not the arm.
- The simulator defaults a Curse target to the first card in hand so the arm cannot swallow the driver's own play. No policy was taught *when* to Curse.

**Known gap, deliberately left:** the felt's held-trick reveal renders from post-resolution
state, where the mark has already lifted, so a cursed card shows no skull there. The resolution
screen itself does carry it. Fixing the reveal means carrying the mark past its lapse, which
cuts against AC7.

**Three files are within budget but nearly full** — `buffTemplates.ts` 396, `hunt/index.ts` 397,
`consumables.ts` 398. The next ticket to touch any of them must split it.

**What a browser would have checked:**
1. The Curse row in Apply Buff — does its payoff line read "+2 damage, +1 multiplier" at gold?
2. After spending it, does the hint tell you a card tap is now a mark?
3. Does the skull face appear on the card in your own hand, with rank and suit still readable?
4. Is a second Curse disabled with "A Curse is already waiting for a card."?
5. With a Curse armed, is an illegal card still tappable and keyboard-reachable?
6. Play the cursed card into a trick you lose — does the resolution screen say dodge, bank, and cost no health?
7. Play it into a trick you win — does it hurt and bank nothing?
8. Let the trick resolve without playing the marked card — is the skull gone next trick?
9. With Sidestep owned too, do both pay on the same Curse-made dodge, and does Sidestep's face read "SKULL LOSS"?
10. Curse's reel glyph beside Cheat, the wildcard, Helmet and Tether — in greyscale as well as colour.
11. Console clean throughout.

### DLR-163 — rewrite the 3, the 5 and the 7 · committed `3e472ac`

Phases 1-6 and the two grep tasks complete. Typecheck clean at the batch boundary. Scoped
Vitest: 214 files / 2482 tests, all passing, including six new spec files.

**No seeded fixture was rebased.** `applyQuarrySwap` reads the draw seed without advancing it,
so every existing reshuffle sequence is bit-identical and the whole simulator suite passed
unchanged on the first run after the engine change.

**Two file splits the plan mandated were dropped as unnecessary.** DLR-166 shrank
`commitHandlers.ts` from 399 lines to 284, and `App.tsx` was 393 rather than the plan's 399, so
`potHandlers.ts` and `useRunTransitions.ts` were never created — both existed only to make room
that already exists. A third split *was* forced: `src/hunt/index.ts` stood at 397 after DLR-162
and DLR-167 grew it, so the buff re-exports moved into a new `src/hunt/buffIndex.ts` (195
lines), leaving the barrel at 220 with its exported set unchanged.

**Files the plan failed to declare:** `src/hunt/buffIndex.ts` (created, forced by the 400-line
rule), `src/sim/playHandWindows.ts` (the simulator's mount seed — without it every simulated
hand opens at zero and silently loses each fight's Swap raise and Treasure bonus at the hand
boundary), and `src/app/warCouncil/WarCouncilRound.tsx` (the plan named the mount but not the
component that consumes it).

**Decided rather than asked:** `chooseQuarrySwapCard` went into `abilities.ts`, not the planned
`cpuPlayer.ts`, which imports `playCard` and would have formed a module cycle for a three-line
helper. `skullArrivedIn` is derived in the reducer by comparing the skull list across the
transition, not from a previous render — the plan's phrasing needed the cross-render ref the
plan itself forbids.

**Assumptions taken (developer's to confirm):**
- The four transcribed constants shipped as the ticket states them: Treasure base-damage step 1, Quarry Treasure damage 2, Swap-cap step 1, Quarry swap skull chance 0.4.
- Copy nobody chose: "N of M" on the Swap control, "already trump", "Leave it as it is", "Name a suit...", "skull arrived", and the three rewritten rule texts.
- The raised-Swap and skull-arrived treatments (dashed and thickened borders, a boxed count, a 240ms transition) are the implementer's and are the developer's to move.
- **The no-rule mark is now applied to nothing** — flipping the 7 to an acting rank leaves no inert face at all. The plan claimed it stays on rank 8; rank 8 is plain, so that was wrong.
- **The 3's prompt does not show a per-suit hold count.** The mockup had it; the plan's prop list removed it. That count is the one fact the choice turns on — one prop to add back.

**Pre-existing 400-line breaches, untouched and outside this contract:** `src/sim/types.ts` at
409, `src/hunt/__tests__/buffActivation.test.ts` at 413.

**What a browser would have checked:**
1. Play a 3 — does the suit picker sit right on the felt at its new size, and does the decree plate hold its footprint when the card goes?
2. In greyscale, is the "already trump" suit distinguishable by its dashed edge and wording alone?
3. Play a 5 — does the Swap control's raise read as "the addition landed here", or just like a hover?
4. Let the Quarry play a 5 repeatedly — is the "skull arrived" mark noticeable at all, and is it noticeable too much?
5. Win a trick with a 7, then check the hand fan's damage preview on the next trick — does it show the +1?
6. Lose a trick carrying a 7 — does the health bar visibly drop 2?
7. The 7's face — is the "no rule" mark actually gone?
8. No page scroll at phone height with the prompt open.

### DLR-165 — vocabulary rename · FIRST ATTEMPT DESTROYED THE WORKING TREE

The first agent completed the rename and had it typechecking clean with 2489 tests passing,
then ran one more PowerShell find-and-replace. PowerShell flattened its nested single-pair
array, so the loop read the first two *characters* of the first string as the old/new pair and
executed **`.Replace('/', 'W')` across every `.ts` and `.tsx` file under `src/`** — 438 files,
every forward slash in every import path, comment marker, regex and JSX attribute turned into a
capital W. The damage is irreversible: a genuine `W` is indistinguishable from a converted
slash. The agent could not repair it because every repair route needed a write it was not
permitted, and it stopped rather than working around the denials, which is the right call.

**Nothing committed was harmed.** All four earlier commits were intact, `.docs/`, `.claude/` and
`CLAUDE.md` were never touched, and every corrupted file held only that agent's own uncommitted
work. Verified by comparing a corrupted file against its `HEAD` version, then `git restore src`,
then `npm run typecheck` green.

**The retry bans bulk find-and-replace outright** — every edit through the Edit/Write tools, one
file at a time, PowerShell restricted to reading. The first attempt's genuine findings were
carried into the retry rather than rediscovered:

- The condition sentence must be `'go high on {suit}'`, not the plan's `'go high on a {suit} trick'` — the wildcard substitutes `any suit` and the plan's article produces "go high on a any suit trick".
- Sidestep's text and pill become `'go low on a skull'` / `'LOW'`.
- The two protective families' `HURT` pill became `SKULL` — a copy decision, the developer's.
- `consequenceLabels.ts` still says "If you win" / "If you lose" on the pre-commit hover. The plan puts it out of scope, but it is a live player-facing use of the old words.
- `SAVE_SCHEMA_VERSION` must go 1 to 2 in the same change as the `BuffKind` value rename, with a spec proving a version-1 payload is rejected by version rather than reconciled to an empty Vault.
- `src/sim/types.ts` at 409 lines needs trimming if the ticket edits it substantially.

### DLR-165 — vocabulary rename, second attempt · committed `d7d1991`

Phases 1-6 complete on the retry, with bulk find-and-replace banned and every edit made one file
at a time. Typecheck exit 0 across the whole tree. Final path-scoped Vitest: 214 files / 2491
tests, all passing.

**The two load-bearing predicates were preserved and are now pinned by new specs.** Suit Low
(was Feeder) is still `!playerWentHigh && (wild || suit matches)` with no skull term, so it fires
on a Low Victory and a Low Defeat alike — proven by "Suit Low — fires on BOTH a Low Victory and a
Low Defeat, because it reads only the act". Skull Low (was Sidestep) is still
`skullTrick && !playerWentHigh` — proven by a four-cell spec asserting false on High Defeat, Low
Defeat and High Victory.

**Renames:** Taker/Feeder/Sidestep to Suit High / Suit Low / Skull Low; the four outcome members
to High Victory / Low Victory / Low Defeat / High Defeat; `playerWon` to `playerWentHigh`;
`feederCarry` to `lowCarry`; `protectionCoversCleanLoss` to `protectionCoversLowDefeat`;
`trickWasLoss` to `trickWasDefeat`. Two spec files renamed. `SAVE_SCHEMA_VERSION` 1 to 2, with a
spec proving a version-1 payload is rejected by version rather than reconciled to an empty Vault.

**Two pre-existing 400-line breaches were fixed in passing:** `src/sim/types.ts` 409 to 400 and
`src/hunt/__tests__/buffEvaluation.test.ts` 408 to 397, prose only.

**Assumptions taken (developer's to confirm):**
- The card sentence is `'go high on {suit}'`, not the plan's `'go high on a {suit} trick'` — the wildcard's `any suit` substitution made the article ungrammatical. This changes approved copy.
- The two protective families' event word became `SKULL`, replacing `HURT`, which named the outcome axis on a card face.
- The four bank-meter outcome sentences are the plan's placeholders verbatim.
- Unbloodied keeps "survive several tricks without a hit" rather than the plan's "go high several tricks running" — the plan's phrasing was factually wrong, since Unbloodied counts tricks without damage, which is the outcome axis.
- **Task 10's seed-pinned invariance figure was not captured.** It required reading the pre-rename simulator, which needs a checkout the no-git-writes rule forbids, and a figure taken afterwards proves nothing. The structural half shipped instead; the real evidence is that the cross-seed statistical assertions over seeds 1-40 pass unchanged.
- `.claude/sprint-runs/2026-08-23-sprint/log.md` was left untouched despite being in scope — a completed historical run log, already mojibake-damaged, where an edit risks worse. 31 hits remain there deliberately.

**Open question:** `src/app/warCouncil/consequenceLabels.ts` still says "If you win" / "If you lose"
on the pre-commit hover. The plan put that surface out of scope, but it is a live player-facing
use of the retired words and now reads inconsistently beside a card saying "go high on Bells".

## Central review

Dispatched once, in parallel, over `73d7415..HEAD` — code-evaluator, defender and QA. QA owns the
gates deferred all run: the unfiltered suite, lint, format:check and the production build, none of
which has run across this diff. No browser pass.
