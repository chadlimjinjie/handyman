import { lazy } from 'react'
import type { Module } from '@/game/engine'
import { SceneFrame } from '@/scene/frame'

const LightBulbScene = lazy(() => import('./light-bulb-scene'))

// Everything shown here is derived from `step` (index into `steps` below).
function Scene({ step, onAct, slip, mistakes }: Parameters<Module['Scene']>[0]) {
  const powerOn = step === 0 || step === 10
  const breakerOn = step < 2 || step > 8
  const socketEmpty = step === 5 || step === 6
  const hand = [step >= 5 && step <= 7 && 'old bulb', step === 6 && 'new LED bulb'].filter(Boolean)

  const actions = [
    ['switch', `Wall switch: ${powerOn ? 'on' : 'off'}`],
    ['breaker', `DB box, lighting breaker: ${breakerOn ? 'on' : 'off'}`],
    ['wait', 'Wait a few minutes'],
    ['ladder', `Stepladder: ${step < 4 ? 'folded against the wall' : 'open under the fixture'}`],
    socketEmpty
      ? ['socket', 'Empty light socket']
      : [
          'bulb',
          step < 5 ? `Old bulb${step < 3 ? ': hot' : ''}` : `New bulb${step === 10 ? ': lit' : ''}`,
        ],
    ['new-led-e27', 'Replacement: LED 9W, E27 base'],
    ['new-100w', 'Replacement: old 100W, E27 base'],
    ['new-e14', 'Replacement: LED 5W, E14 base'],
    ['bin', 'E-waste bin'],
  ]

  return (
    <SceneFrame
      className="bg-amber-50"
      caption={
        <p className="text-xs text-stone-700">
          Fixture: E27 · max 60W. In hand: {hand.join(' + ') || 'nothing'}
        </p>
      }
      actions={actions}
      onAct={onAct}
    >
      <LightBulbScene
        step={step}
        slip={slip}
        mistakes={mistakes}
        onAct={onAct}
        reduced={matchMedia('(prefers-reduced-motion: reduce)').matches}
      />
    </SceneFrame>
  )
}

export const lightBulb: Module = {
  id: 'light-bulb',
  title: 'Changing a Light Bulb',
  brief: 'The hallway bulb just blew. Replace it safely.',
  fail: 'On a real job that is a trip to A&E.',
  steps: [
    {
      target: 'switch',
      done: 'Wall switch is off. A dead bulb cannot confirm that, so make sure at the DB box.',
    },
    {
      target: 'breaker',
      done: 'Lighting breaker is off. Use daylight or a torch: other lights on this circuit are out too.',
    },
    { target: 'wait', done: 'The bulb has cooled down.' },
    { target: 'ladder', done: 'Stepladder is fully open, locked and right under the fixture.' },
    { target: 'bulb', done: 'Old bulb is out. Check its base and wattage.' },
    { target: 'new-led-e27', done: 'E27 base and well under 60W. Good match.' },
    { target: 'socket', done: 'New bulb fitted: snug, not overtightened.' },
    {
      target: 'bin',
      done: 'Old bulb goes in an e-waste bin (3-in-1 or Battery & Bulb), not the rubbish chute.',
    },
    { target: 'breaker', done: 'Lighting breaker is back on.' },
    {
      target: 'switch',
      done: "Light's on. Job done! If a new bulb ever does not light, stop: the fitting or wiring needs a Licensed Electrical Worker.",
    },
  ],
  mistakes: {
    '0:bulb': 'Zap! The power is still on. Switch it off before touching the bulb.',
    '0:ladder': 'Make it safe first: switch the power off before setting up.',
    '0:breaker':
      'Wall switch first, so the bulb does not come on unexpectedly when the breaker goes back on.',
    '1:bulb':
      'The wall switch is off, but a dead bulb cannot prove it. Switch off the lighting breaker first.',
    '1:ladder': 'Make sure of the power first: switch off the lighting breaker.',
    '1:wait': 'Finish isolating first: switch off the lighting breaker.',
    '2:bulb': 'Ouch! A bulb that just blew is hot. Give it a few minutes to cool.',
    '2:ladder': 'Let the bulb cool before you climb up to it.',
    '3:bulb': 'You cannot reach it safely. No stretching or chair-balancing: use the ladder.',
    '5:socket': 'Nothing to fit yet. Pick a replacement bulb first.',
    '5:bin': 'Hold on to it for a moment: match its base and wattage to pick the replacement.',
    '6:bin': 'Finish the job up the ladder first: fit the new bulb.',
    '7:switch': 'The old bulb is still in your hand. Recycle it first.',
    '7:breaker': 'The old bulb is still in your hand. Recycle it first.',
    '8:switch': 'The wall switch does nothing until the lighting breaker is back on.',
    '9:breaker': 'The breaker is already back on. Use the wall switch.',
    'new-100w':
      '100W is over the 60W maximum on this fixture. That is a fire risk. Check the actual watts, not the "equivalent" figure on the box.',
    'new-e14': 'E14 is the small screw base. This fixture takes E27.',
    'new-led-e27': 'You do not need a new bulb at this point.',
    switch: 'Leave the power off until the new bulb is in.',
    breaker: 'Leave the breaker off until the new bulb is in.',
    wait: 'Nothing to wait for right now.',
    ladder: 'The ladder is already where it needs to be.',
    bin: 'Nothing to recycle yet.',
    bulb: 'The new bulb is in. Leave it alone.',
  },
  Scene,
}
