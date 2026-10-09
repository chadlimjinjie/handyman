import { lazy } from 'react'
import type { Module } from '@/game/engine'
import { SceneFrame } from '@/scene/frame'

const UnclogSinkScene = lazy(() => import('./unclog-sink-scene'))

// Everything shown here is derived from `step` (index into `steps` below).
function Scene({ step, onAct, slip, mistakes }: Parameters<Module['Scene']>[0]) {
  const trapOff = step === 2 || step === 3

  const actions = [
    [
      'bucket',
      step >= 1
        ? `Bucket: under the trap${step > 1 ? ', full of dirty water' : ''}`
        : 'Bucket: by the wall',
    ],
    [
      'trap',
      trapOff
        ? `Open drain pipe: refit the ${step === 2 ? 'clogged' : 'clean'} trap`
        : `Trap, the U-shaped pipe${step < 2 ? ': clogged' : ''}`,
    ],
    ['brush', 'Brush'],
    ['wrench', 'Wrench'],
    ['cleaner', 'Chemical drain cleaner'],
    ['tap', `Tap${step > 4 ? ': running' : ''}. Sink: ${step < 2 ? 'full of dirty water' : 'empty'}`],
  ]

  return (
    <SceneFrame className="bg-sky-50" actions={actions} onAct={onAct}>
      <UnclogSinkScene
        step={step}
        slip={slip}
        mistakes={mistakes}
        onAct={onAct}
        reduced={matchMedia('(prefers-reduced-motion: reduce)').matches}
      />
    </SceneFrame>
  )
}

export const unclogSink: Module = {
  id: 'unclog-sink',
  title: 'Unclogging a Sink',
  brief:
    'The kitchen sink will not drain. Start by putting something under the U-shaped pipe to catch the water.',
  fail: "On a real job that is a flooded cabinet and a plumber's bill.",
  steps: [
    { target: 'bucket', done: 'Bucket is in place. Now take the U-shaped pipe (the trap) off.' },
    {
      target: 'trap',
      done: 'Trap is off and the dirty water is in the bucket. Now scrub the gunk out of it.',
    },
    { target: 'brush', done: 'Hair and grease cleared out. Now put the trap back on.' },
    { target: 'trap', done: 'Trap is back on, hand-tight. Now run the tap to test it.' },
    { target: 'tap', done: 'Water runs clear and the joints are dry. Job done!' },
  ],
  mistakes: {
    '0:trap':
      'Splash! The trap is full of water and now so is the cabinet. Put the bucket under it first.',
    '0:brush': 'Nothing to clean yet. The clog is inside the U-shaped pipe.',
    '1:brush': 'Nothing to clean yet. The clog is inside the U-shaped pipe.',
    '2:trap': 'Clean it before refitting, or the clog goes straight back in. Use the brush.',
    '2:tap': 'The trap is off. That water goes straight into the cabinet.',
    '3:tap': 'The trap is off. That water goes straight into the cabinet.',
    cleaner:
      'Drain cleaner is caustic: it sits in the trap and splashes on you when you open it. Clear the clog by hand.',
    wrench: 'These are plastic slip nuts: hand-tight only. A wrench cracks them.',
    tap: 'The sink is already full. More water will not shift the clog.',
    bucket: 'The bucket is already where it needs to be.',
    brush: 'The trap is already clean.',
    trap: 'The trap is back on. Test it with the tap.',
  },
  Scene,
}
