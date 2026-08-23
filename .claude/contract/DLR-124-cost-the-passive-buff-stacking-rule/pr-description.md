# DLR-124 — Design: cost the passive buff-stacking resolution rule

Plan: [`plan.md`](./plan.md) in this folder. Docs-only — **zero `src/` files in the diff.**

## What this decides

`ideas.md` carried a Raw proposal: when several equipped buffs fire on one trick, sum their rewards
then multiply by the count that fired. This ticket costs it. The answer is **the proposal is rejected
and a replacement rule is adopted in its place**, with every number chosen.

### Why the proposal was rejected — on definition, before magnitude

There is no scalar to sum. A fired buff pays on exactly one of four axes — **Blade** (flat damage),
**Purse** (coins), **Second Wind** (AP), **Momentum** (multiplier) — and those are four different
units with four different consumers. The `ideas.md` growth table's "avg reward each: 3, 4, 5" column
is a quantity the game cannot produce, so `2 → 12`, `3 → 36` and `5 → 125` all inherit the defect.

It also fails on magnitude. Computed on an ordinary 11-AP, five-sevenths-bronze loadout it pays
**123 damage on trick three of hand one** against a 34-health opponent.

### The rule that replaced it

| | Rule |
|---|---|
| **R1** | Resolution is **per-axis**. Four independent accumulators; no interaction between axes. |
| **R2** | Within an axis, contributions **add**. *Multiply* rejected (the cash-out is already a product, so it goes cubic); *take-the-highest* rejected (makes a wide loadout strictly worse than a tall one). |
| **R3** | Per-trick order: **Second Wind → Momentum → the cash-out product → Blade → Purse.** Momentum before the product and Blade after it is *forced* by `v1-buff-card-list.md`'s cost model, which prices multiplier above flat damage precisely because one is multiplied by the bank. |
| **R4** | Firing cadence: **event** (Taker, Feeder, Mark, Sidestep, Glutton, Debt Collector — once per qualifying trick), **threshold** (Hoarder, Unbloodied, Miser, Cornered — once per hand, on first crossing), **terminal** (Keepsake — at hand's end). |
| **R5** | **Overlap Bonus:** on a trick where `k ≥ 2` buffs fire, `+(k − 1)` Momentum. Basis is **count of buffs fired, linear** — pairs (`k(k−1)/2`) rejected: at `k = 6` it yields 15 from the bonus alone. |
| **R6** | Four per-hand caps (below). **The cap counters reset per hand and NOT on a hit** — a hit zeroes the multiplier and does not refund the cap. That asymmetry is the containment. |
| **R7** | Contradictions are **structurally impossible in v1** — no buff has a negative or preventive effect, and a trick is won or lost but never both. No buff ever cancels another. |

### The four caps — all agent-chosen, all the developer's to move

| Constant | Value | Derivation |
|---|---|---|
| `MAX_REFUND_PER_HAND` | 6 | unchanged from DLR-111 |
| `MAX_MULTIPLIER_BONUS_PER_HAND` | **6** | the natural six-trick multiplier ceiling, so bought multiplier can at most *double* the earned one |
| `MAX_FLAT_DAMAGE_BONUS_PER_HAND` | **12** | one third of a perfect hand's 36 — Blade can *finish* a hand, never *replace* the streak |
| `MAX_COIN_BONUS_PER_HAND` | **10** | one gold Purse — coins are the only run-permanent axis, so stacking never pays more than the best single card on it |

**DLR-108 creates all four in `src/hunt/config.ts`.** None is a config key today. None has been played.

## The worked hand

Seven buffs at exactly 11 AP (capacity item bought), against a 34-health Quarry, over six tricks.
Trick 1 fires `k = 4` and the Momentum pool reaches 5/6; trick 2's Overlap Bonus caps it at 6/6;
trick 3's `Sidestep (Momentum)` is clipped to 0 by that cap; trick 4 applies damage for `3 × 9 = 27`
plus `+6` Blade **added after the product** = 33; trick 6 cashes `2 × 2 = 4`.

**Result: 37 damage, +5 coins, 2 AP refunded, for 11 AP.**

| | Total damage |
|---|---|
| This rule | **37** |
| Unbuffed, same six tricks | **13** (a 2.85× return on 11 AP) |
| The rejected ×count rule | **123 on trick three**, encounter already over |

## The worst degenerate case, and how the rule contains it

Not the one the ticket names. The dangerous case is **one buff firing on every trick**: gold
`Bell-Taker (Momentum)` at 5 AP plus gold `Mark of the 9 (Momentum)` at 4 AP — a 9-AP loadout — on a
hand holding four Bells.

- **Uncapped:** `+5 × 4` firings plus `+5` = `+25` Momentum → `6 × (6 + 25) =` **186**. Diarmuid, the
  final boss, holds **135**. Every opponent in the run one-shot, on hand one, from two cards.
- **Capped:** `6 × (6 + 6) =` **72** — *exactly* the one-Whetstone perfect hand `the-hunt.md` §7
  already prints. **The ceiling introduces no figure the design has not already blessed.**

Secondary corner: `Mark of the R` is 22 templates deep, but a winning card has one rank, so at most
**two** Marks fire per trick. That family's depth is pool breadth, not stack depth.

## Templates #13–16, reconciled (AC4) — the v1 pool stays at 78

- **#13** `for every other buff active this hand` — **superseded, permanently excluded.** It counts
  buffs *active* (bought with AP) where the rule counts buffs *fired*; paying for width with no
  condition risk is the self-reinforcing loop DLR-111 AC4 flags.
- **#14** `if you also hold a gold-tier card` — **still excluded, independent reason.** A doubler, and
  doubling is the one operation R2 forbids; it also reads a card's tier rather than a game event.
- **#15** `if bank ≥ 2× multiplier` — **killed permanently: it is arithmetically dead.** The bank
  climbs by `1 + Whetstone copies` per taken trick and the multiplier by exactly 1, so the condition
  reduces to `copies ≥ 1` — never true with no Whetstone, always true with one. A shop-inventory check
  wearing a condition's clothes.
- **#16** the co-trigger combo — **superseded**; it is the `k = 2` case of the Overlap Bonus.

**DLR-112 is unblocked with a permanent answer rather than a hold.**

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | **1089 passed / 1089**, 86 files, 0 failed — baseline held exactly |
| `npm run build` | exit 0, `dist/` written (259.09 kB js, 37.95 kB css) |

`git status --porcelain` → **zero paths beginning `src/`.**

`npm run format:check` fails repo-wide on ~58 pre-existing `.md` files, as it did before this run.
Scoped: all three design documents also fail `npx prettier --check` **at `2b33332`, before this
contract touched them** — verified by checking each out from that commit and re-running. Left alone,
per the contract's own rule.

## What the developer must decide

1. **The three new cap values** — 6 / 12 / 10. Agent-chosen under the sprint-run override of
   `CLAUDE.md`'s tuning-value pause. The largest thing to review.
2. **The Overlap Bonus magnitude** (`k − 1`) and its **shared Momentum pool.** Sharing means a
   Momentum-heavy loadout feels the bonus not at all. Giving it its own cap is a different design,
   not a retune.
3. **The event / threshold / terminal cadence** — a rule, not a number, and the second-largest lever.
   Flipping every family to once-per-hand removes the need for the multiplier cap but contradicts
   `v1-buff-card-list.md`'s shipped pricing.
4. **Whether the resolution order really is forced** by that pricing, as the document argues.
5. **`Keepsake` may be unfireable — a defect found, not fixed.** With `HAND_SIZE = 6` and six tricks
   the hand is empty when it ends, so "hold a card of suit S at hand's end" can only be true when an
   encounter ends mid-hand. Three templates near-dead. Three exits exist (reword the condition, move
   the end-of-hand instant, delete the three templates) and they are three different games. No
   rewording was invented.
6. **Whether `Miser` and `Cornered` are correctly threshold rather than event conditions.**
7. **Whether a follow-up ticket is wanted** for the UI that shows a stacked resolution. A five-buff
   overlap resolving in five ordered steps makes `version-5-developer-idea.md` §6's attribution
   problem harder, not easier. Not opened by this contract.

## For future contributors

The rule specifies a **per-hand accrual** (`multiplierBonus`, `flatDamageBonus`, `coinBonus`,
`apRefunded`) that is state on the hand, **not** a field on `Buff`, and that resets per hand and
**not** on a hit. It belongs in `src/hunt/**` behind the existing pure-core boundary. Every operand is
an integer combined by addition then an integer clamp, so there is no division to guard and no `NaN`
to produce. Nothing on this list is persisted yet — that window closes when DLR-112 writes a drawn
buff into a save.
