# DLR-122 — Tiered rank abilities: refill the run-permanent shop shelf

Plan: `.claude/contract/DLR-122-tiered-rank-abilities-run-permanent-shelf/plan.md`
Mockup: `.claude/contract/DLR-122-tiered-rank-abilities-run-permanent-shelf/mockup.html` — written to disk, **not published and never seen**; this ran unattended.

## What changed

DLR-116 pared the shop's run-permanent shelf down to AP capacity alone. This puts stock back on it: the deck's named ranks now carry a **bronze / silver / gold ability ladder**, bought with coin, permanent for the rest of the run, and applying to **your** copies only — the Quarry's copy of the same rank still resolves at bronze.

Bronze is the ability printed today in every row, so **a run that buys nothing plays exactly as it played before this commit**.

Two ladders actually resolve and are therefore the only two on the shelf:

- **Swan** — silver: on a clean loss (never an eaten skull) your multiplier survives the hit; you still take the damage and the bank still cashes at two-thirds. Gold: the bank survives too — nothing cashes, the streak simply carries on.
- **Witch** — silver: two Witches no longer cancel, yours still counts as trump. Gold: yours also beats every trump.

## The prices, placed against the coin economy

There is exactly one pricing key, `RANK_TIER_STEP_PRICE` in `src/hunt/rankTiers.ts`, and it is **5 coins per tier step** — 5 to silver, 5 more to gold, **10 for a full ladder**. Transcribed from `version-5-developer-idea.md` §7b's own reading, not invented.

Where that sits:

| Purchase | Coins |
|---|---|
| Encounter win pays | **1** (`COINS_PER_ENCOUNTER_WIN`) |
| Slot reroll, after one free pull a visit | 1 |
| Heal / Cheat / Blast Guard | 1 |
| Timebomb | 2 |
| AP capacity, +5 AP, stacks | 3 |
| Whetstone — `config.ts` calls it "the shop's one real splurge" | 4 |
| **One rank tier step** | **5** |
| **A full ladder to gold** | **10** |

So a single step is now **the most expensive purchase in the game**, and a full ladder is roughly a whole run's flat encounter income. It is reachable early only through a first-hand quick kill, exactly as Whetstone is. That steepness is deliberate for a permanent that never expires and that changes what a card *does* rather than what it *scores*.

§7b named two readings it did not rule out and both remain open: a **flat 5 for the whole ladder** (much cheaper — makes gold the default purchase) or an **escalating 5 / 10 / 15** (makes gold a run-defining commitment). Retuning to either is one edit in `rankTiers.ts`.

## The refill rule

**There isn't one, and that is the answer.** §7b specifies "a fixed, always-purchasable list, deliberately not behind the reels". The shelf is static: every tierable rank not yet at gold is on it at every shop visit. No restock, no rotation, no reroll, nothing behind the slot machine.

A rank can be bought **exactly twice** — bronze→silver, silver→gold — and never a third time. `refusalFor` returns the new `PurchaseRefusal.RankAtMaxTier` **before** the coin check, so a rank at gold reads "That rank is already at gold" rather than "You do not have the coins for this". Unlike Whetstone and AP capacity, which are counters, a rank is a **rung** and rungs do not stack.

## What returned to `SHOP_ITEMS`, and why

**Nothing DLR-116 removed came back.** Cheat, Timebomb, Blast Guard and Whetstone are still priced, still buyable by a caller, still tested, and still off the shelf. `SHOP_ITEMS` goes from `[ApCapacity, Heal]` to `[ApCapacity, SwanTier, WitchTier, Heal]` — the two additions are **new** items on the run-permanent rung, which is exactly the rung this ticket exists to refill.

The same convention is applied one level down, deliberately: **`TieredRank` is every rank the game can tier (all seven); `TIERED_RANKS` is what the shelf offers (Swan and Witch).** Fox, Woodcutter, Treasure, Poison and Monarch are typed, named and documented but not sellable, because each needs a surface this ticket does not build — a peek/free-exchange choice UI, a multi-card draw UI, a coin channel out of the card layer, an answer to the Poison/Timebomb name collision, and a `RoundState` field that survives into the next trick, respectively. A tier that is sold and does nothing takes coins for nothing, which is worse than not offering it.

