# DLR-175 epic breakdown — ticket-creation worklist

**This file is a ticket-creation worklist for `/jira-epic-decomposition`, not an `/fb-plan`
implementation contract.** It carries no `^Status:` line and is never walked by `/fb-apply`. Its
job is to become 23 real Jira tickets under `DLR-175`, then be superseded by those tickets.

Parent epic: **DLR-175** — "The Long Wake — Unity vertical slice: deal, play tricks, bank or spend,
until one side dies"

**Created in Jira 2026-09-05** as DLR-176 through DLR-198, all in sprint *Unity Version 1* (id 168),
all parented to DLR-175, with 34 `Blocks` links wired to the sequencing diagram below. Each ticket's
heading carries its real key. The epic's own Scope was corrected in the same pass to bring art in
scope and to put rank abilities and audio out of it.

**Revised 2026-09-05** after the developer supplied a first-person table mockup. The revision added
an art track (T4, T13, T14, T15), a keyboard-control ticket (T17), and an art-integration pass
(T21), and reshaped the table ticket (T16) from a flat card-game screen into the first-person
composition the mockup shows. The epic's own Scope section needs the matching correction: it
currently puts art out of scope, which is no longer true.

Source material read before decomposing:

- `.docs/design/mockups/the-table-first-person-2026-09-05.png` — the developer's mockup of the table
  screen. **Read it as intent, not as a specification** — see "What the mockup does and does not
  settle" below.
- `.docs/design/trick-outcomes-and-the-lead.md` — the four outcome names and the lead-follows-outcome
  fix. Settled 2026-09-05.
- `.docs/design/tech-duinn-lore.md` — the game's name, the Shade, the Wake, the Omen, the three
  suits and the six named ranks.
- `prototype/.docs/game_rules/the-hunt.md` — the retained prototype's ruleset, read as the oracle
  for procedure and for the numbers this slice needs. Its vocabulary is the old one throughout and
  none of it is carried into the Unity build.
- `.claude/workflow/unity-project.md` — the seven-assembly layout, the `dotnet test` fast gate, the
  correctness traps, and the developer-owned work list.
