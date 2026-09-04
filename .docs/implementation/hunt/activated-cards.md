Part of [Hunt](README.md).

An **activated card** is a buff the player presses rather than one that fires on a trigger. There
are four kinds in the pile today — **Cheat**, **Shield**, **Curse** and the **Wildcard** — and what
makes them one family is a shared shape rather than a shared effect: each carries
`ACTIVATED_BUFF_CONDITION` (`{ kind: 'activated' }`), each sits at `BuffCadence.Activated` in
`BUFF_CADENCE`, and each is therefore skipped by `firedBuffs` in `buffEvaluation.ts` and has no
`buffFires` case at all. A card with no trigger cannot fire on a condition; it pays because the
player spent it.

Read [The buff pile](buff-pile.md) first for the `Buff` type this builds on, and
[Wild cards](wild-cards.md) for the Wildcard's own mechanic, which is large enough to have its own
file.

## `Buff` carries an identity, and that is what made this possible

DLR-105 shipped `Buff` with `id`, `tier`, `condition` and `reward` — and nothing naming _which card
this is_. `condition.kind` describes a **trigger** ("when does this fire"), not an identity ("what
is this"), and overloading one string with both is how the two stop being separable. `buffs.ts`
therefore carries `kind: BuffKind`, a closed `as const` map in the same idiom `BuffTier` and
`BuffRewardAxis` use (`erasableSyntaxOnly` in `tsconfig.app.json` rules out a real `enum`). It is a
**required** field, so every construction site names one.

`buffCatalog.ts` is the module that mints them: the tier tables, the factories, and the readers that
get the tier-scaled figure back out. Every factory takes its `id` from the caller — minted from
`RunState.nextBuffId`, never from `Math.random()`, because `src/hunt/` must stay deterministic.

## The four cards, and what each one's tier scales

This is the payoff of `BuffRewardAxis` being a closed union rather than a fixed "damage" field. No
branch, no subtype and no widening was needed for any of the four.

| Card     | Factory                  | Reward axis      | What the tier scales                                         |
| -------- | ------------------------ | ---------------- | ------------------------------------------------------------ |
| Cheat    | `cheatBuff(tier, id)`    | `DurationTricks` | `CHEAT_DURATION_TRICKS` — 1 / 2 / 3 tricks of no follow-suit |
| Shield   | `shieldBuff(tier, id)`   | `HeartCount`     | `SHIELD_HEARTS`, via `shieldHeartsForTier`                   |
| Curse    | `curseBuff(tier, id)`    | `Magnitude`      | `CURSE_REWARD[tier].damage` — see below                      |
| Wildcard | `wildcardBuff(tier, id)` | `None`           | nothing — all three tiers convert exactly one card           |

The Wildcard **carries** a tier without scaling on it, deliberately: the reels award a tier and a
three-of-a-kind readout says so, and handing over a bronze card under a "1 gold" line would make
that readout a lie. Whether a higher tier should do more is an open design question, not a default
anyone here invented.

### Cheat

`CHEAT_DURATION_TRICKS` is `{ bronze: 1, silver: 2, gold: 3 }`, transcribed from DLR-107's AC1 and
design doc §3 ("Cheat's tier is duration — how many tricks the follow-suit break lasts, not a
magnitude"). Bronze's `1` **is** the effect the game has always had:
`LegalMoveOptions.ignoreFollowSuit` in `src/warCouncil/legalMoves.ts` lifts follow-suit for exactly
one committed card. The gold row carries a warning in its own comment — three tricks of no
follow-suit is flagged by design doc §3 as needing a costing pass ("close to a guaranteed run of
wins rather than one clutch save").

`cheatDurationTricksOf(buff)` returns `buff.reward.value` — the figure the buff was **minted** with,
so one object has exactly one answer even if the table is retuned afterwards. It throws a
`RangeError` on a buff of the wrong kind rather than answering: the value is a small integer, so a
swallowed version would silently lift follow-suit for the wrong card and look entirely reasonable
doing it. `curseRewardOf` and `shieldHeartsOf` take the same discipline.

### Curse

`CURSE_REWARD` is `{ bronze: +1 damage, silver: +2 damage, gold: +2 damage and +1 multiplier }`,
transcribed verbatim from DLR-167's AC6 and **not chosen here** — the figures ship as specified and
get tuned by playing.

Curse is the one card in the pool that pays **two** figures at a tier, which `BuffReward`'s
deliberate one-axis-one-value shape cannot express. Rather than widen that type for one card —
something this codebase has twice declined to do — `curseBuff` puts the _damage_ half on
`reward.value` as the card's headline figure, and `CurseBonus` (`{ damage, multiplier }`) carries
the pair. `curseRewardOf(buff)` is the reader; `curseBonusOf(active)` in `buffAccrual.ts` sums the
pair across every Curse riding one trick.

`curseBonusOf` reads the **activated** set, not the fired set, and that is the whole point: a Curse
is `BuffCadence.Activated`, so `firedBuffs` excludes it by design. Its payoff is owed for the trick
it was activated for, not for a condition coming true. It is deliberately **not** routed through
`BuffBonusAccrual`, which is the hand's running total and would carry a one-trick bonus into later
tricks.

The mark the card actually makes lives on the card layer — see
[The Curse](../war-council/the-curse.md).

### The Wildcard

`wildcardBuff(tier, id)` mints the card the player **spends**; its reward axis is
`BuffRewardAxis.None` and its value is `0`, because it has no reward of its own. `isShopOnlyBuff` is
true for it and for nothing else, and `BuffActivationRefusal.ShopOnly` is how the felt refuses it:
it is spent on the Manage Buffs screen, between fights. `CombineRefusal.Untiered` refuses combining
two of them, because every tier converts exactly one card and merging two would halve the player's
supply for nothing. Everything else about wildness is in [Wild cards](wild-cards.md).

`isShopOnlyBuff` lives in `buffs.ts` rather than in `consumables.ts` beside
`consumableEffectIsLive`, where its plan first put it: `consumables.ts` stood at 396 of the
400-line blocking budget and the predicate would have breached it.

## The activation window is a hardcoded kind check, with exactly one exception

`buffActivationWindowOpen` in `src/app/warCouncil/roundUiState.ts` is the gate:

```ts
return buff.kind === BuffKind.Cheat ? canAct(state) : discardWindowOpen(state)
```

**Cheat's exception is functional, not historical.** A Cheat breaks follow-suit, which is worth
nothing until a lead is on the felt binding you. Gating it between tricks would make it unreachable
at the only trick it could matter.

**Every other activated row takes the ordinary between-tricks window**, and the reason is stated
once, in that function's docblock: a card that arms an effect _before_ the player commits has no
business being armable after the Quarry has led, because that would let the player see the lead
first — a read the card was never meant to buy. That rule is what the DLR-167 fix pass extended to
carry-on: `handleCarryOn` refuses to advance the Quarry's lead while a Curse is armed, because
nothing else clears `curseArmedBuff` and a Curse armed between tricks would otherwise survive the
lead and let the player choose which card to mark having already seen it.

The gate is exported so `handleTapBuff`'s committing tap threads the **same** window into
`activateFromPile` — `activateBuff` re-checks it and throws on a refusal, so a caller that asked
this question one way and a different way at the commit would surface as a thrown `RangeError` on
the second tap.

**The kind check is on purpose.** See
[structure notes for the port](../structure-notes-for-the-port.md#1-a-buffs-timing-window-is-a-hardcoded-kind-check-not-a-property-of-the-buff)
for why a `Record<BuffKind, TimingWindow>` table is the right shape in Unity and the wrong shape
here.

**The failure mode to expect if this window is ever narrowed again** is silence: the refusal happens
at the reducer with nothing thrown, so what breaks is a downstream fixture or simulator policy that
assumed a spend landed, not the spend itself.

## Where the tier tables live, and why not in `config.ts`

`CHEAT_DURATION_TRICKS`, `CURSE_REWARD` and `SHIELD_HEARTS` sit in `buffCatalog.ts` and `shield.ts`
rather than in `config.ts`, where every other tunable in this module sits. `config.ts` has run at or
near the project's blocking 400-line budget for the whole of this module's life and could not take
them. The values stay named, exported and stated once — which is what the no-hard-coded-tunable rule
actually asks for — and `index.ts` re-exports them, so `import { CHEAT_DURATION_TRICKS } from
'../hunt'` reads identically either way.

**Module-init order matters in `buffCatalog.ts`**, the same trap `config.ts` documents for
`RUN_ENCOUNTERS`: a table built at module load from a `const` declared below it hits the temporal
dead zone and throws at import time.

## Minting and the reel

`mintFromTemplate` delegates to these factories for every activated card, so they are
indistinguishable from a card the machine dealt — which is what makes them stack on the felt and
combine in the shop with no branch that knows they are special.

`ACTIVATED_TEMPLATES` holds **three** rows — Cheat, Wildcard and Curse — narrowed by the
`BuffActivatedTemplateKind` union, which is what makes each of them _constructible_ rather than
merely unweighted. Together with the 16 condition templates that makes a pool of **19**. Shield and
the five consumables (Ward, Second Thoughts, Puppeteer, Foresight, Spyglass) have no template and no
slot weight, so nothing deals them however the reel lands. A template id is a bare kind string
(`'cheat'`, `'wildcard'`, `'curse'`) and is **frozen** the moment it ships, because the Vault
persists grants by it.

`RUN_STARTING_CHEATS` (still `1`) seeds a bronze Cheat straight into `RunState.buffs` at `startRun`.
