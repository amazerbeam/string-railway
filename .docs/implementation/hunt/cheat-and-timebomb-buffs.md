Part of [Hunt](README.md).

DLR-107 gave Cheat and Timebomb a representation as ordinary `Buff` objects on the DLR-105 buff
pile — `buffCatalog.ts`, a new pure module holding the two tier tables, the factories that mint each
card at a tier, and the readers that get the tier-scaled figure back out.

> **DLR-132 closed the migration this file originally described as inert, 2026-08-24.** Everything
> below this note is DLR-107's original record and is still accurate on its own terms — the tier
> tables, the factories, the readers, all unchanged. What changed is everything *around* them:
> `cheatBuff` and `timebombBuff` are now the **only** minting path (`buffTemplates.ts`'s
> `mintFromTemplate` delegates to them for both cards), both are drawable from the reel
> (`ACTIVATED_TEMPLATES`, two of the pool's 73 templates), and the old bespoke felt mechanics
> (`CheatStage`, `TimebombStage`, `CheatSlots.tsx`, `TimebombCharge.tsx`, `src/hunt/cheats.ts`,
> `RunState.cheats`/`nextCheatId`/`timebombCharges`) are **deleted in full**. Cheat and Timebomb no
> longer exist twice — see [action-bar-and-loadout.md](../war-council-ui/action-bar-and-loadout.md)
> for where the two effects fire now (`handleTapBuff`, beside Ward's), and
> [buff-pile.md](buff-pile.md) for the pile's shape. `RUN_STARTING_CHEATS` is unchanged in name and
> value (still `1`) and now seeds a bronze Cheat straight into `RunState.buffs` at `startRun`, rather
> than granting a slot. `TimebombDamage` is retyped `Readonly<Record<DuelSide, Damage>>` and
> `queueTimebomb` takes the pair directly — see
> [timebomb-and-the-delayed-hit.md](timebomb-and-the-delayed-hit.md).

Read [The buff pile](buff-pile.md) first for the `Buff` type this builds on.

**`Buff` gained an identity, and that is the one type change.** DLR-105 shipped `Buff` with `id`,
`tier`, `condition` and `reward` — and nothing naming *which card this is*. `condition.kind`
describes a **trigger** ("when does this fire"), not an identity ("what is this"), and overloading
one string with both is how the two stop being separable. So DLR-107 added `kind: BuffKind` to
`buffs.ts`: a closed `as const` map over `unassigned` / `cheat` / `timebomb`, in the same idiom
`BuffTier` and `BuffRewardAxis` already use (`erasableSyntaxOnly` in `tsconfig.app.json` rules out a
real `enum`). It is a **required** field, so every construction site names one — which made the
widening a compile error at each site rather than a silent `undefined`. `seedStartingBuffPile` mints
`BuffKind.Unassigned`, keeping the run's four opening buffs obviously placeholder rather than
silently turning them into Cheats. `ACTIVATED_BUFF_CONDITION` (`{ kind: 'activated' }`) is the
condition both migrated cards share: neither has a trigger, because the player pulls them
deliberately (design doc §1's "held in the pile and sprung in response to what's actually
happening").

**Cheat tiers on duration; Timebomb tiers on damage — and `Buff` already anticipated that.** This is
the payoff of DLR-105's `BuffRewardAxis` being a closed union rather than a fixed "damage" field.
`cheatBuff(tier, id)` mints a `Buff` whose reward is `{ axis: DurationTricks, value:
CHEAT_DURATION_TRICKS[tier] }`; `timebombBuff(tier, id)` mints one whose reward is
`{ axis: Magnitude, value: TIMEBOMB_DAMAGE[tier].quarry }`. No branch, no subtype, no widening was
needed for either. Both factories take the `id` from the caller — minted from `RunState.nextBuffId`
the same way `seedStartingBuffPile`'s are, never from `Math.random()`, because `src/hunt/` must stay
deterministic.

**`CHEAT_DURATION_TRICKS` is `{ bronze: 1, silver: 2, gold: 3 }`**, transcribed from the ticket's AC1
and design doc §3 ("Cheat's tier is duration — how many tricks the follow-suit break lasts, not a
magnitude"). Bronze's `1` **is** what ships today: `LegalMoveOptions.ignoreFollowSuit` in
`src/warCouncil/legalMoves.ts` lifts follow-suit for exactly one committed card, so a bronze Cheat
under the new model is the Cheat the game already has. The gold row carries a warning in its own
comment rather than only in a ticket: three tricks of no-follow-suit is flagged by DLR-107's
Dependencies & Risks *and* by design doc §3 as needing a costing pass before it ships ("close to a
guaranteed run of wins rather than one clutch save"). Nothing in `src/` activates a buff, so no
player-reachable path can reach that row — the tiered-AP-cost ticket is what prices it.

**`TIMEBOMB_DAMAGE` resolves a design question, and it resolves it by arithmetic rather than by
comment.** Design doc §3 left one open: does a higher Timebomb tier raise **only** the Quarry-side
damage (strictly better to pull, the same 2-health risk at every tier), or does it keep today's 2:1
ratio and scale **both** sides (bigger reward, proportionally costlier backfire)? DLR-107's AC2
resolves it to *both sides*, and the rejected reading is refuted in the comment beside the table as
that AC requires: raising only the Quarry side makes a gold Timebomb a free upgrade with no added
downside, which removes the very decision the mechanic exists to pose.

What makes that resolution durable is that the table is **derived, not written out**.
`TIMEBOMB_TIER_MULTIPLIER` multiplies both of the live figures — `TIMEBOMB_QUARRY_DAMAGE` (4) and
`TIMEBOMB_PLAYER_DAMAGE` (2) from `config.ts` — through a private `timebombRow(tier)` helper, so the
"multiply BOTH sides" rule is stated once and cannot be applied to one side by an edit. Two
consequences follow, and both are the point:

- **The 2:1 ratio holds as arithmetic**, not as three hand-typed pairs that could drift apart. The
  spec asserts it algebraically at every tier (`row.quarry * TIMEBOMB_PLAYER_DAMAGE === row.player *
  TIMEBOMB_QUARRY_DAMAGE`) rather than against literals.
- **The bronze row *is* today's live pair, by construction rather than by coincidence.** Retuning
  `TIMEBOMB_QUARRY_DAMAGE` moves this table with it. That is what makes the migration incapable of
  silently diverging from the mechanic it migrates — the failure mode a migration split across
  tickets is most exposed to.

`TimebombDamage` is a **pair** (`{ quarry, player }`), not one number, for the reason `config.ts`
already gives for those being two keys: the player's hit is deliberately smaller because it *also*
forces the streak's cash-out, and a single shared figure is the bug that type-checks, reads
correctly, and pays the wrong side.

**The readers throw rather than answer.** `cheatDurationTricksOf(buff)` and `timebombDamageOf(buff)`
are what a later activation ticket calls; each refuses a buff of the wrong `kind` with a `RangeError`
naming the kind it actually got. This is `cheats.ts`'s `removeCheat` discipline applied to a sharper
case: a Timebomb's `reward.value` is *also* a small integer, so a swallowed version would silently
lift follow-suit for the wrong card and look entirely reasonable doing it. The two readers differ in
where they read from, deliberately — `cheatDurationTricksOf` returns `buff.reward.value`, the figure
the buff was **minted** with, so one object has exactly one answer even if the table is retuned
afterwards; `timebombDamageOf` reads the tier table, because the caller needs the *pair* and `reward`
carries only the Quarry half. `BuffReward` stays single-axis: DLR-105 kept it that way deliberately,
and design doc §5 itself defers the multi-value-reward question.

**Module-init order matters here**, the same trap `config.ts` documents for `RUN_ENCOUNTERS`.
`TIMEBOMB_DAMAGE` is built at module load by calling `timebombRow`, which is a hoisted *function
declaration* and so may sit below its first use — but `TIMEBOMB_TIER_MULTIPLIER` is a `const` and
must be declared above it, or the initialiser hits the temporal dead zone and throws at import time.

**Two things this deliberately did not do.** First, the tier tables live in `buffCatalog.ts` rather
than `config.ts`, where every other tunable in this module sits: `config.ts` measures 385 lines
against the project's blocking 400-line budget, and these tables plus the comments AC2 demands need
roughly 40. The values stay named, exported and stated once — which is what the no-hard-coded-tunable
rule actually asks for — and `index.ts` re-exports them, so `import { CHEAT_DURATION_TRICKS } from
'../hunt'` reads identically either way.

Second: **DLR-107's AC3 asked for the old two-click Cheat-slot (`CheatStage`) and three-tap
Timebomb-plate (`TimebombStage`) state machines to be removed, and for two tickets they were not** —
AC3 gated removal on the new model being "proven equivalent", and the felt kept driving both bespoke
mechanics while this representation sat unread. **DLR-132 is what ended the duplication (2026-08-24)**:
`CheatStage`, `TimebombStage`, `CheatSlots.tsx`, `TimebombCharge.tsx` and the whole of `cheats.ts` are
deleted, and `mintFromTemplate` delegating to `cheatBuff`/`timebombBuff` (above) is now the only path
either card is ever created through. Cheat and Timebomb exist exactly once.

**One unchosen number lives here.** `TIMEBOMB_TIER_MULTIPLIER`'s `{ bronze: 1, silver: 2, gold: 3 }`
is not transcribed from anywhere: neither the ticket nor §3 states Timebomb's tier magnitudes. It was
taken as a documented default from the only tier curves the sources *do* state — AC1's Cheat duration,
and §3's Shield bullet, both 1/2/3 — and it yields 4/8/12 to the Quarry and 2/4/6 to the player. A
gold Timebomb costing 6 of a 10-point player bar is a large self-inflicted hit and may want a flatter
curve; it is the developer's to move, in one place.
