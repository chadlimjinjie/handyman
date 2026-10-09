// Where every moving part of the breaker scene belongs at a step (index into the module's
// `steps`). 0 or 1 each; the scene eases toward them.
export function breakerPose(step: number) {
  const on = (b: boolean) => (b ? 1 : 0)
  return {
    // down at the start, and again when the kitchen circuit is switched back onto the fault
    rccbUp: on((step >= 2 && step < 5) || step >= 7),
    lightsMcb: on(step === 0 || step >= 3),
    roomsMcb: on(step === 0 || step >= 4),
    kitchenMcb: on(step === 0 || step === 5 || step >= 9),
    kettleIn: on(step < 8),
    // camera: 1 is close on the distribution board, 0 takes in the kitchen
    closeUp: on(step < 7 || step === 8),
  }
}

export type Pose = ReturnType<typeof breakerPose>

// What a wrong click looks like. Everything without a physical consequence just shakes.
export function slipEffect(step: number, target: string) {
  if (target === 'tape') return 'spark'
  // the fault is still connected, so the RCCB will not stay up
  if ((step === 0 || step === 5) && target === 'rccb') return 'trip'
  if (step === 7 && target === 'mcb-kitchen') return 'trip'
  return 'shake'
}
