// Where every moving part of the fire scene belongs at a step (index into the module's `steps`).
// 0 or 1 each; the scene eases toward them.
export function firePose(step: number) {
  const on = (b: boolean) => (b ? 1 : 0)
  return {
    alarmOn: on(step >= 1),
    holding: on(step >= 2),
    atDoor: on(step >= 3),
    pinOut: on(step >= 4),
    aimed: on(step >= 5 && step < 8),
    squeezing: on(step === 6),
    burning: on(step < 7),
    backedOut: on(step >= 8),
    // camera: 1 moves in on the man, the extinguisher and the fire
    closeUp: on(step >= 3 && step <= 6),
  }
}

export type Pose = ReturnType<typeof firePose>

// What a wrong click looks like. Everything without a physical consequence just shakes.
export function slipEffect(step: number, target: string) {
  // a water-based jet on live electrics
  if (target === 'water' || target === 'foam') return 'shock'
  // the fire gets the better of him: cut off from the door, or powder wasted on the flames
  if (target === 'stand-corner' || (step === 4 && target === 'flames')) return 'flare'
  return 'shake'
}
