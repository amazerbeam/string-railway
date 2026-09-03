# DLR-162 — The wildcard

Plan: `.claude/contract/DLR-162-the-wildcard/plan.md` · Approved layout: `.claude/contract/DLR-162-the-wildcard/mockup.html`

## What this does

A scarce new card — the **wildcard** — is dealt by the slot machine like anything else. Between fights, on the Manage Buffs screen, you spend it on a suited card you already own to take that card's suit off. The stripped card keeps its family, its reward and its tier, and from then on it pays on a trick of **any** suit: a wild Taker still has to take the trick, a wild Feeder still has to lose one, but neither cares what was played into it.

Wild cards climb the tier ladder by eating ordinary suited cards of the same family and reward — a bronze wild Taker (Blade) plus a bronze Bell-Taker (Blade) makes a silver wild Taker (Blade). **Wildness can never be lost:** if either card going into a combine is wild, the card coming out is wild, and there is no sequence of combines that walks a wild card back to a suit. A wildcard itself cannot be combined — every tier converts exactly one card, so merging two would halve your supply for nothing.

## Decisions still yours

- **The wildcard's stocking weight on both machines.** `SLOT_FAMILY_WEIGHTS[Skirmisher][Wildcard]` and `[Strongbox][Wildcard]`, both placeholder `1`. Worth knowing before you set it: because wildness is absorbing, one wildcard seeds a whole wild *line*, so what this rations is how many independent lines you can start, not how many wild cards you end up holding. The machine also has no per-card rarity — a low weight makes the card rarely *appear*, but on a visit where it does appear it is as likely as anything else on that strip.
- **Whether a silver or gold wildcard should do more than a bronze one.** Today all three convert exactly one card, and the tier is carried purely so the pull screen's "1 gold" readout is not a lie about the card it just handed over.
- **Every word on the new surfaces** — the band heading and its rule sentence, "Spend a wildcard", "Pick a card to make wild", "Cannot be made wild", "Make wild", both wild refusal messages, the wildcard-combine refusal, the wildcard's condition line, and the felt's "Spend this on the Manage Buffs screen." All placeholder copy.
- **The wild mark's drawing and its tint.** It is a six-armed asterisk borrowing `--wc-brass`; wildness is carried by the shape and by the word "Wild" in the card's name, so it survives greyscale, but the glyph and whether it wants a colour of its own are your eye.

## Judge these by playing

- **Does it feel right that the wild pile owns the combine?** A lone Bell-Taker reads "nothing to pair it with" while the wild Taker beside it offers the combine that would eat that very Bell-Taker.
- **Does the auto-picked fodder feel right?** Every eligible partner differs only in suit and the combine discards the suit, so the lowest id is taken and named on the tile before you arm it. Choosing it explicitly would be a second selection step.
- **Does the whole pile eventually become raw material for wild lines?** The end state the ticket says to watch.

## Verification

Typecheck (`npm run typecheck`) exits 0. Scoped Vitest across every spec this contract touched: **317 passed** across 13 engine spec files and **120 passed** across 11 app spec files, 0 failed. Grep audits clean: no React import, DOM global or `Math.random()` in `src/hunt/**` or `src/sim/**`; browser storage untouched (the same three pre-existing hits `.claude/rules/save-data-versioning.md` records); the wildcard's weight appears in exactly two places, both rows of `SLOT_FAMILY_WEIGHTS`.

Lint, the unfiltered suite and the production build run in this batch's central QA pass, not here.

**Nothing was seen running.** No browser pass ran, so the band's placement, the target grid's fit at a short viewport, the wild mark's legibility and the two-tap gesture's feel are all unverified.

## Two conventions this introduces

- **Wild cards are minted by transformation, never from a template.** `buffWild.ts`'s `mintWildAtTier` is the only path; giving a wild card a template would put an undealable card in the reel strip and the opening pile's draw and would dilute every existing suited template's weight.
- **An activated-card branch is a total `Record` over `BuffActivatedTemplateKind`, never a Cheat-or-else ternary.** Both `mintFromTemplate` and `slotSymbolFace` previously type-checked perfectly with a second activated kind flowing through them and would have minted and drawn it as a Cheat.

## One note for the simulator

The headless simulator now sees wildcards arrive in the pile and no policy can spend one, so a simulated run holding a wildcard is holding a dead card. Future simulated win rates therefore slightly **under**-estimate the real game.
