import { VanguardActionKind } from '../../vanguard'
import { ACTION_DESCRIPTION, ACTION_NAME, REJECTION_MESSAGE } from './labels'

export interface ActionPaletteProps {
  readonly selected: VanguardActionKind | null
  readonly enabled: Readonly<Record<VanguardActionKind, boolean>>
  readonly interactive: boolean
  readonly hint: string
  readonly onSelect: (action: VanguardActionKind) => void
}

// The closed set of strings `hint` can ever equal when it names a rejection —
// comparing against it is what lets `data-reject` react to the mount's hint
// cascade without threading a second boolean prop alongside the text.
const REJECTION_TEXTS = new Set<string>(Object.values(REJECTION_MESSAGE))

const ACTIONS = Object.values(VanguardActionKind)

/**
 * The three Clash actions (AC2). Decides nothing itself: `enabled` (this action
 * has at least one legal target) and `hint` both come from the mount, which is
 * the only place `legalTargetsFor` and rejection state live. Three controls is
 * under `game-ux`'s "about five" — natural tab stops, no roving tabindex.
 */
export default function ActionPalette({
  selected,
  enabled,
  interactive,
  hint,
  onSelect,
}: ActionPaletteProps) {
  return (
    <div className="vg-palette">
      <p
        className="vg-hint"
        aria-live="polite"
        data-reject={REJECTION_TEXTS.has(hint) ? 'true' : undefined}
      >
        {hint}
      </p>
      <div className="vg-actions" role="group" aria-label="Clash actions">
        {ACTIONS.map((kind) => (
          <button
            key={kind}
            type="button"
            className="vg-action"
            aria-pressed={selected === kind}
            disabled={!interactive || !enabled[kind]}
            onClick={() => onSelect(kind)}
          >
            {ACTION_NAME[kind]}
            <small>{ACTION_DESCRIPTION[kind]}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
