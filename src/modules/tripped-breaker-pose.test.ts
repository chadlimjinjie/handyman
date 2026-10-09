import assert from 'node:assert/strict'
import { test } from 'node:test'
import { breakerPose, slipEffect } from './tripped-breaker-pose.ts'

test('starts tripped with everything connected, ends with power back and the kettle out', () => {
  const first = breakerPose(0)
  assert.deepEqual(
    [first.rccbUp, first.lightsMcb, first.roomsMcb, first.kitchenMcb, first.kettleIn],
    [0, 1, 1, 1, 1],
  )
  const last = breakerPose(9)
  assert.deepEqual(
    [last.rccbUp, last.lightsMcb, last.roomsMcb, last.kitchenMcb, last.kettleIn],
    [1, 1, 1, 1, 0],
  )
})

test('the RCCB never holds with the kettle on a live kitchen circuit', () => {
  for (let step = 0; step <= 9; step++) {
    const p = breakerPose(step)
    assert.ok(!(p.rccbUp && p.kitchenMcb && p.kettleIn), `step ${step}`)
  }
})

test('circuits come back one at a time, and the kitchen one trips it', () => {
  const mcbs = (step: number) => {
    const p = breakerPose(step)
    return [p.lightsMcb, p.roomsMcb, p.kitchenMcb, p.rccbUp]
  }
  assert.deepEqual(mcbs(1), [0, 0, 0, 0])
  assert.deepEqual(mcbs(2), [0, 0, 0, 1])
  assert.deepEqual(mcbs(3), [1, 0, 0, 1])
  assert.deepEqual(mcbs(4), [1, 1, 0, 1])
  assert.deepEqual(mcbs(5), [1, 1, 1, 0])
  assert.deepEqual(mcbs(7), [1, 1, 0, 1])
})

test('wrong moves show their consequence', () => {
  assert.equal(slipEffect(0, 'rccb'), 'trip')
  assert.equal(slipEffect(5, 'rccb'), 'trip')
  assert.equal(slipEffect(7, 'mcb-kitchen'), 'trip')
  assert.equal(slipEffect(3, 'tape'), 'spark')
  assert.equal(slipEffect(3, 'rccb'), 'shake')
  assert.equal(slipEffect(2, 'test'), 'shake')
  assert.equal(slipEffect(7, 'cooker'), 'shake')
})
