export const LOOP = 10
// a moment in the lit hold: the still frame shown when motion is reduced
export const LIT_AT = 6.5

// smoothstep from 0 at `a` to 1 at `b`
function ramp(t: number, a: number, b: number) {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

export function pose(seconds: number) {
  const t = ((seconds % LOOP) + LOOP) % LOOP
  return {
    climb: ramp(t, 0.5, 3) - ramp(t, 7.3, 9.3),
    armReach: ramp(t, 3, 4) - ramp(t, 5.4, 6.2),
    // whole turns, so the hand is back at rest when the loop restarts
    twist: ramp(t, 4, 5) * Math.PI * 4,
    lit: ramp(t, 4.8, 5.1) - ramp(t, 9.3, LOOP),
  }
}

export const UPPER_ARM = 0.3
// elbow to the middle of the hand
export const FOREARM = 0.34

// Two-bone IK in the y-z plane. A limb hangs along -y and rotation.x swings it toward -z.
// Returns the [shoulder, elbow] rotation.x that puts the hand at (y, z) from the shoulder,
// elbow pointing down; out-of-reach targets get a straight arm pointing at them.
export function armTo(y: number, z: number) {
  const d = Math.min(Math.hypot(y, z), UPPER_ARM + FOREARM - 1e-3)
  const inner = Math.acos((UPPER_ARM ** 2 + d ** 2 - FOREARM ** 2) / (2 * UPPER_ARM * d))
  const bend = Math.acos((UPPER_ARM ** 2 + FOREARM ** 2 - d ** 2) / (2 * UPPER_ARM * FOREARM))
  return [Math.atan2(-z, -y) - inner, Math.PI - bend] as const
}
