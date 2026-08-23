# Sprint run — 2026-08-23

**Started:** 2026-08-23
**Target branch:** `Version-5` (no upstream yet — first push uses `-u origin Version-5`)
**Base commit:** `3aa577b`
**Sprint query:** `project = DLR AND sprint in openSprints() AND status = "To Do" ORDER BY Rank ASC` → 24 issues
**Gates overridden for this run:** plan approval (auto-take the plan's stated default), mockup approval (skipped unseen)

**Progress:** 1/22 (5%) — done: 1 shipped, 0 blocked | now: DLR-106 "Cross-run persistent storage layer" (2/22) — fb-plan starting

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
