# DLR-103 epic breakdown — ticket-creation worklist

**This file is a ticket-creation worklist for `/jira-epic-decomposition`, not an `/fb-plan`
implementation contract.** It carries no `^Status:` line and is never walked by `/fb-apply`. Its
job is to become 18 real Jira tickets under `DLR-103`, then be superseded by those tickets.

Parent epic: **DLR-103** — "Version 5 — Buff Loadout, Slot Draws, and Delayed Apply Damage"
Source design: `.docs/design/Balatro-Forbidden-Solitaire/version-5-developer-idea.md`
Design-consult pass: game-designer skill output in this session (see conversation) — its
recommended defaults are folded into the tickets below as named, retunable constants, never as
locked numbers.

**Checklist categories excluded, and why:**
- *Autonomous/reactive behavior* — nothing in this epic changes the Quarry's own play; it remains
  "no powers, plays by exactly the player's rules" (DLR-81). No ticket needed.
- *Deploy/release* — this prototype has no deploy pipeline distinct from `npm run build`, already
  a QA gate under `/fb-apply`. No separate ticket needed.

---

## Sequencing diagram

```
Foundational scaffold
  T1 (AP core) ─────────────┐
  T2 (Buff pile model) ──┬──┤
  T3 (Cross-run storage) ┼──┼──────────────────────────────┐
                          │  │                              │
Core domain/rules         │  │                              │
  T4 (Migrate Cheat/Timebomb into buff pile) ◄──────────────┘ (needs T2)
  T5 (Buff activation + AP costs) ◄── T1, T2, T4
  T6 (Delayed Apply Damage) ◄── T1
  T7 (Shield redesign) ◄── T2
  T7a (Author the v1 buff/template card list) ◄── none, design-only
  T8 (Slot-machine draw + templated pool) ◄── T2, T7a
  T9 (Vault meta-progression) ◄── T3, T8

User-facing interface
  T10 (Pre-hand loadout action bar) ◄── T4, T5, T6
  T11 (Health bar blue hearts) ◄── T7
  T12 (Shop: slot machine + pared-down list) ◄── T8, T9
  T13 (Live card preview) ◄── T5, T10
  T14 (Vault end-of-run screen) ◄── T9

Visual/experience polish
  T15 (Full UX/visual pass) ◄── T10, T11, T12, T13, T14

Integration
  T16 (Wire everything into one run loop) ◄── T10, T11, T12, T13, T14

Verification & sign-off
  T17 (End-to-end verification vs. epic DoD) ◄── T15, T16
```

---

### T1 — Action Points: core resource, single-source-of-truth toggle

**Suggested type:** Task · **Priority:** High · **Parent:** DLR-103
**Blocked by:** none · **Blocks:** T5, T6
**Skill:** react-frontend (engine layer under `src/hunt/`)
**Labels:** `engine`

## Problem Statement
Every buff activation and Apply Damage need to draw against a new resource, Action Points (AP),
that doesn't exist in the engine today. The design doc explicitly asks that AP be "implemented so
it can be switched off cleanly" from one place — mirroring how `applyDamageRefusalFor` is already
the single statement of whether that control is live — so the whole system can be backed out of
without hunting down every call site.

## User Story
As the developer, I want AP to be one small, toggleable resource module, so that every future
ticket that spends AP reads from the same source and the whole economy can be disabled with one
flag if it doesn't play well.

## Acceptance Criteria
1. A new module exposes the player's current AP, `STARTING_AP` (default `6`, named constant),
   and `AP_REFRESH_CADENCE` (enum, default `perHand`) governing when AP resets.
2. A single `AP_ENABLED` flag (or equivalent single source of truth) exists such that flipping it
   off makes every AP-gated action available at zero cost, without any consuming code needing its
   own bypass logic.
3. AP refreshes to `STARTING_AP`'s current pool size at the start of each hand when
   `AP_REFRESH_CADENCE === 'perHand'`, verified by a unit test.
4. No consumer exists yet (buff activation and Apply Damage costs land in T5/T6) — this ticket
   ships the resource and its toggle only, unit-tested in isolation.

## Scope Boundaries
**In scope:** AP state shape, refresh logic, the enable/disable flag, unit tests.
**Out of scope:** wiring AP costs to any action (T5, T6); AP-capacity shop purchase (T12); any UI.

## Dependencies & Risks
No dependencies. Risk: choosing `perHand` refresh is the game-designer-recommended default per
the doc's own framing in §1 ("each hand") — if a later playtest wants per-fight or per-run pooling,
the enum shape here is what avoids a refactor; don't hardcode the cadence as a boolean.

---

### T2 — Buff pile: data model, tiers, and per-run ownership

