import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FOREARM, LIT_AT, LOOP, UPPER_ARM, armTo, pose } from './timeline.ts'

test('starts dark on the floor, lit up the ladder at LIT_AT', () => {
  assert.deepEqual(pose(0), { climb: 0, armReach: 0, twist: 0, lit: 0 })
  const p = pose(LIT_AT)
  assert.equal(p.lit, 1)
  assert.equal(p.climb, 1)
})

test('bulb only lights once the hand is on it', () => {
  for (let t = 0; t < LOOP; t += 0.05) {
    const p = pose(t)
    if (t < 5) assert.ok(p.lit === 0 || p.armReach === 1, `t=${t}`)
  }
})

test('values stay in range and the loop seam has no jump', () => {
  for (let t = -LOOP; t < LOOP * 2; t += 0.05) {
    const p = pose(t)
    for (const k of ['climb', 'armReach', 'lit'] as const) {
      assert.ok(p[k] >= 0 && p[k] <= 1, `${k}=${p[k]} at t=${t}`)
    }
  }
  const end = pose(LOOP - 1e-4)
  for (const k of ['climb', 'armReach', 'lit'] as const) assert.ok(end[k] < 1e-3, k)
  assert.ok(Math.abs(Math.cos(end.twist) - 1) < 1e-9)
  assert.deepEqual(pose(3 + LOOP), pose(3))
})

test('armTo puts the hand on the target', () => {
  for (const [y, z] of [
    [-0.15, -0.5],
    [0.1, -0.3],
    [-0.4, -0.2],
    [0.3, -0.35],
  ]) {
    const [shoulder, elbow] = armTo(y, z)
    const handY = -UPPER_ARM * Math.cos(shoulder) - FOREARM * Math.cos(shoulder + elbow)
    const handZ = -UPPER_ARM * Math.sin(shoulder) - FOREARM * Math.sin(shoulder + elbow)
    assert.ok(Math.hypot(handY - y, handZ - z) < 1e-9, `(${y}, ${z})`)
    assert.ok(elbow >= 0, 'elbow bends down, never backwards')
  }
  const [, elbow] = armTo(0, -5)
  assert.ok(elbow < 0.15, 'out of reach: arm is all but straight')
})
