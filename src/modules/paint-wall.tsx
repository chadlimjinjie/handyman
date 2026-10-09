import { lazy } from 'react'
import type { Module } from '@/game/engine'
import { SceneFrame } from '@/scene/frame'

const PaintWallScene = lazy(() => import('./paint-wall-scene'))

const shelf = [
  ['filler', 'Filler'],
  ['sandpaper', 'Sandpaper'],
  ['cloth', 'Damp cloth'],
  ['tape', 'Masking tape'],
  ['primer', 'Primer'],
  ['stick', 'Stirring stick'],
  ['brush', 'Brush'],
  ['roller', 'Roller'],
]

// What the wall looks like at each `step`, 0 through 17 (done).
const wallStates = [
  'holes and cracks',
  'holes and cracks',
  'filled, rough',
  'sanded, dusty',
  'clean, bare filler patches',
  'masked, bare filler patches',
  'patches primed',
  'patches primed',
  'patches primed',
  'edges cut in',
  'edges cut in',
  'first coat on, uneven',
  'first coat, wet',
  'first coat, dry',
  'first coat, dry',
  'two even coats',
  'two even coats',
  'two even coats',
]

// Everything shown here is derived from `step` (index into `steps` below).
function Scene({ step, onAct, slip, mistakes }: Parameters<Module['Scene']>[0]) {
  const holding =
    step === 9 ? 'brush' : step === 10 || step === 11 || step === 14 ? 'loaded roller' : 'nothing'

  const actions = [
    ['wall', `Wall: ${wallStates[step]}`],
    ['wait', 'Wait for it to dry'],
    ...shelf,
    ['sheet', `Dust sheet: ${step >= 1 ? 'covering the floor' : 'folded'}`],
    ['can', `Paint can${step >= 7 ? ': stirred' : ''}`],
    ['tray', `Roller tray: ${step >= 8 ? 'filled' : 'empty'}`],
    ['water', 'Bucket of clean water'],
  ]

  return (
    <SceneFrame
      className="bg-orange-50"
      caption={<p className="text-xs text-stone-700">In hand: {holding}</p>}
      actions={actions}
      onAct={onAct}
    >
      <PaintWallScene
        step={step}
        slip={slip}
        mistakes={mistakes}
        onAct={onAct}
        reduced={matchMedia('(prefers-reduced-motion: reduce)').matches}
      />
    </SceneFrame>
  )
}

const halfDry =
  'The paint is half dry. Touching it now leaves lap marks, and recoating lifts the first coat. Wait.'
const unstirred =
  'The pigment has settled to the bottom of the can. Unstirred paint goes on streaky. Stir it first.'
const dryRoller = 'A dry roller gives patchy cover and tram lines. Load it on the tray first.'
const wetEdge =
  'Do not stop mid-wall. If the edge dries before you roll into it, you get lap marks.'

export const paintWall: Module = {
  id: 'paint-wall',
  title: 'Painting a Wall',
  brief: 'The spare room wall needs repainting. Start by protecting the floor.',
  fail: 'On a real job that is a patchy wall and a second tin of paint.',
  steps: [
    { target: 'sheet', done: 'Floor covered. Now fill the holes and cracks.' },
    { target: 'filler', done: 'Holes filled and dry. Sand them flush.' },
    {
      target: 'sandpaper',
      done: 'Smooth, and the old paint is keyed so the new coat grips. Wipe the dust off.',
    },
    { target: 'cloth', done: 'Dust gone: no grit under the paint. Mask the edges.' },
    { target: 'tape', done: 'Skirting and switch masked. Prime the filled patches.' },
    {
      target: 'primer',
      done: 'Patches sealed, so they will not soak up paint and show through dull. Stir the paint.',
    },
    {
      target: 'stick',
      done: 'Colour is uniform, top to bottom of the can. Pour some into the tray.',
    },
    { target: 'tray', done: 'Tray filled. Cut in the edges with the brush first.' },
    { target: 'brush', done: 'Edges cut in, still wet. Load the roller.' },
    {
      target: 'roller',
      done: 'Rolled on the tray ramp: evenly loaded, not dripping. Roll the wall.',
    },
    { target: 'wall', done: 'Paint is on in a W and spread out. Now even it out on the wall.' },
    {
      target: 'wall',
      done: 'Laid off with light top-to-bottom passes. Thin and even. Let it dry.',
    },
    { target: 'wait', done: 'Fully dry, not just touch-dry. Reload the roller for coat two.' },
    { target: 'roller', done: 'Loaded. Roll the second coat.' },
    { target: 'wall', done: 'Two thin coats: solid, even colour. Peel the tape.' },
    { target: 'tape', done: 'Clean lines. Wash the roller and brush.' },
    { target: 'water', done: 'Tools clean for next time. Job done!' },
  ],
  mistakes: {
    '0:filler': 'Filler dust and paint drips end up in the carpet. Cover the floor first.',
    '0:wall': 'Paint drips end up in the carpet. Cover the floor first.',
    '1:sandpaper': 'Nothing to sand flush yet. Fill the holes first.',
    '1:primer': 'Paint and primer do not hide holes, they highlight them. Fill first.',
    '2:primer': 'The filler is still proud of the wall and will show as bumps. Sand first.',
    '2:tape': 'Sanding would shred the tape. Sand first, mask after.',
    '3:tape': 'Tape will not stick to a dusty wall. Wipe it down first.',
    '3:primer': 'Primer over dust dries gritty. Wipe the wall down first.',
    '4:primer': 'Mask first: primer on the skirting shows through just like paint.',
    '5:stick':
      'Bare filler is porous: it drinks paint and leaves dull patches however many coats go on. Prime it.',
    '6:tray': unstirred,
    '6:brush': unstirred,
    '6:roller': unstirred,
    '7:roller': 'Nothing to load it with. Pour paint into the tray.',
    '7:brush': 'Pour the paint into the tray first, then cut in.',
    '8:roller': 'Cut in the edges first, so the roller can blend into them while they are wet.',
    '9:wall': dryRoller,
    '10:roller': 'It is loaded already. More paint only means drips. Get it on the wall.',
    '10:wait': wetEdge,
    '11:roller': 'No more paint: one thick coat sags and runs. Lay off what is already on the wall.',
    '11:wait': wetEdge,
    '12:wall': halfDry,
    '12:roller': halfDry,
    '12:brush': halfDry,
    '12:tape': 'Not yet. There is a second coat to go.',
    '13:wall': dryRoller,
    '14:roller': 'It is loaded already. Roll the second coat.',
    '15:wall': 'Two coats are on. Leave the wall alone.',
    '15:water': 'Peel the tape first, before the paint hardens over it and tears.',
    '16:wall': 'Two coats are on. Leave the wall alone.',
    can: 'Never work straight from the can: a roller dipped in it comes out overloaded and drips. Use the tray.',
    sheet: 'The dust sheet is already down.',
    filler: 'The holes are already filled.',
    sandpaper: 'Nothing needs sanding right now.',
    cloth: 'Nothing to wipe down right now.',
    tape: 'Not the moment for tape.',
    primer: 'No bare filler to prime right now.',
    stick: 'The paint does not need stirring right now.',
    tray: 'No need to pour paint right now.',
    brush: 'No brushwork needed right now.',
    roller: 'The roller is not the next tool.',
    wall: 'The wall is not ready for paint yet.',
    wait: 'Nothing to wait for right now.',
    water: 'Nothing to wash yet.',
  },
  Scene,
}
