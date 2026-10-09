import assert from 'node:assert/strict'
import { test } from 'node:test'
import { slipEffect, tapPose } from './leaking-tap-pose.ts'

test('starts dripping with the water on, ends closed, dry and back together', () => {
  const first = tapPose(0)
  assert.deepEqual([first.dripping, first.valveShut, first.tapOpen, first.washerNew], [1, 0, 0, 0])
  const last = tapPose(10)
  assert.deepEqual(
    [last.dripping, last.valveShut, last.tapOpen, last.handleOff, last.headOut, last.washerNew],
    [0, 0, 0, 0, 0, 1],
  )
})

test('the tap is only ever apart with the valve shut and the drain covered', () => {
  for (let step = 0; step <= 10; step++) {
    const p = tapPose(step)
    if (p.handleOff) assert.deepEqual([p.valveShut, p.stopperIn], [1, 1], `step ${step}`)
    if (p.headOut) assert.equal(p.handleOff, 1, `step ${step}`)
    if (p.flowing) assert.deepEqual([p.valveShut, p.tapOpen, p.handleOff], [0, 1, 0], `step ${step}`)
  }
})

test('wrong moves show their consequence', () => {
  assert.equal(slipEffect(0, 'handle'), 'jet')
  assert.equal(slipEffect(0, 'spanner'), 'jet')
  assert.equal(slipEffect(5, 'valve'), 'jet')
  assert.equal(slipEffect(2, 'handle'), 'drop')
  assert.equal(slipEffect(2, 'valve'), 'shake')
  assert.equal(slipEffect(5, 'washer-big'), 'shake')
  assert.equal(slipEffect(3, 'tape'), 'shake')
})
