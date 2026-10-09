import { lazy } from 'react'
import type { Module } from '@/game/engine'
import { SceneFrame } from '@/scene/frame'

const PowerPlugScene = lazy(() => import('./power-plug-scene'))

// Seen with the cover off and the flex at the bottom. `after` is the step that connects it.
const terminals = [
  { target: 'term-e', name: 'Earth', wire: 'green/yellow', after: 4 },
  { target: 'term-n', name: 'Neutral', wire: 'blue', after: 5 },
  { target: 'term-l', name: 'Live', wire: 'brown', after: 6 },
]

// Everything shown here is derived from `step` (index into `steps` below).
function Scene({ step, onAct, slip, mistakes }: Parameters<Module['Scene']>[0]) {
  const socketOn = step === 0 || step === 12
  const pluggedIn = step < 2 || step > 10
  const open = step >= 3 && step <= 9

  const actions = [
    ['socket-switch', `Socket switch: ${socketOn ? 'on' : 'off'}`],
    [
      'plug',
      pluggedIn
        ? `${step < 2 ? 'Cracked old plug' : 'Rewired plug'}: in the socket`
        : 'Wall socket: empty',
    ],
    ['cover', `Plug cover: ${open ? 'off' : 'on'}`],
    ['strip', `Wire stripper. Flex: ${step >= 4 ? 'stripped' : 'frayed end'}`],
    ...(open
      ? [
          ...terminals.map((t) => [
            t.target,
            `${t.name} terminal: ${step > t.after ? `${t.wire} wire` : 'empty'}`,
          ]),
          ['grip', `Cord grip: ${step >= 8 ? 'tight' : 'loose'}`],
        ]
      : []),
    ['fuse-3a', step >= 9 ? '3A fuse: fitted' : '3A fuse'],
    ['fuse-13a', '13A fuse'],
    ['fuse-foil', 'Foil wrap'],
  ]

  return (
    <SceneFrame
      className="bg-sky-50"
      caption={<p className="text-xs text-stone-700">Fan rating plate: 55W · metal body</p>}
      actions={actions}
      onAct={onAct}
    >
      <PowerPlugScene
        step={step}
        slip={slip}
        mistakes={mistakes}
        onAct={onAct}
        reduced={matchMedia('(prefers-reduced-motion: reduce)').matches}
      />
    </SceneFrame>
  )
}

const SAFE_FIRST = 'Make the old plug safe first: switch off at the socket and pull it out.'
const STRIP_FIRST = 'Bare copper has to reach the terminal. Strip the flex first.'
const WIRES_FIRST = 'Connect all three wires first, then clamp the flex.'
const GRIP_FIRST =
  'The cord grip is still loose: one tug on the flex and the wires pull out of their terminals. Clamp it first.'

export const powerPlug: Module = {
  id: 'power-plug',
  title: 'Rewiring a Power Plug',
  brief:
    'The plug on the standing fan is cracked and its flex has pulled loose. Fit a new plug safely.',
  fail: 'On a real job that is a shock, or a fire inside the wall.',
  steps: [
    {
      target: 'socket-switch',
      done: 'Socket is off. That alone proves nothing: switches fail and get knocked back on. Pull the plug out.',
    },
    {
      target: 'plug',
      done: 'Plug is out, so the flex is dead. A cracked plug gets replaced, never taped. Open the new one: buy plugs with the SAFETY Mark.',
    },
    {
      target: 'cover',
      done: 'Cover is off: three terminals, a fuse holder and a cord grip. Now prepare the flex.',
    },
    {
      target: 'strip',
      done: 'Cut back to sound flex, outer sheath trimmed, each core bared about 5mm and twisted tight. Start with the green/yellow wire.',
    },
    {
      target: 'term-e',
      done: 'Green/yellow is on Earth, the top terminal. Leave it the longest, so it is the last to pull free. Now the blue wire.',
    },
    {
      target: 'term-n',
      done: 'Blue is on Neutral: BL, Bottom Left. Now the brown wire.',
    },
    {
      target: 'term-l',
      done: 'Brown is on Live: BR, Bottom Right, beside the fuse. Screws tight, no stray strands. Now secure the flex.',
    },
    {
      target: 'grip',
      done: 'Cord grip clamps the outer sheath, not the coloured cores, so a tug cannot reach the terminals. Now pick a fuse.',
    },
    {
      target: 'fuse-3a',
      done: 'The fan is 55W, and a 3A fuse covers anything up to about 700W. Now close the plug.',
    },
    { target: 'cover', done: 'Cover is screwed back on. Plug it in.' },
    { target: 'plug', done: 'Plug is in. Switch on at the socket.' },
    {
      target: 'socket-switch',
      done: "Fan's running. Job done! If a plug or socket ever gets hot, smells or shows scorch marks, stop using it: that needs a Licensed Electrical Worker.",
    },
  ],
  mistakes: {
    '0:plug': 'Switch off at the socket first, then pull the plug.',
    '0:strip': 'Zap! That flex is live. Switch off at the socket and pull the plug out first.',
    '0:cover': SAFE_FIRST,
    '1:socket-switch': 'It is already off. Now pull the plug out.',
    '1:strip':
      'The switch is off, but the plug is still in, and a switch can be faulty. Pull the plug out before you cut.',
    '1:cover': SAFE_FIRST,
    '2:strip': 'Open the new plug first, so you can see how much sheath and core to strip.',
    '3:term-e': STRIP_FIRST,
    '3:term-n': STRIP_FIRST,
    '3:term-l': STRIP_FIRST,
    '3:grip': WIRES_FIRST,
    '4:term-n': 'Green/yellow is the earth wire. It goes to the top terminal, the one with the longest pin.',
    '4:term-l':
      "That wires the fan's metal body straight to live: touch it and you get 230V. Green/yellow goes to Earth, the top terminal.",
    '4:grip': WIRES_FIRST,
    '5:term-e': 'The earth wire is already in there. Blue goes to Neutral, bottom left.',
    '5:term-l':
      'Swapped polarity: the fan would still run, but its switch and the fuse end up on the wrong wire, so it stays live inside when off. Blue goes Bottom Left.',
    '5:grip': WIRES_FIRST,
    '6:term-e':
      "Brown is the live wire: on Earth it would make the fan's metal body live. Brown goes Bottom Right.",
    '6:term-n': 'Neutral already holds the blue wire. Brown goes to Live, bottom right, beside the fuse.',
    '6:grip': WIRES_FIRST,
    '7:fuse-3a': GRIP_FIRST,
    '7:cover': GRIP_FIRST,
    '8:cover': 'The fuse holder is empty, so nothing will work. Pick a fuse first.',
    '10:socket-switch': 'Plug in first, then switch on.',
    '11:plug': 'It is already plugged in. Switch on at the socket.',
    'fuse-13a':
      '13A suits a kettle, not a 55W fan. If the fan faults, its thin flex can overheat long before a 13A fuse blows. Check the rating plate.',
    'fuse-foil':
      'Never. Foil or wire in place of a fuse gives no protection at all: the next fault ends in a fire.',
    'fuse-3a': 'You do not need the fuse at this point.',
    'socket-switch': 'Leave the socket off until the new plug is finished and closed.',
    plug: 'The plug is not finished. Never push an open or half-wired plug into a socket.',
    cover: 'Do not close it yet: the wiring is not finished.',
    strip: 'The flex is already stripped. Any more bare copper would stick out past the terminals.',
    'term-e': 'The earth wire is already connected.',
    'term-n': 'The neutral wire is already connected.',
    'term-l': 'The live wire is already connected.',
    grip: 'The cord grip is already tight.',
  },
  Scene,
}
