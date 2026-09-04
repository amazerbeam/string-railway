import { useState } from 'react'
import {
  BUFF_TEMPLATES,
  BuffTier,
  RunOutcome,
  templatesForFamily,
  type BuffTemplate,
  type Coins,
} from '../../hunt'
import {
  buyOddsBoost,
  buyStartingTier,
  oddsBoostRefusalFor,
  startingTierRefusalFor,
  VAULT_ODDS_BOOST_PRICE,
  VaultSpendRefusal,
  type VaultState,
} from '../../vault'
import { slotSymbolText } from '../run/slotLabels'
import { BUFF_FAMILY_WORD } from '../warCouncil/buffLabels'
import type { VaultHandle } from './useVault'
import {
  boostLineText,
  currencyText,
  grantLineText,
  oddsBoostAccessibleName,
  startingTierAccessibleName,
  vaultBalanceText,
  vaultDepositText,
  vaultDroppedText,
  VAULT_EMPTY_TEXT,
  VAULT_FAMILY_SELECT_LABEL,
  VAULT_LEAVE_LABEL,
  VAULT_LEDGER_GROUP_LABEL,
  VAULT_ODDS_BOOST_LABEL,
  VAULT_READ_PROBLEM,
  VAULT_REFUSAL_MESSAGE,
  VAULT_SPEND_GROUP_LABEL,
  VAULT_TEMPLATE_SELECT_LABEL,
  VAULT_TIER_LABEL,
  VAULT_TITLE,
  VAULT_WRITE_PROBLEM,
} from './vaultLabels'
import '../run/run.css'
import './vault.css'

export interface VaultScreenProps {
  readonly handle: VaultHandle
  /** The finished run's outcome — the only thing that decides whether a deposit happened. */
  readonly outcome: RunOutcome
  /** `run.coins`, NOT zeroed. Read only to word what was (or was not) converted. */
  readonly leftoverCoins: Coins
  readonly onLeave: () => void
}

/** Every distinct family, in `BUFF_TEMPLATES`' own declaration order — a `Set` preserves first-seen
 *  insertion order, and `BUFF_TEMPLATES` is generated family-by-family, so this needs no separate
 *  ordering table. */
const BUFF_FAMILIES: readonly BuffTemplate['kind'][] = Array.from(
  new Set(BUFF_TEMPLATES.map((template) => template.kind)),
)

const BUY_TIERS: readonly BuffTier[] = Object.values(BuffTier)

/** `noUncheckedIndexedAccess` is off in this project, so `BUFF_FAMILIES[0]` types as non-optional
 *  and TypeScript will not catch an empty `BUFF_TEMPLATES`. Not a live bug — `BUFF_TEMPLATES` is a
 *  non-empty generated constant — but this makes the invariant explicit rather than trusting an
 *  unguarded index, mirroring `mintFromTemplate`'s throw-guard idiom in `hunt/buffTemplates.ts`. */
const FIRST_BUFF_FAMILY = BUFF_FAMILIES[0]
if (FIRST_BUFF_FAMILY === undefined) {
  throw new RangeError('BUFF_TEMPLATES produced no families for the Vault screen')
}

/**
 * DLR-118 — the Vault's own screen: a full-viewport surface reached from the terminal run
 * verdict. A CONTAINER, not a pure panel — it owns the two spend handlers and the two selection
 * `useState`s locally, because nothing outside this screen reads that selection. Every figure and
 * every refusal comes from `src/vault/`; every sentence about a card comes from DLR-114's one buff
 * grammar (`slotSymbolText`, reached via `boostLineText`/`grantLineText` and directly for the
 * card select's own options) — this component never calls `apCostOf` and never handles a `Buff`.
 */
