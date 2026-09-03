# DLR-163 — Rewrite the 3, the 5 and the 7 so all three are worth playing

Spec: [`plan.md`](./plan.md) in this folder. Layout and interaction: [`mockup.html`](./mockup.html)
in this folder — reviewed as a local file rather than a published link, because the Artifact publish
was refused by the permission classifier. The approval covers it either way.

## What changed

**The 3 — you name a suit, and it costs nothing.** Playing a Fox opens a prompt of three suits plus
a decline; the named suit becomes trump immediately, before the winner is decided. Nothing leaves
your hand. The decree card it replaces goes to the spent pile at that instant and the plate becomes
a bare suit marker with the card's own footprint, so the felt does not reflow. Naming the suit
already in force is accepted and behaves exactly as declining — enforced in `applyNameTrump`, not at
the prompt, so the felt and the engine cannot disagree. The Quarry's 3 names the suit it holds most
of and declines when that is already trump.

**The 5 — the Swap pile grows, and the Quarry's mints a skull.** For the player it opens no prompt
at all: it adds one to both the Swap cap and the Swaps remaining, for the rest of the fight, and is
never refused for a full pile (3 of 3 becomes 4 of 4; 0 of 3 becomes 1 of 4). The Swap control now
prints both figures and marks the moment the addition lands. For the Quarry it swaps one held card
through the single draw primitive, with a 40% chance the drawn card carries a skull — subject to the
same "never rank 1" rule the deal obeys, read off the weight curve rather than restated. That
arrival is marked on the Quarry's suit-shape row, which is where a skull on a face-down card is
actually visible.

**The 7 — winning it raises base damage for the fight.** A trick that carried a Treasure and that
banked adds 1 to a per-fight base-damage figure, feeding the same term a Whetstone raises. A trick
that carried one and hurt the player costs 2 health instead of 1. Both stack within a fight; both
reset at the fight boundary. The 7's face stops printing "no rule" and becomes an acting face.

**Two new per-fight run figures** — `RunState.discardCapBonus` and `RunState.treasureDamageBonus` —
follow `discardsRemaining`'s exact contract: seeded by `startRun`, reset by `advanceRun`, carried
through `recordEncounter`, owned by the hand and handed back on `WarCouncilRoundResult`. Neither is
persisted.

**The simulator can finally see the 5.** Its three prompt-free predicates stopped excluding the
Woodcutter, and its run driver carries both new figures, so a simulated fight measures the game the
player actually plays.

## Decisions for the developer

**The four transcribed constants — confirm each is a decision rather than a placeholder.** All four
are exactly the figures the acceptance criteria state; none was chosen here.

- [ ] `TREASURE_BASE_DAMAGE_STEP` = 1 — what one banked Treasure trick adds to the fight's base damage.
- [ ] `QUARRY_TREASURE_DAMAGE` = 2 — what a hurt Treasure trick costs, replacing `DAMAGE_PER_HIT`.
- [ ] `WOODCUTTER_SWAP_STEP` = 1 — what one played Woodcutter adds to the Swap pile.
- [ ] `QUARRY_SWAP_SKULL_CHANCE` = 0.4 — the chance the Quarry's swap mints a skull.

Approved at the gate, re-open only if it reads wrong in play:

- [ ] **Whose 7 counts is ownership-blind.** Any trick that carried a 7 pays whichever side was
      victorious. The consequence: the Quarry's clean 7, taken cleanly by you, pays you +1.
- [ ] **The Quarry's 5 skulls only its own hand**, never a card you will later draw.
- [ ] **The Woodcutter's back-out is gone.** A 5 commits on its second tap with no prompt, so
      "opening the choice does not commit the card" no longer covers it.

Still open, and yours:

- [ ] **The Swap control reads "3 of 3".** Whether that is the wording, and whether the cap belongs
      on the control's face or beside it.
- [ ] **The duration, easing and colour** of the raised-Swap mark and the skull-arrived mark.
- [ ] **Criterion 14** — whether the 7's harp/chalice/sword and the 5's axe still read for their new
      rules. Nothing in `CardArtSheet.tsx` was touched.
- [ ] **The 3's prompt at its new size** — four controls instead of a whole hand. Does it still sit
      right on the felt?
- [ ] **The difficulty shift.** Both sides gained; the Quarry's gains land on health, which is the
      only thing runs die to. A simulator run over the same seeds before and after, comparing the
      run win rate and mean fights survived, is what would settle it.
- [ ] **The prompt no longer shows how many of each suit you hold.** `plan.md`'s prop list removed
      the hand from the prompt; `mockup.html` shows a "you hold 3" count under each suit. Say if you
      want it back — it needs one prop.

## Verification

Run at the end of the implementation phases, on this branch:

- `npm run typecheck` — exits 0, no errors anywhere in the project.
- `npx vitest run --project node` — `Test Files 165 passed (165)`, `Tests 2024 passed (2024)`.
- `npx vitest run --project dom` — `Test Files 49 passed (49)`, `Tests 458 passed (458)`.
- Pure-core grep over `src/warCouncil/` and `src/hunt/` for `react` / `window.` / `document.` /
  `localStorage` / `Math.random` — hits are prose in docblocks forbidding them; no live reference.
- `0.4` appears outside a spec only in `src/hunt/config.ts`.

`npm run lint` and `npm run build` are the reviewers' to run.

**Not verified, and not verifiable without the running app:** whether the suit picker feels right in
place, whether the decree marker reads as a marker rather than as a missing card, whether the
raised-Swap and skull-arrived marks are noticeable without being noisy, and whether the difficulty
shift is acceptable.

## One convention worth knowing

**A rule whose effect lands on run state is stated as a pure function in `src/hunt/` and applied by
`commit`.** The card engine may not see a run figure, so the player's 5 has no engine effect at all:
`swapPileAfterWoodcutter` owns the arithmetic, is unit-testable with no renderer, and `commit` — the
single place a player's card is committed — is what calls it. The Quarry's 5 is a card rule and
stays in the engine. That asymmetry is deliberate and is documented at both sites.

## Two settled rules stopped being settled

A reader of the diff should expect `.docs/game_rules/the-hunt.md` to change on both:

- §8's **"damage to the player, per event: 1, every time"** — a hurt trick carrying a Treasure now
  costs 2.
- §5's **"a drawn card is never skulled"** — the Quarry's Woodcutter mints one mid-hand.

§5's **"opening the choice does not commit the card"** also narrows: it covers only the 3 now.
