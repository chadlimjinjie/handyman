import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sinkPose, slipEffect } from './unclog-sink-pose.ts'

test('starts full and clogged, ends refitted with the tap running', () => {
  assert.deepEqual(sinkPose(0), {
    bucketUnder: 0,
    trapOff: 0,
    trapClean: 0,
    sinkFull: 1,
    bucketFull: 0,
    tapOn: 0,
  })
  assert.deepEqual(sinkPose(5), {
    bucketUnder: 1,
    trapOff: 0,
    trapClean: 1,
    sinkFull: 0,
    bucketFull: 1,
    tapOn: 1,
  })
})

test('the trap only comes off over the bucket, and the tap never runs while it is off', () => {
  for (let step = 0; step <= 5; step++) {
    const p = sinkPose(step)
    if (p.trapOff) assert.deepEqual([p.bucketUnder, p.tapOn], [1, 0], `step ${step}`)
    // the water in the sink goes into the bucket, never both or neither
    assert.equal(p.sinkFull + p.bucketFull, 1, `step ${step}`)
  }
})

test('wrong moves show their consequence', () => {
  assert.equal(slipEffect(0, 'trap'), 'splash')
  assert.equal(slipEffect(2, 'tap'), 'splash')
  assert.equal(slipEffect(0, 'tap'), 'shake')
  assert.equal(slipEffect(1, 'cleaner'), 'caustic')
  assert.equal(slipEffect(4, 'wrench'), 'crack')
  assert.equal(slipEffect(2, 'trap'), 'shake')
})
