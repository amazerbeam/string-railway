# DLR-87 epic breakdown — ticket-creation worklist

**This file is a ticket-creation worklist, not an `/fb-plan` implementation contract.** It has no
`^Status:` line and is never walked by `/fb-apply`. It exists to be reviewed by the developer, then
handed to `/management-jira` (Phase 5 of `/jira-epic-decomposition`) to create every ticket below and
wire the Blocks links in the sequencing diagram.

Source epic: **DLR-87** — "Shop rebuild: persistence categories, flask, Apply Damage, quick-kill
payout". Full design: `.docs/design/Balatro-Forbidden-Solitaire/version-4-scope.md`. Current rules:
`.docs/game_rules/the-hunt.md` §10 (shop), §8 (health/healing). Current code read for this breakdown:
`src/hunt/shop.ts`, `src/hunt/config.ts`, `src/hunt/run.ts`, `src/hunt/encounter.ts`,
`src/warCouncil/bank.ts`, `src/app/run/ShopPanel.tsx`, `src/App.tsx`.

No existing children were found under DLR-87 (`parent = DLR-87` returned zero issues) — this is a
fresh decomposition, not a supplement.

## Checklist coverage note

Two of the standard eight categories are deliberately not represented below:

- **Autonomous/reactive behaviour** — nothing in this epic gives the Quarry a new decision. The
  poisoned-trick delayed hit resolves off which side won the trick, not off a Quarry choice; the
  Quarry does not buy from the shop. No ticket needed.