export default function VaultScreen({ handle, outcome, leftoverCoins, onLeave }: VaultScreenProps) {
  const [selectedKind, setSelectedKind] = useState<BuffTemplate['kind']>(FIRST_BUFF_FAMILY)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templatesForFamily(FIRST_BUFF_FAMILY)[0]?.id ?? '',
  )

  const templates = templatesForFamily(selectedKind)

  function selectFamily(kind: BuffTemplate['kind']): void {
    setSelectedKind(kind)
    setSelectedTemplateId(templatesForFamily(kind)[0]?.id ?? '')
  }

  // The refusal is RE-DERIVED here, inside the updater, against whichever vault this call
  // actually sees — not read from the render's stale `handle.vault` closure. Mirrors
  // `App.tsx`'s `handleBuy`/`handleDrinkFlask` exactly: two `buy` calls landing before React
  // re-renders (a double-click, or a fast repeated Enter/Space activation) would otherwise both
  // pass the outer guard against the same stale vault, and the second would reach
  // `buyOddsBoost`/`buyStartingTier` with the purchase already refused and hit their deliberate
  // throw. No-op instead, so `oddsBoostRefusalFor`/`startingTierRefusalFor` stay the only source
  // of truth and that throw stays reachable only from a genuine driver bug.
  function buyBoost(): void {
    if (templates.length === 0 || selectedTemplateId === '') return
    const id = selectedTemplateId
    handle.commit((v: VaultState) =>
      oddsBoostRefusalFor(v, id) !== null ? v : buyOddsBoost(v, id),
    )
  }

  function buyTier(tier: BuffTier): void {
    if (templates.length === 0 || selectedTemplateId === '') return
    const id = selectedTemplateId
    handle.commit((v: VaultState) =>
      startingTierRefusalFor(v, id, tier) !== null ? v : buyStartingTier(v, id, tier),
    )
  }

  const readProblem = VAULT_READ_PROBLEM[handle.loadOutcome]
  const writeProblem =
    handle.lastWriteOutcome === null ? null : VAULT_WRITE_PROBLEM[handle.lastWriteOutcome]
  const droppedText = handle.droppedCount > 0 ? vaultDroppedText(handle.droppedCount) : null
  const alertText = readProblem ?? writeProblem ?? droppedText

  // Keyed on position plus identity, not on the rendered sentence: `boostLineText` keys are
  // unique by construction (`oddsBoosts` is a `Record<templateId, stacks>`), but `grantLineText`
  // is not — two purchases of the same template at the same tier produce two identical
  // `TemplateGrant` entries and therefore two identical strings. Index is safe here because this
  // list is derived fresh from `vault` state each render and never reordered by the user.
  const holdings = [
    ...Object.entries(handle.vault.oddsBoosts).map(([id, stacks]) => ({
      key: `boost-${id}`,
      text: boostLineText(id, stacks),
    })),
    ...handle.vault.startingGrants.map((grant, index) => ({
      key: `grant-${index}-${grant.templateId}-${grant.tier}`,
      text: grantLineText(grant),
    })),
  ]

  const oddsRefusal =
    templates.length === 0 || selectedTemplateId === ''
      ? VaultSpendRefusal.UnknownTemplate
      : oddsBoostRefusalFor(handle.vault, selectedTemplateId)

  return (
    <div className="run-shell">
      <div
        className="vault-screen"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onLeave()
        }}
      >
        <h1 className="vault-title">{VAULT_TITLE}</h1>

        {alertText !== null && (
          <p className="vault-alert" role="alert">
            {alertText}
          </p>
        )}

        <section className="vault-ledger" role="group" aria-label={VAULT_LEDGER_GROUP_LABEL}>
          <span className="vault-group-label">{VAULT_LEDGER_GROUP_LABEL}</span>
          <p className="vault-deposit" role="status">
            {vaultDepositText(outcome, leftoverCoins)}
          </p>
          <p className="vault-balance">{vaultBalanceText(handle.vault.balance)}</p>
          <ul className="vault-holdings">
            {holdings.length === 0 ? (
              <li>{VAULT_EMPTY_TEXT}</li>
            ) : (
              holdings.map(({ key, text }) => <li key={key}>{text}</li>)
            )}
          </ul>
        </section>

        <section className="vault-spend" role="group" aria-label={VAULT_SPEND_GROUP_LABEL}>
          <span className="vault-group-label">{VAULT_SPEND_GROUP_LABEL}</span>
          <div className="vault-choosers">
            <label className="vault-chooser">
              {VAULT_FAMILY_SELECT_LABEL}
              <select
                aria-label={VAULT_FAMILY_SELECT_LABEL}
                value={selectedKind}
                onChange={(e) => selectFamily(e.target.value as BuffTemplate['kind'])}
              >
                {BUFF_FAMILIES.map((kind) => (
                  <option key={kind} value={kind}>
                    {BUFF_FAMILY_WORD[kind]}
                  </option>
                ))}
              </select>
            </label>

            {templates.length > 0 && (
              <label className="vault-chooser">
                {VAULT_TEMPLATE_SELECT_LABEL}
                <select
                  aria-label={VAULT_TEMPLATE_SELECT_LABEL}
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {slotSymbolText(template)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="vault-buys">
            <button
              type="button"
              className="run-btn is-primary"
              disabled={oddsRefusal !== null}
              onClick={buyBoost}
              aria-label={oddsBoostAccessibleName(
                selectedTemplateId === '' ? 0 : (handle.vault.oddsBoosts[selectedTemplateId] ?? 0),
                oddsRefusal,
              )}
            >
              {VAULT_ODDS_BOOST_LABEL} — {currencyText(VAULT_ODDS_BOOST_PRICE)}
            </button>
            {BUY_TIERS.map((tier) => {
              const refusal =
                templates.length === 0 || selectedTemplateId === ''
                  ? VaultSpendRefusal.UnknownTemplate
                  : startingTierRefusalFor(handle.vault, selectedTemplateId, tier)
              return (
                <button
                  key={tier}
                  type="button"
                  className="run-btn"
                  disabled={refusal !== null}
                  onClick={() => buyTier(tier)}
                  aria-label={startingTierAccessibleName(tier, refusal)}
                >
                  {VAULT_TIER_LABEL[tier]}
                </button>
              )
            })}
          </div>
          <p className="vault-refusal" role="status">
            {oddsRefusal === null ? '' : VAULT_REFUSAL_MESSAGE[oddsRefusal]}
          </p>
        </section>

        <div className="run-actions">
          <button type="button" className="run-btn is-primary" onClick={onLeave}>
            {VAULT_LEAVE_LABEL}
          </button>
        </div>
      </div>
    </div>
  )
}
