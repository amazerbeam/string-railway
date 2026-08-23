# DLR-111 — Author the v1 buff card list from the template grid

Contract: [`.claude/contract/DLR-111-author-v1-buff-card-list/plan.md`](./plan.md)

## Summary

Finishes the developer's in-progress v1 buff list into the form DLR-108 (buff activation and tiered
AP costs) and DLR-112 (slot-machine draw and templated pool) can actually build against.

**No code ships.** One design document was rewritten in place, 103 → 531 lines.

The developer had already settled the hard half at `d412b58`: which templates ship, their reward
pairings, their tier magnitudes, and the three-category taxonomy. Those were treated as inputs.
This adds the four layers that were missing:

1. **Naming** — 12 condition-family words (`Taker`, `Feeder`, `Mark of the <rank>`, `Sidestep`,
   `Glutton`, `Hoarder`, `Unbloodied`, `Long Fall`, `Debt Collector`, `Keepsake`, `Miser`,
   `Cornered`) crossed with 4 reward suffixes (`Blade` = flat damage, `Purse` = coin,
   `Second Wind` = AP refund, `Momentum` = multiplier). Any card name decodes without a lookup:
   `Bell-Taker (Momentum)` is *win a trick with Bells, gain multiplier*.
2. **An AP cost for every card at every tier**, from one formula rather than 78 hand-picked numbers:
   `apCost = clamp(REWARD_BASE[axis][tier] + CONDITION_MODIFIER[family], 1, 6)`.
3. **`MAX_REFUND_PER_HAND = 6`** (AC4), plus resolutions for all six carried-forward open items.
4. **A code-shape alignment section** stating where the list fits `src/hunt/buffCatalog.ts` and
   where it provably does not.

Two substantive corrections to the draft: **Cheat and Timebomb were missing** and have been added
(design doc §1 folds both into the buff pile, and `buffCatalog.ts` already mints them), so the pool
total moves from the draft's **76 to 78** — the number DLR-112 sizes `REEL_POOL_SIZE` against.

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | **1089 passed / 1089**, 86 files, 0 failed — baseline held exactly |
| `npm run build` | exit 0, `dist/` written (259.09 kB js, 37.95 kB css) |
| `git status --porcelain src` | no output — zero `src/` diff, as the file map requires |

Reviewers (code-evaluator / defender / QA) were **not dispatched**: no `src/` path appears in the
file map, which is this project's standing docs-only precedent. The four gates were run in full
anyway, because a docs-only ticket is exactly when a pre-existing red gate would otherwise be missed.

`npm run format:check` is **not** clean for this file — but it was not clean at `HEAD` either, and
58 `.md` files fail repo-wide. Pre-existing, not a regression, and reformatting it would be an
out-of-scope churn diff.

## Decisions the developer owns

**All 78 AP costs are agent-chosen tuning values.** Under `CLAUDE.md`'s pause condition these are
normally yours; this sprint run overrode that pause and required they be chosen and justified. They
are marked *agent-chosen, 2026-08-23* inside the document itself, not just here, so a later reader
cannot mistake them for settled decisions. **Retuning all 78 is a two-table edit**, not 78 edits.

**`MAX_REFUND_PER_HAND = 6`** — set equal to `STARTING_AP` so a hand can at most double its budget.
Never played.

**All 16 card names** are copy with no tonal review. Offered, not settled.

### The three weakest items — start your review here

1. **Ward silver and gold.** `DAMAGE_PER_HIT = 1`, so absorbing 1, 3 or 5 are the same outcome
   against every hit the game currently deals. Priced flat at 2 AP for that reason. If
   `DAMAGE_PER_HIT` never moves, **delete these two rows** rather than retune them.
2. **Bronze `Second Wind` is net-zero by construction.** Your refund ladder is 1/2/3 and the
   cheapest activation is 1 AP, so a bronze Second Wind refunds exactly what it cost. Kept as the
   pool's deliberate floor card because that preserves your ladder; **raising the ladder to 2/3/4**
   is the better card and is your call.
3. **Miser (>= N coins) fights the shop.** It pays an in-hand reward for a run-long behaviour — not
   spending — and the shop is the run's only progression lever. Structural, not a costing problem;
   no AP price fixes it.

### One place this contradicts a note of yours

**Open item 5 was overturned.** Your review file flags Hoarder's and Unbloodied's four-reward lists
as "worth a second look". The document keeps all four and argues why (both are hand-shaped goals; a
Hoarder paying multiplier compounds with the bank that earned it), and flags the overturn in a
blockquote rather than folding it in silently. Confirm or reverse.

### Also worth a look

**Gold Cheat at 7 AP is above the 6-AP starting budget on purpose** — unplayable until the `+5 AP`
capacity item is bought. That is the costing pass design doc §3 asked for on "three tricks of
no-follow-suit is close to a guaranteed run of wins rather than one clutch save". But a card that
cannot be played at all early in a run is an unusual thing to have in a draw pool; 6 AP with a
shorter gold duration is the alternative.

**No disagreement with `TIMEBOMB_TIER_MULTIPLIER = {1,2,3}`.** Timebomb is priced flat at 2 AP
precisely so the whole tier cost stays in the health figures (2/4/6 of a 10-point bar) rather than
being billed twice.

**Nothing on this list has been played.** Every figure is reasoned, not measured.

## Shape gaps DLR-108 and DLR-112 inherit

Verified by grep, not asserted:

1. `BuffKind` holds exactly **3** members today; it needs one per template family (11 condition
   families + 5 consumables). Ordinary widening.
2. `BuffRewardAxis` holds exactly **3**; it needs eight more (`Coins`, `ApRefund`, `Multiplier`,
   `CardsRevealed`, `CandidatesEliminated`, `DiscardCharges`, `DamageAbsorbed`, `None`). DLR-105's
   own comment already anticipates this. `BuffTier` fits unchanged.
3. **Genuine misfit:** `BuffCondition` is `{ readonly kind: string }` with no payload, but
   Taker/Feeder/Keepsake are suit-parameterised and Mark-of-rank is rank-parameterised. The document
   recommends an optional `target?: { suit?; rank? }` over baking 33 variants into `BuffKind`.
4. **`Buff` carries no `apCost` at all** — 0 hits in `buffs.ts` and `buffCatalog.ts`. Every number
   authored here has no home on the type today. **DLR-108's first job.**

DLR-107's deferred AC3 leaves Cheat and Timebomb existing twice — the live felt mechanic and the
inert `buffCatalog.ts` representation. **This list targets the `buffCatalog.ts` representation.**

## New convention introduced

Design documents that author tuning values under a pause-condition override now mark those values
**agent-chosen, with the date and the overriding ticket**, inline in the document. `hybrid-design.md`
§9 distinguishes Decided / Undecided / Deferred rows by attribution; this is the same discipline
applied to a value chosen by the pipeline rather than by the developer, so the two can never be
confused on a later read.

## Files changed

- `.docs/design/Balatro-Forbidden-Solitaire/v1-buff-card-list.md` — rewritten in place (103 → 531).
- `.claude/sprint-runs/2026-08-23-sprint/log.md` — DLR-111 section appended.
- `.claude/contract/DLR-111-author-v1-buff-card-list/` — `plan.md`, `tasks.md`, `pr-description.md`.

`.docs/design/Balatro-Forbidden-Solitaire/DLR-111-v1-buff-list-review.txt` is **retained** as the
provenance record for how the ship/no-ship calls were made.