- **Deploy/release** — this repo is a Vite prototype with no deploy pipeline (`CLAUDE.md`: "the
  shipped game isn't a web build"). `npm run build` is already the QA agent's job inside every
  `/fb-apply` run, and Ticket 10 below re-confirms it at the end. No separate release ticket.

The shop-side "foundational scaffold" and "core domain logic" categories are split further than one
ticket each: the epic's own Prioritisation section names "the shop UI rebuild" as a single first
story, but the four-category model and the three new items (Envenom, Poison Guard, Whetstone) are
each a distinct, independently testable piece of new state — Envenom introduces a delayed-damage
queue, Poison Guard a fight-long consumable flag, Whetstone a permanent per-run multiplier on the
bank. Bundling all four into one ticket would make it the largest contract this project has run.
Ticket 1 below covers the category model and tab UI (provable with the two existing items); Tickets
2–4 add the three new items on top of it. If the developer would rather keep the epic's literal
"one story" framing, Tickets 1–4 can be merged before creation — flagged at the approval gate.

---

## Ticket 1 — Shop rebuild: four-category model and tab UI

**Type:** Story · **Priority:** Highest · **Parent:** DLR-87 · **Skill:** react-frontend
**Blocked by:** none · **Blocks:** Ticket 2, Ticket 3, Ticket 4

### Problem Statement

The shop (`src/hunt/shop.ts`, `src/app/run/ShopPanel.tsx`) sells exactly two flat items with no
grouping. Version 4 replaces that with Balatro's persistence-length categories — one-time use,
fight-long, run-permanent, and a visible-but-disabled game-permanent tab — so the shape of the full
system reads even before every rung is filled. This ticket builds the category model and the tab UI
using the two items that already exist; Tickets 2–4 populate the three new items into the tabs this
ticket creates.

### User Story

As a player, I want the shop to group what it sells by how long the effect lasts, so I can tell at a
glance whether I'm buying a one-off, a buff for this fight, or something permanent — and see that a
fourth category is coming without it cluttering what's actually for sale.

### Acceptance Criteria

1. A `ShopCategory` type exists (`src/hunt/shop.ts`) with four values: one-time use, fight-long,
   run-permanent, game-permanent — named after the design doc's own terms, not Balatro's (deck /
   Joker / consumable), since this game has no deck-building layer to reuse those names for.
2. Every entry in `SHOP_ITEMS` carries a category. `ShopItem.Cheat` is one-time use. `ShopItem.Heal`
   carries **no** category — per the design doc's "What isn't touched," Heal is an instant transfer
   with no duration and stays outside the four-category ladder, rendered separately from the tabs.
3. `ShopPanel.tsx` renders four tabs in category order (one-time use, fight-long, run-permanent,
   game-permanent), each showing the items in that category. Heal renders outside the tabs, as it
   does today.
4. The game-permanent tab is visibly present and its control is `disabled`, matching this project's
   existing refusal-state convention (dashed edge, dimmed, `role="status"` reason) rather than a bare
   greyed box — reuse the pattern `ShopPanel.tsx` already uses for a refused purchase, not a new one.
   Its stated reason is a placeholder "Coming soon" sentence; the exact copy is the developer's
   (Scope Boundaries, epic).
5. With only Cheat and Heal wired, the one-time-use tab shows Cheat, fight-long and run-permanent tabs
   render empty (not broken — an empty state is expected until Tickets 2–4 land), and Heal still
   renders and purchases exactly as it does today.
6. Tab switching is keyboard-operable and matches `game-ux`'s tab-stop conventions — read
   `.claude/skills/game-ux/SKILL.md` before building the tab control; this is the first tabbed
   interaction this module has, so there is no existing pattern to copy verbatim.
7. `npm run typecheck`, `npm run lint`, and the scoped Vitest run for `shop.ts` and `ShopPanel.tsx`
   all pass.

### Scope Boundaries

**In scope:** the `ShopCategory` type and per-item category assignment; the four-tab UI; the disabled
game-permanent tab; re-homing Cheat and Heal into the new layout with no behaviour change to either.

**Out of scope:** any of the three new items (Tickets 2–4); the flask, Apply Damage, or quick-kill
payout (Tickets 5–7); the visual/interactive polish pass (Ticket 9) — this ticket ships a functional
default layout, not a finished look.

### Dependencies & Risks

- Tickets 2–4 depend on the `ShopCategory` type and tab structure this ticket creates — sequence
  this one first.
- Risk: `ShopPanelProps` and `shopLabels.ts` both change shape (category grouping, a fourth
  "Coming Soon" string) — anything reading the old flat `SHOP_ITEMS.map(...)` render (see
  `.docs/implementation/run-ui/shop-screen.md`) needs updating in the same pass, or the doc goes
  stale the moment this lands.
- The exact tab labels and the "Coming Soon" copy are the developer's call, per the epic's Scope
  Boundaries — implement with a placeholder string and flag it rather than inventing final copy.

### Design Assets

N/A — no mockup exists yet for the four-tab layout. Flag at the plan-approval gate whether one is
wanted before `/fb-apply` builds it from prose alone, per this repo's usual `/fb-plan` gate for
UI-classified work.

---

## Ticket 2 — Envenom: poison consumable and the delayed-hit rule

**Type:** Story · **Priority:** High · **Parent:** DLR-87 · **Skill:** react-frontend
**Blocked by:** Ticket 1 · **Blocks:** Ticket 3

### Problem Statement

The shop needs a one-time-use item beyond the existing Cheat. Envenom lets the player poison a card
in hand; whichever side wins the trick that card is eventually played into takes 4 damage at the
start of the *following* hand, and if the Quarry wins the poisoned trick the player's own bank and
multiplier survive uncashed instead of resetting. This is the game's first delayed-effect mechanic —
nothing today carries state across a hand boundary the way this does.

### User Story

As a player, I want to poison a card I expect to lose with, so that a card that would otherwise be
dead weight in my hand gives me a no-cost chance to hurt the Quarry instead.

### Acceptance Criteria

1. A new `ShopItem` (placeholder name `Envenom`) is added to the one-time-use category at 2 coins
   (a new `ENVENOM_PRICE` key in `src/hunt/config.ts`, transcribed from the design doc, not derived).
2. Buying Envenom does not spend it immediately — it arms a "pick a card to poison" selection mode on
   the fight screen, mirroring the existing Cheat's arm/commit shape (`CheatSlots.tsx`,
   `roundReducer.ts`'s `TapCheat`/`CancelCheat`) rather than inventing a new interaction grammar.
   Selecting a card marks it poisoned; the marking is visible on that card wherever it renders,
   including once played (reuse the `skulled` prop's pattern on `PlayingCard.tsx` as the template for
   a second boolean marker, not a duplicate rendering path).
3. When a poisoned card is played into a trick, the trick resolves by the normal rules (section 6/7
   of `the-hunt.md`) with no change to who wins it or what it banks. The delayed hit is queued
   separately, keyed to whichever side won that trick.
4. At the start of the **next** hand dealt after the poisoned trick resolved, the queued side takes 4
   damage (a new `ENVENOM_DAMAGE` config key, set to `DAMAGE_PER_HIT`'s sibling value 4, matching the
   design doc's "same figure as one fight's worth of damage and the shop's Heal").
5. If the **Quarry** won the poisoned trick: the player's outcome for that trick is replaced, not
   added to — no health lost, and bank/multiplier are preserved rather than reset, even though the
   trick was a loss by the normal rules. The Quarry still takes the delayed 4 damage next hand.
6. If the **player** won the poisoned trick: the trick resolves as an ordinary clean win (bank +1,
   multiplier +1) and the player takes the delayed 4 damage next hand instead of the Quarry — this is
   the symmetric case the design doc calls out explicitly, not a special branch.
7. If the encounter ends (either bar reaches zero) before the delayed hit would land, the queued hit
   is discarded rather than carried into the next encounter or the next run.
8. Vitest coverage exists for: queuing on each side, the Quarry-side no-reset override, the
   player-side symmetric case, and discard-on-encounter-end.

### Scope Boundaries

**In scope:** the Envenom purchase, the card-poisoning selection UI, the delayed-hit queue and its
resolution at the next hand's deal, the Quarry-side outcome override.

**Out of scope:** Poison Guard (Ticket 3, which reacts to this delayed hit landing on the player);
any change to skull mechanics — poison is a wholly separate marker from a skull, per
`the-hunt.md` §1's note that "Poison" the rank name has nothing to do with skulls, and this item
must not be confused with that naming collision in its implementation.

### Dependencies & Risks

- Needs Ticket 1's `ShopCategory` model to slot into the one-time-use tab.
- **Risk — where the delayed-hit queue lives.** It must survive exactly one hand boundary but not
  cross an encounter boundary (AC7) or a run boundary. The natural home is `EncounterState` (already
  reset per encounter by `startEncounter`) rather than `RunState`, but confirm before implementing:
  a queue on `RunState` would need its own explicit clear-on-`startEncounter`, which is one more
  place to forget than a field that already resets for free.
- Placeholder name "Envenom" is not final copy — developer's call, per the epic's Scope Boundaries.

### Design Assets

N/A — functional description only; no mockup for the card-selection interaction exists yet. Flag at
the `/fb-plan` gate whether one is wanted before this ships from prose.

---

## Ticket 3 — Poison Guard: fight-long backfire protection

**Type:** Story · **Priority:** High · **Parent:** DLR-87 · **Skill:** react-frontend
**Blocked by:** Ticket 2 · **Blocks:** none

### Problem Statement

Envenom's delayed hit can land on the *player* (Ticket 2, AC6) — the one way poison currently costs
the player anything. Poison Guard is a fight-long item that, once bought, protects the next time that
specific backfire happens: the player still loses the health, but the bank and multiplier survive
instead of resetting.

### User Story

As a player, I want to buy insurance against my own poison backfiring on me, so that risking a poison
play doesn't also risk wiping a streak I've built up.

### Acceptance Criteria

1. A new `ShopItem` (placeholder name `Poison Guard`) is added to the fight-long category at 1 coin
   (a new `POISON_GUARD_PRICE` config key, transcribed from the design doc).
2. "Fight-long" is a real duration, not a label: the item is active only for the encounter it was
   bought during — it does **not** carry across `advanceRun` into the next fight the way Cheats and
   coins do. Confirm this against how `RunState` currently distinguishes encounter-scoped state
   (`encounter`) from run-scoped state (`cheats`, `coins`) and place the guard's flag accordingly.
3. Buying Poison Guard while the encounter already holds a bought-but-unused Guard is refused with a
   stated reason (matching the existing `refusalFor`/`PurchaseRefusal` pattern) — only one can be
   active at a time. State the refusal as `GuardAlreadyActive` or equivalent; do not silently
   overwrite or silently stack a second one.
4. The **next** time — and only the next time — Envenom's delayed hit lands on the **player**
   (Ticket 2, AC6's case), the health is still lost but the bank and multiplier are **not** reset to
   zero by that hit. The Guard is then consumed regardless of whether a streak was actually in
   progress at the time (buying it and never triggering it is a valid, if wasted, purchase).
5. Poison Guard has no effect on the Quarry-side case (Ticket 2, AC5) — that case already costs the
   player nothing, so there is nothing for the Guard to protect.
6. Vitest coverage exists for: purchase and its encounter-only scope, refusal on a second purchase
   while one is active, consumption on the player-side backfire, and no interaction with the
   Quarry-side case.

### Scope Boundaries

**In scope:** the Guard purchase, its fight-long lifetime, and the single-use consumption rule
against Envenom's player-side delayed hit.

**Out of scope:** any change to Envenom itself (Ticket 2 ships complete on its own); a Guard that
protects against anything other than the poison backfire — the design doc is explicit this is the
only case it needs to cover today.

### Dependencies & Risks

- **Hard dependency on Ticket 2** — Poison Guard has nothing to consume until Envenom's delayed-hit
  mechanic exists. Do not attempt to build this first.
- Placeholder name "Poison Guard" is not final copy — developer's call.

### Design Assets

N/A.

---

## Ticket 4 — Whetstone: run-permanent bank-climb buff

**Type:** Story · **Priority:** High · **Parent:** DLR-87 · **Skill:** react-frontend
**Blocked by:** Ticket 1 · **Blocks:** none

### Problem Statement

The shop's run-permanent category needs its first item: something that stacks and lasts the whole
run, filling the "Joker" role Balatro's own ladder uses. Whetstone permanently raises the bank's
per-trick climb by 1, so a streak of `n` cashes for more than `n²`.

### User Story

As a player, I want to spend coins on a permanent upgrade to how fast my bank climbs, so a good run
compounds instead of resetting to the same baseline every fight.

### Acceptance Criteria

1. A new `ShopItem` (placeholder name `Whetstone`) is added to the run-permanent category at 4 coins
   (a new `WHETSTONE_PRICE` config key, transcribed from the design doc — "priced as the shop's one
   real splurge").
2. Whetstone is purchasable more than once in a run, and its effect **stacks** — each copy adds
   another +1 to the bank's per-trick climb. This is explicit in the design doc ("it stacks with
   itself") and must not be implemented as a one-shot flag.
3. The buff is carried on `RunState` (not `EncounterState`) and survives `advanceRun` exactly like
   coins and cheats do — it does not reset between fights.
4. `src/warCouncil/bank.ts`'s `resolveTrickBank` — currently `bankAdded = 1` on every taken trick,
   unconditionally — needs to read the owned Whetstone count and add `1 + whetstoneCount` instead.
   This function does not currently know about `RunState` at all (it takes a bare `BankState`); trace
   how the count reaches it without giving `src/warCouncil/` a dependency on `src/hunt/RunState`,
   consistent with the existing one-way import boundary the module's own docs describe.
5. The **multiplier** is unaffected — it still climbs by exactly 1 per taken trick. The design doc is
   explicit that a twin item raising the multiplier's climb is a deliberate future addition, not this
   ticket's scope; do not build both under one item.
6. `bank.test.ts`'s existing `[1, 4, 9, 16, 25, 36]` spec for a bare streak (zero Whetstones owned)
   must still pass unchanged — this ticket adds a new parameterised case, it does not rewrite the
   existing one.
7. Vitest coverage exists for: one Whetstone's effect on the bank-added figure across a streak, two
   stacked, and confirmation the multiplier term never changes.

### Scope Boundaries

**In scope:** the Whetstone purchase, its stacking run-permanent buff, and threading the owned count
into `resolveTrickBank`'s bank-added arithmetic.

**Out of scope:** a multiplier-side twin item (explicitly named as future scope in the design doc);
any change to how the bank cashes out — only how fast it climbs.

### Dependencies & Risks

- Needs Ticket 1's `ShopCategory` model to slot into the run-permanent tab. No dependency on
  Tickets 2/3 — poison and Whetstone touch unrelated state.
- **Risk — shares `bank.ts` with Ticket 6 (Apply Damage).** Ticket 6 changes the cash-out branch of
  `resolveTrickBank`; this ticket changes the taken branch. They should not conflict, but implement
  and land them in the ticket order given here (or verify against a fresh diff of `bank.ts` before
  starting the later one) to avoid an awkward merge.
- Placeholder name "Whetstone" is not final copy — developer's call.

### Design Assets

N/A.

---

## Ticket 5 — The flask: a free heal that refills on a stage-boss kill

**Type:** Story · **Priority:** High · **Parent:** DLR-87 · **Skill:** react-frontend
**Blocked by:** none · **Blocks:** none

### Problem Statement

DLR-82 named a flask as part of the intended answer to the run's brutal health curve and explicitly
refused to build one ahead of its own design (`the-hunt.md` §10's `ENCOUNTER_PLAYER_RESTORE` tunable,
deliberately unread, guarded by a grep). This ticket is that design landing: a single-charge free
heal, separate from the shop's paid Heal, restoring 60% of max health and refilling once per
stage-boss kill.

### User Story

As a player, I want a free emergency heal I can drink when I choose, that comes back after I beat a
boss, so the run's tightest moments have a safety valve that doesn't cost coins I'd rather spend at
the shop.

### Acceptance Criteria

1. `RunState` gains a flask-charge field, starting at 1 charge on `startRun` (a new
   `FLASK_STARTING_CHARGES` config key).
2. A new action restores `Math.round(maxPlayerHealth * FLASK_HEAL_PERCENT)` health, clamped to the
   player's maximum exactly like `buyFromShop`'s Heal branch already clamps — reuse that clamp
   pattern rather than writing a second one. `FLASK_HEAL_PERCENT` is a new config key set to `0.6`
   (transcribed: "60%... 6 points at today's provisional 10").
3. Drinking the flask is refused with a stated reason when at zero charges or already at full health,
   following the exact refusal shape `src/hunt/shop.ts`'s `refusalFor` already establishes — this is
   a second consumer of that pattern, not a excuse to invent a third shape for "why can't I do this."
4. The flask is available **only** between fights (same phase the shop is reachable from), not
   mid-hand — confirm against `RunPhase` in `src/App.tsx` where the shop and map controls are gated.
5. On beating a **stage boss** specifically (an opponent whose `OpponentKind` is `Boss`, per
   `runEncounterAt`), the flask charge count resets to 1 — regardless of whether the player had 0 or
   1 charge going in (it does not stack past 1; drinking is not required to "make room" for the
   refill). Beating an ordinary opponent does not refill it.
6. The flask is visually distinct from the shop's paid Heal wherever both are reachable (e.g. the
   verdict or shop screen) — a player must not be able to confuse "free, limited charges" with "paid,
   unlimited while you have coins."
7. Vitest coverage exists for: starting charge, drink-and-clamp, refusal at zero charges and at full
   health, refill on a boss kill, and no refill on an ordinary kill.

### Scope Boundaries

**In scope:** the flask's charge state, the drink action and its heal/clamp math, the stage-boss
refill trigger, and a control to drink it between fights.

**Out of scope:** retuning the charge count past one per stage — the epic explicitly defers that
("revisit only if it plays too thin"); do not add a second charge without a separate decision to do
so. Any change to the shop's existing paid Heal.

### Dependencies & Risks

- No dependency on the shop-rebuild tickets — the design doc is explicit the flask is "separate from
  the shop's paid Heal," and this ticket can build and land independently of Tickets 1–4.
- **Risk — where the drink control lives.** There is no existing "between fights, outside the shop"
  action surface; today the verdict panel (`RunOutcomePanel.tsx`) only offers go-on / shop / map.
  Decide whether the flask lives on the verdict panel directly or inside the shop screen (outside its
  four tabs, the way Heal is placed per Ticket 1) before starting — this is a genuine open layout
  question, not a detail to improvise mid-implementation.
- `ENCOUNTER_PLAYER_RESTORE` stays exactly as unread as it is today — the flask is deliberately a
  separate, player-triggered mechanic, not that tunable finally being wired in.

### Design Assets

N/A — the drink control's placement (see risk above) may warrant a quick mockup before `/fb-apply`;
flag at the `/fb-plan` gate.

---

## Ticket 6 — Apply Damage: a player-triggered cash-out

**Type:** Story · **Priority:** High · **Parent:** DLR-87 · **Skill:** react-frontend
**Blocked by:** none · **Blocks:** none

### Problem Statement

Today the bank only ever cashes out when the player is hit, or at the end of the sixth trick — never
by choice. Apply Damage adds a pre-card player action that cashes `bank × multiplier` into the Quarry
at will, resetting both, with no health cost. To make that a real decision rather than a button with
no wrong answer, being hit *before* choosing to apply now pays only two-thirds of `bank × multiplier`
instead of the full amount — so holding a growing bank becomes a bet against being caught first.

### User Story

As a player, I want to cash in my streak on my own terms instead of only when I'm hit, so that
running up a big bank becomes a real press-your-luck decision instead of something the game always
does for me at the worst moment.

### Acceptance Criteria

1. A new player action is available before playing a card each trick (not after, not mid-trick):
   "Apply Damage." It is enabled whenever `bank > 0`; with an empty bank it is disabled with a stated
   reason (`bank * multiplier` would deal zero, so there is nothing to apply), consistent with this
   project's disabled-with-reason convention.
2. Choosing Apply Damage cashes the **current** `bank × multiplier` into the Quarry, resets both to
   zero, and deals **no** damage to the player — this is a new, third kind of cash-out event distinct
   from the two `resolveTrickBank` already models (a forced hit, and the end-of-hand cash), so it does
   not reuse `resolveTrickBank` as-is; it needs its own resolution path that shares the underlying
   "cash bank × multiplier to the Quarry" arithmetic without going through a trick outcome.
3. After applying, the trick proceeds normally — the player still plays a card and the trick resolves
   by the ordinary rules, just against a freshly-zeroed bank/multiplier.
4. `resolveTrickBank`'s forced-hit branch (`isTaken(outcome) === false`) changes from paying the full
   `bank * multiplier` to paying **two-thirds** of it — `Math.floor(bank * multiplier * (2 / 3))` or
   equivalent, rounding **down** so the Quarry is never overpaid by a rounding artefact. This applies
   to every forced hit (clean loss and eating a skull alike), not only ones that follow a large bank.
5. The end-of-hand cash-out (`finalTrick`'s branch) is **unaffected** — it still pays the full
   `bank * multiplier`. The two-thirds penalty is specifically the "you got caught before you chose
   to apply" cost, and the sixth trick's automatic close is not that.
6. `bank.test.ts`'s existing forced-hit assertions need updating to the new two-thirds figure — this
   is an intentional behaviour change to an existing rule, not a regression to preserve.
7. Vitest coverage exists for: the new voluntary apply action's full payout and zero-damage property,
   the disabled-at-zero-bank state, the two-thirds forced-hit payout including a case where
   `bank * multiplier * (2/3)` is not a whole number, and that the end-of-hand cash-out is untouched.

### Scope Boundaries

**In scope:** the Apply Damage action, its pre-card availability, the new voluntary cash-out
resolution, and the two-thirds forced-hit rule.

**Out of scope:** any change to who wins a trick, to skull inversion, or to the end-of-hand cash-out's
full-payout rule; any UI for *previewing* what applying now would be worth beyond what the existing
banked-streak heart preview (`duelHealthBars.ts` — `projectedFromStreak`) may already need updating
to reflect the two-thirds forced-hit change — check whether that preview needs a corresponding update
rather than assuming it is unaffected.

### Dependencies & Risks

- No dependency on the shop-rebuild tickets.
- **Risk — shares `bank.ts` with Ticket 4 (Whetstone).** Ticket 4 changes the taken branch's
  `bankAdded`; this ticket changes the forced-hit branch's payout fraction. Land in the order given
  here, or diff `bank.ts` fresh before starting the later one.
- **Risk — the existing banked-streak heart preview.** `DuelHealthBars.tsx`'s "flash a preview of what
  cashing right now would take" (`the-hunt.md` §9's visibility table) currently previews a full
  cash-out; once forced hits only pay two-thirds, that preview either needs a second, dimmer preview
  for the two-thirds figure, or an explicit decision that it continues to show the (now theoretical)
  full amount. This is a genuine design question, not an implementation detail — flag it at the
  `/fb-plan` gate rather than choosing silently.
- This is the largest rules change in the epic — budget review time accordingly.

### Design Assets

N/A — the new action's button/placement needs a design pass; flag at the `/fb-plan` gate.

---

## Ticket 7 — Quick-kill payout

**Type:** Story · **Priority:** Medium · **Parent:** DLR-87 · **Skill:** react-frontend
**Blocked by:** none · **Blocks:** none

### Problem Statement

Winning a fight currently pays a flat 1 coin regardless of how it was won. Quick-kill payout rewards
ending a fight fast: 1 coin per card left unplayed in the player's hand at the moment the Quarry's
health reaches zero, scaled by which hand of the *fight* (not the run) the kill happened in.

### User Story

As a player, I want a bigger payout for ending a fight quickly, so that playing well enough to close
it out fast is rewarded beyond just the flat win coin — and so Whetstone's price is actually reachable
early, the way the design intends.

### Acceptance Criteria

1. A new payout is credited alongside the existing `COINS_PER_ENCOUNTER_WIN` (both apply — the design
   doc's worked example, "a first-hand, one-trick kill with five cards left pays 10 coins," is the
   quick-kill payout alone; confirm with the developer whether the flat win coin stacks on top or is
   superseded, since the design doc's Definition-of-Done item 5 states the 10-coin figure without
   saying which — do not assume additive without flagging it).
2. The payout is `unplayedCards × tierMultiplier`, where `unplayedCards` is how many cards remain in
   the player's hand at the instant the Quarry's health reaches zero (not the player's — this is a
   *win* payout), and `tierMultiplier` is `2` in the fight's first hand, `1` in the second, `0.5` in
   the third, `0` from the fourth hand on.
3. "Which hand of the fight" requires new state: the existing `hand` counter in `App.tsx` is
   **run-global** (it never resets between encounters — verified by reading `dealNextHand`/
   `leaveForNextFight`) and cannot answer this question as-is. Add a hand-within-encounter counter
   that resets to 1 whenever a new encounter starts, distinct from the existing run-global one used
   for dealer alternation — do not repurpose the existing counter, which other code already depends
   on for `dealerForRound`.
4. Because `tierMultiplier` can be `0.5`, the raw payout can be fractional. `Coins` is documented as
   "a whole number... never fractional" (`src/hunt/types.ts`) — round down (`Math.floor`) before
   crediting, so the Quarry is never underpriced by a rounding artefact in the player's favour. State
   this rounding choice plainly; it is a default per this skill's own "state a default, don't stall"
   principle, not a silent implementation detail.
5. A kill on the fourth hand or later of a fight pays exactly 0 from this mechanic — confirmed as a
   deliberate taper, not a bug, per the design doc ("to avoid a hard cliff a player learns to
   resent").
6. The payout is visible on the verdict screen when it fires (a nonzero quick-kill payout shown
   distinctly from the flat win coin, if AC1 resolves as additive) — a coin reward a player cannot see
   the reason for reads as arbitrary.
7. Vitest coverage exists for: the design doc's own worked example (first hand, one trick taken, five
   cards left → 10 coins) as a pinned regression test, each tier's multiplier, the zero-payout tier,
   and the fractional-rounding case.

### Scope Boundaries

**In scope:** the hand-within-encounter counter, the unplayed-card count at the win instant, the
tiered payout calculation, its crediting in `recordEncounter`, and its display on the verdict.

**Out of scope:** any change to the flat per-win coin's own value; overkill/surplus-damage-as-currency
(explicitly `[not built]` and out of scope per `the-hunt.md` §10 — this is a distinct mechanic from
that one, and must not be conflated with it).

### Dependencies & Risks

- No dependency on the shop-rebuild or flask/Apply Damage tickets.
- **Open question flagged, not silently resolved (AC1):** whether this payout stacks with or replaces
  `COINS_PER_ENCOUNTER_WIN`. The design doc's worked example is silent on this. Implement additive as
  the stated default (it is reversible — a one-line change either way) but surface the question at
  the `/fb-plan` gate rather than assuming.
- Needs the unplayed-hand-count at the exact instant the Quarry's bar empties — confirm this figure is
  available where `applyDamage`/`resolveWinner` fire (`roundReducer.ts`), since `encounter.ts`'s
  `applyDamage` itself has no notion of either side's hand.

### Design Assets

N/A.

---

## Ticket 8 — Integration pass: shop, flask, Apply Damage and quick-kill payout together

**Type:** Task · **Priority:** Medium · **Parent:** DLR-87 · **Skill:** react-frontend
**Blocked by:** Ticket 1, Ticket 2, Ticket 3, Ticket 4, Ticket 5, Ticket 6, Ticket 7 · **Blocks:** Ticket 9

### Problem Statement

Tickets 1–7 are built and tested largely independently, but three of them touch the same files
(`bank.ts`, `RunState`, `config.ts`) and the whole epic is meant to work as one coherent run economy —
Whetstone's price is explicitly sized against the quick-kill payout's worked example, and Apply
Damage's two-thirds rule interacts with whatever streak Whetstone has been inflating. This ticket is
the one that plays a full run with everything active and fixes whatever the pieces reveal about each
other that no single-feature ticket could catch.

### User Story

As the developer, I want to play a full run with every new mechanic active at once, so that
interface mismatches between independently-built pieces get caught before sign-off rather than
discovered by the player.

### Acceptance Criteria

1. A full run is played (or driven via QA's browser automation) with at least one purchase from every
   shop category, at least one flask drink and one stage-boss refill, at least one voluntary Apply
   Damage, and at least one quick-kill payout observed.
2. `RunState`'s new fields (flask charges, Whetstone count, Poison Guard active flag, any Envenom
   queue if it ended up here rather than on `EncounterState`) all survive `advanceRun` correctly —
   run-scoped state carries, encounter-scoped state resets, per each ticket's own stated scope.
3. `bank.ts`'s three concurrent changes (Whetstone's bank-added increment, Apply Damage's two-thirds
   forced-hit payout, the existing end-of-hand cash) compose without one silently overriding another
   — confirmed by a test that stacks a Whetstone purchase with a forced hit and checks the two-thirds
   figure is taken against the *boosted* bank, not the un-boosted one.
4. Any interface mismatch found (a prop shape two tickets each assumed differently, a config key named
   twice, a refusal reason that doesn't fit the shared `PurchaseRefusal` pattern) is fixed here rather
   than left as a follow-up ticket.
5. `npm run typecheck`, `npm run lint`, and the full `npm test` suite all pass.

### Scope Boundaries

**In scope:** cross-ticket interface fixes, `RunState` field composition, `bank.ts` compositional
correctness, a full-run playthrough.

**Out of scope:** new features not already scoped in Tickets 1–7; visual polish (Ticket 9); the
epic-level Definition of Done sign-off (Ticket 10, which checks the *epic's* stated criteria — this
ticket checks that the *pieces* fit).

### Dependencies & Risks

- Blocked by every build ticket in this epic — schedule last among build work, first among the
  closing tickets, per this decomposition's own checklist guidance.
- Risk: this is the ticket most likely to surface a design question none of Tickets 1–7 flagged
  (e.g. Apply Damage and Whetstone stacking to a payout size nobody costed) — treat a surprising
  number as a reason to flag, not a reason to quietly retune a price mid-integration.

### Design Assets

N/A.

---

## Ticket 9 — Visual and interaction polish pass

**Type:** Task · **Priority:** Low · **Parent:** DLR-87 · **Skill:** react-frontend
**Blocked by:** Ticket 8 · **Blocks:** Ticket 10

### Problem Statement

Tickets 1–7 ship functional defaults per this repo's "ship rough, then tune by feel" convention —
spacing, colour, hover/focus states, and motion for the new tab UI, the poison-marking interaction,
the flask control, and the Apply Damage button are all placeholder until this pass. An epic that
leaves five new interactive surfaces at their functional default reads as unfinished even though every
acceptance criterion above passes.

### User Story

As a player, I want the new shop tabs, the poison/guard indicators, the flask control, and the Apply
Damage button to look and feel considered, not just wired up, so the finished feature reads as part of
the game rather than a debug build of it.

### Acceptance Criteria

1. Every new interactive surface from Tickets 1–7 gets a deliberate pass on spacing, colour (against
   this project's existing palette, not a new one), interactive states (`:hover`/`:focus-visible`/
   `:active`, matching `ShopPanel`'s existing `@media (hover: hover)` guard), and motion where
   `game-ux` calls for it.
2. The disabled game-permanent tab's "Coming Soon" treatment reads as intentional rather than broken.
3. Nothing here changes behaviour, refusal logic, or acceptance criteria already verified by Tickets
   1–8 — this is a CSS/copy/motion pass, not a rules pass.
4. `game-ux`'s `references/full-viewport-layout.md` and interaction-cost guidance are followed for any
   surface this pass touches.

### Scope Boundaries

**In scope:** visual and interaction polish for every surface Tickets 1–7 introduced.

**Out of scope:** any new mechanic or rule; retuning a price or a numeric value (that is a design
decision, not a polish one, and belongs in a separate ticket if it turns out to be needed).

### Dependencies & Risks

- Blocked by Ticket 8 so it polishes the integrated whole rather than five surfaces that later turn
  out to interact badly.
- This is a **pause-condition-adjacent** ticket — visual judgement is explicitly the developer's per
  `CLAUDE.md`'s pause conditions. Expect this ticket to surface several "which of these looks
  better" moments that stop the pipeline for a developer call, by design.

### Design Assets

N/A — this ticket is where design assets (if the developer wants any for the new surfaces) would
actually get used; flag at the `/fb-plan` gate whether a mockup pass precedes it.

---

## Ticket 10 — Verification and sign-off against the epic's Definition of Done

**Type:** Task · **Priority:** Medium · **Parent:** DLR-87 · **Skill:** none — verification and
documentation, not new code
**Blocked by:** Ticket 9 · **Blocks:** none

### Problem Statement

Nine tickets each verify their own acceptance criteria in isolation. This closing ticket checks the
epic's own stated Definition of Done as a whole, end to end, against the real integrated result — not
a re-statement of tests that already passed per-ticket.

### User Story

As the developer, I want one final check against the epic's original Definition of Done, so DLR-87
can close knowing the whole was actually delivered, not just its parts.

### Acceptance Criteria

Directly transcribed from DLR-87's own Definition of Done — do not restate or reinterpret:

1. Shop UI shows all four categories, with existing Heal unaffected and sitting outside them.
2. Envenom, Poison Guard, and Whetstone are purchasable and their mechanics match the design doc.
3. The flask can be drunk for 60% max HP and refills on stage-boss kill.
4. Apply Damage is available as a player action pre-card, with the two-thirds-on-forced-hit rule
   verified.
5. A first-hand, one-trick kill with five cards left pays 10 coins (Ticket 7's pinned regression test
   is the evidence; re-confirm it by hand in a live run here, not just by reading that the test
   passes).
6. `npm run typecheck`, `npm run lint`, and `npm test` all pass; `.docs/game_rules/the-hunt.md`
   reflects the new shop and mechanics as `[settled]` — this is `implementation-doc-writer`'s job, not
   hand-edited, per `CLAUDE.md`'s standing rule that the file is never edited by hand.

### Scope Boundaries

**In scope:** re-verifying the epic's own six-item Definition of Done end to end; triggering
`implementation-doc-writer` to bring `the-hunt.md` and the relevant `.docs/implementation/` folders
current.

**Out of scope:** fixing anything found here beyond what re-running the relevant earlier ticket's
scope covers — a genuine gap found at this stage is a new ticket, not a scope-creep fix bolted onto
this one.

### Dependencies & Risks

- Blocked by every other ticket in this epic.
- If any Definition-of-Done item fails here after every prior ticket reported green, that is a
  finding for `/fb-issue`, not a silent fix — something in the per-ticket verification missed it.

### Design Assets

N/A.

---

## Sequencing diagram

```
Ticket 1 (shop scaffold, four tabs)
  ├─ blocks → Ticket 2 (Envenom)
  │             └─ blocks → Ticket 3 (Poison Guard)
  └─ blocks → Ticket 4 (Whetstone)

Ticket 5 (flask)         — independent, no blockers
Ticket 6 (Apply Damage)  — independent, no blockers
Ticket 7 (quick-kill payout) — independent, no blockers

Tickets 1, 2, 3, 4, 5, 6, 7
  └─ all block → Ticket 8 (integration pass)
                    └─ blocks → Ticket 9 (visual/interaction polish)
                                  └─ blocks → Ticket 10 (verification & sign-off)
```

Build-order guidance (not hard Jira blocks beyond what's listed above):

- Tickets 1 and 5–7 can start in parallel — none shares state with another.
- Ticket 2 must follow Ticket 1; Ticket 3 must follow Ticket 2.
- Ticket 4 must follow Ticket 1, and should land either before or with a fresh diff check against
  Ticket 6 — both touch `bank.ts` (noted in both tickets' Dependencies & Risks).
- Tickets 8, 9, 10 are strictly sequential and each strictly follows all build tickets before it.

## Pause conditions this breakdown surfaces (flagged, not decided here)

- Ticket 1: exact tab labels and "Coming Soon" copy.
- Ticket 2/3/4: placeholder item names (Envenom, Poison Guard, Whetstone) are not final copy.
- Ticket 5: where the flask's drink control lives on screen (verdict panel vs. shop screen).
- Ticket 6: whether the banked-streak heart preview needs a second, two-thirds preview once Apply
  Damage ships.
- Ticket 7: whether the quick-kill payout stacks with or replaces the flat per-win coin.
- Ticket 9: visual/interaction judgement calls, by nature of the ticket.

None of these block starting the work — each ticket states a reversible default per this skill's own
"state a default, don't stall" principle — but all six are worth the developer's eyes before or during
`/fb-plan` on the relevant ticket.
