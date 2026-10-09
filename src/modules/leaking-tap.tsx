import { lazy } from 'react'
import type { Module } from '@/game/engine'
import { SceneFrame } from '@/scene/frame'

const LeakingTapScene = lazy(() => import('./leaking-tap-scene'))

// What the tap is doing at each `step`, 0 through 10 (done).
const tapStates = [
  'closed, dripping',
  'closed',
  'open, dry',
  'open, dry',
  'open, dry',
  'open, dry',
  'open, dry',
  'open, dry',
  'open, dry',
  'open, running',
  'closed, not a drip',
]

// Everything shown here is derived from `step` (index into `steps` below).
function Scene({ step, onAct, slip, mistakes }: Parameters<Module['Scene']>[0]) {
  const actions = [
    ['valve', `Valve under the sink: ${step >= 1 && step < 9 ? 'closed' : 'open'}`],
    ['tap', `Tap: ${tapStates[step]}`],
    ['stopper', `Sink stopper: ${step >= 3 ? 'in the drain' : 'on the worktop'}`],
    ['handle', `Tap handle: ${step >= 4 && step < 8 ? 'off' : 'on'}`],
    ['spanner', `Spanner. Headgear: ${step >= 5 && step < 7 ? 'out' : 'in the tap'}`],
    ['washer', step >= 6 ? 'New washer: fitted' : 'New washer, same size as the old one'],
    ['washer-big', 'New washer, one size up'],
    ['tape', 'PTFE tape'],
  ]

  return (
    <SceneFrame className="bg-sky-50" actions={actions} onAct={onAct}>
      <LeakingTapScene
        step={step}
        slip={slip}
        mistakes={mistakes}
        onAct={onAct}
        reduced={matchMedia('(prefers-reduced-motion: reduce)').matches}
      />
    </SceneFrame>
  )
}

const WATER_ON =
  'Whoosh! The supply is still on: open the tap body now and water comes out at mains pressure. Close the valve under the sink first.'
const DRAIN_IT =
  'The valve is closed, but the pipe still holds pressure and nothing proves the valve works. Open the tap and watch it run dry.'
const WATER_FIRST = 'Good habit, but stop the water first: close the valve, then open the tap.'
const IN_PIECES =
  'The tap is in pieces. Open the valve now and water shoots out of the tap body. Put it back together first.'
const HANDLE_LAST = 'The handle goes back on last, once the headgear is in.'

export const leakingTap: Module = {
  id: 'leaking-tap',
  title: 'Fixing a Dripping Tap',
  brief:
    'The kitchen tap drips all night: its washer is worn out. Start by stopping the water to it.',
  fail: 'On a real job that is a soaked kitchen, and a call to the plumber anyway.',
  steps: [
    {
      target: 'valve',
      done: 'The valve under the sink is closed, so no water reaches this tap. Now open the tap.',
    },
    {
      target: 'tap',
      done: 'A dribble, then nothing. That lets the pressure out and proves the valve holds. Now cover the drain.',
    },
    { target: 'stopper', done: 'Stopper in: a dropped screw stays in the sink. Take the handle off.' },
    {
      target: 'handle',
      done: 'Handle is off. Under it is the headgear nut. Loosen it with the spanner.',
    },
    {
      target: 'spanner',
      done: 'Headgear is out. The rubber washer on its end is flat and split: that is the drip. Fit a new one.',
    },
    {
      target: 'washer',
      done: 'New washer on, the same size as the old one. Screw the headgear back in.',
    },
    { target: 'spanner', done: 'Headgear is back in: snug, not forced. Put the handle back on.' },
    { target: 'handle', done: 'Handle is on. Open the valve under the sink, slowly.' },
    {
      target: 'valve',
      done: 'Water is back, and the open tap has let the air out of the pipe. Now close the tap.',
    },
    {
      target: 'tap',
      done: 'Closed, and not a drip. Job done! If a tap still drips with a new washer, the seat inside it is worn: that is one for a licensed plumber.',
    },
  ],
  mistakes: {
    '0:handle': WATER_ON,
    '0:spanner': WATER_ON,
    '0:tap':
      'Turning it off harder does not stop a worn washer dripping, it only chews it up. Close the valve under the sink.',
    '0:stopper': WATER_FIRST,
    '1:stopper': WATER_FIRST,
    '1:handle': DRAIN_IT,
    '1:spanner': DRAIN_IT,
    '1:valve': 'It is already closed. Open the tap to drain what is left in the pipe.',
    '2:handle': 'Plink. The handle screw is down the drain. Put the stopper in first.',
    '2:spanner': 'The handle is in the way. Cover the drain, then take the handle off.',
    '3:spanner': 'The handle is in the way. Take it off first.',
    '4:washer': 'The old washer is still inside the tap. Unscrew the headgear with the spanner first.',
    '4:handle': HANDLE_LAST,
    '5:handle': HANDLE_LAST,
    '6:handle': HANDLE_LAST,
    '5:spanner':
      'Do not put the old washer back: it is flat and split, and that is the drip. Fit the new one first.',
    '4:valve': IN_PIECES,
    '5:valve': IN_PIECES,
    '6:valve': IN_PIECES,
    '7:valve': 'The handle is still off. Finish the tap before the water comes back.',
    '7:spanner': 'The headgear is already snug. Forcing it further crushes the new washer.',
    '8:tap': 'Leave it open while the water comes back on, so the air has somewhere to go.',
    '9:valve': 'The valve is open. Close the tap and watch the spout.',
    'washer-big':
      'Too big: it will not sit flat on the seat, so the tap leaks worse than before. Match the old washer.',
    tape: 'PTFE tape seals the threads of pipe joints. This drip comes from the washer inside the tap, where tape cannot reach.',
    valve: 'Leave the valve closed until the tap is back together.',
    tap: 'Leave the tap as it is for now.',
    stopper: 'The stopper is already in the drain.',
    handle: 'The handle is already back on.',
    spanner: 'The spanner is not the next tool.',
    washer: 'The washer is not the next step.',
  },
  Scene,
}
