import assert from 'node:assert/strict'
import { test } from 'node:test'
import { plugPose, slipEffect } from './power-plug-pose.ts'

test('starts with the old plug live in the socket, ends with the new one running the fan', () => {
  const first = plugPose(0)
  assert.deepEqual(
    [first.socketOn, first.oldIn, first.newIn, first.stripped, first.fanOn, first.closeUp],
    [1, 1, 0, 0, 0, 0],
  )
  const last = plugPose(12)
  assert.deepEqual(
    [last.socketOn, last.oldIn, last.newIn, last.coverOff, last.fanOn, last.closeUp],
    [1, 0, 1, 0, 1, 0],
  )
})

test('each wire lands on the step after its terminal is clicked, earth first', () => {
  const wires = (step: number) => {
    const p = plugPose(step)
    return [p.wireE, p.wireN, p.wireL]
  }
  assert.deepEqual(wires(4), [0, 0, 0])
  assert.deepEqual(wires(5), [1, 0, 0])
  assert.deepEqual(wires(6), [1, 1, 0])
  assert.deepEqual(wires(7), [1, 1, 1])
})

test('nothing is live or plugged in while the plug is open', () => {
  for (let step = 0; step <= 12; step++) {
    const p = plugPose(step)
    if (p.coverOff) assert.deepEqual([p.socketOn, p.oldIn, p.newIn], [0, 0, 0], `step ${step}`)
    assert.ok(!(p.oldIn && p.newIn), `step ${step}`)
  }
})

test('wrong moves show their consequence', () => {
  assert.equal(slipEffect(0, 'strip'), 'spark')
  assert.equal(slipEffect(4, 'term-l'), 'spark')
  assert.equal(slipEffect(6, 'term-e'), 'spark')
  assert.equal(slipEffect(5, 'plug'), 'spark')
  assert.equal(slipEffect(8, 'fuse-13a'), 'heat')
  assert.equal(slipEffect(8, 'fuse-foil'), 'heat')
  assert.equal(slipEffect(7, 'cover'), 'tug')
  assert.equal(slipEffect(0, 'plug'), 'shake')
  assert.equal(slipEffect(4, 'term-n'), 'shake')
})
