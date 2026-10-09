import { Clock, PaintBucket } from 'lucide-react'
import type { Module } from '@/game/engine'
import { cn } from '@/lib/utils'
import { Spot } from './spot'

const shelf = [
  { target: 'filler', label: 'Filler', name: 'Filler' },
  { target: 'sandpaper', label: 'Sand', name: 'Sandpaper' },
  { target: 'cloth', label: 'Cloth', name: 'Damp cloth' },
  { target: 'tape', label: 'Tape', name: 'Masking tape' },
  { target: 'primer', label: 'Primer', name: 'Primer' },
  { target: 'stick', label: 'Stir', name: 'Stirring stick' },
  { target: 'brush', label: 'Brush', name: 'Brush' },
  { target: 'roller', label: 'Roller', name: 'Roller' },
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

const patches = ['top-[18%] left-[16%]', 'top-[58%] left-[38%]', 'top-[26%] left-[70%]']

// Everything drawn here is derived from `step` (index into `steps` below).
function Scene({ step, onAct }: { step: number; onAct: (target: string) => void }) {
  const sheetDown = step >= 1
  const taped = step >= 5 && step < 16
  const stirred = step >= 7
  const trayFull = step >= 8
  const holding =
    step === 9 ? 'brush' : step === 10 || step === 11 || step === 14 ? 'loaded roller' : 'nothing'

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-orange-50">
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 h-[8%]',
          sheetDown ? 'border-t-2 border-dashed border-stone-500 bg-stone-100' : 'bg-stone-400',
        )}
      />

      <Spot
        aria-label={`Wall: ${wallStates[step]}`}
        onClick={() => onAct('wall')}
        className="top-[3%] left-[3%] h-[46%] w-[80%] justify-center overflow-hidden text-stone-900"
      >
        <span
          className={cn(
            'absolute inset-0 border-8',
            step >= 15
              ? 'border-teal-300 bg-teal-300'
              : step >= 12
                ? 'border-teal-100 bg-teal-100'
                : step === 11
                  ? 'border-teal-100 bg-[repeating-linear-gradient(100deg,var(--color-teal-100)_0_14%,var(--color-stone-200)_14%_20%)]'
                  : step >= 9
                    ? 'border-teal-100 bg-stone-200'
                    : 'border-stone-200 bg-stone-200',
          )}
        />
        {step < 11 &&
          patches.map((pos) => (
            <span
              key={pos}
              className={cn(
                'absolute',
                pos,
                step < 2
                  ? 'size-1.5 rounded-full bg-stone-700'
                  : step < 6
                    ? 'size-4 rounded-sm bg-white'
                    : 'size-4 rounded-sm bg-stone-50 ring-1 ring-stone-400',
              )}
            />
          ))}
        <span
          className={cn(
            'absolute top-[38%] right-[6%] size-4 rounded-sm border-2 bg-white',
            taped ? 'border-blue-500' : 'border-stone-400',
          )}
        />
        <span
          className={cn('absolute inset-x-0 bottom-0 h-[8%]', taped ? 'bg-blue-400' : 'bg-white')}
        />
        <span className="relative rounded bg-white/70 px-1.5 py-0.5">Wall: {wallStates[step]}</span>
      </Spot>

      <Spot
        aria-label="Wait for it to dry"
        onClick={() => onAct('wait')}
        className="top-[6%] left-[87%] w-[10%] gap-1 p-1"
      >
        <Clock className="size-auto w-full" />
        Wait
      </Spot>

      <div className="absolute top-[53%] left-[3%] flex w-[94%] gap-[1%] border-b-4 border-amber-800 pb-1">
        {shelf.map(({ target, label, name }) => (
          <Spot
            key={target}
            aria-label={name}
            onClick={() => onAct(target)}
            className="static flex-1 border border-stone-400 bg-white py-2"
          >
            {label}
          </Spot>
        ))}
      </div>

      <Spot
        aria-label={sheetDown ? 'Dust sheet, covering the floor' : 'Dust sheet, folded'}
        onClick={() => onAct('sheet')}
        className="bottom-[9%] left-[4%] w-[16%]"
      >
        {sheetDown ? 'Sheet down' : 'Dust sheet'}
        <span className="h-3 w-full rounded-sm border-2 border-stone-500 bg-stone-100" />
      </Spot>

      <Spot
        aria-label={`Paint can${stirred ? ', stirred' : ''}`}
        onClick={() => onAct('can')}
        className="bottom-[9%] left-[30%] w-[12%]"
      >
        <PaintBucket className="size-auto w-3/5 text-teal-700" aria-hidden="true" />
        Paint
      </Spot>

      <Spot
        aria-label={`Roller tray, ${trayFull ? 'filled' : 'empty'}`}
        onClick={() => onAct('tray')}
        className="bottom-[9%] left-[52%] w-[16%]"
      >
        Tray
        <span
          className={cn(
            'h-4 w-full -skew-x-12 rounded-sm border-2 border-stone-600',
            trayFull ? 'bg-teal-300' : 'bg-white',
          )}
        />
      </Spot>

      <Spot
        aria-label="Bucket of clean water"
        onClick={() => onAct('water')}
        className="bottom-[9%] left-[78%] w-[14%]"
      >
        Water
        <span className="aspect-[5/4] w-3/5 rounded-b-lg border-2 border-t-4 border-stone-600 bg-sky-200" />
      </Spot>

      <p className="absolute bottom-[2%] left-[4%] text-xs font-medium text-stone-900">
        In hand: {holding}
      </p>
    </div>
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