## How the `Miser` tension moved

`Miser` rewards **unspent** coins; the uncapped 1-coin slot reroll is the strongest coin sink in the game, so every held coin is a reroll forgone and holding for `Miser` is dominated at the margin. DLR-116 recorded that its screen made this worse rather than patching it.

This shelf moves it in **two directions, and no existing number was retuned**:

- **Relieved during accumulation.** A lumpy 5-coin permanent gives held coins a second reason to exist. A player saving for silver Swan must *not* reroll — which is the same behaviour `Miser` pays for. Saving stops being strictly dominated.
- **Sharpened at the spend.** Spending 5 zeroes a `Miser` payout in one move, where the reroll would only have eroded it a coin at a time.

Net: the conflict acquires a **shape** it did not have — a saving phase and a spending moment — rather than getting uniformly worse. That is a claim about the design, not a measurement; DLR-130's balance simulator is what would settle it, and this shelf is deterministic (a tier is bought, never drawn) so the simulator can measure it.

## What the developer must decide

1. **The price.** 5 per step, transcribed. The two alternatives above are live.
2. **The 2-of-7 split.** Confirm shipping Swan and Witch now, and how the remaining five should be ticketed — together or one at a time.
3. **Rungs do not stack.** Confirm the shelf is meant to have a ceiling at 10 coins per rank.
4. **Swan gold spares a Timebomb-forced reset when it coincides with a clean loss.** The gate is `outcome === CleanLoss`, so a Timebomb detonating on a trick you *won* is untouched. Confirm that reading.
5. **Swan gold may undercut Timebomb**, which §7b itself flags: at gold, a Swan in hand converts every clean loss into a free hit — damage only, streak intact. Only playing will say.
6. **The Quarry's move heuristic evaluates at bronze.** `cpuPlayer.ts`'s two `resolveTrickWinner` calls are the Quarry's evaluation of a candidate card, not the rule. A gold Witch is therefore occasionally misjudged by the Quarry. Deliberate and documented at both call sites — confirm it is flavour, not a bug.
7. **`the-hunt.md`'s "no exceptions at all" line is now false** and section 9 was amended to say so. This reverses a documented statement and is yours to ratify.
8. **Whether a gold Swan's larger sixth-trick payout is the intended reward.** Sparing the forced cash-out lets the surviving bank reach the end-of-hand fold, which cashes it in full — 9 rather than 6 on a bank 3 × multiplier 3 streak, in the player's favour. Raised by the defender review; documented and tested, not capped. See below.
9. **Feel** — whether 5 coins reads as steep-but-fair at the moment of purchase, and whether a gold Swan makes a clean loss feel free rather than merely cheap.

## What a browser would have checked — and did not

The browser pass was **off** for this run. No dev server was started and no browser was opened. A pass would have checked: that the run-permanent shelf renders four purchase cards rather than two without the panel scrolling or cropping at the target viewport; that both tier cards show "5 coins" read from `priceOf`; that buying Swan silver re-renders the card at silver with gold still offered; that buying gold then disables the card with "That rank is already at gold."; that the console stays clean across a purchase; and that a full hand plays through after a purchase with no stuck trick.

Every one of those has a logic-layer counterpart in the specs below. The layout and the feel do not.

## Reviewer round 1 — what came back and what was done

Three reviewers ran in parallel once, at the end. One combined fix pass; no round 2 was needed.

