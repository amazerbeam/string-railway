# v1 Buff & Consumable Card List

Decided 2026-08-23, closing DLR-111 (T7a). Source grid: `version-5-developer-idea.md` §5.
Working notes and the full Q&A this was derived from: `DLR-111-v1-buff-list-review.txt` in this
same folder.

Three card categories (settled this session, not in the original §5 grid):

- **Goals** — a persistent buff, owned and equipped, that pays out when its condition is met during
  a hand.
- **Apply-to-card** — a persistent buff the player attaches to one specific card in hand at play
  time; suit/rank is never printed on the card itself.
- **Utilities / consumables** — one-shot, used immediately for an effect, no trigger condition.

Every printed template crosses with every reward listed under it to produce one **card template**
(each template carries its own bronze/silver/gold tier ladder, resolved at draw or use time — this
is a pool of *distinct templates*, not of individual tiered card objects). Rewards use a shared
master tier list, kept once and referenced by every template below.

## Reward master tier list

| Reward | Bronze | Silver | Gold |
|---|---|---|---|
| Flat damage bonus | +1 | +3 | +5 |
| Coin bonus | +2 | +5 | +10 |
| AP refund | 1 | 2 | 3 |
| +1 multiplier | +2 | +3 | +5 |

`MAX_REFUND_PER_HAND` (AP refund cap, required by DLR-111 AC4): **TBD, tuning pass** — not blocking
the list itself.

## Condition templates (persistent buffs)

| # | Template | Category | Rewards crossed | Card count |
|---|---|---|---|---|
| 1 | Win a trick with suit S | Goal | damage, coin, AP refund, multiplier | 3 suits × 4 = **12** |
| 2 | Lose a trick with suit S | Goal | damage, coin, AP refund, multiplier | 3 suits × 4 = **12** |
| 3 | Win a trick with rank R | Goal | damage, multiplier | 11 ranks × 2 = **22** |
| 4 | Dodge a skull with this card | Apply-to-card | damage, multiplier | 1 generic × 2 = **2** |
| 5 | Eat a skull with this card | Apply-to-card | damage, coin, AP refund, multiplier | 1 generic × 4 = **4** |
| 6 | Reach a bank of N this hand (N = 2/3/4, tier axis) | Goal | damage, coin, AP refund, multiplier | 1 × 4 = **4** |
| 7 | Survive N tricks without a hit (N = 2/3/4, tier axis) | Goal | damage, coin, AP refund, multiplier | 1 × 4 = **4** |
| 8 | Lose the next N tricks | Goal | — | **DEFERRED** (see below) |
| 9 | Apply Damage this hand (prediction, no N) | Goal | damage, coin, AP refund, multiplier | 1 × 4 = **4** |
| 10 | Hold a card of suit S at hand's end | Goal | coin only (deliberate — damage is worthless at hand's end) | 3 suits × 1 = **3** |
| 11 | Have ≥ N coins (N = 5/10/20) | Goal | damage, multiplier | 1 × 2 = **2** |
| 12 | Be below %N health (60/45/33%, inverted — lower health, higher reward) | Goal | damage, multiplier | 1 × 2 = **2** |
| 13 | (synergy) For every other buff active this hand | — | — | **NOT SHIPPING** |
| 14 | (synergy) If you also hold a gold-tier card | — | — | **NOT SHIPPING** |
| 15 | (synergy) If bank ≥ 2× multiplier | — | — | **NOT SHIPPING** |
| 16 | (combo) Two co-triggering conditions on the same play | — | — | **NOT SHIPPING** as its own template |

**Condition template subtotal: 71 distinct card templates.**

### #8 deferred

"Lose the next N tricks" needs a UI answer for tracking a pending multi-trick goal that hasn't been
designed yet, and that design work is out of this ticket's time budget. Deferred, not dropped —
revisit once a UI answer exists (DLR-111 AC3).

### #13–16 held back

The three synergy conditions and the co-trigger combo template are held back from v1 pending the
**passive buff stacking** idea (see `ideas.md` Raw section, added 2026-08-23, and its own follow-up
ticket) — if that resolution rule ships, it likely supersedes all four rather than coexisting with
them. Tracked separately so T8 doesn't have to wait on it.

## Utilities / consumables

| # | Template | Tiers | Card count |
|---|---|---|---|
| 1 | Protect N damage — single-use shield, absorbs up to N on the next hit then breaks regardless | 1 / 3 / 5 | **1** |
| 2 | Force a legal card from the opponent — reclassified from a repeatable buff reward to a one-shot consumable (overrides DLR-111's original AC2 exclusion; see ticket) | single tier only | **1** |
| 3 | Extra discard | +1 / +2 / +3 | **1** |
| 4 | Peek the draw pile | 1 / 3 / 5 cards | **1** |
| 5 | Read a suit (the Spyglass) — suit picked at use time, narrows a candidate list rather than scaling a number | rules out 1 / 2 / 3 | **1** |

**Consumable subtotal: 5 distinct card templates.**

## Total v1 pool size

**71 condition-template cards + 5 consumable cards = 76 distinct card templates.**

This is the number that matters for DLR-112 (T8)'s `REEL_POOL_SIZE` sizing — each template carries
its own bronze/silver/gold ladder (resolved at draw or activation time via the reel-match rules, not
as separate pool entries), except Force-a-card, which is single-tier only.

## Worked examples (per AC1)

- **Bronze:** "Win a trick with Bells, +1 damage."
- **Silver:** "Lose a trick with Keys, +3 damage."
- **Gold:** "Win a trick with a 9, +5 multiplier."
- **Consumable:** "Protect 3 damage — single use, absorbs up to 3 on your next hit, then breaks."

## Open items carried forward

1. **Passive buff stacking** — hand-wide resolution rule (sum co-triggering buffs' rewards, multiply
   by count fired). Raw, not costed. Tracked in its own ticket; see `ideas.md`.
2. Whether #16 (combo) folds into passive stacking once resolved, or stays excluded either way.
3. AP refund `MAX_REFUND_PER_HAND` — needs a number, tuning-pass item, not blocking.
4. #6/#7 reward lists carry all four master rewards — worth a second look before implementation
   starts, since bank/survive read more naturally as coin- or damage-only fits (not blocking, flagged
   for T8's implementer to sanity-check against the design doc's own worked examples).
