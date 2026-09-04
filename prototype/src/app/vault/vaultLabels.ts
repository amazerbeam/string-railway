import { BuffTier, RunOutcome, templateById, type Coins } from '../../hunt'
import {
  VAULT_EXCHANGE_RATE,
  VAULT_ODDS_BOOST_MAX_STACKS,
  VAULT_ODDS_BOOST_PRICE,
  VAULT_STARTING_TIER_PRICE,
  VaultSpendRefusal,
  type TemplateGrant,
} from '../../vault'
import { SaveReadOutcome, SaveWriteOutcome } from '../../persistence'
import { slotSymbolText } from '../run/slotLabels'
import { creditedFromRun } from './vaultRunCredit'

/**
 * DLR-118 — every user-facing string on the Vault screen (`VaultScreen`).
 *
 * ALL PLACEHOLDER COPY — the wording, including the currency noun "mark"/"marks", is the
 * developer's, exactly as `slotLabels.ts` and `shopLabels.ts` mark their own. Every FIGURE is
 * interpolated from `src/vault/vaultConfig.ts` — `VAULT_EXCHANGE_RATE`, `VAULT_ODDS_BOOST_PRICE`,
 * `VAULT_ODDS_BOOST_MAX_STACKS`, `VAULT_STARTING_TIER_PRICE` — never quoted, so a re-tuned rate,
 * price or cap cannot leave this screen reading a number the engine no longer uses.
 */

export const VAULT_TITLE = 'The Vault'
export const VAULT_CURRENCY_SINGULAR = 'mark'
export const VAULT_CURRENCY_PLURAL = 'marks'
export const VAULT_LEDGER_GROUP_LABEL = 'What the Vault holds'
export const VAULT_HOLDINGS_GROUP_LABEL = 'Boosts and queued cards'
export const VAULT_SPEND_GROUP_LABEL = 'Spend your marks'
export const VAULT_FAMILY_SELECT_LABEL = 'Card family'
export const VAULT_TEMPLATE_SELECT_LABEL = 'Card'
export const VAULT_LEAVE_LABEL = 'Start a new run'
export const VAULT_EMPTY_TEXT = 'The Vault is empty. Nothing has been banked yet.'
export const VAULT_NO_BOOSTS_TEXT = 'No odds boosts held.'
export const VAULT_NO_GRANTS_TEXT = 'No starting cards queued.'
export const VAULT_ODDS_BOOST_LABEL = 'Raise this card’s odds'

/** Total over `BuffTier`, so a fourth tier is a compile error here rather than a blank sentence
 *  on screen — mirrors `slotLabels.ts`'s `SLOT_TIER_LABEL`. */
export const VAULT_TIER_LABEL: Readonly<Record<BuffTier, string>> = {
  [BuffTier.Bronze]: 'Bronze',
  [BuffTier.Silver]: 'Silver',
  [BuffTier.Gold]: 'Gold',
}

/** Total over `SaveReadOutcome`. `Loaded` and `Empty` are `null` — neither is a failure; a
 *  first-ever run gets `VAULT_EMPTY_TEXT`, not an alert. `Corrupt` and `VersionMismatch` both
 *  state DLR-113's decided behaviour, cited from `.docs/implementation/vault/README.md` and never
 *  re-derived: the unreadable record is left on disk untouched, and this session starts from an
 *  empty Vault. `Unavailable` says the Vault works for this session but will not be remembered. */
export const VAULT_READ_PROBLEM: Readonly<Record<SaveReadOutcome, string | null>> = {
  [SaveReadOutcome.Loaded]: null,
  [SaveReadOutcome.Empty]: null,
  [SaveReadOutcome.Corrupt]:
    'Your saved Vault could not be read. It has been left on disk untouched, and this session starts from an empty Vault.',
  [SaveReadOutcome.VersionMismatch]:
    'Your saved Vault was written by a different version of the game. It has been left on disk untouched, and this session starts from an empty Vault.',
  [SaveReadOutcome.Unavailable]:
    'Storage is unavailable. The Vault works for this session, but nothing will be remembered.',
}

/** Total over `SaveWriteOutcome`. `Written` is `null` — the happy path says nothing. */
export const VAULT_WRITE_PROBLEM: Readonly<Record<SaveWriteOutcome, string | null>> = {
  [SaveWriteOutcome.Written]: null,
  [SaveWriteOutcome.Rejected]: 'That purchase could not be saved. It may not survive a reload.',
  [SaveWriteOutcome.Unavailable]:
    'Storage is unavailable. That purchase will not be remembered after this session.',
}

