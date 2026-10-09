import { lazy } from 'react'
import type { Module } from '@/game/engine'
import { SceneFrame } from '@/scene/frame'
import { breakerPose } from './tripped-breaker-pose'

const TrippedBreakerScene = lazy(() => import('./tripped-breaker-scene'))

// Everything shown here is derived from `step` (index into `steps` below).
function Scene({ step, onAct, slip, mistakes }: Parameters<Module['Scene']>[0]) {
  const p = breakerPose(step)
  const state = (v: number) => (v ? 'on' : 'off')
  const live = (mcb: number) => (p.rccbUp && mcb ? 'on' : 'off')

  const actions = [
    ['rccb', `RCCB, the main trip switch: ${p.rccbUp ? 'up' : 'down, tripped'}`],
    ['test', 'Test button'],
    // switched off together at the start, then brought back one by one
    ...(step === 0
      ? [['mcbs', 'Circuit breakers (MCBs): all on']]
      : [
          ['mcb-lights', `Lights breaker: ${state(p.lightsMcb)}`],
          ['mcb-rooms', `Rooms breaker: ${state(p.roomsMcb)}`],
          ['mcb-kitchen', `Kitchen breaker: ${state(p.kitchenMcb)}`],
        ]),
    ['tape', 'Sticky tape'],
    // only once the fault is traced to the kitchen
    ...(step >= 7
      ? [
          ['kettle', `Kettle, sitting in a puddle: ${p.kettleIn ? 'plugged in' : 'unplugged'}`],
          ['cooker', 'Rice cooker: plugged in'],
        ]
      : []),
  ]

  return (
    <SceneFrame
      className="bg-stone-200"
      caption={
        <p className="text-xs text-stone-700">
          Power. Lights: {live(p.lightsMcb)} · Rooms: {live(p.roomsMcb)} · Kitchen:{' '}
          {live(p.kitchenMcb)}
        </p>
      }
      actions={actions}
      onAct={onAct}
    >
      <TrippedBreakerScene
        step={step}
        slip={slip}
        mistakes={mistakes}
        onAct={onAct}
        reduced={matchMedia('(prefers-reduced-motion: reduce)').matches}
      />
    </SceneFrame>
  )
}

const RCCB_FIRST = 'Nothing flows through any circuit until the RCCB is up. Reset that first.'
const ONE_AT_A_TIME =
  'One circuit at a time, in order along the board, so you always know which one you just tested.'

export const trippedBreaker: Module = {
  id: 'tripped-breaker',
  title: 'Finding What Tripped the Power',
  brief:
    'The whole flat has gone dark: at the distribution board the RCCB has tripped. Find out why before it goes back on. Start by switching the circuits off.',
  fail: 'On a real job that is a live fault left in the kitchen, waiting for wet hands.',
  steps: [
    {
      target: 'mcbs',
      done: 'All three circuit breakers are off, so nothing is connected. Now reset the RCCB.',
    },
    {
      target: 'rccb',
      done: 'It stays up: the board is fine and the fault is out on one circuit. Bring them back one at a time, Lights first.',
    },
    { target: 'mcb-lights', done: 'Lights are on and the RCCB holds. Next: Rooms.' },
    { target: 'mcb-rooms', done: 'Rooms are on, still holding. Last: Kitchen.' },
    {
      target: 'mcb-kitchen',
      done: 'Snap! Everything is off again, so the fault is on the kitchen circuit. Switch that breaker back off.',
    },
    {
      target: 'mcb-kitchen',
      done: 'Kitchen circuit is isolated. Reset the RCCB to get the rest of the flat back.',
    },
    {
      target: 'rccb',
      done: 'Lights and rooms are back. Now find the culprit: look at what is plugged in around the kitchen.',
    },
    {
      target: 'kettle',
      done: 'Kettle unplugged: it was sitting in a puddle, with water inside its base. Try the kitchen circuit again.',
    },
    {
      target: 'mcb-kitchen',
      done: 'The kitchen is back and the RCCB holds, so the kettle was the fault. Job done! Do not plug it in again. If the RCCB ever trips with everything unplugged, the wiring is at fault: that needs a Licensed Electrical Worker.',
    },
  ],
  mistakes: {
    '0:rccb':
      'Snap: it trips straight back, because the fault is still connected. Resetting again and again proves nothing. Switch the circuits off first.',
    '1:mcb-lights': RCCB_FIRST,
    '1:mcb-rooms': RCCB_FIRST,
    '1:mcb-kitchen': RCCB_FIRST,
    '2:mcb-rooms': ONE_AT_A_TIME,
    '2:mcb-kitchen': ONE_AT_A_TIME,
    '3:mcb-kitchen': ONE_AT_A_TIME,
    '5:rccb':
      'Snap: it trips again. The kitchen breaker is still on, and that is where the fault is. Switch it off first.',
    '6:mcb-kitchen': 'The fault is still on that circuit. Leave it off and reset the RCCB.',
    '7:mcb-kitchen':
      'Snap: it trips again. Whatever is faulty is still plugged in. Look around the kitchen first.',
    '7:cooker':
      'The rice cooker is dry and undamaged. Look again: one appliance is sitting in a puddle.',
    tape: 'Never tape or wedge a breaker up. It tripped because current is leaking to earth, and the next path could be through a person.',
    test: 'The Test button trips the RCCB on purpose. Press it once a month to check it still works, not in the middle of fault-finding.',
    rccb: 'The RCCB is not the next move.',
    'mcb-lights': 'The lights circuit is fine. Leave that breaker alone.',
    'mcb-rooms': 'The rooms circuit is fine. Leave that breaker alone.',
    'mcb-kitchen': 'Leave the kitchen breaker where it is for now.',
    kettle: 'Leave the kettle unplugged.',
    cooker: 'The rice cooker is fine. Leave it.',
  },
  Scene,
}
