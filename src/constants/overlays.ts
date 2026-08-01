/**
 * SCRUM-3 AC7/AC8 debug-overlay toggles — the "debug-panel toggles" constants
 * category named in the react-frontend skill.
 *
 * These live here rather than in BoardOverlays.tsx, which conceptually owns the
 * overlay layer, because `eslint-plugin-react-refresh`'s
 * `only-export-components` rule fails a component file that also exports a
 * value. Its `allowConstantExport` option permits only primitive literals, and
 * NO_OVERLAYS is an object — so the rule's own prescribed remedy ("use a new
 * file to share constants") is the fix. BoardOverlays.tsx re-exports the type,
 * which the rule ignores, so `import type { OverlayFlags } from './BoardOverlays'`
 * still resolves for the board and the debug panel.
 */
export interface OverlayFlags {
  rects: boolean
  vertices: boolean
  crossings: boolean
}

/** Every overlay off — SCRUM-3 AC7's default, so a fresh board carries no
 *  instrumentation until the developer asks for it. */
export const NO_OVERLAYS: OverlayFlags = { rects: false, vertices: false, crossings: false }
