// Where every moving part of the bulb scene belongs at a step (index into the module's `steps`).
// 0 or 1 each; the scene eases toward them.
export function bulbPose(step: number) {
  const on = (b: boolean) => (b ? 1 : 0)
  return {
    switchOn: on(step === 0 || step === 10),
    breakerOn: on(step < 2 || step > 8),
    hot: on(step < 3),
    ladderOpen: on(step >= 4),
    // each of these two is a whole trip up the ladder and back down
    oldOut: on(step >= 5),
    newIn: on(step >= 7),
    newPicked: on(step >= 6),
    binned: on(step >= 8),
    lit: on(step === 10),
    // camera: 1 moves in on the wall with the switch, DB box and clock
    wallView: on(step <= 2 || step === 8 || step === 9),
  }
}

export type Pose = ReturnType<typeof bulbPose>

// What a wrong click looks like. Everything without a physical consequence just shakes.
export function slipEffect(step: number, target: string) {
  if (target === 'new-100w') return 'overheat'
  if (target !== 'bulb') return 'shake'
  if (step === 0) return 'spark'
  if (step === 2) return 'burn'
  // no ladder yet: he stretches for it
  if (step === 3) return 'wobble'
  return 'shake'
}