/** Total over `VaultSpendRefusal`. */
export const VAULT_REFUSAL_MESSAGE: Readonly<Record<VaultSpendRefusal, string>> = {
  [VaultSpendRefusal.NotEnoughCurrency]: 'You do not have the marks for this.',
  [VaultSpendRefusal.UnknownTemplate]: 'This card is not available.',
  [VaultSpendRefusal.BoostMaxed]: 'This card’s odds are already raised as far as they can go.',
}

/** Singular/plural through the two currency-noun constants — mirrors `slotPullPriceText`. */
export function currencyText(amount: number): string {
  return `${amount} ${amount === 1 ? VAULT_CURRENCY_SINGULAR : VAULT_CURRENCY_PLURAL}`
}

export function vaultBalanceText(balance: number): string {
  return `You hold ${currencyText(balance)}.`
}

/** Three branches: a lost run that converted something; a lost run whose coins were below the
 *  exchange rate (quoting `VAULT_EXCHANGE_RATE` by interpolation); and a non-lost run, which
 *  pays nothing in. Calls `creditedFromRun` — never its own arithmetic — so the loss-only rule
 *  stays stated in exactly one place. */
export function vaultDepositText(outcome: RunOutcome, coins: Coins): string {
  if (outcome !== RunOutcome.Lost) {
    return 'A won run pays nothing into the Vault — a win is its own reward.'
  }
  const credited = creditedFromRun(outcome, coins)
  if (credited === 0) {
    return `This run's leftover coin did not reach ${VAULT_EXCHANGE_RATE} — nothing converted.`
  }
  return `This run paid in ${currencyText(credited)}.`
}

export function vaultDroppedText(droppedCount: number): string {
  return `${droppedCount} saved ${droppedCount === 1 ? 'entry' : 'entries'} could not be restored and ${droppedCount === 1 ? 'was' : 'were'} dropped.`
}

/** A held boost's stack count, in words — the price the NEXT stack costs is
 *  `VAULT_ODDS_BOOST_PRICE`, interpolated, never quoted, and the cap is `VAULT_ODDS_BOOST_MAX_STACKS`. */
export function oddsBoostText(stacks: number): string {
  return `${stacks} of ${VAULT_ODDS_BOOST_MAX_STACKS} stacks`
}

/** The odds-boost control's accessible name — price then refusal, mirroring
 *  `slotPullAccessibleName` / `shopItemAccessibleName`. */
export function oddsBoostAccessibleName(stacks: number, refusal: VaultSpendRefusal | null): string {
  const base = `${VAULT_ODDS_BOOST_LABEL} — ${currencyText(VAULT_ODDS_BOOST_PRICE)} — ${oddsBoostText(stacks)}`
  return refusal === null ? base : `${base} — ${VAULT_REFUSAL_MESSAGE[refusal]}`
}

/** The starting-tier control's accessible name — price then refusal, same idiom. */
export function startingTierAccessibleName(
  tier: BuffTier,
  refusal: VaultSpendRefusal | null,
): string {
  const base = `${VAULT_TIER_LABEL[tier]} — ${currencyText(VAULT_STARTING_TIER_PRICE[tier])}`
  return refusal === null ? base : `${base} — ${VAULT_REFUSAL_MESSAGE[refusal]}`
}

/** One queued grant, worded through `slotSymbolText` — DLR-114's one buff grammar, reached the
 *  way `slotLabels.ts` already reaches it. Falls back to the raw id rather than throwing when
 *  `templateById` cannot resolve it (a save written by an older build). */
export function grantLineText(grant: TemplateGrant): string {
  const template = templateById(grant.templateId)
  const worded = template === undefined ? grant.templateId : slotSymbolText(template)
  return `${VAULT_TIER_LABEL[grant.tier]} — ${worded}`
}

/** One held boost, worded the same way, falling back to the raw id when the template is gone. */
export function boostLineText(templateId: string, stacks: number): string {
  const template = templateById(templateId)
  const worded = template === undefined ? templateId : slotSymbolText(template)
  return `${worded} — ${oddsBoostText(stacks)}`
}
