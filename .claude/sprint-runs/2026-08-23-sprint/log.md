# Sprint run — 2026-08-23

**Started:** 2026-08-23
**Target branch:** `Version-5` (no upstream yet — first push uses `-u origin Version-5`)
**Base commit:** `3aa577b`
**Sprint query:** `project = DLR AND sprint in openSprints() AND status = "To Do" ORDER BY Rank ASC` → 24 issues
**Gates overridden for this run:** plan approval (auto-take the plan's stated default), mockup approval (skipped unseen)

**Progress:** 4/22 (18%) — done: 4 shipped, 0 blocked (+1 out-of-band shipped) | now: DLR-124 "Design: cost the passive buff-stacking resolution rule" (5/22) — fb-plan starting

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
