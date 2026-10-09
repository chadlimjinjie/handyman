import assert from 'node:assert/strict'
import { test } from 'node:test'
import { act, hasFailed, hasWon, start } from './engine.ts'

const mod = {
  brief: 'brief',
  steps: [
    { target: 'a', done: 'a done' },
    { target: 'b', done: 'b done' },
  ],
  mistakes: { '0:b': 'b too early', c: 'never c' },
}

test('correct path wins', () => {
  let run = act(mod, start(mod), 'a')
  assert.deepEqual(run, { step: 1, mistakes: 0, message: 'a done', slip: null })
  run = act(mod, run, 'b')
  assert.ok(hasWon(mod, run))
  assert.equal(act(mod, run, 'a'), run)
})

test('wrong click adds a strike and keeps the step', () => {
  const run = act(mod, start(mod), 'b')
  assert.deepEqual(run, { step: 0, mistakes: 1, message: 'b too early', slip: 'b' })
  assert.equal(act(mod, run, 'a').slip, null)
  assert.equal(act(mod, run, 'c').message, 'never c')
  assert.equal(act(mod, run, 'zzz').message, "That's not the right move yet.")
})

test('third strike fails and locks the run', () => {
  let run = start(mod)
  for (let i = 0; i < 3; i++) run = act(mod, run, 'c')
  assert.ok(hasFailed(run))
  assert.equal(act(mod, run, 'a'), run)
})
