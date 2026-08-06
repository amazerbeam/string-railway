import { VanguardActionKind } from '../../vanguard'
import { ACTION_DESCRIPTION, ACTION_NAME, REJECTION_MESSAGE } from './labels'

export interface ActionPaletteProps {
  readonly enabled: Readonly<Record<VanguardActionKind, boolean>>
  readonly interactive: boolean
  readonly hint: string
}

// The closed set of strings `hint` can ever equal when it names a rejection —
// comparing against it is what lets `data-reject` react to the mount's hint
// cascade without threading a second boolean prop alongside the text.
const REJECTION_TEXTS = new Set<string>(Object.values(REJECTION_MESSAGE))

const ACTIONS = Object.values(VanguardActionKind)

/**
 * A read-only legend for the three Clash actions (AC2, revised by SCRUM-41):
 * cost/range reference only, no selection step. `enabled` — this action has
 * at least one legal target this turn — is the mount's own dry-run result,
 * not decided here. Tapping a board cell (VanguardBoardView) is the only way
 * to act; this list never receives a click handler.
 */
export default function ActionPalette({ enabled, interactive, hint }: ActionPaletteProps) {
  return (
    <div className="vg-palette">
      <p
        className="vg-hint"
        aria-live="polite"
        data-reject={REJECTION_TEXTS.has(hint) ? 'true' : undefined}
      >
        {hint}
      </p>
      <ul className="vg-actions" aria-label="Clash actions">
        {ACTIONS.map((kind) => (
          <li
            key={kind}
            className="vg-action"
            data-enabled={interactive && enabled[kind] ? 'true' : 'false'}
          >
            {ACTION_NAME[kind]}
            <small>{ACTION_DESCRIPTION[kind]}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}
