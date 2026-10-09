import { lazy } from 'react'
import type { Module } from '@/game/engine'
import { SceneFrame } from '@/scene/frame'

const HangShelfScene = lazy(() => import('./hang-shelf-scene'))

// Everything shown here is derived from `step` (index into `steps` below).
function Scene({ step, onAct, slip, mistakes }: Parameters<Module['Scene']>[0]) {
  const marked = step >= 2

  const actions = [
    ['detector', `Cable detector${step >= 1 ? ': beeped above the socket and the switch' : ''}`],
    ...(marked
      ? [['spot-clear', 'Pencil marks: level, on open wall']]
      : [
          ['spot-switch', 'Mark here: above the light switch'],
          ['spot-clear', 'Mark here: open wall'],
          ['spot-socket', 'Mark here: above the socket'],
        ]),
    ['goggles', `Safety goggles: ${step >= 3 ? 'on' : 'off'}`],
    ['bit-masonry', '6mm masonry bit'],
    ['bit-wood', '6mm wood bit'],
    ['bit-10mm', '10mm masonry bit'],
    ['drill', `Drill: ${step >= 4 ? 'masonry bit fitted' : 'no bit'}`],
    ['plugs', `Wall plugs${step >= 6 ? ': in the wall' : ''}`],
    ['brackets', `Brackets and screws${step >= 7 ? ': on the wall' : ''}`],
    ['shelf', `Shelf board: ${step >= 8 ? 'on the brackets' : 'on the floor'}`],
  ]

  return (
    <SceneFrame
      className="bg-orange-50"
      caption={<p className="text-xs text-stone-700">Wall plug packet: 6mm · masonry wall</p>}
      actions={actions}
      onAct={onAct}
    >
      <HangShelfScene
        step={step}
        slip={slip}
        mistakes={mistakes}
        onAct={onAct}
        reduced={matchMedia('(prefers-reduced-motion: reduce)').matches}
      />
    </SceneFrame>
  )
}

const SCAN_FIRST = 'You do not know what is inside the wall yet. Run the detector over it first.'
const BIT_LATER = 'Not yet. Get the holes marked and your goggles on before you touch the drill.'
const PLUGS_FIRST =
  'A screw straight into masonry has nothing to bite on and pulls out under load. Wall plugs first.'

export const hangShelf: Module = {
  id: 'hang-shelf',
  title: 'Putting Up a Shelf',
  brief:
    'A shelf needs to go up on the living room wall. Before any hole is drilled, find out what is inside the wall.',
  fail: 'On a real job that is a drill through a live cable, or a shelf on the floor.',
  steps: [
    {
      target: 'detector',
      done: 'It beeps in a strip running straight up from the socket, and another above the light switch: cables. Mark the two holes clear of both.',
    },
    {
      target: 'spot-clear',
      done: 'Two pencil crosses, set level with a spirit level and well clear of the cables. Protect your eyes before you drill.',
    },
    { target: 'goggles', done: 'Goggles on. Now choose a drill bit: the wall plugs are 6mm.' },
    {
      target: 'bit-masonry',
      done: 'A 6mm masonry bit, the same size as the plug. A turn of tape round it marks the depth. Drill the holes.',
    },
    {
      target: 'drill',
      done: 'Two holes, square to the wall and a little deeper than the plug. Clear the dust out and fit the plugs.',
    },
    { target: 'plugs', done: 'Plugs tapped in flush with the wall. Now screw the brackets on.' },
    {
      target: 'brackets',
      done: 'Brackets are up: each screw spreads its plug so it grips the hole. Last turns by hand, so nothing strips. Put the shelf on.',
    },
    {
      target: 'shelf',
      done: "Shelf's on and level. Job done! Heavy things go close to the brackets, not in the middle.",
    },
  ],
  mistakes: {
    '0:drill': 'Bang! That was drilling blind, and there are cables buried in this wall. Scan it first.',
    '0:spot-clear': SCAN_FIRST,
    '0:spot-socket': SCAN_FIRST,
    '0:spot-switch': SCAN_FIRST,
    '1:spot-socket':
      'Cables run straight up and down from a socket, and the detector beeped right there. Pick a spot clear of it.',
    '1:spot-switch':
      'That is in line with the light switch: its cable runs up to the ceiling behind that spot. Pick a spot clear of it.',
    '1:drill': 'Holes drilled by eye give a sloping shelf, or one over a cable. Mark them first.',
    '2:drill': 'Masonry dust and grit come straight back at your face. Goggles first.',
    '3:drill': 'There is no bit in the chuck. Choose one first.',
    '0:bit-masonry': BIT_LATER,
    '1:bit-masonry': BIT_LATER,
    '2:bit-masonry': BIT_LATER,
    '5:brackets': PLUGS_FIRST,
    '5:shelf': PLUGS_FIRST,
    '6:plugs': 'The plugs are already in. Screw the brackets on.',
    '7:plugs': 'The plugs are already in.',
    '7:brackets': 'The brackets are already up. Put the shelf on.',
    'bit-wood':
      'A wood bit has a sharp spur for timber. On masonry it skates across the wall and burns blunt.',
    'bit-10mm':
      'A 10mm hole for a 6mm plug: the plug spins in it and the screw never grips. Match the bit to the plug.',
    'bit-masonry': 'The right bit is already in the drill.',
    'spot-socket': 'There is a cable behind that spot. Leave it alone.',
    'spot-switch': 'There is a cable behind that spot. Leave it alone.',
    'spot-clear': 'The holes are already marked.',
    detector: 'The wall is already scanned.',
    goggles: 'Your goggles are already on.',
    drill: 'The holes are drilled. Put the drill down.',
    plugs: 'There are no holes for the plugs yet.',
    brackets: 'The brackets need plugged holes to screw into.',
    shelf: 'There is nothing to rest the shelf on yet.',
  },
  Scene,
}
