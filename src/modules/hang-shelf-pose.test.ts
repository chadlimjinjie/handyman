import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shelfPose, slipEffect } from './hang-shelf-pose.ts'

test('starts with a bare wall, ends with the shelf up', () => {
  assert.ok(Object.values(shelfPose(0)).every((v) => v === 0))
  assert.ok(Object.values(shelfPose(8)).every((v) => v === 1))
})

test('nothing is drilled before the wall is scanned, marked, and the goggles and bit are on', () => {
  const order = [
    'scanned',
    'marked',
    'gogglesOn',
    'bitIn',
    'drilled',
    'plugged',
    'bracketsOn',
    'shelfOn',
  ] as const
  for (let step = 0; step <= 8; step++) {
    const p = shelfPose(step)
    order.forEach((key, i) => {
      if (p[key] && i > 0) assert.equal(p[order[i - 1]], 1, `${key} at step ${step}`)
    })
  }
})

test('wrong moves show their consequence', () => {
  assert.equal(slipEffect(0, 'drill'), 'spark')
  assert.equal(slipEffect(1, 'spot-socket'), 'spark')
  assert.equal(slipEffect(1, 'spot-switch'), 'spark')
  assert.equal(slipEffect(0, 'spot-socket'), 'shake')
  assert.equal(slipEffect(3, 'bit-wood'), 'skate')
  assert.equal(slipEffect(1, 'drill'), 'tilt')
  assert.equal(slipEffect(2, 'drill'), 'dust')
  assert.equal(slipEffect(5, 'brackets'), 'sag')
  assert.equal(slipEffect(3, 'bit-10mm'), 'shake')
  assert.equal(slipEffect(3, 'drill'), 'shake')
})
