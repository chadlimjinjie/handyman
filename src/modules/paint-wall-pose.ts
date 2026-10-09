// Where every moving part of the painting scene belongs at a step (index into the module's
// `steps`). 0 or 1 each; the scene eases toward them.
export function paintPose(step: number) {
  const on = (b: boolean) => (b ? 1 : 0)
  return {
    sheetDown: on(step >= 1),
    filled: on(step >= 2),
    sanded: on(step >= 3),
    wiped: on(step >= 4),
    // peeled again once the second coat is on
    taped: on(step >= 5 && step < 16),
    primed: on(step >= 6),
    stirred: on(step >= 7),
    trayFull: on(step >= 8),
    cutIn: on(step >= 9),
    // the roller is off the bench, resting in the tray between passes
    rollerOut: on(step >= 10 && step < 17),
    rolled: on(step >= 11),
    laidOff: on(step >= 12),
    dry: on(step >= 13),
    reloaded: on(step >= 14),
    coat2: on(step >= 15),
    washed: on(step >= 17),
  }
}

export type Pose = ReturnType<typeof paintPose>

const any = (target: string, ...of: string[]) => of.includes(target)

// What a wrong click looks like. Everything without a physical consequence just shakes.
export function slipEffect(step: number, target: string) {
  // paint where it should not be: bare floor, straight from the can, an overloaded roller
  if (target === 'can') return 'drip'
  if (step === 0 && any(target, 'wall', 'filler')) return 'drip'
  if ((step === 10 || step === 11) && target === 'roller') return 'drip'
  // unstirred paint
  if (step === 6 && any(target, 'tray', 'brush', 'roller')) return 'streak'
  // a dry roller
  if ((step === 9 || step === 13) && target === 'wall') return 'patchy'
  // an edge left to dry, or half-dry paint disturbed
  if (step === 12 && any(target, 'wall', 'roller', 'brush')) return 'lap'
  if ((step === 10 || step === 11) && target === 'wait') return 'lap'
  return 'shake'
}
