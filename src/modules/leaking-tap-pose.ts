// Where every moving part of the tap scene belongs at a step (index into the module's `steps`).
// 0 or 1 each; the scene eases toward them.
export function tapPose(step: number) {
  const on = (b: boolean) => (b ? 1 : 0)
  return {
    dripping: on(step === 0),
    valveShut: on(step >= 1 && step < 9),
    tapOpen: on(step >= 2 && step < 10),
    stopperIn: on(step >= 3),
    handleOff: on(step >= 4 && step < 8),
    // the headgear is the valve that screws into the tap body, with the washer on its end
    headOut: on(step >= 5 && step < 7),
    washerNew: on(step >= 6),
    flowing: on(step === 9),
  }
}

export type Pose = ReturnType<typeof tapPose>

// What a wrong click looks like. Everything without a physical consequence just shakes.
export function slipEffect(step: number, target: string) {
  // the tap body opened, or about to be, with mains pressure behind it
  if (step === 0 && (target === 'handle' || target === 'spanner')) return 'jet'
  if (step >= 4 && step < 8 && target === 'valve') return 'jet'
  // the handle screw, with nothing over the drain
  if (step === 2 && target === 'handle') return 'drop'
  return 'shake'
}
