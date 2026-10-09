// Where every moving part of the shelf scene belongs at a step (index into the module's `steps`).
// 0 or 1 each; the scene eases toward them.
export function shelfPose(step: number) {
  const on = (b: boolean) => (b ? 1 : 0)
  return {
    scanned: on(step >= 1),
    marked: on(step >= 2),
    gogglesOn: on(step >= 3),
    bitIn: on(step >= 4),
    drilled: on(step >= 5),
    plugged: on(step >= 6),
    bracketsOn: on(step >= 7),
    shelfOn: on(step >= 8),
  }
}

export type Pose = ReturnType<typeof shelfPose>

// What a wrong click looks like. Everything without a physical consequence just shakes.
export function slipEffect(step: number, target: string) {
  // a hole over a buried cable: drilled blind, or marked in line with a fitting
  if (step === 0 && target === 'drill') return 'spark'
  if (step >= 1 && (target === 'spot-socket' || target === 'spot-switch')) return 'spark'
  if (target === 'bit-wood') return 'skate'
  if (target === 'drill' && step === 1) return 'tilt'
  if (target === 'drill' && step === 2) return 'dust'
  // nothing in the holes for the screws to grip
  if (step === 5 && (target === 'brackets' || target === 'shelf')) return 'sag'
  return 'shake'
}
