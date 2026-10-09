import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bulbPose, slipEffect } from './light-bulb-pose.ts'

test('starts live with a hot dead bulb, ends lit with the old one binned', () => {
  const first = bulbPose(0)
  assert.deepEqual(
    [first.switchOn, first.breakerOn, first.hot, first.ladderOpen, first.oldOut, first.lit],
    [1, 1, 1, 0, 0, 0],
  )
  const last = bulbPose(10)
  assert.deepEqual(
    [last.switchOn, last.breakerOn, last.newIn, last.binned, last.lit, last.wallView],
    [1, 1, 1, 1, 1, 0],
  )
})

test('nobody is up the ladder with the power on or the bulb hot', () => {
  for (let step = 0; step < 10; step++) {
    const before = bulbPose(step)
    const after = bulbPose(step + 1)
    // a trip up the ladder is one of these two changing
    if (after.oldOut !== before.oldOut || after.newIn !== before.newIn) {
      assert.deepEqual(
        [after.switchOn, after.breakerOn, after.hot, after.ladderOpen],
        [0, 0, 0, 1],
        `step ${step}`,
      )
    }
  }
})

test('the new bulb is picked before it is fitted, and only a fitted bulb lights', () => {
  for (let step = 0; step <= 10; step++) {
    const p = bulbPose(step)
    if (p.newIn) assert.equal(p.newPicked, 1, `step ${step}`)
    if (p.lit) assert.deepEqual([p.newIn, p.switchOn, p.breakerOn], [1, 1, 1], `step ${step}`)
  }
})

test('wrong moves show their consequence', () => {
  assert.equal(slipEffect(0, 'bulb'), 'spark')
  assert.equal(slipEffect(2, 'bulb'), 'burn')
  assert.equal(slipEffect(3, 'bulb'), 'wobble')
  assert.equal(slipEffect(1, 'bulb'), 'shake')
  assert.equal(slipEffect(5, 'new-100w'), 'overheat')
  assert.equal(slipEffect(5, 'new-e14'), 'shake')
})
