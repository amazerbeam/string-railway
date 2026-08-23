# DLR-107 — Cheat and Timebomb as ordinary buff-pile objects

Plan: [`plan.md`](./plan.md) in this folder. Contract: `.claude/contract/DLR-107-migrate-cheat-and-timebomb-into-the-buff-pile/`.

## Summary

Cheat and Timebomb now have a first-class representation as `Buff` objects on the DLR-105 buff pile,
so the activation ticket that follows has one shape to activate rather than two bespoke mechanics.

- **`Buff` gains an identity.** DLR-105 shipped `Buff` with `id`, `tier`, `condition`, `reward` and
  no field naming *which card this is* — `condition.kind` describes a trigger, not an identity. A
  new `BuffKind` (`unassigned` / `cheat` / `timebomb`) closes that gap. It is a **required** field,
  so every construction site names it; `seedStartingBuffPile`'s placeholder seeds take
  `BuffKind.Unassigned` and stay obviously placeholder.
- **New pure module `src/hunt/buffCatalog.ts`** (156 lines) holds the two tier tables the ticket
  names, the factories that mint each card at a tier, and the readers that get the tier-scaled
  figure back out:
  - `CHEAT_DURATION_TRICKS` — `{ bronze: 1, silver: 2, gold: 3 }`, transcribed from AC1. Bronze's 1
    is exactly today's behaviour (`LegalMoveOptions.ignoreFollowSuit` lifts follow-suit for one
    committed card).
  - `TIMEBOMB_DAMAGE` — **derived, not hand-written**. `TIMEBOMB_TIER_MULTIPLIER` multiplies *both*
    of the live figures, `ENVENOM_QUARRY_DAMAGE` (4) and `ENVENOM_PLAYER_DAMAGE` (2). That is AC2's
    resolution of design doc §3's open question — scale both sides on the existing 2:1 ratio — and
    deriving it means the ratio holds as arithmetic and the bronze row equals today's live pair by
    construction, so the migration cannot silently diverge from the mechanic it migrates.
  - `cheatBuff` / `timebombBuff` factories; `cheatDurationTricksOf` / `timebombDamageOf` readers,
    both of which throw `RangeError` naming the wrong `kind` rather than returning a plausible
    number.
- **No behaviour changed.** Nothing activates a buff, nothing draws one, no shop purchase or
  `RunState` field moved, and no UI file was touched.

## Decisions the developer owns

1. **`TIMEBOMB_TIER_MULTIPLIER = { bronze: 1, silver: 2, gold: 3 }` is an unchosen tuning value.**
   Neither the ticket nor design doc §3 states Timebomb's tier magnitudes; this default was taken
   from the only tier curves the sources do state (AC1's Cheat duration, and §3's Shield bullet,
   both 1/2/3). It yields **4 / 8 / 12** to the Quarry and **2 / 4 / 6** to the player. A gold
   Timebomb costing 6 of a 10-point player bar is a large self-inflicted hit and may want a flatter
   curve. One place to change it: `src/hunt/buffCatalog.ts`.
2. **AC3 is deliberately not done.** The ticket asks for the two-click Cheat-slot (`CheatStage`) and
   three-tap Envenom-plate (`EnvenomStage`) state machines to be removed, but its own Scope
   Boundaries put the felt-rail UI removal out of scope and state the UI still points at the old
   mechanics. Both are live, reachable, tested code. **Consequence to confirm: Cheat and Timebomb
   now exist twice** — the live bespoke mechanic the UI drives, and this inert representation
   nothing reads. That is the intended intermediate state of a migration split across tickets, and
   it lasts until the activation and UI tickets land.
3. **`Buff` gaining a required `kind` field** is a change to the data model DLR-105 shipped four days
   ago. Cheap to red-line now; expensive once the slot machine and the Vault both construct buffs.
   Free today because the buff pile is not persisted yet — after DLR-113 (the Vault) it would be a
   versioned change requiring a `SAVE_SCHEMA_VERSION` bump.
4. **`ACTIVATED_BUFF_CONDITION`'s `'activated'` string** enters a condition-catalog vocabulary design
   doc §5 explicitly does not own yet. Whoever authors the real catalog (DLR-103 T7a) should know
   the name is taken.
5. **Gold Cheat safety, per the ticket's own Dependencies & Risks:** three tricks of no-follow-suit
   needs a costing pass before it ships. Satisfied by construction here — nothing in `src/` activates
   a buff or mints a non-bronze one outside a test, and `seedStartingBuffPile` still mints only
   bronze placeholders. The tiered-AP-cost ticket is what actually prices it.

Nothing in this change can be judged by running the app: it renders nothing and changes no
player-visible behaviour. There is no feel question and no visual call in it.

## Verification

All three reviewers approved on round 1 — Code-Evaluator `APPROVED`, Defender `APPROVED`
(0 Critical / 0 Warning / 0 Info), QA `ALL PASSED`. No fix round was needed.

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0, zero errors |
| `npm run lint` | exit 0, zero errors, zero warnings |
| `npm test` | exit 0 — **`Test Files 86 passed (86)`, `Tests 1089 passed (1089)`, 0 failed** (baseline 1072/85; +1 file, +17 tests) |
| `npm run build` | exit 0, `dist/` written, built in 176ms, no bundler errors |
| `npx prettier --check` (5 contract files) | exit 0 |
| Pure-core boundary grep over `src/hunt` | zero hits |
| Bronze row not a literal (`quarry: 4\|player: 2`) | zero hits — derived from the live constants |

## Note for future contributors

`Buff.kind` is the identity discriminator — which card a buff *is*, as distinct from
`Buff.condition.kind`, which is when it fires. A tier-scaled figure is read through
`cheatDurationTricksOf` / `timebombDamageOf`, never by indexing a tier table at a call site; those
readers throw on a wrong-kind buff so a mis-typed call is loud rather than plausibly wrong.