**Suggested type:** Task · **Priority:** High · **Parent:** DLR-103
**Blocked by:** none · **Blocks:** T4, T7, T8
**Skill:** react-frontend (engine layer)
**Labels:** `engine`

## Problem Statement
Nothing in the engine today represents a "buff" as a first-class, owned, tiered object. Cheat and
Timebomb (T4), Shield (T7), and the slot-machine-drawn templated cards (T8) all need to plug into
one shared shape: a buff has an identity, a tier (bronze/silver/gold), a condition, and a reward —
and the player owns a growing pile of them across a run, the same way Cheats and health persist
today.

## User Story
As the developer, I want one buff data model and one owned-pile structure, so that Cheat, Timebomb,
Shield, and every templated card are interchangeable objects the rest of the system can activate,
draw, and persist identically.

## Acceptance Criteria
1. A `Buff` type exists with fields for identity, tier (`bronze` / `silver` / `gold`), a condition
   descriptor, and a reward descriptor — general enough that a tier can scale a different axis per
   card (magnitude for the Bells example, duration for Cheat, a heart count for Shield), per §3 of
   the design doc.
2. The player's owned buff pile persists across fights within a run, the same way
   `RUN_STARTING_CHEATS`-style state does today, verified by a unit test carrying a buff across
   two encounters.
3. `STARTING_BUFF_COUNT` (default `4`, all bronze) seeds a fresh run's pile, per the game-designer
   consult's recommendation and §8 of the design doc.
4. No activation, no UI, and no slot-machine draw logic yet — this ticket ships the type and the
   owned-pile persistence only.

## Scope Boundaries
**In scope:** `Buff` type, owned-pile state and persistence, starting-pile seeding.
**Out of scope:** Cheat/Timebomb migration (T4), activation/AP costs (T5), slot machine (T8).

## Dependencies & Risks
None. Risk: getting the tier-axis generalization wrong here (e.g. hardcoding "tier = magnitude")
would force a rework in T4 and T7, which each use a different axis — review the type against all
three known axes (magnitude, duration, heart-count) before marking this done.

---

### T3 — Cross-run persistent storage layer

**Suggested type:** Task · **Priority:** Medium · **Parent:** DLR-103
**Blocked by:** none · **Blocks:** T9
**Skill:** react-frontend (engine layer)
**Labels:** `engine`

## Problem Statement
Nothing in `src/` persists anything across runs today — a grep of the codebase found no
`localStorage` usage anywhere. The Vault (§8 of the design doc) needs currency and purchases to
survive a run ending in death, which is a genuinely new capability, not an extension of an
existing one.

## User Story
As the developer, I want a small, isolated persistence module, so that Vault currency and
purchases survive a browser refresh and a new run, without every future consumer inventing its own
storage logic.

## Acceptance Criteria
1. A module wraps `localStorage` (or an equivalent already-available browser API) behind a typed
   read/write interface scoped to this game's save key namespace.
2. Reading with no prior save returns a defined empty/default state rather than throwing.
3. A round-trip unit test (write, simulate reload by re-reading) passes.
4. No Vault-specific fields yet — this ticket ships the generic persistence capability only.

## Scope Boundaries
**In scope:** the storage wrapper, its typed interface, unit tests.
**Out of scope:** Vault currency schema and spends (T9); any other use of persistence.

## Dependencies & Risks
None. Risk: this is new architecture with no precedent in the codebase — keep the interface
minimal (get/set/clear) so T9 defines the actual Vault schema rather than this ticket guessing it.

---

### T4 — Migrate Cheat and Timebomb into the ordinary buff pile

**Suggested type:** Task · **Priority:** High · **Parent:** DLR-103
**Blocked by:** T2 · **Blocks:** T5
**Skill:** react-frontend (engine layer)
**Labels:** `engine`

## Problem Statement
Cheat and Envenom (renamed Timebomb per the doc) each have bespoke state machines today — two
Cheat slots with a two-click arm-and-spend ritual, and an Envenom plate with a three-tap ritual.
The design doc calls for both to become ordinary entries in the buff pile from T2, owned and
activated the same way every other buff is, while keeping their existing tiered axes: Cheat tiers
on **duration** (1/2/3 tricks of no follow-suit), Timebomb tiers on **damage**.

## User Story
As the developer, I want Cheat and Timebomb expressed as `Buff` objects rather than bespoke
mechanics, so the game has one shared activation model instead of three parallel ones, per §1 of
the design doc.

## Acceptance Criteria
1. Cheat is represented as a `Buff` with tier-scaled duration: `CHEAT_DURATION_TRICKS = { bronze:
   1, silver: 2, gold: 3 }` (named, retunable constants) — bronze matches today's single-card
   behavior.