- **code-evaluator: APPROVED**, two non-blocking notes. Note 1 was a **comment-honesty** catch worth
  keeping: `rankTierRules.ts` claimed `tierForSide` was "the only route by which any rule in this
  tree may learn a tier", while `resolveTrick.ts` still hand-writes one `t.side === PlayerSide.Player`
  test — because identifying WHOSE Witch a card is needs the trick, which that module cannot see.
  The claim was true in letter and overstated in spirit. **Fixed**: the docblock now scopes itself to
  reading the TABLE, names `isPlayersWitch` as the one ownership test outside the file, and says a
  third one is the thing to push back on; `resolveTrick.ts` carries the cross-reference. Note 2
  (`TIER_LADDER` / `tierIndexOf` / `nextTierAfter` re-exported through the barrel with no external
  consumer) was left as-is — all three are used inside `rankTiers.ts` and the barrel exports the
  module's full pure API, which is the existing convention.
- **defender: 0 critical, 1 warning, 2 info.** The warning is a genuinely good catch and is recorded
  below in full.
- **qa: ALL PASSED**, all eight acceptance criteria MET with named evidence per criterion.

### The defender's warning, and why it did not become a code change

`resolveTrickBank`'s end-of-hand fold runs AFTER the branch a gold Swan skips, so a spared bank
reaches it intact and is cashed **in full**. On the sixth trick a streak of bank 3 × multiplier 3
therefore produces `cashValue(3, 3)` = **9** where an ordinary caught clean loss produces
`forcedCashValue(3, 3)` = **6**. The defender flagged this as the gold rung possibly inverting its
own purpose.

**It does not invert it — the number moves the player's way.** `cashOut` is damage dealt **to the
Quarry** (`incomingFrom`), so 9 is better for the player than 6. Gold buys out of the two-thirds
*reduction*, which the game charges for being caught; the ordinary end-of-hand rule then applies to
the surviving bank exactly as it would to any other. That is coherent, and it is the reading the
rung's own sentence implies.

But the defender was right that it was **undocumented and untested**, and that the comment reading
"gold spares the cash-out entirely" was false on the sixth trick. **Fixed**: the comment now says
"the FORCED cash-out" and walks the 6-versus-9 arithmetic; three new cases in
`rankTiers.resolution.test.ts` pin bronze, silver and gold against `finalTrick: true`; and
`the-hunt.md` §7 states the larger sixth-trick payout in the rules. **The developer's read is
whether that reward is intended or wants capping at the reduced rate** — added to the decision list.

The two info items (the dead `rank === null` guard in `buyFromShop`'s new arm, and the Quarry's
bronze move heuristic) were both already deliberate and already documented in code; no change.

## Verification

- `npm run typecheck` — exits 0.
- `npm run lint` — exits 0.
- `npm test` — **1624 passed of 1624, 123 files, 0 failures** (baseline 1565 / 120).
- `npm run build` — exits 0, `dist/` written, no bundler errors.
- `npx prettier --check` scoped to the changed files — clean. Repo-wide `format:check` still fails on ~58 pre-existing `.md` files and is not this contract's gate.
- Boundary grep over `src/hunt` and `src/warCouncil` for React imports and DOM globals — zero hits.
- `Math.random` grep over `src/hunt`, `src/vault`, `src/warCouncil` — comments only.
- `rankTiers[` / `playerRankTiers[` grep over `src/warCouncil` — zero hits outside `rankTierRules.ts`'s own docblock, proving `tierForSide` is the only route to a tier.
- Every touched file under 400 lines, measured with `(Get-Content <path>).Count`. Largest: `WarCouncilRound.tsx` 382, `roundUiState.ts` 379, `App.tsx` 369, `runTransitions.ts` 364, `bank.ts` 315.

## A note for future contributors

**`TIERED_RANKS` is to `TieredRank` what `SHOP_ITEMS` is to `ShopItem`.** The union names everything the game can price or tier; the array names what is actually on offer. Adding a rank to the shelf means implementing its rungs and then adding one entry — nothing is deleted to take something off the shelf.

**`src/warCouncil/rankTierRules.ts`'s `tierForSide` is the only sanctioned route to a tier inside the card layer.** If you find yourself writing `tiers[rank]` or a second `side === Player` test in that tree, that is the bug — the asymmetry is stated once, on purpose.
