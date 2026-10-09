import { Fan, Plug, Scissors } from 'lucide-react'
import type { Module } from '@/game/engine'
import { cn } from '@/lib/utils'
import { Spot } from './spot'

// Seen with the cover off and the flex at the bottom. `after` is the step that connects it.
const terminals = [
  {
    target: 'term-e',
    letter: 'E',
    name: 'Earth',
    wire: 'green/yellow',
    short: 'G/Y',
    after: 4,
    swatch: 'bg-linear-to-r from-green-600 to-yellow-400',
    className: 'top-[5%] left-[36%]',
  },
  {
    target: 'term-n',
    letter: 'N',
    name: 'Neutral',
    wire: 'blue',
    short: 'Blue',
    after: 5,
    swatch: 'bg-blue-600',
    className: 'top-[38%] left-[5%]',
  },
  {
    target: 'term-l',
    letter: 'L',
    name: 'Live',
    wire: 'brown',
    short: 'Brown',
    after: 6,
    swatch: 'bg-amber-900',
    className: 'top-[38%] left-[67%]',
  },
]

const shelf = [
  { target: 'fuse-3a', label: '3A fuse' },
  { target: 'fuse-13a', label: '13A fuse' },
  { target: 'fuse-foil', label: 'Foil wrap' },
]

// Everything drawn here is derived from `step` (index into `steps` below).
function Scene({ step, onAct }: { step: number; onAct: (target: string) => void }) {
  const socketOn = step === 0 || step === 12
  const pluggedIn = step < 2 || step > 10
  const open = step >= 3 && step <= 9
  const stripped = step >= 4
  const gripped = step >= 8
  const fuseIn = step >= 9
  const inHand = terminals.find((t) => t.after === step)

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-sky-50">
      <div className="absolute inset-x-0 bottom-0 h-[8%] bg-stone-400" />

      <Spot
        aria-label={`Socket switch, ${socketOn ? 'on' : 'off'}`}
        onClick={() => onAct('socket-switch')}
        className="top-[14%] left-[5%] w-[12%] gap-1 p-1"
      >
        <span className="flex aspect-[2/3] w-1/2 rounded border-2 border-stone-500 bg-white p-0.5">
          <span
            className={cn(
              'h-1/2 w-full rounded-sm',
              // Singapore rockers: down is ON
              socketOn ? 'self-end bg-green-600' : 'self-start bg-stone-400',
            )}
          />
        </span>
        {socketOn ? 'ON' : 'OFF'}
      </Spot>
      <Spot
        aria-label={
          pluggedIn
            ? `${step < 2 ? 'Cracked old plug' : 'Rewired plug'}, in the socket`
            : 'Wall socket, empty'
        }
        onClick={() => onAct('plug')}
        className="top-[40%] left-[4%] w-[14%] gap-1 p-1"
      >
        {pluggedIn ? (
          <Plug
            className={cn('size-auto w-3/5', step < 2 ? 'text-red-600' : 'text-stone-700')}
            aria-hidden="true"
          />
        ) : (
          <span className="aspect-square w-3/5 rounded border-2 border-dashed border-stone-500" />
        )}
        {pluggedIn ? (step < 2 ? 'Cracked plug' : 'Plugged in') : 'Socket'}
      </Spot>

      <p className="absolute top-[3%] right-[3%] rounded border border-stone-400 bg-white px-1.5 py-0.5 text-xs text-stone-700">
        Fan: 55W · metal body
      </p>
      <Fan
        className={cn(
          'absolute top-[12%] left-[84%] size-auto w-[11%] text-stone-600',
          step === 12 && 'motion-safe:animate-spin',
        )}
        aria-hidden="true"
      />

      {step < 11 && (
        <div className="absolute top-[12%] left-[24%] h-[54%] w-[44%] rounded-xl border-2 border-stone-500 bg-white">
          {open ? (
            <>
              {terminals.map((t) => {
                const connected = step > t.after
                return (
                  <Spot
                    key={t.target}
                    aria-label={`${t.name} terminal, ${connected ? `${t.wire} wire connected` : 'empty'}`}
                    onClick={() => onAct(t.target)}
                    className={cn('w-[28%] border border-stone-400 py-1', t.className)}
                  >
                    <span className="text-base font-bold">{t.letter}</span>
                    <span className={cn('h-1.5 w-3/5 rounded-sm', connected && t.swatch)} />
                    {connected ? t.short : t.name}
                  </Spot>
                )
              })}
              <p className="absolute top-[70%] left-[67%] w-[28%] rounded border border-stone-400 text-center text-xs text-stone-700">
                Fuse: {fuseIn ? '3A' : 'none'}
              </p>
              <Spot
                aria-label={`Cord grip, ${gripped ? 'clamped on the outer sheath' : 'loose'}`}
                onClick={() => onAct('grip')}
                className="bottom-[4%] left-[32%] w-[32%] border border-stone-400 py-1"
              >
                <span
                  className={cn('h-1.5 w-4/5 rounded-sm', gripped ? 'bg-stone-800' : 'bg-stone-300')}
                />
                {gripped ? 'Grip tight' : 'Cord grip'}
              </Spot>
            </>
          ) : (
            <Spot
              aria-label={
                step === 10 ? 'Rewired plug, cover on, ready to plug in' : 'New plug, cover on'
              }
              // Closed and finished, the natural click is "plug this in".
              onClick={() => onAct(step === 10 ? 'plug' : 'cover')}
              className="static size-full justify-center gap-1"
            >
              <Plug className="size-auto w-2/5 text-stone-700" aria-hidden="true" />
              {step === 10 ? 'Rewired plug' : 'New plug'}
            </Spot>
          )}
        </div>
      )}

      {open && (
        <Spot
          aria-label="Plug cover, off"
          onClick={() => onAct('cover')}
          className="top-[36%] left-[71%] w-[12%] border-2 border-stone-500 bg-white py-2"
        >
          Cover
        </Spot>
      )}

      <Spot
        aria-label={`Wire stripper. Fan flex: ${stripped ? 'stripped, three cores bared' : 'frayed end'}`}
        onClick={() => onAct('strip')}
        className="top-[54%] left-[84%] w-[12%] gap-1 p-1"
      >
        <Scissors className="size-auto w-3/5" aria-hidden="true" />
        Strip
      </Spot>

      <div className="absolute top-[71%] left-[24%] flex w-[44%] gap-[4%] border-b-4 border-amber-800 pb-1">
        {shelf.map(({ target, label }) => (
          <Spot
            key={target}
            aria-label={label}
            onClick={() => onAct(target)}
            className={cn(
              'static flex-1 border border-stone-400 bg-white py-1',
              fuseIn && target === 'fuse-3a' && 'invisible',
            )}
          >
            <span className="h-1.5 w-3/5 rounded-full border border-stone-500 bg-stone-200" />
            {label}
          </Spot>
        ))}
      </div>

      <p className="absolute bottom-[2%] left-[4%] text-xs font-medium text-stone-900">
        In hand: {inHand ? `${inHand.wire} wire` : 'nothing'}
      </p>
    </div>
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
