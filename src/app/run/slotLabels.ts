import {
  BuffTier,
  REEL_COUNT,
  REEL_POOL_SIZE,
  SlotMachineId,
  SlotOutcome,
  SlotPullRefusal,
  expectedCardsPerPull,
  mintFromTemplate,
  slotOutcomeOdds,
  type BuffTemplate,
  type Coins,
} from '../../hunt'
import { buffConditionSentence, buffName } from '../warCouncil/buffLabels'

/**
 * DLR-116 — every user-facing string on the slot surface (`SlotMachinePanel`).
 *
 * ALL PLACEHOLDER COPY — the wording is the developer's, exactly as `shopLabels.ts` marks its own.
 * Every FIGURE is interpolated from the engine, never quoted: the odds and the expected-cards
 * figure come from `slotOutcomeOdds()` / `expectedCardsPerPull()`, the strip size from
 * `REEL_POOL_SIZE`, the reel count from `REEL_COUNT`, the price from the caller's `pullPriceFor`
 * result. A re-tuned `REEL_POOL_SIZE` or `SLOT_FAMILY_WEIGHTS` therefore cannot leave this screen
 * quoting a stale percentage — the same failure `shopLabels.ts`'s prices already guard against.
 */

export const SLOT_SECTION_LABEL = 'The machines'
export const SLOT_MACHINE_GROUP_LABEL = 'Choose a machine'

export const SLOT_MACHINE_NAME: Readonly<Record<SlotMachineId, string>> = {
  [SlotMachineId.Skirmisher]: 'Skirmisher',
  [SlotMachineId.Strongbox]: 'Strongbox',
}

export const SLOT_STRIP_GROUP_LABEL = 'On this strip'
export const SLOT_RESULT_GROUP_LABEL = 'Your last pull'
export const SLOT_PULL_LABEL = 'Pull'
export const SLOT_FREE_TAG = 'Free'
/* `SLOT_NO_PULL_YET` was removed 2026-09-01. It stated "No pull yet this visit." in the result area
   before the first pull, on the DLR-89 rule that an empty region should say it is empty. That rule
   was REVERSED for this region: `game-ux` holds that a readout sitting in the same place every visit
   saying nothing teaches a player to stop looking at it — and the region where their won cards
   appear is the last one that should become invisible. The result area now renders nothing at all
   until there is a result. */
export const SLOT_SPINNING_LABEL = 'Spinning…'
export const SLOT_ODDS_GROUP_LABEL = 'What this machine pays'

/** AC1 — the outcome display's own words. Total over `SlotOutcome`, so a fourth outcome is a
 *  compile error here rather than a blank line on screen — the guarantee `PURCHASE_REFUSAL_MESSAGE`
 *  already gives. */
export const SLOT_OUTCOME_LABEL: Readonly<Record<SlotOutcome, string>> = {
  [SlotOutcome.AllDifferent]: 'Three different — three bronze',
  [SlotOutcome.TwoMatch]: 'Two matched — one silver and one bronze',
  [SlotOutcome.ThreeMatch]: 'Three matched — one gold',
}

/** Total over `SlotPullRefusal`, so a second reason code is a compile error here rather than a
 *  blank sentence on screen — mirrors `PURCHASE_REFUSAL_MESSAGE`. */
export const SLOT_REFUSAL_MESSAGE: Readonly<Record<SlotPullRefusal, string>> = {
  [SlotPullRefusal.NotEnoughCoins]: 'You do not have the coins for another pull.',
}

/** A price, in words — mirrors `priceText` in `shopLabels.ts`, but reads a pull's price rather
 *  than an item's, and a free pull reads `SLOT_FREE_TAG` rather than `'0 coins'`. */
export function slotPullPriceText(price: Coins): string {
  if (price === 0) return SLOT_FREE_TAG
  return `${price} coin${price === 1 ? '' : 's'}`
}

/** One row of the cabinet's payout table: a CODE plus three already-worded cells. The panel lays
 *  them out; it never composes a figure. */
export interface SlotOddsRow {
  readonly outcome: SlotOutcome
  /** What has to land, in the fewest words that still say it. */
  readonly match: string
  /** What it pays. */
  readonly pays: string
  /** How often, to one decimal place. */
  readonly chance: string
}

/** The posted odds as the three rows a real cabinet prints, replacing the one dense six-number
 *  sentence this screen used to open with. NO PERCENTAGE LITERAL anywhere: every figure below is
 *  derived from `slotOutcomeOdds()`, so a re-tuned `REEL_POOL_SIZE` or `SLOT_FAMILY_WEIGHTS` cannot
 *  leave this screen quoting a stale number. Ordered best-first, the way a payout table is read. */
export function slotOddsRows(): readonly SlotOddsRow[] {
  const odds = slotOutcomeOdds()
  const pct = (fraction: number) => `${(fraction * 100).toFixed(1)}%`
  return [
    {
      outcome: SlotOutcome.ThreeMatch,
      match: 'Three alike',
      pays: '1 gold',
      chance: pct(odds[SlotOutcome.ThreeMatch]),
    },
    {
      outcome: SlotOutcome.TwoMatch,
      match: 'Two alike',
      pays: '1 silver + 1 bronze',
      chance: pct(odds[SlotOutcome.TwoMatch]),
    },
    {
      outcome: SlotOutcome.AllDifferent,
      match: 'All different',
      pays: '3 bronze',
      chance: pct(odds[SlotOutcome.AllDifferent]),
    },
  ]
}

/** The strip's own summary: how many symbols across how many reels, and what a pull is worth on
 *  average. Both figures derived, never quoted. */
export function slotStripSummaryText(): string {
  const expected = expectedCardsPerPull().toFixed(2)
  return `${REEL_POOL_SIZE} symbols on ${REEL_COUNT} reels — ${expected} cards a pull on average.`
}

/** The pull control's accessible name — folds in the refusal so a screen-reader user hears why a
 *  disabled control refuses without hunting for the sentence beside it, mirrored from
 *  `shopItemAccessibleName`. */
export function slotPullAccessibleName(price: Coins, refusal: SlotPullRefusal | null): string {
  const base = `${SLOT_PULL_LABEL} — ${slotPullPriceText(price)}`
  return refusal === null ? base : `${base} — ${SLOT_REFUSAL_MESSAGE[refusal]}`
}

/** The machine chooser's per-control accessible name — folds in the selected state so a
 *  screen-reader user hears which machine is current without reading `aria-checked` separately. */
export function slotMachineAccessibleName(id: SlotMachineId, selected: boolean): string {
  const base = SLOT_MACHINE_NAME[id]
  return selected ? `${base} — selected` : base
}

/** A throwaway id purely for wording — this mint is never a real card, never rendered as one, and
 *  never touches `RunState.buffs`. A strip symbol is a `BuffTemplate`, which carries no tier
 *  (`buffTemplates.ts`'s own comment), so it is minted at `BuffTier.Bronze` purely to reach
 *  `buffName`/`buffConditionSentence` — DLR-114's ONE grammar for describing a buff, reused here
 *  rather than re-invented. No tier is being claimed about the strip symbol itself. */
export function slotSymbolText(template: BuffTemplate): string {
  const wordingOnly = mintFromTemplate(template, BuffTier.Bronze, 0)
  return `${buffName(wordingOnly)} — ${buffConditionSentence(wordingOnly)}`
}
