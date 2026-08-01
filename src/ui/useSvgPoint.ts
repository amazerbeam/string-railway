import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { Point } from '../rules/types'

/**
 * Client coordinates → board world coordinates. getScreenCTM accounts for the
 * viewBox AND for preserveAspectRatio="xMidYMid meet"'s letterboxing, which
 * hand-rolled maths over getBoundingClientRect would have to reproduce.
 *
 * The DOM half of the split: src/rules/staging.ts takes it from a world Point
 * onward. Returns null — never a NaN-bearing Point — when the matrix is
 * unavailable (not yet laid out, or display:none). A NaN coordinate would reach
 * the ghost's transform and render it nowhere, with no error.
 */
export function useSvgPoint(
  svgRef: RefObject<SVGSVGElement | null>,
): (event: ReactPointerEvent<SVGSVGElement>) => Point | null {
  return (event) => {
    const svg = svgRef.current
    if (svg === null) {
      return null
    }
    const screenToWorld = svg.getScreenCTM()?.inverse()
    if (!screenToWorld) {
      return null
    }
    const world = new DOMPoint(event.clientX, event.clientY).matrixTransform(screenToWorld)
    if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) {
      return null
    }
    return { x: world.x, y: world.y }
  }
}
