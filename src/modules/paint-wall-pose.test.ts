import assert from 'node:assert/strict'
import { test } from 'node:test'
import { paintPose, slipEffect } from './paint-wall-pose.ts'

test('starts bare, ends with two coats, tape off and tools washed', () => {
  assert.ok(Object.values(paintPose(0)).every((v) => v === 0))
  const last = paintPose(17)
  assert.deepEqual(
    [last.coat2, last.taped, last.rollerOut, last.washed, last.sheetDown],
    [1, 0, 0, 1, 1],
  )
})

test('preparation comes before paint, and each coat goes on a dry, masked wall', () => {
  const order = [
    'sheetDown',
    'filled',
    'sanded',
    'wiped',
    'primed',
    'stirred',
    'trayFull',
    'cutIn',
    'rolled',
    'laidOff',
    'dry',
    'reloaded',
    'coat2',
    'washed',
  ] as const
  for (let step = 0; step <= 17; step++) {
    const p = paintPose(step)
    order.forEach((key, i) => {
      if (p[key] && i > 0) assert.equal(p[order[i - 1]], 1, `${key} at step ${step}`)
    })
    // no paint touches the wall without the tape on, and it only comes off after coat two
    if (p.cutIn && !p.coat2) assert.equal(p.taped, 1, `step ${step}`)
  }
})

test('wrong moves show their consequence', () => {
  assert.equal(slipEffect(0, 'wall'), 'drip')
  assert.equal(slipEffect(5, 'can'), 'drip')
  assert.equal(slipEffect(10, 'roller'), 'drip')
  assert.equal(slipEffect(6, 'tray'), 'streak')
  assert.equal(slipEffect(9, 'wall'), 'patchy')
  assert.equal(slipEffect(13, 'wall'), 'patchy')
  assert.equal(slipEffect(12, 'brush'), 'lap')
  assert.equal(slipEffect(11, 'wait'), 'lap')
  assert.equal(slipEffect(3, 'tape'), 'shake')
})
