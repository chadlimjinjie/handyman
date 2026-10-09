// Where every moving part of the plug scene belongs at a step (index into the module's `steps`).
// 0 or 1 each; the scene eases toward them.
export function plugPose(step: number) {
  const on = (b: boolean) => (b ? 1 : 0)
  return {
    socketOn: on(step === 0 || step === 12),
    oldIn: on(step < 2),
    newIn: on(step > 10),
    coverOff: on(step >= 3 && step <= 9),
    stripped: on(step >= 4),
    wireE: on(step > 4),
    wireN: on(step > 5),
    wireL: on(step > 6),
    gripped: on(step >= 8),
    fuseIn: on(step >= 9),
    fanOn: on(step === 12),
    // camera: 0 frames the wall, socket and fan; 1 moves in on the bench
    closeUp: on(step >= 2 && step <= 10),
  }
}

export type Pose = ReturnType<typeof plugPose>

// What a wrong click looks like. Everything without a physical consequence just shakes.
export function slipEffect(step: number, target: string) {
  if (target === 'fuse-13a' || target === 'fuse-foil') return 'heat'
  // wires are in but the grip is loose: a tug pulls them out
  if (step === 7 && (target === 'fuse-3a' || target === 'cover')) return 'tug'
  if (
    (step < 2 && target === 'strip') ||
    (step === 4 && target === 'term-l') ||
    (step === 6 && target === 'term-e') ||
    (step >= 2 && step < 10 && target === 'plug')
  ) {
    return 'spark'
  }
  return 'shake'
}
