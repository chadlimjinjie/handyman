import assert from 'node:assert/strict'
import { test } from 'node:test'
import { firePose, slipEffect } from './fire-extinguisher-pose.ts'

test('starts with a fire and empty hands, ends with it out and him at the door', () => {
  const first = firePose(0)
  assert.deepEqual([first.alarmOn, first.holding, first.burning, first.backedOut], [0, 0, 1, 0])
  const last = firePose(8)
  assert.deepEqual(
    [last.alarmOn, last.burning, last.squeezing, last.aimed, last.backedOut, last.closeUp],
    [1, 0, 0, 0, 1, 0],
  )
})

test('PASS happens in order, from the door, after the alarm', () => {
  for (let step = 0; step <= 8; step++) {
    const p = firePose(step)
    if (p.holding) assert.equal(p.alarmOn, 1, `step ${step}`)
    if (p.pinOut) assert.equal(p.atDoor, 1, `step ${step}`)
    if (p.aimed) assert.equal(p.pinOut, 1, `step ${step}`)
    if (p.squeezing) assert.deepEqual([p.aimed, p.burning], [1, 1], `step ${step}`)
  }
  // the fire only goes out on the step after the squeeze: the sweep
  assert.deepEqual([firePose(6).burning, firePose(7).burning], [1, 0])
})

test('wrong moves show their consequence', () => {
  assert.equal(slipEffect(1, 'water'), 'shock')
  assert.equal(slipEffect(1, 'foam'), 'shock')
  assert.equal(slipEffect(2, 'stand-corner'), 'flare')
  assert.equal(slipEffect(4, 'flames'), 'flare')
  assert.equal(slipEffect(3, 'flames'), 'shake')
  assert.equal(slipEffect(3, 'lever'), 'shake')
})