- `.claude/rules/` — scanned. Only `save-data-versioning.md` exists and it does not apply: this
  epic persists nothing (the Cairn and all save data are out of the epic's scope). If a ticket
  below grows a persisted value, that rule binds it.

---

## What the mockup does and does not settle

The developer has said the mockup is incomplete and does not match the game. Both halves matter, so
both are recorded here once and cited by every ticket that touches the screen.

**What it settles — treat as the direction:**

- **A first-person seat at the table.** You look across the table from your own chair. Your own hands
  and forearms hold a fan of cards in the foreground, bottom of frame; the Shade sits opposite,
  holding a face-down fan.
- **The room is rendered and it is a wake.** Firelight, a hearth, a lantern, a shelf of bottles,
  mugs, a candle on the table. Warm and dim, with the light falling from the fire and the candle.
  This is exactly the image `tech-duinn-lore.md` §1 describes and it needs no invention.
- **Pixel art**, at a low base resolution, with detailed dithered shading.
- **A cloth mat on the table** as the play surface, with the draw pile squarely on it.
- **Corner HUD blocks in a bordered plate style** — the opponent's block top-left, the player's
  block bottom-right, a keyboard legend bottom-left. The centre of the screen is table.
- **Keyboard-first controls**, listed on screen as key-plus-verb rows.

**What it does not settle, and must not be transcribed:**

- **The cards are a standard 52-card deck** — 10, J, Q, K, A in hearts, clubs, diamonds and spades.
  This game's deck is 33 cards: ranks 1–11 in the Raven, the Salmon and the Hound.
- **"Pass" is not an action in this game.** You always play a card, and you must follow the led suit
  if you hold one.
- **Health reads 100.** It is 10 a side, and it is drawn as hearts, not as a number, per the lore
  document's note that hearts stay because they do plain mechanical work.
- **Nothing skull-related is on screen** — no skulled card face, and no per-suit readout of what the
  Shade holds and how much of it is marked.
- **The Omen is not on screen**, and it is the card that rules the hand.
- **The total, the roll and the pot are not on screen**, and the bet is the game's central decision.
- **The opponent's block says "Opponent"** — the word is **the Shade**.
- **The character shown is a living, blood-spattered man.** Everyone at this table is dead and none
  of them is being tormented; Tech Duinn is a gathering place, not a hell. The Shade's design is its
  own question (T14).

Every UI and art ticket below cites the mockup for composition and this section for what to ignore.

---

## Decisions taken while decomposing, so nothing stalls

Each is stated in the owning ticket's Dependencies & Risks as a reversible default, not a settled
rule.

1. **The six named ranks ship as names and faces, not as abilities.** Banshee, Shapeshifter,
   Blacksmith, Graverobber, War Goddess and Champion appear on the cards with their leading words
   and carry **no rule** in this slice. Two reasons: the epic's scope is the trick loop, and the
   Banshee's own rule — handing the lead to the losing side — is a direct override of the lead fix
   this epic exists to build, which the design doc explicitly declines to carry forward by default.
   Rank abilities are a follow-up epic.
2. **Who deals first takes the prototype's placeholder**: the player deals the first hand, the deal
   alternates every hand, and the non-dealer leads the first trick. The design doc names this as
   undecided; the ticket records it `[provisional]` rather than blocking on it.
3. **High and low keep no mechanical job.** With no buff layer in this slice, nothing reads the
   axis. Both are still computed and shown, so the four outcome names stay meaningful and the
   question stays answerable later.
4. **Every tuning number is a named constant, not a literal.** Starting health 10 and 10, 1 damage
   per Loss, 1 base damage per banked trick, 33 cards, 6 dealt a side, ~30% skull density, the
   per-rank skull weight curve. All transcribed from the prototype as starting points and all the
   developer's to move by feel.
5. **The hand refill to four cards is NOT carried in.** The prototype tops the player's hand back
   up to four each trick and calls it a first guess. This slice deals six, plays six, both sides —
   the base shape — so the loop can be judged before a dial nobody has settled is bolted onto it.
6. **The scene ships on placeholder art and the art track runs beside it.** T16 does not wait for a
   single sprite. This keeps the loop playable early, which is the point of the epic, and it keeps
   the art tickets free to take as long as they take.

## Checklist categories and how each is discharged

- **Foundational scaffold** — T1, T2, and T4 for the art track.
- **Core domain/rules** — T5 through T10.
- **Autonomous/reactive behaviour** — T11, the Shade's card choice. Stated as a heuristic, not a
  search, so scope cannot creep toward a strong opponent.
- **User-facing interface** — T16 through T20.
- **Visual/experience polish** — T13, T14, T15 produce the art; T21 puts it in; T22 is the pass over
  the whole screen once it is all there.
- **Integration** — **discharged by T16**, not by a separate late ticket. T16 is where the engine
  assemblies, the view models and the scene first meet, and it is the epic's first playable moment;
  putting integration after T17–T20 would mean building four surfaces against a loop nobody had run.
  T16's acceptance criteria carry the integration checks — composition root, hand-to-hand
  transitions, a clean console — rather than duplicating the scene work.
- **Deploy/release** — T3, the batch-mode test and build runners. Scheduled early per the checklist:
  a Unity batch-mode build failing for the first time under pressure is expensive, and it is cheap
  to catch against a project with almost nothing in it.
- **Verification & sign-off** — T23.

**Documentation is not a ticket.** `.docs/game_rules/the-hunt.md` and `.docs/implementation/` are
owned by the `implementation-doc-writer` skill and updated by every `/fb-apply` run that changes a
rule. The root `the-hunt.md` does not exist yet and will be created by T5's apply run. Never
hand-edit either.

---

## Sequencing diagram

```
Foundational scaffold
  T1 (Assemblies, seeded PRNG, fast gate) ──┬──► T3, T5
  T2 (Git, serialization, LFS) ─────────────┼──────────────────────► T16

Deploy/release (early, in parallel)
  T3 (Batch-mode test + build runners) ◄── T1 ───────────────────────► T23

Art direction and production (parallel with the whole rules track)
  T4 (Art direction: resolution, palette, card dimensions) ──┬──► T13 (Card art)
                                                              ├──► T14 (The Shade)
                                                              └──► T15 (The seat and the room)
                                                                        └──┬──► T21

Core domain / rules
  T5 (Cards, deck, deal, Omen) ◄── T1
      ├──► T6 (The trick: follow suit and the contest)
      └──► T7 (Skulls: marking and what makes a trick skulled)
  T8 (The four outcomes, and the lead) ◄── T6, T7
  T9 (Total, roll, pot: bank, hurt, apply-or-roll) ◄── T8
  T10 (Health, the hand loop, the end of a Wake) ◄── T9

Autonomous behaviour
  T11 (The Shade's card choice) ◄── T6, T7

Presentation (engine-free view models)
  T12 (Table view models) ◄── T9, T10, T11

User-facing interface  (T16 is also the integration ticket)
  T16 (The first-person table — first end-to-end Wake, placeholder art) ◄── T2, T10, T11, T12
      ├──► T17 (Keyboard-first controls and the on-screen legend)
      ├──► T18 (Apply-or-roll prompt + four-outcome readout)
      ├──► T19 (The Shade's intent panel)
      ├──► T20 (The end of the Wake — win, loss, play again)
      └──► T21 (Art integration) ◄── T13, T14, T15

Visual polish
  T22 (Visual and readability pass) ◄── T17, T18, T19, T20, T21

Verification & sign-off
  T23 (Sign-off against the epic's Definition of Done) ◄── T3, T22
```

---

## T1 = DLR-176 — Unity assembly scaffold, the seeded PRNG, and the first fast gate

**Type:** Task · **Priority:** Highest · **Parent:** DLR-175 · **Labels:** `infra`
**Skill:** `unity-programmer`
**Blocked by:** none · **Blocks:** T3, T5

```
## Problem Statement

`unity/` is a Unity 6 project with a sample scene and no game code, no assembly definitions, and no
gate that has ever been run. Every rules ticket after this one needs somewhere to put a rule that a
test can reach without opening the editor, and needs a random source it is allowed to use. Without
this ticket each of them invents its own incompatible shape.

`.claude/workflow/unity-project.md` also states plainly that no Unity project exists on disk, which
stopped being true when the project was created. That file is the single owner of the Unity layout
and commands, so correcting it belongs here, in the ticket that first makes its contents real.

## User Story

As the developer, I want the Unity project's assemblies and its fast gate to exist and actually run,
so that every rule built after this can be written and tested in seconds without entering Play mode.

## Acceptance Criteria

1. Three assembly definitions exist under `unity/`: `TechDuinn.Table` (engine-free — cards, tricks,
   outcomes, the pot), `TechDuinn.Presentation` (engine-free — view models), and `TechDuinn.Game`
   (references UnityEngine — MonoBehaviours and scene wiring). The four assemblies this epic does not
   need — `Passage`, `Data`, `Persistence`, `Simulation` — are not created; they belong to the epics
   that need them.
2. `TechDuinn.Table` and `TechDuinn.Presentation` reference no UnityEngine assembly, and each carries
   a plain `.csproj` alongside its `.asmdef` pointed at the same source folder, per
   `.claude/workflow/unity-project.md`.
3. Nullable reference types are enabled for the two engine-free assemblies and disabled for
   `TechDuinn.Game`.
4. `TechDuinn.Presentation` may reference `TechDuinn.Table`; the reverse is impossible, and a test or
   a build failure demonstrates that it is.
5. A seeded pseudo-random number generator lives in `TechDuinn.Table`, uses neither
   `UnityEngine.Random` nor `System.Random`, and produces the identical sequence from the identical
   seed across separate processes — proved by a test, not asserted.
6. `dotnet test` runs over the engine-free assemblies from a documented command and passes, with at
   least the PRNG's tests in it. The exact command and its real output are recorded on the ticket.
7. `.claude/workflow/unity-project.md` is corrected against the project that actually exists: the
   "no Unity project exists on disk" framing is gone, the assemblies it lists match what was created
   plus a note on which are deferred, and the fast-gate command is the one that was really run.

## Scope Boundaries

**In scope:** assembly definitions and their `.csproj` siblings; the seeded PRNG and its tests; the
first real run of the fast gate; correcting `.claude/workflow/unity-project.md`.

**Out of scope:** any game rule, any card, any scene content, any Unity package addition, the four
deferred assemblies.

## Dependencies & Risks

- **Adding a Unity package is developer-owned** and this ticket should need none. If one turns out to
  be required, stop and ask rather than adding it.
- The `.asmdef` + `.csproj` dual setup is the only thing making the fast gate possible. If it cannot
  be made to work, say so plainly rather than falling back to editor-mode tests and reporting a pass.
- Nothing about the seeded PRNG's algorithm is prescribed beyond determinism and the two banned
  sources. Porting the prototype's own generator is the obvious route and keeps a later seed-for-seed
  comparison open.

## Design Assets

N/A
```

---

## T2 = DLR-177 — Git, Unity serialization, and LFS before the first binary asset lands

**Type:** Task · **Priority:** Highest · **Parent:** DLR-175 · **Labels:** `infra`
**Skill:** none — repository configuration, and one developer decision
**Blocked by:** none · **Blocks:** T16

```
## Problem Statement

`unity/` currently holds only text assets, which is the last moment this is cheap. This epic now
carries a full art track — card faces, a character sprite, a room background — so binary assets are
coming, and a Unity project that acquires them before its git configuration is right needs a history
rewrite to fix it. `.claude/workflow/unity-project.md` names this as developer-owned work precisely
because retrofitting LFS after sprites are in history is a repository rewrite, not a commit.

Its priority was raised from High to Highest when the art track was added: three tickets now produce
binaries and every one of them is blocked on this being right.

## User Story

As the developer, I want the repository configured for a Unity project before any art or prefab is
committed, so that the first sprite does not force a history rewrite later.

## Acceptance Criteria

1. Unity's asset serialization is set to Force Text, and the setting is committed.
2. `.meta` files are committed rather than ignored, and a Unity-appropriate `.gitignore` covers
   `Library/`, `Temp/`, `Logs/`, `Obj/` and `UserSettings/` — verified by `git status` being clean
   after an editor launch.
3. Whether to use Git LFS, and for which extensions, is put to the developer as an explicit question
   with the trade-off stated; their answer is implemented and recorded on the ticket. If the answer
   is "not yet", that is recorded too, along with what it will cost to add later.
4. A `.gitattributes` exists covering line endings for Unity text assets, and the LFS patterns if the
   developer chose LFS.
5. `git status` in `unity/` after opening and closing the editor shows no unexpected tracked churn.

## Scope Boundaries

**In scope:** serialization mode, `.gitignore`, `.gitattributes`, the LFS decision and its
implementation, and verifying the working tree stays clean across an editor launch.

**Out of scope:** any code, any asset, any CI configuration, rewriting existing history.

## Dependencies & Risks

- **The LFS choice is a developer decision, not this ticket's.** It commits the repository to a
  storage arrangement that is awkward to reverse, and it is named as developer-owned in
  `.claude/workflow/unity-project.md`. Flag the ticket and wait rather than picking.
- **T13, T14 and T15 all produce binary art and all of them land after this.** If this ticket
  stalls on the LFS question, say so on the art tickets rather than committing sprites past it.
- Git is not on PATH in PowerShell on this machine; use the Bash tool for git operations.
- Opening the editor to verify the working tree stays clean requires the developer, since an agent
  cannot judge whether an editor-generated change is expected.

## Design Assets

N/A
```

---

## T3 = DLR-178 — Batch-mode test and build runners, proven against the empty project

**Type:** Task · **Priority:** High · **Parent:** DLR-175 · **Labels:** `infra`
**Skill:** `unity-programmer`
**Blocked by:** T1 · **Blocks:** T23

```
## Problem Statement

Two of this project's three gates have never been run: Unity's batch-mode test runner and its
batch-mode build. The epic's Definition of Done requires their real output, and the first time a
batch-mode build fails is not the moment to be debugging licence activation, missing platform
modules and log paths — that debugging is cheap now, against a project with almost nothing in it,
and expensive later against a full scene with art in it.

## User Story

As the developer, I want the Unity batch-mode test and build commands to be known-working and
documented before there is a game in the project, so that a failure later is a failure of my code
rather than of the toolchain.

## Acceptance Criteria

1. A documented command runs Unity's editor-mode tests in batch mode, with `-batchmode -nographics
   -quit` and an explicit log path, and its real output is recorded on the ticket.
2. A documented command produces a player build for the developer's chosen target platform in batch
   mode, and the resulting build launches. The real output is recorded.
3. Both commands are added to `.claude/workflow/unity-project.md`'s verification table in the exact
   form that was run, replacing the planned forms.
4. The editor's project lock is documented: the two Unity commands cannot run concurrently against
   the same project, and neither can run while the editor is open.
5. If a command genuinely cannot be made to work in this environment — a licence, a missing platform
   module, a machine constraint — the ticket says so explicitly and names what is needed, rather than
   reporting a pass. A blocked gate is flagged on the card, not hidden.

## Scope Boundaries

**In scope:** the two batch-mode commands, their real output, the log-path and lock constraints, and
correcting `.claude/workflow/unity-project.md`.

**Out of scope:** CI, any hosted runner, publishing a build anywhere, code signing, the `dotnet test`
fast gate (T1 owns it).

## Dependencies & Risks

- **The target platform is the developer's choice.** Default to a Windows standalone player since
  that is the development machine, and record it as a default rather than a decision.
- Batch-mode Unity needs a licence in the environment it runs in. If licence activation blocks this,
  it is a genuine pause condition — flag it and say what the developer must do.
- Running this before there is anything to build is the point. A build of an almost-empty project
  proving the pipeline works is a success, not a hollow one.

## Design Assets

N/A
```

---

## T4 = DLR-179 — Art direction: base resolution, palette, projection, and the card's dimensions

**Type:** Story · **Priority:** Highest · **Parent:** DLR-175 · **Labels:** `design`
**Skill:** `pixel-artist`, with `game-ux` for the viewport constraints
**Blocked by:** none · **Blocks:** T13, T14, T15

```
## Problem Statement

The developer's mockup commits the game to a look: first-person across a table, pixel art, a dim
warm wake room lit by fire and candle. What it does not commit to is any of the numbers that decide
whether three separate art tickets produce work that fits together — the base resolution everything
is drawn at, the palette they share, how the perspective is faked, and how large a card is in pixels.

Three art tickets follow this one. If each picks its own answers, the card faces will not sit in the
hands, the Shade will not sit at the same table, and the whole thing will need redoing. This is also
where two decisions `.claude/workflow/unity-project.md` names as developer-owned get made: the base
resolution and the card dimensions.

## User Story

As the developer, I want the base resolution, the palette and the card's pixel dimensions decided and
written down before anyone draws anything, so that three art tickets produce work that fits together
the first time.

## Acceptance Criteria

1. A base resolution is chosen and recorded, with the reasoning: how much detail the mockup's look
   needs, and what it costs to read a card's rank and suit at that size.
2. Whether the game renders at that base resolution and scales up by whole numbers only, or renders
   at a higher resolution with pixel-art assets, is decided and recorded. This decides whether the
   screen can ever be a non-integer scale.
3. A shared palette is defined as a real, listed set of colours, including the three suits' families
   — Raven black and blue-black, Salmon silver going to red, Hound tan and bone — verified to read
   apart both at the base resolution and in greyscale.
4. The lighting model is stated: warm firelight from the left, candle from the right, deep shadow at
   the edges, per the mockup. Every asset is lit to it.
5. How the false perspective works is stated — the table's vanishing, the size relationship between
   the player's fan in the foreground and the Shade's across the table — so that a sprite drawn for
   one ticket sits correctly next to one drawn for another.
6. A card's pixel dimensions are fixed, along with how much of the face the rank, the suit and the
   picture each get, and how the card looks fanned and overlapping.
7. Every one of the above is written to a document under `.docs/design/` that the three art tickets
   cite, rather than being restated in each of them.
8. One reference image is produced showing the palette, a card at its real size, and the same card
   fanned — enough for the developer to say yes or no before three tickets of work start.

## Scope Boundaries

**In scope:** base resolution, scaling model, palette, lighting model, false-perspective rules, card
dimensions and layout, and the document that owns all of them.

**Out of scope:** drawing any of the 33 cards (T13), the Shade (T14), or the room (T15); animation;
audio; any Unity import settings, which belong with the assets they configure.

## Dependencies & Risks

- **Every decision in this ticket is the developer's.** Art direction is visual judgement, and the
  base resolution and card dimensions are named developer-owned in `.claude/workflow/unity-project.md`.
  Bring options and a reference image; do not pick.
- **This is the ticket that stops three art tickets contradicting each other**, which is why it
  blocks all three and why it is Highest despite producing no game code.
- The mockup's own look is the starting point, not the answer. Its cards are a standard 52-card deck
  at a size that suits five cards; this game fans six of a 33-card deck.
- The palette must survive greyscale. The lore document names that as the real constraint on the
  suits, not the colours themselves.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` — the developer's mockup, read as
direction. `.docs/design/tech-duinn-lore.md` §1 for the room and §2 for the suits' colours and why
they must read apart in greyscale.
```

---

## T5 = DLR-180 — Cards, the three suits, the six named ranks, the deck, the deal and the Omen

**Type:** Story · **Priority:** Highest · **Parent:** DLR-175 · **Labels:** `engine`
**Skill:** `unity-programmer`
**Blocked by:** T1 · **Blocks:** T6, T7

```
## Problem Statement

Nothing in the Unity build knows what a card is. Every rule after this one — the contest, the skull,
the outcome, the pot — is a statement about cards, so the card, the deck, the deal and the Omen have
to exist first, in `TechDuinn.Table`, testable without the editor.

The naming is not cosmetic and cannot be deferred. `.docs/design/tech-duinn-lore.md` renamed every
suit and every named rank, and the prototype's vocabulary must not reach this code even as an
identifier: the suits are the Raven, the Salmon and the Hound, always singular — "the Nine of the
Hound", never "Nine of Hounds".

## User Story

As the developer, I want a deck of the game's real cards that can be shuffled from a seed and dealt,
so that two runs on the same seed produce the same hand and I can build every later rule against a
deal I can reproduce.

## Acceptance Criteria

1. A card is a suit and a rank. The suits are Raven, Salmon and Hound. Ranks run 1 to 11. The deck is
   33 cards, one of each rank in each suit, with the count expressed as a named constant.
2. Six ranks carry a name and a leading word, exposed as data on the rank rather than looked up by a
   caller: 1 Banshee (Banshee Clíodhna), 3 Shapeshifter (Shapeshifter Púca), 5 Blacksmith (Blacksmith
   Goibniu), 7 Graverobber (Graverobber Bres), 9 War Goddess (War Goddess Morrígan), 11 Champion
   (Champion Bricriu). Ranks 2, 4, 6, 8 and 10 carry no name.
3. None of the six named ranks carries a rule in this ticket. They are names and faces only.
4. Shuffling takes a seed and uses only the seeded PRNG from T1. The same seed produces the same deck
   order, proved by a test.
5. A deal produces six cards to the player and six to the Shade, from a named constant, then turns the
   thirteenth card face up as the **Omen**. The Omen's suit is the trump suit for the hand. The
   remaining twenty cards form the draw pile, face down.
6. No card is dealt twice: a test asserts the two hands, the Omen and the draw pile partition the
   33-card deck exactly.
7. No identifier, string, comment or test name in the shipped code uses Bells, Keys, Moons, Swan, Fox,
   Woodcutter, Treasure, Witch, Monarch, decree, Quarry, or a pluralised suit.
8. Integer arithmetic only; no floating point anywhere in `TechDuinn.Table`.

## Scope Boundaries

**In scope:** the card, suit and rank types; the six named ranks as data; the deck; the seeded
shuffle; the deal; the Omen; the draw pile.

**Out of scope:** any rank ability; skulls (T7); following suit or the contest (T6); the draw pile's
reshuffle when exhausted, and any per-trick refill of a hand — both sides play the six they were
dealt in this slice; anything on screen; card art (T13).

## Dependencies & Risks

- **The six named ranks carry no abilities in this epic**, by decision. The Banshee's rule in
  particular — handing the lead to the losing side — directly overrides the lead fix this epic exists
  to build, and `.docs/design/trick-outcomes-and-the-lead.md` explicitly declines to carry that
  override forward by default. Rank abilities are a follow-up epic. Reversible: the data hook for a
  rule is on the rank already.
- **The prototype's per-trick refill to four cards is deliberately not carried in.** The prototype's
  own rules doc calls the number 4 "a first guess, not a decision", and setting it to zero is exactly
  the base shape this ticket builds. Adding it later is additive.
- 33 cards, 6 dealt a side and the 13th as the Omen are transcribed from the prototype as starting
  points and are the developer's to move.
- Deal order matters for reproducibility. Fix one order and state it in the implementation doc, so a
  later change to it is visible as a change rather than as a mysterious seed drift.

## Design Assets

`.docs/design/tech-duinn-lore.md` §2 (the suits) and §3 (the six named ranks, with the leading word
each card face shows).
```

---

## T6 = DLR-181 — The trick: leading, following suit, and the contest

**Type:** Story · **Priority:** Highest · **Parent:** DLR-175 · **Labels:** `engine`
**Skill:** `unity-programmer`
**Blocked by:** T5 · **Blocks:** T8, T11

```
## Problem Statement

With cards dealt, the next question is which cards may be played and which of two played cards takes
them. This is the trick-taking core the whole game sits on, and it is entirely separable from what a
trick is worth — the contest has nothing to do with skulls, and keeping the two apart is what makes
the four outcomes expressible at all.

Following suit is also the rule the fiction frames as an oath, so getting its enforcement and its
refusal message right matters beyond correctness.

## User Story

As the developer, I want a trick where one side leads any card, the other must follow the led suit if
it can, and a stated rule decides who took the cards, so that I can play a trick and know the result
was right without watching it.

## Acceptance Criteria

1. The leader may play any card in hand; that card's suit is the lead suit.
2. The follower must play a card of the lead suit if they hold one, of any rank. If they hold none,
   any card is legal.
3. A query returns the legal cards for a side given the trick's state, and an attempt to play an
   illegal card is refused with a reason naming the suit that had to be followed — never silently
   ignored and never thrown away as an unexplained failure.
4. A card is effectively trump if its suit is the Omen's suit. The contest resolves in this order:
   if either card is effectively trump, the higher-ranked effectively-trump card takes the cards;
   otherwise if both are of the lead suit, the higher rank takes them; otherwise the lead card takes
   them.
5. The sole War Goddess rule from the prototype — a lone 9 counting as trump — is **not** implemented,
   consistent with the named ranks carrying no abilities in this epic.
6. "Took the cards" and "went high" mean the same thing and mean winning the contest including by
   trump — never the higher numeral. A test covers a low trump beating a high off-suit card.
7. There are no capture piles. Both cards go to a single shared spent pile as the trick resolves;
   neither side keeps cards.
8. Every branch of the contest is covered by a test, including the follower off-suit and both cards
   trump.
9. **There is no pass, fold or skip.** A side to play always plays a card. The mockup shows a "Pass"
   control and it is one of the things about it that does not match the game.

## Scope Boundaries

**In scope:** lead and follow legality, the refusal reason, the contest, the spent pile.

**Out of scope:** skulls and what a trick is worth (T7, T8); who leads next (T8 — it depends on the
outcome, not the contest); any rank ability; the Shade's choice of card (T11); anything on screen.

## Dependencies & Risks

- **The contest and the payout must stay separate.** The temptation is to return "who won" as one
  answer; this ticket returns only who took the cards, and T8 turns that plus the skull into an
  outcome. Collapsing them is what made the prototype's lead rule wrong.
- The Omen's suit is read at the moment the trick resolves. Nothing changes it in this slice — the
  Shapeshifter has no ability — but the code should read it from the hand state rather than caching
  it at the deal, so the Shapeshifter is additive later.

## Design Assets

N/A
```

---

## T7 = DLR-182 — Skulls: marking the Shade's hand, and what makes a trick skulled

**Type:** Story · **Priority:** Highest · **Parent:** DLR-175 · **Labels:** `engine`
**Skill:** `unity-programmer`
**Blocked by:** T5 · **Blocks:** T8, T11

```
## Problem Statement

The skull is what makes this a game rather than a trick-taking exercise: it inverts what taking a
trick is worth, which is the whole reason the four outcomes exist and the reason the lead rule needed
fixing. Before an outcome can be computed, a trick has to know whether it is skulled.

Which of the Shade's cards get skulled is a tuning question the prototype answered with a weighted
curve chosen from simulation and never actually played. That curve is transcribed here as a starting
point, not adopted as a rule.

## User Story

As the developer, I want roughly a third of the Shade's dealt cards to carry a skull, spread across
ranks by a curve I can change in one place, so that I can play the game and find out whether the
threat reads as tense or merely noisy.

## Acceptance Criteria

1. At every deal, a share of the Shade's six cards is marked with a skull. The density is a named
   constant, defaulting to roughly 30% — 2 of 6.
2. **No dealt skull is ever on a rank 1.** A skulled 1 cannot lose its trick, so it would be an
   unavoidable tax rather than a decision. Rank 1 carries zero weight in every curve, and a test
   asserts it directly rather than relying on the weight being zero.
3. Skull placement is drawn against a per-rank weight curve held as named data. The default curve is
   transcribed from the prototype: ranks 1–11 weighted 0, 2, 5, 8, 10, 10, 8, 5, 2, 1, 1.
4. Placement uses only the seeded PRNG. The same seed produces the same skulls, proved by a test.
5. Skull marks are re-rolled at every deal and never remembered from one hand to the next.
6. **A trick is skulled if any card played into it carries a skull**, whichever side played it — a
   single predicate, tested on both sides.
7. A skull travels with its card, so a card's skull is a property of the card in play rather than of
   the seat that holds it.
8. No skull is minted mid-hand in this slice — the Blacksmith mints none because it has no ability,
   and there is no Curse.

## Scope Boundaries

**In scope:** marking the Shade's dealt cards; the density and the weight curve as named, retunable
data; the never-rank-1 rule; the is-this-trick-skulled predicate.

**Out of scope:** what a skull does to the payout (T8); the player cursing their own cards; the
Blacksmith minting a skull mid-hand; the per-suit readout that shows the player what the Shade holds
(T12, T19); the skull's card face (T13).

## Dependencies & Risks

- **The density and the curve are the developer's to move by feel, and both are why this ticket names
  them rather than hard-coding them.** The prototype's own rules doc marks the curve provisional and
  says nobody has played a hand under it.
- The prototype ships three unused alternative curves for later difficulty tuning. Not carried in —
  one curve for one Shade is the honest shape for this slice, and adding curves is additive.
- Two unfair cases survive the rank curve and are known, not fixed: a skull in the Omen's suit is
  near-harmless, and a Shade holding nothing in the led suit can dump a skull at any rank. Record
  them; do not address them here.

## Design Assets

N/A
```

---

## T8 = DLR-183 — The four outcomes, and the lead following the outcome

**Type:** Story · **Priority:** Highest · **Parent:** DLR-175 · **Labels:** `engine`
**Skill:** `unity-programmer`
**Blocked by:** T6, T7 · **Blocks:** T9

```
## Problem Statement

This is the ticket the epic exists for. A trick produces two separate facts — what you did, and what
you got — and a skull pulls them apart into four outcomes. The prototype names them badly and, worse,
hands the lead to whoever physically took the cards, which means eating a skull rewards you with
position and reading one correctly costs it. `.docs/design/trick-outcomes-and-the-lead.md` settles
both: the names, and the lead following the outcome instead.

Building the prototype's lead rule first and correcting it later would be writing the wrong thing on
purpose, so the fix lands here, in the ticket that first computes an outcome at all.

## User Story

As the player, I want winning a trick to earn me the lead and losing one to cost me it, whichever way
the skull sent me, so that the lead is a consistent reward rather than something I collect by eating
a skull.

## Acceptance Criteria

1. A trick resolves into exactly one of four named outcomes from two facts — did this side take the
   cards, and was the trick skulled:
   took the cards + not skulled = **Straight Victory** (banks);
   did not take + not skulled = **Straight Loss** (hurts);
   did not take + skulled = **Skulled Victory** (banks);
   took the cards + skulled = **Skulled Loss** (hurts).
2. Those four names are the identifiers in the code, not a display-layer translation of something
   else. Nothing named HighVictory, LowVictory, HighDefeat or LowDefeat exists.
3. **A Victory takes the lead; a Loss gives it up.** The next trick is led by the side whose outcome
   was a Victory, in all four cases.
4. A test asserts the lead for each of the four outcomes by name, including the two cases where the
   lead comes apart from the cards: on a Skulled Victory the other side took the cards and this side
   still leads.
5. Whether a side went high or low — took the cards or did not — remains computed and available
   alongside the outcome. Nothing in the rules reads it in this slice; it drives a counter and a
   description.
6. The two sides' outcomes on one trick are always complementary: exactly one is a Victory. A test
   asserts this across every combination.
7. A Straight Victory and a Skulled Victory are identical in every respect but their name, and so are
   the two Losses. No rule distinguishes them in this slice.

## Scope Boundaries

**In scope:** the four outcomes as named values; deriving one from the contest result and the skull
predicate; the lead rule; the high/low fact kept alongside.

**Out of scope:** what a Victory banks and what a Loss costs (T9); health (T10); any override of the
lead rule — the Banshee's and the prototype Swan's lead-to-the-loser rule are both deliberately
absent; anything on screen (T18 shows the outcome).

## Dependencies & Risks

- **The lead now comes apart from who holds the cards**, and that is fine while the lead is only turn
  order. The design doc flags it as the thing to check against if anything later keys off who
  physically took a trick. Nothing in this slice does.
- **The high/low axis has no mechanical job left in this build.** In the prototype every buff
  condition read it; that buff design is not inherited. Keeping the fact computed costs nothing and
  keeps the question answerable when the new buff design arrives. If it turns out nothing ever wants
  it, the four outcomes collapse to two — a later decision, not this ticket's.
- Getting the lead rule backwards is silent: the game still plays, it just plays wrong. Criterion 4
  is the guard and must test by outcome name, not by who took the cards.

## Design Assets

`.docs/design/trick-outcomes-and-the-lead.md` — the full reasoning, the outcome table, and the lead
table.
```

---

## T9 = DLR-184 — The total, the roll and the pot: banking, being hurt, and apply-or-roll

**Type:** Story · **Priority:** Highest · **Parent:** DLR-175 · **Labels:** `engine`
**Skill:** `unity-programmer`
**Blocked by:** T8 · **Blocks:** T10, T12

```
## Problem Statement

An outcome that banks has to bank into something, and an outcome that hurts has to take something
away. The prototype's model is a genuine bet — you carry a running total and a roll of consecutive
banked tricks, the pot is their product, and after every banked trick you choose between cashing it
into the Shade's health now or letting it ride. A Loss takes the whole thing and pays the Shade
nothing.

That model is the reason the skull matters, and it is what the developer asked to be able to exercise:
roll over, or apply damage.

## User Story

As the player, I want every banked trick to ask me whether to cash my pot or let it ride, and every
losing trick to take the whole pot, so that each trick is a real bet rather than a score I accumulate.

## Acceptance Criteria

1. The player carries two figures: the **total**, the damage every banked trick has added since the
   last cash or hit; and the **roll**, the number of tricks banked in a row since then. The **pot** is
   `total × roll`, integer arithmetic throughout.
2. A Victory — Straight or Skulled — adds a base amount to the total, from a named constant defaulting
   to 1, and raises the roll by one. The trick itself deals no damage in either direction.
3. That base amount is the same on every banked trick whatever the cards were worth. Ranks decide who
   takes a trick and nothing else.
4. After every banked trick, play stops and the player chooses: **apply**, dealing the pot to the
   Shade's health now and resetting both figures to zero; or **roll over**, dealing nothing and
   resetting nothing. This is the only place the pot can be cashed.
5. A Loss — Straight or Skulled — does three things at once: the player takes damage from a named
   constant defaulting to 1; the total and the roll both reset to zero; and the Shade takes nothing at
   all. There is no consolation payout.
6. With nothing else in play, banking `n` tricks in a row leaves a pot of `n²`. A test asserts the
   sequence 1, 4, 9, 16, 25, 36.
7. Both figures survive the end of a hand and carry into the next. Nothing caps a roll but the player
   cashing it or a trick hurting them.
8. Both figures are queryable at any time, along with what applying right now would deal and whether
   that would end the Wake.
9. All damage lands at the trick that caused it. Nothing is queued, delayed or owed by a trick that is
   already over.

## Scope Boundaries

**In scope:** the total, the roll and the pot; banking a Victory; the cost of a Loss; the apply-or-roll
choice as a rules-level decision point; the queries a screen will need.

**Out of scope:** health bars and the end of a Wake (T10); the prompt on screen (T18); any buff, charm,
Whetstone, Graverobber bonus or multiplier — the base amount is a bare constant in this slice; coins.

## Dependencies & Risks

- **Every number here is a named, retunable constant and none of it is balanced.** The prototype's own
  rules doc says so explicitly. This is a ship-rough-and-tune-by-feel ticket: build it as specified,
  play it, then move the numbers.
- **The harshness is deliberate.** A nine-trick roll lost on the tenth trick is worth exactly as little
  as a one-trick roll lost on the second. That is what makes rolling over a real bet, and it is
  expected to feel harsh. Do not soften it.
- The apply-or-roll decision point is a rules-level pause, not a UI concern — the engine must be able
  to sit waiting for an answer, so the same model works for a simulator later.

## Design Assets

N/A
```

---

## T10 = DLR-185 — Health, the hand loop, and the end of a Wake

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `engine`
**Skill:** `unity-programmer`
**Blocked by:** T9 · **Blocks:** T12, T16

```
## Problem Statement

The pieces so far produce one trick at a time. What the developer asked for is a loop: hands dealt
one after another until somebody dies. That needs two health bars, a hand that re-deals when its six
tricks are done, and an ending that can arrive part-way through a hand — because damage lands at the
trick that caused it, a Wake does not politely wait for a hand to finish.

## User Story

As the player, I want hands to keep being dealt until either my health or the Shade's reaches zero,
so that a Wake is something I play to a conclusion rather than a single hand.

## Acceptance Criteria

1. Both the player and the Shade hold health, each from a named constant defaulting to 10. The Wake
   ends when either reaches zero.
2. A hand is six tricks. When its sixth trick resolves, another hand is dealt immediately unless the
   Wake has ended.
3. The player deals the first hand and the deal alternates every hand after; the non-dealer leads the
   first trick of a hand. Recorded as provisional — see Dependencies & Risks.
4. Damage lands at the trick that caused it, so a Wake can end part-way through a hand. A test covers
   a hand ending on its third trick.
5. The Shade's health is settled before the player's on any trick that could affect both: if applying
   a pot kills the Shade, the player survives whatever else that trick would have done to them.
6. If both bars would empty together, the player wins.
7. A Wake exposes its state at any point: whose turn it is, whose lead it is, which trick of which
   hand, both healths, the player's total, roll and pot, and whether it has ended and how.
8. A test plays a complete Wake from a fixed seed under a scripted set of choices and reaches a
   terminal state, with no manual intervention.

## Scope Boundaries

**In scope:** health for both sides; the hand loop; who deals and who leads a hand; ending mid-hand;
the both-bars-empty tie; the Wake's queryable state; a full-Wake test.

**Out of scope:** healing of any kind — nothing restores health in this slice, there is no shop, no
Goibniu's Ale and no rest; a sequence of Shades or any run structure; coins; anything on screen.

## Dependencies & Risks

- **Who deals first has never been decided.** `.docs/design/trick-outcomes-and-the-lead.md` names it
  as an open choice. This ticket takes the prototype's placeholder — player deals first, alternating,
  non-dealer leads — as a stated, reversible default and marks the rule provisional in
  `.docs/game_rules/the-hunt.md`. It is a one-line change once the developer decides.
- Both starting healths are 10 and both are provisional. The prototype's own doc marks them so. The
  mockup's 100 is one of the things about it that does not match the game.
- The mid-hand ending is the easiest thing here to get subtly wrong: a trick that kills must not also
  resolve the next trick, deal the next hand, or ask the player to apply a pot.

## Design Assets

N/A
```

---

## T11 = DLR-186 — The Shade's card choice

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `engine`
**Skill:** `unity-programmer`
**Blocked by:** T6, T7 · **Blocks:** T12, T16

```
## Problem Statement

Tricks need an opponent. The Shade has to choose a card every trick, legally, and well enough that
the tricks are worth playing — but this epic is about whether the loop feels right, not about a
strong opponent, and an ambitious opponent here would make it impossible to tell whether a bad-feeling
Wake was the rules' fault or the opponent's.

The prototype's Shade is deliberately simple and its weakness is documented: it plays skulls into
tricks it is losing, and it does not avoid leading a skull, so it can be trivially dodged. That is the
right ambition level to port.

## User Story

As the player, I want the Shade to play legally and to use its skulls against me, so that reading its
threat is worth something without the opponent being the thing I am testing.

## Acceptance Criteria

1. The Shade plays exactly one legal card per trick, bound by every rule the player is bound by,
   including following suit. It has no power the player lacks.
2. **When following, the Shade prefers to play a skulled card into a trick it is losing**, so that the
   player takes the cards and eats the skull. Among its skulled losing cards it plays the lowest.
3. Failing that, it plays the lowest card that would take the trick; failing that, the lowest legal
   card it holds.
4. **When leading, it plays its lowest card and does not avoid leading a skull.** This is the
   deliberate minimum, and it means the Shade will sometimes lead a skull and be trivially dodged.
5. The choice is a pure function of the visible state and the Shade's hand — deterministic, with no
   randomness and no lookahead beyond the current trick. A test asserts the same state produces the
   same card.
6. The Shade holds and plays the six cards it was dealt, with no refill.
7. Its identity is a name only. Nothing mechanical hangs off which Shade it is, and there is exactly
   one Shade in this slice.
8. Every branch of the choice is covered by a test, including holding no card of the led suit.

## Scope Boundaries

**In scope:** the legal-move filter, the follow heuristic, the lead heuristic, determinism, the
Shade's name as data.

**Out of scope:** any search, lookahead, evaluation function or difficulty setting; a ladder of
Shades; skull-aware leading; any Shade power or rule-break; the panel that shows the player what the
Shade holds (T12, T19); the Shade's sprite and how it reacts (T14).

## Dependencies & Risks

- **The ambition level is stated so it cannot creep.** A one-trick heuristic is the target. If the
  Wake plays flat, the fix is a later ticket with its own scope, not a stronger opponent smuggled in
  here.
- Not avoiding a skull on lead is a known weakness, recorded in the prototype's own rules doc as the
  obvious next improvement. It is deliberately not fixed here.
- Determinism matters more than strength: a non-deterministic opponent makes a seed unreproducible
  and makes the rest of this epic harder to debug.

## Design Assets

N/A
```

---

## T12 = DLR-187 — Table view models: turning Wake state into what a screen shows

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `engine`
**Skill:** `unity-programmer`
**Blocked by:** T9, T10, T11 · **Blocks:** T16

```
## Problem Statement

`.claude/workflow/unity-project.md` draws a hard line: every "which cards light up", "what does this
trick pay", "why is this card refused" question is answered by a pure function with a unit test, and
the MonoBehaviour only positions things. Without this ticket, five UI tickets each grow their own
copy of that logic inside a MonoBehaviour where no test can reach it.

This ticket's diff lands entirely in the engine-free `TechDuinn.Presentation` assembly and shows
nothing on screen, which is why it is labelled `engine` despite being about what the player sees.

## User Story

As the developer, I want every question a screen asks about the Wake answered by a tested pure
function, so that the scene work is positioning and nothing else and a display bug is a test I can
write.

## Acceptance Criteria

1. A view model for the player's hand: each card with its suit, rank, leading word if it has one,
   whether it is legal right now, and if not, the reason naming the suit that must be followed.
2. A view model for the trick in progress: what has been led, what has been followed, which cards
   carry a skull, and the Omen with its suit named as the trump suit.
3. A view model for the outcome of the trick that just resolved: which of the four outcomes it was,
   named in the game's own words, **and why** — that a skull was in the trick, and whether this side
   took the cards or did not.
4. A view model for the apply-or-roll decision: the total, the roll, the pot, what applying deals
   right now, what the pot becomes if the next trick banks as well — stated as a floor — that rolling
   over and then losing pays nothing, and whether applying now would end the Wake.
5. A view model for what the Shade holds: per suit, how many cards it holds and how many of those
   carry a skull. **Never a rank, and never which card.**
6. A view model for the Shade's intent: the suit it is about to lead with, present only while its lead
   is uncommitted, absent entirely when the player is the one leading.
7. A view model for the two corner HUD blocks: each side's health against its maximum, how many cards
   that side is holding, the trick and hand number, and each side's tricks-taken count.
8. Every one of these is a pure function in `TechDuinn.Presentation`, references no UnityEngine, and
   has unit tests. Wording is exposed as data the UI renders, not as strings baked into a
   MonoBehaviour.

## Scope Boundaries

**In scope:** the seven view models above, their tests, and the vocabulary they carry.

**Out of scope:** every MonoBehaviour, prefab, sprite, layout and animation (T16–T21); localisation;
the final wording, which is the developer's and is expected to change.

## Dependencies & Risks

- **The Shade's shape readout must never leak a rank.** Counting suits is bookkeeping and reading
  ranks is judgement — the readout removes the first and keeps the second, and a leak destroys the
  design. A test should assert the view model carries no rank.
- **The intent view model shows the suit and nothing else** — never the rank, never which card, never
  a stance, and never when the player leads, because a follow does not exist until the player has
  chosen. Telegraphing after the player commits is a caption on a decision already made.
- Wording is provisional throughout. Structure it so a wording change is a data change.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` — the two corner HUD blocks are what
criterion 7 feeds. Note that the mockup's blocks say "Opponent" and show 100 health; both are wrong.
```

---

## T13 = DLR-188 — Card art: the 33 faces, the back, and the skull face

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `ui`
**Skill:** `pixel-artist`
**Blocked by:** T4 · **Blocks:** T21

```
## Problem Statement

The card is the thing the player looks at most, and there are 33 of them plus a back. Six of them
carry a named figure from Irish myth whose face has to teach what the card is — Banshee,
Shapeshifter, Blacksmith, Graverobber, War Goddess, Champion — and the lore document is specific that
the face shows only the leading word, with the full name kept for a hover and a codex.

The skull is a separate face and the prototype learned how it has to work: a skull as a small corner
glyph was missed, and replacing the whole picture with a skull while leaving the rank and suit
readable in the corner is what made it land. The trick is still decided on rank and suit, so those
can never be hidden.

## User Story

As the player, I want to read a card's suit, rank and whether it is skulled at a glance while it sits
fanned in my hand, so that choosing what to play is a judgement rather than a squint.

## Acceptance Criteria

1. All 33 faces exist: ranks 1–11 in the Raven, the Salmon and the Hound, at the dimensions T4 fixed.
2. Suit and rank are readable at the base resolution **while the card is fanned and partly
   overlapped** — which is how a card is seen most of the time. Test the fan, not the single card.
3. The three suits read apart in greyscale as well as in colour.
4. The six named ranks carry a figure and their leading word on the face: **Banshee** (1),
   **Shapeshifter** (3), **Blacksmith** (5), **Graverobber** (7), **War Goddess** (9), **Champion**
   (11). Only the leading word appears — never the full mythological name.
5. Ranks 2, 4, 6, 8 and 10 are plain number cards with no figure and no name. Rank 8 in particular is
   drawn exactly as its neighbours are: giving it a marked face would tell the player it was special.
6. A skulled card's face is **the skull replacing the picture**, identically on every rank and suit,
   with the rank and the suit still readable in the corner.
7. A card back exists, and the Shade's fan and the draw pile use it.
8. Every asset is lit to the model T4 set, imported with point filtering and no compression, and
   organised so a face can be found by suit and rank without opening it.

## Scope Boundaries

**In scope:** 33 faces, the six named figures, the card back, the skull face, and the import settings.

**Out of scope:** the art direction those are drawn to (T4); putting them in the scene (T21);
animation; card frames for states like selected or illegal, which are the scene's job (T16, T22);
the codex and the hover text, both out of the epic's scope.

## Dependencies & Risks

- **The mockup's cards are a standard 52-card deck** — 10, J, Q, K, A in hearts, clubs, diamonds and
  spades — and are not what this game uses. Read the mockup for how a card looks and sits in a fan;
  read `tech-duinn-lore.md` for what is on it.
- **The fanned, overlapped card is the real constraint** and the easiest thing to get wrong by
  designing a beautiful single card. Whatever is in the corner is often all the player sees.
- Six figure cards at a low resolution is the bulk of the work here. If the six need to be split off
  into their own ticket once the 27 plain cards are done, that is a reasonable split — say so rather
  than rushing them.
- Whether the art reads is the developer's judgement. Get the first suit in front of them before
  drawing the other two.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` for how cards sit in a fan.
`.docs/design/tech-duinn-lore.md` §2 for the suits and their colours, §3 for the six figures, their
myths and their leading words. T4's art-direction document for dimensions, palette and lighting.
```

---

## T14 = DLR-189 — The Shade: a seated figure that holds a hand and reacts

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `ui`
**Skill:** `pixel-artist`, with `game-designer` for what the Shade is
**Blocked by:** T4 · **Blocks:** T21

```
## Problem Statement

The mockup puts a character across the table, and it is the single strongest thing in it — the game's
whole image is you and a stranger, by firelight, with the dead in the room. But the figure shown is a
living, grinning, blood-spattered man, and this game's opponent is a Shade: a soul that has arrived at
Tech Duinn and not yet gone onward. The lore document is explicit that nobody here is being tormented
and that this is a gathering place, not a hell.

So what a Shade actually looks like is an open design question this ticket has to answer before it can
draw one, and the answer sets the tone for the whole game.

## User Story

As the player, I want someone recognisably dead sitting opposite me, holding their cards and reacting
to how the hand is going, so that the table feels occupied rather than like a card game with a
portrait attached.

## Acceptance Criteria

1. What a Shade is, visually, is decided with the developer and written down before drawing begins:
   how dead it reads, how human, and where it sits between mournful and threatening. One page under
   `.docs/design/`, not a paragraph in a ticket.
2. A seated Shade sprite exists at the scale T4's perspective rules set, framed as the mockup frames
   it — head and torso above the table, arms forward, holding a fan of face-down cards.
3. The fan it holds shrinks as it plays, so a Shade down to two cards visibly holds two.
4. It plays a card visibly: a state or a short animation that reads as this figure putting that card
   on the table, so the player is not just seeing a card appear.
5. Reaction states exist for the moments that matter: the hand being dealt, it taking a trick, the
   player taking one, it taking damage, and it dying. Each reads without a caption.
6. It is lit to T4's model — firelight from the left, candle from the right — and sits correctly
   against the room T15 draws.
7. It has a name shown in its HUD block, and the sprite is not tied to that name: this slice has one
   Shade, and adding more later must not mean redrawing the scene.

## Scope Boundaries

**In scope:** the design decision about what a Shade is, the seated sprite, its fan, its play action,
its reaction states, and its lighting.

**Out of scope:** more than one Shade; any boss; the room behind it (T15); the Shade's card-choice
logic (T11); voice or audio; the intent panel, which is UI rather than character (T19).

## Dependencies & Risks

- **What a Shade looks like is a genuine design decision and the developer's**, not something to
  settle by drawing one and hoping. It sets the tone of the whole game. Bring options.
- **The mockup's character is a living man and the wrong note.** Read the mockup for framing, scale
  and lighting; read `tech-duinn-lore.md` §1 and §4 for who is actually sitting there.
- Reaction states are where this ticket can balloon. Five states that read is the target; a full
  animation set is not.
- A grinning, blood-spattered figure reads as a threat, and this game's opponent is a fellow traveller
  waiting for passage. Getting that wrong makes every other piece of writing in the game sound off.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` for framing, scale and lighting.
`.docs/design/tech-duinn-lore.md` §1 (Tech Duinn, the wake, and that this is not a punishment) and §4
(what a Shade is).
```

---

## T15 = DLR-190 — The seat and the room: the player's hands, the table, and the wake room behind it

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `ui`
**Skill:** `pixel-artist`
**Blocked by:** T4 · **Blocks:** T21

```
## Problem Statement

The mockup's room is doing most of the work: the fire, the lantern, the shelf of bottles, the mug and
the candle on the table, the deep shadow at the edges. It is what makes the screen a place rather
than a background. And the player's own hands holding the fan in the foreground are what put the
player in the chair rather than above the table.

`tech-duinn-lore.md` §1 says this scene needs no invention — an Irish wake is a night spent with a
body, drinking and telling stories and playing games, and that is exactly what is being drawn.

## User Story

As the player, I want to be sitting in a chair in a warm dim room holding my own cards, so that the
game feels like a night at a table rather than a card interface.

## Acceptance Criteria

1. A room background exists at the base resolution T4 set: a hearth with a live fire, a lantern or
   candle giving a second light source, and enough furnishing that the room reads as somewhere people
   gather. Warm and dim, with deep shadow at the frame's edges.
2. The fire and any flame animate, at a rate that reads as alive without pulling the eye off the
   table.
3. A table surface in false perspective, with a cloth mat as the play surface and a defined place for
   the draw pile, the Omen, and the two cards of the trick in progress.
4. The player's own hands and forearms exist in the foreground, holding a fan of cards from below, at
   the framing the mockup shows.
5. That fan reads correctly at every hand size from six cards down to one.
6. A place is left for the three HUD blocks — the Shade's, the player's, and the control legend — in
   the corners the mockup puts them in, and nothing important in the room sits behind them.
7. Diegetic props on the table are drawn so that adding or moving one is not a redraw of the
   background.
8. Everything is lit to T4's model and sits correctly with the Shade sprite T14 draws.

## Scope Boundaries

**In scope:** the room background, its lighting and its animated flame, the table and mat in
perspective, the player's hands and their fan, prop placement, and the space left for the HUD.

**Out of scope:** the Shade (T14); the cards themselves (T13); the HUD blocks' own art, which is UI
chrome (T16, T22); audio; any second location.

## Dependencies & Risks

- **Blood is in the mockup and is a tone question for the developer.** The mockup's table and
  character are spattered; a gathering place for the dead is not necessarily a violent one. Ask
  before drawing it in.
- The player's hands are the hardest thing to get right and the most visible. They are on screen for
  the entire game, at the largest scale of anything in it.
- The fan at one card and the fan at six are different shapes. Design the fan rule, not six drawings.
- Keeping props separable from the background is what lets the room change later without a redraw.
  Costs a little now, saves a lot.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` — the room, the framing and the lighting
are the parts of the mockup to follow most closely. `.docs/design/tech-duinn-lore.md` §1 for what a
wake is and why the room looks like this.
```

---

## T16 = DLR-191 — The first-person table: a Wake from the deal to a death

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `ui`, `playable`
**Skill:** `unity-programmer`, with `game-ux` for the layout
**Blocked by:** T2, T10, T11, T12 · **Blocks:** T17, T18, T19, T20, T21

```
## Problem Statement

Everything up to here is testable and invisible. This is the ticket where it becomes a game the
developer can sit down and play, and it is also this epic's integration point: the engine assemblies,
the view models and the scene meet for the first time, which is where independently-built pieces
reveal interface mismatches.

The mockup sets the composition — first person across the table, your fan in the foreground, the
Shade opposite, the mat and draw pile between you, HUD in the corners — and this ticket builds that
composition with placeholder art. It does not wait for a single sprite; the art track lands in T21.

## User Story

As the developer, I want to sit down at the table in Play mode and play a complete Wake against the
Shade, so that I can judge how the trick loop actually feels rather than reading about it.

## Acceptance Criteria

1. A scene with a composition root that builds a Wake from a seed and wires it to the view. No rules
   logic lives in a MonoBehaviour.
2. The camera sits at the player's seat looking across the table, per the mockup: the player's fan
   along the bottom of frame, the Shade's face-down fan opposite, the mat and the draw pile between.
3. The player's hand is a fan of cards showing suit, rank, and leading word where the rank has one.
   Cards that cannot legally be played are visibly distinct from those that can.
4. Selecting and playing a card works with the mouse. Keyboard control is T17 and is not required
   here.
5. Playing an illegal card is refused with the reason on screen, naming the suit that must be
   followed. There is **no pass control** — the mockup's is one of the things about it that does not
   match the game.
6. The trick in progress is visible on the mat: what was led, what was followed, and the Omen with its
   suit named as the trump suit. A card carrying a skull is unmistakable at a glance, even in
   placeholder art.
7. The Shade plays its card visibly, with enough of a beat that the player sees what it did.
8. Three HUD blocks sit in the corners the mockup uses: the Shade's block top-left carrying its name,
   its health as hearts and how many cards it holds; the player's block bottom-right carrying the
   same; and a space bottom-left reserved for the control legend T17 fills. **The Shade's block says
   the Shade's name, never "Opponent".**
9. The player's total, roll and pot are on screen throughout.
10. A trick resolves, the lead moves to whichever side had a Victory, and the next trick begins. When
    six tricks are done, another hand is dealt and play continues.
11. Applying or rolling over is answerable from the table — a plain control is enough here; T18 makes
    it a proper prompt.
12. A complete Wake can be played to a death without touching the console, entering the inspector, or
    restarting.
13. The console is clean through a full Wake: no errors, and no warnings from this project's own code.
14. The screen fits the viewport at the resolution T4 chose and never scrolls or crops. See the
    `game-ux` skill.

## Scope Boundaries

**In scope:** the scene, the camera and composition, the composition root, the fan and its layout,
click-to-play, the mat and the trick, the Omen, the draw pile, the three HUD blocks, the pot readouts,
hand-to-hand transition, and the integration checks.

**Out of scope:** keyboard control and the legend's contents (T17); the full apply-or-roll prompt
(T18); the Shade's intent panel (T19); the win and loss screen (T20) — reaching zero may simply stop
play here; real art of any kind (T21); the polish pass (T22); audio.

## Dependencies & Risks

- **Placeholder art throughout, deliberately.** Coloured rectangles with legible text beat waiting for
  the art track. The point of this ticket is the loop being playable early.
- **Judging how this looks and feels is the developer's, always.** Build the composition, get it in
  front of them, take the notes. Do not pre-emptively design; do not defend a layout against their
  reaction.
- **This is the integration ticket.** Interface mismatches between the engine assemblies and the view
  models surface here. Fix them where they are owned, not with adapters in the scene.
- The first-person perspective is the part most likely to fight the implementation: a fan of cards in
  false perspective, sized to be readable, that still leaves the mat visible. Get the composition
  roughly right here; T21 and T22 make it good.
- Watch the Unity traps: `== null` rather than `is null` on anything deriving from `UnityEngine.Object`;
  engine properties are calls into C++, so read once into a local; and a game that works the first
  time Play is pressed and misbehaves the second is a static or an unreleased subscription.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` — the composition to build. Its cards,
its "Pass" control, its 100 health and its "Opponent" label are all wrong; the framing, the zoning and
the corner HUD placement are right.
```

---

## T17 = DLR-192 — Keyboard-first controls, and the legend on screen

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `ui`, `playable`
**Skill:** `unity-programmer`, with `game-ux` for the interaction model
**Blocked by:** T16 · **Blocks:** T22

```
## Problem Statement

The mockup lists its controls as keys — play, sort, menu — in a legend block in the corner. That is a
real commitment: it says the game is played from the keyboard with the hand navigable by key, not
poked at with a cursor. It matters for feel, it matters for how fast a Wake can be replayed while
tuning, and the `game-ux` skill treats navigating a hand by keyboard as a first-class requirement
rather than an accessibility afterthought.

It also matters that the legend is honest. The mockup's lists a "Pass" that this game does not have.

## User Story

As the developer, I want to play a whole Wake from the keyboard without touching the mouse, so that
replaying hands while tuning is fast and the game feels like something you sit back and play.

## Acceptance Criteria

1. The whole Wake is playable from the keyboard: moving through the hand, playing the selected card,
   answering apply-or-roll, and reaching the menu.
2. The selected card is unmistakable — position, scale or frame, not colour alone.
3. Attempting to play an illegal card from the keyboard gives the same reason the mouse path gives,
   and does not move the selection.
4. Selection skips nothing: every card in hand is reachable, including the last one, and the movement
   wraps or stops in one stated way.
5. The mouse continues to work. Keyboard-first does not mean keyboard-only, and switching between them
   mid-hand does not confuse the selection.
6. A legend block sits bottom-left as the mockup places it, listing each key and what it does — and
   listing **only actions this game has**. There is no pass.
7. The legend updates to the moment: what it lists during a trick and what it lists at the
   apply-or-roll prompt are not the same, so the player is never told about a key that does nothing.
8. Key bindings live in one place as data, so changing one is a data change. Unity's Input System is
   already in the project and is what this uses.
9. Sorting the hand is included if it is cheap, and dropped with a note if it is not — with six cards
   dealt from one deck it may not earn its key.

## Scope Boundaries

**In scope:** the keyboard scheme, hand navigation, selection feedback, the legend and its
context-sensitivity, and the bindings as data.

**Out of scope:** gamepad support; rebinding UI; a settings screen; the menu the ESC key opens, beyond
it existing and offering a way out; the legend's final art (T22).

## Dependencies & Risks

- **The exact key choices are the developer's** — the mockup's Z / X / C / ESC is a starting point,
  not a decision. Implement them, say they are a default, and make them one data change to move.
- The legend listing an action the game does not have is exactly the mockup's mistake. Criterion 6 is
  the guard.
- A keyboard scheme that is technically complete but feels bad is the failure mode here, and only
  playing it answers that. Expect a second pass after the developer has used it.
- The Input System is in the project but has never been used in it. Budget for the first-use friction.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` — the legend's placement and its
key-plus-verb row format. Its contents are wrong.
```

---

## T18 = DLR-193 — The apply-or-roll prompt, and saying what the trick was

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `ui`, `playable`
**Skill:** `unity-programmer`, with `game-ux` for the layout
**Blocked by:** T16 · **Blocks:** T22

```
## Problem Statement

The bet is the game's central decision and a plain control does not carry it. The player needs to see
what applying pays now, what the pot becomes if they take the next trick too, and that they get
nothing if they do not — that is what makes rolling over a decision rather than a habit.

The prompt is also where the four outcomes get said out loud. The prototype learned this the hard way:
for weeks both the table and the prompt said only who physically took the trick, which is exactly the
half that misleads on a skulled trick.

## User Story

As the player, I want every resolved trick to tell me which of the four outcomes it was and why, and
every banked trick to show me both sides of the bet before I choose, so that I am making a decision
rather than pressing a button.

## Acceptance Criteria

1. Every banked trick raises a prompt offering **apply** and **roll over**, and play does not continue
   until one is chosen. It is answerable from the keyboard.
2. The prompt names which of the four outcomes the trick was — Straight Victory, Straight Loss,
   Skulled Victory, Skulled Loss — in those words, **and why**: whether a skull was in the trick, and
   whether this side took the cards.
3. The outcome is also named on the table as the cards land, not only on the prompt.
4. The prompt states the total, the roll, what applying deals right now, what the pot becomes if the
   next trick banks as well — as a floor — and that rolling over then losing pays nothing.
5. The apply control says on its own face whether applying now would end the Wake, in a word and not
   only a colour.
6. A losing trick raises the same surface with nothing to decide: it says how much health was taken,
   how large a pot went with it, and offers one way out.
7. The prompt sits in a region of the table rather than replacing it — the trick that caused it and
   the cards on the mat stay visible behind, and it never takes the input meant for what is under it.
8. Choosing holds for a moment with the header naming what happened — dealt, or rolled over and naming
   the roll carried forward — and every control is dead for the length of that hold so a second press
   cannot queue a second answer. The hold's length is a named constant.

## Scope Boundaries

**In scope:** the prompt, its figures, the four-outcome sentence in both places, the end-the-Wake
marker, the losing-trick variant, and the hold.

**Out of scope:** any buff breakdown — there are no buffs in this slice; the exact wording, which is
the developer's; the prompt's final art (T22); the hold's duration as a tuned value.

## Dependencies & Risks

- **Every word of the prompt is provisional and the developer's to rewrite.** Ship a clear first
  draft; do not agonise.
- **The hold's length is a placeholder nobody has chosen.** Name the constant and say so.
- The prototype shipped a bug worth not repeating: its apply control said "this would end the fight"
  in a fight the player had already lost. Guard the case.
- The prompt covering the table was a real problem in the prototype, where a panel took the taps meant
  for the cards underneath. In a first-person composition the mat is centre-frame, so where the prompt
  can sit without covering it needs deciding rather than assuming.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` — the mockup has no prompt, so where it
goes is this ticket's to work out within the mockup's zoning.
```

---

## T19 = DLR-194 — The Shade's intent: what they hold, and the suit they will lead

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `ui`, `playable`
**Skill:** `unity-programmer`, with `game-ux` for the layout
**Blocked by:** T16 · **Blocks:** T22

```
## Problem Statement

The developer asked specifically to see what the Shade holds and what it intends. Without it, a skull
is something that happens to you rather than something you read, and the whole foreknowledge design —
which is what makes the skull a decision instead of a tax — is invisible. The mockup shows only a
card count for the opponent, which is the part that matters least.

The split is the design: counting suits is bookkeeping and reading ranks is judgement, so the readout
removes the first and keeps the second.

## User Story

As the player, I want to see how many cards the Shade holds in each suit and how many of those are
skulled, and which suit it is about to lead with, so that choosing what to play is a read rather than
a guess.

## Acceptance Criteria

1. A panel shows, per suit, how many cards the Shade holds and how many of those carry a skull.
2. **It never reveals a rank and never identifies a card.** Knowing there are two skulls in the Raven
   does not tell the player whether they are the 2 and the 4 or the 10 and the 11.
3. When the Shade is the one leading and its lead is still uncommitted, that suit's row is marked and
   named in words — "The Shade will lead with the Raven."
4. That mark is **the suit and nothing else**: never the rank, never which card, never any reading of
   whether the Shade is pressing or ducking.
5. The mark clears the instant the Shade has led, and **never appears when the player is leading** —
   a follow is a function of the player's lead and does not exist until they have made it.
6. Nothing anywhere previews what the Shade would do against a card the player has merely selected and
   not played.
7. The panel updates as the Shade's hand shrinks and stays correct at the end of a hand.
8. It sits within the mockup's zoning without covering the Shade or the mat, and it is readable
   without the player leaving the table with their eyes.
9. The whole telegraph can be switched off in one place, so the developer can play with and without it.

## Scope Boundaries

**In scope:** the per-suit hold-and-skull readout, the lead-suit telegraph, its appearance rules, its
placement, and the switch.

**Out of scope:** any rank information; the Shade's stance; any preview of an unplayed player card;
what a played Shade card does beyond taking the trick — no card does anything extra in this slice;
the panel's final art (T22).

## Dependencies & Risks

- **Whether this reads at a glance is the developer's judgement and unplayed.** The prototype's
  equivalent was on screen and never actually looked at.
- **The telegraph is the single easiest thing in this epic to over-build.** The prototype deleted a
  wider version — one that also named the Shade's stance and previewed a merely-selected card — and
  brought back something deliberately narrower. Build the narrow one.
- Placement is genuinely hard here in a way it was not in a flat layout: the centre of the screen is a
  table and a character, and this panel wants to be near the Shade without being on top of it.
- Whether the telegraph belongs in the game at all is a feel question. Criterion 9 exists so the
  developer can answer it by playing both ways.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` — the mockup's opponent block shows only
a card count, so this panel's shape is this ticket's to work out.
```

---

## T20 = DLR-195 — The end of a Wake: win, loss, and playing again

**Type:** Story · **Priority:** Medium · **Parent:** DLR-175 · **Labels:** `ui`, `playable`
**Skill:** `unity-programmer`, with `game-ux` for the layout
**Blocked by:** T16 · **Blocks:** T22

```
## Problem Statement

A Wake that reaches zero health and simply stops is not something a developer can play repeatedly.
The loop needs an ending that says what happened and a way straight back into another one — playing
the same thing twenty times is how a rules change gets judged, and quitting to the editor between
attempts makes that miserable.

## User Story

As the developer, I want a Wake to end with a clear result and a one-press way into another one, so
that I can play the loop over and over while tuning it.

## Acceptance Criteria

1. When either health reaches zero, play stops and a panel states the result — the player survived
   and the Shade has gone onward, or the player did not.
2. The panel says how the Wake went in the game's own terms: hands played, tricks taken by each side,
   the largest pot the player banked, and how much health they finished with.
3. If both bars empty together, the panel says the player won, consistent with the rule.
4. A control starts a fresh Wake on a new seed without leaving Play mode.
5. A control starts a fresh Wake on the same seed, so a hand can be replayed after a change.
6. The seed in play is visible somewhere, so a Wake worth reporting can be reproduced.
7. Everything is reachable from the keyboard.
8. Starting a new Wake fully resets state — both healths, the total, the roll, the deal order, the
   skulls, and whose deal it is. Nothing survives from the previous Wake, including anything held in a
   static.

## Scope Boundaries

**In scope:** the end panel, the summary figures, the two restart controls, the visible seed, and the
reset.

**Out of scope:** any run structure, a ladder of Shades, coins, rewards or meta-progression — a Wake
ends and the next one is a fresh Wake; saving anything; a main menu beyond what the ESC key needs;
the panel's final art (T22).

## Dependencies & Risks

- **Statics are the risk here.** Fast Enter Play Mode makes static state sticky, and a game that plays
  correctly the first time and misbehaves the second is almost always a static, an event subscription,
  or a ScriptableObject holding runtime state that never reset. Criterion 8 is the guard and should be
  exercised by restarting several times in one Play session.
- The summary figures are a first guess at what is worth knowing after a Wake. Cheap to change once
  the developer has played a few.
- "The Shade has gone onward" is the fiction's own framing and reads better than "you won". The
  wording is provisional.

## Design Assets

`.docs/design/tech-duinn-lore.md` §1 — what the player is playing for is passage, which is what the
end panel is about.
```

---

## T21 = DLR-196 — Art integration: the real assets into the scene

**Type:** Story · **Priority:** High · **Parent:** DLR-175 · **Labels:** `ui`, `playable`
**Skill:** `unity-programmer`, with `pixel-artist` for the import settings
**Blocked by:** T13, T14, T15, T16 · **Blocks:** T22

```
## Problem Statement

T16 through T20 build the game on placeholder art and T13 through T15 draw the real thing. This is
where they meet, and it is not a mechanical swap: real card faces are a different size and density
from a coloured rectangle, a seated character occupies space a placeholder did not, and a lit room
changes what is readable in front of it.

Doing this as a distinct ticket is what keeps the art track and the scene track independent, and it is
where the pixel-art pipeline gets set up properly rather than per-asset.

## User Story

As the developer, I want the real art in the running game with the pixel pipeline set up correctly, so
that what I play looks like the mockup rather than like a diagram of it.

## Acceptance Criteria

1. Every placeholder is replaced: card faces and back, the Shade, the room, the table and mat, and the
   player's hands and fan.
2. The pixel-art pipeline is set up once, in one place: point filtering, no compression, pixels-per-unit
   consistent across every asset, and the camera configured so the game renders at the base resolution
   T4 chose under that ticket's scaling rule.
3. There is no pixel shimmer, no half-pixel snapping and no filtering blur at any supported window
   size, including a resized window and full screen.
4. The fan of cards in the player's hands uses the real faces and stays readable at every hand size
   from six down to one.
5. The Shade's fan shrinks visibly as it plays, and its reaction states fire at the right moments —
   the deal, taking a trick, losing one, taking damage, and dying.
6. The fire and any other animated element run at their intended rate and do not pull the eye off the
   table.
7. The three HUD blocks sit against the real room without anything important behind them, and read
   against the darkest and the brightest parts of the background.
8. A skulled card is unmistakable in the real art, and its rank and suit stay readable while it is
   marked.
9. Every gate still passes and the console is still clean through a full Wake.

## Scope Boundaries

**In scope:** replacing placeholders, the pixel pipeline and camera setup, import settings, the fan
with real cards, the Shade's states firing at the right moments, and checking readability against the
real background.

**Out of scope:** drawing anything (T13, T14, T15); the judgement pass over the finished screen (T22);
audio; any new surface.

## Dependencies & Risks

- **The pixel pipeline is the part that goes wrong silently.** Shimmer and blur at a non-integer scale
  look like bad art rather than bad settings, and they are the reason T4 had to decide the scaling
  rule up front.
- **Real art will break the placeholder layout**, and that is expected — a card face is denser than a
  rectangle and a seated figure is bigger than a box. Adjust the layout here; do not ask the art to
  fit a placeholder's dimensions.
- Readability against a dim, high-contrast, firelit background is a genuine risk for the HUD and the
  cards both. It is the thing most likely to send work back to T13 or T15.
- If an asset turns out not to work in the scene, that is a finding for its own ticket, not a redraw
  smuggled in here.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` — the target this ticket is trying to
reach. T4's art-direction document for the pipeline settings.
```

---

## T22 = DLR-197 — Visual and readability pass on the finished table

**Type:** Story · **Priority:** Medium · **Parent:** DLR-175 · **Labels:** `ui`, `playable`
**Skill:** `game-ux`, with `unity-programmer` and `pixel-artist` for the implementation
**Blocked by:** T17, T18, T19, T20, T21 · **Blocks:** T23

```
## Problem Statement

T16 through T20 each ship a stated functional default and defer visual judgement, which is correct
per-ticket and leaves the whole table looking like five tickets rather than one screen. T21 puts the
real art in but does not judge the result. "It works" is not "it looks decent", and an epic whose
Definition of Done includes the developer playing a full Wake by feel will have that feel dominated by
whether the screen reads.

This is the pass that treats the table as one screen, with the real art in it, and takes the
developer's notes as the spec.

## User Story

As the developer, I want the table to read as one designed screen, so that when I play a Wake to judge
the rules I am judging the rules rather than fighting the presentation.

## Acceptance Criteria

1. The developer has played a full Wake on the real art and given their notes, and this ticket
   implements them. The notes are the spec; nothing here is designed ahead of them.
2. The screen is zoned so the eye finds the trick, the hand, both healths, the pot and the Shade's
   intent without hunting — in a composition where the centre is a table and a character rather than a
   layout grid. See the `game-ux` skill and its full-viewport layout reference.
3. The screen fits the viewport with no scrolling and no cropping, and holds at the aspect ratios the
   developer cares about, full screen and windowed.
4. Interactive states are complete and consistent between mouse and keyboard: a card that can be
   played, one that cannot and why, one under the pointer, one selected, and the moment a card is
   committed.
5. Cards moving to the mat and to the spent pile, damage landing on a health bar, the pot changing, and
   the Shade's reactions are all readable as motion rather than as values snapping. Durations are named
   constants.
6. The four outcome names, the prompt's figures and the intent panel are all legible against the real
   firelit background at the darkest and brightest moments.
7. Nothing in the pass changes a rule. If the developer's notes imply a rules change, that is a new
   ticket.

## Scope Boundaries

**In scope:** zoning and composition, contrast and legibility against the real art, HUD chrome,
interactive states, motion and its timings, and viewport fit.

**Out of scope:** redrawing assets, which goes back to T13, T14 or T15 as its own work; audio; any
rules change; any new surface.

## Dependencies & Risks

- **This ticket cannot start before the developer has played the real thing and given notes.** Visual
  and copy judgement is theirs and is a named pause condition. Flag the card and wait rather than
  designing ahead of them.
- Their notes are intent, not a specification. Redesign properly from a sketch or a note rather than
  transcribing it.
- Scope creep is the risk: a readability pass that becomes an art pass. If an asset is the problem, say
  so and raise it against the ticket that drew it.

## Design Assets

The developer's own play notes, taken after T21.
`.docs/design/mockups/the-table-first-person-2026-09-05.png` as the standard being aimed at.
```

---

## T23 = DLR-198 — Verification and sign-off against the epic's Definition of Done

**Type:** Task · **Priority:** Medium · **Parent:** DLR-175 · **Labels:** `design`
**Skill:** none — verification and a recorded decision, no production code
**Blocked by:** T3, T22 · **Blocks:** none

```
## Problem Statement

Every ticket in this epic passes its own acceptance criteria and that is not the same as the epic
being done. DLR-175 states ten conditions about the whole thing — a full Wake playable to a death, all
four outcomes reachable and correctly named, the lead following the outcome, the vocabulary sweep, and
the gates having genuinely been run — and none of them is any single ticket's to confirm.

Two of those conditions are specifically the kind that quietly go unmet: the vocabulary sweep, because
a stray identifier compiles fine, and the gates, because "should pass" reads identically to "passed"
in a report nobody checked.

## User Story

As the developer, I want one closing pass that checks the epic's own Definition of Done end to end
against the running game, so that "done" means something I can trust.

## Acceptance Criteria

1. Each of DLR-175's Definition of Done conditions is checked against the running game or the real
   command output, and the result recorded condition by condition — not inferred from the child
   tickets having closed.
2. A full Wake is played from the deal to a death, and each of the four outcomes is observed at least
   once and confirmed named correctly on screen.
3. The lead is confirmed to follow the outcome in all four cases in actual play, including a Skulled
   Victory where the Shade took the cards and the player still leads.
4. A vocabulary sweep over all shipped Unity code, scenes and assets finds no Quarry, no High Victory,
   High Defeat, Low Victory or Low Defeat, no Bells, Keys or Moons, no Swan, Fox, Woodcutter,
   Treasure, Witch or Monarch, no "decree", no "Opponent" as a label, and no pluralised suit. The
   exact command and its output are recorded.
5. All three gates are run and their real output recorded: `dotnet test`, the Unity batch-mode tests,
   and the batch-mode build. A gate that could not be run is named as such, never reported as passing.
6. `.docs/game_rules/the-hunt.md` is confirmed to cover every rule this epic settled, with each marked
   settled, provisional, open or not built, and to contain no rule this epic did not build.
7. `.docs/implementation/` has an entry for each module built, and it matches the code.
8. The finished screen is compared against
   `.docs/design/mockups/the-table-first-person-2026-09-05.png`, and every place it deliberately
   departs from the mockup is listed with the reason — so a difference is a decision on record rather
   than something nobody noticed.
9. The two questions the design doc leaves open — who deals first, and whether high and low keep a
   mechanical job — are put to the developer and their answer recorded in
   `.docs/game_rules/the-hunt.md`, or explicitly marked open if they would rather decide after playing
   more.
10. Anything found that does not meet the Definition of Done becomes its own ticket. This ticket does
    not fix things.

## Scope Boundaries

**In scope:** verifying the epic's stated Definition of Done end to end; the vocabulary sweep; running
all three gates; the mockup comparison; confirming the documentation; raising follow-up tickets;
putting the two open design questions to the developer.

**Out of scope:** fixing anything found — every defect is a new ticket; re-running the child tickets'
own unit tests as if they were this ticket's evidence; any new feature.

## Dependencies & Risks

- **This ticket must not become a fix-up ticket.** Its value is an honest list. A finding fixed in
  passing is a finding nobody sees.
- Reporting a gate as passing without running it is the single failure this ticket exists to prevent.
  Record what the command actually printed.
- The two open design questions are the developer's and only theirs. Ask, do not decide.

## Design Assets

`.docs/design/mockups/the-table-first-person-2026-09-05.png` for criterion 8.
```
