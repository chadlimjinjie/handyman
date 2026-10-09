// Where every moving part of the sink scene belongs at a step (index into the module's `steps`).
// 0 or 1 each; the scene eases toward them.
export function sinkPose(step: number) {
  const on = (b: boolean) => (b ? 1 : 0)
  return {
    bucketUnder: on(step >= 1),
    trapOff: on(step === 2 || step === 3),
    trapClean: on(step >= 3),
    sinkFull: on(step < 2),
    bucketFull: on(step >= 2),
    tapOn: on(step >= 5),
  }
}

export type Pose = ReturnType<typeof sinkPose>

// What a wrong click looks like. Everything without a physical consequence just shakes.
export function slipEffect(step: number, target: string) {
  if (target === 'cleaner') return 'caustic'
  if (target === 'wrench') return 'crack'
  // water with nowhere to go but the cabinet floor
  if ((step === 0 && target === 'trap') || ((step === 2 || step === 3) && target === 'tap')) {
    return 'splash'
  }
  return 'shake'
}
