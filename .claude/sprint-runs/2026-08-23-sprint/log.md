# Sprint run — 2026-08-23

**Started:** 2026-08-23
**Target branch:** `Version-5` (no upstream yet — first push uses `-u origin Version-5`)
**Base commit:** `3aa577b`
**Sprint query:** `project = DLR AND sprint in openSprints() AND status = "To Do" ORDER BY Rank ASC` → 24 issues
**Gates overridden for this run:** plan approval (auto-take the plan's stated default), mockup approval (skipped unseen)

**Progress:** 19/22 (86%) — done: 19 shipped, 0 blocked (+2 out-of-band shipped) | now: DLR-130 "Headless run simulator" (out-of-band, before the closing three)

## Run order

Rank order, with two deliberate overrides (below).

| # | Key | Summary |
|---|---|---|
| 1 | DLR-101 | Pending poison is invisible on the felt — no at-risk hearts for a booked Envenom hit |
| 2 | DLR-106 | Cross-run persistent storage layer |
| 3 | DLR-107 | Migrate Cheat and Timebomb into the ordinary buff pile |
| 4 | DLR-111 | Design: author the v1 buff card list from the template grid *(pulled ahead)* |
| 5 | DLR-124 | Design: cost the passive buff-stacking resolution rule *(pulled ahead)* |
| 6 | DLR-108 | Buff activation flow and tiered AP costs |
| 7 | DLR-109 | Delayed Apply Damage payout |
| 8 | DLR-110 | Shield redesign: blue hearts on the health bar |
| 9 | DLR-112 | Slot-machine buff draw and templated buff pool |
| 10 | DLR-113 | Vault: cross-run meta-progression |
| 11 | DLR-114 | Pre-hand loadout action bar |
| 12 | DLR-115 | Health bar: rendering blue hearts |
| 13 | DLR-116 | Shop screen: slot machine and pared-down purchasable list |
| 14 | DLR-117 | Live card preview: win/lose damage readout |
| 15 | DLR-118 | Vault end-of-run screen |
| 16 | DLR-122 | Tiered rank abilities: refill the run-permanent shop shelf |
| 17 | DLR-123 | Persistent deck across hands: discard pile, pile counts, one reshuffle per cycle |
| 18 | DLR-125 | Engine: buff condition/reward evaluation framework |
| 19 | DLR-126 | Engine: consumable-item activation flow |
| 20 | DLR-119 | Full visual and UX pass across the redesigned surfaces *(moved to end)* |
| 21 | DLR-120 | Integration: one end-to-end run loop *(moved to end)* |
| 22 | DLR-121 | Verification and sign-off against the epic's Definition of Done *(moved to end)* |

### Order override 1 — content dependencies pulled ahead

`DLR-111` (author the v1 buff card list) and `DLR-124` (cost the passive buff-stacking
resolution rule) both produce *content* — an actual list of buffs, an actual cost rule —
that `DLR-108` (buff activation flow and tiered AP costs) would otherwise have to invent.
Both are pulled ahead of DLR-108 so the activation flow is built against authored content
rather than an assumption. This is the skill's documented content-dependency override.

### Order override 2 — polish/integration/verification moved to the end

Rank places `DLR-119` (visual/UX pass), `DLR-120` (integration) and `DLR-121` (verification
against the epic's Definition of Done) *before* `DLR-122`, `DLR-123`, `DLR-125` and `DLR-126`,
which add further features to the same epic. Verifying an epic's DoD before four of its
tickets exist cannot pass, and a polish pass over surfaces that then change is wasted. The
three are moved after the last feature ticket. **Flagged for developer review** — this is a
judgement call beyond the skill's normal content-dependency rule.

## Excluded at preflight

| Key | Why |
|---|---|
| DLR-81 | Epic (`Run slice — sequenced fights, a spendable charge, and a shop`) — a container, not implementable work |
| DLR-87 | Epic (`Shop rebuild: persistence categories, flask, Apply Damage, quick-kill payout`) — a container, not implementable work |

Tickets in `To Do` but **not in the open sprint** (51 project-wide vs 24 in sprint) were not
considered — those belong to the retired String Railway (`DLR-1`), War Council (`DLR-18`) and
earlier Hunt (`DLR-46`, `DLR-65`) directions, plus Wwise tasks. Out of scope for this run.

No ticket was excluded for local uncommitted work: the tree was clean at preflight apart from
this run's own `sprint-coder` skill edit, committed as `3aa577b` before the run began.

## Standing authorisation (developer, mid-run)

> "Fix the bug, you are not to stop I need you running to the end and making these
> decisions I'll review at the end."

From this point the coordinator makes every judgement call itself and does not pause,
including calls that go beyond the plan-default rule. Each such call is recorded here
for the end-of-run review. Two immediate consequences:

- **DLR-127 was raised and added to the run.** The Envenom-grants-a-Cheat bug found by the
  DLR-101 agent is now a tracked Bug under epic DLR-103, and is queued as an out-of-band
  23rd item, to run after DLR-106.
- **The denominator stays at 22.** `N` is fixed at preflight by the skill's own rule so the
  percentage can never move backwards. DLR-127 is reported alongside the counter, not inside
  it; the wrap-up states both figures.

## Watch-list

- **DLR-108 vs DLR-126** — "Buff activation flow and tiered AP costs" and "Engine:
  consumable-item activation flow" may overlap. Whichever runs first should be checked for
  having already delivered the other. Noted here so the second one's plan is read, not
  rubber-stamped.

---

## DLR-101 — Pending poison is invisible on the felt

Bug under epic DLR-87, labels `playable` / `ui`, priority High. Plan folder:
`.claude/contract/DLR-101-pending-poison-on-the-felt/`.

### The ticket's own open design question — decided without the developer

- **Pending poison got its OWN heart state (`doomed`) rather than reusing the existing `atRisk`.**
  The ticket named this explicitly as an open question for the developer and said "Decide at the
  mockup gate" — the gate this run skips. **Alternative rejected:** reuse `atRisk`, which the ticket
  itself called "the cheaper change and may be enough". **Why the default went the other way:** on the
  Quarry's bar the streak's conditional at-risk hearts and the committed poison hearts can be on
  screen *simultaneously and stack*, so one shared `pending` figure makes them indistinguishable
  exactly when the distinction matters, and it makes the meter's spoken text ("N at risk") say
  something false about damage nothing can stop. Cost of the distinct state: one enum member, one CSS
  block. **Reverting is cheap and deliberately so** — delete the `HeartState.Doomed` member, delete
  the `[data-state='doomed']` block, drop `doomedCount` from the derivation; `pending` was kept as the
  *total* band precisely so a revert does not touch the geometry or `lethal`.

### Mockup

- **A mockup was generated and auto-approved UNSEEN.** `.claude/contract/DLR-101-pending-poison-on-the-felt/mockup.html`
  — self-contained, six clickable scenarios (clean trick / streak only / the bug / both at once /
  poison on the player / poison lethal on the player), each painting the real derivation and printing
  the resulting `aria-valuetext`. It was NOT published as an Artifact and NOT reviewed by anyone. It is
  the only place the proposed five-state heart row can be seen without running the game.

### Design readings and tuning values assumed

- **`doomed` hearts sit INNERMOST** — between the at-risk band and the already-broken hearts.
  *Alternative:* at-risk innermost. *Reasoning:* poison lands first (at the next trick's resolution)
  and is unconditional, so it should read as nearer the depleting edge than the speculative streak.
  Nobody has looked at this on a real 14-heart bar.
- **`--wc-hp-doomed-opacity: 0.78` — A NUMBER NOBODY CHOSE.** Written as an explicit placeholder,
  picked only to sit clearly above `--wc-hp-atrisk-opacity: 0.55` and clearly below solid. This is a
  tuning value and it is the developer's; it shipped because the run does not pause. **Look at it.**
- **`doomed` reuses the existing `--wc-poison: #8fb04e` token** rather than a new colour value, aliased
  as `--wc-hp-doomed-fill` so the heart can be retuned without disturbing the card mark. *Assumption
  not verified by eye:* that green-on-green reads adequately against `--wc-felt: #16241f`.
- **`doomed` hearts do NOT flash**, unlike `atRisk`. *Reasoning:* `atRisk` is conditional and volatile,
  a booked hit is committed. Side effect: the state needs no `prefers-reduced-motion` suppression.
  This is a feel judgement made on paper.
- **`HealthBarView.pending` kept its meaning as the TOTAL band** (at-risk + doomed), with `doomed` as a
  subset. *Alternative:* redefine `pending` to exclude poison and add a third field. *Reasoning:*
  `pending` drives `lethal`, and lethal must count committed poison; redefining it would change a
  field existing tests already assert on.
- **All new copy is placeholder and was not read by a human:** `Poison set — they take 4 at the next
  trick.` / `Poison set — you take 2 at the next trick.` / the meter's ` N poisoned.` clause.
- **The reveal clause is transient** — it lives on the held resolved trick, which the player dismisses
  by tapping. Assumed sufficient because the bar readout is the durable signal. **A player tapping
  through fast may never see it. Only judgeable by playing.**

### Structural decisions taken without approval

- **`projectedFromStreak` was RENAMED to `projectedDepletion`** rather than given a defaulted fourth
  argument. *Reasoning:* the old name would describe half of what it does, and two sibling projection
  functions is the drift the module's docblocks argue against. Cost: 11 name hits across 4 files, so
  the diff is larger than the behaviour warrants.
- **`duelHealthBars`'s two damage-record arguments were collapsed into a `HealthBarOverlays` options
  object.** *Reasoning:* `breaking` and `doomed` are both `Readonly<Record<DuelSide, Damage>>` —
  silently transposable, producing plausible-but-wrong pictures. This follows `bank.ts`'s `TrickFacts`
  precedent. It is a new convention for this module and nobody signed off on it.
- **A new module `src/app/warCouncil/roundBars.ts` was created.** *Forced, not chosen:*
  `WarCouncilRound.tsx` was at 399 of its hard 400-line budget and this change adds lines. Follows the
  three prior splits out of that same file. It is now 380 lines.
- **`envenomDamageFor` was promoted from module-private to a `src/hunt` export**, widening the engine's
  public surface by one function, so the copy layer reads the poison figure from its single owner
  rather than choosing between two constants.
- **A held Poison Guard remains invisible** — scoped out per the ticket. But the bar now shows poison
  booked against the player that a held Guard may cancel, so the two surfaces are related on screen in
  a way they were not before. **This may read as a contradiction in play.**

### Things the developer should look at with their own eyes

- **Nobody has ever seen the `doomed` hearts paint.** QA drove the real app in Chrome but **could not
  reach the shop** to buy an Envenom charge — coins are earned by finishing a fight, not per-trick, so
  the purchase → arm → mark → play-into-a-loss flow was not completable in the time available. QA
  instead dynamically imported the live-served modules in the browser and called the real functions,
  which proved every figure (`quarry.doomed = 4`, hearts 6–10 all `"doomed"`,
  `"10 of 10. 4 poisoned."`, `"Poison set — they take 4 at the next trick."`). That is strong
  evidence, but **it is not a picture of the feature working.** The first person to buy an Envenom
  charge is the first person to see this.
- The five-state heart row has never been seen at 14 or 18 glyphs with a live streak and a booked hit
  at once — the exact condition the design decision above turns on.

### Pre-existing failure found, NOT caused by this ticket

- `src/hunt/__tests__/envenom.test.ts :: 'does NOT add a Cheat'` fails: `buyFromShop(funded(3),
  ShopItem.Envenom).cheats` returns `[{ id: 1 }]` where the spec expects `[]`. **Verified as
  pre-existing** by stashing all of DLR-101's work and re-running against clean `3aa577b` — it fails
  identically there. Buying Envenom appears to also grant a Cheat. Not investigated further; it sits
  in the same epic's territory and **is worth its own bug ticket.**

### Gates at commit

- typecheck 0 · lint 0 · `npm test` **1032 passed, 1 failed** (the pre-existing failure above) ·
  build 0 (`dist/` written, 258.80 kB JS / 37.95 kB CSS).
- Reviewers, round 1, all three approved with **zero** issues: code-evaluator APPROVED,
  defender APPROVED (0 critical / 0 warning / 0 info), QA ALL PASSED. No fix round was needed.
- `roundReducer.poison.test.ts` still 8/8 — the engine was genuinely not touched.

### Docs and ruleset

`implementation-doc-writer` updated `war-council-ui/` (duel-health-bars, README, accessibility,
apply-damage-plate), `hunt/` (envenom-and-the-delayed-hit, README), the top-level index, and
`.docs/game_rules/the-hunt.md`. Marker movements: *pending poison has a surface* went
`[not built]` → `[settled]`; two new `[not built]` rows were carved out of it (the hit **landing** is
still unannounced; a held Guard is still invisible); three new `[provisional]` rows. **Nothing was
promoted to `[settled]` on this run's authority.**

It also corrected **two pre-existing doc errors**: `the-hunt.md` twice said poison was "2-and-3"
damage when the constants are **2 and 4**, and two docs still claimed `hasPendingEnvenom` had no
caller, which DLR-94 gave it.

---

## DLR-106 — Cross-run persistent storage layer

Task under epic DLR-103, label `engine`. Plan folder:
`.claude/contract/DLR-106-cross-run-persistent-storage-layer/`. The ticket asked for a generic
persistence wrapper with no Vault fields, and separately asked whether `.claude/rules/` should gain
the `save-data-versioning.md` rule its own README names as a candidate first rule.

### Gates skipped, and what was taken instead of pausing

- **Plan approval gate auto-approved.** `plan.md` was never read by a human. Every default below was
  taken on the plan's own authority.
- **No mockup was produced, and none was skipped unseen.** The work is pure logic, renders nothing,
  and touches no `.tsx` file — Step 3.5 of `/fb-plan` does not apply to non-UI work, so there was
  never a mockup gate to override. This is *not* the DLR-101 case of an auto-approved unseen mockup.

### Architectural decisions taken without approval

- **A NEW top-level `src/` module was created: `src/persistence/`.** This is the sixth module in
  `src/`. *Alternative:* put it in `src/hunt/` alongside the rest of the engine. *Why the default
  went the other way — it is forced, not chosen:* `eslint.config.js` scopes a `no-restricted-globals`
  override to `src/warCouncil/**` and `src/hunt/**` that explicitly bans the `localStorage` global
  with the message "This module must not touch browser storage." A persistence layer cannot live
  behind that boundary. `src/app/` was rejected because the module is not UI.
- **`src/persistence/**` was deliberately NOT added to the ESLint pure-core override.** One file in
  it (`browserStorage.ts`) must legitimately do the thing that override bans, so a lint rule there
  would be a rule the module exists to violate. The boundary is instead held by keeping the
  `localStorage` access to that single file and grepping for it in Final verification. **This is a
  weaker guarantee than the other two modules have, and nobody signed off on the trade.**
- **Storage is INJECTED, not reached for.** `createSaveStore` takes a `StorageLike`
  (`getItem`/`setItem`/`removeItem`); only `browserStorage.ts` names `globalThis.localStorage`.
  Partly forced: `vite.config.ts` runs every `*.test.ts` under the **node** project where
  `localStorage` does not exist, so a module reaching for the global could not be unit-tested at all
  without moving its spec to `.test.tsx` and pulling in jsdom to test something with no DOM in it.
  *Alternative rejected:* stub the global via `globalThis` assignment in tests, which is the
  leaks-between-tests trap `web-project.md` names.

### Storage-key and schema choices — all assumed, none chosen by a human

- **`SAVE_NAMESPACE = 'strings-and-stations'`.** *Alternative:* the game's working title ("The
  Hunt"), or a shorter prefix. *Reasoning:* the game's title has already changed once during this
  project, and a storage key that renames orphans every save already on a player's disk with nothing
  able to find it again. The repository name is the more stable of the two. **This is the one literal
  in the module that cannot be changed after a real save exists in a real browser. It shipped
  unreviewed. Look at it before anything writes a save for real.**
- **`SAVE_KEY_SEPARATOR = ':'`**, giving keys of the form `strings-and-stations:vault`.
  *Alternatives:* `.`, `/`, `__`. Picked as the near-universal `localStorage` convention and because
  it cannot collide with a section name made of identifier characters.
- **The schema version lives INSIDE the stored envelope (`{ version, data }`), not in the key.**
  *Alternative:* a versioned key such as `…:vault:v2`. *Reasoning:* a versioned key orphans the
  previous key on every upgrade — unfindable and unclearable — and forces a reader to guess which old
  versions to probe for. Version-in-envelope means exactly one key per section for all time.
- **`SAVE_SCHEMA_VERSION = 1`.** Recorded for completeness but claimed as a schema *identity*, not a
  tuning value — there is one correct value for the first version of a schema.
- **The version seam ships EMPTY.** A v1 store handed a v2 record returns `VersionMismatch` and the
  caller's default; the save is neither migrated nor deleted. **Whether an unmigratable save should
  be DISCARDED is a design question with a player-facing consequence (losing a Vault balance) and was
  deferred to DLR-113 rather than decided here.**

### API-shape decisions assumed

- **`createSaveStore` requires an `isValidData` type guard from its caller — mandatory, not
  optional.** *Alternative:* trust the envelope and cast the parsed payload with `as T`, which is
  lighter for DLR-113 by about six lines. *Reasoning:* parsed JSON is `unknown`, and an unchecked
  cast would let a hand-edited or half-written `localStorage` value flow into game state typed as
  valid. **Reversible in one line if the developer would rather the Vault ticket trust the envelope.**
- **`read()` returns a FLAT `{ outcome, value }` rather than a discriminated union.** *Alternative:*
  `{ outcome: 'loaded', value: T } | { outcome: 'empty' }`, which would force every caller to switch.
  *Reasoning:* the flat shape means a caller that ignores `outcome` still gets a usable value, which
  is what AC2 asks for. **The cost is that TypeScript will not make a caller check the outcome** —
  defensive only in a codebase where callers are disciplined.
- **Nothing throws from the public surface, but nothing is swallowed either.** Five named read
  outcomes (`Loaded`/`Empty`/`Corrupt`/`VersionMismatch`/`Unavailable`) and three write outcomes
  (`Written`/`Rejected`/`Unavailable`) report every failure in-band. This was the reading taken of
  the `react-frontend` skill's "never swallow an error into a success shape" rule — the shape is not
  a success shape because the reason travels with the value. **A reviewer could reasonably have read
  that rule as requiring a throw instead.**
- **`clear()` removes only the store's own key** — never the namespace, never `localStorage.clear()`.
- **No React hook (`useSaveStore`) was written.** No component consumes the store on this ticket and
  the subscription shape depends on how the Vault screen reads it.
- **The in-memory driver ships in `src/`, not in a test folder**, because a future sibling module's
  tests cannot import from `src/persistence/__tests__/`.

### The shared rule — written on this ticket, and it binds every future ticket

- **`.claude/rules/save-data-versioning.md` was judged warranted and WRITTEN, rather than handed back
  as a finding.** The `.claude/rules/README.md` bar is "project data or constraints that more than
  one workflow could touch"; the epic queues DLR-113 (Vault), DLR-118 (Vault end-of-run screen) and
  DLR-123 (persistent deck) behind this module. **This is the project's first shared rule. Its reject
  conditions are read by `/fb-plan` and by all four reviewers from the moment the file exists, so
  this is the part of the ticket whose blast radius extends well past the module. It was written
  without review and it is worth reading in full.**
- `.claude/rules/README.md`'s "*(empty — no rules written yet)*" placeholder and its closing
  paragraph asserting the folder is "correctly empty" were both rewritten, since both became false.

### Doc ownership decisions

- **`.claude/workflow/web-project.md`'s layout block was updated** to name the new module and move
  its module/file counts, because that file is the named owner of "where code lives".
- **`CLAUDE.md`'s project-state paragraph was deliberately left alone.** It says "53 source files
  across four modules" and was already wrong before this ticket (`web-project.md` said five). Judged
  pre-existing drift and out of scope. **Both numbers are now further out of date than they were.**

### Naming collision flagged, not resolved

- **`ShopCategory.GamePermanent` already exists** in `src/hunt/shop.ts` and means "survives past one
  run" as a *design* rung on the shop's persistence-length ladder, with no storage implementation
  behind it. Nothing in this ticket connects the two. A future reader may reasonably expect them to
  be the same thing. Named here so DLR-113 makes the connection deliberately rather than assuming it.

### Scope extension taken during the fix pass, beyond the contract's own file map

- **`eslint.config.js` was modified, and it was never in the plan's file map.** The defender pointed out
  that the new rule file's reject condition 1 ("reject a change that calls `localStorage` outside
  `browserStorage.ts`") was enforced by **nothing** — the existing `no-restricted-globals` override
  covers only `src/warCouncil/**` and `src/hunt/**`, so a future `src/app/Vault.tsx` calling
  `localStorage.getItem` directly would have passed every gate. A second override was added across
  `src/**/*.{ts,tsx}` to close it. *Alternative:* leave the boundary as convention plus a grep and let
  DLR-113 deal with it. *Why the default went the other way:* the ticket's central deliverable is a
  rule, and a rule nothing enforces is advice. **Nobody approved this file being touched.**

### A regression this run introduced, caught late, and fixed — worth knowing about

- **That ESLint addition silently disabled the pure-core DOM bans on `src/warCouncil/**` and
  `src/hunt/**` for one round.** In ESLint **flat config**, two config objects matching the same file
  and setting the same rule key do **not** merge — the later one's options *replace* the earlier one's.
  The new `src/**` block sits after the pure-core block and matches the same files, so those two trees
  briefly lost their bans on `window`, `document`, `navigator`, `fetch`, `location`, `history`,
  `XMLHttpRequest`, `requestAnimationFrame`, `alert`, `matchMedia`, `Image`, `Worker` and the rest —
  keeping only the narrow storage ban. `npm run lint` still exited 0 throughout, which is exactly why
  it was invisible.
- **Two of the three round-2 reviewers asserted in prose that there was no shadowing and that flat
  config "merges both rule sets". Both were wrong.** It was caught by the code-evaluator and confirmed
  empirically with a throwaway probe file (`window.location` inside `src/warCouncil/` linting clean at
  exit 0). Fixed by adding `'src/warCouncil/**'` and `'src/hunt/**'` to the new block's `ignores`, so
  the original fuller override stays those trees' sole source of the rule — coverage is unchanged
  there, since that block already banned storage too. A comment above the new block records why the
  ignores must not be "tidied away".
- **Verified after the fix by direct probe, three ways:** `window` inside `src/warCouncil/` errors
  again (exit 1); `localStorage` inside `src/app/` errors citing the new rule doc (exit 1); a clean
  file in `src/hunt/` passes (exit 0). All probe files were deleted.
- **This cost a third fix touch, one beyond the pipeline's 2-round ceiling.** Taken deliberately rather
  than shipping a silent hole in an architectural boundary that predates this ticket. **The general
  lesson is worth keeping: `npm run lint` exiting 0 does not prove a lint boundary still fires.**

### Other reviewer findings deliberately NOT acted on

- **`options.version` is not guarded against `NaN`/`Infinity`.** `NaN !== NaN` is always true, so a
  caller passing `NaN` would make every read report `VersionMismatch` forever. Left alone: it is a
  construction-site argument, not storage input. Flagged by the defender as Info.
- **The two unguarded throw sites WERE fixed** — `getItem` in `read()` (now returns `Unavailable`) and
  `removeItem` in `clear()` (now a silent no-op) — because the module's docblock promised "never
  throws" while only `JSON.parse` and `setItem` were actually guarded. Two specs were added.
- **The rule file's original "How to verify" grep was rewritten.** As first written it matched the bare
  word `localStorage` and hit five files, four of them docblock prose — i.e. it failed on day one
  against correct code. Now anchored on real access. **A verification step that cries wolf immediately
  is worse than none, and it nearly shipped.**

## Coordinator decisions — DLR-106 reconciliation

- **Accepted a deliberate breach of the 2-round fix ceiling.** The DLR-106 agent took one touch
  beyond the ceiling to close a lint hole it had itself opened mid-run: a second
  `no-restricted-globals` block silently disabled the `window`/`document`/`fetch` bans on
  `src/warCouncil/**` and `src/hunt/**`, because flat config replaces rather than merges
  same-key rule options — and `npm run lint` exited 0 the whole time. Pushed anyway. The
  ceiling exists to stop code being flailed at until it goes green; this was the opposite,
  a verified fix to a boundary that predates the ticket, with all four gates green after.
  Shipping the hole to honour the letter of the ceiling would have been the worse call.
- **Accepted a scope extension outside the plan's file map:** `eslint.config.js` was modified
  to make the new save-data rule's first reject condition an actual enforced gate rather than
  prose. Flagged because "nothing outside the task's Files block may be touched" is normally
  a hard rule.
- **Note for the end-of-run review:** two of three round-2 reviewers asserted in prose that no
  shadowing existed. Both were wrong. Reviewer prose about a config file is not evidence.


## DLR-127 — Buying Envenom also grants a Cheat (out-of-band)

Run out-of-band between ticket 2 and ticket 3. Bug, epic DLR-103, label `engine`. Contract:
`.claude/contract/DLR-127-buying-envenom-also-grants-a-cheat/`.

### The headline finding: the ticket's root cause is wrong, and there is no production defect

`buyFromShop`'s Envenom branch (`src/hunt/runTransitions.ts:205-206`) is
`return { ...paid, envenomCharges: run.envenomCharges + 1 }`. It does not touch `cheats`, and no
other branch of that switch touches a field belonging to a different item. Nothing in the shop
grants two things for one price.

What was actually red: the assertion was `expect(buyFromShop(funded(3), Envenom).cheats).toEqual([])`,
and its fixture `funded` is built on `startRun()`, which seeds `grantCheats(RUN_STARTING_CHEATS, 1)`.
`RUN_STARTING_CHEATS` moved `0 -> 1` in commit `ccc07ec` ("Version 4"). From that commit onwards the
assertion has been failing on the run's **opening Cheat grant**, not on anything the purchase did —
`expected [ { id: 1 } ] to deeply equal []`. The sibling spec `run.shop.test.ts` never went red
because its fixtures are written `{ ...startRun(), coins: 5, cheats: [] }`, explicitly zeroing the
list; `envenom.test.ts`'s helper does not.

**Sibling purchases: none shares the defect, because there is no defect to share.** Cheat, Poison
Guard, Whetstone, Heal and `drinkFlask` were all checked, and all are now covered by a test rather
than by a reading of the switch statement.

### Assumptions taken instead of pausing — every one of these would normally have stopped the pipeline

1. **What the correct purchase behaviour IS — a game-design reading, taken without the developer.**
   Assumed: one purchase changes exactly one run field, plus `coins`. The alternative, which was
   live and is not absurd: an Envenom charge is *meant* to bundle a Cheat and the shop is
   under-delivering, which would make the fix a change to `buyFromShop` rather than to a spec.
   Rejected because no design document, ticket, or acceptance criterion anywhere describes a
   bundled purchase; `ENVENOM_PRICE` is 2 against `CHEAT_PRICE` of 1 with no note of a bundle; and
   DLR-127 itself frames the extra Cheat as the bug. **This is the assumption to check first if
   this ticket is ever revisited.**
2. **`RUN_STARTING_CHEATS = 1` is intended and stays at 1.** The alternative diagnosis is that the
   config value is the bug — the run is meant to open with no Cheats and the original absolute
   assertion was right all along. Not taken: that is a tuning value and a gameplay change to the
   player's opening loadout, which is the developer's alone. `src/hunt/config.ts` was not touched.
3. **"Make the test pass without weakening it" was interpreted as "assert strictly more", not "do
   not edit the test file".** Under the second reading no fix exists at all, since the production
   code is already correct. The replacement asserts `after.cheats` `toEqual(before.cheats)` AND
   `toBe(before.cheats)` — so it fails on a Cheat added (all the original caught), on a Cheat
   removed, and on the list being needlessly rebuilt — plus `expect(before.cheats).toHaveLength(
   RUN_STARTING_CHEATS)` so the check cannot degenerate into `expect([]).toEqual([])` if that key
   is ever retuned back to 0. Judged a strengthening; a developer could reasonably read it as
   non-compliance with the ticket's wording.
4. **The ticket's "Flask" sibling was read as `drinkFlask`, not as a shop item.** `SHOP_ITEMS` is
   `[Cheat, Envenom, PoisonGuard, Whetstone, Heal]` — the flask is not purchasable. Covered as a
   transition rather than skipped on a technicality.
5. **Plan approval gate: auto-approved unseen**, per this run's override. No `AskUserQuestion` was
   raised at any point. The Step 1.5c skill-confirmation question was also skipped; the skill list
   (`react-frontend`) was taken as classified.
6. **Mockup gate: not applicable** — the work is pure-logic/test, classified non-UI, so no mockup
   was generated and none was auto-approved unseen. Nothing rendered changes in this ticket.
7. **Regression-guard design choice, made without review:** the new spec compares top-level
   `RunState` fields by REFERENCE (`Object.is`), not by deep equality. Exact for this module
   because every transition is an immutable spread, but it means a future rewrite that rebuilds an
   untouched field to an equal-but-new object will fail this spec as a false positive. Accepted
   deliberately — the deep-equality alternative would report the Heal's rebuilt `encounter` as
   unchanged whenever the player was already at full health, which is exactly a case worth failing
   on.

### For the developer

- Confirm or reject assumption 1. If a purchase really is supposed to bundle a Cheat, this ticket
  fixed the wrong file and `buyFromShop` is what needs changing.
- Decide assumption 2: should a run open holding a Cheat? Currently yes, `RUN_STARTING_CHEATS = 1`.
- Nothing here needs to be judged in the running app — no rendered surface changed and no tuning
  value moved.

### What changed, and the gates

Two spec files, no production file:
- `src/hunt/__tests__/envenom.test.ts` — modified. `RUN_STARTING_CHEATS` imported; the assertion now
  binds `before`/`after`, asserts `toHaveLength(RUN_STARTING_CHEATS)` on the fixture, then
  `after.cheats` `toEqual(before.cheats)` AND `toBe(before.cheats)`.
- `src/hunt/__tests__/run.purchaseIsolation.test.ts` — created, 138 lines, 10 cases. A
  `changedFields(before, after)` reference-diff over top-level `RunState` keys, asserting the exact
  changed-field set for Cheat, Envenom, Poison Guard, Whetstone, Heal and `drinkFlask`.

Reviewers, round 1: Code-Evaluator **APPROVED**, Defender **APPROVED** (0/0/0), QA **FAILURES FOUND**
— a single mechanical Prettier violation in the new spec (a multi-line array literal Prettier wanted
collapsed). Fixed with `prettier --write` on that one file; gates re-run directly. One fix round of
the two available was used.

- `npm run typecheck` — exit 0
- `npm run lint` — exit 0
- `npm test` — exit 0, **`Test Files 85 passed (85)`, `Tests 1072 passed (1072)`, 0 failed**
  (baseline was 1061 passed / 1 failed of 1062)
- `npm run build` — exit 0, `dist/` written
- `npx prettier --check` on the two changed files — exit 0
- Pure-core boundary grep over `src/hunt` — 0 hits
- `git status --porcelain src` — exactly the two expected entries, no production file touched

### Coordinator note — a deviation worth seeing

**The verification round after the fix pass was run by the orchestrator directly, not by a second
three-reviewer dispatch.** The fix was `prettier --write` on one test file — whitespace only, with
two reviewers already at zero issues — so all five gates plus the boundary grep and the
`git status` scope check were re-run as commands and their real output quoted above. Cheaper than a
full re-dispatch and the evidence is the same deterministic output; flagged because "re-review with
all three in parallel" is what `/fb-apply` Step 6 says.

`.docs/game_rules/the-hunt.md` was checked and **not** edited: the contract changed two Vitest specs
and nothing a player may do, must do, or is scored on. `.docs/implementation/hunt/README.md` and the
top-level index gained the purchase-isolation invariant and the assert-against-the-pre-value lesson.

## Coordinator decisions — DLR-127 reconciliation

- **The ticket I raised was wrong, and the agent refuted it rather than obeying it.** DLR-127
  asserted a production defect: that `buyFromShop` bundles a Cheat with an Envenom purchase.
  It does not — its Envenom branch never touches `cheats`. The test began failing when
  `RUN_STARTING_CHEATS` moved `0 → 1` in commit `ccc07ec`, so a fixture derived from
  `startRun()` no longer had an empty `cheats` array. Stale assertion, not a bug. Pushed as a
  test-only change; **no production file was modified**. Recorded here because the DLR-101
  agent reported it as a defect, the coordinator raised a Jira Bug on that report, and both
  were wrong — the transcript should not read as though a real bug was fixed.
- **Accepted a skipped reviewer re-dispatch.** The fix pass was a whitespace-only Prettier
  reformat of one test file with two reviewers already at zero issues; the agent re-ran all
  four gates directly instead of re-dispatching three reviewers. Proportionate.
- **New baseline for the rest of the run: the suite is fully green, 1072/1072, 0 failures.**
  The "ignore the known pre-existing failure" instruction is withdrawn from all later ticket
  prompts. Any failure a later agent sees is now its own.

### Open questions this raised, for the end-of-run review

1. **Is an Envenom purchase meant to bundle a Cheat?** If yes, this ticket fixed the wrong
   file and `buyFromShop` is what needs changing.
2. **Should a run open holding a Cheat?** `RUN_STARTING_CHEATS = 1`. The alternative diagnosis
   is that this tuning value is the defect and the original assertion was right all along.

## DLR-107 — Migrate Cheat and Timebomb into the ordinary buff pile

**Result: GREEN.** Contract `.claude/contract/DLR-107-migrate-cheat-and-timebomb-into-the-buff-pile/`,
3 phases / 8 tasks, all ticked. All three reviewers approved on round 1 — Code-Evaluator `APPROVED`,
Defender `APPROVED` (0 Critical / 0 Warning / 0 Info), QA `ALL PASSED`. **Zero fix rounds used** of
the two available.

### Gate results

- `npm run typecheck` — exit 0, zero errors
- `npm run lint` — exit 0, zero errors, zero warnings
- `npm test` — exit 0, **`Test Files 86 passed (86)`, `Tests 1089 passed (1089)`, 0 failed**
  (baseline was 1072/85; delta is +1 file and +17 tests — 16 new in `buffCatalog.test.ts`, 1 appended
  to `buffs.test.ts`)
- `npm run build` — exit 0, `dist/` written, built in 176ms, no bundler errors
- `npx prettier --check` on the five contract files — exit 0
- Pure-core boundary grep over `src/hunt` — 0 hits
- Bronze row not a literal (`quarry: 4|player: 2` in `buffCatalog.ts`) — 0 hits, derived as intended

### Files

Three production files, two spec files, no UI file, no `.tsx` file:

- `src/hunt/buffs.ts` — modified. `BuffKind` (`unassigned`/`cheat`/`timebomb`),
  `ACTIVATED_BUFF_CONDITION`, a **required** `kind` field on `Buff`, and `kind: BuffKind.Unassigned`
  on the seeded placeholders.
- `src/hunt/buffCatalog.ts` — created, 156 lines. `TimebombDamage`, `CHEAT_DURATION_TRICKS`,
  `TIMEBOMB_TIER_MULTIPLIER`, `TIMEBOMB_DAMAGE` (derived via a private `timebombRow`), `cheatBuff`,
  `timebombBuff`, `cheatDurationTricksOf`, `timebombDamageOf`.
- `src/hunt/index.ts` — modified, barrel exports.
- `src/hunt/__tests__/buffs.test.ts` — modified. Three literal shape assertions widened for `kind`;
  one new case pinning `BuffKind`'s member set.
- `src/hunt/__tests__/buffCatalog.test.ts` — created, 16 cases.

### Approval gate — what was auto-approved, and no mockup

The `/fb-plan` `AskUserQuestion` gate was **overridden**, per this run's standing instruction.
`plan.md` was self-reviewed but never shown to the developer, and `tasks.md` carries a note saying so.
**No mockup was built or auto-approved unseen** — Step 1.5's classification found no UI component in
scope (Pure logic + Config and tunables only), the contract touches no `.tsx` file, and Step 3.5
therefore did not run. Nothing visual went unreviewed because nothing visual was produced.

### Behaviour changes the migration forced — the important section

**None reached a player. That is the headline, and it is deliberate rather than lucky.**

1. **Cheat's live behaviour is unchanged.** Old: `LegalMoveOptions.ignoreFollowSuit` lifts follow-suit
   for exactly one committed card, armed through the felt's two-click `CheatStage` ritual. New: still
   exactly that. `CHEAT_DURATION_TRICKS[bronze] = 1` is the buff-pile statement *of that same rule*,
   and a test asserts it. Silver (2 tricks) and gold (3 tricks) exist as data with **no consumer** —
   nothing in `src/` activates a buff or mints a non-bronze one outside a test.
2. **Timebomb/Envenom's live damage is unchanged.** Old: `ENVENOM_QUARRY_DAMAGE = 4` /
   `ENVENOM_PLAYER_DAMAGE = 2`, applied by `envenomDamageFor` through the three-tap `EnvenomStage`
   ritual. New: still exactly that. `TIMEBOMB_DAMAGE[bronze]` **reads those two constants** rather
   than restating 4 and 2, so the bronze row is today's live pair by construction; a test asserts the
   equality against the constants, not against literals, so retuning the live mechanic moves the table
   with it instead of reddening the spec.
3. **When Cheat/Timebomb can be held, drawn, activated or paid for did not change at all.** No shop
   branch, no `RunState` field, and no purchase shape moved — `run.purchaseIsolation.test.ts` was left
   completely untouched and stayed green, which is the evidence rather than the claim. Buying a Cheat
   still grants a `CheatCard`; buying Envenom still increments `envenomCharges`. Neither puts anything
   in the buff pile.
4. **One real structural change, and it is to a type rather than to play.** `Buff` gained a
   **required** `kind` field. That is a widening of a data model DLR-105 shipped four days ago, so
   every construction site had to name one — one production site (`seedStartingBuffPile`) and three
   literal test assertions, all changed in the same task. It is free today because the buff pile is
   **not persisted**; after DLR-113 (the Vault) the same change would need a `SAVE_SCHEMA_VERSION`
   bump.

**The one thing the developer must actually look at: Cheat and Timebomb now exist twice.** The live
bespoke mechanic the felt drives, and an inert `Buff` representation nothing reads. That is the
intended intermediate state of a migration split across tickets — but it is real, and it lasts until
the activation ticket (DLR-103 T5) and the UI ticket land.

### Plan defaults taken instead of pausing

Every one of these would normally have been an `AskUserQuestion` at the plan gate.

1. **AC3 — removing the old state machines — was deliberately NOT done.** The ticket contradicts
   itself: AC3 says remove the two-click `CheatStage` and three-tap `EnvenomStage` machines "once
   their behavior is proven equivalent", while the same ticket's Scope Boundaries say "the felt-rail
   UI removal — this ticket is engine-only, UI still points at the old mechanics until the UI ticket
   lands". Default taken: **the Scope Boundaries clause wins**, because it is the specific one and
   because nothing activates a buff, so no equivalence can be exercised end to end. Deleting live,
   tested UI the ticket forbids touching would have been an unrequested behaviour change. **This is
   the single largest deviation from the ticket as written and the first thing to sanity-check.**
2. **AC4's "ported" was read as *additive equivalence coverage*, not *rewritten*.** The live Cheat and
   Envenom specs cover mechanics that are still live and still correct; rewriting them against a path
   nothing executes would have deleted real coverage and replaced it with none. Default taken: leave
   them untouched and add assertions that each new tier table's bronze row equals today's live figure
   **by reference to the constants**. QA confirmed the live specs in `src/app/warCouncil/__tests__/`
   remain green and untouched.
3. **`Buff` gained a `kind` identity field, because DLR-105 shipped none.** DLR-105's AC1 said
   "identity", but the type it shipped has `id`/`tier`/`condition`/`reward` and nothing naming which
   card a buff is. Without this, AC1 and AC2 are literally unstatable. Default taken: a closed
   `as const` map, separate from `condition.kind` (which describes a *trigger*, not an identity).
   **This is a change to another ticket's data model** and the developer may prefer the discriminator
   live elsewhere — cheap to red-line now, expensive once the slot machine and the Vault both
   construct buffs.
4. **`TIMEBOMB_TIER_MULTIPLIER = { bronze: 1, silver: 2, gold: 3 }` — AN UNCHOSEN TUNING VALUE.**
   Neither the ticket nor design doc §3 states Timebomb's tier magnitudes; §3 says only "Timebomb's
   tier is damage" and leaves the numbers open. Normally this is a hard pause — a tuning value is
   never an agent's to choose. Default taken under the run's override: 1/2/3, from the only tier
   curves the sources *do* state (AC1's Cheat duration, and §3's Shield bullet, both 1/2/3). **It
   yields 4/8/12 to the Quarry and 2/4/6 to the player.** A gold Timebomb costing the player 6 of a
   10-point bar is a large self-inflicted hit and may want a flatter curve. One place to change it.
5. **AC2's open question resolved to "scale both sides on the 2:1 ratio"** — the reading AC2 itself
   names as the default, so this is transcription rather than a choice. Recorded in a comment beside
   the table as AC2 requires, *and* enforced structurally: the multiplier is applied to both
   `ENVENOM_*_DAMAGE` figures through one helper, so the ratio holds as arithmetic rather than as
   three hand-typed pairs. The rejected reading (raise only the Quarry side) is refuted in that
   comment — it would make a gold Timebomb a free upgrade with no added downside.
6. **The tier tables live in `src/hunt/buffCatalog.ts`, not `src/hunt/config.ts`.** Every other
   tunable in this module is in `config.ts` — but `config.ts` measures 385 lines against a blocking
   400-line budget and these tables plus AC2's required comments need ~40. Default taken: a
   topic-scoped constants-plus-factories module, re-exported through the barrel so no consumer can
   tell the difference. The alternative was a budget breach or an arbitrary mid-file split of
   `config.ts` this ticket has no other reason to make.
7. **`ACTIVATED_BUFF_CONDITION`'s `'activated'` string** enters a condition-catalog vocabulary design
   doc §5 explicitly does not own yet. `BuffCondition.kind` is an open string by DLR-105's design so
   this costs nothing structurally, but whoever authors the real catalog (DLR-103 T7a) should know the
   name is taken.
8. **Timebomb's `BuffReward` stayed single-axis.** Its reward carries only the Quarry-side figure
   (`axis: magnitude`); the paired player figure comes back from `timebombDamageOf`. Widening
   `BuffReward` to a pair would reopen a shape decision DLR-105 made explicitly and defended, and §5
   itself defers the multi-value-reward question. Worth a second look when the slot machine needs to
   render a Timebomb's payoff from `reward` alone.
9. **No shop, purchase, or `RunState` change.** "Migrate into the pile" could be read as "buying a
   Cheat now puts a `Buff` in the pile". Default taken: **no**. Nothing activates a buff yet, so the
   pile entry would be inert while the `CheatCard`/`envenomCharges` it replaced were still what the
   game actually spends — the player would own two representations of one thing, with only one of them
   working. It would also have changed the exact changed-field sets `run.purchaseIsolation.test.ts`
   asserts, which is precisely the silent purchase-shape change that test exists to catch.

### `.claude/rules/save-data-versioning.md` — checked, does not fire

Confirmed by the plan's audit and independently by the Defender: nothing this ticket touches is
persisted. `RunState.buffs` is in-memory only (DLR-105); grep for `buff` under `src/persistence/**`
returns 0 hits; no `localStorage`/`sessionStorage` reference was added; no key was composed by
concatenation; no envelope was written. `SAVE_SCHEMA_VERSION` stays at 1. **Noted as a timing risk
rather than a clean pass:** adding a required field to `Buff` is free *only* because the pile is not
saved yet. DLR-113 (the Vault) closes that window, and the same change after it would be a versioned
one.

### Docs

- `.docs/implementation/hunt/cheat-and-timebomb-buffs.md` — **created**. The `BuffKind` field and why
  it is separate from `condition.kind`, the Cheat duration table and its gold-tier warning, how
  `TIMEBOMB_DAMAGE` derives so neither the ratio nor the bronze row can drift, the throwing readers,
  the module-init ordering trap, the two deliberate non-decisions, and the unchosen multiplier.
- `.docs/implementation/hunt/buff-pile.md` — **updated**. Its "`Buff` has four fields" claim and its
  closing "nothing here has a consumer yet" paragraph were both made stale by this ticket; both now
  say what is actually true and link to the new file.
- `.docs/implementation/hunt/README.md` and `.docs/implementation/README.md` — **updated**. `DLR-107`
  appended to both `Built by` lines (checked together, since a half-applied edit there is the common
  failure), eight new `Key types & exports` rows, and a new How-it-works index entry.
- **`.docs/game_rules/the-hunt.md` was checked and deliberately NOT edited.** DLR-107 changed no
  procedure, no scoring rule, no number any rule states, and graduated no `[not built]` rule: Cheat's
  live rule (one card's follow-suit lift) and Envenom's live figures (4 to the Quarry, 2 to the
  player) are both unchanged, and the new tier tables have no consumer, so no player can reach a
  silver or gold tier of either. Its Status register names no file this contract renamed or deleted.

### Deviations from the pipeline worth seeing

- **`pr-description.md` (Task 8) was written by the orchestrator rather than dispatched to the
  Implementer.** It is a plan-folder prose document with `Skill: none`, not source code, and it needed
  the verification numbers QA had just produced. Flagged because "all code changes go through the
  Implementer" is the standing rule; no code was involved.
- **Phase 3's greps and gates (Tasks 5-7) were delegated to QA rather than run by the Implementer**,
  which is what `/fb-apply` prescribes for the unfiltered suite and the build. QA ran all of them and
  quoted real output, including reporting **3** hits on the `'timebomb'|'activated'` bare-string grep
  where the contract predicted 2 — the third being the member-set pinning assertion the contract
  itself specifies verbatim, not a call site binding by string. Reported honestly rather than rounded
  to the expected number.

## Coordinator decisions — DLR-107 reconciliation

- **Accepted the AC3 deferral, and it leaves a seam every later ticket must know about.**
  DLR-107 contradicts itself: AC3 says remove the old `CheatStage`/`EnvenomStage` machines,
  while its own Scope Boundaries put the felt-rail UI removal out of scope. The agent took the
  specific clause over the general one, which is the right reading. **Consequence: Cheat and
  Timebomb now exist twice** — the live mechanic the felt actually drives, and an inert `Buff`
  representation in `buffCatalog.ts` that nothing reads yet. Pushed deliberately. Every later
  ticket in this run that touches buffs is being told which of the two is live, so the
  duplication is retired by a ticket that owns it rather than by accident.
- **Accepted an unchosen tuning value.** `TIMEBOMB_TIER_MULTIPLIER = {bronze 1, silver 2,
  gold 3}` — neither the ticket nor hybrid-design §3 states Timebomb's tier magnitudes, so
  this would normally be a hard pause. It yields 4/8/12 Quarry-side and 2/4/6 player-side,
  meaning **a gold Timebomb costs the player 6 of a 10-point bar**. Flagged for the developer:
  a flatter curve may be wanted. Bronze is safe by construction — it reads the existing
  `ENVENOM_QUARRY_DAMAGE` / `ENVENOM_PLAYER_DAMAGE` constants rather than restating 4 and 2.
- **Accepted a widening of the DLR-105 model:** `Buff` gained a required `kind` discriminator,
  without which AC1/AC2 were unstatable. Free today only because the pile is not yet persisted
  — **after DLR-113 this would need a schema bump** under the new save-data rule. Whether
  `kind` is the right home for the discriminator is cheap to change now and expensive once the
  slot machine (DLR-112) and the Vault (DLR-113) both construct buffs.
- No player-visible behaviour changed. `run.purchaseIsolation.test.ts` was left untouched and
  stayed green; no `.tsx` file was modified.


---

## DLR-111 — Design: author the v1 buff card list

**Slug:** `DLR-111-author-v1-buff-card-list` · **Status:** GREEN · **Label:** `design` (docs-only, zero `src/` diff)

Pulled ahead of DLR-108 and DLR-112 deliberately: both consume this list, and building either
against a placeholder would bake the placeholder in.

**What was already on disk.** The developer had already done the hard half at `d412b58`:
`v1-buff-card-list.md` (103 lines) plus `DLR-111-v1-buff-list-review.txt` settle *which* templates
ship, their reward pairings, their tier magnitudes and the three-category taxonomy. Those were
treated as inputs, not questions. This ticket added the layer DLR-108/DLR-112 actually need: a name
and an AP cost for every card, `MAX_REFUND_PER_HAND`, and a statement of where the list fits
`buffCatalog.ts`. The doc went 103 → 531 lines.

### Plan defaults taken (gate overridden, nothing developer-confirmed)

- **Plan approval gate auto-approved unseen.** `tasks.md` carries the note.
- **No mockup was built or auto-approved** — the work is non-UI, so Step 3.5 skipped silently. Nothing
  was approved sight-unseen on the UI side.
- **Reviewer trio not dispatched.** No `src/` path in the file map — the standing docs-only precedent.
  The four gates were still run in full (below).
- **Skill classified `game-designer`, not `react-frontend`** — the legitimate non-code case.
- **`game-designer`'s "never pick a tuning value" rule was deliberately deviated from**, per this run's
  override. Every chosen number is marked *agent-chosen, 2026-08-23* inside the document so a later
  reader cannot mistake it for a developer decision the way §9's Decided rows read.
- **Open items resolved:** passive buff stacking → stays a separate ticket; combo template #16 → stays
  excluded either way; `MAX_REFUND_PER_HAND` → **6**; Hoarder/Unbloodied keep all four rewards.
- **Cheat and Timebomb were added to the list.** Absent from the developer's draft, but design doc §1
  folds both into the buff pile and `buffCatalog.ts` already mints them. The draft's pool total of
  **76 was wrong**; it is **78**.

### The cost model — one formula, two small tables

`apCost = clamp(REWARD_BASE[axis][tier] + CONDITION_MODIFIER[family], 1, 6)`

Retuning all 78 costs is a two-table edit, not 78 edits. Calibrated against `STARTING_AP = 6` per
hand and the design doc's own `3 AP` working figure for one standard buff.

| REWARD_BASE | bronze | silver | gold |
|---|---|---|---|
| Blade (flat damage) | 1 | 2 | 3 |
| Purse (coin) | 2 | 3 | 4 |
| Second Wind (AP refund) | 1 | 1 | 1 |
| Momentum (multiplier) | 2 | 3 | 5 |

Multiplier and coin carry a surcharge over flat damage as a **derived** consequence, not a
preference: the bank counts tricks and the multiplier climbs 1 per trick taken, cashing as their
product, so at a typical bank of 3 a `+2 multiplier` is worth ~6 damage where `+1 damage` is worth 1.

The condition modifier is a **discount for unreliability**, not a surcharge for difficulty — a card
that fires most hands is worth more AP than one that rarely fires.

### Every card and every number chosen

Condition families (71 templates). Costs read bronze/silver/gold.

| Family | Condition | Mod | Blade | Purse | Second Wind | Momentum | Cards |
|---|---|---|---|---|---|---|---|
| Taker | Win a trick with suit S | 0 | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 | 12 |
| Feeder | Lose a trick with suit S | +1 | 2/3/4 | 3/4/5 | 2/2/2 | 3/4/6 | 12 |
| Mark of the *R* | Win a trick with rank R | −1 | 1/1/2 | — | — | 1/2/4 | 22 |
| Sidestep | Dodge a skull with this card | −1 | 1/1/2 | — | — | 1/2/4 | 2 |
| Glutton | Eat a skull with this card | 0 | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 | 4 |
| Hoarder | Reach a bank of N (2/3/4) | 0 | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 | 4 |
| Unbloodied | Survive N tricks unhit (2/3/4) | 0 | 1/2/3 | 2/3/4 | 1/1/1 | 2/3/5 | 4 |
| Long Fall | Lose the next N tricks | — | — | — | — | — | **DEFERRED** (AC3) |
| Debt Collector | Apply Damage this hand | +1 | 2/3/4 | 3/4/5 | 2/2/2 | 3/4/6 | 4 |
| Keepsake | Hold suit S at hand's end | 0 | — | 2/3/4 | — | — | 3 |
| Miser | Have >= N coins (5/10/20) | −1 | 1/1/2 | — | — | 1/2/4 | 2 |
| Cornered | Below N% health (60/45/33) | −1 | 1/1/2 | — | — | 1/2/4 | 2 |

Reward tier magnitudes are the **developer's**, unchanged: Blade +1/+3/+5 · Purse +2/+5/+10 ·
Second Wind 1/2/3 · Momentum +2/+3/+5. Suits are Bells/Keys/Moons; ranks 1–11.

Consumables and activated cards (7 templates).

| Card | Effect | Tiers | AP cost |
|---|---|---|---|
| Ward | Single-use shield, absorbs up to N on the next hit | 1/3/5 absorbed | **2/2/2** (flat) |
| Puppeteer | Pick which of the opponent's legal moves they must play | single tier | **4** |
| Second Thoughts | Extra discard charges this fight | +1/+2/+3 | 2/3/4 |
| Foresight | Peek the draw pile | 1/3/5 cards | 1/2/3 |
| Spyglass | Rule out N candidates of a chosen suit | 1/2/3 ruled out | 2/3/4 |
| Cheat | Follow-suit lifted for N tricks | 1/2/3 tricks | **3/5/7** |
| Timebomb | Delayed hit, Quarry vs player | 4/8/12 vs 2/4/6 | **2/2/2** (flat) |

`MAX_REFUND_PER_HAND` = **6** — equal to `STARTING_AP`, so a hand can at most double its budget and
a refund chain cannot fund unbounded activations. Satisfies AC4. Design-doc figure only; DLR-108
creates the `config.ts` key.

**Three off-curve prices, each a design claim rather than arithmetic.** Ward is flat because
`DAMAGE_PER_HIT = 1` makes absorbing 1, 3 or 5 the same outcome, so charging more taxes the player
for a better reel that buys nothing. Gold Cheat at **7 AP is above the 6-AP starting budget on
purpose** — unplayable until the `+5 AP` capacity item is bought, which is the costing pass design
doc §3 asked for on "three tricks of no-follow-suit is close to a guaranteed run of wins". Timebomb
is flat because its tier price is paid in health (2/4/6 of a 10-point bar).

**No disagreement with `TIMEBOMB_TIER_MULTIPLIER = {1,2,3}`.** Stated explicitly in the doc, as this
run's dispatch required. The flat AP price is precisely what keeps the whole tier cost in the health
figures rather than billing the same escalation twice.

### The three least-confident items — start the review here

1. **Ward silver and gold.** Effect-identical to bronze while `DAMAGE_PER_HIT = 1`. If that constant
   never moves, **delete these two rows** rather than retune them. The weakest items on the list.
2. **Bronze `Second Wind` is net-zero by construction.** The developer's refund ladder is 1/2/3 and
   the cheapest activation is 1 AP, so a bronze Second Wind refunds exactly what it cost — a null
   card. Kept as the pool's deliberate floor card because that preserves a developer-set ladder;
   raising the ladder to **2/3/4** is the better card and is the developer's to take.
3. **Miser (>= N coins) fights the shop.** It pays an in-hand reward for a run-long behaviour — not
   spending — and the shop is the run's only progression lever. Structural, not a costing problem;
   no AP price fixes it. Candidate for deletion.

### The one place this contradicts a developer note

**Open item 5 was overturned, deliberately and visibly.** The review file flags Hoarder's and
Unbloodied's four-reward lists as "worth a second look". The document keeps all four and argues why
(both are hand-shaped goals; a Hoarder paying multiplier compounds with the bank that earned it),
and flags the overturn in a blockquote rather than folding it in silently. The developer's call to
confirm or reverse.

### Shape gaps DLR-108 and DLR-112 inherit

Verified by grep, not asserted. Three are ordinary widenings; one is a genuine misfit; one is a
field that does not exist.

1. `BuffKind` holds exactly **3** members today (`Unassigned`/`Cheat`/`Timebomb`); it needs one per
   template family — 11 condition families + 5 consumables.
2. `BuffRewardAxis` holds exactly **3**; it needs eight more (`Coins`, `ApRefund`, `Multiplier`,
   `CardsRevealed`, `CandidatesEliminated`, `DiscardCharges`, `DamageAbsorbed`, `None`). DLR-105's
   own comment already anticipates this. `BuffTier` fits unchanged.
3. **Genuine misfit:** `BuffCondition` is `{ readonly kind: string }` with **no payload**, but
   Taker/Feeder/Keepsake are suit-parameterised and Mark-of-rank is rank-parameterised. The doc
   recommends an optional `target?: { suit?; rank? }` over baking 33 variants into `BuffKind`.
4. **`Buff` carries no `apCost` at all** — **0 hits** in `buffs.ts` and `buffCatalog.ts` (the only
   `src/` hits are `apCostFor`/`apCostGiven` in `actionPoints.ts`). Every number authored here has
   no home on the type today. **DLR-108's first job.**

Also recorded in the doc: DLR-107's deferred AC3 leaves Cheat and Timebomb existing twice, and
**this list targets the `buffCatalog.ts` representation**, not the live felt mechanic.

### Gates — all four green, on a zero-code diff

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | **1089 passed / 1089**, 86 files, 0 failed — baseline held exactly |
| `npm run build` | exit 0, `dist/` written (259.09 kB js, 37.95 kB css) |

`git status --porcelain src` → no output, as the file map requires.

### Coordinator decisions — DLR-111

- **Every one of the 78 AP costs is an agent-chosen tuning value.** Under `CLAUDE.md`'s normal pause
  condition all 78 are the developer's. This run overrides that pause and required they be chosen
  and justified, so they were. They are marked agent-chosen *inside the document itself*, not only
  here — the failure mode worth guarding against is a later reader treating them as settled.
- **Card names are copy and have had no tonal review.** Blade / Purse / Second Wind / Momentum plus
  twelve family words are functional identifiers first, offered rather than settled.
- **Nothing on this list has been played.** Every figure is reasoned, not measured. Whether the cost
  bands feel right in a hand is exactly the question only the developer can answer.
- **`.docs/game_rules/the-hunt.md` was not touched**, correctly — every card here is `[not built]`,
  and that file is the ruleset, not a design backlog.

## Coordinator decisions — DLR-111 reconciliation

- **78 AP costs and `MAX_REFUND_PER_HAND = 6` were chosen by an agent, not by the developer.**
  This is the single largest concentration of unapproved tuning in the run. Accepted because
  the ticket's whole deliverable is content and the run's pause override covers exactly this,
  but the review burden is real. Mitigated two ways, both of which held: the costs derive from
  a **two-table formula** (`REWARD_BASE[axis][tier] + CONDITION_MODIFIER[family]`, clamped
  1–6), so retuning all 78 is a two-table edit rather than 78 edits; and the agent marked them
  as agent-chosen **inside the design document**, not only in this log, so a later reader
  cannot mistake them for settled.
- **Accepted a correction to the ticket's own premise.** The draft's pool total of 76 was
  wrong: Cheat and Timebomb were missing, though design §1 folds both into the buff pile and
  `buffCatalog.ts` already mints them. The list ships at **78 templates**.
- **Accepted the overturning of a developer note.** Open item 5 — the developer flagged
  Hoarder/Unbloodied's four-reward lists as "worth a second look"; the doc keeps all four and
  argues the case in a blockquote rather than folding the change in silently. The one place
  this run contradicts a written note of the developer's, so it is called out here and in the
  doc.
- **Accepted the docs-only reviewer skip.** No `src/` path in the file map, so the reviewer
  trio was not dispatched, per the standing docs-only precedent. All four gates ran in full
  regardless: 1089/1089, baseline held exactly, `git status --porcelain src` empty.
- **`npm run format:check` is not clean** for the design doc — but 58 `.md` files fail
  repo-wide and did at HEAD too. Pre-existing, not one of the four gates, not this ticket's.

### Four shape gaps DLR-108 and DLR-112 inherit (grep-verified)

Carried into both later prompts so neither rediscovers them:

1. `BuffKind` has 3 members; the authored list needs ~16.
2. `BuffRewardAxis` has 3; needs 8 more.
3. `BuffCondition`'s payload-free `{ kind: string }` **cannot** express the suit- and
   rank-parameterised families. Recommendation on record: an optional `target`.
4. **`Buff` has no `apCost` field at all** (0 grep hits). That is DLR-108's first job.

## Developer input mid-run — "Envenom has been replaced by Timebomb"

Confirmed against the code at `2b33332`, and it changes the vocabulary for the rest of the run.

- **Timebomb is canonical. Envenom is the legacy name.** `TIMEBOMB_DAMAGE[bronze]` reads
  `ENVENOM_QUARRY_DAMAGE` (4) and `ENVENOM_PLAYER_DAMAGE` (2) rather than restating them, so
  the two are the same mechanic and the same figures by construction — not two mechanics.
- **The rename has only reached the new representation.** Timebomb: 5 files, all under
  `src/hunt/`, **read by nothing**. Envenom: 20 files, doing all the live work — the shop
  panel and labels, the felt, the round reducer, the health bars.
- **DLR-129 raised** to own the rename and the de-duplication in one place. Without it the
  rename would happen piecemeal across DLR-108, DLR-112, DLR-114 and DLR-116. It is scoped as
  rename-and-de-duplicate only, no behaviour or tuning change, and it carries the open copy
  question: the health bar currently announces "10 of 10. 4 poisoned." — whether Timebomb
  keeps poison vocabulary is a copy judgement and stays the developer's.
- **Every remaining ticket prompt now states that Timebomb is canonical**, so nothing new is
  built against the Envenom name.
- **Consequence for already-shipped work:** DLR-101 (`2c8f6bc`) shipped in the old vocabulary
  — the pending-poison hearts and the "4 poisoned" announcement. Functionally correct, wrong
  word. DLR-129 covers it.
- **Consequence for DLR-127's open questions:** both were phrased as "Envenom"; read them as
  "Timebomb". The answers are unchanged and the purchase-isolation test guards either way.


## DLR-124 — Design: cost the passive buff-stacking resolution rule

Docs-only. Slug `DLR-124-cost-the-passive-buff-stacking-rule`. Three design documents edited, two
implementation docs cross-referenced, **zero `src/` files**. Pulled ahead of DLR-108 and DLR-125,
both of which consume this rule.

### The headline: the proposal was rejected on *definition*, not on magnitude

The ticket asked whether "sum the rewards fired, then multiply by the count that fired" should ship.
It cannot ship, because **there is no scalar to sum**. A fired buff pays on exactly one of four axes
— Blade (flat damage), Purse (coins), Second Wind (AP), Momentum (multiplier) — four different units
with four different consumers and no exchange rate anywhere in the design. The `ideas.md` growth
table's "avg reward each: 3, 4, 5" column is a quantity the game cannot produce, so `2 → 12`,
`3 → 36` and `5 → 125` all inherit the defect. Every downstream figure in that table is unsound.

It fails on magnitude too — 123 damage on trick three of hand one, computed below — but that is a
consequence of the first failure, not an independent finding. **A rule with no defined operand
cannot be tuned into one**, which is why no amount of cap-picking would have rescued the original
shape. This was not visible from the ticket text; it only appears once the four reward axes are read
side by side.

### The rule that replaced it

| | Rule |
|---|---|
| **R1** | Resolution is **per-axis**. Four independent accumulators; no interaction across axes. |
| **R2** | Within an axis, contributions **add**. |
| **R3** | Per-trick order: **Second Wind → Momentum → the cash-out product → Blade → Purse.** |
| **R4** | Firing cadence: **event** / **threshold** / **terminal** (see below). |
| **R5** | **Overlap Bonus:** `k ≥ 2` buffs firing on a trick adds `+(k − 1)` Momentum. |
| **R6** | Four per-hand caps. **The cap counters reset per hand and NOT on a hit.** |
| **R7** | Contradictions are **structurally impossible in v1**; no buff ever cancels another. |

### Every number chosen, with its one-line justification

All are **agent-chosen under this run's override of `CLAUDE.md`'s tuning-value pause**, and all are
marked as agent-chosen *inside the design document*, not only here — same mitigation DLR-111 used.

- **`MAX_MULTIPLIER_BONUS_PER_HAND = 6`** — the natural six-trick multiplier ceiling, so bought
  multiplier can at most *double* the earned one. Identical reasoning to DLR-111's
  `MAX_REFUND_PER_HAND = STARTING_AP`, so the project gains no new principle, just a second use of
  one it already has.
- **`MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12`** — one third of a perfect hand's 36, so Blade can
  *finish* a hand and never *replace* the streak.
- **`MAX_COIN_BONUS_PER_HAND = 10`** — one gold Purse, the largest single coin reward the master tier
  list authorises. Coins are the only run-permanent axis, so coin inflation is the one stacking
  failure losing the hand cannot undo; stacking therefore never pays more than the best single card.
- **`MAX_REFUND_PER_HAND = 6`** — unchanged from DLR-111, restated so all four sit together.
- **Overlap Bonus = `k − 1` Momentum, linear** — this is the ticket's AC1 answer. Rejected
  alternative: co-triggering **pairs**, `k(k−1)/2`, which at the AP-affordable `k = 6` yields 15 from
  the bonus *alone* — two and a half times the entire natural multiplier ceiling — and grows as the
  square of exactly what the shop's `+5 AP` capacity item sells.
- **The bonus draws from the same pool as Momentum buffs**, rather than getting its own cap. Chosen
  because the consequence is desirable: a Momentum-heavy loadout has already spent the cap and gets
  no bonus, so the bonus is worth most to a **wide, mixed** loadout — which is the behaviour the
  original idea was reaching for.
- **Resolution order** — presented as *forced*, not chosen: `v1-buff-card-list.md` prices multiplier
  above flat damage (2/3/5 vs 1/2/3) **because** one is multiplied by the bank and the other is not.
  Momentum before the product and Blade after it is the only order consistent with that shipped
  pricing. Any other order silently re-costs the pool.
- **Firing cadence** — **event** (Taker, Feeder, Mark of the R, Sidestep, Glutton, Debt Collector:
  once per qualifying trick, many times a hand), **threshold** (Hoarder, Unbloodied, Miser, Cornered:
  once per hand on first crossing), **terminal** (Keepsake: at hand's end). Per-trick firing was taken
  because once-per-hand would make gold `Bell-Taker` at 5 AP strictly worse than bronze
  `Mark of the 9` at 1 AP, and because DLR-111 already prices Feeder *higher* on the stated grounds
  that "it fires close to every hand" — the shipped cost model already assumes repeat firing.

### The worked example's result

Seven buffs at exactly 11 AP (capacity item bought), 34-health Quarry, six tricks. Trick 1 fires
`k = 4` → Momentum pool 5/6; trick 2's Overlap Bonus caps it at 6/6; trick 3's `Sidestep (Momentum)`
is **clipped to 0**; trick 4 applies damage for `3 × 9 = 27` plus `+6` Blade **added after the
product** = 33; trick 6 cashes `2 × 2 = 4`.

| | Total damage |
|---|---|
| **This rule** | **37** (+5 coins, 2 AP refunded) |
| Unbuffed, same six tricks | **13** — so the loadout returns **2.85×** on 11 AP |
| The rejected ×count rule | **123 on trick three**, encounter already over |

### The most dangerous degenerate case, and how the rule contains it

**It is not the one the ticket names.** The ticket worried about several *different* buffs on one
trick; that case is bounded by the AP budget. The real exposure is **one buff firing on every
trick**: a gold `Bell-Taker (Momentum)` at 5 AP plus a gold `Mark of the 9 (Momentum)` at 4 AP — a
**9-AP loadout**, inside the 11 AP the capacity item allows — on a hand holding four Bells.

- **Uncapped:** `+5 × 4` firings plus `+5` = `+25` Momentum → `6 × (6 + 25) =` **186 damage**.
  Diarmuid, the run's final boss, holds **135**. That one-shots every opponent in the game, on hand
  one, from two cards.
- **Contained by `MAX_MULTIPLIER_BONUS_PER_HAND = 6`:** `6 × (6 + 6) =` **72** — *exactly* the
  one-Whetstone perfect hand `the-hunt.md` §7 already prints in its own table. **The ceiling
  introduces no figure the design has not already blessed**; it declines to exceed a maximum the game
  already has. That is the strongest single argument in the document.

The containment has a second half that must survive into code: **a hit zeroes the multiplier and
does not refund the cap.** Without that asymmetry the cap is a speed bump rather than a ceiling.

Secondary corner, since the dispatch named it: `Mark of the R` is 22 templates deep, but **a winning
card has exactly one rank**, so at most **two** Marks fire on any trick (that rank's Blade and
Momentum crossings). The family's depth is pool breadth, not stack depth — and the same logic bounds
Taker and Feeder to one suit per trick. The 22 was never a stacking exposure.

### Templates #13–16 reconciled (AC4) — pool stays at 78, DLR-112 unblocked

- **#13** `for every other buff active this hand` — **superseded, permanently excluded.** It counts
  buffs *active* (bought with AP) where the rule counts buffs *fired*; paying for width with no
  condition risk is exactly the self-reinforcing loop DLR-111 AC4 flags.
- **#14** `if you also hold a gold-tier card` — **still excluded, independent reason.** A doubler, and
  doubling is the one operation R2 forbids; it also reads a card's *tier* rather than a game event.
- **#15** `if bank ≥ 2× multiplier` — **killed permanently: it is arithmetically dead.** Per
  `the-hunt.md` §7 the bank climbs by `1 + Whetstone copies` per taken trick and the multiplier by
  exactly 1, so `bank = (1 + copies) × n` and `multiplier = n`, and the condition reduces to
  `copies ≥ 1` — never true with no Whetstone, always true with one. **It is a Whetstone-ownership
  check wearing a condition's clothes.** Worth flagging loudly: this template survived a full design
  pass looking like a condition.
- **#16** the co-trigger combo — **superseded**; it is the `k = 2` case of the Overlap Bonus.

### Plan defaults taken (no gate presented — unattended run)

- **Plan approval gate not presented.** All open questions took the plan's own stated default.
- **Mockup gate: not applicable** — the work is not UI-classified, so no mockup was built and none was
  auto-approved unseen.
- **Skill confirmation not presented**; the classifier's list (`game-designer` only) was taken as-is.
  `react-frontend` deliberately absent — no `src/` path in the file map.
- **Docs-only reviewer skip taken**, per the standing precedent: no `src/` path, so code-evaluator,
  defender and QA were not dispatched. All four gates ran in full regardless.
- **Default taken: fixing the proposal's undefined arithmetic is in scope**, not a scope expansion —
  a rule that cannot be evaluated cannot be costed.
- **Default taken: a buff activated for a hand stays live for the rest of it** (`version-5-developer-idea.md`
  §1 says "for that hand"). Load-bearing — it is what makes repeat-firing, and therefore the cap,
  necessary.
- **Default taken: AP is the only bound on simultaneous buffs** — grep-verified, zero hits for
  `LOADOUT`/`EQUIP_SLOTS`/`loadout` under `src/`. Worst case is 11 AP with the capacity item.
- **Default taken: three files, not a fourth new one.** `ideas.md` owns the status move,
  `hybrid-design.md` the argument, `v1-buff-card-list.md` the reconciliation.

### Two corrections caught mid-run, both by the implementer, neither applied silently

1. **The dispatch mis-priced a card.** It cited gold `Bell-Taker (Momentum)` at **6 AP**; the AP table
   prices Taker/Momentum at 2/3/**5**, so gold is **5 AP** (6 is *Feeder*/Momentum's gold). Corrected
   to 5, which makes the degenerate loadout 9 AP rather than 10 and therefore makes the case against
   an uncapped rule slightly *stronger*. Recorded as a visible blockquote in the document.
2. **A numbering difference between two documents, deliberately not "fixed".** `ideas.md` calls the
   "for every other buff active this hand" template **#12** (the `version-5-developer-idea.md` §5 grid
   numbering); `v1-buff-card-list.md` calls it **#13** (its own table numbering). Both are correct in
   their own document. The new text describes both superseded templates by description and attributes
   the numbering to the document it belongs to, rather than asserting an equivalence on agent
   authority.

### A defect found in a *shipped* template, reported not fixed

**`Keepsake` may be unfireable.** "Hold a card of suit S at hand's end" — but with `HAND_SIZE = 6`
and six tricks the player's hand is **empty** when the hand ends, so the condition can only be true
when an encounter ends mid-hand (`the-hunt.md` §8). That makes all **three** `Keepsake` templates
near-dead. Recorded as a fourth entry in `v1-buff-card-list.md`'s weakest-items section. **No
rewording was invented** — the three exits (reword the condition, move the end-of-hand instant,
delete the templates) are three different games, and that is the developer's call.

### Gates — all four green, on a zero-code diff

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | **1089 passed / 1089**, 86 files, 0 failed — baseline held exactly |
| `npm run build` | exit 0, `dist/` written (259.09 kB js, 37.95 kB css) |

`git status --porcelain` → **zero paths beginning `src/`**, as the file map requires.

`npm run format:check` fails repo-wide on ~58 pre-existing `.md` files, as before this run. Scoped:
all three design documents **also failed `npx prettier --check` at `2b33332`, before this contract
touched them** — verified by checking each out from that commit into a scratch dir and re-running.
Left alone, per the contract's own rule. This is evidence, not an assumption.

### Coordinator decisions — DLR-124

- **`.docs/game_rules/the-hunt.md` was NOT touched, and the reason is checkable rather than
  asserted.** That file carries **zero** Version-5 content — 0 grep hits for "Action Point", "buff
  pile", "buff loadout", "Apply Buff". Stating how several buffs resolve, in a ruleset that never
  says a buff exists, would require first writing the entire V5 layer into it — a decision far
  outside this contract. Consistent with DLR-111's identical call one ticket ago.
- **Two implementation docs *were* updated**, which is the non-obvious half. `hunt/buff-pile.md`'s
  DLR-111 note enumerates the four shape gaps DLR-108 must close; DLR-124 adds a **fifth**, and it is
  *state* rather than shape — a per-hand accrual (`multiplierBonus`, `flatDamageBonus`, `coinBonus`,
  `apRefunded`) held on the hand, **not** a field on `Buff`, resetting per hand and **not** on a hit.
  `hunt/README.md` got the matching one-line pointer. Neither gained a `Built by: DLR-124` entry,
  correctly — this contract built no code.
- **The largest review burden is the three new caps** (6 / 12 / 10) plus the Overlap Bonus magnitude
  and the cadence rule. Mitigated the same two ways DLR-111 was: each derives from a stated principle
  rather than being picked, and each is named as agent-chosen *inside the design document*.
- **The cadence rule is the second-largest lever and it is a rule, not a number.** Flipping every
  family to once-per-hand would remove the need for the multiplier cap entirely — and would
  contradict DLR-111's shipped pricing. Reversing it means re-deriving the cost model, so it is worth
  the developer's attention before DLR-108 builds against it.
- **Follow-up not opened, flagged instead:** the UI for showing a stacked resolution.
  `version-5-developer-idea.md` §6 already records that an unattributable loadout is one the player
  cannot learn to build; a five-buff overlap resolving in five ordered steps makes that harder.

## Coordinator decisions — DLR-124 reconciliation

- **A written proposal of the developer's was rejected outright, and I pushed it.** This is the
  most significant call of the run so far. `ideas.md` proposed stacking multipliers of
  2 → 12, 3 → 36, 5 → 125 built on "avg reward each: 3, 4, 5". The agent rejected it on
  **definition, not magnitude**: a fired buff pays on one of four axes — Blade (damage), Purse
  (coins), Second Wind (AP), Momentum (multiplier) — which are four different units with no
  exchange rate between them. There is no scalar "average reward" for the game to average, so
  the three figures describe a quantity the game cannot produce. A rule with no defined operand
  cannot be tuned into one, so no counter-figure was offered for it either. Accepted because
  the reasoning is about what the game can represent rather than about taste — but it is the
  developer's own idea, overturned by an agent, and it is the first thing the end-of-run review
  should look at.
- **Accepted seven decided rules (R1–R7) in place of a menu.** Per-axis resolution; contributions
  **add** within an axis; order **Second Wind → Momentum → cash-out product → Blade → Purse**;
  three firing cadences (event / threshold / terminal); an Overlap Bonus of **`+(k−1)` Momentum**
  on a linear basis; and four per-hand caps.
- **Accepted four cap values, all agent-chosen:** `MAX_MULTIPLIER_BONUS_PER_HAND` 6,
  `MAX_FLAT_DAMAGE_BONUS_PER_HAND` 12, `MAX_COIN_BONUS_PER_HAND` 10, `MAX_REFUND_PER_HAND` 6.
  Counters reset **per hand, not on a hit**.
- **The ceiling introduces no unblessed number.** The worst case found was not the one the
  ticket names: a re-firing gold suit-Taker on Momentum plus a gold Mark, 9 AP total, pays
  **186 uncapped** against Diarmuid's 135 — every opponent one-shot on hand one. Capped it pays
  `6 × (6+6) = 72`, which is *exactly* the one-Whetstone perfect hand `the-hunt.md` already
  prints. That coincidence is the strongest evidence the caps are in the right place.
- Worked hand for the review: 11 AP, seven buffs → **37 damage** against **13 unbuffed** (2.85×),
  where the rejected rule would have paid **123 on trick three**.

### A defect in DLR-111's list, found by DLR-124

**`Keepsake` may be unfireable.** Its condition is "hold a card of suit S at hand's end", which
may be unreachable if the hand is always empty by then. Reported, deliberately not papered over
— no rewording was invented for it. Three Purse cards depend on the answer.

### Two corrections the agent caught in its own dispatch, neither applied silently

- My dispatch mis-priced gold `Bell-Taker (Momentum)` at 6 AP; it is 5.
- An `ideas.md` #12 vs card-list #13 numbering difference was described rather than silently
  equated.


---

## DLR-108 — Buff activation flow and tiered AP costs

Contract: `.claude/contract/DLR-108-buff-activation-flow-and-tiered-ap-costs/`.
First code ticket for the buff system. Sources read before planning and cited rather than
re-derived: DLR-111's `v1-buff-card-list.md` (78 templates, the cost formula, the seven
consumable prices, the firing cadences) and DLR-124's `hybrid-design.md` §5 stacking rule
R1-R7 plus `.docs/implementation/hunt/buff-pile.md`.

### Gates auto-handled, per this run's dispatch

- **Plan approval gate: auto-approved, not shown to the developer.** Every open question below
  took the plan's stated default.
- **Mockup gate: not applicable, and nothing was auto-approved unseen.** Step 1.5b classified
  this as pure-logic + config work — no `.tsx` surface is created or modified except a pure
  projection function added to `roundUiState.ts`, which renders nothing. `/fb-plan`'s own rule
  is to skip the mockup silently for non-UI work, so no mockup was built and none was skipped
  unseen.

### Divergences from DLR-111's list and DLR-124's rule

1. **From the Jira ticket's AC2, not from DLR-111 — deliberate, and the important one.**
   AC2 specifies `BUFF_ACTIVATION_COST = { bronze: 3, silver: 5, gold: 8 }`. That is **not
   shipped.** AC2 predates DLR-111, and a single tier table cannot price a list where cost
   depends on family and reward axis as well as tier. DLR-111's
   `clamp(REWARD_BASE[axis][tier] + CONDITION_MODIFIER[family], 1, 6)` ships instead, exactly
   as this run's dispatch requires. Concretely one number the ticket names moves: **gold Cheat
   is 7 AP, DLR-111's figure, not 8.** The developer should confirm or reverse.

2. **From DLR-111 finding 3's recommendation that `BuffCondition.target.suit` be typed as
   `Suit`.** `src/hunt/` cannot import `src/warCouncil/` — warCouncil already imports hunt and
   the reverse edge is a cycle both modules' own comments name. A hunt-local `BuffTargetSuit`
   carries identical string values, and a test pins it member-for-member against warCouncil's
   `Suit` so the two cannot drift silently. The alternative — moving `Suit` down into
   `src/hunt/` — is a wider change than this ticket should make unasked.

3. **Reward-axis naming, a narrowing of DLR-111 finding 2 rather than a disagreement.** Finding
   2 lists eight new axes. Blade (flat damage) is mapped onto the **existing** `magnitude` axis
   rather than a new `flatDamage` one, because `magnitude` is already the flat-damage axis on
   the tiered ladder and a synonym would give one quantity two names. The other eight land as
   listed.

4. **Nothing diverges from DLR-124.** R1 (per-axis), R2 (add within an axis), R3's five-step
   order, R4's cadences, R5's linear `k-1` Overlap Bonus drawn from the Momentum cap, R6's four
   caps and its reset-per-hand-NOT-on-a-hit asymmetry, and R7 are all transcribed. R6's
   asymmetry is enforced structurally: `buffAccrual.ts` ships `startHandAccrual()` and
   deliberately ships **no** per-hit reset function at all, so the obvious wrong reading has no
   function to call.

### Plan defaults taken without a pause (each would normally have stopped the pipeline)

- **`apCost` is a derived lookup (`apCostOf(buff)` over two tables), not a field on `Buff`.**
  DLR-111 finding 4 offers both shapes and recommends the lookup; a field would turn a
  two-table retune into 78 construction sites that can drift from the table they came from.
  The dispatch named the missing field as gap 4 — the gap (authored costs having no home in
  code) is closed either way. Confirm before DLR-112 mints buffs from a reel, since a
  per-card discounted price would need a field.
- **`apCostOf` throws `RangeError` on `BuffKind.Unassigned`** rather than returning a number —
  `buffCatalog.ts`'s existing discipline. A placeholder with a plausible price is the bug that
  type-checks.
- **`target.rank` is a plain `number` bounded by `BUFF_TARGET_RANK_MIN`/`MAX` (1-11)**, not an
  eleven-member literal union — `src/warCouncil/types.ts` already models `RANKS` as
  `readonly number[]`.
- **`BuffKind` member names** are camelCase of DLR-111's family words; `markOfRank`, not
  `markOfThe`, because the rank lives in `target`. Long Fall reserved, not added.
- **`src/hunt/config.ts` was at 385 of a 400-line blocking budget.** Split in-ticket per this
  project's rule: the AP tunable block moved to a new `src/hunt/apConfig.ts` and is re-exported
  from `config.ts`, so no importer changed. The four new cap keys live in the new file.
- **`BuffActivationState` (pool + this trick's activations) is a pure value with no home on
  `RunState` or `RoundUiState`.** DLR-104 shipped AP with no state anywhere; a per-hand budget
  given a run-lifetime home would collide with whichever ticket wires the felt.
- **Activating the same buff twice for one trick is refused (`AlreadyActive`).** Not stated in
  any source. R7's "a player mistake is legitimate" covers paying for a card that cannot fire,
  not paying twice for one card.
- **AC1 is satisfied by not building a gate.** `buffActivationStock` in `roundUiState.ts` feeds
  `windowOpen` from the existing `discardWindowOpen`, exactly as `discardStock` does.
- **R3's five-step resolution order is documented and reflected in `resolveFiredBuffs`'s
  internal ordering, but not wired into the live cash-out** (`bank.ts` /
  `voluntaryCashOut.ts`). Nothing in `src/` reads a buff yet, so reordering the shipped damage
  path would be a change nobody can observe. Expect dead-but-tested code — the same
  intermediate state `buffCatalog.ts` already documents.

### Carried forward untouched, by instruction

- `Keepsake` may be unfireable in a full six-trick hand (DLR-124's finding).
- `Ward` silver/gold buy nothing while `DAMAGE_PER_HIT = 1`; DLR-111 suggests deleting those
  two rows rather than retuning them.
- The Cheat/Timebomb duplication (live felt mechanic vs the inert `buffCatalog.ts`
  representation) — DLR-129 retires it. This ticket built against `buffCatalog.ts` and added
  nothing to the Envenom name.

### Every number the developer still owns

`REWARD_BASE` (1/2/3 · 2/3/4 · 1/1/1 · 2/3/5), `CONDITION_MODIFIER` (0 / +1 / -1 by family),
all seven `CONSUMABLE_AP_COST` rows, and the four caps `MAX_REFUND_PER_HAND = 6`,
`MAX_MULTIPLIER_BONUS_PER_HAND = 6`, `MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12`,
`MAX_COIN_BONUS_PER_HAND = 10`. Every one is agent-chosen on DLR-111/DLR-124 under those
tickets' own tuning-value overrides and **has never been played**. Retuning the whole 78-card
pool is an edit to two tables.

## Coordinator decisions — DLR-108 reconciliation

- **Accepted a divergence from the ticket's own AC2.** DLR-108 specified a flat
  `BUFF_ACTIVATION_COST = {3,5,8}`. Not shipped: that constant predates DLR-111, and cost now
  depends on family and reward axis as well as tier. The constant name has zero hits in
  `src/`, so nothing was broken by omitting it. **One named number moves: gold Cheat is 7 AP,
  not 8.** Confirm or reverse.
- **Accepted `apCost` as a derived lookup, not a field on `Buff`.** `apCostOf(buff)` computes
  over `REWARD_BASE` + `CONDITION_MODIFIER`, clamped 1–6, with `CONSUMABLE_AP_COST` for the
  seven off-curve cards. This is what makes retuning the pool a two-table edit, and the test
  checks DLR-111's published table cell by cell. **Time-critical:** if DLR-112's slot machine
  ever needs a per-card discounted price, this must become a field instead — decide before
  DLR-112 mints buffs from a reel.
- **Accepted a deliberate type duplication.** `target.suit` is a hunt-local `BuffTargetSuit`,
  not `warCouncil`'s `Suit`, because `src/hunt/` cannot import `src/warCouncil/` without a
  cycle. Same values, pinned member-for-member by a test. The alternative is moving `Suit`
  down into `src/hunt/`.
- **Accepted a narrowing of DLR-111's finding 2:** Blade maps onto the existing `magnitude`
  axis rather than a new `flatDamage` one, to avoid two names for one quantity.
- **No divergence from DLR-124.** R1–R7 transcribed. R6's reset-per-hand-not-on-a-hit
  asymmetry is enforced structurally — `startHandAccrual()` is the only reset and no per-hit
  reset function exists, asserted against the module's own export surface.
- **The 400-line breach was fixed in-ticket, not reported.** `config.ts` was 385/400; split
  into `apConfig.ts` with a re-export, now 372.
- Shape gaps closed: `BuffKind` 3 → 19, `BuffRewardAxis` 3 → 11, `BuffCondition.target` added
  as optional `{ suit?, rank? }` (expressing 49 parameterised templates without 33 extra
  `BuffKind` members), `apCost` as above. `BuffKind`'s widening is purely additive — there is
  no `switch` on it anywhere in `src/`, verified independently by the Defender.
- **Nothing added is reachable in the app.** No buff is drawn, no condition evaluated, no
  button activates one; `BuffActivationState` has no owner. QA correctly skipped live
  verification. The buff system is being built bottom-up and first becomes visible at DLR-114
  and DLR-116.

### Forward note carried into later prompts

When a later ticket wires `RunState.buffs` into `buffActivationStock`, the seeded
`Unassigned` placeholders will hit `apCostOf`'s `RangeError` unless that UI filters them
first. Raised by the Defender; carried into DLR-114 and DLR-116.

## DLR-129 — Retire the Envenom name (out-of-band) — PARTIAL, phase 1 of 2

**The agent driving this ticket died mid-run on a session limit** (resets 18:30 Europe/Dublin),
after reporting phase 1 green and dispatching phase 2. It wrote no log section, so this
section is the coordinator's, written from the working tree and from gates it ran itself.

### What landed — commit `e5c8210`, pushed

Phase 1, the identifier rename, is **complete**: `grep -rni "envenom" src` over every `.ts`
and `.tsx` returns **0 files**. Four files moved with `git mv` so history follows:
`EnvenomCharge.tsx` → `TimebombCharge.tsx` and its spec, plus
`roundReducer.envenom.test.ts` → `roundReducer.timebomb.test.ts`,
`roundReducer.poison.test.ts` → `roundReducer.timebombQueue.test.ts`, and
`WarCouncilRound.envenom.test.tsx` → `WarCouncilRound.timebomb.test.tsx`.
96 paths in total; the agent reported 953 substitutions. The bronze damage constants keep
their values and gain matching names — **no number changed value.**

### What did not land

**Phase 2, the poison vocabulary, never ran.** `poison` still appears in **73 files**,
including four CSS files and the player-facing strings. The health bar still announces
**"10 of 10. 4 poisoned."** and the `doomed` heart state shipped at `2c8f6bc` is untouched.

**The copy decision the ticket asked for was never made.** Whether Timebomb keeps poison
vocabulary or takes its own (ticking / fuse / detonation) is still open, and is still the
developer's to make or confirm.

### Coordinator decisions

- **Committed and pushed a knowingly partial ticket.** The alternative was leaving 96 modified
  paths and four uncommitted renames sitting on the branch across a session boundary, which is
  the one state this run must never rest in. The ticket's own dispatch anticipated this: *"a
  clean partial is worth more than a behaviour change smuggled into a rename."* The commit
  message states plainly that phase 2 is outstanding.
- **Verified all four gates myself rather than trusting the dead agent's last message.**
  typecheck exit 0 · lint exit 0 · vitest **91 files, 1192 tests, 0 failures** · build exit 0.
  The test count is **identical to the pre-rename baseline**, which is the strongest available
  evidence a pure rename did not change behaviour.
- **DLR-129 is NOT transitioned to Ready for Test** and is not counted as shipped. It stays
  open for phase 2.
- The `.claude/contract/DLR-129-retire-the-envenom-name/` folder is left in place, uncommitted,
  for whoever resumes.

## RUN HALTED — session limit (RESOLVED, resumed 19:24)

The run stopped after 6 of 22 sprint tickets, at `e5c8210`. Not a pipeline failure and not a
blocked ticket: the API session limit was reached. Resumption should start at **DLR-129 phase
2**, then continue with **DLR-109 (7/22)**.


## DLR-129 phase 2 — retire the poison vocabulary

Resumed 19:24 after the session-limit halt, continuing the existing
`.claude/contract/DLR-129-retire-the-envenom-name/` contract from its Phase 2. The plan and
tasks file the dead agent left were **usable as written** — the per-identifier audit, the
protected-name list and the before/after copy table were all complete — so nothing was
re-planned. Phases 2, 3 and 4 were executed against it; the plan approval gate was not
presented, per this run's standing instruction.

### ⚠️ REVIEW THIS FIRST — the copy decision is the highest-priority item of the whole run

Everything else this run has shipped is mechanical. **This is the one place an agent chose
words the player reads.** The full before/after table below is deliberately complete so that
reversing the decision is a find-and-replace, not an investigation.

**A ticket that changes player-facing copy had its mockup gate skipped.** The developer has
not seen any of the new wording on screen. That matters more here than on a normal UI ticket,
because copy is exactly the thing the mockup gate exists to catch.

### The decision: Timebomb takes its own fuse vocabulary; poison vocabulary is retired

Each concept gets exactly one word, and no word does two jobs:

| Concept | Word |
|---|---|
| the mechanic, and the shop item | **Timebomb** |
| marking a card before you play it | **prime** / a **primed** card |
| damage booked, unpreventable, landing next trick | **ticking** |
| the hit landing | **detonates** |
| the insurance item | **Blast Guard** (was Poison Guard) |

**Why.** The mechanic is a single delayed detonation booked at one trick and paid at the next
— a fuse, not a damage-over-time effect. "Poison" actively mis-signals: it implies recurring
ticks and a curable condition. It also forced the player to hold two names for one thing the
moment the felt rail said "Timebomb" and the health bar said "poisoned". And the `doomed`
heart state (shipped at `2c8f6bc`) is precisely a bomb already ticking — booked damage nothing
can stop — so `Ticking` is the word that describes what that heart actually means.

**Rejected alternative: keep poison vocabulary under the Timebomb name.** It is cheaper —
roughly 200 fewer string and comment edits — and it leaves `Poison Guard` untouched. It was
rejected because it institutionalises exactly the two-names-for-one-mechanic split this ticket
exists to close, and because it leaves the `doomed` heart, which shows damage that is already
unpreventable, described by a word promising the opposite.

**`Poison Guard` → `Blast Guard` is the single largest ripple** and the one most likely to be
waved off. Reversing just that is a one-line copy revert plus the `BlastGuard`/`blastGuard*`
identifier family; `Guard` was deliberately retained so `SHOP_GUARD_LABEL` and the
`GuardAlreadyActive` refusal still read naturally.

### The complete before/after table of every player-facing string

"Before" is the **pre-DLR-129** value at `a1770f0`, so this table reverses the whole ticket,
not just phase 2. Damage figures shown as `4`/`2` are interpolated from
`TIMEBOMB_QUARRY_DAMAGE` / `TIMEBOMB_PLAYER_DAMAGE` and **did not change value**.

| # | Site | Before | After |
|---|---|---|---|
| 1 | `shopLabels.ts` `SHOP_ENVENOM_LABEL` → `SHOP_TIMEBOMB_LABEL` | `Envenom held` | `Timebombs held` |
| 2 | `shopLabels.ts` `SHOP_GUARD_LABEL` | `Poison Guard` | `Blast Guard` |
| 3 | `shopLabels.ts` `SHOP_ITEM_NAME` | `Envenom` | `Timebomb` |
| 4 | `shopLabels.ts` `SHOP_ITEM_NAME` | `Poison Guard` | `Blast Guard` |
| 5 | `shopLabels.ts` Timebomb blurb | `Poison a card in your hand. The winner of the trick it is played into takes damage at the next trick — 4 for the Quarry, 2 for you, and yours cashes out your streak.` | `Prime a card in your hand. The winner of the trick it is played into takes the blast at the next trick — 4 for the Quarry, 2 for you, and yours cashes out your streak.` |
| 6 | `shopLabels.ts` Guard blurb | `Insurance for one fight. The next time your own poison lands on you, you still take the 2 but your streak survives.` | `Insurance for one fight. The next time your own Timebomb detonates on you, you still take the 2 but your streak survives.` |
| 7 | `shopLabels.ts` `GuardAlreadyActive` | `You are already holding a Poison Guard.` | `You are already holding a Blast Guard.` |
| 8 | `labels.ts` `cardAccessibleName` mark suffix | `poisoned` | `primed` |
| 9 | `labels.ts` `VENOM_MARK_LABEL` → `PRIMED_MARK_LABEL` | `Poisoned` | `Primed` |
| 10 | `labels.ts` health-bar clause | `10 of 10. 4 poisoned.` | `10 of 10. 4 ticking.` |
| 11 | `labels.ts` `ENVENOM_RAIL_LABEL` → `TIMEBOMB_RAIL_LABEL` | `Envenom` | `Timebomb` |
| 12 | `labels.ts` `ENVENOM_EMPTY_LABEL` → `TIMEBOMB_EMPTY_LABEL` | `No Envenom held` | `No Timebomb held` |
| 13 | `labels.ts` `ENVENOM_POISED_HINT` → `TIMEBOMB_POISED_HINT` | `Tap Envenom again to arm it` | `Tap Timebomb again to arm it` |
| 14 | `labels.ts` `ENVENOM_ARMED_HINT` → `TIMEBOMB_ARMED_HINT` | `Pick a card in your hand to poison` | `Pick a card in your hand to prime` |
| 15 | `labels.ts` `poisonBookedText` → `timebombBookedText` (player) | `Poison set — you take 2 at the next trick.` | `Timebomb ticking — you take 2 at the next trick.` |
| 16 | `labels.ts` `timebombBookedText` (Quarry) | `Poison set — they take 4 at the next trick.` | `Timebomb ticking — they take 4 at the next trick.` |
| 17 | `labels.ts` apply-damage refusal | `A poison hit is still owed — you cannot apply until it lands.` | `A Timebomb is still ticking — you cannot apply until it detonates.` |
| 18 | `timebomb.ts` `RangeError` (not player-facing; changed for consistency) | `Cannot poison the {rank} of {suit} — it is not in the {side}'s hand` | `Cannot prime the {rank} of {suit} — it is not in the {side}'s hand` |
| 19 | `timebomb.ts` `RangeError` | `The {rank} of {suit} is already poisoned` | `The {rank} of {suit} is already primed` |

Row 11 also flows into the rail's composed accessible name, which now reads
`Timebomb, 2 held, armed` (was `Envenom, 2 held, armed`).

### Plan defaults taken, and decisions made in the developer's place

Every one of these is reversible from the table above or from a single named identifier.

- **The fuse lexicon itself**, and its five words. The plan's stated default; taken.
- **`Poison Guard` → `Blast Guard`**, including `PoisonGuard` → `BlastGuard`,
  `poisonGuardHeld`/`Spent`/`ed` → `blastGuard*`, and `POISON_GUARD_PRICE` →
  `BLAST_GUARD_PRICE` (value still `1`).
- **`Doomed` → `Ticking`**, moving the `HeartState` member, the `HealthBarView.ticking` field
  and the `[data-state='ticking']` CSS selector together in one task, because the compiler sees
  neither side of that binding.
- **Row 1 pluralises: `Timebomb held` → `Timebombs held`.** Flagged by the code-evaluator as a
  copy edit with no poison wording in it, riding along in a rename-only diff. **Kept**, because
  it matches the sibling cell `SHOP_WHETSTONE_LABEL = 'Whetstones held'` and the count has no
  cap — but it is the one row in this table that is not forced by the vocabulary decision, and
  it is a clean one-character revert.
- **Row 15/16 says "ticking", not "primed".** The plan's table proposed `Timebomb primed — you
  take N at the next trick.`; the code-evaluator caught that this gives "primed" two jobs — the
  card mark *and* the booked hit — while the health bar forty lines away already calls that
  same state "ticking". Corrected to `Timebomb ticking`, so the reveal and the health bar
  describe one state with one word.
- **CSS colour tokens `--wc-poison`/`--wc-poison-edge` → `--wc-timebomb`/`--wc-timebomb-edge`.**
  Not in the plan's list; renamed because the token names were pure poison vocabulary. **The
  colour values `#8fb04e` and `#5c7a2e` did not change.** `warCouncilHunt.css`'s mined tile
  reuses that token and now reads "the Timebomb green".
- **`.docs/design/` was deliberately NOT swept.** Those are historical design records owned by
  `game-designer`; rewriting them would falsify what was argued at the time.
  `.docs/implementation/` and `.docs/game_rules/the-hunt.md` **were** swept, and four doc files
  were `git mv`'d onto the new names.

### The de-duplication clause — NOT delivered, deliberately

The ticket's scope item 2 (make the live felt path consume `buffCatalog.ts` rather than a
parallel representation) **was not done, and should not have been.** Verified this run: nothing
under `src/app/` imports `buffCatalog`, `timebombBuff`, or `BuffKind`, and there is no buff-pile
field on `RunState` or `RoundUiState`. Wiring the felt onto the catalog means introducing the
buff pile, `BuffActivationState`, and AP spending into the live round state — a **behaviour
change**, which this ticket's hard constraint forbids and which is DLR-114/DLR-116's work.

What was closed is the **naming** duplication. The **representational** duplication survives.
Because `TIMEBOMB_QUARRY_DAMAGE`/`TIMEBOMB_PLAYER_DAMAGE` remain the single source that
`buffCatalog.ts`'s bronze row multiplies, the two representations still cannot diverge
numerically — which is the property the duplication actually threatened.

**DLR-129 is therefore left OPEN, not moved to Ready for Test.** The rename is complete; scope
item 2 is not, and it belongs to DLR-114/DLR-116.

### Reviewer findings and the fix pass

One parallel dispatch, one fix pass, one verification round — the 2-round ceiling was not
reached. Four findings were accepted and fixed:

1. **A negative assertion had silently decoupled from live copy.** Both the defender and the
   code-evaluator found it independently. `TrickWell.test.tsx` asserted
   `queryByText(/Timebomb set/).toBeNull()` — but the live copy is `Timebomb ticking — …`, so
   the string `"Timebomb set"` exists nowhere in the app. The test passed, and would have
   passed even if the clause rendered on every trick. This is exactly the string-bound trap
   `web-project.md` names, and no gate could see it. Re-coupled to `/Timebomb ticking/`.
2. Rows 15/16 reworded from `primed` to `ticking` (above).
3. `HandFan.tsx:100` — the blanket pass turned the verb "poison" into the noun "Timebomb"
   ("pick a card to Timebomb"). Corrected to "pick a card to prime".
4. **`src/hunt/__tests__/run.test.ts` crossed the 400-line budget** at **401 lines** — caused
   by Prettier reflowing an import list the rename had lengthened, not by the rename's content.
   Fixed in-ticket per CLAUDE.md rather than reported: the self-contained `beatenCount` block
   (DLR-85's own question) was lifted into `src/hunt/__tests__/run.beatenCount.test.ts`,
   leaving `run.test.ts` at 326 lines.

**This is why the test-file count moved from 91 to 92 while the test count stayed at 1192.**
No test was added, deleted, or weakened; one cohesive `describe` block moved files to clear a
blocking line-budget breach.

Two non-blocking notes were left alone, both pre-existing: `PRIMED_MARK_LABEL` is exported and
unimported (dead before this rename too), and `Ward` silver/gold remain indistinguishable while
`DAMAGE_PER_HIT = 1`.

### Evidence that nothing but names and prose changed

- `git diff HEAD -- src` is **440 insertions / 440 deletions** across the phase-2 diff before
  the fix pass — perfectly symmetric.
- Stripping every identifier from both sides of the diff leaves only Prettier line-wrapping
  differences: **no numeric literal and no operator changed anywhere.**
- `src/hunt/config.ts`'s diff is one renamed constant and three comment lines.
  `TIMEBOMB_PRICE = 2`, `TIMEBOMB_QUARRY_DAMAGE = 4`, `TIMEBOMB_PLAYER_DAMAGE = 2`,
  `BLAST_GUARD_PRICE = 1` all hold their pre-ticket values.
- Test count identical at **1192**.

### Protected names, confirmed surviving

`CardRank.Poison` (rank 8 — the base game's card, no connection to this mechanic) in
`src/warCouncil/types.ts`; and the four places "poison" is a metaphor rather than the mechanic:
`src/hunt/flask.ts` (a `Math.min` clamp), `src/hunt/shop.ts` ("hide a poisoned figure"), and
`src/hunt/__tests__/quickKill.test.ts` ("poisoning the purse"). After the sweep, `poison`
appears in `src/` **only** at those sites.

### What only the developer can judge

- Whether the fuse lexicon is right at all, and whether `Blast Guard` should stay.
- Whether `10 of 10. 4 ticking.` reads well in a screen reader mid-fight, and whether
  `Timebomb ticking — you take 2 at the next trick.` lands on the reveal.
- Whether `Timebombs held` should have stayed singular.
- Whether `timebombDamageFor` (encounter side) sitting one preposition from `timebombDamageOf`
  (buff side), both exported from `src/hunt/index.ts`, is tolerable until DLR-114/DLR-116
  collapses them. Correct and compiling; confusing to read.

### Late correction after the reviewer round

Four "poison" metaphors unrelated to the mechanic (`src/hunt/flask.ts` x2, `src/hunt/shop.ts`,
`src/hunt/__tests__/quickKill.test.ts`, plus their two mirrors in `.docs/implementation/`) were
reworded to "corrupt"/"corrupted" rather than left as protected exceptions. The plan had
protected them. **Deviating was the better call:** leaving a poison metaphor in a codebase that
has just retired poison vocabulary is precisely the reading trap the ticket exists to remove,
and it made the completeness grep ambiguous. `CardRank.Poison` (rank 8) is now the **only**
occurrence of "poison" anywhere in `src/` — the audit is a clean binary.

### Gates, final

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0, no errors |
| `npm run lint` | exit 0, no errors or warnings |
| `npx vitest run` | **1192 passed of 1192**, 92 files |
| `npm run build` | exit 0, `dist/` written, no bundler errors |
| `npx prettier --check` (the 73 changed source files) | exit 0 |

`npm run format:check` was not run as a gate — it fails on ~58 pre-existing `.md` files this
contract never touched.

**One live-verification gap, reported honestly.** QA drove the app at 1400x900 and confirmed the
fight screen renders clean with no console error, the rail reads `TIMEBOMB` / `No Timebomb held`,
no poison vocabulary appears in the accessibility tree, and `--wc-timebomb` resolves to
`#8fb04e` rather than falling back. It did **not** reach the shop screen or a live `ticking`
heart — both need fight 1 played to completion and a Timebomb bought and detonated. The unit
specs cover both branches with fixture data, but nobody has seen `10 of 10. 4 ticking.` or the
`Blast Guard` shop card rendered in a real browser. Worth thirty seconds of the developer's
time alongside the copy review.

## Coordinator decisions — DLR-129 phase 2 reconciliation

- **Pushed `6ba6224`. The single highest-review-priority commit of the run:** an agent chose
  the words the player reads, and the mockup gate was skipped, so **nobody has seen this
  wording on screen.** Timebomb took a fuse lexicon and poison vocabulary is retired — one
  word per concept: **Timebomb** (mechanic/item), **prime/primed** (marking a card),
  **ticking** (booked unpreventable damage), **detonates** (the hit landing), and
  `Poison Guard` → **`Blast Guard`**. The full 19-row before/after table is in the agent's own
  log section; "before" is the pre-DLR-129 value at `a1770f0`, so reversing the whole ticket
  is a find-and-replace, exactly as required.
- The reasoning accepted: the mechanic is one delayed detonation booked at one trick and paid
  at the next — a fuse, not damage over time. "Poison" implies recurring ticks and a curable
  condition, and it forced two names for one thing the moment the rail said Timebomb and the
  bar said poisoned. The rejected alternative (keep poison words under the Timebomb name) was
  ~200 fewer edits but institutionalises the split the ticket exists to close.
- **Two rows to look at first:** `Timebombs held` was pluralised to match `Whetstones held` —
  the one row not forced by the decision, and a one-character revert. And whether
  **`Blast Guard`** is the right name at all.
- **Accepted an in-ticket 400-line fix.** `run.test.ts` hit **401 lines** because Prettier
  reflowed an import list the rename had lengthened. The self-contained `beatenCount` block
  moved to its own spec, leaving `run.test.ts` at 326. This is why the file count moved 91 → 92
  while the test count stayed **exactly 1192**. No test was added, deleted or weakened.
- **Accepted the de-duplication being left undone, and it is the right call.** Nothing under
  `src/app/` imports `buffCatalog`, `timebombBuff` or `BuffKind`, and there is no buff-pile
  field on `RunState` or `RoundUiState`. Wiring the felt onto the catalog needs the buff pile,
  `BuffActivationState` and AP spending in live round state — a behaviour change, which this
  ticket forbids. **The naming duplication is closed; the representational one survives** and
  belongs to DLR-114/DLR-116. Both representations still read the same two constants, so they
  cannot diverge numerically.
- **DLR-129 left in Coding, NOT moved to Ready for Test**, with a Jira comment recording
  precisely what remains. It is counted as out-of-band shipped for the naming work only.
- **Live-verification gap, reported honestly.** QA drove the app at 1400×900: fight screen
  clean, no console errors, rail reads `TIMEBOMB` / `No Timebomb held`, no poison vocabulary
  anywhere in the accessibility tree, `--wc-timebomb` resolves to `#8fb04e` rather than
  falling back. It did **not** reach the shop or a live `ticking` heart — both need fight 1
  played out and a Timebomb bought and detonated. So **`10 of 10. 4 ticking.` and the
  `Blast Guard` card have never been seen rendered.**

### Carried into DLR-114 / DLR-116

`timebombDamageFor` (encounter side) now sits one preposition from `timebombDamageOf` (buff
side), both exported from `src/hunt/index.ts`. Correct and compiling; confusing to read.
Whichever ticket wires the felt onto the catalog should collapse them.

## Mid-run workflow change — developer decision, applies from ticket 8 onward

Prompted by a token/value audit of the run so far. The measured facts behind it:

- **Reviewer trio ≈ a third of a ticket's tokens.** Docs-only tickets, where the trio is not
  dispatched, cost 211k and 250k. Full-trio tickets cost 387k, 325k and 309k. Roughly 110k per
  ticket, spent on three agents cold-starting on the same files in parallel.
- **The browser pass has found zero defects in eight tickets** and has never triggered a fix
  round. All three issues that caused a fix pass this run came from the code-evaluator.
- **Two causes, only one benign.** Five of eight tickets had no reachable surface — the buff
  system is being built bottom-up. The two that were reachable were checked shallowly because
  QA **cannot play the game deep enough**: coins only arrive on finishing a fight, so it could
  never buy a Timebomb. `10 of 10. 4 ticking.` and the `Blast Guard` card have never been seen
  rendered by any process.
- **Tool calls are nearly free.** DLR-101 made 747 tool calls against DLR-108's 96, for 60k
  more tokens. Browser QA is expensive in wall clock, not tokens.

### What changed, committed as `ab211dc`

**`.claude/commands/fb-apply.md`** — applies to every future `/fb-apply`, sprint run or not:
- **Step 5.0, reviewer scaling by diff risk.** Production logic → all three. Test-only or a
  verified pure rename → Code-Evaluator alone. Config/tooling only → Defender alone (the risk
  there is a silently disabled boundary, which this run hit once). Docs-only → none.
  **An arguable classification dispatches all three.**
- **Step 5.0.1, reviewers get the diff, not a path list.**
- **A hard Reachability Gate on QA's browser pass**, with an explicit prohibition on calling
  live modules directly and presenting it as browser verification.

**`.claude/skills/sprint-coder/SKILL.md`** — run-level policy on top:
- **Browser QA deferred across a whole run** to one batch pass at wrap-up, each ticket
  recording what a browser would have checked.
- **The unit suite, typecheck, lint and build are never deferred** — stated as a Safety rule.
- Preflight must now decide whether deferral suits the actual ticket list and record why.

### The cost of this, stated plainly

**Nothing gets looked at until DLR-119.** That covers the four tickets which first make buffs
visible — DLR-114's loadout bar, DLR-116's shop, DLR-117's card preview, DLR-118's Vault
screen. A layout defect in DLR-114 will be found with three screens built on top of it. The
developer accepted this trade knowingly; it is recorded here because it is the run's largest
deliberate blind spot.

### DLR-130 raised — the headless run simulator

The developer intends a **balance pass at the end of the epic** to find out whether the game is
winnable at all. Every number it will examine was chosen by an agent during this run and none
has been played. DLR-130 builds the instrument: a seeded, deterministic `npm run sim` script
that plays N runs and prints win rate and distributions, with a pluggable policy seam and
reusable deep-state fixtures.

Scoped explicitly to **ship the instrument, not the readings** — it retunes nothing. It is
slotted **before DLR-119/120/121** and before the balance pass. It also closes the QA gap
above: a headless driver reaches a finished fight, a bought Timebomb and a detonation in
milliseconds, which is exactly what browser tooling could not do.

**Counted as out-of-band; the denominator stays 22.**


## DLR-109 — Delayed Apply Damage payout

Contract: `.claude/contract/DLR-109-delayed-apply-damage-payout/`. Epic DLR-103, label `engine`.
Apply Damage stops being an instant, free, risk-free cash-out: it costs AP and queues its payout
for a delay, damage during the window wipes it, and the quick-kill card count freezes at press
time.

### Gates auto-passed, and what went unseen

- **Plan approval gate auto-approved.** No `AskUserQuestion` was presented. Every open question
  took `plan.md`'s stated default; all of them are listed below.
- **No mockup was built and none went to the developer.** The ticket is `engine`-classified and
  the implementation touches **no `.tsx` file at all** — the two new refusal sentences surface
  through the `APPLY_DAMAGE_REFUSAL_MESSAGE` map `ApplyDamagePlate.tsx` already reads. So the
  mockup step was correctly skipped rather than skipped-and-unseen; there was no UI to draw.
- **The browser pass was NOT run.** `.claude/commands/fb-apply.md` was changed at `ab211dc`, one
  commit into this run, to make the live browser pass **opt-in and off by default** — a standing
  developer decision taken on evidence. This ticket IS player-reachable, so under the older rule
  it would have had one. It did not. See "What the developer must look at" below.

### Plan defaults taken — every one a design reading the developer would normally settle

1. **"Delay" is counted in trick *resolutions*, and the trick in flight counts as the first one.**
   `APPLY_DAMAGE_DELAY_TRICKS = 1` means "one whole trick *beyond* the trick the press happened
   in", so a press queues `delay + 1 = 2` resolutions. That is AC2's "the current trick plus the
   next trick" read literally. A buff setting the value to `0` shortens it to the single earliest
   possible landing — the resolution of the trick the press happened in. The press always happens
   inside or immediately before a trick, so "no delay at all" is not expressible as a trick count;
   defining the constant as *additional* tricks is what makes AC5's `-1` and `= 0` both meaningful.
2. **The payout never crosses a hand boundary — an outstanding payout lands at the resolution of
   the hand's final trick.** The two alternatives are both worse: dropping it makes a trick-6
   press a pure loss of bank and AP with no counterplay, a dead zone at the moment the bank is
   biggest; carrying it into the next hand contradicts the hand-scoped reset this is meant to
   mirror (bank and multiplier are per-hand) and would put a stale press-time card count against a
   different hand. Surviving to the end of the hand *is* surviving, so it pays. **This makes a
   late press meaningfully safer than an early one, which is the opposite of the usual risk
   curve** — worth a playtest of trick-5 and trick-6 presses specifically.
3. **A second press is refused while a payout is outstanding**, via a new
   `ApplyDamageRefusal.PayoutPending`. A second press would need a second countdown and a second
   press-time snapshot. This removes a "double down" line some players will look for.
4. **AC3's "taking damage" means the player's health actually decreased**, enforced inside
   `applyDamage` — the module's single clamp point — so no caller can route damage around it. A
   zero-damage event does not wipe; a Blast-Guard-suppressed streak reset does not wipe unless
   health still fell.
5. **A queued payout is dropped, not paid, if the encounter resolves first.**
6. **`apPool` lives on `RoundUiState`, not `RunState`**, seeded at mount through
   `refreshActionPointsForNewHand`. `AP_REFRESH_CADENCE` is `PerHand` and `App.tsx` already
   remounts the felt per hand (`key={hand}`), so a mount *is* the per-hand refresh. Right today;
   wrong the day the cadence becomes per-fight or per-run. DLR-114/DLR-116 may move it.
7. **`pendingApplyPayout` lives on `EncounterState`**, as AC2 names explicitly, even though it is
   hand-scoped in practice — that is what lets the AC3 wipe live inside `applyDamage`.
8. **Both tunables sit in `apConfig.ts`, not `config.ts`.** `config.ts` was at 372 of its 400-line
   blocking budget. `APPLY_DAMAGE_DELAY_TRICKS` is not an AP figure but sits beside the AP cost
   because they are one control's pair of tunables.
9. **No UI was added**, per the ticket's explicit scope boundary. Deliberate, and it has a cost —
   see below.

### The resolution order when a payout AND a ticking Timebomb are both outstanding

Stated explicitly because this is exactly where an ordering bug hides. `applyResolution` in
`commitHandlers.ts` is now **four steps, and the order is load-bearing**:

1. the trick's own damage — which already folds in any Timebomb detonating this trick, via
   `playOptions` — is applied;
2. the paid Timebomb queue is cleared;
3. this trick's own prime is booked for the next trick;
4. **the queued Apply Damage payout ticks, and lands if it is due.**

**Step 4 is LAST.** Because AC3's wipe lives inside `applyDamage`, step 1 has already nulled
`pendingApplyPayout` on any trick that cost the player health — so **a Timebomb detonating against
the player on the trick a payout was due DESTROYS that payout. The bomb wins.** That falls out of
AC3 rather than being a fifth rule, and putting the tick any earlier would let a player dodge AC3
by timing. Both halves are asserted in `roundReducer.delayedApply.test.ts` — the payout is
destroyed *and* the Timebomb's own damage lands normally.

The reverse case cannot arise: `applyDamageRefusalFor` already refuses a press while a Timebomb is
ticking, so the only reachable overlap is prime-during-the-window, not press-during-a-tick.
**This will feel severe the first time a primed card eats a large banked cash-out.**

### What "Apply Damage happened" now means for `Debt Collector`

`Debt Collector` (4 cards in `v1-buff-card-list.md`) fires on "Apply Damage this hand" and is
directly downstream of this ticket. This ticket does not author it, but it does settle what the
phrase can mean, and there are now **two distinct moments** where there was one:

- **The press** — AP is spent, bank and multiplier are zeroed, `pendingApplyPayout` becomes
  non-null. Observable as `hasPendingApplyPayout(encounter)`.
- **The landing** — a trick or more later, when the Quarry actually takes the damage. Observable
  only as the transition where `pendingApplyPayout` goes non-null to null *with* damage dealt.

**The reading this ticket takes, and that `Debt Collector` should adopt: "Apply Damage happened"
means THE PRESS.** Three reasons. It is the moment the player made the decision and paid for it,
which is what the buff rewards. It is the only one of the two guaranteed to occur — a landing can
be wiped by AC3, and a condition that silently fails to fire because the player got hit is a
condition players cannot reason about. And it is already directly observable from a predicate that
exists (`hasPendingApplyPayout`), whereas the landing leaves no state that outlives it.

**This is an agent decision, not the developer's, and nothing in code enforces it yet** — no buff
reads either signal today. Whoever builds `Debt Collector` should either adopt this or overturn it
deliberately; if they overturn it, the landing needs a durable marker added, because right now it
leaves no trace.

### Assumptions that would normally have paused the pipeline

- Every numbered default above.
- **`APPLY_DAMAGE_AP_COST = 3` and `APPLY_DAMAGE_DELAY_TRICKS = 1` were transcribed, not chosen** —
  the ticket supplies both and flags the AP cost open per §2. Neither has ever been played. Against
  `STARTING_AP = 6` the cost allows at most two presses a hand before buffs draw on the same pool.
- **`applyResolution`'s return type widened** from `EncounterState` to a `{ encounter,
  unplayedAtPress }` record so it could carry AC4's snapshot. The rejected alternative was a second
  permanent `EncounterState` field to model a single transition. A reviewer may reasonably prefer
  the other trade.
- **One file was edited that the contract's file map did not list.**
  `src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts` broke legitimately — its
  `seedOneTrickKill` fixture drove its kill through two `TapApplyDamage` taps, the exact instant-
  cash mechanism this ticket replaces. The Phase 4 implementer rewrote the seed to drive an
  ordinary trick cash-out instead, preserving DLR-95 AC2's actual intent (`captureUnplayed`
  freezing on the first resolved transition) independent of Apply Damage's timing. Flagged to all
  three reviewers as the highest-value thing to check. **A planner gap, not implementer
  overreach** — the audit spotted `applyDamage.test.ts` and missed its sibling.

### What the developer must look at themselves

- **The complete absence of feedback that a payout is in the air.** The ticket puts this UI out of
  scope and the implementation honours that — so a player presses Apply, watches the bank zero,
  watches the Quarry's health *not move*, and is told nothing. The refusal sentence only appears if
  they press again. **This is the single most important thing to look at, and a follow-up UI ticket
  is very likely warranted.**
- **AP is invisible too.** `apPool` now exists and is spent, but nothing renders it, so an
  `InsufficientAp` refusal reads as the button dying for no visible reason.
- Both tunables, and the three design readings above (hand-end flush, one-at-a-time, Timebomb-wins).

## Coordinator decisions — DLR-109 reconciliation

- **The new opt-in browser rule took effect mid-ticket and the agent applied it correctly.**
  `ab211dc` landed one commit into DLR-109's run. The work *is* player-reachable, so under the
  old rule it would have had a browser pass; under the new one it did not, and QA recorded what
  a browser would have checked instead. Exactly the intended behaviour. **Ticket 8 onward is
  the first fully clean run under the new reviewer-scaling and opt-in-QA rules.**
- **Accepted the delay semantics.** `APPLY_DAMAGE_DELAY_TRICKS = 1` means one whole trick
  *beyond* the trick the press happened in, so a press queues two trick resolutions — the
  ticket's "current trick plus the next trick". Three agent-chosen readings on top, all
  unplayed: the payout **never crosses a hand boundary** (still owed at the final trick, it
  lands there), **one payout at a time**, and it is **dropped rather than paid** if the
  encounter resolves first.
- **Accepted the resolution order, including a rule with real teeth.** `applyResolution` is
  now: trick damage (which already folds in a detonating Timebomb) → clear paid Timebomb queue
  → book this trick's prime → **payout ticks last**. Because the wipe lives inside
  `applyDamage`, step 1 has already nulled the payout on any trick that cost the player health.
  **So a Timebomb detonating against the player destroys a payout due at that same resolution
  — the bomb wins.** Both halves asserted. The reverse cannot arise: the refusal already blocks
  a press while a Timebomb is ticking.
- **Accepted the `Debt Collector` reading, and it binds four unwritten cards.** There are now
  two moments where there was one — the press and the landing. **"Apply Damage happened" means
  THE PRESS**: it is when the decision was made and paid for, it is the only one guaranteed to
  occur (a landing can be wiped), and it is observable via `hasPendingApplyPayout`, whereas the
  landing leaves no durable trace. **Unenforced in code.** Whoever builds those four cards
  should adopt it or deliberately overturn it — overturning needs a marker added for the
  landing.
- **Accepted two spec rewrites outside the contract's file map.**
  `roundReducer.quickKill.test.ts` and `WarCouncilRound.test.tsx` drove their scenarios through
  the instant-cash mechanism this ticket replaced, and broke legitimately. Both were rewritten
  and both rewrites were scrutinised by a reviewer specifically for weakened coverage; both
  judged honest. Logged because "nothing outside the file map may be touched" is normally hard.
- Suite 1192 → **1220 (+28), 94 files, 0 failures.** One QA fix round, ceiling not exceeded.

### DLR-119 scope extended by comment, rather than a new ticket

DLR-109's top gap is that **nothing tells the player a payout is in the air** — press Apply,
the bank zeroes, the Quarry's health does not move, and no signal explains why. Two related
gaps land in the same place: **AP is unrendered**, so `InsufficientAp` reads as the button
dying for no reason; and **a payout destroyed by a Timebomb is destroyed silently**.

Added as a comment to DLR-119 (the visual and UX pass over exactly these surfaces) rather than
raised as a fourth out-of-band ticket, to avoid ticket sprawl. If it turns out to need engine
work rather than presentation, it splits out then.


## DLR-110 — Shield redesign: blue hearts on the health bar

GREEN. Suite **1220 → 1259 (+39), 96 files (+2), 0 failures.** typecheck / lint / test / build all
exit 0. One reviewer round, one combined fix pass, one verification round — ceiling not reached.
All three reviewers ran (the diff changes production engine logic): Code-Evaluator ISSUES FOUND
(4 minor, all documentation/test-fidelity), Defender APPROVED, QA ALL PASSED.

### The DLR-110 / DLR-115 boundary — and it needed no judgement

**The two tickets are exact complements and I absorbed none of DLR-115.** DLR-110 is labelled
`engine` and its own out-of-scope line says "rendering the second pip type on screen"; DLR-115 is
labelled `ui`/`playable` and its out-of-scope line says "the absorption-order rule itself (engine
ticket)". The titles mislead — "blue hearts on the health bar" sounds visual — but the descriptions
do not. **This diff contains no `.tsx`, no `.css`, no `HeartState` member, and no edit to
`duelHealthBars.ts`.** DLR-115 still has to build every pixel of it. QA confirmed the absences
against the diff rather than taking my word for it.

Consequently **this was not a UI ticket and no mockup was called for** — `/fb-plan` Step 3.5 fires
only for work touching a `.tsx` surface, `App.tsx`, or a `use*` hook, and skips silently otherwise.
So there is no unseen mockup; there is no mockup. Recorded because the run's instruction assumed
one would exist.

### The shield rules I decided — all of these are normally the developer's

- **A blue heart is a temporary hit point worth 1 damage, not an absorb-one-hit token.** 3 damage
  into 2 blue hearts consumes both and lets 1 through. §7a's goal is "dividing what you take";
  per-point absorption divides, whole-hit absorption negates. **This is also what keeps Shield
  distinct from `Ward`**, which the v1 list defines as "absorbs up to N on the next hit, then breaks
  regardless" — Ward is per-hit and self-destructs, Shield is per-point and persists. **Ward's code
  was not touched and its known tier defect was not fixed.**
- **Blue hearts are the player's only** — `shieldHearts` is a scalar on `EncounterState`, not a
  `Record<DuelSide, Health>`. A side-keyed field would model a Quarry shield nothing can create.
- **They do not stack, and they set DOWNWARD.** Bronze after gold leaves 1, not 3 and not 4.
- **They survive a hand and die with the encounter.** §7a says "for that hand" in one sentence and
  "re-activating Shield a later hand resets to the tier's count" in the next; the second only makes
  sense if hearts survive into a later hand. Living on `EncounterState` means `startEncounter`
  reseeds them with no explicit clear step to forget. **If they should expire at hand end it is a
  one-line change; if they should survive a whole fight, `shieldHearts` moves to `RunState`. Worth
  deciding before DLR-115 renders them.**
- **Blue hearts absorb before red health** (AC4), inside `applyDamage` — the single damage funnel —
  so no route can bypass the shield. `deplete` remains the single clamp point.
- **A hit FULLY ABSORBED by blue hearts does not destroy a queued Apply Damage payout.** This falls
  out of DLR-109's existing `playerLostHealth` predicate rather than a new branch, and it is tested
  in both directions. **It is a second, undesigned benefit of holding a shield and it cuts against
  DLR-109's "a Timebomb detonating against the player destroys a payout at that resolution" —**
  a shield now also protects a cash-out. A partially-absorbed hit that still drops red health
  destroys the payout exactly as before.
- **A dead Quarry spends no blue heart.** D7 already gives the player zero damage from an event that
  kills the Quarry, so the shield is carried through untouched rather than absorbing a hit that
  never landed.
- **A player cannot be killed while a blue heart stands.** Falls out of absorption preceding
  `deplete`; asserted at the boundary with player health at 1.

### Numbers nobody chose

- **`CONSUMABLE_AP_COST[Shield]` = bronze 2 / silver 3 / gold 4.** No source document prices Shield —
  `v1-buff-card-list.md` has no Shield row and §7a states heart counts but no cost. The ladder shape
  is copied from `SecondThoughts`/`Spyglass`. **The row is *forced* by adding `BuffKind.Shield`**
  (`apCostOf` throws on an unpriced kind), so the choice could not be deferred, only made invisibly
  or made visibly. Made visibly, with a "NOBODY CHOSE THESE NUMBERS" comment in `buffCosts.ts`.
  Nothing player-reachable mints a Shield yet, so no player can pay it today.
- `SHIELD_HEARTS = { bronze: 1, silver: 2, gold: 3 }` is **transcribed** from §7a and AC2, not chosen.
- **No colour, glyph, or opacity was chosen** — this ticket renders nothing, deliberately.

### `game-ux`'s ruling, recorded for DLR-115 rather than acted on here

The row already carries five states and has never been seen at 14–18 glyphs with a streak and a
booked hit at once. A sixth *flat* state is above the point where a row reads at a glance. The
ruling: **do not add a sixth peer state — model the row as two orthogonal dimensions**, pip *type*
(shield vs health) and pip *state*, where a shield pip can only ever be whole, breaking or broken.
That caps what can be on screen at once and satisfies the hard floor's "state reads without motion
or colour alone", which a blue-vs-red colour swap alone would fail. **The glyph and colour are the
developer's and must be routed, not invented** — `--wc-hp-doomed-opacity: 0.78` is the precedent for
an agent-chosen value never seen against a full row.

### Two things DLR-115 inherits — added as a comment on that ticket

1. **`projectedDepletion` in `duelHealthBars.ts` knows nothing about `shieldHearts`.** The moment
   anything grants a shield, the ticking-Timebomb preview will show red hearts about to break that
   the shield would in fact absorb — a preview contradicting what `applyDamage` actually does.
   **Latent, not a live regression** (nothing outside `src/hunt/`'s tests calls `activateShield`),
   and outside this ticket's file map. DLR-115 must route the player-side projection through
   `absorbWithShield` rather than adding a second absorption rule beside it.
2. **A blue heart can be fractional.** Under `DAMAGE_ROUNDING = None` a half-point hit legitimately
   leaves 1.5 blue hearts, and the engine handles it. DLR-115 needs a rule for drawing half a pip.

### Plan defaults taken at the auto-approved gate

Every *Assumptions made* bullet above, plus: the mechanic split three ways (`shield.ts` pure
arithmetic / `encounter.ts` transitions / `buffCatalog.ts` representation); `SHIELD_HEARTS` in
`shield.ts` beside `CHEAT_DURATION_TRICKS`'s precedent rather than in `config.ts`; and
**`BuffKind.Shield` added even though nothing mints one** — the same intermediate state DLR-107 left
Cheat and Timebomb in, because AC2 requires an activation and an activation requires a card.

### A planner error worth carrying forward

**`plan.md`'s config audit undercounted `EncounterState` construction sites — it said one
(`startEncounter`), there are two.** `applyDamage`'s return is also an object literal and it writes
`damageEventsApplied:`, so the plan's own grep should have caught it. The Implementer hit it as a
typecheck failure exactly where the contract predicted, and fixed it properly rather than casting.
**The audit bullet has been corrected in `plan.md`** so the next ticket that adds an `EncounterState`
field does not trust the wrong number.

### Still open, and what the developer must look at

- **Nothing is visible.** A browser would render a health bar identical to today's, because no reader
  of `encounter.shieldHearts` exists yet. The browser pass was not requested and was not run; QA
  recorded the same. **The first thing worth looking at is DLR-115.**
- The four rules above marked as the developer's: absorb-1-point-vs-1-hit (settle by playing a gold
  Timebomb's 6 damage into 3 blue hearts and judging whether the shield *helped* or *negated*), how
  long a blue heart lives, whether a fully-absorbed hit should spare a payout, and Shield's AP price.
- **The persistence window is still open.** `EncounterState` is not persisted and `createSaveStore`
  has no consumer outside `src/persistence/`, so `save-data-versioning.md` does not bind this diff.
  The first ticket that persists `EncounterState` inherits `shieldHearts` as a field an old record
  must default.

## Coordinator decisions — DLR-110 reconciliation

- **Accepted the central design call: a blue heart is worth 1 point, not 1 whole hit.** This is
  what keeps Shield distinct from Ward, which absorbs a whole hit and breaks. Ward was left
  untouched and its tier defect unfixed, correctly.
- Accepted the rest of the shield model, all agent-decided: **player-only** (a scalar, not a
  side-keyed record); **does not stack and sets downward** (bronze after gold leaves 1);
  **survives a hand, dies at the encounter boundary**; **absorbs before red health inside
  `applyDamage`**, the single funnel, so no route can bypass it; **a dead Quarry spends no blue
  heart**.
- **A second undesigned rule fell out, and it cuts against DLR-109.** A **fully absorbed hit
  does not destroy a queued Apply Damage payout** — it follows from DLR-109's existing
  `playerLostHealth` predicate, and is tested both ways. So the bomb wins *unless* a shield eats
  the whole hit. Nobody designed that interaction; it emerged from two tickets meeting. Flagged
  as a developer decision.
- **Numbers nobody chose:** `CONSUMABLE_AP_COST[Shield]` = **2/3/4**, forced rather than
  chosen — adding `BuffKind.Shield` obliges a price because `apCostOf` throws on an unpriced
  kind. Shipped with an explicit "NOBODY CHOSE THESE NUMBERS" comment in the source, which is
  the right way to do it. `SHIELD_HEARTS` 1/2/3 is transcribed from the ticket, not chosen. No
  colour, glyph or opacity was chosen — none was needed.
- **The DLR-110 / DLR-115 boundary needed no judgement.** The titles mislead; the bodies are
  exact complements. DLR-110's out-of-scope is "rendering the second pip type on screen";
  DLR-115's is "the absorption-order rule itself (engine ticket)". **Nothing of DLR-115 was
  absorbed** — no `HeartState` member, no `duelHealthBars.ts` edit, no CSS, no `.tsx` — and QA
  verified the absences against the diff rather than taking the claim on trust.
- **No mockup went unseen, because none was called for.** With no `.tsx` in the file map this
  was not a UI ticket. Worth recording precisely, since every other UI-ish ticket this run has
  an auto-approved-unseen mockup against its name and this one genuinely does not.
- Suite 1220 → **1259 (+39), 96 files, 0 failures.** Browser pass not requested, not run, and
  its absence blocked nothing — the new rule working as intended.

### Carried into DLR-115 (ticket 12), already left as a handoff comment on the ticket

- The `game-ux` ruling: blue hearts are **two orthogonal dimensions — pip *type* × pip
  *state*** — not a sixth peer state on one row. That is what keeps the crowded bar legible.
- **A latent defect DLR-115 inherits:** `projectedDepletion` knows nothing about
  `shieldHearts`, so **the ticking-Timebomb preview will lie once a shield exists.**

### Time-critical decision the coordinator is taking, since the developer has not

DLR-108 flagged that `apCost`-as-a-derived-lookup must become a **field** on `Buff` if the slot
machine ever needs a per-card *discounted* price — cheap now, expensive once a reel mints
buffs. DLR-112 is next and would settle it by accident. **Decision: keep the lookup.** Nothing
in DLR-112's description calls for per-card discounting, the two-table formula is the property
that makes the whole 78-card pool retunable in one edit, and a discount can later be added as
an optional per-instance override without unpicking the formula. DLR-112 is being told to keep
the lookup and to report back rather than improvise if it genuinely cannot.

## DLR-112 — Slot-machine buff draw and templated buff pool

**GREEN.** Suite 1259 → **1318 (+59), 100 files, 0 failures.** typecheck 0, lint 0, build 0 (135ms).
Five new files in `src/hunt/` — `seededRng.ts` (46), `slotConfig.ts` (33), `buffTemplates.ts` (190),
`slotWeights.ts` (137), `slotMachine.ts` (195) — plus additive re-exports in `index.ts` (264) and
four new spec files. Every file inside the 400-line budget, measured with `(Get-Content).Count`
after Prettier.

### The coordinator's `apCost` decision held, and cost nothing

**`apCost` stayed a derived lookup.** Nothing in this ticket wanted per-card pricing, so the
decision was never even under strain — the slot machine mints ordinary `Buff` objects and
`apCostOf` prices them unchanged. The 78-card pool is still retunable by editing `REWARD_BASE` and
`CONDITION_MODIFIER` alone. No field was added to `Buff`; `buffs.ts`, `buffCosts.ts`,
`buffCatalog.ts` and `config.ts` are untouched.

**The same shape decision got reused, deliberately.** The four tier-parameterised *condition*
thresholds (Hoarder N = 2/3/4, Unbloodied N = 2/3/4, Miser N = 5/10/20, Cornered N% = 60/45/33) are
the identical class of fact — a property of `(family, tier)`, not of a card — so they ship as
`CONDITION_THRESHOLD`, a lookup, rather than as a new field on `BuffCondition`. That also avoids
inventing a second descriptor shape ahead of DLR-125, which AC4 forbids.

### Plan defaults taken (gate auto-approved, nothing developer-confirmed)

- **The drawable pool is the 71 condition templates; the 7 consumables are excluded.** DLR-126 was
  checked live and is still `To Do`, and the ticket forbids pre-empting it. This is also what the
  ticket's own scope update instructs. **AC6 is therefore deliberately unimplemented** — QA
  confirmed the absence is real (every one of the 71 templates satisfies `isConditionFamily`) rather
  than an oversight.
- **Both machines draw the same 71-template pool, differing only in weights.** Two disjoint
  hand-picked lists would have re-decided which cards ship, which AC4 forbids.
- **Tier-parameterised thresholds as a lookup** (above).
- **`BuffCondition.kind` is the `BuffKind` string itself** — `BUFF_CADENCE` is already keyed on it.
- **Nothing is persisted.** A strip is a pure function of `(runSeed, machineId, visitIndex)` via
  `slotSeedFor`, so it is recomputed, never stored. **The rename window `v1-buff-card-list.md` warns
  closes "the moment DLR-112 writes a drawn buff into a save" deliberately stays open** — `BuffKind`
  and `BuffRewardAxis` members are still free to rename. DLR-113 (Vault) is the queued consumer that
  will actually close it.
- **No mockup was called for.** The file map contains no `.tsx` and this ticket renders nothing —
  worth stating precisely, since most tickets this run carry an auto-approved-unseen mockup and
  this one genuinely does not.

### The draw model, and every rate with its justification

**Two dials, kept orthogonal — the central design decision.** Weighting decides *which 8 templates
sit on a machine's strip*; the spin is **flat uniform over those 8**. This mirrors `assignSkulls`,
which already keeps `density` (how many) orthogonal to `weights` (which ranks). The argument for
putting all the weight in the strip draw and none in the spin: a player can see the eight symbols
and compute their own odds, where a hidden per-symbol weight cannot be read. A slot machine whose
posted strip lies about its odds is the one thing the fantasy cannot survive.

| Dial | Value | Where it came from |
|---|---|---|
| Reels | 3 | AC2's match rules are stated over exactly three |
| Symbols per reel | 8 (`REEL_POOL_SIZE`) | **Transcribed from AC3**, not chosen here |
| Strip draw | **without** replacement | AC3 says "how many **distinct** buffs" |
| Spin | **with** replacement, flat uniform | matches are impossible without replacement |
| Free pulls per visit | 1 (`SLOT_FREE_PULLS_PER_VISIT`) | **Transcribed from AC5** |
| Reroll price | 1 coin (`SLOT_REROLL_PRICE`) | **Transcribed from AC5** |
| Reroll cap | none — the coin balance is the cap | agent default; a second cap is a second scarcity rule over one resource |
| Reroll semantics | re-spins the same strip, does **not** redraw the 8 | agent default; see below |

**Tier distribution falls out of the match rules — there is no second rarity roll anywhere.**
Flat over 8 symbols: **P(three match) = 8/512 = 1/64 = 1.6%**, **P(exactly two match) = 168/512 =
32.8%**, **P(all different) = 336/512 = 65.6%**. Expected cards per pull =
`0.656x3 + 0.328x2 + 0.016x1` = **2.64**. Per-card the bronze:silver:gold ratio is about
**147 : 21 : 1**. Gold is genuinely rare without any rarity mechanic existing.

**Can a template repeat?** Not on the strip (8 distinct). Yes on the spin — that is what makes a
match possible at all.

**Weighted by condition family, NOT flat — and this is the call most worth arguing with.** A flat
uniform draw over 71 templates is a legitimate v1 and I considered shipping it. It is rejected
because `Mark of the R` is **22 of 71 templates = 31%**, so a flat strip would be nearly a third
rank-conditioned purely from that family fanning out over eleven ranks — the pool's narrowest,
lowest-agency card would dominate every machine on a fan-out artefact rather than on design intent.
Weights are **normalised per family**, so a family's share of a strip equals its stated weight
regardless of how many templates it contains: `familyWeight x axisWeight / familyAxisTotal`.
**Going flat is a one-line change** — set every weight to `1`.

Resulting family shares (Mark-of-rank falls from a flat 31.0% to 11.5% / 4.2%):

| Family | Cadence | Skirmisher (w/26) | Strongbox (w/24) |
|---|---|---|---|
| Taker | Event | 5 → 19.2% | 2 → 8.3% |
| Feeder | Event | 4 → 15.4% | 2 → 8.3% |
| Glutton | Event | 4 → 15.4% | 2 → 8.3% |
| Mark of the *R* | Event | 3 → 11.5% | 1 → 4.2% |
| Debt Collector | Event | 3 → 11.5% | 2 → 8.3% |
| Sidestep | Event | 2 → 7.7% | 1 → 4.2% |
| Hoarder | Threshold | 1 → 3.8% | 5 → 20.8% |
| Unbloodied | Threshold | 1 → 3.8% | 4 → 16.7% |
| Miser | Threshold | 1 → 3.8% | 2 → 8.3% |
| Cornered | Threshold | 1 → 3.8% | 2 → 8.3% |
| Keepsake | Terminal | 1 → 3.8% | 1 → 4.2% |

**AC1's two leans, stated as numbers:** Skirmisher is **80.8% Event-cadence** (pays inside a hand);
Strongbox is **58.3% Threshold/Terminal** (hand-shaped goals). Axis weights sharpen it —
Skirmisher `Blade 3 / Momentum 3 / Second Wind 2 / Purse 1`, Strongbox `Purse 4 / Second Wind 3 /
Blade 1 / Momentum 1` — because DLR-111 names coins as the one **run-permanent** reward, which is
what makes Strongbox the permanent-upgrade machine rather than just a slower one.

**A reroll re-spins the strip rather than redrawing it.** Not stated in the ticket, so it is the
agent's reading: it is what a physical slot machine does, it gives the machine an identity the
player can plan against, and under the alternative the free pull would be strictly worse than
banking the coin. **Reversible, and the developer's to overturn.**

### How determinism is guaranteed

`Math.random()` appears **nowhere as an executable call in `src/hunt/`** — QA read all 7 grep hits
individually and every one is docblock prose stating the ban. Threading is the convention
`dealRound` / `shuffle` / `assignSkulls` already set: **`rng: Rng` is an explicit parameter on every
function that consumes randomness**, never module state, so nothing survives HMR or leaks between
tests in one file. `createSeededRng` is mulberry32 with 32-bit integer state held in a closure — two
calls with the same seed produce two independent generators, verified by direct execution.
`slotSeedFor(runSeed, machineId, visitIndex)` folds the machine's **index** in `SLOT_MACHINE_IDS`
(not its id string) through `mixSeed`, so machines and visits cannot collide. Reproducibility is
asserted directly: same seed → identical strip, identical spin, identical pull; different seed →
different. **DLR-130's balance simulator can run this headlessly today.**

### Ward and Keepsake — both appeared, handled differently

- **Ward never enters the pool.** It is a consumable, and AC6 is deferred to DLR-126, so the known
  silver/gold defect (indistinguishable from bronze while `DAMAGE_PER_HIT = 1`) is not reachable
  here. When DLR-126 admits consumables, DLR-111's standing recommendation applies: if
  `DAMAGE_PER_HIT` never moves, **delete** those two rows rather than retune them.
- **Keepsake does enter the pool, at the floor weight (1) on both machines.** All three Keepsake
  templates may be unfireable — with `HAND_SIZE = 6` and six tricks the player's hand is empty at
  hand's end, so "hold a card of suit S at hand's end" is false in every hand that runs its course.
  `v1-buff-card-list.md` states the fix "is not an agent's call". **Weighting to the floor rather
  than to zero is the reversible middle**: it keeps the defect visible on the board instead of
  hiding it behind a silent exclusion. **The developer must decide** — reword the condition,
  redefine the end-of-hand instant, or delete the three rows. Three different games.
- **Miser also carries a DLR-111 flag** ("fights the shop" — it pays for *not* spending) and is
  weighted below the other threshold families on the machine whose whole lean is run-permanent
  value. Flagged there for deletion at the developer's discretion.

### The Defender's `Unassigned` warning — checked, not applicable here

`apCostOf` throws `RangeError` on `BuffKind.Unassigned` and `seedStartingBuffPile` mints four of
them into `RunState.buffs`. **Nothing in this diff calls `apCostOf` over a pile** — every buff minted
here comes from a `BuffTemplate`, whose `kind` is `BuffConditionKind` by the type system, so it is
priceable by construction. **The warning still binds whoever wires `RunState.buffs` into
`buffActivationStock`** — it was not discharged by this ticket, only sidestepped.

### One real defect the reviewers caught, fixed in a single round

Defender found that `spinReels` on an empty strip computes `reel[-1]` and hands `resolvePull` three
`undefined`s, surfacing as an opaque `TypeError` on `symbol.id` instead of a domain error.
Unreachable today, but **one bad edit to `slotWeights.ts` away** — and the plan itself invites that
edit by framing "go flat" as a one-line change. Fixed by making `drawReelPool` **throw `RangeError`
on a short strip**, naming the weight tables as the likely cause.

The fix took a shape worth recording: rather than introduce `vi.mock` to test the throw — **there is
zero mocking anywhere in this codebase** and one test is a bad reason to start — `drawReelPool`'s
weight function became a **defaulted parameter**, exactly as `assignSkulls` already defaults
`density` and `weights` "so a curve can be tested without mutating module state". That made the
guard directly testable **and** happens to be the injection point **DLR-113's Vault-driven odds
adjustment** will need. Three tests added. Code-Evaluator and QA both returned clean with zero
findings; Defender's two remaining items were Info-only (documented, not code changes).

### What a browser would have checked: nothing

Not requested, not run, and genuinely inapplicable — this contract adds zero `.tsx` and zero
render surface. QA reached the same conclusion independently. The real judgement is a balance
simulation (DLR-130) and a play session, both of which the seeded RNG exists to enable.

## Coordinator decisions — DLR-112 reconciliation

- **Accepted the two-dial draw model, and it is the best-argued design call of the run.**
  Weighting decides which 8 templates sit on a machine's strip; **the spin itself is flat
  uniform over those 8.** The reasoning: a player can see the eight symbols and compute their
  own odds, whereas a hidden per-symbol weight cannot be read — a machine whose posted strip
  lies about its odds is the one thing the fantasy cannot survive. That is a real design
  argument, not a coin flip dressed up.
- **Accepted family weighting over a flat pool — the call most worth arguing with.** Flat over
  71 templates is legitimate, and the agent considered and rejected it: `Mark of the R` is
  **22 of 71 = 31%**, so a flat strip would be nearly a third rank-conditioned purely because
  one family fans across eleven ranks. Weights normalise **per family**, so a family's share is
  its stated weight rather than its template count, dropping Mark-of-rank to 11.5% / 4.2%.
  **Going flat is a one-line change** if the developer disagrees.
- **Tier distribution was not chosen — it falls out of the match rules.** There is no second
  rarity roll: gold **1/64 = 1.6%**, silver **32.8%**, triple-bronze **65.6%**, expected **2.64
  cards per pull**, bronze:silver:gold ≈ **147 : 21 : 1**. Worth knowing before retuning
  anything: the tier curve is a consequence of "3 reels, 8 symbols", not an independent dial.
- **Determinism held, which was the hard constraint.** No `Math.random()` anywhere in
  `src/hunt/` — all 7 grep hits are docblocks stating the ban, each read individually rather
  than counted. `rng: Rng` is an explicit parameter on every consumer, never module state;
  `createSeededRng` is mulberry32. A strip is **recomputed** from
  `slotSeedFor(runSeed, machineId, visitIndex)` rather than stored, so nothing is persisted and
  the save-versioning rule stays inert. DLR-130's simulator and the balance pass are safe.
- **`apCost` stayed a lookup.** The coordinator's decision held and the ticket never strained
  it — so the two-table retune property survives into the reel.
- **Accepted an agent reading not in the ticket:** a reroll **re-spins the same strip** rather
  than redrawing it. Flagged as the developer's to overturn. Also transcribed, not chosen:
  1 free pull per visit, 1 coin thereafter, **no reroll cap** — the coin balance is the cap.
- **Accepted `Keepsake` shipping at floor weight rather than being excluded.** It may be
  unfireable, but DLR-111 ruled the fix is not an agent's call — reword it, redefine the
  end-of-hand instant, or delete the three rows. Shipping it at floor weight keeps the decision
  the developer's while limiting the blast radius. **Ward never entered the pool** — it is a
  consumable, AC6 is deferred to DLR-126, so its silver/gold defect is not reachable here.
- Suite 1259 → **1318 (+59), 100 files, 0 failures.** One fix round; ceiling not approached.

### A real defect caught in review, and a fix worth copying

The Defender found that an **empty strip would make `spinReels` index `reel[-1]`** and surface
as an opaque `TypeError` — unreachable today, but one bad weight edit away, and the plan itself
invites exactly that edit. Guarded with a `RangeError` in `drawReelPool`.

The fix is notable for what it refused: rather than introduce `vi.mock` to test it — **there is
zero mocking in this codebase, and one test is a bad reason to start** — the weight function
became a defaulted parameter, following `assignSkulls`'s existing convention. That happens to
be exactly the injection point **DLR-113's Vault odds adjustment** will need, so the test-driven
change bought the next ticket its seam.

## DLR-113 — Vault: cross-run meta-progression

**GREEN.** Typecheck 0, lint 0, **1403 passed of 1403 across 107 files, 0 failures** (baseline
1318/100), build 0, contract-scoped `prettier --check` 0. One fix round; ceiling not approached.
All three reviewers approved in round 2.

**This is the first ticket in the project's history that persists anything.** `src/persistence/`
shipped on DLR-106 with zero consumers; it now has exactly one, `src/vault/vaultStore.ts`. That
cheap window — "nothing is on disk yet, so a shape change costs nothing" — is now closed.

### What persists, what it costs, what it buys

`VaultState = { balance, oddsBoosts, startingGrants }`, written under save section `'vault'`.

- **Balance** — Vault currency. Credited **only on a run ending in death**, at
  `floor(leftoverCoin / VAULT_EXCHANGE_RATE)`. Never on a win: AC1 says "a run ending in death",
  and paying the Vault for a win would make the strongest players accumulate fastest, which is the
  exact shape of a trivialised run 10.
- **`oddsBoosts`** — `templateId -> stacks`. **Permanent** (AC2's "for future runs", plural).
  Multiplies that template's weight in the slot-machine reel draw.
- **`startingGrants`** — a queue of `{templateId, tier}`. **Consumed at the next run start.**

### Every number, with its justification

| Constant | Value | Register | Why |
|---|---|---|---|
| `VAULT_EXCHANGE_RATE` | 10 | **TRANSCRIBED** | AC1 states it outright. Not mine to choose. |
| `VAULT_ODDS_BOOST_PRICE` | 1 | agent-chosen | The cheapest thing in the game, deliberately: it is the only purchase a single 10-coin death can afford, so the currency is never dead on arrival. |
| `VAULT_ODDS_BOOST_MAX_STACKS` | 3 | agent-chosen | The anti-trivialisation cap. See the arithmetic below. |
| `VAULT_ODDS_BOOST_STEP` | 1 | agent-chosen | Additive: `weight x (1 + step * stacks)`, so maxed = x4. |
| `VAULT_STARTING_TIER_PRICE` | 2 / 5 / 10 | **DERIVED**, not invented | Exactly `REWARD_TIER_VALUE[Coins]`'s existing 2/5/10 bronze:silver:gold ladder. The game already states what a tier is worth; the Vault charges that rather than holding a second opinion. Retune them together. |

**Where these sit between the two failure modes.**

*Run 1 is not a punishment.* Nothing is gated. Every one of the 71 templates is reachable at
balance 0, and the opening pile is still `STARTING_BUFF_COUNT = 4`. The Vault adds **steering**,
never a stat — run 1 is the whole game with a randomised offer set, which is what a roguelike's
run 1 should be.

*Run 10 is not trivial.* Two levers. **The boost is capped at x4**: a template's chance of landing
on a given 8-of-71 strip goes from roughly 11% to roughly a third — clearly felt, never guaranteed,
and DLR-112's posted-strip fantasy survives. (Approximate: the exact figure moves with per-family
normalisation.) **Grants are consumed on use**, so a gold card costs 10 currency — about 100
leftover coin — *every run you want it*, and never becomes a permanent power floor. That
consumption rule is the single most important lever in the ticket and the first thing to
reconsider if progression feels flat.

**One number I shipped as specified while flagging it loudly.** At today's economy
(`COINS_PER_ENCOUNTER_WIN = 1`, shop prices 1–4) a run that dies at fight three plausibly holds
**0–5 leftover coin, which converts to 0**. Rate 10 is transcribed from AC1 so I did not overturn
it; I priced the cheapest purchase at 1 so a 10-coin death buys *something*. **The developer
decides after playing** whether to lower the rate or raise coin income.

### The persisted shape, and why it carries no `Buff`

DLR-107 recorded that widening `Buff` with a required `kind` was free *only* because the buff pile
was unpersisted — "after DLR-113 this would need a schema bump". **The answer is that it never
lands.** A bought card is stored as `{ templateId, tier }` — the minimal pair `mintFromTemplate`
needs — and the live `Buff` is minted fresh at run start. No domain type is ever on disk, so
`Buff` stays free to widen forever. It also means retuning `REWARD_TIER_VALUE` reaches every
existing save for free, where persisting the derived reward would have left old saves paying old
numbers.

`VaultState` is deliberately **one type**, in-memory and persisted, not a DTO pair — two shapes
drift, one shape with a guard over it cannot. The cost is that every future field is a persisted
field, which is the point: it forces the version question at the field.

**`BuffTemplate.id` was documented "NOT persisted" by DLR-112. DLR-113 overturns that
deliberately**, and fixed the statement where it is owned rather than leaving a comment
contradicting the data. The id is now a persisted key and its format `<kind>[:<param>]:<axis>` is
frozen — renaming a `BuffKind` or `BuffRewardAxis` **value** now orphans saved entries. Chosen over
persisting `{kind, target, axis}` because the id admits one total, cheap guard (membership in
`BUFF_TEMPLATES`) where coordinates would validate three vocabularies and then still have to search.

### The unmigratable save — the question DLR-106 deferred to this ticket

**Discarded, and the player starts fresh — but non-destructively.** `createSaveStore` already
returns `VersionMismatch` / `Corrupt` paired with the default; `loadVault` passes both the empty
vault *and* that outcome back, so DLR-118's screen can say "your Vault could not be read" instead
of showing a silent zero.

The read deliberately does **not** call `clear()`. A read must not destroy data, and leaving the
bytes in place is what lets a future version write a migration for them; the record is simply
replaced by the next write. Migration is the wrong answer at version 1 for a concrete reason:
there is exactly one schema version in existence, so a migration function today would have no
source shape to migrate *from* and would be untestable speculation. `SAVE_SCHEMA_VERSION` stays 1.

The half-load is what the rule forbids, and the two-stage design is what avoids drifting into it:
**`isValidVaultState` is a SHAPE guard** that accepts or rejects the whole payload, and
**`reconcileVault` is a separate DOMAIN pass** over an already-valid payload that drops only
entries naming templates this build no longer has, returning a count. Shape failure loses the save;
domain drift loses the affected entries and **keeps the balance**.

### The DLR-113 / DLR-118 boundary — my reading

**DLR-113 is the mechanism; DLR-118 is the screen.** I shipped: the state, the store, both spend
functions with their refusal predicates, the odds seam, grant minting, and the two wiring points
that make it actually run (deposit when the run's outcome becomes `Lost`; claim grants when the
Start screen's button begins a run). I built **no `.tsx`** — no balance display, no spend button,
no navigation from the verdict flow. Those functions are what DLR-118's buttons will call.

**I absorbed nothing of DLR-118's work.** The one thing worth knowing: the two spends have no way
to be invoked in the app today, because invoking them is the screen's job. And a second: AC2's
"re-applied on run start" has no *visible* surface, because DLR-112 shipped the slot engine with
no screen either — `drawVaultReelPool` has no production caller yet and is exercised by tests only.
That is structural, not a gap. Left DLR-118 a handoff comment on its Jira ticket.

### Assorted, including one thing worth arguing with

- **Grants being one-shot is a rule reading, not a transcription.** AC3 says "a future run's
  starting pile", singular. If the developer meant permanent, the change is deleting one
  `clearStartingGrants` call in `App.tsx` — and the meta becomes compounding.
- **`Miser` and the Vault point the same way.** DLR-111 flagged Miser as "fighting the shop" by
  rewarding unspent coins; the Vault also rewards unspent coin, so it **reinforces** the tension
  rather than resolving it. Left alone deliberately — at rate 10, hoarding is still the weaker play
  (10 coin buys 2 Whetstones and 2 Cheats now, versus 1 odds boost later). Worth watching.
- `Keepsake` and `Ward` were not touched — neither is reachable from this ticket's diff.
- **Determinism held.** `src/vault/` calls no random source; `drawVaultReelPool` threads `rng`
  straight through. `src/vault/**` was added to the pure-core ESLint fence **and** to the storage
  block's `ignores` — the second is load-bearing, because flat config *replaces* rather than merges
  same-key rule options, the exact regression caught on DLR-106. The Defender probe-tested the
  fence with a throwaway `window.location.href` file rather than trusting a green lint run.
- **The one real defect review caught:** `commit` was discarding `saveVault`'s `SaveWriteOutcome`,
  so a quota-exceeded or private-browsing write would silently diverge the in-memory vault from
  disk — the one place in the contract a failure was computed then thrown away. Fixed with
  `lastWriteOutcome` on `VaultHandle`, the write-side twin of `loadOutcome`. DLR-118 now has a
  failure channel to render instead of inheriting a silent one.
- **No browser pass** — not requested; none was run and none is claimed. What one would have
  checked: the Start screen's "Fight &lt;name&gt;" button still advancing into the first fight (the only
  behaviourally reachable change), a clean console on load and remount, and that the Vault balance
  is held but rendered nowhere — which *is* the DLR-113/DLR-118 line.

## Coordinator decisions — DLR-113 reconciliation (second session-limit recovery)

**The agent hit the API session limit on the tail of its documentation pass** (reset 00:20;
the run resumed at 03:30). Unlike the DLR-129 interruption, this one died with the ticket
essentially finished — so the recovery was verification rather than salvage.

- **Verified the state myself rather than trusting a dead agent.** Contract at **44/44 tasks,
  `Status: COMPLETE`**; both module docs written (`vault/README.md`, `vault/saving-the-vault.md`);
  the agent's own log section present. All four gates run by the coordinator: typecheck exit 0 ·
  lint exit 0 · vitest **107 files, 1403 tests, 0 failures** (baseline 1318/100, so +85 tests,
  +7 files) · build exit 0.
- **Scope-checked against DLR-118 before committing**, because the tree showed `src/App.tsx`
  modified and a new `src/app/vault/`. **DLR-118 was not absorbed**: `src/app/vault/` contains
  `useVault.ts`, a hook, not a screen — there is no Vault `.tsx` component anywhere. `App.tsx`'s
  change is the wiring only: leftover coin converts to Vault currency at the single place a
  run's outcome is decided, and **only on a loss** (a win is its own reward), with `run.coins`
  deliberately not zeroed because the verdict panel still reads it.
- **The one piece of unfinished work was the implementation index**, which did not list the new
  module. The coordinator added `src/vault/` and `src/app/vault/` rows to
  `.docs/implementation/README.md` and committed the whole thing as `29e974f`.
- **Jira moved to Ready for Test by the coordinator**, since the agent died before transitioning
  it. Confirmed via `getJiraIssue` after the transition rather than assumed.

### The run's own lesson, applied by a later ticket

`eslint.config.js` adds `src/vault/**` to the pure-core boundary **and** lists it under
`ignores` in the narrower `no-restricted-globals` block — because flat config replaces rather
than merges same-key rule options. That is exactly the trap that silently disabled the
`window`/`document`/`fetch` bans during DLR-106 earlier in this run, while `npm run lint` kept
exiting 0 throughout. The agent's comment cites the reason. Worth recording: the correction
propagated without anyone re-teaching it.


## DLR-114 — Pre-hand loadout action bar

**The ticket that makes the buff system reachable.** Ten tickets built it bottom-up and none of it
was on screen: no buff was drawn into a hand, no condition was read, no button activated anything,
and `BuffActivationState` had no owner. DLR-114 is the wiring. It also retires four felt-rail plates
and puts a fourth row on a grid that must never scroll.

**Gates:** typecheck exit 0 · lint exit 0 · vitest **112 files, 1453 tests, 0 failures** · build
exit 0 · `prettier --check` (this contract's files) exit 0. Baseline was 107/1403; this contract
deletes two component specs and adds seven, so 112/1453 is the expected arithmetic, not a drift.

### Plan defaults taken (the gate was auto-approved, nobody saw the plan)

Four judgement calls the ticket carries are normally the developer's. Each was decided in
`plan.md` Part 1 → Assumptions made, and **each is theirs to overrule after playing it**:

- **The bar is always mounted, for the whole hand, and never removed.** Controls grey with their
  reason on their own face. A control that vanishes costs more than one that greys — the player
  relearns where things are, and the layout reflows on a screen that must not scroll. Follows
  `TimebombCharge`'s existing precedent ("the rail stays inert rather than absent at zero charges").
- **Activation is reversible until the second tap and committing after it.** `activateBuff` spends
  through `spendAp` and `activatedThisTrick` has no removal path — the engine ships no un-activate,
  so inventing a refund here would be writing a rule `src/hunt/` does not own. The reversibility is
  the poise stage instead: one tap poises, a second commits, `Escape` drops it unspent. That is the
  grammar Cheat, Timebomb and Apply Damage already use, so the bar teaches one ritual, not a fifth.
- **When the player can afford nothing, Apply Buff still opens.** The panel is where they read what
  they own and what it costs; hiding it because it is momentarily unaffordable hides the information
  the next decision needs. Only a closed window disables the button; individual rows grey with
  `InsufficientAp` on their face.
- **A buff's condition and reward are one glanceable line**, and that same string is the row's
  accessible name so the sighted and screen-reader surfaces cannot drift:
  `Bell-Taker (Momentum) — win a trick with Bells: +3 multiplier. 2 AP.` The family words, the four
  reward suffixes and the twelve condition sentences are **transcribed** from
  `v1-buff-card-list.md` → *How a card is named*, not invented. The eight activated/consumable
  cards have no row in that table; their wording is this ticket's own placeholder copy, marked so.

Two further defaults, taken for the same reason:

- **Cheat and Timebomb moved *into* the loadout panel rather than being deleted.** AC1 requires the
  separate rails to go, but their mechanics are live and player-reachable, and deleting their only
  driver would be a regression the ticket does not ask for. Re-mounting the existing components
  inside the panel satisfies "one place for every pre-trick decision" with no rule change.
- **`ApplyDamagePlate` and `DiscardPlate` were deleted outright**, with their stylesheets and specs,
  because the bar's own buttons fully supersede them. Their label functions in `labels.ts` survive
  and are reused, so no copy was rewritten.

**Mockup:** `.claude/contract/DLR-114-pre-hand-loadout-action-bar/mockup.html` was generated and
**went unseen** — the gate was skipped per this run's override, and it was not published as an
Artifact. It is a layout/interaction reference only; the developer has never looked at it.

### The `Unassigned` placeholder trap, handled

The defender warning raised twice against this ticket was real and would have fired. `startRun`
seeds `STARTING_BUFF_COUNT = 4` buffs of `BuffKind.Unassigned`, and `apCostOf` **throws
`RangeError`** on placeholder content by design. Wiring `RunState.buffs` into the felt without a
filter puts that throw one render away from a player.

Closed in the **pure layer**, not in JSX: `isPricedBuff(buff)` and `activatableBuffs(buffs)` in
`src/hunt/buffActivation.ts`, mirroring `buffApCost`'s own two branches rather than restating them,
so a kind added to either pricing table is admitted automatically. The felt reads it once through
`offeredBuffs(state)` in `roundUiState.ts`, and both the panel's rows and `handleTapBuff`'s guard
read that single statement. `buffActivation.priced.test.ts` pins it directly: every buff
`seedStartingBuffPile` mints is rejected *and* asserted to throw from `apCostOf`; every buff the
filter keeps is asserted not to.

A second, sharper version of the same trap surfaced only under integration: `useRovingTabIndex`
probes `isFocusable(0)` unconditionally even on an empty collection, so `refusalFor(buffs[0])` on an
empty pile reached `apCostOf(undefined)` and crashed — invisible to the panel's own spec, which
stubbed the refusal. Fixed with the `buffs[index] !== undefined` guard `HandFan` already documents.

### One AP pool, not two

The felt had **two** independent numbers both claiming to be the hand's action points:
`RoundUiState.apPool`, which Apply Damage spent from, and `BuffActivationState.apPool`, which
nothing spent from. They had never been observed to diverge because nothing had ever spent from the
second. This is the first ticket that spends from both, so the field was deleted and replaced by
`buffActivation: BuffActivationState`. Divergence is now unexpressible. `buffActivationStock.test.ts`
pins the invariant: `buffActivationStock(...).apPool` and `applyDamageStock(...).apPool` resolve to
the same figure.

### A regression this ticket introduced, found and fixed inside it

Relocating Cheat and Timebomb into the panel put them behind the Apply Buff button, which was gated
on `discardWindowOpen` (`currentTrick.length === 0`). That is **structurally incompatible** with
"the player is following a card the Quarry already led" — which is exactly when a Cheat has value,
because it is the only moment a follow-suit restriction exists to break. Two pre-existing
integration specs pinned that scenario; the Phase 5 implementer noticed, correctly refused to
decide it, rewrote both specs to pin the narrowed behaviour, and flagged it.

**Coordinator ruling: the door widens, the window does not.** `loadoutDoorOpen = discardWindowOpen
|| canAct` gates *opening* the panel; `buffActivationRefusalFor` still gates *activating a row*.
Opening the panel is not a game action — it is reaching for the drawer, and it must be available
whenever the player can act at all. Mid-trick the panel now opens, Cheat and Timebomb inside it are
live exactly as before DLR-114, and every buff row is disabled reading "Not between tricks." Both
specs were restored to pinning the original behaviour and the regression-accepting comments deleted.
This restores a pre-existing baseline rather than inventing anything, which is why it was not a
developer pause.

### Other decisions and findings worth carrying forward

- **`timebombDamageFor` / `timebombDamageOf` were NOT collapsed.** DLR-129 nominated "whichever
  ticket wires the felt onto the catalog". This one wires the felt onto the *pile* and the
  *activation flow*, not onto `buffCatalog.ts`: the live Timebomb mechanic still runs on
  `timebombDamageFor` reading `config.ts`, `timebombDamageOf` still has no caller, and
  `CheatStage`/`TimebombStage` were relocated unchanged. Renaming here would be a rename with no
  behaviour behind it, in a module otherwise outside this diff. **The nomination should move to the
  ticket that actually replaces `commitTimebomb` with `activateBuff(timebombBuff(...))`.**
- **The plan's config audit undercounted `RoundUiSeed`'s construction sites — 2 named, 11 real.**
  Making `buffs` required broke nine further spec files at typecheck. The implementer fixed all of
  them rather than leaving the build red, and flagged the audit methodology: it had searched for
  component mount sites rather than direct `createRoundUiState` calls across `__tests__/`. Worth a
  `/fb-issue` against the planning step.
- **Defender caught a real layout defect no test could.** `warCouncilHunt.css` carries a
  narrow/short-viewport override that redeclares `.wc-shell`'s `grid-template-areas`, and it was
  never given the new `actions` row — so on a phone-sized or short-laptop window the bar fell out of
  its slot into implicit auto-placement. It probably landed correctly by accident, being last in DOM
  order, which is exactly what makes it fragile. Fixed, with a comment tying the two rules together.
- **`ActionBar`'s `stopPropagation` docblock claimed to be load-bearing and was not** — the bar is a
  *sibling* of `.wc-table`, not a descendant, so its clicks can never reach `handleCarryOn`.
  `BuffLoadoutPanel`'s identical-looking stop genuinely is load-bearing. The claim was corrected
  rather than the code removed, because the risk is a future reader deleting the panel's real stop
  believing the bar's covers it.
- **`roundControlsProps.ts` was not in the plan's file map.** It was split out mid-implementation
  when `WarCouncilRound.tsx` measured 403 lines, three over the blocking budget — fixed in-ticket
  as the rule requires. Code-Evaluator judged it a real seam rather than a line-count dodge, but
  flagged its nine positional parameters (three of them same-shaped nullable refusals that transpose
  silently); converted to named-field options objects in the fix pass.
- **`CheatSlots` and `TimebombCharge` each needed `e.stopPropagation()` on their Escape handler**,
  because nesting them inside the panel meant cancelling a selection also closed the whole panel.

### Reviewers

All three, given the diff is production UI and logic. Code-Evaluator ISSUES FOUND (2, both minor —
the positional-parameter helper and an unexplained `as never` cast in a spec). Defender ISSUES FOUND
(0 critical, 2 warnings — the media-query grid row, the false `stopPropagation` claim). QA **ALL
PASSED**, no `ac-test-gap`, every AC traced to a test. One combined fix pass cleared all six items,
plus the missing `pr-description.md` QA flagged. One round used of the two available.

### No browser pass — and precisely what one would have checked

**Not requested, so none was run and none is claimed.** This matters more here than on any prior
ticket in this run: it is the first surface the buff system renders on, and **nobody will look at it
until DLR-119**. jsdom has no layout engine, so nothing in the 1453 passing tests substitutes for
any item below.

1. **The shell still does not scroll with a fourth grid row** (`auto 1fr auto auto`) at 1280×800,
   1024×768, 1366×768 and 390×844. The single highest-risk unverified claim in the ticket.
2. **The narrow/short-viewport override actually places the bar** at ≤44rem wide or ≤34rem tall —
   the defect Defender caught is fixed in CSS but has never been rendered.
3. **The hand fan is not cropped or overlapped** by the bar at those short viewports.
4. **The loadout panel's own scroll is contained** (`max-height` / `overflow-y`) and never leaks to
   the page when the pile is large.
5. **Every CSS custom property `warCouncilActionBar.css` references resolves** rather than silently
   falling back — `--wc-brass`, `--wc-brass-dim`, `--wc-alarm`, `--wc-chalk`, `--wc-chalk-dim`,
   `--wc-chamber-lift`, `--wc-serif`, `--wc-ui-transition-ms`. All are declared in `warCouncil.css`,
   which the mount still imports, but a deleted stylesheet is exactly what breaks an import order.
6. **No visual gap or stray divider survives** where the four plates sat. The `.wc-felt-rail-split`
   rule and every `wc-apply-*` / `wc-discard-*` selector are gone by grep; only a browser confirms
   there is no residue.
7. **A clean console** on mount, on opening the loadout, on activating a buff, and on pressing
   Apply Damage.
8. **The queued-payout note is legible on the button's face** rather than clipped by its bounds.
9. **The four bar buttons meet the 44×44px hit-area floor** at the smallest viewport.

### What the developer must look at

- **Does the bar feel like one ritual, or four buttons in a row?** Open Apply Buff, activate a buff,
  arm a Cheat from inside the panel, Swap, then press Apply Damage twice. The whole ticket rests on
  this reading and no test can answer it.
- **Is two taps the right cost for activating a buff?** One tap is cheaper and irreversible.
- **Should condition-family buffs be offered at all yet?** Activating one spends AP and does nothing
  else — `buffAccrual.ts` still has no caller. A one-line change to `isPricedBuff` would hide them
  until they fire.
- **Should `seedStartingBuffPile` mint real content?** Until it does, a fresh run with an empty Vault
  shows an **empty** buff list, and only the relocated Cheat and Timebomb rows. That is a content
  decision, not this ticket's.
- **Every value in `warCouncilActionBar.css` is a placeholder** copied from the sibling rail
  stylesheets. The polish ticket owns them.
- **The four AP figures behind the bar** (`STARTING_AP = 6`, `APPLY_DAMAGE_AP_COST = 3`, plus
  `REWARD_BASE` and `CONSUMABLE_AP_COST`) are agent-chosen and have never been played. This is the
  first surface that makes them visible; the first hand played against them is the first evidence.

### Is the buff system genuinely reachable now?

**Partly, and the plan says so rather than overclaiming.** A player can open the loadout, read every
owned priced buff with its cost and condition, spend AP on it, and watch the pool fall — end to end,
through the real reducer, pinned by `WarCouncilRound.actionBar.test.tsx`. But the pile a fresh run
opens with is four `Unassigned` placeholders, which this ticket deliberately filters out, so real
priced buffs appear only when the Vault granted templates. And an activated condition buff still
pays nothing. What is reachable today is **activation**; **firing** is a later ticket's.

## Coordinator decisions — DLR-114 reconciliation

**The largest ticket of the run: 70 files, +5462/−772, and the first one a player can see.**
Suite 1403 → **1453, 112 files, 0 failures** (−2 deleted specs, +7 new).

- **Accepted the deletion of two shipped components.** `ApplyDamagePlate.tsx` and
  `DiscardPlate.tsx` are gone, along with their stylesheets and specs, folded into one
  `ActionBar`. This is the right shape — one ritual instead of four scattered buttons — but it
  is a **structural rewrite of the felt with no browser verification whatsoever**, which is the
  sharpest edge of the deferred-QA trade so far.
- **Accepted five interaction rules, all agent-decided:** the bar is **always mounted**, with
  controls greying and stating their reason on their own face rather than disappearing;
  **activation is reversible until a second tap** (one tap poises, a second spends, `Escape`
  drops it) — chosen because the engine ships no un-activate and inventing a refund would be
  writing a rule `src/hunt/` does not own; **Apply Buff opens even when nothing is affordable**,
  because the panel is where you read what you own and what it costs; and condition + reward
  render as **one line that doubles as the row's accessible name**, with the grammar transcribed
  from `v1-buff-card-list.md` rather than invented.
- **Accepted a regression fix the implementer correctly refused to decide alone.** Relocating
  Cheat and Timebomb behind Apply Buff put them behind `discardWindowOpen`, making them
  unreachable while *following* a lead — exactly when a Cheat has value. Resolved as
  **`loadoutDoorOpen = discardWindowOpen || canAct`**: the door is wider than the window, while
  buff rows keep the between-tricks rule.
- **The `Unassigned` trap is closed, twice.** Once in the pure layer (`isPricedBuff` /
  `activatableBuffs` mirror `buffApCost`'s own two branches), with a spec asserting every
  `seedStartingBuffPile` buff both fails the filter *and* throws from `apCostOf`. A second
  instance surfaced only under integration — `useRovingTabIndex` probes `isFocusable(0)` on an
  empty collection, so `refusalFor(buffs[0])` reached `apCostOf(undefined)`.

### Reachability, stated honestly rather than claimed

**Activation is reachable; firing is not.** A player can open the loadout, read each owned
priced buff, spend AP and watch the pool fall — pinned through the real reducer. But a fresh
run's pile is four `Unassigned` placeholders which are filtered out, so real buffs appear only
via Vault grants; and an activated **condition** buff still pays nothing, because
`buffAccrual.ts` has no caller. The agent declined to overclaim this, correctly.

### Nine unverified items — the deferred-QA bill, and it is now due

No browser pass ran. The top three, all plausible and all invisible to the gates:

1. **The shell may scroll** with a fourth grid row at 1280×800, 1024×768, 1366×768, 390×844.
2. **The narrow/short-viewport override may not place the bar at all** — the Defender caught
   that `warCouncilHunt.css` redeclares `.wc-shell`'s areas and never received the `actions`
   row. Fixed, but **never rendered**.
3. **The hand fan may be cropped** by the bar.

Full list in the agent's log section and in `pr-description.md`. This is the concrete cost of
the browser-QA decision, recorded so the end-of-run pass starts here rather than hunting.

### Two carried items

- **`timebombDamageFor` / `timebombDamageOf` were deliberately NOT collapsed.** This ticket
  wires the felt onto the *pile*, not the catalog, so the rename would have no behaviour behind
  it. The nomination moves to whichever ticket replaces `commitTimebomb` with `activateBuff`.
- **A recurring planning defect, now twice observed.** The plan's config audit undercounted
  `RoundUiSeed`'s construction sites **2 vs 11**; DLR-110 hit the same class at 1 vs 2. The
  coordinator is fixing `/fb-plan`'s audit step directly rather than filing it, since eleven
  tickets remain and each would inherit the same gap.


---

## DLR-115 — Health bar: rendering blue hearts

**GREEN.** typecheck 0 · lint 0 · `npm test -- --run` **1474 passed of 1474, 112 files** (pre-ticket baseline 1453) · build 0. Reviewers: Code-Evaluator APPROVED, Defender APPROVED (0/0/0), QA FAILURES FOUND → one fix pass → QA ALL PASSED. Two rounds used of two.

### The type × state model, as built

`HeartState` still has **exactly five members**. A sixth was the named failure mode and it did not happen. The second dimension is a new `as const` map beside it:

```ts
export const PipType = { Health: 'health', Shield: 'shield' } as const
```

`HealthBarView` keeps `hearts: readonly HeartState[]` untouched and gains a sibling `shieldPips: readonly HeartState[]` plus the scalar `shielded: Health`. **The array a pip lives in is its type; the shared `HeartState` value is its state.** Both reach the DOM as `data-type` + `data-state`, and every pre-existing `.wc-hp-heart[data-state=…]` selector was re-qualified with `[data-type='health']` — including both entries in the `prefers-reduced-motion` block. The stylesheet now selects on the product rather than on a flattened sixth value.

Two-array over `hearts: readonly HeartPip[]` was a **blast-radius call, not a shape preference**: the element-type widening would have touched `ShopPanel.tsx`, `App.tsx` and ~20 existing assertions for no behavioural gain. Code-Evaluator was asked directly whether that was a DRY smell and judged it defensible — the two arrays are different lengths from different domains (`max` vs `ceil(shielded)`) and `shieldPips`'s value set is a strict subset.

**Shield pips produce only `Whole` and `Ticking`.** A spent blue heart simply stops being drawn — there is no shield graveyard — so `Breaking`/`Broken` are structurally unreachable for that type and no dead branch was written for them.

### The `projectedDepletion` fix — and why it is the same piece of work as the state dimension

`projectedDepletion` gained a **required** 5th parameter `shieldHearts: Health` (not defaulted: a default would let a future caller silently reintroduce the lying preview) and routes the player's booked Timebomb through `absorbWithShield` before subtracting from red health. The absorption rule was **never re-derived** — Defender and Code-Evaluator both grepped for an inline `Math.min(shield, …)` and found none.

The thing worth recording is that the fix *produced* the shield's only live state. One `absorbWithShield` call answers two questions: how much damage reaches red health (→ `secure`, the red `ticking` band, and `lethal`), and how much of the shield is already claimed (→ which blue pips render `Ticking`). Fixing the preview is what gave blue hearts something to be in a state about; without it a shield pip would have been a constant.

Tested both directions, as the brief demanded: with a shield (red spared), without (`NO_SHIELD_HEARTS` → byte-identical to before), the partial case, and the Quarry's untouched path. **No pre-existing expectation's value changed** — QA confirmed zero `.toBe(...)` edits alongside the appended 5th arguments.

Fractional shields (`DAMAGE_ROUNDING = None` admits 1.5 blue hearts) round **up into a whole pip** by exactly the `i < value` rule the red row already uses — one rounding rule for the row, not a second one for blue. A `RangeError` guard covers non-finite and negative, exercised by `it.each([-1, NaN, +Infinity])`; without it `Array.from({length: NaN})` yields `[]` and renders nothing while logging nothing.

### The new spoken form

```
"10 of 10." + [" 2 shielded." | " 2 shielded, 1 of them ticking."] + [" 3 at risk."] + [" 4 ticking."] + [" Lethal."]
```

Order is standing → shielded → at risk → ticking → lethal: outermost protection to innermost certainty, matching the row's own reading direction. `of them` exists because without it `"2 shielded, 1 ticking. 3 ticking."` reads as two unrelated ticking figures.

**The worst case is asserted verbatim in a spec so its length is on the record:** `'10 of 10. 2 shielded, 1 of them ticking. 6 at risk. 4 ticking. Lethal.'` That is a shield, a booked Timebomb and a live streak at once. **Judge whether anyone listens to that sentence.** Dropping `of them` shortens it and makes it ambiguous; that trade is yours.

`aria-valuenow`/`aria-valuemax` stay **red-only** — a 10/10 player with a shield still reports 10 of 10, never 12. The shield is a buffer on top of the bound, not part of it. The cluster renders inside the same `role="meter"`, so the bar stays one reading with one accessible name rather than announcing a second bounded value it is not.

### Plan defaults taken (no approval gate — every one is unreviewed)

1. **Type dimension as a second array**, not a widened element type. Blast radius.
2. **Shield pips are `Whole`/`Ticking` only.** No graveyard.
3. **The cluster sits inboard of the red run**, past the broken-heart graveyard, nearest the centre. Buys one statable rule for the whole row: *further toward the centre = sooner lost*. The alternative — the anchored screen edge, where most games put armour — puts the two clusters in opposite depletion directions. **It does mean live blue pips are separated from live red pips by dead ones.**
4. **A shield pentagon, not a blue heart.** The ticket says "blue hearts"; the `game-ux` hard floor says state must read without colour alone, and a blue heart beside a red heart is a colour swap that vanishes in greyscale. If you want a heart silhouette, the type has to be carried some other way — a ring, a badge, a size step — and that is a redesign of this row, not a token change.
5. **Half a pip rounds up.**
6. **`shield` is a player-only scalar overlay**, not a per-side record — a record would invent a Quarry shield nobody designed.
7. **Required 5th parameter** on `projectedDepletion`.
8. **`aria-valuenow` stays red-only.**
9. **`hasShieldHearts` is not used** — `shieldPips.length > 0` answers the same question at the point of use.

### Every number nobody chose

Three, all in `:root` in `warCouncil.css`, all shipped so the ticket is playable, **none ever seen against a real row**:

| Key | Shipped | Note |
|---|---|---|
| `--wc-hp-shield-fill` | `#4f8fc0` | Never seen against `--wc-hp-secure-fill: #cc3f4a`, the ticking amber, or `--wc-hp-broken: #3a4a52`. |
| `--wc-hp-shield-ticking-opacity` | `0.78` | Copies `--wc-hp-ticking-opacity`, itself already flagged in that file as the developer's. **Two unseen numbers now agreeing is a reason to tune them together, not evidence either is right.** |
| `--wc-hp-shield-gap` | `0.5rem` | The only thing making the two clusters read as two. |

Plus the glyph's `d` path, transcribed from this ticket's mockup and unjudged at rendered size.

### The mockup went unseen

`.claude/contract/DLR-115-health-bar-rendering-blue-hearts/mockup.html` was produced because the pipeline calls for one on a UI ticket. **There was no approval gate in this run and nobody looked at it.** It is interactive (book a Timebomb, land a hit, greyscale toggle) and it is the only picture of this layout that exists. The layout it proposes is unreviewed and it is what shipped.

### Precisely what a browser would have checked

No server started, no browser opened — the pass is off by default and was not requested. For a purely visual ticket this list is the whole handover:

1. **The three custom properties resolve rather than falling back.** `getComputedStyle` on `.wc-hp-heart[data-type='shield'][data-state='whole']` should give `color: rgb(79, 143, 192)`, not an inherited text colour. A name misspelled between `warCouncil.css` and `warCouncilHealthBars.css` compiles, lints, and passes all 1474 tests while rendering the wrong colour. *(Mitigated but not proven: all three names were grepped and match in both files.)*
2. **The shield cluster reads as a second cluster.** `margin-inline-start: 0.5rem` against `--wc-hp-heart-gap: 0.18rem` — at real glyph size that ratio may not separate.
3. **The two silhouettes separate in greyscale.** Shield pentagon vs. heart at ~1–1.45rem, with saturation emulation. This is the whole justification for not shipping a blue heart, and it has never been looked at.
4. **The wider player bar against DLR-119's three open risks**, at 1280×800, 1024×768, 1366×768, 390×844: does the shell scroll where it did not before; does the narrow/short override in `warCouncilHunt.css` clip the cluster; is the hand fan more cropped by `ActionBar`.
5. **A clean console** on load and after a StrictMode remount, with a shield present.
6. **Getting there at all.** No seed reaches a non-zero `shieldHearts` — see below. Any eyes-on look needs a temporary devtools override, never committed.

### Two things that are true and uncomfortable

- **Nothing renders a blue heart in play.** `activateShield` still has no app-layer caller, so `encounter.shieldHearts` is `0` for the whole of a real run. Every assertion in this ticket is against a constructed state. **Nobody has seen a blue pip and nobody can until a buff activation is wired to Shield.** QA filed AC2's live-interaction half as blocked/out-of-scope for exactly this reason; the derivation that will make it true once wired is solidly tested.
- **The `breaking` overlay still over-draws** when a shield partially absorbs a *landed* hit: 3 damage into 2 blue hearts drops red health by 1 but draws 3 breaking red pips. `resolution.damageToPlayer` is gross while `encounter.shieldHearts` is post-absorption, and the absorbed amount is **not recoverable** from the two once the shield was exhausted. It needs `ResolvedTrick` to record the absorption — engine work this ticket's Scope Boundaries bar. Documented in `roundBars.ts`, unreachable today for the reason above, **visible the moment Shield is wired.** Defender was asked to sanity-check the reasoning and agreed it holds.

### Interaction with DLR-119, stated because it was asked for

**This change makes the player's bar wider** — 10 glyphs to as many as 13 at gold tier. It does not set a new maximum for the row (the Quarry's 18 is unchanged and untouched), but it adds width to a top band already under investigation for scroll and crop. Nothing of DLR-119's three risks was fixed or touched. Start there.

### Two planning defects found mid-run, both by the agents doing the work

- **The config audit undercounted `HealthBarView` construction sites, 0 vs 1.** `plan.md` asserted "Test files that build a bar view by hand: none found — every test goes through `duelHealthBars()`." `labels.test.ts` had a hand-built fixture and it broke typecheck the moment the two fields became required. Caught by the Phase 1 agent, reported rather than silently worked around, fixed in Phase 2 where the file was in scope. **This is the third consecutive ticket to hit the same class** — DLR-114 was 2 vs 11, DLR-110 was 1 vs 2. The coordinator was already fixing `/fb-plan`'s audit step; this is another data point for it.
- **A grep in the plan's own verification phase was arithmetically wrong** (expected 6 `wc-hp-shield` hits, actual 8 — the planner forgot the `.wc-hp-shield-run` class name and double-counted a `var()` usage). Reported, not silently reconciled. The check's actual purpose — all three property names spelled identically in both files — was met.

## Coordinator decisions — DLR-115 reconciliation

Suite 1453 → **1474, 112 files, 0 failures.** Two rounds of two used; reviewers ended APPROVED.

- **The named failure mode did not happen.** `HeartState` still has **exactly five members**; a
  new `PipType = { Health, Shield }` sits beside it. **The array a pip lives in is its type; the
  shared `HeartState` value is its state.** Both reach the DOM as `data-type` + `data-state`,
  and every pre-existing `.wc-hp-heart[data-state=…]` selector was re-qualified with
  `[data-type='health']`, including both `prefers-reduced-motion` entries. Shield pips produce
  only `Whole` and `Ticking` — a spent blue heart stops being drawn, so `Breaking`/`Broken` are
  structurally unreachable rather than dead branches.
- **Accepted the glyph decision, which is better than the brief asked for.** A **shield
  pentagon, not a blue heart** — a blue heart beside a red one is a colour swap that dies in
  greyscale. The cluster sits inboard of the red run, past the graveyard.
- **`projectedDepletion` is fixed and the shield rule was not re-derived.** A required 5th
  `shieldHearts` parameter, deliberately **not defaulted** — a default lets a caller silently
  reintroduce the lie — routed through `absorbWithShield`. Both reviewers grepped for an inline
  `Math.min(shield, …)` and found none. Tested with a shield, without (`NO_SHIELD_HEARTS` →
  byte-identical), partial, and the Quarry's untouched path, plus a `RangeError` guard exercised
  by `it.each([-1, NaN, +Infinity])`.
- **The spoken form now reads:** `"10 of 10."` + `" 2 shielded."` or `" 2 shielded, 1 of them
  ticking."` + `" 3 at risk."` + `" 4 ticking."` + `" Lethal."` — standing → shielded → at risk
  → ticking → lethal. `aria-valuenow`/`valuemax` stay **red-only**, so a shielded 10/10 player
  never reports 12. The worst case is asserted verbatim so its length is on the record:
  **`'10 of 10. 2 shielded, 1 of them ticking. 6 at risk. 4 ticking. Lethal.'`** — the agent's
  own note is the right one: **judge whether anyone listens to that.**
- **Numbers nobody chose:** `--wc-hp-shield-fill: #4f8fc0`, `--wc-hp-shield-ticking-opacity:
  0.78`, `--wc-hp-shield-gap: 0.5rem`. The agent flagged that the opacity **copies** the ticking
  opacity, and that two unseen numbers agreeing is a reason to tune them together rather than
  evidence either is right. Mockup generated and **unseen**.

### Two uncomfortable truths, reported rather than buried

- **No blue pip is reachable in play and nobody has seen one.** Nothing calls `activateShield`
  from the app layer; QA filed AC2's live half as blocked. An eyes-on look needs a temporary
  devtools override, because no seed reaches a non-zero shield.
- **The `breaking` overlay over-draws when a shield *partially* absorbs a landed hit.** The
  absorbed amount is not recoverable without `ResolvedTrick` recording it. Documented in
  `roundBars.ts`, unreachable today, **visible the moment Shield is wired**.

### `/fb-plan` fixed by the coordinator — a third-consecutive planning defect

Three tickets in a row undercounted **construction sites** of a changed shape:
`RoundUiSeed` 2-vs-11 (DLR-114), `EncounterState` 1-vs-2 (DLR-110), `HealthBarView` 0-vs-1
(DLR-115). Each surfaced as a typecheck failure mid-implementation, on work the plan had already
declared scoped.

The common cause is now named in the command: **grepping a type's name does not find the
literals that construct it.** Most construction sites are unannotated object literals — test
fixtures, inline `return { … }`, default-state constants — invisible to a search for the type
name and visible only to `tsc`, one file at a time. Step 1.6 gains **check 7**: grep the type
name *and* a distinctive required field name, report `<type>: N annotated, M construction sites
(K in specs)`, and treat the larger figure as real. Step 3's checklist now requires both counts.

A second, smaller fix in the same edit: DLR-115 also found a verification grep in its plan whose
**arithmetic was simply wrong** (6 stated, 8 actual) — a check that would have passed while
proving nothing. The command now states that quoted counts must match what the command printed.

Nine tickets remained when this landed, so fixing the command beat filing an issue about it.

### Doc gap for DLR-121 (verification)

**`src/hunt/shield.ts` (DLR-110) has no `.docs/implementation/` entry at all**, and
`hasShieldHearts`'s docblock claims DLR-115 reads it, which it does not. Flagged by the
doc-writer; left for the verification ticket rather than patched blind here.

## DLR-116 — Shop screen: slot machine and pared-down purchasable list

**GREEN.** typecheck 0 · lint 0 · **1503 passed of 1503, 116 files, 0 failed** (baseline 1474/112) ·
build exit 0. Reviewers: all three, round 1 → Code-Evaluator ISSUES, Defender ISSUES (0 critical, 2
warning), QA ALL PASSED; one combined fix pass; verification round → both re-reviewers APPROVED.

**This is the ticket where a player can first pull a reel.** DLR-112 built the draw engine and
nothing rendered it; DLR-113 gave it a Vault odds seam with no caller. Both are now reachable, and
the slot machine is the first route to a real buff card inside a run.

### The four judgement calls, and why each went the way it did

- **"Pared-down" cut the entire priced catalogue except Health and AP capacity — and took the
  four-shelf tab ladder with it.** AC2 says "exactly Health and AP capacity"; Cheat, Timebomb and
  Blast Guard are not on AC3's named removal list but are excluded by that word, so they went too.
  `ShopCategoryTabs.tsx` and its spec were **deleted**: a four-rung ladder over three empty rungs is
  chrome, and the vertical space it freed is what funds the slot section on a short viewport.
  **Nothing mechanical was deleted.** `SHOP_ITEMS` shrank to `[ApCapacity, Heal]` while the
  `ShopItem` union kept all six members and `priceOf` / `categoryOf` / `refusalFor` / `buyFromShop`
  stayed **total** over it — asserted, not asserted-about: `shop.test.ts` iterates
  `Object.values(ShopItem)`. The convention this introduces, worth remembering: **`SHOP_ITEMS` is
  what the shop offers; `ShopItem` is everything the game prices.** The flask stayed — it costs no
  coin, so it is not on the purchasable list AC2 constrains, and this is the only screen it is
  reachable from.
- **The odds ARE surfaced, and derived rather than transcribed.** The strip renders face-up as eight
  named cards and the screen states gold 1.6% / silver+bronze 32.8% / three bronze 65.6% / 2.64 cards
  a pull. DLR-112 chose a flat-uniform spin *expressly* so a player can read the strip and compute
  their own odds; hiding them throws away the reason the model has that shape. All four figures come
  from a new pure `src/hunt/slotOdds.ts` derived from `REEL_COUNT` / `REEL_POOL_SIZE` — a retuned
  `REEL_POOL_SIZE` moves the posted odds automatically instead of leaving the screen quoting 1.6%
  forever. The general formula was checked against DLR-112's stated figures before planning and
  reproduces them exactly.
- **An unaffordable pull is disabled and explained, never hidden.** The button stays rendered with
  the reason in a `role="status"` line beneath and folded into its accessible name; the strip and the
  odds stay readable, so a player can see what they are saving for.
- **A drawn buff goes STRAIGHT to the pile — no choose-one gate.** Two reasons, and the first is
  arithmetic: 2.64 cards a pull is a per-pull *yield* that only holds if every award lands, so a
  choose-one would have quietly made the real yield 1.0 and invalidated DLR-130's balance simulator.
  The second is `game-ux`: a reroll re-spins the same strip with no cap, so a confirm step would be a
  second click on the screen's most repeated action. One tap to pull, no confirmation.

### Plan defaults taken automatically (the gate was auto-approved, non-interactive)

- Visit index is **`run.encounterIndex`** — the shop is reachable once per resolved encounter, so it
  is already a monotonic per-visit integer. No field added. Pleasant consequence: shop → map → shop
  returns to the *same* strip, which is correct.
- Spin seed is `spinSeedFor(stripSeed, pullIndex)` with `pullIndex = run.slotPullsThisVisit`, so a
  paid reroll re-spins the same strip rather than redrawing it. Asserted directly.
- `RunState.runSeed` is a **defaulted third parameter of `startRun`** (fixed seed `1`), chosen in
  `App.tsx` with the one `Math.random()` in the whole seed path.
- `apCapacity` is an **optional** field on `RoundUiSeed` / `WarCouncilMountProps`, defaulting to
  `STARTING_AP`. Optional because the required sibling `bankClimbBonus` has **30 construction sites
  across 25 files** — a required field would have rewritten thirty fixtures for a two-line thread.
  Zero fixtures changed.
- `ShopItem.ApCapacity`'s category is `RunPermanent` — truthful, though nothing renders categories.
- `AP_CAPACITY_STEP = 5` is transcribed from AC2, not chosen.

### Numbers nobody chose

- **`AP_CAPACITY_PRICE = 3` — never played, the developer's.** It trades directly against the
  machine's 1-coin reroll: too low it dominates the visit, too high AP capacity is decoration. What
  settles it: one run to fight 3, counting the pulls forgone to buy it.
- Every `clamp()` bound and hue in the new `shopSlot.css` is a placeholder, marked as such.
- **Mockup generated and unseen.**

### The construction-site check (`/fb-plan` Step 1.6 check 7) earned its keep immediately

Counted by field, not by type name, exactly as the command now requires:
`RunState` — 62 type-name hits, **1** construction site (`startRun`'s literal), cross-checked against
`nextCheatId` and `lastQuickKillPayout`. `RoundUiSeed` — 8 annotated, **30** construction sites
across 25 files, found by grepping `bankClimbBonus`. **That second count is what changed the design**:
it is the reason `apCapacity` shipped optional rather than required, and no phase hit a typecheck
failure. Three consecutive prior tickets did.

### What the reviewers caught

- **Code-Evaluator:** the `ShopPanel` rewrite orphaned `.shop-panel` / `.shop-empty` in
  `shopItems.css` and `.shop-aside` / `.shop-aside-label` / `.shop-purse-cell.is-flask` in
  `shopFlask.css` — live going in, dead coming out, and both files sat outside the task's file list.
  Its ruling is the right one to keep: *the file list is a planning artifact, not a licence to leave
  dead CSS behind.* Fixed.
- **Defender, warning 1 — the real one.** `useShopSlot`'s `pull()` *looked* like the stale-closure
  guard `handleBuy` and `handleDrinkFlask` use, and was not: it checked the refusal and committed from
  **the same closed-over `run`**, not a functional update, while its comment claimed otherwise. Safe
  only because everything downstream is a pure function of `run` and the pull index — an accidental
  safety net. `onRun` is now a functional updater and `App.tsx` passes `setRun` straight into it.
- **Defender, warning 2 — a shared-surface miss.** `run.purchaseIsolation.test.ts` exists precisely
  to catch a `buyFromShop` branch writing an unnamed field, and the new `ApCapacity` branch was never
  added to it because that file was outside the task list. Added; asserts `changedFields` equals
  exactly `['apCapacityBonus', 'coins']`.
- Two stale doc comments fixed (`canBuyAnything` still claimed "full slots" participates;
  `refreshActionPointsForNewHand` is not capacity-aware and is dead only because `App.tsx` remounts
  the felt per hand — noted so a future refactor does not silently drop bought AP).

### Open items touched, and how

- **`Keepsake` may be unfireable** — it can now be *won* from a reel. It is a dud card, not a crash:
  `run.slot.test.ts` asserts every minted award satisfies `isPricedBuff`, so `apCostOf` never throws.
- **`Ward` is not in the reel pool** and its silver/gold are indistinguishable at `DAMAGE_PER_HIT = 1`
  — untouched, still DLR-126's.
- **`Miser` fights the shop, and this screen made it worse.** An uncapped 1-coin reroll is now the
  strongest coin sink in the game, and the machine that pays you for hoarding coins is the machine
  asking you to spend them. Recorded in `the-hunt.md` → Known tensions; not patched with UI.
- **DLR-119's three `.wc-shell` risks: the shop shares none of that CSS.** It builds on `run.css`'s
  `.run-shell` only — `warCouncilHunt.css` is untouched in either direction.

### The browser pass did not run, and here is precisely what it would have checked

Not requested. No server started, no browser opened. A browser would have checked:

- **Does the screen fit, at 1280×800, 1024×768, 1366×768 and 390×844** — no page scroll, nothing
  cropped, the leave button reachable by mouse. This is the one that matters: `shop.css` carries a
  documented history of clipping at nine rows, and **DLR-116 moved both sides of that budget at
  once** — removed four purse cells, the tablist, the tabpanel and the aside heading; added a chooser,
  an odds line, an **eight-row strip**, a pull control and a result group. jsdom has no layout engine,
  so nothing in 1503 passing tests speaks to it.
- **Do the new `shopSlot.css` custom properties resolve**, or silently fall back to an inherited
  value — the bug class that compiles, lints and passes every test while rendering the wrong thing.
- **A clean console** on load, after choosing a machine, after a pull, and on a second visit to the
  shop (remount safety for the hook's two `useState` values).
- **A real pull on each machine**: first free, second at 1 coin, the three symbols and the awards at
  their tiers, and the won cards showing up in the loadout bar on the next hand.
- **The chooser by real keyboard** — arrow keys select, one tab stop, selection legible without
  colour.
- **The odds line's actual wording on screen**, for the clarity-versus-clutter call.

### For the developer's eyes

`AP_CAPACITY_PRICE`. The viewport fit at the four sizes above. Whether four odds figures is the right
density (fallback: drop the expected-cards-per-pull figure). Whether one tap to pull, with no confirm,
feels right. And the Miser tension, which is a design fork rather than a bug.

## Coordinator decisions — DLR-116 reconciliation

Suite 1474 → **1503, 116 files, 0 failures** (net +29 after deleting `ShopCategoryTabs.test.tsx`).
Commit `2e60835`, 58 files, +4269/−1808.

- **A player can now genuinely pull a reel end to end** — choose machine → read strip → pull →
  cards land on `RunState.buffs`, where DLR-114's loadout bar already reads them. **This is the
  first route to a real buff inside a run.** Ten tickets of bottom-up engine work are finally
  connected.
- **Determinism held**, grep-verified: zero `Math.random()` in `src/hunt/` or `src/vault/`; the
  single call is `App.tsx` choosing `runSeed`. No strip stored. Reroll-same-strip asserted
  directly. DLR-130's simulator remains viable.
- **Accepted the paring: Cheat, Timebomb, Blast Guard and Whetstone leave the offered list**,
  along with the four-shelf tab widget. `SHOP_ITEMS` → `[ApCapacity, Heal]`. Nothing mechanical
  was deleted — the `ShopItem` union keeps all six and `priceOf`/`categoryOf`/`refusalFor`/
  `buyFromShop` stay total. The convention introduced is worth keeping: **`SHOP_ITEMS` is what
  the shop offers; `ShopItem` is everything the game prices.**
- **Odds are surfaced, and derived rather than transcribed** from `REEL_COUNT`/`REEL_POOL_SIZE`.
  This is DLR-112's flat-uniform spin paying off exactly as designed — the player can read the
  strip and check the arithmetic.
- **Accepted: drawn buffs go straight to the pile, no choose-one.** The reasoning is sound —
  2.64 cards per pull only holds if every award lands, and a choose-one gate would make it 1.0
  and break the simulator's yield model.
- **Unaffordable pull is disabled with its reason stated, never hidden**, matching DLR-114's
  action-bar convention. Two tickets now share one rule about refusals without either being
  told to.
- `AP_CAPACITY_PRICE = 3` is unchosen and trades directly against the 1-coin reroll.
- **The `Miser` tension got worse, and the agent said so rather than patching it.** An uncapped
  1-coin reroll is now the strongest coin sink in the game, which sharpens the conflict with a
  card that rewards *unspent* coins. Recorded for the developer.

### The repo-wide format churn — caught, mostly reverted, and the cause fixed

The contract mandated **`npm run format`**, which is `prettier --write` across the whole repo.
It rewrote **59 files by ~1,800 lines**, converting `*italic*` → `_italic_` and re-padding every
markdown table across every design document — `hybrid-design.md`, `design-principles.md`,
`ideas.md`, the play-test notes.

- **The agent caught it and reverted the design docs itself**, unprompted. Verified by the
  coordinator rather than trusted: **zero `.docs/design/` files in `2e60835`**.
- **`the-hunt.md` kept the churn**, because that file legitimately changed in this ticket (210
  lines, 144+/66− ignoring whitespace). Separating reformat from real content inside a file
  whose content also changed is high-effort, high-risk and low-value; accepted deliberately, and
  the file is now Prettier-stable going forward rather than flip-flopping.
- **The cause is fixed, not just the symptom.** The prohibition already existed in
  `web-project.md` — **36 lines below the table row that offers the command.** A planner writing
  a task reads the row. The row now carries the scoped form (`npx prettier --write <path>`) and
  the ban inline, and the note beneath states concretely what was churned and why those
  documents in particular must not be. Committed as `ae9ee28`, with nine tickets still to run.

### What a browser would have checked — the sharp one

**Viewport fit at 1280×800 / 1024×768 / 1366×768 / 390×844.** `shop.css` has a documented
clipping history, and this ticket moved **both sides** of that budget: removed four purse cells,
the tablist, the tabpanel and an aside; added an eight-row strip. Also unseen: whether
`shopSlot.css`'s custom properties resolve rather than falling back; a clean console on load, on
machine change, on pull, and on a second visit; a real pull on each machine; the chooser by real
keyboard; and the odds sentence as rendered. Mockup generated, **unseen**.

Good news for DLR-119: **the shop shares no CSS with `warCouncilHunt.css`**, so its three
`.wc-shell` risks are untouched in both directions.


---

## DLR-117 — Live card preview: win/lose damage readout

**GREEN.** Committed locally, not pushed. Reviewers: all three, one round, no fix pass.
Gates, run first-hand after the doc pass as well as by QA: `npm run typecheck` exit 0 · `npm run lint` exit 0 · `npm test` **1526 passed of 1526 across 117 files** (baseline 1503/116, so +23) · `npm run build` exit 0, built in 220ms. `npx prettier --check` on the twelve contract-owned `src/` files: clean.

### What shipped

A strip under every hand card reading `W<n> L<n>` — the damage the Quarry takes if that card wins its trick, the damage you take if it loses. New pure module `src/app/warCouncil/cardDamage.ts` (101 lines); `commitHandlers.ts` exports `playOptions`/`applyResolution`/`FoldedResolution` (visibility only); copy in `labels.ts`; an optional `describedBy` on `PlayingCard`; a required `damageForCard` on `HandFan` plus a `.wc-fan-slot` wrapper; three rules in `warCouncilHand.css`; one import and one prop in `WarCouncilRound.tsx`.

### How I guaranteed it derives from the resolution path rather than re-deriving it

**The preview does not compute damage. It asks `applyResolution` — the same fold the reducer commits a real trick through — and reads the health delta back off the returned encounter.** `branchFor` reports `before.health[side] − after.health[side]` per side and `before.shieldHearts − after.shieldHearts`. Shield absorption, the zero floor, D7's "a Quarry killed by the event spares you", and DLR-109 AC3's payout-destroyed-by-a-hit rule are therefore **inherited, not restated**.

`applyDamage`'s own docblock turned out to sanction exactly this, which I did not know when I chose it: _"Returns a new state; the input is never mutated. That is what lets a caller preview an event by applying it to a copy, rather than writing a second projection routine that could drift from this one."_

Proved three ways, not asserted: a grep of `cardDamage.ts` for `applyResolution|playOptions|resolveTrickBank` finds exactly the import plus one call site each; a recursive grep of `src/app/warCouncil` for `Math\.min\(.*[Ss]hield|absorbWithShield` finds only `duelHealthBars.ts`'s pre-existing calls and one prose mention in `cardDamage.ts`'s own docblock; and `cardDamage.test.ts` reads every expected figure off the engine's `DAMAGE_PER_HIT`, `forcedCashValue(3,2)` and `cashValue(2,2)` rather than hard-coding a number, so it would actually catch drift. Both reviewers ran the DLR-115 shield grep independently and found the same.

Side effect worth having: this preview is **immune to the live `breaking`-overlay over-draw**. That defect needs the _absorbed_ portion of a landed hit, which `ResolvedTrick` does not record; a health delta never needs it. So the bug did not bite, and I did not paper over it.

### Every case where the preview is an ESTIMATE rather than a certainty — the list the developer needs

1. **You are the one to lead.** The Quarry's card is face down and skulls are dealt to the Quarry, so `skullTrick` and `timebombTrick` are undecided — and a skulled Quarry card turns a trick you win into one you eat, inverting **both** figures. Flagged on screen (`~` prefix + italics) and in words. `exact` is true only when `round.currentTrick.length === 1`.
2. **A Timebomb this card would PRIME for the next trick is not shown.** Booking costs no health at this resolution, so it is absent from the delta. A primed card you win reads cheaper than it turns out to be until the ticking hearts appear.
3. **Overkill is truncated.** Health floors at 0, so `W6` against a Quarry on 4 means "enough", not "six". Matches how `duelHealthBars` already handles overkill; still a reading to confirm.
4. **Activated buffs contribute nothing** — `buffAccrual.ts` still has no caller. **DLR-117's AC3 (several buffs stacking on one card) is NOT met.** I deliberately did not invent a bonus the resolution will not pay; that would have been this ticket's own worst outcome. It becomes true with zero edits once accrual is wired into `playOptions`.
5. **AC1's "once any buff is active" gate was not built** — the readout is always visible, because bank, multiplier, a pending Timebomb, a held Blast Guard, the final trick and a primed card all already move these numbers.
6. **Only two of four figures are on the card face.** The omitted two (a Timebomb detonating on a win; the forced cash-out on a loss) are card-_invariant_ and already previewed on the health bars. All four are in every card's spoken description.
7. **It never collapses to the branch that will actually happen**, though `chooseCpuCard` is deterministic and it could — that would leak the Quarry's exact card past `TELEGRAPH_FIDELITY`.

### Plan defaults taken (no gate presented)

Plan approval auto-taken; **mockup built and published, went unseen**. Skill confirmation not presented (`react-frontend` + `game-ux`, no developer override). Defaults logged: preview the trick not the hand; two branches on `playerWon`; two card-dependent figures on the face; inexact whenever the Quarry's card is off the table; no buff contribution; always visible; `null` (nothing rendered) once the encounter resolves or the hand ends; numbers as the card's `aria-describedby` **description** and never its accessible name; strip beneath the card, not on its face. Placeholder copy `W6 L1` / `~` and the transcribed `calc(var(--wc-card-w) * 0.2)` are the developer's.

### The `aria-describedby` call, which is why 37 assertions stayed green

All four card corners and the centre are taken (rank, skull, primed mark, ability pip, suit), so the strip could not go on the face. Folding the numbers into `cardAccessibleName` would have broken every `getByRole('button', { name })` in the suite — 37 exact-name assertions — and conflated a card's identity with a derived figure. Description instead: name untouched, and AC4 satisfied by `getByRole('button', { name, description })`.

### Vertical space this cost

**Roughly 7-12px on the `hand` grid row** — one line at `calc(var(--wc-card-w) * 0.2)` plus a `* 0.04` gap, less the ~3.2px of slack already inside `.wc-fan`'s `min-height`. **No grid row added** to `.wc-shell`. I deliberately did **not** spend `.wc-fan`'s `1.3rem / 0.6rem` rotation reserve to make it free, even though it measurably has ~17px of slack up top: that reserve is DLR-119's surface and spending it blind, with no browser, is exactly how you turn someone else's open risk into a regression. **This makes DLR-119's three risks slightly worse, not better**, and nobody has seen it.

### What a browser would have checked — not requested, so not run

No server started, no browser opened. Unseen: (1) whether the added 7-12px makes `.wc-shell` scroll or crop at **1280×800 / 1024×768 / 1366×768 / 390×844**; (2) whether `--wc-card-w` and `--wc-chalk-dim` resolve inside `.wc-card-damage` rather than silently falling back; (3) legibility at the smallest clamp — `--wc-card-w: 2.9rem` puts the strip at about **9.3px**, which is the single thing most likely to be wrong; (4) whether the fan's -4/-10/-18px card overlap occludes the strip of an underlying card; (5) a clean console on load and after a remount, watching specifically for an `aria-describedby`-target-missing warning, since the ids are composed per card from `useId()`.

### Gotchas worth carrying forward

- **A required prop with two construction sites is cheap; the count is what makes it cheap.** `HandFan`'s `damageForCard` is deliberately undefaulted, on `projectedDepletion`'s precedent. The `/fb-plan` construction-site check found exactly 2 sites (mount + one test helper) — so "required" cost one line each rather than a mid-phase typecheck cascade.
- **`useRovingTabIndex` survives a wrapper by luck of one word.** Its `focusIndex` uses `querySelectorAll('button')` — a _descendant_ query. Had it used `children`, the `.wc-fan-slot` div would have silently broken arrow-key navigation with no test failing differently. Both reviewers checked it; the hook's own docblock already warned about this class of coupling.
- **`labels.ts` is at 359 of 400 and `WarCouncilRound.tsx` at 380.** Both under budget, both tight. The next ticket touching either should expect to split it.

### Docs

`.docs/implementation/war-council-ui/card-damage-preview.md` created; that module's README and the top-level index updated with DLR-117. `.docs/game_rules/the-hunt.md` **was** updated — this changes what a player is shown before committing, which §3/§4 own: a new §4 subsection, three Status-register rows (settled / provisional glyphs / **not built** buff contributions), two new Known tensions, and a dated in-progress note. Three of those four docs already failed repo-wide `prettier --check` before I touched them, so I left their formatting alone rather than churning them; only the new file was formatted.

## Coordinator decisions — DLR-117 reconciliation

Suite 1503 → **1526, 117 files, 0 failures.** Reviewers: all three, **one round, no fix pass** —
the cleanest ticket of the run.

- **The correctness argument is the best engineering of the run.** The preview **computes no
  damage at all.** It hands a hypothetical `TrickResolution` to **`applyResolution`** — the same
  fold the reducer commits real tricks through — and reads the health delta. Shield absorption,
  the zero floor, D7 and the payout-wipe rule are all inherited rather than restated, and
  `applyDamage`'s own docblock sanctions exactly this use. Verified two ways: greps confirming
  no second `Math.min(shield, …)` and only three routes, plus a spec that reads its expected
  figures off `forcedCashValue` / `cashValue` / `DAMAGE_PER_HIT` rather than hard-coding them.
- **A free side benefit worth recording:** because a delta never needs the absorbed portion, the
  preview is **immune to the live `breaking` over-draw defect**. The bug class this ticket was
  most at risk of reintroducing — `projectedDepletion` lying about shields — is structurally
  unreachable here.
- **Accepted two unmet acceptance criteria, and the refusal was right.** AC3 (buff contributions
  in the readout) and AC1 (the "once any buff is active" visibility gate) are **not built**,
  because `buffAccrual.ts` still has no caller and an activated condition buff pays nothing. The
  agent refused to print a bonus the resolution would not pay — printing it would have made the
  readout lie, which is the one thing a preview must never do. **Carried to DLR-125 by Jira
  comment**, along with the `timebombDamageFor`/`timebombDamageOf` collapse nomination.
- **Every case where the readout is an estimate is on the record**, which is what makes it
  trustworthy: when the player leads (the Quarry's card is face down and a skulled card
  *inverts both figures*) it is marked `~` and italicised; a Timebomb this card would prime is
  absent because booking costs no health now; overkill is truncated (`W6` into a Quarry on 4
  means "enough"); and it never collapses to the branch that will actually happen, because that
  would leak the Quarry's card past `TELEGRAPH_FIDELITY`.

### It made DLR-119's problem slightly worse, deliberately and with the cost stated

**~7–12px on the `hand` row.** No grid row was added, and the agent **declined to spend
`.wc-fan`'s rotation reserve** to make it free, on the grounds that the reserve is DLR-119's
surface to allocate. That is the right call, but the three open `.wc-shell` scroll/crop risks are
now tighter than they were.

Its own nomination for **most likely thing to be wrong: legibility at the smallest clamp,
~9.3px.** Also unseen: whether `--wc-card-w` and `--wc-chalk-dim` resolve in `.wc-card-damage`,
whether card overlap occludes a neighbour's strip, and a clean console watching for an
`aria-describedby`-target-missing warning. Mockup published, **unseen**.


## DLR-118 — Vault end-of-run screen

**GREEN.** Commit `e21e86c` — `DLR-118: give the Vault its own end-of-run screen`. Contract:
`.claude/contract/DLR-118-vault-end-of-run-screen/`. Reviewers: **all three** (production UI diff),
two rounds; round 1 found two real defects, round 2 approved unanimously.

### Gates

| Gate | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0, no warnings, no suppression anywhere in the diff |
| `npm test` | **1565 passed of 1565, 120 files, 0 failed** (baseline 1526/1526 across 117 — exactly +39 tests, +3 files) |
| `npm run build` | exit 0, `dist/` written, no bundler errors |

Scoped `npx prettier --check` on this contract's paths: clean. Repo-wide `format:check` was not run
as a gate — it fails on ~58 pre-existing `.md` files that are not this contract's.

Line budget after Prettier, measured with `(Get-Content <path>).Count`: `App.tsx` **365** (from 347),
`VaultScreen.tsx` 258, `VaultScreen.test.tsx` 341, `vaultLabels.ts` 141, `vault.css` 126,
`RunOutcomePanel.tsx` 198, `useVault.ts` 85. All under the blocking 400.

### The mockup went UNSEEN

`.claude/contract/DLR-118-vault-end-of-run-screen/mockup.html` was written to disk and **never shown
to the developer** — the mockup gate was skipped for this run, and it was not published as an
Artifact either. It carries a state-switcher covering all seven screen states and is a layout note
only, not approved design. `Skill: game-ux` was invoked for the layout and again for the verdict's
control row.

### Plan defaults taken (no gate; every one is mine, not the developer's)

1. **The screen sits BESIDE `RunOutcomePanel`, it does not replace it.** The verdict owns the outcome
   and the trick tally; the ticket calls the new screen "distinct from the verdict panel". Replacing
   it would have deleted DLR-82/85's three verdict states.
2. **It appears at the end of a run, not a fight** — the `canAdvanceRun(run) === false` branch that
   previously offered `Start a new run` alone.
3. **It is one press away, not automatic.** `Open the Vault` is the new **primary** control there;
   `Start a new run` is demoted to secondary beside it. A player who presses the secondary never sees
   the Vault. **Worth judging in play — an unskippable interstitial after every death is a pacing
   call and pacing is the developer's.**
4. **What dismisses it:** one control plus `Escape`, both calling `handleNewRun`. No route back to the
   verdict — the verdict is a report on a finished run (AC3).
5. **It shows both earned-this-run and held-in-total.** AC1's "balance including the amount just
   converted" is only meaningful if the conversion is stated separately from the total.
6. **The converted amount is derived, not stored** — `creditedFromRun(outcome, coins)`, which works
   only because `run.coins` is deliberately not zeroed. Avoids a sixth `useState` in the driver.
7. **The conversion calls `depositLeftoverCoin(EMPTY_VAULT, coins)` rather than re-dividing by
   `VAULT_EXCHANGE_RATE`** — the rate and its guards stay stated once, in `src/vault/`.
8. **Two native `<select>`s, not two roving-tabindex radio groups.** 71 templates over 11 families;
   a native listbox is one tab stop with platform-supplied arrow/Home/End/type-ahead and **no index
   arithmetic to get wrong on an empty collection** — the `isFocusable(0)` shape that has bitten this
   codebase three times. Costs one extra click: family, then card, then buy.
9. **Cards are worded through `slotSymbolText`** from `slotLabels.ts`, so no fourth buff grammar was
   written and the screen never calls `apCostOf` or handles a `Buff` — the `Unassigned` `RangeError`
   is structurally unreachable here rather than merely avoided.
10. **The currency is called a "mark"** (`VAULT_CURRENCY_SINGULAR`/`_PLURAL`). Placeholder copy, as
    `shopLabels.ts` and `slotLabels.ts` mark their own. Leaving the balance unit-less reads
    ambiguously beside coins. **The developer's word to choose.**
11. **`useVault.commit` was widened to accept a `(prev) => next` updater.** Not in the brief; added
    because the value form loses a batched second click. See "the defect this closed" below.
12. **`SAVE_SCHEMA_VERSION` stays at 1** and no persisted shape changed — the screen only reads and
    writes DLR-113's existing `VaultState`.

### Every screen state defined

| State | What it renders |
| --- | --- |
| **Lost run, coins at or above the rate** | the deposit line naming what this run paid in, plus the balance |
| **Lost run, coins below the rate** | that nothing converted, quoting `VAULT_EXCHANGE_RATE` by interpolation |
| **WINNING run** | that a won run pays nothing into the Vault — a win is its own reward. **No deposit, ever.** |
| **First-ever run / empty Vault** | `VAULT_EMPTY_TEXT` in place of the holdings list, every buy control disabled with its refusal in its accessible name, and **no `role="alert"`** — a `SaveReadOutcome.Empty` read is not a failure |
| **Save corrupt** | a `role="alert"` saying the record could not be read, that it has been **left on disk untouched**, and that this session starts from an empty Vault |
| **Save version-mismatched** | the same, naming a different game version |
| **Storage unavailable** | an alert saying the Vault works for this session but will not be remembered |
| **Entries dropped by reconciliation** | `vaultDroppedText(n)`, how many saved entries this build has no template for |
| **Write rejected / unavailable** | an alert saying the purchase could not be saved |
| **Boost already at the cap** | that control disabled, `VAULT_REFUSAL_MESSAGE[BoostMaxed]` folded into its `aria-label` |
| **Empty family (defensive)** | no card select rendered and every buy control disabled, guarded before any indexing |

The corrupt / version-mismatch copy **renders DLR-113's decision rather than inventing one** — that
ticket decided an unmigratable save is discarded non-destructively, left in place, and reported.
`VAULT_READ_PROBLEM` and `VAULT_WRITE_PROBLEM` are `Readonly<Record<Union, string | null>>` **total
over their unions**, so a sixth outcome is a compile error rather than a blank line.

### The loss-only deposit rule, and how it was proved

Rendered correctly. `App.tsx`'s `handleComplete` remains the single commit site, still gated on
`recorded.outcome === RunOutcome.Lost`; **`run.coins` is never zeroed anywhere in the diff.** Three
independent proofs:

- `vaultRunCredit.test.ts` — 7 cases, including "credits NOTHING on a won run" at the same coin count
  that credits 3 on a loss. Every expected figure computed from `VAULT_EXCHANGE_RATE`, never a literal.
- `VaultScreen.test.tsx` case 2 — on a winning run the deposit line reads the non-lost sentence **and
  `queryByText(lostSentence)` is null.** Both directions asserted.
- Structural: `creditedFromRun` returns `0` for any non-`Lost` outcome before it reaches the
  conversion at all, and the conversion is `depositLeftoverCoin`, not a second division.

### The two defects review caught (round 1), both fixed

- **Defender, CRITICAL.** `buyBoost`/`buyTier` derived their refusal from the **stale render-time
  `handle.vault` outside** the commit updater, then called the throwing `buyOddsBoost` unconditionally
  **inside** it. Two activations batched into one render both passed the same stale guard and the
  second hit `vaultEconomy.ts`'s deliberate `RangeError` — and **there is no `ErrorBoundary` anywhere
  in `src/`**, so it crashed to a blank screen. This is exactly the pattern DLR-116 already forced
  `handleBuy`/`handleDrinkFlask` to adopt. Fixed by re-deriving inside the updater; two regression
  tests compose the captured updater twice and assert both no-throw and a true no-op.
- **Code-Evaluator.** Holdings were keyed by the rendered sentence, so two identical queued grants
  (same template, same tier) collided. Fixed to `{ key, text }` pairs.
- Also fixed, non-blocking: an unguarded `BUFF_FAMILIES[0]` beside an already-guarded lookup.

### CSS ownership — the question DLR-119 needs answered

**This screen shares CSS with `run.css` and shares NONE with `warCouncilHunt.css`.** It mounts inside
`run.css`'s existing `.run-shell`, so there is still exactly one `100dvh` grid in the codebase, and
`vault.css` styles only the inside of it — no second full-viewport shell, no `100vh`, no `100vw`.
**DLR-119's three unverified layout risks therefore do not reach it**, and this ticket touched none
of them. The holdings list is the one region given its own `overflow-y: auto` and a `max-height`,
because the queued-grant list is unbounded.

### What a browser would have checked — nobody looked

No server was started and no browser was opened; the pass was not requested. jsdom has no layout
engine, so **the no-scroll claim has never been seen by anything in this pipeline.**

- **Does the screen fit without scrolling or cropping** inside `.run-shell` at **1280×800, 1024×768,
  1366×768 and 390×844**? It is the densest surface this project has: title, alert, deposit line,
  balance, holdings list, two selects and four buy controls, plus the leave control.
- **Do `vault.css`'s custom properties resolve** — `--wc-brass`, `--wc-chalk`, `--wc-chalk-dim`,
  `--wc-parchment`, `--wc-alarm`, `--wc-ink`, `--wc-brass-dim`, `--wc-sans`, `--wc-serif` — or does
  the page silently fall back to browser defaults? A renamed custom property compiles, lints and
  passes every test while rendering the wrong colour.
- **Is the console clean**, and specifically **is the duplicate-React-key warning gone** now that
  holdings key on identity? That warning only exists in a real React runtime.
- **Each state seen live through a real `App.tsx` transition, not the isolated harness:** deposit on
  a loss, nothing-deposited on a win, the empty Vault on a genuinely first run, and each of the four
  save-failure alerts.
- **Keyboard:** both selects and all four buy controls reachable with a visible `:focus-visible`
  ring; `Escape` returning to the start screen cleanly; a second visit to the screen with no
  StrictMode remount warnings.

### Developer decisions outstanding

- **All copy is placeholder**, including the currency noun "mark".
- **Whether the Vault should be skippable**, or the verdict's only forward control.
- **Whether family-then-card narrowing reads as focused or as hiding the catalogue** (71 templates).
- **Every `clamp()` bound and hue in `vault.css`**, copied from `run.css`'s scale rather than chosen.
- Non-blocking review nit left unfixed at the round-2 ceiling: `VaultScreen.tsx`'s comment on the
  `FIRST_BUFF_FAMILY` guard claims it "mirrors `mintFromTemplate`'s throw-guard idiom"; the
  Code-Evaluator notes that guard fires lazily at call time while this one fires at module import.
  The code is right, the comment overclaims.

### Docs

`.docs/implementation/vault/the-vault-screen.md` created; `vault/README.md`, `run-ui/verdict-panel.md`,
`app/run-driver.md`, `run-ui/README.md`, `app/README.md` and the top-level index updated.
**`.docs/game_rules/the-hunt.md` was updated** — this contract changed a rule: the Vault became
reachable, so section 10 gained four subsections (the Vault control on a finished verdict, what a
lost run pays in, what it buys, and what happens when the save cannot be read), and nine Status
register rows. Two pre-existing statements were **stale and are now fixed**: "a run that has ended
offers `Start a new run` and nothing else", and "Persistence — nothing is saved", which had been
wrong since DLR-113 and is now marked PARTLY BUILT.

## Coordinator decisions — DLR-118 reconciliation

Suite 1526 → **1565, 120 files, 0 failures** (+39 tests, +3 files). Two reviewer rounds; round 1
found two real defects, round 2 unanimous.

- **Accepted eleven defined screen states, which is the right number for this surface.**
  Deposit-on-loss · below-the-rate-on-loss · **winning run, nothing deposited, and it says so** ·
  **first-ever run / empty Vault** (all buys disabled, **no alert** — an `Empty` read is not a
  failure) · save corrupt · save version-mismatched · storage unavailable · entries dropped ·
  write rejected · boost at cap · empty family. The empty and failure states are the ones that
  normally get skipped and then look broken; they were built first-class instead.
- **`VAULT_READ_PROBLEM` / `VAULT_WRITE_PROBLEM` are total over their unions**, so a sixth
  outcome is a compile error rather than a blank line. That is the right shape for a screen whose
  job includes rendering failure.
- **DLR-113's unmigratable-save decision was rendered, not reinvented** — both the corrupt and
  version-mismatch states say the record was left on disk untouched and the session starts empty.
- **The loss-only deposit rule is correct and was proved three ways:** a unit test crediting 0 on
  a won run at the same coin count that credits 3 on a loss; a component test asserting the
  winning-run sentence is present *and* the lost sentence absent; and structurally,
  `creditedFromRun` returns 0 before reaching the conversion. **`run.coins` is never zeroed
  anywhere in the diff**, so the verdict panel keeps what it reads.
- **Two stale statements in `the-hunt.md` were corrected** — "a run that has ended offers `Start a
  new run` and nothing else", and "Persistence — nothing is saved", both wrong since DLR-113.
- **CSS ownership stated:** shares `run.css`, shares **none** with `warCouncilHunt.css`, so
  DLR-119's three risks do not reach it and none were touched.

### DLR-131 raised — a systemic gap the reviewers exposed

Review caught a **genuine crash path** that would have shipped: the spend guards re-derived their
refusal against a **stale** `handle.vault` outside the commit updater, so a batched second click
reached `buyOddsBoost`'s deliberate `RangeError`. Fixed in-ticket by moving the guard inside the
updater — the pattern DLR-116 had already forced on `handleBuy` — with two regression tests.

The coordinator measured the class rather than accepting the fix as sufficient. At `04eae28`:
**72 deliberate `throw` sites across 28 files, and zero error boundaries** — no `ErrorBoundary`,
no `componentDidCatch`, no `getDerivedStateFromError`. Any throw that escapes into React unmounts
the tree and leaves a blank page with no way back.

The throws are **correct and should stay** — `apCostOf` throwing on an unpriced kind and
`timebombDamageOf` throwing rather than returning a plausible small integer are good discipline.
The gap is that strictness has no backstop at the UI edge. Aggravating: the `Unassigned`
placeholder trap has been hit **three separate times** this run, each a live path into
`apCostOf`'s `RangeError`.

**DLR-131** scopes the boundary, a readable fallback, a decision on root-versus-per-screen, and a
test that a throwing child renders the fallback. It explicitly forbids weakening any existing
throw. Slotted **before DLR-120 and DLR-121**, which exercise the whole app and are where an
unguarded throw is most likely to surface.

### Developer's own list from this ticket

Whether the Vault should be skippable — it is one press from the verdict and `Start a new run`
still bypasses it, which is a pacing call. Whether family-then-card narrowing reads as focused or
as hiding 71 cards. All copy, **including the invented currency noun "mark"**. Every `clamp()`
and hue in `vault.css`. And the densest no-scroll surface in the project, unmeasured: jsdom has
no layout engine, so nothing checked it fits.

---

## DLR-122 — Tiered rank abilities: refill the run-permanent shop shelf

**Outcome: GREEN.** Commit `4177b2d` — "DLR-122: refill the run-permanent shelf with tiered rank
abilities". Not pushed. Jira DLR-122 -> Ready for Test. Four gates clean. `npm run typecheck` 0 · `npm run lint` 0 ·
`npm test` **1624 passed of 1624, 123 files, 0 failures** (baseline 1565 / 120) ·
`npm run build` 0. `npx prettier --check` scoped to the contract's own files: clean.

The deck's named ranks now carry a bought **bronze / silver / gold** ability ladder, run-permanent,
applying to the player's copies only. Bronze is the printed ability in every row, so a run that
buys nothing plays exactly as it did before this commit.

### Plan defaults taken (no approval gate — unattended)

The `AskUserQuestion` gate was never presented and the skill-confirmation call was skipped; both are
noted at the top of `tasks.md`. Defaults taken, each logged here:

1. **The shelf ships Swan and Witch only — 2 of AC1's 7 ranks.** The other five stay in the
   `TieredRank` union and are documented `[not built]` in `the-hunt.md`, but are absent from
   `TIERED_RANKS`. Reason per rank: **Fox** and **Woodcutter** need a new player-choice surface
   (peek at the draw pile; choose among 2–3 drawn cards); **Treasure** needs a coin channel out of
   `src/warCouncil/`, which cannot learn `RunState`; **Poison** collides with Timebomb's own
   vocabulary and needs that answered first; **Monarch**'s narrowing is read at five call sites,
   one of them the Quarry's own move choice, and its gold rung needs a `RoundState` field that
   survives a trick — a missed site there produces a **stuck hand**, which is the one failure an
   unattended run must not ship. The ticket explicitly permits Treasure and Poison to ship
   separately; this extends that reasoning on cost grounds. A tier that is sold and does nothing
   takes coins for nothing, which is worse than not offering it.
2. **Price: `RANK_TIER_STEP_PRICE = 5` coins per step.** TRANSCRIBED from §7b's own stated reading
   ("5 coins per tier step — a rank taken from bronze to gold costs 10 coins in total"), not
   invented. One key, not a per-rank or per-step curve, because AC7 asks for one configuration
   point and a flat step price is the only shape that literally is one.
3. **The shelf does not refill on a clock.** §7b: "a fixed, always-purchasable list, deliberately
   not behind the reels". Static shelf, no restock, no rotation, nothing behind the slot machine.
4. **A rank is bought exactly twice, and rungs do not stack.** New `PurchaseRefusal.RankAtMaxTier`,
   returned **before** the coin check so a gold rank reads "already at gold" rather than "not
   enough coins".
5. **`AbilityTier` is a new union, not a reuse of `BuffTier`.** They read the same to a player, but
   a buff tier is drawn and keys `apCostOf`; sharing the type would let a rank tier be priced in AP.
6. **`RoundUiSeed.rankTiers?` is OPTIONAL, defaulted to `ALL_BRONZE`**, following `apCapacity?`.
   Making it required would have put 21 files in the diff (14 of them spec fixtures) for no
   behavioural gain; an absent table IS "nothing bought", which AC1 requires play identically.
7. **Monarch gold, had it shipped, was reworked away from §7b's draft** — §7b's "narrows for the
   next trick as well" needs cross-trick state. Moot: Monarch is off the shelf.
8. **The Quarry's move heuristic evaluates at bronze.** `cpuPlayer.ts`'s two `resolveTrickWinner`
   calls are the Quarry's own evaluation of a candidate card, not the rule — `playCard` owns that
   and does thread the ladder. A gold Witch is therefore occasionally misjudged by the Quarry.
   Documented at both call sites.

### Every price and refill rate, against the coin economy

`COINS_PER_ENCOUNTER_WIN` is **1**. The full shelf, cheapest first: Heal 1 · Cheat 1 · Blast Guard 1
· slot reroll 1 (after one free pull a visit) · Timebomb 2 · AP capacity 3 (stacks) · Whetstone 4,
which `config.ts` itself calls "the shop's one real splurge" · **rank tier step 5** · **full ladder
to gold 10**.

So **one step is now the most expensive purchase in the game**, and a full ladder is roughly a whole
run's flat encounter income. Reachable early only through a first-hand quick kill, exactly as
Whetstone is. Deliberately steep for a permanent that never expires and that changes what a card
*does* rather than what it *scores*. §7b's two unruled alternatives are both still live and are the
developer's: a **flat 5 for the whole ladder** (makes gold the default purchase) or an **escalating
5 / 10 / 15** (makes gold a run-defining commitment). Retuning is one edit in `rankTiers.ts`.

**Refill rate: none, and that is the answer, not an omission.** The shelf is fixed and always
purchasable. Every tierable rank not yet at gold is on it at every visit.

### What returned to `SHOP_ITEMS`, and why

**Nothing DLR-116 removed came back.** Cheat, Timebomb, Blast Guard and Whetstone are still priced,
still buyable by a caller, still tested, still off the shelf. `SHOP_ITEMS` went from
`[ApCapacity, Heal]` to `[ApCapacity, SwanTier, WitchTier, Heal]` — two **new** items on the
run-permanent rung, which is the rung this ticket exists to refill.

DLR-116's convention was respected and then applied a second time one level down: **`TieredRank` is
everything the game can tier (all seven ranks); `TIERED_RANKS` is what the shelf offers (two).**
Same shape as `ShopItem` vs `SHOP_ITEMS`, same reason, stated in the module's own docblock with the
blocking surface named for each of the five deferred ranks.

### How the `Miser` tension moved

Both ways, and **no existing number was retuned**.

- **Relieved during accumulation.** `Miser` rewards unspent coins; the uncapped 1-coin reroll is the
  strongest sink in the game, so every held coin is a reroll forgone and holding was dominated at
  the margin. A lumpy 5-coin permanent gives held coins a second reason to exist — a player saving
  for silver Swan must *not* reroll, which is the same behaviour `Miser` pays for.
- **Sharpened at the spend.** Spending 5 zeroes a `Miser` payout in one move, where the reroll would
  have eroded it a coin at a time.

Net, the conflict gains a **shape** it did not have — a saving phase and a spending moment — rather
than getting uniformly worse, which is what DLR-116 recorded its screen doing. That is a design
claim, not a measurement; the shelf is fully deterministic (a tier is bought, never drawn), so
DLR-130's simulator can settle it.

### Design decisions worth the developer's eye

- **AC3 is enforced in exactly one place.** `src/warCouncil/rankTierRules.ts`'s `tierForSide`
  returns bronze for any side that is not the player **before it reads the table at all**. A grep
  for `rankTiers[` or `playerRankTiers[` anywhere under `src/warCouncil/` returns zero hits outside
  that module's own docblock, which is what makes "enforced explicitly, not left to fall out of
  shared resolution code" checkable rather than asserted.
- **AC4's "not an eaten skull" lives in `bank.ts`, not at the call site.** Both Swan facts are
  gated on `outcome === TrickOutcome.CleanLoss` inside `resolveTrickBank`, because outcomes are that
  module's subject; a caller-side gate would have put half of AC4 where no bank spec would see it.
- **AC5 reuses the poisoned-clean-loss shape** rather than reimplementing it: gold skips the
  cash-out block one branch below where `replaced` already skips the hit.
- **Gold implies silver, folded in inside `bank.ts`** rather than trusted from the caller, so a
  hand-built fact object cannot produce "the bank survives but the streak that valued it does not".

### Known open items, and how each was handled

- **`Keepsake` unfireable, `Ward` indistinguishable and out of the reel pool, `buffAccrual.ts`
  callerless** — none touched. This ticket adds no buff, no reel entry and no accrual path.
- **No `ErrorBoundary` anywhere in `src/` (DLR-131).** One new throw was added, `steppedTo` past
  gold. It is unreachable through the UI by two layers: `refusalFor` returns `RankAtMaxTier` and
  the control is disabled, and `buyFromShop` re-checks `refusalFor` and throws its own named
  `RangeError` before the `switch` is reached. The guard is inside the commit path, not against
  stale state outside it — the DLR-118 review's finding.
- **The `Unassigned` trap.** No new filter was written and `offeredBuffs` was not touched.
  `RankTierTable` is a **total** `Record`, so no unseeded lookup exists to reproduce it.
- **Determinism.** Nothing random was added. A tier is bought, never drawn.

### The check-7 undercount, again — worth recording

The Step 1.6 audit counted `ShopItem`'s construction sites through the compile-enforced total
functions and the two `Record<ShopItem, string>` label maps, and **missed two more**: a hand-built
`Record<ShopItem, PurchaseRefusal | null>` in `src/App.tsx:290` and its twin in
`src/app/run/__tests__/ShopPanel.test.tsx`. Both surfaced at the first `npm run typecheck` after
widening the union, exactly as the check predicts, and both were fixed in the same task. A third
site, `ShopPanel.test.tsx`'s `expect(SHOP_ITEMS).toHaveLength(2)`, was a **runtime** failure the
compiler could not see — it was rewritten to iterate `SHOP_ITEMS` rather than transcribe its length,
so the next shelf change needs no edit there.

### The mockup

`mockup.html` was written to the plan folder but **not published and never seen** — the run is
unattended. The diff touches `.tsx` files, but only as prop plumbing: no new component and no
layout change. The shop screen renders the two new items through the map it already had.

### Reviewer round 1 — what came back and what was done

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

### Developer's own list from this ticket

The price (5 per step, transcribed, never played) · the 2-of-7 split and how the remaining five
should be ticketed · whether the shelf is meant to have a ceiling at 10 coins per rank · whether
Swan gold sparing a Timebomb-forced reset on a clean loss is the intended reading · whether a gold
Swan undercuts Timebomb, which §7b itself flags · whether a Quarry that misjudges a gold Witch is
flavour or a defect · ratifying that `the-hunt.md`'s "no exceptions at all" line is now false, since
this is the first asymmetry the deck has carried · all placeholder copy on the two new shop cards ·
and whether four cards on the run-permanent rung still fits the panel without scrolling, which
nothing measured.

## Coordinator decisions — DLR-122 reconciliation

Suite 1565 → **1624, 123 files, 0 failures.**

- **The price was transcribed, not invented** — `RANK_TIER_STEP_PRICE = 5` comes from §7b. Worth
  recording where it lands, because this is now **the most expensive purchase in the game**: an
  encounter win pays 1; reroll / Heal / Cheat / Blast Guard cost 1; Timebomb 2; AP capacity 3;
  Whetstone 4 ("the shop's one real splurge"); **a rank tier step 5**, and a full ladder 10 —
  roughly a whole run's flat income, reachable early only via a first-hand quick kill. §7b's two
  unruled alternatives (flat 5 for the whole ladder; escalating 5/10/15) remain open.
- **"How does the shelf refill?" — it does not, and that is the answer.** §7b specifies a fixed,
  always-purchasable list rather than anything behind the reels. Static shelf, no restock. A rank
  is bought **exactly twice**; a new `PurchaseRefusal.RankAtMaxTier` fires *before* the coin
  check. Rungs are rungs, not counters — they do not stack.
- **Nothing DLR-116 removed came back.** `SHOP_ITEMS` goes `[ApCapacity, Heal]` →
  `[ApCapacity, SwanTier, WitchTier, Heal]`, and both additions are new items. The agent applied
  DLR-116's convention one level down of its own accord: **`TieredRank` is all seven ranks,
  `TIERED_RANKS` is the two on offer.** That convention has now propagated across three tickets
  without being re-taught.
- **The `Miser` tension moves both ways, which is the first relief it has had.** *Relieved* while
  accumulating — a lumpy 5-coin permanent finally gives held coins a reason to exist, so saving
  stops being dominated by the 1-coin reroll. *Sharpened* at the moment of spending. No existing
  number was retuned to achieve it.

### A real rule consequence the Defender found, and it is the developer's to ratify

Sparing the forced cash-out lets a **gold Swan's bank reach the end-of-hand fold and cash in
full — 9 rather than 6 on a 3×3 streak.** `cashOut` damages the *Quarry*, so this favours the
player and reads as the rung working as intended, but it was **undocumented and untested**. Fixed
with precise comments, three new `finalTrick` cases and a ruleset note. **Whether that larger
sixth-trick payout is intended or wants capping is a developer read**, not something the agent
settled.

### Only 2 of 7 ranks shipped, with the blockers named

Fox and Woodcutter need a choice UI; Treasure needs a coin channel out of the card layer; Poison
needs an answer to the **Timebomb name collision**; Monarch needs a `RoundState` field, and its
narrowing is read at **five call sites including the Quarry's own move choice — a missed one is a
stuck hand.** That is a good reason to have shipped two rather than seven, and the remaining five
are now scoped rather than vague.

Also flagged for ratification: **`the-hunt.md`'s "no exceptions at all" line is now false.**


---

## DLR-123 — Persistent deck across hands

**GREEN.** Gates: typecheck 0 · lint 0 · `npm test` **1655 passed / 1655, 127 files** · build clean.
Baseline was 1624/123 → **+31 tests, +4 spec files, 0 regressions**. Prettier clean on all 22 contract files.

Reviewers: all three (production-logic diff). Defender **APPROVED, 0 critical / 0 warning**. QA: **all 12 ACs MET**, 2 findings (both fixed). Code-evaluator: 1 finding fixed, 1 disproved — see the race note below.

### The deck rules as shipped, and the arithmetic

**33-card deck** (3 suits × 11 ranks). **A hand costs 13**: 6 player + 6 Quarry + 1 decree.
`CARDS_PER_DEAL = HAND_SIZE * 2 + 1` — derived, never a literal.

| Hand | Draw pile after dealing | Spent pile at hand end | Reshuffle? |
|---|---|---|---|
| 1 | **20** | 13 | no |
| 2 | **7** | 26 | no |
| 3 | 7 < 13 → fold 26+7 = 33, shuffle → **20** | 13 | **YES** |
| 4 | **7** | 26 | no |

Observed, not asserted: `deckCycle.test.ts` gets `draws = [20, 7, 20, 7]`, `reshuffles = [false, false, true, false]`.

**Cards seen per cycle: 26 of 33.** The player-facing consequence, which is the point of the ticket:

- Hand 1's deal — unseen = 6 Quarry + 20 draw = **26**; a given card is 6/26 ≈ **1-in-4.3** to be in the Quarry's hand.
- Hand 2's deal — unseen = 6 Quarry + 7 draw = **13**; the same card is 6/13 ≈ **1-in-2.2**, and half the feared cards are provably gone.

An encounter runs ~3.3 hands, so a fight sees **exactly one reshuffle**: tracking spikes in hand two, wiped once mid-fight.

### Plan defaults taken (auto-approved gate — none developer-confirmed)

- **D1 — the naming collision is resolved at the NEW name.** "Discard" keeps meaning the player's swap everywhere; the new pile is `spentPile`. Renaming the player action instead would have touched 3 string reason codes, `DISCARDS_PER_FIGHT`, `MAX_CARDS_PER_DISCARD`, `RunState.discardsRemaining`, `recordEncounter`'s 6th param, 4 `roundUiState.ts` predicates and their copy — ~25 files of string-bound churn inside a ticket already changing where cards come from. Component file stays `DiscardPile.tsx` (it IS the standard discard pile); field/copy/CSS all say **spent**.
- **D2 — "Spent" is a placeholder.** Flavour noun is the developer's.
- **D3 — the leftover draw pile folds INTO the reshuffle**, not on top. Discarding it loses cards from a 33-deck; stacking it on top is a second ordering rule with no observable difference (never-seen cards either way).
- **D4 — the threshold is derived**, not tuned. No new dial.
- **D5 — "the deck runs out mid-hand" cannot happen.** Draw-pile length is invariant for a hand's life: the Woodcutter returns a card for every one taken, the swap puts cards on the bottom as it draws off the front. So the reshuffle is only ever checked at the deal — that is what "one per cycle" means. Pinned by a spec; the defender independently derived the mid-hand minimum as **7**, so `drawPile[0]` can never read past the end.
- **D6 — at hand's end every card not in the draw pile is spent.** One total rule; AC4's decree clause is a case of it. Covers a Fox exchange and a mid-hand cash-out without special cases.
- **D7 — Timebomb marks do NOT survive a hand boundary** and don't ride a card into the spent pile. A mark returning through a reshuffle would be invisible on a face-down card. `pendingTimebomb` still crosses untouched (DLR-91 D5) — different thing, unchanged.
- **D8 — banked cards aren't a hand-boundary question.** `bank`/`multiplier` are numbers, reset per deal; tricks resolve to the spent pile as they land.
- **D9 — skulls re-rolled, never remembered.**
- **D10 — deal seed is `mixSeed(runSeed, encounterIndex, handOfFight)`**, mirroring `slotSeedFor`.
- **D11 — `dealRound`'s deck param is trailing/optional**; absent = new encounter. Keeps every existing 2-arg call meaning what it meant.
- **D12 — `handleBeginRun` now re-deals.** It mints a run with a new `runSeed`; leaving the mount-time hand would deal a run's opening hand from a seed that run doesn't have.
- **D13 — the spent count ticks at the trick's resolution**, so cards are counted while still visible in `TrickWell`. The count reflects state.

### How determinism survives the reshuffle

`App.tsx` → `dealSeedFor(runSeed, encounterIndex, handOfFight)` → `createSeededRng` (mulberry32) → `dealRound` → `shuffle`/`assignSkulls`. The reshuffle happens **inside** `dealRound` under that same injected rng, so seeding the deal seeds the reshuffle — there is no second RNG to forget. `App.tsx` now has exactly **three** `Math.random()` calls, all `Math.floor(Math.random() * 0x100000000)` feeding `startRun`; **none reaches a deal** (was three that did). The pure-core ESLint override makes a regression a lint failure, not a silent one.

### Specs rewritten — none weakened

- **11 files at `+2/−0`** — mechanical widening of a `RoundState` literal with the two new required fields. No assertion touched.
- **`deal.test.ts`** — the ONLY deletion in the whole diff: the 33-card conservation array, replaced by a **wider** one spanning `spentPile`. A strengthening. Plus 4 new AC cases.
- **`playCard.test.ts`** — one new AC3 case, pure addition.
- **`WarCouncilRound.telegraph.test.tsx`** — 3 `getByRole('status')` queries narrowed **by accessible name**, because `DiscardPile` legitimately adds a **second `role="status"`** live region. `aria-label` assertions untouched; the queries got stricter.

### Keepsake and the rank families

**`Keepsake` doesn't move, but it becomes decidable.** Still unfireable at the same rate — zero in any hand running its full six tricks, since the player's hand is empty by then and this ticket changes neither hand size nor trick count. What changed: "hand's end" stops being an implicit remount and becomes a **modelled event** (`closeHand` folding the decree and both hands into the spent pile). The three candidate fixes in `v1-buff-card-list.md` are now expressible against a real boundary. Developer's call; no replacement invented.

**`Mark of the R` (22 of 71 templates) keeps its mean, loses its independence.** 3 copies per rank in 33.

- Old: each hand independently dealt 13 of 33 → P(rank appears) = 1 − C(30,13)/C(33,13) = **0.791 per hand**, every hand alike.
- New: hands 1+2 deal 26 of 33 → expected copies per cycle = 3 × 26/33 = **2.36. Identical.**
- What moves: a rank whose 3 copies all landed in hand 1 is now **impossible** in hand 2 (was 79%). Negatively autocorrelated — swingier hand to hand, same over the cycle. Whether that variance is wanted is a design read.

**Confirmed undisturbed, by test not assertion:** `Whetstone` pays per trick; tricks/hand (6) and hands/encounter (~3.3) unchanged. Slot machine `expectedCardsPerPull()` = 2.640625 — reel pool has no contact with `createDeck`/`shuffle`/`Card`; `slotOdds.test.ts` re-run green. `cardDamage.ts` cannot lie: builds no `RoundState`, never reads `drawPile`/`spentPile`, and none of the six fields it reads changed meaning.

### GOTCHA — three reviewers reported a defect that was never shipped

The code-evaluator filed a **blocking** finding: a `Math.random()` jitter in `dealPileFor`, with a claimed ~50% test flake. QA independently reported the **same line in the same file**, and the defender reported a transient `discard.ts` mutation too.

It was **mutation testing**. The Phase 4 agent was deliberately breaking `closeHand`, `applyWoodcutterDraw`, `applyDiscard` and `dealPileFor` in turn to prove each invariant spec could actually fail, reverting each. Three reviewers running concurrently read the working tree inside those few-second windows.

Adjudicated on evidence: the file is 92 lines with zero `Math.random()` calls, and **10 consecutive runs of both determinism specs passed, 0 failures**. `git status` shows `discard.ts` and `abilities.ts` were never modified at all.

**Two lessons for the pipeline.** (1) Mutation testing and a concurrent reviewer dispatch are incompatible — an implementer that mutates production code to validate a spec must do it in a scratch copy, or the orchestrator must not overlap it with reviewers. (2) The reviewers behaved **correctly**: all three reported what they actually saw with captured evidence rather than smoothing it over, and QA explicitly flagged "something mutated this file mid-run" as worth the developer's attention. That is the right instinct, and it should not be trained out.

### Other gotchas

- **My own plan text had two errors, caught by the implementer.** The CSS tokens I named (`--wc-ink-dim`, `--wc-accent`) **do not exist**; the real ones are `--wc-chalk-dim` and `--wc-brass`. And my spec source omitted `afterEach(cleanup)`, which every other `.test.tsx` here uses — without it four renders leak and `getByRole` throws.
- **My instruction "change the seed" was unsatisfiable.** The task's `playOutHand` helper tried to dodge Fox/Woodcutter cards and fall back; a full hand can legally reach a turn where *every* legal move needs an `AbilityChoice`. The Phase 4 agent brute-forced **10,000,000 seeds and found zero** where a 3–4 hand chain avoids it (a single hand succeeds ~6% of the time). Fixed properly by making the helper **total** — answer the prompt with a neutral choice (Fox declines, Woodcutter buries back the card it drew) rather than dodging it. **Future contracts writing a "play out a hand" helper should answer ability prompts, never try to avoid them.**
- **`App.tsx` and `WarCouncilRound.tsx` are close to the 400-line ceiling** (394 and 387). A comment I added pushed `App.tsx` to 398; I trimmed it back. The next change to either file should expect to extract.
- **The felt now has two `role="status"` live regions.** Any new `getByRole('status')` must disambiguate by name. Whether two polite live regions is the right screen-reader experience is a developer judgement (defender flagged it, not a defect).
- **`.claude/rules/` is not empty** — it holds `save-data-versioning.md`. `CLAUDE.md` still says "currently empty"; that restatement is stale.

### Ticket-scope note

The ticket's Design Assets line asks for a write-up in `.docs/design/…/ideas.md`. **Deliberately not done.** `ideas.md` is the developer's hand-edited parking lot for ideas *before* they are arguments; this rule is now settled and shipped, which is `the-hunt.md`'s job — and that file was updated. Flagging rather than silently skipping.

### What the developer must decide or judge by playing

- The flavour word for "Spent" (copy).
- Whether one reshuffle per fight is the right cadence, or arrives too early.
- Whether the spent count is legible at a glance **without** becoming the card-counting aid the ticket forbids.
- Whether the reshuffle notice is loud enough to register, quiet enough not to interrupt.
- Whether the rank families' new hand-to-hand variance is wanted.
- **Encounter tuning must be RE-MEASURED.** PIMC ~49% / random ~10% were measured under reshuffle-every-hand and are invalidated. The CPU does not count cards, so this hands the player an inference edge and the Quarry nothing.
- `Keepsake`'s wording, instant, or deletion.

### What a browser would have checked (browser pass NOT requested)

Play hands 1 → 2 → 3 and watch the draw count read **20, 7, 20** while Spent climbs **0 → 13 → 26** and resets at the reshuffle; confirm the reshuffle notice fires **exactly once** at the hand-3 deal and the standing "Spent cards stay spent" line shows otherwise; confirm **no card face is ever visible** in the Spent plate, including right after a trick resolves; confirm a Woodcutter bury and a hand-swap in hand 2 do **not** move the Spent count; confirm the felt rail doesn't crop at real viewport sizes with the second plate added — jsdom has no layout engine, so no test here can prove it.

## Coordinator decisions — DLR-123 reconciliation (third session-limit recovery)

**The agent hit the session limit during its documentation pass** (reset 13:30; the run resumed
immediately). Implementation was complete: contract **42/42, `Status: COMPLETE`**, sprint-log
section written.

- **All four gates verified by the coordinator, not relayed:** typecheck exit 0 · lint exit 0 ·
  vitest **127 files, 1655 tests, 0 failures** (baseline 1624/123, so +31 tests, +4 files) ·
  build exit 0. Committed as `00349ce` and pushed.
- **The determinism constraint held, and went further than the brief asked.** The loudest line in
  the dispatch was that a reshuffle is where `Math.random()` gets added by reflex, and that no
  test would catch it. The agent instead **removed the last `Math.random()` from the deal path
  entirely**: `dealRound` used to be handed `Math.random` directly, so **no deal and no reshuffle
  in this game was ever reproducible.** The deal is now seeded from `runSeed` via `dealSeedFor`.
  Verified independently by the coordinator — the only `Math.random()` calls left in `src/` are
  three in `App.tsx`, all `Math.floor(Math.random() * 0x100000000)` feeding `startRun`'s seed,
  and **none reaches a deal**. Every other hit in the codebase is a docblock stating the ban.
  **DLR-130's simulator and the balance pass are now viable in a way they were not before this
  ticket.**
- **The deck's lifetime moved from hand-scoped to encounter-scoped.** One shuffled 33 is dealt
  from repeatedly; resolved cards accumulate in a spent pile that is never dealt from; and only
  when the draw pile cannot cover a whole deal does everything fold back and shuffle **once**.
  `CARDS_PER_DEAL = HAND_SIZE * 2 + 1` is both the cost of a hand and the reshuffle threshold, so
  the two cannot drift apart. `isFreshDeck` exists so `dealRound`'s branch and a spec cannot
  disagree about what "fresh" means.
- **The pure-core ESLint override makes reintroducing a bare random a lint failure rather than a
  silent regression** — the boundary added during DLR-106 now protects the property it was built
  for.

### What the dead doc pass left, and what the coordinator finished

`.docs/implementation/war-council/the-encounter-deck.md` was **written in full** (149 lines, head
and tail both complete prose) before the agent died — but **nothing referenced it**. The
coordinator added its entry to `war-council/README.md`'s "How it works" list. Any `the-hunt.md`
ruleset update the doc pass would have made did not happen and is left for **DLR-121**, the
verification ticket, rather than patched blind here.

**This is the second session limit to land squarely on a doc pass** (DLR-113 was the first, and
also left an unindexed module doc). The pattern is worth noting for the run report: the
documentation step runs last, so it is the most likely casualty, and its failure mode is silent —
a complete document that nothing links to.


---

## DLR-125 — Engine: buff condition/reward evaluation framework

**GREEN.** Four gates: `typecheck` exit 0 · `lint` exit 0 (0 errors, 0 warnings) · `npm test`
**1702 passed of 1702, 131 files, 0 failures** (baseline 1655/1655 across 127) · `npm run build`
exit 0. Scoped `prettier --check` clean across all 30 contract files. Reviewers: Code-Evaluator
APPROVED, Defender APPROVED (0 Critical / 0 Warning / 2 Info), QA found one Prettier miss in
`buffEvaluation.ts`, fixed with a scoped `--write`, all four gates re-run green. **One review round;
no second round needed** — the only finding was whitespace, so re-dispatching three reviewers for a
formatter run would have bought nothing.

**This is the ticket the whole buff system was waiting for.** `buffAccrual.ts` had shipped on
DLR-124 with no caller; it has one now.

### Which of the twelve condition families fire, and which do not

This is the list that tells the developer — and DLR-130's simulator — which of the 78 v1 cards are
real.

| # | Family | Cards | Fires? |
|---|---|---|---|
| 1 | Taker | 12 | **Yes** |
| 2 | Feeder | 12 | **Yes** |
| 3 | Mark of the *R* | 22 | **Yes** |
| 4 | Sidestep | 2 | **Yes** |
| 5 | Glutton | 4 | **Yes** |
| 6 | Hoarder | 4 | **Yes** |
| 7 | Unbloodied | 4 | **Yes** |
| 8 | Long Fall | 0 | **No — not shipped.** DLR-111 deferred it for want of a UI answer; no template exists. |
| 9 | Debt Collector | 4 | **Yes**, on the PRESS |
| 10 | Keepsake | 3 | **Evaluates correctly, never fires in live play** — see defects |
| 11 | Miser | 2 | **Yes** |
| 12 | Cornered | 2 | **Yes** |

**Ten of twelve fire and pay (65 cards). One is enforced but unsatisfiable (3 cards). One does not
exist (0 cards).** All eight Activated cards answer `false` to every condition by design.

### Plan defaults taken (the gate was not paused at, per the dispatch)

1. **Evaluation lives inside `resolveTrickBank`**, not before or after it. Hoarder reads the bank
   *after* the climb and Unbloodied reads "was this trick a hit" — figures that exist only inside
   that function — and R3 puts Momentum inside the cash-out product and Blade outside it, and the
   product is `bank.ts`'s. Evaluating before would need a discarded first pass or a duplicated
   climb; after cannot work at all.
2. **`TrickFacts.buffs` and the two new `TrickResolution` fields are REQUIRED, typed `… | null`**,
   not optional — so the compiler enumerates every construction site. Cost: 16 `TrickFacts` sites
   and 6 `TrickResolution` sites, 19 of them spec fixtures. Optional would have let a call site skip
   buffs silently.
3. **Sidestep/Glutton's "with this card" is satisfied by per-trick activation; no target-card field
   was added.** A buff is activated in the between-tricks window *for the coming trick*, and
   `openBuffWindow` clears `activatedThisTrick` at each resolution — so "this card" already means
   "the card played on the trick this buff was bought for". AC3 is tested against that mechanism.
4. **Debt Collector fires on the Apply Damage PRESS, not the landing** — DLR-109's reading, until
   now unenforced in code. A hand-scoped `applyDamagePressed` flag set in `handleTapApplyDamage`'s
   committing branch.
5. **The Momentum and Blade pools are SPENT once per hand, not re-applied at every cash-out.** This
   is a rule *reading*, not a transcription: R6 states a per-hand cap but does not say what happens
   when a hand holds more than one cash-out, and a hand can hold a forced cash-out, a voluntary
   Apply Damage and an end-of-hand fold. Re-adding at each would pay three full pools and the cap
   would not be a cap. Implemented with two new forward-only counters, `multiplierPaid` /
   `flatDamagePaid`. **Reversing it is a one-line change in `bank.ts`.**
6. **Blade pays whenever a cash-out branch fires, even when the product is zero.** R3 step 4 adds
   flat damage "to the result"; a result of zero is a result.
7. **A buff whose condition is met on the trick that ends the hand fires, and fires before the
   end-of-hand cash-out.** Terminal cadence exists for that instant. Second Wind refunded there buys
   nothing — a player's mistake to make, per R7.
8. **`recordEncounter` gained an OPTIONAL eighth parameter** (`buffCoinsEarned`, default 0) rather
   than a required one — 48 call sites across 14 files, of which 47 have nothing to do with coins.
9. **Purse coins land on a LOST encounter too** — added outside the `wonThisEncounter` ternary. The
   buff's condition already decided whether it fired; the run's purse is not the place to re-judge.
10. **`Cornered` is evaluated as `health * 100 < threshold * PLAYER_START_HEALTH`** — integer both
    sides, no division anywhere in the new code, so no `NaN` can reach a rendered heart row.
11. **DLR-117 AC1 (the "once any buff is active" visibility gate) was left undone**, deliberately.
    Hiding a currently-always-visible readout changes what the felt looks like at rest — a visual
    judgement the developer owns, and this is an `engine` ticket. Follow-up.
12. **`timebombDamageFor` / `timebombDamageOf` were NOT collapsed.** The DLR-117 handoff conditions
    that on the ticket that replaces `commitTimebomb` with `activateBuff`, and this is not it —
    Timebomb is an Activated card with no condition, untouched here.
13. **Hand-scoped buff state lives in a NEW module, `src/app/warCouncil/buffRoundState.ts`**, not in
    `roundUiState.ts` — that file stood at 379 of its 400-line budget and three documented fields
    would have breached it. It ended at 392.

### Does DLR-117's preview inherit buff contributions for free?

**Yes — AC3 is met, and it cost one line.** `playOptions(state)` is the single assembly the player's
commit, the Quarry's follow and the preview all read. Adding `buffs` to it means the preview's
hypothetical `TrickResolution` already carries the buffed multiplier and the Blade bonus before
`applyResolution` is asked what it costs. **The preview still computes no damage itself** — QA
verified `cardDamage.ts` performs no arithmetic of its own — so R3's order, the four caps and the
Overlap Bonus are inherited, never restated. The preview's whole correctness argument survives.

### How the per-hand-not-per-hit reset asymmetry is preserved

Structurally, and made stronger:

- `startHandAccrual()` is still the **only** reset in `buffAccrual.ts`, and no `resetOnHit`-shaped
  function was added — the wrong reading still has no function to call. Verified by grep: the only
  match is the docblock sentence stating the absence.
- The per-hand reset is `createRoundUiState` calling `startBuffHand()`, which works because
  `App.tsx` remounts the felt per hand (`key={hand}`) — the identical argument `startBuffActivation`
  already makes. The Defender verified that remount assumption still holds at `App.tsx:371`.
- The two new counters move **forward only**, and only when a cash-out actually pays.
- The one counter that legitimately zeroes on a hit is `tricksWithoutHit` — Unbloodied's
  **condition**, not a cap. It lives in `buffRoundState.ts`, a different module from the caps,
  precisely so no reader confuses the two.

### How the three known defects moved

- **`Keepsake` — confirmed unfireable, and now pinned by a test rather than suspected in a comment.**
  With `HAND_SIZE` cards and that many tricks every dealt card is played, so the hand at the final
  trick's resolution is empty and "hold a card of suit S at hand's end" is false by construction. The
  evaluator is correct (a test fires it on a non-empty remaining hand); a second test records that
  the live path supplies an empty one. **Three Purse cards pay nothing.** Two exits, both the
  developer's: redefine "hand's end" against DLR-123's persistent encounter deck, or retire the
  family. Not decided here.
- **`Ward` silver/gold indistinguishable at `DAMAGE_PER_HIT = 1` — unmoved.** Ward is an Activated
  consumable with no condition and never reaches the evaluator.
- **`Miser` fights the shop — now genuinely live rather than theoretical.** A Miser buff fires and
  pays whenever the purse clears 5/10/20, so the hoard-versus-spend tension is real from this ticket
  onward. A balance call for the end-of-epic pass, not a code defect.

### Two planner slips the implementers caught, worth the run report

1. **`tasks.md` Task 4's Files block omitted `src/app/warCouncil/cardDamage.ts`**, even though
   `plan.md`'s own construction-site audit names it as one of exactly two production `TrickFacts`
   sites. Making the field required without fixing every site breaks `typecheck` project-wide, so
   the Phase 2 implementer added a placeholder `buffs: null` with a comment, and Phase 3 replaced it
   with the real spread. The plan should have listed the file in Task 4 or assigned the whole site
   to Task 6. **The audit knew; the task list did not inherit it** — worth a `/fb-plan` note: an
   audit finding must land in a `**Files:**` block, not only in prose.
2. **`tasks.md`'s R3 worked example ("16, not 18") could not be reproduced with two firing buffs**,
   because two buffs firing also draw R5's Overlap Bonus (+1 multiplier), which pushes the figure to
   19. The implementer isolated R3's *order* from R5's *stacking* by building the accrual directly,
   and left R5 exercised by its own separate case. A planner arithmetic slip, flagged rather than
   quietly reconciled.

### One reviewer disagreement, recorded not actioned

The Code-Evaluator would place the Task 8 end-to-end assertion in `src/app/warCouncil/__tests__/`
rather than in `src/warCouncil/__tests__/bank.buffs.test.ts`, since that one test imports
`applyResolution` from the app layer while the file's other five are pure `bank.ts` specs. It did
not block on it and the crossing is commented as deliberate. Left as shipped.

The Defender left one Info item worth carrying: the preview's `remainingHand` derivation is
structurally different from the commit's post-ability hand in `playCard`, and the two only coincide
because both reduce to an empty hand at every reachable final trick — an invariant true today but
nowhere stated or tested. **Moot while Keepsake cannot fire; live the moment it can.**

### Browser

Not requested — opt-in and off by default. No server started. What a browser would have checked:
activate a Bell-Taker (Blade) between tricks, win a trick with a Bells card, confirm the Quarry's
health drops by more than the unbuffed cash-out; confirm the hand fan's per-card readout shows the
larger figure *before* the card is played; confirm the AP plate's pool climbs after a Second Wind
buff fires; confirm the purse after the hand includes the Purse contribution; confirm a clean
console across a full hand and a remount. **And the one thing only a person can judge: nothing
announces a buff firing.** A player sees a larger number with no cause named — a UX gap this ticket
creates by making buffs work at all.

## Coordinator decisions — DLR-125 reconciliation

Suite 1655 → **1702, 131 files, 0 failures.** One reviewer round.

**The buff system now actually works.** Eleven tickets built the pile, the costs, the draw, the
loadout bar and the shop while `buffAccrual.ts` had no caller and an activated buff paid nothing.
It pays now, on all four axes, and **one assertion proves it end to end**: the same trick resolved
with `buffs: null` versus an activated bronze Bell-Taker, both through the real `applyResolution`,
asserting a strictly larger Quarry health delta.

- **10 of 12 families fire — 65 cards live.** Taker (12), Feeder (12), Mark of the *R* (22),
  Sidestep (2), Glutton (4), Hoarder (4), Unbloodied (4), Debt Collector (4), Miser (2),
  Cornered (2). All 8 Activated cards answer `false` to every condition by design.
- **Two do not: Long Fall** (#8, never shipped — DLR-111 deferred it and no template is
  generated) and **Keepsake** (#10, 3 Purse cards).
- **DLR-117's AC3 was met in one line, exactly as designed.** `playOptions(state)` gained a
  `buffs` field, so the preview's hypothetical resolution already carries the buffed multiplier
  and Blade bonus. QA re-verified that `cardDamage.ts` still performs **no damage arithmetic of
  its own** — R3's order, the four caps and the Overlap Bonus are inherited, never restated. This
  is DLR-117's "compute nothing, read a real resolution" architecture paying for itself two
  tickets later.
- **AC1 (the visibility gate) deliberately left as a follow-up** — hiding an always-visible
  readout is a visual judgement, not an agent's call. **Carried to DLR-119 by comment.**

### `Keepsake` is now confirmed dead, not suspected

It moved from *suspected* unfireable to **confirmed and pinned by a test**: the evaluator is
correct, but the live path can never satisfy it. **Three Purse cards pay nothing.** The developer
decides — redefine "hand's end" against DLR-123's now-persistent encounter deck, or retire the
family. This has been open since DLR-111 and is now decidable.

`Ward` is unmoved (an Activated consumable that never reaches the evaluator). **`Miser` now
genuinely fights the shop** rather than theoretically — a balance call for the end-of-epic pass.

### A rule reading the developer should check, one line to reverse

The **Momentum/Blade spend-once-per-hand model is a reading, not a transcription** — DLR-124's R6
does not say what happens across several cash-outs in one hand. One line in `bank.ts` reverses it.
Also: **the Overlap Bonus fires on real play for the first time**, and nobody has seen it.

### DLR-119 gains a second scope addition

**Nothing announces a buff firing.** The player sees a bigger number with no cause named — a UX
gap this ticket *created* by making buffs work. Added to DLR-119 alongside DLR-109's payout
feedback gap; they are the same shape, namely the engine doing something meaningful that the
screen does not narrate.

### Two planner slips, both caught by the implementers rather than silently reconciled

`tasks.md` Task 4 omitted `cardDamage.ts` from its Files block **despite `plan.md`'s own audit
naming it**; and the R3 worked example could not be reproduced with two firing buffs **because
the Overlap Bonus also fires** — the example itself was incomplete. Logged for the run report.


---

## DLR-126 — Engine: consumable-item activation flow

**GREEN.** Slug `DLR-126-consumable-item-activation-flow`. No browser pass (opt-in, not requested).
No mockup — the only `.tsx` edit in the file map is the two `onComplete({…})` literals a new
required result field forces, so none was called for.

### The overlap check DLR-108 was flagged for — most of it existed, and the ticket still had a real remainder

Preflight flagged this as possibly already done by DLR-108. **The generic activation flow is indeed
complete and was reused unchanged** — `activateBuff`, the `WindowClosed → AlreadyActive →
InsufficientAp` refusal order, `apCostOf` as a derived two-table lookup, the per-trick
(`openBuffWindow`) and per-hand (`refreshBuffsForNewHand`) resets, and DLR-114's poise/commit UI.
Nothing of it was rebuilt.

**What genuinely did not exist was anything that makes a consumable a consumable.** Confirmed by
grep: all five consumables had a `BuffKind`, an `Activated` cadence, an AP price and UI copy —
**20 hits outside tests, every one a name, a price, a cadence row or a label, and zero behaviour.**
Concretely, before this ticket: activating a Ward spent 2 AP, recorded the id in
`activatedThisTrick`, had that record wiped at the next trick boundary, and **did nothing at all** —
the card stayed in the pile forever and could be re-bought every trick, indefinitely. That is the
defect this ticket closed.

DLR-125's premise is confirmed rather than refuted: `buffFires` returns `false` for every Activated
kind and `firedBuffs` filters them out, so a consumable never reaches the evaluator **by design**.
This ticket does not change that — a consumable's effect fires at the SPEND, not at trick
resolution, because it has no condition to evaluate.

### Built

New `src/hunt/consumables.ts` (a leaf module — imports `./buffs` and `./types` only): the five
one-shot kinds, each one's timing window, the four tier ladders transcribed from
`v1-buff-card-list.md`, a typed `ConsumableEffect`, the counted-stack view, `spendConsumable`, and
Ward's absorption arithmetic. `activateFromPile` in `buffActivation.ts` — the single call that
spends AP *and* removes the card, so the two can never diverge. A new `NoEffectYet` refusal.
**Ward wired live** on a new `EncounterState.wardAbsorbs`, absorbed inside `applyDamage` ahead of
blue hearts. **Second Thoughts wired live** onto the discard budget. The spend rides up through
`WarCouncilRoundResult.buffs` → `recordEncounter`'s new optional ninth parameter → `RunState.buffs`,
so it survives the hand boundary and the felt's per-hand remount.

**AC4 is partially delivered, by design and stated as such.** Puppeteer, Foresight and Spyglass ship
with descriptor, price, timing and a refusal, but no effect: each needs a player-choice surface no
screen provides. `CONSUMABLE_EFFECT_LIVE` is one boolean per card — the ticket that builds each
surface flips its row and changes nothing else.

### The four judgement calls this ticket carried

- **When may a consumable be spent?** Four of five reuse `discardWindowOpen`, as AC2's first branch
  invites. **Puppeteer does not** — DLR-111's worked example needs it to resolve after the Quarry
  has led and before the player commits, which is the opposite of `currentTrick.length === 0`. It is
  declared `ConsumableTiming.BeforeOwnCard`; **no reducer opens that window today**, and it is
  additionally unspendable via `NoEffectYet`. The engine states the requirement rather than faking a
  window.
- **Is spending reversible?** **No, in the engine** — consistent with DLR-108, which has no
  un-activate. Reversibility is entirely the UI's two-tap poise/commit, and `Escape` still drops a
  poise. Once committed the card is gone for the rest of the run.
- **Redundant at the moment of use?** **Allowed, and the item is consumed.** No consumable is ever
  *provably* redundant — a Ward is only wasted if no hit lands, which is not knowable when it is
  spent, and Second Thoughts has no budget ceiling. Refusing would need the engine to predict the
  trick, and every refusal adds a "why is this greyed out?" the player cannot answer. Reading the
  felt is the player's job. (`NoEffectYet` is the different rule: it refuses a card that can *never*
  do anything in this build, not one that *might* do nothing this trick.)
- **Spendable in response to something already booked?** **Yes.** Design §1 puts these cards in the
  pile precisely to be sprung at what is actually happening, and a Ward spent between tricks against
  a Timebomb already ticking is the clearest case. This turns out to be load-bearing rather than
  incidental — see the Ward finding below.

Two smaller defaults: **Ward SETS its absorption, downward too** (mirrors `activateShield` verbatim
— two adjacent guards with opposite stacking rules is the pair a later edit "makes consistent" by
mistake), and **Ward absorbs BEFORE blue hearts** (it perishes on contact, a blue heart does not, so
spending the perishable pool first is the only order in which a Ward is worth more than the heart
behind it). Both are readings with no source document behind them.

### The `Ward` decision: kept all three rows, shipped 1/3/5, retuned nothing — and DLR-111's premise is not quite right

DLR-111 recommended deleting the silver and gold rows on the grounds that `DAMAGE_PER_HIT = 1` makes
absorbing 1, 3 and 5 the same outcome. **The code says otherwise.** `src/warCouncil/bank.ts:258`
computes `damageToPlayer = (trickHit ? DAMAGE_PER_HIT : 0) + trick.timebombToPlayer`, and
`TIMEBOMB_DAMAGE`'s player column is **2 / 4 / 6** — so a player hit is 1, **or 3 / 5 / 7 when a
Timebomb detonates against them.** Silver and gold Ward are the only cards in the game that cover
those. Deleting them would remove the only answer to the biggest hit the game can deal. All three
rows ship, and `DAMAGE_PER_HIT` was not touched — it moves the whole game.

**What is still the developer's:** the distinguishing case is *self-inflicted* — the player primed
that Timebomb. If the Quarry never deals a multi-point hit, silver and gold Ward are close to dead
content, and the fix is either a wider damage spread or a retire. That is a tuning read, not an
engine one, and it is now decidable on evidence rather than on DLR-111's approximation.

### The other open items, and how each moved

- **`Keepsake` — unaffected, still dead.** A `Terminal` condition family, not a consumable. Nothing
  here touches the evaluator, the accrual, or the definition of "hand's end". The developer still
  owes the same call: redefine it against DLR-123's persistent deck, or retire the family.
- **`Miser` — unaffected.** Nothing here spends or earns a coin. Still fights the shop.
- **`ErrorBoundary` (DLR-131) — unchanged risk on a slightly larger surface.** This ticket adds
  throw sites in `src/hunt/`, every one guarded at the reducer (`handleTapBuff` re-reads
  `loadoutRefusalFor` on both taps, and `activateWard` is throw-free for every `BuffTier` exactly as
  `activateShield` is), but the underlying gap is untouched.
- **`timebombDamageFor` / `timebombDamageOf` — NOT collapsed; the nomination moves on.** It was
  nominated for whichever ticket replaces `commitTimebomb` with `activateBuff`. That is not this
  one: Timebomb is deliberately excluded from `isConsumableItem`, its bespoke `TimebombStage` path
  is untouched, and collapsing it here would be an unrelated refactor inside a ticket about one-shot
  items.
- **The `Unassigned` trap — not hit.** Every pile read still goes through `offeredBuffs` →
  `activatableBuffs`. No fourth filter was written.

### AC5 answered: yes, consumables draw through the same reel/tier mechanism

DLR-112's AC6 is resolved using this ticket's ownership model as the deciding constraint, and the
answer needs **no change to DLR-112's mechanism**. A consumable is an ordinary `Buff` — id, kind,
tier, condition, reward — minted the way `cheatBuff`/`timebombBuff`/`shieldBuff` mint theirs and
held in the same `RunState.buffs`. It carries a real bronze/silver/gold ladder for a tiered reel to
land on; Puppeteer is single-tier in the source and a reel handles that by minting bronze. AC1's
counted "2x Protect 3" inventory is a **derived view** over that pile, not a second store, so there
is nothing for the draw mechanism to learn. **What separates a consumable from a persistent buff is
what happens at the SPEND, not what happens at the DRAW** — and the draw is all DLR-112 owns.

### A planner slip, caught by the compiler at the first typecheck

`plan.md`'s Step 1.6 audit counted **2** construction sites of `BuffActivationStock`. There were
**7** — five more built by hand inside `src/hunt/__tests__/buffActivation.test.ts`, which the audit's
`alreadyActive:` grep found only outside the spec tree. Exactly the check-7 failure mode the command
documents. Cost: one typecheck round, no wasted phase. Worth noting that check 7's *design* worked —
the field was required, so it failed loudly at `tsc` rather than silently.

Separately, **one existing DLR-108 test genuinely changed behaviour and had to be updated**: it
stacked a bronze Foresight then a bronze Ward against one AP pool, and Foresight is now refused with
`NoEffectYet`. It was rewritten as a bronze Timebomb then a bronze Ward — two live cards, same
subject (several activations drawing down one pool until the next cannot be afforded), and the
change is commented in place so it does not read as a silently weakened assertion.

### Nothing in this diff is player-reachable today

No template mints a consumable — `grep -c "BuffKind.Ward" src/hunt/buffTemplates.ts` → **0**, and
`seedStartingBuffPile` mints only `Unassigned`. So a browser could not exercise a single new path by
playing, which is why the browser pass would have proved nothing. It becomes reachable when DLR-112
lands.

**What a browser would have checked, once a consumable can be minted:** that the loadout panel lists
it with its AP price; that one tap poises and a second spends; that the row disappears after the
spend and does **not** return on the next trick or the next hand; that a Foresight row reads
`Not usable yet.` and cannot be committed; that a Ward's absorption shows on the health bars when
the next hit lands; and that a Second Thoughts visibly raises the discard counter.

The `'Not usable yet.'` copy is a placeholder — the `Record` type forces a row, and it is unreachable
in play. Visual and copy judgement is the developer's.

## Coordinator decisions — DLR-126 reconciliation

Suite 1702 → **1765, 133 files, 0 failures.** All three reviewers, **zero findings** from both
code-evaluator and defender.

- **The preflight overlap flag was half right, and the agent said so precisely.** DLR-108's
  generic activation flow was complete and **reused unchanged** — no parallel mechanism was
  built. What did not exist was **anything making a consumable one-shot**: all five had a kind, a
  cadence, a price and a label — **20 references outside tests, zero behaviour.** Activating a
  Ward spent 2 AP, recorded the id, had it wiped at the next trick boundary and did nothing; the
  card could be re-bought every trick forever. That is exactly the honest-remainder outcome the
  dispatch asked for.
- **AC4 shipped 2-of-5 by design.** Puppeteer, Foresight and Spyglass each need a screen that
  does not exist, so they are **refused rather than burned for nothing** — the right failure mode.

### The `Ward` defect does not exist, and the run had been repeating it

**Correction to the record.** DLR-111 reported Ward's silver/gold tiers as indistinguishable
because it absorbs 1/3/5 hits while `DAMAGE_PER_HIT = 1`, and recommended deleting the upper
rows. That premise **does not survive the code**: `bank.ts:258` computes
`damageToPlayer = (trickHit ? DAMAGE_PER_HIT : 0) + trick.timebombToPlayer`, and
`TIMEBOMB_DAMAGE`'s player column is **2/4/6** — so a hit is 1, **or 3/5/7 when a Timebomb
detonates against the player**. Silver and gold Ward are the only cover for exactly those cases.

**Kept all three tiers. Deleted nothing. Retuned nothing. `DAMAGE_PER_HIT` untouched.**
`the-hunt.md` still carried the superseded "delete the two upper rows" claim; it was corrected
with the evidence. This is the first time in the run that a finding carried forward through six
tickets was **disproved rather than inherited**.

### A reachability gap worth knowing before the closing tickets

**No template mints a consumable** — `grep -c "BuffKind.Ward" src/hunt/buffTemplates.ts` → **0**.
So not one path added by this ticket is reachable by playing, and a browser would have checked
nothing. The consumables exist, are tested and are correct; the reel simply cannot produce them.
Whether that is intended for v1 or an omission in DLR-112's pool is the developer's call, and it
is the kind of thing **DLR-120's integration pass should catch**.

### Carried forward

- **`timebombDamageFor` / `timebombDamageOf` still not collapsed** — Timebomb is deliberately
  excluded from `isConsumableItem` and its `commitTimebomb` path is untouched. The nomination
  moves on again; it has now outlived four tickets.
- **`Keepsake` unaffected and still dead. `Miser` unaffected.** ErrorBoundary risk unchanged —
  new throw sites were added, each traced by the defender as unreachable from the reducer.
- **A fourth construction-site undercount**, this time caught by the new check's absence in an
  already-written plan: `BuffActivationStock` claimed 2, had **7**. The compiler caught it at
  first typecheck and it cost one round — the failure mode `f45d66e` was written to prevent.

### Developer's own list

Ward's silver/gold rows (the distinguishing case is **self-inflicted damage** — the fix, if any,
is a wider damage spread or a retire, not a Ward change); the `'Not usable yet.'` copy; **Ward
absorbing ahead of blue hearts and replacing rather than stacking** — both readings with no
source behind them; and Puppeteer's `BeforeOwnCard` window, declared but opened by no reducer.


---

## DLR-130 — Headless run simulator (out-of-band)

Raised mid-run, planned and applied out of sprint order: after ticket 19 of 22, before the closing
three (DLR-119, DLR-120, DLR-121). The developer's balance pass needs an instrument, and DLR-123
had just removed the last `Math.random()` from the deal path — which is what made a reproducible
deal and reshuffle possible for the first time, and this ticket possible at all.

**GREEN.** typecheck 0 · lint 0 · `npm test` 137 files / **1783 passed** / 0 failed (baseline
133 / 1765; the delta is exactly this contract's four new spec files) · `npm run build` 0.
Reviewers: defender APPROVED (0 critical, 0 warning); code-evaluator and QA each found one issue
and it was the same one — two files not Prettier-clean. One whitespace-only fix pass, re-verified,
done. One review round, not two.

### The plan gate was auto-approved — every default taken, listed

No `AskUserQuestion` was presented (unattended run). These are the plan's stated defaults that
stood in for a developer answer:

- **The driver lives in a new `src/sim/`**, not in `src/app/` or `scripts/` — it is pure logic with
  real invariants (determinism, termination), so it belongs where Vitest can reach it.
- **`src/sim/` imports `src/app/warCouncil/`, and the plan says so out loud.** `applyResolution`'s
  four-step damage/Timebomb/payout fold and `handleTapBuff`'s activation-plus-consumable-spend live
  in the app layer despite being React-free. A driver that skipped them would measure a game nobody
  plays. The coupling is one-directional; the pure core gained no import.
- **The runner is `vite build --ssr` + `node`, not a TypeScript loader.** Node 24's native
  type-stripping cannot resolve this repo's extensionless imports, and `tsx` / `vite-node` /
  `ts-node` are all absent and would each be a dependency approval — a pause. Vite is already a
  devDependency. **This was verified working with a throwaway probe before the plan was written**,
  not assumed: the probe dealt a hand, played all six tricks through `roundReducer`, and exited.
- **The CLI sits outside `src/`** (`scripts/sim.ts` plus a new `tsconfig.scripts.json`) so `process`
  is available without adding `@types/node` to `tsconfig.app.json`, which would change global
  typings for the whole app tree to save one small project file.
- **The baseline's card choice reuses `chooseCpuMove` seated on the player.** The engine's own
  shipped heuristic — deterministic, always legal, and describable in one sentence, which matters
  because the policy has to be written down.
- **Simulated runs play with an empty Vault** — `drawReelPool`, not `drawVaultReelPool`. No
  starting grants, no odds adjustment. Keeps `src/sim/` clear of the persistence tree.
- **The three termination caps are safety rails, not tuning values.** `MAX_ACTIONS_PER_HAND` 400,
  `MAX_HANDS_PER_FIGHT` 40, `MAX_SHOP_ACTIONS_PER_VISIT` 40 — each an order of magnitude above
  anything reachable, each surfacing as a reported `stalled` run, which is a bug signal and is kept
  rigorously distinct from `lost`.
- **`BASELINE_CASH_AT_MULTIPLIER = 3`** — a *policy* parameter, deliberately not in
  `src/hunt/config.ts`. Flagged to the developer as the knob with the most leverage over the
  printed damage figures.
- **An unknown `--policy` exits 1** naming the known names rather than falling back to the
  baseline, because a silent fallback would attribute one policy's numbers to another.

### What the developer runs, and what it prints

```
npm run sim -- --runs 200 --seed 7
```

Defaults `--runs 200 --seed 1 --policy baseline`. It rebuilds (a few seconds) and **always exits**.
It prints outcomes and win rate, fights reached and won, hands per encounter, the damage
distribution per hand to each side (mean/median/p90/max), the economy (coins earned and spent, slot
pulls, buffs held at the end), buff and AP usage per hand, and faults. Every division guards its
divisor and prints `n/a` rather than `NaN`.

### Exactly what the baseline policy does

Stated here as well as in the module docblock, because **every number the tool prints is
conditional on it**:

- **Cards** — `chooseCpuMove(round, PlayerSide.Player)`: lead the lowest legal card; when
  following, the lowest legal card that would *lose* and carries a skull, else the lowest that
  would *win*, else the lowest legal card. Fox and Woodcutter choices come from the same call.
- **Buffs** — at every between-tricks window, activates every offered buff whose refusal is `null`,
  cheapest AP first, while the pool would still cover `APPLY_DAMAGE_AP_COST`.
- **Apply Damage** — presses when the refusal is `null` and either the multiplier has reached 3 or
  it is the hand's last window with a non-empty bank.
- **Never** discards, marks a Timebomb, or arms a Cheat — none is on `SHOP_ITEMS`' shelf.
- **Shop** — free pulls first, then Heal (only below max health) then AP capacity, Swan tier, Witch
  tier while affordable, then the flask.

Swap it by implementing `SimPolicy` (four pure methods), adding it to `POLICIES`, and passing
`--policy <name>`. The driver treats every policy answer as advisory — it re-asks the engine's own
refusal predicate before every dispatch — so a careless future policy cannot crash a batch.

### OBSERVATION — what the simulator actually reported. Nothing was retuned.

`npm run sim -- --runs 20 --seed 7`:

```
Outcomes   won: 0  lost: 20  stalled: 0  win rate: 0.0%
Fights     mean fight reached: 0.60  max fight reached: 2  mean fights won: 0.60
Hands      mean hands per encounter: 4.85  max hands in one encounter: 10
Damage     to Quarry — mean 2.39, median 2, p90 6, max 13
           to player — mean 2.59, median 3, p90 4, max 6
Economy    coins earned 1.00  spent 0.75  slot pulls 0.60  buffs held at end 5.50
Buffs/AP   activations 1.08/hand  AP spent 2.76/hand  Apply Damage presses 0.42/hand
           NoEffectYet refusals: 0
Faults     none.  stalled runs: 0
```

**The player loses the per-hand exchange — 2.39 dealt against 2.59 taken.** That is not variance,
it is a deficit, and it is why the mean run ends before fight one is finished. This is consistent
with `.docs/implementation/run-winnability-simulation.md`'s pre-V5 passes (0/120 and 0/150), which
were run before buffs, Apply Damage or the AP pool existed.

**Nothing was changed on the strength of it, and nothing should be until the developer runs it.**
Two things that must be said before anyone reads it as a verdict: the figure is conditional on the
baseline policy above — a better cash-out discipline alone could move it — and it is 20 runs, not
200. The ticket ships the instrument; the readings are the developer's pass.

**Known-dead content, measured rather than assumed:** `NoEffectYet` refusals came back **0**, which
means the five unreachable consumables never even reached the offer — no template mints one, so
they cannot be distorting these figures in either direction. `Keepsake` remains dead and
`Long Fall` was never shipped; neither is separately counted, and neither is fixed here.

### Worth knowing for the closing three tickets

- **The fixtures are the other half of this ticket and the one DLR-119/120/121 will actually use.**
  `fixtureRunAfterFirstFight`, `fixtureHandWithPrimedTimebomb` and `fixtureHandWithStackedBuffs`
  are deterministic values importable from a `.test.tsx`. Browser QA has never reached any of these
  states, because coins only arrive when a fight is finished — a component assertion against a
  stacked multi-buff hand is now a two-line import rather than an impossibility.
- **`fixtureRunAfterFirstFight` needs a bounded seed search to find a first-fight win**, because of
  the win rate above. The cap is 50 and exhaustion is a named `RangeError`, not a silent fallback.
  If a later tuning change makes wins common, that search will simply stop needing its retries.
- **A fifth construction-site undercount was avoided rather than repeated.** `/fb-plan` Step 1.6
  check 7 was run properly this time: `RoundUiSeed` reported **8 annotated sites but 44 construction
  sites** on the distinctive-field grep. The plan turned that into a requirement — the simulator
  builds its seed through **one** shared helper — and both reviewers verified it held.
- **The ESLint flat-config replacement trap was handled in one step, on purpose.** `src/sim/**` was
  added to the pure-core block's `files` *and* to the later block's `ignores` in the same edit; the
  defender independently proved the DOM ban fires with a scratch file rather than trusting the
  comment. Applying only the first half would have left lint exiting 0 with no ban — the DLR-106
  regression.
- **One planning defect, found by the phase-1 implementer and corrected in `tasks.md`:** a
  verification step expected "exactly two hits" from a grep that also matches the explanatory
  comments the same task tells you to write. The real count is four. Fixed in the contract rather
  than worked around in the check.

### Developer's own list

Whether `baselinePolicy` is the player they want measured; `BASELINE_CASH_AT_MULTIPLIER` (3);
and — separately from this ticket — **what the 0% win rate means**, which is the balance pass this
instrument was built for and which has not been run.