2. Timebomb is represented as a `Buff` with tier-scaled damage, and the open question from §3 (does
   a higher tier raise only Quarry-side damage, or scale both sides on today's 2:1 ratio) is
   resolved by defaulting to scaling both sides on the existing ratio — recorded as a comment next
   to `TIMEBOMB_DAMAGE` rather than silently decided.
3. The old two-click Cheat-slot state machine and three-tap Envenom-plate state machine are removed
   once their behavior is proven equivalent under the new model — no dead code left behind per this
   project's conventions.
4. Existing Cheat and Envenom/Timebomb unit tests are ported to exercise the new buff-pile path and
   pass.

## Scope Boundaries
**In scope:** Cheat and Timebomb as `Buff` objects, their tier tables, removal of the old bespoke
mechanics.
**Out of scope:** AP cost to activate them (T5); the felt-rail UI removal (T10) — this ticket is
engine-only, UI still points at the old mechanics until T10 lands.

## Dependencies & Risks
Blocked by T2 (needs the `Buff` type). Risk: gold Cheat (3 tricks of no follow-suit) is flagged by
the source doc itself as needing a costing pass before it ships — this ticket only defines the
duration table; T5's tiered AP cost is what actually prices it. Do not ship gold Cheat active in
any player-reachable path until T5 lands.

---

### T5 — Buff activation flow and tiered AP costs

**Suggested type:** Task · **Priority:** High · **Parent:** DLR-103
**Blocked by:** T1, T2, T4 · **Blocks:** T10, T13
**Skill:** react-frontend (engine layer)
**Labels:** `engine`

## Problem Statement
Owning a buff (T2/T4) is separate from bringing it into a given trick. The design doc confirms a
buff must be applied before that trick's first card is laid, reusing the discard window's existing
`discardWindowOpen` timing rather than inventing a second gate, and re-opens before every trick
within the hand so the player can reconsider. Activating a buff costs AP, and the game-designer
consult's specific recommendation is that cost should scale with tier — a flat cost is the single
likeliest thing in this whole epic to feel broken in play, since it prices a 3-trick, no-follow-suit
gold Cheat the same as a one-trick bronze one.

## User Story
As a player, I want to choose which owned buffs to activate before each trick, spending AP per
buff, so my loadout is a real per-trick decision rather than a one-time pre-hand lock.

## Acceptance Criteria
1. An "Apply Buff" action is gated by the same timing `discardWindowOpen` already provides — no new
   timing gate is built.
2. Activating a buff costs AP per its tier: `BUFF_ACTIVATION_COST = { bronze: 3, silver: 5, gold:
   8 }` (named, retunable constants, per the game-designer consult's recommendation).
3. Multiple buffs can be activated for the same trick if the AP budget allows (stacking), verified
   by a unit test spending down a starting pool across two buffs.
4. The AP pool is a single per-hand budget drawn down across up to six per-trick windows — no
   additional rule is needed beyond AP being one pool and the gate reopening each trick; a unit test
   confirms AP does not silently refresh mid-hand.
5. Attempting to activate a buff with insufficient AP is refused with a reason, following this
   project's existing disabled-with-reason convention.

## Scope Boundaries
**In scope:** the Apply Buff action, AP cost table, stacking, insufficient-AP refusal.
**Out of scope:** the felt-rail button itself (T10); Apply Damage's own AP cost (T6, separate
because its cost is explicitly undecided in the source doc, not tied to buff tiers).

## Dependencies & Risks
Blocked by T1 (AP resource), T2 (buff model), T4 (Cheat/Timebomb must exist as buffs before their
tiered costs can be tested). Risk: this is the ticket that actually prices gold Cheat — treat the
`8 AP` gold figure as a placeholder pending the first playtest, not a considered balance choice.

---

### T6 — Delayed Apply Damage payout

**Suggested type:** Task · **Priority:** High · **Parent:** DLR-103
**Blocked by:** T1 · **Blocks:** T10, T13
**Skill:** react-frontend (engine layer)
**Labels:** `engine`

## Problem Statement
This is the epic's core structural fix (§0 of the design doc): Apply Damage currently cashes the
bank instantly with no risk. It needs to cost AP and queue its payout for a one-trick delay,
reusing the poison delayed-hit plumbing already on `EncounterState` (`hunt/envenom-and-the-delayed-
hit.md`), with taking damage during that window wiping the queued value entirely — the same way an
ordinary hit resets bank and multiplier today. The quick-kill payout (section 10 of `the-hunt.md`)
currently counts unplayed cards at the instant the Quarry's health reaches zero; under a delayed
kill this needs to freeze at press-time instead, per the game-designer consult's recommendation, so
a deferred killing blow doesn't quietly under-count the hand that actually earned it.

## User Story
As a player, pressing Apply Damage should be a real bet on surviving one more trick, not a
guaranteed, instant, risk-free cash-out.

## Acceptance Criteria
1. Apply Damage costs AP: `APPLY_DAMAGE_AP_COST` (named, retunable constant, default `3` to start,
   explicitly flagged as open per §2 of the design doc).
2. Pressing Apply Damage queues the payout rather than resolving it immediately, resolving after
   the current trick plus the next trick — reusing the existing delayed-hit plumbing shape rather
   than a new mechanism.
3. Taking damage during the delay window wipes the queued payout to nothing, mirroring how an
   ordinary hit already resets bank and multiplier — verified by a unit test.
4. The quick-kill payout's unplayed-card count is snapshotted at the moment Apply Damage is
   pressed, not recalculated at the delayed resolution moment — verified by a unit test where a
   card is played during the delay window and the payout still reflects the press-time count.
5. Two buff hooks exist for future buffs to shorten (`applyDamageDelayTricks -1`) or remove
   (`applyDamageDelayTricks = 0`) the delay — the buffs themselves are authored in T8's templated
   pool, this ticket only needs the delay to be a read value, not a hardcoded `1`.

## Scope Boundaries
**In scope:** AP cost, the delay queue, reset-on-hit, the quick-kill snapshot fix, the
delay-modifier hook.
**Out of scope:** the two delay-modifying buffs themselves (authored as data in T8); any UI
showing the pending payout (T10/T13 handle visibility).

## Dependencies & Risks
Blocked by T1 (AP resource). Risk: `applyDamageRefusalFor` is the existing single-source-of-truth
pattern for this control — extend it rather than adding a second parallel refusal path.

---

### T7 — Shield redesign: blue hearts on the health bar

**Suggested type:** Task · **Priority:** Medium · **Parent:** DLR-103
**Blocked by:** T2 · **Blocks:** T11
**Skill:** react-frontend (engine layer)
**Labels:** `engine`

## Problem Statement
Shield currently doesn't exist as a shipped mechanic (Bulwark, its hidden-counter predecessor, is
cut entirely per §7 of the design doc). The redesign makes Shield add visible, non-stacking,
non-healable "blue heart" pips directly to the health bar, tiered by count (bronze 1 / silver 2 /
gold 3).

