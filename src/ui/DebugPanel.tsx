import { useState } from 'react'
import { COLOUR_SEATS } from '../constants/setup'
import { hashSeed } from '../rules/rng'
import './DebugPanel.css'
import type { OverlayFlags } from './BoardOverlays'
import type { ColourId, GameState } from '../rules/types'

/** SCRUM-3 AC7's three overlays, declared once so the label and the flag key
 *  cannot drift apart. */
const OVERLAY_TOGGLES: ReadonlyArray<{ key: keyof OverlayFlags; label: string }> = [
  { key: 'rects', label: 'Station bounding rects' },
  { key: 'vertices', label: 'Sampled string vertices' },
  { key: 'crossings', label: 'Detected crossing points' },
]

interface DebugPanelProps {
  state: GameState
  seed: number
  flags: OverlayFlags
  onFlagsChange: (flags: OverlayFlags) => void
  onRegenerate: (seed: number) => void
}

function DebugPanel({ state, seed, flags, onFlagsChange, onRegenerate }: DebugPanelProps) {
  // AC8 — defaults to off, so a play-test cannot accidentally run with scores
  // revealed. Local UI state, not game state, so it belongs in useState.
  const [open, setOpen] = useState(false)
  const [seedInput, setSeedInput] = useState('')

  return (
    <section className="debug" aria-label="Debug tools">
      <button
        type="button"
        className="debug__toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        {open ? 'Hide debug tools' : 'Show debug tools'}
      </button>

      {open && (
        <div className="debug__body">
          <p className="debug__warning">
            Debug view — scores are hidden from other players during normal play (§10.5).
          </p>

          <h3 className="debug__heading">Scores</h3>
          <ul className="debug__scores">
            {state.turnOrder.map((colour, index) => {
              const seat = state.seats.find((candidate) => candidate.colour === colour)
              if (!seat) {
                return null
              }
              return (
                <li className="debug__score" key={String(colour)}>
                  <span
                    className="debug__swatch"
                    style={{ background: displayFor(colour) }}
                    aria-hidden="true"
                  />
                  <span>
                    {labelFor(colour)} ({String(seat.owner)})
                    {index === state.activeSeatIndex ? ' — active' : ''}
                  </span>
                  <strong>{seat.score}</strong>
                </li>
              )
            })}
          </ul>

          <h3 className="debug__heading">Seed</h3>
          <p className="debug__seed">
            Current: <code>{seed}</code>
          </p>
          <form
            className="debug__seed-form"
            onSubmit={(event) => {
              event.preventDefault()
              onRegenerate(parseSeed(seedInput, seed))
            }}
          >
            <label className="debug__label" htmlFor="debug-seed">
              Regenerate from seed
            </label>
            <input
              id="debug-seed"
              className="debug__input"
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              placeholder={String(seed)}
            />
            <button type="submit" className="debug__button">
              Regenerate
            </button>
          </form>

          <h3 className="debug__heading">Geometry overlays</h3>
          <ul className="debug__overlays">
            {OVERLAY_TOGGLES.map(({ key, label }) => (
              <li key={key}>
                <label className="debug__checkbox">
                  <input
                    type="checkbox"
                    checked={flags[key]}
                    onChange={(event) => onFlagsChange({ ...flags, [key]: event.target.checked })}
                  />
                  {label}
                </label>
              </li>
            ))}
          </ul>
          <p className="debug__note">
            No railway strings exist until one is placed, so a fresh board shows no crossing points.
          </p>

          <p className="debug__note">
            <code>rules.json</code> is read once at startup. Editing it applies on the next page
            load, not to the game in progress.
          </p>
        </div>
      )}
    </section>
  )
}

/**
 * A seed is user input, so it is sanitised at the boundary: a plain integer is
 * used directly, any other text is hashed to a usable 32-bit seed, and empty
 * falls back to the current one rather than to NaN.
 */
function parseSeed(text: string, fallback: number): number {
  const trimmed = text.trim()
  if (trimmed === '') {
    return fallback
  }
  const asNumber = Number(trimmed)
  if (Number.isFinite(asNumber) && Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber >>> 0
  }
  return hashSeed(trimmed)
}

function displayFor(colour: ColourId): string {
  return COLOUR_SEATS.find((seat) => seat.id === String(colour))?.display ?? '#888888'
}

function labelFor(colour: ColourId): string {
  return COLOUR_SEATS.find((seat) => seat.id === String(colour))?.label ?? String(colour)
}

export default DebugPanel
