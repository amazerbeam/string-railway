export const FAN_ROTATION_STEP_DEG = 2.1
export const FAN_LIFT_FACTOR = 0.13
export const FAN_OVERLAP_PX = { loose: -4, medium: -10, tight: -18 } as const
export const FAN_ARMED_Z_INDEX = 20

export interface FanPlacement {
  readonly rotateDeg: number
  readonly liftPct: number
  readonly overlapPx: number
  readonly zIndex: number
}

export function fanPlacement(index: number, count: number, armed: boolean): FanPlacement {
  const spread = count > 1 ? index - (count - 1) / 2 : 0
  const overlapPx =
    index === 0
      ? 0
      : count > 9
        ? FAN_OVERLAP_PX.tight
        : count > 6
          ? FAN_OVERLAP_PX.medium
          : FAN_OVERLAP_PX.loose

  return {
    rotateDeg: spread * FAN_ROTATION_STEP_DEG,
    liftPct: Math.abs(spread) ** 2 * FAN_LIFT_FACTOR,
    overlapPx,
    zIndex: armed ? FAN_ARMED_Z_INDEX : index,
  }
}