## User Story
As a player, I want Shield's protection to be a visible pip on my own health bar, not a hidden
counter, so the cost and the protection are both legible on the felt.

## Acceptance Criteria
1. Health state supports a second pip type ("blue heart") alongside the existing health pips.
2. Activating Shield sets the blue-heart count to the tier's value (`SHIELD_HEARTS = { bronze: 1,
   silver: 2, gold: 3 }`) — it does not add to any existing blue hearts, it resets to the tier's
   count, verified by a unit test re-activating a lower tier after a higher one.
3. Blue hearts cannot be restored by Heal, the flask, or any other source, once lost — verified by
   a unit test.
4. Damage absorption order is explicit and tested: blue hearts absorb damage before ordinary
   hearts (the doc's own framing — "dividing what you take" — implies protection-first; this
   ordering is stated here rather than left implicit).

## Scope Boundaries
**In scope:** the blue-heart pip type, tier-reset (not stack) behavior, non-heal rule, absorption
order.
**Out of scope:** rendering the second pip type on screen (T11); Shield's own AP activation cost
(covered generically by T5's buff-activation flow, since Shield is an ordinary buff by this point).

## Dependencies & Risks
Blocked by T2 (buff model). Risk: absorption order (blue-first) is a reasonable default but is a
genuine rules reading with no source-doc citation — call it out plainly if a playtest suggests the
opposite order feels more correct, since this is a case where two reasonable readings exist.

---

### T7a — Design: author the v1 buff card list from the template grid

**Suggested type:** Task · **Priority:** High · **Parent:** DLR-103
**Blocked by:** none · **Blocks:** T8
**Skill:** game-designer
**Labels:** `design`

## Problem Statement
§5 of the design doc lays out a dozen-ish condition templates crossed with a dozen-ish reward
templates, but is explicit that this is **"TO BE REVIEWED, not committed"** — not every cell of the
grid deserves a card, and the doc's own closing section lists exactly what review should decide:
which pairings are worth writing, how many synergy templates versus flat ones the pool should
carry, and whether "lose the next N tricks" needs a UI answer before it's buildable at all (it
requires tracking a goal across multiple future tricks, unlike every other template). T8 needs a
finished, decided card list to generate from — building the machinery against an undecided grid
would bake in an arbitrary subset of it.

## User Story
As the developer, I want a settled v1 buff card list — which condition/reward pairings ship,
which are held back — so T8 builds its generation logic against real content instead of guessing
which cells of the grid matter.

## Acceptance Criteria
1. A finished list of v1 buff cards is written, each naming its condition template, reward
   template, and tier progression, in the same shape as the doc's own worked examples (§5's
   "Bronze / Silver / Gold" combined examples).
2. The opponent-forced-card condition template is explicitly excluded from this v1 list (per the
   game-designer consult — it needs its own costing pass, tracked separately, not folded in here
   under time pressure).
3. "Lose the next N tricks" is either included with a stated UI answer for tracking a pending
   multi-trick goal, or explicitly deferred with a one-line reason — not silently dropped.
4. The AP-refund reward template, if included, ships with a stated `MAX_REFUND_PER_HAND` cap
   (named, retunable constant) alongside it in the list — called out by the game-designer consult
   as the one template combination (paired with the "+1 per other active buff" synergy condition)
   most likely to compound into something degenerate if left uncapped.
5. The finished list is written to `.docs/design/Balatro-Forbidden-Solitaire/` (or appended to the
   source doc) so T8 has one authoritative content source to generate from.

## Scope Boundaries
**In scope:** deciding which condition/reward pairings ship in v1, their tier progressions, the
two flagged UI/cap questions above.
**Out of scope:** any code — this is a content/design decision ticket, not an implementation one;
T8 consumes its output.

## Dependencies & Risks
None blocking. This is a genuine developer-judgement ticket — which cards make the cut is a design
call the doc itself declined to make, not something to default past.

---

### T8 — Slot-machine buff draw and templated buff pool

**Suggested type:** Task · **Priority:** High · **Parent:** DLR-103
**Blocked by:** T2, T7a · **Blocks:** T9, T12
**Skill:** react-frontend (engine layer)
**Labels:** `engine`

## Problem Statement
The shop's buff list is drawn through a slot machine rather than purchased from a fixed menu: the
player picks a machine, then pulls three reels. Three different cards each land as bronze; two
matching reels produce one silver card plus a separate bronze for the odd reel; three matching
reels produce one gold card. The card pool itself is generated by crossing the condition templates
and reward templates decided in T7a, using the same weighted-draw machinery `skullWeights.ts`
already implements, pointed at this list instead of skull ranks.

## User Story
As a player, I want to choose a machine and pull reels for buffs, with the reel-match rules
determining rarity, so buff acquisition is a scarcity-driven choice rather than a fixed always-
purchasable list.

## Acceptance Criteria
1. At least two machine definitions exist, each leaning toward a different subset of the buff pool
   (a permanent-upgrade lean vs. a trick/fight-buff lean), per §3 of the design doc.
2. A three-reel pull resolves per the stated match rules (three different → three bronze; two match
   → one silver + one bronze; three match → one gold), verified by unit tests covering all three
   outcomes.
3. `REEL_POOL_SIZE = 8` (named, retunable constant per the game-designer consult) sets how many
   distinct buffs sit on one machine's reels.
4. T7a's decided card list is implemented as data-driven card generation reusing the existing
   weighted-draw pattern from `skullWeights.ts` — this ticket consumes that list as-is and does not
   re-decide which cards ship.
5. Pull cost is applied per the game-designer consult's recommendation:
   `SLOT_FREE_PULLS_PER_VISIT = 1`, further pulls cost `SLOT_REROLL_PRICE = 1` coin.

## Scope Boundaries
**In scope:** machine definitions, reel-pull resolution, generating cards from T7a's decided list,
pull cost.
**Out of scope:** deciding which cards make the v1 list (T7a); the shop screen UI (T12); Vault-
driven odds adjustment (T9, which modifies this pool's weights).

## Dependencies & Risks
Blocked by T2 (buff model) and T7a (the content this ticket generates from). Risk: if T7a lands
late or incomplete, this ticket has nothing real to generate against — do not substitute a
placeholder list and call this done.

---

### T9 — Vault: cross-run meta-progression

**Suggested type:** Task · **Priority:** Medium · **Parent:** DLR-103
**Blocked by:** T3, T8 · **Blocks:** T12, T14
**Skill:** react-frontend (engine layer)
**Labels:** `engine`

## Problem Statement
When a run ends in death, leftover coin is lost today. The Vault converts it into a persistent
currency spent on two confirmed uses: raising a card's odds in the slot machine's pool on future
runs, and buying a better starting tier of a liked card directly into the starting pile.

## User Story
As a player, I want coin I would otherwise lose at death to convert into permanent progress I can
spend on future runs, so a loss still moves me forward.

## Acceptance Criteria
1. On a run ending in death, remaining coin converts to Vault currency at
   `VAULT_EXCHANGE_RATE = 10` leftover coin : 1 Vault currency (named, retunable constant), and the
   result is persisted via T3's storage layer.
2. A "raise this card's odds" spend increases a named buff's weight in T8's slot-machine pool for
   future runs, persisted and re-applied on run start.
3. A "buy a starting tier" spend is implemented as three separately priced purchases (bronze/
   silver/gold), each placing that tier of the chosen buff directly into a future run's starting
   pile — implemented as two separate spend paths per the game-designer consult (not a single
   upgrade path), since they answer different questions.
4. Both spends and the Vault balance persist across a browser reload, verified by a round-trip
   unit test through T3's storage layer.

## Scope Boundaries
**In scope:** coin-to-Vault conversion on death, the two confirmed spends, persistence.
**Out of scope:** the Vault's own screen (T14); showing Vault currency mid-run as a "coming
attraction" (explicitly deferred per the game-designer consult — reveal only at death/run-end).

## Dependencies & Risks
Blocked by T3 (persistence) and T8 (the pool this ticket biases). Risk: none structural — this is
the lowest-risk major system in the epic since both spends are additive and reversible via the
exchange-rate constant.

---

### T10 — Pre-hand loadout action bar

**Suggested type:** Story · **Priority:** High · **Parent:** DLR-103
**Blocked by:** T4, T5, T6 · **Blocks:** T13, T15, T16
**Skill:** react-frontend, game-ux
**Labels:** `ui`, `playable`

## Problem Statement
Today's felt rail has separate Cheat slots, a separate Envenom plate, a separate discard plate, and
a separate Apply Damage plate. The design doc replaces all of it with one four-button bar at the
bottom of the screen: Apply Buff, Cards (select a card, greyed out until chosen), Swap (today's
discard/reshape, relocated onto this bar), and Apply Damage.

## User Story
As a player, I want one consistent action bar for every pre-trick decision, so I'm not learning
four different interaction rituals for what are all variations of "spend a resource on this
trick."

## Acceptance Criteria
1. A single action bar renders Apply Buff, Cards, Swap, and Apply Damage, replacing the separate
   Cheat-slot, Envenom-plate, and discard-plate rails.
2. Apply Buff opens a selection of the player's owned buffs (from T2/T4), shows each buff's AP cost
   (T5) and the player's remaining AP, and lets the player activate one or more per the stacking
   rule from T5.
3. Cards is greyed out until a card is selected, then highlighted, matching the described
   interaction.
4. Swap performs today's discard/reshape behavior, unchanged in rules, relocated onto this bar.
5. Apply Damage shows its AP cost (T6) and, once pressed, a visible indicator that a payout is
   queued and how many tricks remain until it resolves.
6. Component tests query by accessible role and label per this project's testing conventions.

## Scope Boundaries
**In scope:** the four-button bar, its wiring to T4/T5/T6's engine logic, removal of the old
separate rails.
**Out of scope:** visual polish beyond a functional default (T15); the live win/lose card readout
(T13, a related but separate surface).

## Dependencies & Risks
Blocked by T4, T5, T6 (needs real buff/AP/Apply-Damage logic to wire to). This is the single
largest UI change in the epic — per `.claude/skills/game-ux/SKILL.md`, review full-viewport layout
and interaction-cost guidance before building, since this bar replaces four previously-separate
zones.

---

### T11 — Health bar: rendering blue hearts

**Suggested type:** Task · **Priority:** Medium · **Parent:** DLR-103
**Blocked by:** T7 · **Blocks:** T15, T16
**Skill:** react-frontend, game-ux
**Labels:** `ui`, `playable`

## Problem Statement
The health bar today renders one pip type. Shield's redesign (T7) needs a second, visually distinct
pip type rendered alongside it, reflecting that blue hearts absorb damage first and can't be
healed.

## User Story
As a player, I want to see blue hearts as a visually distinct pip on my health bar, so Shield's
protection is legible without opening a menu.

## Acceptance Criteria
1. The health bar renders blue-heart pips distinctly from red hearts, both present simultaneously
   when applicable.
2. Blue hearts disappearing (absorbing damage, per T7's ordering) and never regenerating from a
   heal is visible in the same interaction that already shows red-heart changes.
3. Component tests query by accessible role and label.

## Scope Boundaries
**In scope:** rendering the second pip type on the existing health bar component.
**Out of scope:** the absorption-order rule itself (T7, engine); any other health bar layout
change.

## Dependencies & Risks
Blocked by T7. Low risk — this is additive rendering on an existing component.

---

### T12 — Shop screen: slot machine and pared-down purchasable list

**Suggested type:** Story · **Priority:** High · **Parent:** DLR-103
**Blocked by:** T8, T9 · **Blocks:** T15, T16
**Skill:** react-frontend, game-ux
**Labels:** `ui`, `playable`

## Problem Statement
The shop needs to show a machine choice and a three-reel pull instead of a fixed list, per §3 and
§7 of the design doc, and its purchasable list is pared down to exactly three things: Health, AP
capacity (+5 AP per purchase), and the slot-machine buff draw. Whetstone, Reflex, the discard-
budget increase, and the odds-raising purchase are removed from the shop's purchasable list without
their mechanics being deleted, per the developer's explicit call in §7.

## User Story
As a player, I want to pick a machine and pull its reels in the shop, and see only Health, AP
capacity, and the slot machine as purchasable, so this pared-down version can be tested before
anything else is added back.

## Acceptance Criteria
1. The shop screen offers machine selection (from T8's machine definitions) and a three-reel pull
   UI showing the outcome (three bronze / silver+bronze / gold) per the resolved match rules.
2. The shop's purchasable list shows exactly Health and AP capacity (`+5 AP`, named constant) as
   fixed, always-purchasable items, plus the slot machine.
3. Whetstone, Reflex, the discard-budget increase, and the odds-raising purchase are removed from
   this screen's purchasable list — their underlying mechanics (already shipped, e.g. Whetstone)
   are not deleted from the codebase, only from this screen's offered items.
4. Component tests query by accessible role and label.

## Scope Boundaries
**In scope:** machine choice UI, reel-pull UI and outcome display, the pared-down purchasable list.
**Out of scope:** Vault spends (T14, a separate screen); visual polish beyond a functional default
(T15).

## Dependencies & Risks
Blocked by T8 (machine/pull logic) and T9 (Vault-adjusted odds must exist before this screen can
correctly reflect them, even though Vault's own screen is separate). Review
`.claude/skills/game-ux/SKILL.md` before building — this is a full screen replacement, not a
patch.

---

### T13 — Live card preview: win/lose damage readout

**Suggested type:** Story · **Priority:** Medium · **Parent:** DLR-103
**Blocked by:** T5, T10 · **Blocks:** T15, T16
**Skill:** react-frontend, game-ux
**Labels:** `ui`, `playable`

## Problem Statement
Once buffs are applied for the hand, looking at any card in hand should show two numbers: the
damage if it wins its trick, and the damage if it loses — the concrete answer to §0's diagnosis
that a decision's cost was invisible. Every active buff needs to contribute to this readout live,
not just Apply Damage.

## User Story
As a player, I want to see a card's win/lose damage numbers update live as I apply buffs, so I
don't have to remember what I activated and do the arithmetic myself.

## Acceptance Criteria
1. Each card in hand displays a win-value and a lose-value once any buff is active for the hand.
2. The readout updates live as buffs are applied or removed via T10's action bar, without
   requiring a screen refresh or re-render trigger the player has to invoke.
3. The readout correctly reflects more than one buff conditioning the same card (additive stacking
   at minimum — the doc notes this "generalizes past Apply Damage" and needs to handle several
   conditions layered on one card).
4. Component tests query by accessible role and label.

## Scope Boundaries
**In scope:** the per-card win/lose readout and its live update wiring to T5's buff-activation
state.
**Out of scope:** the buff activation bar itself (T10); visual polish (T15).

## Dependencies & Risks
Blocked by T5 (needs real buff effects to compute against) and T10 (needs the activation bar to
react to). Risk: the doc calls this "cheap in spirit... though real to build once the buff pile can
contain conditions layered several deep" — treat the layered-conditions case as the actual scope
driver, not the single-buff case.

---

### T14 — Vault end-of-run screen

**Suggested type:** Story · **Priority:** Medium · **Parent:** DLR-103
**Blocked by:** T9 · **Blocks:** T15, T16
**Skill:** react-frontend, game-ux
**Labels:** `ui`, `playable`

## Problem Statement
The Vault (T9) needs a screen of its own, shown at a run's end, distinct from the verdict panel,
where Vault currency gets spent — this screen doesn't exist today at all.

## User Story
As a player, when my run ends I want a dedicated screen showing my Vault balance and letting me
spend it, so a loss still gives me something to act on before starting again.

## Acceptance Criteria
1. A new screen, reachable from the run-end verdict flow, shows the player's current Vault balance
   including the amount just converted from this run's leftover coin (T9).
2. The screen offers both confirmed spends from T9: raising a card's odds, and buying a starting
   tier of a card into a future run's pile.
3. Leaving the screen returns the player to the existing start-screen flow.
4. Component tests query by accessible role and label.

## Scope Boundaries
**In scope:** the Vault screen itself and its two spend actions.
**Out of scope:** the Vault's underlying logic (T9); showing Vault currency mid-run (explicitly
deferred).

## Dependencies & Risks
Blocked by T9. Low structural risk — this is a new but self-contained screen with no interaction
with the in-run HUD.

---

### T15 — Full visual and UX pass across the redesigned surfaces

**Suggested type:** Task · **Priority:** Medium · **Parent:** DLR-103
**Blocked by:** T10, T11, T12, T13, T14 · **Blocks:** T17
**Skill:** game-ux, react-frontend
**Labels:** `ui`

## Problem Statement
§9 of the design doc states plainly that nearly every surface this game has shipped — the felt
rail, the health bar, the shop, the dossier — is touched by this epic, and that the existing
screens "can't just absorb it piecemeal." T10 through T14 each ship a functional default; this
ticket is the dedicated pass for spacing, colour, interactive states, and motion across all five
once they exist.

## User Story
As the developer, I want one dedicated pass over every new and changed surface, so the finished
epic reads as a designed whole rather than five patches bolted onto the old screens.

## Acceptance Criteria
1. Each of T10–T14's surfaces is reviewed against `.claude/skills/game-ux/SKILL.md`'s full-viewport
   layout and interaction-cost standards.
2. Visual and copy judgement calls encountered during this pass are logged for the developer to
   decide, per this project's pause condition — not resolved unilaterally.
3. No functional behavior changes — this ticket is presentation-only.

## Scope Boundaries
**In scope:** visual/interaction polish of the five new/changed surfaces.
**Out of scope:** any new functionality; anything not touched by T10–T14.

## Dependencies & Risks
Blocked by all five UI tickets — this is deliberately scheduled last among build work. This is the
one ticket in the epic most likely to surface genuine visual-judgement pause conditions; expect it
to produce sub-questions for the developer rather than closing cleanly on the first pass.

---

### T16 — Integration: one end-to-end run loop

**Suggested type:** Task · **Priority:** High · **Parent:** DLR-103
**Blocked by:** T10, T11, T12, T13, T14 · **Blocks:** T17
**Skill:** react-frontend
**Labels:** `engine`, `playable`

## Problem Statement
T1–T14 each build one piece in isolation. This ticket wires AP, the buff pile, delayed Apply
Damage, the slot machine, Shield, and the Vault into one running hand-to-hand, fight-to-fight, run-
to-run loop, and is where independently-built pieces reveal interface mismatches.

## User Story
As a player, I want to play a full run from start screen through the shop, hands, fights, and a
death, with every new system active together, without any piece behaving as if the others don't
exist.

## Acceptance Criteria
1. A full run is playable end to end: starting buff pile and AP, per-trick buff activation, delayed
   Apply Damage, slot-machine shop purchases, Shield's blue hearts, and a death that reaches the
   Vault screen with a real balance.
2. No regression in previously-shipped, unrelated mechanics (Whetstone, the flask, poison,
   discard budget) — existing test suites for these pass unmodified.
3. Any interface mismatch discovered between two previously-isolated tickets (e.g. AP state not
   visible where the shop needs it) is fixed here rather than punted.

## Scope Boundaries
**In scope:** wiring, cross-system regression checks, fixing integration-only bugs.
**Out of scope:** new functionality not already specified in T1–T14; visual polish (T15, expected
to run in parallel or just before).

## Dependencies & Risks
Blocked by all five UI tickets (T10–T14), which themselves depend on the engine tickets. This is
the highest-risk ticket for surfacing gaps between this breakdown's ticket boundaries — if a
mismatch reveals a missing rule (not just a wiring bug), stop and flag it rather than deciding a
new rule under this ticket's authority.

---

### T17 — Verification and sign-off against the epic's Definition of Done

**Suggested type:** Task · **Priority:** High · **Parent:** DLR-103
**Blocked by:** T15, T16 · **Blocks:** none
**Skill:** react-frontend (QA posture, per `qa` agent conventions)
**Labels:** `engine`, `playable`

## Problem Statement
DLR-103 states ten Definition of Done items. This ticket checks the finished epic against all ten,
end to end, against the real integrated result — not a re-statement of the per-ticket tests that
already passed.

## User Story
As the developer, I want one closing check against the epic's own stated DoD, so I know the epic is
actually finished rather than assuming it from ten green ticket statuses.

## Acceptance Criteria
1. Each of DLR-103's ten Definition of Done items is checked individually against the running app
   (not just against unit tests) and recorded as met or not met.
2. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all pass on the integrated
   branch.
3. Any DoD item not met is filed as its own follow-up ticket rather than silently closing the epic
   anyway.
4. `.docs/game_rules/the-hunt.md` and the relevant `.docs/implementation/` module docs are
   confirmed updated (DoD item 10) — via the `implementation-doc-writer` skill, not by hand.

## Scope Boundaries
**In scope:** DoD verification, the four gate commands, doc-currency check.
**Out of scope:** fixing anything beyond a trivial gap — a real gap becomes its own ticket.

## Dependencies & Risks
Blocked by T15 and T16. This is the epic's closing ticket — nothing should block on it except the
epic itself being marked done.
